/* eslint-disable @typescript-eslint/no-explicit-any, no-console */
import { Router, Request, Response } from 'express';
import { RepositorySchedulerService } from '@codequal/core/services/scheduling';
import { WebhookHandlerService } from '@codequal/core/services/deepwiki-tools';
import { createLogger } from '@codequal/core/utils';
import { authMiddleware } from '../middleware/auth-middleware';

export const scheduleRoutes = Router();

// Apply authentication to all schedule routes
scheduleRoutes.use(authMiddleware);

/**
 * GET /api/schedules
 * Get all schedules for the authenticated user
 */
scheduleRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const scheduler = RepositorySchedulerService.getInstance();
    const schedules = await scheduler.getAllSchedules();
    
    // TODO: Filter schedules by user's accessible repositories
    // For now, return all schedules (in production, would filter by user permissions)
    
    res.json({
      schedules,
      total: schedules.length
    });
  } catch (error) {
    console.error('Failed to get schedules:', error);
    res.status(500).json({ error: 'Failed to retrieve schedules' });
  }
});

/**
 * GET /api/repositories/:repoUrl/schedule
 * Get schedule for a specific repository
 */
scheduleRoutes.get('/repositories/:repoUrl/schedule', async (req: Request, res: Response) => {
  try {
    const repositoryUrl = decodeURIComponent(req.params.repoUrl);
    const scheduler = RepositorySchedulerService.getInstance();
    
    const schedule = await scheduler.getSchedule(repositoryUrl);
    
    if (!schedule) {
      return res.status(404).json({ error: 'No schedule found for this repository' });
    }
    
    // Calculate schedule suggestions based on current state
    const suggestions = await calculateScheduleSuggestions(repositoryUrl, schedule);
    
    res.json({
      current: schedule,
      suggestions,
      canModify: schedule.canBeDisabled !== false
    });
  } catch (error) {
    console.error('Failed to get repository schedule:', error);
    res.status(500).json({ error: 'Failed to retrieve repository schedule' });
  }
});

/**
 * PUT /api/repositories/:repoUrl/schedule
 * Update schedule for a repository
 */
scheduleRoutes.put('/repositories/:repoUrl/schedule', async (req: Request, res: Response) => {
  try {
    const repositoryUrl = decodeURIComponent(req.params.repoUrl);
    const { frequency, enabledTools, notificationChannels } = req.body;
    const scheduler = RepositorySchedulerService.getInstance();
    
    // Validate user can modify schedule
    const currentSchedule = await scheduler.getSchedule(repositoryUrl);
    if (!currentSchedule) {
      return res.status(404).json({ error: 'No schedule found for this repository' });
    }
    
    if (!currentSchedule.canBeDisabled && frequency === 'on-demand') {
      return res.status(400).json({
        error: 'Cannot disable monitoring for repositories with critical issues'
      });
    }
    
    // Map frequency to cron expression
    const cronExpression = frequencyToCron(frequency);
    
    const updated = await scheduler.updateSchedule(repositoryUrl, {
      frequency,
      cronExpression,
      enabledTools: enabledTools || currentSchedule.enabledTools,
      notificationChannels: notificationChannels || currentSchedule.notificationChannels,
      reason: `Manually updated by user`,
      isActive: frequency !== 'on-demand'
    });
    
    res.json(updated);
  } catch (error) {
    console.error('Failed to update repository schedule:', error);
    res.status(500).json({ error: 'Failed to update repository schedule' });
  }
});

/**
 * POST /api/repositories/:repoUrl/schedule/pause
 * Pause schedule for a repository
 */
scheduleRoutes.post('/repositories/:repoUrl/schedule/pause', async (req: Request, res: Response) => {
  try {
    const repositoryUrl = decodeURIComponent(req.params.repoUrl);
    const scheduler = RepositorySchedulerService.getInstance();
    
    // Check if schedule can be paused
    const currentSchedule = await scheduler.getSchedule(repositoryUrl);
    if (!currentSchedule) {
      return res.status(404).json({ error: 'No schedule found for this repository' });
    }
    
    if (!currentSchedule.canBeDisabled) {
      return res.status(400).json({
        error: 'Cannot pause monitoring for repositories with critical issues'
      });
    }
    
    await scheduler.pauseSchedule(repositoryUrl);
    res.json({ status: 'paused' });
  } catch (error) {
    console.error('Failed to pause repository schedule:', error);
    res.status(500).json({ error: 'Failed to pause repository schedule' });
  }
});

/**
 * POST /api/repositories/:repoUrl/schedule/resume
 * Resume paused schedule for a repository
 */
