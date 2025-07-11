#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const { getSupabase } = require('@codequal/database');

const reportId = 'report_1752246593209_2orv8s4o1';

async function checkReport() {
  console.log(`Checking for report: ${reportId}`);
  
  const { data, error } = await getSupabase()
    .from('analysis_reports')
    .select('id, created_at, repository_url, pr_number')
    .eq('id', reportId)
    .single();
    
  if (error) {
    console.error('Error:', error);
  } else if (data) {
    console.log('Report found:', data);
  } else {
    console.log('Report not found');
  }
  
  // Also check for similar reports
  console.log('\nChecking for recent reports...');
  const { data: recent, error: recentError } = await getSupabase()
    .from('analysis_reports')
    .select('id, created_at, repository_url, pr_number')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (recentError) {
    console.error('Error getting recent reports:', recentError);
  } else {
    console.log('Recent reports:', recent);
  }
  
  process.exit(0);
}

checkReport();