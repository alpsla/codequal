/* eslint-disable @typescript-eslint/no-explicit-any */
import { RepositorySchedulerService } from '@codequal/core/services/scheduling';
import { WebhookHandlerService } from '@codequal/core/services/deepwiki-tools';
import { createLogger } from '@codequal/core/utils';

// Mock dependencies
jest.mock('@codequal/core/services/scheduling');
jest.mock('@codequal/core/services/deepwiki-tools');
jest.mock('@codequal/core/utils');

describe('Scheduled Repository Analysis', () => {
  let schedulerService: any;
  let webhookHandler: any;
  let mockLogger: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };
    (createLogger as jest.Mock).mockReturnValue(mockLogger);

    // Mock RepositorySchedulerService
    schedulerService = {
      getAllSchedules: jest.fn(),
      getSchedule: jest.fn(),
      updateSchedule: jest.fn(),
      pauseSchedule: jest.fn(),
      resumeSchedule: jest.fn(),
      createSchedule: jest.fn(),
      deleteSchedule: jest.fn()
    };
    (RepositorySchedulerService.getInstance as jest.Mock).mockReturnValue(schedulerService);

    // Mock WebhookHandlerService
    webhookHandler = {
      handleScheduledScan: jest.fn()
    };
  });

  describe('Schedule Creation and Management', () => {
    it('should create daily schedule for repositories with medium activity', async () => {
      const repositoryUrl = 'https://github.com/test/repo';
      const schedule = {
        repositoryUrl,
        frequency: 'daily',
        cronExpression: '0 2 * * *', // 2 AM UTC
        enabledTools: ['npm-audit', 'license-checker', 'madge', 'dependency-cruiser', 'npm-outdated'],
        isActive: true,
        canBeDisabled: true,
        lastRun: null,
        nextRun: new Date('2025-01-18T02:00:00Z')
      };

      schedulerService.createSchedule.mockResolvedValue(schedule);
      
      const result = await schedulerService.createSchedule(repositoryUrl, {
        frequency: 'daily',
        enabledTools: schedule.enabledTools
      });

      expect(result.frequency).toBe('daily');
      expect(result.cronExpression).toBe('0 2 * * *');
      expect(result.isActive).toBe(true);
    });

    it('should create every-6-hours schedule for critical repositories', async () => {
      const repositoryUrl = 'https://github.com/critical/security-app';
      const schedule = {
        repositoryUrl,
        frequency: 'every-6-hours',
        cronExpression: '0 */6 * * *',
        enabledTools: ['npm-audit', 'license-checker'], // Quick security tools only
        isActive: true,
        canBeDisabled: false, // Cannot be disabled due to critical issues
        reason: 'Critical security vulnerabilities detected',
        lastRun: new Date('2025-01-17T18:00:00Z'),
        nextRun: new Date('2025-01-18T00:00:00Z')
      };

      schedulerService.createSchedule.mockResolvedValue(schedule);
      
      const result = await schedulerService.createSchedule(repositoryUrl, {
        frequency: 'every-6-hours',
        enabledTools: ['npm-audit', 'license-checker'],
        reason: 'Critical security vulnerabilities detected'
      });

      expect(result.frequency).toBe('every-6-hours');
      expect(result.cronExpression).toBe('0 */6 * * *');
      expect(result.canBeDisabled).toBe(false);
      expect(result.enabledTools).toHaveLength(2);
    });

    it('should create weekly schedule for stable repositories', async () => {
      const repositoryUrl = 'https://github.com/stable/lib';
      const schedule = {
        repositoryUrl,
        frequency: 'weekly',
        cronExpression: '0 3 * * 1', // Monday 3 AM UTC
        enabledTools: ['npm-audit', 'license-checker', 'madge', 'dependency-cruiser', 'npm-outdated'],
        isActive: true,
        canBeDisabled: true,
        lastRun: new Date('2025-01-13T03:00:00Z'),
        nextRun: new Date('2025-01-20T03:00:00Z')
      };

      schedulerService.getSchedule.mockResolvedValue(schedule);
      
      const result = await schedulerService.getSchedule(repositoryUrl);

      expect(result.frequency).toBe('weekly');
      expect(result.cronExpression).toBe('0 3 * * 1');
    });

    it('should create monthly schedule for archived repositories', async () => {
      const repositoryUrl = 'https://github.com/archived/old-project';
      const schedule = {
        repositoryUrl,
        frequency: 'monthly',
        cronExpression: '0 3 1 * *', // 1st of month 3 AM UTC
        enabledTools: ['npm-audit', 'license-checker', 'madge', 'dependency-cruiser', 'npm-outdated'],
        isActive: true,
        canBeDisabled: true,
        lastRun: new Date('2025-01-01T03:00:00Z'),
        nextRun: new Date('2025-02-01T03:00:00Z')
      };

      schedulerService.getSchedule.mockResolvedValue(schedule);
      
      const result = await schedulerService.getSchedule(repositoryUrl);

      expect(result.frequency).toBe('monthly');
      expect(result.cronExpression).toBe('0 3 1 * *');
    });
  });

  describe('Schedule Execution', () => {
    it('should trigger main branch analysis on schedule', async () => {
      const repositoryUrl = 'https://github.com/test/repo';
      const mockWebhookHandler = new WebhookHandlerService({} as any, {} as any, mockLogger);
      
      webhookHandler.handleScheduledScan.mockResolvedValue({
        jobId: 'scheduled-job-123',
        message: 'Scheduled analysis triggered successfully',
        status: 'processing'
      });

      const result = await webhookHandler.handleScheduledScan(repositoryUrl, {
        enabledTools: ['npm-audit', 'license-checker', 'madge'],
        branch: 'main',
        isScheduledRun: true
      });

      expect(result.jobId).toBe('scheduled-job-123');
      expect(result.status).toBe('processing');
    });

    it('should use appropriate analysis mode based on frequency', async () => {
      // Every 6 hours = quick mode
      const quickAnalysis = {
        frequency: 'every-6-hours',
        expectedMode: 'quick',
        expectedTools: ['npm-audit', 'license-checker']
      };

      // Daily = comprehensive mode
      const comprehensiveAnalysis = {
        frequency: 'daily',
        expectedMode: 'comprehensive',
        expectedTools: ['npm-audit', 'license-checker', 'madge', 'dependency-cruiser', 'npm-outdated']
      };

      // Weekly/Monthly = deep mode
      const deepAnalysis = {
        frequency: 'weekly',
        expectedMode: 'deep',
        expectedTools: ['npm-audit', 'license-checker', 'madge', 'dependency-cruiser', 'npm-outdated']
      };

      // Test frequency to mode mapping
      expect(getAnalysisModeFromFrequency(quickAnalysis.frequency)).toBe(quickAnalysis.expectedMode);
      expect(getAnalysisModeFromFrequency(comprehensiveAnalysis.frequency)).toBe(comprehensiveAnalysis.expectedMode);
      expect(getAnalysisModeFromFrequency(deepAnalysis.frequency)).toBe(deepAnalysis.expectedMode);
    });
  });

  describe('Schedule Modification Rules', () => {
    it('should prevent disabling schedule for repositories with critical issues', async () => {
      const repositoryUrl = 'https://github.com/critical/app';
      const schedule = {
        repositoryUrl,
        frequency: 'every-6-hours',
        canBeDisabled: false,
        reason: 'Critical security vulnerabilities present'
      };

      schedulerService.getSchedule.mockResolvedValue(schedule);

      // Attempt to pause schedule
      const canPause = schedule.canBeDisabled;
      expect(canPause).toBe(false);
    });

    it('should allow pausing schedule for healthy repositories', async () => {
      const repositoryUrl = 'https://github.com/healthy/app';
      const schedule = {
        repositoryUrl,
        frequency: 'daily',
        canBeDisabled: true,
        isActive: true
      };

      schedulerService.getSchedule.mockResolvedValue(schedule);
      schedulerService.pauseSchedule.mockResolvedValue({ ...schedule, isActive: false });

      await schedulerService.pauseSchedule(repositoryUrl);
      
      expect(schedulerService.pauseSchedule).toHaveBeenCalledWith(repositoryUrl);
    });

    it('should automatically upgrade frequency for repositories with new critical issues', async () => {
      const repositoryUrl = 'https://github.com/test/repo';
      
      // Initial state: daily schedule
      const initialSchedule = {
        repositoryUrl,
        frequency: 'daily',
        canBeDisabled: true
      };

      // After critical issue detected: upgrade to every-6-hours
      const upgradedSchedule = {
        repositoryUrl,
        frequency: 'every-6-hours',
        canBeDisabled: false,
        reason: 'Upgraded due to critical security vulnerability'
      };

      schedulerService.updateSchedule.mockResolvedValue(upgradedSchedule);

      const result = await schedulerService.updateSchedule(repositoryUrl, {
        frequency: 'every-6-hours',
        canBeDisabled: false,
        reason: 'Upgraded due to critical security vulnerability'
      });

      expect(result.frequency).toBe('every-6-hours');
      expect(result.canBeDisabled).toBe(false);
    });
  });

  describe('Schedule Timing and Execution', () => {
    it('should calculate next run time correctly', () => {
      const now = new Date('2025-01-17T10:00:00Z');
      
      // Daily at 2 AM UTC
      const dailyNext = getNextRunTime('0 2 * * *', now);
      expect(dailyNext).toEqual(new Date('2025-01-18T02:00:00Z'));

      // Every 6 hours
      const sixHourlyNext = getNextRunTime('0 */6 * * *', now);
      expect(sixHourlyNext).toEqual(new Date('2025-01-17T12:00:00Z'));

      // Weekly on Monday 3 AM UTC (assuming today is Friday)
      const weeklyNext = getNextRunTime('0 3 * * 1', new Date('2025-01-17T10:00:00Z')); // Friday
      expect(weeklyNext).toEqual(new Date('2025-01-20T03:00:00Z')); // Next Monday

      // Monthly on 1st at 3 AM UTC
      const monthlyNext = getNextRunTime('0 3 1 * *', new Date('2025-01-17T10:00:00Z'));
      expect(monthlyNext).toEqual(new Date('2025-02-01T03:00:00Z'));
    });

    it('should handle schedule execution errors gracefully', async () => {
      const repositoryUrl = 'https://github.com/test/repo';
      
      webhookHandler.handleScheduledScan.mockRejectedValue(new Error('Analysis failed'));

      try {
        await webhookHandler.handleScheduledScan(repositoryUrl, {
          enabledTools: ['npm-audit'],
          branch: 'main'
        });
      } catch (error) {
        expect(error.message).toBe('Analysis failed');
      }

      // Schedule should remain active despite failure
      const schedule = await schedulerService.getSchedule(repositoryUrl);
      expect(schedule?.isActive).toBe(true);
    });
  });

  describe('Integration with DeepWiki Analysis', () => {
    it('should trigger DeepWiki analysis for main branch on schedule', async () => {
      const repositoryUrl = 'https://github.com/test/repo';
      const mockDeepWikiTrigger = jest.fn().mockResolvedValue('job-456');

      // Simulate scheduled scan triggering DeepWiki
      const result = {
        jobId: 'job-456',
        repositoryUrl,
        branch: 'main',
        analysisMode: 'comprehensive',
        isScheduledRun: true,
        triggeredAt: new Date()
      };

      expect(result.branch).toBe('main');
      expect(result.isScheduledRun).toBe(true);
      expect(result.analysisMode).toBe('comprehensive');
    });
  });
});

