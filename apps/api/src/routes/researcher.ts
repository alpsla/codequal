/**
 * RESEARCHER API Routes
 * 
 * Provides endpoints for managing the RESEARCHER agent:
 * - Trigger manual research operations
 * - Monitor research status and progress
 * - View configuration recommendations
 * - Manage scheduled research operations
 */

import { Router, Request, Response } from 'express';
import { AuthenticatedUser } from '../middleware/auth-middleware';
import { ResearcherService } from '@codequal/agents/researcher/researcher-service';
import { VectorContextService } from '@codequal/agents/multi-agent/vector-context-service';
import { ResearchConfig } from '@codequal/agents/researcher/researcher-agent';
import '../types/express';

const router = Router();

// Helper function to create researcher service
function createResearcherService(user: AuthenticatedUser): ResearcherService {
  const vectorContextService = new VectorContextService(user);
  return new ResearcherService(user, vectorContextService);
}

/**
 * POST /api/researcher/trigger
 * Trigger a manual research operation
 */
router.post('/trigger', async (req: Request, res: Response) => {
  try {
    const user = req.user as AuthenticatedUser;
    const config: Partial<ResearchConfig> = req.body.config || {};
    
    // Validate research config
    if (config.maxCostPerMillion && config.maxCostPerMillion < 0) {
      return res.status(400).json({
        success: false,
        error: 'maxCostPerMillion must be non-negative'
      });
    }
    
    if (config.minPerformanceThreshold && (config.minPerformanceThreshold < 1 || config.minPerformanceThreshold > 10)) {
      return res.status(400).json({
        success: false,
        error: 'minPerformanceThreshold must be between 1 and 10'
      });
    }
    
    const researcherService = createResearcherService(user);
    const result = await researcherService.triggerResearch(config);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Failed to trigger research:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/researcher/operations/:operationId
 * Get status of a specific research operation
 */
router.get('/operations/:operationId', async (req: Request, res: Response) => {
  try {
    const user = req.user as AuthenticatedUser;
    const { operationId } = req.params;
    
    const researcherService = createResearcherService(user);
    const operation = await researcherService.getOperationStatus(operationId);
    
    if (!operation) {
      return res.status(404).json({
        success: false,
        error: 'Operation not found'
      });
    }
    
    res.json({
      success: true,
      data: operation
    });
    
  } catch (error) {
    console.error('Failed to get operation status:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/researcher/operations
 * Get all active research operations
 */
router.get('/operations', async (req: Request, res: Response) => {
  try {
    const user = req.user as AuthenticatedUser;
    
    const researcherService = createResearcherService(user);
    const activeOperations = await researcherService.getActiveOperations();
    
    res.json({
      success: true,
      data: {
        activeOperations,
        count: activeOperations.length
      }
    });
    
  } catch (error) {
    console.error('Failed to get active operations:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/researcher/history
 * Get research operation history
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const user = req.user as AuthenticatedUser;
    const limit = parseInt(req.query.limit as string) || 10;
    
    if (limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        error: 'limit must be between 1 and 100'
      });
    }
    
    const researcherService = createResearcherService(user);
    const history = await researcherService.getOperationHistory(limit);
    
    res.json({
      success: true,
      data: {
        history,
        count: history.length
      }
    });
    
  } catch (error) {
    console.error('Failed to get operation history:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/researcher/configuration-overview
 * Get current configuration overview
 */
router.get('/configuration-overview', async (req: Request, res: Response) => {
  try {
    const user = req.user as AuthenticatedUser;
    
    const researcherService = createResearcherService(user);
    const overview = await researcherService.generateConfigurationOverview();
    
    res.json({
      success: true,
      data: overview
    });
    
  } catch (error) {
    console.error('Failed to get configuration overview:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/researcher/recommendations
 * Get recommended optimizations
 */
router.get('/recommendations', async (req: Request, res: Response) => {
  try {
    const user = req.user as AuthenticatedUser;
    
    const researcherService = createResearcherService(user);
    const recommendations = await researcherService.getRecommendedOptimizations();
    
    res.json({
      success: true,
      data: recommendations
    });
    
  } catch (error) {
    console.error('Failed to get recommendations:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/researcher/schedule
 * Start or update scheduled research operations
 */
router.post('/schedule', async (req: Request, res: Response) => {
  try {
    const user = req.user as AuthenticatedUser;
    const { intervalHours } = req.body;
    
    if (!intervalHours || intervalHours < 1 || intervalHours > 168) { // Max 1 week
      return res.status(400).json({
        success: false,
        error: 'intervalHours must be between 1 and 168 (1 week)'
      });
    }
    
    const researcherService = createResearcherService(user);
    await researcherService.startScheduledResearch(intervalHours);
    
    res.json({
      success: true,
      data: {
        message: `Scheduled research every ${intervalHours} hours`,
        intervalHours,
        nextRun: new Date(Date.now() + intervalHours * 60 * 60 * 1000)
      }
    });
    
  } catch (error) {
    console.error('Failed to schedule research:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/researcher/status
 * Get overall RESEARCHER system status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const user = req.user as AuthenticatedUser;
    
    const researcherService = createResearcherService(user);
    const [activeOperations, recentHistory, overview] = await Promise.all([
      researcherService.getActiveOperations(),
      researcherService.getOperationHistory(5),
      researcherService.generateConfigurationOverview()
    ]);
    
    res.json({
      success: true,
      data: {
        status: 'operational',
        activeOperations: activeOperations.length,
        recentOperations: recentHistory.length,
        totalConfigurations: overview.totalConfigurations,
        lastUpdated: overview.lastUpdated,
        systemHealth: {
          researcherAgent: 'healthy',
          vectorDatabase: 'connected',
          configurationSync: 'active'
        }
      }
    });
    
  } catch (error) {
    console.error('Failed to get researcher status:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;