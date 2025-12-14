/**
 * Test Pattern Fix Generation
 *
 * Validates that our NestJS patterns:
 * 1. Match the expected issue types
 * 2. Generate correct fix templates
 * 3. Reduce AI costs through pattern reuse
 */

import { classifyIssuesForFramework } from '../../src/fix-agent/services/framework-issue-classifier';
import { NESTJS_PATTERNS } from '../../src/fix-agent/patterns/nestjs-patterns';
import { findPattern, getPatternStats } from '../../src/fix-agent/patterns';
import type { Framework } from '../../src/fix-agent/types/framework-issue-types';

// Sample NestJS issues that should match our patterns
const SAMPLE_NESTJS_ISSUES = [
  // TS2339 - Reflect metadata (140 issues in real scan)
  {
    file: 'packages/core/injector/container.ts',
    line: 45,
    rule: 'TS2339',
    tool: 'typescript',
    message: "Property 'defineMetadata' does not exist on type 'typeof Reflect'",
    severity: 'error' as const,
  },
  {
    file: 'packages/core/injector/instance-wrapper.ts',
    line: 89,
    rule: 'TS2339',
    tool: 'typescript',
    message: "Property 'getMetadata' does not exist on type 'typeof Reflect'",
    severity: 'error' as const,
  },
  {
    file: 'packages/core/decorators/module.decorator.ts',
    line: 12,
    rule: 'TS2339',
    tool: 'typescript',
    message: "Property 'hasMetadata' does not exist on type 'typeof Reflect'",
    severity: 'error' as const,
  },

  // TS2304 - __dirname (14 issues in real scan)
  {
    file: 'packages/graphql/graphql.module.ts',
    line: 78,
    rule: 'TS2304',
    tool: 'typescript',
    message: "Cannot find name '__dirname'",
    severity: 'error' as const,
  },
  {
    file: 'packages/cli/actions/build.action.ts',
    line: 34,
    rule: 'TS2304',
    tool: 'typescript',
    message: "Cannot find name '__dirname'",
    severity: 'error' as const,
  },

  // TS2322 - Undefined assignment (4 issues in real scan)
  {
    file: 'packages/common/utils/merge-with-values.util.ts',
    line: 23,
    rule: 'TS2322',
    tool: 'typescript',
    message: "Type 'string | undefined' is not assignable to type 'string'",
    severity: 'error' as const,
  },

  // TS2503 - NodeJS namespace (2 issues in real scan)
  {
    file: 'packages/platform-express/multer/interceptors/file.interceptor.ts',
    line: 56,
    rule: 'TS2503',
    tool: 'typescript',
    message: "Cannot find namespace 'NodeJS'",
    severity: 'error' as const,
  },

  // TS2688 - Node type definition (1 issue in real scan)
  {
    file: 'tsconfig.json',
    line: 1,
    rule: 'TS2688',
    tool: 'typescript',
    message: "Cannot find type definition file for 'node'",
    severity: 'error' as const,
  },

  // dependency-vulnerability - npm audit (26 issues in real scan)
  {
    file: 'package.json',
    line: 1,
    rule: 'dependency-vulnerability',
    tool: 'npm-audit',
    message: 'lodash: Prototype Pollution (High)',
    severity: 'high' as const,
  },
  {
    file: 'package.json',
    line: 1,
    rule: 'dependency-vulnerability',
    tool: 'npm-audit',
    message: 'axios: Server-Side Request Forgery (Medium)',
    severity: 'medium' as const,
  },

  // Environment issues (should be filtered out - 477 issues in real scan)
  {
    file: 'packages/core/test/injector.spec.ts',
    line: 5,
    rule: 'TS2307',
    tool: 'typescript',
    message: "Cannot find module '@nestjs/common' or its corresponding type declarations",
    severity: 'error' as const,
  },
  {
    file: 'packages/microservices/client/client-proxy.ts',
    line: 3,
    rule: 'TS2307',
    tool: 'typescript',
    message: "Cannot find module 'rxjs' or its corresponding type declarations",
    severity: 'error' as const,
  },
];

