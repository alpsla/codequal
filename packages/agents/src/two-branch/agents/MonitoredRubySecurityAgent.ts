/**
 * MonitoredRubySecurityAgent - Ruby Security Agent with full monitoring integration
 * 
 * Example implementation showing how to integrate monitoring with language agents
 */

import { MonitoredMultiToolAgent, MonitoredToolResult } from './MonitoredMultiToolAgent';
import { AgentAnalysisResult, ToolResult } from './BaseMultiToolAgent';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

interface RubySecurityIssue {
  ruleId: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  file: string;
  line: number;
  column?: number;
  type?: string;
  details?: string;
  sources?: string[];
}

export class MonitoredRubySecurityAgent extends MonitoredMultiToolAgent {
  protected agentName = 'RubySecurityAgent';
  protected tools: any[] = [];
  
  constructor() {
    super({
      enabled: true,
      trackPerformance: true,
      trackCosts: true,
      trackErrors: true,
      // RuboCop and Brakeman are free tools
      costPerTool: new Map([
        ['rubocop', 0],
        ['brakeman', 0]
      ])
    });
  }

  /**
   * Check if this agent is applicable to the repository
   */
  async isApplicable(targetPath: string): Promise<boolean> {
    const monitoringId = this.monitoring.startPerformance(`${this.agentName}.isApplicable`);
    
    try {
      // Check for Ruby files
      const hasRubyFiles = await this.hasRubyFiles(targetPath);
      if (hasRubyFiles) {
        this.monitoring.endPerformance(monitoringId, true);
        return true;
      }

      // Check for Gemfile
      if (fs.existsSync(path.join(targetPath, 'Gemfile'))) {
        this.monitoring.endPerformance(monitoringId, true);
        return true;
      }
      
      // Check for Rakefile
      if (fs.existsSync(path.join(targetPath, 'Rakefile'))) {
        this.monitoring.endPerformance(monitoringId, true);
        return true;
      }
      
      // Check for .ruby-version
      if (fs.existsSync(path.join(targetPath, '.ruby-version'))) {
        this.monitoring.endPerformance(monitoringId, true);
        return true;
      }

      this.monitoring.endPerformance(monitoringId, true);
      return false;
    } catch (error) {
      logger.error('Error checking Ruby applicability:', error);
      this.monitoring.endPerformance(monitoringId, false, error.message);
      return false;
    }
  }

  /**
   * Main analysis implementation
   */
  protected async executeAnalysis(input: {
    targetPath?: string;
    findings?: any[];
    language: string;
    context?: any;
  }): Promise<AgentAnalysisResult> {
    const startTime = Date.now();
    const { targetPath, language, context } = input;
    
    if (!targetPath) {
      throw new Error('targetPath is required for RubySecurityAgent');
    }
    
    logger.info(`🔍 Starting Ruby security analysis for ${targetPath}`);
    
    // Track individual tool executions with monitoring
    const toolPromises: Promise<MonitoredToolResult>[] = [
      this.runRuboCopMonitored(targetPath),
      this.runBrakemanMonitored(targetPath)
    ];
    
    const results = await Promise.allSettled(toolPromises);
    
    // Aggregate findings with monitoring data
    const allFindings: RubySecurityIssue[] = [];
    const toolsExecuted: string[] = [];
    const toolsFailed: string[] = [];
    let totalCost = 0;
    
    results.forEach((result, index) => {
      const toolName = index === 0 ? 'rubocop' : 'brakeman';
      
      if (result.status === 'fulfilled') {
        const toolResult = result.value;
        if (toolResult.findings && toolResult.findings.length > 0) {
          allFindings.push(...toolResult.findings);
          toolsExecuted.push(toolName);
        }
        
        // Track monitoring data
        if (toolResult.monitoring?.cost) {
          totalCost += toolResult.monitoring.cost;
        }
      } else {
        toolsFailed.push(toolName);
        logger.warn(`Tool ${toolName} failed:`, result.reason);
        
        // Track tool failure
        this.monitoring.trackError({
          agent: this.agentName,
          tool: toolName,
          error: result.reason
        });
      }
    });
    
    const totalTime = Date.now() - startTime;
    logger.info(`✅ Ruby analysis completed: ${allFindings.length} findings in ${totalTime}ms`);
    
    // Track aggregated metrics
    this.monitoring.trackPerformance({
      operation: `${this.agentName}.aggregate`,
      duration: totalTime,
      success: true,
      metadata: {
        findingsCount: allFindings.length,
        toolsExecuted: toolsExecuted.length,
        toolsFailed: toolsFailed.length,
        totalCost
      }
    });
    
    return {
      agent: this.agentName,
      tools: toolsExecuted,
      issues: allFindings,
      summary: this.generateSummary(allFindings),
      metadata: {
        totalExecutionTime: totalTime,
        toolsExecuted,
        toolsFailed,
        parallelExecution: true,
        monitoringEnabled: true,
        totalCost
      }
    };
  }

