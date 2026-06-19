#!/bin/bash
set -e

APP_NAME="IT-Dashboard"
VERSION=$(node -p "require('./package.json').version")
APP_PATH="release/mac-arm64/${APP_NAME}.app"
PKG_OUT="release/${APP_NAME}-${VERSION}-arm64.pkg"

if [ ! -d "$APP_PATH" ]; then
  echo "Error: $APP_PATH no existe. Corre 'npm run pack' primero."
  exit 1
fi

echo "Firmando app con ad-hoc..."
codesign --deep --force --sign - "$APP_PATH"

echo "Construyendo pkg..."
pkgbuild \
  --root "$APP_PATH" \
  --install-location "/Applications/${APP_NAME}.app" \
  --identifier "co.nubank.it-dashboard" \
  --version "$VERSION" \
  "$PKG_OUT"

echo "PKG generado: $PKG_OUT"
