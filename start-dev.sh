#!/bin/bash

# GitPilot Development Startup Script
# Starts both backend and frontend servers
# Automatically installs dependencies if missing

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Starting GitPilot Development Environment..."
echo ""

# Function to kill background processes on exit
cleanup() {
    echo ""
    echo "Shutting down servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Check prerequisites
check_prerequisites() {
    local missing=0

    if ! command -v node &>/dev/null; then
        echo "[ERROR] Node.js is not installed. Install it from https://nodejs.org (v18+ required)"
        missing=1
    else
        NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
        if [ "$NODE_VERSION" -lt 18 ]; then
            echo "[WARNING] Node.js v${NODE_VERSION} detected. v18+ is recommended."
        fi
    fi

    if ! command -v npm &>/dev/null; then
        echo "[ERROR] npm is not installed."
        missing=1
    fi

    if ! command -v git &>/dev/null; then
        echo "[ERROR] Git is not installed."
        missing=1
    fi

    if [ "$missing" -eq 1 ]; then
        echo ""
        echo "Please install the missing prerequisites and try again."
        exit 1
    fi
}

# Install dependencies if node_modules is missing or package.json is newer
install_if_needed() {
    local dir="$1"
    local name="$2"

    if [ ! -d "$dir/node_modules" ]; then
        echo "[INSTALL] $name dependencies not found. Installing..."
        (cd "$dir" && npm install)
        echo "[OK] $name dependencies installed."
    elif [ "$dir/package.json" -nt "$dir/node_modules" ]; then
        echo "[UPDATE] $name package.json changed. Updating dependencies..."
        (cd "$dir" && npm install)
        echo "[OK] $name dependencies updated."
    else
        echo "[OK] $name dependencies are up to date."
    fi
}

echo "Checking prerequisites..."
check_prerequisites
echo ""

echo "Checking dependencies..."
install_if_needed "$ROOT_DIR/backend" "Backend"
install_if_needed "$ROOT_DIR/frontend" "Frontend"
echo ""

# Start backend server
echo "Starting backend server..."
(cd "$ROOT_DIR/backend" && npm run dev) &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend server
echo "Starting frontend server..."
(cd "$ROOT_DIR/frontend" && npm start) &
FRONTEND_PID=$!

echo ""
echo "GitPilot is running!"
echo "  Backend:      http://localhost:5000"
echo "  Frontend:     http://localhost:3000"
echo "  Health Check: http://localhost:5000/api/health"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID
