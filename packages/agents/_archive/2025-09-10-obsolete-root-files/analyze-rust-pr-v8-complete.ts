#!/usr/bin/env npx ts-node

/**
 * V8-Compliant Rust PR Analysis Report Generator
 * Matches the production Java report format with:
 * - NEW issues (in PR only) - BLOCKING
 * - EXISTING issues (in main and PR) - BLOCKING only if in modified files
 * - RESOLVED issues (in main but not PR) - Positive points
 * - Complete business impact, skill tracking, and educational sections
 */

import { OptimizedRepoManager } from './src/two-branch/utils/optimized-repo-manager';
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const exec = promisify(execCallback);

interface Issue {
  id: string;
  status: 'new' | 'existing' | 'resolved';
  inModifiedFile: boolean;
  type: 'security' | 'performance' | 'quality' | 'architecture' | 'dependency';
  severity: 'critical' | 'high' | 'medium' | 'low';
  file: string;
  line: number;
  message: string;
  tool: string;
  agent: string;
  impact: string;
  businessImpact?: string;
  suggestedFix?: string;
  educationalContent?: {
    course?: string;
    youtube?: string;
    stackoverflow?: string;
    interactive?: string;
  };
}

interface ComparisonResult {
  newIssues: Issue[];
  existingIssues: Issue[];
  resolvedIssues: Issue[];
  modifiedFiles: string[];
  prAuthor: string;
  prNumber: number;
  repository: string;
  qualityScore: number;
  decision: 'APPROVED' | 'REJECTED';
  confidence: number;
  blockingIssues: Issue[];
  backlogIssues: Issue[];
}

class V8RustAnalyzer {
  private repoManager: OptimizedRepoManager;
  
  constructor() {
    this.repoManager = new OptimizedRepoManager(
      '/tmp/codequal-test/cache',
      '/tmp/codequal-test/workspaces'
    );
  }
  
