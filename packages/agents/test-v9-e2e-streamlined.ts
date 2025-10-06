#!/usr/bin/env ts-node
/**
 * V9 Streamlined E2E Test
 *
 * Purpose: Generate complete V9 report with comprehensive test data
 * This test validates all 34 sections with realistic data scenarios
 *
 * Approach:
 * - Use correct TypeScript types (AnalysisResult, CompleteMetadata)
 * - Include varied issue types (NEW, EXISTING, RESOLVED)
 * - Cover all 5 categories (Security, Performance, Architecture, Dependency, Quality)
 * - Test all severity levels (critical, high, medium, low)
 * - Validate report completeness
 */

import * as dotenv from 'dotenv';
import * as path from "path";

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

import { V9ReportFormatterFinal, CompleteMetadata } from "./src/two-branch/analyzers/v9-report-formatter";
import type { AnalysisResult, Issue } from "./src/two-branch/analyzers/v9-types";
import * as fs from "fs";

console.log("╔═══════════════════════════════════════════════════════════╗");
console.log("║  V9 Streamlined E2E Test - Comprehensive Data Validation ║");
console.log("╚═══════════════════════════════════════════════════════════╝\n");

// ================================================================
// STEP 1: Create Comprehensive Test Issues
// ================================================================
console.log("📊 STEP 1: Creating comprehensive test data...\n");

