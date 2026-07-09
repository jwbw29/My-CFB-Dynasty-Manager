#!/usr/bin/env node
/**
 * TeamCrafters CFB27 roster extractor.
 *
 * This script exists as a one-time data generation utility so the main app can
 * bootstrap dynasty rosters from a static JSON file without runtime scraping.
 *
 * Usage:
 *   node extract-rosters.js
 *   node extract-rosters.js --dry-run
 */

const fs = require("node:fs/promises");
const path = require("node:path");
const axios = require("axios");
const cheerio = require("cheerio");

const BASE_URL = "https://www.teamcrafters.net";
const ROSTER_INDEX_URL = `${BASE_URL}/rosters/CFB27/launch-6-30-26`;
const TEAM_PAGE_URL = (teamId) =>
  `${BASE_URL}/rosters/CFB27/launch-6-30-26/${encodeURIComponent(teamId)}`;
const OUTPUT_PATH = path.resolve(__dirname, "../public/data/default-rosters.json");
const FBS_TEAMS_PATH = path.resolve(__dirname, "../src/utils/fbsTeams.ts");

// Keep request pace at ~1.5 req/sec to avoid hammering TeamCrafters.
const REQUEST_DELAY_MS = 700;

/**
 * Alias table for team-name normalization when TeamCrafters labels differ from
 * our exact app team names.
 */
const TEAM_NAME_ALIASES = {
  "app state": "Appalachian State",
  "connecticut": "UConn",
  "kansas": "kansas",
  "louisiana monroe": "Louisiana-Monroe",
  "miami": "Miami (FL)",
  "miami florida": "Miami (FL)",
  "miami oh": "Miami (OH)",
  "mississippi": "Ole Miss",
  "ole miss": "Ole Miss",
  "sacramento state university": "Sacramento State",
  "southern mississippi": "Southern Miss",
  "south florida": "South Florida",
  "uconn": "UConn",
  "ul monroe": "Louisiana-Monroe",
  "ulm": "Louisiana-Monroe",
  "umass": "UMass",
  "utsa": "UTSA",
};

/**
 * Manual team-id override table for known edge cases where index-page parsing
 * can lose clean anchor text. Empty by default; easy place for future fixes.
 */
const TEAM_ID_NAME_OVERRIDES = {
  // Uses en-dash format that doesn't directly match our source team string.
  674: "Louisiana-Monroe",
};

/**
 * Position map normalizes TeamCrafters position labels into the app's expected
 * roster values for import defaults.
 */
const POSITION_MAP = {
  C: "C",
  CB: "CB",
  DB: "CB",
  DT: "DT",
  EDGE: "RE",
  FB: "FB",
  FS: "FS",
  HB: "HB",
  K: "K",
  LG: "LG",
  LE: "LE",
  LEDGE: "LE",
  LOLB: "LOLB",
  LT: "LT",
  MLB: "MLB",
  MIKE: "MLB",
  NT: "DT",
  OLB: "LOLB",
  P: "P",
  PK: "K",
  QB: "QB",
  RB: "HB",
  RE: "RE",
  REDGE: "RE",
  RG: "RG",
  ROLB: "ROLB",
  RT: "RT",
  S: "SS",
  SAM: "LOLB",
  SS: "SS",
  TE: "TE",
  WR: "WR",
  WILL: "ROLB",
};

const VALID_POSITIONS = new Set([
  "QB",
  "HB",
  "WR",
  "TE",
  "LT",
  "LG",
  "C",
  "RG",
  "RT",
  "LE",
  "RE",
  "DT",
  "LOLB",
  "MLB",
  "ROLB",
  "CB",
  "FS",
  "SS",
  "K",
  "P",
  "FB",
]);

const YEAR_MAP = {
  FR: "FR",
  FRESHMAN: "FR",
  RSFR: "FR",
  SO: "SO",
  SOPHOMORE: "SO",
  RSSO: "SO",
  JR: "JR",
  JUNIOR: "JR",
  RSJR: "JR",
  SR: "SR",
  SENIOR: "SR",
  RSSR: "SR",
  TR: "TR",
  TRANSFER: "TR",
};

/**
 * Applies a small delay so we stay under agreed scraping rate limits.
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Converts names to a loose canonical key for robust alias matching.
 */
function normalizeKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\blogo\b/g, "")
    .replace(/\buniversity\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Reads FBS team names from source-of-truth app data and removes non-FBS rows.
 */
async function loadFbsTeamNames() {
  const source = await fs.readFile(FBS_TEAMS_PATH, "utf8");
  const nameMatches = [...source.matchAll(/name:\s*"([^"]+)"/g)].map((m) => m[1]);
  return [...new Set(nameMatches)];
}

/**
 * Resolves a TeamCrafters label into an exact fbsTeams.ts name.
 */
function resolveTeamName(rawName, fbsNameSet, fbsNameByKey) {
  const raw = String(rawName || "").trim();
  if (!raw) {
    return null;
  }

  if (fbsNameSet.has(raw)) {
    return raw;
  }

  const alias = TEAM_NAME_ALIASES[normalizeKey(raw)];
  if (alias && fbsNameSet.has(alias)) {
    return alias;
  }

  const keyed = fbsNameByKey.get(normalizeKey(raw));
  if (keyed) {
    return keyed;
  }

  return null;
}

/**
 * Cleans noisy index labels into probable team names by stripping trailing
 * ratings/conference text and then matching against known app names.
 */
function sanitizeDirectoryTeamLabel(rawLabel, fbsNames) {
  const compact = String(rawLabel || "").replace(/\s+/g, " ").trim();
  if (!compact) {
    return "";
  }

  const offIndex = compact.search(/\bOFF\s*:/i);
  const trimmed = offIndex >= 0 ? compact.slice(0, offIndex).trim() : compact;
  const normalized = normalizeKey(trimmed);

  const candidates = [...fbsNames].sort((a, b) => b.length - a.length);
  for (const name of candidates) {
    const teamKey = normalizeKey(name);
    if (normalized.startsWith(teamKey) || normalized.includes(teamKey)) {
      return name;
    }
  }

  return trimmed;
}

/**
 * Loads team IDs from TeamCrafters listing page.
 */
async function loadTeamDirectory() {
  const { data: html } = await axios.get(ROSTER_INDEX_URL, {
    timeout: 30_000,
    headers: {
      "User-Agent": "CFB-Dynasty-Manager-RosterExtractor/1.0",
    },
  });

  const $ = cheerio.load(html);
  const byId = new Map();

  $("a[href^='/rosters/CFB27/launch-6-30-26/']").each((_, element) => {
    const href = $(element).attr("href") || "";
    const idMatch = href.match(/\/rosters\/CFB27\/launch-6-30-26\/(\d+)\/?$/);
    if (!idMatch) {
      return;
    }

    const teamId = idMatch[1];
    const anchorText = $(element).text().replace(/\s+/g, " ").trim();
    const imgAlt = $(element).find("img").attr("alt") || "";
    const fallback = imgAlt.replace(/\blogo\b/i, "").trim();
    const label = anchorText || fallback || "";

    if (!byId.has(teamId) || label.length > byId.get(teamId).length) {
      byId.set(teamId, label);
    }
  });

  return byId;
}

/**
 * Pulls and decodes Next.js Flight payload strings from team HTML.
 */
function extractFlightSegmentsFromHtml(html) {
  const stringPushRegex =
    /self\.__next_f\.push\(\s*\[1\s*,\s*"((?:\\.|[^"])*)"\s*\]\s*\)/g;
  const segments = [];
  let match = stringPushRegex.exec(html);
  while (match !== null) {
    try {
      // JSON.parse decodes escaped content reliably without ad-hoc replacements.
      segments.push(JSON.parse(`"${match[1]}"`));
    } catch {
      // Ignore malformed push literals and continue parsing the rest.
    }
    match = stringPushRegex.exec(html);
  }

  return segments;
}

/**
 * Extracts a balanced JSON-like array from text at the provided '[' index.
 */
function extractBalancedArray(text, startIndex) {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = startIndex; i < text.length; i += 1) {
    const char = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "[") {
      depth += 1;
    } else if (char === "]") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(startIndex, i + 1);
      }
    }
  }

  return null;
}

/**
 * Finds the most likely players array in a decoded Flight payload.
 */
