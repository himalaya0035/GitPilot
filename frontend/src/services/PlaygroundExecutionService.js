/**
 * PlaygroundExecutionService - Simulated execution for browser-only playground
 * Drop-in replacement for ExecutionService that runs entirely client-side.
 *
 * Command generation mirrors backend/services/GitService.js exactly so that
 * preview and execution logs show the real commands that *would* run.
 */

// workflowService is injected via constructor to avoid circular dependency with index.js

// ---------------------------------------------------------------------------
// Command generation — faithfully replicates GitService method logic
// ---------------------------------------------------------------------------

/**
 * For a given operation, return the ordered list of git commands that the real
 * backend would execute.  Each entry is a command string.
 */
function generateCommands(op, branches) {
  const source = branches.find(b => b.id === op.source);
  const target = branches.find(b => b.id === op.target);
  const sName = source?.name || 'unknown';
  const tName = target?.name || 'unknown';
  const p = op.params || {};

  switch (op.type) {
    // ----- checkout (GitService.checkout) -----
    case 'checkout': {
      const forceFlag = p.force ? ' -f' : '';
      if (p.new || p.reset) {
        const branchFlag = p.reset ? '-B' : '-b';
        return [`git checkout${forceFlag} ${branchFlag} ${tName} ${sName}`];
      }
      return [`git checkout${forceFlag} ${tName}`];
    }

    // ----- merge (GitService.merge) -----
    // Real backend: checkout target first, then merge source into it
    case 'merge': {
      const { strategy = 'standard', ffOption = 'auto' } = p;
      const cmds = [`git checkout ${tName}`];

      if (strategy === 'squash') {
        cmds.push(`git merge --squash ${sName}`);
        const commitMsg = p.commitMessage || `Squash merge: Merge changes from ${sName}`;
        cmds.push(`git commit -m "${commitMsg}"`);
      } else {
        let mergeCmd = 'git merge';
        if (ffOption === 'no-ff') mergeCmd += ' --no-ff';
        else if (ffOption === 'ff-only') mergeCmd += ' --ff-only';
        mergeCmd += ` ${sName}`;
        cmds.push(mergeCmd);
      }
      return cmds;
    }

    // ----- rebase (GitService.rebase) -----
    // Real backend: checkout target first, then rebase onto source
    case 'rebase': {
      const cmds = [`git checkout ${tName}`];
      let rebaseCmd = 'git rebase';
      if (p.interactive) rebaseCmd += ' -i';
      if (p.onto) rebaseCmd += ` --onto ${p.onto}`;
      rebaseCmd += ` ${sName}`;
      cmds.push(rebaseCmd);
      return cmds;
    }

    // ----- push (GitService.push) -----
    case 'push': {
      const { forceType = 'none', upstream = false, remote = 'origin' } = p;
      let cmd = 'git push';
      if (forceType === 'forceWithLease') cmd += ' --force-with-lease';
      else if (forceType === 'force') cmd += ' --force';
      if (upstream) cmd += ' --set-upstream';

      if (target && tName && tName !== sName) {
        cmd += ` ${remote} ${sName}:${tName}`;
      } else {
        cmd += ` ${remote} ${sName}`;
      }
      return [cmd];
    }

    // ----- pull (GitService.pull) -----
    // Real backend: checkout target, then pull from remote source
    case 'pull': {
      const { rebase: pullRebase = false, remote: pullRemote = 'origin' } = p;
      const cmds = [`git checkout ${tName}`];
      let pullCmd = 'git pull';
      if (pullRebase) pullCmd += ' --rebase';
      pullCmd += ` ${pullRemote} ${sName}`;
      cmds.push(pullCmd);
      return cmds;
    }

    // ----- delete-branch (GitService.deleteBranch) -----
    case 'delete-branch': {
      const { remote = false, force = false, remoteName = 'origin' } = p;
      const cmds = [];
      cmds.push(`git branch ${force ? '-D' : '-d'} ${sName}`);
      if (remote) {
        cmds.push(`git push ${remoteName} --delete ${sName}`);
      }
      return cmds;
    }

    // ----- tag (GitService.tag) -----
    case 'tag': {
      const { action = 'create', name, message, push = false, force = false, deleteRemote = false, remote = 'origin' } = p;
      const tagName = name || p.tagName || 'v1.0.0';
      const cmds = [];
      // Checkout target branch first (as backend WorkflowExecutor does)
      cmds.push(`git checkout ${tName}`);

      switch (action) {
        case 'create': {
          let tagCmd = 'git tag';
          if (force) tagCmd += ' -f';
          if (message) {
            tagCmd += ` -a ${tagName} -m "${message}"`;
          } else {
            tagCmd += ` ${tagName}`;
          }
          cmds.push(tagCmd);
          if (push) {
            cmds.push(force ? `git push -f ${remote} ${tagName}` : `git push ${remote} ${tagName}`);
          }
          break;
        }
        case 'push':
          cmds.push(force ? `git push -f ${remote} ${tagName}` : `git push ${remote} ${tagName}`);
          break;
        case 'delete':
          if (deleteRemote) {
            cmds.push(`git push ${remote} --delete ${tagName}`);
          }
          cmds.push(`git tag -d ${tagName}`);
          break;
        default:
          cmds.push(`git tag ${tagName}`);
      }
      return cmds;
    }

    default:
      return [`git ${op.type}`];
  }
}

