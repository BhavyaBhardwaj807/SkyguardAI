#!/usr/bin/env bash
# ============================================================
#  SkyGuard AI — stop script
#  Usage: ./stop.sh [--docker | --dev | --clean | --help]
#
#  --docker  Stop Docker Compose stack (keeps data volumes)
#  --clean   Stop Docker Compose AND remove volumes (wipes DB)
#  --dev     Kill local Node + Python processes started by start.sh --dev
#  (default) Asks interactively
# ============================================================
set -euo pipefail

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
RESET='\033[0m'

log()    { echo -e "${CYAN}[skyguard]${RESET} $*"; }
ok()     { echo -e "${GREEN}[  ok   ]${RESET} $*"; }
warn()   { echo -e "${YELLOW}[ warn  ]${RESET} $*"; }
fatal()  { echo -e "${RED}[ fatal ]${RESET} $*"; exit 1; }
header() { echo -e "\n${BOLD}$*${RESET}"; }

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Banner ───────────────────────────────────────────────────
echo -e "${CYAN}[skyguard]${RESET} Stopping SkyGuard AI…"
echo ""

MODE="${1:-}"

if [[ "$MODE" == "--help" || "$MODE" == "-h" ]]; then
  echo "Usage: ./stop.sh [--docker | --clean | --dev]"
  echo ""
  echo "  --docker   Stop Docker Compose stack, keep data volumes"
  echo "  --clean    Stop Docker Compose AND delete all volumes (wipes database)"
  echo "  --dev      Kill local Node.js and Python processes"
  echo "  (none)     Interactive mode"
  exit 0
fi

if [[ -z "$MODE" ]]; then
  echo "How is SkyGuard currently running?"
  echo ""
  echo "  1) Docker Compose  — stop containers (data preserved)"
  echo "  2) Docker Compose  — stop + wipe volumes (fresh DB next start)"
  echo "  3) npm dev         — kill local Node + Python processes"
  echo ""
  read -rp "Choose [1/2/3]: " choice
  case "$choice" in
    1) MODE="--docker" ;;
    2) MODE="--clean"  ;;
    3) MODE="--dev"    ;;
    *) fatal "Invalid choice." ;;
  esac
fi

cd "$REPO_ROOT"

# ════════════════════════════════════════════════════════════
#  DOCKER STOP
# ════════════════════════════════════════════════════════════
if [[ "$MODE" == "--docker" || "$MODE" == "--clean" ]]; then
  header "🐳  Stopping Docker Compose stack"

  if ! command -v docker &>/dev/null; then
    fatal "Docker not found."
  fi
  if ! docker compose version &>/dev/null; then
    fatal "Docker Compose v2 required."
  fi

  if [[ "$MODE" == "--clean" ]]; then
    warn "This will DELETE the postgres_data volume — all replay history and assessments will be lost."
    read -rp "Are you sure? [y/N]: " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
      log "Aborted."
      exit 0
    fi
    log "Stopping containers and removing volumes…"
    docker compose down --volumes
    ok "Containers stopped and volumes removed."
  else
    log "Stopping containers (data volumes preserved)…"
    docker compose stop
    ok "Containers stopped. Data is intact."
    echo ""
    echo -e "  To remove containers entirely:  ${CYAN}docker compose down${RESET}"
    echo -e "  To wipe the database too:        ${CYAN}./stop.sh --clean${RESET}"
    echo -e "  To start again:                  ${CYAN}./start.sh --docker${RESET}"
  fi

  echo ""
  docker compose ps 2>/dev/null || true
  exit 0
fi

# ════════════════════════════════════════════════════════════
#  DEV STOP
# ════════════════════════════════════════════════════════════
if [[ "$MODE" == "--dev" ]]; then
  header "⚡  Stopping local dev processes"

  KILLED=0

  # ── Next.js (root, port 3000) ──────────────────────────────
  if lsof -ti:3000 &>/dev/null 2>&1; then
    log "Killing Next.js on port 3000…"
    lsof -ti:3000 | xargs kill -TERM 2>/dev/null || true
    ok "Next.js (port 3000) stopped."
    KILLED=$((KILLED + 1))
  else
    log "Nothing on port 3000."
  fi

  # ── Express API (port 4000) ────────────────────────────────
  if lsof -ti:4000 &>/dev/null 2>&1; then
    log "Killing Express API on port 4000…"
    lsof -ti:4000 | xargs kill -TERM 2>/dev/null || true
    ok "Express API (port 4000) stopped."
    KILLED=$((KILLED + 1))
  else
    log "Nothing on port 4000."
  fi

  # ── Frontend Next.js (port 3001) ──────────────────────────
  if lsof -ti:3001 &>/dev/null 2>&1; then
    log "Killing frontend Next.js on port 3001…"
    lsof -ti:3001 | xargs kill -TERM 2>/dev/null || true
    ok "Frontend (port 3001) stopped."
    KILLED=$((KILLED + 1))
  else
    log "Nothing on port 3001."
  fi

  # ── Python ML service (port 8000) ─────────────────────────
  if lsof -ti:8000 &>/dev/null 2>&1; then
    log "Killing ML service on port 8000…"
    lsof -ti:8000 | xargs kill -TERM 2>/dev/null || true
    ok "ML service (port 8000) stopped."
    KILLED=$((KILLED + 1))
  else
    log "Nothing on port 8000."
  fi

  # ── Fallback: kill any stray skyguard-tagged processes ─────
  if pkill -f "skyguard" 2>/dev/null; then
    ok "Killed remaining skyguard-tagged processes."
    KILLED=$((KILLED + 1))
  fi

  echo ""
  if [[ $KILLED -eq 0 ]]; then
    warn "No SkyGuard processes found. Already stopped?"
  else
    ok "All SkyGuard processes stopped."
  fi

  echo ""
  echo -e "  To start again:  ${CYAN}./start.sh --dev${RESET}"
  exit 0
fi

fatal "Unknown mode: $MODE. Use --docker, --clean, or --dev."
