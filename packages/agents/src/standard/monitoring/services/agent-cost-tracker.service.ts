/**
 * Agent Cost Tracker Service
 * Tracks costs for all AI agents with dynamic model selection
 */

export type AgentRole = 
  | 'orchestrator'
  | 'researcher' 
  | 'deepwiki'
  | 'comparator'
  | 'location-validator'
  | 'educator'
  | 'report-generator';

export type ModelTier = 'primary' | 'fallback' | 'emergency';

export interface ModelSelection {
  model: string;
  tier: ModelTier;
  reason?: string; // Why this model was selected
}

export interface AgentModelConfig {
  role: AgentRole;
  language?: string; // Programming language being analyzed
  repositorySize?: 'small' | 'medium' | 'large' | 'enterprise';
  complexity?: 'low' | 'medium' | 'high';
  primaryModel: string;
  fallbackModels: string[];
  selectionCriteria?: Record<string, any>;
}

export interface AgentActivity {
  agentRole: AgentRole;
  operation: string;
  timestamp: number;
  repositoryUrl: string;
  prNumber?: string;
  language?: string;
  modelUsed: ModelSelection;
  inputTokens: number;
  outputTokens: number;
  duration: number;
  success: boolean;
  retries?: number;
  cost: number;
  metadata?: Record<string, any>;
}

export interface AgentCostSummary {
  role: AgentRole;
  totalCalls: number;
  totalCost: number;
  averageCost: number;
  totalTokens: number;
  successRate: number;
  modelDistribution: Record<string, number>; // model -> usage count
  languageDistribution?: Record<string, number>; // language -> usage count
  averageDuration: number;
  costByModel: Record<string, number>;
}

export class AgentCostTrackerService {
  private static instance: AgentCostTrackerService;
  
  // Agent-specific model configurations based on language and size
  private agentConfigs: Record<AgentRole, AgentModelConfig[]> = {
    orchestrator: [
      {
        role: 'orchestrator',
        primaryModel: 'gpt-4o',
        fallbackModels: ['gpt-4o-mini', 'gpt-3.5-turbo'],
        // Orchestrator is language-agnostic
      }
    ],
    
    researcher: [
      {
        role: 'researcher',
        primaryModel: 'gpt-4o',
        fallbackModels: ['claude-3.5-sonnet', 'gpt-4o-mini'],
        // Researcher needs high quality for architecture understanding
      }
    ],
    
    deepwiki: [
      // JavaScript/TypeScript
      {
        role: 'deepwiki',
        language: 'javascript',
        repositorySize: 'small',
        primaryModel: 'gpt-4o-mini',
        fallbackModels: ['gpt-3.5-turbo'],
      },
      {
        role: 'deepwiki',
        language: 'javascript',
        repositorySize: 'large',
        primaryModel: 'gpt-4o',
        fallbackModels: ['gpt-4-turbo'],
      },
      {
        role: 'deepwiki',
        language: 'typescript',
        repositorySize: 'small',
        primaryModel: 'gpt-4o-mini',
        fallbackModels: ['gpt-3.5-turbo'],
      },
      {
        role: 'deepwiki',
        language: 'typescript',
        repositorySize: 'large',
        primaryModel: 'gpt-4o',
        fallbackModels: ['claude-3.5-sonnet'],
      },
      
      // Python
      {
        role: 'deepwiki',
        language: 'python',
        repositorySize: 'small',
        primaryModel: 'gpt-4o-mini',
        fallbackModels: ['claude-3-haiku'],
      },
      {
        role: 'deepwiki',
        language: 'python',
        repositorySize: 'large',
        primaryModel: 'gpt-4o',
        fallbackModels: ['claude-3.5-sonnet'],
      },
      
      // Go
      {
        role: 'deepwiki',
        language: 'go',
        primaryModel: 'gpt-4o',
        fallbackModels: ['gpt-4o-mini'],
      },
      
      // Rust
      {
        role: 'deepwiki',
        language: 'rust',
        primaryModel: 'gpt-4o',
        fallbackModels: ['claude-3.5-sonnet'],
        // Rust needs strong type understanding
      },
      
      // Java
      {
        role: 'deepwiki',
        language: 'java',
        repositorySize: 'enterprise',
        primaryModel: 'gpt-4o',
        fallbackModels: ['gpt-4-turbo'],
      },
      
      // Default fallback
      {
        role: 'deepwiki',
        primaryModel: 'gpt-4o-mini',
        fallbackModels: ['gpt-3.5-turbo'],
      }
    ],
    
    comparator: [
      // Small diffs
      {
        role: 'comparator',
        complexity: 'low',
        primaryModel: 'gpt-4o-mini',
        fallbackModels: ['gpt-3.5-turbo'],
      },
      // Complex diffs
      {
        role: 'comparator',
        complexity: 'high',
        primaryModel: 'gpt-4o',
        fallbackModels: ['claude-3.5-sonnet'],
      },
      // Language-specific comparisons
      {
        role: 'comparator',
        language: 'rust',
        primaryModel: 'claude-3.5-sonnet', // Better for Rust lifetimes
        fallbackModels: ['gpt-4o'],
      },
      {
        role: 'comparator',
        language: 'typescript',
        primaryModel: 'gpt-4o',
        fallbackModels: ['gpt-4o-mini'],
      }
    ],
    
    'location-validator': [
      // Fast validation for simple languages
      {
        role: 'location-validator',
        language: 'javascript',
        primaryModel: 'gpt-4o-mini',
        fallbackModels: ['gpt-3.5-turbo'],
      },
      // Complex type systems need better models
      {
        role: 'location-validator',
        language: 'typescript',
        primaryModel: 'gpt-4o',
        fallbackModels: ['gpt-4o-mini'],
      },
      {
        role: 'location-validator',
        language: 'rust',
        primaryModel: 'gpt-4o',
        fallbackModels: ['claude-3.5-sonnet'],
      },
      // Python with type hints
      {
        role: 'location-validator',
        language: 'python',
        complexity: 'high',
        primaryModel: 'gpt-4o',
        fallbackModels: ['claude-3-haiku'],
      },
      // Default
      {
        role: 'location-validator',
        primaryModel: 'gpt-4o-mini',
        fallbackModels: ['gpt-3.5-turbo'],
      }
    ],
    
    educator: [
      // Educational content needs clarity
      {
        role: 'educator',
        primaryModel: 'claude-3.5-sonnet', // Best for explanations
        fallbackModels: ['gpt-4o', 'gpt-4o-mini'],
      }
    ],
    
    'report-generator': [
      {
        role: 'report-generator',
        primaryModel: 'gpt-4o-mini', // Reports are templated, don't need expensive models
        fallbackModels: ['gpt-3.5-turbo'],
      }
    ]
  };
  