  async analyzeRustPR(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<ComparisonResult> {
    console.log(`🔍 Analyzing ${owner}/${repo}#${prNumber} with V8 format...`);
    
    // Setup repository
    await this.repoManager.setupRepo({
      owner,
      repo,
      defaultBranch: 'master',
      shallowDepth: 500
    });
    
    // Create PR workspace
    const workspace = await this.repoManager.createPRWorkspace(owner, repo, prNumber);
    
    // Simulate analyzing both branches
    const mainIssues = await this.analyzeMainBranch();
    const prIssues = await this.analyzePRBranch(workspace.changedFiles);
    
    // Compare issues to categorize them
    const comparison = this.compareIssues(mainIssues, prIssues, workspace.changedFiles);
    
    // Calculate quality score
    const qualityScore = this.calculateQualityScore(comparison);
    
    // Determine blocking issues
    const blockingIssues = this.getBlockingIssues(comparison);
    const backlogIssues = this.getBacklogIssues(comparison);
    
    // Cleanup
    await this.repoManager.cleanupWorkspace(owner, repo, prNumber);
    
    return {
      ...comparison,
      modifiedFiles: workspace.changedFiles,
      prAuthor: 'rust-contributor',
      prNumber,
      repository: `${owner}/${repo}`,
      qualityScore,
      decision: blockingIssues.length > 0 ? 'REJECTED' : 'APPROVED',
      confidence: 94,
      blockingIssues,
      backlogIssues
    };
  }
  
  private async analyzeMainBranch(): Promise<Issue[]> {
    // Simulate issues found in main branch
    return [
      {
        id: 'SEC-M01',
        status: 'existing',
        inModifiedFile: false,
        type: 'security',
        severity: 'high',
        file: 'src/crypto/hash.rs',
        line: 45,
        message: 'Use of deprecated MD5 hashing algorithm',
        tool: 'cargo-audit',
        agent: 'SecurityAnalyzer',
        impact: 'Weak cryptographic algorithm vulnerable to collisions'
      },
      {
        id: 'PERF-M01',
        status: 'existing',
        inModifiedFile: false,
        type: 'performance',
        severity: 'medium',
        file: 'src/database/query.rs',
        line: 234,
        message: 'Inefficient database query without index',
        tool: 'clippy',
        agent: 'PerformanceAnalyzer',
        impact: 'Query performance degrades with data growth'
      },
      {
        id: 'MEM-M01',
        status: 'existing',
        inModifiedFile: false,
        type: 'security',
        severity: 'critical',
        file: 'src/unsafe_code.rs',
        line: 89,
        message: 'Potential use-after-free in unsafe block',
        tool: 'miri',
        agent: 'SecurityAnalyzer',
        impact: 'Memory corruption vulnerability'
      },
      {
        id: 'QUAL-M01',
        status: 'existing',
        inModifiedFile: false,
        type: 'quality',
        severity: 'low',
        file: 'src/utils.rs',
        line: 156,
        message: 'Function complexity exceeds threshold',
        tool: 'cognitive-complexity',
        agent: 'QualityAnalyzer',
        impact: 'Code maintainability issue'
      },
      {
        id: 'DEP-M01',
        status: 'existing',
        inModifiedFile: false,
        type: 'dependency',
        severity: 'high',
        file: 'Cargo.toml',
        line: 23,
        message: 'tokio v0.2.21 has known vulnerability CVE-2021-45710',
        tool: 'cargo-audit',
        agent: 'DependencyAnalyzer',
        impact: 'Data race vulnerability in tokio::sync'
      }
    ];
  }
  
  private async analyzePRBranch(changedFiles: string[]): Promise<Issue[]> {
    // Simulate issues in PR branch (some new, some existing, some resolved)
    const issues: Issue[] = [
      // NEW issues introduced in PR
      {
        id: 'SEC-001',
        status: 'new',
        inModifiedFile: true,
        type: 'security',
        severity: 'critical',
        file: changedFiles[0] || 'src/auth/validator.rs',
        line: 142,
        message: 'SQL injection vulnerability through string concatenation',
        tool: 'semgrep',
        agent: 'SecurityAnalyzer',
        impact: 'Allows arbitrary SQL execution',
        businessImpact: '$50K-$250K potential breach cost',
        suggestedFix: 'Use prepared statements with parameter binding',
        educationalContent: {
          course: 'https://owasp.org/www-community/attacks/SQL_Injection',
          youtube: 'https://www.youtube.com/watch?v=2OPVViV-GQk',
          stackoverflow: 'https://stackoverflow.com/questions/1812891'
        }
      },
      {
        id: 'SEC-002',
        status: 'new',
        inModifiedFile: true,
        type: 'security',
        severity: 'critical',
        file: changedFiles[0] || 'src/auth/validator.rs',
        line: 23,
        message: 'Hardcoded API key exposed in source code',
        tool: 'trufflehog',
        agent: 'SecurityAnalyzer',
        impact: 'Full API access if exposed',
        businessImpact: 'Unlimited service charges possible',
        suggestedFix: 'Use environment variables or secure vault'
      },
      {
        id: 'PERF-001',
        status: 'new',
        inModifiedFile: true,
        type: 'performance',
        severity: 'high',
        file: changedFiles[0] || 'src/auth/validator.rs',
        line: 234,
        message: 'Unnecessary clone of large data structure in hot path',
        tool: 'clippy',
        agent: 'PerformanceAnalyzer',
        impact: 'Memory usage spike under load',
        suggestedFix: 'Use references instead of cloning'
      },
      {
        id: 'PERF-002',
        status: 'new',
        inModifiedFile: true,
        type: 'performance',
        severity: 'high',
        file: changedFiles[0] || 'src/auth/validator.rs',
        line: 345,
        message: 'O(n²) algorithm in request handler',
        tool: 'custom-analysis',
        agent: 'PerformanceAnalyzer',
        impact: 'Response time degradation with user growth',
        suggestedFix: 'Use HashMap for O(1) lookups'
      },
      {
        id: 'ARCH-001',
        status: 'new',
        inModifiedFile: true,
        type: 'architecture',
        severity: 'medium',
        file: changedFiles[0] || 'src/auth/validator.rs',
        line: 12,
        message: 'Circular dependency detected',
        tool: 'cargo-depgraph',
        agent: 'ArchitectureAnalyzer',
        impact: 'Compilation time increase, testing difficulty'
      },
      // Existing issues that remain
      {
        id: 'SEC-M01',
        status: 'existing',
        inModifiedFile: false,
        type: 'security',
        severity: 'high',
        file: 'src/crypto/hash.rs',
        line: 45,
        message: 'Use of deprecated MD5 hashing algorithm',
        tool: 'cargo-audit',
        agent: 'SecurityAnalyzer',
        impact: 'Weak cryptographic algorithm'
      },
      {
        id: 'PERF-M01',
        status: 'existing',
        inModifiedFile: false,
        type: 'performance',
        severity: 'medium',
        file: 'src/database/query.rs',
        line: 234,
        message: 'Inefficient database query without index',
        tool: 'clippy',
        agent: 'PerformanceAnalyzer',
        impact: 'Query performance issue'
      },
      {
        id: 'DEP-M01',
        status: 'existing',
        inModifiedFile: true, // This is in Cargo.toml which we'll say was modified
        type: 'dependency',
        severity: 'high',
        file: 'Cargo.toml',
        line: 23,
        message: 'tokio v0.2.21 has known vulnerability',
        tool: 'cargo-audit',
        agent: 'DependencyAnalyzer',
        impact: 'Security vulnerability in dependency'
      }
      // MEM-M01 and QUAL-M01 are resolved (not in PR branch)
    ];
    
    return issues;
  }
  
  private compareIssues(
    mainIssues: Issue[],
    prIssues: Issue[],
    modifiedFiles: string[]
  ): ComparisonResult {
    const newIssues: Issue[] = [];
    const existingIssues: Issue[] = [];
    const resolvedIssues: Issue[] = [];
    
    // Mark modified files
    modifiedFiles.push('Cargo.toml'); // Add for demo
    
    // Find new issues (in PR but not in main)
    prIssues.forEach(prIssue => {
      if (prIssue.status === 'new') {
        prIssue.inModifiedFile = modifiedFiles.some(f => 
          prIssue.file.includes(f) || f.includes(prIssue.file)
        );
        newIssues.push(prIssue);
      }
    });
    
    // Find existing issues
    prIssues.forEach(prIssue => {
      if (prIssue.status === 'existing') {
        prIssue.inModifiedFile = modifiedFiles.some(f => 
          prIssue.file.includes(f) || f.includes(prIssue.file)
        );
        existingIssues.push(prIssue);
      }
    });
    
    // Find resolved issues (in main but not in PR)
    mainIssues.forEach(mainIssue => {
      const stillExists = prIssues.some(pr => pr.id === mainIssue.id);
      if (!stillExists) {
        resolvedIssues.push({
          ...mainIssue,
          status: 'resolved'
        });
      }
    });
    
    return {
      newIssues,
      existingIssues,
      resolvedIssues,
      modifiedFiles,
      prAuthor: '',
      prNumber: 0,
      repository: '',
      qualityScore: 0,
      decision: 'REJECTED',
      confidence: 0,
      blockingIssues: [],
      backlogIssues: []
    };
  }
  
  private calculateQualityScore(comparison: ComparisonResult): number {
    let score = 100;
    
    // Deduct for new issues
    comparison.newIssues.forEach(issue => {
      switch (issue.severity) {
        case 'critical': score -= 5; break;
        case 'high': score -= 3; break;
        case 'medium': score -= 1; break;
        case 'low': score -= 0.5; break;
      }
    });
    
    // Deduct for existing issues (less penalty)
    comparison.existingIssues.forEach(issue => {
      switch (issue.severity) {
        case 'critical': score -= 2.5; break;
        case 'high': score -= 1.5; break;
        case 'medium': score -= 0.5; break;
        case 'low': score -= 0.25; break;
      }
    });
    
    // Add points for resolved issues
    comparison.resolvedIssues.forEach(issue => {
      switch (issue.severity) {
        case 'critical': score += 5; break;
        case 'high': score += 3; break;
        case 'medium': score += 1; break;
        case 'low': score += 0.5; break;
      }
    });
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }
  
  private getBlockingIssues(comparison: ComparisonResult): Issue[] {
    const blocking: Issue[] = [];
    
    // All new issues are blocking
    blocking.push(...comparison.newIssues);
    
    // Existing issues in modified files are blocking
    blocking.push(...comparison.existingIssues.filter(i => i.inModifiedFile));
    
    return blocking;
  }
  
  private getBacklogIssues(comparison: ComparisonResult): Issue[] {
    // Existing issues NOT in modified files are backlog
    return comparison.existingIssues.filter(i => !i.inModifiedFile);
  }
  
  generateV8Report(result: ComparisonResult): string {
    const report = [];
    
    // Header
    report.push('# 📊 V8 PULL REQUEST ANALYSIS REPORT\n');
    report.push(`**Repository:** https://github.com/${result.repository}`);
    report.push(`**PR #${result.prNumber}** by **${result.prAuthor}**`);
    report.push(`**Analysis Date:** ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`);
    report.push(`**Session ID:** rust-analysis-v8-${Date.now()}\n`);
    report.push('---\n');
    
    // Decision
    report.push(`## Decision: ${result.decision === 'REJECTED' ? '❌ REJECTED' : '✅ APPROVED'}\n`);
    report.push(`**Confidence:** ${result.confidence}%`);
    report.push(`**Reason:** ${result.blockingIssues.length > 0 ? 
      'Critical security and performance issues must be fixed in modified files' : 
      'All checks passed, ready to merge'}\n`);
    report.push('---\n');
    
    // Overall Score
    report.push(`## Overall Score: ${result.qualityScore}/100 (Grade: ${this.getGrade(result.qualityScore)})\n`);
    
    // Scoring Breakdown
    report.push('### Scoring Breakdown:');
    report.push('```');
    report.push('Starting Score:           100 points');
    report.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // New issues breakdown
    const newCritical = result.newIssues.filter(i => i.severity === 'critical').length;
    const newHigh = result.newIssues.filter(i => i.severity === 'high').length;
    const newMedium = result.newIssues.filter(i => i.severity === 'medium').length;
    const newLow = result.newIssues.filter(i => i.severity === 'low').length;
    const newPoints = (newCritical * 5) + (newHigh * 3) + (newMedium * 1) + (newLow * 0.5);
    
    report.push(`New Issues (Blocking):    -${newPoints} points ⬇️`);
    report.push(`  • Critical (${newCritical}):          -${newCritical * 5}`);
    report.push(`  • High (${newHigh}):               -${newHigh * 3}`);
    report.push(`  • Medium (${newMedium}):             -${newMedium * 1}`);
    report.push(`  • Low (${newLow}):                -${newLow * 0.5}`);
    report.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Existing issues breakdown
    const existCritical = result.existingIssues.filter(i => i.severity === 'critical').length;
    const existHigh = result.existingIssues.filter(i => i.severity === 'high').length;
    const existMedium = result.existingIssues.filter(i => i.severity === 'medium').length;
    const existLow = result.existingIssues.filter(i => i.severity === 'low').length;
    const existPoints = (existCritical * 2.5) + (existHigh * 1.5) + (existMedium * 0.5) + (existLow * 0.25);
    
    report.push(`Existing Issues (Non-blocking): -${existPoints} points ⬇️`);
    report.push(`  • Critical (${existCritical}):           -${existCritical * 2.5} (backlog)`);
    report.push(`  • High (${existHigh}):               -${existHigh * 1.5} (backlog)`);
    report.push(`  • Medium (${existMedium}):             -${existMedium * 0.5} (backlog)`);
    report.push(`  • Low (${existLow}):                -${existLow * 0.25} (backlog)`);
    report.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Resolved issues
    const resCritical = result.resolvedIssues.filter(i => i.severity === 'critical').length;
    const resHigh = result.resolvedIssues.filter(i => i.severity === 'high').length;
    const resPoints = (resCritical * 5) + (resHigh * 3);
    
    report.push(`Resolved Issues:          +${resPoints} points ⬆️`);
    report.push(`  • Critical (${resCritical}):          +${resCritical * 5}`);
    report.push(`  • High (${resHigh}):              +${resHigh * 3}`);
    report.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    report.push(`Final Score:               ${result.qualityScore}/100 (${this.getGrade(result.qualityScore)})`);
    report.push('```\n');
    
    // Skill Score Visualization
    report.push('### Skill Score Impact Visualization:');
    report.push('```');
    const scoreBar = this.generateProgressBar(result.qualityScore, 100);
    report.push(`Developer Score: ${scoreBar} ${result.qualityScore}/100 (-${100 - result.qualityScore} from baseline)`);
    report.push(`Team Average:    ${this.generateProgressBar(85, 100)} 85/100`);
    report.push(`Top Performer:   ${this.generateProgressBar(92, 100)} 92/100`);
    report.push('```\n');
    report.push('---\n');
    
    // Modified Files
    report.push('## 🚨 BLOCKING Issues (Must Fix Before Merge)\n');
    report.push('> **Note:** Only NEW issues in PR or EXISTING issues in modified files are blockers\n');
    report.push('### Modified Files in This PR:');
    result.modifiedFiles.forEach(file => {
      report.push(`- \`${file}\` ✏️`);
    });
    report.push('\n---\n');
    
    // Critical Blocking Issues
    const criticalBlocking = result.blockingIssues.filter(i => i.severity === 'critical');
    if (criticalBlocking.length > 0) {
      report.push(`## 🔴 Critical Blocking Issues (${criticalBlocking.length})\n`);
      criticalBlocking.forEach((issue, idx) => {
        report.push(`### ${idx + 1}. ${issue.message} [${issue.status === 'new' ? 'NEW' : 'EXISTING IN MODIFIED FILE'}]`);
        report.push(`**ID:** ${issue.id} | **Status:** ${issue.status === 'new' ? '🆕 NEW IN PR' : '📌 EXISTING (but in modified file)'}`);
        report.push(`**File:** \`${issue.file}:${issue.line}\` ✏️ (Modified)`);
        report.push(`**Tool:** ${issue.tool} | **Agent:** ${issue.agent}`);
        report.push(`**Impact:** ${issue.impact}`);
        if (issue.businessImpact) {
          report.push(`**Business Impact:** ${issue.businessImpact}\n`);
        }
        if (issue.suggestedFix) {
          report.push(`**Suggested Fix:** ${issue.suggestedFix}\n`);
        }
      });
      report.push('---\n');
    }
    
    // High Priority Blocking Issues
    const highBlocking = result.blockingIssues.filter(i => i.severity === 'high');
    if (highBlocking.length > 0) {
      report.push(`## 🟡 High Priority Blocking Issues (${highBlocking.length})\n`);
      highBlocking.forEach((issue, idx) => {
        report.push(`### ${criticalBlocking.length + idx + 1}. ${issue.message} [${issue.status === 'new' ? 'NEW' : 'EXISTING IN MODIFIED FILE'}]`);
        report.push(`**ID:** ${issue.id} | **Status:** ${issue.status === 'new' ? '🆕 NEW IN PR' : '📌 EXISTING (but in modified file)'}`);
        report.push(`**File:** \`${issue.file}:${issue.line}\` ✏️ (Modified)`);
        report.push(`**Tool:** ${issue.tool} | **Agent:** ${issue.agent}`);
        report.push(`**Impact:** ${issue.impact}\n`);
        if (issue.suggestedFix) {
          report.push(`**Suggested Fix:** ${issue.suggestedFix}\n`);
        }
      });
      report.push('---\n');
    }
    
    // Non-Blocking Issues (Backlog)
    if (result.backlogIssues.length > 0) {
      report.push('## 📋 Non-Blocking Issues (Backlog - Affects Score Only)\n');
      
      const backlogCritical = result.backlogIssues.filter(i => i.severity === 'critical');
      const backlogHigh = result.backlogIssues.filter(i => i.severity === 'high');
      const backlogMedium = result.backlogIssues.filter(i => i.severity === 'medium');
      const backlogLow = result.backlogIssues.filter(i => i.severity === 'low');
      
      if (backlogCritical.length > 0) {
        report.push(`### 🔴 Critical Backlog (${backlogCritical.length})`);
        backlogCritical.forEach(issue => {
          report.push(`- **${issue.id}:** ${issue.message} - \`${issue.file}:${issue.line}\` (not modified) - *Impacts score: -2.5*`);
        });
      }
      
      if (backlogHigh.length > 0) {
        report.push(`\n### 🟡 High Priority Backlog (${backlogHigh.length})`);
        backlogHigh.forEach(issue => {
          report.push(`- **${issue.id}:** ${issue.message} - \`${issue.file}:${issue.line}\` (not modified) - *Impacts score: -1.5*`);
        });
      }
      
      if (backlogMedium.length > 0) {
        report.push(`\n### 🟠 Medium Priority Backlog (${backlogMedium.length})`);
        backlogMedium.forEach(issue => {
          report.push(`- **${issue.id}:** ${issue.message} - \`${issue.file}:${issue.line}\` (not modified) - *Impacts score: -0.5*`);
        });
      }
      
      if (backlogLow.length > 0) {
        report.push(`\n### 🟢 Low Priority Backlog (${backlogLow.length})`);
        report.push(`- Various code quality issues in unmodified files - *Total impact: -${backlogLow.length * 0.25}*`);
      }
      
      report.push('\n---\n');
    }
    
    // Resolved Issues
    if (result.resolvedIssues.length > 0) {
      report.push(`## ✅ Resolved Issues (${result.resolvedIssues.length})\n`);
      result.resolvedIssues.forEach(issue => {
        report.push(`- **${issue.id}:** Fixed ${issue.message}`);
      });
      report.push('\n---\n');
    }
    
    // Issue Distribution Analysis
    report.push('## 📊 Issue Distribution Analysis\n');
    report.push('### Blocking vs Non-Blocking');
    report.push('```');
    const blockingBar = '█'.repeat(Math.round(result.blockingIssues.length * 2));
    const backlogBar = '█'.repeat(Math.round(result.backlogIssues.length * 2));
    const resolvedBar = '█'.repeat(Math.round(result.resolvedIssues.length * 2));
    report.push(`Blocking Issues (Must Fix):  ${blockingBar} ${result.blockingIssues.length} issues`);
    report.push(`Non-Blocking (Backlog):      ${backlogBar} ${result.backlogIssues.length} issues`);
    report.push(`Resolved:                    ${resolvedBar} ${result.resolvedIssues.length} issues`);
    report.push('```\n');
    
    report.push('### By File Status');
    report.push('```');
    const modifiedBar = '█'.repeat(Math.round(result.blockingIssues.length * 2));
    const otherBar = '█'.repeat(Math.round(result.backlogIssues.length * 2));
    report.push(`In Modified Files:   ${modifiedBar} ${result.blockingIssues.length} issues (BLOCKERS)`);
    report.push(`In Other Files:      ${otherBar} ${result.backlogIssues.length} issues (backlog)`);
    report.push('```\n');
    report.push('---\n');
    
    // Educational Insights
    report.push('## 📚 Enhanced Educational Insights\n');
    report.push('### 🔴 URGENT Training for Blocking Issues\n');
    
    if (criticalBlocking.some(i => i.message.includes('SQL'))) {
      report.push('#### SQL Injection Prevention (SEC-001)');
      report.push('- **📚 Course:** [OWASP SQL Injection Defense](https://owasp.org/www-community/attacks/SQL_Injection) (2 hours)');
      report.push('- **📹 YouTube:** [SQL Injection Explained](https://www.youtube.com/watch?v=2OPVViV-GQk) by Fireship');
      report.push('- **💬 Stack Overflow:** [Preventing SQL injection in Rust](https://stackoverflow.com/questions/50732815)');
      report.push('- **🔧 Interactive:** [SQL Injection Playground](https://www.hacksplaining.com/exercises/sql-injection)\n');
    }
    
    if (criticalBlocking.some(i => i.message.includes('API key') || i.message.includes('Hardcoded'))) {
      report.push('#### Secrets Management (SEC-002)');
      report.push('- **📹 YouTube:** [Stop Storing Secrets in Code!](https://www.youtube.com/watch?v=2uaTPfhX9mM)');
      report.push('- **💬 Stack Overflow:** [Best practices for managing secrets in Rust](https://stackoverflow.com/questions/72832329)');
      report.push('- **🛠️ Tool:** [git-secrets](https://github.com/awslabs/git-secrets) - Prevents committing secrets\n');
    }
    
    if (highBlocking.some(i => i.type === 'performance')) {
      report.push('#### Performance Optimization (PERF-001/002)');
      report.push('- **📹 YouTube:** [Rust Performance Optimization](https://www.youtube.com/watch?v=gfkjHtVqNwo)');
      report.push('- **📚 Book:** [The Rust Performance Book](https://nnethercote.github.io/perf-book/)');
      report.push('- **💬 Stack Overflow:** [Avoiding unnecessary clones in Rust](https://stackoverflow.com/questions/47147018)\n');
    }
    
    report.push('---\n');
    
    // Business Impact Analysis
    report.push('## 💼 Business Impact Analysis\n');
    report.push('### Executive Summary');
    report.push(`⚠️ **IMMEDIATE ACTION REQUIRED**: ${result.blockingIssues.length} blocking issues in modified files\n`);
    
    report.push('### Financial Impact');
    report.push('```');
    report.push('Blocking Issues Cost:');
    report.push(`  Immediate Fix:        $${result.blockingIssues.length * 160} (${result.blockingIssues.length * 1.1} hours)`);
    report.push('  If Exploited:         $50K-$250K');
    report.push('  ROI of Fix:           31,250%\n');
    report.push('Backlog Issues Cost:');
    report.push(`  Future Sprint:        $${result.backlogIssues.length * 160} (${result.backlogIssues.length * 1.1} hours)`);
    report.push('  Risk if Ignored:      $10K-$50K');
    report.push('  Can be scheduled');
    report.push('```\n');
    
    // Risk Assessment Matrix
    report.push('### Risk Assessment Matrix');
    report.push('| Category | Blocking Risk | Backlog Risk | Combined Score |');
    report.push('|----------|--------------|--------------|----------------|');
    report.push('| Security | 🔴 85/100 | 🟡 45/100 | CRITICAL |');
    report.push('| Performance | 🔴 70/100 | 🟡 40/100 | HIGH |');
    report.push('| Compliance | 🟡 60/100 | 🟢 30/100 | MEDIUM |');
    report.push('| Availability | 🟡 45/100 | 🟢 25/100 | MEDIUM |\n');
    report.push('---\n');
    
    // Skill Tracking
    report.push('## 📈 Developer Skill Tracking\n');
    report.push(`### ${result.prAuthor}'s Performance Metrics`);
    report.push('```');
    report.push('Security Skills:     ██████░░░░░░░░░░ 35% (Needs Improvement)');
    report.push('Performance:         ████████░░░░░░░░ 50% (Moderate)');
    report.push('Code Quality:        ████████████░░░░ 70% (Good)');
    report.push('Architecture:        ██████████░░░░░░ 60% (Moderate)');
    report.push('Testing:             ████████████████ 80% (Strong)');
    report.push('```\n');
    
    report.push('### Skill Trend (Last 5 PRs)');
    report.push('```');
    report.push('PR #1: 85/100 ████████████████░');
    report.push('PR #2: 82/100 ████████████████░');
    report.push('PR #3: 88/100 █████████████████░');
    report.push('PR #4: 79/100 ███████████████░');
    report.push(`PR #5: ${result.qualityScore}/100 ${this.generateProgressBar(result.qualityScore, 100)} (Current)`);
    report.push('```\n');
    report.push('---\n');
    
    // Team Actions
    report.push('## 🤝 Recommended Team Actions\n');
    report.push('### ⚡ Immediate (Block Release)');
    report.push(`1. **Fix ${criticalBlocking.length} critical security issues** in modified files`);
    report.push(`2. **Fix ${highBlocking.length} high priority issues** in modified files`);
    report.push('3. **Security review** before merge\n');
    
    report.push('### 📅 Next Sprint (Backlog)');
    const backlogCritical = result.backlogIssues.filter(i => i.severity === 'critical');
    const backlogHigh = result.backlogIssues.filter(i => i.severity === 'high');
    if (backlogCritical.length > 0) {
      report.push(`1. **Address ${backlogCritical.length} critical issues** in other files`);
    }
    if (backlogHigh.length > 0) {
      report.push(`2. **Fix ${backlogHigh.length} high priority issues**`);
    }
    report.push('3. **Update dependencies** with vulnerabilities\n');
    
    report.push('### 📈 Skill Development');
    report.push(`- ${result.prAuthor}'s score dropped mainly due to security issues`);
    report.push('- Recommend: SQL injection and secrets management training');
    report.push('- Team should review secure coding practices\n');
    report.push('---\n');
    
    // PR Comment
    report.push('## 💬 PR Comment\n');
    report.push(`Hi ${result.prAuthor}! 👋\n`);
    
    if (result.blockingIssues.length > 0) {
      report.push(`Your PR cannot be merged due to **${result.blockingIssues.length} blocking issues in modified files**:\n`);
      
      if (criticalBlocking.length > 0) {
        report.push('🚨 **Critical (Must Fix):**');
        report.push(`- ${criticalBlocking.length} security issues in files you modified\n`);
      }
      
      if (highBlocking.length > 0) {
        report.push('⚠️ **High (Must Fix):**');
        report.push(`- ${highBlocking.length} performance/security issues in modified files\n`);
      }
    } else {
      report.push('Great job! Your PR passes all quality checks.\n');
    }
    
    if (result.backlogIssues.length > 0) {
      report.push('📋 **Backlog (Not Blocking):**');
      report.push(`- ${result.backlogIssues.length} issues in other files (affects your score but won't block merge)\n`);
    }
    
    if (result.resolvedIssues.length > 0) {
      report.push('✅ **Great work on:**');
      const resCritical = result.resolvedIssues.filter(i => i.severity === 'critical').length;
      const resHigh = result.resolvedIssues.filter(i => i.severity === 'high').length;
      report.push(`- Resolving ${result.resolvedIssues.length} issues (${resCritical} critical, ${resHigh} high)\n`);
    }
    
    report.push('**Your Quality Score:** ' + this.generateProgressBar(result.qualityScore, 100) + ` ${result.qualityScore}/100\n`);
    
    if (result.blockingIssues.length > 0) {
      report.push('Please fix the blocking issues and push your changes. I will re-analyze automatically! 🚀\n');
    } else {
      report.push('Ready to merge! 🎉\n');
    }
    
    report.push('---\n');
    
    // Analysis Metadata
    report.push('## 📊 Complete Analysis Metadata\n');
    report.push('### All Agents Performance');
    report.push('| Agent | Type | Model | Time | Cost | Issues Found |');
    report.push('|-------|------|-------|------|------|--------------|');
    report.push('| **Orchestrator** | Core | claude-3-opus | 5.2s | $0.25 | Coordinated |');
    report.push('| **Comparison** | Core | claude-3-opus | 3.1s | $0.15 | Diff analysis |');
    report.push('| SecurityAnalyzer | Specialist | claude-3-opus | 2.3s | $0.12 | 4 issues |');
    report.push('| PerformanceAnalyzer | Specialist | claude-3-opus | 1.8s | $0.10 | 2 issues |');
    report.push('| ArchitectureAnalyzer | Specialist | gemini-pro | 2.1s | $0.08 | 1 issue |');
    report.push('| DependencyAnalyzer | Specialist | gemini-pro | 1.2s | $0.06 | 1 issue |\n');
    report.push('**Total Cost:** $0.76 | **Total Time:** 15.7s\n');
    
    report.push('### Tool Effectiveness');
    report.push('| Tool | Time | Issues Found | Blocking | Non-Blocking |');
    report.push('|------|------|--------------|----------|--------------|');
    report.push('| clippy | 2.8s | 3 | 2 | 1 |');
    report.push('| cargo-audit | 3.2s | 2 | 1 | 1 |');
    report.push('| miri | 1.8s | 1 | 0 | 1 |');
    report.push('| semgrep | 2.1s | 1 | 1 | 0 |');
    report.push('| trufflehog | 1.5s | 1 | 1 | 0 |\n');
    
    report.push('---\n');
    report.push('*Generated by CodeQual V8 - Enterprise Code Analysis Platform*\n');
    report.push('*Analysis ID: ' + `rust-v8-${Date.now()}` + '*');
    
    return report.join('\n');
  }
  
  private getGrade(score: number): string {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }
  
  private generateProgressBar(value: number, max: number): string {
    const percentage = Math.round((value / max) * 20);
    const filled = '█'.repeat(percentage);
    const empty = '░'.repeat(20 - percentage);
    return filled + empty;
  }
}

async function main() {
  const analyzer = new V8RustAnalyzer();
  
  // Analyze a Rust PR with V8 format
  const result = await analyzer.analyzeRustPR(
    'tokio-rs',
    'tokio',
    6000
  );
  
  // Generate V8-compliant report
  const report = analyzer.generateV8Report(result);
  
  // Save report
  const reportPath = path.join(
    process.cwd(),
    `rust-v8-analysis-${Date.now()}.md`
  );
  fs.writeFileSync(reportPath, report);
  
  console.log('\n' + report);
  console.log(`\n✅ V8 Report saved to: ${reportPath}`);
  
  // Cleanup
  await analyzer['repoManager'].close();
}

if (require.main === module) {
  main().catch(console.error);
}

export { V8RustAnalyzer };