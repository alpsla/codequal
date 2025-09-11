/**
 * Cost Tracker Service
 * Comprehensive cost tracking for all AI services and infrastructure
 */

export interface ModelPricing {
  inputPer1M: number;  // Cost per 1M input tokens
  outputPer1M: number; // Cost per 1M output tokens
  provider: string;
  tier?: string;
}

export interface ServiceCost {
  service: 'deepwiki' | 'openrouter' | 'anthropic' | 'openai' | 'redis' | 'supabase' | 'kubernetes';
  operation: string;
  timestamp: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  model?: string;
  cost: number;
  estimatedMonthly?: number;
  metadata?: Record<string, any>;
}

export interface CostSummary {
  daily: number;
  weekly: number;
  monthly: number;
  byService: Record<string, number>;
  byModel: Record<string, number>;
  projectedMonthly: number;
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
}

export class CostTrackerService {
  private static instance: CostTrackerService;
  
  // Model pricing as of 2025-08
  private readonly modelPricing: Record<string, ModelPricing> = {
    // OpenAI Models
    'gpt-4o': { inputPer1M: 2.50, outputPer1M: 10.00, provider: 'openai' },
    'gpt-4o-2024-08-06': { inputPer1M: 2.50, outputPer1M: 10.00, provider: 'openai' },
    'gpt-4o-mini': { inputPer1M: 0.15, outputPer1M: 0.60, provider: 'openai' },
    'gpt-4-turbo': { inputPer1M: 10.00, outputPer1M: 30.00, provider: 'openai' },
    'gpt-4': { inputPer1M: 30.00, outputPer1M: 60.00, provider: 'openai' },
    'gpt-3.5-turbo': { inputPer1M: 0.50, outputPer1M: 1.50, provider: 'openai' },
    
    // Anthropic Models
    'claude-3.5-sonnet': { inputPer1M: 3.00, outputPer1M: 15.00, provider: 'anthropic' },
    'claude-3-opus': { inputPer1M: 15.00, outputPer1M: 75.00, provider: 'anthropic' },
    'claude-3-sonnet': { inputPer1M: 3.00, outputPer1M: 15.00, provider: 'anthropic' },
    'claude-3-haiku': { inputPer1M: 0.25, outputPer1M: 1.25, provider: 'anthropic' },
    
    // Google Models
    'gemini-1.5-pro': { inputPer1M: 3.50, outputPer1M: 10.50, provider: 'google' },
    'gemini-1.5-flash': { inputPer1M: 0.075, outputPer1M: 0.30, provider: 'google' },
    
    // Open Source Models (via OpenRouter)
    'mixtral-8x7b': { inputPer1M: 0.27, outputPer1M: 0.27, provider: 'openrouter' },
    'llama-3.1-70b': { inputPer1M: 0.88, outputPer1M: 0.88, provider: 'openrouter' },
    'llama-3.1-8b': { inputPer1M: 0.06, outputPer1M: 0.06, provider: 'openrouter' },
    
    // DeepWiki Internal (estimated)
    'deepwiki-analysis': { inputPer1M: 2.00, outputPer1M: 2.00, provider: 'deepwiki' }
  };
  
  // Infrastructure costs (monthly estimates)
  private readonly infrastructureCosts = {
    redis: {
      base: 15.00, // DigitalOcean Redis
      perGbStorage: 10.00,
      perMillionOps: 0.10
    },
    supabase: {
      base: 25.00, // Pro plan
      perGbStorage: 0.125,
      perMillionRequests: 2.00
    },
    kubernetes: {
      nodePerHour: 0.10, // DigitalOcean K8s
      storagePerGb: 0.10,
      networkPerGb: 0.01
    },
    deepwiki: {
      podPerHour: 0.05, // Estimated pod cost
      gpuPerHour: 0.50  // If GPU enabled
    }
  };
  
  private costs: ServiceCost[] = [];
  private startTime: number;
  
  private constructor() {
    this.startTime = Date.now();
  }
  
  public static getInstance(): CostTrackerService {
    if (!CostTrackerService.instance) {
      CostTrackerService.instance = new CostTrackerService();
    }
    return CostTrackerService.instance;
  }
  
  /**
   * Track AI model usage
   */
  public trackModelUsage(
    model: string,
    inputTokens: number,
    outputTokens: number,
    operation: string,
    metadata?: Record<string, any>
  ): ServiceCost {
    const cost = this.calculateModelCost(model, inputTokens, outputTokens);
    
    const serviceCost: ServiceCost = {
      service: this.getServiceFromModel(model),
      operation,
      timestamp: Date.now(),
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      model,
      cost,
      estimatedMonthly: this.estimateMonthlyFromUsage(cost),
      metadata
    };
    
    this.costs.push(serviceCost);
    return serviceCost;
  }
  
