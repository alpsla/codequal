import { Router, Request, Response } from 'express';
import { getSupabase } from '@codequal/database';
import { createLogger } from '@codequal/core/utils';
import { StandardReport } from '@codequal/agents/services';

interface Finding {
  title: string;
  file?: string;
  line?: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  description?: string;
  recommendation?: string;
  isPRIssue?: boolean;
  isRepoIssue?: boolean;
  type?: string;
  category?: string;
  codeSnippet?: string;
}

interface ReportStructure {
  id?: string;
  repositoryUrl?: string;
  prNumber?: string;
  timestamp?: string;
  reportUrl?: string;
  filesAnalyzed?: number;
  linesAdded?: number;
  linesRemoved?: number;
  primaryLanguage?: string;
  overview?: {
    analysisScore?: number;
    riskLevel?: string;
    totalFindings?: number;
    executiveSummary?: string;
    blockingIssues?: Array<{ message?: string }>;
    decision?: {
      status: string;
      reason?: string;
      confidence?: number;
      message?: string;
    };
    positiveFindings?: Array<{ message?: string }>;
  };
  modules?: {
    findings?: {
      categories?: Record<string, {
        name: string;
        icon: string;
        summary?: string;
        findings: Finding[];
      }>;
    };
    recommendations?: {
      categories: Array<{
        name: string;
        recommendations: Array<{
          title: string;
          priority: string;
          impact: string;
          description?: string;
          effort?: string;
        }>;
      }>;
    };
    educationalContent?: {
      totalTime?: string;
      resources?: Array<{
        title: string;
        description?: string;
        links?: Array<{
          url: string;
          title: string;
        }>;
        [key: string]: unknown;
      }>;
      [key: string]: unknown;
    };
    skillsAssessment?: {
      skills?: Array<{
        name: string;
        level: string;
        score: number;
      }>;
      [key: string]: unknown;
    };
  };
  exports?: {
    prComment?: string;
    htmlReport?: string;
    markdownReport?: string;
  };
  agents?: Record<string, unknown>;
  tools?: Record<string, unknown>;
  visualizations?: unknown;
}
import { VectorContextService, createVectorContextService } from '@codequal/agents/multi-agent';
import { AuthenticatedUser as AgentAuthenticatedUser, UserRole, UserStatus, UserPermissions } from '@codequal/agents/multi-agent/types';
import { AuthenticatedUser } from '../middleware/auth-middleware';
import { ResultOrchestrator } from '../services/result-orchestrator';
import { HtmlReportGeneratorV5, ReportInput } from '../services/html-report-generator-v5';
// Use V5 as the main generator
const HtmlReportGenerator = HtmlReportGeneratorV5;
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();
const logger = createLogger('AnalysisReportsAPI');

// Helper function to convert API AuthenticatedUser to Agent AuthenticatedUser
function toAgentAuthenticatedUser(user: AuthenticatedUser): AgentAuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    name: user.email,
    organizationId: user.organizationId,
    permissions: {
      repositories: {},
      organizations: [],
      globalPermissions: [],
      quotas: {
        requestsPerHour: 1000,
        maxConcurrentExecutions: 5,
        storageQuotaMB: 100
      }
    },
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    session: {
      token: user.session.token,
      expiresAt: user.session.expiresAt,
      fingerprint: 'api-fingerprint',
      ipAddress: '127.0.0.1',
      userAgent: 'CodeQual-API'
    }
  };
}

// Import Vector DB retrieval services
import { createVectorReportRetrievalService } from '../services/vector-report-retrieval-service';
import { reportIdMappingService } from '../services/report-id-mapping-service';

/**
 * GET /analysis/real-pr-test
 * Test with a real GitHub PR (no auth required in dev mode)
 */
router.get('/analysis/real-pr-test', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Test endpoint not available in production' });
  }

  try {
    // Create test user for development
    const testUser: AuthenticatedUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      permissions: [],
      role: 'user',
      status: 'active',
      session: {
        token: 'test-token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    };
    
    // Create result orchestrator to run real analysis
    const orchestrator = new ResultOrchestrator(testUser);
    
    // Use a small public PR for testing
    const testPR = {
      repositoryUrl: 'https://github.com/facebook/react',
      prNumber: 28000, // A small, recent PR
      analysisMode: 'comprehensive' as const,
      authenticatedUser: testUser
    };
    
    logger.info('Starting real PR analysis', testPR);
    
    // Run the analysis
    const result = await orchestrator.analyzePR(testPR);
    
    // Generate enhanced HTML report
    const generator = new HtmlReportGenerator();
    const html = generator.generateEnhancedHtmlReport(result);
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
    
  } catch (error) {
    logger.error('Real PR test failed', { error });
    res.status(500).json({ 
      error: 'Failed to analyze PR', 
      details: error instanceof Error ? error.message : 'Unknown error',
      suggestion: 'Try with a smaller PR or check GitHub API access'
    });
  }
});

