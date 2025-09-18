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

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

async function main() {
  console.log('\n');
  console.log('================================');
  console.log('📊 CodeQual Monitoring Dashboard');
  console.log('================================\n');

  try {
    // Initialize services
    const dataStore = new SupabaseDataStore(SUPABASE_URL, SUPABASE_ANON_KEY);

    const args = process.argv.slice(2);

    // Show health checks
    if (!args.includes('--alerts')) {
      console.log('🏥 System Health\n');

      // Check config age
      const modelConfig = await dataStore.cache.get('config:model') as any;
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
      const lastSchedulerRun = await dataStore.cache.get('scheduler:last_run') as Date;
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
      const lastEvaluation = await dataStore.cache.get('config:evaluation') as any;
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
      console.log('Alert system temporarily disabled for refactoring');
      console.log('');
    }

    // Show configuration status
    console.log('⚙️  Configuration Status\n');

    // Check last evaluation
    const evaluationConfig = await dataStore.cache.get('config:evaluation') as any;
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
      console.log('Metrics system temporarily disabled for refactoring');
    }

    console.log('\n');

  } catch (error) {
    console.error('❌ Dashboard Error:', error);
    process.exit(1);
  }
}

// Run the dashboard
main().catch(console.error);