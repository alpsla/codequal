#!/bin/bash

echo "🧪 Running Tests from Integration Tests Directory"
echo "=============================================="
echo ""

# First, go to integration-tests directory
cd "/Users/alpinro/Code Prjects/codequal/integration-tests"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "1️⃣ Current directory: $(pwd)"
echo ""

# Check if node_modules exists here
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✅ Local node_modules exists${NC}"
else
    echo -e "${YELLOW}⚠️  No local node_modules, installing...${NC}"
    npm install
fi

# Check for .env
if [ -f ".env" ]; then
    echo -e "${GREEN}✅ Local .env exists${NC}"
else
    echo -e "${YELLOW}⚠️  No local .env, copying from parent...${NC}"
    if [ -f "../.env" ]; then
        cp ../.env .
        echo "   Copied parent .env"
    elif [ -f ".env.example" ]; then
        echo "   ❌ No parent .env found. Copy .env.example to .env and fill in values"
    fi
fi

echo ""
echo "2️⃣ Running minimal test from integration-tests directory..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Create a simple test that doesn't depend on parent packages
cat > tests/simple-env-test.test.ts << 'EOF'
import * as dotenv from 'dotenv';
import path from 'path';

// Load env from parent directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

describe('Environment Test', () => {
  it('should load environment variables', () => {
    console.log('CWD:', process.cwd());
    console.log('__dirname:', __dirname);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    
    const hasUrl = !!process.env.SUPABASE_URL;
    const hasKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('SUPABASE_URL exists:', hasUrl);
    console.log('SUPABASE_SERVICE_ROLE_KEY exists:', hasKey);
    
    expect(hasUrl).toBe(true);
    expect(hasKey).toBe(true);
  });
  
  it('should connect to Supabase', async () => {
    const { createClient } = await import('@supabase/supabase-js');
    
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    const supabase = createClient(url, key);
    
    const { error } = await supabase
      .from('repositories')
      .select('count')
      .limit(1)
      .single();
    
    if (error) {
      console.error('Supabase error:', error);
    }
    
    expect(error).toBeFalsy();
  });
});
EOF

# Run the test
npm test tests/simple-env-test.test.ts

echo ""
echo "3️⃣ If that worked, trying phase3 test..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Update the import paths in a phase3 test to use absolute paths
cat > tests/phase3-agents/fixed-minimal.test.ts << 'EOF'
import * as dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load env from parent directory
dotenv.config({ path: path.join(__dirname, '../../../.env') });

describe('Fixed Minimal Integration Test', () => {
  beforeAll(() => {
    console.log('Test environment setup');
    console.log('SUPABASE_URL exists:', !!process.env.SUPABASE_URL);
    console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  });

  it('should have environment variables', () => {
    expect(process.env.SUPABASE_URL).toBeDefined();
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBeDefined();
  });

  it('should connect to Supabase', async () => {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase
      .from('repositories')
      .select('id')
      .limit(1);
    
    expect(error).toBeNull();
    console.log('Supabase connection successful, found', data?.length || 0, 'repositories');
  });
});
EOF

npm test tests/phase3-agents/fixed-minimal.test.ts

# Clean up
rm -f tests/simple-env-test.test.ts
rm -f tests/phase3-agents/fixed-minimal.test.ts

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Summary:"
echo "- Integration tests have their own package.json"
echo "- They need to load .env from parent directory"
echo "- Import paths need to be adjusted"