  // Actual activities tracking
  private activities: AgentActivity[] = [];
  
  // Model pricing (per 1M tokens)
  private modelPricing: Record<string, { input: number; output: number }> = {
    // OpenAI
    'gpt-4o': { input: 2.50, output: 10.00 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-4-turbo': { input: 10.00, output: 30.00 },
    'gpt-4': { input: 30.00, output: 60.00 },
    'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
    
    // Anthropic
    'claude-3.5-sonnet': { input: 3.00, output: 15.00 },
    'claude-3-opus': { input: 15.00, output: 75.00 },
    'claude-3-haiku': { input: 0.25, output: 1.25 },
    
    // Google
    'gemini-1.5-pro': { input: 3.50, output: 10.50 },
    'gemini-1.5-flash': { input: 0.075, output: 0.30 },
    
    // Default
    'unknown': { input: 1.00, output: 1.00 }
  };
  
  // Language detection patterns
  private languagePatterns: Record<string, string[]> = {
    javascript: ['.js', '.jsx', '.mjs'],
    typescript: ['.ts', '.tsx', '.d.ts'],
    python: ['.py', '.pyi'],
    rust: ['.rs'],
    go: ['.go'],
    java: ['.java'],
    csharp: ['.cs'],
    cpp: ['.cpp', '.cc', '.cxx', '.hpp'],
    ruby: ['.rb'],
    php: ['.php'],
    swift: ['.swift'],
    kotlin: ['.kt'],
  };
  
  private constructor() {
    // Singleton pattern
  }
  
  public static getInstance(): AgentCostTrackerService {
    if (!AgentCostTrackerService.instance) {
      AgentCostTrackerService.instance = new AgentCostTrackerService();
    }
    return AgentCostTrackerService.instance;
  }
  
  /**
   * Track an agent activity with automatic model selection
   */
  public trackAgentActivity(params: {
    agentRole: AgentRole;
    operation: string;
    repositoryUrl: string;
    prNumber?: string;
    language?: string;
    repositorySize?: 'small' | 'medium' | 'large' | 'enterprise';
    complexity?: 'low' | 'medium' | 'high';
    modelUsed: string;
    modelTier: ModelTier;
    inputTokens: number;
    outputTokens: number;
    duration: number;
    success: boolean;
    retries?: number;
    metadata?: Record<string, any>;
  }): AgentActivity {
    // Detect language if not provided
    const detectedLanguage = params.language || this.detectLanguage(params.repositoryUrl);
    
    // Calculate cost
    const cost = this.calculateCost(params.modelUsed, params.inputTokens, params.outputTokens);
    
    // Create activity record
    const activity: AgentActivity = {
      agentRole: params.agentRole,
      operation: params.operation,
      timestamp: Date.now(),
      repositoryUrl: params.repositoryUrl,
      prNumber: params.prNumber,
      language: detectedLanguage,
      modelUsed: {
        model: params.modelUsed,
        tier: params.modelTier,
        reason: params.metadata?.selectionReason
      },
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      duration: params.duration,
      success: params.success,
      retries: params.retries,
      cost,
      metadata: params.metadata
    };
    
    this.activities.push(activity);
    
    // Trim old activities if too many
    if (this.activities.length > 10000) {
      this.activities = this.activities.slice(-5000);
    }
    
    return activity;
  }
  
  /**
   * Get model configuration for an agent
   */
  public getModelConfig(
    role: AgentRole,
    language?: string,
    size?: 'small' | 'medium' | 'large' | 'enterprise',
    complexity?: 'low' | 'medium' | 'high'
  ): AgentModelConfig | undefined {
    const configs = this.agentConfigs[role] || [];
    
    // Find best matching config
    let bestMatch = configs.find(c => 
      (!c.language || c.language === language) &&
      (!c.repositorySize || c.repositorySize === size) &&
      (!c.complexity || c.complexity === complexity)
    );
    
    // Fallback to language match
    if (!bestMatch && language) {
      bestMatch = configs.find(c => c.language === language);
    }
    
    // Fallback to default
    if (!bestMatch) {
      bestMatch = configs.find(c => !c.language && !c.repositorySize && !c.complexity);
    }
    
    return bestMatch || configs[0];
  }
  
  /**
   * Calculate cost for model usage
   */
  private calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = this.modelPricing[model] || this.modelPricing['unknown'];
    return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
  }
  
