#!/usr/bin/env node

/**
 * Test script for Supabase/Grafana monitoring integration
 * 
 * Usage: npx ts-node test-integration.ts
 */

import { EnhancedMonitoringService } from './enhanced-monitoring-service';
import { SupabaseAlertStorage } from './supabase-alert-storage';

async function testIntegration() {
  console.log('Testing CodeQual Monitoring Integration\n');

  // Check environment variables
  const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
  const missingVars = requiredEnvVars.filter(v => !process.env[v]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing environment variables:', missingVars.join(', '));
    console.log('\nPlease set the following environment variables:');
    missingVars.forEach(v => console.log(`  export ${v}=your-value`));
    process.exit(1);
  }

  try {
    // Initialize monitoring service
    console.log('1️⃣ Initializing monitoring service...');
    const monitoring = new EnhancedMonitoringService({
      service: 'test-integration',
      environment: 'development',
      grafana: {
        url: process.env.GRAFANA_URL || 'http://localhost:3000'
      },
      supabase: {
        url: process.env.SUPABASE_URL!,
        key: process.env.SUPABASE_ANON_KEY!
      },
      dashboards: [],
      alerts: [
        {
          id: 'test-alert',
          name: 'Test Integration Alert',
          condition: 'test_metric > 100',
          severity: 'warning',
          channels: ['slack'],
          description: 'Test alert for integration verification',
          threshold: 100
        }
      ],
      widgets: []
    });
    console.log('✅ Monitoring service initialized\n');

    // Test metrics recording
    console.log('2️⃣ Recording test metrics...');
    monitoring.recordAnalysisStarted({
      mode: 'test',
      repository_size: 'small',
      user_tier: 'free'
    });
    
    monitoring.recordAnalysisCompleted({
      mode: 'test',
      repository_size: 'small',
      user_tier: 'free',
      duration_bucket: '0-30s'
    }, 15.5);
    
    monitoring.recordError('test_error', 'integration-test', 'medium');
    console.log('✅ Metrics recorded\n');

    // Test alert storage
    console.log('3️⃣ Testing alert storage...');
    const alertStorage = new SupabaseAlertStorage(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
    
    const storedAlertId = await alertStorage.storeAlert({
      service: 'test-integration',
      environment: 'development',
      alertId: 'test-alert',
      alertName: 'Test Integration Alert',
      severity: 'warning',
      status: 'firing',
      value: 150,
      threshold: 100,
      message: 'Test metric exceeded threshold (150 > 100)',
      metadata: {
        test: true,
        timestamp: new Date().toISOString()
      },
      triggeredAt: new Date(),
      channelsNotified: ['slack']
    });
    console.log(`✅ Alert stored with ID: ${storedAlertId}\n`);

    // Test alert resolution
    console.log('4️⃣ Testing alert resolution...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    
    await alertStorage.updateAlertStatus(
      storedAlertId,
      'resolved',
      new Date()
    );
    console.log('✅ Alert resolved\n');

    // Test querying recent alerts
    console.log('5️⃣ Querying recent alerts...');
    const recentAlerts = await alertStorage.getRecentAlerts('test-integration', 5);
    console.log(`✅ Found ${recentAlerts.length} recent alerts\n`);

    // Test metrics calculation
    console.log('6️⃣ Calculating alert metrics...');
    const endTime = new Date();
    const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    const metrics = await alertStorage.getAlertMetrics(
      'test-integration',
      startTime,
      endTime
    );
    
    console.log('✅ Alert metrics:');
    console.log(`   Total alerts: ${metrics.total}`);
    console.log(`   By severity: ${JSON.stringify(metrics.bySeverity)}`);
    console.log(`   By status: ${JSON.stringify(metrics.byStatus)}`);
    console.log(`   MTTR: ${metrics.mttr} minutes\n`);

    // Get Prometheus metrics
    console.log('7️⃣ Exporting Prometheus metrics...');
    const promMetrics = await monitoring.getPrometheusMetrics();
    const metricLines = promMetrics.split('\n').filter(line => 
      line.includes('codequal_') && !line.startsWith('#')
    );
    console.log('✅ Sample metrics:');
    metricLines.slice(0, 5).forEach(line => console.log(`   ${line}`));
    console.log('\n');

    // Test Grafana alert format
    console.log('8️⃣ Testing Grafana alert format...');
    const grafanaAlerts = await monitoring.getGrafanaAlerts();
    console.log(`✅ Formatted ${grafanaAlerts.length} alerts for Grafana\n`);

    // Cleanup
    monitoring.destroy();

    console.log('✨ Integration test completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Check your Supabase dashboard for the test alert');
    console.log('2. Import grafana-config.json into Grafana');
    console.log('3. Configure notification channels (Slack, email)');
    console.log('4. Run your application with monitoring enabled');

  } catch (error) {
    console.error('❌ Integration test failed:', error);
    process.exit(1);
  }
}

// Run the test
testIntegration().catch(console.error);