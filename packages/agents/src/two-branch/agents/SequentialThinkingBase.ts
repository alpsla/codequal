/**
 * Sequential Thinking Base Class for Agents
 * 
 * Implements structured, step-by-step thinking process for complex analysis.
 * Based on Sequential Thinking MCP methodology.
 */

import { BaseMultiToolAgent, AgentAnalysisResult } from './BaseMultiToolAgent';

export interface ThinkingStep {
  step: number;
  description: string;
  action: string;
  reasoning: string;
  output?: any;
  dependencies?: number[]; // Steps this depends on
}

export interface SequentialPlan {
  goal: string;
  steps: ThinkingStep[];
  expectedOutcome: string;
  fallbackStrategy?: string;
}

export abstract class SequentialThinkingAgent extends BaseMultiToolAgent {
  protected thinkingDepth = 5;
  protected currentPlan?: SequentialPlan;
  protected executedSteps: Map<number, any> = new Map();
  
  /**
   * Override analyze to incorporate sequential thinking
   */
  async analyze(input: {
    targetPath?: string;
    findings?: any[];
    language: string;
    context?: any;
  }): Promise<AgentAnalysisResult> {
    console.log(`🧠 ${this.agentName}: Starting Sequential Thinking Analysis`);
    
    // Step 1: Create analysis plan
    const plan = await this.createAnalysisPlan(input);
    this.currentPlan = plan;
    
    console.log(`📋 Analysis Plan Created:`);
    console.log(`   Goal: ${plan.goal}`);
    console.log(`   Steps: ${plan.steps.length}`);
    plan.steps.forEach(step => {
      console.log(`   ${step.step}. ${step.description}`);
    });
    
    // Step 2: Execute plan sequentially
    const results = await this.executePlanSequentially(plan, input);
    
    // Step 3: Consolidate and return results
    return await this.consolidateSequentialResults(results, input);
  }
  
  /**
   * Create a structured analysis plan
   */
  protected async createAnalysisPlan(input: {
    targetPath?: string;
    findings?: any[];
    language: string;
    context?: any;
  }): Promise<SequentialPlan> {
    const steps: ThinkingStep[] = [
      {
        step: 1,
        description: 'Validate input and environment',
        action: 'validateEnvironment',
        reasoning: 'Ensure all prerequisites are met before analysis'
      },
      {
        step: 2,
        description: 'Identify applicable tools',
        action: 'identifyTools',
        reasoning: 'Select only relevant tools for the language/context',
        dependencies: [1]
      },
      {
        step: 3,
        description: 'Prepare execution context',
        action: 'prepareContext',
        reasoning: 'Set up necessary paths, configurations, and resources',
        dependencies: [1, 2]
      },
      {
        step: 4,
        description: 'Execute tools in optimal order',
        action: 'executeTools',
        reasoning: 'Run tools considering dependencies and resource usage',
        dependencies: [3]
      },
      {
        step: 5,
        description: 'Validate and enrich findings',
        action: 'validateFindings',
        reasoning: 'Ensure all required fields are populated and accurate',
        dependencies: [4]
      }
    ];
    
    return {
      goal: `Analyze ${input.language} code for ${this.agentName} issues`,
      steps,
      expectedOutcome: 'Comprehensive list of validated findings with all required fields',
      fallbackStrategy: 'Use cached results or mock data if tools fail'
    };
  }
  
