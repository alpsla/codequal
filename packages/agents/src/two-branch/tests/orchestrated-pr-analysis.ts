#!/usr/bin/env ts-node

/**
 * Orchestrated PR Analysis Test
 * Demonstrates complete flow of analyzing PRs with multiple languages,
 * platform scanning, deduplication, and comprehensive reporting
 */

import { UnifiedSecurityOrchestrator, PRAnalysisRequest } from '../orchestrator/UnifiedSecurityOrchestrator';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });

interface TestPR {
  name: string;
  repository: string;
  prNumber: number;
  prUrl: string;
  description: string;
  languages: string[];
  expectedIssues: number;
  files: PRFile[];
}

interface PRFile {
  path: string;
  language: string;
  additions: number;
  deletions: number;
  content?: string;
}

class OrchestratedPRAnalyzer {
  private orchestrator: UnifiedSecurityOrchestrator;
  private results: any[] = [];

  constructor() {
    this.orchestrator = new UnifiedSecurityOrchestrator({
      enablePlatformScanning: true,
      enableLanguageScanning: true,
      enableDeduplication: true,
      enablePerformanceTracking: true,
      enableCostTracking: true,
      parallelExecution: true,
      maxConcurrency: 3
    });
  }

  /**
   * Test PRs from different repositories with various language combinations
   */
  private getTestPRs(): TestPR[] {
    return [
      {
        name: 'Multi-language Web App PR',
        repository: 'https://github.com/example/webapp',
        prNumber: 1234,
        prUrl: 'https://github.com/example/webapp/pull/1234',
        description: 'Full-stack web application with Python backend and React frontend',
        languages: ['python', 'javascript', 'typescript'],
        expectedIssues: 15,
        files: [
          { path: 'backend/api/users.py', language: 'python', additions: 150, deletions: 30 },
          { path: 'backend/api/auth.py', language: 'python', additions: 200, deletions: 50 },
          { path: 'backend/models/user.py', language: 'python', additions: 80, deletions: 10 },
          { path: 'frontend/src/components/Login.tsx', language: 'typescript', additions: 120, deletions: 20 },
          { path: 'frontend/src/api/client.js', language: 'javascript', additions: 90, deletions: 15 },
          { path: 'frontend/src/utils/validation.js', language: 'javascript', additions: 60, deletions: 5 }
        ]
      },
      {
        name: 'Microservices PR',
        repository: 'https://github.com/example/microservices',
        prNumber: 567,
        prUrl: 'https://github.com/example/microservices/pull/567',
        description: 'Microservices architecture with Go, Java, and Node.js services',
        languages: ['go', 'java', 'javascript'],
        expectedIssues: 20,
        files: [
          { path: 'services/auth/main.go', language: 'go', additions: 300, deletions: 100 },
          { path: 'services/auth/handler.go', language: 'go', additions: 250, deletions: 80 },
          { path: 'services/payment/PaymentService.java', language: 'java', additions: 400, deletions: 150 },
          { path: 'services/payment/PaymentController.java', language: 'java', additions: 200, deletions: 50 },
          { path: 'services/notification/index.js', language: 'javascript', additions: 180, deletions: 40 },
          { path: 'services/notification/email.js', language: 'javascript', additions: 150, deletions: 30 }
        ]
      },
      {
        name: 'Systems Programming PR',
        repository: 'https://github.com/example/systems',
        prNumber: 89,
        prUrl: 'https://github.com/example/systems/pull/89',
        description: 'Low-level systems code in Rust and C++',
        languages: ['rust', 'cpp'],
        expectedIssues: 12,
        files: [
          { path: 'core/memory/allocator.rs', language: 'rust', additions: 500, deletions: 200 },
          { path: 'core/memory/pool.rs', language: 'rust', additions: 300, deletions: 100 },
          { path: 'drivers/network/driver.cpp', language: 'cpp', additions: 400, deletions: 150 },
          { path: 'drivers/network/buffer.cpp', language: 'cpp', additions: 250, deletions: 80 }
        ]
      },
      {
        name: 'Ruby on Rails API PR',
        repository: 'https://github.com/example/rails-api',
        prNumber: 456,
        prUrl: 'https://github.com/example/rails-api/pull/456',
        description: 'Rails API with Ruby and some JavaScript utilities',
        languages: ['ruby', 'javascript'],
        expectedIssues: 10,
        files: [
          { path: 'app/controllers/api/v1/users_controller.rb', language: 'ruby', additions: 150, deletions: 50 },
          { path: 'app/models/user.rb', language: 'ruby', additions: 80, deletions: 20 },
          { path: 'app/services/auth_service.rb', language: 'ruby', additions: 120, deletions: 30 },
          { path: 'app/assets/javascripts/validators.js', language: 'javascript', additions: 60, deletions: 10 }
        ]
      },
      {
        name: 'PHP Laravel PR',
        repository: 'https://github.com/example/laravel-app',
        prNumber: 789,
        prUrl: 'https://github.com/example/laravel-app/pull/789',
        description: 'Laravel application with PHP backend',
        languages: ['php'],
        expectedIssues: 8,
        files: [
          { path: 'app/Http/Controllers/UserController.php', language: 'php', additions: 200, deletions: 60 },
          { path: 'app/Models/User.php', language: 'php', additions: 100, deletions: 30 },
          { path: 'app/Services/PaymentService.php', language: 'php', additions: 180, deletions: 50 }
        ]
      }
    ];
  }

