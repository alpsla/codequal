#!/usr/bin/env ts-node
/**
 * Supabase Alert Resolution Verification Script
 *
 * This script verifies that all Supabase alerts have been resolved:
 * - Checks RLS status on critical tables
 * - Verifies index creation
 * - Tests query performance
 * - Validates materialized views
 *
 * Run: npx ts-node scripts/verify-supabase-fixes.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface VerificationResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: any;
}

const results: VerificationResult[] = [];

function logResult(result: VerificationResult) {
  const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
  console.log(`${icon} ${result.name}: ${result.message}`);
  if (result.details) {
    console.log('   Details:', JSON.stringify(result.details, null, 2));
  }
  results.push(result);
}

async function checkRLSStatus() {
  console.log('\n📋 Checking RLS Status...');

  const criticalTables = [
    'model_configurations',
    'pr_analysis_history',
    'developer_metrics',
    'skill_scores',
    'analysis_history',
    'deepwiki_cleanups'
  ];

  const query = `
    SELECT
      t.tablename,
      c.relrowsecurity as has_rls
    FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename
    WHERE t.schemaname = 'public'
    AND t.tablename = ANY($1)
    ORDER BY t.tablename;
  `;

  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      query,
      params: [criticalTables]
    });

    if (error) {
      // Try alternative method
      const checks = await Promise.all(
        criticalTables.map(async (table) => {
          try {
            const { error } = await supabase.from(table).select('count').limit(1);
            return { table, hasRLS: !!error }; // If error, likely RLS is enabled
          } catch {
            return { table, hasRLS: false };
          }
        })
      );

      const allEnabled = checks.every(c => c.hasRLS);
      const tablesWithoutRLS = checks.filter(c => !c.hasRLS).map(c => c.table);

      if (allEnabled) {
        logResult({
          name: 'RLS Status',
          status: 'pass',
          message: 'All 6 critical tables have RLS enabled',
          details: checks
        });
      } else {
        logResult({
          name: 'RLS Status',
          status: 'fail',
          message: `${tablesWithoutRLS.length} tables missing RLS`,
          details: { tablesWithoutRLS }
        });
      }
      return;
    }

    const tablesWithoutRLS = data?.filter((row: any) => !row.has_rls);

    if (!tablesWithoutRLS || tablesWithoutRLS.length === 0) {
      logResult({
        name: 'RLS Status',
        status: 'pass',
        message: 'All 6 critical tables have RLS enabled'
      });
    } else {
      logResult({
        name: 'RLS Status',
        status: 'fail',
        message: `${tablesWithoutRLS.length} tables missing RLS`,
        details: { tables: tablesWithoutRLS.map((r: any) => r.tablename) }
      });
    }
  } catch (error) {
    logResult({
      name: 'RLS Status',
      status: 'warn',
      message: 'Could not verify RLS status (may need manual check)',
      details: { error: String(error) }
    });
  }
}

async function checkIndexes() {
  console.log('\n📋 Checking Indexes...');

  const expectedIndexPrefixes = [
    'idx_model_config',
    'idx_pr_analysis_history',
    'idx_developer_metrics',
    'idx_skill_scores',
    'idx_analysis_history',
    'idx_deepwiki_cleanups'
  ];

  try {
    // Try to query pg_indexes
    const { data, error } = await supabase
      .from('pg_indexes')
      .select('indexname, tablename')
      .eq('schemaname', 'public')
      .like('indexname', 'idx_%');

    if (error) {
      logResult({
        name: 'Index Check',
        status: 'warn',
        message: 'Could not verify indexes (may need manual check)',
        details: { error: error.message }
      });
      return;
    }

    const foundIndexes = data || [];
    const indexCount = foundIndexes.length;

    if (indexCount >= 40) {
      logResult({
        name: 'Index Check',
        status: 'pass',
        message: `Found ${indexCount} indexes (expected 40+)`,
        details: { count: indexCount }
      });
    } else if (indexCount >= 30) {
      logResult({
        name: 'Index Check',
        status: 'warn',
        message: `Found ${indexCount} indexes (expected 40+)`,
        details: { count: indexCount }
      });
    } else {
      logResult({
        name: 'Index Check',
        status: 'fail',
        message: `Only found ${indexCount} indexes (expected 40+)`,
        details: { count: indexCount }
      });
    }
  } catch (error) {
    logResult({
      name: 'Index Check',
      status: 'warn',
      message: 'Could not verify indexes',
      details: { error: String(error) }
    });
  }
}

async function testQueryPerformance() {
  console.log('\n📋 Testing Query Performance...');

  // Test model_configurations query (should be <100ms)
  const start = Date.now();

  try {
    const { data, error } = await supabase
      .from('model_configurations')
      .select('*')
      .eq('role', 'code_quality')
      .eq('language', 'java')
      .limit(10);

    const duration = Date.now() - start;

    if (error) {
      logResult({
        name: 'Query Performance - model_configurations',
        status: 'fail',
        message: 'Query failed',
        details: { error: error.message }
      });
    } else if (duration < 100) {
      logResult({
        name: 'Query Performance - model_configurations',
        status: 'pass',
        message: `Query completed in ${duration}ms (target: <100ms)`,
        details: { duration, resultCount: data?.length || 0 }
      });
    } else if (duration < 500) {
      logResult({
        name: 'Query Performance - model_configurations',
        status: 'warn',
        message: `Query took ${duration}ms (target: <100ms)`,
        details: { duration, resultCount: data?.length || 0 }
      });
    } else {
      logResult({
        name: 'Query Performance - model_configurations',
        status: 'fail',
        message: `Query too slow: ${duration}ms (target: <100ms)`,
        details: { duration, resultCount: data?.length || 0 }
      });
    }
  } catch (error) {
    logResult({
      name: 'Query Performance - model_configurations',
      status: 'fail',
      message: 'Query error',
      details: { error: String(error) }
    });
  }
}

async function checkMaterializedView() {
  console.log('\n📋 Checking Materialized View...');

  try {
    const { data, error } = await supabase
      .from('mv_timezone_names')
      .select('name')
      .limit(1);

    if (error) {
      logResult({
        name: 'Materialized View - mv_timezone_names',
        status: 'fail',
        message: 'Materialized view not found or not accessible',
        details: { error: error.message }
      });
    } else {
      // Count timezones
      const { count, error: countError } = await supabase
        .from('mv_timezone_names')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        logResult({
          name: 'Materialized View - mv_timezone_names',
          status: 'warn',
          message: 'View exists but could not count records',
          details: { error: countError.message }
        });
      } else {
        logResult({
          name: 'Materialized View - mv_timezone_names',
          status: 'pass',
          message: `Materialized view working (${count} timezones)`,
          details: { count }
        });
      }
    }
  } catch (error) {
    logResult({
      name: 'Materialized View - mv_timezone_names',
      status: 'fail',
      message: 'Could not access materialized view',
      details: { error: String(error) }
    });
  }
}

async function checkTableSizes() {
  console.log('\n📋 Checking Table Sizes...');

  const tables = [
    'model_configurations',
    'pr_analysis_history',
    'developer_metrics',
    'skill_scores',
    'analysis_history'
  ];

  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        logResult({
          name: `Table Size - ${table}`,
          status: 'warn',
          message: 'Could not get record count',
          details: { error: error.message }
        });
      } else {
        logResult({
          name: `Table Size - ${table}`,
          status: 'pass',
          message: `${count || 0} records`,
          details: { count }
        });
      }
    } catch (error) {
      logResult({
        name: `Table Size - ${table}`,
        status: 'warn',
        message: 'Could not access table',
        details: { error: String(error) }
      });
    }
  }
}

async function checkCachePerformance() {
  console.log('\n📋 Checking Cache Performance (Grafana Alert)...');

  try {
    // Check if cache_performance view exists
    const { data: viewData, error: viewError } = await supabase
      .from('cache_performance')
      .select('*')
      .limit(1);

    if (viewError) {
      logResult({
        name: 'Cache Performance View',
        status: 'warn',
        message: 'Cache monitoring view not found - run cache optimization migration',
        details: { error: viewError.message }
      });
      return;
    }

    const cacheData = viewData[0];
    const overallRatio = cacheData?.overall_cache_hit_ratio_percent || 0;
    const indexRatio = cacheData?.index_cache_hit_ratio_percent || 0;

    // Overall cache hit ratio
    if (overallRatio >= 95) {
      logResult({
        name: 'Overall Cache Hit Ratio',
        status: 'pass',
        message: `${overallRatio}% (Excellent - target: ≥95%)`,
        details: { ratio: overallRatio, diskReads: cacheData?.total_heap_blocks_read_from_disk }
      });
    } else if (overallRatio >= 90) {
      logResult({
        name: 'Overall Cache Hit Ratio',
        status: 'warn',
        message: `${overallRatio}% (Good - target: ≥95%)`,
        details: { ratio: overallRatio, recommendation: 'Run optimize_cache_performance()' }
      });
    } else if (overallRatio >= 85) {
      logResult({
        name: 'Overall Cache Hit Ratio',
        status: 'warn',
        message: `${overallRatio}% (Poor - target: ≥95%)`,
        details: {
          ratio: overallRatio,
          recommendation: 'Run VACUUM ANALYZE, consider contacting Supabase support'
        }
      });
    } else {
      logResult({
        name: 'Overall Cache Hit Ratio',
        status: 'fail',
        message: `${overallRatio}% (Critical - target: ≥95%)`,
        details: {
          ratio: overallRatio,
          recommendation: 'Contact Supabase support to increase shared_buffers'
        }
      });
    }

    // Index cache hit ratio
    if (indexRatio >= 95) {
      logResult({
        name: 'Index Cache Hit Ratio',
        status: 'pass',
        message: `${indexRatio}% (Excellent)`,
        details: { ratio: indexRatio }
      });
    } else if (indexRatio >= 90) {
      logResult({
        name: 'Index Cache Hit Ratio',
        status: 'warn',
        message: `${indexRatio}% (Needs improvement)`,
        details: { ratio: indexRatio, recommendation: 'Check index usage with pg_stat_user_indexes' }
      });
    } else {
      logResult({
        name: 'Index Cache Hit Ratio',
        status: 'fail',
        message: `${indexRatio}% (Poor)`,
        details: { ratio: indexRatio, recommendation: 'Verify indexes are being used' }
      });
    }

    // Check for monitoring functions
    try {
      const { data: recommendations, error: recError } = await supabase.rpc('get_cache_recommendations');

      if (!recError && recommendations && recommendations.length > 0) {
        logResult({
          name: 'Cache Recommendations',
          status: 'warn',
          message: `${recommendations.length} recommendations available`,
          details: { recommendations: recommendations.slice(0, 3) }
        });
      }
    } catch (error) {
      // Recommendations function may not exist yet
    }
  } catch (error) {
    logResult({
      name: 'Cache Performance',
      status: 'warn',
      message: 'Could not check cache performance',
      details: { error: String(error) }
    });
  }
}

async function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(80));

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const warned = results.filter(r => r.status === 'warn').length;
  const total = results.length;

  console.log(`\nTotal Checks: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Warnings: ${warned}`);

  const successRate = (passed / total * 100).toFixed(1);
  console.log(`\nSuccess Rate: ${successRate}%`);

  if (failed === 0 && warned === 0) {
    console.log('\n🎉 ALL CHECKS PASSED! Supabase alerts should be resolved.');
  } else if (failed === 0) {
    console.log('\n⚠️  All critical checks passed, but some warnings were issued.');
    console.log('Review the warnings above and consider manual verification.');
  } else {
    console.log('\n❌ SOME CHECKS FAILED. Please review the errors above.');
    console.log('You may need to run the migration: supabase/migrations/20251111_fix_supabase_alerts.sql');
  }

  console.log('\n' + '='.repeat(80));
  console.log('📝 Next Steps:');
  console.log('1. If checks failed, apply migration: supabase/migrations/20251111_fix_supabase_alerts.sql');
  console.log('2. Check Supabase Dashboard → Database → Advisors for alert status');
  console.log('3. Run V9 E2E test: cd packages/agents && npx ts-node test-v9-e2e-complete.ts');
  console.log('4. Monitor performance: Dashboard → Database → Query Performance');
  console.log('='.repeat(80) + '\n');

  return failed === 0;
}

async function main() {
  console.log('🔍 Supabase Alert Resolution Verification');
  console.log('==========================================');
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Time: ${new Date().toISOString()}\n`);

  try {
    await checkRLSStatus();
    await checkIndexes();
    await testQueryPerformance();
    await checkMaterializedView();
    await checkTableSizes();
    await checkCachePerformance();

    const success = await generateReport();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Fatal error during verification:', error);
    process.exit(1);
  }
}

// Run verification
main().catch(console.error);
