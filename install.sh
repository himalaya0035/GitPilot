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
echo ""

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
echo "  To start the dev servers:"
echo ""
echo -e "    ${CYAN}cd GitPilot${NC}"
echo -e "    ${CYAN}./start-dev.sh${NC}"
echo ""
echo "  Then open http://localhost:3000"
echo ""
echo "  Optional: edit backend/.env to"
echo "  enable MongoDB for persistent storage."
echo ""
