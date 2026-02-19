#!/bin/bash
set -e

echo "=== Hacking Simulator — AppImage Builder ==="
echo ""

# Ensure we're in the project root
cd "$(dirname "$0")"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "[1/3] Installing dependencies..."
  npm install
else
  echo "[1/3] Dependencies already installed"
fi

# Build the app
echo "[2/3] Building app..."
npm run build

# Build AppImages for both architectures
echo "[3/3] Building AppImages..."
echo ""

echo "  → Building x86_64 AppImage..."
npx electron-builder --linux AppImage --x64

echo ""
echo "  → Building ARM64 AppImage..."
npx electron-builder --linux AppImage --arm64

echo ""
echo "=== Build complete ==="
echo "Output files in ./release/"
ls -lh release/*.AppImage 2>/dev/null || echo "Check ./release/ for output files"