  /**
   * Track DeepWiki analysis cost
   */
  public trackDeepWikiAnalysis(
    repository: string,
    estimatedTokens: number,
    duration: number,
    cached = false
  ): ServiceCost {
    // If cached, cost is minimal (just compute)
    const cost = cached ? 0.001 : this.calculateModelCost('deepwiki-analysis', estimatedTokens, estimatedTokens);
    
    const serviceCost: ServiceCost = {
      service: 'deepwiki',
      operation: 'analyze',
      timestamp: Date.now(),
      totalTokens: estimatedTokens * 2, // Rough estimate for input + output
      model: 'deepwiki-analysis',
      cost,
      metadata: {
        repository,
        duration,
        cached,
        podCost: (duration / 3600000) * this.infrastructureCosts.deepwiki.podPerHour
      }
    };
    
    this.costs.push(serviceCost);
    return serviceCost;
  }
  
  /**
   * Track infrastructure usage
   */
  public trackInfrastructureUsage(
    service: 'redis' | 'supabase' | 'kubernetes',
    operation: string,
    usage: {
      requests?: number;
      storage?: number; // GB
      network?: number; // GB
      duration?: number; // ms
    }
  ): ServiceCost {
    let cost = 0;
    
    switch (service) {
      case 'redis':
        cost = (usage.requests || 0) / 1_000_000 * this.infrastructureCosts.redis.perMillionOps;
        break;
        
      case 'supabase':
        cost = (usage.requests || 0) / 1_000_000 * this.infrastructureCosts.supabase.perMillionRequests;
        if (usage.storage) {
          cost += usage.storage * this.infrastructureCosts.supabase.perGbStorage / 30; // Daily cost
        }
        break;
        
      case 'kubernetes':
        if (usage.duration) {
          cost = (usage.duration / 3600000) * this.infrastructureCosts.kubernetes.nodePerHour;
        }
        if (usage.network) {
          cost += usage.network * this.infrastructureCosts.kubernetes.networkPerGb;
        }
        break;
    }
    
    const serviceCost: ServiceCost = {
      service,
      operation,
      timestamp: Date.now(),
      cost,
      metadata: usage
    };
    
    this.costs.push(serviceCost);
    return serviceCost;
  }
  
  /**
   * Calculate model cost
   */
  private calculateModelCost(model: string, inputTokens: number, outputTokens: number): number {
    // Find the best matching model pricing
    const modelKey = Object.keys(this.modelPricing).find(key => 
      model.toLowerCase().includes(key.toLowerCase()) ||
      key.toLowerCase().includes(model.toLowerCase())
    );
    
    const pricing = modelKey ? this.modelPricing[modelKey] : this.modelPricing['gpt-4o-mini'];
    
    const inputCost = (inputTokens / 1_000_000) * pricing.inputPer1M;
    const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M;
    
    return inputCost + outputCost;
  }
  
  /**
   * Get service from model name
   */
  private getServiceFromModel(model: string): 'openai' | 'anthropic' | 'openrouter' | 'deepwiki' {
    if (model.includes('gpt')) return 'openai';
    if (model.includes('claude')) return 'anthropic';
    if (model.includes('deepwiki')) return 'deepwiki';
    return 'openrouter';
  }
  
  /**
   * Estimate monthly cost from current usage
   */
  private estimateMonthlyFromUsage(currentCost: number): number {
    const hoursRunning = (Date.now() - this.startTime) / 3600000;
    const dailyRate = (currentCost / hoursRunning) * 24;
    return dailyRate * 30;
  }
  
  /**
   * Get cost summary
   */
  public getCostSummary(): CostSummary {
    const now = Date.now();
    const dayAgo = now - 86400000;
    const weekAgo = now - 604800000;
    const monthAgo = now - 2592000000;
    
    // Calculate costs by period
    const daily = this.costs
      .filter(c => c.timestamp > dayAgo)
      .reduce((sum, c) => sum + c.cost, 0);
      
    const weekly = this.costs
      .filter(c => c.timestamp > weekAgo)
      .reduce((sum, c) => sum + c.cost, 0);
      
    const monthly = this.costs
      .filter(c => c.timestamp > monthAgo)
      .reduce((sum, c) => sum + c.cost, 0);
    
    // Calculate by service
    const byService: Record<string, number> = {};
    const byModel: Record<string, number> = {};
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    
    this.costs.forEach(c => {
      byService[c.service] = (byService[c.service] || 0) + c.cost;
      
      if (c.model) {
        byModel[c.model] = (byModel[c.model] || 0) + c.cost;
      }
      
      totalInputTokens += c.inputTokens || 0;
      totalOutputTokens += c.outputTokens || 0;
    });
    
    // Project monthly cost based on daily average
    const daysRunning = Math.max(1, (now - this.startTime) / 86400000);
    const dailyAverage = this.costs.reduce((sum, c) => sum + c.cost, 0) / daysRunning;
    const projectedMonthly = dailyAverage * 30;
    
    // Add fixed infrastructure costs
    const fixedMonthly = 
      this.infrastructureCosts.redis.base +
      this.infrastructureCosts.supabase.base +
      (this.infrastructureCosts.kubernetes.nodePerHour * 24 * 30); // 1 node running
    
    return {
      daily,
      weekly,
      monthly,
      byService,
      byModel,
      projectedMonthly: projectedMonthly + fixedMonthly,
      tokensUsed: {
        input: totalInputTokens,
        output: totalOutputTokens,
        total: totalInputTokens + totalOutputTokens
      }
    };
  }
  
