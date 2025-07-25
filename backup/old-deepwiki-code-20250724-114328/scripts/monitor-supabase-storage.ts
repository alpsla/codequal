#!/usr/bin/env tsx
/**
 * Supabase Storage Monitoring Script
 * Monitors vector storage, database usage, and provides optimization recommendations
 */

import { createClient } from '@supabase/supabase-js';
import { createLogger } from '@codequal/core/utils';
import axios from 'axios';

const logger = createLogger('supabase-monitor');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL;

// Thresholds
const WARNING_THRESHOLD = 70; // percentage
const CRITICAL_THRESHOLD = 85; // percentage
const VECTOR_GROWTH_WARNING = 100000; // vectors per day

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface SupabaseMetrics {
  database: {
    sizeGB: number;
    maxSizeGB: number;
    percentUsed: number;
  };
  vectors: {
    totalCount: number;
    totalSizeGB: number;
    growthRate: number;
    tables: Array<{
      name: string;
      count: number;
      sizeGB: number;
    }>;
  };
  performance: {
    slowQueries: number;
    indexEfficiency: number;
    cacheHitRate: number;
  };
  costs: {
    estimatedMonthly: number;
    perVector: number;
    efficiency: string;
  };
}

async function getSupabaseMetrics(): Promise<SupabaseMetrics> {
  // Get database size
  const { data: dbSize } = await supabase.rpc('execute_sql', {
    sql: `SELECT pg_database_size(current_database())::float8 / (1024*1024*1024) as size_gb`
  });

  const sizeGB = dbSize?.[0]?.size_gb || 0;
  const maxSizeGB = 30; // Your plan limit

  // Get vector metrics
  const vectorTables = [
    'analysis_chunks',
    'tool_results_vectors',
    'educational_patterns',
    'knowledge_items'
  ];

  let totalVectors = 0;
  let totalVectorSize = 0;
  const tableMetrics = [];

  for (const table of vectorTables) {
    const { data } = await supabase.rpc('execute_sql', {
      sql: `
        SELECT 
          COUNT(*) as count,
          pg_total_relation_size('${table}')::float8 / (1024*1024*1024) as size_gb
        FROM ${table}
        WHERE embedding IS NOT NULL;
      `
    });

    if (data?.[0]) {
      totalVectors += data[0].count;
      totalVectorSize += data[0].size_gb;
      tableMetrics.push({
        name: table,
        count: data[0].count,
        sizeGB: data[0].size_gb
      });
    }
  }

  // Get performance metrics
  const { data: perfData } = await supabase.rpc('execute_sql', {
    sql: `
      SELECT 
        (SELECT COUNT(*) FROM pg_stat_statements WHERE mean_exec_time > 1000) as slow_queries,
        (SELECT ROUND(100.0 * SUM(idx_scan) / NULLIF(SUM(seq_scan + idx_scan), 0), 2) 
         FROM pg_stat_user_tables) as index_efficiency,
        (SELECT ROUND(100.0 * sum(blks_hit) / NULLIF(sum(blks_hit + blks_read), 0), 2) 
         FROM pg_stat_database WHERE datname = current_database()) as cache_hit_rate
    `
  });

  // Calculate costs (Supabase pricing approximation)
  const databaseCostPerGB = 0.125; // $0.125/GB/month
  const estimatedMonthly = sizeGB * databaseCostPerGB;
  const costPerVector = totalVectors > 0 ? estimatedMonthly / totalVectors : 0;

  return {
    database: {
      sizeGB,
      maxSizeGB,
      percentUsed: (sizeGB / maxSizeGB) * 100
    },
    vectors: {
      totalCount: totalVectors,
      totalSizeGB: totalVectorSize,
      growthRate: await calculateVectorGrowthRate(),
      tables: tableMetrics
    },
    performance: {
      slowQueries: perfData?.[0]?.slow_queries || 0,
      indexEfficiency: perfData?.[0]?.index_efficiency || 0,
      cacheHitRate: perfData?.[0]?.cache_hit_rate || 0
    },
    costs: {
      estimatedMonthly,
      perVector: costPerVector,
      efficiency: getEfficiencyRating(sizeGB / maxSizeGB)
    }
  };
}

