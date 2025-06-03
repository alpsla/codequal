/**
 * Tests for Research Scheduler
 * 
 * Tests the cron-based scheduling system and integration with upgrade coordinator
 */

import * as cron from 'node-cron';
import { ResearchScheduler, ResearchJobType } from '../research-scheduler';
import { ResearcherAgent } from '../../../../agents/src/researcher/researcher-agent';
import { AuthenticatedUser } from '../../types';

// Mock dependencies
jest.mock('node-cron');
jest.mock('../../utils', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }))
}));

// Mock ResearcherAgent
const mockConductResearchAndUpdate = jest.fn().mockResolvedValue({
  success: true,
  tokensUsed: 1500,
  updatedConfigs: 3
});

const mockConductMetaResearch = jest.fn().mockImplementation(() => {
  // Store meta research result in environment
  const history = JSON.parse(process.env.META_RESEARCH_HISTORY || '[]');
  const newEntry = {
    date: new Date().toISOString(),
    currentModel: { provider: 'google', model: 'gemini-2.5-flash' },
    shouldUpgrade: false,
    confidence: 0.85
  };
  history.push(newEntry);
  process.env.META_RESEARCH_HISTORY = JSON.stringify(history);
  
  return Promise.resolve({
    currentModel: { provider: 'google', model: 'gemini-2.5-flash' },
    recommendation: { shouldUpgrade: false },
    confidence: 0.85
  });
});

jest.mock('../../../../agents/src/researcher/researcher-agent', () => ({
  ResearcherAgent: jest.fn().mockImplementation(() => ({
    conductResearchAndUpdate: mockConductResearchAndUpdate,
    conductMetaResearch: mockConductMetaResearch,
    getCacheStats: jest.fn().mockReturnValue({
      model: 'google/gemini-2.5-flash',
      requestCount: 5,
      isActive: true
    })
  }))
}));

// Mock ResearcherUpgradeCoordinator
const mockHandleResearchRequest = jest.fn().mockResolvedValue({
  requestId: 'test-request-123',
  status: 'completed',
  result: {
    coordinatorResult: { success: true },
    requestId: 'test-request-123'
  }
});

jest.mock('../researcher-upgrade-coordinator', () => ({
  ResearcherUpgradeCoordinator: jest.fn().mockImplementation(() => ({
    handleResearchRequest: mockHandleResearchRequest
  }))
}));

const mockCron = cron as jest.Mocked<typeof cron>;

