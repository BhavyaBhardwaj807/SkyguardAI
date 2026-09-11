#!/usr/bin/env bash
# ============================================================
#  SkyGuard AI — dev start script
#  Usage: ./start.sh [--docker | --dev | --help]
#
#  --docker  Full stack via Docker Compose (recommended for demo)
#  --dev     Local npm dev mode (requires Node 22+, Python 3.x)
#  (default) Asks interactively
# ============================================================
set -euo pipefail

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
RESET='\033[0m'

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log()    { echo -e "${CYAN}[skyguard]${RESET} $*"; }
ok()     { echo -e "${GREEN}[  ok   ]${RESET} $*"; }
warn()   { echo -e "${YELLOW}[ warn  ]${RESET} $*"; }
fatal()  { echo -e "${RED}[ fatal ]${RESET} $*"; exit 1; }
header() { echo -e "\n${BOLD}$*${RESET}"; }

# ── Banner ───────────────────────────────────────────────────
echo -e "${CYAN}"
cat << 'EOF'
  ███████╗██╗  ██╗██╗   ██╗ ██████╗ ██╗   ██╗ █████╗ ██████╗ ██████╗      █████╗ ██╗
  ██╔════╝██║ ██╔╝╚██╗ ██╔╝██╔════╝ ██║   ██║██╔══██╗██╔══██╗██╔══██╗    ██╔══██╗██║
  ███████╗█████╔╝  ╚████╔╝ ██║  ███╗██║   ██║███████║██████╔╝██║  ██║    ███████║██║
  ╚════██║██╔═██╗   ╚██╔╝  ██║   ██║██║   ██║██╔══██║██╔══██╗██║  ██║    ██╔══██║██║
  ███████║██║  ██╗   ██║   ╚██████╔╝╚██████╔╝██║  ██║██║  ██║██████╔╝    ██║  ██║██║
  ╚══════╝╚═╝  ╚═╝   ╚═╝    ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝     ╚═╝  ╚═╝╚═╝
EOF
echo -e "${RESET}"
echo -e "  ${BOLD}Intelligent Real-Time Anomaly Detection for Automatic Weather Stations${RESET}"
echo -e "  Problem Statement ID: 26073  |  SIH 2026"
echo -e ""

# ── Argument parsing ─────────────────────────────────────────
MODE="${1:-}"

if [[ "$MODE" == "--help" || "$MODE" == "-h" ]]; then
  echo "Usage: ./start.sh [--docker | --dev]"
  echo ""
  echo "  --docker   Full stack via Docker Compose (Postgres + ML service + API + Dashboard)"
  echo "  --dev      Local npm dev mode (requires Postgres & Python separately)"
  echo "  (none)     Interactive mode — choose at runtime"
  exit 0
fi

if [[ -z "$MODE" ]]; then
  echo "How do you want to run SkyGuard AI?"
  echo ""
  echo "  1) Docker Compose  — full stack, no dependencies needed (recommended)"
  echo "  2) npm dev         — local development with hot reload"
  echo ""
  read -rp "Choose [1/2]: " choice
  case "$choice" in
    1) MODE="--docker" ;;
    2) MODE="--dev" ;;
    *) fatal "Invalid choice. Run with --docker or --dev." ;;
  esac
fi

cd "$REPO_ROOT"

