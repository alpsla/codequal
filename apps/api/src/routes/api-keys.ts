import { Router, Request, Response } from 'express';
import { getSupabase } from '@codequal/database/supabase/client';
import { generateApiKey } from '../middleware/api-key-auth';
import { authMiddleware } from '../middleware/auth-middleware';
import { createHash } from 'crypto';
import { createLogger } from '@codequal/core/utils';

interface DatabaseError extends Error {
  details?: string;
  hint?: string;
}

const logger = createLogger('api-keys');
const router = Router();

// All routes require user authentication
router.use(authMiddleware);

/**
 * @swagger
 * /keys:
 *   get:
 *     summary: List API keys
 *     description: Get all API keys for the authenticated user
 *     tags: [API Keys]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of API keys
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 keys:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       expires_at:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       usage_count:
 *                         type: integer
 *                       usage_limit:
 *                         type: integer
 *                       active:
 *                         type: boolean
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         description: Server error
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        error: 'User not authenticated'
      });
    }
    
    const { data: keys, error } = await getSupabase()
      .from('api_keys')
      .select('id, name, created_at, expires_at, usage_count, usage_limit, active')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Database error fetching API keys:', { error });
      throw error;
    }

    res.json({
      success: true,
      keys: keys || []
    });
  } catch (error) {
    logger.error('Error fetching API keys:', { error });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = (error as DatabaseError)?.details || (error as DatabaseError)?.hint || '';
    logger.error('Error details:', { message: errorMessage, details: errorDetails });
    
    res.status(500).json({
      error: 'Failed to fetch API keys',
      message: errorMessage,
      details: errorDetails
    });
  }
});

/**
 * @swagger
 * /keys:
 *   post:
 *     summary: Create API key
 *     description: Generate a new API key for accessing the public API
 *     tags: [API Keys]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: User-friendly name for the API key
 *                 example: Production API Key
 *               expiresIn:
 *                 type: integer
 *                 description: Days until key expires (optional)
 *                 example: 365
 *     responses:
 *       201:
 *         description: API key created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 key:
 *                   type: string
 *                   description: The full API key (only shown once)
 *                   example: ck_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
 *                 keyId:
 *                   type: string
 *                   format: uuid
 *                 name:
 *                   type: string
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *                 usageLimit:
 *                   type: integer
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: API key limit reached
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 limit:
 *                   type: integer
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        error: 'User not authenticated'
      });
    }
    const { name, expiresIn } = req.body;

    if (!name) {
      return res.status(400).json({
        error: 'API key name is required'
      });
    }

    // Check user's billing plan for API key limits
    const { data: billing } = await getSupabase()
      .from('user_billing')
      .select('subscription_tier')
      .eq('user_id', userId)
      .single();

    // Set key limit based on subscription tier
    let keyLimit = 1; // Default
    if (billing?.subscription_tier === 'team') {
      keyLimit = 10;
    } else if (billing?.subscription_tier === 'individual' || billing?.subscription_tier === 'api') {
      keyLimit = 5;
    }

    // Count existing keys
    const { count } = await getSupabase()
      .from('api_keys')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('active', true);

    if (count && (count as number) >= (keyLimit as number)) {
      return res.status(403).json({
        error: 'API key limit reached for your plan',
        limit: keyLimit
      });
    }

    // Generate new API key
    const apiKey = generateApiKey();
    const keyHash = createHash('sha256').update(apiKey).digest('hex');

    // Calculate expiration
    let expiresAt = null;
    if (expiresIn) {
      const date = new Date();
      date.setDate(date.getDate() + expiresIn);
      expiresAt = date.toISOString();
    }

    // Get usage limit based on billing tier (simplified)
    const usageLimit = billing?.subscription_tier === 'team' ? 999999 : // effectively unlimited
                      billing?.subscription_tier === 'api' ? 200 :
                      billing?.subscription_tier === 'individual' ? 200 : 0;

    // Store API key
    const { data: newKey, error } = await getSupabase()
      .from('api_keys')
      .insert({
        user_id: userId,
        name,
        key_hash: keyHash,
        usage_limit: usageLimit,
        usage_count: 0,
        active: true,
        expires_at: expiresAt,
        permissions: { endpoints: '*' }, // Allow all endpoints by default
        key_prefix: 'ck_',
        rate_limit_per_minute: 60,
        rate_limit_per_hour: 1000,
        metadata: {}
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      key: {
        id: newKey.id,
        name: newKey.name,
        key: apiKey, // Only shown once!
        created_at: newKey.created_at,
        expires_at: newKey.expires_at,
        usage_limit: newKey.usage_limit
      },
      message: 'Save this API key securely. It will not be shown again.'
    });
  } catch (error) {
    logger.error('Error creating API key:', { error });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = (error as DatabaseError)?.details || (error as DatabaseError)?.hint || '';
    logger.error('Error details:', { message: errorMessage, details: errorDetails });
    
    res.status(500).json({
      error: 'Failed to create API key',
      message: errorMessage,
      details: errorDetails
    });
  }
});

/**
 * @swagger
 * /keys/{id}:
 *   delete:
 *     summary: Revoke API key
 *     description: Revoke an API key, preventing further use
 *     tags: [API Keys]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: API key ID to revoke
 *     responses:
 *       200:
 *         description: API key revoked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         description: Server error
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        error: 'User not authenticated'
      });
    }
    const keyId = req.params.id;

    // Soft delete - mark as inactive
    const { error } = await getSupabase()
      .from('api_keys')
      .update({ active: false })
      .eq('id', keyId)
      .eq('user_id', userId);

    if (error) throw error;

    res.json({
      success: true,
      message: 'API key revoked successfully'
    });
  } catch (error) {
    logger.error('Error revoking API key:', { error });
    res.status(500).json({
      error: 'Failed to revoke API key'
    });
  }
});

/**
 * @swagger
 * /keys/{id}/usage:
 *   get:
 *     summary: Get API key usage
 *     description: Get detailed usage statistics for a specific API key
 *     tags: [API Keys]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: API key ID
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [hour, day, week, month]
 *           default: month
 *         description: Time period for usage statistics
 *     responses:
 *       200:
 *         description: Usage statistics retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 usage:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       description: Total API calls
 *                     remaining:
 *                       type: integer
 *                       description: Remaining calls in limit
 *                     period:
 *                       type: string
 *                     breakdown:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date
 *                           count:
 *                             type: integer
 *                     lastUsed:
 *                       type: string
 *                       format: date-time
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:id/usage', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        error: 'User not authenticated'
      });
    }
    const keyId = req.params.id;

    // Verify ownership
    const { data: key } = await getSupabase()
      .from('api_keys')
      .select('usage_count, usage_limit')
      .eq('id', keyId)
      .eq('user_id', userId)
      .single();

    if (!key) {
      return res.status(404).json({
        error: 'API key not found'
      });
    }

    // Get usage statistics
    const { data: usage } = await getSupabase()
      .from('api_usage_logs')
      .select('endpoint, method, timestamp, response_time, status_code')
      .eq('api_key_id', keyId)
      .order('timestamp', { ascending: false })
      .limit(100);

    // Calculate usage by endpoint
    const endpointUsage = usage?.reduce((acc: Record<string, number>, log) => {
      const key = `${log.method} ${log.endpoint}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      usage: {
        total: key.usage_count,
        limit: key.usage_limit,
        remaining: key.usage_limit ? (key.usage_limit as number) - (key.usage_count as number) : 999999,
        percentage: key.usage_limit ? Math.round(((key.usage_count as number) / (key.usage_limit as number)) * 100) : 0,
        byEndpoint: endpointUsage,
        recentCalls: usage
      }
    });
  } catch (error) {
    logger.error('Error fetching usage:', { error });
    res.status(500).json({
      error: 'Failed to fetch usage statistics'
    });
  }
});

export default router;