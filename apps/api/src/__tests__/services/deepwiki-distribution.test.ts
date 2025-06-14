import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ResultOrchestrator } from '../../services/result-orchestrator';
import { VectorStorageService } from '@codequal/database';

describe.skip('DeepWiki Report Distribution', () => {
  let orchestrator: ResultOrchestrator;
  let mockVectorStorage: jest.Mocked<VectorStorageService>;
  let mockDeepWikiManager: any;
  let mockAgentFactory: any;

  beforeEach(() => {
    // Mock dependencies
    mockVectorStorage = {
      searchByMetadata: jest.fn(),
      storeChunks: jest.fn(),
    } as any;

    mockDeepWikiManager = {
      checkRepositoryExists: jest.fn(),
      triggerRepositoryAnalysis: jest.fn(),
      waitForAnalysisCompletion: jest.fn(),
    };

    mockAgentFactory = {
      createAgent: jest.fn(),
    };

    // Create orchestrator instance
    orchestrator = new ResultOrchestrator({
      id: 'test-user',
      email: 'test@example.com',
      role: 'user',
      organizationId: 'test-org',
      session: { token: 'test-token', expiresAt: new Date() },
    } as any);

    // Inject mocks
    (orchestrator as any).deepWikiManager = mockDeepWikiManager;
    (orchestrator as any).agentFactory = mockAgentFactory;
    (orchestrator as any).vectorStorageService = mockVectorStorage;
  });

  describe('DeepWiki Section Distribution to Agents', () => {
    it('should distribute correct DeepWiki sections to each agent', async () => {
      // Mock DeepWiki sections in Vector DB
      const mockDeepWikiSections = [
        {
          content: 'Security analysis: Strong authentication...',
          metadata: {
            content_type: 'deepwiki_analysis',
            section: 'security',
            agent_role: 'security',
            is_latest: true,
          },
        },
        {
          content: 'Architecture analysis: Microservices pattern...',
          metadata: {
            content_type: 'deepwiki_analysis',
            section: 'architecture',
            agent_role: 'architecture',
            is_latest: true,
          },
        },
        {
          content: 'Performance analysis: Async processing...',
          metadata: {
            content_type: 'deepwiki_analysis',
            section: 'performance',
            agent_role: 'performance',
            is_latest: true,
          },
        },
        {
          content: 'Code quality analysis: 85% test coverage...',
          metadata: {
            content_type: 'deepwiki_analysis',
            section: 'code_quality',
            agent_role: 'codeQuality',
            is_latest: true,
          },
        },
        {
          content: 'Dependencies analysis: 142 total dependencies...',
          metadata: {
            content_type: 'deepwiki_analysis',
            section: 'dependencies',
            agent_role: 'dependency',
            is_latest: true,
          },
        },
        {
          content: 'Overall repository score: 8.5/10...',
          metadata: {
            content_type: 'deepwiki_analysis',
            section: 'summary',
            agent_role: 'orchestrator',
            is_latest: true,
          },
        },
      ];

      // Mock Vector DB responses for each section
      mockVectorStorage.searchByMetadata.mockImplementation((criteria) => {
        if (criteria.metadata?.section) {
          return Promise.resolve(
            mockDeepWikiSections.filter(
              (s) => s.metadata.section === criteria.metadata.section
            )
          );
        }
        return Promise.resolve(mockDeepWikiSections);
      });

      // Track agent creation calls
      const agentContexts = new Map<string, any>();
      mockAgentFactory.createAgent.mockImplementation((role, config) => {
        agentContexts.set(role, config.context);
        return {
          analyze: jest.fn().mockResolvedValue({
            findings: [],
            confidence: 0.9,
          }),
        };
      });

      // Run analysis
      await orchestrator.coordinateAgents(
        {
          repositoryUrl: 'https://github.com/test/repo',
          prNumber: 123,
          changedFiles: ['src/index.js'],
          primaryLanguage: 'JavaScript',
          repositorySize: 'medium',
          analysisMode: 'comprehensive',
        } as any,
        {} as any,
        {} as any
      );

      // Verify each agent received correct DeepWiki section
      expect(agentContexts.get('security').deepWikiSection).toContain(
        'Security analysis: Strong authentication'
      );
      expect(agentContexts.get('architecture').deepWikiSection).toContain(
        'Architecture analysis: Microservices pattern'
      );
      expect(agentContexts.get('performance').deepWikiSection).toContain(
        'Performance analysis: Async processing'
      );
      expect(agentContexts.get('codeQuality').deepWikiSection).toContain(
        'Code quality analysis: 85% test coverage'
      );
      expect(agentContexts.get('dependency').deepWikiSection).toContain(
        'Dependencies analysis: 142 total dependencies'
      );
    });

    it('should include tool results with DeepWiki sections', async () => {
      // Mock tool results
      const mockToolResults = {
        security: {
          toolResults: [
            { tool: 'npm-audit', findings: 2, severity: 'medium' },
            { tool: 'license-checker', issues: 0 },
          ],
        },
        architecture: {
          toolResults: [
            { tool: 'madge', circularDeps: 0 },
            { tool: 'dependency-cruiser', violations: 3 },
          ],
        },
        dependency: {
          toolResults: [
            { tool: 'npm-outdated', outdated: 8 },
            { tool: 'license-checker', issues: 0 },
          ],
        },
      };

      // Mock agent creation to capture context
      const agentContexts = new Map<string, any>();
      mockAgentFactory.createAgent.mockImplementation((role, config) => {
        agentContexts.set(role, config.context);
        return {
          analyze: jest.fn().mockResolvedValue({ findings: [] }),
        };
      });

      // Run analysis with tool results
      await orchestrator.coordinateAgents(
        {
          repositoryUrl: 'https://github.com/test/repo',
          prNumber: 123,
          changedFiles: ['src/index.js'],
          primaryLanguage: 'JavaScript',
          repositorySize: 'medium',
          analysisMode: 'comprehensive',
        } as any,
        {} as any,
        mockToolResults as any
      );

      // Verify agents received both DeepWiki sections and tool results
      expect(agentContexts.get('security').toolResults).toBeDefined();
      expect(agentContexts.get('security').toolResults).toHaveLength(2);
      expect(agentContexts.get('architecture').toolResults).toHaveLength(2);
      expect(agentContexts.get('dependency').toolResults).toHaveLength(2);
    });
  });

  describe('Orchestrator Summary Integration', () => {
    it('should integrate DeepWiki summary into final processing', async () => {
      // Mock DeepWiki summary
      const mockSummary = {
        content: JSON.stringify({
          overallScore: 8.5,
          keyInsights: [
            'Well-structured repository',
            'Good security practices',
            'Some performance improvements needed',
          ],
          recommendations: [
            'Update dependencies',
            'Add more tests',
            'Implement rate limiting',
          ],
          technicalDebt: 3.2,
        }),
        metadata: {
          content_type: 'deepwiki_analysis',
          section: 'summary',
          agent_role: 'orchestrator',
          is_latest: true,
        },
      };

      mockVectorStorage.searchByMetadata.mockImplementation((criteria) => {
        if (criteria.metadata?.section === 'summary') {
          return Promise.resolve([mockSummary]);
        }
        return Promise.resolve([]);
      });

      // Mock result processor to capture input
      let capturedSummary: any;
      (orchestrator as any).resultProcessor = {
        processAgentResults: jest.fn((results, summary) => {
          capturedSummary = summary;
          return {
            findings: {},
            summary: 'Processed results',
            metrics: {},
          };
        }),
      };

      // Run processing
      const agentResults = {
        security: { findings: [] },
        architecture: { findings: [] },
      };

      await orchestrator.processResults(agentResults as any);

      // Verify summary was passed to result processor
      expect(capturedSummary).toBeDefined();
      expect(capturedSummary.overallScore).toBe(8.5);
      expect(capturedSummary.keyInsights).toHaveLength(3);
      expect(capturedSummary.recommendations).toHaveLength(3);
      expect(capturedSummary.technicalDebt).toBe(3.2);
    });

    it('should handle missing DeepWiki sections gracefully', async () => {
      // Mock empty Vector DB response
      mockVectorStorage.searchByMetadata.mockResolvedValue([]);

      // Mock agent creation
      const agentContexts = new Map<string, any>();
      mockAgentFactory.createAgent.mockImplementation((role, config) => {
        agentContexts.set(role, config.context);
        return {
          analyze: jest.fn().mockResolvedValue({ findings: [] }),
        };
      });

      // Run analysis
      await orchestrator.coordinateAgents(
        {
          repositoryUrl: 'https://github.com/test/repo',
          prNumber: 123,
          changedFiles: ['src/index.js'],
          primaryLanguage: 'JavaScript',
          repositorySize: 'medium',
          analysisMode: 'comprehensive',
        } as any,
        {} as any,
        {} as any
      );

      // Verify agents still receive basic context
      expect(agentContexts.get('security')).toBeDefined();
      expect(agentContexts.get('security').deepWikiSection).toBeUndefined();
      expect(agentContexts.get('security').changedFiles).toBeDefined();
    });
  });

  describe('Performance and Caching', () => {
    it('should reuse DeepWiki data for same repository within freshness window', async () => {
      // Mock fresh DeepWiki data
      mockDeepWikiManager.checkRepositoryExists.mockResolvedValue(true);
      
      const mockFreshData = [
        {
          content: 'Fresh security analysis...',
          metadata: {
            content_type: 'deepwiki_analysis',
            section: 'security',
            created_at: new Date().toISOString(), // Fresh data
            is_latest: true,
          },
        },
      ];

      mockVectorStorage.searchByMetadata.mockResolvedValue(mockFreshData);

      // First analysis
      await orchestrator.analyzePR({
        repositoryUrl: 'https://github.com/test/repo',
        prNumber: 123,
        analysisMode: 'quick',
        authenticatedUser: {} as any,
      });

      // Second analysis (should use cache)
      await orchestrator.analyzePR({
        repositoryUrl: 'https://github.com/test/repo',
        prNumber: 124,
        analysisMode: 'quick',
        authenticatedUser: {} as any,
      });

      // Verify DeepWiki was not triggered again
      expect(mockDeepWikiManager.triggerRepositoryAnalysis).not.toHaveBeenCalled();
    });
  });
});