async function calculateVectorGrowthRate(): Promise<number> {
  const { data } = await supabase.rpc('execute_sql', {
    sql: `
      SELECT COUNT(*) as new_vectors
      FROM analysis_chunks
      WHERE created_at > NOW() - INTERVAL '24 hours'
      AND embedding IS NOT NULL;
    `
  });
  
  return data?.[0]?.new_vectors || 0;
}

function getEfficiencyRating(usage: number): string {
  if (usage < 0.5) return 'Underutilized';
  if (usage < 0.7) return 'Good';
  if (usage < 0.85) return 'Optimal';
  return 'Near Capacity';
}

async function checkOptimizationOpportunities(): Promise<string[]> {
  const opportunities: string[] = [];

  // Check expired vectors
  const { data: expired } = await supabase.rpc('execute_sql', {
    sql: `
      SELECT COUNT(*) as count, 
             SUM(octet_length(embedding::text))::float8 / (1024*1024*1024) as size_gb
      FROM analysis_chunks
      WHERE storage_type != 'permanent' AND expires_at < NOW();
    `
  });

  if (expired?.[0]?.count > 0) {
    opportunities.push(
      `🧹 ${expired[0].count.toLocaleString()} expired vectors can be cleaned (${expired[0].size_gb.toFixed(2)}GB)`
    );
  }

  // Check duplicate vectors
  const { data: duplicates } = await supabase.rpc('execute_sql', {
    sql: `
      SELECT COUNT(*) as duplicate_groups, SUM(extra_copies) as total_duplicates
      FROM (
        SELECT content_hash, COUNT(*) - 1 as extra_copies
        FROM analysis_chunks
        WHERE content_hash IS NOT NULL
        GROUP BY content_hash
        HAVING COUNT(*) > 1
      ) dup;
    `
  });

  if (duplicates?.[0]?.total_duplicates > 0) {
    opportunities.push(
      `🔄 ${duplicates[0].total_duplicates.toLocaleString()} duplicate vectors found`
    );
  }

  // Check index usage
  const { data: indexes } = await supabase.rpc('execute_sql', {
    sql: `
      SELECT COUNT(*) as unused_indexes
      FROM pg_stat_user_indexes
      WHERE idx_scan = 0
      AND indexrelname NOT LIKE 'pg_%';
    `
  });

  if (indexes?.[0]?.unused_indexes > 0) {
    opportunities.push(
      `📊 ${indexes[0].unused_indexes} unused indexes can be removed`
    );
  }

  return opportunities;
}

async function sendSlackAlert(
  level: 'warning' | 'critical',
  metrics: SupabaseMetrics,
  opportunities: string[]
) {
  if (!SLACK_WEBHOOK) return;

  const color = level === 'critical' ? '#FF0000' : '#FFA500';
  const emoji = level === 'critical' ? '🚨' : '⚠️';

  const message = {
    attachments: [{
      color,
      title: `${emoji} Supabase Storage Alert - ${level.toUpperCase()}`,
      fields: [
        {
          title: 'Database Usage',
          value: `${metrics.database.sizeGB.toFixed(2)}GB / ${metrics.database.maxSizeGB}GB (${metrics.database.percentUsed.toFixed(1)}%)`,
          short: true
        },
        {
          title: 'Vector Count',
          value: metrics.vectors.totalCount.toLocaleString(),
          short: true
        },
        {
          title: 'Vector Storage',
          value: `${metrics.vectors.totalSizeGB.toFixed(2)}GB`,
          short: true
        },
        {
          title: 'Growth Rate',
          value: `${metrics.vectors.growthRate.toLocaleString()} vectors/day`,
          short: true
        },
        {
          title: 'Monthly Cost',
          value: `$${metrics.costs.estimatedMonthly.toFixed(2)}`,
          short: true
        },
        {
          title: 'Performance',
          value: `Cache: ${metrics.performance.cacheHitRate}% | Index: ${metrics.performance.indexEfficiency}%`,
          short: true
        }
      ],
      footer: 'Supabase Monitor',
      ts: Math.floor(Date.now() / 1000)
    }]
  };

  if (opportunities.length > 0) {
    message.attachments[0].fields.push({
      title: 'Optimization Opportunities',
      value: opportunities.join('\n'),
      short: false
    });
  }

  try {
    await axios.post(SLACK_WEBHOOK, message);
  } catch (error) {
    logger.error('Failed to send Slack alert:', error);
  }
}