function extractPlayersArrayFromDecodedText(decodedText) {
  const markerRegex = /"players"\s*:\s*\[/g;
  let best = null;
  let match = markerRegex.exec(decodedText);
  while (match !== null) {
    const arrayStart = decodedText.indexOf("[", match.index);
    if (arrayStart < 0) {
      match = markerRegex.exec(decodedText);
      continue;
    }

    const arrayLiteral = extractBalancedArray(decodedText, arrayStart);
    if (!arrayLiteral) {
      match = markerRegex.exec(decodedText);
      continue;
    }

    try {
      const parsed = JSON.parse(arrayLiteral);
      if (!Array.isArray(parsed)) {
        continue;
      }

      const score = parsed.filter((item) => {
        if (!item || typeof item !== "object") {
          return false;
        }

        const hasName = item.firstName || item.lastName || item.name;
        const hasPosition = item.position || item.pos || item.playerProfile?.position;
        const hasOverall =
          item.ovr || item.overall || item.OVR || item.playerProfile?.overall;
        return Boolean(hasName && hasPosition && hasOverall);
      }).length;

      if (!best || score > best.score) {
        best = { parsed, score };
      }
    } catch {
      // Some Flight chunks can still be non-JSON; skip this candidate.
    }

    match = markerRegex.exec(decodedText);
  }

  return best ? best.parsed : [];
}

/**
 * Reads nested values with a fallback path list.
 */
function pickValue(source, paths) {
  for (const pathKey of paths) {
    const parts = pathKey.split(".");
    let cursor = source;

    for (const part of parts) {
      if (!cursor || typeof cursor !== "object" || !(part in cursor)) {
        cursor = undefined;
        break;
      }
      cursor = cursor[part];
    }

    if (cursor !== undefined && cursor !== null && cursor !== "") {
      return cursor;
    }
  }
  return null;
}

/**
 * Converts TeamCrafters height formats to integer inches.
 */
function parseHeightInches(heightValue) {
  if (typeof heightValue === "number" && Number.isFinite(heightValue)) {
    return Math.round(heightValue);
  }

  const raw = String(heightValue || "").trim();
  if (!raw) {
    return null;
  }

  const ftInMatch = raw.match(/(\d+)\s*['-]\s*(\d{1,2})/);
  if (ftInMatch) {
    return Number(ftInMatch[1]) * 12 + Number(ftInMatch[2]);
  }

  const compactMatch = raw.match(/^(\d)(\d{2})$/);
  if (compactMatch) {
    return Number(compactMatch[1]) * 12 + Number(compactMatch[2]);
  }

  const numeric = Number(raw);
  return Number.isFinite(numeric) ? Math.round(numeric) : null;
}

/**
 * Produces consistent roster year labels with redshirt applied.
 */
function normalizeYear(classValue, isRedshirted) {
  const cleaned = String(classValue || "").toUpperCase().replace(/[^A-Z]/g, "");
  const base = YEAR_MAP[cleaned] || YEAR_MAP[cleaned.slice(0, 2)] || "FR";

  if (isRedshirted && ["FR", "SO", "JR", "SR"].includes(base)) {
    return `${base} (RS)`;
  }
  return base;
}

/**
 * Normalizes TeamCrafters position labels to approved output values.
 */
function normalizePosition(positionValue) {
  const key = String(positionValue || "").toUpperCase().replace(/[^A-Z]/g, "");
  if (!key) {
    return null;
  }

  if (POSITION_MAP[key]) {
    return POSITION_MAP[key];
  }

  if (VALID_POSITIONS.has(key)) {
    return key;
  }

  return null;
}

/**
 * Converts a TeamCrafters player object into the app's roster shape.
 */
function mapPlayer(rawPlayer) {
  const firstName = pickValue(rawPlayer, ["firstName", "playerProfile.firstName"]);
  const lastName = pickValue(rawPlayer, ["lastName", "playerProfile.lastName"]);
  const fullNameFromSource = pickValue(rawPlayer, ["name", "playerProfile.name"]);
  const name =
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    String(fullNameFromSource || "").trim();

  const position = normalizePosition(
    pickValue(rawPlayer, ["position", "pos", "POS", "playerProfile.position"])
  );
  if (!name || !position) {
    return null;
  }

  const redshirtRaw = pickValue(rawPlayer, [
    "playerProfile.redshirt",
    "isRedshirted",
    "redshirt",
    "redshirted",
  ]);
  const isRedshirted =
    redshirtRaw === true || redshirtRaw === "true" || Number(redshirtRaw) === 1;

  const year = normalizeYear(
    pickValue(rawPlayer, ["class", "year", "playerClass", "playerProfile.class"]),
    isRedshirted
  );

  const ratingRaw = pickValue(rawPlayer, [
    "OVR",
    "ovr",
    "overall",
    "playerProfile.ovr",
    "playerProfile.overall",
  ]);
  const jerseyRaw = pickValue(rawPlayer, [
    "number",
    "jerseyNumber",
    "jersey",
    "playerProfile.number",
    "playerProfile.jerseyNumber",
  ]);

  return {
    name,
    position,
    year,
    rating: String(ratingRaw ?? "0"),
    jerseyNumber: String(jerseyRaw ?? ""),
    height: parseHeightInches(
      pickValue(rawPlayer, ["height", "Height", "playerProfile.height"])
    ),
    weight: Number(
      pickValue(rawPlayer, ["weight", "Weight", "playerProfile.weight"]) ?? 0
    ),
    devTrait: "Normal",
    isRedshirted,
    isTransferring: false,
    isDrafted: false,
  };
}

/**
 * Fetches and parses one roster page into normalized players.
 */
async function fetchTeamRoster(teamId) {
  const { data: html } = await axios.get(TEAM_PAGE_URL(teamId), {
    timeout: 30_000,
    headers: {
      "User-Agent": "CFB-Dynasty-Manager-RosterExtractor/1.0",
    },
  });

  const decodedText = extractFlightSegmentsFromHtml(html).join("\n");
  const playersRaw = extractPlayersArrayFromDecodedText(decodedText);

  const mappedPlayers = playersRaw
    .map(mapPlayer)
    .filter(Boolean)
    .filter((player) => VALID_POSITIONS.has(player.position));

  const rawTeamNameMatch = decodedText.match(
    /"team"\s*:\s*\{\s*"name"\s*:\s*"([^"]+)"/i
  );
  const rawTeamNameAlt = decodedText.match(/"teamName"\s*:\s*"([^"]+)"/i);
  const rawTeamName = rawTeamNameMatch?.[1] || rawTeamNameAlt?.[1] || null;

  return {
    rawTeamName,
    players: mappedPlayers,
  };
}

/**
 * Main entry point for extraction workflow.
 */
async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const fbsTeamNames = await loadFbsTeamNames();
  const fbsNameSet = new Set(fbsTeamNames);
  const fbsNameByKey = new Map(fbsTeamNames.map((name) => [normalizeKey(name), name]));

  console.log(`Loaded ${fbsTeamNames.length} FBS team names from fbsTeams.ts`);

  const directory = await loadTeamDirectory();
  console.log(`Found ${directory.size} roster links in TeamCrafters index.`);

  const teamIdToName = new Map();
  const unresolvedFromDirectory = [];

  for (const [teamId, rawName] of directory.entries()) {
    const sanitized = sanitizeDirectoryTeamLabel(rawName, fbsTeamNames);
    const override = TEAM_ID_NAME_OVERRIDES[teamId];
    const resolved =
      override || resolveTeamName(sanitized, fbsNameSet, fbsNameByKey) || null;
    if (resolved) {
      if (!teamIdToName.has(teamId)) {
        teamIdToName.set(teamId, resolved);
      }
    } else {
      unresolvedFromDirectory.push({ teamId, rawName: sanitized });
    }
  }

  const outputTeams = {};
  const seenFbsTeamNames = new Set();
  const teamIdMappingTable = {};

  for (const [teamId, resolvedTeamName] of teamIdToName.entries()) {
    if (seenFbsTeamNames.has(resolvedTeamName)) {
      continue;
    }

    try {
      const roster = await fetchTeamRoster(teamId);
      outputTeams[resolvedTeamName] = roster.players;
      seenFbsTeamNames.add(resolvedTeamName);
      teamIdMappingTable[teamId] = resolvedTeamName;

      console.log(
        `[${seenFbsTeamNames.size}/${fbsTeamNames.length}] ${resolvedTeamName} (id=${teamId}) -> ${roster.players.length} players`
      );
    } catch (error) {
      console.warn(`Failed to parse roster for ${resolvedTeamName} (id=${teamId}):`, error.message);
    }

    await sleep(REQUEST_DELAY_MS);
  }

  const missingTeams = fbsTeamNames.filter((teamName) => !seenFbsTeamNames.has(teamName));
  const validationRows = Object.entries(outputTeams).map(([teamName, roster]) => ({
    teamName,
    playerCount: roster.length,
  }));

  const payload = {
    meta: {
      source: "teamcrafters.net",
      extractedAt: new Date().toISOString(),
      version: "CFB27-Beta",
    },
    teamIdMappingTable,
    teams: outputTeams,
  };

  console.log("\nValidation Report");
  console.log("-----------------");
  console.log(`Team count in output: ${Object.keys(outputTeams).length}`);
  console.log(
    `Teams with roster data: ${validationRows.filter((row) => row.playerCount > 0).length}`
  );
  console.log(`Unmapped index teams: ${unresolvedFromDirectory.length}`);
  if (unresolvedFromDirectory.length > 0) {
    const preview = unresolvedFromDirectory.slice(0, 10);
    console.log("Unmapped index preview:", preview);
  }

  const outOfRange = validationRows.filter(
    (row) => row.playerCount > 0 && (row.playerCount < 50 || row.playerCount > 130)
  );
  if (outOfRange.length > 0) {
    console.warn("Teams outside expected roster range (50-130):", outOfRange);
  }

  if (missingTeams.length > 0) {
    console.warn(`Missing ${missingTeams.length} FBS teams:`, missingTeams);
  }

  if (!dryRun) {
    await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    console.log(`\nWrote output JSON to: ${OUTPUT_PATH}`);
  } else {
    console.log("\nDry-run mode: skipped writing output file.");
  }

  if (missingTeams.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Roster extraction failed:", error);
  process.exitCode = 1;
});
