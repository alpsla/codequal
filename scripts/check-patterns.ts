import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../apps/api/.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  // Check total pattern count
  const { count: totalCount } = await supabase
    .from('fix_patterns')
    .select('*', { count: 'exact', head: true });
  console.log(`\n📊 Total patterns in Supabase: ${totalCount}`);

  // Check for PMD patterns (Java)
  const { data: pmdPatterns, error: pmdError } = await supabase
    .from('fix_patterns')
    .select('id, rule_id, tool, confidence, status, created_at')
    .eq('tool', 'pmd')
    .order('created_at', { ascending: false })
    .limit(20);

  if (pmdError) {
    console.error('Error querying PMD patterns:', pmdError);
  } else {
    const count = pmdPatterns ? pmdPatterns.length : 0;
    console.log(`\n🔧 PMD Patterns (Java): ${count}`);
    if (pmdPatterns && pmdPatterns.length > 0) {
      pmdPatterns.forEach(p => {
        console.log(`  - ${p.rule_id} | confidence: ${p.confidence}% | status: ${p.status} | ${p.created_at}`);
      });
    }
  }

  // Check for recently created patterns (last 24h)
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentPatterns, error: recentError } = await supabase
    .from('fix_patterns')
    .select('id, rule_id, tool, confidence, status, created_at')
    .gte('created_at', yesterday)
    .order('created_at', { ascending: false })
    .limit(30);

  if (recentError) {
    console.error('Error querying recent patterns:', recentError);
  } else {
    const count = recentPatterns ? recentPatterns.length : 0;
    console.log(`\n🆕 Patterns created in last 24h: ${count}`);
    if (recentPatterns && recentPatterns.length > 0) {
      recentPatterns.forEach(p => {
        console.log(`  - [${p.tool}] ${p.rule_id} | confidence: ${p.confidence}% | status: ${p.status}`);
      });
    }
  }

  // Check Java-specific rules from the test
  const javaRules = [
    'UnnecessarySemicolon',
    'UseUtilityClass',
    'CloseResource',
    'UseLocaleWithCaseConversions',
    'DoubleBraceInitialization',
    'NoPackage',
    'EmptyCatchBlock',
    'AvoidCatchingThrowable',
    'UnusedFormalParameter',
    'SimplifyBooleanReturns',
    'UnnecessaryImport'
  ];

  console.log('\n🔍 Checking specific Java rules from test:');
  for (const rule of javaRules) {
    const { data, error } = await supabase
      .from('fix_patterns')
      .select('id, rule_id, tool, confidence, status, apply_count, success_count')
      .ilike('rule_id', `%${rule}%`)
      .limit(5);

    if (error) {
      console.log(`  ❌ ${rule}: Error - ${error.message}`);
    } else if (!data || data.length === 0) {
      console.log(`  ⚠️  ${rule}: NO PATTERN FOUND`);
    } else {
      data.forEach(p => {
        console.log(`  ✅ ${rule}: ${p.status} | confidence: ${p.confidence}% | applied: ${p.apply_count}x | success: ${p.success_count}x`);
      });
    }
  }
}

main().catch(console.error);
