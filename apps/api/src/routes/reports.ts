import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { authMiddleware } from '../middleware/auth-middleware';
import { createLogger } from '@codequal/core/utils';

const router = Router();
const logger = createLogger('ReportsAPI');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/reports/:reportId
 * Retrieve a specific analysis report by ID
 */
router.get('/reports/:reportId', authMiddleware, async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.user!.id;
    
    logger.info('Retrieving report', { reportId, userId });
    
    // Use the secure function to get report with access control
    const { data, error } = await supabase
      .rpc('get_analysis_report', { report_id: reportId });
    
    if (error) {
      if (error.message.includes('not found or access denied')) {
        return res.status(404).json({ 
          error: 'Report not found or you do not have access' 
        });
      }
      throw error;
    }
    
    res.json({
      success: true,
      report: data.report_data, // Return the complete StandardReport
      metadata: {
        id: data.id,
        createdAt: data.created_at,
        repositoryUrl: data.repository_url,
        prNumber: data.pr_number,
        analysisScore: data.analysis_score,
        riskLevel: data.risk_level
      }
    });
  } catch (error) {
    logger.error('Error retrieving report', { error });
    res.status(500).json({ 
      error: 'Failed to retrieve report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/reports/repository/:repoUrl/pr/:prNumber
 * Get the latest report for a specific repository and PR
 */
router.get('/reports/repository/:repoUrl/pr/:prNumber', authMiddleware, async (req, res) => {
  try {
    const { repoUrl, prNumber } = req.params;
    const userId = req.user!.id;
    
    // Decode the repository URL
    const repositoryUrl = decodeURIComponent(repoUrl);
    
    logger.info('Retrieving latest report for PR', { 
      repositoryUrl, 
      prNumber, 
      userId 
    });
    
    // Use the secure function to get latest report
    const { data, error } = await supabase
      .rpc('get_latest_analysis_report', { 
        p_repository_url: repositoryUrl,
        p_pr_number: parseInt(prNumber)
      });
    
    if (error) {
      throw error;
    }
    
    if (!data) {
      return res.status(404).json({ 
        error: 'No report found for this repository and PR' 
      });
    }
    
    res.json({
      success: true,
      report: data.report_data,
      metadata: {
        id: data.id,
        createdAt: data.created_at,
        analysisScore: data.analysis_score,
        riskLevel: data.risk_level,
        totalFindings: data.total_findings,
        totalRecommendations: data.total_recommendations
      }
    });
  } catch (error) {
    logger.error('Error retrieving latest report', { error });
    res.status(500).json({ 
      error: 'Failed to retrieve report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/reports
 * List all reports for the authenticated user with pagination
 */
router.get('/reports', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { 
      page = 1, 
      limit = 10, 
      sortBy = 'created_at',
      order = 'desc',
      riskLevel,
      minScore,
      maxScore 
    } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    logger.info('Listing reports', { 
      userId, 
      page, 
      limit, 
      sortBy, 
      order 
    });
    
    // Build query
    let query = supabase
      .from('analysis_report_summaries')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);
    
    // Apply filters
    if (riskLevel) {
      query = query.eq('risk_level', riskLevel);
    }
    if (minScore) {
      query = query.gte('analysis_score', Number(minScore));
    }
    if (maxScore) {
      query = query.lte('analysis_score', Number(maxScore));
    }
    
    // Apply sorting
    const validSortFields = ['created_at', 'analysis_score', 'total_findings', 'risk_level'];
    const sortField = validSortFields.includes(String(sortBy)) ? String(sortBy) : 'created_at';
    query = query.order(sortField, { ascending: order === 'asc' });
    
    // Apply pagination
    query = query.range(offset, offset + Number(limit) - 1);
    
    const { data, error, count } = await query;
    
    if (error) {
      throw error;
    }
    
    res.json({
      success: true,
      reports: data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / Number(limit))
      }
    });
  } catch (error) {
    logger.error('Error listing reports', { error });
    res.status(500).json({ 
      error: 'Failed to list reports',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/reports/statistics
 * Get report statistics for the authenticated user
 */
router.get('/reports/statistics', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.id;
    
    logger.info('Getting report statistics', { userId });
    
    const { data, error } = await supabase
      .rpc('get_user_report_statistics');
    
    if (error) {
      throw error;
    }
    
    res.json({
      success: true,
      statistics: data
    });
  } catch (error) {
    logger.error('Error getting report statistics', { error });
    res.status(500).json({ 
      error: 'Failed to get report statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/reports/:reportId
 * Delete a specific report (soft delete)
 */
router.delete('/reports/:reportId', authMiddleware, async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.user!.id;
    
    logger.info('Deleting report', { reportId, userId });
    
    // Only allow deletion of own reports
    const { error } = await supabase
      .from('analysis_reports')
      .delete()
      .eq('id', reportId)
      .eq('user_id', userId);
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ 
          error: 'Report not found or you do not have permission to delete it' 
        });
      }
      throw error;
    }
    
    res.json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting report', { error });
    res.status(500).json({ 
      error: 'Failed to delete report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/reports/:reportId/export/:format
 * Export a report in different formats
 */
router.get('/reports/:reportId/export/:format', authMiddleware, async (req, res) => {
  try {
    const { reportId, format } = req.params;
    const userId = req.user!.id;
    
    logger.info('Exporting report', { reportId, format, userId });
    
    // Get the report
    const { data, error } = await supabase
      .rpc('get_analysis_report', { report_id: reportId });
    
    if (error) {
      if (error.message.includes('not found or access denied')) {
        return res.status(404).json({ 
          error: 'Report not found or you do not have access' 
        });
      }
      throw error;
    }
    
    const report = data.report_data;
    
    switch (format) {
      case 'markdown':
        res.setHeader('Content-Type', 'text/markdown');
        res.setHeader('Content-Disposition', `attachment; filename="report-${reportId}.md"`);
        res.send(report.exports.markdownReport);
        break;
        
      case 'json':
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="report-${reportId}.json"`);
        res.send(report.exports.jsonReport);
        break;
        
      case 'email':
        res.setHeader('Content-Type', 'text/plain');
        res.send(report.exports.emailFormat);
        break;
        
      case 'slack':
        res.json({
          success: true,
          format: 'slack',
          content: report.exports.slackFormat
        });
        break;
        
      default:
        res.status(400).json({ 
          error: 'Invalid export format. Supported formats: markdown, json, email, slack' 
        });
    }
  } catch (error) {
    logger.error('Error exporting report', { error });
    res.status(500).json({ 
      error: 'Failed to export report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
