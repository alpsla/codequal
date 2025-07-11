#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });

async function checkTable() {
  try {
    const { getSupabase } = require('@codequal/database');
    
    console.log('Checking analysis_reports table...');
    
    // Try to query the table
    const { data, error } = await getSupabase()
      .from('analysis_reports')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Error querying analysis_reports table:', error);
      
      // If table doesn't exist, create it
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log('Table does not exist. Creating analysis_reports table...');
        
        const { error: createError } = await getSupabase().rpc('exec_sql', {
          sql: `
            CREATE TABLE IF NOT EXISTS analysis_reports (
              id TEXT PRIMARY KEY,
              repository_url TEXT NOT NULL,
              pr_number INTEGER,
              user_id UUID REFERENCES auth.users(id),
              organization_id UUID,
              report_data JSONB NOT NULL,
              overview JSONB,
              metadata JSONB,
              created_at TIMESTAMPTZ DEFAULT NOW(),
              analysis_mode TEXT,
              total_findings INTEGER DEFAULT 0,
              risk_level TEXT,
              analysis_score INTEGER,
              CONSTRAINT unique_report_id UNIQUE (id)
            );
            
            -- Create indexes for better performance
            CREATE INDEX IF NOT EXISTS idx_analysis_reports_user_id ON analysis_reports(user_id);
            CREATE INDEX IF NOT EXISTS idx_analysis_reports_created_at ON analysis_reports(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_analysis_reports_repository ON analysis_reports(repository_url);
          `
        });
        
        if (createError) {
          console.error('Failed to create table:', createError);
        } else {
          console.log('Table created successfully!');
        }
      }
    } else {
      console.log('Table exists and is accessible');
      console.log('Sample data:', data);
    }
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
  
  process.exit(0);
}

checkTable();