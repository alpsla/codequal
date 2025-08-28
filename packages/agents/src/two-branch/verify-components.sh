#!/bin/bash

echo "======================================="
echo "  Verifying Two-Branch Analyzer Setup"
echo "======================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Checking Existing Components..."
echo ""

# Check ParallelToolExecutor
if [ -f "../../mcp-hybrid/src/integration/parallel-tool-executor.ts" ]; then
    echo -e "${GREEN}✅ ParallelToolExecutor exists${NC}"
else
    echo -e "${RED}❌ ParallelToolExecutor missing${NC}"
fi

# Check Tool Adapters
if [ -f "../../mcp-hybrid/src/adapters/mcp/semgrep-mcp.ts" ]; then
    echo -e "${GREEN}✅ SemgrepMCPAdapter exists${NC}"
else
    echo -e "${RED}❌ SemgrepMCPAdapter missing${NC}"
fi

if [ -f "../../mcp-hybrid/src/adapters/direct/eslint-direct.ts" ]; then
    echo -e "${GREEN}✅ ESLintDirectAdapter exists${NC}"
else
    echo -e "${RED}❌ ESLintDirectAdapter missing${NC}"
fi

if [ -f "../../mcp-hybrid/src/adapters/direct/sonarjs-direct.ts" ]; then
    echo -e "${GREEN}✅ SonarJSDirectAdapter exists${NC}"
else
    echo -e "${RED}❌ SonarJSDirectAdapter missing${NC}"
fi

# Check Infrastructure
if [ -f "../infrastructure/redis/RedisCache.ts" ]; then
    echo -e "${GREEN}✅ RedisCache infrastructure exists${NC}"
else
    echo -e "${YELLOW}⚠️  RedisCache infrastructure missing (will use memory)${NC}"
fi

if [ -f "../infrastructure/supabase/SupabaseClient.ts" ]; then
    echo -e "${GREEN}✅ SupabaseClient exists${NC}"
else
    echo -e "${YELLOW}⚠️  SupabaseClient missing${NC}"
fi

echo ""
echo "🔨 Components to Build:"
echo ""
echo -e "${YELLOW}Day 1:${NC}"
echo "  ❌ core/RepositoryManager.ts"
echo "  ❌ core/FileScanner.ts"
echo ""
echo -e "${YELLOW}Day 2:${NC}"
echo "  ❌ core/BranchAnalyzer.ts"
echo "  ❌ extractors/IssueExtractor.ts"
echo "  ❌ extractors/ToolResultParser.ts"
echo ""
echo -e "${YELLOW}Day 3:${NC}"
echo "  ❌ comparators/IssueComparator.ts"
echo "  ❌ comparators/FingerprintGenerator.ts"
echo ""
echo -e "${YELLOW}Day 4:${NC}"
echo "  ❌ core/TwoBranchAnalyzer.ts"
echo "  ❌ services/MetricsService.ts"
echo ""
echo -e "${YELLOW}Day 5:${NC}"
echo "  ❌ reporters/MarkdownReporter.ts"
echo "  ❌ reporters/JsonReporter.ts"

echo ""
echo "======================================="
echo ""
echo "📋 Summary:"
echo ""
echo "Most existing infrastructure is ready!"
echo "You can start implementing the new components."
echo ""
echo "Next steps:"
echo "1. cd packages/agents/src/two-branch"
echo "2. Start with core/RepositoryManager.ts"
echo "3. Follow IMPLEMENTATION_STATUS.md"