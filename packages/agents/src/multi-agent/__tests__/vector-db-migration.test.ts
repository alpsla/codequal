import { 
  EnhancedMultiAgentExecutor,
  VectorContextService,
  VectorStorageService
} from '../index';
import { 
  MultiAgentConfig, 
  AnalysisStrategy, 
  AgentPosition,
  RepositoryData 
} from '../types';
import { AgentProvider, AgentRole } from '@codequal/core/config/agent-registry';

/**
 * Integration test for Vector DB-only migration
 * Verifies that DeepWiki components have been successfully removed
 * and Vector DB services are working correctly
 */
describe('Vector DB Migration Integration', () => {
  const mockRepositoryData: RepositoryData = {
    owner: 'test-org',
    repo: 'test-repo',
    prNumber: 123,
    branch: 'main',
    files: [
      {
        path: 'src/index.ts',
        content: 'console.log("Hello World");',
        diff: '+console.log("Hello World");'
      }
    ]
  };

  const mockAgentConfig: MultiAgentConfig = {
    name: 'vector-db-test',
    agents: [
      {
        provider: AgentProvider.CLAUDE,
        role: AgentRole.CODE_QUALITY,
        position: AgentPosition.PRIMARY,
        priority: 1
      }
    ],
    strategy: AnalysisStrategy.PARALLEL,
    fallbackEnabled: false
  };

  // Mock Vector Context Service
  const mockVectorContextService = {
    getRepositoryContext: jest.fn().mockResolvedValue({
      repositoryId: 'test-org/test-repo',
      recentAnalysis: [
        {
          content: 'Previous code quality analysis found complexity issues',
          metadata: {
            repository_id: 'test-org/test-repo',
            content_type: 'finding',
            analysis_type: 'code_quality',
            severity: 'medium',
            importance_score: 0.8,
            created_at: new Date().toISOString()
          },
          similarity_score: 0.9
        }
      ],
      historicalPatterns: [],
      similarIssues: [],
      confidenceScore: 0.85,
      lastUpdated: new Date()
    }),
    getCrossRepositoryPatterns: jest.fn().mockResolvedValue([
      {
        content: 'Similar complexity pattern found in other repositories',
        metadata: {
          repository_id: 'other-org/other-repo',
          content_type: 'pattern',
          analysis_type: 'code_quality',
          importance_score: 0.7,
          created_at: new Date().toISOString()
        },
        similarity_score: 0.75
      }
    ])
  } as unknown as VectorContextService;

  // Mock RAG Service for Vector Storage Service
  const mockRAGService = {
    search: jest.fn().mockResolvedValue([]),
    deleteByRepository: jest.fn().mockResolvedValue(true),
    insertChunks: jest.fn().mockResolvedValue(true)
  };

  beforeEach(() => {
    // Clear all mocks before each test to prevent state interference
    jest.clearAllMocks();
  });

  describe('EnhancedMultiAgentExecutor with Vector DB', () => {
    it('should initialize with VectorContextService (no DeepWiki dependencies)', () => {
      expect(() => {
        new EnhancedMultiAgentExecutor(
          mockAgentConfig,
          mockRepositoryData,
          mockVectorContextService,
          { timeout: 5000 }
        );
      }).not.toThrow();
    });

    it('should execute successfully with Vector DB context', async () => {
      const executor = new EnhancedMultiAgentExecutor(
        mockAgentConfig,
        mockRepositoryData,
        mockVectorContextService,
        { timeout: 10000 }
      );

      const result = await executor.execute();

      expect(result).toBeDefined();
      expect(result.successful).toBeDefined();
      expect(mockVectorContextService.getRepositoryContext).toHaveBeenCalled();
      expect(mockVectorContextService.getCrossRepositoryPatterns).toHaveBeenCalled();
    });

    it('should prepare agent context with Vector DB data', async () => {
      const executor = new EnhancedMultiAgentExecutor(
        mockAgentConfig,
        mockRepositoryData,
        mockVectorContextService,
        { timeout: 5000 }
      );

      // Execute to trigger context preparation
      await executor.execute();

      // Verify Vector DB methods were called with correct parameters
      expect(mockVectorContextService.getRepositoryContext).toHaveBeenCalledWith(
        'test-org/test-repo',
        AgentRole.CODE_QUALITY,
        expect.any(String),
        expect.objectContaining({
          maxResults: 10,
          minSimilarity: 0.7,
          includeHistorical: true
        })
      );

      expect(mockVectorContextService.getCrossRepositoryPatterns).toHaveBeenCalledWith(
        AgentRole.CODE_QUALITY,
        expect.stringContaining('analysis patterns'),
        expect.any(String),
        expect.objectContaining({
          maxResults: 5,
          excludeRepositoryId: 'test-org/test-repo'
        })
      );
    });
  });

  describe('VectorStorageService', () => {
    it('should implement replace strategy for repository analysis', async () => {
      const storageService = new VectorStorageService(mockRAGService);
      
      const analysisResults = [
        {
          type: 'code_quality',
          severity: 'medium' as const,
          findings: [
            {
              type: 'complexity',
              severity: 'high',
              location: 'src/index.ts',
              description: 'High cyclomatic complexity detected',
              suggestion: 'Break down large functions'
            }
          ],
          metrics: { complexity: 15.2 },
          recommendations: ['Refactor complex functions'],
          summary: 'Code quality analysis completed',
          categories: ['complexity', 'maintainability']
        }
      ];

      const result = await storageService.storeAnalysisResults(
        'test-org/test-repo',
        analysisResults,
        'user-123'
      );

      expect(result.stored).toBeGreaterThan(0);
      expect(result.errors).toBe(0);
      expect(mockRAGService.deleteByRepository).toHaveBeenCalledWith('test-org/test-repo', 'user-123');
      expect(mockRAGService.insertChunks).toHaveBeenCalled();
    });

    it('should create proper vector chunks from analysis results', async () => {
      const storageService = new VectorStorageService(mockRAGService);
      
      const analysisResults = [
        {
          type: 'security',
          severity: 'critical' as const,
          findings: [
            {
              type: 'sql_injection',
              severity: 'critical',
              location: 'src/auth.js',
              description: 'SQL injection vulnerability',
              suggestion: 'Use parameterized queries'
            }
          ],
          metrics: { vulnerabilities: 1 },
          recommendations: ['Implement input validation'],
          summary: 'Critical security issue found',
          categories: ['security', 'vulnerability']
        }
      ];

      await storageService.storeAnalysisResults(
        'test-org/test-repo',
        analysisResults,
        'user-123'
      );

      // Verify chunks were created with proper structure
      const insertCall = mockRAGService.insertChunks.mock.calls[0];
      const chunks = insertCall[0];
      
      expect(chunks).toBeInstanceOf(Array);
      expect(chunks.length).toBeGreaterThan(0);
      
      const findingChunk = chunks.find((chunk: any) => chunk.metadata.content_type === 'finding');
      expect(findingChunk).toBeDefined();
      expect(findingChunk.metadata.repository_id).toBe('test-org/test-repo');
      expect(findingChunk.metadata.analysis_type).toBe('security');
      expect(findingChunk.metadata.severity).toBe('critical');
      expect(findingChunk.metadata.finding_type).toBe('sql_injection');
      expect(findingChunk.metadata.importance_score).toBeGreaterThan(0.5);
    });
  });

  describe('Migration Verification', () => {
    it('should not export DeepWiki components', () => {
      // Verify that DeepWiki components are no longer exported
      const { 
        EnhancedMultiAgentExecutor: Executor,
        VectorContextService: VCS,
        VectorStorageService: VSS
      } = require('../index');

      expect(Executor).toBeDefined();
      expect(VCS).toBeDefined();
      expect(VSS).toBeDefined();

      // These should not be exported anymore
      expect(() => {
        require('../deepwiki-data-extractor');
      }).toThrow();
    });

    it('should use Vector DB for all data operations', async () => {
      // Reset mocks
      jest.clearAllMocks();

      const executor = new EnhancedMultiAgentExecutor(
        mockAgentConfig,
        mockRepositoryData,
        mockVectorContextService,
        { timeout: 5000 }
      );

      await executor.execute();

      // Verify only Vector DB methods are called, no DeepWiki methods
      expect(mockVectorContextService.getRepositoryContext).toHaveBeenCalled();
      expect(mockVectorContextService.getCrossRepositoryPatterns).toHaveBeenCalled();
      
      // Verify no DeepWiki-related calls (these would throw if called)
      // This ensures we're not trying to call any removed DeepWiki methods
    });
  });
});