#!/bin/bash

echo "🔧 Fixing Integration Test Setup"
echo "==============================="
echo ""

cd "/Users/alpinro/Code Prjects/codequal"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "1️⃣ Updating Jest configuration to handle environment..."

# Create a new Jest setup file that loads env vars
cat > jest.setup.integration.js << 'EOF'
// Load environment variables from root .env file
const path = require('path');
const dotenv = require('dotenv');

// Load from root .env
const envPath = path.join(__dirname, '.env');
console.log('Loading environment from:', envPath);

const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('Error loading .env:', result.error);
} else {
  console.log('Environment loaded successfully');
  console.log('SUPABASE_URL exists:', !!process.env.SUPABASE_URL);
  console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// Set test environment
process.env.NODE_ENV = 'test';

// Mock console.error for cleaner test output
const originalError = console.error;
console.error = (...args) => {
  if (
    args[0]?.includes('[ERROR]') ||
    args[0]?.includes('AUTH_FAILURE') ||
    args[0]?.includes('API error')
  ) {
    return;
  }
  originalError.call(console, ...args);
};

// Set test timeout
jest.setTimeout(30000);
EOF

echo -e "${GREEN}✅ Created jest.setup.integration.js${NC}"

echo ""
echo "2️⃣ Creating updated Jest configuration..."

# Create an updated Jest config that uses the setup file
cat > jest.config.integration-fixed.js << 'EOF'
const path = require('path');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.integration.js'],
  moduleNameMapper: {
    // Map to the built dist files
    '^@codequal/core$': '<rootDir>/packages/core/dist/index.js',
    '^@codequal/core/(.*)$': '<rootDir>/packages/core/dist/$1',
    '^@codequal/agents$': '<rootDir>/packages/agents/dist/index.js',
    '^@codequal/agents/(.*)$': '<rootDir>/packages/agents/dist/$1',
    '^@codequal/database$': '<rootDir>/packages/database/dist/index.js',
    '^@codequal/database/(.*)$': '<rootDir>/packages/database/dist/$1',
    '^@codequal/mcp-hybrid$': '<rootDir>/packages/mcp-hybrid/dist/index.js',
    '^@codequal/mcp-hybrid/(.*)$': '<rootDir>/packages/mcp-hybrid/dist/$1'
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/.turbo/',
    '/archive/'
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        allowJs: true,
        esModuleInterop: true,
        skipLibCheck: true
      }
    }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@codequal)/)'
  ],
  rootDir: path.resolve(__dirname),
  roots: ['<rootDir>/integration-tests']
};
EOF

echo -e "${GREEN}✅ Created jest.config.integration-fixed.js${NC}"

echo ""
echo "3️⃣ Running minimal test with fixed configuration..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

npx jest integration-tests/tests/phase3-agents/minimal-test.test.ts \
  --config jest.config.integration-fixed.js \
  --verbose \
  --no-coverage \
  --runInBand

echo ""
echo "4️⃣ If successful, run all Phase 3 tests with:"
echo "   npx jest integration-tests/tests/phase3-agents --config jest.config.integration-fixed.js"