interface TestResult {
  totalIssues: number;
  patternMatches: number;
  environmentIssues: number;
  fixNowIssues: number;
  patternDetails: Array<{
    ruleId: string;
    matched: boolean;
    patternId?: string;
    confidence?: number;
  }>;
  costSavings: {
    withoutPatterns: number;
    withPatterns: number;
    savings: number;
    savingsPercent: number;
  };
}

function testPatternMatching(): TestResult {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║  TESTING PATTERN FIX GENERATION                                      ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log('');

  // Show available patterns
  console.log('┌─────────────────────────────────────────────────────────────────────┐');
  console.log('│  AVAILABLE NESTJS PATTERNS                                          │');
  console.log('├─────────────────────────────────────────────────────────────────────┤');
  for (const pattern of NESTJS_PATTERNS) {
    console.log(`│  ${pattern.ruleId.padEnd(25)} Confidence: ${pattern.fixConfidence}%`.padEnd(70) + '│');
  }
  console.log('└─────────────────────────────────────────────────────────────────────┘');
  console.log('');

  // Run classification
  const result = classifyIssuesForFramework(
    SAMPLE_NESTJS_ISSUES,
    'nestjs',
    '/tmp/nestjs-repo',
    false // Dependencies not installed (simulate real scan)
  );

  // Analyze results
  const patternDetails: TestResult['patternDetails'] = [];

  for (const issue of result.issues) {
    const matched = issue.disposition === 'PATTERN_REUSE';
    patternDetails.push({
      ruleId: issue.ruleId,
      matched,
      patternId: issue.patternId,
      confidence: issue.patternConfidence,
    });
  }

  // Print classification results
  console.log('┌─────────────────────────────────────────────────────────────────────┐');
  console.log('│  CLASSIFICATION RESULTS                                             │');
  console.log('├─────────────────────────────────────────────────────────────────────┤');
  console.log(`│  Total Issues:           ${result.total.toString().padEnd(42)}│`);
  console.log(`│  PATTERN_REUSE:          ${result.byDisposition.PATTERN_REUSE.toString().padEnd(42)}│`);
  console.log(`│  FIX_NOW:                ${result.byDisposition.FIX_NOW.toString().padEnd(42)}│`);
  console.log(`│  ENVIRONMENT_ISSUE:      ${result.byDisposition.ENVIRONMENT_ISSUE.toString().padEnd(42)}│`);
  console.log(`│  ADD_TO_PATTERNS:        ${result.byDisposition.ADD_TO_PATTERNS.toString().padEnd(42)}│`);
  console.log('└─────────────────────────────────────────────────────────────────────┘');
  console.log('');

  // Print individual issue analysis
  console.log('┌─────────────────────────────────────────────────────────────────────┐');
  console.log('│  INDIVIDUAL ISSUE ANALYSIS                                          │');
  console.log('├─────────────────────────────────────────────────────────────────────┤');

  for (const issue of result.issues) {
    const status = issue.disposition === 'PATTERN_REUSE' ? '✅ PATTERN' :
                   issue.disposition === 'ENVIRONMENT_ISSUE' ? '🔧 ENV' :
                   issue.disposition === 'FIX_NOW' ? '🤖 AI' : '❓';
    const conf = issue.patternConfidence ? ` (${issue.patternConfidence}%)` : '';
    console.log(`│  ${status} ${issue.ruleId.padEnd(20)} ${issue.disposition.padEnd(18)}${conf.padEnd(10)}│`);
  }
  console.log('└─────────────────────────────────────────────────────────────────────┘');
  console.log('');

  // Print fix templates for pattern matches
  console.log('┌─────────────────────────────────────────────────────────────────────┐');
  console.log('│  FIX TEMPLATES (from patterns)                                      │');
  console.log('├─────────────────────────────────────────────────────────────────────┤');

  const seenPatterns = new Set<string>();
  for (const issue of result.issues) {
    if (issue.disposition === 'PATTERN_REUSE' && issue.patternId && !seenPatterns.has(issue.patternId)) {
      seenPatterns.add(issue.patternId);
      const pattern = findPattern(issue.ruleId, 'nestjs');
      if (pattern) {
        console.log(`│                                                                     │`);
        console.log(`│  📋 ${issue.ruleId} - ${pattern.id}`.padEnd(70) + '│');
        console.log(`│  ${'─'.repeat(67)}│`);
        // Print first 3 lines of fix template
        const lines = pattern.fixTemplate.split('\n').slice(0, 3);
        for (const line of lines) {
          const truncated = line.substring(0, 65);
          console.log(`│    ${truncated}`.padEnd(70) + '│');
        }
        console.log(`│    ...`.padEnd(70) + '│');
      }
    }
  }
  console.log('└─────────────────────────────────────────────────────────────────────┘');
  console.log('');

  // Cost analysis
  console.log('┌─────────────────────────────────────────────────────────────────────┐');
  console.log('│  COST ANALYSIS                                                      │');
  console.log('├─────────────────────────────────────────────────────────────────────┤');
  console.log(`│  Without patterns: $${result.costAnalysis.withoutPatterns.toFixed(4).padEnd(46)}│`);
  console.log(`│  With patterns:    $${result.costAnalysis.withPatterns.toFixed(4).padEnd(46)}│`);
  console.log(`│  Savings:          $${result.costAnalysis.savings.toFixed(4)} (${result.costAnalysis.savingsPercent.toFixed(0)}%)`.padEnd(69) + '│');
  console.log('└─────────────────────────────────────────────────────────────────────┘');
  console.log('');

  // Pattern registry stats
  const stats = getPatternStats();
  console.log('┌─────────────────────────────────────────────────────────────────────┐');
  console.log('│  PATTERN REGISTRY STATS                                             │');
  console.log('├─────────────────────────────────────────────────────────────────────┤');
  console.log(`│  Total Patterns:    ${stats.totalPatterns.toString().padEnd(47)}│`);
  console.log(`│  Avg Confidence:    ${stats.avgConfidence.toFixed(1)}%`.padEnd(69) + '│');
  console.log('│                                                                     │');
  console.log('│  By Framework:                                                      │');
  for (const [fw, count] of Object.entries(stats.byFramework)) {
    console.log(`│    ${fw.padEnd(15)} ${count.toString().padEnd(51)}│`);
  }
  console.log('│                                                                     │');
  console.log('│  By Tool:                                                           │');
  for (const [tool, count] of Object.entries(stats.byTool)) {
    console.log(`│    ${tool.padEnd(15)} ${count.toString().padEnd(51)}│`);
  }
  console.log('└─────────────────────────────────────────────────────────────────────┘');
  console.log('');

  return {
    totalIssues: result.total,
    patternMatches: result.byDisposition.PATTERN_REUSE,
    environmentIssues: result.byDisposition.ENVIRONMENT_ISSUE,
    fixNowIssues: result.byDisposition.FIX_NOW,
    patternDetails,
    costSavings: result.costAnalysis,
  };
}

