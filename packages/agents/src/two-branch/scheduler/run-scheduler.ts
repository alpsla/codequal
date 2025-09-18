#!/usr/bin/env node

/**
 * Standalone Scheduler Runner
 * 
 * This script runs independently to manage scheduled tasks like quarterly model evaluation.
 * It should be deployed as a separate service/cron job that runs periodically.
 * 
 * Usage:
 * - As a cron job: 0 0 * * * /usr/bin/node /path/to/run-scheduler.js
 * - As a service: node run-scheduler.js --daemon
 * - Manual run: npm run scheduler
 */

import { createClient } from '@supabase/supabase-js';
import { SupabaseConfigProvider } from '../../standard/infrastructure/supabase/supabase-config-provider';
import { SupabaseDataStore } from '../../infrastructure/supabase/supabase-data-store';
import { ResearcherAgent } from '../researcher/researcher-agent';
import { ModelSelectionService } from '../../standard/services/model-selection-service';
import { SchedulerService } from './scheduler-service';
import { AuthenticatedUser, UserRole, UserStatus } from '../../multi-agent/types/auth';

// Initialize environment
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing required environment variables: SUPABASE_URL, SUPABASE_ANON_KEY');
  process.exit(1);
}

// Create system user for researcher
const systemUser: AuthenticatedUser = {
  id: 'system-scheduler',
  email: 'scheduler@codequal.com',
  name: 'System Scheduler',
  organizationId: 'system',
  permissions: {
    repositories: {},
    organizations: ['system'],
    globalPermissions: ['read', 'write'],
    quotas: {
      requestsPerHour: 1000,
      maxConcurrentExecutions: 1,
      storageQuotaMB: 100
    }
  },
  session: {
    token: 'system-scheduler-token',
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    fingerprint: 'system',
    ipAddress: '0.0.0.0',
    userAgent: 'scheduler/1.0'
  },
  role: 'admin' as UserRole,
  status: UserStatus.ACTIVE,
  metadata: {
    createdAt: new Date(),
    lastLogin: new Date(),
    isActive: true,
    preferences: {}
  }
};

async function runScheduler() {
  console.log('🚀 Starting CodeQual Scheduler Service');
  console.log(`📅 Current time: ${new Date().toISOString()}`);
  
  let monitoringService: any;
  
  try {
    // Initialize providers
    const configProvider = new SupabaseConfigProvider();
    const dataStore = new SupabaseDataStore();
    const researcherAgent = new ResearcherAgent(systemUser, undefined);
    
    // Create mock monitoring service
    monitoringService = {
      alert: async (data: any) => console.log('Alert:', data),
      metric: async (data: any) => console.log('Metric:', data),
      log: async (level: string, message: string, metadata?: any) => console.log(`[${level}] ${message}`, metadata),
      healthCheck: async () => true,
      checkHealth: async (service: string) => ({ healthy: true, service })
    };
    
    // Check researcher health
    const researcherHealth = await monitoringService.checkHealth('researcher');
    console.log(`\n🏥 Researcher Health: ${researcherHealth.status}`);
    
    // Create model selection service
    const modelSelectionService = new ModelSelectionService(
      configProvider,
      researcherAgent,
      console // Simple logger
    );
    
    // Create scheduler
    const schedulerService = new SchedulerService(
      modelSelectionService,
      console
    );
    
    // Show scheduled tasks
    const tasks = schedulerService.getTasks();
    console.log(`\n📋 Scheduled Tasks:`);
    tasks.forEach(task => {
      console.log(`  - ${task.name}: ${task.status}`);
      console.log(`    Schedule: ${task.schedule}`);
      console.log(`    Next run: ${task.nextRun.toISOString()}`);
      if (task.lastRun) {
        console.log(`    Last run: ${task.lastRun.toISOString()}`);
      }
    });
    
    // Check for manual trigger
    const args = process.argv.slice(2);
    if (args.includes('--trigger-evaluation')) {
      console.log('\n🔄 Manually triggering quarterly model evaluation...');
      await schedulerService.triggerTask('quarterly-model-evaluation');
      console.log('✅ Manual evaluation completed');
    } else {
      // Run due tasks
      console.log('\n🔍 Checking for due tasks...');
      await schedulerService.runDueTasks();
    }
    
    // Update last run timestamp
    await dataStore.cache.set('scheduler:last_run', new Date()); // Note: Map doesn't support TTL
    
    // Record success metric
    await monitoringService.increment('scheduler.run.success');
    
    console.log('\n✅ Scheduler run completed successfully');
    
  } catch (error) {
    console.error('❌ Scheduler error:', error);
    
    // Send alert
    if (monitoringService) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      await monitoringService.alert({
        severity: 'high',
        component: 'scheduler',
        message: `Scheduler failed to complete: ${errorMessage}`,
        metadata: {
          error: errorStack || error,
          timestamp: new Date()
        }
      });
      
      // Record failure metric
      await monitoringService.metric({
        name: 'scheduler.run.failure',
        value: 1,
        tags: { component: 'scheduler' }
      });
    }
    
    process.exit(1);
  }
}

// Run as daemon if requested
if (process.argv.includes('--daemon')) {
  console.log('🔄 Running in daemon mode (checking every hour)');
  
  // Run immediately
  runScheduler().catch(console.error);
  
  // Then run every hour
  setInterval(() => {
    runScheduler().catch(console.error);
  }, 60 * 60 * 1000); // 1 hour
  
} else {
  // Single run
  runScheduler()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Scheduler shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Scheduler shutting down...');
  process.exit(0);
});