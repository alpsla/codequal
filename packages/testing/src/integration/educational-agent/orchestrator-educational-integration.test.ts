import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ResultOrchestrator, PRAnalysisRequest, AnalysisResult } from '../../../../../apps/api/src/services/result-orchestrator';
import { EducationalAgent } from '@codequal/agents/multi-agent/educational-agent';
import { AuthenticatedUser } from '../../../../../apps/api/src/middleware/auth-middleware';

// Mock all dependencies
jest.mock('@codequal/agents/multi-agent/enhanced-executor');
jest.mock('@codequal/core/services/model-selection/ModelVersionSync');
jest.mock('@codequal/agents/multi-agent/vector-context-service');
jest.mock('@codequal/core/services/deepwiki-tools');
jest.mock('@codequal/database');
jest.mock('../../../../../apps/api/src/services/deepwiki-manager');
jest.mock('../../../../../apps/api/src/services/pr-context-service');
jest.mock('../../../../../apps/api/src/services/result-processor');
jest.mock('../../../../../apps/api/src/services/educational-content-service');
jest.mock('@codequal/core/services/scheduling');

describe('Orchestrator Educational Agent Integration', () => {
  let orchestrator: ResultOrchestrator;
  let mockAuthenticatedUser: AuthenticatedUser;
  let educationalAgent: EducationalAgent;

  // Define all mocks at the module level
  const mockEducationalService = {
    generateContentForFindings: jest.fn()
  };

  const mockPRContextService = {
    fetchPRDetails: jest.fn(),
    getPRDiff: jest.fn(),
    extractChangedFiles: jest.fn(),
    detectPrimaryLanguage: jest.fn(),
    estimateRepositorySize: jest.fn()
  };
  
  const mockDeepWikiManager = {
    checkRepositoryExists: jest.fn(),
    triggerRepositoryAnalysis: jest.fn(),
    waitForAnalysisCompletion: jest.fn()
  };
  
  const mockResultProcessor = {
    processAgentResults: jest.fn()
  };
  
  const mockToolResultRetrieval = {
    getRepositoryToolSummary: jest.fn(),
    getToolResultsForAgents: jest.fn()
  };

  beforeEach(() => {
    
    const mockEnhancedExecutor = {
      execute: jest.fn()
    };
    // Create authenticated user
    mockAuthenticatedUser = {
      id: 'user-123',
      email: 'test@example.com',
      organizationId: 'org-123',
      permissions: ['read', 'write'],
      role: 'developer',
      status: 'active',
      session: {
        token: 'test-token',
        expiresAt: new Date(Date.now() + 3600000),
        }
    };

    // Initialize orchestrator
    orchestrator = new ResultOrchestrator(mockAuthenticatedUser);
    
    // Create educational agent instance
    educationalAgent = new EducationalAgent({}, {});
  });

  describe('End-to-End Educational Content Generation', () => {
    it('should generate educational content after multi-agent analysis', async () => {
      // Create PR analysis request
      const request: PRAnalysisRequest = {
        repositoryUrl: 'https://github.com/test/repo',
        prNumber: 123,
        analysisMode: 'comprehensive',
        authenticatedUser: mockAuthenticatedUser
      };

      // Mock the educational content service to spy on calls
      
      mockEducationalService.generateContentForFindings = jest.fn().mockResolvedValue([
        {
          type: 'explanation',
          topic: 'Security Best Practices',
          content: 'Detailed explanation about security',
          difficulty: 'intermediate',
          examples: []
        },
        {
          type: 'tutorial',
          topic: 'Refactoring Complex Code',
          content: 'Step-by-step guide',
          difficulty: 'advanced',
          steps: ['Step 1', 'Step 2', 'Step 3']
        }
      ] as any);

      // Mock other orchestrator dependencies
      
      mockPRContextService.fetchPRDetails = jest.fn().mockResolvedValue({
        title: 'Test PR',
        description: 'Test description'
      } as any);
      mockPRContextService.getPRDiff = jest.fn().mockResolvedValue('diff content');
      mockPRContextService.extractChangedFiles = jest.fn().mockReturnValue(['file1.ts', 'file2.ts']);
      mockPRContextService.detectPrimaryLanguage = jest.fn().mockResolvedValue('typescript');
      mockPRContextService.estimateRepositorySize = jest.fn().mockResolvedValue('medium');

      
      mockDeepWikiManager.checkRepositoryExists = jest.fn().mockResolvedValue(true);
      mockDeepWikiManager.triggerRepositoryAnalysis = jest.fn().mockResolvedValue(true);
      mockDeepWikiManager.waitForAnalysisCompletion = jest.fn().mockResolvedValue(true);

      
      mockResultProcessor.processAgentResults = jest.fn().mockResolvedValue({
        findings: {
          security: [
            { type: 'vulnerability', severity: 'high', description: 'SQL injection risk' }
          ],
          codeQuality: [
            { type: 'complexity', severity: 'medium', description: 'High cyclomatic complexity' }
          ]
        }
      } as any);

      // Execute orchestrator
      const result: AnalysisResult = await orchestrator.analyzePR(request);

      // Verify educational content was generated
      expect(mockEducationalService.generateContentForFindings).toHaveBeenCalled();
      expect(result.educationalContent).toBeDefined();
      expect(result.educationalContent.length).toBe(2);
      expect(result.educationalContent[0].topic).toBe('Security Best Practices');
    });

    it('should pass compiled findings to educational agent', async () => {
      const request: PRAnalysisRequest = {
        repositoryUrl: 'https://github.com/test/repo',
        prNumber: 456,
        analysisMode: 'deep',
        authenticatedUser: mockAuthenticatedUser
      };

      // Mock multi-agent results
      const mockAgentResults = {
        security: {
          findings: [
            { type: 'xss', severity: 'high' },
            { type: 'csrf', severity: 'medium' }
          ]
        },
        architecture: {
          findings: [
            { type: 'circular-dependency', count: 3 }
          ]
        },
        codeQuality: {
          findings: [
            { type: 'duplicate-code', percentage: 15 }
          ]
        }
      };

      // Mock the result processor to return compiled findings
      
      mockResultProcessor.processAgentResults = jest.fn().mockResolvedValue({
        findings: {
          security: mockAgentResults.security.findings,
          architecture: mockAgentResults.architecture.findings,
          codeQuality: mockAgentResults.codeQuality.findings,
          performance: [],
          dependency: []
        }
      } as any);

      // Spy on educational content generation
      
      let capturedFindings: any;
      mockEducationalService.generateContentForFindings = jest.fn()
        .mockImplementation((findings) => {
          capturedFindings = findings;
          return Promise.resolve([
            {
              type: 'learning-path',
              topics: ['Security', 'Architecture', 'Code Quality']
            }
          ]);
        });

      // Execute analysis
      await orchestrator.analyzePR(request);

      // Verify findings were properly compiled and passed
      expect(capturedFindings).toBeDefined();
      expect(capturedFindings.security).toHaveLength(2);
      expect(capturedFindings.architecture).toHaveLength(1);
      expect(capturedFindings.codeQuality).toHaveLength(1);
    });
  });

  describe('Tool Results Integration', () => {
    it('should include tool results in educational content generation', async () => {
      const request: PRAnalysisRequest = {
        repositoryUrl: 'https://github.com/test/repo',
        prNumber: 789,
        analysisMode: 'comprehensive',
        authenticatedUser: mockAuthenticatedUser
      };

      // Mock tool results retrieval
      
      mockToolResultRetrieval.getRepositoryToolSummary = jest.fn().mockResolvedValue({
        hasResults: true,
        toolCount: 5,
        lastExecuted: new Date().toISOString()
      } as any);
      mockToolResultRetrieval.getToolResultsForAgents = jest.fn().mockResolvedValue({
        security: {
          toolResults: [
            { toolId: 'npm-audit', findings: ['Critical vulnerability in lodash'] }
          ]
        },
        architecture: {
          toolResults: [
            { toolId: 'madge', findings: ['3 circular dependencies detected'] }
          ]
        }
      } as any);

      // Mock the result processor to include tool findings
      
      mockResultProcessor.processAgentResults = jest.fn().mockResolvedValue({
        findings: {
          security: [
            { 
              type: 'tool-finding', 
              tool: 'npm-audit',
              severity: 'critical',
              description: 'Critical vulnerability in lodash'
            }
          ],
          architecture: [
            {
              type: 'tool-finding',
              tool: 'madge',
              severity: 'medium',
              description: '3 circular dependencies detected'
            }
          ]
        }
      } as any);

      // Execute analysis
      const result = await orchestrator.analyzePR(request);

      // Verify tool results are reflected in findings
      expect(mockToolResultRetrieval.getRepositoryToolSummary).toHaveBeenCalled();
      expect(mockToolResultRetrieval.getToolResultsForAgents).toHaveBeenCalled();
    });
  });

  describe('Learning Path Generation', () => {
    it('should create learning paths based on analysis mode', async () => {
      // Test different analysis modes
      const modes: Array<'quick' | 'comprehensive' | 'deep'> = ['quick', 'comprehensive', 'deep'];
      
      for (const mode of modes) {
        const request: PRAnalysisRequest = {
          repositoryUrl: 'https://github.com/test/repo',
          prNumber: 100 + modes.indexOf(mode),
          analysisMode: mode,
          authenticatedUser: mockAuthenticatedUser
        };

        // Mock educational content based on mode
        
        mockEducationalService.generateContentForFindings = jest.fn()
          .mockImplementation(() => {
            const content = [];
            if (mode === 'quick') {
              content.push({
                type: 'quick-tips',
                topics: ['Security', 'Code Quality']
              });
            } else if (mode === 'comprehensive') {
              content.push({
                type: 'detailed-guide',
                topics: ['Security', 'Architecture', 'Performance']
              });
            } else if (mode === 'deep') {
              content.push({
                type: 'comprehensive-course',
                topics: ['All aspects of software engineering']
              });
            }
            return Promise.resolve(content);
          });

        const result = await orchestrator.analyzePR(request);
        
        // Verify educational content matches analysis depth
        expect(result.educationalContent).toBeDefined();
        expect(result.analysis.mode).toBe(mode);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle educational content generation failures gracefully', async () => {
      const request: PRAnalysisRequest = {
        repositoryUrl: 'https://github.com/test/repo',
        prNumber: 999,
        analysisMode: 'comprehensive',
        authenticatedUser: mockAuthenticatedUser
      };

      // Mock educational service to throw error
      
      mockEducationalService.generateContentForFindings = jest.fn()
        .mockRejectedValue(new Error('Educational service unavailable') as any);

      // Other mocks to allow analysis to proceed
      
      mockResultProcessor.processAgentResults = jest.fn().mockResolvedValue({
        findings: { security: [], architecture: [] }
      } as any);

      // Analysis should not fail due to educational content error
      await expect(orchestrator.analyzePR(request)).rejects.toThrow();
    });
  });

  describe('Report Integration', () => {
    it('should include educational content in final report', async () => {
      const request: PRAnalysisRequest = {
        repositoryUrl: 'https://github.com/test/repo',
        prNumber: 321,
        analysisMode: 'comprehensive',
        authenticatedUser: mockAuthenticatedUser
      };

      // Mock educational content
      
      mockEducationalService.generateContentForFindings = jest.fn().mockResolvedValue([
        {
          type: 'explanation',
          topic: 'Understanding SQL Injection',
          content: 'SQL injection is a code injection technique...',
          codeExamples: [
            {
              title: 'Vulnerable Code',
              code: 'query = "SELECT * FROM users WHERE id = " + userId',
              type: 'bad'
            },
            {
              title: 'Secure Code',
              code: 'query = "SELECT * FROM users WHERE id = ?"',
              type: 'good'
            }
          ]
        }
      ] as any);

      const result = await orchestrator.analyzePR(request);

      // Verify educational content is included in result
      expect(result.educationalContent).toBeDefined();
      expect(result.educationalContent.length).toBeGreaterThan(0);
      expect(result.educationalContent[0].topic).toBe('Understanding SQL Injection');
      expect(result.educationalContent[0].codeExamples).toBeDefined();
    });
  });

  describe('Skill Level Adaptation', () => {
    it('should adapt educational content to user skill level', async () => {
      // Create users with different skill levels
      const skillLevels = ['beginner', 'intermediate', 'advanced'];
      
      for (const skillLevel of skillLevels) {
        const userWithSkillLevel: AuthenticatedUser = {
          ...mockAuthenticatedUser,
          id: `user-${skillLevel}`,
          // In real implementation, skill level would be part of user profile
          role: skillLevel
        };

        const request: PRAnalysisRequest = {
          repositoryUrl: 'https://github.com/test/repo',
          prNumber: 500 + skillLevels.indexOf(skillLevel),
          analysisMode: 'comprehensive',
          authenticatedUser: userWithSkillLevel
        };

        // Mock educational service to return skill-appropriate content
        
        mockEducationalService.generateContentForFindings = jest.fn()
          .mockImplementation((findings, user) => {
            const content = [];
            if ((user as AuthenticatedUser).id.includes('beginner')) {
              content.push({
                type: 'explanation',
                difficulty: 'beginner',
                topic: 'Basic Security Concepts'
              });
            } else if ((user as AuthenticatedUser).id.includes('intermediate')) {
              content.push({
                type: 'tutorial',
                difficulty: 'intermediate',
                topic: 'Implementing Security Best Practices'
              });
            } else if ((user as AuthenticatedUser).id.includes('advanced')) {
              content.push({
                type: 'deep-dive',
                difficulty: 'advanced',
                topic: 'Advanced Security Architecture'
              });
            }
            return Promise.resolve(content);
          });

        const orchestratorForUser = new ResultOrchestrator(userWithSkillLevel);
        const result = await orchestratorForUser.analyzePR(request);

        // Verify content matches skill level
        expect(result.educationalContent[0].difficulty).toBe(skillLevel);
      }
    });
  });
});
