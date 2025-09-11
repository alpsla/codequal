/**
 * Model Usage Analytics Service
 * 
 * Provides comprehensive analytics for model usage patterns to optimize costs
 * and performance by identifying opportunities to switch to cheaper models.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '@codequal/core/utils';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
const envPath = path.resolve(__dirname, '../../../../../../.env');
dotenv.config({ path: envPath });

const logger = createLogger('ModelUsageAnalytics');

// Create supabase client with lazy initialization
let supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!url || !key) {
      logger.warn('Supabase credentials not found. Analytics will not be available.');
      // Return a mock client that returns empty data
      return {
        from: () => ({
          select: () => Promise.resolve({ data: [], error: null }),
          insert: () => Promise.resolve({ data: null, error: null })
        })
      } as any;
    }
    
    supabase = createClient(url, key);
  }
  return supabase;
}

/**
 * Model performance metrics for optimization decisions
 */
export interface ModelPerformanceMetrics {
  agent: string;
  operation: string;
  model: string;
  totalCalls: number;
  successRate: number;
  avgDuration: number;
  avgInputTokens: number;
  avgOutputTokens: number;
  totalCost: number;
  avgCostPerCall: number;
  errorRate: number;
  avgRetries: number;
}

/**
 * Model optimization recommendation
 */
export interface ModelOptimizationRecommendation {
  agent: string;
  operation: string;
  currentModel: string;
  currentCostPerMonth: number;
  recommendedModel: string;
  projectedCostPerMonth: number;
  potentialSavings: number;
  savingsPercentage: number;
  qualityImpact: 'minimal' | 'moderate' | 'significant';
  reasoning: string[];
}

/**
 * Agent-specific model usage pattern
 */
export interface AgentModelUsagePattern {
  agent: string;
  modelsUsed: {
    model: string;
    frequency: number;
    percentage: number;
    totalCost: number;
    avgTokensPerCall: number;
  }[];
  topOperations: {
    operation: string;
    callCount: number;
    dominantModel: string;
    avgDuration: number;
    totalCost: number;
  }[];
  monthlyTrend: {
    month: string;
    totalCalls: number;
    totalCost: number;
    avgCostPerCall: number;
  }[];
}

export class ModelUsageAnalyticsService {
  /**
   * Get model performance metrics grouped by agent and operation
   */
  async getModelPerformanceMetrics(
    startDate?: Date,
    endDate?: Date
  ): Promise<ModelPerformanceMetrics[]> {
    try {
      const query = getSupabaseClient()
        .from('agent_activity')
        .select('*');

      if (startDate) {
        query.gte('timestamp', startDate.getTime());
      }
      if (endDate) {
        query.lte('timestamp', endDate.getTime());
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Failed to fetch model performance data:', error);
        return [];
      }

      // Group by agent, operation, and model
      const metricsMap = new Map<string, ModelPerformanceMetrics>();

      for (const record of data || []) {
        const key = `${record.agent_role}-${record.operation}-${record.model_used}`;
        
        if (!metricsMap.has(key)) {
          metricsMap.set(key, {
            agent: record.agent_role,
            operation: record.operation,
            model: record.model_used,
            totalCalls: 0,
            successRate: 0,
            avgDuration: 0,
            avgInputTokens: 0,
            avgOutputTokens: 0,
            totalCost: 0,
            avgCostPerCall: 0,
            errorRate: 0,
            avgRetries: 0
          });
        }

        const metrics = metricsMap.get(key)!;
        const prevTotal = metrics.totalCalls;

        metrics.totalCalls++;
        metrics.totalCost += record.cost || 0;
        
        // Update running averages
        metrics.avgDuration = (metrics.avgDuration * prevTotal + record.duration_ms) / metrics.totalCalls;
        metrics.avgInputTokens = (metrics.avgInputTokens * prevTotal + (record.input_tokens || 0)) / metrics.totalCalls;
        metrics.avgOutputTokens = (metrics.avgOutputTokens * prevTotal + (record.output_tokens || 0)) / metrics.totalCalls;
        metrics.avgRetries = (metrics.avgRetries * prevTotal + (record.retry_count || 0)) / metrics.totalCalls;
        
        if (record.success) {
          metrics.successRate = ((metrics.successRate * prevTotal) + 1) / metrics.totalCalls;
        } else {
          metrics.errorRate = ((metrics.errorRate * prevTotal) + 1) / metrics.totalCalls;
        }
      }

      // Calculate final metrics
      return Array.from(metricsMap.values()).map(metrics => ({
        ...metrics,
        avgCostPerCall: metrics.totalCost / metrics.totalCalls,
        successRate: metrics.successRate * 100,
        errorRate: metrics.errorRate * 100
      }));
    } catch (error) {
      logger.error('Error in getModelPerformanceMetrics:', error);
      return [];
    }
  }

