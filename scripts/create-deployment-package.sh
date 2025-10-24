#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TIMESTAMP="$(date +%Y%m%d%H%M%S)"
PACKAGE_NAME="claude-workflow-engine-deployment-$TIMESTAMP"
STAGING_DIR="$(mktemp -d)"
PACKAGE_DIR="$STAGING_DIR/$PACKAGE_NAME"

echo "📦 Building deployment package: $PACKAGE_NAME"

mkdir -p "$PACKAGE_DIR"

copy_path() {
    local source="$1"
    local destination="$2"
    if [ -d "$source" ]; then
        cp -R "$source" "$destination"
    else
        cp "$source" "$destination"
    fi
}

copy_path "$ROOT_DIR/install.sh" "$PACKAGE_DIR/install.sh"
copy_path "$ROOT_DIR/src" "$PACKAGE_DIR/src"
copy_path "$ROOT_DIR/skills" "$PACKAGE_DIR/skills"
copy_path "$ROOT_DIR/download" "$PACKAGE_DIR/download"
copy_path "$ROOT_DIR/LICENSE" "$PACKAGE_DIR/"
copy_path "$ROOT_DIR/README.md" "$PACKAGE_DIR/"

DOWNLOADS_DIR="$HOME/Downloads"
OUTPUT_ZIP="$DOWNLOADS_DIR/$PACKAGE_NAME.zip"

echo "🗜️  Creating archive at $OUTPUT_ZIP"
(cd "$STAGING_DIR" && zip -qr "$OUTPUT_ZIP" "$PACKAGE_NAME")

rm -rf "$STAGING_DIR"

echo "✅ Deployment package ready"
echo "   -> $OUTPUT_ZIP"