  /**
   * Get cost breakdown for specific analysis
   */
  public getAnalysisCostBreakdown(repositoryUrl: string): {
    total: number;
    deepwiki: number;
    locationFinding: number;
    reporting: number;
    infrastructure: number;
  } {
    const analysisCosts = this.costs.filter(c => 
      c.metadata?.repository === repositoryUrl ||
      c.metadata?.repositoryUrl === repositoryUrl
    );
    
    const deepwiki = analysisCosts
      .filter(c => c.service === 'deepwiki')
      .reduce((sum, c) => sum + c.cost, 0);
      
    const locationFinding = analysisCosts
      .filter(c => c.operation.includes('location') || c.operation.includes('clarify'))
      .reduce((sum, c) => sum + c.cost, 0);
      
    const reporting = analysisCosts
      .filter(c => c.operation.includes('report') || c.operation.includes('generate'))
      .reduce((sum, c) => sum + c.cost, 0);
      
    const infrastructure = analysisCosts
      .filter(c => ['redis', 'supabase', 'kubernetes'].includes(c.service))
      .reduce((sum, c) => sum + c.cost, 0);
    
    return {
      total: deepwiki + locationFinding + reporting + infrastructure,
      deepwiki,
      locationFinding,
      reporting,
      infrastructure
    };
  }
  
  /**
   * Generate cost report
   */
  public generateCostReport(): string {
    const summary = this.getCostSummary();
    const topModels = Object.entries(summary.byModel)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    return `
📊 CodeQual Cost Report
========================

💰 Cost Summary:
  Daily:    $${summary.daily.toFixed(3)}
  Weekly:   $${summary.weekly.toFixed(3)}
  Monthly:  $${summary.monthly.toFixed(3)}
  
📈 Projected Monthly: $${summary.projectedMonthly.toFixed(2)}

🔧 By Service:
${Object.entries(summary.byService)
  .sort((a, b) => b[1] - a[1])
  .map(([service, cost]) => `  ${service}: $${cost.toFixed(3)}`)
  .join('\n')}

🤖 Top Models by Cost:
${topModels
  .map(([model, cost]) => `  ${model}: $${cost.toFixed(3)}`)
  .join('\n')}

📊 Token Usage:
  Input:  ${summary.tokensUsed.input.toLocaleString()}
  Output: ${summary.tokensUsed.output.toLocaleString()}
  Total:  ${summary.tokensUsed.total.toLocaleString()}

💡 Cost Optimization Tips:
${this.generateOptimizationTips(summary)}
`;
  }
  
  /**
   * Generate optimization tips based on usage
   */
  private generateOptimizationTips(summary: CostSummary): string {
    const tips: string[] = [];
    
    // Check if using expensive models too much
    if (summary.byModel['gpt-4'] || summary.byModel['claude-3-opus']) {
      tips.push('• Consider using gpt-4o-mini or claude-3-haiku for simpler tasks');
    }
    
    // Check token usage
    if (summary.tokensUsed.total > 1_000_000) {
      tips.push('• Implement response caching to reduce redundant API calls');
      tips.push('• Use embeddings search instead of full context for large documents');
    }
    
    // Check DeepWiki usage
    if (summary.byService['deepwiki'] > summary.daily * 0.5) {
      tips.push('• Enable Redis caching for DeepWiki responses');
      tips.push('• Batch analyze multiple PRs from same repository');
    }
    
    // Infrastructure optimization
    if (summary.projectedMonthly > 100) {
      tips.push('• Consider reserved instances for Kubernetes nodes');
      tips.push('• Optimize Supabase queries to reduce request count');
    }
    
    return tips.length > 0 ? tips.join('\n') : '  All costs are within optimal ranges';
  }
  
  /**
   * Export costs to CSV
   */
  public exportToCSV(): string {
    const headers = ['Timestamp', 'Service', 'Operation', 'Model', 'Input Tokens', 'Output Tokens', 'Cost', 'Repository'];
    
    const rows = this.costs.map(c => [
      new Date(c.timestamp).toISOString(),
      c.service,
      c.operation,
      c.model || '',
      c.inputTokens || '',
      c.outputTokens || '',
      c.cost.toFixed(6),
      c.metadata?.repository || c.metadata?.repositoryUrl || ''
    ]);
    
    return [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
  }
  
  /**
   * Clear old cost data
   */
  public clearOldData(daysToKeep = 30): number {
    const cutoff = Date.now() - (daysToKeep * 86400000);
    const before = this.costs.length;
    
    this.costs = this.costs.filter(c => c.timestamp > cutoff);
    
    return before - this.costs.length;
  }
}

// Export singleton
export const costTracker = CostTrackerService.getInstance();