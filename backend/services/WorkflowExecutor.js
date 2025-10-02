/**
 * WorkflowExecutor - Workflow execution engine
 * Handles workflow execution with dependency resolution and real-time updates
 */

class WorkflowExecutor {
  constructor(gitService, io) {
    this.gitService = gitService;
    this.io = io;
    this.executions = new Map(); // Track active executions
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(workflow, executionId) {
    console.log(`Starting workflow execution: ${workflow.name} (${executionId})`);
    
    // Initialize execution state
    const execution = {
      id: executionId,
      workflowId: workflow.id,
      status: 'running',
      startTime: new Date().toISOString(),
      operations: new Map(),
      branches: new Map(),
      logs: []
    };

    this.executions.set(executionId, execution);

    try {
      // Validate repository
      const repoStatus = await this.gitService.getRepositoryStatus();
      if (!repoStatus.isValid) {
        throw new Error('Not a valid Git repository');
      }

      if (!repoStatus.isClean) {
        throw new Error('Repository has uncommitted changes');
      }

      // Initialize operation and branch states
      this.initializeExecutionState(workflow, execution);

      // Emit execution started
      // this.emitUpdate(executionId, 'execution-started', {
      //   executionId,
      //   workflowName: workflow.name,
      //   status: 'running'
      // });

      // Build dependency graph
      const dependencies = this.buildDependencyGraph(workflow.operations);
      // Execute operations
      await this.executeOperations(workflow, execution, dependencies);

      // Mark execution as completed
      execution.status = 'completed';
      execution.endTime = new Date().toISOString();

      this.emitUpdate(executionId, 'execution-completed', {
        executionId,
        status: 'completed',
        duration: this.getExecutionDuration(execution)
      });

      console.log(`Workflow execution completed: ${executionId}`);
      return execution;

    } catch (error) {
      console.error(`Workflow execution failed: ${executionId}`, error);
      
      execution.status = 'failed';
      execution.endTime = new Date().toISOString();
      execution.error = error.message;

      this.emitUpdate(executionId, 'execution-failed', {
        executionId,
        status: 'failed',
        error: error.message
      });

      throw error;
    } finally {
      // Clean up execution tracking
      setTimeout(() => {
        this.executions.delete(executionId);
      }, 300000); // Keep for 5 minutes
    }
  }

  /**
   * Initialize execution state
   */
  initializeExecutionState(workflow, execution) {
    // Initialize branch states
    workflow.branches.forEach(branch => {
      execution.branches.set(branch.id, {
        ...branch,
        status: 'pending'
      });
    });

    // Initialize operation states
    workflow.operations.forEach(operation => {
      execution.operations.set(operation.id, {
        ...operation,
        status: 'pending'
      });
    });
  }

  /**
   * Build dependency graph for operations
   */
  buildDependencyGraph(operations) {
    const dependencies = new Map();
    const dependents = new Map();
  
    // Initialize maps
    operations.forEach(op => {
      dependencies.set(op.id, []);
      dependents.set(op.id, []);
    });
  
    operations.forEach(op => {
      operations.forEach(otherOp => {
        if (op.id === otherOp.id) return;
  
        // 1. Any operation that uses a branch created by a checkout depends on that checkout
        if (otherOp.type === 'checkout' && (op.source === otherOp.target || op.target === otherOp.target)) {
          dependencies.get(op.id).push(otherOp.id);
          dependents.get(otherOp.id).push(op.id);
        }
  
        // 2. Merge operation depends on all operations that modify its target branch
        //    EXCEPT merges that target the same branch independently
        if (
          op.type === 'merge' &&
          otherOp.target === op.target &&
          // only include merges that are NOT independent
          otherOp.type === 'checkout'
        ) {
          if (!dependencies.get(op.id).includes(otherOp.id)) {
            dependencies.get(op.id).push(otherOp.id);
            dependents.get(otherOp.id).push(op.id);
          }
        }
  
        // 3. Merge operation depends on all operations that modify its source branch
        if (op.type === 'merge' && otherOp.target === op.source) {
          if (!dependencies.get(op.id).includes(otherOp.id)) {
            dependencies.get(op.id).push(otherOp.id);
            dependents.get(otherOp.id).push(op.id);
          }
        }
      });
    });
  
    return { dependencies, dependents };
  }
  
  
  /**
   * Execute operations with dependency resolution using sequential queue
   */
  async executeOperations(workflow, execution, { dependencies, dependents }) {
    const completed = new Set();
    const failed = new Set();
    const operationQueue = [...workflow.operations]; // Create a queue of all operations

    while (completed.size + failed.size < workflow.operations.length) {
      // Find operations that can be executed (no pending dependencies)
      const readyOperations = operationQueue.filter(op => {
        const deps = dependencies.get(op.id) || [];
        return !completed.has(op.id) && 
               !failed.has(op.id) && 
               deps.every(dep => completed.has(dep));
      });

      if (readyOperations.length === 0) {
        // No more operations can be executed
        const remaining = operationQueue.filter(op => 
          !completed.has(op.id) && !failed.has(op.id)
        );
        if (remaining.length > 0) {
          throw new Error(`Circular dependency detected. Remaining operations: ${remaining.map(op => op.id).join(', ')}`);
        }
        break;
      }

      // Execute ready operations sequentially (one by one)
      console.log(`🔄 Executing ${readyOperations.length} ready operations sequentially...`);
      
      for (const operation of readyOperations) {
        console.log(`⚡ Executing operation: ${operation.id} (${operation.type})`);
        await this.executeOperation(operation, execution, workflow);
        
        // Update completed and failed sets immediately after each operation
        const opState = execution.operations.get(operation.id);
        if (opState.status === 'success') {
          completed.add(operation.id);
          console.log(`✅ Operation ${operation.id} completed successfully`);
        } else if (opState.status === 'failed') {
          failed.add(operation.id);
          console.log(`❌ Operation ${operation.id} failed`);
        }
      }
    }

    // Only fail the workflow if ALL operations failed
    if (failed.size === workflow.operations.length) {
      throw new Error(`All ${failed.size} operations failed`);
    }
    
    // Log partial success if some operations failed but not all
    if (failed.size > 0) {
      console.log(`⚠️ Workflow completed with ${failed.size} failed operations out of ${workflow.operations.length} total operations`);
      this.addLog(execution, `Workflow completed with ${failed.size} failed operations`, 'warning');
    }
  }

  /**
   * Resolve branch names from branch IDs
   */
  resolveBranchNames(operation, workflow) {
    const branchMap = new Map(workflow.branches.map(branch => [branch.id, branch.name]));
    const sourceName = branchMap.get(operation.source);
    const targetName = branchMap.get(operation.target);
    
    if (!sourceName) {
      throw new Error(`Source branch ID '${operation.source}' not found in workflow branches`);
    }
    if (!targetName) {
      throw new Error(`Target branch ID '${operation.target}' not found in workflow branches`);
    }
    
    return { sourceName, targetName };
  }

  /**
   * Execute a single operation
   */
  async executeOperation(operation, execution, workflow) {
    const operationId = operation.id;
    const operationState = execution.operations.get(operationId);
    
    try {
      // Resolve branch names from IDs
      const { sourceName, targetName } = this.resolveBranchNames(operation, workflow);
      
      // Set emit function on GitService for command emission
      this.gitService.setEmitFunction(this.emitUpdate.bind(this), execution.id);
      
      // Update operation status to running
      operationState.status = 'running';
      this.emitUpdate(execution.id, 'operation-started', {
        operationId,
        operationType: operation.type,
        source: sourceName,
        target: targetName,
        status: 'running'
      });

      this.addLog(execution, `Starting ${operation.type} from ${sourceName} to ${targetName}`, 'info', null, false);

      // Execute the operation based on type
      let result;
      switch (operation.type) {
        case 'checkout':
          result = await this.gitService.checkout(sourceName, targetName, operation.params);
          break;
        case 'merge':
          result = await this.gitService.merge(sourceName, targetName, operation.params);
          break;
        case 'rebase':
          result = await this.gitService.rebase(sourceName, targetName, operation.params);
          break;
        case 'push':
          result = await this.gitService.push(sourceName, targetName, operation.params);
          break;
        case 'pull':
          result = await this.gitService.pull(sourceName, targetName, operation.params);
          break;
        case 'delete-branch':
          result = await this.gitService.deleteBranch(sourceName, targetName, operation.params);
          break;
        case 'tag':
          result = await this.gitService.tag(sourceName, targetName, operation.params);
          break;
        default:
          throw new Error(`Unknown operation type: ${operation.type}`);
      }

      if (result.success) {
        operationState.status = 'success';
        this.updateBranchStatus(execution, operation.target, 'success');
        this.addLog(execution, `${operation.type} completed successfully from ${sourceName} to ${targetName}`, 'success', result.command, false);
        
        this.emitUpdate(execution.id, 'operation-completed', {
          operationId,
          operationType: operation.type,
          source: sourceName,
          target: targetName,
          status: 'success',
          result: result.stdout,
          command: result.command
        });
      } else {
        operationState.status = 'failed';
        this.updateBranchStatus(execution, operation.target, 'failed');
        this.addLog(execution, `${operation.type} failed from ${sourceName} to ${targetName}: ${result.error}`, 'error', result.command, false);
        
        this.emitUpdate(execution.id, 'operation-failed', {
          operationId,
          operationType: operation.type,
          source: sourceName,
          target: targetName,
          status: 'failed',
          error: result.error,
          command: result.command
        });
      }

    } catch (error) {
      operationState.status = 'failed';
      this.updateBranchStatus(execution, operation.target, 'failed');
      this.addLog(execution, `${operation.type} failed from ${sourceName} to ${targetName}: ${error.message}`, 'error', result?.command);
      
      this.emitUpdate(execution.id, 'operation-failed', {
        operationId,
        operationType: operation.type,
        source: sourceName,
        target: targetName,
        status: 'failed',
        error: error.message
      });
    }
  }

  /**
   * Update branch status
   */
  updateBranchStatus(execution, branchId, status) {
    const branch = execution.branches.get(branchId);
    if (branch) {
      branch.status = status;
    }
  }

  /**
   * Add log entry
   */
  addLog(execution, message, type = 'info', command = null, emit = true) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      message,
      type,
      ...(command && { command })
    };
    execution.logs.push(logEntry);
    
    if (emit) {
      this.emitUpdate(execution.id, 'log-entry', logEntry);
    }
  }

  /**
   * Emit real-time update
   */
  emitUpdate(executionId, event, data) {
    if (this.io) {
      console.log(`📡 Emitting Socket.IO event: ${event} to all clients`);
      this.io.emit(event, {
        executionId,
        timestamp: new Date().toISOString(),
        ...data
      });
    } else {
      console.log(`❌ No Socket.IO instance available for event: ${event}`);
    }
  }

  /**
   * Get execution duration
   */
  getExecutionDuration(execution) {
    if (!execution.startTime || !execution.endTime) {
      return null;
    }
    
    const start = new Date(execution.startTime);
    const end = new Date(execution.endTime);
    return end - start;
  }

  /**
   * Get execution status
   */
  getExecutionStatus(executionId) {
    return this.executions.get(executionId);
  }

  /**
   * Stop execution
   */
  stopExecution(executionId) {
    const execution = this.executions.get(executionId);
    if (execution) {
      execution.status = 'stopped';
      this.emitUpdate(executionId, 'execution-stopped', {
        executionId,
        status: 'stopped'
      });
    }
  }
}

module.exports = WorkflowExecutor;