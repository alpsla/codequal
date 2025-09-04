#!/usr/bin/env ts-node

/**
 * Agent Lifecycle Test
 * Tests the complete lifecycle of agent selection, tool initialization,
 * issue detection, deduplication, and role-based scoring
 */

import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { execSync } from 'child_process';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });

// Import agents
import { PythonSecurityAgent } from '../agents/PythonSecurityAgent';
import { JavaScriptSecurityAgent } from '../agents/JavaScriptSecurityAgent';
import { GoSecurityAgent } from '../agents/GoSecurityAgent';
import { RustSecurityAgent } from '../agents/RustSecurityAgent';
import { RubySecurityAgent } from '../agents/RubySecurityAgent';
import { JavaSecurityAgent } from '../agents/JavaSecurityAgent';
import { PHPSecurityAgent } from '../agents/PHPSecurityAgent';
import { CppSecurityAgent } from '../agents/CppSecurityAgent';
import { BaseSecurityAgent } from '../agents/BaseSecurityAgent';
import { BaseMultiToolAgent } from '../agents/BaseMultiToolAgent';

interface PRTestCase {
  id: string;
  name: string;
  repository: string;
  prNumber: number;
  language: string;
  description: string;
  files: TestFile[];
  expectedTools: string[];
  minimumIssues: number;
}

interface TestFile {
  path: string;
  content: string;
  vulnerabilities: string[];
}

interface AgentTestResult {
  prId: string;
  language: string;
  agentName: string;
  agentType: 'BaseSecurityAgent' | 'BaseMultiToolAgent';
  model: string;
  fallbackModel?: string;
  toolsExpected: string[];
  toolsInitialized: string[];
  toolsExecuted: string[];
  issuesPerTool: Record<string, number>;
  totalIssuesBeforeDedup: number;
  totalIssuesAfterDedup: number;
  deduplicationRate: number;
  roleScores: RoleScores;
  executionTime: number;
  success: boolean;
  errors: string[];
}

interface RoleScores {
  security: RoleScore;
  performance: RoleScore;
  quality: RoleScore;
  dependencies: RoleScore;
  overall: RoleScore;
}

interface RoleScore {
  baseScore: number;
  deductions: ScoreDeduction[];
  finalScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

interface ScoreDeduction {
  severity: 'critical' | 'high' | 'medium' | 'low';
  count: number;
  deduction: number;
}

interface ToolStatistics {
  tool: string;
  language: string;
  timesExecuted: number;
  totalIssuesFound: number;
  averageIssuesPerRun: number;
  successRate: number;
  recommendation: 'keep' | 'review' | 'remove';
}

export class AgentLifecycleTest {
  private results: AgentTestResult[] = [];
  private toolStats: Map<string, ToolStatistics> = new Map();
  private readonly scoreDeductions = {
    critical: 5,
    high: 3,
    medium: 1,
    low: 0.5
  };

