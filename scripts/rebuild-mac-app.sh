#!/bin/bash

# Rebuild the packaged macOS desktop app and reinstall it over the
# existing /Applications copy.
#
# WHY: The packaged `.app` is a frozen, on-demand snapshot (see the
# "Desktop App (macOS)" section of README.md) - it never auto-updates
# itself when `main` changes. Before this script existed, picking up new
# code required remembering and manually chaining three separate
# commands (build, remove, copy) exactly in order. Wrapping that in one
# script removes the chance of skipping a step or mistyping the
# hardcoded /Applications path.
#
# Usage: npm run rebuild-app
#   (or directly: bash scripts/rebuild-mac-app.sh)

set -e

# Always resolve paths relative to the repo root, regardless of the
# caller's current directory.
cd "$(dirname "$0")/.."

APP_NAME="Dynasty Manager.app"
INSTALL_PATH="/Applications/$APP_NAME"

echo "Building production app (next build + electron-builder)..."
# CSC_IDENTITY_AUTO_DISCOVERY=false skips macOS code-signing identity
# lookup, which otherwise prompts/hangs on machines without a Developer
# ID certificate installed - this is a local, unsigned dev build, not a
# notarized release.
CSC_IDENTITY_AUTO_DISCOVERY=false npm run dist

# electron-builder's output directory name depends on target arch
# (mac-arm64 for Apple Silicon, mac for Intel) - detect whichever one
# this build actually produced instead of hardcoding arm64 and silently
# doing nothing on an Intel machine.
BUILT_APP=""
for CANDIDATE in "dist/mac-arm64/$APP_NAME" "dist/mac/$APP_NAME"; do
  if [[ -d "$CANDIDATE" ]]; then
    BUILT_APP="$CANDIDATE"
    break
  fi
done

if [[ -z "$BUILT_APP" ]]; then
  echo "ERROR: Could not find a built app under dist/mac-arm64 or dist/mac." >&2
  echo "Check the electron-builder output above for the actual path." >&2
  exit 1
fi

echo "Reinstalling over $INSTALL_PATH..."
rm -rf "$INSTALL_PATH"
cp -R "$BUILT_APP" "$INSTALL_PATH"

echo "Done. Reinstalled from: $BUILT_APP"
