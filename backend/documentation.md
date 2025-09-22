# GitPilot Backend Documentation

## 📋 Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Data Flow](#data-flow)
4. [Core Components](#core-components)
5. [API Endpoints](#api-endpoints)
6. [Real-time Communication](#real-time-communication)
7. [Data Layer](#data-layer)
8. [Services](#services)
9. [Middleware](#middleware)
10. [Error Handling](#error-handling)
11. [Testing](#testing)
12. [Development Guide](#development-guide)

---

## 🎯 Overview

GitPilot Backend is a Node.js/Express server that provides:
- **RESTful API** for Git workflow management
- **Real-time execution** with Socket.IO
- **Git operations** using child_process
- **Data layer abstraction** for flexible storage
- **Dependency resolution** for parallel operation execution

---

## 🏗️ Architecture

### High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Git Repo      │
│   (React)       │◄──►│   (Node.js)     │◄──►│   (Local)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Data Layer    │
                       │   (Memory/DB)   │
                       └─────────────────┘
```

### Component Architecture
```
backend/
├── index.js              # Main server entry point
├── data/                 # Data layer abstraction
│   ├── DataLayer.js      # Abstract data interface
│   ├── sharedDataLayer.js # Shared instance
│   └── adapters/         # Storage adapters
│       ├── MemoryAdapter.js
│       └── LocalStorageAdapter.js
├── middleware/           # Express middleware
│   ├── errorHandler.js   # Error handling
│   └── validation.js     # Request validation
├── routes/              # API route handlers
│   ├── workflows.js     # Workflow CRUD operations
│   └── execution.js     # Workflow execution
├── services/            # Business logic services
│   ├── GitService.js    # Git operations
│   └── WorkflowExecutor.js # Execution engine
└── test-server.js       # Testing utilities
```

---

## 🔄 Data Flow

### 1. Workflow Creation Flow
```
Frontend → POST /api/workflows → Validation → DataLayer → Memory → Response
```

### 2. Workflow Execution Flow
```
Frontend → POST /api/execution/:id/start → WorkflowExecutor → GitService → Git Commands
                ↓
         Socket.IO Events ← Real-time Updates ← Execution Status
```

### 3. Real-time Updates Flow
```
WorkflowExecutor → Socket.IO → Frontend
     ↓
Execution Status → Operation Progress → Log Entries
```

---

## 🧩 Core Components

### 1. **Server Entry Point** (`index.js`)
- **Purpose**: Main server configuration and startup
- **Responsibilities**:
  - Express app setup
  - Socket.IO server initialization
  - Middleware configuration
  - Route registration
  - Error handling setup

```javascript
// Key features:
- CORS configuration for frontend communication
- JSON body parsing with 10MB limit
- Request logging middleware
- Socket.IO with CORS support
- Error handling middleware
```

### 2. **Data Layer** (`data/`)
- **Purpose**: Abstract data storage interface
- **Components**:
  - `DataLayer.js`: Abstract interface for data operations
  - `sharedDataLayer.js`: Singleton instance for all routes
  - `adapters/`: Storage implementation adapters

#### DataLayer Interface
```javascript
class DataLayer {
  async getAllWorkflows()           // Get all workflows
  async getWorkflow(id)             // Get specific workflow
  async saveWorkflow(workflowData)  // Save/update workflow
  async updateWorkflow(id, updates) // Update existing workflow
  async deleteWorkflow(id)          // Delete workflow
  async searchWorkflows(query)      // Search workflows
  async getStats()                  // Get statistics
}
```

#### MemoryAdapter
```javascript
class MemoryAdapter {
  async getAll()                    // Get all items
  async get(id)                     // Get specific item
  async save(item)                  // Save item
  async delete(id)                  // Delete item
  async clear()                     // Clear all items
}
```

### 3. **Services** (`services/`)

#### GitService
- **Purpose**: Execute Git commands using child_process
- **Key Methods**:
  - `executeGitCommand(command, options)` - Core Git execution
  - `checkout(source, target, params)` - Branch checkout
  - `merge(source, target, params)` - Branch merge
  - `rebase(source, target, params)` - Rebase operations
  - `push(source, target, params)` - Push to remote
  - `pull(source, target, params)` - Pull from remote
  - `deleteBranch(source, target, params)` - Delete branches
  - `tag(source, target, params)` - Create tags
  - `getRepositoryStatus()` - Repository validation

#### WorkflowExecutor
- **Purpose**: Execute workflows with dependency resolution
- **Key Features**:
  - Dependency graph building
  - Parallel operation execution
  - Real-time progress updates
  - Error handling and recovery
  - Branch name resolution from IDs

```javascript
class WorkflowExecutor {
  async executeWorkflow(workflow, executionId)
  buildDependencyGraph(operations)
  async executeOperations(workflow, execution, dependencies)
  async executeOperation(operation, execution, workflow)
  resolveBranchNames(operation, workflow)
}
```

---

## 🌐 API Endpoints

### Workflow Management (`/api/workflows`)

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/` | Get all workflows | - | `{success, data, count}` |
| GET | `/:id` | Get specific workflow | - | `{success, data}` |
| POST | `/` | Create workflow | Workflow object | `{success, data, message}` |
| PUT | `/:id` | Update workflow | Workflow updates | `{success, data, message}` |
| DELETE | `/:id` | Delete workflow | - | `{success, message}` |
| GET | `/search?q=query` | Search workflows | - | `{success, data, count}` |
| GET | `/type/:branchType` | Get by branch type | - | `{success, data, count}` |
| POST | `/:id/duplicate` | Duplicate workflow | `{newName?}` | `{success, data, message}` |
| GET | `/:id/export` | Export workflow | - | JSON file |
| POST | `/import` | Import workflow | `{jsonData, newName?}` | `{success, data, message}` |
| GET | `/stats` | Get statistics | - | `{success, data}` |

### Execution Management (`/api/execution`)

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/:id/start` | Start execution | - | `{success, data}` |
| GET | `/:id/status` | Get execution status | - | `{success, data}` |
| POST | `/:id/stop` | Stop execution | - | `{success, data}` |

### Health Check
| Method | Endpoint | Description | Response |
|--------|----------|-------------|----------|
| GET | `/api/health` | Health check | `{status, timestamp, version}` |

---

## 🔌 Real-time Communication

### Socket.IO Events

#### Server → Client Events
```javascript
// Execution Events
'execution-started'     // Workflow execution begins
'execution-completed'   // Workflow execution completes successfully
'execution-failed'      // Workflow execution fails
'execution-stopped'     // Workflow execution is stopped

// Operation Events
'operation-started'      // Individual operation starts
'operation-completed'    // Individual operation completes
'operation-failed'       // Individual operation fails

// Log Events
'log-entry'             // Execution log entry added
```

#### Client → Server Events
```javascript
'execution-stopped'     // Client requests execution stop
```

### Event Data Structure
```javascript
// Execution Events
{
  executionId: "exec-1234567890-abc123",
  timestamp: "2025-09-22T12:00:00.000Z",
  workflowName: "Feature Branch Workflow",
  status: "running|completed|failed|stopped"
}

// Operation Events
{
  executionId: "exec-1234567890-abc123",
  operationId: "op-123",
  operationType: "checkout",
  source: "master",
  target: "feature-branch",
  status: "running|success|failed"
}

// Log Events
{
  executionId: "exec-1234567890-abc123",
  timestamp: "2025-09-22T12:00:00.000Z",
  message: "Starting checkout from master to feature-branch",
  type: "info|success|error"
}
```

---

## 🗄️ Data Layer

### Data Layer Pattern
The backend uses a **Data Layer Abstraction Pattern** that allows switching between different storage backends without changing business logic.

### Supported Adapters
1. **MemoryAdapter** - In-memory storage (default)
2. **LocalStorageAdapter** - Browser localStorage compatible
3. **DatabaseAdapter** - Future database integration

### Data Layer Benefits
- **Flexibility**: Easy to switch storage backends
- **Testability**: Mock adapters for testing
- **Consistency**: Unified interface across all operations
- **Scalability**: Easy to add caching, validation, etc.

### Workflow Data Structure
```javascript
{
  id: "workflow-1234567890-abc123",
  name: "Feature Branch Workflow",
  description: "Creates feature branch from master",
  branches: [
    {
      id: "branch-123",
      name: "master",
      type: "production",
      isRemote: false,
      protection: "none",
      position: { x: 100, y: 100 }
    }
  ],
  operations: [
    {
      id: "op-123",
      type: "checkout",
      source: "branch-123",  // Branch ID reference
      target: "branch-456",  // Branch ID reference
      params: {
        new: true,
        force: false
      }
    }
  ],
  createdAt: "2025-09-22T12:00:00.000Z",
  updatedAt: "2025-09-22T12:00:00.000Z",
  version: 1
}
```

---

## 🔧 Services

### GitService Architecture
```javascript
class GitService {
  constructor(workingDirectory = process.cwd())
  
  // Core execution
  async executeGitCommand(command, options)
  
  // Git operations
  async checkout(source, target, params)
  async merge(source, target, params)
  async rebase(source, target, params)
  async push(source, target, params)
  async pull(source, target, params)
  async deleteBranch(source, target, params)
  async tag(source, target, params)
  
  // Repository management
  async getCurrentBranch()
  async getBranches()
  async isRepositoryClean()
  async validateRepository()
  async getRepositoryStatus()
}
```

### WorkflowExecutor Architecture
```javascript
class WorkflowExecutor {
  constructor(gitService, io)
  
  // Main execution
  async executeWorkflow(workflow, executionId)
  
  // Dependency resolution
  buildDependencyGraph(operations)
  async executeOperations(workflow, execution, dependencies)
  
  // Operation execution
  async executeOperation(operation, execution, workflow)
  resolveBranchNames(operation, workflow)
  
  // State management
  initializeExecutionState(workflow, execution)
  updateBranchStatus(execution, branchId, status)
  addLog(execution, message, type)
  
  // Real-time updates
  emitUpdate(executionId, event, data)
  
  // Execution management
  getExecutionStatus(executionId)
  stopExecution(executionId)
}
```

---

## 🛡️ Middleware

### Error Handler (`middleware/errorHandler.js`)
```javascript
// 404 Not Found handler
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Global error handler
const errorHandler = (err, req, res, next) => {
  // Handles:
  // - Mongoose CastError (invalid ObjectId)
  // - Mongoose duplicate key (11000)
  // - Mongoose validation errors
  // - Generic errors with stack traces in development
};
```

### Validation (`middleware/validation.js`)
```javascript
// Workflow validation
const validateWorkflow = (req, res, next) => {
  // Validates:
  // - Required fields (name, branches, operations)
  // - Branch types (production, feature, release, hotfix, develop, staging)
  // - Operation types (checkout, merge, rebase, push, pull, delete-branch, tag)
  // - Operation status values (pending, running, success, failed)
  // - Branch reference validation
};

// Workflow ID validation
const validateWorkflowId = (req, res, next) => {
  // Validates workflow ID parameter exists and is not empty
};
```

---

## ⚠️ Error Handling

### Error Response Format
```javascript
{
  success: false,
  error: {
    message: "Error description",
    stack: "Error stack trace" // Only in development
  }
}
```

### Error Types Handled
1. **Validation Errors** (400)
   - Missing required fields
   - Invalid data types
   - Invalid enum values

2. **Not Found Errors** (404)
   - Workflow not found
   - Invalid endpoints

3. **Git Operation Errors** (500)
   - Repository not found
   - Uncommitted changes
   - Git command failures

4. **System Errors** (500)
   - Database connection issues
   - Memory allocation errors
   - Socket.IO connection issues

---

## 🧪 Testing

### Test Server (`test-server.js`)
```javascript
// Test functions:
async function testDataLayer()     // Tests data layer operations
async function testAPIEndpoints()  // Tests API endpoints
async function runTests()          // Runs all tests
```

### Test Coverage
- **Data Layer**: CRUD operations, search, statistics
- **API Endpoints**: Health check, workflow management
- **Error Handling**: Validation, not found, system errors

### Running Tests
```bash
# Run test server
node test-server.js

# Test specific components
const { testDataLayer, testAPIEndpoints } = require('./test-server');
```

---

## 🚀 Development Guide

### Project Structure
```
backend/
├── index.js              # Server entry point
├── package.json          # Dependencies and scripts
├── documentation.md      # This documentation
├── data/                 # Data layer
├── middleware/           # Express middleware
├── routes/              # API routes
├── services/            # Business logic
└── test-server.js       # Testing utilities
```

### Dependencies
```json
{
  "express": "^4.18.2",      // Web framework
  "cors": "^2.8.5",          // CORS middleware
  "socket.io": "^4.7.2",     // Real-time communication
  "uuid": "^9.0.0",          // UUID generation
  "nodemon": "^3.0.1"        // Development server
}
```

### Scripts
```bash
npm start          # Production server
npm run dev        # Development server with nodemon
```

### Environment Variables
```bash
PORT=5000                    # Server port
NODE_ENV=development         # Environment mode
```

### Development Workflow
1. **Start Development Server**: `npm run dev`
2. **Test API Endpoints**: Use `test-server.js`
3. **Monitor Logs**: Check console for execution logs
4. **Test Real-time**: Use Socket.IO client to test events

### Adding New Features

#### 1. New API Endpoint
```javascript
// In routes/workflows.js
router.get('/new-endpoint', async (req, res, next) => {
  try {
    // Implementation
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});
```

#### 2. New Git Operation
```javascript
// In services/GitService.js
async newOperation(source, target, params = {}) {
  const command = `git new-command ${target}`;
  return await this.executeGitCommand(command);
}
```

#### 3. New Data Layer Method
```javascript
// In data/DataLayer.js
async newDataOperation(params) {
  return await this.adapter.newOperation(params);
}
```

---

## 🔍 Key Design Decisions

### 1. **Shared Data Layer Instance**
- **Problem**: Execution routes couldn't find workflows
- **Solution**: Created `sharedDataLayer.js` for singleton pattern
- **Benefit**: Consistent data access across all routes

### 2. **Branch Name Resolution**
- **Problem**: Operations reference branch IDs, Git needs names
- **Solution**: `resolveBranchNames()` method in WorkflowExecutor
- **Benefit**: Frontend flexibility with backend Git compatibility

### 3. **Dependency Resolution**
- **Problem**: Operations need to execute in correct order
- **Solution**: Build dependency graph and execute in parallel when possible
- **Benefit**: Efficient execution with proper ordering

### 4. **Real-time Updates**
- **Problem**: Frontend needs live execution progress
- **Solution**: Socket.IO events for all execution phases
- **Benefit**: Rich user experience with real-time feedback

### 5. **Error Handling**
- **Problem**: Consistent error responses across all endpoints
- **Solution**: Centralized error handling middleware
- **Benefit**: Predictable API behavior and better debugging

---

## 📈 Performance Considerations

### Memory Management
- **Execution Tracking**: Active executions stored in Map with cleanup
- **Data Layer**: Memory adapter with prefix-based organization
- **Log Management**: Execution logs stored in memory with size limits

### Git Operations
- **Command Timeout**: 30-second timeout for Git commands
- **Buffer Size**: 10MB buffer for large Git outputs
- **Working Directory**: Configurable working directory for Git operations

### Real-time Communication
- **Event Batching**: Multiple events can be batched for efficiency
- **Connection Management**: Automatic cleanup of disconnected clients
- **Error Recovery**: Graceful handling of Socket.IO connection issues

---

## 🔒 Security Considerations

### Input Validation
- **Request Validation**: All inputs validated before processing
- **Git Command Sanitization**: Commands constructed safely
- **File Path Validation**: Working directory restrictions

### Error Information
- **Stack Traces**: Only exposed in development mode
- **Sensitive Data**: Git credentials not logged
- **Error Messages**: User-friendly messages without internal details

---

## 🚀 Future Enhancements

### Planned Features
1. **Database Integration**: PostgreSQL/MongoDB adapters
2. **Authentication**: User management and authorization
3. **Workflow Templates**: Pre-built workflow templates
4. **Execution History**: Persistent execution logs
5. **Branch Protection**: Advanced branch protection rules
6. **Webhook Integration**: External system notifications
7. **Performance Monitoring**: Execution metrics and analytics

### Architecture Improvements
1. **Microservices**: Split into separate services
2. **Message Queues**: Redis/RabbitMQ for execution queuing
3. **Caching**: Redis for frequently accessed data
4. **Load Balancing**: Multiple server instances
5. **Containerization**: Docker deployment support

---

This documentation provides a comprehensive understanding of the GitPilot backend architecture, data flow, and implementation details. Use this as a reference for development, debugging, and extending the system.