// ---------------------------------------------------------------------------
// Risk / warning / description helpers — mirror GitService mock-mode helpers
// ---------------------------------------------------------------------------

function analyzeCommandRisk(command) {
  if (command.includes('--force') || (command.includes(' -f') && !command.includes('--ff'))) return 'high';
  if (command.includes('checkout') && command.includes('-B')) return 'high';
  if (command.includes('rebase') || command.includes('--force-with-lease')) return 'medium';
  if (command.includes('merge') || command.includes('pull')) return 'medium';
  return 'low';
}

function generateCommandWarnings(command) {
  const warnings = [];
  if (command.includes('--force') || (command.includes(' -f') && !command.includes('--ff'))) {
    warnings.push('Force flag will overwrite changes without confirmation');
  }
  if (command.includes('--force-with-lease')) {
    warnings.push('Force with lease may overwrite remote changes');
  }
  if (command.includes('rebase')) {
    warnings.push('Rebase rewrites history and may cause conflicts');
  }
  if (command.includes('merge')) {
    warnings.push('Merge may create conflicts that need resolution');
  }
  if (command.includes('delete') && command.includes('-D')) {
    warnings.push('Force delete will remove branch even if not merged');
  }
  if (command.includes('checkout') && command.includes('-B')) {
    warnings.push('Branch reset will overwrite existing branch');
  }
  return warnings;
}

function generateCommandDescription(command) {
  if (command.includes('checkout -b') || command.includes('checkout -B')) {
    return command.includes('-B') ? 'Create and reset branch (force)' : 'Create new branch';
  }
  if (command.includes('checkout -f')) return 'Force checkout (discard changes)';
  if (command.includes('checkout')) return 'Switch to branch';
  if (command.includes('merge --squash')) return 'Squash merge branches';
  if (command.includes('merge --no-ff')) return 'Merge with no fast-forward';
  if (command.includes('merge')) return 'Merge branches';
  if (command.includes('rebase -i')) return 'Interactive rebase';
  if (command.includes('rebase')) return 'Rebase branches';
  if (command.includes('push') && command.includes('--delete')) return 'Delete from remote';
  if (command.includes('push --force-with-lease')) return 'Force push with lease';
  if (command.includes('push --force')) return 'Force push to remote';
  if (command.includes('push')) return 'Push to remote';
  if (command.includes('pull --rebase')) return 'Pull with rebase';
  if (command.includes('pull')) return 'Pull from remote';
  if (command.includes('branch') && command.includes('-D')) return 'Delete local (force)';
  if (command.includes('branch') && command.includes('-d')) return 'Delete local';
  if (command.includes('tag -d')) return 'Delete local tag';
  if (command.includes('tag -a')) return 'Create annotated tag';
  if (command.includes('tag')) return 'Create tag';
  if (command.includes('commit')) return 'Commit changes';
  return 'Git operation';
}

// ---------------------------------------------------------------------------
// Dependency graph — port of backend WorkflowExecutor.buildDependencyGraph
// ---------------------------------------------------------------------------

function isBranchCreation(op) {
  return op.type === 'checkout' && (op.params?.new === true || op.params?.reset === true);
}

