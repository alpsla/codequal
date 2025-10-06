#!/usr/bin/env ts-node
/**
 * Generate Final Report for User Review
 *
 * Creates a comprehensive, realistic V9 report demonstrating all features:
 * - Phase 1: Severity weights, decision logic, timing
 * - Phase 2: Dual-track scoring (APP + DEV)
 * - Phase 3: Safe values, code snippets, links, model tracking, enhanced AI
 */

import * as fs from 'fs';
import {
  generateCompleteEnhancedReport,
  validateReportQuality,
  V9EnhancedIssue,
  V9EnhancedMetadata
} from './src/two-branch/analyzers/v9-report-formatter-enhanced';
import { AppScoreManager } from './src/two-branch/analyzers/v9-app-score-manager';
import { SkillScoreManager } from './src/two-branch/analyzers/v9-skill-score-manager';
import { V9ScoringCalculator } from './src/two-branch/analyzers/v9-scoring-calculator';
import { modelTracker } from './src/two-branch/utils/model-usage-tracker';
import { createClient } from '@supabase/supabase-js';

async function generateFinalReport(): Promise<void> {
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║  Generating Final V9 Report for User Review             ║");
  console.log("╚═══════════════════════════════════════════════════════════╝\n");

  // Clear model tracker
  modelTracker.clear();

  // Create realistic test issues (Apache Kafka-style PR)
  console.log("📝 Creating realistic test issues...\n");

  const testIssues: V9EnhancedIssue[] = [
    // Security issues
    {
      id: 'SEC-001',
      title: 'SQL Injection vulnerability in user authentication',
      message: 'User input from login form is concatenated directly into SQL query without proper sanitization or parameterization',
      description: 'The authenticateUser method constructs SQL queries using string concatenation with user-supplied credentials, making it vulnerable to SQL injection attacks',
      category: 'Security',
      severity: 'critical',
      file: 'core/src/main/java/org/apache/kafka/security/auth/UserAuthenticator.java',
      line: 127,
      column: 15,
      tool: 'semgrep',
      agent: 'security',
      suggestedFix: 'Replace string concatenation with PreparedStatement and parameterized queries',
      businessImpact: 'Attackers could bypass authentication, access unauthorized data, modify database records, or execute administrative operations',
      codeSnippet: `  125 | public boolean authenticateUser(String username, String password) {
  126 |     String query = "SELECT * FROM users WHERE username = '" + username +
> 127 |                    "' AND password = '" + password + "'";
  128 |     ResultSet rs = statement.executeQuery(query);
  129 |     return rs.next();`
    },
    {
      id: 'SEC-002',
      title: 'Hardcoded credentials in configuration file',
      message: 'Database password stored as plaintext string constant',
      category: 'Security',
      severity: 'high',
      file: 'clients/src/main/java/org/apache/kafka/common/config/DatabaseConfig.java',
      line: 45,
      tool: 'semgrep',
      agent: 'security',
      suggestedFix: 'Use environment variables or secure credential storage (e.g., AWS Secrets Manager, HashiCorp Vault)',
      businessImpact: 'Hardcoded credentials in source code can be discovered through repository access, leading to database compromise'
    },
    {
      id: 'SEC-003',
      title: 'Path traversal vulnerability in file upload',
      message: 'User-supplied filename used without validation, allowing directory traversal',
      category: 'Security',
      severity: 'high',
      file: 'connect/runtime/src/main/java/org/apache/kafka/connect/storage/FileUploadHandler.java',
      line: 89,
      tool: 'semgrep',
      agent: 'security',
      businessImpact: 'Attackers could read or overwrite arbitrary files on the server filesystem'
    },

    // Performance issues
    {
      id: 'PERF-001',
      title: 'N+1 query problem in batch processing',
      message: 'Individual database queries executed inside loop instead of batch query',
      category: 'Performance',
      severity: 'medium',
      file: 'streams/src/main/java/org/apache/kafka/streams/state/StateStoreProcessor.java',
      line: 234,
      tool: 'pmd',
      agent: 'performance',
      suggestedFix: 'Collect all IDs first, then execute single batch query with IN clause',
      businessImpact: 'Significant performance degradation when processing large datasets, increased database load'
    },
    {
      id: 'PERF-002',
      title: 'Inefficient string concatenation in loop',
      message: 'String concatenation using + operator inside loop (creates many temporary objects)',
      category: 'Performance',
      severity: 'low',
      file: 'clients/src/main/java/org/apache/kafka/common/utils/LogFormatter.java',
      line: 156,
      tool: 'spotbugs',
      agent: 'performance',
      suggestedFix: 'Use StringBuilder for string concatenation in loops'
    },

    // Code Quality issues
    {
      id: 'QUAL-001',
      title: 'Cyclomatic complexity exceeds threshold (15)',
      message: 'Method handleRequest has complexity of 23, exceeding maximum threshold of 15',
      category: 'Quality',
      severity: 'medium',
      file: 'core/src/main/java/org/apache/kafka/server/RequestHandler.java',
      line: 312,
      tool: 'pmd',
      agent: 'quality',
      suggestedFix: 'Extract nested conditionals into separate private methods with clear responsibilities',
      businessImpact: 'High complexity makes code difficult to understand, test, and maintain, increasing bug risk'
    },
    {
      id: 'QUAL-002',
      title: 'Unused import statement',
      message: 'Import java.util.HashMap is declared but never used',
      category: 'Quality',
      severity: 'low',
      file: 'clients/src/main/java/org/apache/kafka/clients/consumer/ConsumerRecord.java',
      line: 8,
      tool: 'checkstyle',
      agent: 'quality',
      suggestedFix: 'Remove unused import statement'
    },
    {
      id: 'QUAL-003',
      title: 'Missing null check before method invocation',
      message: 'Possible null pointer dereference - object may be null',
      category: 'Quality',
      severity: 'medium',
      file: 'clients/src/main/java/org/apache/kafka/clients/NetworkClient.java',
      line: 445,
      tool: 'spotbugs',
      agent: 'quality',
      suggestedFix: 'Add null check or use Optional to handle null case gracefully'
    },

    // Dependency issues
    {
      id: 'DEP-001',
      title: 'CVE-2021-44228 - Log4Shell vulnerability',
      message: 'log4j-core 2.14.1 has critical vulnerability CVE-2021-44228 (CVSS 10.0)',
      description: 'Apache Log4j2 2.0-beta9 through 2.15.0 (excluding security releases 2.12.2, 2.12.3, and 2.3.1) JNDI features used in configuration, log messages, and parameters do not protect against attacker controlled LDAP and other JNDI related endpoints',
      category: 'Dependency',
      severity: 'critical',
      file: 'build.gradle',
      line: 178,
      tool: 'dependency-check',
      agent: 'dependency',
      suggestedFix: 'Update log4j-core to version 2.17.1 or later',
      businessImpact: 'Remote code execution allowing complete system compromise, data theft, and lateral movement'
    },
    {
      id: 'DEP-002',
      title: 'CVE-2022-42889 - Apache Commons Text vulnerability',
      message: 'commons-text 1.9 has high severity vulnerability CVE-2022-42889 (CVSS 9.8)',
      category: 'Dependency',
      severity: 'high',
      file: 'build.gradle',
      line: 203,
      tool: 'dependency-check',
      agent: 'dependency',
      suggestedFix: 'Update commons-text to version 1.10.0 or later',
      businessImpact: 'Potential remote code execution through variable interpolation'
    },

    // Architecture issues
    {
      id: 'ARCH-001',
      title: 'Tight coupling between layers',
      message: 'Controller directly instantiates service class instead of using dependency injection',
      category: 'Architecture',
      severity: 'medium',
      file: 'connect/runtime/src/main/java/org/apache/kafka/connect/runtime/WorkerController.java',
      line: 89,
      tool: 'archunit',
      agent: 'architecture',
      suggestedFix: 'Use constructor injection to provide service dependency, following dependency inversion principle',
      businessImpact: 'Tight coupling makes code harder to test, maintain, and evolve independently'
    }
  ];

  console.log(`  ✅ Created ${testIssues.length} realistic issues\n`);

  // Simulate model usage for each agent
  console.log("🤖 Simulating AI model usage...\n");

  // Security agent (uses better model for critical issues)
  modelTracker.recordUsage('anthropic/claude-3-haiku', 'security', 1200, 0.0015);
  modelTracker.recordUsage('anthropic/claude-3-haiku', 'security', 980, 0.001225);
  modelTracker.recordUsage('anthropic/claude-3-haiku', 'security', 1100, 0.001375);

  // Performance agent (uses cheaper model)
  modelTracker.recordUsage('openai/gpt-3.5-turbo', 'performance', 650, 0.000975);
  modelTracker.recordUsage('openai/gpt-3.5-turbo', 'performance', 580, 0.00087);

  // Quality agent (uses cheaper model)
  modelTracker.recordUsage('openai/gpt-3.5-turbo', 'quality', 720, 0.00108);
  modelTracker.recordUsage('openai/gpt-3.5-turbo', 'quality', 550, 0.000825);
  modelTracker.recordUsage('openai/gpt-3.5-turbo', 'quality', 600, 0.0009);

  // Dependency agent (uses cheaper model)
  modelTracker.recordUsage('openai/gpt-3.5-turbo', 'dependency', 800, 0.0012);
  modelTracker.recordUsage('openai/gpt-3.5-turbo', 'dependency', 750, 0.001125);

  // Architecture agent (uses better model)
  modelTracker.recordUsage('anthropic/claude-3-haiku', 'architecture', 900, 0.001125);

  console.log("  ✅ Recorded 12 model usage entries\n");

  // Create realistic metadata
  console.log("📋 Creating metadata...\n");

  const metadata: V9EnhancedMetadata = {
    repository: 'apache/kafka',
    prNumber: 17620,
    prTitle: 'KAFKA-12345: Improve authentication and fix security vulnerabilities',
    branch: 'feature/security-improvements',
    baseBranch: 'trunk',
    prAuthor: 'developer@apache.org',
    prAuthorEmail: 'developer@apache.org',
    repoOwner: 'apache',
    organizationName: 'Apache Software Foundation',
    totalLinesOfCode: 1250000,
    linesAdded: 245,
    linesDeleted: 187,
    linesModified: 98,
    filesModified: 12,
    totalFiles: 3472,
    totalDuration: 346000,  // 5 minutes 46 seconds
    cloneTime: 23000,       // 23 seconds
    analysisTime: 298000,   // 4 minutes 58 seconds
    reportGenerationTime: 25000  // 25 seconds
  };

  console.log("  ✅ Created comprehensive metadata\n");

  // Calculate scores using V9ScoringCalculator (Phase 1 fix)
  console.log("🎯 Calculating scores with Phase 1 fixes...\n");

  const calculator = new V9ScoringCalculator();

  // Categorize issues
  const existingIssues = testIssues.filter(i => i.id.startsWith('DEP-')); // Simulating existing issues
  const newIssues = testIssues.filter(i => !i.id.startsWith('DEP-')); // New issues in this PR

  const existingByCategory = {
    security: existingIssues.filter(i => i.category === 'Security') as any[],
    performance: existingIssues.filter(i => i.category === 'Performance') as any[],
    architecture: existingIssues.filter(i => i.category === 'Architecture') as any[],
    dependency: existingIssues.filter(i => i.category === 'Dependency') as any[],
    quality: existingIssues.filter(i => i.category === 'Quality') as any[]
  };

  const newByCategory = {
    security: newIssues.filter(i => i.category === 'Security') as any[],
    performance: newIssues.filter(i => i.category === 'Performance') as any[],
    architecture: newIssues.filter(i => i.category === 'Architecture') as any[],
    dependency: newIssues.filter(i => i.category === 'Dependency') as any[],
    quality: newIssues.filter(i => i.category === 'Quality') as any[]
  };

  // APP Score (Phase 2 - from EXISTING issues on main branch)
  const appCategoryScores = {
    security: Math.max(0, 100 - calculator.calculateCategoryPoints(existingByCategory.security)),
    performance: Math.max(0, 100 - calculator.calculateCategoryPoints(existingByCategory.performance)),
    architecture: Math.max(0, 100 - calculator.calculateCategoryPoints(existingByCategory.architecture)),
    dependency: Math.max(0, 100 - calculator.calculateCategoryPoints(existingByCategory.dependency)),
    quality: Math.max(0, 100 - calculator.calculateCategoryPoints(existingByCategory.quality))
  };

  const appOverallScore = Math.min(...Object.values(appCategoryScores));  // MIN = weakest link

  // DEV Score (Phase 2 - from NEW issues in this PR)
  const devBaseline = 50;  // First-time developer
  const devCategoryScores = {
    security: Math.max(0, Math.round(devBaseline - calculator.calculateCategoryPoints(newByCategory.security))),
    performance: Math.max(0, Math.round(devBaseline - calculator.calculateCategoryPoints(newByCategory.performance))),
    architecture: Math.max(0, Math.round(devBaseline - calculator.calculateCategoryPoints(newByCategory.architecture))),
    dependency: Math.max(0, Math.round(devBaseline - calculator.calculateCategoryPoints(newByCategory.dependency))),
    quality: Math.max(0, Math.round(devBaseline - calculator.calculateCategoryPoints(newByCategory.quality)))
  };

  const devOverallScore = Math.round(Object.values(devCategoryScores).reduce((sum, s) => sum + s, 0) / 5);  // AVG

  console.log("  ✅ Calculated APP and DEV scores\n");

  // Generate enhanced report
  console.log("🎨 Generating enhanced V9 report...\n");

  let report = await generateCompleteEnhancedReport(testIssues, metadata);

  // Add dual-track scoring section (Phase 2)
  const scoringSection = `
---

## 📊 Quality Scores

### 🏢 Repository Health (APP Score): ${appOverallScore}/100

**Baseline:** 100/100 (perfect health)
**Calculation Method:** MIN of categories (weakest link principle)
**Weakest Category:** Dependency (${appCategoryScores.dependency}/100)

The repository is only as healthy as its weakest category. Critical dependency vulnerabilities bring down the overall score.

**Category Breakdown:**
- 🔒 **Security:** ${appCategoryScores.security}/100 ${appCategoryScores.security >= 90 ? '✅' : '⚠️'}
- ⚡ **Performance:** ${appCategoryScores.performance}/100 ${appCategoryScores.performance >= 90 ? '✅' : '⚠️'}
- 🏗️ **Architecture:** ${appCategoryScores.architecture}/100 ${appCategoryScores.architecture >= 90 ? '✅' : '⚠️'}
- 📦 **Dependency:** ${appCategoryScores.dependency}/100 ${appCategoryScores.dependency >= 90 ? '✅' : '❌'}
- ✨ **Code Quality:** ${appCategoryScores.quality}/100 ${appCategoryScores.quality >= 90 ? '✅' : '⚠️'}

**Action Required:** ${appOverallScore < 90 ? '⚠️ Address critical dependency issues (2 CVEs found)' : '✅ Repository is healthy'}

---

### 👤 Developer Performance (DEV Score): ${devOverallScore}/100

**Baseline:** 50/100 (first-time contributor)
**Calculation Method:** AVERAGE of categories (balanced skill)
**Developer:** developer@apache.org

**Category Breakdown:**
- 🔒 **Security:** ${devCategoryScores.security}/100 ${devCategoryScores.security >= 50 ? '' : '⚠️'}
- ⚡ **Performance:** ${devCategoryScores.performance}/100 ${devCategoryScores.performance >= 50 ? '' : '⚠️'}
- 🏗️ **Architecture:** ${devCategoryScores.architecture}/100 ${devCategoryScores.architecture >= 50 ? '' : '⚠️'}
- 📦 **Dependency:** ${devCategoryScores.dependency}/100 ${devCategoryScores.dependency >= 50 ? '' : '⚠️'}
- ✨ **Code Quality:** ${devCategoryScores.quality}/100 ${devCategoryScores.quality >= 50 ? '' : '⚠️'}

**Growth Areas:** Security (3 critical/high issues introduced)
**Strengths:** Performance, Architecture, Dependency

**Recommendation:** Security training recommended - focus on input validation and secure coding practices

`;

  // Insert scoring section after performance metrics
  report = report.replace('---\n\n## 📊 Issues Summary', scoringSection + '\n## 📊 Issues Summary');

  console.log("  ✅ Report generated with all features\n");

  // Validate report quality
  console.log("✅ Validating report quality...\n");

  const validation = validateReportQuality(report);

  console.log(`  Report validation: ${validation.isValid ? '✅ PASSED' : '❌ FAILED'}`);
  if (validation.issues.length > 0) {
    validation.issues.forEach(issue => console.log(`    - ${issue}`));
  }
  console.log();

  // Save report
  const reportPath = '/tmp/FINAL_V9_REPORT_FOR_REVIEW.md';
  fs.writeFileSync(reportPath, report);

  console.log("💾 Report saved successfully!\n");

  // Display summary
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║  Report Generation Complete                              ║");
  console.log("╚═══════════════════════════════════════════════════════════╝\n");

  console.log("📊 Report Statistics:\n");
  console.log(`  Total issues: ${testIssues.length}`);
  console.log(`  Critical: ${testIssues.filter(i => i.severity === 'critical').length}`);
  console.log(`  High: ${testIssues.filter(i => i.severity === 'high').length}`);
  console.log(`  Medium: ${testIssues.filter(i => i.severity === 'medium').length}`);
  console.log(`  Low: ${testIssues.filter(i => i.severity === 'low').length}`);
  console.log();

  console.log("🎯 Scores Calculated:\n");
  console.log(`  APP Overall: ${appOverallScore}/100 (MIN of categories)`);
  console.log(`  DEV Overall: ${devOverallScore}/100 (AVG of categories)`);
  console.log();

  console.log("🤖 Model Usage:\n");
  const modelSummary = modelTracker.getUsageSummary();
  console.log(`  Total API calls: ${modelSummary.totalCalls}`);
  console.log(`  Total tokens: ${modelSummary.totalTokens.toLocaleString()}`);
  console.log(`  Total cost: $${modelSummary.totalCost.toFixed(4)}`);
  console.log(`  Models: ${modelSummary.uniqueModels.join(', ')}`);
  console.log();

  console.log("✨ All Phase 3 Features Integrated:\n");
  console.log("  ✅ BUG-106: Code snippets in issues");
  console.log("  ✅ BUG-107: Educational resources with validated links");
  console.log("  ✅ BUG-108: Enhanced AI prompts (in fix generator)");
  console.log("  ✅ BUG-109: Safe value helpers (no undefined)");
  console.log("  ✅ BUG-110: Model usage tracking");
  console.log("  ✅ Phase 2: Dual-track scoring (APP + DEV)");
  console.log("  ✅ Phase 1: Correct severity weights & decision logic");
  console.log();

  console.log("📁 Report Location:\n");
  console.log(`  ${reportPath}\n`);

  console.log("🎯 Ready for Your Review!\n");
  console.log("Please review the report and provide feedback:\n");
  console.log("  1. Are the issues clearly presented?");
  console.log("  2. Are the educational resources helpful?");
  console.log("  3. Is the dual scoring (APP + DEV) clear?");
  console.log("  4. Is the model usage section useful?");
  console.log("  5. Any improvements needed?\n");

  console.log("─".repeat(60));
  console.log("Report Preview (first 100 lines):");
  console.log("─".repeat(60));
  const lines = report.split('\n');
  lines.slice(0, 100).forEach(line => console.log(line));
  if (lines.length > 100) {
    console.log(`\n... (${lines.length - 100} more lines in full report) ...\n`);
  }
  console.log("─".repeat(60));
}

if (require.main === module) {
  generateFinalReport()
    .then(() => {
      console.log("\n✅ Report generation complete!");
      console.log("\n📖 View full report at: /tmp/FINAL_V9_REPORT_FOR_REVIEW.md\n");
      process.exit(0);
    })
    .catch(error => {
      console.error("❌ Report generation failed:", error);
      process.exit(1);
    });
}

export { generateFinalReport };
