import { Router, Request, Response } from 'express';
import { createLogger } from '@codequal/core/utils';
import { Finding } from '../services/result-processor';

interface AnalysisReport {
  repository: {
    name: string;
  };
  pr: {
    number: number;
    title: string;
  };
  analysis: {
    mode: string;
    totalFindings: number;
    processingTime: number;
  };
  metadata: {
    timestamp: string | Date;
  };
  metrics: {
    confidence: number;
    severity: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
  findings: Record<string, Finding[]>;
  report: {
    recommendations: string[];
  };
}

const logger = createLogger('analysis-routes');
const analysisRoutes = Router();

export default analysisRoutes;

// Store for user analysis history (in production, this would be a database)
interface AnalysisHistoryItem {
  analysisId: string;
  repository: { url: string };
  pr?: {
    number: number;
    title?: string;
    branch?: string;
    [key: string]: unknown;
  };
  analysis: {
    mode: string;
    totalFindings: number;
    processingTime: number;
  };
  completedAt?: Date;
  timestamp?: Date;
  [key: string]: unknown;
}

const analysisHistory = new Map<string, AnalysisHistoryItem[]>();

/**
 * @swagger
 * /analysis/history:
 *   get:
 *     summary: Get analysis history
 *     description: Retrieve the user's pull request analysis history with optional filtering and pagination
 *     tags: [Reports]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of results to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of results to skip
 *       - in: query
 *         name: repositoryUrl
 *         schema:
 *           type: string
 *           format: uri
 *         description: Filter by repository URL
 *     responses:
 *       200:
 *         description: Analysis history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 analyses:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       analysisId:
 *                         type: string
 *                       repository:
 *                         type: object
 *                       pr:
 *                         type: object
 *                       analysis:
 *                         type: object
 *                       metrics:
 *                         type: object
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                       status:
 *                         type: string
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     hasMore:
 *                       type: boolean
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 */
analysisRoutes.get('/history', async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { limit = 20, offset = 0, repositoryUrl } = req.query;
    
    // Get user's analysis history
    const userHistory = analysisHistory.get(user.id) || [];
    
    // Filter by repository if specified
    let filteredHistory = userHistory;
    if (repositoryUrl && typeof repositoryUrl === 'string') {
      filteredHistory = userHistory.filter(analysis => 
        analysis.repository.url === repositoryUrl
      );
    }
    
    // Apply pagination
    const startIndex = parseInt(offset as string) || 0;
    const limitNum = Math.min(parseInt(limit as string) || 20, 100); // Max 100
    const paginatedHistory = filteredHistory.slice(startIndex, startIndex + limitNum);
    
    res.json({
      analyses: paginatedHistory.map(analysis => ({
        analysisId: analysis.analysisId,
        repository: analysis.repository,
        pr: analysis.pr,
        analysis: {
          mode: analysis.analysis.mode,
          totalFindings: analysis.analysis.totalFindings,
          processingTime: analysis.analysis.processingTime
        },
        metrics: analysis.metrics as any,
        timestamp: (analysis.metadata as any)?.timestamp || analysis.timestamp,
        status: 'complete'
      })),
      pagination: {
        total: filteredHistory.length,
        offset: startIndex,
        limit: limitNum,
        hasMore: startIndex + limitNum < filteredHistory.length
      }
    });

  } catch (error) {
    logger.error('Analysis history fetch error:', error as Error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/analysis/:id/results
 * Get detailed analysis results
 */
analysisRoutes.get('/:id/results', async (req: Request, res: Response) => {
  try {
    const { id: analysisId } = req.params;
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Find analysis in user's history
    const userHistory = analysisHistory.get(user.id) || [];
    const analysis = userHistory.find(a => a.analysisId === analysisId);
    
    if (!analysis) {
      return res.status(404).json({ 
        error: 'Analysis not found',
        analysisId 
      });
    }

    res.json(analysis);

  } catch (error) {
    logger.error('Analysis results fetch error:', error as Error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/analysis/:id/report
 * Get formatted report for analysis
 */
analysisRoutes.get('/:id/report', async (req: Request, res: Response) => {
  try {
    const { id: analysisId } = req.params;
    const { format = 'json' } = req.query;
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Find analysis in user's history
    const userHistory = analysisHistory.get(user.id) || [];
    const analysis = userHistory.find(a => a.analysisId === analysisId);
    
    if (!analysis) {
      return res.status(404).json({ 
        error: 'Analysis not found',
        analysisId 
      });
    }

    if (format === 'markdown') {
      const markdownReport = generateMarkdownReport(analysis as any);
      res.set('Content-Type', 'text/markdown');
      res.send(markdownReport);
    } else if (format === 'pr-comment') {
      res.json({
        comment: (analysis.report as any)?.prComment || '',
        analysisId: analysis.analysisId
      });
    } else {
      // Default JSON format
      res.json({
        analysisId: analysis.analysisId,
        report: analysis.report,
        summary: {
          totalFindings: analysis.analysis.totalFindings,
          severity: (analysis.metrics as any)?.severity || {},
          confidence: (analysis.metrics as any)?.confidence || {}
        }
      });
    }

  } catch (error) {
    logger.error('Analysis report fetch error:', error as Error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/analysis/:id/feedback
 * Submit feedback on analysis results
 */
analysisRoutes.post('/:id/feedback', async (req: Request, res: Response) => {
  try {
    const { id: analysisId } = req.params;
    const { rating, helpful, comments, findingFeedback } = req.body;
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Authentication required' 
      });
    }
    
    // Validate feedback data
    if (rating && (typeof rating !== 'number' || rating < 1 || rating > 5)) {
      return res.status(400).json({ 
        error: 'Rating must be a number between 1 and 5' 
      });
    }

    // Find analysis in user's history
    const userHistory = analysisHistory.get(user.id) || [];
    const analysis = userHistory.find(a => a.analysisId === analysisId);
    
    if (!analysis) {
      return res.status(404).json({ 
        error: 'Analysis not found',
        analysisId 
      });
    }

    // Store feedback (in production, this would go to a database)
    const feedback = {
      analysisId,
      userId: user.id,
      rating,
      helpful: Boolean(helpful),
      comments: comments || '',
      findingFeedback: findingFeedback || {},
      submittedAt: new Date()
    };

    // Add feedback to analysis record
    if (!analysis.feedback) {
      analysis.feedback = [];
    }
    (analysis.feedback as any[]).push(feedback);

    res.json({
      message: 'Feedback submitted successfully',
      analysisId,
      feedbackId: `feedback_${Date.now()}`
    });

  } catch (error) {
    logger.error('Feedback submission error:', error as Error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/analysis/stats
 * Get user's analysis statistics
 */
analysisRoutes.get('/stats', async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { timeRange = '30d' } = req.query;
    
    // Get user's analysis history
    const userHistory = analysisHistory.get(user.id) || [];
    
    // Filter by time range
    const cutoffDate = new Date();
    switch (timeRange) {
      case '7d':
        cutoffDate.setDate(cutoffDate.getDate() - 7);
        break;
      case '30d':
        cutoffDate.setDate(cutoffDate.getDate() - 30);
        break;
      case '90d':
        cutoffDate.setDate(cutoffDate.getDate() - 90);
        break;
      default:
        cutoffDate.setDate(cutoffDate.getDate() - 30);
    }
    
    const recentAnalyses = userHistory.filter(analysis => 
      new Date((analysis.metadata as any)?.timestamp || analysis.timestamp || 0) >= cutoffDate
    );

    // Calculate statistics
    const stats = {
      totalAnalyses: recentAnalyses.length,
      repositoriesAnalyzed: new Set(recentAnalyses.map(a => a.repository.url)).size,
      averageFindings: recentAnalyses.length > 0 ? 
        recentAnalyses.reduce((sum, a) => sum + a.analysis.totalFindings, 0) / recentAnalyses.length : 0,
      severityBreakdown: {
        critical: recentAnalyses.reduce((sum, a) => sum + ((a.metrics as any)?.severity?.critical || 0), 0),
        high: recentAnalyses.reduce((sum, a) => sum + ((a.metrics as any)?.severity?.high || 0), 0),
        medium: recentAnalyses.reduce((sum, a) => sum + ((a.metrics as any)?.severity?.medium || 0), 0),
        low: recentAnalyses.reduce((sum, a) => sum + ((a.metrics as any)?.severity?.low || 0), 0)
      },
      averageProcessingTime: recentAnalyses.length > 0 ? 
        recentAnalyses.reduce((sum, a) => sum + a.analysis.processingTime, 0) / recentAnalyses.length : 0,
      mostAnalyzedLanguages: calculateLanguageStats(recentAnalyses as any),
      timeRange
    };

    res.json(stats);

  } catch (error) {
    logger.error('Analysis stats fetch error:', error as Error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Helper function to generate markdown report
function generateMarkdownReport(analysis: AnalysisReport): string {
  const report = `# CodeQual Analysis Report

**Repository:** ${analysis.repository.name}
**PR:** #${analysis.pr.number} - ${analysis.pr.title}
**Analysis Mode:** ${analysis.analysis.mode}
**Timestamp:** ${new Date(analysis.metadata.timestamp).toLocaleString()}

## Summary

- **Total Findings:** ${analysis.analysis.totalFindings}
- **Processing Time:** ${Math.round(analysis.analysis.processingTime / 1000)}s
- **Confidence Score:** ${analysis.metrics.confidence}

### Severity Breakdown
- 🔴 Critical: ${analysis.metrics.severity.critical}
- 🟡 High: ${analysis.metrics.severity.high}
- 🟠 Medium: ${analysis.metrics.severity.medium}
- 🟢 Low: ${analysis.metrics.severity.low}

## Findings

${generateFindingsMarkdown(analysis.findings)}

## Recommendations

${analysis.report.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}

---
*Generated by CodeQual Analysis Engine*
`;

  return report;
}

function generateFindingsMarkdown(findings: Record<string, Finding[]>): string {
  let markdown = '';
  
  Object.entries(findings).forEach(([category, categoryFindings]) => {
    if (Array.isArray(categoryFindings) && categoryFindings.length > 0) {
      markdown += `### ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;
      
      categoryFindings.slice(0, 5).forEach((finding, index) => {
        const severityIconMap: Record<string, string> = {
          critical: '🔴',
          high: '🟡',
          medium: '🟠',
          low: '🟢'
        };
        const severityIcon = severityIconMap[finding.severity] || '⚪';
        
        markdown += `${index + 1}. ${severityIcon} **${finding.title}**\n`;
        markdown += `   ${finding.description}\n`;
        if (finding.file) {
          markdown += `   📁 \`${finding.file}${finding.line ? `:${finding.line}` : ''}\`\n`;
        }
        if (finding.recommendation) {
          markdown += `   💡 ${finding.recommendation}\n`;
        }
        markdown += '\n';
      });
    }
  });
  
  return markdown;
}

function calculateLanguageStats(analyses: Array<{ repository: { primaryLanguage: string } }>): Array<{language: string, count: number}> {
  const languageCounts: Record<string, number> = {};
  
  analyses.forEach(analysis => {
    const language = analysis.repository.primaryLanguage;
    languageCounts[language] = (languageCounts[language] || 0) + 1;
  });
  
  return Object.entries(languageCounts)
    .map(([language, count]) => ({ language, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

// Helper function to store completed analysis in history
export function storeAnalysisInHistory(userId: string, analysis: {
  analysisId: string;
  repository: { url: string };
  pr?: {
    number: number;
    title?: string;
    branch?: string;
    [key: string]: unknown;
  };
  analysis: {
    mode: string;
    totalFindings: number;
    processingTime: number;
  };
  completedAt?: Date;
  timestamp?: Date;
  [key: string]: unknown;
}): void {
  if (!analysisHistory.has(userId)) {
    analysisHistory.set(userId, []);
  }
  
  const userHistory = analysisHistory.get(userId);
  if (userHistory) {
    userHistory.unshift(analysis); // Add to beginning
    
    // Keep only last 100 analyses per user
    if (userHistory.length > 100) {
      userHistory.splice(100);
    }
  }
}