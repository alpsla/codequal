// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { describe, it, expect, beforeEach, afterEach } = globalThis;
import request from 'supertest';
import { ResultOrchestrator } from '../../../../apps/api/src/services/result-orchestrator';
import { createClient } from '@supabase/supabase-js';

// Mock all dependencies
jest.mock('@supabase/supabase-js');
jest.mock('../../../../apps/api/src/services/deepwiki-manager');
jest.mock('../../../../apps/api/src/services/pr-context-service');
jest.mock('../../../../apps/api/src/services/result-processor');
jest.mock('../../../../apps/api/src/services/educational-content-service');
jest.mock('@codequal/agents/multi-agent/enhanced-executor');
jest.mock('@codequal/core/services/model-selection/ModelVersionSync');
jest.mock('@codequal/agents/multi-agent/vector-context-service');
jest.mock('@codequal/core/services/deepwiki-tools');
jest.mock('@codequal/database');
jest.mock('@codequal/core/utils');
jest.mock('@codequal/core/services/scheduling');
jest.mock('@codequal/agents/multi-agent/educational-agent');
jest.mock('@codequal/agents/multi-agent/reporter-agent');
jest.mock('@codequal/agents/services/recommendation-service');
jest.mock('@codequal/agents/services/educational-compilation-service');

