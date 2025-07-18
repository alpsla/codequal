#!/usr/bin/env ts-node

/**
 * Reset Model Research Timestamps
 * Forces the system to trigger new model research by resetting timestamps
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { initSupabase, getSupabase } from '@codequal/database';
import { createLogger } from '@codequal/core/utils';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

const logger = createLogger('Reset-Model-Research');

async function resetModelResearch() {
  console.log('🔄 Resetting Model Research Timestamps\n');
  
  try {
    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_ANON_KEY!;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }
    
    initSupabase(supabaseUrl, supabaseKey);
    const supabase = getSupabase();
    
    // Reset model version timestamps to trigger research
    console.log('1️⃣ Resetting model version timestamps...');
    
    // Update all model versions to appear 4 months old
    const fourMonthsAgo = new Date();
    fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);
    
    const { data, error } = await supabase
      .from('model_versions')
      .update({ 
        updated_at: fourMonthsAgo.toISOString(),
        metadata: {
          reset_for_testing: true,
          reset_at: new Date().toISOString(),
          original_updated_at: new Date().toISOString()
        }
      })
      .not('id', 'is', null); // Update all records
    
    if (error) {
      console.error('❌ Failed to reset timestamps:', error);
      return;
    }
    
    console.log(`✅ Reset ${Array.isArray(data) ? data.length : 0} model version records`);
    
    // Also clear any research cache
    console.log('\n2️⃣ Clearing research cache...');
    
    const { error: cacheError } = await supabase
      .from('vector_store')
      .delete()
      .eq('content_type', 'model_research')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    
    if (cacheError) {
      console.error('⚠️  Failed to clear cache:', cacheError);
    } else {
      console.log('✅ Research cache cleared');
    }
    
    // Log current state
    console.log('\n3️⃣ Verifying reset...');
    
    const { data: checkData } = await supabase
      .from('model_versions')
      .select('provider, model, updated_at')
      .limit(5);
    
    if (checkData && checkData.length > 0) {
      console.log('\nSample model versions after reset:');
      checkData.forEach(record => {
        const age = Math.floor((Date.now() - new Date(record.updated_at).getTime()) / (1000 * 60 * 60 * 24));
        console.log(`- ${record.provider}/${record.model}: ${age} days old`);
      });
    }
    
    console.log('\n✅ Model research reset complete!');
    console.log('The system will now trigger research on next analysis.');
    
  } catch (error) {
    logger.error('Failed to reset model research', { error });
    console.error('❌ Error:', error);
  }
}

// Helper to check if research is needed
async function checkResearchStatus() {
  console.log('\n📊 Checking Research Status...\n');
  
  const supabase = getSupabase();
  
  // Get latest model version
  const { data } = await supabase
    .from('model_versions')
    .select('updated_at')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();
  
  if (data) {
    const lastUpdate = new Date(data.updated_at);
    const daysAgo = Math.floor((Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
    const monthsAgo = (daysAgo / 30).toFixed(1);
    
    console.log(`Last model update: ${lastUpdate.toLocaleDateString()}`);
    console.log(`Days ago: ${daysAgo}`);
    console.log(`Months ago: ${monthsAgo}`);
    console.log(`Research needed: ${daysAgo >= 90 ? 'YES' : 'NO'} (threshold: 90 days)`);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--check')) {
    await checkResearchStatus();
  } else {
    await resetModelResearch();
    await checkResearchStatus();
  }
}

// Execute
main().catch(console.error);