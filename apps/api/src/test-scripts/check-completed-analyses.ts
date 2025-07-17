#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAnalyses() {
  console.log('Checking for completed analyses...\n');
  
  // Check analysis_results table
  const { data: results, error: resultsError } = await supabase
    .from('analysis_results')
    .select('*')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (resultsError) {
    console.error('Error fetching results:', resultsError);
    return;
  }
  
  if (!results || results.length === 0) {
    console.log('No completed analyses found in analysis_results table.');
  } else {
    console.log(`Found ${results.length} completed analyses:`);
    results.forEach((r: any) => {
      console.log(`\n- Analysis ID: ${r.analysis_id}`);
      console.log(`  Repository: ${r.repository_url}`);
      console.log(`  PR: ${r.pr_number}`);
      console.log(`  Created: ${r.created_at}`);
      if (r.report_data) {
        console.log('  Has report data: Yes');
      }
    });
  }
  
  // Let's check one of the recent analysis IDs from our test
  const testAnalysisId = 'analysis_1752487307757_hrr8sqihr'; // From the previous session
  
  console.log(`\n\nChecking specific analysis: ${testAnalysisId}`);
  
  const { data: specific, error: specificError } = await supabase
    .from('analysis_results')
    .select('*')
    .eq('analysis_id', testAnalysisId)
    .single();
    
  if (specificError) {
    console.log('Analysis not found in database:', specificError.message);
  } else if (specific) {
    console.log('Found analysis:');
    console.log('- Status:', specific.status);
    console.log('- Has report data:', !!specific.report_data);
    console.log('- Has result data:', !!specific.result_data);
  }
}

checkAnalyses().catch(console.error);