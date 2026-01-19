/**
 * Session 95: AI Fixer Batch Runner for KB Filling
 *
 * Runs AI fixer on a repository with auto-learning enabled.
 * Successful fixes automatically add patterns to KB.
 *
 * Usage:
 *   npx ts-node tests/integration/run-ai-fixer-batch.ts --repo apache/commons-io
 *   npx ts-node tests/integration/run-ai-fixer-batch.ts --repo apache/commons-io --rules "ShortVariable,LongVariable"
 *   npx ts-node tests/integration/run-ai-fixer-batch.ts --repo apache/commons-io --limit 50
 */

// Load environment variables
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { execSync } from 'child_process';
import * as fs from 'fs';
import { getAIFixerAgent, AIFixerIssue } from '../../src/fix-agent/agents/ai-fixer-agent';

// Parse command line arguments
function parseArgs(): {
  repo: string;
  limit: number;
  language: string;
} {
  const args = process.argv.slice(2);
  let repo = 'apache/commons-io';
  let limit = 200; // Default 200 issues per repo
  let language = 'java';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--repo' && args[i + 1]) {
      repo = args[i + 1];
      i++;
    } else if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--language' && args[i + 1]) {
      language = args[i + 1];
      i++;
    }
  }

  // No rule filtering - AI tries ALL issues
  return { repo, limit, language };
}

// Clone repository if needed
function ensureRepoCloned(repo: string): string {
  const repoDir = `/tmp/kb-filling/${repo.replace('/', '-')}`;

  if (!fs.existsSync(repoDir)) {
    console.log(`Cloning ${repo}...`);
    fs.mkdirSync(path.dirname(repoDir), { recursive: true });
    execSync(`git clone --depth 1 https://github.com/${repo}.git ${repoDir}`, {
      stdio: 'inherit',
    });
  } else {
    console.log(`Repository already cloned: ${repoDir}`);
  }

  return repoDir;
}

// =============================================================================
// LANGUAGE-SPECIFIC SCANNERS
// =============================================================================