describe('End-to-End: PR Analysis to Report Storage', () => {
  let orchestrator: ResultOrchestrator;
  let mockSupabase: any;
  let mockAuthenticatedUser: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup authenticated user
    mockAuthenticatedUser = {
      id: 'user-123',
      email: 'test@example.com',
      organizationId: 'org-456',
      permissions: ['read', 'write'],
      role: 'developer',
      status: 'active',
      session: {
        token: 'valid-token',
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      }
    };
    
    // Mock Supabase
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ error: null }),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: {}, error: null }),
      rpc: jest.fn().mockResolvedValue({ data: {}, error: null })
    };
    
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  describe('Complete PR Analysis Flow', () => {
    it('should analyze a PR and store the standardized report in Supabase', async () => {
      // Arrange
      const prAnalysisRequest = {
        repositoryUrl: 'https://github.com/test/repo',
        prNumber: 123,
        analysisMode: 'comprehensive' as const,
        authenticatedUser: mockAuthenticatedUser
      };
      
      // Mock PR Context
      const mockPRContext = {
        repositoryUrl: prAnalysisRequest.repositoryUrl,
        prNumber: prAnalysisRequest.prNumber,
        prDetails: { title: 'Test PR', description: 'Test description' },
        diff: 'mock diff content',
        changedFiles: ['src/index.ts', 'src/utils.ts'],
        primaryLanguage: 'TypeScript',
        repositorySize: 'medium' as const,
        analysisMode: 'comprehensive'
      };
      
      // Mock agent analysis results
      const mockAgentResults = {
        agentResults: {
          security: {
            findings: [
              { 
                title: 'Potential SQL injection', 
                severity: 'high',
                file: 'src/database.ts',
                recommendation: 'Use parameterized queries'
              }
            ],
            modelVersion: 'gpt-4'
          },
          codeQuality: {
            findings: [
              {
                title: 'Complex function',
                severity: 'medium',
                file: 'src/utils.ts',
                recommendation: 'Refactor for clarity'
              }
            ],
            modelVersion: 'claude-3'
          }
        }
      };
      
      // Mock processed results
      const mockProcessedResults = {
        findings: {
          security: mockAgentResults.agentResults.security.findings,
          codeQuality: mockAgentResults.agentResults.codeQuality.findings
        },
        criticalIssues: []
      };
      
      // Mock recommendation module
      const mockRecommendationModule = {
        summary: {
          totalRecommendations: 2,
          focusAreas: ['Security', 'Code Quality'],
          description: 'Focus on security and code quality improvements'
        },
        recommendations: [
          {
            id: 'rec-1',
            title: 'Fix SQL injection vulnerability',
            description: 'Use parameterized queries',
            priority: { level: 'high', score: 8 },
            category: 'security'
          },
          {
            id: 'rec-2',
            title: 'Refactor complex function',
            description: 'Break down into smaller functions',
            priority: { level: 'medium', score: 5 },
            category: 'codeQuality'
          }
        ]
      };
      
      // Mock educational result
      const mockEducationalResult = {
        learningPath: {
          steps: ['SQL Injection Prevention', 'Clean Code Principles'],
          difficulty: 'intermediate',
          estimatedTime: '1 week',
          description: 'Security and code quality learning path'
        },
        skillGaps: ['Security Best Practices', 'Refactoring'],
        bestPractices: [
          { practice: 'Always use parameterized queries' },
          { practice: 'Keep functions under 20 lines' }
        ],
        relatedTopics: ['OWASP Top 10', 'SOLID Principles'],
        additionalResources: []
      };
      
      // Mock compiled educational data
      const mockCompiledEducationalData = {
        educational: {
          learningPath: {
            totalSteps: 2,
            steps: mockEducationalResult.learningPath.steps,
            difficulty: 'intermediate',
            estimatedTime: '1 week',
            description: 'Security and code quality focused'
          },
          content: {
            explanations: [],
            tutorials: [],
            bestPractices: mockEducationalResult.bestPractices,
            resources: []
          },
          insights: {
            skillGaps: mockEducationalResult.skillGaps,
            relatedTopics: mockEducationalResult.relatedTopics,
            nextSteps: []
          }
        },
        recommendationMapping: {},
        metadata: { compiledAt: new Date() }
      };
      
      // Mock standardized report
      const mockStandardReport = {
        id: 'report-123',
        repositoryUrl: prAnalysisRequest.repositoryUrl,
        prNumber: prAnalysisRequest.prNumber,
        timestamp: new Date(),
        overview: {
          executiveSummary: 'Analysis found 2 issues requiring attention',
          analysisScore: 75,
          riskLevel: 'medium' as const,
          totalFindings: 2,
          totalRecommendations: 2,
          learningPathAvailable: true,
          estimatedRemediationTime: '1 week'
        },
        modules: {
          findings: {
            summary: '2 findings across security and code quality',
            categories: {
              security: { name: 'Security', icon: '🔒', count: 1, findings: [], summary: '1 high severity' },
              architecture: { name: 'Architecture', icon: '🏗️', count: 0, findings: [], summary: '' },
              performance: { name: 'Performance', icon: '⚡', count: 0, findings: [], summary: '' },
              codeQuality: { name: 'Code Quality', icon: '✨', count: 1, findings: [], summary: '1 medium severity' },
              dependencies: { name: 'Dependencies', icon: '📦', count: 0, findings: [], summary: '' }
            },
            criticalFindings: [],
            totalCount: 2
          },
          recommendations: {
            summary: 'Focus on security and code quality improvements',
            totalRecommendations: 2,
            categories: [],
            priorityMatrix: { critical: [], high: [], medium: [], low: [] },
            implementationPlan: { phases: [], totalEstimatedTime: '1 week', teamSizeRecommendation: 1 }
          },
          educational: {
            summary: 'Learning path available',
            learningPath: {
              id: 'path-1',
              title: 'Security & Quality Path',
              description: 'Security and code quality focused',
              difficulty: 'intermediate',
              estimatedTime: '1 week',
              steps: []
            },
            content: { explanations: [], tutorials: [], bestPractices: [], resources: [] },
            skillGaps: [],
            certifications: []
          },
          metrics: {
            summary: 'Overall score: 75/100',
            scores: {
              overall: { name: 'Overall', score: 75, rating: 'C', description: '', factors: [] },
              security: { name: 'Security', score: 60, rating: 'D', description: '', factors: [] },
              maintainability: { name: 'Maintainability', score: 70, rating: 'C', description: '', factors: [] },
              performance: { name: 'Performance', score: 85, rating: 'B', description: '', factors: [] },
              reliability: { name: 'Reliability', score: 80, rating: 'B', description: '', factors: [] }
            },
            trends: [],
            benchmarks: [],
            improvements: []
          },
          insights: {
            summary: 'Key insights from analysis',
            keyInsights: [],
            patterns: [],
            predictions: [],
            contextualAdvice: []
          }
        },
        visualizations: {
          severityDistribution: { type: 'pie' as const, title: 'Severity', data: {} },
          categoryBreakdown: { type: 'bar' as const, title: 'Categories', data: {} },
          learningPathProgress: { type: 'radar' as const, title: 'Skills', data: {} }
        },
        exports: {
          prComment: '## CodeQual Analysis\n2 issues found',
          emailFormat: 'Email format...',
          slackFormat: 'Slack format...',
          markdownReport: '# Full Report',
          jsonReport: '{}'
        },
        metadata: {
          analysisMode: 'comprehensive',
          agentsUsed: ['security', 'codeQuality'],
          toolsExecuted: [],
          processingTime: 5000,
          modelVersions: { security: 'gpt-4', codeQuality: 'claude-3' },
          reportVersion: '1.0.0'
        }
      };
      
      // Setup mocks
      const mockPRContextService = require('../../../../apps/api/src/services/pr-context-service').PRContextService;
      mockPRContextService.prototype.fetchPRDetails = jest.fn().mockResolvedValue(mockPRContext.prDetails);
      mockPRContextService.prototype.getPRDiff = jest.fn().mockResolvedValue(mockPRContext.diff);
      mockPRContextService.prototype.extractChangedFiles = jest.fn().mockReturnValue(mockPRContext.changedFiles);
      mockPRContextService.prototype.detectPrimaryLanguage = jest.fn().mockResolvedValue(mockPRContext.primaryLanguage);
      mockPRContextService.prototype.estimateRepositorySize = jest.fn().mockResolvedValue(mockPRContext.repositorySize);
      
      const mockDeepWikiManager = require('../../../../apps/api/src/services/deepwiki-manager').DeepWikiManager;
      mockDeepWikiManager.prototype.checkRepositoryExists = jest.fn().mockResolvedValue(true);
      mockDeepWikiManager.prototype.getAnalysisReport = jest.fn().mockResolvedValue({ summary: 'DeepWiki analysis' });
      
      const mockVectorContextService = require('@codequal/agents/multi-agent/vector-context-service').VectorContextService;
      mockVectorContextService.prototype.getRepositoryContext = jest.fn().mockResolvedValue({
        lastUpdated: new Date(Date.now() - 86400000) // 1 day ago
      });
      
      const mockEnhancedExecutor = require('@codequal/agents/multi-agent/enhanced-executor').EnhancedMultiAgentExecutor;
      mockEnhancedExecutor.prototype.execute = jest.fn().mockResolvedValue(mockAgentResults);
      
      const mockResultProcessor = require('../../../../apps/api/src/services/result-processor').ResultProcessor;
      mockResultProcessor.prototype.processAgentResults = jest.fn().mockResolvedValue(mockProcessedResults);
      
      const mockRecommendationService = require('@codequal/agents/services/recommendation-service').RecommendationService;
      mockRecommendationService.prototype.generateRecommendations = jest.fn().mockResolvedValue(mockRecommendationModule);
      
      const mockEducationalAgent = require('@codequal/agents/multi-agent/educational-agent').EducationalAgent;
      mockEducationalAgent.prototype.analyzeFromRecommendations = jest.fn().mockResolvedValue(mockEducationalResult);
      
      const mockEducationalCompilationService = require('@codequal/agents/services/educational-compilation-service').EducationalCompilationService;
      mockEducationalCompilationService.prototype.compileEducationalData = jest.fn().mockResolvedValue(mockCompiledEducationalData);
      
      const mockReporterAgent = require('@codequal/agents/multi-agent/reporter-agent').ReporterAgent;
      mockReporterAgent.prototype.generateStandardReport = jest.fn().mockResolvedValue(mockStandardReport);
      
      const mockSchedulerService = require('@codequal/core/services/scheduling').RepositorySchedulerService;
      mockSchedulerService.getInstance = jest.fn().mockReturnValue({
        getSchedule: jest.fn().mockResolvedValue(null),
        initializeAutomaticSchedule: jest.fn().mockResolvedValue({
          frequency: 'daily',
          reason: 'First analysis'
        })
      });
      
      // Create orchestrator
      orchestrator = new ResultOrchestrator(mockAuthenticatedUser);
      
      // Act
      const result = await orchestrator.analyzePR(prAnalysisRequest);
      
      // Assert - Verify the complete flow
      expect(mockPRContextService.prototype.fetchPRDetails).toHaveBeenCalledWith(
        prAnalysisRequest.repositoryUrl,
        prAnalysisRequest.prNumber,
        undefined
      );
      
      expect(mockDeepWikiManager.prototype.checkRepositoryExists).toHaveBeenCalledWith(
        prAnalysisRequest.repositoryUrl
      );
      
      expect(mockEnhancedExecutor.prototype.execute).toHaveBeenCalled();
      
      expect(mockResultProcessor.prototype.processAgentResults).toHaveBeenCalledWith(mockAgentResults);
      
      expect(mockRecommendationService.prototype.generateRecommendations).toHaveBeenCalledWith(
        mockProcessedResults,
        expect.any(Object) // DeepWiki summary
      );
      
      expect(mockEducationalAgent.prototype.analyzeFromRecommendations).toHaveBeenCalledWith(
        mockRecommendationModule
      );
      
      expect(mockEducationalCompilationService.prototype.compileEducationalData).toHaveBeenCalledWith(
        mockEducationalResult,
        mockRecommendationModule,
        mockProcessedResults
      );
      
      expect(mockReporterAgent.prototype.generateStandardReport).toHaveBeenCalledWith(
        expect.objectContaining({
          findings: mockProcessedResults.findings,
          metrics: expect.any(Object)
        }),
        mockCompiledEducationalData,
        mockRecommendationModule,
        expect.objectContaining({
          type: 'full-report',
          includeEducational: true,
          educationalDepth: 'detailed'
        })
      );
      
      // Verify Supabase storage was called
      expect(mockSupabase.from).toHaveBeenCalledWith('analysis_reports');
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'report-123',
          repository_url: prAnalysisRequest.repositoryUrl,
          pr_number: prAnalysisRequest.prNumber,
          user_id: mockAuthenticatedUser.id,
          organization_id: mockAuthenticatedUser.organizationId,
          report_data: mockStandardReport,
          overview: mockStandardReport.overview,
          metadata: mockStandardReport.metadata,
          analysis_mode: 'comprehensive',
          total_findings: 2,
          risk_level: 'medium',
          analysis_score: 75
        })
      );
      
      // Verify the result structure
      expect(result).toMatchObject({
        analysisId: expect.stringMatching(/^analysis_\d+_[a-z0-9]+$/),
        status: 'complete',
        repository: {
          url: prAnalysisRequest.repositoryUrl,
          name: 'repo',
          primaryLanguage: 'TypeScript'
        },
        pr: {
          number: 123,
          title: 'Test PR',
          changedFiles: 2
        },
        analysis: {
          mode: 'comprehensive',
          agentsUsed: ['security', 'codeQuality'],
          totalFindings: 2,
          processingTime: expect.any(Number)
        },
        findings: mockProcessedResults.findings,
        recommendations: mockRecommendationModule,
        educationalContent: mockStandardReport.modules.educational,
        compiledEducationalData: mockCompiledEducationalData,
        metrics: {
          totalFindings: 2,
          severity: { critical: 0, high: 1, medium: 1, low: 0 },
          confidence: expect.any(Number),
          coverage: 85
        },
        report: {
          summary: mockStandardReport.overview.executiveSummary,
          recommendations: expect.any(Array),
          prComment: mockStandardReport.exports.prComment,
          fullReport: mockStandardReport
        },
        standardReportId: 'report-123',
        metadata: {
          timestamp: expect.any(Date),
          modelVersions: { security: 'gpt-4', codeQuality: 'claude-3' },
          processingSteps: expect.arrayContaining([
            'Extracting PR context',
            'Checking repository status',
            'Selecting optimal models',
            'Retrieving tool analysis results',
            'Coordinating multi-agent analysis',
            'Processing agent results',
            'Generating recommendation module',
            'Generating educational content from recommendations',
            'Compiling educational data',
            'Generating standardized report',
            'Storing report in database',
            'Creating automatic analysis schedule'
          ])
        }
      });
      
      // Verify automatic scheduling was initialized
      expect(mockSchedulerService.getInstance).toHaveBeenCalled();
      const scheduler = mockSchedulerService.getInstance();
      expect(scheduler.getSchedule).toHaveBeenCalledWith(prAnalysisRequest.repositoryUrl);
      expect(scheduler.initializeAutomaticSchedule).toHaveBeenCalledWith(
        prAnalysisRequest.repositoryUrl,
        expect.objectContaining({
          metrics: expect.objectContaining({
            severity: { critical: 0, high: 1, medium: 1, low: 0 }
          })
        })
      );
    });
    
    it('should handle Supabase storage failures gracefully', async () => {
      // Arrange
      mockSupabase.insert.mockResolvedValue({ 
        error: { message: 'Database connection failed' } 
      });
      
      const prAnalysisRequest = {
        repositoryUrl: 'https://github.com/test/repo',
        prNumber: 456,
        analysisMode: 'quick' as const,
        authenticatedUser: mockAuthenticatedUser
      };
      
      // Setup minimal mocks for quick analysis
      const mockPRContextService = require('../../../../apps/api/src/services/pr-context-service').PRContextService;
      mockPRContextService.prototype.fetchPRDetails = jest.fn().mockResolvedValue({ title: 'Quick PR' });
      mockPRContextService.prototype.getPRDiff = jest.fn().mockResolvedValue('diff');
      mockPRContextService.prototype.extractChangedFiles = jest.fn().mockReturnValue(['file.js']);
      mockPRContextService.prototype.detectPrimaryLanguage = jest.fn().mockResolvedValue('JavaScript');
      mockPRContextService.prototype.estimateRepositorySize = jest.fn().mockResolvedValue('small');
      
      const mockDeepWikiManager = require('../../../../apps/api/src/services/deepwiki-manager').DeepWikiManager;
      mockDeepWikiManager.prototype.checkRepositoryExists = jest.fn().mockResolvedValue(true);
      
      const mockVectorContextService = require('@codequal/agents/multi-agent/vector-context-service').VectorContextService;
      mockVectorContextService.prototype.getRepositoryContext = jest.fn().mockResolvedValue({ lastUpdated: new Date() });
      
      const mockStandardReport = { id: 'report-456', overview: {}, modules: {}, visualizations: {}, exports: {}, metadata: {} };
      const mockReporterAgent = require('@codequal/agents/multi-agent/reporter-agent').ReporterAgent;
      mockReporterAgent.prototype.generateStandardReport = jest.fn().mockResolvedValue(mockStandardReport);
      
      // Mock other services to return minimal data
      const mockEnhancedExecutor = require('@codequal/agents/multi-agent/enhanced-executor').EnhancedMultiAgentExecutor;
      mockEnhancedExecutor.prototype.execute = jest.fn().mockResolvedValue({ agentResults: {} });
      
      const mockResultProcessor = require('../../../../apps/api/src/services/result-processor').ResultProcessor;
      mockResultProcessor.prototype.processAgentResults = jest.fn().mockResolvedValue({ findings: {} });
      
      const mockRecommendationService = require('@codequal/agents/services/recommendation-service').RecommendationService;
      mockRecommendationService.prototype.generateRecommendations = jest.fn().mockResolvedValue({ summary: {}, recommendations: [] });
      
      const mockEducationalAgent = require('@codequal/agents/multi-agent/educational-agent').EducationalAgent;
      mockEducationalAgent.prototype.analyzeFromRecommendations = jest.fn().mockResolvedValue({ learningPath: { steps: [] } });
      
      const mockEducationalCompilationService = require('@codequal/agents/services/educational-compilation-service').EducationalCompilationService;
      mockEducationalCompilationService.prototype.compileEducationalData = jest.fn().mockResolvedValue({});
      
      const mockSchedulerService = require('@codequal/core/services/scheduling').RepositorySchedulerService;
      mockSchedulerService.getInstance = jest.fn().mockReturnValue({
        getSchedule: jest.fn().mockResolvedValue(null),
        initializeAutomaticSchedule: jest.fn()
      });
      
      orchestrator = new ResultOrchestrator(mockAuthenticatedUser);
      
      // Act
      const result = await orchestrator.analyzePR(prAnalysisRequest);
      
      // Assert - Analysis should complete despite storage failure
      expect(result).toBeDefined();
      expect(result.status).toBe('complete');
      expect(result.standardReportId).toBe('report-456');
      
      // Verify storage was attempted
      expect(mockSupabase.from).toHaveBeenCalledWith('analysis_reports');
      expect(mockSupabase.insert).toHaveBeenCalled();
      
      // Analysis should not throw despite storage error
      expect(result.metadata.processingSteps).toContain('Storing report in database');
    });
  });
  
  describe('Report Retrieval API', () => {
    it('should retrieve a stored report by ID', async () => {
      // Arrange
      const reportId = 'report-123';
      const storedReport = {
        id: reportId,
        report_data: {
          id: reportId,
          repositoryUrl: 'https://github.com/test/repo',
          overview: { analysisScore: 75 }
        },
        created_at: new Date(),
        repository_url: 'https://github.com/test/repo',
        pr_number: 123,
        analysis_score: 75,
        risk_level: 'medium'
      };
      
      mockSupabase.rpc.mockResolvedValue({ 
        data: storedReport, 
        error: null 
      });
      
      // Act - Simulate API endpoint call
      const getReport = async (reportId: string, userId: string) => {
        const { data, error } = await mockSupabase.rpc('get_analysis_report', { 
          report_id: reportId 
        });
        
        if (error || !data) {
          throw new Error('Report not found');
        }
        
        return {
          success: true,
          report: data.report_data,
          metadata: {
            id: data.id,
            createdAt: data.created_at,
            repositoryUrl: data.repository_url,
            prNumber: data.pr_number,
            analysisScore: data.analysis_score,
            riskLevel: data.risk_level
          }
        };
      };
      
      const result = await getReport(reportId, mockAuthenticatedUser.id);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.report).toEqual(storedReport.report_data);
      expect(result.metadata.id).toBe(reportId);
      expect(result.metadata.analysisScore).toBe(75);
      expect(result.metadata.riskLevel).toBe('medium');
      
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_analysis_report', {
        report_id: reportId
      });
    });
  });
});
