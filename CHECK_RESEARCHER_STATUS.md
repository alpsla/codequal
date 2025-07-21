# Researcher Status Check

## Current Status (July 20, 2025)

### ❌ New Researcher Has NOT Been Run Yet

**Current Model in Use:**
- Model: `nousresearch/nous-hermes-2-mixtral-8x7b-dpo`
- Quality: 6.5/10
- Last Updated: June 27, 2025
- Status: **OUTDATED** - Using old hardcoded selection

**Expected After Running New Researcher:**
- Model: `google/gemini-2.5-flash` or similar
- Quality: 8.3+/10
- Dynamic selection (no hardcoded models)

## Schedule Updates Made ✅

Changed from 9 AM UTC to **0 AM ET (5 AM UTC)**:
- Next scheduled run: October 1, 2025 at 0:00 AM ET
- Following run: January 1, 2026 at 0:00 AM ET

## How to Run the New Researcher Now

### Option 1: Using Authentication (Requires fresh JWT)
```bash
# 1. Get fresh JWT token from browser
# 2. Run:
curl -X POST http://localhost:3001/api/researcher/research \
  -H 'Authorization: Bearer YOUR_FRESH_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"trigger": "manual", "reason": "Initial setup of dynamic system"}'
```

### Option 2: Using System Runner (No Auth Required)
```bash
cd /Users/alpinro/Code\ Prjects/codequal
OPENROUTER_API_KEY=your-key npx tsx packages/agents/src/researcher/scheduled-research-runner.ts
```

## What Will Happen When You Run It

1. **Immediate Changes:**
   - Fetch 319+ models from OpenRouter
   - Evaluate with dynamic scoring (no hardcoded names)
   - Update from Mixtral 6.5 → Gemini 2.5 Flash 8.3+
   - All 10 agent roles get new models

2. **Future Benefits:**
   - Automatic quarterly updates at 0 AM ET
   - No authentication required for scheduled runs
   - Self-discovers new models (GPT-5, Claude 5, etc.)

## Current Configuration Files

- Cron: `0 5 1 */3 *` (0 AM ET on 1st of Jan/Apr/Jul/Oct)
- System Auth: Implemented in `system-auth.ts`
- Runner: `scheduled-research-runner.ts`
- Shell Script: `run-scheduled-research.sh`

**STATUS: Ready to run, but needs initial execution to switch to new system!**