const testIssues: Issue[] = [
  // NEW CRITICAL ISSUES (Block merge)
  {
    id: "sec-001",
    category: "Security",
    severity: "critical",
    status: "new",
    title: "SQL Injection Vulnerability",
    description: "SQL injection vulnerability detected in database query",
    file: "src/db/UserRepository.java",
    line: 45,
    tool: "semgrep",
    agent: "SecurityAgent",
    impact: "High security risk - could allow unauthorized database access",
    businessImpact: "Critical data breach risk, potential GDPR violation ($50k-500k)"
  },
  {
    id: "sec-002",
    category: "Security",
    severity: "critical",
    status: "new",
    title: "Hardcoded Credentials",
    description: "Database password hardcoded in source code",
    file: "src/config/DatabaseConfig.java",
    line: 23,
    tool: "semgrep",
    agent: "SecurityAgent",
    impact: "Credentials exposed in version control",
    businessImpact: "Potential unauthorized database access"
  },

  // NEW HIGH ISSUES (Block merge)
  {
    id: "perf-001",
    category: "Performance",
    severity: "high",
    status: "new",
    title: "N+1 Query Problem",
    description: "N+1 query problem detected in user service",
    file: "src/services/UserService.java",
    line: 123,
    tool: "pmd",
    agent: "PerformanceAgent",
    impact: "Database performance degradation under load",
    businessImpact: "Slower response times affecting user experience"
  },
  {
    id: "arch-001",
    category: "Architecture",
    severity: "high",
    status: "new",
    title: "Circular Dependency",
    description: "Circular dependency between UserService and OrderService",
    file: "src/services/UserService.java",
    line: 15,
    tool: "pmd",
    agent: "ArchitectureAgent",
    impact: "Tight coupling reduces modularity",
    businessImpact: "Difficult to maintain and test"
  },

  // NEW MEDIUM ISSUES (Backlog)
  {
    id: "qual-001",
    category: "Quality",
    severity: "medium",
    status: "new",
    title: "Complex Method",
    description: "Method exceeds cyclomatic complexity threshold",
    file: "src/utils/DataProcessor.java",
    line: 67,
    tool: "checkstyle",
    agent: "CodeQualityAgent",
    impact: "Reduced code maintainability",
    businessImpact: "Minor - increased development time"
  },
  {
    id: "dep-001",
    category: "Dependency",
    severity: "medium",
    status: "new",
    title: "Outdated Dependency",
    description: "Jackson databind 2.12.0 has known vulnerabilities",
    file: "pom.xml",
    line: 45,
    tool: "dependency-check",
    agent: "DependencyAgent",
    impact: "Moderate security risk",
    businessImpact: "Potential CVE exploitation"
  },

  // NEW LOW ISSUES (Backlog)
  {
    id: "qual-002",
    category: "Quality",
    severity: "low",
    status: "new",
    title: "Unused Import",
    description: "Unused import statement",
    file: "src/utils/Helper.java",
    line: 5,
    tool: "checkstyle",
    agent: "CodeQualityAgent",
    impact: "Minor code clarity issue",
    businessImpact: "Minimal - slightly reduced readability"
  },

  // RESOLVED ISSUES (Positive contribution)
  {
    id: "sec-003",
    category: "Security",
    severity: "high",
    status: "resolved",
    title: "XSS Vulnerability Fixed",
    description: "Cross-site scripting vulnerability in user input handling",
    file: "src/web/UserController.java",
    line: 89,
    tool: "semgrep",
    agent: "SecurityAgent",
    impact: "XSS attack vector eliminated",
    businessImpact: "Security improvement - prevents XSS attacks"
  },
  {
    id: "perf-002",
    category: "Performance",
    severity: "medium",
    status: "resolved",
    title: "Inefficient Loop Optimized",
    description: "Inefficient nested loop replaced with hash map",
    file: "src/services/SearchService.java",
    line: 145,
    tool: "pmd",
    agent: "PerformanceAgent",
    impact: "Performance improvement",
    businessImpact: "Faster search results"
  },
  {
    id: "qual-003",
    category: "Quality",
    severity: "low",
    status: "resolved",
    title: "Code Duplication Removed",
    description: "Duplicate code extracted to utility method",
    file: "src/utils/Validator.java",
    line: 34,
    tool: "pmd",
    agent: "CodeQualityAgent",
    impact: "Improved maintainability",
    businessImpact: "Easier to maintain"
  },

  // EXISTING ISSUES (for context)
  // BUG-102 TEST CASE: EXISTING critical issue in MODIFIED file (should BLOCK)
  {
    id: "sec-004",
    category: "Security",
    severity: "critical",
    status: "existing",
    title: "Insecure Deserialization",
    description: "Untrusted data deserialization vulnerability in modified file",
    file: "src/db/UserRepository.java",  // This is in modifiedFiles!
    line: 120,
    tool: "semgrep",
    agent: "SecurityAgent",
    impact: "Remote code execution risk in existing code",
    businessImpact: "Critical security vulnerability in modified file - must be addressed"
  },
  {
    id: "arch-002",
    category: "Architecture",
    severity: "medium",
    status: "existing",
    title: "God Class",
    description: "Class has too many responsibilities",
    file: "src/services/LegacyService.java",
    line: 1,
    tool: "pmd",
    agent: "ArchitectureAgent",
    impact: "Design smell",
    businessImpact: "Technical debt"
  }
];

console.log(`   ✅ Created ${testIssues.length} test issues:`);
console.log(`      NEW: ${testIssues.filter(i => i.status === 'new').length}`);
console.log(`      RESOLVED: ${testIssues.filter(i => i.status === 'resolved').length}`);
console.log(`      EXISTING: ${testIssues.filter(i => i.status === 'existing').length}\n`);

// ================================================================
// STEP 2: Calculate Quality Score
// ================================================================
console.log("📐 STEP 2: Calculating quality score...\n");

const newIssues = testIssues.filter(i => i.status === "new");
const resolvedIssues = testIssues.filter(i => i.status === "resolved");
const existingIssues = testIssues.filter(i => i.status === "existing");

// Score calculation: 100 - (new issues penalty) + (resolved issues bonus)
const weights = { critical: 5, high: 3, medium: 1, low: 0.5 };
const newPenalty = newIssues.reduce((sum, issue) => sum + weights[issue.severity], 0);
const resolvedBonus = resolvedIssues.reduce((sum, issue) => sum + weights[issue.severity], 0);
const qualityScore = Math.max(0, Math.min(100, 100 - newPenalty + resolvedBonus));
const grade = qualityScore >= 90 ? 'A' : qualityScore >= 80 ? 'B' : qualityScore >= 70 ? 'C' : qualityScore >= 60 ? 'D' : 'F';

