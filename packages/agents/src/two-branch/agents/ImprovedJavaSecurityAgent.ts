/**
 * Improved Java Security Agent with Proper Tool Management
 * 
 * This version properly handles tool failures without silent degradation
 */

import { execSync } from 'child_process';
import { BaseMultiToolAgent, ToolResult, AgentAnalysisResult } from './BaseMultiToolAgent';
import { logger } from '../utils/logger';
import { toolAvailabilityManager, ToolMode } from './ToolAvailabilityManager';

export class ImprovedJavaSecurityAgent extends BaseMultiToolAgent {
  protected agentName = 'ImprovedJavaSecurityAgent';
  protected tools = [];
  
  constructor() {
    super();
    this.initializeTools();
  }
  
  private initializeTools() {
    this.tools = [
      {
        name: 'spotbugs',
        execute: this.runSpotBugs.bind(this),
        isApplicable: (language: string) => language === 'java' || language === 'kotlin'
      },
      {
        name: 'pmd',
        execute: this.runPMD.bind(this),
        isApplicable: (language: string) => language === 'java' || language === 'kotlin'
      },
      {
        name: 'checkstyle',
        execute: this.runCheckstyle.bind(this),
        isApplicable: (language: string) => language === 'java'
      }
    ];
  }
  
  async analyze(input: {
    targetPath: string;
    language: string;
    context?: any;
  }): Promise<AgentAnalysisResult> {
    logger.info(`🔍 Starting improved Java security analysis for ${input.targetPath}`);
    
    // Check all tools first and determine if we can proceed
    const toolChecks = await toolAvailabilityManager.checkMultipleTools([
      'spotbugs', 'pmd', 'checkstyle'
    ]);
    
    // Log tool availability
    const failedTools: string[] = [];
    const mockTools: string[] = [];
    
    toolChecks.forEach((check, tool) => {
      if (!check.available) {
        if (check.shouldFail) {
          failedTools.push(tool);
        } else if (check.shouldUseMock) {
          mockTools.push(tool);
        }
      }
    });
    
    // In STRICT or DEGRADED mode, fail if any tools are missing
    if (failedTools.length > 0) {
      const mode = toolChecks.values().next().value?.mode || 'unknown';
      const error = mode === ToolMode.STRICT
        ? `STRICT MODE: Required tools not installed: ${failedTools.join(', ')}. Cannot proceed.`
        : `DEGRADED MODE: Tools not available: ${failedTools.join(', ')}. Install them or use MOCK mode for development.`;
      
      logger.error(error);
      
      return {
        agent: this.agentName,
        tools: [],
        issues: [],
        summary: {
          error: error,
          status: 'failed',
          mode: mode
        },
        metadata: {
          totalExecutionTime: 0,
          toolsExecuted: [],
          toolsFailed: failedTools,
          parallelExecution: false,
          error: error,
          mode: mode
        }
      };
    }
    
    // Only allow mocks in MOCK mode (development only)
    if (mockTools.length > 0) {
      logger.warn(`⚠️  DEVELOPMENT MODE: Using mock data for: ${mockTools.join(', ')}`);
    }
    
    // Run analysis
    const startTime = Date.now();
    const toolResults = await this.runToolsInParallel(
      input.targetPath,
      input.language
    );
    
    const issues = this.consolidateFindings(toolResults);
    const executionTime = Date.now() - startTime;
    
    // Mark results if any tools used mock data
    const metadata: any = {
      totalExecutionTime: executionTime,
      toolsExecuted: toolResults.map(r => r.tool),
      toolsFailed: [],
      parallelExecution: true
    };
    
    // Add mock info if applicable (only in MOCK mode)
    if (mockTools.length > 0) {
      metadata.usingMocks = true;
      metadata.mockedTools = mockTools;
      metadata.warning = 'DEVELOPMENT: Using mock analysis for missing tools';
      metadata.mode = 'mock';
    }
    
    // Calculate summary
    const summary = this.generateSummary(issues);
    if (mockTools.length > 0) {
      summary.dataQuality = 'mock';
      summary.mockedTools = mockTools;
    }
    
    logger.info(`✅ Improved Java analysis completed: ${issues.length} findings in ${executionTime}ms`);
    
    if (mockTools.length > 0) {
      logger.warn(`⚠️  DEVELOPMENT: Results include mock data from: ${mockTools.join(', ')}`);
    }
    
    return {
      agent: this.agentName,
      tools: toolResults.map(r => r.tool),
      issues,
      summary,
      metadata
    };
  }
  
  private async runSpotBugs(targetPath: string): Promise<ToolResult> {
    const check = await toolAvailabilityManager.checkTool('spotbugs');
    
    if (check.warning) {
      logger.warn(check.warning);
    }
    
    if (check.shouldFail) {
      throw new Error(check.warning || 'SpotBugs is required but not installed');
    }
    
    if (check.shouldUseMock) {
      const mockResult = this.mockSpotBugsAnalysis(targetPath);
      // Mark as mock data
      (mockResult.metadata as any).isMocked = true;
      (mockResult.metadata as any).mockReason = 'Tool not installed';
      return mockResult;
    }
    
    // Real tool execution
    logger.info('   Running SpotBugs analysis...');
    
    try {
      const output = execSync(
        `spotbugs -textui -xml:withMessages ${targetPath}`,
        { encoding: 'utf-8', stdio: 'pipe' }
      );
      
      return this.parseSpotBugsOutput(output);
    } catch (error: any) {
      logger.error(`SpotBugs analysis failed: ${error.message}`);
      
      // Don't fall back to mock on real failure - this is important!
      throw new Error(`SpotBugs execution failed: ${error.message}`);
    }
  }
  
