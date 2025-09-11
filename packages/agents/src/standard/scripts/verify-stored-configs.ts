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

async function verifyConfigs() {
  console.log('📊 Verifying stored configurations...\n');
  
  // Get counts by role
  const { data: roleData, error: roleError } = await supabase
    .from('model_configurations')
    .select('role, language, size_category');
  
  if (roleError) {
    console.error('Error fetching configs:', roleError);
    return;
  }
  
  // Count configurations
  const roleCounts: Record<string, number> = {};
  const languageCounts: Record<string, number> = {};
  const sizeCounts: Record<string, number> = {};
  let totalCount = 0;
  
  if (roleData) {
    for (const config of roleData) {
      totalCount++;
      roleCounts[config.role] = (roleCounts[config.role] || 0) + 1;
      if (config.language) {
        languageCounts[config.language] = (languageCounts[config.language] || 0) + 1;
      }
      if (config.size_category) {
        sizeCounts[config.size_category] = (sizeCounts[config.size_category] || 0) + 1;
      }
    }
  }
  
  console.log(`Total configurations stored: ${totalCount}`);
  console.log('\nBy Role:');
  Object.entries(roleCounts).sort().forEach(([role, count]) => {
    console.log(`  ${role}: ${count}`);
  });
  
  console.log('\nBy Language:');
  Object.entries(languageCounts).sort().forEach(([lang, count]) => {
    console.log(`  ${lang}: ${count}`);
  });
  
  console.log('\nBy Size:');
  Object.entries(sizeCounts).sort().forEach(([size, count]) => {
    console.log(`  ${size}: ${count}`);
  });
  
  // Check for universal roles (should have null language and size)
  const { data: universalData, error: universalError } = await supabase
    .from('model_configurations')
    .select('role')
    .is('language', null)
    .is('size_category', null);
  
  if (universalData) {
    console.log('\nUniversal roles (no language/size):');
    const universalRoles = [...new Set(universalData.map(d => d.role))];
    universalRoles.forEach(role => console.log(`  - ${role}`));
  }
  
  console.log('\nExpected: 273 total (3 universal + 270 context-aware)');
  console.log(`Actual: ${totalCount} stored`);
  console.log(`Missing: ${273 - totalCount} configurations`);
}

verifyConfigs();