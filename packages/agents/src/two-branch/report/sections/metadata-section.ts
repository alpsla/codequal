/**
 * Metadata Section Generator
 *
 * Generates the UnifiedReportMetadata section with analysis details,
 * tools used, costs, and export options.
 *
 * @see unified-report-types.ts for type definitions
 */

import {
  UnifiedReportMetadata,
  DurationBreakdown,
  ToolUsage,
  AgentUsage,
  CostBreakdown,
  ExportFormat,
  V9AnalysisResultInput,
  FixOrchestrationResultInput,
  AnalysisMode,
} from '../unified-report-types';

/**
 * Mode descriptions
 */
const MODE_DESCRIPTIONS: Record<AnalysisMode, string> = {
  fast: 'Quick scan of critical issues only',
  standard: 'Balanced analysis with common issues',
  thorough: 'Comprehensive analysis including style issues',
  complete: 'Full analysis with AI enrichment and all tools',
};

/**
 * Generate the metadata section
 */
export function generateMetadataSection(
  analysis: V9AnalysisResultInput,
  fixResult?: FixOrchestrationResultInput,
  options?: {
    tools?: ToolUsage[];
    agents?: AgentUsage[];
    reportId?: string;
    webUrl?: string;
  }
): UnifiedReportMetadata {
  // Calculate duration breakdown
  const durationBreakdown = estimateDurationBreakdown(analysis.duration, !!fixResult);

  // Build tools array from analysis (placeholder - would come from actual tool results)
  const tools = options?.tools || buildDefaultToolsList(analysis);

  // Build agents array (placeholder - would come from actual agent usage)
  const agents = options?.agents || buildDefaultAgentsList(analysis, fixResult);

  // Calculate costs
  const costs = calculateCosts(analysis, fixResult, agents);

  // Build export options
  const availableExports: ExportFormat[] = ['markdown', 'html', 'pdf', 'sarif', 'json'];
  const exportUrls = buildExportUrls(options?.reportId || analysis.id, options?.webUrl);

  // Build report URLs
  const urls = buildReportUrls(options?.reportId || analysis.id, options?.webUrl);

  return {
    analysis: {
      id: analysis.id,
      startTime: new Date(
        new Date(analysis.timestamp).getTime() - analysis.duration
      ).toISOString(),
      endTime: analysis.timestamp,
      duration: {
        total: analysis.duration,
        formatted: formatDuration(analysis.duration),
        breakdown: durationBreakdown,
      },
      mode: analysis.mode,
      modeDescription: MODE_DESCRIPTIONS[analysis.mode],
    },
    tools,
    agents,
    costs,
    exports: {
      available: availableExports,
      urls: exportUrls,
    },
    urls,
  };
}

/**
 * Estimate duration breakdown
 */
function estimateDurationBreakdown(
  totalMs: number,
  hasFixes: boolean
): DurationBreakdown {
  // Typical breakdown percentages
  const percentages = hasFixes
    ? {
        cloning: 0.1,
        scanning: 0.35,
        comparison: 0.1,
        enrichment: 0.15,
        fixing: 0.2,
        reporting: 0.1,
      }
    : {
        cloning: 0.15,
        scanning: 0.45,
        comparison: 0.15,
        enrichment: 0.15,
        reporting: 0.1,
      };

  return {
    cloning: Math.round(totalMs * percentages.cloning),
    scanning: Math.round(totalMs * percentages.scanning),
    comparison: Math.round(totalMs * percentages.comparison),
    enrichment: Math.round(totalMs * percentages.enrichment),
    fixing: hasFixes ? Math.round(totalMs * (percentages.fixing || 0)) : undefined,
    reporting: Math.round(totalMs * percentages.reporting),
  };
}

/**
 * Build default tools list
 */
function buildDefaultToolsList(analysis: V9AnalysisResultInput): ToolUsage[] {
  // Extract unique tools from issues
  const toolMap = new Map<string, number>();
  for (const issue of analysis.issues) {
    const tool = issue.tool || 'unknown';
    toolMap.set(tool, (toolMap.get(tool) || 0) + 1);
  }

  const tools: ToolUsage[] = [];
  for (const [name, issuesFound] of Array.from(toolMap.entries())) {
    tools.push({
      name,
      version: 'latest',
      category: 'code_quality', // Would be determined by tool type
      issuesFound,
      executionTime: Math.round(analysis.duration * 0.1), // Estimate
      status: 'success',
    });
  }

  // Add common tools if not present
  const commonTools = ['semgrep', 'eslint', 'typescript'];
  for (const tool of commonTools) {
    if (!toolMap.has(tool)) {
      tools.push({
        name: tool,
        version: 'latest',
        category: 'code_quality',
        issuesFound: 0,
        executionTime: Math.round(analysis.duration * 0.05),
        status: 'success',
      });
    }
  }

  return tools;
}

