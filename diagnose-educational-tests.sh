#!/bin/bash

# Script to identify what's actually wrong by simplifying the tests
set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'
BOLD='\033[1m'

echo -e "${BLUE}${BOLD}🔍 Diagnosing Educational Agent Test Issues${NC}"
echo "=========================================="

cd packages/testing

# Check if the modules actually exist
echo -e "\n${YELLOW}1. Checking module paths...${NC}"

echo "Looking for @codequal/core/utils at:"
ls -la ../core/src/utils* 2>/dev/null || echo "  ❌ Not found at ../core/src/utils"
ls -la ../core/src/utils.ts 2>/dev/null || echo "  ❌ Not found at ../core/src/utils.ts"
ls -la ../core/src/utils/index.ts 2>/dev/null || echo "  ❌ Not found at ../core/src/utils/index.ts"

echo -e "\nLooking for actual utils location:"
find ../core -name "utils*" -type f 2>/dev/null | head -10

echo -e "\n${YELLOW}2. Creating a minimal test to verify setup...${NC}"
cat > src/integration/educational-agent/minimal-test.test.ts << 'EOF'
import { describe, it, expect } from '@jest/globals';

describe('Minimal Test', () => {
  it('should pass basic test', () => {
    expect(true).toBe(true);
  });
  
  it('should create mock objects', () => {
    const mockFn = jest.fn();
    mockFn.mockReturnValue(42);
    expect(mockFn()).toBe(42);
  });
  
  it('should handle promises', async () => {
    const mockAsync = jest.fn().mockResolvedValue({ data: 'test' });
    const result = await mockAsync();
    expect(result.data).toBe('test');
  });
});
EOF

echo -e "\n${BLUE}Running minimal test...${NC}"
npm test -- src/integration/educational-agent/minimal-test.test.ts --no-coverage

echo -e "\n${YELLOW}3. Checking Jest configuration...${NC}"
cat jest.config.js

echo -e "\n${GREEN}${BOLD}Diagnosis Summary:${NC}"
echo "1. Check if the minimal test passes - if not, Jest setup is broken"
echo "2. Check the module paths above to see where utils actually is"
echo "3. The moduleNameMapper in jest.config.js might need updating"
echo ""
echo "Based on the findings above, you may need to:"
echo "  • Update the import paths in the test files"
echo "  • Fix the jest.config.js moduleNameMapper"
echo "  • Build the packages first: cd ../.. && npm run build"