  /**
   * Run analysis for all test PRs
   */
  async analyzeAllPRs(): Promise<void> {
    const testPRs = this.getTestPRs();
    
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('🚀 ORCHESTRATED PR SECURITY ANALYSIS');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log(`📋 Analyzing ${testPRs.length} Pull Requests`);
    console.log(`🔧 Configuration:`);
    console.log(`   - Platform Scanning: Enabled`);
    console.log(`   - Language Analysis: Enabled`);
    console.log(`   - Deduplication: Enabled`);
    console.log(`   - Performance Tracking: Enabled`);
    console.log(`   - Cost Tracking: Enabled`);
    console.log('═══════════════════════════════════════════════════════════════════\n');

    for (const pr of testPRs) {
      await this.analyzePR(pr);
    }

    this.generateFinalReport();
  }

  /**
   * Analyze a single PR
   */
  private async analyzePR(pr: TestPR): Promise<void> {
    console.log(`\n📌 Analyzing PR: ${pr.name}`);
    console.log(`   Repository: ${pr.repository}`);
    console.log(`   PR #${pr.prNumber}: ${pr.description}`);
    console.log(`   Languages: ${pr.languages.join(', ')}`);
    console.log(`   Files Changed: ${pr.files.length}`);
    console.log(`   Expected Issues: ~${pr.expectedIssues}`);
    console.log('   ────────────────────────────────────────────');

    const request: PRAnalysisRequest = {
      prUrl: pr.prUrl,
      repository: pr.repository,
      prNumber: pr.prNumber,
      baseBranch: 'main',
      headBranch: `feature/pr-${pr.prNumber}`,
      files: pr.files.map(f => ({
        path: f.path,
        status: 'modified' as const,
        additions: f.additions,
        deletions: f.deletions,
        language: f.language
      }))
    };

    try {
      const startTime = Date.now();
      const result = await this.orchestrator.analyzePR(request);
      const executionTime = Date.now() - startTime;

      // Display results
      this.displayPRResults(pr, result, executionTime);
      
      // Store for final report
      this.results.push({
        pr,
        result,
        executionTime
      });

    } catch (error) {
      console.error(`   ❌ Analysis failed: ${error.message}`);
    }
  }

