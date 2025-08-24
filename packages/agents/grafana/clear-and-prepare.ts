#!/usr/bin/env npx ts-node

/**
 * Clear all test data and prepare for real CodeQual analysis
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function clearAllDataAndPrepare() {
  console.log('🧹 Clearing ALL test data from agent_activity table...\n');
  
  // Delete all existing records
  const { error: deleteError, count } = await supabase
    .from('agent_activity')
    .delete()
    .gte('id', '00000000-0000-0000-0000-000000000000');
  
  if (deleteError) {
    console.error('❌ Error clearing data:', deleteError);
    return;
  }
  
  console.log(`✅ Successfully cleared ${count || 'all'} records\n`);
  
  // Verify the table is empty
  const { count: remainingCount } = await supabase
    .from('agent_activity')
    .select('*', { count: 'exact', head: true });
  
  if (remainingCount === 0) {
    console.log('✅ Database is now empty and ready for real data!\n');
  } else {
    console.log(`⚠️  Warning: ${remainingCount} records still remain\n`);
  }
  
  console.log('📝 Instructions for Real Analysis:\n');
  console.log('1. Run a real CodeQual analysis:');
  console.log('   cd /Users/alpinro/Code\\ Prjects/codequal/packages/agents');
  console.log('   USE_DEEPWIKI_MOCK=false npm run analyze -- --repo https://github.com/sindresorhus/ky --pr 700\n');
  
  console.log('2. The analysis will automatically track:');
  console.log('   • Execution time for each agent operation');
  console.log('   • API costs based on actual token usage');
  console.log('   • Success/failure rates');
  console.log('   • Model selection and fallbacks\n');
  
  console.log('3. After analysis completes, refresh your Grafana dashboard');
  console.log('   to see real performance metrics\n');
  
  console.log('💡 Tips:');
  console.log('   • Small repos (like ky) should take 30-60 seconds');
  console.log('   • Medium repos (like react) should take 1-3 minutes');
  console.log('   • Large repos (like vscode) should take 3-5 minutes');
  console.log('   • Costs depend on the complexity of the PR changes\n');
  
  console.log('🔍 What to Look For:');
  console.log('   • Actual execution times vs expectations');
  console.log('   • Cost breakdown by model type');
  console.log('   • Which agents take the longest');
  console.log('   • Success rates for different operations');
}

clearAllDataAndPrepare().catch(console.error);