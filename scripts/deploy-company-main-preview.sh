#!/usr/bin/env bash
set -Eeuo pipefail

APP_ROOT="${PACKIT_APP_ROOT:-/opt/packit/apps/company-main}"
REPO_FULL_NAME="${PACKIT_REPO_FULL_NAME:-Dayzcoub/FegSkladSmetaCalkulation_beta-test-v-4.0}"
DEPLOY_REF="${PACKIT_DEPLOY_REF:-main}"
DEPLOY_COMMIT="${PACKIT_DEPLOY_COMMIT:-}"
SERVICE_NAME="${PACKIT_SERVICE_NAME:-packit-company-main-preview.service}"
HEALTH_PORT="${PACKIT_HEALTH_PORT:-8088}"
FILE_OWNER="${PACKIT_DEPLOY_FILE_OWNER:-packit:packit}"
KEEP_RELEASES="${PACKIT_KEEP_RELEASES:-10}"

if [[ "${EUID}" -eq 0 ]]; then
  SUDO=""
else
  SUDO="sudo"
fi

log() {
  echo "[Pack.it deploy] $*"
}

fail() {
  echo "[Pack.it deploy][ERROR] $*" >&2
  exit 1
}

RELEASE_SUFFIX=""
if [[ -n "$DEPLOY_COMMIT" ]]; then
  RELEASE_SUFFIX="-${DEPLOY_COMMIT:0:7}"
fi

REL_ID="$(date -u +%Y%m%d_%H%M%S)${RELEASE_SUFFIX}"
REL_DIR="$APP_ROOT/releases/$REL_ID"
TMP_DIR="/tmp/packit-company-main-deploy-$REL_ID"
TARBALL="$TMP_DIR/source.tar.gz"
EXTRACT_DIR="$TMP_DIR/source"

if [[ -n "$DEPLOY_COMMIT" ]]; then
  SOURCE_URL="https://github.com/$REPO_FULL_NAME/archive/$DEPLOY_COMMIT.tar.gz"
else
  SOURCE_URL="https://github.com/$REPO_FULL_NAME/archive/refs/heads/$DEPLOY_REF.tar.gz"
fi

log "app root: $APP_ROOT"
log "repo: $REPO_FULL_NAME"
log "ref: $DEPLOY_REF"
log "commit: ${DEPLOY_COMMIT:-latest branch tarball}"
log "release: $REL_DIR"

$SUDO mkdir -p "$APP_ROOT/releases" "$APP_ROOT/logs" "$APP_ROOT/backups" "$APP_ROOT/shared"
rm -rf "$TMP_DIR"
mkdir -p "$EXTRACT_DIR"

log "download source tarball"
curl -fsSL --retry 3 --retry-delay 2 -o "$TARBALL" "$SOURCE_URL"

log "extract source"
tar -xzf "$TARBALL" -C "$EXTRACT_DIR"
SRC_DIR="$(find "$EXTRACT_DIR" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
[[ -n "$SRC_DIR" && -d "$SRC_DIR" ]] || fail "cannot find extracted source directory"

$SUDO mkdir -p "$REL_DIR"
log "copy files"
$SUDO cp -a "$SRC_DIR"/. "$REL_DIR"/

log "write release metadata"
$SUDO tee "$REL_DIR/packit-release.json" >/dev/null <<JSON
{
  "schemaVersion": "1.0.0",
  "product": "Pack.it",
  "app": "company-main-preview",
  "releaseId": "$REL_ID",
  "repository": "$REPO_FULL_NAME",
  "branch": "$DEPLOY_REF",
  "commitSha": "${DEPLOY_COMMIT:-}",
  "publicUrl": "http://45.148.118.121:$HEALTH_PORT/#app",
  "previewPort": "$HEALTH_PORT",
  "service": "$SERVICE_NAME",
  "deployedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "deployMethod": "github-actions-ssh-release-tarball"
}
JSON

log "verify release"
[[ -f "$REL_DIR/index.html" ]] || fail "index.html is missing in release"
[[ -f "$REL_DIR/sw.js" ]] || fail "sw.js is missing in release"
[[ -f "$REL_DIR/src/styles/main.css" ]] || fail "src/styles/main.css is missing in release"
[[ -f "$REL_DIR/src/modules/V4AppShell.js" ]] || fail "src/modules/V4AppShell.js is missing in release"

if ! grep -q "PackitShellBranding" "$REL_DIR/index.html"; then
  fail "index.html does not load PackitShellBranding.js"
fi

if ! grep -q "PACKIT_UI_BRAND_ADMIN" "$REL_DIR/sw.js"; then
  log "warning: sw.js does not contain PACKIT_UI_BRAND_ADMIN marker"
fi

if [[ ! -f "$REL_DIR/public/assets/packit/brand/dark/packit_symbol.png" ]]; then
  fail "Pack.it symbol asset is missing: public/assets/packit/brand/dark/packit_symbol.png"
fi

log "ownership"
$SUDO chown -R "$FILE_OWNER" "$REL_DIR" || log "warning: chown $FILE_OWNER failed"

log "switch current symlink"
$SUDO ln -sfn "$REL_DIR" "$APP_ROOT/current"
$SUDO chown -h "$FILE_OWNER" "$APP_ROOT/current" || true

log "restart service: $SERVICE_NAME"
$SUDO systemctl restart "$SERVICE_NAME"

log "wait for HTTP on 127.0.0.1:$HEALTH_PORT"
HTTP_OK="0"
for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:$HEALTH_PORT/" >/dev/null 2>&1; then
    HTTP_OK="1"
    break
  fi
  sleep 1
 done

if [[ "$HTTP_OK" != "1" ]]; then
  $SUDO systemctl status "$SERVICE_NAME" --no-pager || true
  fail "HTTP health check failed"
fi

log "HTTP sw.js head"
curl -fsS "http://127.0.0.1:$HEALTH_PORT/sw.js" | head -n 5 || true

log "current release"
readlink -f "$APP_ROOT/current"

log "cleanup old releases, keep last $KEEP_RELEASES"
if [[ "$KEEP_RELEASES" =~ ^[0-9]+$ ]] && [[ "$KEEP_RELEASES" -gt 0 ]]; then
  mapfile -t OLD_RELEASES < <(find "$APP_ROOT/releases" -mindepth 1 -maxdepth 1 -type d | sort -r | tail -n +$((KEEP_RELEASES + 1)))
  for old in "${OLD_RELEASES[@]:-}"; do
    [[ -n "$old" && "$old" != "$REL_DIR" ]] || continue
    log "remove old release: $old"
    $SUDO rm -rf "$old"
  done
fi

rm -rf "$TMP_DIR"
log "done"
