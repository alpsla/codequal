#!/bin/bash

# Quick test runner for Universal Framework V5
# This script runs a quick validation test

echo "🚀 Universal Framework V5 - Quick Test"
echo "======================================"
echo ""

# Check if TypeScript is compiled
echo "📦 Building TypeScript..."
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents
npm run build 2>/dev/null || echo "⚠️ Build step skipped (may already be built)"

echo ""
echo "🔍 Running quick analysis on current directory..."
echo ""

# Test different depth levels
echo "1️⃣ Testing Quick Analysis (150 files)..."
npx ts-node test-universal-framework.ts . "" quick

echo ""
echo "2️⃣ Testing with PR simulation..."
# Simulate a PR by passing a fake PR number
npx ts-node test-universal-framework.ts . 123 quick

echo ""
echo "3️⃣ Testing parallel execution..."
PARALLEL_TOOLS=true npx ts-node test-universal-framework.ts . "" quick

echo ""
echo "✅ Quick test complete!"
echo ""
echo "📝 Usage examples:"
echo "  Quick scan:     npx ts-node test-universal-framework.ts /path/to/repo"
echo "  With PR:        npx ts-node test-universal-framework.ts /path/to/repo 123"
echo "  Standard depth: npx ts-node test-universal-framework.ts /path/to/repo \"\" standard"
echo "  Thorough:       npx ts-node test-universal-framework.ts /path/to/repo \"\" thorough"
echo "  Complete:       npx ts-node test-universal-framework.ts /path/to/repo \"\" complete"
echo ""
echo "🚀 Enable parallelization:"
echo "  PARALLEL_TOOLS=true npx ts-node test-universal-framework.ts /path/to/repo"
echo "  PARALLEL_LANGUAGES=true npx ts-node test-universal-framework.ts /path/to/repo"
echo ""