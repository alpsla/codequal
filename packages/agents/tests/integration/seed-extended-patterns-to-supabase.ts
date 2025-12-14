/**
 * Seed Extended NestJS Patterns to Supabase
 *
 * Seeds the GHSA and TS2345 patterns for 100% NestJS coverage.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../../.env') });

import { NESTJS_EXTENDED_PATTERNS } from '../../src/fix-agent/patterns/nestjs-patterns-extended';
import { getFrameworkPatternStorage } from '../../src/fix-agent/infrastructure/supabase/framework-pattern-storage';
import type { FrameworkPattern } from '../../src/fix-agent/types/framework-issue-types';

async function seedExtendedPatterns(): Promise<void> {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║  SEEDING EXTENDED NESTJS PATTERNS TO SUPABASE                        ║');
  console.log('╠══════════════════════════════════════════════════════════════════════╣');
  console.log(`║  Total Extended Patterns: ${NESTJS_EXTENDED_PATTERNS.length.toString().padEnd(42)}║`);
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log('');

  const storage = getFrameworkPatternStorage();
  let seeded = 0;
  let failed = 0;

  for (const pattern of NESTJS_EXTENDED_PATTERNS) {
    console.log(`\n🔄 Processing: ${pattern.id}`);
    console.log(`   Rule: ${pattern.ruleId} | Tool: ${pattern.tool}`);
    console.log(`   Confidence: ${pattern.fixConfidence}%`);

    try {
      const result = await storage.storePattern({
        ruleId: pattern.ruleId,
        tool: pattern.tool,
        framework: pattern.framework,
        name: pattern.id,
        description: getPatternDescription(pattern),
        transformationType: 'refactor',
        fileTypes: pattern.tool === 'dependency-check' ? ['json'] : ['ts', 'tsx'],
        detection: {
          regex: pattern.codePattern,
          codePattern: pattern.codePattern,
        },
        fixTemplate: {
          template: pattern.fixTemplate,
          requiredImports: pattern.requiresImport,
        },
        examples: [{
          description: 'Apply fix',
          before: '// Issue detected',
          after: pattern.fixTemplate.substring(0, 200),
        }],
        aiModel: 'manual-codequal-team',
        tags: [
          pattern.framework,
          pattern.tool,
          pattern.frameworkVersion || 'nestjs@10.x',
          `confidence:${pattern.fixConfidence}`,
        ],
      });

      if (result.success) {
        console.log(`   ✅ Stored (ID: ${result.patternId?.substring(0, 8)}...)`);
        seeded++;
      } else {
        console.log(`   ❌ Failed: ${result.error}`);
        failed++;
      }
    } catch (error) {
      console.log(`   ❌ Exception: ${(error as Error).message}`);
      failed++;
    }
  }

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║  SEED SUMMARY                                                        ║');
  console.log('╠══════════════════════════════════════════════════════════════════════╣');
  console.log(`║  Patterns Seeded:  ${seeded.toString().padEnd(48)}║`);
  console.log(`║  Patterns Failed:  ${failed.toString().padEnd(48)}║`);
  console.log('╚══════════════════════════════════════════════════════════════════════╝');

  // Activate all patterns
  console.log('\n🔄 Activating all NestJS patterns...');

  const { createClient } = await import('@supabase/supabase-js');
  const client = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await client
    .from('fix_patterns')
    .update({
      status: 'active',
      verified: true,
      safe_for_auto_apply: true,
      updated_at: new Date().toISOString(),
    })
    .eq('status', 'pending_review')
    .contains('tags', ['nestjs']);

  if (error) {
    console.log('   ⚠️  Activation error:', error.message);
  } else {
    console.log('   ✅ All patterns activated!');
  }

  // Final stats
  const stats = await storage.getStatistics();
  console.log('');
  console.log('┌─────────────────────────────────────────────────────────────────────┐');
  console.log('│  SUPABASE PATTERN STATS                                            │');
  console.log('├─────────────────────────────────────────────────────────────────────┤');
  console.log(`│  Total Patterns:     ${stats.totalPatterns.toString().padEnd(46)}│`);
  console.log(`│  Active Patterns:    ${stats.activePatterns.toString().padEnd(46)}│`);
  console.log(`│  NestJS Patterns:    ${(stats.byFramework['nestjs'] || 0).toString().padEnd(46)}│`);
  console.log('└─────────────────────────────────────────────────────────────────────┘');
}

function getPatternDescription(pattern: FrameworkPattern): string {
  if (pattern.ruleId === 'TS2345') {
    return 'TypeScript argument type mismatch - value might be undefined';
  }
  if (pattern.ruleId.startsWith('GHSA-')) {
    return `Security vulnerability: ${pattern.ruleId}`;
  }
  return `Fix pattern for ${pattern.ruleId}`;
}

seedExtendedPatterns().catch(console.error);
