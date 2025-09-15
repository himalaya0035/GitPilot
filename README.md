# Git Workflow Visualizer

A powerful tool for creating, visualizing, and executing Git workflows with a visual interface.

## 🎯 Features

### ✅ Completed (Frontend)
- **Branch-Centric Workflow Editor**: Drag-and-drop interface for creating Git workflows with branches as nodes
- **Branch Types**: Support for production, feature, release, and hotfix branches
- **Operation Edges**: Git operations (checkout, merge, rebase, push, pull, delete-branch, tag) as edges between branches
- **Branch Configuration**: Click branches to configure properties (name, remote status, protection)
- **Operation Configuration**: Click operation edges to configure Git command parameters
- **Workflow Runner**: Visual execution with real-time status updates
- **Status Indicators**: Color-coded branches and operations (pending, running, success, failed)
- **Execution Logs**: Detailed logging with export functionality
- **Responsive Design**: Works on desktop and mobile devices

### 🚧 In Progress (Backend)
- Express server setup
- Git operations execution
- Workflow execution engine
- WebSocket for live updates
- API integration

## 🏗 Project Structure

```
git-visualizer/
├── frontend/                 # React + React Flow application
│   ├── src/
│   │   ├── components/
│   │   │   ├── WorkflowEditor.jsx    # Visual workflow creation
│   │   │   ├── WorkflowRunner.jsx    # Workflow execution UI
│   │   │   └── NodeConfigModal.jsx   # Node configuration
│   │   ├── App.js                    # Main application
│   │   └── index.js                  # Entry point
│   └── package.json
├── backend/                  # Node.js + Express server
│   └── package.json
└── README.md
```

## 🚀 Getting Started

### Frontend (Currently Available)

1. Navigate to the frontend directory:
   ```bash
   cd git-visualizer/frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Backend (Coming Soon)

The backend will provide:
- REST API for workflow management
- Git command execution via child_process
- WebSocket for real-time updates
- Workflow execution engine with dependency resolution

## 🎨 Workflow Editor Features

### Creating Workflows
1. **Drag Branches**: Drag branch nodes from the palette to the canvas
2. **Connect Operations**: Draw edges between branches to define Git operations
3. **Configure Branches**: Click branches to set properties (name, remote status, protection)
4. **Configure Operations**: Click operation edges to set Git command parameters
5. **Save Workflow**: Enter a name and click "Create Workflow"

### Supported Branch Types
- **Production**: Main production branches (🏭)
- **Feature**: Feature development branches (🔧)
- **Release**: Release preparation branches (🚀)
- **Hotfix**: Critical bug fix branches (🚨)

### Supported Git Operations
- **Checkout**: Create new branches or switch between branches
- **Merge**: Merge source branch into target branch
- **Rebase**: Rebase current branch onto another branch
- **Push**: Push changes to remote repository (with optional force)
- **Pull**: Pull changes from remote (with optional rebase)
- **Delete Branch**: Delete local or remote branches
- **Tag**: Create and push Git tags

## 🏃‍♂️ Workflow Runner Features

### Execution
- **Visual Feedback**: Nodes change color based on status
- **Parallel Execution**: Independent operations run simultaneously
- **Dependency Resolution**: Operations wait for their dependencies
- **Error Handling**: Failed operations don't block independent ones

### Status Indicators
- **Gray**: Pending (not yet started)
- **Yellow**: Running (currently executing)
- **Green**: Success (completed successfully)
- **Red**: Failed (execution failed)

### Logging
- **Real-time Logs**: See execution progress in real-time
- **Export Logs**: Download execution logs as text files
- **Clear Logs**: Reset the log display

## 📋 Workflow JSON Schema

```json
{
  "workflowId": "21-sept-release",
  "name": "CPF Release Workflow",
  "branches": [
    {
      "id": "prod-cpf",
      "name": "prod-cpf",
      "type": "production",
      "isRemote": true,
      "protection": "strict",
      "position": { "x": 100, "y": 200 }
    },
    {
      "id": "21-sept-release-cpf",
      "name": "21-sept-release-cpf",
      "type": "release",
      "isRemote": false,
      "protection": "moderate",
      "position": { "x": 300, "y": 200 }
    }
  ],
  "operations": [
    {
      "id": "op1",
      "type": "checkout",
      "source": "prod-cpf",
      "target": "21-sept-release-cpf",
      "params": {
        "new": true,
        "force": false
      }
    },
    {
      "id": "op2",
      "type": "merge",
      "source": "CR-31820-cpf",
      "target": "21-sept-release-cpf",
      "params": {
        "strategy": "merge",
        "noFF": false
      }
    }
  ]
}
```

## 🛠 Technology Stack

### Frontend
- **React 18**: Modern React with hooks
- **React Flow**: Graph-based workflow visualization
- **CSS3**: Custom styling with animations
- **Axios**: HTTP client for API calls
- **Socket.IO Client**: Real-time communication

### Backend (Planned)
- **Node.js**: Runtime environment
- **Express**: Web framework
- **Socket.IO**: WebSocket communication
- **child_process**: Git command execution

## 🎯 Example Workflow

Here's an example of a typical release workflow (matching your reference image):

1. **Checkout** from `prod-cpf` to `21-sept-release-cpf`
2. **Merge** `CR-31820-cpf` into `21-sept-release-cpf`
3. **Merge** `CR-21720-cpf` into `21-sept-release-cpf`
4. **Checkout** from `prod-alphaWealth` to `21-sept-release-alpha`
5. **Merge** `21-sept-release-cpf` into `21-sept-release-alpha`
6. **Checkout** from `prod-gain` to `21-sept-release-gain`
7. **Merge** `21-sept-release-cpf` into `21-sept-release-gain`

This workflow shows a branch-centric approach where:
- **Branches** are the nodes (prod-cpf, 21-sept-release-cpf, etc.)
- **Operations** are the edges (checkout -b, merge)
- The flow represents actual Git branch relationships and operations

## 🔄 Next Steps

1. **Backend Development**: Implement Express server and Git operations
2. **API Integration**: Connect frontend to backend APIs
3. **WebSocket Updates**: Real-time execution status updates
4. **Testing**: End-to-end testing of workflow creation and execution
5. **Documentation**: API documentation and user guides

## 📝 Notes

- The frontend currently simulates workflow execution for demonstration
- All workflows are stored in-memory (no database required for POC)
- The tool assumes it's running within a Git repository context
- Error handling includes graceful failure recovery and dependency skipping