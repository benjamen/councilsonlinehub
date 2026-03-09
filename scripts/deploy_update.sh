#!/usr/bin/env bash
# Run on server by GitHub Actions to update the hub site after a push to main.
set -euo pipefail

BENCH_PATH="/home/frappe-user/frappe-bench"
SITE_NAME="portal.councilsonline.com"
HUB_APP="councilsonlinehub"

export GIT_SSH_COMMAND="ssh -i ~/.ssh/id_ed25519_benja_repo -o StrictHostKeyChecking=no"
git config --global --add safe.directory "$BENCH_PATH/apps/$HUB_APP"

echo "==> Pulling $HUB_APP (main)..."
cd "$BENCH_PATH/apps/$HUB_APP"
git fetch origin main && git reset --hard origin/main && git clean -fd
git log -1 --oneline

echo "==> Building hub standalone frontend..."
cd "$BENCH_PATH/apps/$HUB_APP/frontend"
rm -rf node_modules.bak.* 2>/dev/null || true
yarn install --frozen-lockfile
VITE_BUILD_TIME=$(date +%s) yarn build

echo "==> Clearing Python bytecode..."
find "$BENCH_PATH/apps/$HUB_APP" -name '*.pyc' -delete
find "$BENCH_PATH/apps/$HUB_APP" -type d -name '__pycache__' -exec rm -rf {} + 2>/dev/null || true

echo "==> Migrating..."
cd "$BENCH_PATH"
bench --site "$SITE_NAME" migrate
bench --site "$SITE_NAME" import-fixtures || echo "fixture warnings"
bench --site "$SITE_NAME" clear-cache
bench --site "$SITE_NAME" clear-website-cache
redis-cli FLUSHALL || true

echo "==> Restarting..."
bench restart || true
sudo supervisorctl stop all || true
sleep 2
sudo supervisorctl reread && sudo supervisorctl update && sudo supervisorctl start all || true
sleep 2
sudo systemctl reload nginx

echo "==> Done: https://$SITE_NAME"
