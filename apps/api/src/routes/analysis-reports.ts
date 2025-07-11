import { Router, Request, Response } from 'express';
import { getSupabase } from '@codequal/database/supabase/client';
import { createLogger } from '@codequal/core/utils';

const router = Router();
const logger = createLogger('AnalysisReportsAPI');

// Temporary in-memory storage for reports when database is unavailable
const temporaryReportStorage = new Map<string, any>();

// Export for use by result-orchestrator
export const storeReportTemporarily = (reportId: string, report: any) => {
  temporaryReportStorage.set(reportId, report);
  logger.info('Report stored temporarily in memory', { reportId });
};

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
      const keyHash = require('crypto').createHash('sha256').update(apiKey).digest('hex');
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
    
    // If JWT token provided, verify it
    if (token && !userId) {
      const { data: { user }, error } = await getSupabase().auth.getUser(token);
      if (error || !user) {
        return res.status(401).json({ error: 'Invalid authorization token' });
      }
      userId = user.id;
    }
    
    logger.info('Retrieving report', { reportId, userId, format });
    
    // Check temporary storage first
    let reportData: any = null;
    
    if (temporaryReportStorage.has(reportId)) {
      logger.info('Report found in temporary storage', { reportId });
      const tempReport = temporaryReportStorage.get(reportId);
      reportData = {
        id: reportId,
        report_data: tempReport,
        created_at: tempReport.timestamp,
        repository_url: tempReport.repositoryUrl,
        pr_number: tempReport.prNumber
      };
    } else {
      // Get the report from database
      const { data: report, error: reportError } = await getSupabase()
        .from('analysis_reports')
        .select('*')
        .eq('id', reportId)
        .single();
        
      if (reportError || !report) {
        logger.warn('Report not found in database', { reportId, error: reportError });
        return res.status(404).json({ 
          error: 'Report not found',
          reportId 
        });
      }
      
      reportData = report;
    }
    
    // Check if user has access (for now, allow all authenticated users)
    // In production, you might want to check if the user owns the report
    
    const report = reportData.report_data as any;
    
    // Return report in requested format
    switch (format) {
      case 'html':
        // Generate HTML report
        const htmlContent = generateHTMLReport(report);
        res.setHeader('Content-Type', 'text/html');
        res.send(htmlContent);
        break;
        
      case 'markdown':
        res.setHeader('Content-Type', 'text/markdown');
        res.send(report.exports?.markdownReport || 'No markdown report available');
        break;
        
      case 'json':
      default:
        res.json({
          success: true,
          report: report,
          metadata: {
            id: reportData.id,
            createdAt: reportData.created_at,
            repositoryUrl: reportData.repository_url,
            prNumber: reportData.pr_number
          }
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
 * Generate HTML report from report data
 */
function generateHTMLReport(report: any): string {
  const { overview, modules, visualizations } = report;
  
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
          <strong>Total Recommendations:</strong> ${overview.totalRecommendations}
        </div>
      </div>
    </section>
    
    <section>
      <h2>Findings</h2>
      ${Object.entries(modules.findings.categories).map(([category, data]: [string, any]) => `
        <h3>${data.name} ${data.icon}</h3>
        <p>${data.summary}</p>
        ${data.findings.length === 0 ? '<p>No issues found.</p>' : 
          data.findings.map((finding: any) => `
            <div class="finding severity-${finding.severity}">
              <h4>${finding.title}</h4>
              <p>${finding.description}</p>
              ${finding.recommendation ? `<p><strong>Recommendation:</strong> ${finding.recommendation}</p>` : ''}
              ${finding.codeSnippet ? `<pre><code>${finding.codeSnippet}</code></pre>` : ''}
            </div>
          `).join('')
        }
      `).join('')}
    </section>
    
    <section>
      <h2>Recommendations</h2>
      ${modules.recommendations.categories.map((cat: any) => `
        <h3>${cat.name}</h3>
        ${cat.recommendations.map((rec: any) => `
          <div class="recommendation">
            <h4>${rec.title}</h4>
            <p>${rec.description}</p>
            <p><strong>Effort:</strong> ${rec.effort} | <strong>Impact:</strong> ${rec.impact}</p>
          </div>
        `).join('')}
      `).join('')}
    </section>
    
    <section>
      <h2>Metrics</h2>
      ${Object.entries(modules.metrics.scores).map(([metric, data]: [string, any]) => `
        <div class="metric">
          <h4>${data.name}</h4>
          <p>Score: ${data.score}/100 (${data.rating})</p>
          <p>${data.description}</p>
        </div>
      `).join('')}
    </section>
    
    <footer>
      <p><em>Generated by CodeQual on ${new Date(report.timestamp).toLocaleString()}</em></p>
    </footer>
  </div>
</body>
</html>
  `.trim();
}

export default router;