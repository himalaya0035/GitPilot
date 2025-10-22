/**
 * GitService - Git operations service
 * Handles all Git commands using child_process.exec
 * Supports checkout, merge, rebase, push, pull, delete-branch, tag operations
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');

const execAsync = promisify(exec);

class GitService {
  constructor(workingDirectory = process.cwd(), mockMode = false) {
    this.workingDirectory = workingDirectory;
    this.gitPilotRepoPath = process.cwd();
    this.emitUpdate = null;
    this.currentExecutionId = null;
    this.mockMode = mockMode;
    this.interceptedCommands = [];
    this.currentProcess = null; // Track current child process for abortion
    
    // SECURITY: Prevent execution on GitPilot repository (skip in mock mode)
    if (!mockMode) {
      this.validateRepositoryPath();
    }
  }

  /**
   * Set the emit function and execution ID for command emission
   */
  setEmitFunction(emitUpdate, executionId) {
    console.log(`🔧 Setting emit function for execution: ${executionId}`);
    this.emitUpdate = emitUpdate;
    this.currentExecutionId = executionId;
  }

  /**
   * Abort the current running Git command
   */
  abortCurrentCommand() {
    if (this.currentProcess) {
      console.log(`🛑 Aborting current Git command: ${this.currentProcess.spawnargs?.join(' ') || 'unknown'}`);
      try {
        this.currentProcess.kill('SIGTERM');
        console.log(`✅ Git command aborted successfully`);
        return true;
      } catch (error) {
        console.error(`❌ Failed to abort Git command:`, error);
        return false;
      }
    } else {
      console.log(`ℹ️ No Git command currently running to abort`);
      return false;
    }
  }

  /**
   * Validate that we're not executing on GitPilot repository
   */
  validateRepositoryPath() {
    const gitPilotRepoPath = this.gitPilotRepoPath;
    const targetPath = this.workingDirectory;
    
    // Check if trying to execute on GitPilot repository
    if (targetPath === gitPilotRepoPath || 
        targetPath.startsWith(gitPilotRepoPath + '/') ||
        gitPilotRepoPath.startsWith(targetPath + '/')) {
      throw new Error(`SECURITY VIOLATION: Cannot execute Git operations on GitPilot repository (${gitPilotRepoPath}). This would cause catastrophic damage to the application.`);
    }
  }

  /**
   * Execute a Git command
   */
  async executeGitCommand(command, options = {}) {
    const { cwd = this.workingDirectory, timeout = 30000, skipEmission = false, allowExecutionInMockMode = false, interceptCommandInMockMode = true } = options;
    
    // If in mock mode, intercept the command and return mock response
    if (this.mockMode && !allowExecutionInMockMode) {
      console.log(`🔍 Mock mode: Intercepting command: ${command}`);
      
      // Store the intercepted command
      if (interceptCommandInMockMode){
        this.interceptedCommands.push({
          id: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          command,
          timestamp: new Date().toISOString(),
          options: { cwd, timeout, skipEmission },
          riskLevel: this.analyzeCommandRisk(command),
          warnings: this.generateCommandWarnings(command),
          description: this.generateCommandDescription(command)
        });
      }
      
      // Return mock success response
      return {
        success: true,
        stdout: 'Mock execution - command intercepted',
        stderr: '',
        command
      };
    }
    
    // Normal execution with process tracking for abortion
    return new Promise((resolve, reject) => {
      console.log(`Executing Git command: ${command}`);
      
      // Emit command before execution if emit function is set and not skipped
      if (this.emitUpdate && this.currentExecutionId && !skipEmission) {
        console.log(`🔧 Emitting command-before-execution: ${command}`);
        this.emitUpdate(this.currentExecutionId, 'command-before-execution', {
          command,
          timestamp: new Date().toISOString()
        });
      } else if (skipEmission) {
        console.log(`🔇 Skipping command emission for internal command: ${command}`);
      } else {
        console.log(`❌ Command emission failed - emitUpdate: ${!!this.emitUpdate}, executionId: ${this.currentExecutionId}`);
      }
      
      // Store the child process reference for potential abortion
      this.currentProcess = exec(command, { 
        cwd, 
        timeout,
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      }, (error, stdout, stderr) => {
        // Clear the process reference when command completes
        this.currentProcess = null;
        
        if (error) {
          console.error(`Git command failed: ${command}`, error);
          resolve({
            success: false,
            error: error.message,
            stdout: error.stdout || '',
            stderr: error.stderr || '',
            command
          });
        } else {
          resolve({
            success: true,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            command
          });
        }
      });
    });
  }

  /**
   * Checkout operation
   */
  async checkout(source, target, params = {}) {
    const { new: isNew = false, force = false, reset = false } = params;
    
    // Validate target branch
    if (!target || target.trim() === '') {
      return {
        success: false,
        error: 'Target branch is required for checkout operations',
        stdout: '',
        stderr: 'fatal: target branch not specified',
        command: 'git checkout'
      };
    }
    
    let command;
    const forceFlag = force ? ' -f' : '';
    
    if (isNew || reset) {
      // BRANCH CREATION CHECKOUT
      // Source branch is mandatory for branch creation
      if (!source || source.trim() === '') {
        return {
          success: false,
          error: 'Source branch is required for branch creation',
          stdout: '',
          stderr: 'fatal: source branch not specified for branch creation',
          command: 'git checkout -b'
        };
      }
      
      // Check if source branch exists
      const sourceExists = await this.checkBranchExists(source);
      if (!sourceExists) {
        return {
          success: false,
          error: `Source branch '${source}' does not exist`,
          stdout: '',
          stderr: `fatal: branch '${source}' not found`,
          command: `git checkout -b`
        };
      }
      
      // Create new branch from source
      const branchFlag = reset ? '-B' : '-b';
      command = `git checkout${forceFlag} ${branchFlag} ${target} ${source}`;
      
    } else {
      // NORMAL CHECKOUT
      // Source branch should NOT be used in normal checkout
      // Just checkout the target branch
      command = `git checkout${forceFlag} ${target}`;
    }

    return await this.executeGitCommand(command);
  }

  /**
   * Merge operation
   */
  async merge(source, target, params = {}) {
    const { strategy = 'standard', ffOption = 'auto' } = params;
    
    // Validate source and target branches
    if (!source || source.trim() === '') {
      return {
        success: false,
        error: 'Source branch is required for merge operations',
        stdout: '',
        stderr: 'fatal: source branch not specified',
        command: 'git merge'
      };
    }
    
    if (!target || target.trim() === '') {
      return {
        success: false,
        error: 'Target branch is required for merge operations',
        stdout: '',
        stderr: 'fatal: target branch not specified',
        command: 'git merge'
      };
    }

    // Check if source branch exists
    const sourceExists = await this.checkBranchExists(source);
    if (!sourceExists) {
      return {
        success: false,
        error: `Source branch '${source}' does not exist`,
        stdout: '',
        stderr: `fatal: branch '${source}' not found`,
        command: `git merge`
      };
    }

    // First checkout target branch
    const checkoutResult = await this.checkout(source, target);
    if (!checkoutResult.success) {
      return checkoutResult;
    }

    let command = 'git merge';
    
    // Apply strategy flags
    if (strategy === 'squash') {
      command += ' --squash';
      command += ` ${source}`;
      
      // Execute squash merge first
      const squashResult = await this.executeGitCommand(command);
      
      if (!squashResult.success) {
        return squashResult; // Return error, don't commit
      }
      
      // Squash succeeded, now commit
      const commitMsg = params.commitMessage || `Squash merge: Merge changes from ${source}`;
      const commitCommand = `git commit -m "${commitMsg}"`;
      const commitResult = await this.executeGitCommand(commitCommand);
      
      // Return combined result
      return {
        ...commitResult,
        squashResult // Include original squash output
      };
    } else if (strategy === 'standard') {
      if (ffOption === 'no-ff') {
        command += ' --no-ff';
      } else if (ffOption === 'ff-only') {
        command += ' --ff-only';
      }
      // 'auto' doesn't add any flags
      command += ` ${source}`;
    }

    return await this.executeGitCommand(command);
  }

  /**
   * Rebase operation
   */
  async rebase(source, target, params = {}) {
    const { interactive = false, onto = null } = params;
    
    // First checkout target branch
    const checkoutResult = await this.checkout(null, target);
    if (!checkoutResult.success) {
      return checkoutResult;
    }

    let command = 'git rebase';
    if (interactive) {
      command += ' -i';
    }
    if (onto) {
      command += ` --onto ${onto}`;
    }
    command += ` ${source}`;

    return await this.executeGitCommand(command);
  }

  /**
   * Push operation
   */
  async push(source, target, params = {}) {
    const { forceType = 'none', upstream = false, remote = 'origin' } = params;
    
    // Validate source branch
    if (!source || source.trim() === '') {
      return {
        success: false,
        error: 'Source branch is required for push operations',
        stdout: '',
        stderr: 'fatal: source branch not specified',
        command: 'git push'
      };
    }
    
    // Check if source branch exists
    const sourceExists = await this.checkBranchExists(source);
    if (!sourceExists) {
      return {
        success: false,
        error: `Source branch '${source}' does not exist`,
        stdout: '',
        stderr: `fatal: branch '${source}' not found`,
        command: `git push ${remote} ${source}`
      };
    }
    
    let command = 'git push';
    
    // Add force options
    if (forceType === 'forceWithLease') {
      command += ' --force-with-lease';
    } else if (forceType === 'force') {
      command += ' --force';
    }
    
    // Add upstream flag
    if (upstream) {
      command += ' --set-upstream';
    }
    
    // Handle target branch logic
    if (target && target.trim() !== '') {
      // For upstream pushes with target, we're creating a new remote branch
      // No need to validate target exists - it will be created
      if (upstream) {
        command += ` ${remote} ${source}:${target}`;
      } else {
        // For non-upstream pushes with target, validate target exists
        const targetExists = await this.checkBranchExists(target);
        if (!targetExists) {
          return {
            success: false,
            error: `Target branch '${target}' does not exist`,
            stdout: '',
            stderr: `fatal: branch '${target}' not found`,
            command: `git push ${remote} ${source}:${target}`
          };
        }
        command += ` ${remote} ${source}:${target}`;
      }
    } else {
      // No target specified - push to same branch name on remote
      command += ` ${remote} ${source}`;
    }

    return await this.executeGitCommand(command);
  }

  /**
   * Pull operation
   */
  async pull(source, target, params = {}) {
    const { rebase = false, remote = 'origin' } = params;
    
    // Validate parameters
    if (!source || source.trim() === '') {
      return {
        success: false,
        error: 'Source branch (remote) is required for pull operations',
        stdout: '',
        stderr: 'fatal: source branch not specified',
        command: 'git pull'
      };
    }
    
    if (!target || target.trim() === '') {
      return {
        success: false,
        error: 'Target branch (local) is required for pull operations',
        stdout: '',
        stderr: 'fatal: target branch not specified',
        command: 'git pull'
      };
    }
    
    // Check if target branch exists locally
    const targetExists = await this.checkBranchExists(target);
    if (!targetExists) {
      return {
        success: false,
        error: `Target branch '${target}' does not exist locally`,
        stdout: '',
        stderr: `fatal: branch '${target}' not found`,
        command: `git pull ${remote} ${source}`
      };
    }
    
    // Check if we're already on the target branch
    const currentBranch = await this.getCurrentBranch();
    const needsCheckout = currentBranch?.stdout !== target;
    
    // Checkout target branch if we're not already on it
    if (needsCheckout) {
      const checkoutResult = await this.checkout(null, target);
      if (!checkoutResult.success) {
        return checkoutResult;
      }
    }
    
    // Build pull command
    let command = 'git pull';
    if (rebase) {
      command += ' --rebase';
    }
    
    // Since we're already on the target branch, just pull from source
    command += ` ${remote} ${source}`;

    return await this.executeGitCommand(command);
  }

  /**
   * Delete branch operation
   */
  async deleteBranch(source, target, params = {}) {
    const { remote = false, force = false } = params;
    
    let command = 'git branch';
    if (remote) {
      command = 'git push origin --delete';
    } else {
      command += ' -d';
      if (force) {
        command = command.replace('-d', '-D');
      }
    }
    command += ` ${source}`;

    return await this.executeGitCommand(command);
  }

  /**
   * Tag operation
   */
  async tag(source, target, params = {}) {
    const { name, message, push = false } = params;
    
    if (!name) {
      return {
        success: false,
        error: 'Tag name is required',
        command: 'git tag'
      };
    }

    let command = 'git tag';
    if (message) {
      command += ` -a ${name} -m "${message}"`;
    } else {
      command += ` ${name}`;
    }

    const tagResult = await this.executeGitCommand(command);
    
    if (tagResult.success && push) {
      const pushResult = await this.executeGitCommand(`git push origin ${name}`);
      return {
        ...tagResult,
        pushResult
      };
    }

    return tagResult;
  }

  /**
   * Get current branch
   */
  async getCurrentBranch() {
    const result = await this.executeGitCommand('git branch --show-current', { skipEmission: true, allowExecutionInMockMode: true });
    return result;
  }

  /**
   * Get branch list
   */
  async getBranches() {
    const result = await this.executeGitCommand('git branch -a', { skipEmission: true });
    return result;
  }

  /**
   * Check if a branch exists (local or remote)
   */
  async checkBranchExists(branchName) {
    try {
      // Check if branch exists locally
      const localResult = await this.executeGitCommand(`git show-ref --verify --quiet refs/heads/${branchName}`, { skipEmission: true, interceptCommandInMockMode: false });
      if (localResult.success) {
        return true;
      }
      
      // Check if branch exists remotely
      const remoteResult = await this.executeGitCommand(`git show-ref --verify --quiet refs/remotes/origin/${branchName}`, { skipEmission: true, interceptCommandInMockMode: false });
      if (remoteResult.success) {
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`Error checking if branch exists: ${branchName}`, error);
      return false;
    }
  }

  /**
   * Check if repository is clean
   */
  async isRepositoryClean() {
    const result = await this.executeGitCommand('git status --porcelain', { skipEmission: true, allowExecutionInMockMode: true });
    return {
      ...result,
      isClean: result.success && result.stdout === ''
    };
  }

  /**
   * Validate Git repository
   */
  async validateRepository() {
    const result = await this.executeGitCommand('git rev-parse --is-inside-work-tree', { skipEmission: true, allowExecutionInMockMode: true });
    return {
      ...result,
      isValid: result.success && result.stdout.trim() === 'true'
    };
  }

  /**
   * Get repository status
   */
  async getRepositoryStatus() {
    const [validation, currentBranch, isClean] = await Promise.all([
      this.validateRepository(),
      this.getCurrentBranch(),
      this.isRepositoryClean()
    ]);

    return {
      isValid: validation.isValid,
      currentBranch: currentBranch.success ? currentBranch.stdout : null,
      isClean: isClean.isClean,
      workingDirectory: this.workingDirectory
    };
  }

  // ===== MOCK MODE METHODS =====

  /**
   * Get all intercepted commands (for preview mode)
   */
  getInterceptedCommands() {
    return this.interceptedCommands;
  }

  /**
   * Clear intercepted commands
   */
  clearInterceptedCommands() {
    this.interceptedCommands = [];
  }

  /**
   * Enable or disable mock mode
   */
  setMockMode(enabled) {
    this.mockMode = enabled;
    if (enabled) {
      this.clearInterceptedCommands();
    }
  }

  /**
   * Analyze command risk level
   */
  analyzeCommandRisk(command) {
    // High risk: force operations
    if (command.includes('--force') || command.includes(' -f')) {
      return 'high';
    }
    if (command.includes('checkout') && command.includes('-B')) {
      return 'high';
    }
    
    // Medium risk: operations that can cause conflicts or rewrite history
    if (command.includes('rebase') || command.includes('--force-with-lease')) {
      return 'medium';
    }
    if (command.includes('merge') || command.includes('pull')) {
      return 'medium';
    }
    
    // Low risk: safe operations
    return 'low';
  }

  /**
   * Generate warnings for a command
   */
  generateCommandWarnings(command) {
    const warnings = [];
    
    // Check for force flags (both --force and -f)
    if (command.includes('--force') || command.includes(' -f')) {
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
    
    // Check for branch creation with force
    if (command.includes('checkout') && command.includes('-B')) {
      warnings.push('Branch reset will overwrite existing branch');
    }
    
    return warnings;
  }

  /**
   * Generate human-readable command description
   */
  generateCommandDescription(command) {
    if (command.includes('checkout -b')) {
      return 'Create new branch';
    }
    if (command.includes('checkout -B')) {
      return 'Create and reset branch (force)';
    }
    if (command.includes('checkout -f')) {
      return 'Force checkout (discard changes)';
    }
    if (command.includes('checkout')) {
      return 'Switch to branch';
    }
    if (command.includes('merge --squash')) {
      return 'Squash merge branches';
    }
    if (command.includes('merge --no-ff')) {
      return 'Merge with no fast-forward';
    }
    if (command.includes('merge')) {
      return 'Merge branches';
    }
    if (command.includes('rebase -i')) {
      return 'Interactive rebase';
    }
    if (command.includes('rebase')) {
      return 'Rebase branches';
    }
    if (command.includes('push --force')) {
      return 'Force push to remote';
    }
    if (command.includes('push --force-with-lease')) {
      return 'Force push with lease';
    }
    if (command.includes('push')) {
      return 'Push to remote';
    }
    if (command.includes('pull --rebase')) {
      return 'Pull with rebase';
    }
    if (command.includes('pull')) {
      return 'Pull from remote';
    }
    if (command.includes('delete')) {
      return 'Delete branch';
    }
    if (command.includes('tag -a')) {
      return 'Create annotated tag';
    }
    if (command.includes('tag')) {
      return 'Create tag';
    }
    
    return 'Git operation';
  }
}

module.exports = GitService;