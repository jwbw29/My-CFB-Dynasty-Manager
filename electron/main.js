const { app, BrowserWindow, ipcMain } = require("electron");

/**
 * Forces a distinct Electron app identity for packaged builds only.
 *
 * Why: Electron's default `app.getPath('userData')` (and therefore where
 * localStorage/IndexedDB/cache/cookies live on disk) is derived from the
 * runtime app name, which - absent an explicit override - falls back to
 * this package.json's top-level `"name"` field ("dynasty-manager"). This
 * project's electron-builder `build.extraMetadata` only rewrites `"main"`
 * in the packaged app.asar's package.json, NOT `"name"`, so without this
 * call the packaged app silently reused dev mode's exact userData folder
 * (confirmed via `ps -eww` showing identical `--user-data-dir=` for both).
 * That let packaged-mode and dev-mode runs read/write/corrupt the same
 * on-disk dynasty-save data, violating this project's #1 data-safety
 * requirement: packaged and dev storage must never mix.
 *
 * Why gated on `app.isPackaged`: dev mode must keep using its existing
 * "dynasty-manager" folder unchanged, so current dev save data is never
 * orphaned. Only packaged (electron-builder-built) runs get the new
 * "Dynasty Manager" folder.
 *
 * Must run before `app.whenReady()`/any `app.getPath()` call, per
 * Electron's `app.setName()` documentation.
 */
if (app.isPackaged) {
  app.setName("Dynasty Manager");
}

const path = require("path");
const fs = require("fs");
const http = require("http");

// Better development detection
const isDev =
  process.env.NODE_ENV === "development" ||
  process.argv.includes("--dev") ||
  !app.isPackaged;
let mainWindow;
let staticServer;
let staticServerPort;

const exportDirectory = path.resolve(__dirname, "../out");

function getContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".woff":
      return "font/woff";
    case ".woff2":
      return "font/woff2";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".svg":
      return "image/svg+xml";
    case ".ico":
      return "image/x-icon";
    case ".map":
      return "application/json; charset=utf-8";
    case ".txt":
      // Next.js static-export RSC payloads are emitted as index.txt files.
      // Serving them as text/plain matches generic static hosts and prevents
      // router fallbacks that happen when they are treated as binary blobs.
      return "text/plain; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

function resolveExportFilePaths(requestPathname) {
  const normalizedPath = requestPathname === "/" ? "/index.html" : requestPathname;

  const requestCandidates = [];
  if (normalizedPath.endsWith("/")) {
    requestCandidates.push(`${normalizedPath}index.html`);
  } else {
    requestCandidates.push(normalizedPath);

    // Next.js static exports with trailingSlash can still issue client navigations
    // to extensionless paths (e.g. "/schedule"), which must resolve to
    // "/schedule/index.html" on a generic static server.
    if (!path.extname(normalizedPath)) {
      requestCandidates.push(`${normalizedPath}/index.html`);
    }
  }

  const exportDirectoryWithSeparator = `${exportDirectory}${path.sep}`;
  const resolvedPaths = [];

  for (const candidatePath of requestCandidates) {
    let decodedPath;

    try {
      decodedPath = decodeURIComponent(candidatePath);
    } catch (_decodeError) {
      return null;
    }

    const relativePath = decodedPath.replace(/^\/+/, "");
    const resolvedPath = path.resolve(exportDirectory, relativePath);

    if (
      resolvedPath !== exportDirectory &&
      !resolvedPath.startsWith(exportDirectoryWithSeparator)
    ) {
      return null;
    }

    resolvedPaths.push(resolvedPath);
  }

  return resolvedPaths;
}

/**
 * Fixed port for the packaged-build static-export server.
 *
 * Why FIXED (not OS-assigned via `listen(0, ...)` as before): Chromium
 * partitions localStorage/IndexedDB/Session Storage by full origin (scheme +
 * host + PORT). An ephemeral port produced a new origin on every launch, so
 * every localStorage write became invisible on the very next relaunch -
 * confirmed empirically (ports 63965 then 64171 across two launches, probe
 * value lost). Binding to the same port every time keeps the origin
 * (`http://127.0.0.1:47821`) stable across restarts, which is required for
 * any data to survive a quit+relaunch at all.
 *
 * Why NO fallback-to-a-different-port logic: silently retrying on another
 * port if 47821 is taken would produce a different origin for that launch,
 * defeating the exact persistence guarantee this fixed port exists to
 * provide - the user's data would appear to silently vanish. A bind failure
 * is therefore treated as fatal-but-visible instead (see the catch block in
 * createWindow() and buildStaticServerErrorHtml() below), not as a signal to
 * try elsewhere.
 *
 * 47821 was picked as an uncommon high port unlikely to collide with the
 * Next.js dev server (3001) or other common local dev tooling.
 */
const STATIC_SERVER_PORT = 47821;

