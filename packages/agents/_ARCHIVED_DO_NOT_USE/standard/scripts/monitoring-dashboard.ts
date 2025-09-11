#!/usr/bin/env node

/**
 * Monitoring Dashboard Script
 * 
 * Displays current system health and alerts
 * 
 * Usage:
 * npm run monitor
 * npm run monitor -- --alerts  # Show recent alerts
 * npm run monitor -- --health  # Show health checks only
 */

import { SupabaseDataStore } from '../../infrastructure/supabase/supabase-data-store';
import { EnhancedMonitoringService } from '@codequal/core';
import { SupabaseAlertStorage } from '@codequal/core';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

async function showDashboard() {
  console.log('📊 CodeQual Monitoring Dashboard');
  console.log('================================\n');
  
  try {
    // Initialize services
    const dataStore = new SupabaseDataStore(SUPABASE_URL, SUPABASE_ANON_KEY);
    const alertStorage = new SupabaseAlertStorage(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    const monitoringService = new EnhancedMonitoringService({
      service: 'codequal-standard',
      environment: process.env.NODE_ENV as 'production' | 'staging' | 'development' || 'development',
      grafana: {
        url: process.env.GRAFANA_URL || 'http://localhost:3000'
      },
      supabase: {
        url: SUPABASE_URL,
        key: SUPABASE_ANON_KEY
      },
      dashboards: [],
      alerts: [
        {
          id: 'config_missing',
          name: 'Configuration Missing',
          condition: 'config_exists == 0',
          severity: 'critical',
          channels: ['slack'],
          description: 'No model configuration found in Supabase'
        },
        {
          id: 'config_stale',
          name: 'Configuration Stale',
          condition: 'config_age_days > 90',
          severity: 'warning',
          channels: ['slack'],
          description: 'Model configuration is older than 90 days'
        },
        {
          id: 'researcher_failed',
          name: 'Researcher Evaluation Failed',
          condition: 'researcher_failures > 0',
          severity: 'critical',
          channels: ['slack', 'email'],
          description: 'Quarterly model evaluation failed'
        },
        {
          id: 'scheduler_failed',
          name: 'Scheduler Failed',
          condition: 'scheduler_failures > 0',
          severity: 'critical',
          channels: ['slack'],
          description: 'Scheduler execution failed'
        }
      ],
      widgets: []
    });
    
    const args = process.argv.slice(2);
    
    // Show health checks
    if (!args.includes('--alerts')) {
      console.log('🏥 System Health\n');
      
      // Check config age
      const modelConfig = await dataStore.cache.get<any>('config:model');
      if (modelConfig) {
        const configAge = Math.floor(
          (Date.now() - new Date(modelConfig.updatedAt || modelConfig.createdAt).getTime()) / 
          (1000 * 60 * 60 * 24)
        );
        const emoji = configAge > 90 ? '⚠️' : '✅';
        console.log(`${emoji} Model Config Age: ${configAge} days`);
      } else {
        console.log('❌ Model Config: Not found');
      }
      
      // Check scheduler health
      const lastSchedulerRun = await dataStore.cache.get<Date>('scheduler:last_run');
      if (lastSchedulerRun) {
        const hoursAgo = Math.floor(
          (Date.now() - new Date(lastSchedulerRun).getTime()) / (1000 * 60 * 60)
        );
        const emoji = hoursAgo > 48 ? '❌' : hoursAgo > 24 ? '⚠️' : '✅';
        console.log(`${emoji} Scheduler Last Run: ${hoursAgo} hours ago`);
      } else {
        console.log('❌ Scheduler: Never run');
      }
      
      // Check researcher health
      const lastEvaluation = await dataStore.cache.get<any>('config:evaluation');
      if (lastEvaluation?.metadata?.lastEvaluationDate) {
        const daysAgo = Math.floor(
          (Date.now() - new Date(lastEvaluation.metadata.lastEvaluationDate).getTime()) / 
          (1000 * 60 * 60 * 24)
        );
        const emoji = daysAgo > 100 ? '❌' : daysAgo > 90 ? '⚠️' : '✅';
        console.log(`${emoji} Last Model Evaluation: ${daysAgo} days ago`);
      } else {
        console.log('❌ Model Evaluation: Never run');
      }
      console.log('');
    }
    
    // Show recent alerts
    if (!args.includes('--health')) {
      console.log('🚨 Recent Alerts\n');
      
      const alerts = await alertStorage.getRecentAlerts('codequal-standard', 10);
      if (alerts.length === 0) {
        console.log('No recent alerts 🎉');
      } else {
        alerts.forEach((alert: any) => {
          const emoji = alert.severity === 'critical' ? '🔴' :
                       alert.severity === 'warning' ? '🟡' : '🟢';
          
          console.log(`${emoji} [${alert.alertId}] ${alert.alertName}`);
          console.log(`   ${alert.message}`);
          console.log(`   Time: ${alert.triggeredAt.toISOString()}`);
          console.log(`   Status: ${alert.status}`);
          if (alert.resolvedAt) {
            console.log(`   Resolved: ${alert.resolvedAt.toISOString()}`);
          }
          console.log('');
        });
      }
    }
    
    // Show configuration status
    console.log('⚙️  Configuration Status\n');
    
    // Check last evaluation
    const evaluationConfig = await dataStore.cache.get<any>('config:evaluation');
    if (evaluationConfig?.metadata?.lastEvaluationDate) {
      const lastEval = new Date(evaluationConfig.metadata.lastEvaluationDate);
      const daysAgo = Math.floor((Date.now() - lastEval.getTime()) / (1000 * 60 * 60 * 24));
      
      console.log(`Last model evaluation: ${daysAgo} days ago`);
      console.log(`Next evaluation due: ${90 - daysAgo} days`);
    } else {
      console.log('⚠️  No evaluation history found');
    }
    
    // Show alert metrics
    if (args.includes('--metrics')) {
      console.log('\n📈 Alert Metrics (Last 7 Days)\n');
      
      const endTime = new Date();
      const startTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const metrics = await alertStorage.getAlertMetrics(
        'codequal-standard',
        startTime,
        endTime
      );
      
      console.log(`Total Alerts: ${metrics.total}`);
      console.log(`By Severity:`);
      Object.entries(metrics.bySeverity).forEach(([severity, count]) => {
        console.log(`  ${severity}: ${count}`);
      });
      console.log(`By Status:`);
      Object.entries(metrics.byStatus).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });
      console.log(`Mean Time to Resolution: ${metrics.mttr} minutes`);
    }
    
    console.log('\n✅ Dashboard check complete');
    
  } catch (error) {
    console.error('❌ Dashboard error:', error);
    process.exit(1);
  }
}

// Run dashboard
showDashboard()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });