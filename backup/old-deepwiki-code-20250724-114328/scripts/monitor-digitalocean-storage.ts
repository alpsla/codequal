#!/usr/bin/env tsx
/**
 * DigitalOcean Database Storage Monitoring Script
 * Run this as a cron job to monitor and alert on database storage usage
 */

import { createClient } from '@supabase/supabase-js';
import { createLogger } from '@codequal/core/utils';
import axios from 'axios';

const logger = createLogger('do-storage-monitor');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;
const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL;
const WARNING_THRESHOLD = 70; // percentage
const CRITICAL_THRESHOLD = 85; // percentage

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface StorageMetrics {
  totalGB: number;
  usedGB: number;
  percentageUsed: number;
  largestTables: Array<{
    name: string;
    sizeGB: number;
    rowCount: number;
  }>;
  vectorDataGB: number;
  analysisDataGB: number;
}

async function getStorageMetrics(): Promise<StorageMetrics> {
  // Get database size
  const { data: sizeData } = await supabase.rpc('execute_query', {
    query_text: `
      SELECT pg_database_size(current_database())::float8 / (1024*1024*1024) as db_size_gb
    `
  });
  
  const usedGB = sizeData?.[0]?.db_size_gb || 0;
  
  // Get table sizes
  const { data: tableData } = await supabase.rpc('execute_query', {
    query_text: `
      WITH table_sizes AS (
        SELECT 
          tablename,
          pg_total_relation_size(schemaname||'.'||tablename)::float8 / (1024*1024*1024) AS size_gb,
          n_live_tup AS row_count
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 10
      )
      SELECT * FROM table_sizes;
    `
  });

  // Calculate vector data size
  const { data: vectorData } = await supabase.rpc('execute_query', {
    query_text: `
      SELECT SUM(pg_total_relation_size(tablename::regclass))::float8 / (1024*1024*1024) AS total_gb
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('analysis_chunks', 'tool_results_vectors', 'educational_patterns', 'knowledge_items');
    `
  });

  // Calculate analysis data size  
  const { data: analysisData } = await supabase.rpc('execute_query', {
    query_text: `
      SELECT SUM(pg_total_relation_size(tablename::regclass))::float8 / (1024*1024*1024) AS total_gb
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('repository_analyses', 'pr_analyses', 'perspective_analyses');
    `
  });

  return {
    totalGB: 30, // DigitalOcean plan size
    usedGB,
    percentageUsed: (usedGB / 30) * 100,
    largestTables: tableData?.map((t: any) => ({
      name: t.tablename,
      sizeGB: t.size_gb,
      rowCount: t.row_count
    })) || [],
    vectorDataGB: vectorData?.[0]?.total_gb || 0,
    analysisDataGB: analysisData?.[0]?.total_gb || 0
  };
}

async function checkCleanupOpportunities(): Promise<string[]> {
  const opportunities: string[] = [];

  // Check expired chunks
  const { data: expiredData } = await supabase.rpc('execute_query', {
    query_text: `
      SELECT COUNT(*) as count, 
             SUM(pg_column_size(embedding) + pg_column_size(content))::float8 / (1024*1024*1024) as size_gb
      FROM analysis_chunks
      WHERE storage_type != 'permanent' AND expires_at < NOW();
    `
  });

  if (expiredData?.[0]?.count > 0) {
    opportunities.push(
      `🧹 ${expiredData[0].count} expired vector chunks (${expiredData[0].size_gb.toFixed(2)}GB)`
    );
  }

  // Check old analyses
  const { data: oldData } = await supabase.rpc('execute_query', {
    query_text: `
      SELECT COUNT(*) as count,
             SUM(pg_column_size(analysis_data))::float8 / (1024*1024*1024) as size_gb
      FROM repository_analyses
      WHERE created_at < NOW() - INTERVAL '90 days';
    `
  });

  if (oldData?.[0]?.count > 0) {
    opportunities.push(
      `📦 ${oldData[0].count} analyses older than 90 days (${oldData[0].size_gb.toFixed(2)}GB)`
    );
  }

  return opportunities;
}

