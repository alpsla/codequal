#!/bin/bash

echo "🔍 Jest Environment Diagnostic"
echo "============================"
echo ""

cd "/Users/alpinro/Code Prjects/codequal"

# Create a diagnostic test
cat > test-diagnostic.js << 'EOF'
console.log('=== Jest Environment Diagnostic ===\n');

console.log('1. Current Working Directory:', process.cwd());
console.log('2. Script Location:', __filename);
console.log('3. NODE_ENV:', process.env.NODE_ENV);
console.log('4. Command:', process.argv.join(' '));

console.log('\n5. Checking for .env files:');
const fs = require('fs');
const path = require('path');

const locations = [
  '.env',
  'integration-tests/.env',
  '../.env'
];

locations.forEach(loc => {
  const fullPath = path.resolve(loc);
  const exists = fs.existsSync(fullPath);
  console.log(`   ${loc}: ${exists ? '✅ exists' : '❌ not found'} (${fullPath})`);
});

console.log('\n6. Loading dotenv from root:');
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('   SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ loaded' : '❌ missing');
console.log('   SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ loaded' : '❌ missing');

console.log('\n7. Checking Jest globals:');
console.log('   global.expect:', typeof global.expect);
console.log('   global.test:', typeof global.test);
console.log('   global.describe:', typeof global.describe);

console.log('\n8. Module resolution test:');
try {
  require('./packages/core/dist/index.js');
  console.log('   @codequal/core: ✅ loads');
} catch (e) {
  console.log('   @codequal/core: ❌', e.message);
}

console.log('\n=== End Diagnostic ===');
EOF

echo "Running diagnostic with Node..."
node test-diagnostic.js

echo ""
echo "Running diagnostic with Jest..."
npx jest test-diagnostic.js --no-coverage 2>&1 || true

rm -f test-diagnostic.js

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Based on the output, we can see:"
echo "1. Where Jest is running from"
echo "2. If environment variables are loading"
echo "3. If module resolution is working"
