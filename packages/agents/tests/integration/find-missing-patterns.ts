/**
 * Find rules that don't have patterns yet
 * These are candidates for testing AI pattern learning
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { createClient } from '@supabase/supabase-js';

async function findMissingPatterns() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     PATTERN COVERAGE ANALYSIS                                ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // Get all patterns (any status)
  const { data: patterns, error } = await supabase
    .from('fix_patterns')
    .select('rule_id, tool, status, apply_count, confidence');

  if (error) {
    console.log('Query error:', error.message);
    return;
  }

  const patternRules = new Set(patterns?.map(p => p.rule_id) || []);
  console.log(`📊 Total active patterns: ${patternRules.size}\n`);

  // Patterns with low usage
  const lowUsagePatterns = patterns
    ?.filter(p => (p.apply_count || 0) < 5)
    ?.slice(0, 10);

  console.log('📉 Low-usage patterns (< 5 applications):');
  lowUsagePatterns?.forEach(p => {
    console.log(`   ${p.rule_id.substring(0, 50)}... | ${p.tool} | ${p.apply_count || 0} uses`);
  });

  // Check common semgrep rules that might not have patterns
  const commonRulesToCheck = [
    // Python
    'python.lang.security.audit.insecure-file-permissions.insecure-file-permissions',
    'python.django.security.injection.sql.sql-injection-using-raw',
    'python.flask.security.xss.direct-use-of-jinja2',
    // JavaScript
    'javascript.express.security.audit.xss-direct-response-write.direct-response-write',
    'javascript.lang.security.detect-eval-with-expression',
    'javascript.browser.security.insufficient-postmessage-origin-validation',
    // Go
    'go.lang.security.audit.net-pprof.net-pprof',
    'go.lang.security.audit.dangerous-exec-command',
    // Ruby
    'ruby.rails.security.brakeman.sql-injection-active-record',
    'ruby.lang.security.dangerous-subshell',
    // Java
    'java.lang.security.audit.xml-external-entities',
    'java.lang.security.audit.ldap-injection',
  ];

  console.log('\n🔍 Checking common security rules for pattern coverage:');
  const missingPatterns: string[] = [];

  for (const rule of commonRulesToCheck) {
    const exists = patternRules.has(rule);
    if (exists) {
      console.log(`   ✅ ${rule.substring(0, 60)}`);
    } else {
      console.log(`   ❌ ${rule.substring(0, 60)} - NO PATTERN`);
      missingPatterns.push(rule);
    }
  }

  console.log(`\n📋 Rules without patterns: ${missingPatterns.length}/${commonRulesToCheck.length}`);

  // Check if there are any patterns by tool
  console.log('\n🔧 Patterns by tool:');
  const byTool = patterns?.reduce((acc, p) => {
    acc[p.tool] = (acc[p.tool] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  Object.entries(byTool || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([tool, count]) => {
      console.log(`   ${tool}: ${count} patterns`);
    });

  // Recommendation
  if (missingPatterns.length > 0) {
    console.log('\n💡 RECOMMENDATION:');
    console.log('   To test pattern learning, scan a repo that triggers one of these rules:');
    missingPatterns.slice(0, 3).forEach(rule => {
      console.log(`   - ${rule}`);
    });
  }
}

findMissingPatterns().catch(console.error);
