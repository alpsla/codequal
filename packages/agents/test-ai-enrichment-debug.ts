import dotenv from 'dotenv';
dotenv.config();

import { ModelConfigResolver } from './src/standard/orchestrator/model-config-resolver';

async function testAIEnrichment() {
  console.log('\n=== Testing AI Enrichment Setup ===\n');
  
  // Verify env vars are loaded
  console.log('Environment Check:');
  console.log('  SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Not set');
  console.log('  SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Not set');
  
  // Test 1: Can we create ModelConfigResolver?
  console.log('\nTest 1: Creating ModelConfigResolver...');
  try {
    const resolver = new ModelConfigResolver();
    console.log('  Result:', resolver ? '✅ Created' : '❌ Failed');
    console.log('  Type:', typeof resolver);
    console.log('  Is null?:', resolver === null);
    console.log('  Is undefined?:', resolver === undefined);
    console.log('  Truthy?:', !!resolver);
    console.log('  Falsy check (!resolver)?:', !resolver);
    
    // Test 2: Check if it has required methods
    console.log('\nTest 2: Checking methods...');
    console.log('  Has getModelConfiguration?:', typeof resolver.getModelConfiguration === 'function');
    
    // Test 3: Try to get a model configuration
    console.log('\nTest 3: Getting model configuration...');
    try {
      const config = await resolver.getModelConfiguration('security-analyst', 'java', 'medium');
      console.log('  Result:', config ? '✅ Got config' : '❌ No config');
      console.log('  Config object keys:', config ? Object.keys(config).join(', ') : 'N/A');
    } catch (error: any) {
      console.log('  ❌ Error:', error.message);
    }
  } catch (error: any) {
    console.log('  ❌ Constructor failed:', error.message);
  }
  
  console.log('\n=== Test Complete ===\n');
}

testAIEnrichment().catch(console.error);
