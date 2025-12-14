/**
 * Analyze Issues for Pattern Collection
 *
 * Takes existing issue data and applies framework classification to show:
 * - Which issues should be fixed by AI (FIX_NOW)
 * - Which should create new patterns (ADD_TO_PATTERNS)
 * - Which are intentional use (INTENTIONAL_USE)
 * - Which should be filtered (FILTER_OUT, ENVIRONMENT_ISSUE)
 * - Which need manual review (MANUAL_REVIEW)
 * - Fix tier breakdown (Tier 1, 2, 3)
 */

import * as fs from 'fs';
import * as path from 'path';
import { classifyIssuesForFramework } from '../../src/fix-agent/services/framework-issue-classifier';
import type { Framework, IssueDisposition } from '../../src/fix-agent/types/framework-issue-types';
import { FRAMEWORK_CONFIGS } from '../../src/fix-agent/framework-configs';

interface RawIssue {
  file: string;
  line: number;
  column?: number;
  rule?: string;
  ruleId?: string;
  tool: string;
  message?: string;
  severity: string;
  category?: string;
}

interface AnalysisResult {
  framework: string;
  totalIssues: number;

  // By disposition
  byDisposition: Record<IssueDisposition, number>;

  // By fix tier
  byFixTier: {
    tier1_native: number;      // Tool's native fix
    tier2_pattern: number;     // Pattern-based fix
    tier3_ai: number;          // AI-generated fix
    unfixable: number;         // Filtered/intentional
  };

  // Issues that should create patterns
  patternCandidates: Array<{
    ruleId: string;
    tool: string;
    count: number;
    severity: string;
    disposition: IssueDisposition;
    sampleFile: string;
    sampleMessage: string;
  }>;

  // Issues that are intentional (don't fix)
  intentionalUses: Array<{
    ruleId: string;
    tool: string;
    count: number;
    reason: string;
    sampleFile: string;
  }>;

  // Environment issues (need setup, not code fix)
  environmentIssues: Array<{
    ruleId: string;
    count: number;
    fixCommand: string;
  }>;

  // Cost analysis
  costAnalysis: {
    withoutPatterns: number;
    withPatterns: number;
    savings: number;
    savingsPercent: number;
  };
}

// AI cost per fix (roughly $0.0006 per issue)
const AI_COST_PER_FIX = 0.0006;
const PATTERN_COST_PER_FIX = 0.00001;