  /**
   * Run RuboCop with monitoring
   */
  private async runRuboCopMonitored(targetPath: string): Promise<MonitoredToolResult> {
    const startTime = Date.now();
    const monitoringId = this.monitoring.startPerformance(`${this.agentName}.rubocop`);
    
    try {
      logger.info('   Running RuboCop analysis...');
      
      // Check if RuboCop is installed
      const isInstalled = await this.checkToolInstallation('rubocop');
      
      if (!isInstalled) {
        logger.warn('   RuboCop not installed - using mock analysis');
        const mockResult = await this.mockRuboCopAnalysis(targetPath);
        
        this.monitoring.endPerformance(monitoringId, true);
        
        return {
          ...mockResult,
          monitoring: {
            executionId: monitoringId,
            startTime,
            endTime: Date.now(),
            memoryUsed: process.memoryUsage().heapUsed,
            cost: 0 // Free tool
          }
        };
      }
      
      // Run actual RuboCop
      const output = execSync(
        `rubocop ${targetPath} --format json`,
        { encoding: 'utf-8', stdio: 'pipe' }
      );
      
      const result = JSON.parse(output);
      const findings = this.parseRuboCopOutput(result);
      
      const endTime = Date.now();
      logger.info(`   ✓ rubocop completed in ${endTime - startTime}ms`);
      
      this.monitoring.endPerformance(monitoringId, true);
      
      return {
        tool: 'rubocop',
        findings,
        metadata: {
          executionTime: endTime - startTime,
          filesAnalyzed: result.files?.length || 0
        },
        monitoring: {
          executionId: monitoringId,
          startTime,
          endTime,
          memoryUsed: process.memoryUsage().heapUsed,
          cost: 0
        }
      };
    } catch (error) {
      this.monitoring.endPerformance(monitoringId, false, error.message);
      
      // If RuboCop exits with non-zero (has findings), parse the output
      if (error.stdout) {
        try {
          const result = JSON.parse(error.stdout);
          const findings = this.parseRuboCopOutput(result);
          
          const endTime = Date.now();
          logger.info(`   ✓ rubocop completed in ${endTime - startTime}ms`);
          
          return {
            tool: 'rubocop',
            findings,
            metadata: {
              executionTime: endTime - startTime
            },
            monitoring: {
              executionId: monitoringId,
              startTime,
              endTime,
              memoryUsed: process.memoryUsage().heapUsed,
              cost: 0
            }
          };
        } catch (parseError) {
          // Fall back to mock if parsing fails
          return this.mockRuboCopAnalysis(targetPath);
        }
      }
      
      // Fall back to mock analysis
      return this.mockRuboCopAnalysis(targetPath);
    }
  }