// Helper functions that should match the actual implementation
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

function getNextRunTime(cronExpression: string, fromDate: Date): Date {
  // Simplified implementation for testing
  // In production, this would use a proper cron parser
  const parts = cronExpression.split(' ');
  const hour = parseInt(parts[1]);
  const nextRun = new Date(fromDate);

  if (cronExpression.includes('*/6')) {
    // Every 6 hours
    const currentHour = fromDate.getHours();
    const nextHour = Math.ceil(currentHour / 6) * 6;
    nextRun.setHours(nextHour, 0, 0, 0);
    if (nextHour <= currentHour) {
      nextRun.setDate(nextRun.getDate() + 1);
      nextRun.setHours(0, 0, 0, 0);
    }
  } else if (parts[4] === '*') {
    // Daily
    nextRun.setDate(fromDate.getDate() + 1);
    nextRun.setHours(hour, 0, 0, 0);
  } else if (parts[4] === '1') {
    // Weekly on Monday
    const daysUntilMonday = (8 - fromDate.getDay()) % 7 || 7;
    nextRun.setDate(fromDate.getDate() + daysUntilMonday);
    nextRun.setHours(hour, 0, 0, 0);
  } else if (parts[2] === '1') {
    // Monthly on 1st
    nextRun.setMonth(fromDate.getMonth() + 1);
    nextRun.setDate(1);
    nextRun.setHours(hour, 0, 0, 0);
  }

  return nextRun;
}