# ════════════════════════════════════════════════════════════
#  DOCKER MODE
# ════════════════════════════════════════════════════════════
if [[ "$MODE" == "--docker" ]]; then
  header "🐳  Starting via Docker Compose"

  if ! command -v docker &>/dev/null; then
    fatal "Docker is not installed. Install Docker Desktop or Docker Engine."
  fi

  # Check compose v2
  if ! docker compose version &>/dev/null; then
    fatal "Docker Compose v2 is required (docker compose, not docker-compose)."
  fi

  log "Building and starting all services (first run takes a few minutes)..."
  docker compose up --build -d

  # Wait for readiness
  log "Waiting for services to become healthy..."
  MAX_WAIT=120
  ELAPSED=0
  until docker compose ps | grep -q "healthy" || [[ $ELAPSED -ge $MAX_WAIT ]]; do
    sleep 3
    ELAPSED=$((ELAPSED + 3))
    printf "."
  done
  echo ""

  # Show status
  docker compose ps

  echo ""
  ok "SkyGuard AI is running!"
  echo -e ""
  echo -e "  ${BOLD}Dashboard:${RESET}   ${CYAN}http://localhost:8080${RESET}"
  echo -e "  ${BOLD}API health:${RESET}  ${CYAN}http://localhost:8080/healthz${RESET}"
  echo -e "  ${BOLD}API ready:${RESET}   ${CYAN}http://localhost:8080/readyz${RESET}"
  echo -e ""
  echo -e "  Useful commands:"
  echo -e "    docker compose logs -f api detection   # follow logs"
  echo -e "    docker compose stop                    # stop services"
  echo -e "    docker compose down                    # stop + remove containers"
  echo -e ""

  # Optionally tail logs
  read -rp "Tail logs now? [y/N]: " tail_logs
  if [[ "$tail_logs" =~ ^[Yy]$ ]]; then
    docker compose logs -f api detection
  fi

  exit 0
fi