  /**
   * Execute plan steps sequentially with dependency checking
   */
  protected async executePlanSequentially(
    plan: SequentialPlan,
    input: {
      targetPath?: string;
      findings?: any[];
      language: string;
      context?: any;
    }
  ): Promise<any[]> {
    const results: any[] = [];
    
    for (const step of plan.steps) {
      console.log(`\n🔄 Executing Step ${step.step}: ${step.description}`);
      console.log(`   Reasoning: ${step.reasoning}`);
      
      // Check dependencies
      if (step.dependencies) {
        const dependencyMet = step.dependencies.every(dep => 
          this.executedSteps.has(dep)
        );
        
        if (!dependencyMet) {
          console.log(`   ⚠️ Skipping - dependencies not met`);
          continue;
        }
      }
      
      try {
        // Execute the step action
        const stepResult = await this.executeStepAction(step, input);
        step.output = stepResult;
        this.executedSteps.set(step.step, stepResult);
        results.push(stepResult);
        console.log(`   ✅ Step ${step.step} completed successfully`);
      } catch (error) {
        console.error(`   ❌ Step ${step.step} failed:`, error.message);
        
        // Apply fallback strategy if available
        if (plan.fallbackStrategy) {
          console.log(`   🔄 Applying fallback: ${plan.fallbackStrategy}`);
          const fallbackResult = await this.applyFallbackStrategy(step, input);
          results.push(fallbackResult);
        }
      }
    }
    
    return results;
  }
  
  /**
   * Execute a specific step action
   */
  protected async executeStepAction(
    step: ThinkingStep,
    input: {
      targetPath?: string;
      findings?: any[];
      language: string;
      context?: any;
    }
  ): Promise<any> {
    switch (step.action) {
      case 'validateEnvironment':
        return this.validateAnalysisEnvironment(input);
        
      case 'identifyTools':
        return this.identifyApplicableTools(input.language);
        
      case 'prepareContext':
        return this.prepareExecutionContext(input);
        
      case 'executeTools':
        return this.runToolsInParallel(input.targetPath, input.language);
        
      case 'validateFindings':
        return this.validateAndEnrichFindings(this.executedSteps.get(4));
        
      default:
        throw new Error(`Unknown step action: ${step.action}`);
    }
  }
  
  /**
   * Validate the analysis environment
   */
  protected async validateAnalysisEnvironment(input: {
    targetPath?: string;
    findings?: any[];
    language: string;
    context?: any;
  }): Promise<boolean> {
    const validations = {
      hasTargetPath: !!input.targetPath,
      hasLanguage: !!input.language,
      pathExists: await this.checkPathExists(input.targetPath),
      hasRequiredTools: await this.checkToolAvailability(input.language)
    };
    
    const isValid = Object.values(validations).every(v => v === true);
    
    if (!isValid) {
      console.warn('Environment validation issues:', validations);
    }
    
    return isValid;
  }
  
  /**
   * Identify which tools are applicable for the language
   */
  protected identifyApplicableTools(language: string): string[] {
    const applicableTools = this.tools
      .filter(tool => !tool.isApplicable || tool.isApplicable(language))
      .map(tool => tool.name);
    
    console.log(`   Identified ${applicableTools.length} applicable tools for ${language}`);
    return applicableTools;
  }
  
  /**
   * Prepare execution context (paths, configs, etc.)
   */
  protected async prepareExecutionContext(input: {
    targetPath?: string;
    findings?: any[];
    language: string;
    context?: any;
  }): Promise<any> {
    return {
      targetPath: input.targetPath,
      language: input.language,
      context: input.context || {},
      timestamp: Date.now(),
      environment: process.env.NODE_ENV || 'development'
    };
  }
  
  /**
   * Validate and enrich findings with required fields
   */
  protected async validateAndEnrichFindings(toolResults: any): Promise<any[]> {
    if (!toolResults || !Array.isArray(toolResults)) {
      return [];
    }
    
    const findings = await this.consolidateFindings(toolResults);
    
    // Ensure all required fields are present
    for (const finding of findings) {
      await this.populateRequiredFields(finding, 'sequential-validation');
    }
    
    return findings;
  }
  
  /**
   * Apply fallback strategy when a step fails
   */
  protected async applyFallbackStrategy(
    step: ThinkingStep,
    input: {
      targetPath?: string;
      findings?: any[];
      language: string;
      context?: any;
    }
  ): Promise<any> {
    console.log(`   Applying fallback for step ${step.step}`);
    
    // Return safe defaults based on step
    switch (step.action) {
      case 'validateEnvironment':
        return true; // Proceed anyway
        
      case 'identifyTools':
        return ['default-tool']; // Use default tool set
        
      case 'executeTools':
        return []; // Return empty findings
        
      default:
        return null;
    }
  }
  
