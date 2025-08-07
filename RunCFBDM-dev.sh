#!/bin/zsh

# Change to the directory where the script is located
cd "$(dirname "$0")"

echo "Starting development server on port 3002..."
npm run electron-dev -- -p 3002

echo "When done, press Ctrl+C to stop the app."