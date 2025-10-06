/**
 * Model Usage Tracker
 * Tracks which AI models were actually used for each analysis
 */

export interface ModelUsage {
  model: string;
  agent: string;
  timestamp: Date;
  tokensUsed?: number;
  cost?: number;
}

export interface AgentModelReport {
  agent: string;
  models: {
    model: string;
    count: number;
    totalTokens: number;
  }[];
  totalCalls: number;
}

export class ModelUsageTracker {
  private usageHistory: ModelUsage[] = [];
  private static instance: ModelUsageTracker;

  private constructor() {}

  static getInstance(): ModelUsageTracker {
    if (!ModelUsageTracker.instance) {
      ModelUsageTracker.instance = new ModelUsageTracker();
    }
    return ModelUsageTracker.instance;
  }

  /**
   * Record model usage
   */
  recordUsage(
    model: string,
    agent: string,
    tokensUsed?: number,
    cost?: number
  ): void {
    this.usageHistory.push({
      model,
      agent,
      timestamp: new Date(),
      tokensUsed,
      cost
    });
  }

  /**
   * Get usage by agent
   */
  getUsageByAgent(agent: string): ModelUsage[] {
    return this.usageHistory.filter(u => u.agent === agent);
  }

  /**
   * Get unique models used
   */
  getUniqueModels(): string[] {
    const models = new Set(this.usageHistory.map(u => u.model));
    return Array.from(models);
  }

  /**
   * Get model usage report by agent
   */
  getAgentModelReport(agent: string): AgentModelReport {
    const agentUsage = this.getUsageByAgent(agent);
    const modelCounts = new Map<string, { count: number; totalTokens: number }>();

    agentUsage.forEach(usage => {
      const current = modelCounts.get(usage.model) || { count: 0, totalTokens: 0 };
      modelCounts.set(usage.model, {
        count: current.count + 1,
        totalTokens: current.totalTokens + (usage.tokensUsed || 0)
      });
    });

    return {
      agent,
      models: Array.from(modelCounts.entries()).map(([model, stats]) => ({
        model,
        count: stats.count,
        totalTokens: stats.totalTokens
      })),
      totalCalls: agentUsage.length
    };
  }

  /**
   * Get complete usage summary
   */
  getUsageSummary(): {
    totalCalls: number;
    uniqueModels: string[];
    byAgent: Record<string, AgentModelReport>;
    totalTokens: number;
    totalCost: number;
  } {
    const agents = new Set(this.usageHistory.map(u => u.agent));
    const byAgent: Record<string, AgentModelReport> = {};

    agents.forEach(agent => {
      byAgent[agent] = this.getAgentModelReport(agent);
    });

    return {
      totalCalls: this.usageHistory.length,
      uniqueModels: this.getUniqueModels(),
      byAgent,
      totalTokens: this.usageHistory.reduce((sum, u) => sum + (u.tokensUsed || 0), 0),
      totalCost: this.usageHistory.reduce((sum, u) => sum + (u.cost || 0), 0)
    };
  }

  /**
   * Format usage summary as markdown
   */
  formatSummary(): string {
    const summary = this.getUsageSummary();

    let output = `## AI Model Usage Summary\n\n`;
    output += `**Total API Calls:** ${summary.totalCalls}\n`;
    output += `**Total Tokens:** ${summary.totalTokens.toLocaleString()}\n`;
    output += `**Total Cost:** $${summary.totalCost.toFixed(4)}\n`;
    output += `**Models Used:** ${summary.uniqueModels.join(', ')}\n\n`;

    output += `### Usage by Agent\n\n`;

    Object.entries(summary.byAgent).forEach(([agent, report]) => {
      output += `#### ${agent} Agent\n`;
      output += `- **Total Calls:** ${report.totalCalls}\n`;
      output += `- **Models:**\n`;

      report.models.forEach(modelStat => {
        output += `  - ${modelStat.model}: ${modelStat.count} calls, ${modelStat.totalTokens.toLocaleString()} tokens\n`;
      });

      output += '\n';
    });

    return output;
  }

  /**
   * Clear usage history
   */
  clear(): void {
    this.usageHistory = [];
  }

  /**
   * Get usage history
   */
  getHistory(): ModelUsage[] {
    return [...this.usageHistory];
  }

  /**
   * Export usage data as JSON
   */
  exportJSON(): string {
    return JSON.stringify(this.usageHistory, null, 2);
  }

  /**
   * Get most used model by agent
   */
  getMostUsedModel(agent: string): string | null {
    const report = this.getAgentModelReport(agent);

    if (report.models.length === 0) return null;

    const sorted = report.models.sort((a, b) => b.count - a.count);
    return sorted[0].model;
  }

  /**
   * Check if model was used consistently
   */
  isModelConsistent(agent: string): boolean {
    const report = this.getAgentModelReport(agent);

    if (report.models.length === 0) return true;
    if (report.models.length === 1) return true;

    // Check if one model dominates (>90% usage)
    const mostUsed = report.models.sort((a, b) => b.count - a.count)[0];
    const percentage = (mostUsed.count / report.totalCalls) * 100;

    return percentage >= 90;
  }

  /**
   * Get model consistency report
   */
  getConsistencyReport(): {
    agent: string;
    isConsistent: boolean;
    primaryModel: string | null;
    modelCount: number;
    distribution: string;
  }[] {
    const agents = new Set(this.usageHistory.map(u => u.agent));
    const reports: {
      agent: string;
      isConsistent: boolean;
      primaryModel: string | null;
      modelCount: number;
      distribution: string;
    }[] = [];

    agents.forEach(agent => {
      const report = this.getAgentModelReport(agent);
      const isConsistent = this.isModelConsistent(agent);
      const primaryModel = this.getMostUsedModel(agent);

      const distribution = report.models
        .map(m => {
          const pct = ((m.count / report.totalCalls) * 100).toFixed(0);
          return `${m.model} (${pct}%)`;
        })
        .join(', ');

      reports.push({
        agent,
        isConsistent,
        primaryModel,
        modelCount: report.models.length,
        distribution
      });
    });

    return reports;
  }
}

/**
 * Global singleton instance
 */
export const modelTracker = ModelUsageTracker.getInstance();

/**
 * Convenience function to record model usage
 */
export function trackModelUsage(
  model: string,
  agent: string,
  tokensUsed?: number,
  cost?: number
): void {
  modelTracker.recordUsage(model, agent, tokensUsed, cost);
}

/**
 * Get formatted model usage report
 */
export function getModelUsageReport(): string {
  return modelTracker.formatSummary();
}

/**
 * Get model consistency warnings
 */
export function getModelConsistencyWarnings(): string[] {
  const warnings: string[] = [];
  const reports = modelTracker.getConsistencyReport();

  reports.forEach(report => {
    if (!report.isConsistent && report.modelCount > 1) {
      warnings.push(
        `⚠️  ${report.agent} agent used ${report.modelCount} different models: ${report.distribution}`
      );
    }
  });

  return warnings;
}
