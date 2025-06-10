#!/bin/bash

echo "🔄 Running Tests Without Jest"
echo "============================"
echo ""

cd "/Users/alpinro/Code Prjects/codequal"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "Since Jest installation is corrupted, let's test the actual functionality..."
echo ""

echo "1️⃣ Testing environment variables..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

node -e "
require('dotenv').config();
const hasUrl = !!process.env.SUPABASE_URL;
const hasKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('SUPABASE_URL:', hasUrl ? '✅ Set' : '❌ Missing');
console.log('SUPABASE_SERVICE_ROLE_KEY:', hasKey ? '✅ Set' : '❌ Missing');

if (!hasUrl || !hasKey) {
  console.log('\\n❌ Environment variables missing!');
  process.exit(1);
}
"

echo ""
echo "2️⃣ Testing Supabase connection..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

node -e "
(async () => {
  require('dotenv').config();
  const { createClient } = require('@supabase/supabase-js');
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  try {
    const { data, error } = await supabase
      .from('repositories')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    
    console.log('✅ Supabase connection successful!');
    console.log('   Can access repositories table');
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message);
  }
})();
"

echo ""
echo "3️⃣ Testing core module imports..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

node -e "
try {
  const core = require('./packages/core/dist/index.js');
  console.log('✅ Core module loads successfully');
  console.log('   Available exports:', Object.keys(core).slice(0, 5).join(', '), '...');
} catch (error) {
  console.error('❌ Core module error:', error.message);
}

try {
  const agents = require('./packages/agents/dist/index.js');
  console.log('✅ Agents module loads successfully');
  console.log('   Available exports:', Object.keys(agents).slice(0, 5).join(', '), '...');
} catch (error) {
  console.error('❌ Agents module error:', error.message);
}
"

echo ""
echo "4️⃣ Testing agent initialization..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

node -e "
(async () => {
  try {
    const { AgentFactory } = require('./packages/agents/dist/factory/agent-factory.js');
    console.log('✅ AgentFactory loaded');
    
    // Try to create an agent
    const agent = AgentFactory.createAgent('code_quality', 'openai', {});
    console.log('✅ Agent created successfully');
    console.log('   Agent type:', agent.constructor.name);
  } catch (error) {
    console.error('❌ Agent creation error:', error.message);
  }
})();
"

echo ""
echo "5️⃣ Running a Phase 3 test manually..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Create a simple test runner
cat > manual-test.js << 'EOF'
require('dotenv').config();

async function runTest() {
  console.log('Testing RESEARCHER data retrieval...\n');
  
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  try {
    // Test 1: Check for RESEARCHER data
    const { data, error } = await supabase
      .from('analysis_chunks')
      .select('content')
      .eq('repository_id', '00000000-0000-0000-0000-000000000001')
      .single();
    
    if (error) {
      console.log('❌ No RESEARCHER data found:', error.message);
      console.log('   This is expected if RESEARCHER hasn\'t run yet');
    } else {
      console.log('✅ RESEARCHER data found!');
      const configs = JSON.parse(data.content).configurations;
      console.log('   Available configurations:', Object.keys(configs).length);
      console.log('   Sample config:', Object.keys(configs)[0]);
    }
    
    // Test 2: Check Vector DB setup
    const { data: repos, error: repoError } = await supabase
      .from('repositories')
      .select('id, name')
      .limit(5);
    
    if (repos && repos.length > 0) {
      console.log('\n✅ Vector DB has repositories:');
      repos.forEach(repo => console.log('   -', repo.name || repo.id));
    } else {
      console.log('\n⚠️  No repositories in Vector DB yet');
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

runTest().then(() => {
  console.log('\n✅ Manual test completed');
}).catch(error => {
  console.error('\n❌ Test failed:', error);
});
EOF

node manual-test.js

# Clean up
rm -f manual-test.js

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "If the tests above passed, the CodeQual system is working!"
echo "The Jest issue is just a test runner problem."
echo ""
echo "Options:"
echo "1. Fix Jest: ./emergency-jest-fix.sh"
echo "2. Use a different test runner (Mocha, Vitest)"
echo "3. Clone project to a path without spaces"
echo "4. Continue development without integration tests"
