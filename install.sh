#!/bin/bash

# GitPilot One-Line Installer
# Usage: curl -fsSL https://raw.githubusercontent.com/himalaya0035/GitPilot/main/install.sh | bash
#
# This script clones GitPilot, creates the env file,
# installs dependencies, and starts the dev servers.

set -e

REPO_URL="https://github.com/himalaya0035/GitPilot.git"
INSTALL_DIR="GitPilot"

# ── Colors ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC} $1"; }
ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
fail()  { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

echo ""
echo -e "${BOLD}GitPilot Installer${NC}"
echo -e "Visual Git Workflow Management"
echo "─────────────────────────────────"
echo ""

# ── Check prerequisites ──
info "Checking prerequisites..."

command -v git &>/dev/null || fail "Git is not installed. Install it from https://git-scm.com"
command -v node &>/dev/null || fail "Node.js is not installed. Install v18+ from https://nodejs.org"
command -v npm &>/dev/null || fail "npm is not installed. It ships with Node.js."

NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 18 ]; then
    fail "Node.js v${NODE_MAJOR} detected. v18+ is required."
fi

ok "Git $(git --version | cut -d' ' -f3)"
ok "Node.js $(node -v)"
ok "npm v$(npm -v)"
echo ""

# ── Clone ──
if [ -d "$INSTALL_DIR" ]; then
    warn "Directory '$INSTALL_DIR' already exists."
    read -rp "  Overwrite and reinstall? (y/N): " confirm
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
        rm -rf "$INSTALL_DIR"
    else
        echo "Aborted."
        exit 0
    fi
fi

info "Cloning GitPilot..."
git clone --depth 1 "$REPO_URL" "$INSTALL_DIR" 2>&1 | tail -1
ok "Repository cloned."
echo ""

cd "$INSTALL_DIR"

# ── Environment file ──
if [ ! -f backend/.env ]; then
    info "Creating backend/.env from .env.example..."
    cp backend/.env.example backend/.env
    ok "Environment file created."
else
    ok "backend/.env already exists, skipping."
fi

# Disable eslint warnings during dev
if [ ! -f frontend/.env ]; then
    echo "ESLINT_NO_DEV_ERRORS=true" > frontend/.env
    echo "DISABLE_ESLINT_PLUGIN=true" >> frontend/.env
fi
echo ""

# ── MongoDB setup ──
MONGO_SETUP=false

echo -e "${BOLD}MongoDB Setup${NC}"
echo "  GitPilot uses in-memory storage by default (data lost on restart)."
echo "  You can set up MongoDB via Docker for persistent storage."
echo ""
read -rp "  Set up MongoDB with Docker? (y/N): " mongo_confirm

if [[ "$mongo_confirm" =~ ^[Yy]$ ]]; then
    # Check if Docker is installed and running
    if ! command -v docker &>/dev/null; then
        warn "Docker is not installed. Skipping MongoDB setup."
        warn "Install Docker from https://docs.docker.com/get-docker/ and re-run, or set up MongoDB manually."
        echo ""
        mongo_confirm="n"
    elif ! docker info &>/dev/null 2>&1; then
        warn "Docker is installed but not running. Skipping MongoDB setup."
        warn "Start Docker and re-run, or set up MongoDB manually."
        echo ""
        mongo_confirm="n"
    else
        ok "Docker found: $(docker --version | cut -d' ' -f3 | tr -d ',')"
    fi
fi

