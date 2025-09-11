#!/usr/bin/env npx ts-node

import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '..', '..', '..', '..', '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function showSampleConfigs() {
  console.log('📊 Sample Configuration for Each Role\n');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Get one config for each role
  const roles = [
    'orchestrator', 'researcher', 'educator',
    'deepwiki', 'comparator', 'location_finder',
    'security', 'performance', 'architecture',
    'code_quality', 'testing', 'documentation'
  ];
  
  for (const role of roles) {
    const { data, error } = await supabase
      .from('model_configurations')
      .select('*')
      .eq('role', role)
      .limit(1)
      .single();
    
    if (error) {
      console.error(`Error fetching ${role}:`, error);
      continue;
    }
    
    if (data) {
      console.log(`🎯 Role: ${role.toUpperCase()}`);
      console.log(`   Language: ${data.language}`);
      console.log(`   Size: ${data.size_category}`);
      console.log(`   Primary: ${data.primary_provider}/${data.primary_model}`);
      console.log(`   Fallback: ${data.fallback_provider}/${data.fallback_model}`);
      console.log(`   Weights:`);
      const weights = data.weights as any;
      Object.entries(weights).forEach(([key, value]) => {
        const percentage = ((value as number) * 100).toFixed(1);
        console.log(`     - ${key}: ${percentage}%`);
      });
      console.log(`   Reasoning: ${data.reasoning[0]}`);
      console.log('');
    }
  }
  
  console.log('═══════════════════════════════════════════════════════');
}

showSampleConfigs();