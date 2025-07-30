/**
 * Monitoring Enhancements for Performance and Cost Tracking
 * 
 * Tracks:
 * - Token usage per model
 * - Cost per analysis
 * - Performance metrics
 * - Model selection patterns
 */

import { createLogger } from '@codequal/core/utils';

const logger = createLogger('monitoring-enhancements');

export interface AnalysisMetrics {
  analysisId: string;
  repositoryUrl: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  
  // Token usage
  tokens: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  }[];
  
  // Cost tracking
  costs: {
    model: string;
    inputCost: number;
    outputCost: number;
    totalCost: number;
  }[];
  
  // Performance metrics
  performance: {
    phaseTimings: {
      embedding: number;
      modelSelection: number;
      analysis: number;
      reportGeneration: number;
    };
    apiCalls: {
      model: string;
      count: number;
      averageLatency: number;
    }[];
  };
  
  // Results
  results: {
    issuesFound: number;
    score: number;
    reportSize: number;
    dataCategories: number;
  };
}

export class PerformanceMonitor {
  private activeAnalyses: Map<string, AnalysisMetrics> = new Map();
  
  /**
   * Start tracking a new analysis
   */
  startAnalysis(analysisId: string, repositoryUrl: string): void {
    this.activeAnalyses.set(analysisId, {
      analysisId,
      repositoryUrl,
      startTime: new Date(),
      tokens: [],
      costs: [],
      performance: {
        phaseTimings: {
          embedding: 0,
          modelSelection: 0,
          analysis: 0,
          reportGeneration: 0
        },
        apiCalls: []
      },
      results: {
        issuesFound: 0,
        score: 0,
        reportSize: 0,
        dataCategories: 0
      }
    });
    
    logger.info('Started analysis tracking', { analysisId, repositoryUrl });
  }
  
  /**
   * Record token usage for a model
   */
  recordTokenUsage(
    analysisId: string,
    model: string,
    inputTokens: number,
    outputTokens: number
  ): void {
    const analysis = this.activeAnalyses.get(analysisId);
    if (!analysis) return;
    
    analysis.tokens.push({
      model,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens
    });
    
    // Calculate cost based on model
    const cost = this.calculateCost(model, inputTokens, outputTokens);
    analysis.costs.push({
      model,
      inputCost: cost.inputCost,
      outputCost: cost.outputCost,
      totalCost: cost.totalCost
    });
    
    logger.debug('Recorded token usage', {
      analysisId,
      model,
      tokens: { input: inputTokens, output: outputTokens },
      cost: cost.totalCost
    });
  }
  
  /**
   * Record phase timing
   */
  recordPhaseTime(
    analysisId: string,
    phase: keyof AnalysisMetrics['performance']['phaseTimings'],
    duration: number
  ): void {
    const analysis = this.activeAnalyses.get(analysisId);
    if (!analysis) return;
    
    analysis.performance.phaseTimings[phase] = duration;
  }
  
  /**
   * Record API call metrics
   */
  recordApiCall(
    analysisId: string,
    model: string,
    latency: number
  ): void {
    const analysis = this.activeAnalyses.get(analysisId);
    if (!analysis) return;
    
    const existingCall = analysis.performance.apiCalls.find(c => c.model === model);
    if (existingCall) {
      existingCall.count++;
      existingCall.averageLatency = 
        (existingCall.averageLatency * (existingCall.count - 1) + latency) / existingCall.count;
    } else {
      analysis.performance.apiCalls.push({
        model,
        count: 1,
        averageLatency: latency
      });
    }
  }
  
