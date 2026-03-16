#!/usr/bin/env bash
# Runs on the production server via GitHub Actions SSH to update the hub site.
set -euo pipefail

BENCH_PATH="/home/frappe-user/frappe-bench"
SITE_NAME="portal.councilsonline.com"
HUB_APP="councilsonlinehub"
HUB_REPO="https://github.com/benjamen/councilsonlinehub.git"
APP_DIR="$BENCH_PATH/apps/$HUB_APP"
FRONTEND="$APP_DIR/frontend"

# ── Reclaim ownership (in case any file was ever written by root) ─────────────
# frappe-user has passwordless sudo for service management, so chown works too.
sudo chown -R frappe-user:frappe-user "$APP_DIR/" 2>/dev/null || true

# ── Git pull ──────────────────────────────────────────────────────────────────
git config --global --add safe.directory "$APP_DIR"
cd "$APP_DIR"

git remote get-url origin &>/dev/null \
  && git remote set-url origin "$HUB_REPO" \
  || git remote add origin "$HUB_REPO"

echo "==> Pulling $HUB_APP main..."
git fetch origin main
git reset --hard origin/main
git clean -fd
git log -1 --oneline

# ── Frontend build ────────────────────────────────────────────────────────────
echo "==> Building frontend..."
cd "$FRONTEND"

# mv only needs write access on the parent dir (which frappe-user owns), so it
# succeeds even when node_modules contains root-owned files; rm -rf would fail.
rm -rf node_modules 2>/dev/null \
  || mv node_modules "node_modules.bak.$(date +%s)" 2>/dev/null \
  || true
rm -rf node_modules.bak.* 2>/dev/null || true

yarn install
yarn build

# ── Python / Frappe ───────────────────────────────────────────────────────────
find "$APP_DIR" -name '*.pyc' -delete 2>/dev/null || true
find "$APP_DIR" -type d -name '__pycache__' -exec rm -rf {} + 2>/dev/null || true

echo "==> Migrating $SITE_NAME..."
cd "$BENCH_PATH"
bench --site "$SITE_NAME" migrate
bench --site "$SITE_NAME" import-fixtures || echo "fixture warnings (non-fatal)"
bench --site "$SITE_NAME" clear-cache
bench --site "$SITE_NAME" clear-website-cache
redis-cli FLUSHALL || true

# ── Restart ───────────────────────────────────────────────────────────────────
echo "==> Restarting services..."
bench restart || true
sudo supervisorctl stop all || true
sleep 2
sudo supervisorctl reread && sudo supervisorctl update && sudo supervisorctl start all || true
sleep 2
sudo systemctl reload nginx

echo "==> Done: https://$SITE_NAME"
