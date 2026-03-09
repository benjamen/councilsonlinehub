#!/usr/bin/env bash
# Runs on the production server via GitHub Actions SSH to update the hub site.
set -euo pipefail

BENCH_PATH="/home/frappe-user/frappe-bench"
SITE_NAME="portal.councilsonline.com"
HUB_APP="councilsonlinehub"
HUB_REPO="https://github.com/benjamen/councilsonlinehub.git"

# ── Git pull ──────────────────────────────────────────────────────────────────
git config --global --add safe.directory "$BENCH_PATH/apps/$HUB_APP"
cd "$BENCH_PATH/apps/$HUB_APP"

# Ensure remote origin is set to GitHub (HTTPS — no SSH key needed for public repo)
git remote get-url origin &>/dev/null \
  && git remote set-url origin "$HUB_REPO" \
  || git remote add origin "$HUB_REPO"

echo "==> Pulling $HUB_APP main..."
git fetch origin main
git reset --hard origin/main
git clean -fd
git log -1 --oneline

# ── Frontend build ────────────────────────────────────────────────────────────
FRONTEND="$BENCH_PATH/apps/$HUB_APP/frontend"
echo "==> Building frontend..."

cd "$FRONTEND"

# Remove node_modules — may be root-owned if initial install ran as root.
# If removal fails, skip it (yarn install will overwrite/update in place).
# ONE-TIME FIX if this keeps failing: SSH to server and run:
#   sudo chown -R frappe-user:frappe-user ~/frappe-bench/apps/councilsonlinehub/frontend/
if ! rm -rf node_modules 2>/dev/null; then
  echo "WARNING: Could not remove node_modules (root-owned). Run on server: sudo chown -R frappe-user:frappe-user ~/frappe-bench/apps/councilsonlinehub/frontend/"
fi

yarn install
yarn build

# ── Python / Frappe ───────────────────────────────────────────────────────────
find "$BENCH_PATH/apps/$HUB_APP" -name '*.pyc' -delete 2>/dev/null || true
find "$BENCH_PATH/apps/$HUB_APP" -type d -name '__pycache__' -exec rm -rf {} + 2>/dev/null || true

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
