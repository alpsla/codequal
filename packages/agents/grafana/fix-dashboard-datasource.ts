#!/usr/bin/env npx ts-node

/**
 * Script to verify and fix Grafana dashboard datasource connection
 * This updates the dashboard JSON to use direct datasource references
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
const envPath = path.resolve(__dirname, '../../../.env');
console.log('Loading environment from:', envPath);
dotenv.config({ path: envPath });

const DASHBOARD_PATH = path.join(__dirname, 'codequal-performance-dashboard.json');
const FIXED_DASHBOARD_PATH = path.join(__dirname, 'codequal-performance-dashboard-fixed.json');

async function verifySupabaseConnection() {
  console.log('\n📊 Verifying Supabase Connection...\n');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in environment');
    return false;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Test connection and count records
  const { data, error, count } = await supabase
    .from('agent_activity')
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.error('❌ Failed to connect to Supabase:', error.message);
    return false;
  }
  
  console.log(`✅ Connected to Supabase successfully`);
  console.log(`   Database: ${process.env.SUPABASE_DB_NAME || 'postgres'}`);
  console.log(`   Host: ${process.env.SUPABASE_DB_HOST}`);
  console.log(`   Port: ${process.env.SUPABASE_DB_PORT || '6543'}`);
  console.log(`   Records in agent_activity: ${count || 0}`);
  
  return true;
}

function fixDashboardDatasource() {
  console.log('\n🔧 Fixing Dashboard Datasource Configuration...\n');
  
  // Read the original dashboard
  const dashboardJson = fs.readFileSync(DASHBOARD_PATH, 'utf-8');
  const dashboard = JSON.parse(dashboardJson);
  
  // Remove the templating datasource variable - we'll use direct references
  if (dashboard.templating && dashboard.templating.list) {
    dashboard.templating.list = dashboard.templating.list.filter(
      (item: any) => item.name !== 'datasource'
    );
  }
  
  // Function to update datasource references
  function updateDatasource(obj: any): any {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    // If this object has a datasource property
    if ('datasource' in obj) {
      // Replace variable reference with direct datasource
      if (typeof obj.datasource === 'object' && obj.datasource.uid === '${datasource}') {
        obj.datasource = {
          type: 'postgres',
          uid: 'supabase-postgres'  // This will be the UID we tell user to use
        };
      }
    }
    
    // Recursively update nested objects
    for (const key in obj) {
      if (Array.isArray(obj[key])) {
        obj[key] = obj[key].map(updateDatasource);
      } else if (typeof obj[key] === 'object') {
        obj[key] = updateDatasource(obj[key]);
      }
    }
    
    return obj;
  }
  
  // Update all panels
  if (dashboard.panels) {
    dashboard.panels = dashboard.panels.map(updateDatasource);
  }
  
  // Save the fixed dashboard
  fs.writeFileSync(FIXED_DASHBOARD_PATH, JSON.stringify(dashboard, null, 2));
  console.log(`✅ Fixed dashboard saved to: ${FIXED_DASHBOARD_PATH}`);
  
  return dashboard;
}

function printGrafanaInstructions() {
  console.log('\n📝 Grafana Configuration Instructions:\n');
  console.log('1. First, configure your PostgreSQL datasource in Grafana:');
  console.log('   - Go to Configuration → Data Sources');
  console.log('   - Click "Add data source" and choose PostgreSQL');
  console.log('   - Use these connection details:\n');
  
  console.log('   Host:', process.env.SUPABASE_DB_HOST || 'aws-0-us-west-1.pooler.supabase.com');
  console.log('   Port:', process.env.SUPABASE_DB_PORT || '6543');
  console.log('   Database:', process.env.SUPABASE_DB_NAME || 'postgres');
  console.log('   User:', process.env.SUPABASE_DB_USER || 'postgres.ftjhmbbcuqjqmmbaymqb');
  console.log('   Password:', process.env.SUPABASE_DB_PASSWORD || '[Check your .env file]');
  console.log('   SSL Mode: require');
  console.log('   Version: 12.0+');
  console.log('   Name: Supabase (IMPORTANT: Use this exact name)\n');
  
  console.log('2. Click "Save & Test" to verify the connection\n');
  
  console.log('3. Import the fixed dashboard:');
  console.log('   - Go to Dashboards → Import');
  console.log('   - Upload the file: codequal-performance-dashboard-fixed.json');
  console.log('   - Select your "Supabase" datasource when prompted');
  console.log('   - Click Import\n');
  
  console.log('4. The dashboard should now show your data!\n');
}

async function testQuery() {
  console.log('\n🔍 Testing Direct SQL Query...\n');
  
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  // Test the exact query the dashboard would use
  const testQuery = `
    SELECT 
      timestamp as time,
      agent_role,
      success,
      duration_ms,
      cost
    FROM agent_activity
    WHERE timestamp >= ${Date.now() - 24 * 60 * 60 * 1000}
    ORDER BY timestamp DESC
    LIMIT 10
  `;
  
  const { data, error } = await supabase.rpc('query', { query_text: testQuery }).single();
  
  if (error) {
    // Try direct select instead
    const { data: directData, error: directError } = await supabase
      .from('agent_activity')
      .select('timestamp, agent_role, success, duration_ms, cost')
      .gte('timestamp', Date.now() - 24 * 60 * 60 * 1000)
      .order('timestamp', { ascending: false })
      .limit(10);
    
    if (directError) {
      console.error('❌ Query test failed:', directError.message);
    } else {
      console.log('✅ Direct query successful! Found', directData?.length || 0, 'recent records');
      if (directData && directData.length > 0) {
        console.log('\nSample record:');
        console.log(JSON.stringify(directData[0], null, 2));
      }
    }
  } else {
    console.log('✅ RPC query successful!');
  }
}

// Main execution
async function main() {
  console.log('='.repeat(60));
  console.log('   Grafana Dashboard Datasource Fix Tool');
  console.log('='.repeat(60));
  
  // Verify Supabase connection
  const connected = await verifySupabaseConnection();
  if (!connected) {
    console.error('\n⚠️  Fix your Supabase connection first!');
    process.exit(1);
  }
  
  // Test query
  await testQuery();
  
  // Fix the dashboard
  fixDashboardDatasource();
  
  // Print instructions
  printGrafanaInstructions();
  
  console.log('='.repeat(60));
  console.log('\n✨ Dashboard fix complete! Follow the instructions above.');
}

main().catch(console.error);