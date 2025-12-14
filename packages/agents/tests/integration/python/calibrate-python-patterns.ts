/**
 * Python Pattern Calibration Script
 *
 * Runs the full fix flow on Python repositories to populate Supabase with patterns:
 * SCAN -> GROUP -> CHECK PATTERNS -> FIXER TOOLS -> AI FALLBACK
 *
 * Key: Uses ScanFixExecutor with dryRun: false to store AI-generated patterns.
 *
 * Usage:
 *   PYTHON_TEST_REPO=httpie/cli npx ts-node tests/integration/python/calibrate-python-patterns.ts
 */

import dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../../.env') });
dotenv.config({ path: path.join(__dirname, '../../../../../.env') });

import { PythonToolOrchestrator } from '../../../src/two-branch/tools/python/python-tool-orchestrator';
import { ScanFixExecutor } from '../../../src/fix-agent/scan-fix-executor';
import { execSync } from 'child_process';
import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Default to pygoat if no repo specified
const TEST_REPO = process.env.PYTHON_TEST_REPO || 'adeyosemanputra/pygoat';
const MAX_ISSUES_TO_PROCESS = parseInt(process.env.MAX_ISSUES || '50', 10);

interface PatternStats {
  total: number;
  byTool: Record<string, number>;
  pythonRelated: number;
}

async function getPatternStats(): Promise<PatternStats> {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { count: total } = await supabase
    .from('fix_patterns')
    .select('*', { count: 'exact', head: true });

  const { data: patterns } = await supabase
    .from('fix_patterns')
    .select('tool, rule_id')
    .limit(1000);

  const pythonTools = ['bandit', 'safety', 'pip-audit', 'pylint', 'mypy', 'ruff', 'semgrep'];
  const byTool: Record<string, number> = {};
  let pythonRelated = 0;

  for (const p of patterns || []) {
    byTool[p.tool] = (byTool[p.tool] || 0) + 1;
    if (pythonTools.includes(p.tool) || p.rule_id?.includes('python')) {
      pythonRelated++;
    }
  }

  return {
    total: total || 0,
    byTool,
    pythonRelated
  };
}

