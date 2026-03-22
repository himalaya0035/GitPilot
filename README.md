# GitPilot

A visual Git workflow management and execution platform built with React and Node.js. Design workflows with a drag-and-drop editor, then execute them on real repositories with live progress tracking.

## Features

- **Visual Workflow Editor** — Drag-and-drop interface powered by React Flow for designing Git workflows
- **Real-time Execution** — Run workflows on real repositories with live progress via Socket.IO
- **Git Operations** — Checkout, merge, rebase, push, pull, delete-branch, and tag
- **Dependency Resolution** — Automatically runs independent operations in parallel
- **Pluggable Storage** — In-memory (default) or MongoDB for persistent workflows
- **Playground Mode** — Try GitPilot in-browser without installing anything

## Installation

### One-Line Install

```bash
curl -fsSL https://raw.githubusercontent.com/himalaya0035/GitPilot/main/install.sh | bash
```

This will:
1. Check prerequisites (Git, Node.js v18+, npm)
2. Clone the repository
3. Create the backend `.env` from `.env.example`
4. Optionally set up MongoDB via Docker for persistent storage
5. Install all dependencies
6. Offer to start the dev servers

### Manual Setup

```bash
# Clone
git clone https://github.com/himalaya0035/GitPilot.git
cd GitPilot

# Create backend environment file
cp backend/.env.example backend/.env

# Install dependencies
cd backend && npm install
cd ../frontend && npm install
cd ..
```

### Starting the Dev Servers

```bash
# Start both backend and frontend (recommended)
./start-dev.sh
```

The script checks prerequisites, auto-installs/updates dependencies if needed, and starts:
- **Frontend** — http://localhost:3000
- **Backend** — http://localhost:5000
- **Health check** — http://localhost:5000/api/health

Or start individually:

```bash
# Backend (Terminal 1)
cd backend && npm run dev

# Frontend (Terminal 2)
cd frontend && npm start
```

### MongoDB (Optional)

By default, GitPilot uses in-memory storage (data is lost on restart). For persistent storage, set up MongoDB:

```bash
# Using Docker
docker run -d --name gitpilot-mongo -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=gitpilot \
  -e MONGO_INITDB_ROOT_PASSWORD=gitpilot \
  --restart unless-stopped mongo:latest
```

Then update `backend/.env`:

```
MONGODB_URI=mongodb://gitpilot:gitpilot@localhost:27017/GitPilot?authSource=admin
USE_MONGODB=true
```

## Architecture

### Frontend (React + React Flow)
- **WorkflowEditor** — Visual workflow creation with drag-and-drop branches and operations
- **WorkflowRunner** — Real-time execution with live progress tracking
- **WorkflowManager** — Save, load, and manage workflows
- **Services** — Pluggable adapter pattern (API backend or localStorage for playground)

### Backend (Node.js + Express)
- **REST API** — Workflow and execution CRUD
- **Socket.IO** — Real-time execution events
- **Git Service** — Git command execution via child_process
- **Data Layer** — Abstract storage with memory and MongoDB adapters

## Project Structure

```
GitPilot/
├── backend/
│   ├── index.js              # Express + Socket.IO server
│   ├── routes/               # API route handlers
│   ├── services/             # Git service and workflow executor
│   ├── data/
│   │   ├── DataLayer.js      # Workflow storage abstraction
│   │   ├── ExecutionDataLayer.js
│   │   └── adapters/
│   │       ├── memory/       # In-memory adapters (default)
│   │       └── mongo/        # MongoDB adapters
│   ├── middleware/            # Express middleware
│   └── config/               # Server configuration
├── frontend/
│   └── src/
│       ├── components/       # React components (editor, runner, modals)
│       ├── services/         # API and storage adapters
│       ├── contexts/         # React context providers
│       ├── hooks/            # Custom React hooks
│       └── utils/            # Utility functions
├── install.sh                # One-line installer
└── start-dev.sh              # Dev server launcher
```

## API Endpoints

### Workflows
- `GET /api/workflows` — List all workflows
- `GET /api/workflows/:id` — Get a workflow
- `POST /api/workflows` — Create a workflow
- `PUT /api/workflows/:id` — Update a workflow
- `DELETE /api/workflows/:id` — Delete a workflow
- `GET /api/workflows/search?q=query` — Search workflows
- `GET /api/workflows/stats` — Workflow statistics

### Execution
- `POST /api/execution/:id/start` — Start workflow execution
- `GET /api/execution/:id/status` — Get execution status
- `POST /api/execution/:id/stop` — Stop execution

### Health
- `GET /api/health` — Health check

## Socket.IO Events

### Client → Server
- `execution-stopped` — Stop execution

### Server → Client
- `execution-started` / `execution-completed` / `execution-failed`
- `operation-started` / `operation-completed` / `operation-failed`
- `log-entry` — Log output

## Environment Variables

### Backend (`backend/.env`)
- `MONGODB_URI` — MongoDB connection string
- `DB_NAME` — Database name (default: `GitPilot`)
- `COLLECTION_NAME` — Collection name (default: `workflows`)
- `USE_MONGODB` — Enable MongoDB storage (`true`/`false`)
- `NODE_ENV` — `development` or `production`

### Frontend
- `REACT_APP_PLAYGROUND` — Enable browser-only playground mode (`true`/`false`)

## Contributing

1. Follow ESLint Airbnb style guide
2. Use async/await instead of callbacks
3. Write modular functions with JSDoc
4. No hardcoded secrets
5. Test all changes

## License

MIT License
