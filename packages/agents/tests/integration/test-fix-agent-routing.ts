/**
 * Fix Agent Routing Test
 *
 * Tests the Three-Tier Fix System with real issues from V9 analysis.
 * This validates:
 * 1. Issue classification (rule ID → issue type)
 * 2. Fix routing (issue → appropriate tier)
 * 3. Batch creation for efficient execution
 * 4. Cost estimation for AI fixes
 */

import { fixRouter, issueClassifier, toolFixRegistry, IssueToFix } from '../../src/two-branch/fix-agent';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TEST DATA - Real issues from V9 TypeScript analysis
// ============================================================================

const SAMPLE_ISSUES: IssueToFix[] = [
  // Semgrep security issues
  {
    id: 'semgrep-1',
    ruleId: 'javascript.lang.security.detect-child-process.detect-child-process',
    toolId: 'semgrep',
    file: 'packages/agents/src/two-branch/utils/git-utils.ts',
    line: 72,
    message: 'Detected use of child_process. Consider validating inputs.',
    severity: 'high',
  },
  {
    id: 'semgrep-2',
    ruleId: 'typescript.react.security.react-insecure-request.react-insecure-request',
    toolId: 'semgrep',
    file: 'packages/agents/src/two-branch/docs/testing/validation-issues.ts',
    line: 161,
    message: 'Detected insecure HTTP request in React component.',
    severity: 'high',
  },
  {
    id: 'semgrep-3',
    ruleId: 'dockerfile.security.last-user-is-root.last-user-is-root',
    toolId: 'semgrep',
    file: 'Dockerfile',
    line: 1,
    message: 'Container runs as root user.',
    severity: 'medium',
  },
  {
    id: 'semgrep-4',
    ruleId: 'yaml.github-actions.security.run-shell-injection.run-shell-injection',
    toolId: 'semgrep',
    file: '.github/workflows/ci.yml',
    line: 45,
    message: 'Potential shell injection in GitHub Actions workflow.',
    severity: 'high',
  },
  {
    id: 'semgrep-5',
    ruleId: 'javascript.express.security.cors-misconfiguration.cors-misconfiguration',
    toolId: 'semgrep',
    file: 'packages/api/src/server.ts',
    line: 23,
    message: 'CORS misconfiguration allows any origin.',
    severity: 'medium',
  },

  // TypeScript compiler errors
  {
    id: 'tsc-1',
    ruleId: 'TS6306',
    toolId: 'typescript',
    file: 'packages/agents/tsconfig.json',
    line: 1,
    message: 'Referenced project must have setting "composite": true.',
    severity: 'medium',
  },
  {
    id: 'tsc-2',
    ruleId: 'TS2345',
    toolId: 'typescript',
    file: 'packages/agents/src/index.ts',
    line: 42,
    message: "Argument of type 'string' is not assignable to parameter of type 'number'.",
    severity: 'medium',
  },

  // npm-audit dependency vulnerabilities
  {
    id: 'npm-1',
    ruleId: 'dependency-vulnerability',
    toolId: 'npm-audit',
    file: 'package.json',
    line: 1,
    message: 'body-parser is vulnerable to denial of service when url encoding.',
    severity: 'medium',
  },
  {
    id: 'npm-2',
    ruleId: 'dependency-vulnerability',
    toolId: 'npm-audit',
    file: 'package.json',
    line: 1,
    message: 'glob CLI: Command injection via -c/--cmd executes matches.',
    severity: 'high',
  },
  {
    id: 'npm-3',
    ruleId: 'dependency-vulnerability',
    toolId: 'npm-audit',
    file: 'package.json',
    line: 1,
    message: 'Command Injection in lodash.',
    severity: 'high',
  },

  // Architecture issues (circular dependencies)
  {
    id: 'arch-1',
    ruleId: 'circular-dependency',
    toolId: 'madge',
    file: 'packages/agents/src/index.ts',
    line: 1,
    message: 'Circular dependency detected: index.ts → utils.ts → index.ts',
    severity: 'medium',
  },

  // Unused exports
  {
    id: 'unused-1',
    ruleId: 'unused-export',
    toolId: 'ts-unused-exports',
    file: 'packages/agents/src/two-branch/index.ts',
    line: 15,
    message: 'Exported function "deprecatedHelper" is never imported.',
    severity: 'low',
  },

  // ESLint issues (if we had them)
  {
    id: 'eslint-1',
    ruleId: 'no-unused-vars',
    toolId: 'eslint',
    file: 'packages/agents/src/utils.ts',
    line: 10,
    message: "'unusedVar' is defined but never used.",
    severity: 'low',
  },
  {
    id: 'eslint-2',
    ruleId: 'prefer-const',
    toolId: 'eslint',
    file: 'packages/agents/src/utils.ts',
    line: 15,
    message: "'x' is never reassigned. Use 'const' instead.",
    severity: 'low',
  },
  {
    id: 'eslint-3',
    ruleId: 'eqeqeq',
    toolId: 'eslint',
    file: 'packages/agents/src/utils.ts',
    line: 20,
    message: "Expected '===' and instead saw '=='.",
    severity: 'medium',
  },

  // Ruff Python issues (mixed language test)
  {
    id: 'ruff-1',
    ruleId: 'F401',
    toolId: 'ruff',
    file: 'scripts/analyze.py',
    line: 5,
    message: "'os' imported but unused.",
    severity: 'low',
  },
  {
    id: 'ruff-2',
    ruleId: 'E501',
    toolId: 'ruff',
    file: 'scripts/analyze.py',
    line: 42,
    message: 'Line too long (120 > 88 characters).',
    severity: 'low',
  },
];