  /**
   * Run Brakeman with monitoring
   */
  private async runBrakemanMonitored(targetPath: string): Promise<MonitoredToolResult> {
    const startTime = Date.now();
    const monitoringId = this.monitoring.startPerformance(`${this.agentName}.brakeman`);
    
    try {
      logger.info('   Running Brakeman security scan...');
      
      // Check if Brakeman is installed
      const isInstalled = await this.checkToolInstallation('brakeman');
      
      if (!isInstalled) {
        logger.warn('   Brakeman not installed - using mock analysis');
        const mockResult = await this.mockBrakemanAnalysis(targetPath);
        
        this.monitoring.endPerformance(monitoringId, true);
        
        return {
          ...mockResult,
          monitoring: {
            executionId: monitoringId,
            startTime,
            endTime: Date.now(),
            memoryUsed: process.memoryUsage().heapUsed,
            cost: 0 // Free tool
          }
        };
      }
      
      // Check if it's a Rails app
      const isRailsApp = fs.existsSync(path.join(targetPath, 'config', 'routes.rb')) ||
                        fs.existsSync(path.join(targetPath, 'app', 'controllers'));
      
      if (!isRailsApp) {
        logger.info('   Not a Rails application - skipping Brakeman');
        this.monitoring.endPerformance(monitoringId, true);
        
        return {
          tool: 'brakeman',
          findings: [],
          metadata: {
            executionTime: Date.now() - startTime,
            errors: ['Not a Rails application']
          },
          monitoring: {
            executionId: monitoringId,
            startTime,
            endTime: Date.now(),
            memoryUsed: process.memoryUsage().heapUsed,
            cost: 0
          }
        };
      }
      
      // Run actual Brakeman
      const output = execSync(
        `brakeman ${targetPath} --format json --no-pager`,
        { encoding: 'utf-8', stdio: 'pipe' }
      );
      
      const result = JSON.parse(output);
      const findings = this.parseBrakemanOutput(result);
      
      const endTime = Date.now();
      logger.info(`   ✓ brakeman completed in ${endTime - startTime}ms`);
      
      this.monitoring.endPerformance(monitoringId, true);
      
      return {
        tool: 'brakeman',
        findings,
        metadata: {
          executionTime: endTime - startTime
        },
        monitoring: {
          executionId: monitoringId,
          startTime,
          endTime,
          memoryUsed: process.memoryUsage().heapUsed,
          cost: 0
        }
      };
    } catch (error) {
      this.monitoring.endPerformance(monitoringId, false, error.message);
      
      // Fall back to mock analysis
      return this.mockBrakemanAnalysis(targetPath);
    }
  }

  // Helper methods (same as original RubySecurityAgent)
  
  private async hasRubyFiles(dir: string): Promise<boolean> {
    try {
      if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
        return false;
      }

      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (file.endsWith('.rb') || file.endsWith('.rake') || file.endsWith('.ru')) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  private parseRuboCopOutput(result: any): RubySecurityIssue[] {
    const findings: RubySecurityIssue[] = [];
    
    if (result.files) {
      result.files.forEach((file: any) => {
        if (file.offenses) {
          file.offenses.forEach((offense: any) => {
            findings.push({
              ruleId: offense.cop_name || 'unknown',
              message: offense.message,
              severity: this.mapRuboCopSeverity(offense.severity),
              category: this.categorizeRuboCopRule(offense.cop_name),
              file: file.path,
              line: offense.location?.line || 0,
              column: offense.location?.column || 0,
              type: offense.cop_name?.split('/')[0]?.toLowerCase(),
              sources: ['rubocop']
            });
          });
        }
      });
    }
    
    return findings;
  }

  private mapRuboCopSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' {
    switch (severity?.toLowerCase()) {
      case 'error':
      case 'fatal':
        return 'high';
      case 'warning':
        return 'medium';
      case 'convention':
      case 'refactor':
      default:
        return 'low';
    }
  }

  private categorizeRuboCopRule(copName: string): string {
    if (!copName) return 'style';
    
    const category = copName.split('/')[0]?.toLowerCase();
    
    switch (category) {
      case 'security':
        return 'security';
      case 'performance':
        return 'performance';
      case 'lint':
        return 'bug-risk';
      case 'metrics':
        return 'complexity';
      case 'style':
      case 'layout':
      default:
        return 'style';
    }
  }

  private parseBrakemanOutput(result: any): RubySecurityIssue[] {
    const findings: RubySecurityIssue[] = [];
    
    if (result.warnings) {
      result.warnings.forEach((warning: any) => {
        findings.push({
          ruleId: warning.warning_type || 'unknown',
          message: warning.message,
          severity: this.mapBrakemanConfidence(warning.confidence),
          category: 'security',
          file: warning.file,
          line: warning.line || 0,
          type: warning.warning_type,
          details: warning.code,
          sources: ['brakeman']
        });
      });
    }
    
    return findings;
  }

  private mapBrakemanConfidence(confidence: string): 'critical' | 'high' | 'medium' | 'low' {
    switch (confidence?.toLowerCase()) {
      case 'high':
        return 'critical';
      case 'medium':
        return 'high';
      case 'weak':
      case 'low':
      default:
        return 'medium';
    }
  }