// Run ESLint and collect issues for TypeScript/JavaScript
function runESLintAndCollectIssues(
  repoDir: string,
  limit: number
): AIFixerIssue[] {
  console.log('Running ESLint analysis...');

  const outputFile = '/tmp/eslint-output.json';

  // Find TypeScript/JavaScript files
  const allTsFilesRaw = execSync(
    `find ${repoDir} -type f \\( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \\) ! -path "*/node_modules/*" ! -path "*/dist/*" ! -path "*/.git/*" 2>/dev/null || true`,
    { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
  ).trim();

  const allTsFiles = allTsFilesRaw.split('\n').filter(f => f);
  const totalFiles = allTsFiles.length;

  if (totalFiles === 0) {
    console.log('No TypeScript/JavaScript files found');
    return [];
  }

  console.log(`Found ${totalFiles} TypeScript/JavaScript files`);

  // Install dependencies if package.json exists
  if (fs.existsSync(path.join(repoDir, 'package.json'))) {
    const nodeModulesPath = path.join(repoDir, 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      console.log('Installing npm dependencies...');
      try {
        execSync('npm install --ignore-scripts --no-audit --no-fund 2>/dev/null', {
          cwd: repoDir,
          stdio: 'pipe',
          timeout: 120000,
        });
      } catch (e) {
        console.log('npm install completed (with warnings)');
      }
    }
  }

  // Limit files for large repos
  const MAX_FILES = 200;
  const filesToScan = totalFiles > MAX_FILES
    ? allTsFiles.sort(() => Math.random() - 0.5).slice(0, MAX_FILES)
    : allTsFiles;

  // Write file list
  const fileListPath = '/tmp/eslint-file-list.txt';
  fs.writeFileSync(fileListPath, filesToScan.join('\n'));

  // Run ESLint with JSON output - try repo's config first, fall back to basic
  let eslintResult = '';
  try {
    // Try with repo's own config
    eslintResult = execSync(
      `cd ${repoDir} && npx eslint --format json ${filesToScan.slice(0, 50).join(' ')} 2>/dev/null || true`,
      { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
    );
  } catch (e) {
    // Fall back to basic config
    try {
      eslintResult = execSync(
        `cd ${repoDir} && npx eslint --no-eslintrc --env es2020,node --parser-options=ecmaVersion:2020 --format json ${filesToScan.slice(0, 50).join(' ')} 2>/dev/null || true`,
        { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
      );
    } catch (e2) {
      console.log('ESLint failed to run');
    }
  }

  if (!eslintResult || eslintResult.trim() === '') {
    console.log('ESLint produced no output');
    return [];
  }

  // Parse ESLint output
  let eslintOutput;
  try {
    eslintOutput = JSON.parse(eslintResult);
  } catch (e) {
    console.log('Failed to parse ESLint JSON output');
    console.log('Raw output (first 500 chars):', eslintResult.substring(0, 500));
    return [];
  }
  const issues: AIFixerIssue[] = [];

  for (const file of eslintOutput) {
    for (const message of file.messages || []) {
      if (!message.ruleId) continue; // Skip parsing errors

      // Read code context
      let codeContext = '';
      try {
        const fileContent = fs.readFileSync(file.filePath, 'utf-8');
        const lines = fileContent.split('\n');
        const startLine = Math.max(0, message.line - 5);
        const endLine = Math.min(lines.length, message.line + 10);
        codeContext = lines.slice(startLine, endLine).join('\n');
      } catch (e) {
        // Skip if can't read file
      }

      issues.push({
        id: `eslint-${issues.length + 1}`,
        validatorToolId: 'eslint',
        ruleId: message.ruleId,
        file: file.filePath,
        line: message.line,
        message: message.message,
        severity: message.severity === 2 ? 'high' : 'medium',
        codeContext,
        language: 'typescript',
        originalConfidence: 30,
      });

      if (issues.length >= limit) break;
    }
    if (issues.length >= limit) break;
  }

  return issues;
}

// Run Ruff and collect issues for Python
function runRuffAndCollectIssues(
  repoDir: string,
  limit: number
): AIFixerIssue[] {
  console.log('Running Ruff analysis...');

  const outputFile = '/tmp/ruff-output.json';

  // Check if Ruff is installed
  try {
    execSync('ruff --version', { stdio: 'pipe' });
  } catch (e) {
    console.log('Ruff not installed. Please install with: pip install ruff');
    return [];
  }

  // Find Python files
  const allPyFilesRaw = execSync(
    `find ${repoDir} -name "*.py" -type f ! -path "*/.git/*" ! -path "*/venv/*" ! -path "*/__pycache__/*" 2>/dev/null || true`,
    { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
  ).trim();

  const allPyFiles = allPyFilesRaw.split('\n').filter(f => f);
  const totalFiles = allPyFiles.length;

  if (totalFiles === 0) {
    console.log('No Python files found');
    return [];
  }

  console.log(`Found ${totalFiles} Python files`);

  // Run Ruff with JSON output
  try {
    execSync(
      `cd ${repoDir} && ruff check . --output-format json > ${outputFile} 2>/dev/null || true`,
      { stdio: 'pipe', maxBuffer: 50 * 1024 * 1024 }
    );
  } catch (e) {
    console.log('Ruff completed (may have violations)');
  }

  if (!fs.existsSync(outputFile)) {
    console.log('Ruff output not found');
    return [];
  }

  // Parse Ruff output
  const ruffOutput = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
  const issues: AIFixerIssue[] = [];

  for (const violation of ruffOutput) {
    // Read code context
    let codeContext = '';
    try {
      const fileContent = fs.readFileSync(violation.filename, 'utf-8');
      const lines = fileContent.split('\n');
      const startLine = Math.max(0, violation.location.row - 5);
      const endLine = Math.min(lines.length, violation.location.row + 10);
      codeContext = lines.slice(startLine, endLine).join('\n');
    } catch (e) {
      // Skip if can't read file
    }

    issues.push({
      id: `ruff-${issues.length + 1}`,
      validatorToolId: 'ruff',
      ruleId: violation.code,
      file: violation.filename,
      line: violation.location.row,
      message: violation.message,
      severity: violation.code.startsWith('E') || violation.code.startsWith('F') ? 'high' : 'medium',
      codeContext,
      language: 'python',
      originalConfidence: 30,
    });

    if (issues.length >= limit) break;
  }

  return issues;
}

// Run golangci-lint and collect issues for Go
function runGolangciLintAndCollectIssues(
  repoDir: string,
  limit: number
): AIFixerIssue[] {
  console.log('Running golangci-lint analysis...');

  const outputFile = '/tmp/golangci-lint-output.json';

  // Check if golangci-lint is installed
  try {
    execSync('golangci-lint --version', { stdio: 'pipe' });
  } catch (e) {
    console.log('golangci-lint not installed. Please install from: https://golangci-lint.run/');
    return [];
  }

  // Check for go.mod
  if (!fs.existsSync(path.join(repoDir, 'go.mod'))) {
    console.log('No go.mod found - not a Go module');
    return [];
  }

  // Run golangci-lint with JSON output (v2 syntax)
  try {
    execSync(
      `cd ${repoDir} && golangci-lint run --output.json.path ${outputFile} 2>/dev/null || true`,
      { stdio: 'pipe', maxBuffer: 50 * 1024 * 1024, timeout: 120000 }
    );
  } catch (e) {
    console.log('golangci-lint completed (may have violations)');
  }

  if (!fs.existsSync(outputFile)) {
    console.log('golangci-lint output not found');
    return [];
  }

  // Parse golangci-lint output
  let golangciOutput;
  try {
    golangciOutput = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
  } catch (e) {
    console.log('Failed to parse golangci-lint output');
    return [];
  }

  const issues: AIFixerIssue[] = [];

  for (const issue of golangciOutput.Issues || []) {
    // Read code context
    let codeContext = '';
    const filePath = path.join(repoDir, issue.Pos.Filename);
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const lines = fileContent.split('\n');
      const startLine = Math.max(0, issue.Pos.Line - 5);
      const endLine = Math.min(lines.length, issue.Pos.Line + 10);
      codeContext = lines.slice(startLine, endLine).join('\n');
    } catch (e) {
      // Skip if can't read file
    }

    issues.push({
      id: `golangci-${issues.length + 1}`,
      validatorToolId: 'golangci-lint',
      ruleId: issue.FromLinter,
      file: filePath,
      line: issue.Pos.Line,
      message: issue.Text,
      severity: issue.Severity === 'error' ? 'high' : 'medium',
      codeContext,
      language: 'go',
      originalConfidence: 30,
    });

    if (issues.length >= limit) break;
  }

  return issues;
}

// =============================================================================
// LANGUAGE ROUTER
// =============================================================================

function collectIssuesForLanguage(
  repoDir: string,
  language: string,
  limit: number
): AIFixerIssue[] {
  switch (language.toLowerCase()) {
    case 'java':
      return runPMDAndCollectIssues(repoDir, limit);
    case 'typescript':
    case 'javascript':
    case 'ts':
    case 'js':
      return runESLintAndCollectIssues(repoDir, limit);
    case 'python':
    case 'py':
      return runRuffAndCollectIssues(repoDir, limit);
    case 'go':
    case 'golang':
      return runGolangciLintAndCollectIssues(repoDir, limit);
    default:
      console.log(`Unsupported language: ${language}`);
      console.log('Supported languages: java, typescript, python, go');
      return [];
  }
}

// =============================================================================
// JAVA (PMD)
// =============================================================================

// Run PMD and collect issues (ALL rules, no filtering)
function runPMDAndCollectIssues(
  repoDir: string,
  limit: number
): AIFixerIssue[] {
  console.log('Running PMD analysis...');

  const pmdBin = '/tmp/pmd/pmd-bin-7.0.0-rc4/bin/pmd';
  const outputFile = '/tmp/pmd-output.json';

  // Check if PMD is installed
  if (!fs.existsSync(pmdBin)) {
    console.log('PMD not found. Downloading...');
    execSync(`
      mkdir -p /tmp/pmd && cd /tmp/pmd &&
      curl -sL https://github.com/pmd/pmd/releases/download/pmd_releases%2F7.0.0-rc4/pmd-bin-7.0.0-rc4.zip -o pmd.zip &&
      unzip -q -o pmd.zip
    `, { stdio: 'inherit' });
  }

  // Find Java files - count total first
  const allJavaFilesRaw = execSync(`find ${repoDir} -name "*.java" -type f 2>/dev/null`, {
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large repos
  }).trim();

  const allJavaFiles = allJavaFilesRaw.split('\n').filter(f => f);
  const totalFiles = allJavaFiles.length;

  if (totalFiles === 0) {
    console.log('No Java files found');
    return [];
  }

  console.log(`Found ${totalFiles} Java files total`);

  // For large repos (>5000 files), limit to subset to avoid JSON parsing issues
  const MAX_FILES_FOR_PMD = 500;
  let pmdCommand: string;

  if (totalFiles > 5000) {
    console.log(`Large repo detected. Limiting PMD to ${MAX_FILES_FOR_PMD} files to avoid memory issues.`);

    // Select random subset of files for variety
    const shuffled = allJavaFiles.sort(() => Math.random() - 0.5);
    const selectedFiles = shuffled.slice(0, MAX_FILES_FOR_PMD);

    // Write file list
    const fileListPath = '/tmp/pmd-file-list.txt';
    fs.writeFileSync(fileListPath, selectedFiles.join('\n'));

    pmdCommand = `
      ${pmdBin} check \
        --file-list "${fileListPath}" \
        --rulesets rulesets/java/quickstart.xml \
        --format json \
        --report-file ${outputFile} \
        --no-fail-on-violation 2>/dev/null || true
    `;
  } else {
    pmdCommand = `
      ${pmdBin} check \
        --dir "${repoDir}" \
        --rulesets rulesets/java/quickstart.xml \
        --format json \
        --report-file ${outputFile} \
        --no-fail-on-violation 2>/dev/null || true
    `;
  }

  // Run PMD
  try {
    execSync(pmdCommand, { stdio: 'pipe' });
  } catch (e) {
    // PMD returns non-zero on violations, which is expected
    console.log('PMD completed (may have violations)');
  }

  if (!fs.existsSync(outputFile)) {
    console.log('PMD output not found');
    return [];
  }

  // Parse PMD output
  const pmdOutput = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
  const issues: AIFixerIssue[] = [];

  for (const file of pmdOutput.files || []) {
    for (const violation of file.violations || []) {
      // No filtering - AI tries ALL rules

      // Read code context
      let codeContext = '';
      try {
        const fileContent = fs.readFileSync(file.filename, 'utf-8');
        const lines = fileContent.split('\n');
        const startLine = Math.max(0, violation.beginline - 5);
        const endLine = Math.min(lines.length, violation.endline + 10);
        codeContext = lines.slice(startLine, endLine).join('\n');
      } catch (e) {
        // Skip if can't read file
      }

      issues.push({
        id: `pmd-${issues.length + 1}`,
        validatorToolId: 'pmd',
        ruleId: violation.rule,
        file: file.filename,
        line: violation.beginline,
        message: violation.message,
        severity: violation.priority <= 2 ? 'high' : violation.priority <= 3 ? 'medium' : 'low',
        codeContext,
        language: 'java',
        originalConfidence: 30,
      });

      if (issues.length >= limit) {
        break;
      }
    }
    if (issues.length >= limit) {
      break;
    }
  }

  return issues;
}

// Main execution
async function main() {
  const { repo, limit, language } = parseArgs();

  console.log('=== AI Fixer Batch Runner for KB Filling ===');
  console.log(`Repository: ${repo}`);
  console.log(`Rules: ALL (no filtering)`);
  console.log(`Limit: ${limit} issues`);
  console.log(`Language: ${language}`);
  console.log(`Auto-learning: ENABLED (submitToRegistry: true)`);
  console.log(`Failure tracking: ENABLED (failures saved for later manual review)`);
  console.log('');

  // Clone repo
  const repoDir = ensureRepoCloned(repo);

  // Collect issues using language-specific scanner
  const issues = collectIssuesForLanguage(repoDir, language, limit);
  console.log(`\nCollected ${issues.length} issues to process`);

  if (issues.length === 0) {
    console.log('No issues to process');
    return;
  }

  // Group by rule for reporting
  const byRule = new Map<string, number>();
  for (const issue of issues) {
    byRule.set(issue.ruleId, (byRule.get(issue.ruleId) || 0) + 1);
  }

  console.log('\nIssues by rule:');
  for (const [rule, count] of Array.from(byRule.entries()).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${rule}: ${count}`);
  }

  // Get AI fixer with auto-learning ENABLED (default)
  console.log('\n--- Starting AI Fixer (auto-learning enabled) ---\n');
  const agent = getAIFixerAgent(); // submitToRegistry defaults to true now

  // Process issues
  const results = {
    total: issues.length,
    processed: 0,
    succeeded: 0,
    failed: 0,
    patternsAdded: 0,
    byRule: new Map<string, { total: number; success: number; failed: number }>(),
  };

  for (const issue of issues) {
    try {
      console.log(`Processing ${issue.ruleId} at ${path.basename(issue.file)}:${issue.line}`);

      const enriched = await agent.processIssue(issue);
      results.processed++;

      // Track by rule
      if (!results.byRule.has(issue.ruleId)) {
        results.byRule.set(issue.ruleId, { total: 0, success: 0, failed: 0 });
      }
      const ruleStats = results.byRule.get(issue.ruleId)!;
      ruleStats.total++;

      if (enriched.fixRecommendation.confidence >= 70 && !enriched.fixRecommendation.manualReview?.required) {
        results.succeeded++;
        ruleStats.success++;
        console.log(`  ✅ Success (confidence: ${enriched.fixRecommendation.confidence}%)`);

        // Pattern was auto-added to KB if validation passed
        if (enriched.fixRecommendation.confidence >= 80) {
          results.patternsAdded++;
        }
      } else {
        results.failed++;
        ruleStats.failed++;
        console.log(`  ❌ Failed (confidence: ${enriched.fixRecommendation.confidence}%)`);
      }

    } catch (e: any) {
      results.failed++;
      console.log(`  ❌ Error: ${e.message}`);
    }
  }

  // Print summary
  console.log('\n=== SUMMARY ===');
  console.log(`Total issues: ${results.total}`);
  console.log(`Processed: ${results.processed}`);
  console.log(`Succeeded: ${results.succeeded} (${((results.succeeded / results.processed) * 100).toFixed(1)}%)`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Patterns auto-added to KB: ~${results.patternsAdded}`);

  console.log('\nBy Rule:');
  for (const [rule, stats] of Array.from(results.byRule.entries()).sort((a, b) => b[1].total - a[1].total)) {
    const rate = stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(0) : 0;
    console.log(`  ${rule}: ${stats.success}/${stats.total} (${rate}%)`);
  }

  // Save results
  const outputPath = `/tmp/kb-filling-results-${repo.replace('/', '-')}.json`;
  fs.writeFileSync(outputPath, JSON.stringify({
    repo,
    timestamp: new Date().toISOString(),
    summary: {
      total: results.total,
      processed: results.processed,
      succeeded: results.succeeded,
      failed: results.failed,
      successRate: `${((results.succeeded / results.processed) * 100).toFixed(1)}%`,
      patternsAutoAdded: results.patternsAdded,
      failuresTracked: results.failed,
    },
    byRule: Object.fromEntries(results.byRule),
    note: 'Failures are automatically tracked in fix_failure_tracking table for later manual review',
  }, null, 2));

  console.log(`\nResults saved to: ${outputPath}`);
  console.log(`\nNext steps:`);
  console.log(`  - ${results.patternsAdded} patterns auto-added to KB`);
  console.log(`  - ${results.failed} failures tracked for manual pattern creation`);
  console.log(`  - Run: npx ts-node src/fix-agent/fix-pattern-registry/kb-review-cli.ts list`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Batch runner failed:', e);
    process.exit(1);
  });
