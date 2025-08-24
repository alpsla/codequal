#!/usr/bin/env npx ts-node

/**
 * Diagnostic script for Grafana-Supabase connection issues
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
const envPath = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: envPath });

const FIXED_DASHBOARD_PATH = path.join(__dirname, 'codequal-performance-dashboard-fixed.json');

async function diagnoseConnection() {
  console.log('='.repeat(60));
  console.log('   Grafana-Supabase Connection Diagnostics');
  console.log('='.repeat(60));
  
  // 1. Check Supabase data
  console.log('\n📊 Checking Supabase Data...\n');
  
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  // Get recent data with the exact time format Grafana expects
  const now = Date.now();
  const dayAgo = now - (24 * 60 * 60 * 1000);
  
  const { data: recentData, error: recentError } = await supabase
    .from('agent_activity')
    .select('*')
    .gte('timestamp', dayAgo)
    .order('timestamp', { ascending: false })
    .limit(5);
  
  if (recentError) {
    console.error('❌ Error fetching data:', recentError);
    return;
  }
  
  console.log(`✅ Found ${recentData?.length || 0} records in last 24 hours\n`);
  
  if (recentData && recentData.length > 0) {
    console.log('Sample records:');
    recentData.forEach((record, i) => {
      const date = new Date(Number(record.timestamp));
      console.log(`\n  Record ${i + 1}:`);
      console.log(`    Time: ${date.toISOString()} (${record.timestamp})`);
      console.log(`    Agent: ${record.agent_role}`);
      console.log(`    Model: ${record.model_used}`);
      console.log(`    Success: ${record.success}`);
      console.log(`    Cost: $${record.cost}`);
    });
  }
  
  // 2. Get unique values for dropdowns
  console.log('\n\n📋 Available Filter Values:\n');
  
  const { data: agents } = await supabase
    .from('agent_activity')
    .select('agent_role')
    .order('agent_role');
  
  const uniqueAgents = [...new Set(agents?.map(a => a.agent_role) || [])];
  console.log('Agents:', uniqueAgents.join(', '));
  
  const { data: models } = await supabase
    .from('agent_activity')
    .select('model_used')
    .order('model_used');
  
  const uniqueModels = [...new Set(models?.map(m => m.model_used) || [])];
  console.log('Models:', uniqueModels.join(', '));
  
  // 3. Check dashboard configuration
  console.log('\n\n🔍 Checking Dashboard Configuration...\n');
  
  if (fs.existsSync(FIXED_DASHBOARD_PATH)) {
    const dashboard = JSON.parse(fs.readFileSync(FIXED_DASHBOARD_PATH, 'utf-8'));
    
    // Check if datasource is properly configured
    let datasourceCount = 0;
    let variableRefs = 0;
    
    function checkDatasource(obj: any, path: string = ''): void {
      if (typeof obj !== 'object' || obj === null) return;
      
      if ('datasource' in obj) {
        datasourceCount++;
        if (typeof obj.datasource === 'object') {
          const uid = obj.datasource.uid || 'not set';
          if (uid.includes('$')) {
            variableRefs++;
            console.log(`⚠️  Variable reference found at ${path}: ${uid}`);
          }
        }
      }
      
      for (const key in obj) {
        if (Array.isArray(obj[key])) {
          obj[key].forEach((item: any, i: number) => 
            checkDatasource(item, `${path}.${key}[${i}]`)
          );
        } else if (typeof obj[key] === 'object') {
          checkDatasource(obj[key], `${path}.${key}`);
        }
      }
    }
    
    checkDatasource(dashboard, 'dashboard');
    console.log(`\nTotal datasource references: ${datasourceCount}`);
    console.log(`Variable references remaining: ${variableRefs}`);
    
    if (variableRefs > 0) {
      console.log('\n❌ Dashboard still has variable references!');
      console.log('   The fix may not have been applied correctly.');
    } else {
      console.log('\n✅ Dashboard has no variable references');
    }
  }
  
  // 4. Generate test query for Grafana
  console.log('\n\n📝 Test Queries for Grafana SQL Editor:\n');
  console.log('Copy and paste these into Grafana query editor to test:\n');
  
  console.log('-- Query 1: Basic count');
  console.log(`SELECT COUNT(*) as count FROM agent_activity WHERE timestamp >= ${dayAgo};`);
  
  console.log('\n-- Query 2: Time series data (for graphs)');
  console.log(`SELECT 
  to_timestamp(timestamp/1000) AS time,
  agent_role,
  COUNT(*) as count
FROM agent_activity
WHERE timestamp >= ${dayAgo}
GROUP BY time, agent_role
ORDER BY time;`);
  
  console.log('\n-- Query 3: Operations by agent (for bar chart)');
  console.log(`SELECT
  agent_role,
  COUNT(*) as total_ops,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_ops
FROM agent_activity  
WHERE timestamp >= ${dayAgo}
GROUP BY agent_role;`);
  
  // 5. Instructions
  console.log('\n\n🔧 Troubleshooting Steps:\n');
  console.log('1. In Grafana, click on any panel and select "Edit"');
  console.log('2. In the query editor, check the datasource dropdown at the top');
  console.log('3. Make sure "Supabase" is selected (not "default" or anything else)');
  console.log('4. Try running one of the test queries above');
  console.log('5. If queries work but panels don\'t, the issue is with panel configuration');
  console.log('\n6. Alternative: Use Settings (gear icon) → Variables');
  console.log('   - Check if there are any datasource variables');
  console.log('   - Make sure they point to your Supabase connection');
  
  console.log('\n' + '='.repeat(60));
}

diagnoseConnection().catch(console.error);