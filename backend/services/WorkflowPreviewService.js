/**
 * WorkflowPreviewService - Preview workflow execution without executing
 * Reuses existing execution logic but intercepts commands for preview
 */

const WorkflowExecutor = require('./WorkflowExecutor');
const GitService = require('./GitService');

class WorkflowPreviewService {
  constructor() {
    // No state needed - we'll use GitService's intercepted commands
  }

  /**
   * Generate workflow preview by intercepting execution commands
   */
  async generatePreview(workflow, repositoryPath) {
    // Create GitService in mock mode - this will intercept all commands
    const mockGitService = new GitService(repositoryPath, true);
    
    // Create executor with mock service
    const mockExecutor = new WorkflowExecutor(mockGitService, null);
    
    try {
      // Run the execution logic - commands will be intercepted by GitService
      await mockExecutor.executeWorkflow(workflow, 'preview-execution');
      
      // Get all intercepted commands from GitService
      const commands = mockGitService.getInterceptedCommands();
      
      return {
        workflowId: workflow.id,
        workflowName: workflow.name,
        commands,
        warnings: this.extractWarnings(commands),
        totalCommands: commands.length,
        estimatedDuration: this.calculateEstimatedDuration(commands),
        repositoryPath: repositoryPath,
        riskAnalysis: this.generateRiskAnalysis(commands)
      };
    } catch (error) {
      // Even if execution would fail, we can still show the commands that would be attempted
      const commands = mockGitService.getInterceptedCommands();
      
      return {
        workflowId: workflow.id,
        workflowName: workflow.name,
        commands,
        warnings: [...this.extractWarnings(commands), `Execution would fail: ${error.message}`],
        totalCommands: commands.length,
        estimatedDuration: this.calculateEstimatedDuration(commands),
        repositoryPath: repositoryPath,
        riskAnalysis: this.generateRiskAnalysis(commands),
        hasErrors: true
      };
    }
  }

  /**
   * Extract warnings from commands
   */
  extractWarnings(commands) {
    const allWarnings = [];
    commands.forEach(cmd => {
      if (cmd.warnings && cmd.warnings.length > 0) {
        allWarnings.push(...cmd.warnings);
      }
    });
    return allWarnings;
  }

  /**
   * Calculate estimated duration based on command types
   */
  calculateEstimatedDuration(commands) {
    let totalSeconds = 0;
    
    commands.forEach(cmd => {
      if (cmd.command.includes('rebase')) totalSeconds += 5;
      else if (cmd.command.includes('merge')) totalSeconds += 3;
      else if (cmd.command.includes('push') || cmd.command.includes('pull')) totalSeconds += 2;
      else totalSeconds += 1;
    });
    
    return totalSeconds;
  }

  /**
   * Generate overall risk analysis
   */
  generateRiskAnalysis(commands) {
    const riskCounts = { low: 0, medium: 0, high: 0 };
    
    commands.forEach(cmd => {
      riskCounts[cmd.riskLevel]++;
    });
    
    const totalCommands = commands.length;
    const highRiskPercentage = totalCommands > 0 ? (riskCounts.high / totalCommands) * 100 : 0;
    const mediumRiskPercentage = totalCommands > 0 ? (riskCounts.medium / totalCommands) * 100 : 0;
    
    let overallRisk = 'low';
    if (highRiskPercentage > 20) overallRisk = 'high';
    else if (highRiskPercentage > 10 || mediumRiskPercentage > 50) overallRisk = 'medium';
    
    return {
      overallRisk,
      riskCounts,
      highRiskPercentage: Math.round(highRiskPercentage),
      mediumRiskPercentage: Math.round(mediumRiskPercentage),
      recommendations: this.generateRecommendations(riskCounts, commands)
    };
  }

  /**
   * Generate safety recommendations
   */
  generateRecommendations(riskCounts, commands) {
    const recommendations = [];
    
    if (riskCounts.high > 0) {
      recommendations.push('Review high-risk commands before execution');
    }
    if (riskCounts.medium > 2) {
      recommendations.push('Consider testing on a backup repository first');
    }
    if (commands.some(cmd => cmd.command.includes('--force'))) {
      recommendations.push('Force operations cannot be undone - ensure you have backups');
    }
    if (commands.some(cmd => cmd.command.includes('rebase'))) {
      recommendations.push('Rebase operations rewrite history - coordinate with team');
    }
    
    return recommendations;
  }
}

module.exports = WorkflowPreviewService;
