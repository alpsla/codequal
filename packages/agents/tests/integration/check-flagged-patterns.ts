/**
 * Check specific flagged patterns in detail
 */
import dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

import { createClient } from '@supabase/supabase-js';

async function checkPatterns() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const flaggedRules = [
    'java.lang.security.audit.object-deserialization.object-deserialization',
    'python.lang.security.audit.exec-detected.exec-detected',
    'exec_used'
  ];

  for (const ruleId of flaggedRules) {
    const { data: pattern } = await supabase
      .from('fix_patterns')
      .select('*')
      .eq('rule_id', ruleId)
      .maybeSingle();

    if (!pattern) continue;

    console.log('\n' + '═'.repeat(80));
    console.log(`PATTERN: ${pattern.tool}:${pattern.rule_id}`);
    console.log('═'.repeat(80));

    console.log('\n📋 FIX TEMPLATE:');
    console.log('─'.repeat(40));
    console.log(pattern.fix_template?.template || 'N/A');

    console.log('\n📝 EXAMPLE BEFORE:');
    console.log('─'.repeat(40));
    console.log(pattern.examples?.[0]?.before?.substring(0, 500) || 'N/A');

    console.log('\n✅ EXAMPLE AFTER:');
    console.log('─'.repeat(40));
    console.log(pattern.examples?.[0]?.after?.substring(0, 500) || 'N/A');

    console.log('\n📖 EXPLANATION:');
    console.log('─'.repeat(40));
    console.log(pattern.examples?.[0]?.description || 'N/A');

    // Check if "unable to" is in legitimate code context
    const template = pattern.fix_template?.template || '';
    if (template.includes('unable to')) {
      const context = template.substring(
        Math.max(0, template.indexOf('unable to') - 50),
        template.indexOf('unable to') + 70
      );
      console.log('\n⚠️  "unable to" CONTEXT:');
      console.log('─'.repeat(40));
      console.log(`...${context}...`);
    }
  }
}

checkPatterns().catch(console.error);
