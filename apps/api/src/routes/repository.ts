import { Router, Request, Response } from 'express';
import { checkRepositoryAccess } from '../middleware/auth-middleware';
import { DeepWikiManager } from '../services/deepwiki-manager';
import { enforceTrialLimits, incrementScanCount } from '../middleware/trial-enforcement';
import { getSupabase } from '@codequal/database/supabase/client';

export const repositoryRoutes = Router();

/**
 * GET /api/repository/status
 * Check repository analysis status in Vector DB
 */
repositoryRoutes.get('/status', async (req: Request, res: Response) => {
  try {
    const { repositoryUrl } = req.query;
    
    if (!repositoryUrl || typeof repositoryUrl !== 'string') {
      return res.status(400).json({ 
        error: 'repositoryUrl query parameter is required' 
      });
    }

    const user = req.user!;

    // Check repository access
    const hasAccess = await checkRepositoryAccess(user, repositoryUrl);
    if (!hasAccess) {
      return res.status(403).json({ 
        error: 'Access denied to repository',
        repositoryUrl 
      });
    }

    // Check repository status
    const deepWikiManager = new DeepWikiManager(user);
    const existsInVectorDB = await deepWikiManager.checkRepositoryExists(repositoryUrl);

    // Calculate next scheduled analysis (mock implementation)
    const nextScheduledAnalysis = new Date();
    nextScheduledAnalysis.setDate(nextScheduledAnalysis.getDate() + 7); // Weekly

    const response = {
      repositoryUrl,
      existsInVectorDB,
      lastAnalyzed: existsInVectorDB ? new Date() : null, // Mock - would be real date
      analysisQuality: existsInVectorDB ? 'fresh' : 'none' as 'fresh' | 'stale' | 'outdated' | 'none',
      nextScheduledAnalysis,
      canTriggerAnalysis: !existsInVectorDB || true // Allow manual trigger
    };

    res.json(response);

  } catch (error) {
    console.error('Repository status check error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/repository/analyze
 * Manually trigger repository analysis
 */
repositoryRoutes.post('/analyze', enforceTrialLimits, incrementScanCount, async (req: Request, res: Response) => {
  try {
    const { repositoryUrl, force = false } = req.body;
    
    if (!repositoryUrl || typeof repositoryUrl !== 'string') {
      return res.status(400).json({ 
        error: 'repositoryUrl is required' 
      });
    }

    const user = req.user!;

    // For trial users, access is already checked by enforceTrialLimits middleware
    // For paid users, check repository access
    const { data: userBilling } = await getSupabase()
      .from('user_billing')
      .select('subscription_status')
      .eq('user_id', user.id)
      .single();
    
    const isTrialUser = !userBilling || userBilling.subscription_status !== 'active';
    
    if (!isTrialUser) {
      // Only check repository access for paid users
      const hasAccess = await checkRepositoryAccess(user, repositoryUrl);
      if (!hasAccess) {
        return res.status(403).json({ 
          error: 'Access denied to repository',
          repositoryUrl 
        });
      }
    }

    const deepWikiManager = new DeepWikiManager(user);

    // Check if analysis already exists (unless forced)
    if (!force) {
      const existsInVectorDB = await deepWikiManager.checkRepositoryExists(repositoryUrl);
      if (existsInVectorDB) {
        return res.status(409).json({ 
          error: 'Repository analysis already exists. Use force=true to re-analyze.',
          repositoryUrl,
          existsInVectorDB: true
        });
      }
    }

    // Trigger analysis
    const jobId = await deepWikiManager.triggerRepositoryAnalysis(repositoryUrl);

    res.json({
      message: 'Repository analysis triggered successfully',
      repositoryUrl,
      jobId,
      status: 'queued',
      estimatedTime: 300 // 5 minutes
    });

  } catch (error) {
    console.error('Repository analysis trigger error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/repository/jobs
 * Get active repository analysis jobs for user
 */
repositoryRoutes.get('/jobs', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const deepWikiManager = new DeepWikiManager(user);
    
    const activeJobs = await deepWikiManager.getActiveJobs();

    res.json({
      activeJobs: activeJobs.map(job => ({
        jobId: job.jobId,
        repositoryUrl: job.repositoryUrl,
        status: job.status,
        startedAt: job.startedAt,
        estimatedCompletion: job.status === 'processing' ? 
          new Date(job.startedAt.getTime() + 5 * 60 * 1000) : null // 5 minutes from start
      }))
    });

  } catch (error) {
    console.error('Repository jobs fetch error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/repository/job/:jobId
 * Get specific job status
 */
repositoryRoutes.get('/job/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const user = req.user!;
    
    const deepWikiManager = new DeepWikiManager(user);
    const job = await deepWikiManager.getJobStatus(jobId);

    if (!job) {
      return res.status(404).json({ 
        error: 'Job not found',
        jobId 
      });
    }

    res.json({
      jobId: job.jobId,
      repositoryUrl: job.repositoryUrl,
      status: job.status,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      error: job.error,
      progress: job.status === 'completed' ? 100 : 
               job.status === 'processing' ? 75 : 
               job.status === 'failed' ? 0 : 25
    });

  } catch (error) {
    console.error('Job status fetch error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/repository/job/:jobId
 * Cancel a repository analysis job
 */
repositoryRoutes.delete('/job/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const user = req.user!;
    
    const deepWikiManager = new DeepWikiManager(user);
    const cancelled = await deepWikiManager.cancelJob(jobId);

    if (!cancelled) {
      return res.status(404).json({ 
        error: 'Job not found or cannot be cancelled',
        jobId 
      });
    }

    res.json({
      message: 'Job cancelled successfully',
      jobId
    });

  } catch (error) {
    console.error('Job cancellation error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});