async function calibratePythonRepo(): Promise<void> {
  const startTime = Date.now();
  const repoUrl = `https://github.com/${TEST_REPO}`;
  const testDir = `/tmp/python-calibrate-${Date.now()}`;
  const repoPath = `${testDir}/repo`;

  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                    PYTHON PATTERN CALIBRATION                                 ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Repository: ${TEST_REPO.padEnd(62)}║
║  Max Issues: ${MAX_ISSUES_TO_PROCESS.toString().padEnd(62)}║
║  Mode: FULL FIX (AI fixer enabled, patterns saved to Supabase)               ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);

  // Get initial pattern count
  console.log('📊 Checking initial pattern stats...');
  const initialStats = await getPatternStats();
  console.log(`   Total patterns: ${initialStats.total}`);
  console.log(`   Python-related: ${initialStats.pythonRelated}`);
  console.log('');

  try {
    // Clone repository with extended timeout for large repos (like Django)
    console.log('📦 Step 1: Cloning repository...');
    console.log('   (This may take several minutes for large repos)');
    fs.mkdirSync(testDir, { recursive: true });

    // Use filter to speed up clone for very large repos
    const useBlobFilter = process.env.USE_BLOB_FILTER === 'true';
    const cloneArgs = useBlobFilter
      ? `git clone --depth 1 --filter=blob:limit=1m ${repoUrl} ${repoPath}`
      : `git clone --depth 1 ${repoUrl} ${repoPath}`;

    execSync(cloneArgs, {
      stdio: 'pipe',
      encoding: 'utf-8',
      timeout: 600000  // 10 minute timeout for large repos
    });
    console.log('   ✅ Repository cloned\n');

    // Run Python tool orchestrator
    console.log('🔍 Step 2: Running Python security analysis...');
    const orchestrator = new PythonToolOrchestrator();
    const scanResults = await orchestrator.orchestrate(repoPath, 'base', { analysisMode: 'complete' });

    const allIssues = scanResults.toolResults?.flatMap(tr => tr.issues || []) || [];
    console.log(`   ✅ Found ${allIssues.length} issues\n`);

    // Show tool breakdown
    const issuesByTool: Record<string, number> = {};
    for (const issue of allIssues) {
      issuesByTool[issue.tool] = (issuesByTool[issue.tool] || 0) + 1;
    }
    console.log('   Issues by tool:');
    Object.entries(issuesByTool)
      .sort((a, b) => b[1] - a[1])
      .forEach(([tool, count]) => {
        console.log(`     ${tool.padEnd(15)} ${count}`);
      });
    console.log('');

    if (allIssues.length === 0) {
      console.log('   No issues to process. Exiting.\n');
      return;
    }

    // Prioritize fixable tools over security warnings that need human review
    // Priority order: ruff, mypy (code quality) > semgrep > pip-audit > bandit (security warnings)
    const toolPriority: Record<string, number> = {
      'ruff': 1,
      'mypy': 2,
      'semgrep': 3,
      'pip-audit': 4,
      'bandit': 5,  // Bandit issues often need human judgment
    };

    const sortedIssues = [...allIssues].sort((a, b) => {
      const priorityA = toolPriority[a.tool] || 99;
      const priorityB = toolPriority[b.tool] || 99;
      return priorityA - priorityB;
    });

    // Limit issues to process (to control API costs)
    const issuesToProcess = sortedIssues.slice(0, MAX_ISSUES_TO_PROCESS);

    // Show prioritized issue breakdown
    const prioritizedBreakdown: Record<string, number> = {};
    for (const issue of issuesToProcess) {
      prioritizedBreakdown[issue.tool] = (prioritizedBreakdown[issue.tool] || 0) + 1;
    }
    console.log('   Prioritized issues to process:');
    Object.entries(prioritizedBreakdown)
      .sort((a, b) => (toolPriority[a[0]] || 99) - (toolPriority[b[0]] || 99))
      .forEach(([tool, count]) => {
        console.log(`     ${tool.padEnd(15)} ${count}`);
      });
    console.log('');

    console.log(`🔧 Step 3: Processing ${issuesToProcess.length}/${allIssues.length} issues through fix flow...`);
    console.log('   (AI fixer will generate and store new patterns)\n');

    // Map issues to the format expected by ScanFixExecutor
    const mappedIssues = issuesToProcess.map(issue => ({
      file: issue.file,
      line: issue.line,
      column: issue.column || 1,
      rule: issue.rule || 'unknown',
      tool: issue.tool,
      message: issue.message,
      severity: issue.severity || 'medium',
      category: 'NEW' as const,
    }));

    // Run ScanFixExecutor with dryRun: false to save patterns
    const fixExecutor = new ScanFixExecutor({
      workingDir: repoPath,
      language: 'python',
      outputMode: 'patch',
      dryRun: false,  // CRITICAL: Must be false to save patterns to Supabase!
      userTier: 'pro',
      fixWithReview: true,
    });

    const fixResults = await fixExecutor.executeFixes(mappedIssues);

    // Display fix results
    console.log('\n📊 Step 4: Fix Results:');
    console.log(`   Total processed: ${mappedIssues.length}`);
    console.log(`   Fixed: ${fixResults.summary.fixedIssues}`);
    console.log(`   Tier 1 (Tools): ${fixResults.summary.tier1Fixed || 0}`);
    console.log(`   Tier 2 (Patterns): ${fixResults.summary.tier2Fixed || 0}`);
    console.log(`   Tier 3 (AI): ${fixResults.summary.tier3Fixed || 0}`);
    console.log('');

    // Get final pattern count
    console.log('📊 Step 5: Checking final pattern stats...');
    const finalStats = await getPatternStats();
    const newPatterns = finalStats.total - initialStats.total;
    const newPythonPatterns = finalStats.pythonRelated - initialStats.pythonRelated;

    console.log(`   Total patterns: ${finalStats.total} (${newPatterns >= 0 ? '+' : ''}${newPatterns})`);
    console.log(`   Python-related: ${finalStats.pythonRelated} (${newPythonPatterns >= 0 ? '+' : ''}${newPythonPatterns})`);
    console.log('');

    // Show Python-specific tool patterns
    console.log('   Patterns by tool:');
    const pythonToolKeys = ['bandit', 'semgrep', 'pylint', 'mypy', 'ruff', 'safety', 'pip-audit'];
    for (const tool of pythonToolKeys) {
      const count = finalStats.byTool[tool] || 0;
      if (count > 0) {
        console.log(`     ${tool.padEnd(15)} ${count}`);
      }
    }
    console.log('');

    const totalTime = (Date.now() - startTime) / 1000;

    console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                         CALIBRATION COMPLETE                                  ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Repository:       ${TEST_REPO.padEnd(56)}║
║  Issues Scanned:   ${allIssues.length.toString().padEnd(56)}║
║  Issues Processed: ${mappedIssues.length.toString().padEnd(56)}║
║  Issues Fixed:     ${fixResults.summary.fixedIssues.toString().padEnd(56)}║
║  NEW Patterns:     ${newPatterns.toString().padEnd(56)}║
║  Duration:         ${totalTime.toFixed(1)}s${' '.repeat(53)}║
╚══════════════════════════════════════════════════════════════════════════════╝
`);

  } catch (error) {
    console.error('\n❌ Calibration failed:', error);
    throw error;
  } finally {
    // Cleanup
    try {
      execSync(`rm -rf ${testDir}`, { stdio: 'pipe' });
    } catch {
      // Ignore cleanup errors
    }
  }
}

calibratePythonRepo().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