/**
 * Starts a loopback-only static server for packaged builds, bound to the
 * fixed STATIC_SERVER_PORT above.
 *
 * Why this exists: Next.js `output: 'export'` emits root-absolute asset URLs
 * like `/_next/static/...`. Under `file://`, those resolve against filesystem
 * root instead of the app's `out/` folder, so the runtime chunks never load and
 * the UI stays blank. Serving `out/` via `http://127.0.0.1:<port>/` restores
 * normal browser URL resolution while keeping traffic local.
 *
 * @returns {Promise<number>} Resolved with STATIC_SERVER_PORT once listening.
 *   Rejects (e.g. EADDRINUSE) if the fixed port could not be bound; callers
 *   must surface this as an error rather than retrying on another port.
 */
function startStaticExportServer() {
  if (staticServer && staticServerPort) {
    return Promise.resolve(staticServerPort);
  }

  return new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
      const filePaths = resolveExportFilePaths(requestUrl.pathname);

      if (!filePaths || filePaths.length === 0) {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Not found");
        return;
      }

      const tryServeCandidate = (candidateIndex) => {
        if (candidateIndex >= filePaths.length) {
          response.writeHead(404, {
            "Content-Type": "text/plain; charset=utf-8",
          });
          response.end("Not found");
          return;
        }

        const filePath = filePaths[candidateIndex];
        fs.readFile(filePath, (readError, fileBuffer) => {
          if (readError) {
            tryServeCandidate(candidateIndex + 1);
            return;
          }

          response.writeHead(200, {
            "Content-Type": getContentType(filePath),
          });
          response.end(fileBuffer);
        });
      };

      tryServeCandidate(0);
    });

    server.on("error", (error) => {
      reject(error);
    });

    server.listen(STATIC_SERVER_PORT, "127.0.0.1", () => {
      const address = server.address();

      if (!address || typeof address === "string") {
        reject(new Error("Static server failed to report a numeric port."));
        return;
      }

      staticServer = server;
      staticServerPort = address.port;
      resolve(staticServerPort);
    });
  });
}

/**
 * Builds the styled error page shown when the fixed-port static server
 * fails to bind (see STATIC_SERVER_PORT doc comment: no fallback-port retry
 * is used on purpose). Mirrors the visual style of the dev/production
 * error pages further below so this presents as one consistent, branded
 * error screen rather than a blank or silently-quitting window.
 *
 * @param {Error} error - The error raised by startStaticExportServer().
 * @returns {string} A complete HTML document.
 */
function buildStaticServerErrorHtml(error) {
  const errorMessage = (error && error.message) || String(error);

  return `
    <html>
      <head>
        <title>Dynasty Manager - Startup Error</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            text-align: center;
            padding: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            color: white;
          }
          .container {
            max-width: 500px;
            margin: 0 auto;
            background: rgba(255,255,255,0.1);
            padding: 40px;
            border-radius: 15px;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
          }
          h1 { margin-top: 0; }
          button {
            background: rgba(255,255,255,0.2);
            color: white;
            border: 2px solid rgba(255,255,255,0.3);
            padding: 12px 24px;
            border-radius: 25px;
            cursor: pointer;
            font-size: 16px;
            transition: all 0.3s ease;
          }
          button:hover {
            background: rgba(255,255,255,0.3);
            transform: translateY(-2px);
          }
          .error {
            color: #ffcccc;
            margin: 20px 0;
            font-family: monospace;
            font-size: 13px;
            word-break: break-word;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🏈 Dynasty Manager</h1>
          <p>Unable to start the app's local server on port ${STATIC_SERVER_PORT}.</p>
          <div class="error">${errorMessage}</div>
          <p>This usually means another copy of Dynasty Manager is already
          running. Quit any other open copies of the app, then retry.</p>
          <button onclick="location.reload()">Retry</button>
        </div>
      </body>
    </html>
  `;
}

// Determine platform-specific icon
const getIconPath = () => {
  switch (process.platform) {
    case "darwin":
      return path.join(__dirname, "../assets/icon.icns");
    case "win32":
      return path.join(__dirname, "../public/favicon.ico");
    default:
      return path.join(__dirname, "../public/favicon.ico");
  }
};

