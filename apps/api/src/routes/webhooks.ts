import express from 'express';
import { Request, Response } from 'express';
import { WebhookHandlerService, GitHubWebhookPayload, GitLabWebhookPayload } from '@codequal/core/services/deepwiki-tools';
import { VectorStorageService } from '@codequal/database';
import { createLogger } from '@codequal/core/utils';
import crypto from 'crypto';

const router = express.Router();
const logger = createLogger('WebhookRoutes');

// Initialize webhook handler (this would typically be dependency injected)
let webhookHandler: WebhookHandlerService;

// Initialize webhook handler with required dependencies
const initializeWebhookHandler = () => {
  if (!webhookHandler) {
    const vectorStorageService = new VectorStorageService();
    const embeddingService = null; // Mock embedding service for webhooks
    
    webhookHandler = new WebhookHandlerService(
      vectorStorageService,
      embeddingService,
      logger,
      {
        namespace: process.env.KUBERNETES_NAMESPACE || 'deepwiki',
        podName: process.env.DEEPWIKI_POD_NAME || 'deepwiki-tools',
        containerName: process.env.DEEPWIKI_CONTAINER_NAME || 'deepwiki-tools'
      }
    );
  }
  return webhookHandler;
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
      const isValid = handler.validateWebhookSignature(
        req.body.toString(),
        signature,
        githubSecret,
        'github'
      );
      
      if (!isValid) {
        logger.warn('Invalid GitHub webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    // Parse payload
    let payload: GitHubWebhookPayload;
    try {
      payload = JSON.parse(req.body.toString());
    } catch (parseError) {
      logger.error('Failed to parse GitHub webhook payload', {
        error: parseError instanceof Error ? parseError.message : String(parseError)
      });
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }

    // Process webhook
    const handler = initializeWebhookHandler();
    const result = await handler.handleGitHubWebhook(eventType, payload);

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
      const isValid = handler.validateGitLabWebhookToken(token, gitlabSecret);
      
      if (!isValid) {
        logger.warn('Invalid GitLab webhook token');
        return res.status(401).json({ error: 'Invalid token' });
      }
    }

    // Validate payload structure
    const payload: GitLabWebhookPayload = req.body;
    if (!payload.object_kind || !payload.project) {
      logger.error('Invalid GitLab webhook payload structure');
      return res.status(400).json({ error: 'Invalid payload structure' });
    }

    // Process webhook
    const handler = initializeWebhookHandler();
    const result = await handler.handleGitLabWebhook(payload);

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
    const result = await handler.handleManualTrigger(repositoryUrl, {
      branch,
      enabledTools,
      triggeredBy
    });

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
    const status = await handler.getWebhookStatus();

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