// ============================================================================
// TEST RUNNER
// ============================================================================

async function runFixAgentTest(): Promise<void> {
  console.log('\n' + '═'.repeat(80));
  console.log('   🔧 FIX AGENT ROUTING TEST');
  console.log('   Testing Three-Tier Fix System with real V9 issues');
  console.log('═'.repeat(80) + '\n');

  // Step 1: Show registry statistics
  console.log('📊 TOOL FIX REGISTRY STATISTICS');
  console.log('-'.repeat(60));
  const summary = toolFixRegistry.getSummary();
  console.log(`   Total tools registered: ${summary.total}`);
  console.log(`   Tier 1 (Native fix):    ${summary.tier1}`);
  console.log(`   Tier 2 (Fixer tool):    ${summary.tier2}`);
  console.log(`   Tier 3 (AI required):   ${summary.tier3}`);
  console.log('\n   By language:');
  Object.entries(summary.byLanguage).forEach(([lang, count]) => {
    console.log(`     ${lang}: ${count} tools`);
  });
  console.log('');

  // Step 2: Classify each issue
  console.log('🏷️  ISSUE CLASSIFICATION');
  console.log('-'.repeat(60));
  console.log('   Classifying ' + SAMPLE_ISSUES.length + ' issues...\n');

  const classifications: Array<{
    issue: IssueToFix;
    classification: ReturnType<typeof issueClassifier.classify>;
  }> = [];

  for (const issue of SAMPLE_ISSUES) {
    const classified = issueClassifier.classify(issue.ruleId, issue.toolId);
    classifications.push({ issue, classification: classified });

    console.log(`   📋 ${issue.id} (${issue.toolId}/${issue.ruleId})`);
    console.log(`      Type: ${classified.issueType}`);
    console.log(`      Tier: ${classified.fixTier} (${getTierDescription(classified.fixTier)})`);
    console.log(`      Safe for auto-apply: ${classified.safeForAutoApply ? '✅ Yes' : '❌ No'}`);
    console.log(`      Confidence: ${classified.confidence}%`);
    console.log('');
  }

  // Step 3: Route and batch issues
  console.log('🚦 FIX ROUTING');
  console.log('-'.repeat(60));

  const routingResult = fixRouter.routeAndBatch(SAMPLE_ISSUES);

  console.log(`   Total issues: ${routingResult.summary.total}`);
  console.log('');
  console.log('   By Tier:');
  console.log(`     Tier 1 (Native fix): ${routingResult.summary.tier1Count} issues`);
  console.log(`     Tier 2 (Fixer tool): ${routingResult.summary.tier2Count} issues`);
  console.log(`     Tier 3 (AI needed):  ${routingResult.summary.tier3Count} issues`);
  console.log('');
  console.log(`   Safe for auto-apply: ${routingResult.summary.safeForAutoApply} issues`);
  console.log(`   Estimated AI cost:   $${routingResult.summary.estimatedCost.toFixed(2)}`);
  console.log('');

  // Step 4: Show batches
  console.log('📦 FIX BATCHES');
  console.log('-'.repeat(60));

  if (routingResult.tier1.length > 0) {
    console.log('\n   Tier 1 Batches (Native --fix):');
    for (const batch of routingResult.tier1) {
      console.log(`     • ${batch.fixer}: ${batch.issues.length} issues in ${batch.files.length} files`);
      console.log(`       Speed: ${batch.estimatedTime}, Auto-apply: ${batch.safeForAutoApply ? 'Yes' : 'No'}`);
      if (batch.command) {
        console.log(`       Command: ${batch.command}`);
      }
    }
  }

  if (routingResult.tier2.length > 0) {
    console.log('\n   Tier 2 Batches (Dedicated Fixers):');
    for (const batch of routingResult.tier2) {
      console.log(`     • ${batch.fixer}: ${batch.issues.length} issues in ${batch.files.length} files`);
      console.log(`       Speed: ${batch.estimatedTime}, Auto-apply: ${batch.safeForAutoApply ? 'Yes' : 'No'}`);
      if (batch.command) {
        console.log(`       Command: ${batch.command}`);
      }
    }
  }

  if (routingResult.tier3.length > 0) {
    console.log('\n   Tier 3 Batches (AI Generation):');
    for (const batch of routingResult.tier3) {
      console.log(`     • ${batch.fixer}: ${batch.issues.length} issues in ${batch.files.length} files`);
      console.log(`       Speed: ${batch.estimatedTime}, Auto-apply: ${batch.safeForAutoApply ? 'Yes' : 'No'}`);
    }
  }
  console.log('');

  // Step 5: Show execution plan
  console.log('📋 EXECUTION PLAN');
  console.log('-'.repeat(60));

  const plan = fixRouter.getExecutionPlan(routingResult);
  console.log(`   Execution order (${plan.length} batches):\n`);

  plan.forEach((batch, index) => {
    const parallelism = fixRouter.getParallelism(batch);
    console.log(`   ${index + 1}. ${batch.fixer} (Tier ${batch.tier})`);
    console.log(`      Issues: ${batch.issues.length}, Files: ${batch.files.length}`);
    console.log(`      Speed: ${batch.estimatedTime}, Parallelism: ${parallelism}`);
    console.log('');
  });

  // Step 6: Summary
  console.log('═'.repeat(80));
  console.log('   📊 TEST SUMMARY');
  console.log('═'.repeat(80));
  console.log(`
   Total Issues:        ${SAMPLE_ISSUES.length}

   By Fix Tier:
   ├── Tier 1 (Fast):   ${routingResult.summary.tier1Count} (${percent(routingResult.summary.tier1Count, SAMPLE_ISSUES.length)}%)
   ├── Tier 2 (Medium): ${routingResult.summary.tier2Count} (${percent(routingResult.summary.tier2Count, SAMPLE_ISSUES.length)}%)
   └── Tier 3 (AI):     ${routingResult.summary.tier3Count} (${percent(routingResult.summary.tier3Count, SAMPLE_ISSUES.length)}%)

   Safe for Auto-Apply: ${routingResult.summary.safeForAutoApply} (${percent(routingResult.summary.safeForAutoApply, SAMPLE_ISSUES.length)}%)
   Estimated AI Cost:   $${routingResult.summary.estimatedCost.toFixed(2)}

   Execution Batches:   ${plan.length}

   ✅ Fix Agent routing test completed successfully!
`);

  // Save results to file
  const outputDir = path.join(__dirname, '..', '..', 'test-outputs');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputFile = path.join(outputDir, `fix-agent-routing-test-${Date.now()}.json`);
  fs.writeFileSync(outputFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: routingResult.summary,
    tier1Batches: routingResult.tier1.map(b => ({
      fixer: b.fixer,
      issueCount: b.issues.length,
      fileCount: b.files.length,
      estimatedTime: b.estimatedTime,
      safeForAutoApply: b.safeForAutoApply,
    })),
    tier2Batches: routingResult.tier2.map(b => ({
      fixer: b.fixer,
      issueCount: b.issues.length,
      fileCount: b.files.length,
      estimatedTime: b.estimatedTime,
      safeForAutoApply: b.safeForAutoApply,
    })),
    tier3Batches: routingResult.tier3.map(b => ({
      fixer: b.fixer,
      issueCount: b.issues.length,
      fileCount: b.files.length,
      estimatedTime: b.estimatedTime,
      safeForAutoApply: b.safeForAutoApply,
    })),
    classifications: classifications.map(c => ({
      issueId: c.issue.id,
      ruleId: c.issue.ruleId,
      toolId: c.issue.toolId,
      issueType: c.classification.issueType,
      fixTier: c.classification.fixTier,
      confidence: c.classification.confidence,
      safeForAutoApply: c.classification.safeForAutoApply,
    })),
  }, null, 2));

  console.log(`   📁 Results saved to: ${outputFile}\n`);
}

// ============================================================================
// HELPERS
// ============================================================================

function getTierDescription(tier: 1 | 2 | 3): string {
  switch (tier) {
    case 1: return 'Native tool fix';
    case 2: return 'Dedicated fixer tool';
    case 3: return 'AI generation required';
  }
}

function percent(part: number, total: number): string {
  if (total === 0) return '0';
  return ((part / total) * 100).toFixed(1);
}

// ============================================================================
// MAIN
// ============================================================================

runFixAgentTest().catch(console.error);
