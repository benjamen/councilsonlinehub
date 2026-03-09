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
echo "==> Installing frontend dependencies..."
# Check if non-interactive sudo is available. If so, we can perform sudo operations.
if sudo -n true 2>/dev/null; then
  echo "non-interactive sudo available — performing cleanup and install with sudo where needed"
  sudo rm -rf "$FRONTEND_DIR/node_modules" 2>/dev/null || true
  sudo rm -rf "$FRONTEND_DIR/.turbo" 2>/dev/null || true
  sudo chown -R frappe-user:frappe-user "$FRONTEND_DIR" 2>/dev/null || true

  # Run yarn as frappe-user (sudo -u) to avoid root-owned files
  if sudo -H -u frappe-user bash -lc "cd '$FRONTEND_DIR' && yarn install --network-timeout 100000"; then
    echo "yarn install succeeded as frappe-user"
  else
    echo "yarn install failed as frappe-user; retrying as root with unsafe-perm..."
    if sudo -H bash -lc "cd '$FRONTEND_DIR' && npm_config_unsafe_perm=true yarn install --network-timeout 100000"; then
      echo "yarn install succeeded as root (unsafe-perm)"
      sudo chown -R frappe-user:frappe-user "$FRONTEND_DIR" 2>/dev/null || true
    else
      echo "ERROR: yarn install failed (both as frappe-user and as root)." >&2
      exit 1
    fi
  fi

  echo "==> Building frontend (as frappe-user)..."
  if sudo -H -u frappe-user bash -lc "cd '$FRONTEND_DIR' && VITE_BUILD_TIME=$(date +%s) yarn build"; then
    echo "frontend build succeeded"
  else
    echo "Build failed when running as frappe-user; attempting as root (unsafe-perm)..."
    if sudo -H bash -lc "cd '$FRONTEND_DIR' && VITE_BUILD_TIME=$(date +%s) npm_config_unsafe_perm=true yarn build"; then
      echo "frontend build succeeded as root"
      sudo chown -R frappe-user:frappe-user "$FRONTEND_DIR" 2>/dev/null || true
    else
      echo "ERROR: frontend build failed (both as frappe-user and as root)." >&2
      exit 1
    fi
  fi
else
  echo "non-interactive sudo NOT available — falling back to per-project modules install"
  # Create a writable modules folder in the frontend directory and install there.
  mkdir -p "$FRONTEND_DIR/.node_modules_tmp"
  if cd "$FRONTEND_DIR" && yarn install --modules-folder ./.node_modules_tmp --network-timeout 100000; then
    echo "yarn install succeeded into .node_modules_tmp"
  else
    echo "ERROR: yarn install into .node_modules_tmp failed." >&2
    exit 1
  fi

  echo "==> Building frontend using .node_modules_tmp (NODE_PATH)..."
  # Ensure an index.html exists for Vite — the project uses a template located at
  # ../councilsonlinehub/www/frontend.html; copy it into the frontend dir if
  # missing so Vite can find an entry module.
  if [ ! -f "$FRONTEND_DIR/index.html" ] && [ -f "$BENCH_PATH/apps/$HUB_APP/councilsonlinehub/www/frontend.html" ]; then
    cp "$BENCH_PATH/apps/$HUB_APP/councilsonlinehub/www/frontend.html" "$FRONTEND_DIR/index.html"
  fi

  if cd "$FRONTEND_DIR" && NODE_PATH=./.node_modules_tmp VITE_BUILD_TIME=$(date +%s) yarn build; then
    echo "frontend build succeeded using .node_modules_tmp"
  else
    echo "ERROR: frontend build failed using .node_modules_tmp." >&2
    exit 1
  fi
fi

# Copy built frontend into the site's public directory so nginx/bench serves it at /frontend
BUILT_FRONTEND_DIR="$BENCH_PATH/apps/$HUB_APP/councilsonlinehub/public/frontend"
SITE_PUBLIC_DIR="$BENCH_PATH/sites/$SITE_NAME/public/frontend"
if [ -d "$BUILT_FRONTEND_DIR" ]; then
  echo "==> Deploying built frontend to site public folder: $SITE_PUBLIC_DIR"
  sudo rm -rf "$SITE_PUBLIC_DIR" 2>/dev/null || true
  sudo mkdir -p "$SITE_PUBLIC_DIR" 2>/dev/null || true
  sudo cp -r "$BUILT_FRONTEND_DIR/." "$SITE_PUBLIC_DIR/"
  sudo chown -R frappe-user:frappe-user "$SITE_PUBLIC_DIR" 2>/dev/null || true

  # Ensure root URL redirects to /frontend by placing a simple index.html in site public
  SITE_INDEX="$BENCH_PATH/sites/$SITE_NAME/public/index.html"
  echo "<!doctype html><html><head><meta http-equiv=\"refresh\" content=\"0;url=/frontend\"></head><body></body></html>" | sudo tee "$SITE_INDEX" >/dev/null || true
  sudo chown frappe-user:frappe-user "$SITE_INDEX" 2>/dev/null || true
else
  echo "WARNING: built frontend directory not found: $BUILT_FRONTEND_DIR"
fi

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
