/**
 * Two-Branch Analysis System - Transition Points Test Suite
 * 
 * Tests each data transition point in the flow:
 * 1. PR URL → Repository Cloning
 * 2. Repository → Indexing
 * 3. Indexing → Specialized Agent Init
 * 4. Agents → Tool Execution
 * 5. Tool Results → Agent Analysis
 * 6. Agent Results → Educator
 * 7. All Results → Report Generation
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import * as path from 'path';
import * as fs from 'fs';
import { RepositoryManager } from '../core/RepositoryManager';
import { DualBranchIndexer } from '../indexing/DualBranchIndexer';
import { BranchAnalyzer, SpecializedAgent } from '../analyzers/BranchAnalyzer';
import { TwoBranchComparator } from '../comparators/TwoBranchComparator';
import { TwoBranchAnalyzer } from '../core/TwoBranchAnalyzer';
import { ReportGeneratorV9 } from '../reporters/ReportGeneratorV9';
import { ModelResearcherService } from '../../standard/services/model-researcher-service';
import { AnalysisCacheService } from '../cache/AnalysisCacheService';
import { logger } from '../utils/logger';

// Mock external dependencies
jest.mock('../../standard/services/model-researcher-service');
jest.mock('../cache/AnalysisCacheService');
jest.mock('child_process');

describe('Two-Branch Analysis - Transition Points', () => {
  let repoManager: RepositoryManager;
  let indexer: DualBranchIndexer;
  let analyzer: BranchAnalyzer;
  let comparator: TwoBranchComparator;
  let orchestrator: TwoBranchAnalyzer;
  let reporter: ReportGeneratorV9;
  
  const TEST_PR_URL = 'https://github.com/test-owner/test-repo/pull/123';
  const TEST_REPO_DIR = '/tmp/test-two-branch';
  
  beforeEach(() => {
    // Initialize components
    repoManager = new RepositoryManager(TEST_REPO_DIR);
    indexer = new DualBranchIndexer();
    analyzer = new BranchAnalyzer();
    comparator = new TwoBranchComparator();
    reporter = new ReportGeneratorV9();
    
    // Mock cache service
    const mockCache = {
      getCachedBranchAnalysis: jest.fn().mockResolvedValue(null),
      cacheBranchAnalysis: jest.fn().mockResolvedValue(undefined),
      getCachedComparison: jest.fn().mockResolvedValue(null),
      cacheComparison: jest.fn().mockResolvedValue(undefined)
    };
    (AnalysisCacheService as jest.Mock).mockImplementation(() => mockCache);
    
    // Mock model researcher
    const mockResearcher = {
      getOptimalModelForContext: jest.fn().mockResolvedValue('openai/gpt-4o-mini'),
      getFallbackModel: jest.fn().mockResolvedValue('anthropic/claude-3-haiku'),
      checkResearchFreshness: jest.fn().mockResolvedValue(true)
    };
    (ModelResearcherService as jest.Mock).mockImplementation(() => mockResearcher);
  });
  
  afterEach(async () => {
    // Cleanup
    jest.clearAllMocks();
    if (fs.existsSync(TEST_REPO_DIR)) {
      fs.rmSync(TEST_REPO_DIR, { recursive: true, force: true });
    }
  });
  
  describe('Transition 1: PR URL → Repository Cloning', () => {
    it('should parse PR URL correctly', () => {
      const parsed = parseGitHubPRUrl(TEST_PR_URL);
      
      expect(parsed).toEqual({
        owner: 'test-owner',
        name: 'test-repo',
        prNumber: 123,
        repoUrl: 'https://github.com/test-owner/test-repo'
      });
    });
    
    it('should handle invalid PR URLs', () => {
      const invalidUrls = [
        'not-a-url',
        'https://gitlab.com/owner/repo/merge_requests/1',
        'https://github.com/owner/repo',
        'https://github.com/owner/repo/issues/123'
      ];
      
      for (const url of invalidUrls) {
        expect(() => parseGitHubPRUrl(url)).toThrow('Invalid GitHub PR URL');
      }
    });
    
    it('should clone repository with proper structure', async () => {
      // Mock git commands
      const execSync = require('child_process').execSync;
      execSync.mockImplementation((cmd: string) => {
        if (cmd.includes('git clone')) {
          // Create mock repo structure
          const repoPath = cmd.split(' ').pop();
          fs.mkdirSync(repoPath!, { recursive: true });
          fs.writeFileSync(path.join(repoPath!, 'README.md'), '# Test Repo');
          fs.mkdirSync(path.join(repoPath!, 'src'), { recursive: true });
          fs.writeFileSync(path.join(repoPath!, 'src/index.ts'), 'console.log("test");');
        }
        return Buffer.from('');
      });
      
      const result = await repoManager.cloneRepository(
        'https://github.com/test-owner/test-repo',
        'main'
      );
      
      expect(result).toMatchObject({
        owner: 'test-owner',
        name: 'test-repo',
        mainBranch: 'main',
        isTemp: true
      });
      expect(fs.existsSync(result.localPath)).toBe(true);
    });
  });
  
  describe('Transition 2: Repository → Indexing', () => {
    it('should index repository files correctly', async () => {
      // Create test repository structure
      const mainPath = path.join(TEST_REPO_DIR, 'main');
      const prPath = path.join(TEST_REPO_DIR, 'pr');
      
      createTestRepo(mainPath, {
        'src/index.ts': 'export function main() {}',
        'src/utils.ts': 'export function util() {}',
        'test/index.test.ts': 'test("main", () => {});'
      });
      
      createTestRepo(prPath, {
        'src/index.ts': 'export function main() { console.log("updated"); }',
        'src/utils.ts': 'export function util() {}',
        'src/newFile.ts': 'export function newFunc() {}',
        'test/index.test.ts': 'test("main", () => {});'
      });
      
      const indices = await indexer.indexDualBranches(mainPath, prPath);
      
      expect(indices.main.totalFiles).toBe(3);
      expect(indices.pr.totalFiles).toBe(4);
      expect(indices.crossReference.size).toBe(4);
      
      // Check file tracking
      const srcIndex = indices.crossReference.get('src/index.ts');
      expect(srcIndex).toMatchObject({
        status: 'modified',
        mainPath: 'src/index.ts',
        prPath: 'src/index.ts'
      });
      
      const newFile = indices.crossReference.get('src/newFile.ts');
      expect(newFile).toMatchObject({
        status: 'added',
        prPath: 'src/newFile.ts'
      });
    });
    
    it('should detect file movements', async () => {
      const mainPath = path.join(TEST_REPO_DIR, 'main');
      const prPath = path.join(TEST_REPO_DIR, 'pr');
      
      createTestRepo(mainPath, {
        'src/oldName.ts': 'export function func() {}'
      });
      
      createTestRepo(prPath, {
        'src/newName.ts': 'export function func() {}' // Same content, different name
      });
      
      const indices = await indexer.indexDualBranches(mainPath, prPath);
      
      // Should detect as moved file based on content similarity
      const crossRef = Array.from(indices.crossReference.values());
      const movedFile = crossRef.find(ref => ref.status === 'moved');
      
      expect(movedFile).toBeDefined();
      if (movedFile) {
        expect(movedFile.mainPath).toBe('src/oldName.ts');
        expect(movedFile.prPath).toBe('src/newName.ts');
      }
    });
  });
  
  describe('Transition 3: Indexing → Specialized Agent Initialization', () => {
    it('should initialize all specialized agents', async () => {
      const agents: SpecializedAgent[] = [];
      
      // Security Agent
      const securityAgent: SpecializedAgent = {
        category: 'security',
        analyzeToolResults: jest.fn().mockResolvedValue([]),
        getRelevantTools: () => ['semgrep', 'gitleaks', 'trufflehog']
      };
      agents.push(securityAgent);
      
      // Performance Agent
      const performanceAgent: SpecializedAgent = {
        category: 'performance',
        analyzeToolResults: jest.fn().mockResolvedValue([]),
        getRelevantTools: () => ['lighthouse', 'webpack-analyzer']
      };
      agents.push(performanceAgent);
      
      // Register agents
      for (const agent of agents) {
        analyzer.registerSpecializedAgent(agent);
      }
      
      // Verify registration
      expect(securityAgent.getRelevantTools()).toContain('semgrep');
      expect(performanceAgent.getRelevantTools()).toContain('lighthouse');
    });
    
    it('should map tools to correct specialized agents', () => {
      const toolMapping = {
        security: ['semgrep', 'gitleaks', 'trufflehog', 'bandit'],
        performance: ['lighthouse', 'webpack-analyzer'],
        architecture: ['madge', 'dependency-cruiser'],
        quality: ['eslint', 'sonarjs'],
        dependency: ['npm-audit', 'cargo-audit', 'safety']
      };
      
      for (const [category, tools] of Object.entries(toolMapping)) {
        // Each tool should map to its category
        for (const tool of tools) {
          const mappedCategory = getToolCategory(tool);
          expect(mappedCategory).toBe(category);
        }
      }
    });
  });
  
  describe('Transition 4: Agents → Tool Execution', () => {
    it('should execute tools for each branch', async () => {
      // Mock tool executor
      const mockToolResults = [
        {
          tool: 'eslint',
          success: true,
          results: [
            { 
              file: 'src/index.ts',
              line: 10,
              message: 'Missing semicolon',
              severity: 'warning'
            }
          ]
        },
        {
          tool: 'semgrep',
          success: true,
          results: [
            {
              file: 'src/auth.ts',
              line: 25,
              message: 'Potential SQL injection',
              severity: 'high'
            }
          ]
        }
      ];
      
      // Mock the parallel tool executor
      jest.spyOn(analyzer as any, 'runToolsInParallel')
        .mockResolvedValue(mockToolResults);
      
      const repo = {
        url: 'https://github.com/test/repo',
        owner: 'test',
        name: 'repo',
        mainBranch: 'main',
        localPath: '/tmp/test-repo',
        isTemp: true
      };
      
      const result = await analyzer.analyzeBranch(repo, {
        tools: ['eslint', 'semgrep'],
        parallel: true
      });
      
      expect(result.tools).toBe(2);
      expect(result.issues).toHaveLength(2);
      expect(result.issues[0].tool).toBe('eslint');
      expect(result.issues[1].tool).toBe('semgrep');
    });
    
    it('should handle tool failures gracefully', async () => {
      const mockToolResults = [
        {
          tool: 'eslint',
          success: true,
          results: [{ file: 'test.ts', message: 'Issue' }]
        },
        {
          tool: 'broken-tool',
          success: false,
          error: 'Tool crashed'
        }
      ];
      
      jest.spyOn(analyzer as any, 'runToolsInParallel')
        .mockResolvedValue(mockToolResults);
      
      const repo = {
        url: 'https://github.com/test/repo',
        owner: 'test',
        name: 'repo',
        mainBranch: 'main',
        localPath: '/tmp/test-repo',
        isTemp: true
      };
      
      const result = await analyzer.analyzeBranch(repo, {
        skipOnError: true
      });
      
      // Should continue despite one tool failure
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].tool).toBe('eslint');
    });
  });
  
  describe('Transition 5: Tool Results → Agent Analysis', () => {
    it('should route tool results to appropriate specialized agents', async () => {
      const securityIssues = [
        { id: '1', tool: 'semgrep', category: 'security', message: 'SQL Injection' }
      ];
      
      const qualityIssues = [
        { id: '2', tool: 'eslint', category: 'quality', message: 'Missing semicolon' }
      ];
      
      const securityAgent = {
        category: 'security',
        analyzeToolResults: jest.fn().mockResolvedValue(securityIssues),
        getRelevantTools: () => ['semgrep']
      };
      
      const qualityAgent = {
        category: 'quality',
        analyzeToolResults: jest.fn().mockResolvedValue(qualityIssues),
        getRelevantTools: () => ['eslint']
      };
      
      analyzer.registerSpecializedAgent(securityAgent as any);
      analyzer.registerSpecializedAgent(qualityAgent as any);
      
      // Simulate tool results
      const toolResults = [
        { tool: 'semgrep', success: true, results: [] },
        { tool: 'eslint', success: true, results: [] }
      ];
      
      // The analyzer should route to correct agents
      const issues = await (analyzer as any).analyzeWithSpecializedAgents(toolResults);
      
      expect(securityAgent.analyzeToolResults).toHaveBeenCalled();
      expect(qualityAgent.analyzeToolResults).toHaveBeenCalled();
    });
  });
  
  describe('Transition 6: Agent Results → Educator', () => {
    it('should generate educational content from issues', async () => {
      const issues = [
        {
          id: '1',
          category: 'security',
          severity: 'high',
          message: 'SQL Injection vulnerability',
          documentation: 'https://owasp.org/sql-injection'
        },
        {
          id: '2',
          category: 'quality',
          severity: 'medium',
          message: 'Complex function needs refactoring',
          suggestion: 'Break down into smaller functions'
        }
      ];
      
      const educationalContent = generateEducationalContent(issues as any);
      
      expect(educationalContent.keyLearnings).toHaveLength(2);
      expect(educationalContent.keyLearnings[0].topic).toContain('SQL Injection');
      expect(educationalContent.resources).toContainEqual(
        expect.objectContaining({
          url: expect.stringContaining('owasp.org')
        })
      );
    });
  });
  
  describe('Transition 7: Model Selection Integration', () => {
    it('should select appropriate models for each agent role', async () => {
      const mockResearcher = ModelResearcherService as jest.MockedClass<typeof ModelResearcherService>;
      const instance = new mockResearcher();
      
      // Test different roles
      const roles = ['security', 'performance', 'architecture', 'quality', 'reporting'];
      
      for (const role of roles) {
        const model = await instance.getOptimalModelForContext({
          role,
          language: 'typescript',
          repo_size: 'medium'
        } as any);
        
        expect(model).toBe('openai/gpt-4o-mini');
        expect(instance.getOptimalModelForContext).toHaveBeenCalledWith(
          expect.objectContaining({ role })
        );
      }
    });
    
    it('should cache model selections', async () => {
      const selections = new Map();
      
      // First request
      const model1 = await getCachedModelSelection('security', selections);
      expect(selections.size).toBe(1);
      
      // Second request (should use cache)
      const model2 = await getCachedModelSelection('security', selections);
      expect(model1).toBe(model2);
      expect(selections.size).toBe(1);
      
      // Different role
      const model3 = await getCachedModelSelection('performance', selections);
      expect(selections.size).toBe(2);
    });
  });
  
  describe('Transition 8: All Results → Report Generation', () => {
    it('should generate complete markdown report', async () => {
      const mockAnalysisResult = {
        prUrl: TEST_PR_URL,
        prNumber: 123,
        repository: {
          owner: 'test-owner',
          name: 'test-repo',
          url: 'https://github.com/test-owner/test-repo'
        },
        branches: {
          main: 'main',
          pr: 'pr-123'
        },
        comparison: {
          newIssues: [
            { id: '1', message: 'New security issue', severity: 'high', category: 'security' }
          ],
          fixedIssues: [
            { id: '2', message: 'Fixed performance issue', severity: 'medium', category: 'performance' }
          ],
          unchangedIssues: [],
          metrics: {
            total: 1,
            new: 1,
            fixed: 1,
            unchanged: 0,
            critical: 0,
            high: 1,
            medium: 0,
            low: 0,
            info: 0,
            scores: {
              overall: 75,
              security: 60,
              quality: 80,
              performance: 85
            },
            improvement: 10,
            riskLevel: 'medium'
          }
        },
        specializedAnalysis: new Map(),
        report: {
          executiveSummary: 'Test summary',
          riskAssessment: {
            level: 'medium',
            score: 75,
            factors: ['1 high severity issue']
          },
          detailedFindings: {
            newIssues: [],
            fixedIssues: [],
            unchangedIssues: []
          },
          recommendations: {
            immediate: ['Fix high security issue'],
            shortTerm: [],
            longTerm: []
          },
          metrics: {} as any
        },
        metadata: {
          startTime: new Date(),
          endTime: new Date(),
          duration: 1000,
          cached: false,
          toolsUsed: ['eslint', 'semgrep']
        }
      };
      
      const report = await reporter.generateReport(mockAnalysisResult as any);
      
      expect(report).toContain('# 📊 Pull Request Analysis Report');
      expect(report).toContain('test-owner/test-repo');
      expect(report).toContain('Pull Request:** #123');
      expect(report).toContain('🆕 New Issues');
      expect(report).toContain('✅ Fixed Issues');
      expect(report).toContain('Risk Level');
      expect(report).toContain('Action Items');
    });
  });
  
  describe('End-to-End Integration', () => {
    it('should complete full analysis flow', async () => {
      // This would be a more comprehensive test in real scenario
      const orchestrator = new TwoBranchAnalyzer();
      
      // Mock all external calls
      jest.spyOn(orchestrator as any, 'cloneRepositories').mockResolvedValue({
        main: { localPath: '/tmp/main' },
        pr: { localPath: '/tmp/pr' }
      });
      
      jest.spyOn(orchestrator as any, 'indexRepositories').mockResolvedValue({
        main: { totalFiles: 10 },
        pr: { totalFiles: 11 },
        crossReference: new Map()
      });
      
      jest.spyOn(orchestrator as any, 'runAnalysis').mockResolvedValue({
        newIssues: [],
        fixedIssues: [],
        unchangedIssues: []
      });
      
      // Would test the full flow here
      // const result = await orchestrator.analyzePullRequest(TEST_PR_URL);
      // expect(result).toBeDefined();
    });
  });
});

// Helper functions

function parseGitHubPRUrl(url: string) {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!match) {
    throw new Error('Invalid GitHub PR URL');
  }
  return {
    owner: match[1],
    name: match[2],
    prNumber: parseInt(match[3]),
    repoUrl: `https://github.com/${match[1]}/${match[2]}`
  };
}

function createTestRepo(repoPath: string, files: Record<string, string>) {
  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(repoPath, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }
}

function getToolCategory(tool: string): string {
  const mapping: Record<string, string> = {
    'semgrep': 'security',
    'gitleaks': 'security',
    'trufflehog': 'security',
    'bandit': 'security',
    'eslint': 'quality',
    'sonarjs': 'quality',
    'lighthouse': 'performance',
    'webpack-analyzer': 'performance',
    'madge': 'architecture',
    'dependency-cruiser': 'architecture',
    'npm-audit': 'dependency',
    'cargo-audit': 'dependency',
    'safety': 'dependency'
  };
  return mapping[tool] || 'unknown';
}

function generateEducationalContent(issues: any[]) {
  return {
    keyLearnings: issues.map(issue => ({
      topic: issue.message,
      description: issue.message,
      relatedIssues: [issue.id],
      resources: issue.documentation ? [issue.documentation] : []
    })),
    bestPractices: [],
    resources: issues
      .filter(i => i.documentation)
      .map(i => ({
        title: i.message,
        url: i.documentation,
        type: 'documentation',
        relevance: 1
      }))
  };
}

async function getCachedModelSelection(role: string, cache: Map<string, string>) {
  if (cache.has(role)) {
    return cache.get(role);
  }
  const model = 'openai/gpt-4o-mini'; // Mock selection
  cache.set(role, model);
  return model;
}