/**
 * Build default agents list
 */
function buildDefaultAgentsList(
  analysis: V9AnalysisResultInput,
  fixResult?: FixOrchestrationResultInput
): AgentUsage[] {
  const agents: AgentUsage[] = [
    {
      name: 'Security Agent',
      role: 'Analyze security vulnerabilities',
      model: 'claude-3-haiku',
      tokensUsed: 5000,
      cost: 0.01,
      executionTime: 5000,
    },
    {
      name: 'Quality Agent',
      role: 'Analyze code quality issues',
      model: 'claude-3-haiku',
      tokensUsed: 8000,
      cost: 0.015,
      executionTime: 8000,
    },
    {
      name: 'Performance Agent',
      role: 'Analyze performance issues',
      model: 'claude-3-haiku',
      tokensUsed: 4000,
      cost: 0.008,
      executionTime: 4000,
    },
  ];

  // Add enrichment agent if AI enrichment was used
  if (analysis.mode === 'thorough' || analysis.mode === 'complete') {
    agents.push({
      name: 'Enrichment Agent',
      role: 'Enhance issue descriptions and suggestions',
      model: 'claude-3-sonnet',
      tokensUsed: 15000,
      cost: 0.03,
      executionTime: 15000,
    });
  }

  // Add fix agent if fixes were applied
  if (fixResult) {
    agents.push({
      name: 'Fix Agent',
      role: 'Generate and verify code fixes',
      model: 'claude-3-sonnet',
      tokensUsed: 20000,
      cost: 0.04,
      executionTime: 20000,
    });
  }

  return agents;
}

/**
 * Calculate costs
 */
function calculateCosts(
  analysis: V9AnalysisResultInput,
  fixResult: FixOrchestrationResultInput | undefined,
  agents: AgentUsage[]
): CostBreakdown {
  // Calculate analysis cost from agents
  const analysisCost = agents
    .filter((a) => a.name !== 'Fix Agent')
    .reduce((sum, a) => sum + a.cost, 0);
  const analysisTokens = agents
    .filter((a) => a.name !== 'Fix Agent')
    .reduce((sum, a) => sum + a.tokensUsed, 0);
  const analysisApiCalls = agents.filter((a) => a.name !== 'Fix Agent').length;

  const costs: CostBreakdown = {
    analysis: {
      apiCalls: analysisApiCalls,
      tokens: analysisTokens,
      cost: Math.round(analysisCost * 1000) / 1000,
    },
    total: analysisCost,
  };

  // Add fixing costs if applicable
  if (fixResult) {
    const fixAgent = agents.find((a) => a.name === 'Fix Agent');
    const fixCost = fixAgent?.cost || 0.04;
    const fixTokens = fixAgent?.tokensUsed || 20000;

    costs.fixing = {
      apiCalls: 1,
      tokens: fixTokens,
      cost: Math.round(fixCost * 1000) / 1000,
    };

    costs.total = Math.round((analysisCost + fixCost) * 1000) / 1000;
  }

  return costs;
}

/**
 * Build export URLs
 */
function buildExportUrls(
  reportId: string,
  webUrl?: string
): Record<string, string> {
  const baseUrl = webUrl || `https://app.codequal.dev/reports/${reportId}`;

  return {
    markdown: `${baseUrl}/export/markdown`,
    html: `${baseUrl}/export/html`,
    pdf: `${baseUrl}/export/pdf`,
    sarif: `${baseUrl}/export/sarif`,
    json: `${baseUrl}/export/json`,
  };
}

/**
 * Build report URLs
 */
function buildReportUrls(
  reportId: string,
  webUrl?: string
): UnifiedReportMetadata['urls'] {
  const baseUrl = webUrl || `https://app.codequal.dev/reports/${reportId}`;

  return {
    web: baseUrl,
    api: `https://api.codequal.dev/v1/reports/${reportId}`,
    raw: `https://api.codequal.dev/v1/reports/${reportId}/raw`,
  };
}

/**
 * Format duration in milliseconds to human-readable string
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }

  return `${minutes}m ${remainingSeconds}s`;
}