/**
 * GET /analysis/demo-report
 * Get a demo report with enhanced template (no auth required in dev mode)
 */
router.get('/analysis/demo-report', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Demo endpoint not available in production' });
  }
  
  const testReportId = `report_demo_enhanced_${Date.now()}`;
  const testReport = {
    id: testReportId,
    repository_url: 'https://github.com/codequal/test-repo',
    pr_number: 42,
    analysis_date: new Date().toISOString(),
    agents: {
      security: {
        score: 85,
        findings: [
          {
            type: 'security',
            severity: 'medium',
            message: 'Potential SQL injection vulnerability detected',
            file: 'src/database/queries.ts',
            line: 45,
            recommendation: 'Use parameterized queries instead of string concatenation'
          }
        ]
      },
      codeQuality: {
        score: 92,
        findings: [
          {
            type: 'code_quality',
            severity: 'low',
            message: 'Function complexity is too high',
            file: 'src/services/analyzer.ts',
            line: 123,
            recommendation: 'Consider breaking down this function into smaller, more focused functions'
          }
        ]
      },
      performance: {
        score: 78,
        findings: [
          {
            type: 'performance',
            severity: 'high',
            message: 'Inefficient database query in loop',
            file: 'src/api/users.ts',
            line: 67,
            recommendation: 'Use batch queries or JOIN operations instead of N+1 queries'
          }
        ]
      },
      architecture: {
        score: 88,
        findings: []
      },
      dependencies: {
        score: 75,
        findings: [
          {
            type: 'dependency',
            severity: 'high',
            message: '3 high severity vulnerabilities found in dependencies',
            file: 'package.json',
            recommendation: 'Run npm audit fix to resolve vulnerabilities'
          }
        ]
      }
    },
    tools: {
      eslint: {
        errors: 2,
        warnings: 15,
        results: [
          { file: 'src/index.ts', line: 10, message: 'Missing semicolon', severity: 'error' }
        ]
      },
      prettier: {
        unformatted: 5,
        results: []
      },
      bundlephobia: {
        totalSize: '2.3MB',
        gzipSize: '645KB'
      }
    },
    overall_score: 84,
    deepwiki: {
      summary: 'This PR implements a new user authentication system with JWT tokens',
      changes: [
        'Added JWT authentication middleware',
        'Implemented user login and registration endpoints',
        'Added password hashing with bcrypt',
        'Created user session management'
      ]
    },
    educational: {
      modules: [
        {
          title: 'Security Best Practices',
          content: 'When implementing authentication, always use secure password hashing algorithms like bcrypt or argon2',
          difficulty: 'intermediate',
          estimatedTime: '5 minutes',
          tags: ['security', 'authentication', 'best-practices']
        }
      ]
    }
  };
  
  // Store the demo report mapping (in production, this would be done during report generation)
  await reportIdMappingService.storeMapping(
    testReportId,
    testReport.repository_url,
    testReport.pr_number,
    'demo-user'
  );
  
  // Generate HTML directly
  try {
    // HtmlReportGenerator already imported
    const generator = new HtmlReportGenerator();
    // Convert testReport to ReportInput format
    const reportInput: ReportInput = {
      overall_score: testReport.overall_score,
      report_data: {
        pr_details: {
          number: testReport.pr_number
        },
        deepwiki: {
          changes: testReport.deepwiki.changes.map((c) => ({ 
            additions: 10, 
            deletions: 5 
          })),
          score: 85
        },
        educational: testReport.educational
      }
    };
    const html = generator.generateEnhancedHtmlReport(reportInput);
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    // Fallback to JSON response
    res.json({
      success: true,
      reportId: testReportId,
      htmlUrl: `http://localhost:3001/v1/analysis/${testReportId}/report?format=html&api_key=test_key`,
      jsonUrl: `http://localhost:3001/v1/analysis/${testReportId}/report?format=json&api_key=test_key`,
      directUrl: `http://localhost:3001/v1/analysis/demo-report`
    });
  }
});

/**
 * GET /api/analysis/:reportId/report
 * Get analysis report in various formats (HTML, JSON, Markdown)
 * Supports both JWT auth and API key auth
 */
