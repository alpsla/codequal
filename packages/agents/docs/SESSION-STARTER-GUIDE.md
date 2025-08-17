# CodeQual Session Starter Guide

## Overview

The CodeQual Session Starter is an integrated environment setup tool that prepares your development environment and provides complete session context in under 2 minutes.

## Features

### 1. Automatic Environment Loading
- Uses the centralized environment loader (`src/standard/utils/env-loader.ts`)
- Automatically loads `.env` file from project root
- Validates all required environment variables

### 2. Quick Setup Integration
- Runs the quick setup script (`.claude/quick-setup.sh`) when needed
- Automatically detects and fixes service issues
- Provides context-aware quick commands

### 3. Service Health Monitoring
- DeepWiki pod status
- Port forwarding status (localhost:8001)
- Redis connection status
- Build status

### 4. Session Context
- Shows last session summary
- Git status tracking
- Active bugs count
- Current development phase
- Priority tasks

## Usage

### Start a Session

```bash
# Navigate to agents directory
cd packages/agents

# Start a new session
npm run session

# Alternative command
npm run session:start
```

### Quick Test Commands

The session starter integrates with the new test shortcuts:

```bash
# Test with a small PR (fast)
npm run test:pr:small

# Test with a large PR (comprehensive)
npm run test:pr:large

# Custom PR test
npm run test:pr -- https://github.com/owner/repo/pull/123
```

### Setup Commands

```bash
# Run complete setup (fixes all issues)
npm run setup

# Fix specific services
npm run setup:port-forward  # Fix port forwarding only
```

## Session Output

The session starter provides:

1. **Last Session**: Date and summary from previous session
2. **Git Status**: Clean or number of uncommitted files
3. **Services Status**: Health check for all required services
4. **Active Bugs**: Count from BUGS.md
5. **Current Phase**: From OPERATIONAL-PLAN.md
6. **Priority Task**: Next task to work on
7. **Quick Commands**: Context-aware commands based on service status
8. **Environment Status**: Shows which environment variables are configured

## Integration Points

### Environment Loader
- Location: `src/standard/utils/env-loader.ts`
- Loads from: Project root `.env` file
- Validates: All required DeepWiki, Redis, Supabase, and OpenRouter variables

### Quick Setup Script
- Location: `.claude/quick-setup.sh`
- Auto-runs when services are down
- Sets up: Environment, Redis, Port forwarding, Build

### Session State Manager
- Location: `src/standard/utils/session-state-manager.ts`
- Tracks: Features, bugs, tasks, confidence levels
- Updates: Production ready state test file

## Troubleshooting

### Service Issues

If any service shows as down:
1. Run `npm run setup` to fix all issues automatically
2. Or use specific fix commands shown in Quick Commands

### Environment Issues

If environment variables are missing:
1. Check `.env` file exists in project root
2. Run `npm run setup` to load environment
3. Verify variables with session starter output

### Port Forwarding Issues

If DeepWiki is not accessible:
```bash
# Kill existing port forwards
pkill -f "port-forward.*8001"

# Restart port forwarding
npm run setup:port-forward
```

## Best Practices

1. **Always start with session starter**: Run `npm run session` at the beginning of each development session
2. **Use quick test commands**: Leverage `test:pr:small` and `test:pr:large` for rapid testing
3. **Monitor service health**: Check the service status indicators before running tests
4. **Follow priority tasks**: Use the "Continue from" suggestion to stay on track
5. **Keep environment updated**: Run `npm run setup` if you encounter any service issues

## Architecture

```
codequal-session-starter.ts
    ├── env-loader.ts (Centralized environment loading)
    ├── session-state-manager.ts (State tracking)
    ├── quick-setup.sh (Automated setup)
    └── Service Health Checks
        ├── DeepWiki Pod Check
        ├── Port Forward Check
        ├── Redis Check
        └── Build Check
```

## Performance

The session starter completes all checks in under 2 minutes:
- Environment loading: ~1 second
- Service checks: ~5 seconds (parallel)
- Session info gathering: ~3 seconds (parallel)
- Quick setup (if needed): ~30 seconds

Total typical runtime: 10-40 seconds depending on setup needs