  /**
   * Display results for a single PR
   */
  private displayPRResults(pr: TestPR, result: any, executionTime: number): void {
    console.log(`\n   📊 Analysis Results:`);
    console.log(`   ├─ Total Issues Found: ${result.summary.totalIssues}`);
    console.log(`   ├─ Critical Issues: ${result.summary.criticalIssues}`);
    console.log(`   ├─ Overall Risk: ${result.summary.overallRisk.toUpperCase()}`);
    console.log(`   ├─ Execution Time: ${executionTime}ms`);
    console.log(`   └─ Cost: ${result.cost.totalCost.toFixed(4)} USD`);

    // Language breakdown
    console.log(`\n   📝 Language Analysis:`);
    for (const lang of result.languages) {
      console.log(`   ├─ ${lang.language}:`);
      console.log(`   │  ├─ Agent: ${lang.agent}`);
      console.log(`   │  ├─ Tools: ${lang.tools.join(', ') || 'mock data'}`);
      console.log(`   │  ├─ Findings: ${lang.findings.length}`);
      console.log(`   │  └─ Time: ${lang.executionTime}ms`);
    }

    // Role-based reports summary
    console.log(`\n   🎯 Role-Based Reports:`);
    console.log(`   ├─ Security: ${result.roleBasedReports.security.criticalFindings.length} critical, ${result.roleBasedReports.security.highPriorityFindings.length} high`);
    console.log(`   ├─ Dependencies: ${result.roleBasedReports.dependencies.vulnerableDependencies.length} vulnerable`);
    console.log(`   ├─ Quality: ${result.roleBasedReports.quality.codeSmells.length} code smells`);
    console.log(`   └─ Compliance: ${Object.keys(result.roleBasedReports.compliance.securityStandards).length} standards checked`);

    // Deduplication stats
    console.log(`\n   🔍 Deduplication:`);
    console.log(`   ├─ Total Findings: ${result.deduplication.totalFindings}`);
    console.log(`   ├─ Unique Findings: ${result.deduplication.uniqueFindings}`);
    console.log(`   ├─ Duplicates Removed: ${result.deduplication.duplicatesRemoved}`);
    console.log(`   └─ Correlations Found: ${result.deduplication.correlationsFound}`);

    // Performance metrics
    console.log(`\n   ⚡ Performance:`);
    console.log(`   ├─ Total Time: ${result.performance.totalExecutionTime}ms`);
    console.log(`   ├─ API Calls: ${result.performance.apiCallCount}`);
    console.log(`   ├─ Memory Usage: ${result.performance.memoryUsage.toFixed(2)} MB`);
    console.log(`   └─ Parallelization: ${(result.performance.parallelizationEfficiency * 100).toFixed(0)}% efficient`);

    // Key recommendations
    if (result.summary.recommendations.length > 0) {
      console.log(`\n   💡 Key Recommendations:`);
      result.summary.recommendations.slice(0, 3).forEach((rec: string, idx: number) => {
        console.log(`   ${idx + 1}. ${rec}`);
      });
    }
  }

