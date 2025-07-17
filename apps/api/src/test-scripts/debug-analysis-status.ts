#!/usr/bin/env ts-node

import { config } from 'dotenv';
import { resolve } from 'path';
import { getSupabase } from '@codequal/database/supabase/client';
import chalk from 'chalk';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

async function debugAnalysisStatus(analysisId: string) {
  console.log(chalk.cyan(`\n🔍 Debugging Analysis: ${analysisId}\n`));
  
  try {
    // Check analysis reports table
    console.log(chalk.blue('1️⃣ Checking analysis_reports table...'));
    const { data: report, error: reportError } = await getSupabase()
      .from('analysis_reports')
      .select('*')
      .eq('id', analysisId)
      .single();
      
    if (reportError) {
      console.log(chalk.red('   ❌ No report found in database'));
      console.log('   Error:', reportError.message);
    } else {
      console.log(chalk.green('   ✓ Report found in database!'));
      console.log('   Created at:', report.created_at);
      console.log('   Repository:', report.repository_url);
      console.log('   PR Number:', report.pr_number);
      console.log('   Has report data:', !!report.report_data);
    }
    
    // Check analysis results table
    console.log();
    console.log(chalk.blue('2️⃣ Checking analysis_results table...'));
    const { data: results, error: resultsError } = await getSupabase()
      .from('analysis_results')
      .select('*')
      .eq('analysis_id', analysisId);
      
    if (resultsError || !results || results.length === 0) {
      console.log(chalk.red('   ❌ No results found in analysis_results'));
      if (resultsError) console.log('   Error:', resultsError.message);
    } else {
      console.log(chalk.green(`   ✓ Found ${results.length} result entries`));
      results.forEach((result, index) => {
        console.log(`   Result ${index + 1}:`);
        console.log(`     - Agent: ${result.agent_name}`);
        console.log(`     - Status: ${result.status}`);
        console.log(`     - Created: ${result.created_at}`);
      });
    }
    
    // Check pr_analyses table
    console.log();
    console.log(chalk.blue('3️⃣ Checking pr_analyses table...'));
    const { data: prAnalysis, error: prError } = await getSupabase()
      .from('pr_analyses')
      .select('*')
      .eq('id', analysisId)
      .single();
      
    if (prError || !prAnalysis) {
      console.log(chalk.red('   ❌ No PR analysis found'));
      if (prError) console.log('   Error:', prError.message);
    } else {
      console.log(chalk.green('   ✓ PR analysis found!'));
      console.log('   Status:', prAnalysis.status);
      console.log('   Progress:', prAnalysis.progress);
      console.log('   Created:', prAnalysis.created_at);
      console.log('   Updated:', prAnalysis.updated_at);
    }
    
  } catch (error) {
    console.error(chalk.red('\n❌ Debug failed:'), error);
  }
}

// Get analysis ID from command line
const analysisId = process.argv[2];

if (!analysisId) {
  console.error(chalk.red('Please provide an analysis ID'));
  console.log('Usage: ts-node debug-analysis-status.ts <analysisId>');
  process.exit(1);
}

debugAnalysisStatus(analysisId)
  .then(() => {
    console.log(chalk.green('\n✅ Debug completed'));
    process.exit(0);
  })
  .catch(error => {
    console.error(chalk.red('\n💥 Fatal error:'), error);
    process.exit(1);
  });