  /**
   * Detect programming language from repository
   */
  private detectLanguage(repositoryUrl: string): string | undefined {
    // Simple detection based on common patterns
    // In real implementation, this would analyze file extensions
    if (repositoryUrl.includes('typescript') || repositoryUrl.includes('ts')) {
      return 'typescript';
    }
    if (repositoryUrl.includes('python') || repositoryUrl.includes('py')) {
      return 'python';
    }
    if (repositoryUrl.includes('rust') || repositoryUrl.includes('rs')) {
      return 'rust';
    }
    if (repositoryUrl.includes('go') || repositoryUrl.includes('golang')) {
      return 'go';
    }
    return 'javascript'; // Default
  }
  
  /**
   * Get cost summary by agent
   */
  public getAgentCostSummary(): Record<AgentRole, AgentCostSummary> {
    const summaries: Record<string, AgentCostSummary> = {};
    
    // Group activities by agent role
    const agentGroups = this.activities.reduce((acc, activity) => {
      if (!acc[activity.agentRole]) {
        acc[activity.agentRole] = [];
      }
      acc[activity.agentRole].push(activity);
      return acc;
    }, {} as Record<string, AgentActivity[]>);
    
    // Calculate summaries for each agent
    Object.entries(agentGroups).forEach(([role, activities]) => {
      const successfulActivities = activities.filter(a => a.success);
      
      // Model distribution
      const modelDistribution: Record<string, number> = {};
      const costByModel: Record<string, number> = {};
      const languageDistribution: Record<string, number> = {};
      
      activities.forEach(activity => {
        // Model usage
        modelDistribution[activity.modelUsed.model] = 
          (modelDistribution[activity.modelUsed.model] || 0) + 1;
        
        // Cost by model
        costByModel[activity.modelUsed.model] = 
          (costByModel[activity.modelUsed.model] || 0) + activity.cost;
        
        // Language distribution
        if (activity.language) {
          languageDistribution[activity.language] = 
            (languageDistribution[activity.language] || 0) + 1;
        }
      });
      
      summaries[role] = {
        role: role as AgentRole,
        totalCalls: activities.length,
        totalCost: activities.reduce((sum, a) => sum + a.cost, 0),
        averageCost: activities.length > 0 
          ? activities.reduce((sum, a) => sum + a.cost, 0) / activities.length 
          : 0,
        totalTokens: activities.reduce((sum, a) => sum + a.inputTokens + a.outputTokens, 0),
        successRate: activities.length > 0 
          ? successfulActivities.length / activities.length 
          : 0,
        modelDistribution,
        languageDistribution: Object.keys(languageDistribution).length > 0 
          ? languageDistribution 
          : undefined,
        averageDuration: activities.length > 0
          ? activities.reduce((sum, a) => sum + a.duration, 0) / activities.length
          : 0,
        costByModel
      };
    });
    
    return summaries as Record<AgentRole, AgentCostSummary>;
  }
  
