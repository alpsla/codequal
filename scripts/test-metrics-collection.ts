#!/usr/bin/env ts-node

import { metricsCollector } from '../apps/api/src/services/deepwiki-metrics-collector';
import { createLogger } from '@codequal/core/utils';

const logger = createLogger('test-metrics');

async function testMetricsCollection() {
  try {
    logger.info('Testing DeepWiki metrics collection...');
    
    // Test single collection
    logger.info('Collecting metrics once...');
    await metricsCollector.collectMetrics();
    
    logger.info('✅ Metrics collected successfully!');
    logger.info('Check your Supabase deepwiki_metrics table for the new entry');
    
    // You can also test continuous collection
    // logger.info('Starting continuous collection (every 10 seconds)...');
    // metricsCollector.startCollection(10000);
    
    // Stop after 1 minute
    // setTimeout(() => {
    //   metricsCollector.stopCollection();
    //   logger.info('Stopped continuous collection');
    //   process.exit(0);
    // }, 60000);
    
  } catch (error) {
    logger.error('Failed to collect metrics:', error as Error);
    process.exit(1);
  }
}

// Run the test
testMetricsCollection();