  /**
   * Get model usage patterns for each agent
   */
  async getAgentModelUsagePatterns(): Promise<AgentModelUsagePattern[]> {
    try {
      const { data, error } = await getSupabaseClient()
        .from('agent_activity')
        .select('*')
        .order('timestamp', { ascending: false });

      if (error) {
        logger.error('Failed to fetch usage patterns:', error);
        return [];
      }

      // Group by agent
      const agentMap = new Map<string, any[]>();
      
      for (const record of data || []) {
        if (!agentMap.has(record.agent_role)) {
          agentMap.set(record.agent_role, []);
        }
        agentMap.get(record.agent_role)!.push(record);
      }

      const patterns: AgentModelUsagePattern[] = [];

      for (const [agent, records] of agentMap.entries()) {
        // Calculate model usage frequency
        const modelUsage = new Map<string, any>();
        const operationUsage = new Map<string, any>();

        for (const record of records) {
          // Track model usage
          if (!modelUsage.has(record.model_used)) {
            modelUsage.set(record.model_used, {
              count: 0,
              totalCost: 0,
              totalInputTokens: 0,
              totalOutputTokens: 0
            });
          }
          const modelStats = modelUsage.get(record.model_used)!;
          modelStats.count++;
          modelStats.totalCost += record.cost || 0;
          modelStats.totalInputTokens += record.input_tokens || 0;
          modelStats.totalOutputTokens += record.output_tokens || 0;

          // Track operation usage
          const opKey = record.operation;
          if (!operationUsage.has(opKey)) {
            operationUsage.set(opKey, {
              count: 0,
              totalCost: 0,
              totalDuration: 0,
              models: new Map<string, number>()
            });
          }
          const opStats = operationUsage.get(opKey)!;
          opStats.count++;
          opStats.totalCost += record.cost || 0;
          opStats.totalDuration += record.duration_ms || 0;
          
          const modelCount = opStats.models.get(record.model_used) || 0;
          opStats.models.set(record.model_used, modelCount + 1);
        }

        // Format model usage data
        const totalCalls = records.length;
        const modelsUsed = Array.from(modelUsage.entries()).map(([model, stats]) => ({
          model,
          frequency: stats.count,
          percentage: (stats.count / totalCalls) * 100,
          totalCost: stats.totalCost,
          avgTokensPerCall: (stats.totalInputTokens + stats.totalOutputTokens) / stats.count
        })).sort((a, b) => b.frequency - a.frequency);

        // Format operation usage data
        const topOperations = Array.from(operationUsage.entries()).map(([operation, stats]) => {
          // Find dominant model for this operation
          let dominantModel = '';
          let maxCount = 0;
          for (const [model, count] of stats.models.entries()) {
            if (count > maxCount) {
              maxCount = count;
              dominantModel = model;
            }
          }

          return {
            operation,
            callCount: stats.count,
            dominantModel,
            avgDuration: stats.totalDuration / stats.count,
            totalCost: stats.totalCost
          };
        }).sort((a, b) => b.callCount - a.callCount).slice(0, 10);

        // Calculate monthly trends
        const monthlyData = new Map<string, any>();
        for (const record of records) {
          const date = new Date(record.timestamp);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          
          if (!monthlyData.has(monthKey)) {
            monthlyData.set(monthKey, {
              totalCalls: 0,
              totalCost: 0
            });
          }
          
          const monthStats = monthlyData.get(monthKey)!;
          monthStats.totalCalls++;
          monthStats.totalCost += record.cost || 0;
        }

        const monthlyTrend = Array.from(monthlyData.entries())
          .map(([month, stats]) => ({
            month,
            totalCalls: stats.totalCalls,
            totalCost: stats.totalCost,
            avgCostPerCall: stats.totalCost / stats.totalCalls
          }))
          .sort((a, b) => a.month.localeCompare(b.month));

        patterns.push({
          agent,
          modelsUsed,
          topOperations,
          monthlyTrend
        });
      }

      return patterns;
    } catch (error) {
      logger.error('Error in getAgentModelUsagePatterns:', error);
      return [];
    }
  }

