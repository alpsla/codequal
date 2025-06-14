/* eslint-disable @typescript-eslint/no-explicit-any */
import { RepositorySchedulerService, ScheduleConfig, AnalysisResult } from '../repository-scheduler.service';
import { getSupabaseClient } from '../../supabase/supabase-client.factory';
import { createLogger } from '../../../utils/logger';

// Mock dependencies
jest.mock('../../supabase/supabase-client.factory');
jest.mock('../../deepwiki-tools/webhook-handler.service');
jest.mock('../../../utils/logger');

describe('RepositorySchedulerService', () => {
  let service: RepositorySchedulerService;
  let mockSupabase: any;

  beforeEach(() => {
    // Reset singleton instance
    (RepositorySchedulerService as any).instance = undefined;
    
    // Setup mock Supabase
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      delete: jest.fn().mockReturnThis(),
    };
    
    (getSupabaseClient as jest.Mock).mockReturnValue(mockSupabase);
    
    // Mock logger
    const mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };
    (createLogger as jest.Mock).mockReturnValue(mockLogger);
    
    service = RepositorySchedulerService.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeAutomaticSchedule', () => {
    it('should create schedule for repository with critical findings', async () => {
      const repositoryUrl = 'https://github.com/test/repo';
      const analysisResult: AnalysisResult = {
        repository: { url: repositoryUrl, name: 'repo' },
        status: 'complete',
        metrics: {
          totalFindings: 5,
          severity: { critical: 2, high: 1, medium: 1, low: 1 }
        },
        findings: {}
      };

      // Mock no existing schedule
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });
      
      // Mock schedule creation
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'schedule-1',
          repository_url: repositoryUrl,
          frequency: 'every-6-hours',
          cron_expression: '0 */6 * * *',
          priority: 'critical',
          reason: '2 critical security issues require immediate monitoring',
          can_be_disabled: false,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        error: null
      });

      const schedule = await service.initializeAutomaticSchedule(repositoryUrl, analysisResult);

      expect(schedule.frequency).toBe('every-6-hours');
      expect(schedule.priority).toBe('critical');
      expect(schedule.canBeDisabled).toBe(false);
      expect(schedule.reason).toContain('2 critical security issues');
    });

    it('should create daily schedule for active repository without critical issues', async () => {
      const repositoryUrl = 'https://github.com/test/repo';
      const analysisResult: AnalysisResult = {
        repository: { url: repositoryUrl, name: 'repo' },
        status: 'complete',
        metrics: {
          totalFindings: 3,
          severity: { critical: 0, high: 1, medium: 1, low: 1 }
        },
        findings: {}
      };

      // Mock no existing schedule
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });
      
      // Mock schedule creation
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'schedule-2',
          repository_url: repositoryUrl,
          frequency: 'daily',
          cron_expression: '0 3 * * *',
          priority: 'high',
          can_be_disabled: true,
          is_active: true
        },
        error: null
      });

      const schedule = await service.initializeAutomaticSchedule(repositoryUrl, analysisResult);

      expect(schedule.frequency).toBe('daily');
      expect(schedule.priority).toBe('high');
      expect(schedule.canBeDisabled).toBe(true);
    });

    it('should return existing schedule if already exists', async () => {
      const repositoryUrl = 'https://github.com/test/repo';
      const analysisResult: AnalysisResult = {
        repository: { url: repositoryUrl, name: 'repo' },
        status: 'complete',
        metrics: {
          totalFindings: 0,
          severity: { critical: 0, high: 0, medium: 0, low: 0 }
        },
        findings: {}
      };

      // Mock existing schedule
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'existing-schedule',
          repository_url: repositoryUrl,
          frequency: 'weekly',
          cron_expression: '0 3 * * 1',
          priority: 'medium',
          can_be_disabled: true,
          is_active: true
        },
        error: null
      });

      const schedule = await service.initializeAutomaticSchedule(repositoryUrl, analysisResult);

      expect(schedule.frequency).toBe('weekly');
      expect(mockSupabase.insert).not.toHaveBeenCalled();
    });
  });

  describe('updateSchedule', () => {
    it('should update schedule and restart cron job', async () => {
      const repositoryUrl = 'https://github.com/test/repo';
      const updates: Partial<ScheduleConfig> = {
        frequency: 'daily',
        cronExpression: '0 2 * * *',
        priority: 'high'
      };

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'schedule-1',
          repository_url: repositoryUrl,
          frequency: 'daily',
          cron_expression: '0 2 * * *',
          priority: 'high',
          is_active: true
        },
        error: null
      });

      const updated = await service.updateSchedule(repositoryUrl, updates);

      expect(updated.frequency).toBe('daily');
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          frequency: 'daily',
          cron_expression: '0 2 * * *',
          priority: 'high'
        })
      );
    });
  });

  describe('pauseSchedule', () => {
    it('should set schedule to inactive', async () => {
      const repositoryUrl = 'https://github.com/test/repo';

      // Mock getting existing schedule
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'schedule-1',
          repository_url: repositoryUrl,
          frequency: 'daily',
          is_active: true
        },
        error: null
      });

      // Mock update
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'schedule-1',
          repository_url: repositoryUrl,
          frequency: 'daily',
          is_active: false
        },
        error: null
      });

      await service.pauseSchedule(repositoryUrl);

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          is_active: false
        })
      );
    });
  });

  describe('calculateOptimalSchedule', () => {
    it('should return every-6-hours for critical findings', () => {
      const analysisResult: AnalysisResult = {
        repository: { url: 'https://github.com/test/repo', name: 'repo' },
        status: 'complete',
        metrics: {
          totalFindings: 5,
          severity: { critical: 1, high: 2, medium: 1, low: 1 }
        },
        findings: {}
      };

      const schedule = (service as any).calculateOptimalSchedule({
        analysisResult,
        repoMetrics: {
          activityMetrics: {
            commitsLastWeek: 10,
            commitsLastMonth: 30,
            activeDevelopers: 2,
            openPullRequests: 1,
            mergeFrequency: 3
          },
          repositoryInfo: { isProductionRepo: false }
        },
        isFirstAnalysis: true
      });

      expect(schedule.frequency).toBe('every-6-hours');
      expect(schedule.priority).toBe('critical');
      expect(schedule.canBeDisabled).toBe(false);
    });

    it('should return daily for production repositories', () => {
      const analysisResult: AnalysisResult = {
        repository: { url: 'https://github.com/test/repo', name: 'repo' },
        status: 'complete',
        metrics: {
          totalFindings: 2,
          severity: { critical: 0, high: 1, medium: 1, low: 0 }
        },
        findings: {}
      };

      const schedule = (service as any).calculateOptimalSchedule({
        analysisResult,
        repoMetrics: {
          activityMetrics: {
            commitsLastWeek: 5,
            commitsLastMonth: 20,
            activeDevelopers: 3,
            openPullRequests: 2,
            mergeFrequency: 2
          },
          repositoryInfo: { isProductionRepo: true }
        },
        isFirstAnalysis: true
      });

      expect(schedule.frequency).toBe('daily');
      expect(schedule.priority).toBe('high');
      expect(schedule.reason).toContain('Production repository');
    });

    it('should return on-demand for inactive repositories', () => {
      const analysisResult: AnalysisResult = {
        repository: { url: 'https://github.com/test/repo', name: 'repo' },
        status: 'complete',
        metrics: {
          totalFindings: 0,
          severity: { critical: 0, high: 0, medium: 0, low: 0 }
        },
        findings: {}
      };

      const schedule = (service as any).calculateOptimalSchedule({
        analysisResult,
        repoMetrics: {
          activityMetrics: {
            commitsLastWeek: 0,
            commitsLastMonth: 0,
            activeDevelopers: 0,
            openPullRequests: 0,
            mergeFrequency: 0
          },
          repositoryInfo: { isProductionRepo: false }
        },
        isFirstAnalysis: true
      });

      expect(schedule.frequency).toBe('on-demand');
      expect(schedule.priority).toBe('minimal');
      expect(schedule.isActive).toBe(false);
    });
  });

  describe('getAllSchedules', () => {
    it('should return all schedules', async () => {
      const mockSchedules = [
        {
          id: 'schedule-1',
          repository_url: 'https://github.com/test/repo1',
          frequency: 'daily',
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          id: 'schedule-2',
          repository_url: 'https://github.com/test/repo2',
          frequency: 'weekly',
          is_active: true,
          created_at: new Date().toISOString()
        }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: mockSchedules,
            error: null
          })
        })
      });

      const schedules = await service.getAllSchedules();

      expect(schedules).toHaveLength(2);
      expect(schedules[0].repositoryUrl).toBe('https://github.com/test/repo1');
      expect(schedules[1].repositoryUrl).toBe('https://github.com/test/repo2');
    });
  });
});
