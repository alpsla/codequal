#!/usr/bin/env npx ts-node
/**
 * Knowledge Base Review CLI
 *
 * SESSION 81: CLI tool for reviewing and managing fix pattern guidance.
 *
 * Usage:
 *   npx ts-node kb-review-cli.ts list          # List failures needing review
 *   npx ts-node kb-review-cli.ts review <id>   # Review a specific failure
 *   npx ts-node kb-review-cli.ts guidance      # List all guidance entries
 *   npx ts-node kb-review-cli.ts add           # Interactive guidance creation
 */

import {
  getFailuresNeedingReview,
  markFailureReviewed,
  addFixGuidance,
  fixPatternGuidance,
  FailureRecord,
  FixGuidance,
} from './fix-pattern-guidance';

async function listFailures(): Promise<void> {
  console.log('\n=== Fix Failures Needing Review ===\n');

  const failures = await getFailuresNeedingReview(20);

  if (failures.length === 0) {
    console.log('No failures needing review. All patterns are performing well!');
    return;
  }

  console.log(`Found ${failures.length} patterns needing review:\n`);

  for (const failure of failures) {
    console.log(`[${failure.priority.toUpperCase()}] ${failure.ruleId} (${failure.language})`);
    console.log(`  ID: ${failure.id}`);
    console.log(`  Failures: ${failure.failureCount} times`);
    console.log(`  Tool: ${failure.tool}`);
    console.log(`  Type: ${failure.failureType}`);
    if (failure.regressionRules.length > 0) {
      console.log(`  Regressions: ${failure.regressionRules.join(', ')}`);
    }
    console.log(`  First seen: ${failure.firstSeenAt}`);
    console.log(`  Last seen: ${failure.lastSeenAt}`);
    console.log('');
  }

  console.log('To review a failure, run: npx ts-node kb-review-cli.ts review <id>');
}

async function reviewFailure(failureId: string): Promise<void> {
  console.log(`\n=== Reviewing Failure: ${failureId} ===\n`);

  const failures = await getFailuresNeedingReview(100);
  const failure = failures.find(f => f.id === failureId);

  if (!failure) {
    console.log('Failure not found. It may have been reviewed or the ID is incorrect.');
    return;
  }

  console.log(`Rule: ${failure.ruleId}`);
  console.log(`Language: ${failure.language}`);
  console.log(`Tool: ${failure.tool}`);
  console.log(`Failure Type: ${failure.failureType}`);
  console.log(`Failure Count: ${failure.failureCount}`);
  console.log(`Priority: ${failure.priority}`);
  console.log('');

  if (failure.regressionRules.length > 0) {
    console.log('Regression Rules Triggered:');
    for (const rule of failure.regressionRules) {
      console.log(`  - ${rule}`);
    }
    console.log('');
  }

  if (failure.originalCode) {
    console.log('Original Code:');
    console.log('```');
    console.log(failure.originalCode.substring(0, 500));
    if (failure.originalCode.length > 500) console.log('...(truncated)');
    console.log('```\n');
  }

  if (failure.attemptedFix) {
    console.log('Attempted Fix (that failed):');
    console.log('```');
    console.log(failure.attemptedFix.substring(0, 500));
    if (failure.attemptedFix.length > 500) console.log('...(truncated)');
    console.log('```\n');
  }

  // Generate draft guidance
  const draft = fixPatternGuidance.generateGuidanceFromFailure(failure);
  console.log('=== Suggested Guidance (Draft) ===\n');
  console.log(JSON.stringify(draft, null, 2));

  console.log('\n=== Actions ===');
  console.log('1. Add this guidance: Edit the draft above and use addFixGuidance()');
  console.log('2. Mark as reviewed: markFailureReviewed(id, "reviewed", "name", "notes")');
  console.log('3. Ignore: markFailureReviewed(id, "ignored", "name", "reason")');
}

async function listGuidance(): Promise<void> {
  console.log('\n=== Fix Pattern Guidance Entries ===\n');

  // The guidance is in the cache, so we can access it through getGuidance
  // This is a simple listing - in production you'd query the database directly
  console.log('To view all guidance entries, query the database:');
  console.log('');
  console.log('  SELECT rule_id, language, tool, success_rate, usage_count');
  console.log('  FROM fix_pattern_guidance');
  console.log('  ORDER BY usage_count DESC;');
  console.log('');
  console.log('Or in Supabase dashboard: Table Editor > fix_pattern_guidance');
}

async function interactiveAdd(): Promise<void> {
  console.log('\n=== Add New Guidance ===\n');
  console.log('To add guidance programmatically:\n');

  const example: FixGuidance = {
    ruleId: 'YourRuleId',
    language: 'java',
    tool: 'pmd',
    antiPatterns: [
      { pattern: 'describe the bad pattern', why: 'explain why it is bad' }
    ],
    correctPatterns: [
      { pattern: 'describe the good pattern', example: 'actual code example' }
    ],
    relatedRules: ['OtherRule1', 'OtherRule2'],
    guidanceText: 'When fixing YourRuleId, always do X and never do Y.',
    promptAdditions: `CRITICAL for YourRuleId:
- MUST do this
- NEVER do that
- Example of correct approach`,
    successRate: 0,
    usageCount: 0
  };

  console.log('Example guidance object:');
  console.log(JSON.stringify(example, null, 2));
  console.log('\nTo add, use:');
  console.log('  await addFixGuidance(guidanceObject);');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  try {
    switch (command) {
      case 'list':
        await listFailures();
        break;
      case 'review':
        if (!args[1]) {
          console.log('Usage: npx ts-node kb-review-cli.ts review <failure-id>');
          return;
        }
        await reviewFailure(args[1]);
        break;
      case 'guidance':
        await listGuidance();
        break;
      case 'add':
        await interactiveAdd();
        break;
      case 'help':
      default:
        console.log(`
Knowledge Base Review CLI

Commands:
  list              List failures needing review (failed 3+ times)
  review <id>       Review a specific failure with suggested guidance
  guidance          Information about viewing guidance entries
  add               Show how to add new guidance programmatically
  help              Show this help message

Examples:
  npx ts-node kb-review-cli.ts list
  npx ts-node kb-review-cli.ts review abc123-def456
  npx ts-node kb-review-cli.ts guidance

Environment:
  Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to be set
`);
    }
  } catch (error: any) {
    console.error('Error:', error.message);
    if (error.message.includes('Supabase')) {
      console.log('\nMake sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
    }
  }
}

main();