  /**
   * Complete analysis and get final metrics
   */
  completeAnalysis(
    analysisId: string,
    results: {
      issuesFound: number;
      score: number;
      reportSize: number;
      dataCategories: number;
    }
  ): AnalysisMetrics | null {
    const analysis = this.activeAnalyses.get(analysisId);
    if (!analysis) return null;
    
    analysis.endTime = new Date();
    analysis.duration = (analysis.endTime.getTime() - analysis.startTime.getTime()) / 1000;
    analysis.results = results;
    
    // Log summary
    const totalTokens = analysis.tokens.reduce((sum, t) => sum + t.totalTokens, 0);
    const totalCost = analysis.costs.reduce((sum, c) => sum + c.totalCost, 0);
    
    logger.info('Analysis completed', {
      analysisId,
      duration: analysis.duration,
      totalTokens,
      totalCost: `$${totalCost.toFixed(4)}`,
      issuesFound: results.issuesFound,
      score: results.score
    });
    
    // Remove from active and return
    this.activeAnalyses.delete(analysisId);
    return analysis;
  }
  
  /**
   * Calculate cost based on model pricing
   */
  private calculateCost(model: string, inputTokens: number, outputTokens: number): {
    inputCost: number;
    outputCost: number;
    totalCost: number;
  } {
    // TODO: Load pricing from Vector DB model configurations
    // Default pricing for unknown models
    const defaultPricing = { input: 0.002, output: 0.006 };
    
    // In production, this should query ModelConfigStore
    // const modelConfig = await this.modelConfigStore.getModelConfig(model);
    // const modelPricing = modelConfig?.pricing || defaultPricing;
    
    const modelPricing = defaultPricing;
    
    const inputCost = (inputTokens / 1000) * modelPricing.input;
    const outputCost = (outputTokens / 1000) * modelPricing.output;
    
    return {
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost
    };
  }
  
  /**
   * Get current active analyses
   */
  getActiveAnalyses(): string[] {
    return Array.from(this.activeAnalyses.keys());
  }
  
  /**
   * Get analysis metrics
   */
  getAnalysisMetrics(analysisId: string): AnalysisMetrics | null {
    return this.activeAnalyses.get(analysisId) || null;
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Helper to format metrics for reporting
 */
export function formatAnalysisMetrics(metrics: AnalysisMetrics): string {
  const totalTokens = metrics.tokens.reduce((sum, t) => sum + t.totalTokens, 0);
  const totalCost = metrics.costs.reduce((sum, c) => sum + c.totalCost, 0);
  
  let report = `## Analysis Performance Metrics\n\n`;
  report += `**Analysis ID:** ${metrics.analysisId}\n`;
  report += `**Repository:** ${metrics.repositoryUrl}\n`;
  report += `**Duration:** ${metrics.duration?.toFixed(1)}s\n\n`;
  
  report += `### Token Usage\n`;
  report += `| Model | Input | Output | Total | Cost |\n`;
  report += `|-------|-------|--------|-------|------|\n`;
  
  metrics.tokens.forEach((token, i) => {
    const cost = metrics.costs[i];
    report += `| ${token.model} | ${token.inputTokens} | ${token.outputTokens} | ${token.totalTokens} | $${cost.totalCost.toFixed(4)} |\n`;
  });
  
  report += `\n**Total Tokens:** ${totalTokens}\n`;
  report += `**Total Cost:** $${totalCost.toFixed(4)}\n\n`;
  
  report += `### Performance Breakdown\n`;
  report += `- Embedding: ${metrics.performance.phaseTimings.embedding.toFixed(1)}s\n`;
  report += `- Model Selection: ${metrics.performance.phaseTimings.modelSelection.toFixed(1)}s\n`;
  report += `- Analysis: ${metrics.performance.phaseTimings.analysis.toFixed(1)}s\n`;
  report += `- Report Generation: ${metrics.performance.phaseTimings.reportGeneration.toFixed(1)}s\n\n`;
  
  report += `### API Calls\n`;
  metrics.performance.apiCalls.forEach(call => {
    report += `- ${call.model}: ${call.count} calls (avg ${call.averageLatency.toFixed(0)}ms)\n`;
  });
  
  report += `\n### Results\n`;
  report += `- Issues Found: ${metrics.results.issuesFound}\n`;
  report += `- Score: ${metrics.results.score}/100\n`;
  report += `- Report Size: ${(metrics.results.reportSize / 1024).toFixed(1)}KB\n`;
  report += `- Data Categories: ${metrics.results.dataCategories}\n`;
  
  return report;
}