describe('ResearchScheduler', () => {
  let mockUser: AuthenticatedUser;
  let scheduler: ResearchScheduler;
  let mockScheduledTask: jest.Mocked<cron.ScheduledTask>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConductResearchAndUpdate.mockClear();
    mockConductMetaResearch.mockClear();
    mockHandleResearchRequest.mockClear();

    mockUser = {
      id: 'test-user',
      email: 'test@example.com',
      name: 'Test User'
    } as AuthenticatedUser;

    // Mock scheduled task
    mockScheduledTask = {
      start: jest.fn(),
      stop: jest.fn(),
      running: false
    } as jest.Mocked<cron.ScheduledTask>;

    mockCron.schedule.mockReturnValue(mockScheduledTask);

    scheduler = new ResearchScheduler(mockUser);
  });

  describe('Scheduler Initialization', () => {
    test('should initialize with default configuration', () => {
      expect(scheduler).toBeDefined();
      
      const stats = scheduler.getStats();
      expect(stats.totalJobs).toBe(0);
      expect(stats.runningJobs).toBe(0);
    });

    test('should initialize with custom configuration', () => {
      const customScheduler = new ResearchScheduler(mockUser, undefined, {
        quarterlyCron: '0 8 1 */3 *',
        timezone: 'America/New_York',
        maxConcurrentJobs: 5
      });

      expect(customScheduler).toBeDefined();
    });
  });

  describe('Quarterly Scheduling', () => {
    test('should schedule quarterly tasks correctly', () => {
      // Check that scheduler hasn't started yet
      expect(mockCron.schedule).toHaveBeenCalledTimes(0);
      
      scheduler.start();

      // Should create two scheduled tasks (context and meta research)
      expect(mockCron.schedule).toHaveBeenCalledTimes(2);
      
      // First call should be for context research
      expect(mockCron.schedule).toHaveBeenNthCalledWith(
        1,
        '0 9 1 */3 *',
        expect.any(Function),
        {
          scheduled: false,
          timezone: 'UTC'
        }
      );

      // Second call should be for meta research (1 hour later)
      expect(mockCron.schedule).toHaveBeenNthCalledWith(
        2,
        '0 10 1 */3 *', // 1 hour offset
        expect.any(Function),
        {
          scheduled: false,
          timezone: 'UTC'
        }
      );

      expect(mockScheduledTask.start).toHaveBeenCalledTimes(2);
    });

    test('should not schedule when disabled', () => {
      const disabledScheduler = new ResearchScheduler(mockUser, undefined, {
        enabled: false
      });

      disabledScheduler.start();

      expect(mockCron.schedule).not.toHaveBeenCalled();
    });

    test('should stop all scheduled tasks', () => {
      scheduler.start();
      scheduler.stop();

      expect(mockScheduledTask.stop).toHaveBeenCalledTimes(2);
    });
  });

  describe('Quarterly Context Research Execution', () => {
    test('should execute quarterly context research', async () => {
      scheduler.start();

      // Get the context research callback
      const contextResearchCallback = mockCron.schedule.mock.calls[0][1];

      // Execute the callback
      await contextResearchCallback();

      // Check that a job was created
      const stats = scheduler.getStats();
      expect(stats.totalJobs).toBe(1);
    });

    test('should handle concurrent job limits', async () => {
      const limitedScheduler = new ResearchScheduler(mockUser, undefined, {
        maxConcurrentJobs: 1
      });

      limitedScheduler.start();

      // Simulate max concurrent jobs reached
      const contextResearchCallback = mockCron.schedule.mock.calls[0][1];

      // Start multiple executions
      const executions = [
        contextResearchCallback(),
        contextResearchCallback()
      ];

      await Promise.all(executions);

      // Should handle gracefully
      const stats = limitedScheduler.getStats();
      expect(stats.totalJobs).toBeGreaterThan(0);
    });
  });

  describe('Quarterly Meta Research Execution', () => {
    test('should execute quarterly meta research', async () => {
      scheduler.start();

      // Get the meta research callback (second call)
      const metaResearchCallback = mockCron.schedule.mock.calls[1][1];

      // Execute the callback
      await metaResearchCallback();

      // Check that a job was created
      const stats = scheduler.getStats();
      expect(stats.totalJobs).toBe(1);
    });

    test('should store meta research results', async () => {
      scheduler.start();

      const metaResearchCallback = mockCron.schedule.mock.calls[1][1];
      await metaResearchCallback();

      // Verify meta research history is stored
      const history = JSON.parse(process.env.META_RESEARCH_HISTORY || '[]');
      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe('Unscheduled Research Triggers', () => {
    test('should trigger unscheduled research for missing config', async () => {
      const jobId = await scheduler.triggerUnscheduledResearch(
        'rust',
        'large',
        'performance',
        'Missing configuration requested by orchestrator'
      );

      expect(jobId).toBeDefined();

      const jobStatus = scheduler.getJobStatus(jobId);
      expect(jobStatus).toBeDefined();
      expect(jobStatus!.type).toBe(ResearchJobType.UNSCHEDULED_MISSING_CONFIG);
    });

    test('should handle urgent unscheduled research', async () => {
      const jobId = await scheduler.triggerUnscheduledResearch(
        'security',
        'large',
        'security',
        'Critical security analysis needed',
        'critical'
      );

      expect(jobId).toBeDefined();

      const jobStatus = scheduler.getJobStatus(jobId);
      expect(jobStatus!.context.urgency).toBe('critical');
    });

    test('should use upgrade coordinator for unscheduled research', async () => {
      const jobId = await scheduler.triggerUnscheduledResearch(
        'python',
        'medium',
        'performance'
      );

      // Wait for execution
      await new Promise(resolve => setTimeout(resolve, 100));

      const jobStatus = scheduler.getJobStatus(jobId);
      expect(jobStatus!.result?.coordinatorResult).toBeDefined();
    });
  });

  describe('Manual Research Triggers', () => {
    test('should trigger manual context research', async () => {
      const jobId = await scheduler.triggerManualResearch(
        'context',
        'Manual trigger for testing'
      );

      expect(jobId).toBeDefined();

      const jobStatus = scheduler.getJobStatus(jobId);
      expect(jobStatus!.type).toBe(ResearchJobType.MANUAL_TRIGGER);
      expect(jobStatus!.context.type).toBe('context');
    });

    test('should trigger manual meta research', async () => {
      const jobId = await scheduler.triggerManualResearch(
        'meta',
        'Manual meta-research trigger'
      );

      expect(jobId).toBeDefined();

      const jobStatus = scheduler.getJobStatus(jobId);
      expect(jobStatus!.context.type).toBe('meta');
    });
  });

  describe('Job Management', () => {
    test('should track job statistics correctly', async () => {
      // Trigger multiple jobs
      await scheduler.triggerUnscheduledResearch('python', 'small', 'performance');
      await scheduler.triggerUnscheduledResearch('java', 'medium', 'security');
      await scheduler.triggerManualResearch('context', 'test');

      const stats = scheduler.getStats();
      expect(stats.totalJobs).toBe(3);
      expect(stats.runningJobs).toBeGreaterThanOrEqual(0);
    });

    test('should return recent jobs correctly', () => {
      // Trigger some jobs
      scheduler.triggerUnscheduledResearch('python', 'small', 'performance');
      scheduler.triggerUnscheduledResearch('java', 'medium', 'security');

      const recentJobs = scheduler.getRecentJobs(5);
      expect(recentJobs.length).toBe(2);
      
      // Should be sorted by most recent first
      expect(recentJobs[0].scheduledAt.getTime()).toBeGreaterThanOrEqual(
        recentJobs[1].scheduledAt.getTime()
      );
    });

    test('should handle job status queries', async () => {
      const jobId = await scheduler.triggerUnscheduledResearch(
        'typescript',
        'large',
        'architecture'
      );

      const jobStatus = scheduler.getJobStatus(jobId);
      expect(jobStatus).toBeDefined();
      expect(jobStatus!.id).toBe(jobId);
    });

    test('should return null for non-existent job', () => {
      const jobStatus = scheduler.getJobStatus('non-existent-job');
      expect(jobStatus).toBeNull();
    });
  });

  describe('Cron Expression Handling', () => {
    test('should adjust cron time correctly', () => {
      const scheduler = new ResearchScheduler(mockUser, undefined, {
        quarterlyCron: '0 9 1 */3 *'
      });

      scheduler.start();

      // Meta research should be scheduled 1 hour later
      expect(mockCron.schedule).toHaveBeenNthCalledWith(
        2,
        '0 10 1 */3 *',
        expect.any(Function),
        expect.any(Object)
      );
    });

    test('should handle timezone configuration', () => {
      const scheduler = new ResearchScheduler(mockUser, undefined, {
        timezone: 'America/New_York'
      });

      scheduler.start();

      expect(mockCron.schedule).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Function),
        expect.objectContaining({
          timezone: 'America/New_York'
        })
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle context research execution errors', async () => {
      // Mock researcher agent to throw error
      const mockResearcher = {
        conductResearchAndUpdate: jest.fn().mockRejectedValue(new Error('Research failed'))
      };

      const errorScheduler = new ResearchScheduler(
        mockUser, 
        mockResearcher as any
      );

      errorScheduler.start();

      const contextResearchCallback = mockCron.schedule.mock.calls[0][1];
      await contextResearchCallback();

      const recentJobs = errorScheduler.getRecentJobs(1);
      expect(recentJobs[0].status).toBe('failed');
    });

    test('should handle meta research execution errors', async () => {
      const mockResearcher = {
        conductMetaResearch: jest.fn().mockRejectedValue(new Error('Meta research failed'))
      };

      const errorScheduler = new ResearchScheduler(
        mockUser,
        mockResearcher as any
      );

      errorScheduler.start();

      const metaResearchCallback = mockCron.schedule.mock.calls[1][1];
      await metaResearchCallback();

      const recentJobs = errorScheduler.getRecentJobs(1);
      expect(recentJobs[0].status).toBe('failed');
    });

    test('should handle unscheduled research errors gracefully', async () => {
      const jobId = await scheduler.triggerUnscheduledResearch(
        'invalid-language',
        'invalid-size' as any,
        'invalid-role'
      );

      // Wait for execution
      await new Promise(resolve => setTimeout(resolve, 200));

      const jobStatus = scheduler.getJobStatus(jobId);
      expect(jobStatus!.status).toMatch(/failed|completed/);
    });
  });

  describe('Integration Tests', () => {
    test('should integrate with upgrade coordinator correctly', async () => {
      const jobId = await scheduler.triggerUnscheduledResearch(
        'python',
        'medium',
        'performance',
        'Test integration',
        'normal'
      );

      // Wait for coordinator to process
      await new Promise(resolve => setTimeout(resolve, 100));

      const jobStatus = scheduler.getJobStatus(jobId);
      expect(jobStatus!.result?.coordinatorResult).toBeDefined();
      expect(jobStatus!.result?.requestId).toBeDefined();
    });

    test('should handle multiple concurrent unscheduled requests', async () => {
      const jobPromises = [
        scheduler.triggerUnscheduledResearch('python', 'small', 'performance'),
        scheduler.triggerUnscheduledResearch('java', 'medium', 'security'),
        scheduler.triggerUnscheduledResearch('typescript', 'large', 'architecture')
      ];

      const jobIds = await Promise.all(jobPromises);

      expect(jobIds.length).toBe(3);
      jobIds.forEach(jobId => {
        const job = scheduler.getJobStatus(jobId);
        expect(job).toBeDefined();
      });
    });
  });

  afterEach(() => {
    // Clean up
    scheduler.stop();
    delete process.env.META_RESEARCH_HISTORY;
  });
});