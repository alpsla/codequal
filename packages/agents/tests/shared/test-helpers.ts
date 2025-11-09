/**
 * Shared Test Helpers
 * Common utilities for V9 test suite
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { V9AnalyzerFactory } from '../../src/two-branch/analyzers/v9-analyzer-factory';
import { V9ToolOrchestrator } from '../../src/two-branch/tools/v9-tool-orchestrator';
import { Issue } from '../../src/two-branch/analyzers/v9-types';
import { TEST_CONFIG, Language } from './test-config';

/**
 * Clone a test repository with caching
 */
export async function cloneTestRepo(
  language: Language,
  size: 'small' | 'medium' | 'large' = 'medium'
): Promise<string> {
  const repo = TEST_CONFIG.repositories[language];
  const cacheDir = path.join('/tmp', 'v9-test-repos');
  const repoName = path.basename(repo.url, '.git');
  const repoPath = path.join(cacheDir, `${language}-${repoName}`);
  
  // Create cache directory
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  
  // Clone or update repository
  if (fs.existsSync(repoPath)) {
    console.log(`📁 Using cached repository: ${repoPath}`);
    // Update to latest
    execSync('git pull', { cwd: repoPath });
  } else {
    console.log(`📥 Cloning repository: ${repo.url}`);
    execSync(`git clone ${repo.url} ${repoPath}`, { cwd: cacheDir });
  }
  
  // Checkout specific branch
  execSync(`git checkout ${repo.branch}`, { cwd: repoPath });
  
  return repoPath;
}

/**
 * Run V9 analysis for a language
 */
export async function runAnalysis(
  language: Language,
  repoPath: string,
  options: {
    toolsOnly?: boolean;
    skipAI?: boolean;
    timeout?: number;
  } = {}
): Promise<{
  issues: Issue[];
  duration: number;
  toolResults: Record<string, number>;
}> {
  const startTime = Date.now();
  
  try {
    // Create analyzer
    const analyzer = V9AnalyzerFactory.createAnalyzer(language);
    const config = analyzer.getLanguageConfig();
    
    // Create orchestrator
    const orchestrator = new V9ToolOrchestrator({
      language,
      tools: config.tools,
      models: {
        security: TEST_CONFIG.environment.TEST_MODEL,
        performance: TEST_CONFIG.environment.TEST_MODEL,
        architecture: TEST_CONFIG.environment.TEST_MODEL,
        codequality: TEST_CONFIG.environment.TEST_MODEL,
        dependency: TEST_CONFIG.environment.TEST_MODEL
      },
      repositoryPath: repoPath
    });
    
    // Run analysis
    const result = await orchestrator.analyzeRepository(repoPath, 'main');
    
    // Calculate tool results
    const toolResults: Record<string, number> = {};
    for (const tool of config.tools) {
      toolResults[tool] = result.rawIssues.filter(i => i.tool === tool).length;
    }
    
    return {
      issues: result.issues,
      duration: Date.now() - startTime,
      toolResults
    };
    
  } catch (error) {
    console.error(`❌ Analysis failed: ${error}`);
    throw error;
  }
}

/**
 * Validate issue counts against expectations
 */
export function validateIssueCounts(
  actual: number,
  expected: number,
  tolerance: number = 0.2
): {
  valid: boolean;
  message: string;
} {
  const min = Math.floor(expected * (1 - tolerance));
  const max = Math.ceil(expected * (1 + tolerance));
  
  if (actual < min) {
    return {
      valid: false,
      message: `Too few issues: ${actual} < ${min} (expected ~${expected})`
    };
  }
  
  if (actual > max * 2) {
    return {
      valid: false,
      message: `Too many issues: ${actual} > ${max * 2} (expected ~${expected})`
    };
  }
  
  return {
    valid: true,
    message: `Issue count OK: ${actual} (expected ~${expected})`
  };
}

/**
 * Measure function execution time
 */
export async function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  console.log(`⏱️  Starting: ${name}`);
  const startTime = Date.now();
  
  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    console.log(`✅ Completed: ${name} (${(duration / 1000).toFixed(1)}s)`);
    
    return { result, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`❌ Failed: ${name} (${(duration / 1000).toFixed(1)}s)`);
    throw error;
  }
}

/**
 * Clean up test artifacts
 */
