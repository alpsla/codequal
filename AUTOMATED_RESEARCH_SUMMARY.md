# Automated Research System - Summary

## Problem Solved

You correctly identified that scheduled research cannot run if it requires a user's JWT token. I've eliminated this requirement by implementing system-level authentication.

## Solution Architecture

### 1. System Authentication (`system-auth.ts`)
- Created a special `SYSTEM_USER` account for automated operations
- No JWT token required for scheduled runs
- System operations are logged differently for monitoring

### 2. Scheduled Research Runner (`scheduled-research-runner.ts`)
- Standalone runner that doesn't require web server or API
- Can be called directly by cron or systemd
- Uses system authentication internally

### 3. Deployment Options

#### Option A: Cron (Simple)
```bash
# Add to crontab
0 9 1 */3 * OPENROUTER_API_KEY=your-key /path/to/codequal/scripts/run-scheduled-research.sh
```

#### Option B: Systemd (Enterprise)
- Service file: `codequal-research.service`
- Timer file: `codequal-research.timer`
- Better logging and monitoring

## How It Works Now

1. **No User Token Required**: System runs as `SYSTEM_USER`
2. **Direct Execution**: Cron/systemd calls the script directly
3. **Automatic Schedule**: Runs quarterly (Jan 1, Apr 1, Jul 1, Oct 1 at 9 AM UTC)
4. **Self-Maintaining**: Discovers and evaluates new models automatically

## Running Manually (Testing)

```bash
# Immediate run without authentication
OPENROUTER_API_KEY=your-key npx tsx packages/agents/src/researcher/scheduled-research-runner.ts
```

## What Happens During Automated Run

1. System authenticates internally (no JWT needed)
2. Fetches latest models from OpenRouter
3. Evaluates with dynamic scoring (no hardcoded models)
4. Updates all 10 agent configurations
5. Stores in Vector DB
6. Logs results for monitoring

## Key Benefits

✅ **No Authentication Hassles**: Runs without user tokens
✅ **True Automation**: Set and forget for 3 months
✅ **Self-Updating**: Researcher can update its own model
✅ **Future-Proof**: Will discover GPT-5, Claude 5, etc. automatically
✅ **Monitored**: All runs are logged with timestamps

## Next Scheduled Run

The system will automatically calculate the next quarterly run based on the current date. For example:
- If today is July 20, 2025
- Next run: October 1, 2025 at 9:00 AM UTC
- Following run: January 1, 2026 at 9:00 AM UTC

The researcher will continue discovering and adopting better models as they become available, without any manual intervention!