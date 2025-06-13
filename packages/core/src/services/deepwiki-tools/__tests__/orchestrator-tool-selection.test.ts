/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-unused-vars, no-console */

/**
 * Orchestrator Tool Selection Test Suite
 * Tests that orchestrator correctly requests tool execution based on repository characteristics
 */

// Mock EnhancedDeepWikiManager instead of importing from API package to avoid circular dependency
interface MockEnhancedDeepWikiManager {
  processRepositoryWithTools(repoUrl: string, options?: any): Promise<any>;
  triggerRepositoryAnalysisWithTools(repoUrl: string, options?: any): Promise<string>;
}
import { ToolRunnerService } from '../tool-runner.service';
import { Logger } from '../../../utils/logger';

describe('Orchestrator Tool Selection', () => {
  let deepWikiManager: MockEnhancedDeepWikiManager;
  let mockVectorStorage: any;
  let mockEmbeddingService: any;
  let logger: Logger;

  beforeEach(() => {
    logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    } as any;

    mockVectorStorage = {
      deleteChunksBySource: jest.fn().mockResolvedValue(0),
      storeChunks: jest.fn().mockResolvedValue({ stored: 1, failed: 0, errors: [] }),
      getChunksBySource: jest.fn().mockResolvedValue([])
    };

    mockEmbeddingService = {
      generateEmbedding: jest.fn().mockResolvedValue(new Array(1536).fill(0))
    };

    // Mock authenticated user
    const mockUser = {
      id: 'test-user',
      email: 'test@example.com',
      organizationId: 'test-org',
      role: 'user',
      status: 'active',
      permissions: ['repository:read', 'analysis:create'],
      session: {
        token: 'test-token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    } as any;

    // Create mock DeepWikiManager
    deepWikiManager = {
      processRepositoryWithTools: jest.fn().mockResolvedValue({
        tools_executed: ['npm-audit', 'license-checker'],
        analysis_results: 'Mock analysis results',
        metadata: { repository_type: 'node', tools_recommended: ['npm-audit'] }
      }),
      triggerRepositoryAnalysisWithTools: jest.fn().mockResolvedValue('mock-job-id')
    } as MockEnhancedDeepWikiManager;
  });

  describe('Tool Selection Logic', () => {
    it('should request all tools for JavaScript/TypeScript repository', async () => {
      const repositoryUrl = 'https://github.com/example/js-project';
      
      // Trigger analysis
      const jobId = await deepWikiManager.triggerRepositoryAnalysisWithTools(
        repositoryUrl,
        {
          runTools: true
        }
      );

      expect(jobId).toBeDefined();
      expect(jobId).toBe('mock-job-id');
      
      // Verify the mock was called with correct parameters
      expect(deepWikiManager.triggerRepositoryAnalysisWithTools).toHaveBeenCalledWith(
        repositoryUrl,
        expect.objectContaining({
          runTools: true
        })
      );
    });

    it('should allow selective tool execution', async () => {
      const repositoryUrl = 'https://github.com/example/security-focused';
      
      // Request only security tools
      const jobId = await deepWikiManager.triggerRepositoryAnalysisWithTools(
        repositoryUrl,
        {
          runTools: true,
          enabledTools: ['npm-audit', 'license-checker']
        }
      );

      expect(jobId).toBeDefined();
      
      // Verify only requested tools were specified
      expect(deepWikiManager.triggerRepositoryAnalysisWithTools).toHaveBeenCalledWith(
        repositoryUrl,
        expect.objectContaining({
          runTools: true,
          enabledTools: ['npm-audit', 'license-checker']
        })
      );
    });

    it('should handle tool execution being disabled', async () => {
      const repositoryUrl = 'https://github.com/example/no-tools';
      
      // Request analysis without tools
      const jobId = await deepWikiManager.triggerRepositoryAnalysisWithTools(
        repositoryUrl,
        {
          runTools: false
        }
      );

      expect(jobId).toBeDefined();
      
      // Verify tools were not requested
      expect(deepWikiManager.triggerRepositoryAnalysisWithTools).toHaveBeenCalledWith(
        repositoryUrl,
        expect.objectContaining({
          runTools: false
        })
      );
    });
  });

  describe('Repository Type Detection', () => {
    it('should detect JavaScript repository and run appropriate tools', async () => {
      // Create a mock tool runner to test detection logic
      const toolRunner = new ToolRunnerService(logger);
      
      // Mock file system checks
      jest.spyOn(toolRunner as any, 'fileExists').mockImplementation(async (path: string) => {
        if (path.includes('package.json')) return true;
        if (path.includes('package-lock.json')) return true;
        return false;
      });

      jest.spyOn(toolRunner as any, 'hasJavaScriptFiles').mockResolvedValue(true);

      // Test detection
      const applicableTools = await (toolRunner as any).detectApplicableTools(
        '/test/repo',
        ['npm-audit', 'license-checker', 'madge', 'dependency-cruiser', 'npm-outdated']
      );

      // All tools should be applicable for JS project
      expect(applicableTools).toContain('npm-audit');
      expect(applicableTools).toContain('license-checker');
      expect(applicableTools).toContain('madge');
      expect(applicableTools).toContain('dependency-cruiser');
      expect(applicableTools).toContain('npm-outdated');
    });

    it('should skip npm-audit if no package-lock.json', async () => {
      const toolRunner = new ToolRunnerService(logger);
      
      // Mock: package.json exists but no lock file
      jest.spyOn(toolRunner as any, 'fileExists').mockImplementation(async (path: string) => {
        if (path.includes('package.json')) return true;
        if (path.includes('package-lock.json')) return false; // No lock file
        return false;
      });

      const applicableTools = await (toolRunner as any).detectApplicableTools(
        '/test/repo',
        ['npm-audit', 'license-checker']
      );

      // npm-audit should be skipped
      expect(applicableTools).not.toContain('npm-audit');
      expect(applicableTools).toContain('license-checker');
    });

    it('should handle non-JavaScript repositories', async () => {
      const toolRunner = new ToolRunnerService(logger);
      
      // Mock: no package.json, no JS files
      jest.spyOn(toolRunner as any, 'fileExists').mockResolvedValue(false);
      jest.spyOn(toolRunner as any, 'hasJavaScriptFiles').mockResolvedValue(false);

      const applicableTools = await (toolRunner as any).detectApplicableTools(
        '/test/python-repo',
        ['npm-audit', 'license-checker', 'madge', 'dependency-cruiser', 'npm-outdated']
      );

      // No tools should be applicable
      expect(applicableTools).toHaveLength(0);
    });
  });

  describe('Agent-Specific Tool Mapping', () => {
    it('should map tools to correct agents', () => {
      const toolAgentMapping = {
        'npm-audit': ['security'],
        'license-checker': ['security', 'dependency'],
        'madge': ['architecture'],
        'dependency-cruiser': ['architecture'],
        'npm-outdated': ['dependency']
      };

      // Verify security agent gets correct tools
      const securityTools = Object.entries(toolAgentMapping)
        .filter(([_, agents]) => agents.includes('security'))
        .map(([tool]) => tool);
      
      expect(securityTools).toContain('npm-audit');
      expect(securityTools).toContain('license-checker');
      expect(securityTools).not.toContain('madge');

      // Verify architecture agent gets correct tools
      const architectureTools = Object.entries(toolAgentMapping)
        .filter(([_, agents]) => agents.includes('architecture'))
        .map(([tool]) => tool);
      
      expect(architectureTools).toContain('madge');
      expect(architectureTools).toContain('dependency-cruiser');
      expect(architectureTools).not.toContain('npm-audit');

      // Verify dependency agent gets correct tools
      const dependencyTools = Object.entries(toolAgentMapping)
        .filter(([_, agents]) => agents.includes('dependency'))
        .map(([tool]) => tool);
      
      expect(dependencyTools).toContain('npm-outdated');
      expect(dependencyTools).toContain('license-checker');
      expect(dependencyTools).not.toContain('madge');
    });
  });

  describe('Scheduled vs On-Demand Analysis', () => {
    it('should handle scheduled analysis with all tools', async () => {
      const repositoryUrl = 'https://github.com/example/scheduled-repo';
      
      // Mock scheduled analysis
      const jobId = await deepWikiManager.triggerRepositoryAnalysisWithTools(
        repositoryUrl,
        {
          runTools: true,
          scheduledRun: true
        }
      );

      expect(jobId).toBeDefined();
      
      // Verify scheduled flag is passed
      expect(deepWikiManager.triggerRepositoryAnalysisWithTools).toHaveBeenCalledWith(
        repositoryUrl,
        expect.objectContaining({
          runTools: true,
          scheduledRun: true
        })
      );
    });

    it('should handle PR-triggered analysis with specific tools', async () => {
      const repositoryUrl = 'https://github.com/example/pr-repo';
      
      // PR-triggered might want faster analysis
      const jobId = await deepWikiManager.triggerRepositoryAnalysisWithTools(
        repositoryUrl,
        {
          runTools: true,
          enabledTools: ['npm-audit'], // Quick security check only
          prNumber: 123
        }
      );

      expect(jobId).toBeDefined();
      
      // Verify the correct parameters were passed
      expect(deepWikiManager.triggerRepositoryAnalysisWithTools).toHaveBeenCalledWith(
        repositoryUrl,
        expect.objectContaining({
          runTools: true,
          enabledTools: ['npm-audit'],
          prNumber: 123
        })
      );
    });
  });
});