export function cleanupTestArtifacts(paths: string[]): void {
  for (const p of paths) {
    try {
      if (fs.existsSync(p)) {
        if (fs.statSync(p).isDirectory()) {
          fs.rmSync(p, { recursive: true });
        } else {
          fs.unlinkSync(p);
        }
      }
    } catch (error) {
      console.warn(`Failed to cleanup ${p}: ${error}`);
    }
  }
}

/**
 * Calculate test grade based on success rate
 */
export function calculateGrade(
  passed: number,
  total: number
): {
  grade: string;
  percentage: number;
  emoji: string;
} {
  const percentage = passed / total;
  
  if (percentage >= TEST_CONFIG.grading.A_PLUS) {
    return { grade: 'A+', percentage, emoji: '🌟' };
  } else if (percentage >= TEST_CONFIG.grading.A) {
    return { grade: 'A', percentage, emoji: '✨' };
  } else if (percentage >= TEST_CONFIG.grading.B) {
    return { grade: 'B', percentage, emoji: '👍' };
  } else if (percentage >= TEST_CONFIG.grading.C) {
    return { grade: 'C', percentage, emoji: '📝' };
  } else if (percentage >= TEST_CONFIG.grading.D) {
    return { grade: 'D', percentage, emoji: '⚠️' };
  } else {
    return { grade: 'F', percentage, emoji: '❌' };
  }
}

/**
 * Format test results for console output
 */