router.get('/analysis/:reportId/report', async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    const { format = 'json' } = req.query;
    
    // Check for API key in header or query
    const apiKey = req.headers['x-api-key'] as string || req.query.api_key as string;
    
    // Check for JWT token
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    
    if (!apiKey && !token) {
      return res.status(401).json({ 
        error: 'Authorization required',
        message: 'Please provide either an API key or authorization token'
      });
    }
    
    let userId: string | null = null;
    
    // If API key provided, verify it
    if (apiKey) {
      // Allow test_key in development mode
      if (apiKey === 'test_key' && process.env.NODE_ENV !== 'production') {
        userId = 'test_user';
      } else {
        const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
        const { data: keyData } = await getSupabase()
          .from('api_keys')
          .select('user_id, active')
          .eq('key_hash', keyHash)
          .single();
        
        if (!keyData || !keyData.active) {
          return res.status(401).json({ error: 'Invalid or inactive API key' });
        }
        
        userId = keyData.user_id as string;
      }
    }
    
    // If JWT token provided, verify it
    if (token && !userId) {
      const { data: { user }, error } = await getSupabase().auth.getUser(token);
      if (error || !user) {
        return res.status(401).json({ error: 'Invalid authorization token' });
      }
      userId = user.id;
    }
    
    logger.info('Retrieving report', { reportId, userId, format });
    
    // Try to retrieve report from Vector DB using report ID
    try {
      logger.info('Attempting to retrieve report from Vector DB', { reportId, userId });
      
      // Create authenticated user object for Vector DB access
      const authenticatedUser: AuthenticatedUser = {
        id: userId || 'api-user',
        email: 'api@codequal.dev',
        organizationId: 'default',
        permissions: [],
        role: 'user',
        status: 'active',
        session: {
          token: 'api-token',
          expiresAt: new Date(Date.now() + 3600000)
        }
      };
      
      // Create Vector context service and report retrieval service
      const agentUser = toAgentAuthenticatedUser(authenticatedUser);
      const vectorContextService = createVectorContextService(agentUser);
      const reportRetrievalService = createVectorReportRetrievalService(vectorContextService);
      
      // Retrieve report from Vector DB
      const report = await reportRetrievalService.retrieveReportById(reportId, userId || 'api-user');
      
      if (report) {
        logger.info('✅ Report retrieved from Vector DB', { reportId });
        
        // Generate response based on format
        try {
          if (format === 'html') {
            // HtmlReportGenerator already imported
            const generator = new HtmlReportGenerator();
            const htmlContent = generator.generateEnhancedHtmlReport({
              ...report,
              timestamp: report.timestamp.toISOString()
            });
            res.setHeader('Content-Type', 'text/html');
            return res.send(htmlContent);
          } else if (format === 'markdown') {
            res.setHeader('Content-Type', 'text/markdown');
            return res.send(report.exports?.markdownReport || generateMarkdownReport({
              ...report,
              prNumber: report.prNumber?.toString()
            } as unknown as ReportStructure));
          } else {
            return res.json({
              success: true,
              report: report,
              metadata: {
                id: report.id,
                createdAt: report.timestamp,
                repositoryUrl: report.repositoryUrl,
                prNumber: report.prNumber,
                analysisScore: report.overview?.analysisScore,
                riskLevel: report.overview?.riskLevel
              }
            });
          }
        } catch (generatorError) {
          logger.error('Error generating report format', { error: generatorError, format });
          if (format === 'html') {
            res.setHeader('Content-Type', 'text/html');
            return res.send(generateBasicHTMLReport(report));
          }
        }
      } else {
        logger.warn('Report not found in Vector DB', { reportId });
      }
    } catch (vectorError) {
      logger.error('Error retrieving from Vector DB', { error: vectorError, reportId });
    }
    
    // If Vector DB retrieval fails, try legacy database storage
    let reportData: { id: string; report_data: unknown; created_at: string; repository_url?: string; pr_number?: number } | null = null;
    
    try {
      logger.info('Checking legacy database storage', { reportId });
      
      const { data: dbReport, error: reportError } = await getSupabase()
        .from('analysis_reports')
        .select('*')
        .eq('id', reportId)
        .single();
        
      if (dbReport && !reportError) {
        reportData = dbReport as { id: string; report_data: unknown; created_at: string; repository_url?: string; pr_number?: number };
      }
    } catch (dbError) {
      logger.warn('Legacy database check failed', { error: dbError });
    }
    
    if (reportData) {
      const report = reportData.report_data as ReportStructure;
      
      // Return report in requested format
      switch (format) {
        case 'html': {
          const htmlContent = generateHTMLReport(report);
          res.setHeader('Content-Type', 'text/html');
          res.send(htmlContent);
          break;
        }
          
        case 'markdown':
          res.setHeader('Content-Type', 'text/markdown');
          res.send(report.exports?.markdownReport || report.exports?.prComment || generateMarkdownReport(report));
          break;
          
        case 'json':
        default:
          res.json({
            success: true,
            report: report,
            metadata: {
              id: reportData.id,
              createdAt: reportData.created_at,
              repositoryUrl: reportData.repository_url || report.repositoryUrl,
              prNumber: reportData.pr_number || Number(report.prNumber)
            }
          });
      }
    } else {
      // Report not found anywhere
      return res.status(404).json({ 
        error: 'Report not found',
        reportId,
        details: [
          'Report may be processing or has expired',
          'Please ensure the report ID is correct',
          'Try regenerating the report if the issue persists'
        ],
        suggestion: 'Reports are now stored in Vector DB. Please regenerate if this is an old report.'
      });
    }
  } catch (error) {
    logger.error('Error retrieving report', { error });
    res.status(500).json({ 
      error: 'Failed to retrieve report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Generate Markdown report from StandardReport
 */
function generateMarkdownReport(report: ReportStructure): string {
  const { overview, modules } = report;
  
  let markdown = `# CodeQual Analysis Report\n\n`;
  markdown += `**Repository:** ${report.repositoryUrl}\n`;
  markdown += `**PR #${report.prNumber}**\n`;
  markdown += `**Date:** ${report.timestamp ? new Date(report.timestamp).toLocaleString() : 'Not available'}\n\n`;
  
  markdown += `## Overview\n\n`;
  markdown += `**Score:** ${overview?.analysisScore || 0}/100\n`;
  markdown += `**Risk Level:** ${overview?.riskLevel || 'Unknown'}\n`;
  markdown += `**Total Findings:** ${overview?.totalFindings || 0}\n\n`;
  
  markdown += `### Executive Summary\n${overview?.executiveSummary || 'No summary available'}\n\n`;
  
  if (overview?.blockingIssues && overview.blockingIssues.length > 0) {
    markdown += `### Blocking Issues\n`;
    overview.blockingIssues.forEach((issue) => {
      markdown += `- ${issue.message || issue}\n`;
    });
    markdown += `\n`;
  }
  
  markdown += `## Findings\n\n`;
  Object.entries(modules?.findings?.categories || {}).forEach(([category, data]) => {
    if (data.findings?.length > 0) {
      markdown += `### ${data.name} ${data.icon}\n`;
      data.findings.forEach((finding) => {
        markdown += `- **${finding.severity}**: ${finding.title}\n`;
        markdown += `  ${finding.description}\n`;
        if (finding.file) {
          markdown += `  File: \`${finding.file}${finding.line ? ':' + finding.line : ''}\`\n`;
        }
        if (finding.recommendation) {
          markdown += `  Recommendation: ${finding.recommendation}\n`;
        }
        markdown += `\n`;
      });
    }
  });
  
  if (modules?.recommendations?.categories && modules.recommendations.categories.length > 0) {
    markdown += `## Recommendations\n\n`;
    modules.recommendations.categories.forEach((cat) => {
      markdown += `### ${cat.name}\n`;
      cat.recommendations.forEach((rec) => {
        markdown += `- **${rec.title}**\n`;
        markdown += `  ${rec.description}\n`;
        markdown += `  Effort: ${rec.effort} | Impact: ${rec.impact}\n\n`;
      });
    });
  }
  
  return markdown;
}

/**
 * Generate HTML report from report data
 */
function generateHTMLReport(report: ReportStructure): string {
  // Handle both new format (with overview/modules) and old format (with agents/tools)
  if (report.agents || report.tools) {
    return generateLegacyHTMLReport(report);
  }
  
  const { overview, modules, visualizations } = report;
  
  // Read the enhanced template
  // fs and path already imported
  // When compiled, __dirname is dist/routes, so we need to go up to dist, then to src/templates
  const templatePath = path.join(__dirname, '../../src/templates/modular/enhanced-template.html');
  
  let template: string;
  try {
    template = fs.readFileSync(templatePath, 'utf8');
  } catch (error) {
    logger.error('Failed to read enhanced template, falling back to basic template', { error });
    // Fallback to basic template if enhanced template is not found
    return generateBasicHTMLReport(report);
  }
  
  // Helper function to get severity counts
  const getSeverityCounts = (findings: Finding[]) => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    findings.forEach(f => {
      if (f.severity && Object.prototype.hasOwnProperty.call(counts, f.severity)) {
        counts[f.severity as keyof typeof counts]++;
      }
    });
    return counts;
  };
  
  // Extract all findings
  const allFindings: Finding[] = [];
  if (modules?.findings?.categories) {
    Object.values(modules.findings.categories).forEach((category) => {
      if (category.findings) {
        allFindings.push(...category.findings);
      }
    });
  }
  
  const severityCounts = getSeverityCounts(allFindings);
  
  // Determine PR approval decision based on findings
  const prIssues = allFindings.filter(f => f.isPRIssue !== false);
  const criticalPRIssues = prIssues.filter(f => f.severity === 'critical');
  const highPRIssues = prIssues.filter(f => f.severity === 'high');
  
  let approvalStatus, approvalMessage, approvalClass, approvalIcon, confidence;
  
  if (criticalPRIssues.length > 0) {
    approvalStatus = 'BLOCKED';
    approvalMessage = `This PR is blocked due to ${criticalPRIssues.length} critical issue${criticalPRIssues.length !== 1 ? 's' : ''} that must be resolved before merging.`;
    approvalClass = 'rejected';
    approvalIcon = '❌';
    confidence = 95;
  } else if (highPRIssues.length > 0) {
    approvalStatus = 'CONDITIONALLY APPROVED';
    approvalMessage = `This PR is conditionally approved. Please address ${highPRIssues.length} high priority issue${highPRIssues.length !== 1 ? 's' : ''} before merging.`;
    approvalClass = 'conditional';
    approvalIcon = '⚠️';
    confidence = 75;
  } else {
    approvalStatus = 'APPROVED';
    approvalMessage = 'This PR meets quality standards and is approved for merging.';
    approvalClass = 'approved';
    approvalIcon = '✅';
    confidence = 90;
  }
  
  // Override with report decision if available
  if (overview?.decision?.status) {
    approvalStatus = overview.decision.status;
    approvalMessage = overview.decision.message || approvalMessage;
    confidence = Math.round((overview.decision.confidence || confidence / 100) * 100);
  }
  
  // Prepare data for template replacement
  const templateData: Record<string, string> = {
    // Meta information
    analysis_id: report.id || 'N/A',
    pr_number: report.prNumber?.toString() || 'N/A',
    repository_name: report.repositoryUrl?.split('/').pop() || 'Repository',
    timestamp: new Date(report.timestamp || Date.now()).toLocaleString(),
    report_version: '2.0',
    app_version: '1.0.0',
    
    // Metrics
    files_changed: report.filesAnalyzed?.toString() || '0',
    lines_added: report.linesAdded?.toString() || '0',
    lines_removed: report.linesRemoved?.toString() || '0',
    primary_language: report.primaryLanguage || 'JavaScript',
    
    // Approval decision
    approval_class: approvalClass,
    approval_icon: approvalIcon,
    approval_status_text: approvalStatus,
    approval_message: approvalMessage,
    confidence_percentage: confidence.toString(),
    
    // Issues counts
    critical_count: severityCounts.critical.toString(),
    high_count: severityCounts.high.toString(),
    medium_count: severityCounts.medium.toString(),
    low_count: severityCounts.low.toString(),
    
    // Overall score
    overall_score: overview?.analysisScore?.toString() || '0',
    score_class: (overview?.analysisScore || 0) >= 80 ? 'excellent' : 
                 (overview?.analysisScore || 0) >= 60 ? 'good' : 
                 (overview?.analysisScore || 0) >= 40 ? 'fair' : 'poor',
    score_trend_class: 'neutral',
    score_trend_icon: 'fa-equals',
    score_trend_value: 'No change',
    
    // Learning time
    total_learning_time: modules?.educationalContent?.totalTime || '30 minutes',
  };
  
  // Generate blocking issues HTML
  templateData.blocking_issues_html = (overview?.blockingIssues && overview.blockingIssues.length > 0) ?
    overview.blockingIssues.map((issue) => `
      <div class="factor-item blocking">
        <i class="fas fa-times-circle"></i>
        <span>${issue.message || issue}</span>
      </div>
    `).join('') : '<div class="factor-item"><i class="fas fa-check"></i> No blocking issues found</div>';
  
  // Generate positive findings HTML
  templateData.positive_findings_html = (overview?.positiveFindings && overview.positiveFindings.length > 0) ?
    overview.positiveFindings.map((finding) => `
      <div class="factor-item positive">
        <i class="fas fa-check-circle"></i>
        <span>${finding.message || finding}</span>
      </div>
    `).join('') : '<div class="factor-item">No specific positive findings highlighted</div>';
  
  // Generate PR issues content
  templateData.pr_issues_content = generateIssuesHTML(allFindings.filter(f => f.isPRIssue !== false));
  
  // Generate repository issues content
  const repoIssues = allFindings.filter(f => f.isRepoIssue === true);
  const highPriorityRepoIssues = repoIssues.filter(f => f.severity === 'critical' || f.severity === 'high');
  const lowerPriorityRepoIssues = repoIssues.filter(f => f.severity === 'medium' || f.severity === 'low');
  
  templateData.high_priority_issues_html = generateIssuesHTML(highPriorityRepoIssues);
  templateData.lower_priority_issues_html = lowerPriorityRepoIssues.length > 0 ? 
    `<div class="collapsible-section" id="lowerPriorityIssues" style="display:none">${generateIssuesHTML(lowerPriorityRepoIssues)}</div>` : '';
  templateData.toggle_button_html = lowerPriorityRepoIssues.length > 0 ?
    `<button class="btn-secondary" onclick="toggleLowerPriorityIssues()">Show ${lowerPriorityRepoIssues.length} lower priority issues</button>` : '';
  
  // Generate skills HTML
  templateData.skills_html = modules?.skillsAssessment?.skills ? 
    modules.skillsAssessment.skills.map((skill) => `
      <div class="skill-item">
        <div class="skill-header">
          <span class="skill-name">${skill.name}</span>
          <span class="skill-level ${skill.level.toLowerCase()}">${skill.level}</span>
        </div>
        <div class="skill-bar">
          <div class="skill-progress" style="width: ${skill.score}%"></div>
        </div>
        <div class="skill-score">${skill.score}/100</div>
      </div>
    `).join('') : '<p>No skills assessment available</p>';
  
  // Generate skill recommendations HTML
  templateData.skill_recommendations_html = modules?.recommendations?.categories ?  
    modules?.recommendations.categories.slice(0, 3).map((cat) => 
      cat.recommendations.slice(0, 1).map((rec) => `
        <div class="recommendation-card">
          <h4>${rec.title}</h4>
          <p>${rec.description}</p>
        </div>
      `).join('')
    ).join('') : '';
  
  // Generate educational content HTML
  templateData.educational_html = modules?.educationalContent?.resources ?
    modules.educationalContent.resources.map((resource) => `
      <div class="educational-card">
        <div class="educational-icon">
          <i class="fas fa-book"></i>
        </div>
        <div class="educational-content">
          <h3>${resource.title}</h3>
          <p>${resource.description}</p>
          <div class="educational-meta">
            <span><i class="fas fa-clock"></i> ${resource.estimatedTime || '10 min'}</span>
            <span><i class="fas fa-signal"></i> ${resource.difficulty || 'Intermediate'}</span>
          </div>
          ${resource.links ? `
            <div class="educational-links">
              ${resource.links.map((link) => `<a href="${link.url}" target="_blank">${link.title}</a>`).join(' • ')}
            </div>
          ` : ''}
        </div>
      </div>
    `).join('') : '<p>No educational resources available</p>';
  
  // Generate PR comment text
  templateData.pr_comment_text = generatePRComment(report);
  
  // Replace all template variables
  let html = template;
  Object.entries(templateData).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    html = html.replace(regex, value);
  });
  
  return html;
}

