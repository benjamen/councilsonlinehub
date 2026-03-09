#!/usr/bin/env bash
# Run on server by GitHub Actions to update the hub site after a push to main.
set -euo pipefail

BENCH_PATH="/home/frappe-user/frappe-bench"
SITE_NAME="portal.councilsonline.com"
HUB_APP="councilsonlinehub"
HUB_REPO="https://github.com/benjamen/councilsonlinehub.git"

export GIT_SSH_COMMAND="ssh -i ~/.ssh/id_ed25519_benja_repo -o StrictHostKeyChecking=no"
git config --global --add safe.directory "$BENCH_PATH/apps/$HUB_APP"

echo "==> Pulling $HUB_APP (main)..."
cd "$BENCH_PATH/apps/$HUB_APP"

# Ensure origin points to GitHub
if ! git remote get-url origin &>/dev/null; then
  echo "Adding origin remote..."
  git remote add origin "$HUB_REPO"
fi
# Re-set origin in case it's pointing somewhere wrong
git remote set-url origin "$HUB_REPO"

git fetch origin main
git reset --hard origin/main
git clean -fd
git log -1 --oneline

echo "==> Building hub standalone frontend..."
# Compute frontend path explicitly to ensure correct expansion inside sudo commands.
FRONTEND_DIR="$BENCH_PATH/apps/$HUB_APP/frontend"
cd "$FRONTEND_DIR"
# Clean node_modules (may be owned by different user — use sudo if needed)
sudo rm -rf node_modules 2>/dev/null || rm -rf node_modules 2>/dev/null || true
rm -rf node_modules.bak.* 2>/dev/null || true
# Ensure frontend directory ownership is correct so yarn can write node_modules.
# Some CI runs or previous commands may create root-owned files; fix ownership
# before running package install.
sudo chown -R frappe-user:frappe-user "$BENCH_PATH/apps/$HUB_APP/frontend" 2>/dev/null || true
# Defensive cleanup: remove any leftover node_modules and caches that may be
# owned by root or another user, then ensure the frontend directory is owned
# by `frappe-user` so the install runs without permission errors.
sudo rm -rf "$FRONTEND_DIR/node_modules" 2>/dev/null || true
sudo rm -rf "$FRONTEND_DIR/.turbo" 2>/dev/null || true
sudo chown -R frappe-user:frappe-user "$FRONTEND_DIR" 2>/dev/null || true

# Run yarn explicitly as the `frappe-user` to avoid creating root-owned files.
sudo -H -u frappe-user bash -lc "cd '$FRONTEND_DIR' && yarn install --network-timeout 100000"

# Build as the same user so generated assets are owned correctly.
sudo -H -u frappe-user bash -lc "cd '$FRONTEND_DIR' && VITE_BUILD_TIME=$(date +%s) yarn build"

echo "==> Clearing Python bytecode..."
find "$BENCH_PATH/apps/$HUB_APP" -name '*.pyc' -delete 2>/dev/null || true
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