function modifiesBranch(op) {
  return op.type === 'merge' || op.type === 'rebase' || op.type === 'pull' ||
    (op.type === 'checkout' && op.params?.reset === true);
}

function involvesBranch(op, branchId) {
  return op.source === branchId || op.target === branchId;
}

function buildDependencyGraph(operations) {
  const dependencies = new Map();
  const dependents = new Map();

  operations.forEach(op => {
    dependencies.set(op.id, []);
    dependents.set(op.id, []);
  });

  operations.forEach(op => {
    operations.forEach(otherOp => {
      if (op.id === otherOp.id) return;

      const addDep = (dependent, dependency) => {
        if (!dependencies.get(dependent).includes(dependency)) {
          dependencies.get(dependent).push(dependency);
          dependents.get(dependency).push(dependent);
        }
      };

      // Rule 1: Branch creation — ops using a branch depend on checkout that created it
      if (isBranchCreation(otherOp) &&
          (op.source === otherOp.target || op.target === otherOp.target)) {
        addDep(op.id, otherOp.id);
      }

      // Rule 3: Read-after-write — reading from a branch that another op modified
      if (op.source === otherOp.target && modifiesBranch(otherOp)) {
        addDep(op.id, otherOp.id);
      }

      // Rule 4: Push after all ops (except delete) affecting the pushed branch
      if (op.type === 'push' &&
          (otherOp.source === op.source || otherOp.target === op.source) &&
          otherOp.type !== 'delete-branch') {
        addDep(op.id, otherOp.id);
      }

      // Rule 5: Pull before push on same branch
      if (op.type === 'push' && otherOp.type === 'pull' && otherOp.target === op.source) {
        addDep(op.id, otherOp.id);
      }

      // Rule 6: Tag after ops that modify or create the tagged branch
      if (op.type === 'tag' &&
          (otherOp.source === op.target || otherOp.target === op.target)) {
        if (modifiesBranch(otherOp) ||
            (otherOp.type === 'checkout' && otherOp.target === op.target) ||
            (otherOp.type === 'pull' && otherOp.target === op.target)) {
          addDep(op.id, otherOp.id);
        }
      }

      // Rule 7: Delete after ALL ops involving the deleted branch
      if (op.type === 'delete-branch') {
        if (involvesBranch(otherOp, op.source)) {
          addDep(op.id, otherOp.id);
        }
      }
    });
  });

  return { dependencies, dependents };
}

/**
 * Resolve a dependency-respecting execution order from the graph.
 * Returns operations in the order they should execute (topological sort).
 * Mirrors the sequential queue in WorkflowExecutor.executeOperations.
 */
function resolveExecutionOrder(operations, dependencies) {
  const ordered = [];
  const completed = new Set();
  const remaining = new Set(operations.map(op => op.id));
  const opMap = new Map(operations.map(op => [op.id, op]));

  while (remaining.size > 0) {
    const ready = [];
    for (const id of remaining) {
      const deps = dependencies.get(id) || [];
      if (deps.every(d => completed.has(d))) {
        ready.push(id);
      }
    }
    if (ready.length === 0) {
      // Circular dependency — just add the rest in original order as fallback
      for (const id of remaining) {
        ordered.push(opMap.get(id));
      }
      break;
    }
    for (const id of ready) {
      ordered.push(opMap.get(id));
      completed.add(id);
      remaining.delete(id);
    }
  }
  return ordered;
}

// ---------------------------------------------------------------------------
// Mock stdout for simulated execution
// ---------------------------------------------------------------------------

