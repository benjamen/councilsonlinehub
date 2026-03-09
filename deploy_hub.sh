#!/usr/bin/env bash
# =============================================================================
# CouncilsOnline Hub — Production Setup Script (run ONCE on server)
# =============================================================================
set -euo pipefail

BENCH_PATH="/home/frappe-user/frappe-bench"
SITE_NAME="${HUB_SITE:-portal.councilsonline.com}"
SSH_KEY="$HOME/.ssh/id_ed25519_benja_repo"
HUB_REPO="https://github.com/benjamen/councilsonlinehub.git"
HUB_APP="councilsonlinehub"
COUNCIL_SITE="${COUNCIL_SITE:-demo.councilsonline.com}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; exit 1; }

echo "CouncilsOnline Hub — Production Setup: $SITE_NAME"

[ -d "$BENCH_PATH" ] || fail "Bench not found at $BENCH_PATH"
export GIT_SSH_COMMAND="ssh -i $SSH_KEY -o StrictHostKeyChecking=no"
cd "$BENCH_PATH"

# Clone / update councilsonlinehub
if [ -d "apps/$HUB_APP" ]; then
    warn "$HUB_APP exists — updating to latest main"
    cd "apps/$HUB_APP" && git fetch origin main && git reset --hard origin/main && git clean -fd && cd "$BENCH_PATH"
else
    bench get-app "$HUB_REPO" --branch main
fi
log "$HUB_APP ready"

# Create site
if [ ! -d "$BENCH_PATH/sites/$SITE_NAME" ]; then
    ADMIN_PWD="${ADMIN_PASSWORD:-$(openssl rand -hex 16)}"
    bench new-site "$SITE_NAME" --admin-password "$ADMIN_PWD" --no-mariadb-socket
    echo "Admin password: $ADMIN_PWD"
    log "Site created"
fi

# Install app
bench --site "$SITE_NAME" install-app "$HUB_APP" || warn "May already be installed"
log "App installed"

# Build hub frontend (standalone)
cd "$BENCH_PATH/apps/$HUB_APP/frontend"
rm -rf node_modules 2>/dev/null || mv node_modules "node_modules.bak.$(date +%s)" 2>/dev/null || true
rm -rf node_modules.bak.* 2>/dev/null || true
yarn install --frozen-lockfile
yarn build
log "Frontend built"

# Migrate + fixtures
cd "$BENCH_PATH"
bench --site "$SITE_NAME" migrate
bench --site "$SITE_NAME" import-fixtures || warn "Fixture warnings — check manually"
log "Migrations done"

# Council registry
bench --site "$SITE_NAME" execute councilsonlinehub.setup.configure_council_registry \
    --kwargs "{\"councils\": [{\"council_name\": \"Whangarei District Council\", \"council_code\": \"WDC\", \"api_url\": \"https://$COUNCIL_SITE\", \"is_active\": 1}]}" \
    || warn "Council registry setup failed — configure manually in Frappe Desk > CouncilsOnline Settings"

# Nginx + restart
bench setup-nginx || warn "Setup nginx manually if needed"
bench --site "$SITE_NAME" clear-cache
redis-cli FLUSHALL || true
bench restart || true
sudo supervisorctl reread && sudo supervisorctl update && sudo supervisorctl restart all || true
sudo systemctl reload nginx || true

echo ""
echo "Setup complete: https://$SITE_NAME"
echo ""
echo "NEXT: sudo certbot --nginx -d $SITE_NAME"
