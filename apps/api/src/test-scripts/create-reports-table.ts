#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import chalk from 'chalk';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function createReportsTable() {
  console.log(chalk.cyan('📊 Creating analysis_reports table...\n'));
  
  const sql = `
    -- Create analysis_reports table for storing generated reports
    CREATE TABLE IF NOT EXISTS public.analysis_reports (
        id TEXT PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES auth.users(id),
        repository_url TEXT NOT NULL,
        pr_number INTEGER NOT NULL,
        analysis_id TEXT NOT NULL,
        report_data JSONB NOT NULL,
        report_format TEXT DEFAULT 'json',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes for better query performance
    CREATE INDEX IF NOT EXISTS idx_analysis_reports_user_id ON public.analysis_reports(user_id);
    CREATE INDEX IF NOT EXISTS idx_analysis_reports_analysis_id ON public.analysis_reports(analysis_id);
    CREATE INDEX IF NOT EXISTS idx_analysis_reports_created_at ON public.analysis_reports(created_at DESC);
  `;
  
  try {
    const { error } = await supabase.rpc('exec_sql', { query: sql });
    
    if (error) {
      // Try direct query approach
      console.log(chalk.yellow('RPC failed, trying alternative approach...'));
      
      // Create table
      const { error: createError } = await supabase
        .from('analysis_reports')
        .select('id')
        .limit(1);
        
      if (createError?.code === '42P01') {
        console.log(chalk.red('❌ Cannot create table via Supabase client'));
        console.log(chalk.yellow('\n📝 Please run this SQL in your Supabase dashboard:\n'));
        console.log(sql);
        console.log(chalk.yellow('\nGo to: https://app.supabase.com/project/ftjhmbbcuqjqmmbaymqb/sql/new'));
        return;
      }
    }
    
    // Verify table exists
    const { error: verifyError } = await supabase
      .from('analysis_reports')
      .select('count')
      .limit(1);
      
    if (!verifyError) {
      console.log(chalk.green('✅ Table analysis_reports created successfully!'));
    } else {
      console.log(chalk.red('❌ Failed to create table'));
      console.log('Error:', verifyError);
    }
    
  } catch (err) {
    console.error(chalk.red('Error:'), err);
  }
}

createReportsTable().catch(console.error);