  /**
   * Get test PRs for each supported language
   */
  private getTestPRs(): PRTestCase[] {
    return [
      {
        id: 'python-pr-001',
        name: 'Python Django Security Update',
        repository: 'https://github.com/django/django',
        prNumber: 18001,
        language: 'python',
        description: 'Security fixes for SQL injection and XSS vulnerabilities',
        files: [
          {
            path: 'django/db/models/query.py',
            content: this.getPythonVulnerableCode(),
            vulnerabilities: ['SQL Injection', 'Input Validation']
          },
          {
            path: 'django/template/defaultfilters.py',
            content: this.getPythonVulnerableCode(), // Use same vulnerable code
            vulnerabilities: ['XSS', 'Output Encoding']
          }
        ],
        expectedTools: ['safety', 'bandit', 'mypy', 'ruff', 'pylint'],
        minimumIssues: 5
      },
      {
        id: 'javascript-pr-002',
        name: 'React Security Patches',
        repository: 'https://github.com/facebook/react',
        prNumber: 30001,
        language: 'javascript',
        description: 'Fix prototype pollution and injection vulnerabilities',
        files: [
          {
            path: 'packages/react-dom/src/client/ReactDOMComponent.js',
            content: this.getJavaScriptVulnerableCode(),
            vulnerabilities: ['Prototype Pollution', 'DOM XSS']
          }
        ],
        expectedTools: ['eslint', 'npm-audit', 'semgrep'],
        minimumIssues: 3
      },
      {
        id: 'go-pr-003',
        name: 'Kubernetes Security Hardening',
        repository: 'https://github.com/kubernetes/kubernetes',
        prNumber: 125001,
        language: 'go',
        description: 'Address race conditions and input validation issues',
        files: [
          {
            path: 'pkg/api/validation/validation.go',
            content: this.getGoVulnerableCode(),
            vulnerabilities: ['Race Condition', 'Input Validation', 'Path Traversal']
          }
        ],
        expectedTools: ['gosec', 'staticcheck', 'golangci-lint'],
        minimumIssues: 4
      },
      {
        id: 'rust-pr-004',
        name: 'Rust Memory Safety Improvements',
        repository: 'https://github.com/rust-lang/rust',
        prNumber: 125002,
        language: 'rust',
        description: 'Fix unsafe code blocks and dependency vulnerabilities',
        files: [
          {
            path: 'src/libstd/sys/unix/process.rs',
            content: this.getRustVulnerableCode(),
            vulnerabilities: ['Unsafe Code', 'Memory Leak']
          }
        ],
        expectedTools: ['cargo-audit', 'clippy'],
        minimumIssues: 3
      },
      {
        id: 'ruby-pr-005',
        name: 'Rails Security Update',
        repository: 'https://github.com/rails/rails',
        prNumber: 52001,
        language: 'ruby',
        description: 'Fix CSRF and SQL injection vulnerabilities',
        files: [
          {
            path: 'activerecord/lib/active_record/relation/query_methods.rb',
            content: this.getRubyVulnerableCode(),
            vulnerabilities: ['SQL Injection', 'Mass Assignment']
          }
        ],
        expectedTools: ['brakeman', 'rubocop', 'bundler-audit'],
        minimumIssues: 3
      },
      {
        id: 'java-pr-006',
        name: 'Spring Framework Security Patches',
        repository: 'https://github.com/spring-projects/spring-framework',
        prNumber: 33001,
        language: 'java',
        description: 'Fix deserialization and injection vulnerabilities',
        files: [
          {
            path: 'spring-web/src/main/java/org/springframework/web/bind/annotation/RequestMapping.java',
            content: this.getJavaVulnerableCode(),
            vulnerabilities: ['Deserialization', 'Command Injection']
          }
        ],
        expectedTools: ['spotbugs', 'pmd', 'checkstyle'],
        minimumIssues: 4
      },
      {
        id: 'php-pr-007',
        name: 'Laravel Security Fixes',
        repository: 'https://github.com/laravel/framework',
        prNumber: 52002,
        language: 'php',
        description: 'Fix SQL injection and file upload vulnerabilities',
        files: [
          {
            path: 'src/Illuminate/Database/Query/Builder.php',
            content: this.getPHPVulnerableCode(),
            vulnerabilities: ['SQL Injection', 'File Upload']
          }
        ],
        expectedTools: ['psalm', 'phpstan', 'phpcs'],
        minimumIssues: 3
      },
      {
        id: 'cpp-pr-008',
        name: 'Bitcoin Core Security Updates',
        repository: 'https://github.com/bitcoin/bitcoin',
        prNumber: 30002,
        language: 'cpp',
        description: 'Fix buffer overflow and memory corruption issues',
        files: [
          {
            path: 'src/validation.cpp',
            content: this.getCppVulnerableCode(),
            vulnerabilities: ['Buffer Overflow', 'Integer Overflow']
          }
        ],
        expectedTools: ['cppcheck', 'clang-tidy', 'clang-static-analyzer'],
        minimumIssues: 3
      }
    ];
  }

  /**
   * Main test execution
   */
  async runLifecycleTests(): Promise<void> {
    const testPRs = this.getTestPRs();
    
    console.log('════════════════════════════════════════════════════════════════════');
    console.log('🧪 AGENT LIFECYCLE TEST SUITE');
    console.log('════════════════════════════════════════════════════════════════════');
    console.log(`📋 Testing ${testPRs.length} PRs across ${testPRs.length} languages`);
    console.log(`🎯 Validation Points:`);
    console.log(`   1. Dynamic agent selection`);
    console.log(`   2. Tool initialization from matrix`);
    console.log(`   3. Issue detection per tool`);
    console.log(`   4. Agent-level deduplication`);
    console.log(`   5. Role-based scoring (100 base - deductions)`);
    console.log('════════════════════════════════════════════════════════════════════\n');

    for (const pr of testPRs) {
      await this.testPRLifecycle(pr);
    }

    this.generateSummaryReport();
    this.generateToolStatistics();
    this.saveDetailedResults();
  }

