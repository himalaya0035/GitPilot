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
  constructor(workingDirectory = process.cwd()) {
    this.workingDirectory = workingDirectory;
    this.gitPilotRepoPath = process.cwd();
    this.emitUpdate = null;
    this.currentExecutionId = null;
    
    // SECURITY: Prevent execution on GitPilot repository
    this.validateRepositoryPath();
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
    const { cwd = this.workingDirectory, timeout = 30000, skipEmission = false } = options;
    
    try {
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
      
      const { stdout, stderr } = await execAsync(command, { 
        cwd, 
        timeout,
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });
      
      return {
        success: true,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        command
      };
    } catch (error) {
      console.error(`Git command failed: ${command}`, error);
      return {
        success: false,
        error: error.message,
        stdout: error.stdout || '',
        stderr: error.stderr || '',
        command
      };
    }
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
    } else if (strategy === 'standard') {
      if (ffOption === 'no-ff') {
        command += ' --no-ff';
      } else if (ffOption === 'ff-only') {
        command += ' --ff-only';
      }
      // 'auto' doesn't add any flags
    }
    
    command += ` ${source}`;

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
    if (forceType === 'forceWithLease') {
      command += ' --force-with-lease';
    } else if (forceType === 'force') {
      command += ' --force';
    }
    if (upstream) {
      command += ' --set-upstream';
    }
    
    // Handle target branch if provided
    if (target && target.trim() !== '') {
      // Validate target branch exists
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
    } else {
      command += ` ${remote} ${source}`;
    }

    return await this.executeGitCommand(command);
  }

  /**
   * Pull operation
   */
  async pull(source, target, params = {}) {
    const { rebase = false, remote = 'origin' } = params;
    
    // First checkout target branch
    const checkoutResult = await this.checkout(null, target);
    if (!checkoutResult.success) {
      return checkoutResult;
    }

    let command = 'git pull';
    if (rebase) {
      command += ' --rebase';
    }
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
    const result = await this.executeGitCommand('git branch --show-current', { skipEmission: true });
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
      const localResult = await this.executeGitCommand(`git show-ref --verify --quiet refs/heads/${branchName}`, { skipEmission: true });
      if (localResult.success) {
        return true;
      }
      
      // Check if branch exists remotely
      const remoteResult = await this.executeGitCommand(`git show-ref --verify --quiet refs/remotes/origin/${branchName}`, { skipEmission: true });
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
    const result = await this.executeGitCommand('git status --porcelain', { skipEmission: true });
    return {
      ...result,
      isClean: result.success && result.stdout === ''
    };
  }

  /**
   * Validate Git repository
   */
  async validateRepository() {
    const result = await this.executeGitCommand('git rev-parse --is-inside-work-tree', { skipEmission: true });
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
}

module.exports = GitService;