// Run test
console.log('\n🧪 Running Pattern Fix Generation Test...\n');

const testResult = testPatternMatching();

// Summary
console.log('╔══════════════════════════════════════════════════════════════════════╗');
console.log('║  TEST SUMMARY                                                        ║');
console.log('╠══════════════════════════════════════════════════════════════════════╣');

const patternRate = (testResult.patternMatches / (testResult.patternMatches + testResult.fixNowIssues) * 100).toFixed(0);
const envRate = (testResult.environmentIssues / testResult.totalIssues * 100).toFixed(0);

console.log(`║  Pattern Match Rate:  ${patternRate}% of fixable issues`.padEnd(69) + '║');
console.log(`║  Environment Filter:  ${envRate}% of total issues filtered`.padEnd(69) + '║');
console.log(`║  Cost Savings:        ${testResult.costSavings.savingsPercent.toFixed(0)}%`.padEnd(69) + '║');
console.log('║                                                                       ║');

if (testResult.patternMatches >= 8 && testResult.environmentIssues >= 2) {
  console.log('║  ✅ PATTERNS ARE WORKING CORRECTLY!                                  ║');
} else {
  console.log('║  ⚠️  Some patterns may not be matching as expected                   ║');
}

console.log('╚══════════════════════════════════════════════════════════════════════╝');
console.log('');