  /**
   * Test complete lifecycle for a single PR
   */
  private async testPRLifecycle(pr: PRTestCase): Promise<void> {
    console.log(`\n📌 Testing PR: ${pr.name}`);
    console.log(`   ID: ${pr.id}`);
    console.log(`   Language: ${pr.language}`);
    console.log(`   Repository: ${pr.repository}`);
    console.log(`   Expected Tools: ${pr.expectedTools.join(', ')}`);
    console.log('   ────────────────────────────────────────────');

    const startTime = Date.now();
    const result: AgentTestResult = {
      prId: pr.id,
      language: pr.language,
      agentName: '',
      agentType: 'BaseSecurityAgent',
      model: '',
      toolsExpected: pr.expectedTools,
      toolsInitialized: [],
      toolsExecuted: [],
      issuesPerTool: {},
      totalIssuesBeforeDedup: 0,
      totalIssuesAfterDedup: 0,
      deduplicationRate: 0,
      roleScores: this.initializeRoleScores(),
      executionTime: 0,
      success: false,
      errors: []
    };

    try {
      // Step 1: Dynamic Agent Selection
      console.log('\n   🔍 Step 1: Agent Selection');
      const agent = this.selectAgent(pr.language);
      result.agentName = agent.constructor.name;
      result.agentType = agent instanceof BaseMultiToolAgent ? 'BaseMultiToolAgent' : 'BaseSecurityAgent';
      result.model = this.detectModel(agent);
      console.log(`      ✓ Selected: ${result.agentName}`);
      console.log(`      ✓ Type: ${result.agentType}`);
      console.log(`      ✓ Model: ${result.model}`);

      // Step 2: Tool Initialization
      console.log('\n   🔧 Step 2: Tool Initialization');
      result.toolsInitialized = await this.getInitializedTools(agent, pr.language);
      const toolStatus = this.validateTools(result.toolsExpected, result.toolsInitialized);
      console.log(`      ✓ Expected: ${result.toolsExpected.length} tools`);
      console.log(`      ✓ Initialized: ${result.toolsInitialized.length} tools`);
      console.log(`      ✓ Coverage: ${toolStatus.coverage}%`);
      
      // Step 3: Create test environment
      const testDir = await this.createTestEnvironment(pr);
      
      // Step 4: Run Analysis
      console.log('\n   🚀 Step 3: Running Analysis');
      const analysisResult = await agent.analyze({
        language: pr.language,
        targetPath: testDir,
        context: { prNumber: pr.prNumber }
      });

      // Step 5: Collect Tool Results
      console.log('\n   📊 Step 4: Tool Results');
      result.toolsExecuted = analysisResult.tools || [];
      result.issuesPerTool = this.countIssuesPerTool(analysisResult.issues);
      result.totalIssuesBeforeDedup = analysisResult.issues?.length || 0;
      
      // Display issues per tool
      Object.entries(result.issuesPerTool).forEach(([tool, count]) => {
        console.log(`      • ${tool}: ${count} issues`);
        this.updateToolStats(tool, pr.language, count);
      });

      // Step 6: Deduplication
      console.log('\n   🔍 Step 5: Deduplication');
      const dedupedIssues = this.deduplicateIssues(analysisResult.issues || []);
      result.totalIssuesAfterDedup = dedupedIssues.length;
      result.deduplicationRate = result.totalIssuesBeforeDedup > 0
        ? ((result.totalIssuesBeforeDedup - result.totalIssuesAfterDedup) / result.totalIssuesBeforeDedup * 100)
        : 0;
      console.log(`      • Before: ${result.totalIssuesBeforeDedup} issues`);
      console.log(`      • After: ${result.totalIssuesAfterDedup} issues`);
      console.log(`      • Deduplication Rate: ${result.deduplicationRate.toFixed(1)}%`);

      // Step 7: Role-based Scoring
      console.log('\n   📈 Step 6: Role-based Scoring');
      result.roleScores = this.calculateRoleScores(dedupedIssues);
      this.displayRoleScores(result.roleScores);

      // Clean up
      await this.cleanupTestEnvironment(testDir);
      
      result.success = true;
      result.executionTime = Date.now() - startTime;
      
      console.log(`\n   ✅ Test completed successfully in ${result.executionTime}ms`);
      
    } catch (error) {
      result.errors.push(error.message);
      console.error(`   ❌ Test failed: ${error.message}`);
    }

    this.results.push(result);
  }