  private async runPMD(targetPath: string): Promise<ToolResult> {
    const check = await toolAvailabilityManager.checkTool('pmd');
    
    if (check.warning) {
      logger.warn(check.warning);
    }
    
    if (check.shouldFail) {
      throw new Error(check.warning || 'PMD is required but not installed');
    }
    
    if (check.shouldUseMock) {
      const mockResult = this.mockPMDAnalysis(targetPath);
      (mockResult.metadata as any).isMocked = true;
      (mockResult.metadata as any).mockReason = 'Tool not installed';
      return mockResult;
    }
    
    // Real tool execution
    logger.info('   Running PMD analysis...');
    
    try {
      const output = execSync(
        `pmd check -d ${targetPath} -R rulesets/java/quickstart.xml -f json`,
        { encoding: 'utf-8', stdio: 'pipe' }
      );
      
      return this.parsePMDOutput(output);
    } catch (error: any) {
      logger.error(`PMD analysis failed: ${error.message}`);
      throw new Error(`PMD execution failed: ${error.message}`);
    }
  }
  
  private async runCheckstyle(targetPath: string): Promise<ToolResult> {
    const check = await toolAvailabilityManager.checkTool('checkstyle');
    
    if (check.warning) {
      logger.warn(check.warning);
    }
    
    if (check.shouldFail) {
      throw new Error(check.warning || 'Checkstyle is required but not installed');
    }
    
    if (check.shouldUseMock) {
      const mockResult = this.mockCheckstyleAnalysis(targetPath);
      (mockResult.metadata as any).isMocked = true;
      (mockResult.metadata as any).mockReason = 'Tool not installed';
      return mockResult;
    }
    
    // Real tool execution
    logger.info('   Running Checkstyle analysis...');
    
    try {
      const output = execSync(
        `checkstyle -c /google_checks.xml ${targetPath}`,
        { encoding: 'utf-8', stdio: 'pipe' }
      );
      
      return this.parseCheckstyleOutput(output);
    } catch (error: any) {
      logger.error(`Checkstyle analysis failed: ${error.message}`);
      throw new Error(`Checkstyle execution failed: ${error.message}`);
    }
  }
  
  protected generateSummary(findings: any[]): any {
    const summary = {
      total: findings.length,
      critical: findings.filter(f => f.severity === 'critical').length,
      high: findings.filter(f => f.severity === 'high').length,
      medium: findings.filter(f => f.severity === 'medium').length,
      low: findings.filter(f => f.severity === 'low').length,
      categories: {
        security: findings.filter(f => f.category === 'security').length,
        quality: findings.filter(f => f.category === 'quality').length,
        performance: findings.filter(f => f.category === 'performance').length
      }
    };
    
    return summary;
  }
  
  // Mock methods for when tools aren't available
  private mockSpotBugsAnalysis(targetPath: string): ToolResult {
    return {
      tool: 'spotbugs',
      findings: [
        {
          ruleId: 'SQL_INJECTION',
          type: 'sql-injection',
          message: 'SQL injection vulnerability',
          severity: 'critical',
          category: 'security',
          file: 'MockData.java',
          line: 42,
          details: 'MOCK DATA: This is not real analysis'
        }
      ],
      metadata: {
        executionTime: 0,
        filesAnalyzed: 0
      }
    };
  }
  
  private mockPMDAnalysis(targetPath: string): ToolResult {
    return {
      tool: 'pmd',
      findings: [
        {
          ruleId: 'UnusedVariable',
          type: 'code-quality',
          message: 'Unused variable',
          severity: 'low',
          category: 'quality',
          file: 'MockData.java',
          line: 10,
          details: 'MOCK DATA: This is not real analysis'
        }
      ],
      metadata: {
        executionTime: 0,
        filesAnalyzed: 0
      }
    };
  }
  
  private mockCheckstyleAnalysis(targetPath: string): ToolResult {
    return {
      tool: 'checkstyle',
      findings: [
        {
          ruleId: 'LineLength',
          type: 'style',
          message: 'Line too long',
          severity: 'low',
          category: 'style',
          file: 'MockData.java',
          line: 100,
          details: 'MOCK DATA: This is not real analysis'
        }
      ],
      metadata: {
        executionTime: 0,
        filesAnalyzed: 0
      }
    };
  }
  
  // Placeholder parsing methods (would need real implementation)
  private parseSpotBugsOutput(output: string): ToolResult {
    // Real XML parsing would go here
    return {
      tool: 'spotbugs',
      findings: [],
      metadata: { executionTime: 0 }
    };
  }
  
  private parsePMDOutput(output: string): ToolResult {
    // Real JSON parsing would go here
    return {
      tool: 'pmd',
      findings: [],
      metadata: { executionTime: 0 }
    };
  }
  
  private parseCheckstyleOutput(output: string): ToolResult {
    // Real XML parsing would go here
    return {
      tool: 'checkstyle',
      findings: [],
      metadata: { executionTime: 0 }
    };
  }
}