# ════════════════════════════════════════════════════════════
#  DEV MODE
# ════════════════════════════════════════════════════════════
if [[ "$MODE" == "--dev" ]]; then
  header "⚡  Starting in local dev mode"

  # ── Preflight checks ───────────────────────────────────────
  log "Checking prerequisites..."

  # Node
  if ! command -v node &>/dev/null; then
    fatal "Node.js is not installed. Install Node 22+ from https://nodejs.org"
  fi
  NODE_VER=$(node -e "process.stdout.write(process.version)")
  NODE_MAJOR=$(echo "$NODE_VER" | cut -d. -f1 | tr -d 'v')
  if [[ "$NODE_MAJOR" -lt 22 ]]; then
    fatal "Node.js 22+ required (found $NODE_VER). Run: nvm use 22"
  fi
  ok "Node.js $NODE_VER"

  # npm
  if ! command -v npm &>/dev/null; then
    fatal "npm not found."
  fi
  ok "npm $(npm -v)"

  # Python (for ML service)
  PYTHON_BIN=""
  for b in python3 python; do
    if command -v "$b" &>/dev/null; then
      PYTHON_BIN="$b"
      break
    fi
  done

  # ── .env setup ─────────────────────────────────────────────
  if [[ ! -f "$REPO_ROOT/.env" ]]; then
    log "Creating .env from .env.example..."
    cp "$REPO_ROOT/.env.example" "$REPO_ROOT/.env"
    ok ".env created"
  else
    ok ".env exists"
  fi

  # ── npm install ────────────────────────────────────────────
  if [[ ! -d "$REPO_ROOT/node_modules" ]]; then
    log "Installing root npm dependencies..."
    npm install --prefix "$REPO_ROOT"
  else
    ok "Root node_modules present"
  fi

  if [[ ! -d "$REPO_ROOT/src/app/frontend/node_modules" ]]; then
    log "Installing frontend npm dependencies..."
    npm install --prefix "$REPO_ROOT/src/app/frontend"
  else
    ok "Frontend node_modules present"
  fi

  # ── PostgreSQL ─────────────────────────────────────────────
  header "🐘  PostgreSQL"

  DB_RUNNING=false

  # Check if already running on port 5432
  if command -v pg_isready &>/dev/null && pg_isready -h 127.0.0.1 -p 5432 -U skyguard &>/dev/null; then
    ok "PostgreSQL already running on port 5432"
    DB_RUNNING=true
  elif command -v docker &>/dev/null; then
    # Check for existing container
    if docker ps --format '{{.Names}}' | grep -q "skyguard-dev-db"; then
      ok "PostgreSQL container 'skyguard-dev-db' already running"
      DB_RUNNING=true
    else
      log "Starting PostgreSQL via Docker..."
      docker run --name skyguard-dev-db \
        -e POSTGRES_USER=skyguard \
        -e POSTGRES_PASSWORD=skyguard_local \
        -e POSTGRES_DB=skyguard \
        -p 127.0.0.1:5432:5432 \
        -d postgres:17-bookworm 2>/dev/null || \
      docker start skyguard-dev-db 2>/dev/null || true

      log "Waiting for Postgres to be ready..."
      for i in $(seq 1 20); do
        if docker exec skyguard-dev-db pg_isready -U skyguard -d skyguard &>/dev/null 2>&1; then
          DB_RUNNING=true
          break
        fi
        sleep 2
      done
    fi
  fi

  if [[ "$DB_RUNNING" == "false" ]]; then
    warn "Could not start PostgreSQL. Backend will be unavailable."
    warn "Start Postgres manually or install Docker, then re-run."
    echo ""
    echo -e "  Manual start:  ${YELLOW}docker run --name skyguard-dev-db \\${RESET}"
    echo -e "  ${YELLOW}    -e POSTGRES_USER=skyguard -e POSTGRES_PASSWORD=skyguard_local \\${RESET}"
    echo -e "  ${YELLOW}    -e POSTGRES_DB=skyguard -p 127.0.0.1:5432:5432 -d postgres:17-bookworm${RESET}"
    echo ""
  else
    ok "PostgreSQL ready at 127.0.0.1:5432"
  fi

  # ── Python ML service (optional) ──────────────────────────
  ML_PID=""
  header "🤖  ML Detection Service"

  if [[ -z "$PYTHON_BIN" ]]; then
    warn "Python not found — ML service will not start (backend will run in degraded mode)"
  else
    ok "Python: $($PYTHON_BIN --version 2>&1)"

    ML_REQS="$REPO_ROOT/ml-service/requirements.txt"
    ML_SCRIPT="$REPO_ROOT/ml-service/predict_service.py"

    # Install ML deps if needed
    if ! $PYTHON_BIN -c "import fastapi, uvicorn, joblib, sklearn" 2>/dev/null; then
      log "Installing Python ML dependencies..."
      $PYTHON_BIN -m pip install -r "$ML_REQS" -q
    fi

    log "Starting ML detection service on port 8000..."
    $PYTHON_BIN "$ML_SCRIPT" &>/tmp/skyguard-ml.log &
    ML_PID=$!

    # Wait for ML service to come up
    for i in $(seq 1 15); do
      if curl -sf http://127.0.0.1:8000/health &>/dev/null; then
        ok "ML service running at http://localhost:8000"
        break
      fi
      sleep 2
    done

    if ! curl -sf http://127.0.0.1:8000/health &>/dev/null; then
      warn "ML service did not start in time. Logs: /tmp/skyguard-ml.log"
      warn "Backend will operate in degraded mode (rules-only, no model scores)"
    fi
  fi

  # ── Start Node services ────────────────────────────────────
  header "🚀  Starting Node.js Services"

  echo ""
  echo -e "  ${BOLD}Services starting:${RESET}"
  echo -e "    → ${CYAN}Root Next.js${RESET}         http://localhost:3000"
  echo -e "    → ${CYAN}Express API${RESET}          http://localhost:4000"
  echo -e "    → ${CYAN}Frontend dashboard${RESET}   http://localhost:3001"
  echo ""
  echo -e "  ${YELLOW}Press Ctrl+C to stop all services.${RESET}"
  echo ""

  # Cleanup function
  cleanup() {
    echo ""
    log "Shutting down..."
    if [[ -n "$ML_PID" ]] && kill -0 "$ML_PID" 2>/dev/null; then
      kill "$ML_PID" 2>/dev/null || true
      ok "ML service stopped"
    fi
    ok "Done. Goodbye! 👋"
  }
  trap cleanup EXIT INT TERM

  # Start frontend on port 3001
  PORT=3001 npm run dev --prefix "$REPO_ROOT/src/app/frontend" &>/tmp/skyguard-frontend.log &
  FRONTEND_PID=$!

  # Start root web + API via concurrently
  npm run dev --prefix "$REPO_ROOT"

  exit 0
fi

fatal "Unknown mode: $MODE. Use --docker or --dev."
