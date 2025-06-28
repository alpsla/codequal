import { Router, Request, Response } from 'express';

export const analysisRoutes = Router();

// Store for user analysis history (in production, this would be a database)
const analysisHistory = new Map<string, any[]>();

/**
 * GET /api/analysis/history
 * Get user's analysis history
 */
analysisRoutes.get('/history', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { limit = 20, offset = 0, repositoryUrl } = req.query;
    
    // Get user's analysis history
    const userHistory = analysisHistory.get(user!.id) || [];
    
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
        metrics: analysis.metrics,
        timestamp: analysis.metadata.timestamp,
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
    console.error('Analysis history fetch error:', error);
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
    
    // Find analysis in user's history
    const userHistory = analysisHistory.get(user!.id) || [];
    const analysis = userHistory.find(a => a.analysisId === analysisId);
    
    if (!analysis) {
      return res.status(404).json({ 
        error: 'Analysis not found',
        analysisId 
      });
    }

    res.json(analysis);

  } catch (error) {
    console.error('Analysis results fetch error:', error);
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
    
    // Find analysis in user's history
    const userHistory = analysisHistory.get(user!.id) || [];
    const analysis = userHistory.find(a => a.analysisId === analysisId);
    
    if (!analysis) {
      return res.status(404).json({ 
        error: 'Analysis not found',
        analysisId 
      });
    }

    if (format === 'markdown') {
      const markdownReport = generateMarkdownReport(analysis);
      res.set('Content-Type', 'text/markdown');
      res.send(markdownReport);
    } else if (format === 'pr-comment') {
      res.json({
        comment: analysis.report.prComment,
        analysisId: analysis.analysisId
      });
    } else {
      // Default JSON format
      res.json({
        analysisId: analysis.analysisId,
        report: analysis.report,
        summary: {
          totalFindings: analysis.analysis.totalFindings,
          severity: analysis.metrics.severity,
          confidence: analysis.metrics.confidence
        }
      });
    }

  } catch (error) {
    console.error('Analysis report fetch error:', error);
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
    analysis.feedback.push(feedback);

    res.json({
      message: 'Feedback submitted successfully',
      analysisId,
      feedbackId: `feedback_${Date.now()}`
    });

  } catch (error) {
    console.error('Feedback submission error:', error);
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
    const user = req.user!;
    const { timeRange = '30d' } = req.query;
    
    // Get user's analysis history
    const userHistory = analysisHistory.get(user!.id) || [];
    
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
      new Date(analysis.metadata.timestamp) >= cutoffDate
    );

    // Calculate statistics
    const stats = {
      totalAnalyses: recentAnalyses.length,
      repositoriesAnalyzed: new Set(recentAnalyses.map(a => a.repository.url)).size,
      averageFindings: recentAnalyses.length > 0 ? 
        recentAnalyses.reduce((sum, a) => sum + a.analysis.totalFindings, 0) / recentAnalyses.length : 0,
      severityBreakdown: {
        critical: recentAnalyses.reduce((sum, a) => sum + a.metrics.severity.critical, 0),
        high: recentAnalyses.reduce((sum, a) => sum + a.metrics.severity.high, 0),
        medium: recentAnalyses.reduce((sum, a) => sum + a.metrics.severity.medium, 0),
        low: recentAnalyses.reduce((sum, a) => sum + a.metrics.severity.low, 0)
      },
      averageProcessingTime: recentAnalyses.length > 0 ? 
        recentAnalyses.reduce((sum, a) => sum + a.analysis.processingTime, 0) / recentAnalyses.length : 0,
      mostAnalyzedLanguages: calculateLanguageStats(recentAnalyses),
      timeRange
    };

    res.json(stats);

  } catch (error) {
    console.error('Analysis stats fetch error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Helper function to generate markdown report
function generateMarkdownReport(analysis: any): string {
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

${analysis.report.recommendations.map((rec: string, i: number) => `${i + 1}. ${rec}`).join('\n')}

---
*Generated by CodeQual Analysis Engine*
`;

  return report;
}

function generateFindingsMarkdown(findings: any): string {
  let markdown = '';
  
  Object.entries(findings).forEach(([category, categoryFindings]: [string, any]) => {
    if (Array.isArray(categoryFindings) && categoryFindings.length > 0) {
      markdown += `### ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;
      
      categoryFindings.slice(0, 5).forEach((finding: any, index: number) => {
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

function calculateLanguageStats(analyses: any[]): Array<{language: string, count: number}> {
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
export function storeAnalysisInHistory(userId: string, analysis: any): void {
  if (!analysisHistory.has(userId)) {
    analysisHistory.set(userId, []);
  }
  
  const userHistory = analysisHistory.get(userId)!;
  userHistory.unshift(analysis); // Add to beginning
  
  // Keep only last 100 analyses per user
  if (userHistory.length > 100) {
    userHistory.splice(100);
  }
}