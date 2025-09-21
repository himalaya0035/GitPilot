# GitPilot

A visual Git workflow management and execution platform built with React and Node.js.

## Features

- **Visual Workflow Editor** - Drag-and-drop interface for creating Git workflows
- **Real-time Execution** - Execute workflows with live progress tracking
- **Git Operations** - Support for checkout, merge, rebase, push, pull, delete-branch, tag
- **Dependency Resolution** - Automatic parallel execution of independent operations
- **Backend API** - RESTful API with Socket.IO for real-time updates
- **Data Layer Abstraction** - Easy switching between storage backends

## Architecture

### Frontend (React + React Flow)
- **WorkflowEditor** - Visual workflow creation and editing
- **WorkflowRunner** - Real-time workflow execution with progress tracking
- **WorkflowManager** - Workflow CRUD operations and management
- **Services** - API integration with backend

### Backend (Node.js + Express)
- **REST API** - Workflow CRUD operations
- **Socket.IO** - Real-time execution updates
- **Git Service** - Git command execution using child_process
- **Data Layer** - Abstract storage interface (Memory/LocalStorage adapters)

## Quick Start

### Development Mode

```bash
# Start both backend and frontend
./start-dev.sh
```

Or start individually:

```bash
# Backend (Terminal 1)
cd git-visualizer/backend
npm install
npm run dev

# Frontend (Terminal 2)
cd git-visualizer/frontend
npm install
npm start
```

### Production Mode

```bash
# Backend
cd git-visualizer/backend
npm install
npm start

# Frontend
cd git-visualizer/frontend
npm install
npm run build
```

## API Endpoints

### Workflows
- `GET /api/workflows` - Get all workflows
- `GET /api/workflows/:id` - Get specific workflow
- `POST /api/workflows` - Create workflow
- `PUT /api/workflows/:id` - Update workflow
- `DELETE /api/workflows/:id` - Delete workflow
- `GET /api/workflows/search?q=query` - Search workflows
- `GET /api/workflows/stats` - Get statistics

### Execution
- `POST /api/execution/:id/start` - Start workflow execution
- `GET /api/execution/:id/status` - Get execution status
- `POST /api/execution/:id/stop` - Stop execution

### Health
- `GET /api/health` - Health check

## Socket.IO Events

### Client → Server
- `execution-stopped` - Stop execution

### Server → Client
- `execution-started` - Execution started
- `execution-completed` - Execution completed
- `execution-failed` - Execution failed
- `operation-started` - Operation started
- `operation-completed` - Operation completed
- `operation-failed` - Operation failed
- `log-entry` - Log entry added

## Workflow Schema

### Branch Types
- `production` - Production branch
- `feature` - Feature branch
- `release` - Release branch
- `hotfix` - Hotfix branch
- `develop` - Development branch
- `staging` - Staging branch

### Operation Types
- `checkout` - Checkout branch (with -b flag support)
- `merge` - Merge branches (with strategy options)
- `rebase` - Rebase operations
- `push` - Push to remote
- `pull` - Pull from remote
- `delete-branch` - Delete branch (local/remote)
- `tag` - Create tags

### Status Values
- `pending` - Not started
- `running` - Currently executing
- `success` - Completed successfully
- `failed` - Execution failed

## Environment Variables

### Backend
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)

### Frontend
- `REACT_APP_USE_BACKEND` - Use backend API (default: true in development)
- `NODE_ENV` - Environment (development/production)

## Development

### Backend Structure
```
backend/
├── index.js              # Main server file
├── data/                 # Data layer
│   ├── DataLayer.js      # Abstract data interface
│   └── adapters/         # Storage adapters
├── middleware/           # Express middleware
├── routes/              # API routes
├── services/            # Business logic
└── test-server.js       # Test utilities
```

### Frontend Structure
```
frontend/src/
├── components/          # React components
├── services/           # API services
│   ├── storage/        # Storage adapters
│   └── ExecutionService.js
├── hooks/              # React hooks
└── contexts/           # React contexts
```

## Testing

```bash
# Test backend
cd git-visualizer/backend
node test-server.js

# Test API endpoints
curl http://localhost:5000/api/health
curl http://localhost:5000/api/workflows
```

## Contributing

1. Follow ESLint Airbnb style guide
2. Use async/await instead of callbacks
3. Write modular functions with JSDoc
4. No hardcoded secrets
5. Test all changes

## License

MIT License