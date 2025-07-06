/**
 * Embedding Configuration API Routes
 * 
 * Provides endpoints to manage embedding model configurations
 * stored in the database.
 */

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth-middleware';
import { embeddingConfigService } from '@codequal/core/services/vector-db/embedding-config-service';
import { createLogger } from '@codequal/core/utils';

const router = Router();
const logger = createLogger('EmbeddingConfigAPI');

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /embedding-config
 * Get all active embedding configurations
 */
router.get('/', async (req, res) => {
  try {
    const configs = await embeddingConfigService.getActiveConfigs();
    
    res.json({
      success: true,
      configurations: configs
    });
  } catch (error) {
    logger.error('Failed to fetch embedding configurations', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch embedding configurations'
    });
  }
});

/**
 * GET /embedding-config/default
 * Get the default embedding configuration
 */
router.get('/default', async (req, res) => {
  try {
    const config = await embeddingConfigService.getDefaultConfig();
    
    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'No default configuration found'
      });
    }
    
    res.json({
      success: true,
      configuration: config
    });
  } catch (error) {
    logger.error('Failed to fetch default embedding configuration', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch default configuration'
    });
  }
});

/**
 * GET /embedding-config/by-content-type/:contentType
 * Get configuration for a specific content type
 */
router.get('/by-content-type/:contentType', async (req, res) => {
  try {
    const { contentType } = req.params;
    const config = await embeddingConfigService.getConfigForContentType(contentType);
    
    if (!config) {
      return res.status(404).json({
        success: false,
        error: `No configuration found for content type: ${contentType}`
      });
    }
    
    res.json({
      success: true,
      configuration: config
    });
  } catch (error) {
    logger.error('Failed to fetch content-specific embedding configuration', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch configuration'
    });
  }
});

/**
 * GET /embedding-config/:configName
 * Get a specific configuration by name
 */
router.get('/:configName', async (req, res) => {
  try {
    const { configName } = req.params;
    const config = await embeddingConfigService.getConfigByName(configName);
    
    if (!config) {
      return res.status(404).json({
        success: false,
        error: `Configuration not found: ${configName}`
      });
    }
    
    res.json({
      success: true,
      configuration: config
    });
  } catch (error) {
    logger.error('Failed to fetch embedding configuration', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch configuration'
    });
  }
});

/**
 * PUT /embedding-config/:configName
 * Update a configuration
 */
router.put('/:configName', async (req, res) => {
  try {
    const { configName } = req.params;
    const updates = req.body;
    
    // Validate updates
    const allowedFields = [
      'provider', 'model_name', 'dimensions', 'max_tokens',
      'api_key_env_var', 'base_url', 'description', 
      'cost_per_1k_tokens', 'quality_score', 'is_active',
      'is_default', 'content_type_preference'
    ];
    
    const invalidFields = Object.keys(updates).filter(
      field => !allowedFields.includes(field)
    );
    
    if (invalidFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Invalid fields: ${invalidFields.join(', ')}`
      });
    }
    
    const updatedConfig = await embeddingConfigService.updateConfig(configName, updates);
    
    if (!updatedConfig) {
      return res.status(404).json({
        success: false,
        error: `Configuration not found: ${configName}`
      });
    }
    
    res.json({
      success: true,
      configuration: updatedConfig
    });
  } catch (error) {
    logger.error('Failed to update embedding configuration', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to update configuration'
    });
  }
});

/**
 * POST /embedding-config
 * Create a new configuration
 */
router.post('/', async (req, res) => {
  try {
    const configData = req.body;
    
    // Validate required fields
    const requiredFields = [
      'config_name', 'provider', 'model_name', 
      'dimensions', 'max_tokens', 'last_updated'
    ];
    
    const missingFields = requiredFields.filter(
      field => !configData[field]
    );
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      });
    }
    
    // Add creator info
    configData.created_by = req.user?.email || 'api';
    
    const newConfig = await embeddingConfigService.createConfig(configData);
    
    if (!newConfig) {
      return res.status(400).json({
        success: false,
        error: 'Failed to create configuration'
      });
    }
    
    res.status(201).json({
      success: true,
      configuration: newConfig
    });
  } catch (error) {
    logger.error('Failed to create embedding configuration', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to create configuration'
    });
  }
});

/**
 * GET /embedding-config/:configId/metrics
 * Get performance metrics for a configuration
 */
router.get('/:configId/metrics', async (req, res) => {
  try {
    const { configId } = req.params;
    const { window = 'last_24h' } = req.query;
    
    const metrics = await embeddingConfigService.getConfigMetrics(
      parseInt(configId),
      window as 'last_hour' | 'last_24h' | 'last_7d'
    );
    
    if (!metrics) {
      return res.status(404).json({
        success: false,
        error: 'Metrics not found'
      });
    }
    
    res.json({
      success: true,
      metrics,
      window
    });
  } catch (error) {
    logger.error('Failed to fetch embedding metrics', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch metrics'
    });
  }
});

export default router;