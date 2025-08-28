/**
 * Comprehensive Integration Test for Two-Branch Analysis System
 * 
 * This test demonstrates the complete flow and identifies:
 * - ✅ Components that already exist (can be imported)
 * - ❌ Components that need to be implemented
 * - 🔄 Components that need modification
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import * as path from 'path';
import * as fs from 'fs-extra';

// ===================================================================
// EXISTING COMPONENTS (Already Built - Just Need Integration)
// ===================================================================

// ✅ EXISTING: Tool execution framework
import { ParallelToolExecutor } from '../../../../mcp-hybrid/src/integration/parallel-tool-executor';
import { ToolRegistry } from '../../../../mcp-hybrid/src/core/tool-registry';

// ✅ EXISTING: Tool adapters (30+ tools already integrated!)
import { SemgrepMCPAdapter } from '../../../../mcp-hybrid/src/adapters/mcp/semgrep-mcp';
import { ESLintDirectAdapter } from '../../../../mcp-hybrid/src/adapters/direct/eslint-direct';
import { SonarJSDirectAdapter } from '../../../../mcp-hybrid/src/adapters/direct/sonarjs-direct';
import { NPMAuditDirectAdapter } from '../../../../mcp-hybrid/src/adapters/direct/npm-audit-direct';

// ✅ EXISTING: Storage and caching
import { RedisCache } from '../../../../infrastructure/redis/RedisCache';
import { SupabaseClient } from '../../../../infrastructure/supabase/SupabaseClient';
import { VectorDB } from '../../../../mcp-hybrid/src/db/vector-db';

// ✅ EXISTING: GitHub integration
import { GitHubAPI } from '../../../../services/github/GitHubAPI';

// ✅ EXISTING: Agent framework
import { BaseAgent } from '../../../base/BaseAgent';
import { AgentRole } from '../../../types';

// ===================================================================
// NEW COMPONENTS TO BUILD (Need Implementation)
// ===================================================================

// ❌ NEW: Core two-branch analyzer (Day 1-2)
import { TwoBranchAnalyzer } from '../../core/TwoBranchAnalyzer';
import { BranchAnalyzer } from '../../core/BranchAnalyzer';
import { RepositoryManager } from '../../core/RepositoryManager';
import { FileScanner } from '../../core/FileScanner';

// ❌ NEW: Comparison engine (Day 3-4)
import { IssueComparator } from '../../comparators/IssueComparator';
import { FingerprintGenerator } from '../../comparators/FingerprintGenerator';
import { IssueMapper } from '../../comparators/IssueMapper';

// ❌ NEW: Issue extraction (Day 2)
import { IssueExtractor } from '../../extractors/IssueExtractor';
import { ToolResultParser } from '../../extractors/ToolResultParser';

// ❌ NEW: Services (Day 3-4)
import { ToolExecutionService } from '../../services/ToolExecutionService';
import { IssueComparisonService } from '../../services/IssueComparisonService';
import { MetricsService } from '../../services/MetricsService';

// ❌ NEW: Reporters (Day 5)
import { MarkdownReporter } from '../../reporters/MarkdownReporter';
import { JsonReporter } from '../../reporters/JsonReporter';
import { SummaryGenerator } from '../../reporters/SummaryGenerator';

// ❌ NEW: Cache manager (Week 2)
import { CacheManager } from '../../cache/CacheManager';

// ❌ NEW: Types
import { 
  ToolIssue, 
  BranchAnalysisResult, 
  ComparisonResult,
  PRAnalysisReport,
  EnhancedIssue 
} from '../../types';

// ===================================================================
// INTEGRATION TEST - Complete Flow
// ===================================================================

describe('Two-Branch Analysis System - Complete Integration', () => {
  let analyzer: TwoBranchAnalyzer;
  let toolRegistry: ToolRegistry;
  let cacheManager: CacheManager;
  let repoPath: string;
  
  // Test configuration
  const TEST_REPO = 'https://github.com/sindresorhus/ky';
  const TEST_PR = 700; // Simple PR that removes one 'await' keyword
  const REPOS_DIR = '/tmp/codequal-test-repos';

  beforeAll(async () => {
    // Initialize existing components
    toolRegistry = new ToolRegistry();
    
    // Register tools we already have
    await toolRegistry.register(new SemgrepMCPAdapter());
    await toolRegistry.register(new ESLintDirectAdapter());
    await toolRegistry.register(new SonarJSDirectAdapter());
    await toolRegistry.register(new NPMAuditDirectAdapter());
    
    // Initialize cache (existing infrastructure)
    cacheManager = new CacheManager({
      redis: process.env.REDIS_URL,
      memoryLimit: 100 // MB
    });
    
    // Initialize the new analyzer
    analyzer = new TwoBranchAnalyzer({
      toolRegistry,
      cacheManager,
      reposDir: REPOS_DIR
    });
    
    // Clean test directory
    await fs.ensureDir(REPOS_DIR);
  });

  afterAll(async () => {
    // Cleanup
    await fs.remove(REPOS_DIR);
  });

  describe('Phase 1: Repository Management (Day 1)', () => {
    it('should clone repository successfully', async () => {
      const repoManager = new RepositoryManager(REPOS_DIR);
      repoPath = await repoManager.cloneRepository(TEST_REPO);
      
      expect(repoPath).toContain('sindresorhus-ky');
      expect(await fs.pathExists(repoPath)).toBe(true);
      expect(await fs.pathExists(path.join(repoPath, '.git'))).toBe(true);
    });

    it('should checkout main branch', async () => {
      const repoManager = new RepositoryManager(REPOS_DIR);
      await repoManager.checkoutBranch(repoPath, 'main');
      
      const currentBranch = await repoManager.getCurrentBranch(repoPath);
      expect(currentBranch).toBe('main');
    });

    it('should fetch and checkout PR branch', async () => {
      const repoManager = new RepositoryManager(REPOS_DIR);
      await repoManager.fetchPR(repoPath, TEST_PR);
      await repoManager.checkoutBranch(repoPath, `pr-${TEST_PR}`);
      
      const currentBranch = await repoManager.getCurrentBranch(repoPath);
      expect(currentBranch).toBe(`pr-${TEST_PR}`);
    });
  });

  describe('Phase 2: File Scanning (Day 1)', () => {
    it('should scan all repository files', async () => {
      const scanner = new FileScanner();
      const files = await scanner.getAllFiles(repoPath);
      
      expect(files.length).toBeGreaterThan(0);
      expect(files.some(f => f.path === 'package.json')).toBe(true);
      expect(files.some(f => f.extension === '.ts')).toBe(true);
      
      // Check language detection
      const tsFiles = files.filter(f => f.language === 'typescript');
      expect(tsFiles.length).toBeGreaterThan(0);
    });

    it('should respect .gitignore', async () => {
      const scanner = new FileScanner();
      const files = await scanner.getAllFiles(repoPath);
      
      // Should not include node_modules or dist
      expect(files.every(f => !f.path.includes('node_modules'))).toBe(true);
      expect(files.every(f => !f.path.includes('dist/'))).toBe(true);
    });
  });

  describe('Phase 3: Tool Execution (Day 2)', () => {
    it('should execute tools on repository', async () => {
      // This uses EXISTING ParallelToolExecutor!
      const executor = new ParallelToolExecutor();
      const scanner = new FileScanner();
      
      const files = await scanner.getAllFiles(repoPath);
      
      // Create execution plans (existing functionality)
      const plans = executor.createExecutionPlans(files, [
        'semgrep-mcp',
        'eslint-direct',
        'npm-audit-direct'
      ]);
      
      // Execute tools in parallel (existing functionality)
      const results = await executor.executeToolsInParallel(plans);
      
      expect(results).toBeDefined();
      expect(results.size).toBeGreaterThan(0);
    });

    it('should extract issues from tool results', async () => {
      const extractor = new IssueExtractor();
      const toolResults = new Map([
        ['eslint-direct', {
          findings: [
            {
              ruleId: 'no-unused-vars',
              file: 'src/index.ts',
              line: 10,
              severity: 'warning',
              message: 'Unused variable x'
            }
          ]
        }]
      ]);
      
      const issues = extractor.extractIssues(toolResults);
      
      expect(issues.length).toBe(1);
      expect(issues[0].tool).toBe('eslint-direct');
      expect(issues[0].ruleId).toBe('no-unused-vars');
    });
  });

  describe('Phase 4: Branch Analysis (Day 2)', () => {
    it('should analyze main branch', async () => {
      const branchAnalyzer = new BranchAnalyzer({
        toolRegistry,
        executor: new ParallelToolExecutor()
      });
      
      const mainAnalysis = await branchAnalyzer.analyzeRepository(
        repoPath, 
        'main'
      );
      
      expect(mainAnalysis.branch).toBe('main');
      expect(mainAnalysis.issues).toBeDefined();
      expect(mainAnalysis.issues.length).toBeGreaterThanOrEqual(0);
      expect(mainAnalysis.metrics).toBeDefined();
    });

    it('should analyze PR branch', async () => {
      const branchAnalyzer = new BranchAnalyzer({
        toolRegistry,
        executor: new ParallelToolExecutor()
      });
      
      const prAnalysis = await branchAnalyzer.analyzeRepository(
        repoPath, 
        `pr-${TEST_PR}`
      );
      
      expect(prAnalysis.branch).toBe(`pr-${TEST_PR}`);
      expect(prAnalysis.issues).toBeDefined();
    });
  });

  describe('Phase 5: Issue Comparison (Day 3)', () => {
    it('should generate fingerprints for issues', async () => {
      const generator = new FingerprintGenerator();
      
      const issue: ToolIssue = {
        id: '123',
        tool: 'eslint',
        ruleId: 'no-unused-vars',
        file: 'src/index.ts',
        startLine: 10,
        severity: 'warning',
        message: 'Test issue'
      };
      
      const fingerprint = generator.generate(issue);
      
      expect(fingerprint).toBeDefined();
      expect(fingerprint.length).toBe(16); // Shortened hash
    });

    it('should compare issues between branches', async () => {
      const comparator = new IssueComparator();
      
      const baseIssues: ToolIssue[] = [
        {
          id: '1',
          fingerprint: 'abc123',
          tool: 'eslint',
          ruleId: 'no-unused-vars',
          file: 'src/old.ts',
          startLine: 10,
          severity: 'warning',
          message: 'Existing issue'
        }
      ];
      
      const prIssues: ToolIssue[] = [
        {
          id: '2',
          fingerprint: 'def456',
          tool: 'eslint',
          ruleId: 'no-console',
          file: 'src/new.ts',
          startLine: 20,
          severity: 'warning',
          message: 'New issue'
        },
        {
          id: '3',
          fingerprint: 'abc123', // Same as base
          tool: 'eslint',
          ruleId: 'no-unused-vars',
          file: 'src/old.ts',
          startLine: 10,
          severity: 'warning',
          message: 'Existing issue'
        }
      ];
      
      const comparison = comparator.compare(baseIssues, prIssues);
      
      expect(comparison.newIssues.length).toBe(1);
      expect(comparison.fixedIssues.length).toBe(0);
      expect(comparison.unchangedIssues.length).toBe(1);
    });
  });

  describe('Phase 6: Metrics Calculation (Day 3)', () => {
    it('should calculate metrics from comparison', async () => {
      const metricsService = new MetricsService();
      
      const comparison: ComparisonResult = {
        newIssues: [
          { severity: 'high', status: 'new' } as EnhancedIssue,
          { severity: 'medium', status: 'new' } as EnhancedIssue
        ],
        fixedIssues: [
          { severity: 'critical', status: 'fixed' } as EnhancedIssue
        ],
        unchangedIssues: [
          { severity: 'low', status: 'unchanged' } as EnhancedIssue
        ],
        metrics: null
      };
      
      const metrics = metricsService.calculate(comparison);
      
      expect(metrics.total).toBe(4);
      expect(metrics.new).toBe(2);
      expect(metrics.fixed).toBe(1);
      expect(metrics.unchanged).toBe(1);
      expect(metrics.scores.overall).toBeGreaterThan(0);
      expect(metrics.scores.overall).toBeLessThanOrEqual(100);
    });
  });

  describe('Phase 7: Report Generation (Day 5)', () => {
    it('should generate markdown report', async () => {
      const reporter = new MarkdownReporter();
      
      const comparison: ComparisonResult = {
        newIssues: [],
        fixedIssues: [],
        unchangedIssues: [],
        metrics: {
          total: 10,
          new: 2,
          fixed: 5,
          unchanged: 3,
          scores: {
            overall: 85,
            security: 90,
            quality: 80
          }
        }
      };
      
      const markdown = reporter.generate(comparison, {
        repository: TEST_REPO,
        prNumber: TEST_PR,
        title: 'Test PR',
        author: 'testuser'
      });
      
      expect(markdown).toContain('# Pull Request Analysis Report');
      expect(markdown).toContain('Overall Score: 85/100');
      expect(markdown).toContain('New Issues: 2');
    });
  });

  describe('Phase 8: Complete Integration Flow', () => {
    it('should analyze complete PR with all components', async () => {
      // This is the FULL test that brings everything together
      const report = await analyzer.analyzePR(TEST_REPO, TEST_PR);
      
      // Verify report structure
      expect(report).toBeDefined();
      expect(report.repository).toBe(TEST_REPO);
      expect(report.prNumber).toBe(TEST_PR);
      
      // Check issue categorization
      expect(report.newIssues).toBeDefined();
      expect(report.fixedIssues).toBeDefined();
      expect(report.unchangedIssues).toBeDefined();
      
      // Verify metrics
      expect(report.metrics).toBeDefined();
      expect(report.metrics.scores.overall).toBeGreaterThanOrEqual(0);
      expect(report.metrics.scores.overall).toBeLessThanOrEqual(100);
      
      // Check that we have real tool results (not hallucinated)
      const allIssues = [
        ...report.newIssues,
        ...report.fixedIssues,
        ...report.unchangedIssues
      ];
      
      if (allIssues.length > 0) {
        // Every issue should have a real tool source
        expect(allIssues.every(i => i.tool)).toBe(true);
        // Every issue should have a real file path
        expect(allIssues.every(i => i.file)).toBe(true);
        // Every issue should have a line number
        expect(allIssues.every(i => i.startLine >= 0)).toBe(true);
      }
      
      console.log('=== PR ANALYSIS REPORT ===');
      console.log(`Repository: ${report.repository}`);
      console.log(`PR #${report.prNumber}`);
      console.log(`New Issues: ${report.newIssues.length}`);
      console.log(`Fixed Issues: ${report.fixedIssues.length}`);
      console.log(`Unchanged Issues: ${report.unchangedIssues.length}`);
      console.log(`Overall Score: ${report.metrics.scores.overall}/100`);
    });
  });
  
  describe('Phase 9: Caching Verification', () => {
    it('should cache analysis results', async () => {
      // First analysis (should hit tools)
      const start1 = Date.now();
      const report1 = await analyzer.analyzePR(TEST_REPO, TEST_PR);
      const time1 = Date.now() - start1;
      
      // Second analysis (should hit cache)
      const start2 = Date.now();
      const report2 = await analyzer.analyzePR(TEST_REPO, TEST_PR);
      const time2 = Date.now() - start2;
      
      // Cache should be much faster
      expect(time2).toBeLessThan(time1 / 2);
      
      // Results should be identical
      expect(report2.newIssues.length).toBe(report1.newIssues.length);
      expect(report2.metrics.scores.overall).toBe(report1.metrics.scores.overall);
    });
  });
});

// ===================================================================
// IMPLEMENTATION STATUS TRACKER
// ===================================================================

/**
 * EXISTING COMPONENTS (Ready to use):
 * ✅ ParallelToolExecutor - packages/mcp-hybrid/src/integration/parallel-tool-executor.ts
 * ✅ Tool Adapters (30+) - packages/mcp-hybrid/src/adapters/
 * ✅ Redis Cache - packages/agents/src/infrastructure/redis/
 * ✅ Supabase - packages/agents/src/infrastructure/supabase/
 * ✅ GitHub API - packages/agents/src/services/github/
 * ✅ Vector DB - packages/mcp-hybrid/src/db/vector-db.ts
 * ✅ Agent Framework - packages/agents/src/base/
 * 
 * NEW COMPONENTS TO BUILD:
 * 
 * Day 1-2 (Core):
 * ❌ TwoBranchAnalyzer - Main orchestrator
 * ❌ RepositoryManager - Git operations
 * ❌ FileScanner - File discovery
 * ❌ BranchAnalyzer - Single branch analysis
 * 
 * Day 2 (Extraction):
 * ❌ IssueExtractor - Extract issues from tool results
 * ❌ ToolResultParser - Parse different formats
 * 
 * Day 3 (Comparison):
 * ❌ IssueComparator - Compare branch results
 * ❌ FingerprintGenerator - Generate issue fingerprints
 * ❌ IssueMapper - Map issues between branches
 * 
 * Day 4 (Services):
 * ❌ ToolExecutionService - Orchestrate tools
 * ❌ IssueComparisonService - Compare issues
 * ❌ MetricsService - Calculate metrics
 * 
 * Day 5 (Reporting):
 * ❌ MarkdownReporter - Markdown reports
 * ❌ JsonReporter - JSON reports
 * ❌ SummaryGenerator - Executive summaries
 * 
 * Week 2:
 * ❌ CacheManager - Multi-level cache
 * ❌ AIEnhancer - LLM enhancement
 * ❌ FixGenerator - Generate fixes
 */