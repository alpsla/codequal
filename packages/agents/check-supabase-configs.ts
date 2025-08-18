#!/usr/bin/env npx ts-node

/**
 * Check what configurations exist in Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { createLogger } from '@codequal/core/utils';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const logger = createLogger('Check-Configs');

async function checkSupabaseConfigs() {
  logger.info('📊 Checking Supabase Configurations');
  logger.info('====================================\n');
  
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Fetch all configurations
    const { data: configs, error } = await supabase
      .from('model_configurations')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      throw new Error(`Failed to fetch configs: ${error.message}`);
    }
    
    logger.info(`Total configurations: ${configs?.length || 0}\n`);
    
    // Group by role
    const roleGroups: Record<string, any[]> = {};
    
    configs?.forEach(config => {
      const role = config.role || config.agent_role || 'unknown';
      if (!roleGroups[role]) {
        roleGroups[role] = [];
      }
      roleGroups[role].push(config);
    });
    
    // Display each role
    Object.keys(roleGroups).forEach(role => {
      logger.info(`\n📌 Role: ${role}`);
      logger.info(`  Count: ${roleGroups[role].length}`);
      
      roleGroups[role].forEach(config => {
        logger.info(`  Config ID: ${config.id}`);
        logger.info(`    Primary: ${config.primary_model || config.model_version?.primary || 'N/A'}`);
        logger.info(`    Fallback: ${config.fallback_model || config.model_version?.fallback || 'N/A'}`);
        logger.info(`    Created: ${config.created_at}`);
        logger.info('');
      });
    });
    
    // Check table structure
    logger.info('\n📋 Table Structure (sample record):');
    if (configs && configs.length > 0) {
      const sample = configs[0];
      const keys = Object.keys(sample);
      logger.info('Columns: ' + keys.join(', '));
    }
    
    return configs;
    
  } catch (error) {
    logger.error('Check failed:', error);
    throw error;
  }
}

// Run check
checkSupabaseConfigs()
  .then(configs => {
    logger.info(`\n✅ Found ${configs?.length || 0} configurations in Supabase`);
    process.exit(0);
  })
  .catch(error => {
    logger.error('Check failed:', error);
    process.exit(1);
  });