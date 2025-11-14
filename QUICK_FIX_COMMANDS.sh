#!/bin/bash
# Quick Fix Commands - Run on Oracle Cloud
# Purpose: Verify and deploy TypeScript fixes

echo "🔧 CodeQual Fix Deployment - Quick Commands"
echo "============================================"
echo ""

# One-liner to verify everything and run test
cd ~/codequal && \
echo "📍 Current directory: $(pwd)" && \
echo "🌿 Current branch: $(git branch --show-current)" && \
echo "" && \
echo "📦 Recent commits:" && \
git log --oneline -3 && \
echo "" && \
echo "✅ Running verification..." && \
./verify-deployment-and-fix.sh && \
echo "" && \
echo "🧪 Starting test..." && \
cd packages/agents && \
npx ts-node tests/integration/test-v9-lite-e2e.ts

# If above fails with branch error, run these separately:
#
# git fetch origin
# git checkout claude/fix-typescript-test-issues-016Q2HdfW7RnCwvagzPYS81L
# git pull origin claude/fix-typescript-test-issues-016Q2HdfW7RnCwvagzPYS81L
# ./verify-deployment-and-fix.sh
# cd packages/agents && npx ts-node tests/integration/test-v9-lite-e2e.ts