function mockStdout(command) {
  if (command.startsWith('git checkout')) {
    const match = command.match(/git checkout.*?(-[bB]\s+)?(\S+)(?:\s+(\S+))?$/);
    const branch = match?.[2] || 'branch';
    if (command.includes('-b') || command.includes('-B')) {
      return `Switched to a new branch '${branch}'`;
    }
    return `Switched to branch '${branch}'`;
  }
  if (command.startsWith('git merge')) {
    if (command.includes('--squash')) {
      return `Squash commit -- not updating HEAD\n Automatic merge went well; stopped before committing as requested`;
    }
    return `Merge made by the 'ort' strategy.\n src/index.js | 12 ++++++------\n src/utils.js |  8 ++++----\n 2 files changed, 10 insertions(+), 10 deletions(-)`;
  }
  if (command.startsWith('git rebase')) {
    return `First, rewinding head to replay your work on top of it...\nApplying: Update feature implementation\nSuccessfully rebased and updated refs/heads.`;
  }
  if (command.startsWith('git push')) {
    return `Enumerating objects: 15, done.\nCounting objects: 100% (15/15), done.\nDelta compression using up to 8 threads\nCompressing objects: 100% (8/8), done.\nWriting objects: 100% (10/10), 2.45 KiB | 2.45 MiB/s, done.`;
  }
  if (command.startsWith('git pull')) {
    return `Already up to date.`;
  }
  if (command.startsWith('git branch -')) {
    const match = command.match(/git branch -[dD]\s+(\S+)/);
    return `Deleted branch ${match?.[1] || 'branch'} (was abc1234).`;
  }
  if (command.startsWith('git tag')) {
    if (command.includes('-d')) {
      const match = command.match(/git tag -d\s+(\S+)/);
      return `Deleted tag '${match?.[1] || 'tag'}' (was abc1234)`;
    }
    return '';
  }
  if (command.startsWith('git commit')) {
    return `[main abc1234] Squash merge commit\n 2 files changed, 10 insertions(+), 10 deletions(-)`;
  }
  return '';
}

// ---------------------------------------------------------------------------
// PlaygroundExecutionService class
// ---------------------------------------------------------------------------

class PlaygroundExecutionService {
  constructor(workflowServiceInstance) {
    this.workflowService = workflowServiceInstance;
    this.listeners = new Map();
    // Start disconnected so WorkflowRunner's useEffect registers listeners
    // before we emit anything (mirrors real ExecutionService initial state).
    this.isConnected = false;
    this.activeExecution = null;
    this.aborted = false;
  }

  connect() {
    this.isConnected = true;
    // Defer the connected event so callers can finish registering listeners first
    setTimeout(() => this.emit('connected'), 0);
    return null;
  }

  disconnect() {
    this.isConnected = false;
  }

  getConnectionStatus() {
    return { isConnected: this.isConnected, socket: null };
  }

  // ---------- Execution ----------