  /**
   * Get detailed analysis cost breakdown
   */
  public getAnalysisCostBreakdown(repositoryUrl: string, prNumber?: string): {
    total: number;
    byAgent: Record<AgentRole, number>;
    byModel: Record<string, number>;
    byOperation: Record<string, number>;
    timeline: Array<{ timestamp: number; agent: AgentRole; cost: number }>;
    language?: string;
    modelSelections: Array<{ agent: AgentRole; model: string; tier: ModelTier }>;
  } {
    // Filter activities for this analysis
    const analysisActivities = this.activities.filter(a => 
      a.repositoryUrl === repositoryUrl &&
      (!prNumber || a.prNumber === prNumber)
    );
    
    // Calculate breakdowns
    const byAgent: Record<string, number> = {};
    const byModel: Record<string, number> = {};
    const byOperation: Record<string, number> = {};
    const timeline: Array<{ timestamp: number; agent: AgentRole; cost: number }> = [];
    const modelSelections: Array<{ agent: AgentRole; model: string; tier: ModelTier }> = [];
    
    let detectedLanguage: string | undefined;
    
    analysisActivities.forEach(activity => {
      // By agent
      byAgent[activity.agentRole] = (byAgent[activity.agentRole] || 0) + activity.cost;
      
      // By model
      byModel[activity.modelUsed.model] = (byModel[activity.modelUsed.model] || 0) + activity.cost;
      
      // By operation
      byOperation[activity.operation] = (byOperation[activity.operation] || 0) + activity.cost;
      
      // Timeline
      timeline.push({
        timestamp: activity.timestamp,
        agent: activity.agentRole,
        cost: activity.cost
      });
      
      // Track model selections
      const existingSelection = modelSelections.find(s => 
        s.agent === activity.agentRole && 
        s.model === activity.modelUsed.model
      );
      
      if (!existingSelection) {
        modelSelections.push({
          agent: activity.agentRole,
          model: activity.modelUsed.model,
          tier: activity.modelUsed.tier
        });
      }
      
      // Detect language
      if (activity.language && !detectedLanguage) {
        detectedLanguage = activity.language;
      }
    });
    
    const total = analysisActivities.reduce((sum, a) => sum + a.cost, 0);
    
    return {
      total,
      byAgent: byAgent as Record<AgentRole, number>,
      byModel,
      byOperation,
      timeline: timeline.sort((a, b) => a.timestamp - b.timestamp),
      language: detectedLanguage,
      modelSelections
    };
  }
  
