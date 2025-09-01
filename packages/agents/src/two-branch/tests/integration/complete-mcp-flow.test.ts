/**
 * Integration Test for Complete MCP-Based Two-Branch Flow
 * 
 * Tests the entire PR analysis pipeline without DeepWiki
 */

import { MCPBasedOrchestrator } from '../../orchestrators/mcp-based-orchestrator';
import { RepositoryManager } from '../../core/RepositoryManager';
import * as path from 'path';
import * as fs from 'fs';

describe('Complete MCP Two-Branch Flow', () => {
  let orchestrator: MCPBasedOrchestrator;
  let repoManager: RepositoryManager;
  
  // Test configuration
  const TEST_REPO = 'https://github.com/sindresorhus/is-odd';  // Small test repo
  const TEST_PR = 1;  // Use a simple PR number for testing
  
  beforeAll(() => {
    // Initialize orchestrator
    orchestrator = new MCPBasedOrchestrator();
    repoManager = new RepositoryManager();
  });

  afterAll(async () => {
    // Cleanup
    await repoManager.cleanupAll();
  });

  describe('Repository Management', () => {
    it('should successfully clone repository branches', async () => {
      const { main, pr } = await repoManager.cloneForPRAnalysis(
        TEST_REPO,
        TEST_PR,
        'main'
      );

      expect(main.localPath).toBeDefined();
      expect(pr.localPath).toBeDefined();
      expect(fs.existsSync(main.localPath)).toBe(true);
      expect(fs.existsSync(pr.localPath)).toBe(true);
    }, 30000); // 30 second timeout for cloning
  });

  describe('Language Detection', () => {
    it('should detect repository language correctly', async () => {
      const { LanguageDetector } = await import('../../utils/language-detector');
      
      // Create a test directory with known files
      const testDir = path.join(process.cwd(), 'test-lang-detect');
      fs.mkdirSync(testDir, { recursive: true });
      
      // Create test files
      fs.writeFileSync(path.join(testDir, 'index.js'), 'console.log("test");');
      fs.writeFileSync(path.join(testDir, 'package.json'), '{}');
      
      const language = await LanguageDetector.detectLanguage(testDir);
      expect(language).toBe('javascript');
      
      // Cleanup
      fs.rmSync(testDir, { recursive: true, force: true });
    });

    it('should provide language statistics', async () => {
      const { LanguageDetector } = await import('../../utils/language-detector');
      
      // Create test directory with mixed languages
      const testDir = path.join(process.cwd(), 'test-lang-stats');
      fs.mkdirSync(testDir, { recursive: true });
      
      // Create files of different languages
      fs.writeFileSync(path.join(testDir, 'main.js'), 'const x = 1;\nconst y = 2;');
      fs.writeFileSync(path.join(testDir, 'test.py'), 'def hello():\n    pass');
      fs.writeFileSync(path.join(testDir, 'styles.css'), 'body { color: red; }');
      
      const stats = await LanguageDetector.getLanguageStats(testDir);
      
      expect(stats).toBeDefined();
      expect(stats.length).toBeGreaterThan(0);
      expect(stats[0].language).toBeDefined();
      expect(stats[0].fileCount).toBeGreaterThan(0);
      
      // Cleanup
      fs.rmSync(testDir, { recursive: true, force: true });
    });
  });

  describe('MCP Tool Execution', () => {
    it('should run MCP tools and get results', async () => {
      const { MCPOrchestrationService } = await import('../../services/mcp-orchestration-service');
      const mcpService = new MCPOrchestrationService();
      
      // Check tool availability
      const { available, missing } = await mcpService.checkToolAvailability();
      
      expect(available).toBeDefined();
      expect(missing).toBeDefined();
      console.log('Available tools:', available);
      console.log('Missing tools:', missing);
    });

    it('should get language-specific tools', async () => {
      const { MCPOrchestrationService } = await import('../../services/mcp-orchestration-service');
      const mcpService = new MCPOrchestrationService();
      
      const jsTools = mcpService.getToolsForLanguage('javascript');
      expect(jsTools).toContain('semgrep');
      expect(jsTools).toContain('eslint');
      
      const pythonTools = mcpService.getToolsForLanguage('python');
      expect(pythonTools).toContain('semgrep');
      expect(pythonTools).toContain('pylint');
      
      const goTools = mcpService.getToolsForLanguage('go');
      expect(goTools).toContain('semgrep');
      expect(goTools).toContain('gosec');
    });
  });

  describe('Issue Comparison', () => {
    it('should categorize issues correctly', async () => {
      const { IssueComparisonService } = await import('../../services/issue-comparison-service');
      const comparisonService = new IssueComparisonService();
      
      // Mock issues
      const mainIssues = [
        {
          id: '1',
          type: 'security' as const,
          severity: 'high' as const,
          title: 'SQL Injection',
          location: { file: 'api.js', startLine: 10, endLine: 10 }
        },
        {
          id: '2',
          type: 'code-quality' as const,
          severity: 'medium' as const,
          title: 'Unused variable',
          location: { file: 'utils.js', startLine: 5, endLine: 5 }
        }
      ];
      
      const prIssues = [
        {
          id: '2',
          type: 'code-quality' as const,
          severity: 'medium' as const,
          title: 'Unused variable',
          location: { file: 'utils.js', startLine: 5, endLine: 5 }
        },
        {
          id: '3',
          type: 'security' as const,
          severity: 'critical' as const,
          title: 'XSS vulnerability',
          location: { file: 'view.js', startLine: 20, endLine: 20 }
        }
      ];
      
      const gitDiff = {
        changedFiles: ['view.js'],
        additions: 10,
        deletions: 5,
        fileChanges: new Map([
          ['view.js', { 
            additions: 10, 
            deletions: 5,
            changedLines: [{ start: 18, end: 22 }]
          }]
        ])
      };
      
      const result = comparisonService.compareIssues(mainIssues, prIssues, gitDiff);
      
      expect(result.resolvedIssues).toHaveLength(1); // SQL Injection fixed
      expect(result.existingIssues).toHaveLength(1); // Unused variable still there
      expect(result.newIssues.inDiffLines).toHaveLength(1); // XSS in changed lines
      expect(result.summary.recommendation.severity).toBe('block'); // Critical issue blocks
    });
  });

  describe('Complete PR Analysis Flow', () => {
    it('should complete full PR analysis with mock data', async () => {
      // This test uses mock data for speed
      const mockOrchestrator = new MCPBasedOrchestrator();
      
      // Override methods to use mock data
      (mockOrchestrator as any).setupBranches = async () => ({
        mainPath: '/mock/main',
        prPath: '/mock/pr'
      });
      
      (mockOrchestrator as any).detectLanguage = async () => 'javascript';
      
      (mockOrchestrator as any).mcpService = {
        analyzeBranch: async () => ({
          security: [],
          codeQuality: [],
          performance: [],
          all: [],
          metadata: {
            toolsRun: ['semgrep', 'eslint'],
            executionTime: 1000,
            filesAnalyzed: 10,
            language: 'javascript'
          }
        })
      };
      
      (mockOrchestrator as any).gitDiffService = {
        getDiffDetails: async () => ({
          changedFiles: ['test.js'],
          additions: 5,
          deletions: 2,
          fileChanges: new Map()
        }),
        getPRMetadata: async () => ({
          title: 'Test PR',
          author: 'testuser',
          baseRef: 'main',
          headRef: 'feature'
        })
      };
      
      const result = await mockOrchestrator.analyzePullRequest(TEST_REPO, TEST_PR);
      
      expect(result).toBeDefined();
      expect(result.comparison).toBeDefined();
      expect(result.comparison.summary.recommendation.severity).toBeDefined();
    }, 10000);
  });

  describe('Error Handling', () => {
    it('should handle invalid repository URLs gracefully', async () => {
      await expect(
        repoManager.cloneRepository('invalid-url', 'main')
      ).rejects.toThrow();
    });

    it('should handle missing PR gracefully', async () => {
      await expect(
        repoManager.cloneForPRAnalysis(TEST_REPO, 999999, 'main')
      ).rejects.toThrow();
    });
  });
});

// Export for running directly
export default {
  runTests: async () => {
    console.log('Running integration tests...');
    // Jest will handle the test execution
  }
};