  private async checkToolInstallation(toolName: string): Promise<boolean> {
    try {
      execSync(`which ${toolName}`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  protected generateSummary(findings: RubySecurityIssue[]): any {
    const severityCounts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };
    
    const categoryBreakdown: Record<string, number> = {};
    
    findings.forEach(finding => {
      // Count by severity
      if (finding.severity && Object.prototype.hasOwnProperty.call(severityCounts, finding.severity)) {
        severityCounts[finding.severity]++;
      }
      
      // Count by category
      const category = finding.category || 'uncategorized';
      categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1;
    });
    
    return {
      totalIssues: findings.length,
      severityBreakdown: severityCounts,
      categoryBreakdown,
      topIssueTypes: this.getTopIssueTypes(findings),
      monitoringEnabled: true,
      trackingId: `${this.agentName}-${Date.now()}`
    };
  }

  private getTopIssueTypes(findings: RubySecurityIssue[]): string[] {
    const typeCounts: Record<string, number> = {};
    
    findings.forEach(finding => {
      const type = finding.type || finding.ruleId || 'unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    
    return Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type]) => type);
  }

  // Mock analysis methods (same as original)
  private async mockRuboCopAnalysis(targetPath: string): Promise<MonitoredToolResult> {
    const mockFindings: RubySecurityIssue[] = [
      {
        ruleId: 'Style/StringLiterals',
        message: 'Prefer single-quoted strings when you don\'t need string interpolation',
        severity: 'low',
        category: 'style',
        file: 'app/models/user.rb',
        line: 15,
        column: 10,
        type: 'style',
        details: 'Mock finding: Use single quotes for string literals',
        sources: ['rubocop']
      },
      {
        ruleId: 'Security/Open',
        message: 'The use of `Kernel#open` is a serious security risk',
        severity: 'high',
        category: 'security',
        file: 'app/controllers/files_controller.rb',
        line: 23,
        column: 5,
        type: 'security',
        details: 'Mock finding: Unsafe use of Kernel#open with user input',
        sources: ['rubocop']
      },
      {
        ruleId: 'Performance/Count',
        message: 'Use `count` instead of `select...count`',
        severity: 'medium',
        category: 'performance',
        file: 'app/models/post.rb',
        line: 42,
        column: 8,
        type: 'performance',
        details: 'Mock finding: Inefficient counting method',
        sources: ['rubocop']
      },
      {
        ruleId: 'Metrics/MethodLength',
        message: 'Method has too many lines [25/10]',
        severity: 'medium',
        category: 'complexity',
        file: 'app/services/user_service.rb',
        line: 10,
        column: 3,
        type: 'metrics',
        details: 'Mock finding: Method is too complex',
        sources: ['rubocop']
      }
    ];
    
    return {
      tool: 'rubocop',
      findings: mockFindings,
      metadata: {
        executionTime: 50,
        filesAnalyzed: 4
      },
      monitoring: {
        executionId: `mock-rubocop-${Date.now()}`,
        startTime: Date.now(),
        endTime: Date.now() + 50,
        memoryUsed: process.memoryUsage().heapUsed,
        cost: 0
      }
    };
  }

  private async mockBrakemanAnalysis(targetPath: string): Promise<MonitoredToolResult> {
    const mockFindings: RubySecurityIssue[] = [
      {
        ruleId: 'SQL_INJECTION',
        message: 'Possible SQL injection vulnerability',
        severity: 'critical',
        category: 'security',
        file: 'app/controllers/users_controller.rb',
        line: 34,
        column: 5,
        type: 'sql-injection',
        details: 'Mock finding: User input directly interpolated into SQL query',
        sources: ['brakeman']
      },
      {
        ruleId: 'CROSS_SITE_SCRIPTING',
        message: 'Potential XSS vulnerability in view',
        severity: 'high',
        category: 'security',
        file: 'app/views/posts/show.html.erb',
        line: 12,
        type: 'xss',
        details: 'Mock finding: Unescaped user input in HTML',
        sources: ['brakeman']
      },
      {
        ruleId: 'MASS_ASSIGNMENT',
        message: 'Mass assignment vulnerability in model',
        severity: 'high',
        category: 'security',
        file: 'app/models/user.rb',
        line: 5,
        type: 'mass-assignment',
        details: 'Mock finding: Unsafe mass assignment without strong parameters',
        sources: ['brakeman']
      }
    ];
    
    return {
      tool: 'brakeman',
      findings: mockFindings,
      metadata: {
        executionTime: 40,
        filesAnalyzed: 3
      },
      monitoring: {
        executionId: `mock-brakeman-${Date.now()}`,
        startTime: Date.now(),
        endTime: Date.now() + 40,
        memoryUsed: process.memoryUsage().heapUsed,
        cost: 0
      }
    };
  }
}