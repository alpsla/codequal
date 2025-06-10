#!/bin/bash

echo "🔍 Testing Basic Module Imports"
echo "=============================="
echo ""

cd "/Users/alpinro/Code Prjects/codequal"

# Create a simple test file
cat > test-imports.js << 'EOF'
console.log('Testing module imports...\n');

try {
    // Test core
    const core = require('./packages/core/dist/index.js');
    console.log('✅ Core module loaded');
    console.log('   Available exports:', Object.keys(core).slice(0, 5).join(', '), '...\n');
} catch (error) {
    console.error('❌ Core import failed:', error.message, '\n');
}

try {
    // Test agents
    const agents = require('./packages/agents/dist/index.js');
    console.log('✅ Agents module loaded');
    console.log('   Available exports:', Object.keys(agents).slice(0, 5).join(', '), '...\n');
    
    // Check for AgentFactory
    if (agents.AgentFactory) {
        console.log('✅ AgentFactory is available');
    } else {
        console.log('❌ AgentFactory not found in exports');
        console.log('   All exports:', Object.keys(agents));
    }
} catch (error) {
    console.error('❌ Agents import failed:', error.message, '\n');
}

try {
    // Test database
    const database = require('./packages/database/dist/index.js');
    console.log('✅ Database module loaded\n');
} catch (error) {
    console.error('❌ Database import failed:', error.message, '\n');
}

// Test Supabase connection
console.log('Testing Supabase connection...');
require('dotenv').config();

if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('✅ Supabase credentials found');
    console.log('   URL:', process.env.SUPABASE_URL.substring(0, 30) + '...');
} else {
    console.log('❌ Supabase credentials missing');
    console.log('   Make sure .env file exists with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
}
EOF

# Run the test
node test-imports.js

# Clean up
rm test-imports.js

echo ""
echo "If imports are failing, check:"
echo "1. Are the dist directories properly built?"
echo "2. Are there circular dependency issues?"
echo "3. Are environment variables loaded?"