async function sendSlackAlert(level: 'warning' | 'critical', metrics: StorageMetrics, opportunities: string[]) {
  if (!SLACK_WEBHOOK) {
    logger.warn('Slack webhook not configured');
    return;
  }

  const color = level === 'critical' ? '#FF0000' : '#FFA500';
  const emoji = level === 'critical' ? '🚨' : '⚠️';

  const message = {
    attachments: [{
      color,
      title: `${emoji} Database Storage Alert - ${level.toUpperCase()}`,
      fields: [
        {
          title: 'Storage Usage',
          value: `${metrics.usedGB.toFixed(2)}GB / ${metrics.totalGB}GB (${metrics.percentageUsed.toFixed(1)}%)`,
          short: true
        },
        {
          title: 'Vector Data',
          value: `${metrics.vectorDataGB.toFixed(2)}GB`,
          short: true
        },
        {
          title: 'Analysis Data',
          value: `${metrics.analysisDataGB.toFixed(2)}GB`,
          short: true
        },
        {
          title: 'Largest Tables',
          value: metrics.largestTables.slice(0, 3).map(t => 
            `• ${t.name}: ${t.sizeGB.toFixed(2)}GB`
          ).join('\n'),
          short: false
        }
      ],
      footer: 'CodeQual Storage Monitor',
      ts: Math.floor(Date.now() / 1000)
    }]
  };

  if (opportunities.length > 0) {
    message.attachments[0].fields.push({
      title: 'Cleanup Opportunities',
      value: opportunities.join('\n'),
      short: false
    });
  }

  try {
    await axios.post(SLACK_WEBHOOK, message);
    logger.info('Slack alert sent successfully');
  } catch (error) {
    logger.error('Failed to send Slack alert:', error);
  }
}

async function generateReport(metrics: StorageMetrics, opportunities: string[]) {
  console.log('\n📊 DigitalOcean Database Storage Report');
  console.log('=====================================\n');
  
  console.log(`Total Storage: ${metrics.totalGB}GB`);
  console.log(`Used Storage: ${metrics.usedGB.toFixed(2)}GB (${metrics.percentageUsed.toFixed(1)}%)`);
  console.log(`Available: ${(metrics.totalGB - metrics.usedGB).toFixed(2)}GB\n`);

  // Status indicator
  if (metrics.percentageUsed >= CRITICAL_THRESHOLD) {
    console.log('🚨 STATUS: CRITICAL - Immediate action required!\n');
  } else if (metrics.percentageUsed >= WARNING_THRESHOLD) {
    console.log('⚠️  STATUS: WARNING - Consider cleanup actions\n');
  } else {
    console.log('✅ STATUS: HEALTHY\n');
  }

  console.log('Storage Breakdown:');
  console.log(`- Vector Data: ${metrics.vectorDataGB.toFixed(2)}GB`);
  console.log(`- Analysis Data: ${metrics.analysisDataGB.toFixed(2)}GB`);
  console.log(`- Other Data: ${(metrics.usedGB - metrics.vectorDataGB - metrics.analysisDataGB).toFixed(2)}GB\n`);

  console.log('Top 5 Largest Tables:');
  metrics.largestTables.slice(0, 5).forEach(t => {
    console.log(`- ${t.name}: ${t.sizeGB.toFixed(2)}GB (${t.rowCount.toLocaleString()} rows)`);
  });

  if (opportunities.length > 0) {
    console.log('\nCleanup Opportunities:');
    opportunities.forEach(o => console.log(o));
  }

  console.log('\nMonthly Cost: ~$15 (DigitalOcean Basic Plan)');
  console.log(`Cost Efficiency: $${(15 / metrics.usedGB).toFixed(2)}/GB\n`);
}

// Main monitoring function
async function monitor() {
  try {
    logger.info('Starting storage monitoring...');
    
    const metrics = await getStorageMetrics();
    const opportunities = await checkCleanupOpportunities();
    
    // Generate console report
    await generateReport(metrics, opportunities);
    
    // Send alerts if needed
    if (metrics.percentageUsed >= CRITICAL_THRESHOLD) {
      await sendSlackAlert('critical', metrics, opportunities);
    } else if (metrics.percentageUsed >= WARNING_THRESHOLD) {
      await sendSlackAlert('warning', metrics, opportunities);
    }
    
    // Log to monitoring service
    logger.info('Storage metrics', {
      usedGB: metrics.usedGB,
      percentageUsed: metrics.percentageUsed,
      vectorDataGB: metrics.vectorDataGB,
      analysisDataGB: metrics.analysisDataGB
    });
    
  } catch (error) {
    logger.error('Monitoring failed:', error);
    process.exit(1);
  }
}

// Run the monitor
monitor();