  /**
   * Select appropriate agent based on language
   */
  private selectAgent(language: string): BaseSecurityAgent | BaseMultiToolAgent {
    const agentMap: Record<string, () => BaseSecurityAgent | BaseMultiToolAgent> = {
      'python': () => new PythonSecurityAgent(),
      'javascript': () => new JavaScriptSecurityAgent(),
      'typescript': () => new JavaScriptSecurityAgent(),
      'go': () => new GoSecurityAgent(),
      'rust': () => new RustSecurityAgent(),
      'ruby': () => new RubySecurityAgent(),
      'java': () => new JavaSecurityAgent(),
      'php': () => new PHPSecurityAgent(),
      'cpp': () => new CppSecurityAgent(),
      'c': () => new CppSecurityAgent()
    };

    const agentFactory = agentMap[language.toLowerCase()];
    if (!agentFactory) {
      throw new Error(`No agent available for language: ${language}`);
    }

    return agentFactory();
  }

  /**
   * Detect model configuration for agent
   */
  private detectModel(agent: any): string {
    // This would detect the actual model configuration
    // For now, return mock data
    return 'gpt-4-turbo-preview';
  }

  /**
   * Get initialized tools for an agent
   */
  private async getInitializedTools(agent: any, language: string): Promise<string[]> {
    // Check which tools are actually available for the agent
    if (typeof agent.getAvailableTools === 'function') {
      return await agent.getAvailableTools();
    }
    
    // Fallback: check common tool patterns
    const tools: string[] = [];
    
    // Map of language to expected tools
    const toolMap: Record<string, string[]> = {
      'python': ['safety', 'bandit', 'mypy', 'ruff', 'pylint'],
      'javascript': ['eslint', 'npm-audit', 'semgrep'],
      'go': ['gosec', 'staticcheck', 'golangci-lint'],
      'rust': ['cargo-audit', 'clippy'],
      'ruby': ['brakeman', 'rubocop', 'bundler-audit'],
      'java': ['spotbugs', 'pmd', 'checkstyle'],
      'php': ['psalm', 'phpstan', 'phpcs'],
      'cpp': ['cppcheck', 'clang-tidy', 'clang-static-analyzer']
    };

    const expectedTools = toolMap[language] || [];
    
    // Check which tools are installed
    for (const tool of expectedTools) {
      if (this.isToolInstalled(tool)) {
        tools.push(tool);
      }
    }

    return tools;
  }