/**
 * Generate issues HTML for the template
 */
function generateIssuesHTML(issues: Finding[]): string {
  if (issues.length === 0) {
    return '<p class="no-issues">No issues found in this category.</p>';
  }
  
  return issues.map(issue => `
    <div class="issue-card ${issue.severity}">
      <div class="issue-header">
        <span class="issue-type">${issue.type || 'General'}</span>
        <span class="issue-severity">${issue.severity}</span>
      </div>
      <h4 class="issue-title">${issue.title}</h4>
      <p class="issue-description">${issue.description}</p>
      ${issue.file ? `<div class="issue-location"><i class="fas fa-file-code"></i> ${issue.file}${issue.line ? `:${issue.line}` : ''}</div>` : ''}
      ${issue.recommendation ? `<div class="issue-recommendation"><strong>Fix:</strong> ${issue.recommendation}</div>` : ''}
    </div>
  `).join('');
}

/**
 * Generate PR comment text
 */
function generatePRComment(report: ReportStructure): string {
  const { overview } = report;
  const decision = overview?.decision?.status || 'NEEDS_REVIEW';
  const score = overview?.analysisScore || 0;
  const blockingCount = overview?.blockingIssues?.length || 0;
  
  return `## CodeQual Analysis Report

**Decision:** ${decision}
**Quality Score:** ${score}/100
**Blocking Issues:** ${blockingCount}

${overview?.executiveSummary || 'Analysis complete.'}

${blockingCount > 0 && overview?.blockingIssues ? `
### ⚠️ Blocking Issues
${overview.blockingIssues.map((issue) => `- ${issue.message || issue}`).join('\n')}
` : ''}

${overview?.positiveFindings && overview.positiveFindings.length > 0 ? `
### ✅ Positive Findings
${overview.positiveFindings.map((finding) => `- ${finding.message || finding}`).join('\n')}
` : ''}

[View Full Report](${report.reportUrl || '#'})`;
}

