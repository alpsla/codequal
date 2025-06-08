#!/bin/bash

# Diagnose TypeScript strict mode errors in MCP Hybrid

cd /Users/alpinro/Code\ Prjects/codequal/packages/mcp-hybrid

echo "🔍 Diagnosing TypeScript strict mode errors..."
echo "=============================================="

# Run TypeScript with strict settings (like CI does)
echo -e "\nRunning tsc with --skipLibCheck false (CI mode)..."
npx tsc --noEmit --skipLibCheck false 2>&1 | head -100 > ts-errors.log

# Show first few errors for analysis
echo -e "\nFirst 20 TypeScript errors:"
head -20 ts-errors.log

# Count errors by type
echo -e "\n📊 Error summary:"
grep "error TS" ts-errors.log | cut -d: -f4 | sort | uniq -c | sort -nr | head -10

# Check specific problem files
echo -e "\n🔍 Checking specific problem areas..."

# Check if @codequal/core types are properly imported
echo -e "\nChecking @codequal/core imports..."
grep -n "from '@codequal/core'" src/integration/*.ts

# Check for missing return types
echo -e "\nChecking for missing return types in problem files..."
grep -n "async.*{$" src/adapters/mcp/eslint-mcp.ts | head -5

echo -e "\n💡 Full error log saved to: ts-errors.log"
echo -e "\nCommon fixes needed:"
echo "1. Add missing return type annotations"
echo "2. Import types properly from @codequal/core"
echo "3. Fix any interface mismatches"
echo "4. Add explicit types instead of implicit any"
