# GitPilot Backend

Backend server for GitPilot workflow management and execution.

## Features

- **REST API** for workflow CRUD operations
- **Real-time execution** with Socket.IO
- **Git operations** using child_process.exec
- **Data layer abstraction** for easy storage backend switching
- **Workflow validation** with comprehensive schema checking
- **Dependency resolution** for parallel operation execution

## Architecture

### Data Layer
- **DataLayer**: Abstract interface for data operations
- **MemoryAdapter**: In-memory storage (default)
- **LocalStorageAdapter**: Browser localStorage compatible adapter

### Services
- **GitService**: Handles all Git operations (checkout, merge, rebase, push, pull, delete-branch, tag)
- **WorkflowExecutor**: Manages workflow execution with dependency resolution

### API Endpoints

#### Workflows
- `GET /api/workflows` - Get all workflows
- `GET /api/workflows/:id` - Get specific workflow
- `POST /api/workflows` - Create workflow
- `PUT /api/workflows/:id` - Update workflow
- `DELETE /api/workflows/:id` - Delete workflow
- `GET /api/workflows/search?q=query` - Search workflows
- `GET /api/workflows/type/:branchType` - Get workflows by branch type
- `POST /api/workflows/:id/duplicate` - Duplicate workflow
- `GET /api/workflows/:id/export` - Export workflow as JSON
- `POST /api/workflows/import` - Import workflow from JSON
- `GET /api/workflows/stats` - Get workflow statistics

#### Execution
- `POST /api/execution/:id/start` - Start workflow execution
- `GET /api/execution/:id/status` - Get execution status
- `POST /api/execution/:id/stop` - Stop workflow execution

#### Health
- `GET /api/health` - Health check

## Installation

```bash
cd git-visualizer/backend
npm install
```

## Development

```bash
npm run dev
```

## Production

```bash
npm start
```

## Testing

```bash
node test-server.js
```

## Socket.IO Events

### Client → Server
- `execution-stopped` - Stop execution

### Server → Client
- `execution-started` - Execution started
- `execution-completed` - Execution completed
- `execution-failed` - Execution failed
- `execution-stopped` - Execution stopped
- `operation-started` - Operation started
- `operation-completed` - Operation completed
- `operation-failed` - Operation failed
- `log-entry` - Log entry added

## Workflow Schema

### Required Fields
- `name` (string): Workflow name
- `branches` (array): Branch definitions
- `operations` (array): Operation definitions

### Branch Types
- `production`, `feature`, `release`, `hotfix`, `develop`, `staging`

### Operation Types
- `checkout`, `merge`, `rebase`, `push`, `pull`, `delete-branch`, `tag`

### Status Values
- `pending`, `running`, `success`, `failed`

## Environment Variables

- `PORT`: Server port (default: 5000)
- `NODE_ENV`: Environment (development/production)

## CORS Configuration

Configured for frontend at `http://localhost:3000`