/**
 * Fallback to basic HTML report if enhanced template fails
 */
function generateBasicHTMLReport(report: ReportStructure | StandardReport): string {
  const { overview, modules } = report;
  
  if (!overview) {
    return `<!DOCTYPE html><html><body><h1>Error: No overview data available</h1></body></html>`;
  }
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CodeQual Analysis Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1, h2, h3 {
      color: #2c3e50;
    }
    .metric {
      display: inline-block;
      padding: 10px 20px;
      margin: 5px;
      background: #f8f9fa;
      border-radius: 4px;
      border-left: 4px solid #007bff;
    }
    .finding {
      margin: 15px 0;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 4px;
      border-left: 4px solid #dc3545;
    }
    .recommendation {
      margin: 10px 0;
      padding: 10px;
      background: #e8f4f8;
      border-radius: 4px;
    }
    .score {
      font-size: 2em;
      font-weight: bold;
      color: #28a745;
    }
    pre {
      background: #f4f4f4;
      padding: 10px;
      border-radius: 4px;
      overflow-x: auto;
    }
    .severity-critical { border-left-color: #dc3545; }
    .severity-high { border-left-color: #fd7e14; }
    .severity-medium { border-left-color: #ffc107; }
    .severity-low { border-left-color: #28a745; }
  </style>
</head>
<body>
  <div class="container">
    <h1>CodeQual Analysis Report</h1>
    
    <section>
      <h2>Overview</h2>
      <p>${overview.executiveSummary}</p>
      
      <div class="metrics">
        <div class="metric">
          <strong>Analysis Score:</strong> 
          <span class="score">${overview.analysisScore}/100</span>
        </div>
        <div class="metric">
          <strong>Risk Level:</strong> ${overview.riskLevel}
        </div>
        <div class="metric">
          <strong>Total Findings:</strong> ${overview.totalFindings}
        </div>
        <div class="metric">
          <strong>Total Recommendations:</strong> ${'totalRecommendations' in overview ? overview.totalRecommendations : 0}
        </div>
      </div>
    </section>
    
    <section>
      <h2>Findings</h2>
      ${Object.entries(modules?.findings?.categories || {}).map(([category, data]) => {
        const categoryData = data as {name: string, icon: string, summary?: string, findings: Finding[]};
        return `
        <h3>${categoryData.name} ${categoryData.icon}</h3>
        <p>${categoryData.summary}</p>
        ${categoryData.findings.length === 0 ? '<p>No issues found.</p>' : 
          categoryData.findings.map((finding) => `
            <div class="finding severity-${finding.severity}">
              <h4>${finding.title}</h4>
              <p>${finding.description}</p>
              ${finding.recommendation ? `<p><strong>Recommendation:</strong> ${finding.recommendation}</p>` : ''}
              ${finding.codeSnippet ? `<pre><code>${finding.codeSnippet}</code></pre>` : ''}
            </div>
          `).join('')
        }
      `;
      }).join('')}
    </section>
    
    <section>
      <h2>Recommendations</h2>
      ${modules?.recommendations?.categories?.map((cat: {name: string, recommendations: Array<{title: string, description?: string, effort?: string, impact?: string}>}) => `
        <h3>${cat.name}</h3>
        ${cat.recommendations.map((rec: {title: string, description?: string, effort?: string, impact?: string}) => `
          <div class="recommendation">
            <h4>${rec.title}</h4>
            <p>${rec.description}</p>
            <p><strong>Effort:</strong> ${rec.effort} | <strong>Impact:</strong> ${rec.impact}</p>
          </div>
        `).join('')}
      `).join('') || '<p>No recommendations available.</p>'}
    </section>
    
    <footer>
      <p><em>Generated by CodeQual on ${report.timestamp ? new Date(report.timestamp).toLocaleString() : 'unknown date'}</em></p>
    </footer>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate HTML report for legacy format (agents/tools structure)
 */
interface LegacyReport {
  agents?: Record<string, unknown>;
  tools?: Record<string, unknown>;
  overall_score?: number;
  repository_url?: string;
  pr_number?: number;
  timestamp?: string;
}

function generateLegacyHTMLReport(report: LegacyReport): string {
  const { agents = {}, tools = {}, overall_score, repository_url, pr_number } = report;
  
  // Collect all findings from agents
  const allFindings: Finding[] = [];
  Object.entries(agents).forEach(([agentName, agentData]) => {
    const data = agentData as { findings?: unknown[] };
    if (data.findings && Array.isArray(data.findings)) {
      data.findings.forEach((finding) => {
        allFindings.push({
          ...(finding as Finding),
          category: agentName
        });
      });
    }
  });
  
  // Calculate severity counts
  const severityCounts = {
    critical: allFindings.filter(f => f.severity === 'critical').length,
    high: allFindings.filter(f => f.severity === 'high').length,
    medium: allFindings.filter(f => f.severity === 'medium').length,
    low: allFindings.filter(f => f.severity === 'low').length
  };
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CodeQual Analysis Report</title>
  <link rel="stylesheet" href="/assets/enhanced-styles.css">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .score-circle {
      display: inline-block;
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background: white;
      color: #667eea;
      text-align: center;
      line-height: 100px;
      font-size: 36px;
      font-weight: bold;
      margin-right: 20px;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin: 30px 0;
    }
    .metric-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      text-align: center;
    }
    .finding-card {
      background: white;
      padding: 20px;
      margin: 15px 0;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      border-left: 4px solid #dc3545;
    }
    .finding-card.critical { border-left-color: #dc3545; }
    .finding-card.high { border-left-color: #ffc107; }
    .finding-card.medium { border-left-color: #fd7e14; }
    .finding-card.low { border-left-color: #28a745; }
    .severity-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
      color: white;
      text-transform: uppercase;
    }
    .severity-badge.critical { background: #dc3545; }
    .severity-badge.high { background: #ffc107; color: #333; }
    .severity-badge.medium { background: #fd7e14; }
    .severity-badge.low { background: #28a745; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>CodeQual Analysis Report</h1>
      <p>Repository: ${repository_url || 'Unknown'}</p>
      <p>Pull Request: #${pr_number || 'N/A'}</p>
      <div style="margin-top: 20px;">
        <div class="score-circle">${overall_score || 'N/A'}</div>
        <span style="font-size: 24px;">Overall Score</span>
      </div>
    </div>
    
    <div class="metrics-grid">
      <div class="metric-card">
        <h3>${severityCounts.critical}</h3>
        <p>Critical Issues</p>
      </div>
      <div class="metric-card">
        <h3>${severityCounts.high}</h3>
        <p>High Issues</p>
      </div>
      <div class="metric-card">
        <h3>${severityCounts.medium}</h3>
        <p>Medium Issues</p>
      </div>
      <div class="metric-card">
        <h3>${severityCounts.low}</h3>
        <p>Low Issues</p>
      </div>
    </div>
    
    <section>
      <h2>Findings</h2>
      ${allFindings.length > 0 ? allFindings.map(finding => `
        <div class="finding-card ${finding.severity}">
          <div style="display: flex; justify-content: space-between; align-items: start;">
            <h3>${finding.message || finding.title}</h3>
            <span class="severity-badge ${finding.severity}">${finding.severity}</span>
          </div>
          <p><strong>Category:</strong> ${finding.category}</p>
          ${finding.file ? `<p><strong>File:</strong> ${finding.file}${finding.line ? `:${finding.line}` : ''}</p>` : ''}
          ${finding.recommendation ? `
            <div style="margin-top: 10px; padding: 10px; background: #e8f4f8; border-radius: 4px;">
              <strong>Recommendation:</strong> ${finding.recommendation}
            </div>
          ` : ''}
        </div>
      `).join('') : '<p>No issues found - code looks good!</p>'}
    </section>
    
    <footer style="margin-top: 60px; padding: 20px; text-align: center; color: #666;">
      <p>Generated by CodeQual on ${new Date().toLocaleString()}</p>
    </footer>
  </div>
</body>
</html>
  `.trim();
}

/**
 * GET /analysis/:reportId/html
 * Get report as HTML (for displaying in report page)
 */
router.get('/analysis/:reportId/html', async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    
    // Check for JWT token
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Authorization required',
        message: 'Please provide authorization token'
      });
    }
    
    // Verify token and get user ID
    const { data: { user }, error: authError } = await getSupabase().auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid authorization token' });
    }
    
    const userId = user.id;
    
    // Try to retrieve from Vector DB first
    try {
      const authenticatedUser = {
        id: userId,
        email: 'api@codequal.dev',
        organizationId: 'default',
        permissions: ['read'],
        createdAt: new Date(),
        status: 'active'
      };
      
      const vectorContextService = createVectorContextService(authenticatedUser);
      const reportRetrievalService = createVectorReportRetrievalService(vectorContextService);
      const vectorReport = await reportRetrievalService.retrieveReportById(reportId, userId || 'api-user');
      
      if (vectorReport) {
        logger.info('Serving report from Vector DB', { reportId });
        
        // Generate HTML using appropriate generator
        try {
          // HtmlReportGeneratorV5 already imported
          const generator = new HtmlReportGeneratorV5();
          const html = generator.generateEnhancedHtmlReport({
            ...vectorReport,
            timestamp: vectorReport.timestamp.toISOString()
          });
          
          res.setHeader('Content-Type', 'text/html');
          return res.send(html);
        } catch (genError) {
          // Fallback to basic generator
          // HtmlReportGenerator already imported
          const generator = new HtmlReportGenerator();
          const html = generator.generateEnhancedHtmlReport({
            ...vectorReport,
            timestamp: vectorReport.timestamp.toISOString()
          });
          
          res.setHeader('Content-Type', 'text/html');
          return res.send(html);
        }
      }
    } catch (vectorError) {
      logger.warn('Vector DB retrieval failed', { error: vectorError, reportId });
    }
    
    // Try to fetch from database
    const { data: report, error } = await getSupabase()
      .from('analysis_reports')
      .select('*')
      .eq('id', reportId)
      .single();
    
    if (error || !report) {
      logger.warn('Report not found', { reportId, error });
      return res.status(404).json({ error: 'Report not found' });
    }
    
    // Generate HTML
    // HtmlReportGeneratorV5 already imported
    const generator = new HtmlReportGeneratorV5();
    const html = generator.generateEnhancedHtmlReport(report.report_data || report);
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
    
  } catch (error) {
    logger.error('Failed to retrieve HTML report', { error });
    res.status(500).json({ 
      error: 'Failed to retrieve report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;