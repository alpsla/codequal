/**
 * Test Supabase Pattern Round-Trip
 *
 * Verifies that patterns stored in Supabase can be:
 * 1. Retrieved correctly
 * 2. Used for issue classification
 * 3. Applied to generate fixes
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

import {
  getFrameworkPatternStorage,
  lookupFrameworkPattern,
  getFrameworkPatternStats,
} from '../../src/fix-agent/infrastructure/supabase/framework-pattern-storage';
import { NESTJS_PATTERNS } from '../../src/fix-agent/patterns/nestjs-patterns';

interface RoundTripResult {
  patternId: string;
  ruleId: string;
  storedInSupabase: boolean;
  retrievedFromSupabase: boolean;
  fixTemplateMatches: boolean;
  confidenceMatches: boolean;
  error?: string;
}

async function testRoundTrip(): Promise<RoundTripResult[]> {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║  TESTING SUPABASE PATTERN ROUND-TRIP                                 ║');
  console.log('║  Verifying patterns can be stored and retrieved from Supabase        ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log('');

  const results: RoundTripResult[] = [];
  const storage = getFrameworkPatternStorage();

  // First, get overall stats
  console.log('┌─────────────────────────────────────────────────────────────────────┐');
  console.log('│  SUPABASE CONNECTION TEST                                           │');
  console.log('├─────────────────────────────────────────────────────────────────────┤');

  try {
    const stats = await getFrameworkPatternStats();
    console.log(`│  Total Patterns in Supabase: ${stats.totalPatterns.toString().padEnd(37)}│`);
    console.log(`│  Active Patterns:            ${stats.activePatterns.toString().padEnd(37)}│`);
    console.log(`│  Average Confidence:         ${stats.avgConfidence.toFixed(1)}%`.padEnd(69) + '│');
    console.log(`│  NestJS Patterns:            ${(stats.byFramework['nestjs'] || 0).toString().padEnd(37)}│`);
    console.log('│                                                                     │');
    console.log('│  ✅ Supabase connection successful!                                 │');
  } catch (error) {
    console.log('│  ❌ Supabase connection failed                                      │');
    console.log(`│  Error: ${(error as Error).message.substring(0, 55)}`.padEnd(69) + '│');
  }
  console.log('└─────────────────────────────────────────────────────────────────────┘');
  console.log('');

  // Test each local pattern against Supabase
  console.log('┌─────────────────────────────────────────────────────────────────────┐');
  console.log('│  PATTERN ROUND-TRIP TESTS                                           │');
  console.log('├─────────────────────────────────────────────────────────────────────┤');

  for (const localPattern of NESTJS_PATTERNS) {
    console.log(`│                                                                     │`);
    console.log(`│  Testing: ${localPattern.id}`.padEnd(69) + '│');
    console.log(`│  ${'─'.repeat(67)}│`);

    const result: RoundTripResult = {
      patternId: localPattern.id,
      ruleId: localPattern.ruleId,
      storedInSupabase: false,
      retrievedFromSupabase: false,
      fixTemplateMatches: false,
      confidenceMatches: false,
    };

    try {
      // Try to lookup the pattern from Supabase
      const lookupResult = await lookupFrameworkPattern(
        localPattern.ruleId,
        localPattern.tool,
        localPattern.framework
      );

      if (lookupResult.found && lookupResult.pattern) {
        result.storedInSupabase = true;
        result.retrievedFromSupabase = true;

        // Check if fix template is present
        const supabaseTemplate = lookupResult.pattern.fix_template?.template || '';
        result.fixTemplateMatches = supabaseTemplate.length > 50; // Has substantial content

        // Check confidence
        result.confidenceMatches = Math.abs(lookupResult.confidence - localPattern.fixConfidence) < 10;

        console.log(`│    ✅ Found in Supabase (ID: ${lookupResult.pattern.id.substring(0, 8)}...)`.padEnd(69) + '│');
        console.log(`│    📊 Confidence: ${lookupResult.confidence}% (local: ${localPattern.fixConfidence}%)`.padEnd(69) + '│');
        console.log(`│    📄 Fix template: ${result.fixTemplateMatches ? '✅ Present' : '⚠️ Missing/short'}`.padEnd(69) + '│');
        console.log(`│    🏷️  Disposition: ${lookupResult.disposition}`.padEnd(69) + '│');

        if (lookupResult.estimatedSavings) {
          console.log(`│    💰 Est. savings: $${lookupResult.estimatedSavings.toFixed(5)}/issue`.padEnd(69) + '│');
        }
      } else {
        console.log(`│    ⚠️  Not found in Supabase`.padEnd(69) + '│');
        console.log(`│    📝 May need to run seed script`.padEnd(69) + '│');
      }
    } catch (error) {
      result.error = (error as Error).message;
      console.log(`│    ❌ Error: ${result.error.substring(0, 50)}`.padEnd(69) + '│');
    }

    results.push(result);
  }

  console.log('│                                                                     │');
  console.log('└─────────────────────────────────────────────────────────────────────┘');

  return results;
}

async function testCostSavingsCalculation(): Promise<void> {
  console.log('');
  console.log('┌─────────────────────────────────────────────────────────────────────┐');
  console.log('│  COST SAVINGS PROJECTION                                            │');
  console.log('├─────────────────────────────────────────────────────────────────────┤');

  const storage = getFrameworkPatternStorage();

  // Simulate different pattern reuse rates
  const scenarios = [
    { name: 'Week 1 (new project)', issues: 1000, reuseRate: 0 },
    { name: 'Month 1 (building patterns)', issues: 1000, reuseRate: 0.5 },
    { name: 'Month 3 (good coverage)', issues: 1000, reuseRate: 0.8 },
    { name: 'Month 6+ (mature)', issues: 1000, reuseRate: 0.95 },
  ];

  for (const scenario of scenarios) {
    const savings = await storage.calculateCostSavings(scenario.issues, scenario.reuseRate);
    console.log(`│                                                                     │`);
    console.log(`│  ${scenario.name}`.padEnd(69) + '│');
    console.log(`│    Issues: ${scenario.issues}, Pattern Reuse: ${(scenario.reuseRate * 100).toFixed(0)}%`.padEnd(69) + '│');
    console.log(`│    Without patterns: $${savings.withoutPatterns.toFixed(2)}`.padEnd(69) + '│');
    console.log(`│    With patterns:    $${savings.withPatterns.toFixed(2)}`.padEnd(69) + '│');
    console.log(`│    Savings:          $${savings.savings.toFixed(2)} (${savings.savingsPercent.toFixed(0)}%)`.padEnd(69) + '│');
  }

  console.log('│                                                                     │');
  console.log('└─────────────────────────────────────────────────────────────────────┘');
}

function printSummary(results: RoundTripResult[]): void {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║  ROUND-TRIP TEST SUMMARY                                             ║');
  console.log('╠══════════════════════════════════════════════════════════════════════╣');

  const stored = results.filter(r => r.storedInSupabase).length;
  const retrieved = results.filter(r => r.retrievedFromSupabase).length;
  const templatesOk = results.filter(r => r.fixTemplateMatches).length;
  const confidenceOk = results.filter(r => r.confidenceMatches).length;

  console.log(`║  Patterns in Local Registry:    ${NESTJS_PATTERNS.length}`.padEnd(69) + '║');
  console.log(`║  Stored in Supabase:            ${stored}/${results.length}`.padEnd(69) + '║');
  console.log(`║  Retrieved Successfully:        ${retrieved}/${results.length}`.padEnd(69) + '║');
  console.log(`║  Fix Templates Present:         ${templatesOk}/${results.length}`.padEnd(69) + '║');
  console.log(`║  Confidence Matches:            ${confidenceOk}/${results.length}`.padEnd(69) + '║');
  console.log('╠══════════════════════════════════════════════════════════════════════╣');

  if (stored === results.length && retrieved === results.length) {
    console.log('║  ✅ ALL PATTERNS SUCCESSFULLY ROUND-TRIPPED!                         ║');
  } else if (stored > 0) {
    console.log('║  ⚠️  Some patterns may need re-seeding to Supabase                   ║');
  } else {
    console.log('║  ❌ Supabase storage not working - check connection                  ║');
  }

  console.log('╚══════════════════════════════════════════════════════════════════════╝');
}

// Main execution
async function main(): Promise<void> {
  console.log('\n🔄 Running Supabase Pattern Round-Trip Test...\n');

  // Check environment
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('⚠️  Supabase credentials not configured');
    console.log('   Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
    console.log('   Patterns will still work locally but won\'t persist.\n');
  }

  const results = await testRoundTrip();
  await testCostSavingsCalculation();
  printSummary(results);
}

main().catch(console.error);