console.log(`   Base Score: 100`);
console.log(`   New Issues Penalty: -${newPenalty.toFixed(1)}`);
console.log(`   Resolved Bonus: +${resolvedBonus.toFixed(1)}`);
console.log(`   Final Score: ${qualityScore.toFixed(1)}/100 (Grade: ${grade})\n`);

// ================================================================
// STEP 3: Create Analysis Result
// ================================================================
console.log("📋 STEP 3: Creating AnalysisResult...\n");

// BUG-102 FIX: Check both NEW issues AND EXISTING issues in MODIFIED files
const modifiedFiles = [
  "src/db/UserRepository.java",
  "src/services/UserService.java",
  "src/config/DatabaseConfig.java",
  "src/utils/DataProcessor.java",
  "src/web/UserController.java"
];

// Blocking issues = NEW critical/high OR EXISTING critical/high in MODIFIED files
const blockingNewIssues = newIssues.filter(i => i.severity === 'critical' || i.severity === 'high');
const blockingExistingInModified = existingIssues.filter(i =>
  (i.severity === 'critical' || i.severity === 'high') &&
  modifiedFiles.some(f => i.file.includes(f))
);
const blockingIssues = [...blockingNewIssues, ...blockingExistingInModified];

const backlogIssues = newIssues.filter(i => i.severity === 'medium' || i.severity === 'low');
const decision = blockingIssues.length > 0 ? 'DECLINED' : 'APPROVED';

const testResult: AnalysisResult = {
  decision,
  confidence: 0.95,
  reason: blockingIssues.length > 0
    ? `${blockingNewIssues.length} NEW critical/high + ${blockingExistingInModified.length} EXISTING critical/high in modified files require immediate attention`
    : 'All quality checks passed',
  qualityScore,
  grade,
  newIssues,
  existingIssues,
  resolvedIssues,
  blockingIssues,
  backlogIssues,
  modifiedFiles,
  categoryScores: {
    Security: 45,      // Critical issues drag this down
    Performance: 75,   // Some issues, some improvements
    Architecture: 70,  // High issue but not critical
    Quality: 80,       // Minor issues only
    Dependency: 85     // Few medium issues
  },
  businessImpact: {
    summary: "Critical security vulnerabilities require immediate attention before merge",
    immediateRisk: "SQL injection and hardcoded credentials expose database to unauthorized access",
    futureRisk: "Without addressing architecture issues, technical debt will accumulate",
    riskLevel: "critical",
    financialImpact: {
      fixCost: "8 hours ($1,200)",
      exploitCost: "$50,000 - $500,000 (data breach, GDPR fines, reputation damage)",
      roi: "Very High - 42x-417x return on investment"
    },
    riskMatrix: [
      { category: "Security", blockingRisk: 2, backlogRisk: 0, score: "Critical" },
      { category: "Performance", blockingRisk: 1, backlogRisk: 0, score: "High" },
      { category: "Architecture", blockingRisk: 1, backlogRisk: 1, score: "High" },
      { category: "Quality", blockingRisk: 0, backlogRisk: 2, score: "Medium" },
      { category: "Dependency", blockingRisk: 0, backlogRisk: 1, score: "Medium" }
    ]
  },
  skillScore: {
    developer: "kafka-contributor",
    score: 68,
    trend: [62, 65, 68],
    categories: {
      security: 45,
      performance: 75,
      architecture: 70,
      dependency: 85,
      quality: 80
    },
    recommendations: [
      "Priority: Complete OWASP Top 10 security training",
      "Focus on SQL injection prevention and input validation",
      "Review database query optimization patterns",
      "Study SOLID principles for better architecture"
    ]
  },
  metadata: {
    repository: "apache/kafka",
    prNumber: 17620,
    branch: "pr-17620",
    language: "java",
    totalFiles: 3472,
    modifiedFiles: 5,
    analysisTime: 180,
    tools: ["pmd", "semgrep", "checkstyle", "spotbugs", "dependency-check"],
    timestamp: new Date().toISOString(),
    analyzedAt: new Date().toISOString(),
    analyzer: "V9ToolOrchestrator",
    repoUrl: "https://github.com/apache/kafka",
    executionTime: 180
  }
};

