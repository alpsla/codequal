#!/usr/bin/env npx ts-node
/**
 * Knowledge Base AI Maintainer
 *
 * SESSION 81: AI-assisted KB maintenance script.
 * Analyzes failed fix patterns and generates guidance automatically.
 *
 * This script is designed to be run by Claude or scheduled as a job.
 *
 * Usage:
 *   npx ts-node kb-ai-maintainer.ts                    # Process all pending
 *   npx ts-node kb-ai-maintainer.ts --rule CloseResource  # Specific rule
 *   npx ts-node kb-ai-maintainer.ts --dry-run          # Preview only
 *   npx ts-node kb-ai-maintainer.ts --auto-approve     # No human confirmation
 */

import {
  getFailuresNeedingReview,
  markFailureReviewed,
  addFixGuidance,
  FailureRecord,
  FixGuidance,
  AntiPattern,
  CorrectPattern,
} from './fix-pattern-guidance';

// ============================================================================
// Configuration
// ============================================================================

interface MaintainerConfig {
  dryRun: boolean;
  autoApprove: boolean;
  ruleFilter?: string;
  maxFailures: number;
}

// ============================================================================
// Analysis Logic
// ============================================================================

interface FailureAnalysis {
  failure: FailureRecord;
  attempts: Array<{
    attempt: number;
    fix: string;
    regressions?: Array<{ rule: string; message: string }>;
    reason?: string;
  }>;
  commonRegressions: Map<string, number>;
  rootCauses: string[];
  suggestedGuidance: Partial<FixGuidance>;
}

/**
 * Parse the attempted_fix JSON to extract all attempts
 */
function parseAttempts(failure: FailureRecord): FailureAnalysis['attempts'] {
  if (!failure.attemptedFix) {
    return [{
      attempt: 1,
      fix: 'Unknown',
      reason: failure.failureMessage,
    }];
  }

  try {
    // The attemptedFix field now contains JSON with all attempts
    const parsed = JSON.parse(failure.attemptedFix);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    // Legacy format: single fix string
    return [{
      attempt: 1,
      fix: failure.attemptedFix,
      regressions: failure.regressionRules.map(r => ({ rule: r, message: '' })),
    }];
  } catch {
    // Plain text fix
    return [{
      attempt: 1,
      fix: failure.attemptedFix,
      regressions: failure.regressionRules.map(r => ({ rule: r, message: '' })),
    }];
  }
}

/**
 * Analyze failure patterns and identify root causes
 */
function analyzeFailure(failure: FailureRecord): FailureAnalysis {
  const attempts = parseAttempts(failure);

  // Count regression occurrences
  const commonRegressions = new Map<string, number>();
  for (const attempt of attempts) {
    for (const reg of attempt.regressions || []) {
      commonRegressions.set(reg.rule, (commonRegressions.get(reg.rule) || 0) + 1);
    }
  }

  // Identify root causes based on patterns
  const rootCauses: string[] = [];

  if (commonRegressions.has('EmptyCatchBlock')) {
    rootCauses.push('AI generates empty catch blocks when adding exception handling');
  }
  if (commonRegressions.has('AvoidCatchingThrowable')) {
    rootCauses.push('AI uses overly broad exception catching (Throwable/Exception)');
  }
  if (commonRegressions.has('CloseResource')) {
    rootCauses.push('AI does not properly use try-with-resources for resource management');
  }
  if (commonRegressions.has('UseUtilityClass')) {
    rootCauses.push('AI forgets to add private constructor to utility classes');
  }

  // If no specific root cause identified
  if (rootCauses.length === 0) {
    rootCauses.push(`AI fix triggers ${Array.from(commonRegressions.keys()).join(', ')}`);
  }

  // Generate suggested guidance
  const suggestedGuidance = generateGuidanceFromAnalysis(failure, attempts, commonRegressions);

  return {
    failure,
    attempts,
    commonRegressions,
    rootCauses,
    suggestedGuidance,
  };
}

/**
 * Generate guidance based on failure analysis
 */