async function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    show: false, // Hide until ready to prevent flash
    center: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, "preload.js"),
      webSecurity: true, // Re-enable security for production
      allowRunningInsecureContent: false,
    },
    icon: getIconPath(), // Use platform-specific icon
  });

  let startUrl;

  if (isDev) {
    startUrl = "http://localhost:3001";
    console.log("Development mode detected - connecting to localhost:3001");
  } else {
    try {
      const port = await startStaticExportServer();
      startUrl = `http://127.0.0.1:${port}/`;
      console.log("Production mode detected - serving static export from:", {
        exportDirectory,
        port,
      });
    } catch (staticServerError) {
      // Fixed-port bind failed (e.g. EADDRINUSE from a second running copy
      // of this app). No fallback-port retry here on purpose - see the
      // STATIC_SERVER_PORT doc comment above startStaticExportServer() for
      // why silently switching ports would defeat the persistence guarantee
      // it exists to provide. Surface it via the same styled error-page
      // pattern as the did-fail-load handler further below, through the
      // normal loadURL()/ready-to-show flow, instead of failing silently.
      console.error(
        `Failed to start static export server on fixed port ${STATIC_SERVER_PORT}:`,
        staticServerError
      );
      startUrl =
        "data:text/html;charset=utf-8," +
        encodeURIComponent(buildStaticServerErrorHtml(staticServerError));
    }
  }

  // Load the application
  mainWindow
    .loadURL(startUrl)
    .then(() => {
      console.log("Application loaded successfully");
    })
    .catch((err) => {
      console.error("Failed to load application:", err);

      // In development, show a helpful error message
      if (isDev) {
        const devErrorHtml = `
          <html>
            <head>
              <title>Dynasty Manager - Development Error</title>
              <style>
                body { 
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                  text-align: center; 
                  padding: 50px; 
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  margin: 0;
                  color: white;
                }
                .container { 
                  max-width: 500px; 
                  margin: 0 auto; 
                  background: rgba(255,255,255,0.1); 
                  padding: 40px; 
                  border-radius: 15px; 
                  backdrop-filter: blur(10px);
                  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                }
                h1 { margin-top: 0; }
                button { 
                  background: rgba(255,255,255,0.2); 
                  color: white; 
                  border: 2px solid rgba(255,255,255,0.3); 
                  padding: 12px 24px; 
                  border-radius: 25px; 
                  cursor: pointer; 
                  font-size: 16px;
                  transition: all 0.3s ease;
                  margin: 5px;
                }
                button:hover { 
                  background: rgba(255,255,255,0.3); 
                  transform: translateY(-2px);
                }
                .error { color: #ffcccc; margin: 20px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>🏈 Dynasty Manager - Development</h1>
                <p>Unable to connect to the development server.</p>
                <div class="error">Make sure the Next.js development server is running on localhost:3001</div>
                <p>Please run <code>npm run dev</code> in a separate terminal first.</p>
                <button onclick="location.reload()">Retry Connection</button>
                <button onclick="require('electron').shell.openExternal('http://localhost:3001')">Open in Browser</button>
              </div>
            </body>
          </html>
        `;

        mainWindow.loadURL(
          "data:text/html;charset=utf-8," + encodeURIComponent(devErrorHtml)
        );
      }
    });

  // Show window when ready
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    mainWindow.focus();

    // Open DevTools only in development
    if (isDev) {
      //mainWindow.webContents.openDevTools();
    }
  });

  // Handle window closed
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Handle failed loads in production
  mainWindow.webContents.on(
    "did-fail-load",
    (event, errorCode, errorDescription, validatedURL) => {
      console.error(
        "Failed to load:",
        errorCode,
        errorDescription,
        validatedURL
      );

      // Show error page only in production
      if (!isDev) {
        const errorHtml = `
        <html>
          <head>
            <title>Dynasty Manager - Error</title>
            <style>
              body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                text-align: center; 
                padding: 50px; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                margin: 0;
                color: white;
              }
              .container { 
                max-width: 500px; 
                margin: 0 auto; 
                background: rgba(255,255,255,0.1); 
                padding: 40px; 
                border-radius: 15px; 
                backdrop-filter: blur(10px);
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
              }
              h1 { margin-top: 0; }
              button { 
                background: rgba(255,255,255,0.2); 
                color: white; 
                border: 2px solid rgba(255,255,255,0.3); 
                padding: 12px 24px; 
                border-radius: 25px; 
                cursor: pointer; 
                font-size: 16px;
                transition: all 0.3s ease;
              }
              button:hover { 
                background: rgba(255,255,255,0.3); 
                transform: translateY(-2px);
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>🏈 Dynasty Manager</h1>
              <p>Unable to load the application.</p>
              <p>Please restart the application.</p>
              <button onclick="location.reload()">Retry</button>
            </div>
          </body>
        </html>
      `;

        mainWindow.loadURL(
          "data:text/html;charset=utf-8," + encodeURIComponent(errorHtml)
        );
      }
    }
  );

  // Prevent external navigation
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require("electron").shell.openExternal(url);
    return { action: "deny" };
  });
}

// App event handlers
app.whenReady().then(() => {
  createWindow().catch((error) => {
    console.error("Failed to create main window:", error);
    app.quit();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (staticServer) {
    staticServer.close();
    staticServer = null;
    staticServerPort = null;
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow().catch((error) => {
      console.error("Failed to recreate main window:", error);
    });
  }
});

// IPC handlers for localStorage fallback
ipcMain.handle("electron-store-get", async (event, key) => {
  return undefined; // Fall back to localStorage
});

ipcMain.handle("electron-store-set", async (event, key, value) => {
  // Fall back to localStorage
});

ipcMain.handle("electron-store-delete", async (event, key) => {
  // Fall back to localStorage
});

ipcMain.handle("electron-store-clear", async () => {
  // Fall back to localStorage
});

// Security: Prevent new window creation
app.on("web-contents-created", (event, contents) => {
  contents.on("new-window", (event, navigationUrl) => {
    event.preventDefault();
  });
});