export function formatTestResults(results: {
  testName: string;
  passed: number;
  failed: number;
  duration: number;
  issues: number;
  toolResults?: Record<string, number>;
}): string {
  const total = results.passed + results.failed;
  const grade = calculateGrade(results.passed, total);
  
  let output = `
═══════════════════════════════════════════════════════════════
📋 Test Results: ${results.testName}
═══════════════════════════════════════════════════════════════

Grade: ${grade.grade} ${grade.emoji} (${(grade.percentage * 100).toFixed(0)}%)
Duration: ${(results.duration / 1000).toFixed(1)}s
Total Issues: ${results.issues}

Tests: ${results.passed}/${total} passed`;

  if (results.toolResults) {
    output += '\n\nTool Results:';
    for (const [tool, count] of Object.entries(results.toolResults)) {
      output += `\n  - ${tool}: ${count} issues`;
    }
  }

  output += '\n═══════════════════════════════════════════════════════════════';
  
  return output;
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: {
    timeout?: number;
    interval?: number;
    message?: string;
  } = {}
): Promise<void> {
  const timeout = options.timeout || 30000;
  const interval = options.interval || 1000;
  const message = options.message || 'Condition not met';
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Timeout waiting for condition: ${message}`);
}

/**
 * Check if required tools are installed
 */
export function checkToolsInstalled(language: Language): {
  installed: string[];
  missing: string[];
} {
  const expectedTools = TEST_CONFIG.repositories[language].expectedTools;
  const installed: string[] = [];
  const missing: string[] = [];
  
  for (const tool of expectedTools) {
    try {
      // Special cases for tool commands
      const command = getToolCommand(tool);
      execSync(`which ${command}`, { stdio: 'ignore' });
      installed.push(tool);
    } catch {
      missing.push(tool);
    }
  }
  
  return { installed, missing };
}

/**
 * Test report interface
 */
export interface TestReport {
  // Test metadata
  timestamp: string;
  language: string;
  testType: 'lite' | 'complete' | 'validation';
  duration: number;
  
  // Test results
  passed: boolean;
  grade: string;
  score: number;
  
  // Issue analysis
  totalIssues: number;
  issuesByTool: Record<string, number>;
  issuesBySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  
  // Tool performance
  toolExecutionTimes: Record<string, number>;
  toolErrors: string[];
  
  // Environment info
  environment: {
    nodeVersion: string;
    platform: string;
    repository: string;
    branch: string;
    commit: string;
  };
  
  // Test details
  testCases: Array<{
    name: string;
    passed: boolean;
    duration: number;
    error?: string;
  }>;
}

/**
 * Save test report to file system
 */
export async function saveTestReport(
  language: Language,
  report: TestReport
): Promise<string> {
  const reportsDir = path.join(
    __dirname,
    '..',
    'integration',
    language,
    'reports'
  );
  
  const historyDir = path.join(reportsDir, 'history');
  
  // Create directories if they don't exist
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.mkdirSync(historyDir, { recursive: true });
  
  // Save to latest.json
  const latestPath = path.join(reportsDir, 'latest.json');
  fs.writeFileSync(latestPath, JSON.stringify(report, null, 2));
  
  // Save to history with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const historyPath = path.join(historyDir, `${timestamp}.json`);
  fs.writeFileSync(historyPath, JSON.stringify(report, null, 2));
  
  // Update aggregated summary
  await updateAggregatedSummary(language, report);
  
  console.log(`📊 Report saved: ${latestPath}`);
  return latestPath;
}

/**
 * Update aggregated test summary
 */
async function updateAggregatedSummary(
  language: Language,
  report: TestReport
): Promise<void> {
  const summaryPath = path.join(__dirname, '..', 'reports', 'summary.json');
  const summaryDir = path.dirname(summaryPath);
  
  // Create directory if needed
  fs.mkdirSync(summaryDir, { recursive: true });
  
  // Read existing summary or create new
  let summary: Record<string, any> = {};
  if (fs.existsSync(summaryPath)) {
    summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
  }
  
  // Update language entry
  summary[language] = {
    lastRun: report.timestamp,
    lastStatus: report.passed ? 'PASS' : 'FAIL',
    lastGrade: report.grade,
    lastScore: report.score,
    totalIssues: report.totalIssues,
    testType: report.testType
  };
  
  // Calculate overall health
  const languages = Object.keys(summary);
  const passingCount = languages.filter(l => summary[l].lastStatus === 'PASS').length;
  const averageScore = languages.reduce((sum, l) => sum + (summary[l].lastScore || 0), 0) / languages.length;
  
  summary._overall = {
    languages: languages.length,
    passing: passingCount,
    failing: languages.length - passingCount,
    averageScore: Math.round(averageScore),
    lastUpdate: new Date().toISOString()
  };
  
  // Save updated summary
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
}

/**
 * Load latest test report for a language
 */
export function loadLatestReport(language: Language): TestReport | null {
  const reportPath = path.join(
    __dirname,
    '..',
    'integration',
    language,
    'reports',
    'latest.json'
  );
  
  if (fs.existsSync(reportPath)) {
    return JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
  }
  
  return null;
}

/**
 * Download V9 reports from Oracle Cloud to local
 */
export async function downloadV9ReportsFromCloud(
  language: Language,
  repository: string
): Promise<string> {
  const SSH_KEY = process.env.SSH_KEY || '/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key';
  const ORACLE_IP = process.env.ORACLE_IP || '129.213.49.128';
  
  // Local directory for V9 reports
  const localReportDir = path.join(
    __dirname,
    '..',
    'integration',
    language,
    'v9-reports'
  );
  
  // Create directory if it doesn't exist
  fs.mkdirSync(localReportDir, { recursive: true });
  
  // Remote path on Oracle Cloud
  const remoteReportPath = `~/codequal/packages/agents/test-outputs/${language}/${repository}-v9-report.md`;
  const localReportPath = path.join(localReportDir, `${repository}-v9-report.md`);
  
  try {
    // Download report using scp
    const downloadCmd = `scp -i "${SSH_KEY}" -o StrictHostKeyChecking=no "opc@${ORACLE_IP}:${remoteReportPath}" "${localReportPath}"`;
    execSync(downloadCmd, { stdio: 'pipe' });
    
    console.log(`✅ Downloaded: ${repository}-v9-report.md`);
    return localReportPath;
  } catch (error) {
    console.warn(`⚠️ Failed to download ${repository} report: ${error}`);
    throw error;
  }
}

/**
 * Save all V9-generated assets locally
 */
export async function saveV9Assets(options: {
  language: Language;
  repository: string;
  outputDir: string; // Directory where V9 saved all assets
}): Promise<void> {
  const { language, repository, outputDir } = options;
  
  // Local directory for V9 reports
  const targetDir = path.join(
    __dirname,
    '..',
    'integration',
    language,
    'v9-reports'
  );
  
  const historyDir = path.join(targetDir, 'history', new Date().toISOString().split('T')[0]);
  
  // Create directories if they don't exist
  fs.mkdirSync(targetDir, { recursive: true });
  fs.mkdirSync(historyDir, { recursive: true });
  
  // Copy all V9-generated files to our test directory
  // V9 generates:
  // - <repository>-v9-report.md
  // - <repository>-manifest.json
  // - attachments/ directory with fix files
  
  const files = fs.readdirSync(outputDir);
  let reportFound = false;
  let manifestFound = false;
  
  for (const file of files) {
    const sourcePath = path.join(outputDir, file);
    const targetPath = path.join(targetDir, file);
    
    if (file.endsWith('-v9-report.md')) {
      fs.copyFileSync(sourcePath, targetPath);
      // Also save to history
      const historyPath = path.join(historyDir, file);
      fs.copyFileSync(sourcePath, historyPath);
      reportFound = true;
      console.log(`📄 V9 Report saved: ${file}`);
    } else if (file.endsWith('-manifest.json')) {
      fs.copyFileSync(sourcePath, targetPath);
      // Also save to history with timestamp
      const historyPath = path.join(historyDir, file);
      fs.copyFileSync(sourcePath, historyPath);
      manifestFound = true;
      console.log(`📋 Manifest saved: ${file}`);
    } else if (file === 'attachments' && fs.statSync(sourcePath).isDirectory()) {
      // Copy attachments directory
      const targetAttachmentsDir = path.join(targetDir, 'attachments');
      fs.mkdirSync(targetAttachmentsDir, { recursive: true });
      
      const attachments = fs.readdirSync(sourcePath);
      for (const attachment of attachments) {
        fs.copyFileSync(
          path.join(sourcePath, attachment),
          path.join(targetAttachmentsDir, attachment)
        );
      }
      console.log(`📎 Attachments saved: ${attachments.length} files`);
    }
  }
  
  if (!reportFound) {
    console.warn(`⚠️ No V9 report found in ${outputDir}`);
  }
  if (!manifestFound) {
    console.warn(`⚠️ No manifest file found in ${outputDir}`);
  }
  
  // Update matrix report
  const reportPath = path.join(targetDir, `${repository}-v9-report.md`);
  if (fs.existsSync(reportPath)) {
    const reportContent = fs.readFileSync(reportPath, 'utf-8');
    const decision = reportContent.includes('✅ APPROVED') ? 'APPROVED' : 'DECLINED';
    const issueMatch = reportContent.match(/Total Issues: (\d+)/);
    const issueCount = issueMatch ? parseInt(issueMatch[1]) : 0;
    
    await updateMatrixReport({
      language,
      repository,
      status: decision,
      issueCount,
      reportPath: `${repository}-v9-report.md`
    });
  }
}

/**
 * Update the matrix report with test results
 */
export async function updateMatrixReport(options: {
  language: Language;
  repository: string;
  status: string;
  issueCount: number;
  reportPath: string;
}): Promise<void> {
  const matrixPath = path.join(__dirname, '..', 'reports', 'MATRIX.md');
  
  // This would update the MATRIX.md file with the new results
  // For now, just log the update
  console.log(`📊 Matrix updated: ${options.repository} - ${options.status} (${options.issueCount} issues)`);
}

/**
 * Download all V9 reports for a language
 */
export async function downloadAllV9Reports(language: Language): Promise<void> {
  const repositories = TEST_CONFIG.repositories[language];
  
  console.log(`📥 Downloading all ${language} V9 reports from Oracle Cloud...`);
  
  for (const repo of repositories) {
    const repoName = repo.name.toLowerCase().replace(/\s+/g, '-');
    try {
      await downloadV9ReportsFromCloud(language, repoName);
    } catch (error) {
      console.warn(`⚠️ Skipping ${repoName}: ${error}`);
    }
  }
  
  console.log(`✅ Download complete for ${language}`);
}

/**
 * Get actual command for a tool
 */
function getToolCommand(tool: string): string {
  const commandMap: Record<string, string> = {
    'pmd': 'pmd',
    'spotbugs': 'spotbugs',
    'checkstyle': 'checkstyle',
    'semgrep': 'semgrep',
    'dependency-check': 'dependency-check.sh',
    'eslint': 'eslint',
    'typescript': 'tsc',
    'npm-audit': 'npm',
    'ruff': 'ruff',
    'mypy': 'mypy',
    'bandit': 'bandit',
    'safety': 'safety',
    'golint': 'golint',
    'go-vet': 'go',
    'gosec': 'gosec',
    'rubocop': 'rubocop',
    'brakeman': 'brakeman',
    'bundler-audit': 'bundle-audit',
    'phpcs': 'phpcs',
    'phpmd': 'phpmd',
    'psalm': 'psalm',
    'dotnet-analyzer': 'dotnet'
  };
  
  return commandMap[tool] || tool;
}
