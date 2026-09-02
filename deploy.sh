#!/usr/bin/env bash
#
# Ecosystem production deploy.
#
#   ./deploy.sh                 # pull main, redeploy all apps
#   ./deploy.sh main jtrade     # pull main, redeploy only jtrade
#   ./deploy.sh my-branch       # pull a different branch, redeploy all
#
# Per app it runs:  git pull  ->  compose down  ->  build --no-cache  ->  up -d
# Reverse proxy (Traefik) and its `grapifly_proxy` network are assumed to be
# running already; this script only creates the network if it is missing.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

PROXY_NET="grapifly_proxy"
COMPOSE="docker compose -f docker-compose.prod.yml"

# App order matters: identity first, then the apps that depend on it.
ALL_APPS=(grapifly relay business-app jtrade)

BRANCH="${1:-main}"
shift || true
APPS=("$@")
[ ${#APPS[@]} -eq 0 ] && APPS=("${ALL_APPS[@]}")

log()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

# ---- env files each app needs on the server (gitignored) -------------------
declare -A ENV_FILES=(
  [grapifly]="grapifly/backend/.env.prod"
  [relay]="relay/backend/.env.prod"
  [business-app]="business-app/backend/.env.prod business-app/business-intelligence/.env.prod"
  [jtrade]="jtrade/backend/.env.prod"
)

check_env() {
  local app="$1" missing=0
  for f in ${ENV_FILES[$app]}; do
    [ -f "$ROOT/$f" ] || { echo "  missing: $f"; missing=1; }
  done
  [ "$missing" -eq 0 ] || die "$app is missing prod env file(s) — create them on the server first."
}

# ---- 1. update source ----------------------------------------------------
log "git pull ($BRANCH)"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

# ---- 2. shared proxy network ------------------------------------------------
docker network inspect "$PROXY_NET" >/dev/null 2>&1 || {
  log "creating docker network $PROXY_NET"
  docker network create "$PROXY_NET"
}

# ---- 3. per-app rebuild ---------------------------------------------------
for app in "${APPS[@]}"; do
  [ -d "$ROOT/$app" ] || die "unknown app: $app"
  [ -f "$ROOT/$app/docker-compose.prod.yml" ] || die "$app has no docker-compose.prod.yml"

  log "$app — checking prod env"
  check_env "$app"

  log "$app — compose down"
  ( cd "$ROOT/$app" && $COMPOSE down --remove-orphans )

  log "$app — build --no-cache"
  ( cd "$ROOT/$app" && $COMPOSE build --no-cache )

  log "$app — up -d"
  ( cd "$ROOT/$app" && $COMPOSE up -d )
done

log "done"
docker compose ls
