/**
 * Context-Aware Model Selection Monitoring
 * 
 * Tracks performance improvements from using context-specific model configurations
 */

import { createLogger } from '@codequal/core/utils';

const logger = createLogger('ContextAwareMonitoring');

export interface ModelSelectionMetrics {
  // Selection metrics
  totalSelections: number;
  contextAwareSelections: number;
  fallbackSelections: number;
  hitRate: number; // percentage of context-aware hits
  
  // Performance metrics
  avgSelectionLatencyMs: number;
  avgTokensUsed: number;
  avgCostPerSelection: number;
  
  // Quality metrics
  avgQualityScore: number;
  avgSpeedScore: number;
  avgCostScore: number;
  
  // Breakdown by context
  byRole: Record<string, ContextMetrics>;
  byLanguage: Record<string, ContextMetrics>;
  bySize: Record<string, ContextMetrics>;
}

export interface ContextMetrics {
  selections: number;
  primaryModels: Record<string, number>; // model -> count
  avgLatencyMs: number;
  avgCost: number;
  avgQualityScore: number;
}

export class ContextAwareMonitoringService {
  private metrics: ModelSelectionMetrics = {
    totalSelections: 0,
    contextAwareSelections: 0,
    fallbackSelections: 0,
    hitRate: 0,
    avgSelectionLatencyMs: 0,
    avgTokensUsed: 0,
    avgCostPerSelection: 0,
    avgQualityScore: 0,
    avgSpeedScore: 0,
    avgCostScore: 0,
    byRole: {},
    byLanguage: {},
    bySize: {}
  };
  
  /**
   * Record a model selection event
   */
  recordSelection(event: {
    role: string;
    language: string;
    size: string;
    isContextAware: boolean;
    selectedModel: string;
    latencyMs: number;
    tokensUsed: number;
    cost: number;
    scores: {
      quality: number;
      speed: number;
      cost: number;
    };
  }): void {
    // Update totals
    this.metrics.totalSelections++;
    if (event.isContextAware) {
      this.metrics.contextAwareSelections++;
    } else {
      this.metrics.fallbackSelections++;
    }
    
    // Update hit rate
    this.metrics.hitRate = this.metrics.contextAwareSelections / this.metrics.totalSelections;
    
    // Update averages (running average)
    this.updateAverage('avgSelectionLatencyMs', event.latencyMs);
    this.updateAverage('avgTokensUsed', event.tokensUsed);
    this.updateAverage('avgCostPerSelection', event.cost);
    this.updateAverage('avgQualityScore', event.scores.quality);
    this.updateAverage('avgSpeedScore', event.scores.speed);
    this.updateAverage('avgCostScore', event.scores.cost);
    
    // Update context-specific metrics
    this.updateContextMetrics('byRole', event.role, event);
    this.updateContextMetrics('byLanguage', event.language, event);
    this.updateContextMetrics('bySize', event.size, event);
  }
  
  /**
   * Update running average
   */
  private updateAverage(field: keyof ModelSelectionMetrics, newValue: number): void {
    const currentAvg = this.metrics[field] as number;
    const n = this.metrics.totalSelections;
    this.metrics[field] = ((currentAvg * (n - 1)) + newValue) / n as any;
  }
  
  /**
   * Update context-specific metrics
   */
  private updateContextMetrics(
    category: 'byRole' | 'byLanguage' | 'bySize',
    key: string,
    event: any
  ): void {
    if (!this.metrics[category][key]) {
      this.metrics[category][key] = {
        selections: 0,
        primaryModels: {},
        avgLatencyMs: 0,
        avgCost: 0,
        avgQualityScore: 0
      };
    }
    
    const context = this.metrics[category][key];
    context.selections++;
    
    // Update model usage
    context.primaryModels[event.selectedModel] = 
      (context.primaryModels[event.selectedModel] || 0) + 1;
    
    // Update averages
    const n = context.selections;
    context.avgLatencyMs = ((context.avgLatencyMs * (n - 1)) + event.latencyMs) / n;
    context.avgCost = ((context.avgCost * (n - 1)) + event.cost) / n;
    context.avgQualityScore = ((context.avgQualityScore * (n - 1)) + event.scores.quality) / n;
  }
  
  /**
   * Get current metrics
   */
  getMetrics(): ModelSelectionMetrics {
    return { ...this.metrics };
  }
  
