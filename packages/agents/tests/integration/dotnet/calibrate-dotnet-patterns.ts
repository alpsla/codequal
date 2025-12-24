/**
 * C#/.NET Pattern Calibration Script
 *
 * Runs the full fix flow on C#/.NET repositories to populate Supabase with patterns:
 * SCAN -> GROUP -> CHECK PATTERNS -> FIXER TOOLS -> AI FALLBACK
 *
 * Usage:
 *   DOTNET_TEST_REPO=dotnet/aspnetcore npx ts-node tests/integration/dotnet/calibrate-dotnet-patterns.ts
 */

import dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../../.env') });
dotenv.config({ path: path.join(__dirname, '../../../../../.env') });

import { DotNetToolOrchestrator } from '../../../src/two-branch/tools/dotnet';
import { ScanFixExecutor } from '../../../src/fix-agent/scan-fix-executor';
import { execSync } from 'child_process';
import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Default repo if none specified
const TEST_REPO = process.env.DOTNET_TEST_REPO || 'dotnet/aspnetcore';
const MAX_ISSUES_TO_PROCESS = parseInt(process.env.MAX_ISSUES || '50', 10);

interface PatternStats {
  total: number;
  byTool: Record<string, number>;
  dotnetRelated: number;
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

  const dotnetTools = ['dotnet-format', 'security-code-scan', 'dotnet-outdated', 'semgrep'];
  const byTool: Record<string, number> = {};
  let dotnetRelated = 0;

  for (const p of patterns || []) {
    byTool[p.tool] = (byTool[p.tool] || 0) + 1;
    if (dotnetTools.includes(p.tool) || p.rule_id?.includes('csharp') || p.rule_id?.includes('dotnet') || p.rule_id?.includes('CS')) {
      dotnetRelated++;
    }
  }

  return {
    total: total || 0,
    byTool,
    dotnetRelated
  };
}

async function calibrateDotNetRepo(): Promise<void> {
  const startTime = Date.now();
  const repoUrl = `https://github.com/${TEST_REPO}`;
  const testDir = `/tmp/dotnet-calibrate-${Date.now()}`;
  const repoPath = `${testDir}/repo`;

  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                       C#/.NET PATTERN CALIBRATION                            ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Repository: ${TEST_REPO.padEnd(62)}║
║  Max Issues: ${MAX_ISSUES_TO_PROCESS.toString().padEnd(62)}║
║  Mode: FULL FIX (AI fixer enabled, patterns saved to Supabase)               ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);

  // Get initial pattern stats
  console.log('\n📊 Initial Pattern Stats:');
  const initialStats = await getPatternStats();
  console.log(`   Total patterns: ${initialStats.total}`);
  console.log(`   .NET-related patterns: ${initialStats.dotnetRelated}`);
  console.log(`   By tool:`, initialStats.byTool);

  try {
    // Clone repo
    console.log('\n📦 Step 1: Cloning repository...');
    fs.mkdirSync(testDir, { recursive: true });
    execSync(`git clone --depth 20 ${repoUrl} ${repoPath}`, {
      stdio: 'pipe',
      encoding: 'utf-8'
    });
    console.log(`   ✅ Cloned to ${repoPath}`);

    // Run .NET orchestrator
    console.log('\n🔍 Step 2: Running C#/.NET analysis...');
    const orchestrator = new DotNetToolOrchestrator();

    const orchestrationResult = await orchestrator.orchestrate({
      repoPath,
      baseBranch: 'main',
      prBranch: 'HEAD',
      mode: 'standard',
      userTier: 'pro'
    });

    console.log(`   ✅ Analysis complete`);
    console.log(`      Duration: ${orchestrationResult.duration}ms`);
    console.log(`      Total issues: ${orchestrationResult.totalIssues}`);

    // Show issues by tool
    console.log('\n📋 Issues by tool:');
    for (const result of orchestrationResult.results) {
      console.log(`   ${result.tool}: ${result.issues.length} issues`);
    }

    // Limit issues for processing
    const allIssues = orchestrationResult.results.flatMap(r => r.issues);
    const issuesToProcess = allIssues.slice(0, MAX_ISSUES_TO_PROCESS);

    console.log(`\n🔧 Step 3: Processing ${issuesToProcess.length} issues for fixes...`);

    // Initialize ScanFixExecutor
    const fixExecutor = new ScanFixExecutor({
      repoPath,
      language: 'csharp',
      userTier: 'pro',
      dryRun: false,
      maxConcurrentFixes: 3
    });

    // Process issues
    let fixedCount = 0;
    let patternHits = 0;
    let aiGenerated = 0;

    for (let i = 0; i < issuesToProcess.length; i++) {
      const issue = issuesToProcess[i];
      console.log(`   [${i + 1}/${issuesToProcess.length}] Processing: ${issue.ruleId || issue.message?.substring(0, 50)}...`);

      try {
        const fixResult = await fixExecutor.fixIssue(issue);

        if (fixResult.fixed) {
          fixedCount++;
          if (fixResult.source === 'pattern') {
            patternHits++;
            console.log(`      ✅ Fixed (pattern match)`);
          } else if (fixResult.source === 'ai') {
            aiGenerated++;
            console.log(`      ✅ Fixed (AI generated - pattern saved)`);
          } else {
            console.log(`      ✅ Fixed (${fixResult.source})`);
          }
        } else {
          console.log(`      ⏭️  Skipped: ${fixResult.reason || 'unknown'}`);
        }
      } catch (error: any) {
        console.log(`      ❌ Error: ${error.message?.substring(0, 50)}`);
      }
    }

    // Get final pattern stats
    console.log('\n📊 Final Pattern Stats:');
    const finalStats = await getPatternStats();
    console.log(`   Total patterns: ${finalStats.total} (${finalStats.total - initialStats.total > 0 ? '+' : ''}${finalStats.total - initialStats.total})`);
    console.log(`   .NET-related patterns: ${finalStats.dotnetRelated} (${finalStats.dotnetRelated - initialStats.dotnetRelated > 0 ? '+' : ''}${finalStats.dotnetRelated - initialStats.dotnetRelated})`);

    // Summary
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                          CALIBRATION COMPLETE                                ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Repository: ${TEST_REPO.padEnd(62)}║
║  Total time: ${(totalTime + 's').padEnd(62)}║
║  Issues processed: ${issuesToProcess.length.toString().padEnd(56)}║
║  Issues fixed: ${fixedCount.toString().padEnd(60)}║
║  Pattern hits: ${patternHits.toString().padEnd(60)}║
║  AI generated (new patterns): ${aiGenerated.toString().padEnd(45)}║
║  New patterns created: ${(finalStats.total - initialStats.total).toString().padEnd(52)}║
╚══════════════════════════════════════════════════════════════════════════════╝
`);

  } catch (error: any) {
    console.error(`\n❌ Calibration failed: ${error.message}`);
    console.error(error.stack);
    throw error;
  } finally {
    // Cleanup
    if (fs.existsSync(testDir)) {
      execSync(`rm -rf ${testDir}`);
    }
  }
}

// Main execution
calibrateDotNetRepo().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
