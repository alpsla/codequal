/**
 * NestJS CLI Pattern Discovery Test
 *
 * Scans the nestjs/nest-cli repository to discover new issue patterns
 * that aren't covered by existing NestJS patterns.
 */

import dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { TypeScriptToolOrchestrator } from '../../src/two-branch/tools/typescript/typescript-tool-orchestrator';
import { classifyIssuesForFramework, type RawIssue } from '../../src/fix-agent/services/framework-issue-classifier';
import { execSync } from 'child_process';
import * as fs from 'fs';

const REPO_URL = 'https://github.com/nestjs/nest-cli';
const OUTPUT_DIR = path.join(__dirname, 'test-outputs', 'nestjs-cli-patterns');

async function discoverPatterns(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  NESTJS CLI PATTERN DISCOVERY                                    ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log('║  Repository: nestjs/nest-cli                                     ║');
  console.log('║  Goal: Find new issue patterns for NestJS pattern library        ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('');

  const testDir = `/tmp/test-nestjs-cli-${Date.now()}`;
  const repoPath = `${testDir}/nest-cli`;

  try {
    // 1. Clone repository
    console.log('📥 Step 1: Cloning repository...');
    fs.mkdirSync(testDir, { recursive: true });

    if (fs.existsSync(repoPath)) {
      execSync(`rm -rf ${repoPath}`);
    }
    execSync(`git clone --depth 1 ${REPO_URL} ${repoPath}`, {
      stdio: 'pipe',
      encoding: 'utf-8'
    });
    console.log('   ✅ Repository cloned');

    // 2. Install dependencies (needed for TypeScript checking)
    console.log('');
    console.log('📦 Step 2: Installing dependencies...');
    try {
      execSync(`cd ${repoPath} && npm install --legacy-peer-deps`, {
        stdio: 'pipe',
        encoding: 'utf-8',
        timeout: 300000 // 5 minute timeout
      });
      console.log('   ✅ Dependencies installed');
    } catch (installError) {
      console.log('   ⚠️ npm install had issues, continuing anyway');
    }

    // 3. Run analysis
    console.log('');
    console.log('🔬 Step 3: Running analysis...');

    const orchestrator = new TypeScriptToolOrchestrator({
      eslint: { enabled: true, fix: false },
      typescript: { enabled: true, strict: false },
      semgrep: { enabled: true, config: 'auto' },
      npmAudit: { enabled: true, level: 'low', production: false },
      dependencyCheck: {
        enabled: true,
        failOnCVSS: 0,
        formats: ['JSON'],
        caching: { enabled: true, location: '/tmp/dc-cache' }
      },
    });

    // Use 'base' branch to analyze main branch without requiring PR checkout
    const results = await orchestrator.orchestrate(repoPath, 'base', { userTier: 'pro' });

    // Extract all issues from tool results
    const allIssues = results.toolResults?.flatMap(tr => tr.issues || []) || [];
    console.log(`   Total issues found: ${allIssues.length}`);

    // 4. Classify issues using existing patterns
    console.log('');
    console.log('📊 Step 4: Classifying issues with existing patterns...');

    // Convert to RawIssue format for classifier
    const rawIssues: RawIssue[] = allIssues.map(issue => ({
      file: issue.file,
      line: issue.line,
      column: issue.column,
      rule: issue.rule,
      tool: issue.tool,
      message: issue.message,
      severity: issue.severity,
      category: 'NEW' as const // All issues are "new" since this is a fresh repo scan
    }));

    const classification = classifyIssuesForFramework(
      rawIssues,
      'nestjs',
      repoPath,
      true // dependencies installed
    );

    console.log(`   Total issues: ${classification.total}`);
    console.log(`   Fixable (have patterns): ${classification.fixableIssues.length}`);
    console.log(`   Filtered out: ${classification.filteredIssues.length}`);
    console.log(`   Pattern reuse rate: ${classification.costAnalysis.savingsPercent.toFixed(1)}%`);

    // 5. Identify issues that need new patterns
    console.log('');
    console.log('🆕 Step 5: Identifying issues needing NEW patterns...');

    // Group issues by disposition
    const byDisposition: Record<string, typeof classification.issues> = {};
    for (const issue of classification.issues) {
      const disp = issue.disposition;
      if (!byDisposition[disp]) {
        byDisposition[disp] = [];
      }
      byDisposition[disp].push(issue);
    }

    console.log('   Issues by disposition:');
    for (const [disp, issues] of Object.entries(byDisposition)) {
      console.log(`     ${disp}: ${issues.length}`);
    }

    // Issues that need patterns are those marked as ADD_TO_PATTERNS or FIX_NOW (without patternId)
    const needPatterns = classification.issues.filter(i =>
      i.disposition === 'ADD_TO_PATTERNS' ||
      (i.disposition === 'FIX_NOW' && !i.patternId)
    );

    // Group by rule to see what new patterns we need
    const newPatternRules: Record<string, { count: number; tool: string; samples: Array<{ file: string; line: number; message: string }> }> = {};

    for (const issue of needPatterns) {
      const rule = issue.ruleId || issue.rule || 'unknown';
      if (!newPatternRules[rule]) {
        newPatternRules[rule] = { count: 0, tool: issue.tool, samples: [] };
      }
      newPatternRules[rule].count++;
      if (newPatternRules[rule].samples.length < 3) {
        newPatternRules[rule].samples.push({
          file: issue.file,
          line: issue.line,
          message: issue.message
        });
      }
    }

    // Sort by frequency
    const sortedRules = Object.entries(newPatternRules)
      .sort((a, b) => b[1].count - a[1].count);

    console.log('');
    console.log('┌────────────────────────────────────────────────────────────────────┐');
    console.log('│  RULES NEEDING NEW PATTERNS                                        │');
    console.log('├────────────────────────────────────────────────────────────────────┤');

    if (sortedRules.length === 0) {
      console.log('│  ✅ ALL RULES COVERED! No new patterns needed.                    │');
    } else {
      for (const [rule, data] of sortedRules.slice(0, 10)) {
        console.log(`│  ${rule.substring(0, 30).padEnd(30)} ${data.count.toString().padStart(4)} issues (${data.tool}) │`);
        for (const sample of data.samples) {
          const shortFile = sample.file.split('/').slice(-2).join('/').substring(0, 40);
          console.log(`│    - ${shortFile}:${sample.line}`.padEnd(67) + '│');
        }
      }
    }
    console.log('└────────────────────────────────────────────────────────────────────┘');

    // 6. Save results
    console.log('');
    console.log('💾 Step 6: Saving results...');
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    fs.writeFileSync(
      path.join(OUTPUT_DIR, `nestjs-cli-patterns-${timestamp}.json`),
      JSON.stringify({
        metadata: {
          repository: REPO_URL,
          analyzedAt: new Date().toISOString(),
          totalIssues: allIssues.length,
          patternCoverage: `${classification.costAnalysis.savingsPercent.toFixed(1)}%`,
          rulesNeedingPatterns: sortedRules.length
        },
        byDisposition: Object.fromEntries(
          Object.entries(byDisposition).map(([k, v]) => [k, v.length])
        ),
        newPatternRules: sortedRules.map(([rule, data]) => ({
          rule,
          count: data.count,
          tool: data.tool,
          samples: data.samples
        })),
        allIssues: rawIssues
      }, null, 2)
    );

    console.log(`   ✅ Results saved to ${OUTPUT_DIR}`);

    // Summary
    console.log('');
    console.log('═'.repeat(70));
    console.log('PATTERN DISCOVERY SUMMARY');
    console.log('═'.repeat(70));
    console.log(`  Total issues scanned: ${allIssues.length}`);
    console.log(`  Pattern coverage: ${classification.costAnalysis.savingsPercent.toFixed(1)}%`);
    console.log(`  Rules needing patterns: ${sortedRules.length}`);
    if (sortedRules.length > 0) {
      console.log('  Top rules to add:');
      for (const [rule, data] of sortedRules.slice(0, 5)) {
        console.log(`    - ${rule}: ${data.count} issues`);
      }
    }
    console.log('═'.repeat(70));

  } catch (error) {
    console.error('');
    console.error('❌ PATTERN DISCOVERY FAILED');
    console.error(error);
    throw error;
  } finally {
    // Cleanup
    console.log('');
    console.log('🧹 Cleaning up...');
    try {
      execSync(`rm -rf ${testDir}`, { stdio: 'pipe' });
    } catch {
      // Ignore cleanup errors
    }
  }
}

// Run the discovery
discoverPatterns()
  .then(() => {
    console.log('');
    console.log('✅ Pattern discovery completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Discovery failed:', error.message);
    process.exit(1);
  });