  /**
   * Check if a tool is installed
   */
  private isToolInstalled(tool: string): boolean {
    try {
      execSync(`which ${tool}`, { stdio: 'ignore' });
      return true;
    } catch {
      // Some tools might be available differently
      const alternativeChecks: Record<string, string> = {
        'npm-audit': 'npm --version',
        'cargo-audit': 'cargo --version',
        'bundler-audit': 'bundle --version'
      };
      
      if (alternativeChecks[tool]) {
        try {
          execSync(alternativeChecks[tool], { stdio: 'ignore' });
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }
  }

  /**
   * Validate tool coverage
   */
  private validateTools(expected: string[], initialized: string[]): { coverage: number; missing: string[] } {
    const missing = expected.filter(tool => !initialized.includes(tool));
    const coverage = (initialized.length / expected.length) * 100;
    return { coverage, missing };
  }

  /**
   * Count issues per tool
   */
  private countIssuesPerTool(issues: any[]): Record<string, number> {
    const counts: Record<string, number> = {};
    
    if (!issues || issues.length === 0) {
      return counts;
    }

    for (const issue of issues) {
      const tool = issue.tool || 'unknown';
      counts[tool] = (counts[tool] || 0) + 1;
    }

    return counts;
  }

  /**
   * Deduplicate issues
   */
  private deduplicateIssues(issues: any[]): any[] {
    if (!issues || issues.length === 0) {
      return [];
    }

    const seen = new Set<string>();
    const deduplicated: any[] = [];

    for (const issue of issues) {
      // Create unique key based on issue properties
      const key = `${issue.type}-${issue.file}-${issue.line || 0}-${issue.message || issue.title}`.toLowerCase();
      
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(issue);
      }
    }

    return deduplicated;
  }

  /**
   * Calculate role-based scores
   */
  private calculateRoleScores(issues: any[]): RoleScores {
    const roles = ['security', 'performance', 'quality', 'dependencies'];
    const scores: RoleScores = this.initializeRoleScores();

    for (const role of roles) {
      const roleIssues = this.filterIssuesByRole(issues, role);
      scores[role as keyof RoleScores] = this.calculateRoleScore(roleIssues, role);
    }

    // Calculate overall score
    scores.overall = this.calculateOverallScore(scores);

    return scores;
  }

  /**
   * Filter issues by role
   */
  private filterIssuesByRole(issues: any[], role: string): any[] {
    return issues.filter(issue => {
      const type = (issue.type || '').toLowerCase();
      const category = (issue.category || '').toLowerCase();
      
      switch (role) {
        case 'security':
          return type.includes('security') || type.includes('vulnerability') || 
                 category === 'security' || issue.cwe || issue.cve;
        case 'performance':
          return type.includes('performance') || category === 'performance';
        case 'quality':
          return type.includes('quality') || type.includes('smell') || 
                 category === 'quality' || category === 'maintainability';
        case 'dependencies':
          return type.includes('dependency') || category === 'dependencies';
        default:
          return false;
      }
    });
  }

  /**
   * Calculate score for a specific role
   */
  private calculateRoleScore(issues: any[], role: string): RoleScore {
    const baseScore = 100;
    const deductions: ScoreDeduction[] = [];
    let totalDeduction = 0;

    // Count issues by severity
    const severityCounts: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    for (const issue of issues) {
      const severity = this.normalizeSeverity(issue.severity);
      severityCounts[severity]++;
    }

    // Calculate deductions
    for (const [severity, count] of Object.entries(severityCounts)) {
      if (count > 0) {
        const deduction = count * this.scoreDeductions[severity as keyof typeof this.scoreDeductions];
        totalDeduction += deduction;
        deductions.push({
          severity: severity as 'critical' | 'high' | 'medium' | 'low',
          count,
          deduction
        });
      }
    }

    const finalScore = Math.max(0, baseScore - totalDeduction);
    const grade = this.getGrade(finalScore);

    return {
      baseScore,
      deductions,
      finalScore,
      grade
    };
  }

  /**
   * Calculate overall score
   */
  private calculateOverallScore(scores: RoleScores): RoleScore {
    const roleScores = [
      scores.security.finalScore,
      scores.performance.finalScore,
      scores.quality.finalScore,
      scores.dependencies.finalScore
    ];

    const averageScore = roleScores.reduce((a, b) => a + b, 0) / roleScores.length;
    const grade = this.getGrade(averageScore);

    // Aggregate deductions
    const allDeductions: ScoreDeduction[] = [];
    const deductionMap = new Map<string, ScoreDeduction>();

    for (const role of ['security', 'performance', 'quality', 'dependencies'] as const) {
      for (const deduction of scores[role].deductions) {
        const existing = deductionMap.get(deduction.severity);
        if (existing) {
          existing.count += deduction.count;
          existing.deduction += deduction.deduction;
        } else {
          deductionMap.set(deduction.severity, { ...deduction });
        }
      }
    }

    allDeductions.push(...deductionMap.values());

    return {
      baseScore: 100,
      deductions: allDeductions,
      finalScore: averageScore,
      grade
    };
  }

  /**
   * Get grade based on score
   */
  private getGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Normalize severity
   */
  private normalizeSeverity(severity: any): 'critical' | 'high' | 'medium' | 'low' {
    const sev = String(severity).toLowerCase();
    if (sev.includes('critical')) return 'critical';
    if (sev.includes('high')) return 'high';
    if (sev.includes('medium')) return 'medium';
    return 'low';
  }

  /**
   * Initialize role scores
   */
  private initializeRoleScores(): RoleScores {
    const defaultScore: RoleScore = {
      baseScore: 100,
      deductions: [],
      finalScore: 100,
      grade: 'A'
    };

    return {
      security: { ...defaultScore },
      performance: { ...defaultScore },
      quality: { ...defaultScore },
      dependencies: { ...defaultScore },
      overall: { ...defaultScore }
    };
  }

  /**
   * Display role scores
   */
  private displayRoleScores(scores: RoleScores): void {
    const roles = ['security', 'performance', 'quality', 'dependencies', 'overall'] as const;
    
    for (const role of roles) {
      const score = scores[role];
      const emoji = score.grade === 'A' ? '🟢' : score.grade === 'B' ? '🟡' : '🔴';
      console.log(`      • ${role.charAt(0).toUpperCase() + role.slice(1)}: ${score.finalScore.toFixed(1)}/100 (${score.grade}) ${emoji}`);
      
      if (score.deductions.length > 0 && role !== 'overall') {
        for (const deduction of score.deductions) {
          console.log(`        - ${deduction.count} ${deduction.severity}: -${deduction.deduction.toFixed(1)}`);
        }
      }
    }
  }

  /**
   * Update tool statistics
   */
  private updateToolStats(tool: string, language: string, issuesFound: number): void {
    const key = `${language}-${tool}`;
    const existing = this.toolStats.get(key);

    if (existing) {
      existing.timesExecuted++;
      existing.totalIssuesFound += issuesFound;
      existing.averageIssuesPerRun = existing.totalIssuesFound / existing.timesExecuted;
    } else {
      this.toolStats.set(key, {
        tool,
        language,
        timesExecuted: 1,
        totalIssuesFound: issuesFound,
        averageIssuesPerRun: issuesFound,
        successRate: 100,
        recommendation: 'keep'
      });
    }
  }

  /**
   * Generate summary report
   */
  private generateSummaryReport(): void {
    console.log('\n════════════════════════════════════════════════════════════════════');
    console.log('📊 LIFECYCLE TEST SUMMARY');
    console.log('════════════════════════════════════════════════════════════════════');

    const totalTests = this.results.length;
    const successfulTests = this.results.filter(r => r.success).length;
    const successRate = (successfulTests / totalTests * 100).toFixed(1);

    console.log(`\n🎯 Overall Results:`);
    console.log(`   • Total Tests: ${totalTests}`);
    console.log(`   • Successful: ${successfulTests}`);
    console.log(`   • Success Rate: ${successRate}%`);

    // Agent statistics
    console.log(`\n🤖 Agent Statistics:`);
    const agentCounts = new Map<string, number>();
    this.results.forEach(r => {
      agentCounts.set(r.agentName, (agentCounts.get(r.agentName) || 0) + 1);
    });
    agentCounts.forEach((count, agent) => {
      console.log(`   • ${agent}: ${count} tests`);
    });

    // Tool coverage
    console.log(`\n🔧 Tool Coverage:`);
    const avgToolCoverage = this.results.reduce((sum, r) => {
      const coverage = (r.toolsInitialized.length / r.toolsExpected.length) * 100;
      return sum + coverage;
    }, 0) / totalTests;
    console.log(`   • Average Coverage: ${avgToolCoverage.toFixed(1)}%`);

    // Deduplication effectiveness
    console.log(`\n🔍 Deduplication:`);
    const avgDedupRate = this.results.reduce((sum, r) => sum + r.deduplicationRate, 0) / totalTests;
    console.log(`   • Average Deduplication Rate: ${avgDedupRate.toFixed(1)}%`);

    // Score distribution
    console.log(`\n📈 Score Distribution:`);
    const scoreRanges = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    this.results.forEach(r => {
      scoreRanges[r.roleScores.overall.grade]++;
    });
    Object.entries(scoreRanges).forEach(([grade, count]) => {
      const percentage = (count / totalTests * 100).toFixed(0);
      console.log(`   • Grade ${grade}: ${count} (${percentage}%)`);
    });
  }

  /**
   * Generate tool statistics report
   */
  private generateToolStatistics(): void {
    console.log('\n════════════════════════════════════════════════════════════════════');
    console.log('📊 TOOL EFFECTIVENESS ANALYSIS');
    console.log('════════════════════════════════════════════════════════════════════');

    // Convert map to array and sort by effectiveness
    const toolArray = Array.from(this.toolStats.values())
      .sort((a, b) => b.averageIssuesPerRun - a.averageIssuesPerRun);

    console.log('\n🔧 Tool Performance Ranking:');
    console.log('   (Ranked by average issues found per run)');
    console.log('   ────────────────────────────────────────────');

    toolArray.forEach((stat, index) => {
      // Determine recommendation
      if (stat.averageIssuesPerRun === 0) {
        stat.recommendation = 'remove';
      } else if (stat.averageIssuesPerRun < 1) {
        stat.recommendation = 'review';
      } else {
        stat.recommendation = 'keep';
      }

      const emoji = stat.recommendation === 'keep' ? '✅' : 
                    stat.recommendation === 'review' ? '⚠️' : '❌';

      console.log(`   ${index + 1}. ${stat.tool} (${stat.language}) ${emoji}`);
      console.log(`      • Executions: ${stat.timesExecuted}`);
      console.log(`      • Total Issues: ${stat.totalIssuesFound}`);
      console.log(`      • Avg Issues/Run: ${stat.averageIssuesPerRun.toFixed(2)}`);
      console.log(`      • Recommendation: ${stat.recommendation.toUpperCase()}`);
    });

    // Summary recommendations
    const toRemove = toolArray.filter(t => t.recommendation === 'remove');
    const toReview = toolArray.filter(t => t.recommendation === 'review');

    if (toRemove.length > 0) {
      console.log('\n❌ Tools to Consider Removing:');
      toRemove.forEach(t => {
        console.log(`   • ${t.tool} (${t.language}): Never found issues`);
      });
    }

    if (toReview.length > 0) {
      console.log('\n⚠️ Tools to Review:');
      toReview.forEach(t => {
        console.log(`   • ${t.tool} (${t.language}): Low effectiveness (${t.averageIssuesPerRun.toFixed(2)} issues/run)`);
      });
    }
  }

  /**
   * Save detailed results to file
   */
  private saveDetailedResults(): void {
    const reportPath = path.join(__dirname, '../test-results/agent-lifecycle-report.json');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: this.results.length,
        successfulTests: this.results.filter(r => r.success).length,
        averageExecutionTime: this.results.reduce((sum, r) => sum + r.executionTime, 0) / this.results.length,
        averageDeduplicationRate: this.results.reduce((sum, r) => sum + r.deduplicationRate, 0) / this.results.length
      },
      results: this.results,
      toolStatistics: Array.from(this.toolStats.values()),
      recommendations: {
        toolsToRemove: Array.from(this.toolStats.values()).filter(t => t.recommendation === 'remove'),
        toolsToReview: Array.from(this.toolStats.values()).filter(t => t.recommendation === 'review'),
        toolsToKeep: Array.from(this.toolStats.values()).filter(t => t.recommendation === 'keep')
      }
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Detailed report saved to: ${reportPath}`);
  }

  /**
   * Create test environment
   */
  private async createTestEnvironment(pr: PRTestCase): Promise<string> {
    const testDir = path.join('/tmp', `test-${pr.language}-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });

    // Create test files
    for (const file of pr.files) {
      const filePath = path.join(testDir, file.path);
      const fileDir = path.dirname(filePath);
      fs.mkdirSync(fileDir, { recursive: true });
      fs.writeFileSync(filePath, file.content);
    }

    return testDir;
  }

  /**
   * Cleanup test environment
   */
  private async cleanupTestEnvironment(testDir: string): Promise<void> {
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to cleanup test directory: ${error.message}`);
    }
  }

  // Vulnerable code samples for each language
  private getPythonVulnerableCode(): string {
    return `
import sqlite3
from flask import request

def get_user(user_id):
    # SQL Injection vulnerability
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    query = f"SELECT * FROM users WHERE id = {user_id}"  # Vulnerable
    cursor.execute(query)
    return cursor.fetchone()

def render_template(user_input):
    # XSS vulnerability
    return f"<div>{user_input}</div>"  # No escaping

def execute_command(cmd):
    # Command injection
    import os
    os.system(f"echo {cmd}")  # Vulnerable
`;
  }

  private getJavaScriptVulnerableCode(): string {
    return `
const mysql = require('mysql');

function getUser(req, res) {
    const userId = req.params.id;
    // SQL Injection
    const query = \`SELECT * FROM users WHERE id = \${userId}\`;
    connection.query(query, (err, results) => {
        res.json(results);
    });
}

function renderHTML(userInput) {
    // XSS vulnerability
    document.innerHTML = userInput;
}

// Prototype pollution
function merge(target, source) {
    for (let key in source) {
        target[key] = source[key];  // Vulnerable
    }
}
`;
  }

  private getGoVulnerableCode(): string {
    return `
package main

import (
    "database/sql"
    "fmt"
    "os/exec"
    "net/http"
)

func getUser(w http.ResponseWriter, r *http.Request) {
    id := r.URL.Query().Get("id")
    // SQL Injection
    query := fmt.Sprintf("SELECT * FROM users WHERE id = %s", id)
    db.Query(query)
}

func executeCommand(input string) {
    // Command injection
    cmd := exec.Command("sh", "-c", "echo " + input)
    cmd.Run()
}

var counter int
func incrementCounter() {
    // Race condition
    counter++  // Not thread-safe
}
`;
  }

  private getRustVulnerableCode(): string {
    return `
use std::ptr;

fn vulnerable_function(data: &[u8]) {
    unsafe {
        // Unsafe memory access
        let ptr = data.as_ptr();
        let value = *ptr.offset(100);  // Potential out-of-bounds
    }
}

fn memory_leak() {
    let data = Box::new([0u8; 1024]);
    let _ = Box::into_raw(data);  // Memory leak
}

fn use_after_free() {
    let data = vec![1, 2, 3];
    let ptr = data.as_ptr();
    drop(data);
    unsafe {
        let _ = *ptr;  // Use after free
    }
}
`;
  }

  private getRubyVulnerableCode(): string {
    return `
class UsersController < ApplicationController
  def show
    # SQL Injection
    @user = User.where("id = #{params[:id]}").first
  end

  def create
    # Mass assignment vulnerability
    @user = User.new(params[:user])
    @user.save
  end

  def execute
    # Command injection
    system("echo #{params[:input]}")
  end

  def render_html
    # XSS vulnerability
    render html: params[:content].html_safe
  end
end
`;
  }

  private getJavaVulnerableCode(): string {
    return `
import java.sql.*;
import java.io.*;

public class VulnerableService {
    public User getUser(String userId) throws SQLException {
        // SQL Injection
        String query = "SELECT * FROM users WHERE id = " + userId;
        Statement stmt = connection.createStatement();
        ResultSet rs = stmt.executeQuery(query);
        return parseUser(rs);
    }

    public void deserialize(byte[] data) throws Exception {
        // Deserialization vulnerability
        ObjectInputStream ois = new ObjectInputStream(new ByteArrayInputStream(data));
        Object obj = ois.readObject();  // Vulnerable
    }

    public void executeCommand(String input) throws IOException {
        // Command injection
        Runtime.getRuntime().exec("echo " + input);
    }
}
`;
  }

  private getPHPVulnerableCode(): string {
    return `
<?php
class UserController {
    public function getUser($id) {
        // SQL Injection
        $query = "SELECT * FROM users WHERE id = $id";
        $result = mysqli_query($conn, $query);
        return mysqli_fetch_assoc($result);
    }

    public function uploadFile() {
        // File upload vulnerability
        $target = "uploads/" . $_FILES["file"]["name"];
        move_uploaded_file($_FILES["file"]["tmp_name"], $target);
    }

    public function executeCommand($input) {
        // Command injection
        system("echo $input");
    }

    public function renderHTML($content) {
        // XSS vulnerability
        echo $content;  // No escaping
    }
}
`;
  }

  private getCppVulnerableCode(): string {
    return `
#include <cstring>
#include <iostream>

void vulnerableFunction(const char* input) {
    char buffer[100];
    // Buffer overflow
    strcpy(buffer, input);  // No bounds checking
}

int* memoryLeak() {
    int* data = new int[1000];
    // Memory leak - no delete[]
    return nullptr;
}

void integerOverflow(int a, int b) {
    // Integer overflow
    int result = a + b;  // No overflow checking
    int* array = new int[result];
}

void formatString(const char* userInput) {
    // Format string vulnerability
    printf(userInput);  // User input as format string
}
`;
  }
}

// Run the test
async function main() {
  const tester = new AgentLifecycleTest();
  await tester.runLifecycleTests();
}

main().catch(console.error);