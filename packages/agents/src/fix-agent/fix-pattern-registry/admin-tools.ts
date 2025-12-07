/**
 * Admin Tools for Fix Pattern Registry
 *
 * Provides admin functionality to:
 * 1. List all patterns (by status)
 * 2. Approve pending patterns
 * 3. Reject patterns
 * 4. View pattern details
 *
 * Usage:
 *   npx ts-node src/fix-agent/fix-pattern-registry/admin-tools.ts [command]
 *
 * Commands:
 *   list [status]      - List patterns (all, pending_review, active, rejected)
 *   approve <id>       - Approve a pending pattern
 *   reject <id>        - Reject a pattern
 *   detail <id>        - View pattern details
 */

import { getFixPatternRegistry, PatternStatus, FixPattern } from './index';

// Format pattern for display
function formatPattern(pattern: FixPattern, verbose = false): string {
  const lines = [
    `[${pattern.id.substring(0, 8)}] ${pattern.name}`,
    `   Rule: ${pattern.ruleId}`,
    `   Tool: ${pattern.tool}`,
    `   Status: ${pattern.status}`,
    `   Confidence: ${pattern.confidence}%`,
    `   Created by: ${pattern.metadata.createdBy}`,
    `   Created at: ${pattern.metadata.createdAt}`,
  ];

  if (verbose) {
    lines.push(`   Description: ${pattern.description}`);
    lines.push(`   File types: ${pattern.fileTypes.join(', ')}`);
    lines.push(`   Apply count: ${pattern.metadata.applyCount}`);
    lines.push(`   Success count: ${pattern.metadata.successCount}`);
    lines.push(`   Revert count: ${pattern.metadata.revertCount}`);

    if (pattern.examples.length > 0) {
      lines.push('   Example:');
      lines.push(`     Before: ${pattern.examples[0].before.substring(0, 100)}...`);
      lines.push(`     After: ${pattern.examples[0].after.substring(0, 100)}...`);
    }
  }

  return lines.join('\n');
}

// List patterns by status
async function listPatterns(status?: PatternStatus): Promise<void> {
  const registry = getFixPatternRegistry();

  const patterns = await registry.listPatterns(status ? { status } : undefined);

  console.log('\n=== Fix Patterns ===\n');

  if (patterns.length === 0) {
    console.log(`No patterns found${status ? ` with status: ${status}` : ''}`);
    return;
  }

  // Group by status
  const byStatus: Record<string, FixPattern[]> = {};
  for (const pattern of patterns) {
    if (!byStatus[pattern.status]) byStatus[pattern.status] = [];
    byStatus[pattern.status].push(pattern);
  }

  for (const [patternStatus, patternsInStatus] of Object.entries(byStatus)) {
    console.log(`--- ${patternStatus.toUpperCase()} (${patternsInStatus.length}) ---\n`);

    for (const pattern of patternsInStatus) {
      console.log(formatPattern(pattern));
      console.log('');
    }
  }

  console.log(`\nTotal: ${patterns.length} patterns`);
}