  /**
   * Generate agent cost report
   */
  public generateAgentCostReport(): string {
    const agentSummaries = this.getAgentCostSummary();
    const totalCost = Object.values(agentSummaries).reduce((sum, s) => sum + s.totalCost, 0);
    const totalCalls = Object.values(agentSummaries).reduce((sum, s) => sum + s.totalCalls, 0);
    
    let report = `
🤖 CodeQual Agent Cost Report
================================

📊 Overall Statistics:
  Total Cost: $${totalCost.toFixed(3)}
  Total API Calls: ${totalCalls}
  Active Agents: ${Object.keys(agentSummaries).length}

💰 Cost by Agent:
`;
    
    // Sort agents by cost
    const sortedAgents = Object.entries(agentSummaries)
      .sort((a, b) => b[1].totalCost - a[1].totalCost);
    
    sortedAgents.forEach(([role, summary]) => {
      report += `
  ${this.getAgentEmoji(role as AgentRole)} ${role.toUpperCase()}:
    Total Cost: $${summary.totalCost.toFixed(3)}
    Calls: ${summary.totalCalls}
    Avg Cost: $${summary.averageCost.toFixed(4)}
    Success Rate: ${(summary.successRate * 100).toFixed(1)}%
    Avg Duration: ${(summary.averageDuration / 1000).toFixed(1)}s
    
    Models Used:
${Object.entries(summary.modelDistribution)
  .sort((a, b) => b[1] - a[1])
  .map(([model, count]) => `      - ${model}: ${count} calls ($${(summary.costByModel[model] || 0).toFixed(3)})`)
  .join('\n')}
`;
      
      if (summary.languageDistribution) {
        report += `    
    Languages Analyzed:
${Object.entries(summary.languageDistribution)
  .sort((a, b) => b[1] - a[1])
  .map(([lang, count]) => `      - ${lang}: ${count} analyses`)
  .join('\n')}
`;
      }
    });
    
    // Add optimization recommendations
    report += `
🎯 Optimization Recommendations:
${this.generateAgentOptimizationTips(agentSummaries)}
`;
    
    return report;
  }
  
  /**
   * Generate optimization tips for agents
   */
  private generateAgentOptimizationTips(summaries: Record<AgentRole, AgentCostSummary>): string {
    const tips: string[] = [];
    
    // Check for expensive agents
    Object.entries(summaries).forEach(([role, summary]) => {
      if (summary.averageCost > 0.10) {
        tips.push(`• ${role}: Consider using cheaper models for simple tasks (avg cost: $${summary.averageCost.toFixed(3)})`);
      }
      
      if (summary.successRate < 0.8) {
        tips.push(`• ${role}: Low success rate (${(summary.successRate * 100).toFixed(1)}%) - investigate failures`);
      }
      
      // Check for model tier usage
      const expensiveModels = ['gpt-4', 'gpt-4-turbo', 'claude-3-opus'];
      const expensiveUsage = Object.entries(summary.modelDistribution)
        .filter(([model]) => expensiveModels.some(em => model.includes(em)))
        .reduce((sum, [, count]) => sum + count, 0);
      
      if (expensiveUsage > summary.totalCalls * 0.3) {
        tips.push(`• ${role}: Using expensive models for ${((expensiveUsage / summary.totalCalls) * 100).toFixed(0)}% of calls`);
      }
    });
    
    // Language-specific optimizations
    const deepwikiSummary = summaries['deepwiki'];
    if (deepwikiSummary?.languageDistribution) {
      Object.entries(deepwikiSummary.languageDistribution).forEach(([lang, count]) => {
        if (lang === 'rust' || lang === 'cpp') {
          tips.push(`• Complex language (${lang}): Consider caching results more aggressively`);
        }
      });
    }
    
    // General tips
    const totalCost = Object.values(summaries).reduce((sum, s) => sum + s.totalCost, 0);
    if (totalCost > 10) {
      tips.push('• Enable Redis caching to reduce duplicate analyses');
      tips.push('• Batch analyze PRs from the same repository');
    }
    
    return tips.length > 0 ? tips.join('\n') : '  All agents operating efficiently';
  }
  
  /**
   * Get emoji for agent role
   */
  private getAgentEmoji(role: AgentRole): string {
    const emojis: Record<AgentRole, string> = {
      orchestrator: '🎭',
      researcher: '🔬',
      deepwiki: '🌊',
      comparator: '⚖️',
      'location-validator': '📍',
      educator: '📚',
      'report-generator': '📄'
    };
    return emojis[role] || '🤖';
  }
  
  /**
   * Export agent activities to CSV
   */
  public exportToCSV(): string {
    const headers = [
      'Timestamp',
      'Agent',
      'Operation',
      'Repository',
      'PR',
      'Language',
      'Model',
      'Tier',
      'Input Tokens',
      'Output Tokens',
      'Duration (ms)',
      'Success',
      'Cost'
    ];
    
    const rows = this.activities.map(a => [
      new Date(a.timestamp).toISOString(),
      a.agentRole,
      a.operation,
      a.repositoryUrl,
      a.prNumber || '',
      a.language || '',
      a.modelUsed.model,
      a.modelUsed.tier,
      a.inputTokens,
      a.outputTokens,
      a.duration,
      a.success,
      a.cost.toFixed(6)
    ]);
    
    return [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
  }
}

// Export singleton
export const agentCostTracker = AgentCostTrackerService.getInstance();