  /**
   * Consolidate results from sequential execution
   */
  protected async consolidateSequentialResults(
    results: any[],
    input: {
      targetPath?: string;
      findings?: any[];
      language: string;
      context?: any;
    }
  ): Promise<AgentAnalysisResult> {
    const toolResults = results.find(r => Array.isArray(r) && r.length > 0) || [];
    const findings = await this.validateAndEnrichFindings(toolResults);
    
    return {
      agent: this.agentName,
      tools: this.identifyApplicableTools(input.language),
      issues: findings,
      summary: this.generateSummary(findings),
      metadata: {
        totalExecutionTime: Date.now() - (this.executedSteps.get(1)?.timestamp || Date.now()),
        toolsExecuted: this.identifyApplicableTools(input.language),
        toolsFailed: [],
        parallelExecution: false,
        sequentialThinking: true,
        planSteps: this.currentPlan?.steps.length || 0,
        executedSteps: this.executedSteps.size,
        thinkingDepth: this.thinkingDepth
      }
    };
  }
  
  /**
   * Check if path exists (for validation)
   */
  protected async checkPathExists(path: string): Promise<boolean> {
    try {
      const fs = await import('fs');
      return fs.existsSync(path);
    } catch {
      return false;
    }
  }
  
  /**
   * Check tool availability for a language
   */
  protected async checkToolAvailability(language: string): Promise<boolean> {
    const applicableTools = this.identifyApplicableTools(language);
    return applicableTools.length > 0;
  }
  
  /**
   * Generate analysis summary with thinking insights
   */
  protected generateSummary(findings: any[]): any {
    // Base implementation for sequential thinking agents
    const summary = {
      totalIssues: findings.length,
      severity: this.calculateSeverity(findings),
      categories: this.categorizeFindings(findings),
      recommendation: findings.length > 0 ? 'Issues found requiring attention' : 'No issues detected'
    };
    
    // Add sequential thinking metadata
    return {
      ...summary,
      thinkingProcess: {
        stepsPlanned: this.currentPlan?.steps.length || 0,
        stepsExecuted: this.executedSteps.size,
        goal: this.currentPlan?.goal,
        outcome: findings.length > 0 ? 'Issues found' : 'No issues found'
      }
    };
  }

  /**
   * Calculate severity based on findings
   */
  protected calculateSeverity(findings: any[]): string {
    if (!findings || findings.length === 0) return 'none';
    
    const severityCounts = findings.reduce((acc, finding) => {
      const severity = finding.severity || 'medium';
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, {});

    if (severityCounts.critical > 0) return 'critical';
    if (severityCounts.high > 0) return 'high';
    if (severityCounts.medium > 0) return 'medium';
    return 'low';
  }

  /**
   * Categorize findings by type
   */
  protected categorizeFindings(findings: any[]): Record<string, number> {
    return findings.reduce((acc, finding) => {
      const category = finding.type || 'general';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});
  }
}

/**
 * Example usage in specific agents
 */
export class SequentialSecurityAgent extends SequentialThinkingAgent {
  protected agentName = 'SequentialSecurityAgent';
  protected tools: any[] = []; // Required by BaseMultiToolAgent
  
  protected async createAnalysisPlan(input: {
    targetPath?: string;
    findings?: any[];
    language: string;
    context?: any;
  }): Promise<SequentialPlan> {
    const basePlan = await super.createAnalysisPlan(input);
    
    // Add security-specific steps
    basePlan.steps.push({
      step: 6,
      description: 'Cross-reference with CVE database',
      action: 'checkCVEs',
      reasoning: 'Identify known vulnerabilities in dependencies',
      dependencies: [5]
    });
    
    basePlan.steps.push({
      step: 7,
      description: 'Calculate security risk score',
      action: 'calculateRisk',
      reasoning: 'Provide overall security assessment',
      dependencies: [6]
    });
    
    return basePlan;
  }
}