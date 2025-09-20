import React, { useState, useCallback, useRef } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  Handle,
  Position,
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
} from 'reactflow';
import 'reactflow/dist/style.css';
import BranchConfigModal from './BranchConfigModal';
import OperationConfigModal from './OperationConfigModal';
import WorkflowManager from './WorkflowManager';
import { useWorkflows } from '../hooks/useWorkflows';
import { useNotification } from '../contexts/NotificationContext';
import { validateWorkflowName, validateWorkflowStructure, sanitizeWorkflowName } from '../utils/validation';
import './WorkflowEditor.css';

// Branch node types
const branchNodeTypes = {
  production: ProductionBranchNode,
  feature: FeatureBranchNode,
  release: ReleaseBranchNode,
  hotfix: HotfixBranchNode,
  develop: DevelopBranchNode,
  staging: StagingBranchNode,
};

// Operation edge types for configuration
const operationTypes = {
  checkout: { label: 'checkout -b', color: '#007bff' },
  merge: { label: 'merge', color: '#28a745' },
  rebase: { label: 'rebase', color: '#ffc107' },
  push: { label: 'push', color: '#17a2b8' },
  pull: { label: 'pull', color: '#6f42c1' },
  'delete-branch': { label: 'delete', color: '#dc3545' },
  tag: { label: 'tag', color: '#fd7e14' },
};

const initialNodes = [];
const initialEdges = [];

