#!/bin/bash

# Generate a Mac OS X .icns icon file from a source PNG.
#
# WHY: Icon regeneration must be reproducible and scriptable for CI/CD pipelines
# and local development. This script ensures consistent icon conversion with proper
# validation of source image dimensions and cleanup of temporary files.
#
# Usage: bash scripts/generate-mac-icon.sh [source_png_path]
#   If source_png_path is omitted, defaults to public/logos/App_Logo.png
#
# Requirements: macOS with sips and iconutil (built-in)

set -e

# Source PNG path — defaults to the standard app logo
SRC="${1:-public/logos/App_Logo.png}"

# Scratch iconset directory (removed after conversion)
ICONSET="/tmp/dynasty-manager-icon.iconset"

# Target output location
OUT="assets/icon.icns"

# Verify source exists
if [[ ! -f "$SRC" ]]; then
  echo "ERROR: Source image not found: $SRC" >&2
  exit 1
fi

# Verify source is at least 512x512 (minimum for Retina @2x icon)
DIMENSIONS=$(sips -g pixelWidth -g pixelHeight "$SRC" 2>&1 | grep -E "pixel(Width|Height):" || true)
WIDTH=$(echo "$DIMENSIONS" | grep "pixelWidth:" | awk '{print $NF}')
HEIGHT=$(echo "$DIMENSIONS" | grep "pixelHeight:" | awk '{print $NF}')

if [[ -z "$WIDTH" ]] || [[ -z "$HEIGHT" ]]; then
  echo "ERROR: Could not determine dimensions of $SRC" >&2
  exit 1
fi

if [[ $WIDTH -lt 512 ]] || [[ $HEIGHT -lt 512 ]]; then
  echo "ERROR: Source image must be at least 512x512 pixels. Got: ${WIDTH}x${HEIGHT}" >&2
  exit 1
fi

# Clean up any existing iconset directory
if [[ -d "$ICONSET" ]]; then
  rm -rf "$ICONSET"
fi

# Create fresh iconset directory
mkdir -p "$ICONSET"

# Generate each required icon size using sips
# Format: icon_<size>x<size>[@2x].png — the @2x suffix indicates double density (2x pixel scale)
echo "Generating icon assets..."
sips -z 16 16 "$SRC" --out "$ICONSET/icon_16x16.png"
sips -z 32 32 "$SRC" --out "$ICONSET/icon_16x16@2x.png"
sips -z 32 32 "$SRC" --out "$ICONSET/icon_32x32.png"
sips -z 64 64 "$SRC" --out "$ICONSET/icon_32x32@2x.png"
sips -z 128 128 "$SRC" --out "$ICONSET/icon_128x128.png"
sips -z 256 256 "$SRC" --out "$ICONSET/icon_128x128@2x.png"
sips -z 256 256 "$SRC" --out "$ICONSET/icon_256x256.png"
sips -z 512 512 "$SRC" --out "$ICONSET/icon_256x256@2x.png"
sips -z 512 512 "$SRC" --out "$ICONSET/icon_512x512.png"
sips -z 1024 1024 "$SRC" --out "$ICONSET/icon_512x512@2x.png"

# Convert iconset to .icns format
echo "Converting to .icns format..."
iconutil -c icns "$ICONSET" -o "$OUT"

# Clean up scratch directory
rm -rf "$ICONSET"

# Final confirmation
echo "Icon generation complete:"
file "$OUT"
