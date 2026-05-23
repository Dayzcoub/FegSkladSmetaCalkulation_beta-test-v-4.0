#!/usr/bin/env bash
set -euo pipefail

ZIP_PATH="${1:-PACKIT_runtime_assets_ready_v1.zip}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$ROOT_DIR"

if [[ ! -f "$ZIP_PATH" ]]; then
  echo "[PACK.IT assets] Runtime assets archive not found: $ZIP_PATH" >&2
  echo "Put PACKIT_runtime_assets_ready_v1.zip into the repository root or pass path as first argument." >&2
  exit 1
fi

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

echo "[PACK.IT assets] Extracting $ZIP_PATH"
unzip -q "$ZIP_PATH" -d "$TMP_DIR"

if [[ ! -d "$TMP_DIR/public" ]]; then
  echo "[PACK.IT assets] Archive does not contain public/ folder. Wrong archive?" >&2
  exit 1
fi

mkdir -p public docs

echo "[PACK.IT assets] Copying public/assets/packit"
cp -R "$TMP_DIR/public/"* public/

if [[ -d "$TMP_DIR/docs" ]]; then
  echo "[PACK.IT assets] Copying docs manifests"
  cp -R "$TMP_DIR/docs/"* docs/
fi

ASSET_COUNT="0"
if [[ -d "public/assets/packit" ]]; then
  ASSET_COUNT="$(find public/assets/packit -type f | wc -l | tr -d ' ')"
fi

echo "[PACK.IT assets] Done. Runtime asset files under public/assets/packit: $ASSET_COUNT"
echo "Next: git status"
echo "Then commit files only, without UI logic changes."
