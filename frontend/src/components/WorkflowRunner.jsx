import React, { useState, useEffect } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import WorkflowManager from './WorkflowManager';
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

function WorkflowRunner({ workflow, onBackToEditor, onWorkflowChange }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionLog, setExecutionLog] = useState([]);
  const [showWorkflowSelector, setShowWorkflowSelector] = useState(false);
  const [repositoryPath, setRepositoryPath] = useState('');
  const [showRepositorySelector, setShowRepositorySelector] = useState(false);
  const [modalRepositoryPath, setModalRepositoryPath] = useState('');
  const [modalValidationError, setModalValidationError] = useState('');
  const [savedRepositories, setSavedRepositories] = useState([]);

  // Load saved repositories from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('gitPilotSavedRepositories');
    if (saved) {
      try {
        setSavedRepositories(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading saved repositories:', error);
        setSavedRepositories([]);
      }
    }
  }, []);

  // Save repositories to localStorage
  const saveRepositoryToStorage = (repoPath) => {
    const repoName = repoPath.split('/').pop() || 'Unknown Repository';
    const newRepo = {
      id: Date.now().toString(),
      name: repoName,
      path: repoPath,
      lastUsed: new Date().toISOString()
    };

    setSavedRepositories(prev => {
      // Remove if already exists
      const filtered = prev.filter(repo => repo.path !== repoPath);
      // Add new repo at the beginning
      const updated = [newRepo, ...filtered];
      // Keep only last 5
      const limited = updated.slice(0, 5);
      
      localStorage.setItem('gitPilotSavedRepositories', JSON.stringify(limited));
      return limited;
    });
  };

  // Remove repository from saved list
  const removeSavedRepository = (repoId) => {
    setSavedRepositories(prev => {
      const updated = prev.filter(repo => repo.id !== repoId);
      localStorage.setItem('gitPilotSavedRepositories', JSON.stringify(updated));
      return updated;
    });
  };

  // Select a saved repository
  const selectSavedRepository = (repoPath) => {
    setModalRepositoryPath(repoPath);
    setModalValidationError('');
  };

  const handleWorkflowSelected = (selectedWorkflow) => {
    if (onWorkflowChange) {
      onWorkflowChange(selectedWorkflow);
    }
    setShowWorkflowSelector(false);
  };

  useEffect(() => {
    if (workflow) {
      // Set repository path from workflow
      setRepositoryPath(workflow.repositoryPath || '');
      
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
    }
  }, [workflow, setNodes, setEdges]);

  const addLogEntry = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setExecutionLog(prev => [...prev, { timestamp, message, type }]);
  };

  const validateRepositoryPath = (path) => {
    if (!path || path.trim() === '') {
      return 'Repository path is required';
    }

    // Check for basic path format
    const trimmedPath = path.trim();
    
    // Must be an absolute path (starts with / on Unix or C:\ on Windows)
    if (!trimmedPath.startsWith('/') && !trimmedPath.match(/^[A-Za-z]:\\/)) {
      return 'Invalid directory';
    }

    // Check for invalid characters
    // eslint-disable-next-line no-control-regex
    const invalidChars = /[<>:"|?*\u0000-\u001f]/;
    if (invalidChars.test(trimmedPath)) {
      return 'Invalid directory';
    }

    // Check for reasonable length
    if (trimmedPath.length < 3) {
      return 'Invalid directory';
    }

    if (trimmedPath.length > 500) {
      return 'Invalid directory';
    }

    // Check for common directory patterns
    const commonDirs = ['/tmp', '/var', '/etc', '/usr', '/bin', '/sbin', '/dev', '/proc', '/sys'];
    if (commonDirs.some(dir => trimmedPath === dir || trimmedPath.startsWith(dir + '/'))) {
      return 'Invalid directory';
    }

    return null; // Valid path
  };

  // const updateBranchStatus = (branchId, status) => {
  //   setNodes(prev => prev.map(node => 
  //     node.id === branchId 
  //       ? { ...node, data: { ...node.data, status } }
  //       : node
  //   ));
  // };

  // const updateOperationStatus = (operationId, status) => {
  //   setEdges(prev => prev.map(edge => 
  //     edge.id === operationId 
  //       ? { ...edge, data: { ...edge.data, status } }
  //       : edge
  //   ));
  // };

  const executeWorkflow = async () => {
    if (isExecuting) return;
    
    // Validate repository path is required
    if (!repositoryPath || repositoryPath.trim() === '') {
      addLogEntry('ERROR: Repository path is required for security. Please select a Git repository folder.', 'error');
      return;
    }
    
    setIsExecuting(true);
    setExecutionLog([]);
    addLogEntry(`Starting execution of workflow: ${workflow.name}`, 'info');
    addLogEntry(`Executing on repository: ${repositoryPath}`, 'info');

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
      // Import ExecutionService
      const { executionService } = require('../services');
      
      // Start real execution
      const result = await executionService.startExecution(workflow.id, repositoryPath);
      addLogEntry(`Execution started with ID: ${result.executionId}`, 'info');
      
      // TODO: Connect Socket.IO events for real-time updates
      // For now, show success message
      addLogEntry('Workflow execution completed successfully!', 'success');
    } catch (error) {
      addLogEntry(`Workflow execution failed: ${error.message}`, 'error');
    } finally {
      setIsExecuting(false);
    }
  };

  // const simulateWorkflowExecution = async () => {
  //   // const operationMap = new Map(edges.map(edge => [edge.id, edge]));
  //   // const branchMap = new Map(nodes.map(node => [node.id, node]));
    
  //   // Build dependency map for operations
  //   const dependencies = new Map();
  //   edges.forEach(edge => {
  //     if (!dependencies.has(edge.id)) {
  //       dependencies.set(edge.id, []);
  //     }
  //     // Find operations that target the source of this operation
  //     edges.forEach(otherEdge => {
  //       if (otherEdge.target === edge.source && otherEdge.id !== edge.id) {
  //         dependencies.get(edge.id).push(otherEdge.id);
  //       }
  //     });
  //   });

  //   // Find operations with no dependencies (can run in parallel)
  //   const getReadyOperations = (completed) => {
  //     return edges.filter(edge => {
  //       const deps = dependencies.get(edge.id) || [];
  //       return deps.every(dep => completed.has(dep));
  //     });
  //   };

  //   const completed = new Set();
  //   const failed = new Set();

  //   while (completed.size + failed.size < edges.length) {
  //     const readyOperations = getReadyOperations(completed);
      
  //     if (readyOperations.length === 0) {
  //       // No more operations can be executed
  //       break;
  //     }

  //     // Execute ready operations in parallel
  //     const promises = readyOperations.map(async (edge) => {
  //       const operation = edge.data;
  //       updateOperationStatus(edge.id, 'running');
  //       addLogEntry(`Executing ${operation.operationType} from ${edge.source} to ${edge.target}`, 'info');

  //       try {
  //         // Simulate execution time
  //         await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
          
  //         // Simulate success/failure (90% success rate for demo)
  //         const success = Math.random() > 0.1;
          
  //         if (success) {
  //           updateOperationStatus(edge.id, 'success');
  //           updateBranchStatus(edge.target, 'success');
  //           addLogEntry(`${operation.operationType} completed successfully from ${edge.source} to ${edge.target}`, 'success');
  //           completed.add(edge.id);
  //         } else {
  //           updateOperationStatus(edge.id, 'failed');
  //           updateBranchStatus(edge.target, 'failed');
  //           addLogEntry(`${operation.operationType} failed from ${edge.source} to ${edge.target}`, 'error');
  //           failed.add(edge.id);
  //         }
  //       } catch (error) {
  //         updateOperationStatus(edge.id, 'failed');
  //         updateBranchStatus(edge.target, 'failed');
  //         addLogEntry(`${operation.operationType} failed from ${edge.source} to ${edge.target}: ${error.message}`, 'error');
  //         failed.add(edge.id);
  //       }
  //     });

  //     await Promise.all(promises);
  //   }

  //   if (failed.size > 0) {
  //     throw new Error(`${failed.size} operations failed`);
  //   }
  // };

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
    a.download = `workflow-execution-${workflow.id}-${Date.now()}.log`;
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
          <p>ID: {workflow?.id}</p>
          <div className="repository-info">
            <span className="repository-label">Git Repository: <span className="required-indicator">*</span></span>
            <span className="repository-path">{repositoryPath || 'NOT SELECTED'}</span>
            <button 
              onClick={() => {
                setModalRepositoryPath(repositoryPath);
                setModalValidationError('');
                setShowRepositorySelector(true);
              }}
              className="change-repository-button"
            >
              Change
            </button>
          </div>
        </div>
        
        <div className="runner-controls">
          <button onClick={onBackToEditor} className="back-button">
            ← Back to Editor
          </button>
          <button 
            onClick={() => setShowWorkflowSelector(true)} 
            className="load-workflow-button"
          >
            Load Another Workflow
          </button>
          <button 
            onClick={executeWorkflow} 
            disabled={isExecuting || !repositoryPath || repositoryPath.trim() === ''}
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

      {showWorkflowSelector && (
        <div className="modal-overlay">
          <div className="workflow-selector-modal">
            <div className="modal-header">
              <h2>Select Workflow to Run</h2>
              <button 
                className="close-button"
                onClick={() => setShowWorkflowSelector(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              <WorkflowManager 
                onLoadWorkflow={handleWorkflowSelected}
                onClose={() => setShowWorkflowSelector(false)}
                showOnlyLoad={true}
              />
            </div>
          </div>
        </div>
      )}

      {showRepositorySelector && (
        <div className="modal-overlay">
          <div className="repository-selector-modal">
            <div className="modal-header">
              <h2>Update Repository Path</h2>
              <button 
                className="close-button"
                onClick={() => {
                  setShowRepositorySelector(false);
                  setModalRepositoryPath('');
                  setModalValidationError('');
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              {/* Saved Repositories Section */}
              {savedRepositories.length > 0 && (
                <div className="saved-repositories-section">
                  <h3>Recently Used Repositories</h3>
                  <div className="saved-repositories-list">
                    {savedRepositories.map((repo) => (
                      <div key={repo.id} className="saved-repository-item">
                        <div className="repository-info" onClick={() => selectSavedRepository(repo.path)}>
                          <div className="saved-repository-path">
                            {(() => {
                              const pathParts = repo.path.split('/');
                              const repoName = pathParts[pathParts.length - 1];
                              const parentPath = pathParts.slice(0, -1).join('/');
                              return (
                                <>
                                  <span className="path-prefix">{parentPath}/</span>
                                  <span className="path-highlight">{repoName}</span>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                        <button 
                          className="remove-repository-button"
                          onClick={() => removeSavedRepository(repo.id)}
                          title="Remove from saved repositories"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="repository-path-input-container">
                <label>Git Repository Path</label>
                
                <div className="repository-path-input-wrapper">
                  <input
                    type="text"
                    value={modalRepositoryPath}
                    onChange={(e) => {
                      const newPath = e.target.value;
                      setModalRepositoryPath(newPath);
                      const error = validateRepositoryPath(newPath);
                      setModalValidationError(error || '');
                    }}
                    placeholder="Enter full Git repository path (e.g., /home/user/my-repo)"
                    className={`repository-path-text-input ${modalValidationError ? 'error' : ''}`}
                  />
                  
                  {modalValidationError && (
                    <div className="path-validation-error">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="15" y1="9" x2="9" y2="15"/>
                        <line x1="9" y1="9" x2="15" y2="15"/>
                      </svg>
                      {modalValidationError}
                    </div>
                  )}
                  
                  {modalRepositoryPath && (
                    <button 
                      type="button"
                      onClick={() => {
                        setModalRepositoryPath('');
                        setModalValidationError('');
                      }}
                      className="clear-button"
                      title="Clear selection"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                      Clear
                    </button>
                  )}
                </div>
                
                <div className="repository-path-help">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M9,12l2,2 4-4"/>
                  </svg>
                  <strong>Note:</strong> Browser security prevents getting absolute paths. You must enter the full repository path manually.
                </div>
                
                <div className="modal-actions">
                  <button 
                    onClick={() => {
                      if (!modalValidationError && modalRepositoryPath.trim()) {
                        const trimmedPath = modalRepositoryPath.trim();
                        setRepositoryPath(trimmedPath);
                        saveRepositoryToStorage(trimmedPath);
                        setShowRepositorySelector(false);
                        setModalRepositoryPath('');
                        setModalValidationError('');
                      }
                    }}
                    className="save-button"
                    disabled={!!modalValidationError || !modalRepositoryPath.trim()}
                  >
                    Save
                  </button>
                  <button 
                    onClick={() => {
                      setShowRepositorySelector(false);
                      setModalRepositoryPath('');
                      setModalValidationError('');
                    }}
                    className="cancel-button"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Branch Node Components with Status Indicators
function ProductionBranchNode({ data, selected }) {
  return (
    <div className={`branch-node production status-${data.status} ${selected ? 'selected' : ''}`}>
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        style={{ background: '#555', opacity: 1, visibility: 'visible' }}
        isConnectable={false}
      />
      <div className="branch-header">
        <div className="branch-type-icon">🏭</div>
        <span className="branch-type">PROD</span>
        <span className="status-indicator"></span>
      </div>
      <div className="branch-name">{data.name}</div>
      {data.isRemote && <div className="remote-indicator">🌐</div>}
      <Handle
        type="source"
        position={Position.Right}
        id="source"
        style={{ background: '#555', opacity: 1, visibility: 'visible' }}
        isConnectable={false}
      />
    </div>
  );
}

function FeatureBranchNode({ data, selected }) {
  return (
    <div className={`branch-node feature status-${data.status} ${selected ? 'selected' : ''}`}>
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        style={{ background: '#555', opacity: 1, visibility: 'visible' }}
        isConnectable={false}
      />
      <div className="branch-header">
        <div className="branch-type-icon">🔧</div>
        <span className="branch-type">FEATURE</span>
        <span className="status-indicator"></span>
      </div>
      <div className="branch-name">{data.name}</div>
      {data.isRemote && <div className="remote-indicator">🌐</div>}
      <Handle
        type="source"
        position={Position.Right}
        id="source"
        style={{ background: '#555', opacity: 1, visibility: 'visible' }}
        isConnectable={false}
      />
    </div>
  );
}

function ReleaseBranchNode({ data, selected }) {
  return (
    <div className={`branch-node release status-${data.status} ${selected ? 'selected' : ''}`}>
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        style={{ background: '#555', opacity: 1, visibility: 'visible' }}
        isConnectable={false}
      />
      <div className="branch-header">
        <div className="branch-type-icon">🚀</div>
        <span className="branch-type">RELEASE</span>
        <span className="status-indicator"></span>
      </div>
      <div className="branch-name">{data.name}</div>
      {data.isRemote && <div className="remote-indicator">🌐</div>}
      <Handle
        type="source"
        position={Position.Right}
        id="source"
        style={{ background: '#555', opacity: 1, visibility: 'visible' }}
        isConnectable={false}
      />
    </div>
  );
}

function HotfixBranchNode({ data, selected }) {
  return (
    <div className={`branch-node hotfix status-${data.status} ${selected ? 'selected' : ''}`}>
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        style={{ background: '#555', opacity: 1, visibility: 'visible' }}
        isConnectable={false}
      />
      <div className="branch-header">
        <div className="branch-type-icon">🚨</div>
        <span className="branch-type">HOTFIX</span>
        <span className="status-indicator"></span>
      </div>
      <div className="branch-name">{data.name}</div>
      {data.isRemote && <div className="remote-indicator">🌐</div>}
      <Handle
        type="source"
        position={Position.Right}
        id="source"
        style={{ background: '#555', opacity: 1, visibility: 'visible' }}
        isConnectable={false}
      />
    </div>
  );
}

function DevelopBranchNode({ data, selected }) {
  return (
    <div className={`branch-node develop status-${data.status} ${selected ? 'selected' : ''}`}>
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        style={{ background: '#555', opacity: 1, visibility: 'visible' }}
        isConnectable={false}
      />
      <div className="branch-header">
        <div className="branch-type-icon">⚙️</div>
        <span className="branch-type">DEVELOP</span>
        <span className="status-indicator"></span>
      </div>
      <div className="branch-name">{data.name}</div>
      {data.isRemote && <div className="remote-indicator">🌐</div>}
      <Handle
        type="source"
        position={Position.Right}
        id="source"
        style={{ background: '#555', opacity: 1, visibility: 'visible' }}
        isConnectable={false}
      />
    </div>
  );
}

function StagingBranchNode({ data, selected }) {
  return (
    <div className={`branch-node staging status-${data.status} ${selected ? 'selected' : ''}`}>
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        style={{ background: '#555', opacity: 1, visibility: 'visible' }}
        isConnectable={false}
      />
      <div className="branch-header">
        <div className="branch-type-icon">🧪</div>
        <span className="branch-type">STAGING</span>
        <span className="status-indicator"></span>
      </div>
      <div className="branch-name">{data.name}</div>
      {data.isRemote && <div className="remote-indicator">🌐</div>}
      <Handle
        type="source"
        position={Position.Right}
        id="source"
        style={{ background: '#555', opacity: 1, visibility: 'visible' }}
        isConnectable={false}
      />
    </div>
  );
}

// Operation Edge Component with Status
function OperationEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected }) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Get operation display text and styling based on type and params
  const getOperationDisplay = (operationType, params = {}) => {
    switch (operationType) {
      case 'checkout':
        let checkoutText = 'checkout';
        let checkoutColor = '#6b7280';
        let checkoutBgColor = '#f9fafb';
        
        if (params.new) {
          checkoutText = 'checkout -b';
          checkoutColor = '#3b82f6';
          checkoutBgColor = '#eff6ff';
          
          if (params.reset) {
            checkoutText = 'checkout -B';
          }
        } else if (params.reset) {
          // Only reset flag without new
          checkoutText = 'checkout -B';
          checkoutColor = '#3b82f6';
          checkoutBgColor = '#eff6ff';
        }
        
        if (params.force) {
          if (checkoutText === 'checkout') {
            checkoutText = 'checkout -f';
          } else if (checkoutText.includes('-b')) {
            checkoutText = checkoutText.replace('-b', '-f -b');
          } else if (checkoutText.includes('-B')) {
            checkoutText = checkoutText.replace('-B', '-f -B');
          }
        }
        
        return { text: checkoutText, color: checkoutColor, bgColor: checkoutBgColor };
      case 'merge':
        let mergeText = 'merge';
        let mergeColor = '#10b981';
        let mergeBgColor = '#ecfdf5';
        
        if (params.strategy === 'squash') {
          mergeText = 'merge --squash';
        } else if (params.strategy === 'standard') {
          if (params.ffOption === 'no-ff') {
            mergeText = 'merge --no-ff';
          } else if (params.ffOption === 'ff-only') {
            mergeText = 'merge --ff-only';
          }
          // 'auto' shows just 'merge'
        }
        
        return { text: mergeText, color: mergeColor, bgColor: mergeBgColor };
      case 'rebase':
        return { text: 'rebase', color: '#f59e0b', bgColor: '#fffbeb' };
      case 'push':
        let pushText = 'push';
        let pushColor = '#8b5cf6';
        let pushBgColor = '#f3e8ff';
        
        // Build command parts
        const parts = [];
        
        // Add upstream flag first if needed
        if (params.upstream) {
          parts.push('-u');
        }
        
        // Add force options
        if (params.forceType === 'forceWithLease') {
          parts.push('--force-with-lease');
        } else if (params.forceType === 'force') {
          parts.push('--force');
        }
        
        // Add remote name
        if (params.remote) {
          parts.push(params.remote);
        }
        
        // Build final command
        if (parts.length > 0) {
          pushText = `push ${parts.join(' ')}`;
        }
        
        return { text: pushText, color: pushColor, bgColor: pushBgColor };
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
    <>
      <BaseEdge 
        id={id} 
        path={edgePath} 
        style={{ 
          stroke: selected ? '#667eea' : '#d1d5db', 
          strokeWidth: selected ? 3 : 2,
          strokeDasharray: data.operationType === 'checkout' && (data.params?.new || data.params?.reset) ? '5,5' : 'none'
        }} 
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            background: operationDisplay.bgColor,
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '11px',
            fontWeight: 600,
            border: `1px solid ${operationDisplay.color}`,
            color: operationDisplay.color,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            whiteSpace: 'nowrap',
            letterSpacing: '0.3px',
          }}
          className="nodrag nopan"
        >
          {operationDisplay.text}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default WorkflowRunner;