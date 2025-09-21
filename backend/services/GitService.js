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
  }

  /**
   * Execute a Git command
   */
  async executeGitCommand(command, options = {}) {
    const { cwd = this.workingDirectory, timeout = 30000 } = options;
    
    try {
      console.log(`Executing Git command: ${command}`);
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
    const { new: isNew = false, force = false } = params;
    
    let command = 'git checkout';
    if (isNew) {
      command += ' -b';
    }
    if (force) {
      command += ' -f';
    }
    command += ` ${target}`;

    return await this.executeGitCommand(command);
  }

  /**
   * Merge operation
   */
  async merge(source, target, params = {}) {
    const { strategy = 'merge', noFF = false } = params;
    
    // First checkout target branch
    const checkoutResult = await this.checkout(null, target);
    if (!checkoutResult.success) {
      return checkoutResult;
    }

    let command = 'git merge';
    if (strategy === 'squash') {
      command += ' --squash';
    } else if (strategy === 'no-ff') {
      command += ' --no-ff';
    }
    if (noFF) {
      command += ' --no-ff';
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
    const { force = false, upstream = false, remote = 'origin' } = params;
    
    let command = 'git push';
    if (force) {
      command += ' --force';
    }
    if (upstream) {
      command += ' --set-upstream';
    }
    command += ` ${remote} ${source}`;

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
    const result = await this.executeGitCommand('git branch --show-current');
    return result;
  }

  /**
   * Get branch list
   */
  async getBranches() {
    const result = await this.executeGitCommand('git branch -a');
    return result;
  }

  /**
   * Check if repository is clean
   */
  async isRepositoryClean() {
    const result = await this.executeGitCommand('git status --porcelain');
    return {
      ...result,
      isClean: result.success && result.stdout === ''
    };
  }

  /**
   * Validate Git repository
   */
  async validateRepository() {
    const result = await this.executeGitCommand('git rev-parse --is-inside-work-tree');
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