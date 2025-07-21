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
import { VectorStorageService } from '@codequal/database';
import { ModelVersionSync } from '@codequal/core';
import { ProductionResearcherService } from '@codequal/agents/researcher/production-researcher-service';
import { createLogger } from '@codequal/core';

const router = Router();
const logger = createLogger('ResearcherAPI');

// Mock researcher service for testing
interface ResearcherService {
  triggerResearch(config: any): Promise<any>;
  getOperationStatus(operationId: string): Promise<any>;
  getActiveOperations(): Promise<any[]>;
  getOperationHistory(limit: number): Promise<any[]>;
  generateConfigurationOverview(): Promise<any>;
  getRecommendedOptimizations(): Promise<any>;
  startScheduledResearch(intervalHours: number): Promise<void>;
}

// Mock implementation
const mockOperations = new Map<string, any>();

// Helper function to create researcher service (mock for now)
function createResearcherService(user: AuthenticatedUser): ResearcherService {
  return {
    async triggerResearch(config: any) {
      const operationId = `research_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const operation = {
        operationId,
        userId: user.id,
        startedAt: new Date(),
        status: 'running',
        configurationsUpdated: 0,
        totalCostSavings: 0,
        performanceImprovements: 0
      };
      mockOperations.set(operationId, operation);
      
      // Simulate research completion after delay
      setTimeout(() => {
        const op = mockOperations.get(operationId);
        if (op) {
          op.status = 'completed';
          op.completedAt = new Date();
          op.configurationsUpdated = 5;
          op.totalCostSavings = 25;
          op.performanceImprovements = 3;
        }
      }, 5000);
      
      return {
        operationId,
        status: 'started',
        estimatedDuration: config?.researchDepth === 'deep' ? '10-15 minutes' : '3-5 minutes'
      };
    },
    
    async getOperationStatus(operationId: string) {
      return mockOperations.get(operationId) || null;
    },
    
    async getActiveOperations() {
      return Array.from(mockOperations.values()).filter(op => op.status === 'running');
    },
    
    async getOperationHistory(limit: number) {
      return Array.from(mockOperations.values())
        .filter(op => op.status === 'completed')
        .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
        .slice(0, limit);
    },
    
    async generateConfigurationOverview() {
      return {
        totalConfigurations: 25,
        configurationsByProvider: {
          anthropic: 10,
          openai: 8,
          google: 4,
          deepseek: 3
        },
        configurationsByRole: {
          security: 5,
          architecture: 5,
          performance: 5,
          codeQuality: 5,
          dependency: 5
        },
        averageCostPerMillion: 15.5,
        lastUpdated: new Date()
      };
    },
    
    async getRecommendedOptimizations() {
      return {
        costOptimizations: [
          {
            context: 'typescript/small/security',
            currentCost: 10.0,
            recommendedCost: 2.5,
            savings: 75
          }
        ],
        performanceOptimizations: [
          {
            context: 'python/large/architecture',
            currentPerformance: 7.5,
            recommendedPerformance: 9.2,
            improvement: 22.7
          }
        ],
        outdatedConfigurations: [
          {
            context: 'java/medium/performance',
            currentModel: 'gpt-4',
            lastUpdated: new Date('2025-01-01'),
            recommendedUpdate: 'claude-3.5-sonnet'
          }
        ]
      };
    },
    
    async startScheduledResearch(intervalHours: number) {
      console.log(`Mock: Scheduled research every ${intervalHours} hours`);
    }
  };
}

/**
 * POST /api/researcher/trigger
 * Trigger a manual research operation
 */
router.post('/trigger', async (req: Request, res: Response) => {
  try {
    const user = req.user as AuthenticatedUser;
    const config: any = req.body.config || {};
    
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

/**
 * POST /api/researcher/research
 * Perform comprehensive production research
 */
router.post('/research', async (req: Request, res: Response) => {
  try {
    const user = req.user as AuthenticatedUser;
    const { 
      trigger = 'manual',
      includeAllRoles = true,
      includeAllLanguages = true,
      includeAllSizes = true
    } = req.body;
    
    logger.info('Starting production research', {
      userId: user.id,
      trigger,
      includeAllRoles,
      includeAllLanguages,
      includeAllSizes
    });

    // Initialize vector storage
    const vectorStorage = new VectorStorageService();

    // Initialize model sync
    const modelSync = new ModelVersionSync(
      logger,
      '00000000-0000-0000-0000-000000000001' // Special RESEARCHER repository
    );

    // Create production researcher service
    const productionService = new ProductionResearcherService(
      vectorStorage,
      modelSync
    );

    // Perform comprehensive research
    const result = await productionService.performComprehensiveResearch(
      user,
      trigger as 'scheduled' | 'manual'
    );

    // Return summary
    res.json({
      success: true,
      data: {
        operationId: result.operationId,
        configurationsUpdated: result.configurationsUpdated,
        modelsEvaluated: result.modelsEvaluated,
        timestamp: result.timestamp,
        nextScheduledUpdate: result.nextScheduledUpdate,
        selectedConfigurations: result.selectedConfigurations.slice(0, 5).map(config => ({
          role: config.role,
          primary: `${config.primary.provider}/${config.primary.model}`,
          fallback: `${config.fallback.provider}/${config.fallback.model}`,
          reasoning: config.reasoning.join(' ')
        }))
      }
    });
    
  } catch (error) {
    logger.error('Failed to perform production research:', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;