  /**
   * Generate optimization recommendations based on usage patterns
   */
  async generateOptimizationRecommendations(): Promise<ModelOptimizationRecommendation[]> {
    const metrics = await this.getModelPerformanceMetrics();
    const recommendations: ModelOptimizationRecommendation[] = [];

    // Model alternatives for cost optimization
    const modelAlternatives: Record<string, { model: string; qualityImpact: 'minimal' | 'moderate' | 'significant' }[]> = {
      'openai/gpt-4': [
        { model: 'openai/gpt-4-turbo', qualityImpact: 'minimal' },
        { model: 'openai/gpt-4o', qualityImpact: 'minimal' },
        { model: 'openai/gpt-3.5-turbo', qualityImpact: 'moderate' }
      ],
      'openai/gpt-4-turbo': [
        { model: 'openai/gpt-4o', qualityImpact: 'minimal' },
        { model: 'openai/gpt-4o-mini', qualityImpact: 'moderate' },
        { model: 'openai/gpt-3.5-turbo', qualityImpact: 'moderate' }
      ],
      'openai/gpt-4o': [
        { model: 'openai/gpt-4o-mini', qualityImpact: 'minimal' },
        { model: 'openai/gpt-3.5-turbo', qualityImpact: 'moderate' }
      ],
      'claude-3-opus': [
        { model: 'claude-3-haiku', qualityImpact: 'moderate' },
        { model: 'openai/gpt-4o', qualityImpact: 'minimal' }
      ]
    };

    // Analyze each agent/operation combination
    for (const metric of metrics) {
      const alternatives = modelAlternatives[metric.model];
      if (!alternatives || metric.totalCalls < 10) continue; // Skip if no alternatives or low usage

      // Calculate current monthly cost (assuming 30 days)
      const callsPerDay = metric.totalCalls / 30; // Rough estimate
      const currentMonthlyCost = metric.avgCostPerCall * callsPerDay * 30;

      // Find the best alternative based on cost and quality
      for (const alt of alternatives) {
        const altPricing = this.getModelPricing(alt.model);
        const projectedCostPerCall = 
          (metric.avgInputTokens * altPricing.input / 1000) + 
          (metric.avgOutputTokens * altPricing.output / 1000);
        const projectedMonthlyCost = projectedCostPerCall * callsPerDay * 30;
        const savings = currentMonthlyCost - projectedMonthlyCost;
        const savingsPercentage = (savings / currentMonthlyCost) * 100;

        // Only recommend if savings are significant (>20%) or for high-volume operations
        if (savingsPercentage > 20 || (metric.totalCalls > 100 && savingsPercentage > 10)) {
          const reasoning: string[] = [];

          // Add reasoning based on metrics
          if (metric.errorRate < 5) {
            reasoning.push(`Current model has low error rate (${metric.errorRate.toFixed(1)}%), indicating stable performance`);
          }
          
          if (metric.avgDuration > 10000) {
            reasoning.push(`Long execution time (${(metric.avgDuration / 1000).toFixed(1)}s) suggests complex operations that might benefit from a faster model`);
          }

          if (metric.avgRetries > 0.5) {
            reasoning.push(`High retry rate (${metric.avgRetries.toFixed(1)}) indicates potential reliability issues`);
          }

          if (alt.qualityImpact === 'minimal') {
            reasoning.push('Minimal quality impact expected based on similar model capabilities');
          } else if (alt.qualityImpact === 'moderate') {
            reasoning.push('Moderate quality impact - recommend testing on non-critical operations first');
          }

          reasoning.push(`Projected ${savingsPercentage.toFixed(1)}% cost reduction`);
          reasoning.push(`Based on ${metric.totalCalls} calls analyzed`);

          recommendations.push({
            agent: metric.agent,
            operation: metric.operation,
            currentModel: metric.model,
            currentCostPerMonth: currentMonthlyCost,
            recommendedModel: alt.model,
            projectedCostPerMonth: projectedMonthlyCost,
            potentialSavings: savings,
            savingsPercentage,
            qualityImpact: alt.qualityImpact,
            reasoning
          });

          break; // Only recommend the best alternative
        }
      }
    }

    // Sort by potential savings
    return recommendations.sort((a, b) => b.potentialSavings - a.potentialSavings);
  }

