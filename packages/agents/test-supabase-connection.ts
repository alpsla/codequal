/**
 * Test Supabase Connection from Oracle
 * Diagnose why the connection is failing
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

async function main() {
  console.log("🔍 Supabase Connection Diagnostic\n");
  console.log("================================\n");

  // Check environment variables
  console.log("1. Checking Environment Variables:");
  console.log(`   SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅ Found' : '❌ Missing'}`);
  if (process.env.SUPABASE_URL) {
    console.log(`      Value: ${process.env.SUPABASE_URL.substring(0, 40)}...`);
  }
  console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Found' : '❌ Missing'}`);
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log(`      Value: ${process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 40)}...`);
  }
  console.log("");

  // Try to import and initialize Supabase
  console.log("2. Testing Supabase Client Initialization:");
  try {
  const { createClient } = require('@supabase/supabase-js');
  console.log("   ✅ @supabase/supabase-js imported successfully");
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log("   ❌ Missing required environment variables");
    process.exit(1);
  }
  
  console.log("   📡 Creating Supabase client...");
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
  console.log("   ✅ Supabase client created\n");
  
  // Test connection with a simple query
  console.log("3. Testing Database Connection:");
  console.log("   📡 Querying model_configurations table...");
  
  const startTime = Date.now();
  const { data, error } = await supabase
    .from('model_configurations')
    .select('id, role, primary_model')
    .limit(1);
  
  const elapsed = Date.now() - startTime;
  
  if (error) {
    console.log(`   ❌ Query failed (${elapsed}ms):`);
    console.log(`      Error: ${error.message}`);
    console.log(`      Code: ${error.code}`);
    console.log(`      Details: ${JSON.stringify(error.details)}`);
    console.log(`      Hint: ${error.hint}`);
  } else {
    console.log(`   ✅ Query successful (${elapsed}ms)`);
    console.log(`      Rows returned: ${data?.length || 0}`);
    if (data && data.length > 0) {
      console.log(`      Sample: ${JSON.stringify(data[0], null, 2)}`);
    }
  }
  
  console.log("");
  console.log("4. Testing Model Configuration Retrieval:");
  console.log("   📡 Getting config for codequality/java/medium...");
  
  const startTime2 = Date.now();
  const { data: modelData, error: modelError } = await supabase
    .from('model_configurations')
    .select('*')
    .eq('role', 'code_quality')
    .eq('language', 'java')
    .eq('size_category', 'medium')
    .single();
  
  const elapsed2 = Date.now() - startTime2;
  
  if (modelError) {
    console.log(`   ❌ Query failed (${elapsed2}ms):`);
    console.log(`      Error: ${modelError.message}`);
  } else {
    console.log(`   ✅ Query successful (${elapsed2}ms)`);
    console.log(`      Model: ${modelData?.primary_model}`);
  }
  
  console.log("");
  console.log("================================");
  console.log("✅ Supabase connection test complete!");
  
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
    console.log(`      Stack: ${error.stack}`);
    process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

