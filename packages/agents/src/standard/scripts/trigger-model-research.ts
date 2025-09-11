#!/usr/bin/env npx ts-node

/**
 * Trigger Model Research and Display Results
 * This script triggers the quarterly model research and displays the discovered models
 */

import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { ModelResearcherService } from '../services/model-researcher-service';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '..', '..', '..', '..', '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function triggerResearchAndDisplay() {
  console.log('🔬 Triggering Quarterly Model Research');
  console.log('═══════════════════════════════════════════════════════\n');
  
  try {
    // Initialize the researcher service
    const researcher = new ModelResearcherService();
    
    // Trigger quarterly research
    console.log('📡 Starting web search for latest AI models...\n');
    await researcher.conductQuarterlyResearch();
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ Research Complete! Now retrieving results...\n');
    
    // Get unique roles from model_configurations
    const { data: rolesData, error: rolesError } = await supabase
      .from('model_configurations')
      .select('role')
      .order('role');
    
    if (rolesError) {
      console.error('Error fetching roles:', rolesError);
      return;
    }
    
    const uniqueRoles = [...new Set(rolesData?.map(r => r.role) || [])];
    console.log(`Found ${uniqueRoles.length} unique roles to configure\n`);
    
    // For each role, get the optimal model based on research
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 DISCOVERED MODELS BY ROLE');
    console.log('═══════════════════════════════════════════════════════\n');
    
    for (const role of uniqueRoles.sort()) {
      // Get configuration for this role
      const { data: config } = await supabase
        .from('model_configurations')
        .select('*')
        .eq('role', role)
        .limit(1)
        .single();
      
      if (!config) continue;
      
      // Get optimal model from research
      const context = {
        language: config.language || 'TypeScript',
        repo_size: config.size_category || 'medium',
        task_type: role
      };
      
      const optimalModel = await researcher.getOptimalModelForContext(context);
      
      // Get research details for this model
      const { data: research } = await supabase
        .from('model_research')
        .select('*')
        .eq('model_id', optimalModel)
        .single();
      
      console.log(`🎯 ${role.toUpperCase()}`);
      console.log(`   Context: ${context.language} / ${context.repo_size}`);
      console.log(`   Discovered Model: ${optimalModel}`);
      
      if (research) {
        console.log(`   Quality Score: ${research.quality_score}/100`);
        console.log(`   Speed Score: ${research.speed_score}/100`);
        console.log(`   Price Score: ${research.price_score}/100`);
        console.log(`   Context Window: ${research.context_length?.toLocaleString()} tokens`);
        console.log(`   Optimal For: ${JSON.stringify(research.optimal_for)}`);
        console.log(`   Research Date: ${new Date(research.research_date).toLocaleDateString()}`);
      }
      
      // Update the configuration with the discovered model
      const { error: updateError } = await supabase
        .from('model_configurations')
        .update({
          primary_model: optimalModel,
          fallback_model: optimalModel, // Use same for now, can be different
          primary_provider: optimalModel.split('/')[0],
          fallback_provider: optimalModel.split('/')[0],
          reasoning: [
            `Model discovered via quarterly research on ${new Date().toISOString()}`,
            `Selected based on ${context.task_type} requirements`,
            `Optimized for ${context.language} ${context.repo_size} repositories`
          ],
          updated_at: new Date().toISOString()
        })
        .eq('id', config.id);
      
      if (updateError) {
        console.error(`   ❌ Error updating config: ${updateError.message}`);
      } else {
        console.log(`   ✅ Configuration updated with discovered model`);
      }
      
      console.log('');
    }
    
    // Show summary of all discovered models
    console.log('═══════════════════════════════════════════════════════');
    console.log('📈 RESEARCH SUMMARY');
    console.log('═══════════════════════════════════════════════════════\n');
    
    const { data: allResearch } = await supabase
      .from('model_research')
      .select('*')
      .order('quality_score', { ascending: false })
      .limit(10);
    
    if (allResearch && allResearch.length > 0) {
      console.log('Top 10 Discovered Models by Quality:\n');
      allResearch.forEach((model, idx) => {
        console.log(`${idx + 1}. ${model.model_id}`);
        console.log(`   Quality: ${model.quality_score} | Speed: ${model.speed_score} | Price: ${model.price_score}`);
        console.log(`   Context: ${model.context_length?.toLocaleString()} tokens`);
        console.log(`   Best For: ${model.optimal_for?.languages?.slice(0, 3).join(', ')}\n`);
      });
    }
    
    // Check metadata
    const { data: metadata } = await supabase
      .from('model_research_metadata')
      .select('*')
      .single();
    
    if (metadata) {
      console.log('═══════════════════════════════════════════════════════');
      console.log('📅 Research Metadata:');
      console.log(`   Last Research: ${new Date(metadata.last_research_date).toLocaleDateString()}`);
      console.log(`   Next Scheduled: ${new Date(metadata.next_scheduled_research).toLocaleDateString()}`);
      console.log(`   Total Models Researched: ${metadata.total_models_researched}`);
    }
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ All configurations updated with discovered models!');
    console.log('═══════════════════════════════════════════════════════');
    
  } catch (error) {
    console.error('Error during research:', error);
  }
}

// Run the script
triggerResearchAndDisplay().catch(console.error);