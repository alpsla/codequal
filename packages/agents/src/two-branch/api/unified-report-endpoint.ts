/**
 * Unified Report API Endpoint
 *
 * REST API endpoints for unified report generation, retrieval, and export.
 * Supports both BASIC and PRO tiers with tier-specific content.
 *
 * Endpoints:
 * - POST /api/reports - Generate a new unified report
 * - GET /api/reports/:reportId - Get unified report by ID
 * - GET /api/reports/:reportId/section/:sectionName - Get specific section
 * - GET /api/reports/:reportId/export/:format - Export report
 * - GET /api/users/:userId/preferences - Get user preferences
 * - PUT /api/users/:userId/preferences - Update user preferences
 * - GET /api/users/:userId/history - Get analysis history
 */

import {
  UnifiedReport,
  ReportTier,
  ReportSectionName,
  ExportFormat,
  UserPreferences,
  HistoricalAnalysis,
  GetSectionOptions,
  V9AnalysisResultInput,
  FixOrchestrationResultInput,
} from '../report/unified-report-types';

import { generateUnifiedReportSync } from '../report/unified-report-generator';

// ============================================================================
// TYPES
// ============================================================================

export interface APIRequest<T = unknown> {
  body?: T;
  params?: Record<string, string>;
  query?: Record<string, string>;
  headers?: Record<string, string>;
}

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface GenerateReportRequestBody {
  analysisId: string;
  userId: string;
  tier?: ReportTier;
  options?: {
    includeHistoricalData?: boolean;
    includeCommunityImpact?: boolean;
    includeAchievements?: boolean;
    achievementStyle?: 'professional' | 'gamified';
  };
}

export interface UpdatePreferencesRequestBody {
  historyDisplayCount?: number;
  defaultOutputMethod?: 'commit' | 'branch' | 'pull_request' | 'patch';
  defaultCommitStyle?: 'single' | 'grouped_category' | 'grouped_tier';
  defaultFixScope?: 'safe' | 'recommended' | 'maximum' | 'always_ask';
  commitMessageTemplate?: string;
  reviewConfidenceThreshold?: number;
  alwaysReviewSecurity?: boolean;
  alwaysReviewDependencies?: boolean;
  alwaysReviewPerformance?: boolean;
  hourlyRate?: number;
  achievementStyle?: 'professional' | 'gamified';
}

// ============================================================================
// IN-MEMORY STORAGE (Replace with Supabase in production)
// ============================================================================

const reportStore = new Map<string, {
  report: UnifiedReport;
  createdAt: string;
  analysisId: string;
  userId: string;
}>();

const analysisStore = new Map<string, {
  result: V9AnalysisResultInput;
  fixResult?: FixOrchestrationResultInput;
}>();

const preferencesStore = new Map<string, UserPreferences>();