  /**
   * Generate performance report
   */
  generateReport(): string {
    const report: string[] = [];
    
    report.push('=== CONTEXT-AWARE MODEL SELECTION REPORT ===');
    report.push('');
    
    // Overall metrics
    report.push('Overall Performance:');
    report.push(`  Total selections: ${this.metrics.totalSelections}`);
    report.push(`  Context-aware hits: ${this.metrics.contextAwareSelections} (${(this.metrics.hitRate * 100).toFixed(1)}%)`);
    report.push(`  Fallback selections: ${this.metrics.fallbackSelections}`);
    report.push('');
    
    // Performance improvements
    report.push('Average Performance:');
    report.push(`  Selection latency: ${this.metrics.avgSelectionLatencyMs.toFixed(1)}ms`);
    report.push(`  Tokens used: ${this.metrics.avgTokensUsed.toFixed(0)}`);
    report.push(`  Cost per selection: $${this.metrics.avgCostPerSelection.toFixed(6)}`);
    report.push('');
    
    // Quality metrics
    report.push('Quality Scores:');
    report.push(`  Quality: ${this.metrics.avgQualityScore.toFixed(2)}/1.0`);
    report.push(`  Speed: ${this.metrics.avgSpeedScore.toFixed(2)}/1.0`);
    report.push(`  Cost efficiency: ${this.metrics.avgCostScore.toFixed(2)}/1.0`);
    report.push('');
    
    // Top performing contexts
    report.push('Top Performing Contexts:');
    
    // By role
    const topRoles = Object.entries(this.metrics.byRole)
      .sort((a, b) => b[1].avgQualityScore - a[1].avgQualityScore)
      .slice(0, 3);
    
    report.push('  By Role:');
    topRoles.forEach(([role, metrics]) => {
      report.push(`    ${role}: ${metrics.selections} selections, ${metrics.avgQualityScore.toFixed(2)} quality`);
    });
    report.push('');
    
    // By language
    const topLanguages = Object.entries(this.metrics.byLanguage)
      .sort((a, b) => b[1].selections - a[1].selections)
      .slice(0, 3);
    
    report.push('  By Language:');
    topLanguages.forEach(([lang, metrics]) => {
      report.push(`    ${lang}: ${metrics.selections} selections, $${metrics.avgCost.toFixed(6)} avg cost`);
    });
    report.push('');
    
    // Cost savings
    const estimatedSavings = this.calculateCostSavings();
    report.push('Cost Analysis:');
    report.push(`  Estimated savings: $${estimatedSavings.toFixed(2)} per 1000 selections`);
    report.push(`  Most cost-effective contexts:`);
    
    const costEffective = Object.entries(this.metrics.bySize)
      .sort((a, b) => a[1].avgCost - b[1].avgCost);
    
    costEffective.forEach(([size, metrics]) => {
      report.push(`    ${size} repos: $${metrics.avgCost.toFixed(6)} avg`);
    });
    
    return report.join('\n');
  }
  
  /**
   * Calculate estimated cost savings
   */
  private calculateCostSavings(): number {
    // Compare to a baseline (e.g., always using GPT-4)
    const baselineCostPer1k = 0.03; // $30 per 1M tokens
    const currentAvgCost = this.metrics.avgCostPerSelection;
    const tokensPerSelection = this.metrics.avgTokensUsed;
    
    const baselineCostPerSelection = (tokensPerSelection / 1000) * baselineCostPer1k;
    const savingsPerSelection = baselineCostPerSelection - currentAvgCost;
    
    return savingsPerSelection * 1000; // Per 1000 selections
  }
  
  /**
   * Export metrics for Grafana
   */
  exportPrometheusMetrics(): string {
    const lines: string[] = [];
    
    // Overall metrics
    lines.push(`# HELP codequal_model_selection_total Total model selections`);
    lines.push(`# TYPE codequal_model_selection_total counter`);
    lines.push(`codequal_model_selection_total ${this.metrics.totalSelections}`);
    
    lines.push(`# HELP codequal_context_aware_hit_rate Context-aware selection hit rate`);
    lines.push(`# TYPE codequal_context_aware_hit_rate gauge`);
    lines.push(`codequal_context_aware_hit_rate ${this.metrics.hitRate}`);
    
    lines.push(`# HELP codequal_selection_latency_ms Average selection latency`);
    lines.push(`# TYPE codequal_selection_latency_ms gauge`);
    lines.push(`codequal_selection_latency_ms ${this.metrics.avgSelectionLatencyMs}`);
    
    lines.push(`# HELP codequal_selection_cost_usd Average cost per selection`);
    lines.push(`# TYPE codequal_selection_cost_usd gauge`);
    lines.push(`codequal_selection_cost_usd ${this.metrics.avgCostPerSelection}`);
    
    // Context-specific metrics
    for (const [role, metrics] of Object.entries(this.metrics.byRole)) {
      lines.push(`codequal_selections_by_role{role="${role}"} ${metrics.selections}`);
    }
    
    for (const [lang, metrics] of Object.entries(this.metrics.byLanguage)) {
      lines.push(`codequal_selections_by_language{language="${lang}"} ${metrics.selections}`);
    }
    
    return lines.join('\n');
  }
}

// Global instance
let monitoringInstance: ContextAwareMonitoringService | null = null;

export function getContextAwareMonitoring(): ContextAwareMonitoringService {
  if (!monitoringInstance) {
    monitoringInstance = new ContextAwareMonitoringService();
  }
  return monitoringInstance;
}

// Grafana dashboard configuration
export const GRAFANA_DASHBOARD_CONFIG = {
  title: 'Context-Aware Model Selection',
  panels: [
    {
      title: 'Selection Hit Rate',
      type: 'graph',
      targets: [{
        expr: 'codequal_context_aware_hit_rate'
      }]
    },
    {
      title: 'Selections by Role',
      type: 'pie',
      targets: [{
        expr: 'codequal_selections_by_role'
      }]
    },
    {
      title: 'Average Cost per Selection',
      type: 'singlestat',
      targets: [{
        expr: 'codequal_selection_cost_usd'
      }]
    },
    {
      title: 'Selection Latency',
      type: 'graph',
      targets: [{
        expr: 'codequal_selection_latency_ms'
      }]
    }
  ]
};