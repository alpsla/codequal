/**
 * Generate IDE-Compatible Reports Test
 *
 * Generates all IDE-compatible report formats:
 * - SARIF (GitHub Code Scanning, VS Code, JetBrains)
 * - GitLab Code Quality (GitLab MR integration)
 * - LSP Code Actions (Cursor, VS Code quick fixes)
 *
 * Usage:
 *   npx ts-node tests/integration/generate-ide-reports.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

import { SARIFGenerator } from '../../src/fix-agent/providers/sarif-generator';
import { GitLabCodeQualityGenerator, generateGitLabCIJobConfig } from '../../src/fix-agent/providers/gitlab-codequality-generator';
import { IDEProvider } from '../../src/fix-agent/providers/ide-provider';
import { FixReport, FixReportIssue, IssueSeverity, IssueCategory, IssueType, FixSource } from '../../src/fix-agent/types/fix-report-types';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

// Output directory
const OUTPUT_DIR = path.join(__dirname, 'test-outputs/ide-reports');

// Helper to generate issue hash
function generateIssueHash(issue: Partial<FixReportIssue>): string {
  const data = `${issue.filePath}:${issue.lineNumber}:${issue.ruleId}:${issue.tool}`;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
}

// Sample issues for testing (simulating real scan results)
function createSampleIssues(): FixReportIssue[] {
  const fixReportId = 'test-report-001';
  const now = new Date();

  return [
    // Java - PMD issue
    {
      id: 'java-001',
      fixReportId,
      issueHash: generateIssueHash({
        filePath: 'src/main/java/com/example/UserService.java',
        lineNumber: 45,
        ruleId: 'CollapsibleIfStatements',
        tool: 'pmd',
      }),
      ruleId: 'CollapsibleIfStatements',
      tool: 'pmd',
      severity: 'medium' as IssueSeverity,
      category: 'code_quality' as IssueCategory,
      issueType: 'new' as IssueType,
      filePath: 'src/main/java/com/example/UserService.java',
      lineNumber: 45,
      columnNumber: 5,
      message: 'These nested if statements could be combined',
      description: 'Collapsible if statements should be merged for readability',
      codeSnippet: `if (user != null) {
    if (user.isActive()) {
        return user;
    }
}`,
      fixAvailable: true,
      fixedCode: `if (user != null && user.isActive()) {
    return user;
}`,
      fixSource: 'pattern' as FixSource,
      fixConfidence: 0.95,
      isIntentionalUse: false,
      userSelected: false,
      createdAt: now,
    },
    // Java - Checkstyle issue
    {
      id: 'java-002',
      fixReportId,
      issueHash: generateIssueHash({
        filePath: 'src/main/java/com/example/Controller.java',
        lineNumber: 3,
        ruleId: 'com.puppycrawl.tools.checkstyle.checks.imports.AvoidStarImportCheck',
        tool: 'checkstyle',
      }),
      ruleId: 'com.puppycrawl.tools.checkstyle.checks.imports.AvoidStarImportCheck',
      tool: 'checkstyle',
      severity: 'low' as IssueSeverity,
      category: 'code_style' as IssueCategory,
      issueType: 'existing_rest' as IssueType,
      filePath: 'src/main/java/com/example/Controller.java',
      lineNumber: 3,
      columnNumber: 1,
      message: 'Using a star import is discouraged',
      description: 'Star imports make it unclear which classes are being used',
      codeSnippet: 'import java.util.*;',
      fixAvailable: true,
      fixedCode: 'import java.util.List;\nimport java.util.Map;',
      fixSource: 'pattern' as FixSource,
      fixConfidence: 0.90,
      isIntentionalUse: false,
      userSelected: false,
      createdAt: now,
    },
    // Python - Bandit security issue
    {
      id: 'python-001',
      fixReportId,
      issueHash: generateIssueHash({
        filePath: 'src/auth/config.py',
        lineNumber: 12,
        ruleId: 'hardcoded_password_string',
        tool: 'bandit',
      }),
      ruleId: 'hardcoded_password_string',
      tool: 'bandit',
      severity: 'high' as IssueSeverity,
      category: 'security' as IssueCategory,
      issueType: 'new' as IssueType,
      filePath: 'src/auth/config.py',
      lineNumber: 12,
      columnNumber: 1,
      message: 'Possible hardcoded password detected',
      description: 'Hardcoded passwords are a security risk',
      codeSnippet: 'password = "admin123"',
      fixAvailable: true,
      fixedCode: 'password = os.environ.get("DB_PASSWORD")',
      fixSource: 'pattern' as FixSource,
      fixConfidence: 0.88,
      isIntentionalUse: false,
      userSelected: false,
      createdAt: now,
    },
    // Python - Semgrep security issue (no fix)
    {
      id: 'python-002',
      fixReportId,
      issueHash: generateIssueHash({
        filePath: 'src/utils/dynamic.py',
        lineNumber: 28,
        ruleId: 'python.lang.security.audit.exec-detected.exec-detected',
        tool: 'semgrep',
      }),
      ruleId: 'python.lang.security.audit.exec-detected.exec-detected',
      tool: 'semgrep',
      severity: 'critical' as IssueSeverity,
      category: 'security' as IssueCategory,
      issueType: 'new' as IssueType,
      filePath: 'src/utils/dynamic.py',
      lineNumber: 28,
      columnNumber: 5,
      message: 'Detected use of exec() which can execute arbitrary code',
      description: 'exec() can lead to code injection vulnerabilities',
      codeSnippet: 'exec(user_input)',
      fixAvailable: false,
      isIntentionalUse: false,
      userSelected: false,
      createdAt: now,
    },
    // TypeScript - Express security issue
    {
      id: 'ts-001',
      fixReportId,
      issueHash: generateIssueHash({
        filePath: 'src/server/app.ts',
        lineNumber: 15,
        ruleId: 'javascript.express.security.audit.express-cookie-settings.express-cookie-session-no-secure',
        tool: 'semgrep',
      }),
      ruleId: 'javascript.express.security.audit.express-cookie-settings.express-cookie-session-no-secure',
      tool: 'semgrep',
      severity: 'medium' as IssueSeverity,
      category: 'security' as IssueCategory,
      issueType: 'existing_modified' as IssueType,
      filePath: 'src/server/app.ts',
      lineNumber: 15,
      columnNumber: 3,
      message: 'Cookie session without secure flag',
      description: 'Session cookies should have the secure flag set',
      codeSnippet: `app.use(session({
  secret: 'keyboard cat',
  cookie: { httpOnly: true }
}));`,
      fixAvailable: true,
      fixedCode: `app.use(session({
  secret: process.env.SESSION_SECRET,
  cookie: { httpOnly: true, secure: true, sameSite: 'strict' }
}));`,
      fixSource: 'pattern' as FixSource,
      fixConfidence: 0.92,
      isIntentionalUse: false,
      userSelected: false,
      createdAt: now,
    },
    // Dependency vulnerability
    {
      id: 'dep-001',
      fixReportId,
      issueHash: generateIssueHash({
        filePath: 'package.json',
        lineNumber: 15,
        ruleId: 'dependency-vulnerability',
        tool: 'npm-audit',
      }),
      ruleId: 'dependency-vulnerability',
      tool: 'npm-audit',
      severity: 'high' as IssueSeverity,
      category: 'dependency_vulnerability' as IssueCategory,
      issueType: 'new' as IssueType,
      filePath: 'package.json',
      lineNumber: 15,
      columnNumber: 5,
      message: 'lodash < 4.17.21 has prototype pollution vulnerability (CVE-2021-23337)',
      description: 'Upgrade lodash to version 4.17.21 or later',
      codeSnippet: '"lodash": "^4.17.15"',
      fixAvailable: true,
      fixedCode: '"lodash": "^4.17.21"',
      fixSource: 'tool_native' as FixSource,
      fixConfidence: 1.0,
      isIntentionalUse: false,
      userSelected: false,
      createdAt: now,
    },
  ];
}

// Sample fix report
function createSampleReport(): FixReport {
  return {
    id: 'test-report-001',
    repositoryUrl: 'https://github.com/example/sample-project',
    baseBranch: 'main',
    headBranch: 'feature/updates',
    prNumber: 42,
    userTier: 'pro',
    totalIssues: 6,
    fixableIssues: 5,
    autoFixedCount: 0,
    manualReviewCount: 5,
    intentionalUseCount: 0,
    apiCostUsd: 0.05,
    patternReuseCount: 4,
    status: 'pending',
    createdAt: new Date(),
    provider: 'github',
  };
}

async function loadPatternsFromSupabase(): Promise<number> {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { count } = await supabase
      .from('fix_patterns')
      .select('*', { count: 'exact', head: true });

    return count || 0;
  } catch (error) {
    console.log('  Warning: Could not connect to Supabase');
    return 0;
  }
}

async function generateReports() {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║          GENERATE IDE-COMPATIBLE REPORTS                                      ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Formats: SARIF, GitLab Code Quality, LSP Code Actions                        ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);

  // Create output directory
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Check pattern count
  console.log('Checking pattern database...');
  const patternCount = await loadPatternsFromSupabase();
  console.log(`   Found ${patternCount} patterns in Supabase\n`);

  // Create sample data
  console.log('Creating sample issues...');
  const issues = createSampleIssues();
  const report = createSampleReport();
  console.log(`   Created ${issues.length} sample issues\n`);

  // ========================================
  // 1. Generate SARIF Report
  // ========================================
  console.log('Generating SARIF report...');
  const sarifGenerator = new SARIFGenerator({
    toolName: 'CodeQual',
    toolVersion: '9.0.0',
    toolInformationUri: 'https://codequal.dev',
    includeCodeSnippets: true,
    includeFixSuggestions: true,
    generateFingerprints: true,
  });

  const sarifReport = sarifGenerator.generate(issues, {
    repository: report.repositoryUrl,
    prNumber: report.prNumber,
  });

  const sarifPath = path.join(OUTPUT_DIR, 'codequal-report.sarif.json');
  fs.writeFileSync(sarifPath, JSON.stringify(sarifReport, null, 2));
  console.log(`   SARIF report saved: ${sarifPath}`);
  console.log(`      - ${sarifReport.runs[0].results.length} results`);
  console.log(`      - ${sarifReport.runs[0].tool.driver.rules.length} rules\n`);

  // ========================================
  // 2. Generate GitLab Code Quality Report
  // ========================================
  console.log('Generating GitLab Code Quality report...');
  const gitlabGenerator = new GitLabCodeQualityGenerator({
    includeFixSuggestions: true,
    includeCodeSnippets: true,
    includeRemediationPoints: true,
  });

  const gitlabReport = gitlabGenerator.generate(issues);

  const gitlabPath = path.join(OUTPUT_DIR, 'gl-code-quality-report.json');
  fs.writeFileSync(gitlabPath, JSON.stringify(gitlabReport, null, 2));
  console.log(`   GitLab Code Quality report saved: ${gitlabPath}`);
  console.log(`      - ${gitlabReport.length} issues\n`);

  // Generate GitLab CI job config
  const gitlabCIConfig = generateGitLabCIJobConfig();
  const gitlabCIPath = path.join(OUTPUT_DIR, 'gitlab-ci-codequal.yml');
  fs.writeFileSync(gitlabCIPath, gitlabCIConfig);
  console.log(`   GitLab CI config saved: ${gitlabCIPath}\n`);

  // ========================================
  // 3. Generate LSP Code Actions
  // ========================================
  console.log('Generating LSP Code Actions...');
  const ideProvider = new IDEProvider();

  // Use the provider's generateOutput method
  const ideOutput = await ideProvider.generateOutput(report, issues, {
    outputDir: OUTPUT_DIR,
  });

  const lspPath = path.join(OUTPUT_DIR, 'codequal-lsp-actions.json');
  console.log(`   LSP Code Actions saved: ${lspPath}`);
  console.log(`      - ${ideOutput.lsp?.codeActions.length || 0} code actions`);
  console.log(`      - ${ideOutput.lsp?.batchActions.length || 0} batch actions\n`);

  // ========================================
  // 4. Generate Summary
  // ========================================
  const summary = {
    generatedAt: new Date().toISOString(),
    repository: report.repositoryUrl,
    branch: report.headBranch,
    prNumber: report.prNumber,
    patternCount: patternCount,
    issueCount: issues.length,
    outputs: {
      sarif: {
        path: 'codequal-report.sarif.json',
        format: 'SARIF 2.1.0',
        usage: 'GitHub Code Scanning, VS Code SARIF Viewer, JetBrains',
      },
      gitlabCodeQuality: {
        path: 'gl-code-quality-report.json',
        format: 'Code Climate / GitLab Code Quality',
        usage: 'GitLab Merge Request Quality Widget',
      },
      lspCodeActions: {
        path: 'codequal-lsp-actions.json',
        format: 'LSP (Language Server Protocol)',
        usage: 'Cursor, VS Code, any LSP-compatible IDE',
      },
      gitlabCI: {
        path: 'gitlab-ci-codequal.yml',
        format: 'GitLab CI YAML',
        usage: 'Add to .gitlab-ci.yml for automated scanning',
      },
    },
    issuesByLanguage: {
      java: issues.filter(i => i.filePath.endsWith('.java')).length,
      python: issues.filter(i => i.filePath.endsWith('.py')).length,
      typescript: issues.filter(i => i.filePath.endsWith('.ts')).length,
      other: issues.filter(i => !i.filePath.match(/\.(java|py|ts)$/)).length,
    },
    issuesBySeverity: {
      critical: issues.filter(i => i.severity === 'critical').length,
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length,
    },
  };

  const summaryPath = path.join(OUTPUT_DIR, 'report-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  const fixableCount = issues.filter(i => i.fixAvailable).length;
  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                         REPORT GENERATION COMPLETE                            ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  Output Directory: tests/integration/test-outputs/ide-reports                 ║
║                                                                               ║
║  Generated Files:                                                             ║
║     1. codequal-report.sarif.json    - GitHub/VS Code/JetBrains               ║
║     2. gl-code-quality-report.json   - GitLab MR integration                  ║
║     3. codequal-lsp-actions.json     - IDE quick fixes (Cursor/VS Code)       ║
║     4. gitlab-ci-codequal.yml        - GitLab CI configuration                ║
║     5. report-summary.json           - Summary metadata                        ║
║                                                                               ║
║  Statistics:                                                                  ║
║     Issues: ${String(issues.length).padEnd(5)} Patterns: ${String(patternCount).padEnd(5)} Fixable: ${String(fixableCount).padEnd(20)}║
║                                                                               ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);
}

generateReports().catch(console.error);