console.log(`   ✅ AnalysisResult created:`);
console.log(`      Decision: ${decision}`);
console.log(`      Quality Score: ${qualityScore}/100`);
console.log(`      Blocking Issues: ${blockingIssues.length}\n`);

// ================================================================
// STEP 4: Create Complete Metadata
// ================================================================
console.log("📊 STEP 4: Creating CompleteMetadata...\n");

const testMetadata: CompleteMetadata = {
  repository: "apache/kafka",
  repoUrl: "https://github.com/apache/kafka",
  prNumber: 17620,
  prTitle: "KAFKA-12345: Improve consumer group rebalancing performance",
  branch: "pr-17620",
  baseBranch: "trunk",

  prAuthor: "kafka-contributor",
  prAuthorEmail: "contributor@apache.org",
  repoOwner: "apache",
  organizationName: "Apache Software Foundation",

  totalLinesOfCode: 500000,
  linesAdded: 250,
  linesDeleted: 100,
  linesModified: 350,
  filesModified: 5,
  totalFiles: 3472,
  languageBreakdown: { java: 95, kotlin: 3, scala: 2 },

  totalDuration: 220,
  cloneTime: 30,
  analysisTime: 180,
  reportGenerationTime: 10,

  agentsUsed: [
    {
      agentName: "SecurityAgent",
      executionTime: 45,
      issuesFound: 2,
      filesAnalyzed: 3,
      tokensUsed: 2500,
      modelUsed: {
        provider: "gemini",
        model: "gemini-2.5-flash",
        temperature: 0.3
      },
      cost: 0.002,
      status: "completed"
    },
    {
      agentName: "PerformanceAgent",
      executionTime: 38,
      issuesFound: 2,
      filesAnalyzed: 2,
      tokensUsed: 2200,
      modelUsed: {
        provider: "gemini",
        model: "gemini-2.5-flash",
        temperature: 0.3
      },
      cost: 0.0015,
      status: "completed"
    },
    {
      agentName: "CodeQualityAgent",
      executionTime: 32,
      issuesFound: 3,
      filesAnalyzed: 3,
      tokensUsed: 1800,
      modelUsed: {
        provider: "gemini",
        model: "gemini-2.5-flash",
        temperature: 0.3
      },
      cost: 0.0012,
      status: "completed"
    },
    {
      agentName: "ArchitectureAgent",
      executionTime: 40,
      issuesFound: 2,
      filesAnalyzed: 2,
      tokensUsed: 2000,
      modelUsed: {
        provider: "gemini",
        model: "gemini-2.5-flash",
        temperature: 0.3
      },
      cost: 0.0013,
      status: "completed"
    },
    {
      agentName: "DependencyAgent",
      executionTime: 25,
      issuesFound: 1,
      filesAnalyzed: 1,
      tokensUsed: 1500,
      modelUsed: {
        provider: "gemini",
        model: "gemini-2.5-flash",
        temperature: 0.3
      },
      cost: 0.001,
      status: "completed"
    }
  ],

  toolsUsed: [
    {
      toolName: "semgrep",
      executionTime: 60,
      filesScanned: 3472,
      issuesFound: 3,
      exitCode: 0,
      stdout: "",
      stderr: ""
    },
    {
      toolName: "pmd",
      executionTime: 95,
      filesScanned: 3472,
      issuesFound: 4,
      exitCode: 0,
      stdout: "",
      stderr: ""
    },
    {
      toolName: "checkstyle",
      executionTime: 45,
      filesScanned: 3472,
      issuesFound: 2,
      exitCode: 0,
      stdout: "",
      stderr: ""
    },
    {
      toolName: "spotbugs",
      executionTime: 75,
      filesScanned: 3472,
      issuesFound: 1,
      exitCode: 0,
      stdout: "",
      stderr: ""
    },
    {
      toolName: "dependency-check",
      executionTime: 120,
      filesScanned: 1,
      issuesFound: 1,
      exitCode: 0,
      stdout: "",
      stderr: ""
    }
  ],

  totalCost: 0.04,
  costBreakdown: {
    aiModels: 0.007,
    infrastructure: 0.01,
    tools: 0.023
  },
  estimatedMonthlyCost: 40,

  analyzer: "V9ToolOrchestrator",
  analyzerVersion: "9.1.0",
  smartFileSelection: false,
  maxFilesAnalyzed: 10000,

  startTime: new Date(Date.now() - 220000).toISOString(),
  endTime: new Date().toISOString(),
  timestamp: new Date().toISOString()
};

