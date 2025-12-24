/**
 * Validate Recently Updated Patterns
 * Check if patterns have valid code, not error messages
 */
import dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

import { createClient } from '@supabase/supabase-js';

async function validatePatterns() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get recently updated patterns (from calibration)
  const { data: patterns, error } = await supabase
    .from('fix_patterns')
    .select('id, rule_id, tool, name, fix_template, examples, updated_at, created_at')
    .eq('created_by', 'pattern-calibration')
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(200);

  if (error) {
    console.error('Error fetching patterns:', error);
    return;
  }

  console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    PATTERN VALIDATION REPORT                                 ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

  let validCount = 0;
  let invalidCount = 0;
  const issues: string[] = [];

  for (const pattern of patterns || []) {
    const template = pattern.fix_template?.template || '';
    const example = pattern.examples?.[0];

    // Validation checks
    const problems: string[] = [];

    // Check 1: Template too short
    if (template.length < 10) {
      problems.push('Template too short (<10 chars)');
    }

    // Check 2: Contains error phrases
    const errorPhrases = [
      "haven't provided",
      "please share",
      "please provide",
      "I need",
      "could you",
      "cannot fix",
      "unable to",
      "no code provided"
    ];
    for (const phrase of errorPhrases) {
      if (template.toLowerCase().includes(phrase)) {
        problems.push(`Contains error phrase: "${phrase}"`);
      }
    }

    // Check 3: Template is just explanation, not code
    if (template.includes('The fix') && !template.includes(';') && !template.includes('{')) {
      problems.push('Template appears to be explanation, not code');
    }

    // Check 4: Example before/after present
    if (!example?.before || example.before.length < 10) {
      problems.push('Missing or short "before" example');
    }
    if (!example?.after || example.after.length < 10) {
      problems.push('Missing or short "after" example');
    }

    const isValid = problems.length === 0;
    if (isValid) {
      validCount++;
    } else {
      invalidCount++;
      issues.push(`${pattern.tool}:${pattern.rule_id}`);
    }

    // Print detailed info
    console.log('─'.repeat(80));
    console.log(`${isValid ? '✅' : '❌'} ${pattern.tool}: ${pattern.rule_id}`);
    console.log(`   Updated: ${pattern.updated_at || 'N/A'}`);

    if (problems.length > 0) {
      console.log(`   Problems:`);
      problems.forEach(p => console.log(`     - ${p}`));
    }

    // Show template preview
    const templatePreview = template.substring(0, 150).replace(/\n/g, '\\n');
    console.log(`   Template: ${templatePreview}${template.length > 150 ? '...' : ''}`);

    // Show example preview
    if (example?.after) {
      const afterPreview = example.after.substring(0, 100).replace(/\n/g, '\\n');
      console.log(`   Example After: ${afterPreview}${example.after.length > 100 ? '...' : ''}`);
    }
  }

  console.log('\n' + '═'.repeat(80));
  console.log(`\n📊 VALIDATION SUMMARY:`);
  console.log(`   ✅ Valid patterns:   ${validCount}/${patterns?.length || 0}`);
  console.log(`   ❌ Invalid patterns: ${invalidCount}/${patterns?.length || 0}`);
  console.log(`   Success rate: ${((validCount / (patterns?.length || 1)) * 100).toFixed(1)}%`);

  if (issues.length > 0) {
    console.log(`\n⚠️  Patterns needing attention:`);
    issues.forEach(i => console.log(`   - ${i}`));
  }
}

validatePatterns().catch(console.error);
