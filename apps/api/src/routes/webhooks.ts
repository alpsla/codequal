import express from 'express';
import { Request, Response } from 'express';
import { VectorStorageService } from '@codequal/database';
import { createLogger } from '@codequal/core/utils';
import crypto from 'crypto';

const router = express.Router();
const logger = createLogger('WebhookRoutes');

// Initialize webhook handler (this would typically be dependency injected)
// let webhookHandler: WebhookHandlerService; // DeepWiki functionality removed

// Initialize webhook handler with required dependencies
const initializeWebhookHandler = () => {
  // DeepWiki webhook handler functionality removed
  return null;
};

/**
 * GitHub webhook endpoint
 * Handles GitHub push and pull request events
 */
router.post('/github', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-hub-signature-256'] as string;
    const eventType = req.headers['x-github-event'] as string;
    const githubSecret = process.env.GITHUB_WEBHOOK_SECRET;

    logger.info('Received GitHub webhook', {
      eventType,
      hasSignature: !!signature,
      hasSecret: !!githubSecret
    });

    // Validate webhook signature if secret is configured
    if (githubSecret && signature) {
      const handler = initializeWebhookHandler();
      if (!handler) {
        logger.warn('DeepWiki webhook functionality removed');
        return res.status(503).json({ error: 'DeepWiki functionality removed' });
      }
      // Signature validation removed with DeepWiki
      const isValid = true;
      
      if (!isValid) {
        logger.warn('Invalid GitHub webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    // Parse payload
    let payload: any; // GitHubWebhookPayload type removed with DeepWiki
    try {
      payload = JSON.parse(req.body.toString());
    } catch (parseError) {
      logger.error('Failed to parse GitHub webhook payload', {
        error: parseError instanceof Error ? parseError.message : String(parseError)
      });
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }

    // Process webhook
    // DeepWiki webhook handling removed
    const result = { success: false, message: 'DeepWiki functionality removed', jobId: null, toolResults: null, error: 'DeepWiki removed' };

    if (result.success) {
      logger.info('GitHub webhook processed successfully', {
        eventType,
        repository: payload.repository.full_name,
        jobId: result.jobId
      });
      
      return res.status(200).json({
        message: result.message,
        jobId: result.jobId,
        toolResults: result.toolResults
      });
    } else {
      logger.error('GitHub webhook processing failed', {
        eventType,
        repository: payload.repository.full_name,
        error: result.error
      });
      
      return res.status(500).json({
        error: result.message,
        details: result.error
      });
    }

  } catch (error) {
    logger.error('GitHub webhook endpoint error', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    return res.status(500).json({
      error: 'Internal server error processing GitHub webhook'
    });
  }
});

/**
 * GitLab webhook endpoint
 * Handles GitLab push, merge request, and tag push events
 */
router.post('/gitlab', express.json(), async (req: Request, res: Response) => {
  try {
    const token = req.headers['x-gitlab-token'] as string;
    const eventType = req.headers['x-gitlab-event'] as string;
    const gitlabSecret = process.env.GITLAB_WEBHOOK_SECRET;

    logger.info('Received GitLab webhook', {
      eventType,
      objectKind: req.body.object_kind,
      hasToken: !!token,
      hasSecret: !!gitlabSecret
    });

    // Validate webhook token if secret is configured
    if (gitlabSecret && token) {
      const handler = initializeWebhookHandler();
      // GitLab validation removed with DeepWiki
      const isValid = true;
      
      if (!isValid) {
        logger.warn('Invalid GitLab webhook token');
        return res.status(401).json({ error: 'Invalid token' });
      }
    }

    // Validate payload structure
    const payload: any = req.body; // GitLabWebhookPayload type removed with DeepWiki
    if (!payload.object_kind || !payload.project) {
      logger.error('Invalid GitLab webhook payload structure');
      return res.status(400).json({ error: 'Invalid payload structure' });
    }

    // Process webhook
    // DeepWiki webhook handling removed
    const result = { success: false, message: 'DeepWiki functionality removed', jobId: null, toolResults: null, error: 'DeepWiki removed' };

    if (result.success) {
      logger.info('GitLab webhook processed successfully', {
        objectKind: payload.object_kind,
        project: payload.project.path_with_namespace,
        jobId: result.jobId
      });
      
      return res.status(200).json({
        message: result.message,
        jobId: result.jobId,
        toolResults: result.toolResults
      });
    } else {
      logger.error('GitLab webhook processing failed', {
        objectKind: payload.object_kind,
        project: payload.project.path_with_namespace,
        error: result.error
      });
      
      return res.status(500).json({
        error: result.message,
        details: result.error
      });
    }

  } catch (error) {
    logger.error('GitLab webhook endpoint error', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    return res.status(500).json({
      error: 'Internal server error processing GitLab webhook'
    });
  }
});

/**
 * Manual trigger endpoint
 * Allows manual triggering of repository analysis
 */
router.post('/manual', express.json(), async (req: Request, res: Response) => {
  try {
    const { repositoryUrl, branch, enabledTools, triggeredBy } = req.body;

    if (!repositoryUrl) {
      return res.status(400).json({ error: 'repositoryUrl is required' });
    }

    logger.info('Received manual trigger request', {
      repositoryUrl,
      branch,
      enabledTools,
      triggeredBy: triggeredBy?.username
    });

    // Process manual trigger
    const handler = initializeWebhookHandler();
    if (!handler) {
      return res.status(503).json({ error: 'DeepWiki functionality removed' });
    }
    // Manual trigger removed with DeepWiki
    const result = { success: false, message: 'DeepWiki functionality removed', jobId: null, toolResults: null, error: 'DeepWiki removed' };
    // await handler.handleManualTrigger(repositoryUrl, { branch, enabledTools, triggeredBy });

    if (result.success) {
      logger.info('Manual trigger processed successfully', {
        repositoryUrl,
        jobId: result.jobId
      });
      
      return res.status(200).json({
        message: result.message,
        jobId: result.jobId,
        toolResults: result.toolResults
      });
    } else {
      logger.error('Manual trigger processing failed', {
        repositoryUrl,
        error: result.error
      });
      
      return res.status(500).json({
        error: result.message,
        details: result.error
      });
    }

  } catch (error) {
    logger.error('Manual trigger endpoint error', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    return res.status(500).json({
      error: 'Internal server error processing manual trigger'
    });
  }
});

/**
 * Webhook status endpoint
 * Returns the current webhook configuration and status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const handler = initializeWebhookHandler();
    if (!handler) {
      return res.status(503).json({ error: 'DeepWiki functionality removed' });
    }
    // Status check removed with DeepWiki
    const status = { webhooks: [], totalProcessed: 0, totalErrors: 0 };

    return res.status(200).json({
      ...status,
      endpoints: {
        github: '/api/webhooks/github',
        gitlab: '/api/webhooks/gitlab',
        manual: '/api/webhooks/manual'
      },
      configuration: {
        githubSecretConfigured: !!process.env.GITHUB_WEBHOOK_SECRET,
        gitlabSecretConfigured: !!process.env.GITLAB_WEBHOOK_SECRET,
        kubernetesNamespace: process.env.KUBERNETES_NAMESPACE || 'deepwiki',
        deepwikiPodName: process.env.DEEPWIKI_POD_NAME || 'deepwiki-tools'
      }
    });

  } catch (error) {
    logger.error('Webhook status endpoint error', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    return res.status(500).json({
      error: 'Internal server error getting webhook status'
    });
  }
});

/**
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    endpoints: ['github', 'gitlab', 'manual', 'status']
  });
});

export default router;