#!/usr/bin/env ts-node

/**
 * System health check script to verify all components are working
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { initSupabase, getSupabase } from '@codequal/database';
import { createLogger } from '@codequal/core/utils';
import { DeepWikiConfigStorage } from '@codequal/agents/deepwiki/deepwiki-config-storage';
import { VectorContextService } from '@codequal/agents/multi-agent/vector-context-service';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

const logger = createLogger('SystemHealthCheck');

// Test user
const testUser = {
  id: 'health-check-user',
  email: 'health@codequal.dev',
  role: 'admin' as const,
  status: 'active' as const,
  tenantId: 'health-check-tenant',
  session: {
    token: 'health-check-token',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
  },
  permissions: {
    repositories: { '*': { read: true, write: true, admin: true } },
    organizations: [],
    globalPermissions: ['manageUsers', 'manageBilling', 'viewAnalytics'],
    quotas: {
      requestsPerHour: 10000,
      maxConcurrentExecutions: 10,
      storageQuotaMB: 10000
    }
  },
  metadata: {
    lastLogin: new Date(),
    loginCount: 1,
    preferredLanguage: 'en',
    timezone: 'UTC'
  },
  features: {
    deepAnalysis: true,
    aiRecommendations: true,
    advancedReports: true
  }
};

async function checkComponent(name: string, testFn: () => Promise<boolean>): Promise<boolean> {
  try {
    const result = await testFn();
    console.log(`✅ ${name}: ${result ? 'PASSED' : 'FAILED'}`);
    return result;
  } catch (error) {
    console.log(`❌ ${name}: ERROR - ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

async function main() {
  console.log('🏥 CodeQual System Health Check\n');
  console.log('Checking all critical components...\n');

  const results: boolean[] = [];

  // 1. Check Supabase connection
  results.push(await checkComponent('Supabase Connection', async () => {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }
    
    initSupabase(supabaseUrl, supabaseKey);
    const supabase = getSupabase();
    const { error } = await supabase.from('users').select('count').limit(1);
    return !error;
  }));

  // 2. Check DeepWiki Config Storage
  results.push(await checkComponent('DeepWiki Config Storage', async () => {
    const configStorage = new DeepWikiConfigStorage();
    // Try to read config (should return null if not exists, not error)
    const config = await configStorage.getGlobalConfig();
    return true; // If no error thrown, it's working
  }));

  // 3. Check Vector Context Service
  results.push(await checkComponent('Vector Context Service', async () => {
    const vectorService = new VectorContextService(testUser);
    // This should work even with no data
    const result = await vectorService.getRepositoryContext(
      '00000000-0000-0000-0000-000000000001',
      'orchestrator' as any,
      testUser as any,
      { minSimilarity: 0.5 }
    );
    return typeof result === 'object';
  }));

  // 4. Check API Key presence
  results.push(await checkComponent('OpenRouter API Key', async () => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    return !!apiKey && apiKey.length > 0;
  }));

  // 5. Check Database Tables
  results.push(await checkComponent('Database Tables', async () => {
    const supabase = getSupabase();
    const tables = [
      'users',
      'user_profiles',
      'user_billing',
      'organizations',
      'repositories',
      'analysis_reports'
    ];
    
    for (const table of tables) {
      const { error } = await supabase.from(table).select('*').limit(1);
      if (error && !error.message.includes('no rows')) {
        throw new Error(`Table ${table} check failed: ${error.message}`);
      }
    }
    return true;
  }));

  // 6. Check Billing Integration
  results.push(await checkComponent('Billing Integration', async () => {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('user_billing')
      .select('*')
      .limit(1);
    
    if (error && !error.message.includes('no rows')) {
      throw new Error(`Billing check failed: ${error.message}`);
    }
    return true;
  }));

  // Summary
  console.log('\n=== Health Check Summary ===\n');
  const passed = results.filter(r => r).length;
  const total = results.length;
  const healthScore = (passed / total * 100).toFixed(0);
  
  console.log(`Total Checks: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${total - passed}`);
  console.log(`Health Score: ${healthScore}%`);
  
  if (passed === total) {
    console.log('\n🎉 All systems operational!');
  } else {
    console.log('\n⚠️  Some components need attention');
  }
  
  process.exit(passed === total ? 0 : 1);
}

// Run health check
main().catch(error => {
  logger.error('Health check failed', { error });
  console.error('\n💔 Critical failure:', error);
  process.exit(1);
});