if [[ "$mongo_confirm" =~ ^[Yy]$ ]]; then
    MONGO_CONTAINER="gitpilot-mongo"
    MONGO_USER="gitpilot"
    MONGO_PASS="gitpilot"
    MONGO_PORT="27017"
    MONGO_FAILED=false

    # Try to set up MongoDB container
    if docker ps -a --format '{{.Names}}' | grep -q "^${MONGO_CONTAINER}$"; then
        if docker ps --format '{{.Names}}' | grep -q "^${MONGO_CONTAINER}$"; then
            ok "MongoDB container '$MONGO_CONTAINER' is already running."
        else
            info "Starting existing MongoDB container..."
            docker start "$MONGO_CONTAINER" >/dev/null 2>&1 || MONGO_FAILED=true
            [ "$MONGO_FAILED" = false ] && ok "MongoDB container started."
        fi
    else
        info "Pulling MongoDB image and creating container (this may take a minute)..."
        docker pull mongo:latest || MONGO_FAILED=true
        if [ "$MONGO_FAILED" = false ]; then
            docker run -d \
                --name "$MONGO_CONTAINER" \
                -p "${MONGO_PORT}:27017" \
                -e "MONGO_INITDB_ROOT_USERNAME=${MONGO_USER}" \
                -e "MONGO_INITDB_ROOT_PASSWORD=${MONGO_PASS}" \
                --restart unless-stopped \
                mongo:latest >/dev/null 2>&1 || MONGO_FAILED=true
        fi
        [ "$MONGO_FAILED" = false ] && ok "MongoDB container created and running on port $MONGO_PORT."
    fi

    if [ "$MONGO_FAILED" = true ]; then
        warn "MongoDB setup failed. Continuing without it."
        MONGO_SETUP="failed"
    else
        # Update .env to enable MongoDB
        MONGO_URI="mongodb://${MONGO_USER}:${MONGO_PASS}@localhost:${MONGO_PORT}/GitPilot?authSource=admin"
        sed -i.bak "s|^MONGODB_URI=.*|MONGODB_URI=${MONGO_URI}|" backend/.env
        sed -i.bak "s|^# USE_MONGODB=true|USE_MONGODB=true|" backend/.env
        if ! grep -q "^USE_MONGODB=true" backend/.env; then
            echo "USE_MONGODB=true" >> backend/.env
        fi
        rm -f backend/.env.bak
        ok "backend/.env updated with MongoDB connection."
        MONGO_SETUP=true
    fi
    echo ""
fi

# ── Install dependencies ──
info "Installing backend dependencies..."
(cd backend && npm install --loglevel=error)
ok "Backend dependencies installed."

info "Installing frontend dependencies..."
(cd frontend && npm install --loglevel=error)
ok "Frontend dependencies installed."
echo ""

# ── Done ──
echo "─────────────────────────────────"
echo ""
echo -e "${GREEN}${BOLD}GitPilot is ready!${NC}"
echo ""
if [ "$MONGO_SETUP" = true ]; then
    echo -e "  ${GREEN}MongoDB is running via Docker.${NC}"
    echo "  Data will persist across restarts."
elif [ "$MONGO_SETUP" = "failed" ]; then
    echo -e "  ${YELLOW}MongoDB setup via Docker failed.${NC}"
    echo "  GitPilot will use in-memory storage for now."
    echo "  To fix: ensure Docker is working, then run:"
    echo ""
    echo -e "    ${CYAN}docker run -d --name gitpilot-mongo -p 27017:27017 \\"
    echo -e "      -e MONGO_INITDB_ROOT_USERNAME=gitpilot \\"
    echo -e "      -e MONGO_INITDB_ROOT_PASSWORD=gitpilot \\"
    echo -e "      --restart unless-stopped mongo:latest${NC}"
    echo ""
    echo "  Then set USE_MONGODB=true in backend/.env"
else
    echo -e "  ${YELLOW}Using in-memory storage (data lost on restart).${NC}"
    echo "  To persist data, install MongoDB and update"
    echo "  MONGODB_URI and USE_MONGODB in backend/.env"
fi
echo ""

# ── Start servers ──
read -rp "  Start GitPilot now? (y/N): " start_confirm
echo ""

if [[ "$start_confirm" =~ ^[Yy]$ ]]; then
    exec ./start-dev.sh
else
    echo "  To start later, run:"
    echo ""
    echo -e "    ${CYAN}cd GitPilot${NC}"
    echo -e "    ${CYAN}./start-dev.sh${NC}"
    echo ""
fi
