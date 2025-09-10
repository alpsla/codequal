#!/usr/bin/env ts-node

/**
 * Check All Role Configurations in Supabase
 * 
 * This script checks for existing configurations for all roles:
 * - DeepWiki (language & size dependent)
 * - Comparator (language & size dependent) 
 * - LocationFinder (language & size dependent)
 * - Orchestrator (NOT language/size dependent)
 * - Educator (NOT language/size dependent)
 * - Researcher (NOT language/size dependent)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Define roles and their dependencies
const ROLES = {
  // Language & Size dependent roles
  deepwiki: { dependsOnContext: true },
  comparator: { dependsOnContext: true },
  location_finder: { dependsOnContext: true },
  
  // Context-independent roles (global configuration)
  orchestrator: { dependsOnContext: false },
  educator: { dependsOnContext: false },
  researcher: { dependsOnContext: false }
};

// Top 10 languages for analysis
const LANGUAGES = [
  'Python',
  'JavaScript', 
  'TypeScript',
  'Java',
  'Go',
  'Rust',
  'C++',
  'C#',
  'Ruby',
  'PHP'
];

// 3 repository sizes
const SIZES = ['small', 'medium', 'large'];

async function checkAllConfigurations() {
  console.log('🔍 CHECKING ALL ROLE CONFIGURATIONS IN SUPABASE\n');
  console.log('=' .repeat(80));
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase credentials not found');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Check if model_configurations table exists and has data
  console.log('📊 Checking model_configurations table...\n');
  
  try {
    const { data: configs, error } = await supabase
      .from('model_configurations')
      .select('*')
      .limit(100);
    
    if (error) {
      console.log('❌ model_configurations table not found or error:', error.message);
      console.log('\n⚠️  Need to create and populate model_configurations table!');
    } else if (configs && configs.length > 0) {
      console.log(`✅ Found ${configs.length} configurations in model_configurations\n`);
      
      // Analyze configurations by role
      const configsByRole: any = {};
      
      configs.forEach(config => {
        const role = config.role || 'unknown';
        if (!configsByRole[role]) {
          configsByRole[role] = [];
        }
        configsByRole[role].push(config);
      });
      
      console.log('📊 Configurations by Role:\n');
      Object.keys(ROLES).forEach(role => {
        const roleConfigs = configsByRole[role] || [];
        console.log(`${role.toUpperCase()}:`);
        console.log(`  Total configurations: ${roleConfigs.length}`);
        
        if (ROLES[role as keyof typeof ROLES].dependsOnContext) {
          // Context-dependent roles should have language/size combinations
          const expectedConfigs = LANGUAGES.length * SIZES.length; // 10 * 3 = 30
          console.log(`  Expected: ${expectedConfigs} (${LANGUAGES.length} languages × ${SIZES.length} sizes)`);
          console.log(`  Coverage: ${((roleConfigs.length / expectedConfigs) * 100).toFixed(1)}%`);
          
          // Check which combinations exist
          const existing = new Set(roleConfigs.map((c: any) => `${c.language}-${c.repo_size}`));
          const missing = [];
          
          for (const lang of LANGUAGES) {
            for (const size of SIZES) {
              if (!existing.has(`${lang}-${size}`)) {
                missing.push(`${lang}/${size}`);
              }
            }
          }
          
          if (missing.length > 0) {
            console.log(`  ⚠️  Missing: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? ` + ${missing.length - 5} more` : ''}`);
          }
        } else {
          // Context-independent roles should have 1 global config
          console.log(`  Expected: 1 global configuration`);
          if (roleConfigs.length === 0) {
            console.log(`  ❌ No configuration found!`);
          } else if (roleConfigs.length === 1) {
            console.log(`  ✅ Global configuration exists`);
          } else {
            console.log(`  ⚠️  Multiple configurations (${roleConfigs.length}) - should be 1`);
          }
        }
        
        // Check dates
        if (roleConfigs.length > 0) {
          const latest = roleConfigs.sort((a: any, b: any) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0];
          
          const age = Math.floor((Date.now() - new Date(latest.created_at).getTime()) / (1000 * 60 * 60 * 24));
          console.log(`  Latest update: ${age} days ago`);
          
          if (age > 90) {
            console.log(`  ⚠️  Configuration is outdated (>90 days)`);
          }
        }
        
        console.log();
      });
    } else {
      console.log('⚠️  No configurations found in model_configurations table');
    }
  } catch (error) {
    console.log('❌ Error checking model_configurations:', error);
  }
  
  // Check deepwiki_configurations separately
  console.log('\n📊 Checking deepwiki_configurations table...\n');
  
  const { data: deepwikiConfigs, error: dwError } = await supabase
    .from('deepwiki_configurations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (deepwikiConfigs && deepwikiConfigs.length > 0) {
    console.log(`Found ${deepwikiConfigs.length} DeepWiki configurations:`);
    deepwikiConfigs.forEach((config, i) => {
      const age = Math.floor((Date.now() - new Date(config.created_at).getTime()) / (1000 * 60 * 60 * 24));
      console.log(`  ${i + 1}. ${config.primary_model} (${age} days old)`);
    });
  } else {
    console.log('⚠️  No DeepWiki configurations found');
  }
  
  // Summary and recommendations
  console.log('\n' + '=' .repeat(80));
  console.log('📝 SUMMARY & RECOMMENDATIONS:\n');
  
  console.log('Required Configurations:');
  console.log('1. Context-Dependent Roles (need 30 configs each):');
  console.log('   - deepwiki: 10 languages × 3 sizes = 30 configs');
  console.log('   - comparator: 10 languages × 3 sizes = 30 configs');
  console.log('   - location_finder: 10 languages × 3 sizes = 30 configs');
  console.log('   Total: 90 configurations\n');
  
  console.log('2. Context-Independent Roles (need 1 config each):');
  console.log('   - orchestrator: 1 global config');
  console.log('   - educator: 1 global config');
  console.log('   - researcher: 1 global config');
  console.log('   Total: 3 configurations\n');
  
  console.log('Grand Total: 93 configurations needed\n');
  
  console.log('⚠️  If configurations are missing or outdated:');
  console.log('   1. Run comprehensive model research');
  console.log('   2. Generate all role configurations');
  console.log('   3. Store in model_configurations table');
  console.log('   4. Validate with latest 2025 models');
}

// Run the check
checkAllConfigurations().catch(console.error);