function analyzeIssues(issues: RawIssue[], framework: Framework): AnalysisResult {
  // Normalize issues
  const normalizedIssues = issues.map(i => ({
    file: i.file,
    line: i.line,
    column: i.column || 0,
    rule: i.rule || i.ruleId || 'unknown',
    ruleId: i.ruleId || i.rule || 'unknown',
    tool: i.tool,
    message: i.message || '',
    severity: (i.severity as 'critical' | 'high' | 'medium' | 'low') || 'medium',
    category: (i.category as 'NEW' | 'EXISTING') || 'EXISTING',
  }));

  // Run classification
  const result = classifyIssuesForFramework(
    normalizedIssues,
    framework,
    '/tmp/repo', // Dummy path
    false // Not fully set up
  );

  // Count by disposition
  const byDisposition: Record<IssueDisposition, number> = {
    'FIX_NOW': 0,
    'ADD_TO_PATTERNS': 0,
    'PATTERN_REUSE': 0,
    'FILTER_OUT': 0,
    'INTENTIONAL_USE': 0,
    'ENVIRONMENT_ISSUE': 0,
    'MANUAL_REVIEW': 0,
    'SKIP_FOR_FRAMEWORK': 0,
  };

  for (const issue of result.issues) {
    byDisposition[issue.disposition]++;
  }

  // Count by fix tier
  const byFixTier = {
    tier1_native: 0,
    tier2_pattern: 0,
    tier3_ai: 0,
    unfixable: 0,
  };

  for (const issue of result.issues) {
    if (issue.disposition === 'FILTER_OUT' ||
        issue.disposition === 'INTENTIONAL_USE' ||
        issue.disposition === 'ENVIRONMENT_ISSUE' ||
        issue.disposition === 'SKIP_FOR_FRAMEWORK') {
      byFixTier.unfixable++;
    } else if (issue.disposition === 'PATTERN_REUSE') {
      byFixTier.tier2_pattern++;
    } else if (issue.fixTier === 1) {
      byFixTier.tier1_native++;
    } else if (issue.fixTier === 2) {
      byFixTier.tier2_pattern++;
    } else {
      byFixTier.tier3_ai++;
    }
  }

  // Group issues by rule for pattern candidates
  const ruleGroups = new Map<string, {
    count: number;
    tool: string;
    severity: string;
    disposition: IssueDisposition;
    sampleFile: string;
    sampleMessage: string;
  }>();

  for (const issue of result.issues) {
    const key = issue.ruleId;
    const existing = ruleGroups.get(key);
    if (!existing) {
      ruleGroups.set(key, {
        count: 1,
        tool: issue.tool,
        severity: issue.severity,
        disposition: issue.disposition,
        sampleFile: issue.file,
        sampleMessage: issue.message || '',
      });
    } else {
      existing.count++;
    }
  }

  // Pattern candidates: rules with 3+ occurrences that are FIX_NOW or ADD_TO_PATTERNS
  const patternCandidates = Array.from(ruleGroups.entries())
    .filter(([_, data]) =>
      data.count >= 3 &&
      (data.disposition === 'FIX_NOW' || data.disposition === 'ADD_TO_PATTERNS')
    )
    .map(([ruleId, data]) => ({
      ruleId,
      ...data,
    }))
    .sort((a, b) => b.count - a.count);

  // Intentional uses
  const intentionalGroups = new Map<string, {
    count: number;
    tool: string;
    reason: string;
    sampleFile: string;
  }>();

  for (const issue of result.issues) {
    if (issue.disposition === 'INTENTIONAL_USE') {
      const key = issue.ruleId;
      const existing = intentionalGroups.get(key);
      if (!existing) {
        intentionalGroups.set(key, {
          count: 1,
          tool: issue.tool,
          reason: issue.dispositionReason || 'Framework-specific intentional pattern',
          sampleFile: issue.file,
        });
      } else {
        existing.count++;
      }
    }
  }

  const intentionalUses = Array.from(intentionalGroups.entries())
    .map(([ruleId, data]) => ({ ruleId, ...data }))
    .sort((a, b) => b.count - a.count);

  // Environment issues
  const envGroups = new Map<string, { count: number; fixCommand: string }>();

  for (const issue of result.issues) {
    if (issue.disposition === 'ENVIRONMENT_ISSUE') {
      const key = issue.ruleId;
      const existing = envGroups.get(key);
      if (!existing) {
        // Get fix command from framework config
        const config = FRAMEWORK_CONFIGS[framework];
        const envReq = config?.environmentRequirements?.find(r =>
          r.relatedErrorPatterns.some(p => issue.message?.includes(p) || issue.ruleId.includes(p.replace(/'/g, '')))
        );
        envGroups.set(key, {
          count: 1,
          fixCommand: envReq?.fixCommand || 'npm install',
        });
      } else {
        existing.count++;
      }
    }
  }

  const environmentIssues = Array.from(envGroups.entries())
    .map(([ruleId, data]) => ({ ruleId, ...data }))
    .sort((a, b) => b.count - a.count);

  // Cost analysis
  const fixableCount = byFixTier.tier1_native + byFixTier.tier2_pattern + byFixTier.tier3_ai;
  const withoutPatterns = fixableCount * AI_COST_PER_FIX;
  const withPatterns =
    byFixTier.tier3_ai * AI_COST_PER_FIX +
    byFixTier.tier2_pattern * PATTERN_COST_PER_FIX +
    byFixTier.tier1_native * 0; // Native fixes are free
  const savings = withoutPatterns - withPatterns;

  return {
    framework,
    totalIssues: issues.length,
    byDisposition,
    byFixTier,
    patternCandidates,
    intentionalUses,
    environmentIssues,
    costAnalysis: {
      withoutPatterns: Math.round(withoutPatterns * 10000) / 10000,
      withPatterns: Math.round(withPatterns * 10000) / 10000,
      savings: Math.round(savings * 10000) / 10000,
      savingsPercent: withoutPatterns > 0 ? Math.round((savings / withoutPatterns) * 100) : 0,
    },
  };
}

function printReport(result: AnalysisResult): void {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log(`║  FRAMEWORK PATTERN ANALYSIS: ${result.framework.toUpperCase().padEnd(38)}║`);
  console.log('╠══════════════════════════════════════════════════════════════════════╣');
  console.log(`║  Total Issues: ${result.totalIssues.toString().padEnd(52)}║`);
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log('');

  // By Disposition
  console.log('┌─────────────────────────────────────────────────────────────────────┐');
  console.log('│  ISSUE DISPOSITION (What to do with each issue)                    │');
  console.log('├─────────────────────────────────────────────────────────────────────┤');
  console.log(`│  ✅ FIX_NOW (AI fix needed):        ${result.byDisposition.FIX_NOW.toString().padStart(5)}                          │`);
  console.log(`│  📚 ADD_TO_PATTERNS (fix + learn):  ${result.byDisposition.ADD_TO_PATTERNS.toString().padStart(5)}                          │`);
  console.log(`│  ♻️  PATTERN_REUSE (free fix):       ${result.byDisposition.PATTERN_REUSE.toString().padStart(5)}                          │`);
  console.log(`│  🚫 FILTER_OUT (false positive):    ${result.byDisposition.FILTER_OUT.toString().padStart(5)}                          │`);
  console.log(`│  ✓  INTENTIONAL_USE (by design):    ${result.byDisposition.INTENTIONAL_USE.toString().padStart(5)}                          │`);
  console.log(`│  🔧 ENVIRONMENT_ISSUE (need setup): ${result.byDisposition.ENVIRONMENT_ISSUE.toString().padStart(5)}                          │`);
  console.log(`│  👀 MANUAL_REVIEW (human needed):   ${result.byDisposition.MANUAL_REVIEW.toString().padStart(5)}                          │`);
  console.log('└─────────────────────────────────────────────────────────────────────┘');
  console.log('');

  // By Fix Tier
  console.log('┌─────────────────────────────────────────────────────────────────────┐');
  console.log('│  FIX TIER BREAKDOWN (How issues will be fixed)                     │');
  console.log('├─────────────────────────────────────────────────────────────────────┤');
  console.log(`│  Tier 1 - Native Tool Fix:          ${result.byFixTier.tier1_native.toString().padStart(5)}  (FREE)                  │`);
  console.log(`│  Tier 2 - Pattern-Based Fix:        ${result.byFixTier.tier2_pattern.toString().padStart(5)}  (~$0.00001 each)        │`);
  console.log(`│  Tier 3 - AI-Generated Fix:         ${result.byFixTier.tier3_ai.toString().padStart(5)}  (~$0.0006 each)         │`);
  console.log(`│  Unfixable (filtered/intentional):  ${result.byFixTier.unfixable.toString().padStart(5)}  (no action needed)      │`);
  console.log('└─────────────────────────────────────────────────────────────────────┘');
  console.log('');

  // Pattern Candidates
  if (result.patternCandidates.length > 0) {
    console.log('┌─────────────────────────────────────────────────────────────────────┐');
    console.log('│  PATTERN CANDIDATES (Rules with 3+ occurrences - invest to save)   │');
    console.log('├─────────────────────────────────────────────────────────────────────┤');
    for (const p of result.patternCandidates.slice(0, 10)) {
      const ruleName = p.ruleId.substring(0, 40).padEnd(40);
      const count = p.count.toString().padStart(4);
      console.log(`│  ${ruleName} ${count}x (${p.tool})${' '.repeat(Math.max(0, 10 - p.tool.length))}│`);
    }
    if (result.patternCandidates.length > 10) {
      console.log(`│  ... and ${result.patternCandidates.length - 10} more pattern candidates                            │`);
    }
    console.log('└─────────────────────────────────────────────────────────────────────┘');
    console.log('');
  }

  // Environment Issues
  if (result.environmentIssues.length > 0) {
    console.log('┌─────────────────────────────────────────────────────────────────────┐');
    console.log('│  ENVIRONMENT ISSUES (Fix with setup commands, not code)            │');
    console.log('├─────────────────────────────────────────────────────────────────────┤');
    for (const e of result.environmentIssues.slice(0, 5)) {
      console.log(`│  ${e.ruleId.padEnd(15)} ${e.count.toString().padStart(4)}x → Run: ${e.fixCommand.substring(0, 30)}│`);
    }
    console.log('└─────────────────────────────────────────────────────────────────────┘');
    console.log('');
  }

  // Cost Analysis
  console.log('┌─────────────────────────────────────────────────────────────────────┐');
  console.log('│  COST ANALYSIS (Pattern Flywheel Savings)                          │');
  console.log('├─────────────────────────────────────────────────────────────────────┤');
  console.log(`│  Without patterns (all AI):  $${result.costAnalysis.withoutPatterns.toFixed(4).padStart(8)}                        │`);
  console.log(`│  With patterns:              $${result.costAnalysis.withPatterns.toFixed(4).padStart(8)}                        │`);
  console.log(`│  Savings:                    $${result.costAnalysis.savings.toFixed(4).padStart(8)} (${result.costAnalysis.savingsPercent}%)                  │`);
  console.log('└─────────────────────────────────────────────────────────────────────┘');
  console.log('');
}

// Main
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const inputFile = args[0];
  const framework = (args[1] || 'nestjs') as Framework;

  if (!inputFile) {
    console.log('Usage: npx ts-node analyze-issues-for-patterns.ts <input.json> [framework]');
    console.log('');
    console.log('Example: npx ts-node analyze-issues-for-patterns.ts test-outputs/nestjs-pro-tier/nestjs-pro-issues-2025-12-09T00-09-27-529Z.json nestjs');
    process.exit(1);
  }

  console.log(`Loading issues from: ${inputFile}`);
  console.log(`Framework: ${framework}`);

  const data = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
  const issues = data.issues || data;

  if (!Array.isArray(issues)) {
    console.error('Error: Could not find issues array in file');
    process.exit(1);
  }

  console.log(`Found ${issues.length} issues to analyze`);

  const result = analyzeIssues(issues, framework);
  printReport(result);

  // Save results
  const outputDir = path.join(__dirname, 'test-outputs', 'pattern-analysis');
  fs.mkdirSync(outputDir, { recursive: true });
  const outputFile = path.join(outputDir, `${framework}-pattern-analysis-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
  console.log(`Results saved to: ${outputFile}`);
}

main().catch(console.error);
