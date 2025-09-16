import React, { useState, useEffect } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './WorkflowRunner.css';

// Branch node types (same as editor)
const branchNodeTypes = {
  production: ProductionBranchNode,
  feature: FeatureBranchNode,
  release: ReleaseBranchNode,
  hotfix: HotfixBranchNode,
  develop: DevelopBranchNode,
  staging: StagingBranchNode,
};

// Operation edge types
const operationTypes = {
  checkout: { label: 'checkout -b', color: '#007bff' },
  merge: { label: 'merge', color: '#28a745' },
  rebase: { label: 'rebase', color: '#ffc107' },
  push: { label: 'push', color: '#17a2b8' },
  pull: { label: 'pull', color: '#6f42c1' },
  'delete-branch': { label: 'delete', color: '#dc3545' },
  tag: { label: 'tag', color: '#fd7e14' },
};

function WorkflowRunner({ workflow, onBackToEditor }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionLog, setExecutionLog] = useState([]);
  // const [executionStatus, setExecutionStatus] = useState({});

  useEffect(() => {
    if (workflow) {
      // Convert workflow to React Flow format
      const flowNodes = workflow.branches.map((branch, index) => ({
        id: branch.id,
        type: branch.type,
        position: branch.position || { x: index * 250, y: 100 },
        data: {
          ...branch,
          status: 'pending',
        },
      }));

      const flowEdges = workflow.operations.map((operation) => ({
        id: operation.id,
        source: operation.source,
        target: operation.target,
        type: 'operation',
        data: {
          operationType: operation.type,
          params: operation.params,
          status: 'pending',
        },
        label: operationTypes[operation.type]?.label || operation.type,
        labelStyle: { 
          fill: operationTypes[operation.type]?.color || '#333',
          fontWeight: 600 
        },
        labelBgStyle: { fill: 'white', fillOpacity: 0.8 },
      }));

      setNodes(flowNodes);
      setEdges(flowEdges);
      // setExecutionStatus({});
    }
  }, [workflow, setNodes, setEdges]);

  const addLogEntry = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setExecutionLog(prev => [...prev, { timestamp, message, type }]);
  };

  const updateBranchStatus = (branchId, status) => {
    setNodes(prev => prev.map(node => 
      node.id === branchId 
        ? { ...node, data: { ...node.data, status } }
        : node
    ));
  };

  const updateOperationStatus = (operationId, status) => {
    setEdges(prev => prev.map(edge => 
      edge.id === operationId 
        ? { ...edge, data: { ...edge.data, status } }
        : edge
    ));
  };

  const executeWorkflow = async () => {
    if (isExecuting) return;
    
    setIsExecuting(true);
    setExecutionLog([]);
    // setExecutionStatus({});
    addLogEntry(`Starting execution of workflow: ${workflow.name}`, 'info');

    // Reset all branches and operations to pending
    setNodes(prev => prev.map(node => ({
      ...node,
      data: { ...node.data, status: 'pending' }
    })));
    setEdges(prev => prev.map(edge => ({
      ...edge,
      data: { ...edge.data, status: 'pending' }
    })));

    try {
      // For now, simulate execution with delays
      // In real implementation, this would call the backend API
      await simulateWorkflowExecution();
      
      addLogEntry('Workflow execution completed successfully!', 'success');
    } catch (error) {
      addLogEntry(`Workflow execution failed: ${error.message}`, 'error');
    } finally {
      setIsExecuting(false);
    }
  };

  const simulateWorkflowExecution = async () => {
    // const operationMap = new Map(edges.map(edge => [edge.id, edge]));
    // const branchMap = new Map(nodes.map(node => [node.id, node]));
    
    // Build dependency map for operations
    const dependencies = new Map();
    edges.forEach(edge => {
      if (!dependencies.has(edge.id)) {
        dependencies.set(edge.id, []);
      }
      // Find operations that target the source of this operation
      edges.forEach(otherEdge => {
        if (otherEdge.target === edge.source && otherEdge.id !== edge.id) {
          dependencies.get(edge.id).push(otherEdge.id);
        }
      });
    });

    // Find operations with no dependencies (can run in parallel)
    const getReadyOperations = (completed) => {
      return edges.filter(edge => {
        const deps = dependencies.get(edge.id) || [];
        return deps.every(dep => completed.has(dep));
      });
    };

    const completed = new Set();
    const failed = new Set();

    while (completed.size + failed.size < edges.length) {
      const readyOperations = getReadyOperations(completed);
      
      if (readyOperations.length === 0) {
        // No more operations can be executed
        break;
      }

      // Execute ready operations in parallel
      const promises = readyOperations.map(async (edge) => {
        const operation = edge.data;
        updateOperationStatus(edge.id, 'running');
        addLogEntry(`Executing ${operation.operationType} from ${edge.source} to ${edge.target}`, 'info');

        try {
          // Simulate execution time
          await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
          
          // Simulate success/failure (90% success rate for demo)
          const success = Math.random() > 0.1;
          
          if (success) {
            updateOperationStatus(edge.id, 'success');
            updateBranchStatus(edge.target, 'success');
            addLogEntry(`${operation.operationType} completed successfully from ${edge.source} to ${edge.target}`, 'success');
            completed.add(edge.id);
          } else {
            updateOperationStatus(edge.id, 'failed');
            updateBranchStatus(edge.target, 'failed');
            addLogEntry(`${operation.operationType} failed from ${edge.source} to ${edge.target}`, 'error');
            failed.add(edge.id);
          }
        } catch (error) {
          updateOperationStatus(edge.id, 'failed');
          updateBranchStatus(edge.target, 'failed');
          addLogEntry(`${operation.operationType} failed from ${edge.source} to ${edge.target}: ${error.message}`, 'error');
          failed.add(edge.id);
        }
      });

      await Promise.all(promises);
    }

    if (failed.size > 0) {
      throw new Error(`${failed.size} operations failed`);
    }
  };

  const clearLogs = () => {
    setExecutionLog([]);
  };

  const exportLogs = () => {
    const logText = executionLog.map(entry => 
      `[${entry.timestamp}] ${entry.type.toUpperCase()}: ${entry.message}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow-execution-${workflow.workflowId}-${Date.now()}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="workflow-runner">
      <div className="runner-header">
        <div className="workflow-info">
          <h2>{workflow?.name}</h2>
          <p>ID: {workflow?.workflowId}</p>
        </div>
        
        <div className="runner-controls">
          <button onClick={onBackToEditor} className="back-button">
            ← Back to Editor
          </button>
          <button 
            onClick={executeWorkflow} 
            disabled={isExecuting}
            className="execute-button"
          >
            {isExecuting ? 'Executing...' : 'Execute Workflow'}
          </button>
        </div>
      </div>

      <div className="runner-content">
        <div className="workflow-visualization">
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={branchNodeTypes}
              edgeTypes={{
                operation: OperationEdge,
              }}
              fitView
            >
              <Controls />
              <MiniMap />
              <Background variant="dots" gap={12} size={1} />
            </ReactFlow>
          </ReactFlowProvider>
        </div>

        <div className="execution-panel">
          <div className="panel-header">
            <h3>Execution Log</h3>
            <div className="log-controls">
              <button onClick={clearLogs} className="clear-button">
                Clear
              </button>
              <button onClick={exportLogs} className="export-button">
                Export
              </button>
            </div>
          </div>
          
          <div className="execution-log">
            {executionLog.length === 0 ? (
              <div className="no-logs">No execution logs yet</div>
            ) : (
              executionLog.map((entry, index) => (
                <div key={index} className={`log-entry ${entry.type}`}>
                  <span className="timestamp">[{entry.timestamp}]</span>
                  <span className="message">{entry.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Branch Node Components with Status Indicators
function ProductionBranchNode({ data, selected }) {
  return (
    <div className={`branch-node production status-${data.status} ${selected ? 'selected' : ''}`}>
      <div className="branch-header">
        <div className="branch-type-icon">🏭</div>
        <span className="branch-type">PROD</span>
        <span className="status-indicator"></span>
      </div>
      <div className="branch-name">{data.name}</div>
      {data.isRemote && <div className="remote-indicator">🌐</div>}
    </div>
  );
}

function FeatureBranchNode({ data, selected }) {
  return (
    <div className={`branch-node feature status-${data.status} ${selected ? 'selected' : ''}`}>
      <div className="branch-header">
        <div className="branch-type-icon">🔧</div>
        <span className="branch-type">FEATURE</span>
        <span className="status-indicator"></span>
      </div>
      <div className="branch-name">{data.name}</div>
      {data.isRemote && <div className="remote-indicator">🌐</div>}
    </div>
  );
}

function ReleaseBranchNode({ data, selected }) {
  return (
    <div className={`branch-node release status-${data.status} ${selected ? 'selected' : ''}`}>
      <div className="branch-header">
        <div className="branch-type-icon">🚀</div>
        <span className="branch-type">RELEASE</span>
        <span className="status-indicator"></span>
      </div>
      <div className="branch-name">{data.name}</div>
      {data.isRemote && <div className="remote-indicator">🌐</div>}
    </div>
  );
}

function HotfixBranchNode({ data, selected }) {
  return (
    <div className={`branch-node hotfix status-${data.status} ${selected ? 'selected' : ''}`}>
      <div className="branch-header">
        <div className="branch-type-icon">🚨</div>
        <span className="branch-type">HOTFIX</span>
        <span className="status-indicator"></span>
      </div>
      <div className="branch-name">{data.name}</div>
      {data.isRemote && <div className="remote-indicator">🌐</div>}
    </div>
  );
}

function DevelopBranchNode({ data, selected }) {
  return (
    <div className={`branch-node develop status-${data.status} ${selected ? 'selected' : ''}`}>
      <div className="branch-header">
        <div className="branch-type-icon">⚙️</div>
        <span className="branch-type">DEVELOP</span>
        <span className="status-indicator"></span>
      </div>
      <div className="branch-name">{data.name}</div>
      {data.isRemote && <div className="remote-indicator">🌐</div>}
    </div>
  );
}

function StagingBranchNode({ data, selected }) {
  return (
    <div className={`branch-node staging status-${data.status} ${selected ? 'selected' : ''}`}>
      <div className="branch-header">
        <div className="branch-type-icon">🧪</div>
        <span className="branch-type">STAGING</span>
        <span className="status-indicator"></span>
      </div>
      <div className="branch-name">{data.name}</div>
      {data.isRemote && <div className="remote-indicator">🌐</div>}
    </div>
  );
}

// Operation Edge Component with Status
function OperationEdge({ data, selected }) {
  // Get operation display text and styling based on type and params
  const getOperationDisplay = (operationType, params = {}) => {
    switch (operationType) {
      case 'checkout':
        if (params.new) {
          return { text: 'checkout -b', color: '#3b82f6', bgColor: '#eff6ff' };
        }
        return { text: 'checkout', color: '#6b7280', bgColor: '#f9fafb' };
      case 'merge':
        return { text: 'merge', color: '#10b981', bgColor: '#ecfdf5' };
      case 'rebase':
        return { text: 'rebase', color: '#f59e0b', bgColor: '#fffbeb' };
      case 'push':
        return { text: 'push', color: '#8b5cf6', bgColor: '#f3e8ff' };
      case 'pull':
        return { text: 'pull', color: '#06b6d4', bgColor: '#ecfeff' };
      case 'delete-branch':
        return { text: 'delete', color: '#ef4444', bgColor: '#fef2f2' };
      case 'tag':
        return { text: 'tag', color: '#f97316', bgColor: '#fff7ed' };
      default:
        return { text: operationType, color: '#6b7280', bgColor: '#f9fafb' };
    }
  };

  const operationDisplay = getOperationDisplay(data.operationType, data.params);
  
  return (
    <div className={`operation-edge status-${data.status} ${selected ? 'selected' : ''}`}>
      <div 
        className="operation-label"
        style={{ 
          backgroundColor: operationDisplay.bgColor,
          color: operationDisplay.color,
          border: `1px solid ${operationDisplay.color}`,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderRadius: '8px',
          padding: '6px 12px',
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.3px',
        }}
      >
        {operationDisplay.text}
      </div>
    </div>
  );
}

export default WorkflowRunner;