function generateConsoleReport(metrics: SupabaseMetrics, opportunities: string[]) {
  const status = metrics.database.percentUsed >= CRITICAL_THRESHOLD ? '🚨 CRITICAL' :
                metrics.database.percentUsed >= WARNING_THRESHOLD ? '⚠️  WARNING' : '✅ HEALTHY';

  console.log('\n🔷 Supabase Storage Report');
  console.log('========================\n');
  
  console.log(`Status: ${status}`);
  console.log(`Database: ${metrics.database.sizeGB.toFixed(2)}GB / ${metrics.database.maxSizeGB}GB (${metrics.database.percentUsed.toFixed(1)}%)`);
  console.log(`Efficiency: ${metrics.costs.efficiency}\n`);

  console.log('📊 Vector Storage:');
  console.log(`Total Vectors: ${metrics.vectors.totalCount.toLocaleString()}`);
  console.log(`Vector Storage: ${metrics.vectors.totalSizeGB.toFixed(2)}GB`);
  console.log(`Growth Rate: ${metrics.vectors.growthRate.toLocaleString()} vectors/day`);
  console.log(`Cost per Vector: $${(metrics.costs.perVector * 1000).toFixed(4)}/1k vectors\n`);

  console.log('📈 Table Breakdown:');
  metrics.vectors.tables.forEach(t => {
    console.log(`- ${t.name}: ${t.count.toLocaleString()} vectors (${t.sizeGB.toFixed(2)}GB)`);
  });

  console.log('\n⚡ Performance:');
  console.log(`Cache Hit Rate: ${metrics.performance.cacheHitRate}%`);
  console.log(`Index Efficiency: ${metrics.performance.indexEfficiency}%`);
  console.log(`Slow Queries: ${metrics.performance.slowQueries}`);

  console.log('\n💰 Cost Analysis:');
  console.log(`Estimated Monthly: $${metrics.costs.estimatedMonthly.toFixed(2)}`);
  console.log(`Annual Projection: $${(metrics.costs.estimatedMonthly * 12).toFixed(2)}`);

  if (opportunities.length > 0) {
    console.log('\n🎯 Optimization Opportunities:');
    opportunities.forEach(o => console.log(o));
  }

  // Warnings
  if (metrics.vectors.growthRate > VECTOR_GROWTH_WARNING) {
    console.log(`\n⚠️  High vector growth rate detected!`);
    console.log(`At current rate, database will be full in ${Math.floor((metrics.database.maxSizeGB - metrics.database.sizeGB) / (metrics.vectors.growthRate * 0.006 / 1000))} days`);
  }
}

// Main monitoring function
async function monitor() {
  try {
    logger.info('Starting Supabase storage monitoring...');
    
    const metrics = await getSupabaseMetrics();
    const opportunities = await checkOptimizationOpportunities();
    
    // Generate console report
    generateConsoleReport(metrics, opportunities);
    
    // Send alerts if needed
    if (metrics.database.percentUsed >= CRITICAL_THRESHOLD) {
      await sendSlackAlert('critical', metrics, opportunities);
    } else if (metrics.database.percentUsed >= WARNING_THRESHOLD) {
      await sendSlackAlert('warning', metrics, opportunities);
    }
    
    // Log metrics for tracking
    logger.info('Storage metrics', {
      databaseGB: metrics.database.sizeGB,
      percentUsed: metrics.database.percentUsed,
      vectorCount: metrics.vectors.totalCount,
      growthRate: metrics.vectors.growthRate
    });
    
  } catch (error) {
    logger.error('Monitoring failed:', error);
    process.exit(1);
  }
}

// Run the monitor
monitor();