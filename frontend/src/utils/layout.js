import dagre from 'dagre';

/**
 * Get layouted elements using Dagre algorithm
 * @param {Array} nodes - React Flow nodes
 * @param {Array} edges - React Flow edges
 * @param {string} direction - Layout direction: 'TB' (top-bottom), 'BT' (bottom-top), 'LR' (left-right), 'RL' (right-left)
 * @param {Object} options - Additional layout options
 * @returns {Array} Layouted nodes with new positions
 */
export const getLayoutedElements = (nodes, edges, direction = 'TB', options = {}) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: direction,
    ranksep: options.ranksep || 100, // Vertical spacing between ranks
    nodesep: options.nodesep || 50,  // Horizontal spacing between nodes
    marginx: options.marginx || 50,  // Left/right margin
    marginy: options.marginy || 50,  // Top/bottom margin
    ...options
  });

  // Add nodes to dagre graph
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: options.nodeWidth || 200,
      height: options.nodeHeight || 100,
    });
  });

  // Add edges to dagre graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Run layout algorithm
  dagre.layout(dagreGraph);

  // Update node positions
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - (options.nodeWidth || 200) / 2,
        y: nodeWithPosition.y - (options.nodeHeight || 100) / 2,
      },
    };
  });

  return layoutedNodes;
};

/**
 * Get layouted elements optimized for Git workflows
 * @param {Array} nodes - React Flow nodes
 * @param {Array} edges - React Flow edges
 * @returns {Array} Layouted nodes optimized for Git workflows
 */
export const getGitWorkflowLayout = (nodes, edges) => {
  // Analyze the workflow to determine best layout direction
  const hasMainBranch = nodes.some(node => 
    node.data.branchType === 'production' || 
    node.data.branchType === 'develop' ||
    node.data.branchName === 'main' ||
    node.data.branchName === 'master'
  );

  // For Git workflows, prefer top-bottom layout with main branch at top
  const direction = 'TB';
  
  const options = {
    ranksep: 120,    // More vertical spacing for Git workflows
    nodesep: 80,     // More horizontal spacing
    marginx: 100,    // Larger margins
    marginy: 100,
    nodeWidth: 220,  // Slightly wider nodes for Git branch names
    nodeHeight: 120, // Taller nodes for better readability
  };

  return getLayoutedElements(nodes, edges, direction, options);
};

/**
 * Animate nodes to new positions smoothly
 * @param {Array} nodes - Current nodes
 * @param {Array} newNodes - Nodes with new positions
 * @param {Function} setNodes - React state setter
 * @param {number} duration - Animation duration in ms
 */
export const animateToNewPositions = (nodes, newNodes, setNodes, duration = 500) => {
  const startTime = Date.now();
  
  const animate = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Easing function for smooth animation
    const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    const easedProgress = easeInOutCubic(progress);
    
    const animatedNodes = nodes.map((node, index) => {
      const newNode = newNodes[index];
      if (!newNode) return node;
      
      const startX = node.position.x;
      const startY = node.position.y;
      const endX = newNode.position.x;
      const endY = newNode.position.y;
      
      return {
        ...node,
        position: {
          x: startX + (endX - startX) * easedProgress,
          y: startY + (endY - startY) * easedProgress,
        },
      };
    });
    
    setNodes(animatedNodes);
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };
  
  requestAnimationFrame(animate);
};

/**
 * Check if layout would improve the current arrangement
 * @param {Array} nodes - Current nodes
 * @param {Array} edges - Current edges
 * @returns {Object} Analysis of current layout
 */
export const analyzeLayout = (nodes, edges) => {
  if (nodes.length === 0) {
    return { needsLayout: false, reason: 'No nodes to layout' };
  }
  
  if (nodes.length === 1) {
    return { needsLayout: false, reason: 'Single node, no layout needed' };
  }
  
  // Check for overlapping nodes
  const overlappingNodes = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const node1 = nodes[i];
      const node2 = nodes[j];
      const distance = Math.sqrt(
        Math.pow(node1.position.x - node2.position.x, 2) + 
        Math.pow(node1.position.y - node2.position.y, 2)
      );
      
      if (distance < 150) { // Nodes are too close
        overlappingNodes.push({ node1: node1.id, node2: node2.id, distance });
      }
    }
  }
  
  // Check for scattered layout (nodes spread too far apart)
  const positions = nodes.map(node => ({ x: node.position.x, y: node.position.y }));
  const minX = Math.min(...positions.map(p => p.x));
  const maxX = Math.max(...positions.map(p => p.x));
  const minY = Math.min(...positions.map(p => p.y));
  const maxY = Math.max(...positions.map(p => p.y));
  const spread = Math.sqrt(Math.pow(maxX - minX, 2) + Math.pow(maxY - minY, 2));
  
  const needsLayout = overlappingNodes.length > 0 || spread > 1000;
  
  return {
    needsLayout,
    overlappingNodes: overlappingNodes.length,
    spread,
    reason: needsLayout ? 
      `Found ${overlappingNodes.length} overlapping nodes and spread of ${Math.round(spread)}px` : 
      'Layout looks good'
  };
};