  /**
   * startExecution returns immediately (like the real backend HTTP POST),
   * then runs the simulation loop asynchronously so React event listeners
   * can receive and flush each event.
   */
  async startExecution(workflowId, repositoryPath = null) {
    const workflow = await this.workflowService.getWorkflow(workflowId);
    if (!workflow) throw new Error('Workflow not found');

    const executionId = `exec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.aborted = false;
    this.activeExecution = executionId;

    // Kick off the simulation asynchronously — do NOT await it.
    // This mirrors the real backend where the HTTP POST returns instantly
    // and updates stream in via Socket.IO.
    this._runSimulation(executionId, workflowId, workflow, repositoryPath);

    return { executionId, workflowId, repositoryPath, status: 'started' };
  }

  /**
   * The actual simulation loop. Runs in the background after startExecution
   * returns, emitting events that WorkflowRunner's listeners pick up.
   *
   * We also collect logs, operation states, and branch states so that
   * getExecutionDetail() can return them for the history view.
   */
  async _runSimulation(executionId, workflowId, workflow, repositoryPath) {
    const branches = workflow.branches || [];
    const operations = workflow.operations || [];

    // Build dependency graph and resolve execution order (mirrors backend)
    const { dependencies } = buildDependencyGraph(operations);
    const orderedOperations = resolveExecutionOrder(operations, dependencies);
    const repoPath = repositoryPath || '/playground/demo-repo';

    // Small yield so the caller's .then / setState from startExecution settles
    await new Promise(r => setTimeout(r, 50));

    // Collect logs for history persistence (mirrors backend addLog with emit=false)
    const logs = [];
    const addLog = (message, type, command = null) => {
      const entry = { timestamp: new Date().toISOString(), message, type };
      if (command) entry.command = command;
      logs.push(entry);
    };

    // Track per-operation and per-branch status for history
    const opStateMap = new Map(operations.map(op => [op.id, { ...op, status: 'pending' }]));
    const branchStates = branches.map(b => ({ ...b, status: 'pending' }));

    this.emit('execution-started', {
      executionId,
      workflowName: workflow.name,
      timestamp: new Date().toISOString()
    });

    addLog(`Starting execution of workflow: ${workflow.name}`, 'info');
    addLog(`Executing on repository: ${repoPath}`, 'info');
    addLog(`Execution started with ID: ${executionId}`, 'info');

    const startTime = Date.now();

    for (let i = 0; i < orderedOperations.length; i++) {
      if (this.aborted) {
        addLog('Workflow Execution Aborted by User', 'warning');
        this.emit('execution-aborted', {
          executionId,
          status: 'stopped',
          message: 'Workflow Execution Aborted by User',
          timestamp: new Date().toISOString()
        });
        this._saveHistory(executionId, workflowId, workflow, 'stopped', startTime, Array.from(opStateMap.values()), branchStates, logs, 'Aborted by user');
        this.activeExecution = null;
        return;
      }

      const op = orderedOperations[i];
      const opState = opStateMap.get(op.id);
      const source = branches.find(b => b.id === op.source);
      const target = branches.find(b => b.id === op.target);
      const sName = source?.name || 'unknown';
      const tName = target?.name || 'unknown';

      const commands = generateCommands(op, branches);

      opState.status = 'running';

      this.emit('operation-started', {
        executionId,
        operationId: op.id,
        operationType: op.type,
        source: sName,
        target: tName,
        status: 'running',
        timestamp: new Date().toISOString()
      });

      addLog('', 'separator');
      addLog(`Starting ${op.type} from ${sName} to ${tName}`, 'info');

      let lastCommand = commands[commands.length - 1];
      let allStdout = '';

      for (const cmd of commands) {
        if (this.aborted) break;

        this.emit('command-before-execution', {
          executionId,
          command: cmd,
          timestamp: new Date().toISOString()
        });

        addLog(cmd, 'info', cmd);

        // Simulate execution time — also lets React flush state between events
        await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 600));

        const stdout = mockStdout(cmd);
        if (stdout) allStdout += (allStdout ? '\n' : '') + stdout;
      }

      if (this.aborted) {
        addLog('Workflow Execution Aborted by User', 'warning');
        this.emit('execution-aborted', {
          executionId,
          status: 'stopped',
          message: 'Workflow Execution Aborted by User',
          timestamp: new Date().toISOString()
        });
        this._saveHistory(executionId, workflowId, workflow, 'stopped', startTime, Array.from(opStateMap.values()), branchStates, logs, 'Aborted by user');
        this.activeExecution = null;
        return;
      }

      opState.status = 'success';
      const targetBranchState = branchStates.find(b => b.id === op.target);
      if (targetBranchState) targetBranchState.status = 'success';

      addLog(`${op.type} completed successfully from ${sName} to ${tName}`, 'success');

      this.emit('operation-completed', {
        executionId,
        operationId: op.id,
        operationType: op.type,
        source: sName,
        target: tName,
        status: 'success',
        result: allStdout,
        command: lastCommand,
        timestamp: new Date().toISOString()
      });
    }

    const duration = Date.now() - startTime;

    addLog('Workflow execution completed successfully!', 'success');

    this.emit('execution-completed', {
      executionId,
      status: 'completed',
      duration,
      timestamp: new Date().toISOString()
    });

    this._saveHistory(executionId, workflowId, workflow, 'completed', startTime, Array.from(opStateMap.values()), branchStates, logs, null);
    this.activeExecution = null;
  }

  async stopExecution(executionId) {
    this.aborted = true;
    return { executionId, status: 'stopped' };
  }

  // ---------- Preview ----------

  async previewWorkflow(workflowId, repositoryPath = null) {
    const workflow = await this.workflowService.getWorkflow(workflowId);
    if (!workflow) throw new Error('Workflow not found');

    const branches = workflow.branches || [];
    const operations = workflow.operations || [];
    const repoPath = repositoryPath || '/playground/demo-repo';

    // Resolve dependency order (mirrors backend WorkflowPreviewService
    // which runs the full executor in mock mode, respecting dependencies)
    const { dependencies } = buildDependencyGraph(operations);
    const orderedOps = resolveExecutionOrder(operations, dependencies);

    // Build the same command list the backend's WorkflowPreviewService produces
    const commands = [];
    for (const op of orderedOps) {
      const cmds = generateCommands(op, branches);
      for (const cmd of cmds) {
        commands.push({
          id: `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          command: cmd,
          timestamp: new Date().toISOString(),
          options: { cwd: repoPath, timeout: 30000, skipEmission: false },
          riskLevel: analyzeCommandRisk(cmd),
          warnings: generateCommandWarnings(cmd),
          description: generateCommandDescription(cmd)
        });
      }
    }

    // Risk analysis (mirrors WorkflowPreviewService.generateRiskAnalysis)
    const riskCounts = { low: 0, medium: 0, high: 0 };
    commands.forEach(c => riskCounts[c.riskLevel]++);
    const total = commands.length || 1;
    const highPct = Math.round((riskCounts.high / total) * 100);
    const medPct = Math.round((riskCounts.medium / total) * 100);
    let overallRisk = 'low';
    if (highPct > 20) overallRisk = 'high';
    else if (highPct > 10 || medPct > 50) overallRisk = 'medium';

    const recommendations = [];
    if (riskCounts.high > 0) recommendations.push('Review high-risk commands before execution');
    if (riskCounts.medium > 2) recommendations.push('Consider testing on a backup repository first');
    if (commands.some(c => c.command.includes('--force'))) recommendations.push('Force operations cannot be undone - ensure you have backups');
    if (commands.some(c => c.command.includes('rebase'))) recommendations.push('Rebase operations rewrite history - coordinate with team');

    // Estimated duration (mirrors WorkflowPreviewService)
    let estimatedDuration = 0;
    commands.forEach(c => {
      if (c.command.includes('rebase')) estimatedDuration += 5;
      else if (c.command.includes('merge')) estimatedDuration += 3;
      else if (c.command.includes('push') || c.command.includes('pull')) estimatedDuration += 2;
      else estimatedDuration += 1;
    });

    // Warnings
    const warnings = [];
    commands.forEach(c => { if (c.warnings.length) warnings.push(...c.warnings); });

    return {
      workflowId: workflow.id,
      workflowName: workflow.name,
      commands,
      warnings,
      totalCommands: commands.length,
      estimatedDuration,
      repositoryPath: repoPath,
      riskAnalysis: {
        overallRisk,
        riskCounts,
        highRiskPercentage: highPct,
        mediumRiskPercentage: medPct,
        recommendations
      }
    };
  }

  // ---------- History ----------

  async getExecutionHistory(workflowId = null) {
    const all = this._loadHistory();
    return workflowId ? all.filter(r => r.workflowId === workflowId) : all;
  }

  async getExecutionDetail(executionId) {
    const all = this._loadHistory();
    return all.find(r => r.id === executionId) || null;
  }

  async getExecutionStatus(executionId) {
    if (this.activeExecution === executionId) return { executionId, status: 'running' };
    const record = await this.getExecutionDetail(executionId);
    return record ? { executionId, status: record.status } : { executionId, status: 'unknown' };
  }

  // ---------- Event system ----------

  on(event, callback) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;
    const cbs = this.listeners.get(event);
    const idx = cbs.indexOf(callback);
    if (idx > -1) cbs.splice(idx, 1);
  }

  emit(event, data) {
    if (!this.listeners.has(event)) return;
    this.listeners.get(event).forEach(cb => {
      try { cb(data); } catch (e) { console.error(`Error in listener for ${event}:`, e); }
    });
  }

  clearAllListeners() {
    this.listeners.clear();
  }

  // ---------- Private helpers ----------

  _loadHistory() {
    try {
      return JSON.parse(localStorage.getItem('git-workflow-executions') || '[]');
    } catch { return []; }
  }

  _saveHistory(executionId, workflowId, workflow, status, startTime, operationStates, branchStates, logs, error) {
    const history = this._loadHistory();
    history.unshift({
      id: executionId,
      workflowId,
      workflowName: workflow.name,
      repositoryPath: workflow.repositoryPath || '/playground/demo-repo',
      status,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      error,
      // Full data needed by loadHistoricalExecution / getExecutionDetail
      operations: operationStates,
      branches: branchStates,
      logs
    });
    localStorage.setItem('git-workflow-executions', JSON.stringify(history.slice(0, 50)));
  }
}

export default PlaygroundExecutionService;
