import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import BranchConfigModal from './BranchConfigModal';
import OperationConfigModal from './OperationConfigModal';
import WorkflowManager from './WorkflowManager';
import { useWorkflows } from '../hooks/useWorkflows';
import { useNotification } from '../contexts/NotificationContext';
import { sanitizeWorkflowName } from '../utils/validation';
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
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const fileButtonRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempWorkflowName, setTempWorkflowName] = useState('');
  const [nameValidationError, setNameValidationError] = useState('');
  
  // Copy/Paste functionality state
  const [selectedNodes, setSelectedNodes] = useState(new Set());
  const [selectedEdges, setSelectedEdges] = useState(new Set());
  const [clipboard, setClipboard] = useState({ nodes: [], edges: [] });
  const [isMultiSelecting, setIsMultiSelecting] = useState(false);

  // Workflow management
  const { saveWorkflow, updateWorkflow } = useWorkflows();
  const { showSuccess, showError, showWarning } = useNotification();

  // Keyboard event handler for copy/paste functionality
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Check if we're in an input field
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      const isCtrlOrCmd = event.ctrlKey || event.metaKey;
      
      if (isCtrlOrCmd && event.key === 'c') {
        event.preventDefault();
        copySelectedElements();
      } else if (isCtrlOrCmd && event.key === 'v') {
        event.preventDefault();
        pasteElements();
      } else if (isCtrlOrCmd && event.key === 'a') {
        event.preventDefault();
        selectAllElements();
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        deleteSelectedElements();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodes, selectedEdges, clipboard, nodes, edges]);

  // Copy selected elements to clipboard
  const copySelectedElements = useCallback(() => {
    if (selectedNodes.size === 0 && selectedEdges.size === 0) {
      showWarning('No elements selected to copy');
      return;
    }

    const nodesToCopy = nodes.filter(node => selectedNodes.has(node.id));
    const edgesToCopy = edges.filter(edge => selectedEdges.has(edge.id));
    
    setClipboard({ nodes: nodesToCopy, edges: edgesToCopy });
    showSuccess(`Copied ${nodesToCopy.length} nodes and ${edgesToCopy.length} edges`);
  }, [selectedNodes, selectedEdges, nodes, edges, showSuccess, showWarning]);

  // Paste elements from clipboard
  const pasteElements = useCallback(() => {
    if (clipboard.nodes.length === 0 && clipboard.edges.length === 0) {
      showWarning('No elements in clipboard to paste');
      return;
    }

    const offset = { x: 50, y: 50 };
    const nodeIdMap = new Map();
    
    // Create new nodes with offset positions and new IDs
    const newNodes = clipboard.nodes.map(node => {
      const newNodeId = `${node.data.branchType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      nodeIdMap.set(node.id, newNodeId);
      
      return {
        ...node,
        id: newNodeId,
        position: {
          x: node.position.x + offset.x,
          y: node.position.y + offset.y,
        },
        data: {
          ...node.data,
          branchName: `${node.data.branchType}-${Date.now()}`,
        },
      };
    });

    // Create new edges with updated source/target IDs
    const newEdges = clipboard.edges.map(edge => {
      const newEdgeId = `edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newSource = nodeIdMap.get(edge.source);
      const newTarget = nodeIdMap.get(edge.target);
      
      // Only create edge if both source and target are being copied
      if (newSource && newTarget) {
        return {
          ...edge,
          id: newEdgeId,
          source: newSource,
          target: newTarget,
        };
      }
      return null;
    }).filter(Boolean);

    // Add new elements to the canvas
    setNodes(prevNodes => [...prevNodes, ...newNodes]);
    setEdges(prevEdges => [...prevEdges, ...newEdges]);
    
    // Clear selection and update clipboard
    setSelectedNodes(new Set());
    setSelectedEdges(new Set());
    setClipboard({ nodes: [], edges: [] });
    
    showSuccess(`Pasted ${newNodes.length} nodes and ${newEdges.length} edges`);
  }, [clipboard, setNodes, setEdges, showSuccess, showWarning]);

  // Select all elements
  const selectAllElements = useCallback(() => {
    const allNodeIds = new Set(nodes.map(node => node.id));
    const allEdgeIds = new Set(edges.map(edge => edge.id));
    
    setSelectedNodes(allNodeIds);
    setSelectedEdges(allEdgeIds);
    showSuccess(`Selected ${allNodeIds.size} nodes and ${allEdgeIds.size} edges`);
  }, [nodes, edges, showSuccess]);

  // Delete selected elements
  const deleteSelectedElements = useCallback(() => {
    if (selectedNodes.size === 0 && selectedEdges.size === 0) {
      showWarning('No elements selected to delete');
      return;
    }

    // Remove selected nodes
    setNodes(prevNodes => prevNodes.filter(node => !selectedNodes.has(node.id)));
    
    // Remove selected edges and edges connected to deleted nodes
    setEdges(prevEdges => prevEdges.filter(edge => 
      !selectedEdges.has(edge.id) && 
      !selectedNodes.has(edge.source) && 
      !selectedNodes.has(edge.target)
    ));
    
    showSuccess(`Deleted ${selectedNodes.size} nodes and ${selectedEdges.size} edges`);
    setSelectedNodes(new Set());
    setSelectedEdges(new Set());
  }, [selectedNodes, selectedEdges, setNodes, setEdges, showSuccess, showWarning]);

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
    // Handle multi-selection with Ctrl/Cmd key
    if (event.ctrlKey || event.metaKey) {
      setSelectedNodes(prev => {
        const newSelection = new Set(prev);
        if (newSelection.has(node.id)) {
          newSelection.delete(node.id);
        } else {
          newSelection.add(node.id);
        }
        return newSelection;
      });
      setSelectedEdges(new Set());
      setSelectedBranch(null);
      setSelectedEdge(null);
    } else {
      // Single selection - open config modal
      setSelectedBranch(node);
      setShowBranchConfig(true);
      setSelectedEdge(null);
      setSelectedNodes(new Set([node.id]));
      setSelectedEdges(new Set());
    }
  }, []);

  const onEdgeClick = useCallback((event, edge) => {
    // Handle multi-selection with Ctrl/Cmd key
    if (event.ctrlKey || event.metaKey) {
      setSelectedEdges(prev => {
        const newSelection = new Set(prev);
        if (newSelection.has(edge.id)) {
          newSelection.delete(edge.id);
        } else {
          newSelection.add(edge.id);
        }
        return newSelection;
      });
      setSelectedNodes(new Set());
      setSelectedBranch(null);
      setSelectedEdge(null);
    } else {
      // Single selection - open config modal
      setSelectedEdge(edge);
      setShowOperationConfig(true);
      setSelectedBranch(null);
      setSelectedEdges(new Set([edge.id]));
      setSelectedNodes(new Set());
    }
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedBranch(null);
    setSelectedEdge(null);
    setShowBranchConfig(false);
    setShowOperationConfig(false);
    setSelectedNodes(new Set());
    setSelectedEdges(new Set());
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



  // Save workflow to storage
  const saveWorkflowToStorage = useCallback(async () => {
    const nameValidation = validateWorkflowName(workflowName);
    if (nameValidation) {
      showWarning(nameValidation);
      return;
    }

    try {
      setIsSaving(true);
      const workflow = {
        id: sanitizeWorkflowName(workflowName),
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
    if (nameValidation) {
      showWarning(nameValidation);
      return;
    }

    const workflow = {
      id: sanitizeWorkflowName(workflowName),
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
    
    const exportFileDefaultName = `${workflow.id}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }, [workflowName, nodes, edges, showWarning]);


  const onDragStart = (event, itemType) => {
    event.dataTransfer.setData('application/reactflow', itemType);
    event.dataTransfer.effectAllowed = 'move';
    setDraggedItem(itemType);
  };

  const onDragEnd = () => {
    setDraggedItem(null);
  };

  const handleFileButtonMouseEnter = () => {
    if (fileButtonRef.current) {
      const rect = fileButtonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left
      });
    }
  };

  const validateWorkflowName = (name) => {
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      return "Workflow name is required";
    }
    
    if (trimmedName.length < 2) {
      return "Name must be at least 2 characters";
    }
    
    if (trimmedName.length > 50) {
      return "Name cannot exceed 50 characters";
    }
    
    if (name !== trimmedName) {
      return "Name cannot start or end with spaces";
    }
    
    if (trimmedName.includes('  ')) {
      return "Name cannot contain consecutive spaces";
    }
    
    // Allow letters, numbers, spaces, hyphens, underscores, and @
    const validPattern = /^[a-zA-Z0-9\s\-_@]+$/;
    if (!validPattern.test(trimmedName)) {
      return "Invalid characters detected. Only letters, numbers, spaces, hyphens, underscores, and @ are allowed";
    }
    
    return null;
  };

  const handleEditName = () => {
    setTempWorkflowName(workflowName);
    setIsEditingName(true);
    setNameValidationError('');
  };

  const handleSaveName = () => {
    const validationError = validateWorkflowName(tempWorkflowName);
    if (validationError) {
      setNameValidationError(validationError);
      return;
    }
    
    setWorkflowName(tempWorkflowName.trim());
    setIsEditingName(false);
    setNameValidationError('');
  };

  const handleCancelEdit = () => {
    setTempWorkflowName('');
    setIsEditingName(false);
    setNameValidationError('');
  };

  const handleNameChange = (e) => {
    const value = e.target.value;
    setTempWorkflowName(value);
    
    // Clear validation error when user starts typing
    if (nameValidationError) {
      setNameValidationError('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };


  return (
    <div className="workflow-editor">
      <div className="editor-controls">
        {/* Workflow Controls */}
        <div className="workflow-controls">
          <div className="workflow-name-container">
            <div className="menu-item">
              <button 
                ref={fileButtonRef}
                className="actions-menu-button"
                onMouseEnter={handleFileButtonMouseEnter}
                title="Workflow Actions"
              >
                ⋮
              </button>
              <div 
                className="dropdown-menu"
                style={{
                  top: `${dropdownPosition.top}px`,
                  left: `${dropdownPosition.left}px`
                }}
              >
                <div className="dropdown-group">
                  <button onClick={() => setShowWorkflowManager(true)} className="dropdown-item">
                    Open Workflow
                  </button>
                  <button 
                    onClick={saveWorkflowToStorage} 
                    className="dropdown-item"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save Workflow'}
                  </button>
                  <button onClick={exportWorkflowAsJSON} className="dropdown-item">
                    Export Workflow
                  </button>
                </div>
                <div className="dropdown-divider"></div>
                <button onClick={clearCurrentWorkflow} className="dropdown-item danger">
                  Clear All
                </button>
              </div>
            </div>
            {isEditingName ? (
              <div className="workflow-name-edit-container">
                <input
                  type="text"
                  value={tempWorkflowName}
                  onChange={handleNameChange}
                  onKeyDown={handleKeyPress}
                  className={`workflow-name-edit-input ${nameValidationError ? 'error' : ''}`}
                  placeholder="Enter workflow name..."
                  autoFocus
                />
                <div className="workflow-name-edit-actions">
                  <button 
                    onClick={handleSaveName}
                    className="edit-action-button save"
                    title="Save"
                    disabled={!!nameValidationError}
                  >
                    ✓
                  </button>
                  <button 
                    onClick={handleCancelEdit}
                    className="edit-action-button cancel"
                    title="Cancel"
                  >
                    ✕
                  </button>
                </div>
                {nameValidationError && (
                  <div className="workflow-name-error">
                    {nameValidationError}
                  </div>
                )}
              </div>
            ) : (
              <div className="workflow-name-display">
                <span className="workflow-name-text">
                  {workflowName || 'Untitled'}
                </span>
                <button 
                  onClick={handleEditName}
                  className="edit-name-button"
                  title="Edit workflow name"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Section Divider */}
        <div className="section-divider"></div>
        
        {/* Copy/Paste Controls */}
        <div className="copy-paste-section">
          <h4>Selection & Clipboard</h4>
          <div className="copy-paste-controls">
            <button 
              onClick={copySelectedElements}
              disabled={selectedNodes.size === 0 && selectedEdges.size === 0}
              className="control-button copy-button"
              title="Copy selected elements (Ctrl+C)"
            >
              📋 Copy
            </button>
            <button 
              onClick={pasteElements}
              disabled={clipboard.nodes.length === 0 && clipboard.edges.length === 0}
              className="control-button paste-button"
              title="Paste elements (Ctrl+V)"
            >
              📄 Paste
            </button>
            <button 
              onClick={selectAllElements}
              disabled={nodes.length === 0 && edges.length === 0}
              className="control-button select-all-button"
              title="Select all elements (Ctrl+A)"
            >
              🎯 Select All
            </button>
            <button 
              onClick={deleteSelectedElements}
              disabled={selectedNodes.size === 0 && selectedEdges.size === 0}
              className="control-button delete-button"
              title="Delete selected elements (Delete)"
            >
              🗑️ Delete
            </button>
          </div>
          <div className="selection-status">
            <span className="selection-info">
              Selected: {selectedNodes.size} nodes, {selectedEdges.size} edges
            </span>
            <span className="clipboard-info">
              Clipboard: {clipboard.nodes.length} nodes, {clipboard.edges.length} edges
            </span>
          </div>
        </div>

        {/* Section Divider */}
        <div className="section-divider"></div>
        
        {/* Branch Palette */}
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

      </div>

      <div className="reactflow-wrapper" ref={reactFlowWrapper}>
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes.map(node => ({
              ...node,
              selected: selectedNodes.has(node.id),
            }))}
            edges={edges.map(edge => ({
              ...edge,
              selected: selectedEdges.has(edge.id),
            }))}
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
            multiSelectionKeyCode={null}
            deleteKeyCode={null}
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

export default WorkflowEditor;