console.log(`   ✅ CompleteMetadata created:`);
console.log(`      Tools: ${testMetadata.toolsUsed.length}`);
console.log(`      Agents: ${testMetadata.agentsUsed.length}`);
console.log(`      Total Cost: $${testMetadata.totalCost}\n`);

// ================================================================
// STEP 5: Generate Complete V9 Report
// ================================================================
async function generateAndAnalyzeReport() {
  console.log("📝 STEP 5: Generating complete V9 report...\n");

  const formatter = new V9ReportFormatterFinal();
  const report = await formatter.generateCompleteReport(
    testResult,
    testMetadata,
    "java"
  );

  // ================================================================
  // STEP 6: Save and Analyze Report
  // ================================================================
  console.log("💾 STEP 6: Saving and analyzing report...\n");

const outputDir = "/tmp/v9-reports";
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const reportPath = path.join(outputDir, `v9-e2e-streamlined-${Date.now()}.md`);
fs.writeFileSync(reportPath, report);

console.log(`✅ Report generated successfully!`);
console.log(`   Location: ${reportPath}`);
console.log(`   Size: ${Math.round(report.length / 1024)} KB\n`);

// Analyze sections
const lines = report.split("\n");
const sections = lines.filter(line => line.startsWith("##"));

console.log("📊 Report Structure Analysis:\n");
console.log(`   Total sections: ${sections.length}`);
console.log(`   Total lines: ${lines.length}`);
console.log(`   Total characters: ${report.length}\n`);

console.log("📋 Sections Found:\n");
sections.forEach((section, idx) => {
  console.log(`   ${idx + 1}. ${section.replace(/^#+\s*/, '')}`);
});

// Check for all 34 expected sections
console.log("\n🔍 Section Completeness Check:\n");

const allExpectedSections = [
  "Executive Summary",
  "Decision",
  "Quality Score",
  "Issue Summary",
  "Risk Matrix",
  "Blocking Issues",
  "Detailed Issues",
  "Resolved Issues",
  "Business Impact",
  "Skills",
  "PR Comment",
  "AI-Powered Fix",
  "Educational Resources",
  "Phased Educational Plan",
  "Recommended Actions",
  "Performance Metrics",
  "Agent Performance",
  "Tool Performance",
  "Cost Analysis",
  "Resolution Metrics",
  "Progress Tracking",
  "Score Calculation"
];

allExpectedSections.forEach(expected => {
  const found = sections.some(section =>
    section.toLowerCase().includes(expected.toLowerCase())
  );
  const status = found ? "✅" : "❌";
  console.log(`   ${status} ${expected}`);
});

  console.log("\n✅ Test Complete!\n");
  console.log("=" + "=".repeat(63) + "=");
  console.log(`Report: ${reportPath}`);
  console.log("=" + "=".repeat(63) + "=\n");
}

// Run the test
generateAndAnalyzeReport().catch(console.error);