scheduleRoutes.post('/repositories/:repoUrl/schedule/resume', async (req: Request, res: Response) => {
  try {
    const repositoryUrl = decodeURIComponent(req.params.repoUrl);
    const scheduler = RepositorySchedulerService.getInstance();
    
    await scheduler.resumeSchedule(repositoryUrl);
    res.json({ status: 'resumed' });
  } catch (error) {
    console.error('Failed to resume repository schedule:', error);
    res.status(500).json({ error: 'Failed to resume repository schedule' });
  }
});

/**
 * POST /api/repositories/:repoUrl/schedule/run
 * Manually trigger a scheduled run for testing
 */
scheduleRoutes.post('/repositories/:repoUrl/schedule/run', async (req: Request, res: Response) => {
  try {
    const repositoryUrl = decodeURIComponent(req.params.repoUrl);
    const scheduler = RepositorySchedulerService.getInstance();
    
    const schedule = await scheduler.getSchedule(repositoryUrl);
    if (!schedule) {
      return res.status(404).json({ error: 'No schedule found for this repository' });
    }
    
    // Trigger manual run via webhook handler
    // TODO: Properly inject WebhookHandlerService dependencies
    
    const mockVectorStorage = {} as any;
    const mockEmbeddingService = {} as any;
    const mockLogger = createLogger('WebhookHandler');
    
    const webhookHandler = new WebhookHandlerService(
      mockVectorStorage,
      mockEmbeddingService,
      mockLogger
    );
    
    const result = await webhookHandler.handleScheduledScan(
      repositoryUrl,
      {
        enabledTools: schedule.enabledTools,
        branch: 'main'
      }
    );
    
    res.json({
      status: 'triggered',
      jobId: result.jobId,
      message: result.message
    });
  } catch (error) {
    console.error('Failed to trigger manual run:', error);
    res.status(500).json({ error: 'Failed to trigger manual run' });
  }
});

/**
 * DELETE /api/repositories/:repoUrl/schedule
 * Delete schedule for a repository (only if allowed)
 */
scheduleRoutes.delete('/repositories/:repoUrl/schedule', async (req: Request, res: Response) => {
  try {
    const repositoryUrl = decodeURIComponent(req.params.repoUrl);
    const scheduler = RepositorySchedulerService.getInstance();
    
    const currentSchedule = await scheduler.getSchedule(repositoryUrl);
    if (!currentSchedule) {
      return res.status(404).json({ error: 'No schedule found for this repository' });
    }
    
    if (!currentSchedule.canBeDisabled) {
      return res.status(400).json({
        error: 'Cannot delete monitoring for repositories with critical issues'
      });
    }
    
    // Pause the schedule (soft delete)
    await scheduler.pauseSchedule(repositoryUrl);
    
    res.json({ status: 'deleted' });
  } catch (error) {
    console.error('Failed to delete repository schedule:', error);
    res.status(500).json({ error: 'Failed to delete repository schedule' });
  }
});

// Helper functions

function frequencyToCron(frequency: string): string {
  switch (frequency) {
    case 'every-6-hours':
      return '0 */6 * * *';
    case 'daily':
      return '0 2 * * *'; // 2 AM UTC
    case 'weekly':
      return '0 3 * * 1'; // Monday 3 AM UTC
    case 'monthly':
      return '0 3 1 * *'; // 1st of month 3 AM UTC
    case 'on-demand':
      return '';
    default:
      return '0 2 * * *'; // Default to daily
  }
}

function getAnalysisModeFromFrequency(frequency: string): 'quick' | 'comprehensive' | 'deep' {
  switch (frequency) {
    case 'every-6-hours':
      return 'quick';
    case 'daily':
      return 'comprehensive';
    case 'weekly':
    case 'monthly':
      return 'deep';
    default:
      return 'comprehensive';
  }
}

interface ScheduleSuggestion {
  frequency: string;
  reason: string;
  condition: string;
}

async function calculateScheduleSuggestions(repositoryUrl: string, currentSchedule: { frequency: string; canBeDisabled?: boolean }): Promise<ScheduleSuggestion[]> {
  const suggestions = [];
  
  // Suggest based on current frequency
  if (currentSchedule.frequency === 'every-6-hours') {
    suggestions.push({
      frequency: 'daily',
      reason: 'Once critical issues are resolved, daily monitoring is sufficient',
      condition: 'after_critical_resolved'
    });
  } else if (currentSchedule.frequency === 'monthly') {
    suggestions.push({
      frequency: 'weekly',
      reason: 'Increase monitoring for repositories with active development',
      condition: 'if_activity_increases'
    });
  }
  
  // Always suggest on-demand as an option (if allowed)
  if (currentSchedule.canBeDisabled) {
    suggestions.push({
      frequency: 'on-demand',
      reason: 'Disable automatic monitoring and run analysis manually',
      condition: 'manual_control'
    });
  }
  
  return suggestions;
}

export default scheduleRoutes;
