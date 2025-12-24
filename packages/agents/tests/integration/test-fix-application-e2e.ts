/**
 * Fix Application End-to-End Test
 *
 * BUSINESS VALUE VALIDATION:
 * 1. Do fixes actually work? (success rate)
 * 2. Do fixes break something else? (regression detection)
 * 3. How efficient are fixes? (metrics)
 *
 * Complete flow:
 * - Clone repo → Scan issues → Generate fixes → Apply fixes → Re-scan → Report
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { JavaToolOrchestrator } from '../../src/two-branch/tools/java/java-tool-orchestrator';
import { FixApplicator, createFixApplicator } from '../../src/two-branch/fix-branch/fix-applicator';
import { FixVerifier } from '../../src/two-branch/fix-branch/fix-verifier';
import { FixRouter, IssueToFix } from '../../src/two-branch/fix-agent/fix-router';
import { CategorizedFix, FixConfidenceCategory } from '../../src/two-branch/fix-branch/fix-categorizer';
import { createClient } from '@supabase/supabase-js';

// ============================================================
// CONFIGURATION
// ============================================================

const TEST_CONFIG = {
  repoUrl: 'https://github.com/spring-projects/spring-petclinic',
  language: 'java',
  maxIssues: 10, // Limit for testing speed
  timeout: 300000 // 5 minutes
};

interface FixMetrics {
  totalIssues: number;
  fixesGenerated: number;
  fixesApplied: number;
  fixesFailed: number;
  regressionsIntroduced: number;
  issuesResolved: number;
  successRate: number;
  regressionRate: number;
  netImprovement: number;
}

// ============================================================
// SMART FIX GENERATOR
// Reads actual code from files and generates realistic fixes
// ============================================================

function readActualLine(filePath: string, lineNumber: number): string | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    if (lineNumber > 0 && lineNumber <= lines.length) {
      return lines[lineNumber - 1];
    }
  } catch {
    // File read error
  }
  return null;
}

function generateSmartFix(issue: IssueToFix, workingDir: string): CategorizedFix | null {
  const fullPath = path.join(workingDir, issue.file);
  const originalLine = readActualLine(fullPath, issue.line);

  if (!originalLine) {
    // Cannot read the file, skip this fix
    return null;
  }

  // Rule-specific fix patterns
  // Note: These are simplified patterns for testing; production would use AI or pattern registry
  const fixPatterns: Array<{
    rulePattern: RegExp;
    codePattern: RegExp;
    replacement: (match: string) => string;
    explanation: string;
    confidence: number;
  }> = [
    // Collapsible if statements (PMD)
    {
      rulePattern: /CollapsibleIfStatements/i,
      codePattern: /if\s*\([^)]+\)\s*\{?\s*$/,
      replacement: (line) => line, // Keep as-is (would need multi-line handling)
      explanation: 'Combine nested if statements into single condition',
      confidence: 75
    },
    // Spring Actuator enabled (security)
    {
      rulePattern: /spring-actuator/i,
      codePattern: /management\.endpoints\.web\.exposure\.include\s*[=:]\s*[*"']/,
      replacement: (line) => line.replace(/include\s*[=:]\s*[*"'][^"']*[*"']?/, 'include: health,info,metrics'),
      explanation: 'Restrict actuator endpoints to only necessary ones',
      confidence: 85
    },
    // Kubernetes privilege escalation
    {
      rulePattern: /allow-privilege-escalation|securityContext/i,
      codePattern: /^\s*(containers:|spec:)/,
      replacement: (line) => {
        const indent = line.match(/^(\s*)/)?.[1] || '';
        return `${line}\n${indent}  securityContext:\n${indent}    allowPrivilegeEscalation: false`;
      },
      explanation: 'Add securityContext to prevent privilege escalation',
      confidence: 80
    },
    // Dockerfile sudo - use global replacement to remove ALL sudo occurrences
    {
      rulePattern: /no-sudo|sudo/i,
      codePattern: /RUN.*sudo/,
      replacement: (line) => line.replace(/sudo\s+/g, ''),  // Global replace
      explanation: 'Remove sudo as Docker already runs as root',
      confidence: 90
    },
    // Generic console.log removal
    {
      rulePattern: /console-log/i,
      codePattern: /console\.log\s*\(/,
      replacement: (line) => line.replace(/console\.log\s*\(/, 'logger.debug('),
      explanation: 'Replace console.log with proper logger',
      confidence: 85
    }
  ];

  // Try to match a fix pattern
  for (const pattern of fixPatterns) {
    if (pattern.rulePattern.test(issue.ruleId) && pattern.codePattern.test(originalLine)) {
      const fixedCode = pattern.replacement(originalLine);
      if (fixedCode !== originalLine) {
        console.log(`   ✅ Matched pattern for ${issue.ruleId}`);
        console.log(`      File: ${issue.file}:${issue.line}`);
        console.log(`      Original: "${originalLine.trim().slice(0, 60)}..."`);
        console.log(`      Fixed:    "${fixedCode.trim().slice(0, 60)}..."`);
        return {
          id: `fix-${issue.id}`,
          tier: 'tier3_pattern',
          tool: issue.toolId,
          ruleId: issue.ruleId,
          file: issue.file,
          line: issue.line,
          originalCode: originalLine,
          fixedCode: fixedCode,
          explanation: pattern.explanation,
          confidence: pattern.confidence,
          category: 'security',
          severity: issue.severity,
          confidenceCategory: pattern.confidence >= 80
            ? FixConfidenceCategory.AUTO_APPLY
            : FixConfidenceCategory.REVIEW_REQUIRED,
          needsReview: pattern.confidence < 80
        };
      }
    }
  }

  // No specific pattern matched - don't generate a fix
  // In production, this would be sent to AI for sophisticated fixing
  // For now, return null to avoid introducing regressions with placeholder comments
  console.log(`   ⏭️ No pattern for ${issue.ruleId} - skipping fix generation`);
  return null;
}

// ============================================================
// MAIN TEST
// ============================================================

async function runFixApplicationE2E(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║         FIX APPLICATION END-TO-END TEST                      ║');
  console.log('║    Scan → Generate → Apply → Verify → Report                 ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║  BUSINESS VALUE VALIDATION                                   ║');
  console.log('║  1. Do fixes actually work?                                  ║');
  console.log('║  2. Do fixes break something else?                           ║');
  console.log('║  3. How efficient are fixes overall?                         ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();
  const testDir = `/tmp/fix-e2e-test-${Date.now()}`;

  const metrics: FixMetrics = {
    totalIssues: 0,
    fixesGenerated: 0,
    fixesApplied: 0,
    fixesFailed: 0,
    regressionsIntroduced: 0,
    issuesResolved: 0,
    successRate: 0,
    regressionRate: 0,
    netImprovement: 0
  };

  try {
    // ================================================================
    // STEP 1: Clone Repository
    // ================================================================
    console.log('=== STEP 1: Clone Repository ===');
    const step1Start = Date.now();

    if (fs.existsSync(testDir)) {
      execSync(`rm -rf ${testDir}`);
    }
    execSync(`git clone --depth 10 ${TEST_CONFIG.repoUrl} ${testDir}`, {
      stdio: 'pipe',
      timeout: 60000
    });
    console.log(`   ✅ Cloned in ${Date.now() - step1Start}ms\n`);

    // ================================================================
    // STEP 2: Initial Scan (Before Fixes)
    // ================================================================
    console.log('=== STEP 2: Initial Scan (Before Fixes) ===');
    const step2Start = Date.now();

    const orchestrator = new JavaToolOrchestrator();
    const scanResult = await orchestrator.orchestrate(testDir, 'base');
    const allIssues = scanResult.toolResults.flatMap(tr => tr.issues || []);

    metrics.totalIssues = allIssues.length;
    console.log(`   📊 Found ${metrics.totalIssues} issues in ${Date.now() - step2Start}ms`);

    // Show breakdown by tool
    for (const result of scanResult.toolResults) {
      if (result.issues.length > 0) {
        console.log(`      - ${result.tool}: ${result.issues.length} issues`);
      }
    }
    console.log();

    if (metrics.totalIssues === 0) {
      console.log('   ⚠️ No issues found - nothing to fix\n');
      console.log('=== TEST COMPLETE (No Issues) ===');
      return;
    }

    // ================================================================
    // STEP 3: Convert to IssueToFix and Route
    // ================================================================
    console.log('=== STEP 3: Route Issues ===');
    const step3Start = Date.now();

    const issuesToFix: IssueToFix[] = allIssues.slice(0, TEST_CONFIG.maxIssues).map((issue, idx) => ({
      id: `issue-${idx}`,
      ruleId: issue.rule || 'unknown',
      toolId: issue.tool || 'unknown',
      file: issue.file || 'unknown',
      line: issue.line || 1,
      column: issue.column,
      message: issue.message || 'No message',
      severity: (issue.severity || 'medium') as 'critical' | 'high' | 'medium' | 'low',
      codeContext: ''
    }));

    const router = new FixRouter();
    const routing = router.routeAndBatch(issuesToFix, { tier: 'pro' });

    console.log(`   📊 Routing breakdown (${issuesToFix.length} issues):`);
    console.log(`      - Tier 1 (Native): ${routing.summary.tier1Count}`);
    console.log(`      - Tier 2 (Dedicated): ${routing.summary.tier2Count}`);
    console.log(`      - Tier 2.5 (Pattern/Cloud): ${routing.summary.tier2_5Count}`);
    console.log(`      - Tier 3 (AI): ${routing.summary.tier3Count}`);
    console.log(`   Duration: ${Date.now() - step3Start}ms\n`);

    // ================================================================
    // STEP 4: Generate Fixes
    // ================================================================
    console.log('=== STEP 4: Generate Fixes ===');
    const step4Start = Date.now();

    const generatedFixes: CategorizedFix[] = [];
    for (const issue of issuesToFix) {
      const fix = generateSmartFix(issue, testDir);
      if (fix) {
        generatedFixes.push(fix);
      }
    }

    metrics.fixesGenerated = generatedFixes.length;
    console.log(`   ✅ Generated ${metrics.fixesGenerated} fixes in ${Date.now() - step4Start}ms`);

    // Group by confidence
    const autoApply = generatedFixes.filter(f => f.confidenceCategory === FixConfidenceCategory.AUTO_APPLY);
    const needsReview = generatedFixes.filter(f => f.confidenceCategory !== FixConfidenceCategory.AUTO_APPLY);
    console.log(`      - Auto-apply (high confidence): ${autoApply.length}`);
    console.log(`      - Needs review: ${needsReview.length}\n`);

    // ================================================================
    // STEP 5: Apply Fixes
    // ================================================================
    console.log('=== STEP 5: Apply Fixes ===');
    const step5Start = Date.now();

    const applicator = createFixApplicator({
      workingDir: testDir,
      validateSyntax: true,
      createBackups: true,
      dryRun: false // Actually apply the fixes
    });

    // Apply only AUTO_APPLY fixes (production behavior)
    // This ensures we don't introduce regressions with low-confidence fixes
    const fixesToApply = autoApply;
    console.log(`   Applying ${fixesToApply.length} AUTO_APPLY fixes (production mode)...`);
    if (needsReview.length > 0) {
      console.log(`   ⏭️ Skipping ${needsReview.length} fixes that need review`);
    }

    const applyResult = await applicator.applyFixes(fixesToApply);

    metrics.fixesApplied = applyResult.summary.successCount;
    metrics.fixesFailed = applyResult.summary.failCount;

    console.log(`   ✅ Applied ${metrics.fixesApplied} fixes successfully`);
    console.log(`   ❌ Failed to apply ${metrics.fixesFailed} fixes`);
    console.log(`   📁 Modified ${applyResult.summary.filesModified} files`);
    console.log(`   Duration: ${Date.now() - step5Start}ms\n`);

    // Show failed fixes
    if (applyResult.failed.length > 0) {
      console.log('   Failed fixes:');
      for (const failure of applyResult.failed.slice(0, 5)) {
        console.log(`      - ${failure.fix.ruleId}: ${failure.error}`);
      }
      if (applyResult.failed.length > 5) {
        console.log(`      ... and ${applyResult.failed.length - 5} more\n`);
      }
    }

    // ================================================================
    // STEP 6: Re-Scan (After Fixes)
    // ================================================================
    console.log('=== STEP 6: Re-Scan (After Fixes) ===');
    const step6Start = Date.now();

    const rescanResult = await orchestrator.orchestrate(testDir, 'base');
    const postFixIssues = rescanResult.toolResults.flatMap(tr => tr.issues || []);

    const postFixCount = postFixIssues.length;
    console.log(`   📊 Found ${postFixCount} issues after fixes (was ${metrics.totalIssues})`);
    console.log(`   Duration: ${Date.now() - step6Start}ms\n`);

    // ================================================================
    // STEP 7: Calculate Metrics
    // ================================================================
    console.log('=== STEP 7: Calculate Metrics ===');

    // Count resolved issues (issues that were in original but not in rescan)
    // IMPORTANT: Exclude backup files (created by fix applicator) from comparison
    const originalRuleIds = new Set(allIssues.slice(0, TEST_CONFIG.maxIssues).map(i => `${i.file}:${i.line}:${i.rule}`));
    const postFixRuleIds = new Set(
      postFixIssues
        .filter(i => !i.file.includes('.codequal-backup'))  // Exclude backup files
        .map(i => `${i.file}:${i.line}:${i.rule}`)
    );

    let resolved = 0;
    let stillPresent = 0;
    let newIssues = 0;

    for (const id of originalRuleIds) {
      if (!postFixRuleIds.has(id)) {
        resolved++;
      } else {
        stillPresent++;
      }
    }

    for (const id of postFixRuleIds) {
      if (!originalRuleIds.has(id)) {
        newIssues++;
      }
    }

    metrics.issuesResolved = resolved;
    metrics.regressionsIntroduced = newIssues;
    metrics.successRate = metrics.fixesApplied > 0
      ? (metrics.issuesResolved / metrics.fixesApplied) * 100
      : 0;
    metrics.regressionRate = metrics.fixesApplied > 0
      ? (metrics.regressionsIntroduced / metrics.fixesApplied) * 100
      : 0;
    metrics.netImprovement = metrics.issuesResolved - metrics.regressionsIntroduced;

    console.log(`   Issues resolved: ${metrics.issuesResolved}`);
    console.log(`   Issues still present: ${stillPresent}`);
    console.log(`   New issues (regressions): ${metrics.regressionsIntroduced}`);
    console.log(`   Net improvement: ${metrics.netImprovement > 0 ? '+' : ''}${metrics.netImprovement} issues`);

    // Show details about resolved and regression issues
    if (metrics.issuesResolved > 0) {
      console.log('\n   📗 Resolved Issues:');
      for (const id of originalRuleIds) {
        if (!postFixRuleIds.has(id)) {
          console.log(`      ✅ ${id.split(':').slice(0,2).join(':')} (${id.split(':')[2]?.slice(0,40)})`);
        }
      }
    }

    if (metrics.regressionsIntroduced > 0) {
      console.log('\n   📕 New Issues (Regressions):');
      for (const id of postFixRuleIds) {
        if (!originalRuleIds.has(id)) {
          console.log(`      ❌ ${id.split(':').slice(0,2).join(':')} (${id.split(':')[2]?.slice(0,40)})`);
        }
      }
    }
    console.log();

    // ================================================================
    // SUMMARY
    // ================================================================
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                 FIX APPLICATION SUMMARY                      ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log(`║  Total Issues Scanned:     ${metrics.totalIssues.toString().padStart(5)}                          ║`);
    console.log(`║  Fixes Generated:          ${metrics.fixesGenerated.toString().padStart(5)}                          ║`);
    console.log(`║  Fixes Applied:            ${metrics.fixesApplied.toString().padStart(5)}                          ║`);
    console.log(`║  Fixes Failed:             ${metrics.fixesFailed.toString().padStart(5)}                          ║`);
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log(`║  Issues Resolved:          ${metrics.issuesResolved.toString().padStart(5)}                          ║`);
    console.log(`║  Regressions Introduced:   ${metrics.regressionsIntroduced.toString().padStart(5)}                          ║`);
    console.log(`║  Net Improvement:          ${(metrics.netImprovement > 0 ? '+' : '') + metrics.netImprovement.toString().padStart(4)}                          ║`);
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log(`║  Fix Success Rate:         ${metrics.successRate.toFixed(1).padStart(5)}%                         ║`);
    console.log(`║  Regression Rate:          ${metrics.regressionRate.toFixed(1).padStart(5)}%                         ║`);
    console.log(`║  Total Time:               ${totalTime.padStart(5)}s                         ║`);
    console.log('╚══════════════════════════════════════════════════════════════╝');

    // Business value assessment
    console.log('\n📊 BUSINESS VALUE ASSESSMENT:');
    if (metrics.successRate >= 80 && metrics.regressionRate <= 5) {
      console.log('   ✅ EXCELLENT: High fix rate, minimal regressions');
      console.log('   → Ready for production with auto-apply');
    } else if (metrics.successRate >= 60 && metrics.regressionRate <= 10) {
      console.log('   ⚠️ GOOD: Solid fix rate, acceptable regression rate');
      console.log('   → Use with review-before-apply for sensitive code');
    } else if (metrics.successRate >= 40) {
      console.log('   ⚠️ FAIR: Moderate success, needs improvement');
      console.log('   → Recommend human review for all fixes');
    } else {
      console.log('   ❌ NEEDS WORK: Low success rate');
      console.log('   → Focus on improving fix generation accuracy');
    }

    // Recommendations
    console.log('\n📋 RECOMMENDATIONS:');
    if (metrics.fixesFailed > 0) {
      console.log(`   - Investigate ${metrics.fixesFailed} failed fix applications`);
    }
    if (metrics.regressionsIntroduced > 0) {
      console.log(`   - Review ${metrics.regressionsIntroduced} regression(s) for patterns`);
    }
    if (metrics.issuesResolved < metrics.fixesApplied) {
      console.log('   - Some fixes applied but issues not resolved (line drift?)');
    }

  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up test directory...');
    if (fs.existsSync(testDir)) {
      try {
        execSync(`rm -rf ${testDir}`);
        console.log('   ✅ Cleaned up\n');
      } catch {
        console.log('   ⚠️ Cleanup failed\n');
      }
    }
  }
}

// Run the test
runFixApplicationE2E().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
