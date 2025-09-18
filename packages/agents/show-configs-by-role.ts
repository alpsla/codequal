#!/usr/bin/env npx ts-node

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function showOneConfigPerRole() {
  // Get all unique roles
  const { data: roles } = await supabase
    .from('model_configurations')
    .select('role')
    .limit(1000);
  
  const uniqueRoles = [...new Set(roles?.map(r => r.role) || [])].sort();
  
  console.log('📊 Sample Configuration for Each Role');
  console.log('=' .repeat(70));
  
  for (const role of uniqueRoles) {
    // Get one config for this role
    const { data: config } = await supabase
      .from('model_configurations')
      .select('*')
      .eq('role', role)
      .limit(1)
      .single();
    
    if (config) {
      console.log(`\n${role.toUpperCase()} (${config.language}/${config.size_category}):`);
      console.log(`  Primary: ${config.primary_model}`);
      console.log(`  Fallback: ${config.fallback_model}`);
      console.log(`  Weights:`);
      console.log(`    Quality: ${(config.weights.quality * 100).toFixed(0)}%`);
      console.log(`    Speed:   ${(config.weights.speed * 100).toFixed(0)}%`);
      console.log(`    Cost:    ${(config.weights.cost * 100).toFixed(0)}%`);
      console.log(`    Fresh:   ${(config.weights.freshness * 100).toFixed(0)}%`);
      console.log(`    Context: ${(config.weights.contextWindow * 100).toFixed(0)}%`);
    }
  }
  
  console.log('\n' + '=' .repeat(70));
  console.log(`Total unique roles: ${uniqueRoles.length}`);
}

showOneConfigPerRole();