  /**
   * Generate final summary report across all PRs
   */
  private generateFinalReport(): void {
    console.log('\n═══════════════════════════════════════════════════════════════════');
    console.log('📊 FINAL ANALYSIS SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════════');

    const totalPRs = this.results.length;
    const totalIssues = this.results.reduce((sum, r) => sum + r.result.summary.totalIssues, 0);
    const totalCritical = this.results.reduce((sum, r) => sum + r.result.summary.criticalIssues, 0);
    const totalTime = this.results.reduce((sum, r) => sum + r.executionTime, 0);
    const totalCost = this.results.reduce((sum, r) => sum + r.result.cost.totalCost, 0);

    console.log(`\n🎯 Overall Statistics:`);
    console.log(`   ├─ PRs Analyzed: ${totalPRs}`);
    console.log(`   ├─ Total Issues: ${totalIssues}`);
    console.log(`   ├─ Critical Issues: ${totalCritical}`);
    console.log(`   ├─ Total Execution Time: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
    console.log(`   ├─ Average Time per PR: ${(totalTime / totalPRs).toFixed(0)}ms`);
    console.log(`   ├─ Total Cost: $${totalCost.toFixed(4)}`);
    console.log(`   └─ Average Cost per PR: $${(totalCost / totalPRs).toFixed(4)}`);

    // Language coverage
    const languageCoverage: Record<string, number> = {};
    this.results.forEach(r => {
      r.result.languages.forEach((lang: any) => {
        languageCoverage[lang.language] = (languageCoverage[lang.language] || 0) + lang.findings.length;
      });
    });

    console.log(`\n🌐 Language Coverage:`);
    Object.entries(languageCoverage)
      .sort((a, b) => b[1] - a[1])
      .forEach(([lang, count]) => {
        console.log(`   ├─ ${lang}: ${count} findings`);
      });

    // Tool effectiveness
    const toolUsage: Record<string, number> = {};
    this.results.forEach(r => {
      r.result.languages.forEach((lang: any) => {
        lang.tools.forEach((tool: string) => {
          toolUsage[tool] = (toolUsage[tool] || 0) + 1;
        });
      });
    });

    console.log(`\n🔧 Tool Usage:`);
    Object.entries(toolUsage)
      .sort((a, b) => b[1] - a[1])
      .forEach(([tool, count]) => {
        console.log(`   ├─ ${tool}: used ${count} times`);
      });

    // Risk distribution
    const riskLevels: Record<string, number> = {};
    this.results.forEach(r => {
      const risk = r.result.summary.overallRisk;
      riskLevels[risk] = (riskLevels[risk] || 0) + 1;
    });

    console.log(`\n⚠️ Risk Distribution:`);
    ['critical', 'high', 'medium', 'low'].forEach(level => {
      const count = riskLevels[level] || 0;
      const percentage = (count / totalPRs * 100).toFixed(0);
      console.log(`   ├─ ${level.toUpperCase()}: ${count} PRs (${percentage}%)`);
    });

    // Deduplication effectiveness
    const totalOriginal = this.results.reduce((sum, r) => sum + r.result.deduplication.totalFindings, 0);
    const totalDeduplicated = this.results.reduce((sum, r) => sum + r.result.deduplication.uniqueFindings, 0);
    const deduplicationRate = ((totalOriginal - totalDeduplicated) / totalOriginal * 100).toFixed(1);

    console.log(`\n🔍 Deduplication Effectiveness:`);
    console.log(`   ├─ Original Findings: ${totalOriginal}`);
    console.log(`   ├─ After Deduplication: ${totalDeduplicated}`);
    console.log(`   ├─ Duplicates Removed: ${totalOriginal - totalDeduplicated}`);
    console.log(`   └─ Deduplication Rate: ${deduplicationRate}%`);

    // Performance analysis
    const avgApiCalls = this.results.reduce((sum, r) => sum + r.result.performance.apiCallCount, 0) / totalPRs;
    const avgMemory = this.results.reduce((sum, r) => sum + r.result.performance.memoryUsage, 0) / totalPRs;

    console.log(`\n⚡ Performance Analysis:`);
    console.log(`   ├─ Average API Calls per PR: ${avgApiCalls.toFixed(0)}`);
    console.log(`   ├─ Average Memory Usage: ${avgMemory.toFixed(2)} MB`);
    console.log(`   └─ Cost per Finding: $${(totalCost / totalIssues).toFixed(5)}`);

    // Save detailed report
    this.saveDetailedReport();

    console.log('\n═══════════════════════════════════════════════════════════════════');
    console.log('✅ Analysis Complete!');
    console.log('═══════════════════════════════════════════════════════════════════');
  }

  /**
   * Save detailed report to file
   */
  private saveDetailedReport(): void {
    const reportPath = path.join(__dirname, '../test-results/orchestrated-analysis-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalPRs: this.results.length,
        totalIssues: this.results.reduce((sum, r) => sum + r.result.summary.totalIssues, 0),
        totalCritical: this.results.reduce((sum, r) => sum + r.result.summary.criticalIssues, 0),
        totalExecutionTime: this.results.reduce((sum, r) => sum + r.executionTime, 0),
        totalCost: this.results.reduce((sum, r) => sum + r.result.cost.totalCost, 0)
      },
      details: this.results
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Detailed report saved to: ${reportPath}`);
  }
}

// Run the analysis
async function main() {
  const analyzer = new OrchestratedPRAnalyzer();
  await analyzer.analyzeAllPRs();
}

main().catch(console.error);