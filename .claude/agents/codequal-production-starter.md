# CodeQual Production Starter Agent

## Trigger Phrases
- "start codequal production session"
- "continue codequal development"
- "setup production environment"
- "start real production ready test"

## Current System State (v1.0.0 - 2025-08-11)

### ✅ Working Features (90%+ confidence)
1. **DeepWiki Analysis** - Analyzes repositories for code issues
2. **AI Location Finder** - Finds exact line numbers for issues (needs API key export)
3. **V7 Report Generator** - Generates comprehensive analysis reports
4. **Comparison Agent** - Compares main vs PR branch issues

### 🚧 Partially Working
1. **ModelVersionSync** (30%) - Hardcoded models, no Supabase integration
2. **Report Line Numbers** (60%) - Found by AI but not displayed in report

### ❌ Not Implemented
1. Educational Agent integration
2. MCP tools parallel analysis
3. Monitoring dashboard
4. Supabase model configuration

## Environment Setup Sequence

### 1. Load Environment Variables
```bash
cd /Users/alpinro/Code\ Prjects/codequal
export OPENROUTER_API_KEY=$(grep OPENROUTER_API_KEY .env | cut -d'=' -f2)
```

### 2. Verify Redis Connection
```bash
# Check if Redis is accessible
redis-cli -u "$REDIS_URL" PING || echo "Redis not connected"
```

### 3. Setup DeepWiki Port Forwarding
```bash
# Check if port forwarding is active
lsof -i :8001 || kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001 &
```

### 4. Build Packages
```bash
cd packages/agents
npm run build
```

### 5. Run State Validation Test
```bash
npm test src/standard/tests/integration/production-ready-state-test.ts
```

## Quick Test Commands

### Test AI Location Finder
```bash
cd packages/agents
OPENROUTER_API_KEY=$(grep OPENROUTER_API_KEY ../../.env | cut -d'=' -f2) \
USE_DEEPWIKI_MOCK=false \
ENABLE_AI_LOCATION=true \
npx ts-node src/standard/scripts/run-complete-analysis.ts \
  --repo https://github.com/sindresorhus/ky --pr 500
```

### Test with Mock Data (No API needed)
```bash
cd packages/agents
USE_DEEPWIKI_MOCK=true \
npx ts-node src/standard/scripts/run-complete-analysis.ts \
  --repo https://github.com/sindresorhus/ky --pr 500
```

## Current Bugs to Fix

### BUG-001: ModelVersionSync Not Using Supabase (HIGH)
**Location:** `packages/agents/src/model-selection/model-version-sync.ts`
**Issue:** Hardcoded models instead of reading from Supabase
**Fix:** Query `model_configurations` table for language-specific models

### BUG-002: Line Numbers Missing in Report (MEDIUM)
**Location:** `packages/agents/src/standard/comparison/report-generator-v7-complete.ts`
**Issue:** Enhanced location data not passed to report template
**Fix:** Update issue formatting to include `line:column` from location data

### BUG-003: API Key Loading Issue (LOW)
**Location:** `packages/agents/src/standard/services/ai-location-finder.ts`
**Issue:** Environment variable not loaded at module initialization
**Fix:** Load dotenv before imports or pass API key explicitly

## Next Development Tasks

1. **Fix ModelVersionSync** - Connect to Supabase model_configurations table
2. **Display Line Numbers** - Update report generator to show location.line
3. **Integrate Educational Agent** - Add learning recommendations to report
4. **Add MCP Tools Analysis** - Run in parallel with DeepWiki
5. **Create Monitoring Dashboard** - Track analysis metrics

## Development Workflow

1. Run this at session start:
```bash
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents
npx ts-node -e "
import { startDevelopmentSession } from './src/standard/tests/integration/production-ready-state-test';
startDevelopmentSession();
"
```

2. This will show:
   - Current feature status
   - Active bugs
   - Environment status
   - Next tasks

3. Continue development from the displayed state

## Report Locations
- Reports saved to: `packages/agents/src/standard/reports/YYYY-MM-DD/`
- Latest report: `pr-500-report.md`

## Key Files
- Main script: `packages/agents/src/standard/scripts/run-complete-analysis.ts`
- AI Location Finder: `packages/agents/src/standard/services/ai-location-finder.ts`
- Report Generator: `packages/agents/src/standard/comparison/report-generator-v7-complete.ts`
- ModelVersionSync: `packages/agents/src/model-selection/model-version-sync.ts`

## Success Metrics
- All 15 issues should have locations found
- Report should complete in <60 seconds
- AI Location Finder should have 90%+ confidence
- No API errors when environment is properly set