function WorkflowEditor({ onWorkflowCreated }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [showBranchConfig, setShowBranchConfig] = useState(false);
  const [showOperationConfig, setShowOperationConfig] = useState(false);
  const [workflowName, setWorkflowName] = useState('');
  const [draggedItem, setDraggedItem] = useState(null);
  const [showWorkflowManager, setShowWorkflowManager] = useState(false);
  const [currentWorkflowId, setCurrentWorkflowId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  // Workflow management
  const { saveWorkflow, updateWorkflow } = useWorkflows();
  const { showSuccess, showError, showWarning } = useNotification();

  const isValidConnection = useCallback((connection) => {
    return true; // Allow all connections for now
  }, []);

  const onConnect = useCallback(
    (params) => {
      // Create a new operation edge with default merge operation
      const newEdge = {
        ...params,
        id: `edge-${Date.now()}`,
        type: 'operation',
        data: {
          operationType: 'merge', // default operation
          params: {},
        },
        label: 'merge',
        labelStyle: { fill: '#28a745', fontWeight: 600 },
        labelBgStyle: { fill: 'white', fillOpacity: 0.8 },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  const onNodeClick = useCallback((event, node) => {
    // Simple branch selection - just open config modal
    setSelectedBranch(node);
    setShowBranchConfig(true);
    setSelectedEdge(null);
  }, []);

  const onEdgeClick = useCallback((event, edge) => {
    setSelectedEdge(edge);
    setShowOperationConfig(true);
    setSelectedBranch(null);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedBranch(null);
    setSelectedEdge(null);
    setShowBranchConfig(false);
    setShowOperationConfig(false);
  }, []);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const itemType = event.dataTransfer.getData('application/reactflow');

      if (typeof itemType === 'undefined' || !itemType) {
        return;
      }

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      if (itemType.startsWith('branch-')) {
        const branchType = itemType.replace('branch-', '');
        const branchName = `${branchType}-${Date.now()}`;
        
        const newNode = {
          id: branchName,
          type: branchType,
          position,
          data: { 
            label: branchName,
            branchName: branchName,
            branchType: branchType,
            isRemote: false,
            protection: 'none',
          },
        };

        setNodes((nds) => nds.concat(newNode));
      }
    },
    [reactFlowInstance, setNodes]
  );

  const onBranchConfigSave = useCallback((branchData) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === selectedBranch.id
          ? { ...node, data: { ...node.data, ...branchData } }
          : node
      )
    );
    setShowBranchConfig(false);
    setSelectedBranch(null);
  }, [selectedBranch, setNodes]);

  const onOperationConfigSave = useCallback((operationData) => {
    setEdges((eds) =>
      eds.map((edge) =>
        edge.id === selectedEdge.id
          ? { 
              ...edge, 
              data: { ...edge.data, ...operationData },
              label: operationTypes[operationData.operationType]?.label || edge.label,
              labelStyle: { 
                fill: operationTypes[operationData.operationType]?.color || '#333',
                fontWeight: 600 
              },
            }
          : edge
      )
    );
    setShowOperationConfig(false);
    setSelectedEdge(null);
  }, [selectedEdge, setEdges]);

  const deleteBranch = useCallback((nodeId) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
  }, [setNodes, setEdges]);

  const deleteOperation = useCallback((edgeId) => {
    setEdges((eds) => eds.filter((edge) => edge.id !== edgeId));
  }, [setEdges]);


  const exportWorkflow = useCallback(() => {
    const nameValidation = validateWorkflowName(workflowName);
    if (!nameValidation.isValid) {
      showWarning(nameValidation.error);
      return;
    }

    const workflow = {
      workflowId: sanitizeWorkflowName(workflowName),
      name: workflowName.trim(),
      branches: nodes.map((node) => ({
        id: node.id,
        name: node.data.branchName,
        type: node.data.branchType,
        isRemote: node.data.isRemote,
        protection: node.data.protection,
        position: node.position,
      })),
      operations: edges.map((edge) => ({
        id: edge.id,
        type: edge.data.operationType,
        source: edge.source,
        target: edge.target,
        params: edge.data.params || {},
      })),
    };

    onWorkflowCreated(workflow);
  }, [workflowName, nodes, edges, onWorkflowCreated, showWarning]);

  // Save workflow to storage
  const saveWorkflowToStorage = useCallback(async () => {
    const nameValidation = validateWorkflowName(workflowName);
    if (!nameValidation.isValid) {
      showWarning(nameValidation.error);
      return;
    }

    try {
      setIsSaving(true);
      const workflow = {
        workflowId: sanitizeWorkflowName(workflowName),
        name: workflowName.trim(),
        branches: nodes.map((node) => ({
          id: node.id,
          name: node.data.branchName,
          type: node.data.branchType,
          isRemote: node.data.isRemote,
          protection: node.data.protection,
          position: node.position,
        })),
        operations: edges.map((edge) => ({
          id: edge.id,
          type: edge.data.operationType,
          source: edge.source,
          target: edge.target,
          params: edge.data.params || {},
        })),
      };

      if (currentWorkflowId) {
        // Update existing workflow
        await updateWorkflow(currentWorkflowId, workflow);
        showSuccess('Workflow updated successfully!');
      } else {
        // Save new workflow
        const savedWorkflow = await saveWorkflow(workflow);
        setCurrentWorkflowId(savedWorkflow.id);
        showSuccess('Workflow saved successfully!');
      }
    } catch (error) {
      console.error('Failed to save workflow:', error);
      showError('Failed to save workflow. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [workflowName, nodes, edges, currentWorkflowId, saveWorkflow, updateWorkflow, showWarning, showSuccess, showError]);

  // Load workflow from storage
  const loadWorkflow = useCallback((workflow) => {
    setWorkflowName(workflow.name);
    setCurrentWorkflowId(workflow.id);

    // Convert workflow data to nodes and edges
    const loadedNodes = workflow.branches.map((branch) => ({
      id: branch.id,
      type: branch.type,
      position: branch.position || { x: Math.random() * 400, y: Math.random() * 400 },
      data: {
        branchName: branch.name,
        branchType: branch.type,
        isRemote: branch.isRemote || false,
        protection: branch.protection || 'none',
      },
    }));

    const loadedEdges = workflow.operations.map((operation) => ({
      id: operation.id,
      source: operation.source,
      target: operation.target,
      type: 'operation',
      data: {
        operationType: operation.type,
        params: operation.params || {},
      },
      label: operation.type,
      labelStyle: { fill: operationTypes[operation.type]?.color || '#333', fontWeight: 600 },
      labelBgStyle: { fill: 'white', fillOpacity: 0.8 },
    }));

    setNodes(loadedNodes);
    setEdges(loadedEdges);
  }, [setNodes, setEdges]);

  // Clear current workflow
  const clearCurrentWorkflow = useCallback(() => {
    setWorkflowName('');
    setCurrentWorkflowId(null);
    setNodes([]);
    setEdges([]);
  }, [setNodes, setEdges]);

  const exportWorkflowAsJSON = useCallback(() => {
    const nameValidation = validateWorkflowName(workflowName);
    if (!nameValidation.isValid) {
      showWarning(nameValidation.error);
      return;
    }

    const workflow = {
      workflowId: sanitizeWorkflowName(workflowName),
      name: workflowName.trim(),
      branches: nodes.map((node) => ({
        id: node.id,
        name: node.data.branchName,
        type: node.data.branchType,
        isRemote: node.data.isRemote,
        protection: node.data.protection,
        position: node.position,
      })),
      operations: edges.map((edge) => ({
        id: edge.id,
        type: edge.data.operationType,
        source: edge.source,
        target: edge.target,
        params: edge.data.params || {},
      })),
    };

    // Create and download JSON file
    const dataStr = JSON.stringify(workflow, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${workflow.workflowId}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }, [workflowName, nodes, edges, showWarning]);

  const importWorkflowFromJSON = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workflow = JSON.parse(e.target.result);
        
        // Validate workflow structure
        const structureValidation = validateWorkflowStructure(workflow);
        if (!structureValidation.isValid) {
          showError(`Invalid workflow file: ${structureValidation.errors.join(', ')}`);
          return;
        }

        // Set workflow name
        setWorkflowName(workflow.name);

        // Convert branches to nodes
        const importedNodes = workflow.branches.map((branch) => ({
          id: branch.id,
          type: branch.type,
          position: branch.position || { x: Math.random() * 400, y: Math.random() * 300 },
          data: {
            branchName: branch.name,
            branchType: branch.type,
            isRemote: branch.isRemote || false,
            protection: branch.protection || {},
          },
        }));

        // Convert operations to edges
        const importedEdges = workflow.operations.map((operation) => ({
          id: operation.id,
          source: operation.source,
          target: operation.target,
          type: 'operation',
          data: {
            operationType: operation.type,
            params: operation.params || {},
          },
        }));

        setNodes(importedNodes);
        setEdges(importedEdges);
        
        showSuccess(`Successfully imported workflow: ${workflow.name}`);
      } catch (error) {
        showError('Error importing workflow: Invalid JSON file');
        console.error('Import error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
  }, [setNodes, setEdges, showError, showSuccess]);

  const onDragStart = (event, itemType) => {
    event.dataTransfer.setData('application/reactflow', itemType);
    event.dataTransfer.effectAllowed = 'move';
    setDraggedItem(itemType);
  };

  const onDragEnd = () => {
    setDraggedItem(null);
  };


  return (
    <div className="workflow-editor">
      <div className="editor-controls">
        <div className="workflow-name">
          <input
            type="text"
            placeholder="Enter workflow name..."
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
          />
        </div>
        
        <div className="palette-section">
          <h4>Git Branches</h4>
          <div className="branch-palette">
            {Object.keys(branchNodeTypes).map((branchType) => (
              <div
                key={`branch-${branchType}`}
                className={`palette-item branch-item ${branchType} ${draggedItem === `branch-${branchType}` ? 'dragging' : ''}`}
                onDragStart={(event) => onDragStart(event, `branch-${branchType}`)}
                onDragEnd={onDragEnd}
                draggable
              >
                <div className="branch-icon"></div>
                <span>{branchType}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="editor-actions">
          <div className="import-export-section">
            <input
              type="file"
              accept=".json"
              onChange={importWorkflowFromJSON}
              style={{ display: 'none' }}
              id="import-workflow"
            />
            <label 
              htmlFor="import-workflow" 
              className={`import-button ${isLoading ? 'loading' : ''}`}
            >
              {isLoading ? '⏳ Importing...' : '📁 Import JSON'}
            </label>
            <button onClick={exportWorkflowAsJSON} className="export-button">
              💾 Export JSON
            </button>
          </div>
          
          <div className="workflow-actions">
            <button onClick={clearCurrentWorkflow} className="danger">
              Clear All
            </button>
            <button onClick={() => setShowWorkflowManager(true)} className="secondary">
              📂 Load Workflow
            </button>
            <button 
              onClick={saveWorkflowToStorage} 
              className="primary"
              disabled={isSaving}
            >
              {isSaving ? '⏳ Saving...' : `💾 ${currentWorkflowId ? 'Update' : 'Save'} Workflow`}
            </button>
            <button onClick={exportWorkflow} className="primary">
              Create Workflow
            </button>
          </div>
        </div>

        <div className="palette-section">
          <h4>Instructions</h4>
          <div className="connection-instructions">
            <p><strong>How to create workflows:</strong></p>
            <p>1. Drag branches to canvas</p>
            <p>2. Drag from one branch to another to connect</p>
            <p>3. Click on connections to change operation type</p>
            <p>4. Click on branches to configure properties</p>
            <p><strong>Import/Export:</strong></p>
            <p>• Import JSON: Load existing workflows</p>
            <p>• Export JSON: Save workflow as file</p>
          </div>
        </div>
      </div>

      <div className="reactflow-wrapper" ref={reactFlowWrapper}>
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            nodeTypes={branchNodeTypes}
            edgeTypes={{
              operation: OperationEdge,
            }}
            fitView
            connectionLineStyle={{ stroke: '#333', strokeWidth: 2 }}
            isValidConnection={isValidConnection}
            defaultEdgeOptions={{
              type: 'operation',
              data: { operationType: 'merge', params: {} },
              label: 'merge',
              labelStyle: { fill: '#28a745', fontWeight: 600 },
              labelBgStyle: { fill: 'white', fillOpacity: 0.8 },
            }}
          >
            <Controls />
            <MiniMap />
            <Background variant="dots" gap={12} size={1} />
          </ReactFlow>
        </ReactFlowProvider>
      </div>

      {showBranchConfig && selectedBranch && (
        <BranchConfigModal
          branch={selectedBranch}
          onSave={onBranchConfigSave}
          onCancel={() => {
            setShowBranchConfig(false);
            setSelectedBranch(null);
          }}
          onDelete={() => {
            deleteBranch(selectedBranch.id);
            setShowBranchConfig(false);
            setSelectedBranch(null);
          }}
        />
      )}

      {showOperationConfig && selectedEdge && (
        <OperationConfigModal
          edge={selectedEdge}
          onSave={onOperationConfigSave}
          onCancel={() => {
            setShowOperationConfig(false);
            setSelectedEdge(null);
          }}
          onDelete={() => {
            deleteOperation(selectedEdge.id);
            setShowOperationConfig(false);
            setSelectedEdge(null);
          }}
        />
      )}

      {showWorkflowManager && (
        <WorkflowManager
          onLoadWorkflow={loadWorkflow}
          onClose={() => setShowWorkflowManager(false)}
        />
      )}
    </div>
  );
}

// Branch Node Components
function ProductionBranchNode({ data, selected }) {
  return (
    <div className={`branch-node production ${selected ? 'selected' : ''}`}>
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        style={{ background: '#555', opacity: 1, visibility: 'visible' }}
        isConnectable={true}
      />
      <div className="branch-header">
        <div className="branch-type-icon">🏭</div>
        <span className="branch-type">PROD</span>
      </div>
      <div className="branch-name">{data.branchName}</div>
      {data.isRemote && <div className="remote-indicator">🌐</div>}
      <Handle
        type="source"
        position={Position.Right}
        id="source"
        style={{ background: '#555', opacity: 1, visibility: 'visible' }}
        isConnectable={true}
      />
    </div>
  );
}

function FeatureBranchNode({ data, selected }) {
  return (
    <div className={`branch-node feature ${selected ? 'selected' : ''}`}>
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        style={{ background: '#555', opacity: 1, visibility: 'visible' }}
        isConnectable={true}
      />
      <div className="branch-header">
        <div className="branch-type-icon">🔧</div>
        <span className="branch-type">FEATURE</span>
      </div>
      <div className="branch-name">{data.branchName}</div>
      {data.isRemote && <div className="remote-indicator">🌐</div>}
      <Handle
        type="source"
        position={Position.Right}
        id="source"
        style={{ background: '#555', opacity: 1, visibility: 'visible' }}
        isConnectable={true}
      />
    </div>
  );
}

function ReleaseBranchNode({ data, selected }) {
  return (
    <div className={`branch-node release ${selected ? 'selected' : ''}`}>
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        style={{ background: '#555', opacity: 1, visibility: 'visible' }}
        isConnectable={true}
      />
      <div className="branch-header">
        <div className="branch-type-icon">🚀</div>
        <span className="branch-type">RELEASE</span>
      </div>
      <div className="branch-name">{data.branchName}</div>
      {data.isRemote && <div className="remote-indicator">🌐</div>}
      <Handle
        type="source"
        position={Position.Right}
        id="source"
        style={{ background: '#555', opacity: 1, visibility: 'visible' }}
        isConnectable={true}
      />
    </div>
  );
}

function HotfixBranchNode({ data, selected }) {
  return (
    <div className={`branch-node hotfix ${selected ? 'selected' : ''}`}>
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        style={{ background: '#555', opacity: 1, visibility: 'visible' }}
        isConnectable={true}
      />
      <div className="branch-header">
        <div className="branch-type-icon">🚨</div>
        <span className="branch-type">HOTFIX</span>
      </div>
      <div className="branch-name">{data.branchName}</div>
      {data.isRemote && <div className="remote-indicator">🌐</div>}
      <Handle
        type="source"
        position={Position.Right}
        id="source"
        style={{ background: '#555', opacity: 1, visibility: 'visible' }}
        isConnectable={true}
      />
    </div>
  );
}

function DevelopBranchNode({ data, selected }) {
  return (
    <div className={`branch-node develop ${selected ? 'selected' : ''}`}>
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        style={{ background: '#555', opacity: 1, visibility: 'visible' }}
        isConnectable={true}
      />
      <div className="branch-header">
        <div className="branch-type-icon">⚙️</div>
        <span className="branch-type">DEVELOP</span>
      </div>
      <div className="branch-name">{data.branchName}</div>
      {data.isRemote && <div className="remote-indicator">🌐</div>}
      <Handle
        type="source"
        position={Position.Right}
        id="source"
        style={{ background: '#555', opacity: 1, visibility: 'visible' }}
        isConnectable={true}
      />
    </div>
  );
}

function StagingBranchNode({ data, selected }) {
  return (
    <div className={`branch-node staging ${selected ? 'selected' : ''}`}>
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        style={{ background: '#555', opacity: 1, visibility: 'visible' }}
        isConnectable={true}
      />
      <div className="branch-header">
        <div className="branch-type-icon">🧪</div>
        <span className="branch-type">STAGING</span>
      </div>
      <div className="branch-name">{data.branchName}</div>
      {data.isRemote && <div className="remote-indicator">🌐</div>}
      <Handle
        type="source"
        position={Position.Right}
        id="source"
        style={{ background: '#555', opacity: 1, visibility: 'visible' }}
        isConnectable={true}
      />
    </div>
  );
}

// Operation Edge Component
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
    <>
      <BaseEdge 
        id={id} 
        path={edgePath} 
        style={{ 
          stroke: selected ? '#667eea' : '#d1d5db', 
          strokeWidth: selected ? 3 : 2,
          strokeDasharray: data.operationType === 'checkout' && data.params?.new ? '5,5' : 'none'
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

export default WorkflowEditor;