const historyStore = new Map<string, HistoricalAnalysis[]>();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateReportId(): string {
  return `rpt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function getDefaultPreferences(userId: string): UserPreferences {
  return {
    userId,
    historyDisplayCount: 5,
    defaultOutputMethod: 'branch',
    defaultCommitStyle: 'grouped_category',
    defaultFixScope: 'recommended',
    commitMessageTemplate:
      'fix({category}): {summary}\n\n{details}\n\nIssues fixed: {count}',
    reviewConfidenceThreshold: 85,
    alwaysReviewSecurity: true,
    alwaysReviewDependencies: true,
    alwaysReviewPerformance: false,
    hourlyRate: 150,
    achievementStyle: 'professional',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function getMockAnalysisResult(analysisId: string): V9AnalysisResultInput | undefined {
  // Check if we have stored analysis
  const stored = analysisStore.get(analysisId);
  if (stored) {
    return stored.result;
  }
  return undefined;
}

function getMockFixResult(analysisId: string): FixOrchestrationResultInput | undefined {
  const stored = analysisStore.get(analysisId);
  return stored?.fixResult;
}

// ============================================================================
// ENDPOINT HANDLERS
// ============================================================================

/**
 * POST /api/reports
 * Generate a new unified report from an analysis
 */
export async function handleGenerateReport(
  req: APIRequest<GenerateReportRequestBody>
): Promise<APIResponse<{ reportId: string; report: UnifiedReport }>> {
  const body = req.body;

  if (!body?.analysisId || !body?.userId) {
    return {
      success: false,
      error: 'Missing required fields: analysisId and userId',
      timestamp: new Date().toISOString(),
    };
  }

  try {
    // Get analysis result
    const analysisResult = getMockAnalysisResult(body.analysisId);
    if (!analysisResult) {
      return {
        success: false,
        error: `Analysis not found: ${body.analysisId}`,
        timestamp: new Date().toISOString(),
      };
    }

    // Get fix result if PRO tier
    const tier = body.tier || 'basic';
    const fixResult = tier === 'pro' ? getMockFixResult(body.analysisId) : undefined;

    // Generate unified report
    const report = generateUnifiedReportSync(
      analysisResult,
      fixResult,
      tier,
      {
        preferences: preferencesStore.get(body.userId) || getDefaultPreferences(body.userId),
        history: historyStore.get(`${body.userId}-${analysisResult.repositoryUrl}`) || [],
      }
    );

    // Store report
    const reportId = report.id;
    reportStore.set(reportId, {
      report,
      createdAt: new Date().toISOString(),
      analysisId: body.analysisId,
      userId: body.userId,
    });

    return {
      success: true,
      data: { reportId, report },
      timestamp: new Date().toISOString(),
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to generate report: ${errorMessage}`,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * GET /api/reports/:reportId
 * Get a unified report by ID
 */
export async function handleGetReport(
  req: APIRequest
): Promise<APIResponse<UnifiedReport>> {
  const reportId = req.params?.reportId;

  if (!reportId) {
    return {
      success: false,
      error: 'Missing reportId parameter',
      timestamp: new Date().toISOString(),
    };
  }

  const stored = reportStore.get(reportId);
  if (!stored) {
    return {
      success: false,
      error: `Report not found: ${reportId}`,
      timestamp: new Date().toISOString(),
    };
  }

  return {
    success: true,
    data: stored.report,
    timestamp: new Date().toISOString(),
  };
}

/**
 * GET /api/reports/:reportId/section/:sectionName
 * Get a specific section of a report with optional expansion
 */
export async function handleGetReportSection(
  req: APIRequest
): Promise<APIResponse<unknown>> {
  const reportId = req.params?.reportId;
  const sectionName = req.params?.sectionName as ReportSectionName;
  const query = req.query || {};

  if (!reportId || !sectionName) {
    return {
      success: false,
      error: 'Missing reportId or sectionName parameter',
      timestamp: new Date().toISOString(),
    };
  }

  const stored = reportStore.get(reportId);
  if (!stored) {
    return {
      success: false,
      error: `Report not found: ${reportId}`,
      timestamp: new Date().toISOString(),
    };
  }

  const report = stored.report;
  const sectionData = getSectionByName(report, sectionName);

  if (sectionData === undefined) {
    return {
      success: false,
      error: `Section not found: ${sectionName}`,
      timestamp: new Date().toISOString(),
    };
  }

  // Apply expansion options
  const options: GetSectionOptions = {
    expand: query.expand?.split(','),
    limit: query.limit ? parseInt(query.limit, 10) : undefined,
    offset: query.offset ? parseInt(query.offset, 10) : undefined,
  };

  const expandedData = expandSectionData(sectionData, options);

  return {
    success: true,
    data: expandedData,
    timestamp: new Date().toISOString(),
  };
}

/**
 * GET /api/reports/:reportId/export/:format
 * Export a report in a specific format
 */
export async function handleExportReport(
  req: APIRequest
): Promise<APIResponse<{ content: string; contentType: string; filename: string }>> {
  const reportId = req.params?.reportId;
  const format = req.params?.format as ExportFormat;

  if (!reportId || !format) {
    return {
      success: false,
      error: 'Missing reportId or format parameter',
      timestamp: new Date().toISOString(),
    };
  }

  const validFormats: ExportFormat[] = ['markdown', 'html', 'pdf', 'sarif', 'json', 'lsp', 'gitlab'];
  if (!validFormats.includes(format)) {
    return {
      success: false,
      error: `Invalid format: ${format}. Valid formats: ${validFormats.join(', ')}`,
      timestamp: new Date().toISOString(),
    };
  }

  const stored = reportStore.get(reportId);
  if (!stored) {
    return {
      success: false,
      error: `Report not found: ${reportId}`,
      timestamp: new Date().toISOString(),
    };
  }

  try {
    const exported = exportReport(stored.report, format);
    return {
      success: true,
      data: exported,
      timestamp: new Date().toISOString(),
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Export failed: ${errorMessage}`,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * GET /api/users/:userId/preferences
 * Get user preferences
 */
export async function handleGetPreferences(
  req: APIRequest
): Promise<APIResponse<UserPreferences>> {
  const userId = req.params?.userId;

  if (!userId) {
    return {
      success: false,
      error: 'Missing userId parameter',
      timestamp: new Date().toISOString(),
    };
  }

  const preferences = preferencesStore.get(userId) || getDefaultPreferences(userId);

  return {
    success: true,
    data: preferences,
    timestamp: new Date().toISOString(),
  };
}

/**
 * PUT /api/users/:userId/preferences
 * Update user preferences
 */
export async function handleUpdatePreferences(
  req: APIRequest<UpdatePreferencesRequestBody>
): Promise<APIResponse<UserPreferences>> {
  const userId = req.params?.userId;
  const body = req.body;

  if (!userId) {
    return {
      success: false,
      error: 'Missing userId parameter',
      timestamp: new Date().toISOString(),
    };
  }

  const existing = preferencesStore.get(userId) || getDefaultPreferences(userId);

  const updated: UserPreferences = {
    ...existing,
    ...body,
    updatedAt: new Date().toISOString(),
  };

  preferencesStore.set(userId, updated);

  return {
    success: true,
    data: updated,
    timestamp: new Date().toISOString(),
  };
}

/**
 * GET /api/users/:userId/history
 * Get analysis history for a user
 */
export async function handleGetHistory(
  req: APIRequest
): Promise<APIResponse<{ analyses: HistoricalAnalysis[]; total: number }>> {
  const userId = req.params?.userId;
  const repositoryId = req.query?.repositoryId;
  const limit = parseInt(req.query?.limit || '10', 10);
  const offset = parseInt(req.query?.offset || '0', 10);

  if (!userId) {
    return {
      success: false,
      error: 'Missing userId parameter',
      timestamp: new Date().toISOString(),
    };
  }

  // Get history (filtered by repository if provided)
  let history: HistoricalAnalysis[] = [];
  if (repositoryId) {
    history = historyStore.get(`${userId}-${repositoryId}`) || [];
  } else {
    // Collect all history for this user
    for (const [key, value] of Array.from(historyStore.entries())) {
      if (key.startsWith(`${userId}-`)) {
        history = history.concat(value);
      }
    }
  }

  // Sort by timestamp descending
  history.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const total = history.length;
  const paginated = history.slice(offset, offset + limit);

  return {
    success: true,
    data: { analyses: paginated, total },
    timestamp: new Date().toISOString(),
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getSectionByName(report: UnifiedReport, sectionName: ReportSectionName): unknown {
  const sectionMap: Record<ReportSectionName, unknown> = {
    header: report.header,
    progressHistory: report.progressHistory,
    fixSummary: report.fixSummary,
    remainingIssues: report.remainingIssues,
    businessImpact: report.businessImpact,
    educational: report.educational,
    skillsAndAchievements: report.skillsAndAchievements,
    commitInfo: report.commitInfo,
    metadata: report.metadata,
  };

  return sectionMap[sectionName];
}

function expandSectionData(
  data: unknown,
  options: GetSectionOptions
): unknown {
  // For now, just return the data as-is
  // In production, this would handle lazy loading of nested data
  if (options.limit !== undefined && Array.isArray(data)) {
    const offset = options.offset || 0;
    return data.slice(offset, offset + options.limit);
  }
  return data;
}

function exportReport(
  report: UnifiedReport,
  format: ExportFormat
): { content: string; contentType: string; filename: string } {
  const baseFilename = `codequal-report-${report.id}`;

  switch (format) {
    case 'json':
      return {
        content: JSON.stringify(report, null, 2),
        contentType: 'application/json',
        filename: `${baseFilename}.json`,
      };

    case 'markdown':
      return {
        content: generateMarkdownExport(report),
        contentType: 'text/markdown',
        filename: `${baseFilename}.md`,
      };

    case 'html':
      return {
        content: generateHtmlExport(report),
        contentType: 'text/html',
        filename: `${baseFilename}.html`,
      };

    case 'sarif':
      return {
        content: generateSarifExport(report),
        contentType: 'application/json',
        filename: `${baseFilename}.sarif.json`,
      };

    case 'lsp':
      return {
        content: generateLSPExport(report),
        contentType: 'application/json',
        filename: 'codequal-lsp-actions.json',
      };

    case 'gitlab':
      return {
        content: generateGitLabExport(report),
        contentType: 'application/json',
        filename: 'codequal-gitlab-codequality.json',
      };

    case 'pdf':
      // PDF generation would require a library like puppeteer or pdfkit
      // For now, return HTML that can be converted client-side
      return {
        content: generateHtmlExport(report),
        contentType: 'text/html',
        filename: `${baseFilename}.html`,
      };

    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

function generateMarkdownExport(report: UnifiedReport): string {
  const header = report.header;
  const stats = header.stats;

  let md = `# CodeQual Analysis Report\n\n`;
  md += `**Repository:** ${header.repository.name}\n`;
  md += `**PR:** #${header.pullRequest.number} - ${header.pullRequest.title}\n`;
  md += `**Score:** ${header.score.value}/100 (${header.score.grade})\n`;
  md += `**Decision:** ${header.decision.status}\n\n`;

  md += `## Summary\n\n`;
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Total Issues | ${stats.totalIssuesFound} |\n`;
  md += `| New Issues | ${stats.issuesByStatus.new} |\n`;
  md += `| Resolved | ${stats.issuesByStatus.resolved} |\n`;
  md += `| Critical | ${stats.issuesBySeverity.critical} |\n`;
  md += `| High | ${stats.issuesBySeverity.high} |\n`;
  md += `| Medium | ${stats.issuesBySeverity.medium} |\n`;
  md += `| Low | ${stats.issuesBySeverity.low} |\n\n`;

  // Add remaining issues section
  if (report.remainingIssues.blocking.length > 0) {
    md += `## Blocking Issues\n\n`;
    for (const issue of report.remainingIssues.blocking) {
      md += `### ${issue.title}\n`;
      md += `- **File:** ${issue.file}:${issue.line}\n`;
      md += `- **Severity:** ${issue.severity}\n`;
      md += `- **Category:** ${issue.category}\n`;
      md += `\n${issue.description}\n\n`;
    }
  }

  // Business impact
  const impact = report.businessImpact;
  md += `## Business Impact\n\n`;
  md += `- **Manual fix time:** ${impact.time.manual.formatted}\n`;
  md += `- **Automated time:** ${impact.time.automated.formatted}\n`;
  if (impact.time.saved) {
    md += `- **Time saved:** ${impact.time.saved.formatted} (${impact.time.saved.percent}%)\n`;
  }
  md += `\n`;

  md += `---\n\n`;
  md += `*Generated by CodeQual v${report.version} at ${report.generatedAt}*\n`;

  return md;
}

function generateHtmlExport(report: UnifiedReport): string {
  const header = report.header;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CodeQual Report - ${header.repository.name}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; }
    .score { font-size: 48px; font-weight: bold; }
    .grade { font-size: 24px; opacity: 0.9; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
    .stat-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
    .stat-value { font-size: 32px; font-weight: bold; color: #333; }
    .stat-label { color: #666; margin-top: 5px; }
    .section { margin: 30px 0; }
    .section-title { font-size: 24px; font-weight: 600; margin-bottom: 15px; }
    .issue { background: #fff; border: 1px solid #e9ecef; border-radius: 8px; padding: 15px; margin: 10px 0; }
    .issue-header { display: flex; justify-content: space-between; align-items: center; }
    .severity-critical { color: #dc3545; }
    .severity-high { color: #fd7e14; }
    .severity-medium { color: #ffc107; }
    .severity-low { color: #28a745; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${header.repository.name}</h1>
    <p>PR #${header.pullRequest.number}: ${header.pullRequest.title}</p>
    <div class="score">${header.score.value}</div>
    <div class="grade">Grade: ${header.score.grade}</div>
  </div>

  <div class="stats">
    <div class="stat-card">
      <div class="stat-value">${header.stats.totalIssuesFound}</div>
      <div class="stat-label">Total Issues</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${header.stats.issuesByStatus.new}</div>
      <div class="stat-label">New Issues</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${header.stats.issuesByStatus.resolved}</div>
      <div class="stat-label">Resolved</div>
    </div>
    <div class="stat-card">
      <div class="stat-value severity-${header.stats.issuesBySeverity.critical > 0 ? 'critical' : 'low'}">${header.stats.issuesBySeverity.critical}</div>
      <div class="stat-label">Critical</div>
    </div>
  </div>

  <div class="section">
    <h2 class="section-title">Decision: ${header.decision.status}</h2>
    <p>${header.decision.reason}</p>
  </div>

  <footer style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #e9ecef; color: #666;">
    <p>Generated by CodeQual v${report.version} at ${report.generatedAt}</p>
  </footer>
</body>
</html>`;
}

function generateSarifExport(report: UnifiedReport): string {
  const sarif = {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'CodeQual',
            version: report.version,
            informationUri: 'https://codequal.dev',
            rules: [] as Array<{
              id: string;
              name: string;
              shortDescription: { text: string };
              fullDescription: { text: string };
              defaultConfiguration: { level: string };
            }>,
          },
        },
        results: [] as Array<{
          ruleId: string;
          level: string;
          message: { text: string };
          locations: Array<{
            physicalLocation: {
              artifactLocation: { uri: string };
              region: { startLine: number; startColumn?: number };
            };
          }>;
        }>,
      },
    ],
  };

  // Add rules and results from remaining issues
  const ruleMap = new Map<string, boolean>();

  const allIssues = [
    ...report.remainingIssues.blocking,
    ...report.remainingIssues.highPriority,
  ];

  for (const issue of allIssues) {
    // Add rule if not already added
    if (!ruleMap.has(issue.ruleId)) {
      sarif.runs[0].tool.driver.rules.push({
        id: issue.ruleId,
        name: issue.ruleName,
        shortDescription: { text: issue.title },
        fullDescription: { text: issue.description },
        defaultConfiguration: {
          level: issue.severity === 'critical' || issue.severity === 'high' ? 'error' : 'warning',
        },
      });
      ruleMap.set(issue.ruleId, true);
    }

    // Add result
    sarif.runs[0].results.push({
      ruleId: issue.ruleId,
      level: issue.severity === 'critical' || issue.severity === 'high' ? 'error' : 'warning',
      message: { text: issue.description },
      locations: [
        {
          physicalLocation: {
            artifactLocation: { uri: issue.file },
            region: {
              startLine: issue.line,
              startColumn: issue.column,
            },
          },
        },
      ],
    });
  }

  return JSON.stringify(sarif, null, 2);
}

function generateLSPExport(report: UnifiedReport): string {
  const lspActions: Array<{
    title: string;
    kind: string;
    diagnostics: Array<{
      range: { start: { line: number; character: number }; end: { line: number; character: number } };
      message: string;
      severity: number;
      source: string;
      code: string;
    }>;
    edit?: {
      changes: Record<string, Array<{
        range: { start: { line: number; character: number }; end: { line: number; character: number } };
        newText: string;
      }>>;
    };
  }> = [];

  const allIssues = [
    ...report.remainingIssues.blocking,
    ...report.remainingIssues.highPriority,
  ];

  // Group fixes by file
  const fixesByFile = new Map<string, typeof allIssues>();
  for (const issue of allIssues) {
    const existing = fixesByFile.get(issue.file) || [];
    existing.push(issue);
    fixesByFile.set(issue.file, existing);
  }

  // Create individual code actions for each issue
  for (const issue of allIssues) {
    const action = {
      title: `Fix: ${issue.ruleId} - ${issue.title.slice(0, 50)}`,
      kind: 'quickfix',
      diagnostics: [
        {
          range: {
            start: { line: issue.line - 1, character: (issue.column || 1) - 1 },
            end: { line: (issue.endLine || issue.line) - 1, character: (issue.endColumn || 100) - 1 },
          },
          message: issue.description,
          severity: issue.severity === 'critical' || issue.severity === 'high' ? 1 : 2,
          source: 'codequal',
          code: issue.ruleId,
        },
      ],
      edit: issue.recommendedCode
        ? {
            changes: {
              [`file://${issue.file}`]: [
                {
                  range: {
                    start: { line: issue.line - 1, character: 0 },
                    end: { line: (issue.endLine || issue.line) - 1, character: 1000 },
                  },
                  newText: issue.recommendedCode,
                },
              ],
            },
          }
        : undefined,
    };

    lspActions.push(action);
  }

  // Add batch action for all fixes
  if (lspActions.length > 0) {
    lspActions.unshift({
      title: `Apply All Fixes (${lspActions.length} issues)`,
      kind: 'source.fixAll.codequal',
      diagnostics: [],
    });
  }

  return JSON.stringify(lspActions, null, 2);
}

function generateGitLabExport(report: UnifiedReport): string {
  const crypto = require('crypto');

  type GitLabSeverity = 'blocker' | 'critical' | 'major' | 'minor' | 'info';

  interface GitLabCodeQualityIssue {
    type: 'issue';
    check_name: string;
    description: string;
    content: { body: string };
    categories: string[];
    severity: GitLabSeverity;
    fingerprint: string;
    location: {
      path: string;
      lines: { begin: number; end?: number };
    };
  }

  const mapSeverity = (severity: string): GitLabSeverity => {
    switch (severity) {
      case 'critical': return 'blocker';
      case 'high': return 'critical';
      case 'medium': return 'major';
      case 'low': return 'minor';
      default: return 'info';
    }
  };

  const mapCategory = (category: string): string[] => {
    switch (category) {
      case 'security': return ['Security', 'Bug Risk'];
      case 'performance': return ['Performance'];
      case 'code_quality': return ['Bug Risk', 'Clarity'];
      case 'architecture': return ['Complexity', 'Clarity'];
      case 'dependencies': return ['Security', 'Compatibility'];
      default: return ['Bug Risk'];
    }
  };

  const allIssues = [
    ...report.remainingIssues.blocking,
    ...report.remainingIssues.highPriority,
    ...report.remainingIssues.mediumLow.flatMap((g) => {
      // For grouped issues, create one entry per group
      return [{
        ruleId: g.ruleId,
        ruleName: g.ruleName,
        category: g.category,
        severity: g.severity,
        description: g.briefDescription,
        file: g.files[0]?.path || 'unknown',
        line: g.files[0]?.lines[0] || 1,
        count: g.count,
      }];
    }),
  ];

  const issues: GitLabCodeQualityIssue[] = allIssues.map((issue, idx) => {
    const fingerprint = crypto
      .createHash('md5')
      .update(`${'file' in issue ? issue.file : ''}:${'ruleId' in issue ? issue.ruleId : ''}:${idx}`)
      .digest('hex');

    return {
      type: 'issue' as const,
      check_name: `codequal/${'ruleId' in issue ? issue.ruleId : 'unknown'}`,
      description: 'title' in issue ? issue.title : ('ruleName' in issue ? issue.ruleName : 'Issue'),
      content: {
        body: `${'description' in issue ? issue.description : ''}\n\n**Rule:** ${'ruleId' in issue ? issue.ruleId : 'unknown'}`,
      },
      categories: mapCategory('category' in issue ? issue.category : 'code_quality'),
      severity: mapSeverity('severity' in issue ? issue.severity : 'medium'),
      fingerprint,
      location: {
        path: 'file' in issue ? issue.file : 'unknown',
        lines: {
          begin: 'line' in issue ? issue.line : 1,
          end: 'endLine' in issue ? issue.endLine : undefined,
        },
      },
    };
  });

  return JSON.stringify(issues, null, 2);
}

// ============================================================================
// ANALYSIS RESULT REGISTRATION (for integration with v9-analysis-service)
// ============================================================================

/**
 * Register an analysis result for report generation
 * Called internally after V9 analysis completes
 */
export function registerAnalysisResult(
  analysisId: string,
  result: V9AnalysisResultInput,
  fixResult?: FixOrchestrationResultInput
): void {
  analysisStore.set(analysisId, { result, fixResult });
}

/**
 * Add historical analysis record
 */
export function addHistoricalAnalysis(
  userId: string,
  repositoryId: string,
  analysis: HistoricalAnalysis
): void {
  const key = `${userId}-${repositoryId}`;
  const existing = historyStore.get(key) || [];
  existing.push(analysis);
  historyStore.set(key, existing);
}

// ============================================================================
// EXPRESS.JS INTEGRATION
// ============================================================================

export const expressHandlers = {
  async generateReport(req: unknown, res: unknown): Promise<void> {
    const typedReq = req as { body: GenerateReportRequestBody };
    const typedRes = res as { status: (code: number) => { json: (data: unknown) => void } };
    const result = await handleGenerateReport({ body: typedReq.body });
    typedRes.status(result.success ? 201 : 400).json(result);
  },

  async getReport(req: unknown, res: unknown): Promise<void> {
    const typedReq = req as { params: Record<string, string> };
    const typedRes = res as { status: (code: number) => { json: (data: unknown) => void } };
    const result = await handleGetReport({ params: typedReq.params });
    typedRes.status(result.success ? 200 : 404).json(result);
  },

  async getReportSection(req: unknown, res: unknown): Promise<void> {
    const typedReq = req as { params: Record<string, string>; query: Record<string, string> };
    const typedRes = res as { status: (code: number) => { json: (data: unknown) => void } };
    const result = await handleGetReportSection({
      params: typedReq.params,
      query: typedReq.query,
    });
    typedRes.status(result.success ? 200 : 404).json(result);
  },

  async exportReport(req: unknown, res: unknown): Promise<void> {
    const typedReq = req as { params: Record<string, string> };
    const typedRes = res as {
      status: (code: number) => { json: (data: unknown) => void };
      setHeader: (name: string, value: string) => void;
      send: (data: string) => void;
    };
    const result = await handleExportReport({ params: typedReq.params });
    if (result.success && result.data) {
      typedRes.setHeader('Content-Type', result.data.contentType);
      typedRes.setHeader('Content-Disposition', `attachment; filename="${result.data.filename}"`);
      typedRes.send(result.data.content);
    } else {
      typedRes.status(404).json(result);
    }
  },

  async getPreferences(req: unknown, res: unknown): Promise<void> {
    const typedReq = req as { params: Record<string, string> };
    const typedRes = res as { status: (code: number) => { json: (data: unknown) => void } };
    const result = await handleGetPreferences({ params: typedReq.params });
    typedRes.status(result.success ? 200 : 404).json(result);
  },

  async updatePreferences(req: unknown, res: unknown): Promise<void> {
    const typedReq = req as { params: Record<string, string>; body: UpdatePreferencesRequestBody };
    const typedRes = res as { status: (code: number) => { json: (data: unknown) => void } };
    const result = await handleUpdatePreferences({
      params: typedReq.params,
      body: typedReq.body,
    });
    typedRes.status(result.success ? 200 : 400).json(result);
  },

  async getHistory(req: unknown, res: unknown): Promise<void> {
    const typedReq = req as { params: Record<string, string>; query: Record<string, string> };
    const typedRes = res as { status: (code: number) => { json: (data: unknown) => void } };
    const result = await handleGetHistory({
      params: typedReq.params,
      query: typedReq.query,
    });
    typedRes.status(result.success ? 200 : 404).json(result);
  },
};

/**
 * Express router setup helper
 */
export function setupReportRoutes(router: {
  post: (path: string, handler: (req: unknown, res: unknown) => Promise<void>) => void;
  get: (path: string, handler: (req: unknown, res: unknown) => Promise<void>) => void;
  put: (path: string, handler: (req: unknown, res: unknown) => Promise<void>) => void;
}): void {
  // Report routes
  router.post('/reports', expressHandlers.generateReport);
  router.get('/reports/:reportId', expressHandlers.getReport);
  router.get('/reports/:reportId/section/:sectionName', expressHandlers.getReportSection);
  router.get('/reports/:reportId/export/:format', expressHandlers.exportReport);

  // User routes
  router.get('/users/:userId/preferences', expressHandlers.getPreferences);
  router.put('/users/:userId/preferences', expressHandlers.updatePreferences);
  router.get('/users/:userId/history', expressHandlers.getHistory);
}