function generateGuidanceFromAnalysis(
  failure: FailureRecord,
  attempts: FailureAnalysis['attempts'],
  commonRegressions: Map<string, number>
): Partial<FixGuidance> {
  const antiPatterns: AntiPattern[] = [];
  const correctPatterns: CorrectPattern[] = [];
  const relatedRules: string[] = Array.from(commonRegressions.keys());

  // Generate anti-patterns from failed attempts
  for (const attempt of attempts) {
    if (attempt.regressions) {
      for (const reg of attempt.regressions) {
        const ruleLower = reg.rule.toLowerCase();

        if (ruleLower.includes('emptycatch') && !antiPatterns.find(a => a.pattern.includes('empty catch'))) {
          antiPatterns.push({
            pattern: 'empty catch block',
            why: 'Swallows exceptions silently, making debugging impossible. Always log or handle.'
          });
          correctPatterns.push({
            pattern: 'log and rethrow',
            example: 'catch(IOException e) { log.error("Operation failed", e); throw new RuntimeException(e); }'
          });
        }

        if (ruleLower.includes('throwable') && !antiPatterns.find(a => a.pattern.includes('Throwable'))) {
          antiPatterns.push({
            pattern: 'catching Throwable or Exception',
            why: 'Too broad - catches Errors like OutOfMemoryError that should crash the JVM'
          });
          correctPatterns.push({
            pattern: 'catch specific exceptions',
            example: 'catch(IOException | SQLException e) { ... }'
          });
        }

        if (ruleLower.includes('closeresource') && !antiPatterns.find(a => a.pattern.includes('manual close'))) {
          antiPatterns.push({
            pattern: 'manual close() calls',
            why: 'Error-prone - may not run if exception thrown before close()'
          });
          correctPatterns.push({
            pattern: 'try-with-resources',
            example: 'try (var stream = new FileInputStream(file)) { /* use stream */ }'
          });
        }

        if (ruleLower.includes('utility') && !antiPatterns.find(a => a.pattern.includes('constructor'))) {
          antiPatterns.push({
            pattern: 'missing private constructor',
            why: 'Allows instantiation of utility class which should not be instantiated'
          });
          correctPatterns.push({
            pattern: 'private constructor',
            example: 'private ClassName() { throw new UnsupportedOperationException("Utility class"); }'
          });
        }
      }
    }
  }

  // If no specific patterns identified, add generic ones
  if (antiPatterns.length === 0) {
    antiPatterns.push({
      pattern: `patterns that trigger ${relatedRules.join(', ')}`,
      why: 'These patterns caused validation failures in previous fix attempts'
    });
  }

  // Build prompt additions
  let promptAdditions = `CRITICAL for ${failure.ruleId}:\n`;
  for (const anti of antiPatterns) {
    promptAdditions += `- NEVER: ${anti.pattern}\n`;
  }
  for (const correct of correctPatterns) {
    promptAdditions += `- ALWAYS: ${correct.pattern}\n`;
  }
  if (relatedRules.length > 0) {
    promptAdditions += `\nWATCH OUT: Your fix must not trigger these rules: ${relatedRules.join(', ')}`;
  }

  return {
    ruleId: failure.ruleId,
    language: failure.language,
    tool: failure.tool,
    antiPatterns,
    correctPatterns,
    relatedRules,
    guidanceText: `When fixing ${failure.ruleId}, avoid patterns that have caused ${failure.failureCount} validation failures.`,
    promptAdditions,
    successRate: 0,
    usageCount: 0,
  };
}

// ============================================================================
// Main Maintenance Flow
// ============================================================================