  /**
   * Get frequently used model combinations across agents
   */
  async getFrequentModelCombinations(): Promise<{
    combination: string[];
    frequency: number;
    totalCost: number;
    agents: string[];
  }[]> {
    try {
      const { data, error } = await getSupabaseClient()
        .from('agent_activity')
        .select('agent_role, model_used, repository_url, cost')
        .order('timestamp', { ascending: false });

      if (error) {
        logger.error('Failed to fetch model combinations:', error);
        return [];
      }

      // Group by repository to find model combinations used together
      const repoMap = new Map<string, Map<string, Set<string>>>();
      const costMap = new Map<string, number>();

      for (const record of data || []) {
        if (!repoMap.has(record.repository_url)) {
          repoMap.set(record.repository_url, new Map());
        }
        
        const models = repoMap.get(record.repository_url)!;
        if (!models.has(record.model_used)) {
          models.set(record.model_used, new Set());
        }
        models.get(record.model_used)!.add(record.agent_role);

        // Track costs
        const key = `${record.repository_url}-${record.model_used}`;
        costMap.set(key, (costMap.get(key) || 0) + (record.cost || 0));
      }

      // Identify common combinations
      const combinationMap = new Map<string, any>();

      for (const [repo, models] of repoMap.entries()) {
        const modelList = Array.from(models.keys()).sort();
        const combinationKey = modelList.join('|');
        
        if (!combinationMap.has(combinationKey)) {
          combinationMap.set(combinationKey, {
            count: 0,
            totalCost: 0,
            agents: new Set<string>()
          });
        }

        const combo = combinationMap.get(combinationKey)!;
        combo.count++;
        
        // Add costs for this combination
        for (const model of modelList) {
          const key = `${repo}-${model}`;
          combo.totalCost += costMap.get(key) || 0;
          
          // Add agents using this model
          const agentsUsingModel = models.get(model);
          if (agentsUsingModel) {
            for (const agent of agentsUsingModel) {
              combo.agents.add(agent);
            }
          }
        }
      }

      // Format results
      return Array.from(combinationMap.entries())
        .map(([combination, stats]) => ({
          combination: combination.split('|'),
          frequency: stats.count,
          totalCost: stats.totalCost,
          agents: Array.from(stats.agents) as string[]
        }))
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 20); // Top 20 combinations
    } catch (error) {
      logger.error('Error in getFrequentModelCombinations:', error);
      return [];
    }
  }

  /**
   * Helper: Get model pricing
   */
  private getModelPricing(model: string): { input: number; output: number } {
    const pricing: Record<string, { input: number; output: number }> = {
      'openai/gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
      'openai/gpt-4': { input: 0.03, output: 0.06 },
      'openai/gpt-4o': { input: 0.005, output: 0.015 },
      'openai/gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      'openai/gpt-4-turbo': { input: 0.01, output: 0.03 },
      'claude-3-haiku': { input: 0.00025, output: 0.00125 },
      'claude-3-opus': { input: 0.015, output: 0.075 },
      'deepseek-chat': { input: 0.00014, output: 0.00028 },
      'gemini-1.5-flash': { input: 0.00035, output: 0.0007 }
    };
    
    return pricing[model] || { input: 0.001, output: 0.002 };
  }

  /**
   * Generate a cost optimization report
   */
  async generateCostOptimizationReport(): Promise<string> {
    const recommendations = await this.generateOptimizationRecommendations();
    const patterns = await this.getAgentModelUsagePatterns();
    const combinations = await this.getFrequentModelCombinations();

    let report = '# Model Usage & Cost Optimization Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;

    // Executive Summary
    report += '## Executive Summary\n\n';
    const totalSavings = recommendations.reduce((sum, r) => sum + r.potentialSavings, 0);
    const avgSavingsPercentage = recommendations.length > 0 
      ? recommendations.reduce((sum, r) => sum + r.savingsPercentage, 0) / recommendations.length 
      : 0;
    
    report += `- **Potential Monthly Savings:** $${totalSavings.toFixed(2)}\n`;
    report += `- **Average Cost Reduction:** ${avgSavingsPercentage.toFixed(1)}%\n`;
    report += `- **Optimization Opportunities:** ${recommendations.length}\n\n`;

    // Top Recommendations
    if (recommendations.length > 0) {
      report += '## Top Optimization Recommendations\n\n';
      
      const topRecs = recommendations.slice(0, 5);
      for (const rec of topRecs) {
        report += `### ${rec.agent} - ${rec.operation}\n`;
        report += `- **Current Model:** ${rec.currentModel} ($${rec.currentCostPerMonth.toFixed(2)}/month)\n`;
        report += `- **Recommended:** ${rec.recommendedModel} ($${rec.projectedCostPerMonth.toFixed(2)}/month)\n`;
        report += `- **Savings:** $${rec.potentialSavings.toFixed(2)}/month (${rec.savingsPercentage.toFixed(1)}%)\n`;
        report += `- **Quality Impact:** ${rec.qualityImpact}\n`;
        report += `- **Reasoning:**\n`;
        for (const reason of rec.reasoning) {
          report += `  - ${reason}\n`;
        }
        report += '\n';
      }
    }

    // Agent Usage Patterns
    report += '## Agent Model Usage Patterns\n\n';
    for (const pattern of patterns) {
      report += `### ${pattern.agent}\n`;
      report += '**Most Used Models:**\n';
      for (const model of pattern.modelsUsed.slice(0, 3)) {
        report += `- ${model.model}: ${model.frequency} calls (${model.percentage.toFixed(1)}%), $${model.totalCost.toFixed(2)} total\n`;
      }
      report += '\n**Top Operations:**\n';
      for (const op of pattern.topOperations.slice(0, 3)) {
        report += `- ${op.operation}: ${op.callCount} calls, primary model: ${op.dominantModel}\n`;
      }
      report += '\n';
    }

    // Frequent Model Combinations
    if (combinations.length > 0) {
      report += '## Frequently Used Model Combinations\n\n';
      report += 'Models often used together in analyses:\n\n';
      for (const combo of combinations.slice(0, 5)) {
        report += `- **[${combo.combination.join(', ')}]**\n`;
        report += `  - Used ${combo.frequency} times\n`;
        report += `  - Total cost: $${combo.totalCost.toFixed(2)}\n`;
        report += `  - Agents: ${combo.agents.join(', ')}\n\n`;
      }
    }

    // Recommendations Summary
    report += '## Action Items\n\n';
    report += '1. **Immediate Actions:**\n';
    report += '   - Test recommended model changes on low-risk operations\n';
    report += '   - Monitor quality metrics after model switches\n';
    report += '   - Implement A/B testing for critical operations\n\n';
    
    report += '2. **Medium-term Strategy:**\n';
    report += '   - Create agent-specific model selection policies\n';
    report += '   - Implement dynamic model selection based on repository size\n';
    report += '   - Set up automated cost alerts\n\n';
    
    report += '3. **Long-term Optimization:**\n';
    report += '   - Develop quality benchmarks for each agent/operation\n';
    report += '   - Implement automatic model fallback strategies\n';
    report += '   - Create cost-quality trade-off profiles\n';

    return report;
  }
}

// Singleton instance
let analyticsService: ModelUsageAnalyticsService | null = null;

export function getModelUsageAnalytics(): ModelUsageAnalyticsService {
  if (!analyticsService) {
    analyticsService = new ModelUsageAnalyticsService();
  }
  return analyticsService;
}