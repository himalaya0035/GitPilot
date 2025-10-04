/**
 * ExecutionService - Real-time workflow execution service
 * Handles workflow execution with Socket.IO for real-time updates
 */

import io from 'socket.io-client';

class ExecutionService {
  constructor(baseUrl = 'http://localhost:5000') {
    this.baseUrl = baseUrl;
    this.socket = null;
    this.listeners = new Map();
    this.isConnected = false;
  }

  /**
   * Connect to Socket.IO server
   */
  connect() {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    if (this.socket) {
      this.socket.disconnect();
    }

    // Clear any existing listeners before creating new connection
    this.listeners.clear();

    this.socket = io(this.baseUrl, {
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('Connected to execution server');
      this.isConnected = true;
      this.emit('connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from execution server');
      this.isConnected = false;
      this.emit('disconnected');
    });

    // Set up event listeners
    this.setupEventListeners();

    return this.socket;
  }

  /**
   * Disconnect from Socket.IO server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
    // Clear all listeners
    this.listeners.clear();
  }

  /**
   * Set up Socket.IO event listeners
   */
  setupEventListeners() {
    if (!this.socket) return;

    // Execution events
    this.socket.on('execution-started', (data) => {
      this.emit('execution-started', data);
    });

    this.socket.on('execution-completed', (data) => {
      this.emit('execution-completed', data);
    });

    this.socket.on('execution-failed', (data) => {
      this.emit('execution-failed', data);
    });

    this.socket.on('execution-stopped', (data) => {
      this.emit('execution-stopped', data);
    });

    // Operation events
    this.socket.on('operation-started', (data) => {
      this.emit('operation-started', data);
    });

    this.socket.on('operation-completed', (data) => {
      this.emit('operation-completed', data);
    });

    this.socket.on('operation-failed', (data) => {
      this.emit('operation-failed', data);
    });

    // Log events
    this.socket.on('log-entry', (data) => {
      this.emit('log-entry', data);
    });

    // Command events
    this.socket.on('command-before-execution', (data) => {
      this.emit('command-before-execution', data);
    });
  }

  /**
   * Start workflow execution
   */
  async startExecution(workflowId, repositoryPath = null) {
    try {
      const requestBody = repositoryPath ? { repositoryPath } : {};
      
      const response = await fetch(`${this.baseUrl}/api/execution/${workflowId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to start execution');
      }

      return result.data;
    } catch (error) {
      console.error('Failed to start execution:', error);
      throw error;
    }
  }

  /**
   * Get execution status
   */
  async getExecutionStatus(executionId) {
    try {
      const response = await fetch(`${this.baseUrl}/api/execution/${executionId}/status`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to get execution status');
      }

      return result.data;
    } catch (error) {
      console.error('Failed to get execution status:', error);
      throw error;
    }
  }

  /**
   * Stop workflow execution
   */
  async stopExecution(executionId) {
    try {
      const response = await fetch(`${this.baseUrl}/api/execution/${executionId}/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to stop execution');
      }

      return result.data;
    } catch (error) {
      console.error('Failed to stop execution:', error);
      throw error;
    }
  }

  /**
   * Preview workflow execution commands
   */
  async previewWorkflow(workflowId, repositoryPath = null) {
    try {
      const requestBody = repositoryPath ? { repositoryPath } : {};
      
      const response = await fetch(`${this.baseUrl}/api/execution/${workflowId}/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to preview workflow');
      }

      return result.data;
    } catch (error) {
      console.error('Failed to preview workflow:', error);
      throw error;
    }
  }

  /**
   * Add event listener
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    if (!this.listeners.has(event)) return;
    
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * Emit event to listeners
   */
  emit(event, data) {
    if (!this.listeners.has(event)) return;
    
    this.listeners.get(event).forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  /**
   * Check if connected
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      socket: this.socket
    };
  }

  /**
   * Clear all event listeners
   */
  clearAllListeners() {
    this.listeners.clear();
  }
}

export default ExecutionService;