async function runMaintenance(config: MaintainerConfig): Promise<void> {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('       KNOWLEDGE BASE AI MAINTAINER');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (config.dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  // Fetch failures
  console.log('Fetching failures needing review...\n');
  let failures = await getFailuresNeedingReview(config.maxFailures);

  if (config.ruleFilter) {
    failures = failures.filter(f =>
      f.ruleId.toLowerCase().includes(config.ruleFilter!.toLowerCase())
    );
    console.log(`Filtered to rule: ${config.ruleFilter}`);
  }

  if (failures.length === 0) {
    console.log('✅ No failures needing review. Knowledge base is up to date!\n');
    return;
  }

  console.log(`Found ${failures.length} patterns needing review:\n`);

  // Analyze each failure
  const analyses: FailureAnalysis[] = [];
  for (const failure of failures) {
    const analysis = analyzeFailure(failure);
    analyses.push(analysis);
  }

  // Display and process each
  let processed = 0;
  let skipped = 0;

  for (const analysis of analyses) {
    console.log('───────────────────────────────────────────────────────────────');
    console.log(`📋 ${analysis.failure.ruleId} (${analysis.failure.language}/${analysis.failure.tool})`);
    console.log(`   Failures: ${analysis.failure.failureCount} | Priority: ${analysis.failure.priority.toUpperCase()}`);
    console.log('───────────────────────────────────────────────────────────────\n');

    // Show attempts
    console.log('📊 Attempt Analysis:');
    for (const attempt of analysis.attempts) {
      const status = attempt.regressions?.length ? '❌' : '✅';
      console.log(`   ${status} Attempt ${attempt.attempt}:`);
      if (attempt.fix) {
        const fixPreview = attempt.fix.length > 60 ? attempt.fix.substring(0, 60) + '...' : attempt.fix;
        console.log(`      Fix: ${fixPreview}`);
      }
      if (attempt.regressions?.length) {
        console.log(`      Regressions: ${attempt.regressions.map(r => r.rule).join(', ')}`);
      }
    }

    // Show root causes
    console.log('\n🔍 Root Causes:');
    for (const cause of analysis.rootCauses) {
      console.log(`   • ${cause}`);
    }

    // Show suggested guidance
    const guidance = analysis.suggestedGuidance;
    console.log('\n📝 Suggested Guidance:');
    console.log('   Anti-patterns:');
    for (const anti of guidance.antiPatterns || []) {
      console.log(`     ❌ ${anti.pattern}: ${anti.why}`);
    }
    console.log('   Correct patterns:');
    for (const correct of guidance.correctPatterns || []) {
      console.log(`     ✅ ${correct.pattern}`);
      console.log(`        Example: ${correct.example}`);
    }

    console.log('\n   Prompt additions:');
    console.log('   ' + (guidance.promptAdditions || '').split('\n').join('\n   '));

    // Apply if not dry run
    if (!config.dryRun) {
      if (config.autoApprove) {
        console.log('\n⚡ Auto-approving...');
      } else {
        console.log('\n⏳ Would add this guidance (use --auto-approve to apply)');
        skipped++;
        continue;
      }

      try {
        // Add guidance
        await addFixGuidance(guidance as FixGuidance);
        console.log('   ✅ Added guidance to KB');

        // Mark failure as resolved
        await markFailureReviewed(
          analysis.failure.id,
          'guidance_added',
          'claude-kb-maintainer',
          `Auto-generated guidance after analyzing ${analysis.attempts.length} failed attempts`
        );
        console.log('   ✅ Marked failure as resolved');

        processed++;
      } catch (e: any) {
        console.log(`   ❌ Error: ${e.message}`);
      }
    } else {
      console.log('\n   [DRY RUN - No changes made]');
      skipped++;
    }

    console.log('');
  }

  // Summary
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                         SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`   Total analyzed: ${analyses.length}`);
  console.log(`   Processed: ${processed}`);
  console.log(`   Skipped: ${skipped}`);
  if (config.dryRun) {
    console.log('\n   Run with --auto-approve to apply changes');
  }
  console.log('═══════════════════════════════════════════════════════════════\n');
}

// ============================================================================
// CLI Entry Point
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const config: MaintainerConfig = {
    dryRun: args.includes('--dry-run'),
    autoApprove: args.includes('--auto-approve'),
    maxFailures: 50,
  };

  // Parse --rule flag
  const ruleIndex = args.indexOf('--rule');
  if (ruleIndex !== -1 && args[ruleIndex + 1]) {
    config.ruleFilter = args[ruleIndex + 1];
  }

  // Parse --max flag
  const maxIndex = args.indexOf('--max');
  if (maxIndex !== -1 && args[maxIndex + 1]) {
    config.maxFailures = parseInt(args[maxIndex + 1], 10) || 50;
  }

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Knowledge Base AI Maintainer

Usage:
  npx ts-node kb-ai-maintainer.ts [options]

Options:
  --dry-run       Preview changes without applying
  --auto-approve  Apply changes without confirmation
  --rule <name>   Filter to specific rule (e.g., CloseResource)
  --max <n>       Maximum failures to process (default: 50)
  --help, -h      Show this help message

Examples:
  npx ts-node kb-ai-maintainer.ts --dry-run
  npx ts-node kb-ai-maintainer.ts --auto-approve
  npx ts-node kb-ai-maintainer.ts --rule CloseResource --auto-approve

Environment:
  Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
`);
    return;
  }

  try {
    await runMaintenance(config);
  } catch (error: any) {
    console.error('Error:', error.message);
    if (error.message.includes('Supabase')) {
      console.log('\nMake sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
    }
    process.exit(1);
  }
}

main();