// Approve a pending pattern
async function approvePattern(patternId: string, reviewerId: string): Promise<void> {
  const registry = getFixPatternRegistry();

  // Find the pattern
  const pattern = await registry.getPattern(patternId);

  if (!pattern) {
    // Try partial match
    const allPatterns = await registry.listPatterns();
    const matches = allPatterns.filter((p) => p.id.startsWith(patternId));

    if (matches.length === 0) {
      console.error(`Pattern not found: ${patternId}`);
      return;
    }
    if (matches.length > 1) {
      console.error(`Multiple patterns match "${patternId}":`);
      matches.forEach((m) => console.log(`  - ${m.id}: ${m.name}`));
      return;
    }

    // Use the single match
    const matchedPattern = matches[0];
    console.log(`Matched pattern: ${matchedPattern.id}`);

    if (matchedPattern.status !== 'pending_review') {
      console.error(`Pattern is not pending review (status: ${matchedPattern.status})`);
      return;
    }

    const success = await registry.updateStatus(matchedPattern.id, 'active', reviewerId);

    if (success) {
      console.log(`\n✅ Pattern APPROVED: ${matchedPattern.name}`);
      console.log(`   Pattern ID: ${matchedPattern.id}`);
      console.log(`   New status: active`);
      console.log(`   Approved by: ${reviewerId}`);
    } else {
      console.error('Failed to approve pattern');
    }
    return;
  }

  if (pattern.status !== 'pending_review') {
    console.error(`Pattern is not pending review (status: ${pattern.status})`);
    return;
  }

  const success = await registry.updateStatus(patternId, 'active', reviewerId);

  if (success) {
    console.log(`\n✅ Pattern APPROVED: ${pattern.name}`);
    console.log(`   Pattern ID: ${pattern.id}`);
    console.log(`   New status: active`);
    console.log(`   Approved by: ${reviewerId}`);
  } else {
    console.error('Failed to approve pattern');
  }
}

// Reject a pattern
async function rejectPattern(patternId: string, reviewerId: string): Promise<void> {
  const registry = getFixPatternRegistry();

  const pattern = await registry.getPattern(patternId);

  if (!pattern) {
    console.error(`Pattern not found: ${patternId}`);
    return;
  }

  const success = await registry.updateStatus(patternId, 'rejected', reviewerId);

  if (success) {
    console.log(`\n❌ Pattern REJECTED: ${pattern.name}`);
    console.log(`   Pattern ID: ${pattern.id}`);
    console.log(`   New status: rejected`);
    console.log(`   Rejected by: ${reviewerId}`);
  } else {
    console.error('Failed to reject pattern');
  }
}

// View pattern details
async function viewPatternDetail(patternId: string): Promise<void> {
  const registry = getFixPatternRegistry();

  let pattern = await registry.getPattern(patternId);

  if (!pattern) {
    // Try partial match
    const allPatterns = await registry.listPatterns();
    const matches = allPatterns.filter((p) => p.id.startsWith(patternId));

    if (matches.length === 1) {
      pattern = matches[0];
    } else if (matches.length > 1) {
      console.error(`Multiple patterns match "${patternId}":`);
      matches.forEach((m) => console.log(`  - ${m.id}: ${m.name}`));
      return;
    } else {
      console.error(`Pattern not found: ${patternId}`);
      return;
    }
  }

  console.log('\n=== Pattern Details ===\n');
  console.log(formatPattern(pattern, true));
}

// Main CLI handler
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log(`
Fix Pattern Registry - Admin Tools

Commands:
  list [status]        List patterns (all, pending_review, active, rejected)
  approve <id>         Approve a pending pattern
  reject <id>          Reject a pattern
  detail <id>          View pattern details

Examples:
  npx ts-node admin-tools.ts list
  npx ts-node admin-tools.ts list pending_review
  npx ts-node admin-tools.ts approve abc12345
  npx ts-node admin-tools.ts detail abc12345
`);
    return;
  }

  const reviewerId = process.env.ADMIN_USER || 'admin@codequal.dev';

  switch (command) {
    case 'list':
      await listPatterns(args[1] as PatternStatus | undefined);
      break;

    case 'approve':
      if (!args[1]) {
        console.error('Usage: approve <pattern-id>');
        return;
      }
      await approvePattern(args[1], reviewerId);
      break;

    case 'reject':
      if (!args[1]) {
        console.error('Usage: reject <pattern-id>');
        return;
      }
      await rejectPattern(args[1], reviewerId);
      break;

    case 'detail':
      if (!args[1]) {
        console.error('Usage: detail <pattern-id>');
        return;
      }
      await viewPatternDetail(args[1]);
      break;

    default:
      console.error(`Unknown command: ${command}`);
  }
}

main().catch(console.error);
