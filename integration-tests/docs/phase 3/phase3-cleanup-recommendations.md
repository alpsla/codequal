# Outdated Code to Archive - Phase 3 Testing Review

## Overview
After reviewing the codebase during Phase 3 testing implementation, I've identified several outdated files and directories that can be archived or cleaned up.

## 1. Empty Test Directories
These directories were created but never used:
- `/integration-tests/tests/phase2-agents/` (empty)
- `/integration-tests/tests/phase3-tools/` (empty)
- `/integration-tests/tests/phase4-flow/` (empty)
- `/integration-tests/tests/phase5-e2e/` (empty)
- `/integration-tests/results/` (empty)

**Recommendation**: Delete these empty directories.

## 2. Outdated MCP Agent Implementation
- `/packages/agents/src/mcp/mcp-agent.ts`
  - This is a mock/placeholder implementation
  - Superseded by the proper MCP Hybrid implementation in `/packages/mcp-hybrid/`
  - Uses outdated patterns and mock calls

**Recommendation**: Archive this file to `/packages/agents/archive/mcp-agent.ts`

## 3. Old Calibration Scripts
The directory `/packages/core/scripts/archived-scripts/` contains many outdated calibration scripts:
- Multiple versions of calibration scripts (comprehensive, enhanced, simple, etc.)
- Old debugging scripts
- Duplicate implementations

**Recommendation**: This directory is already archived, no action needed.

## 4. Already Archived Files
These files are already properly archived:
- `/packages/agents/archive/pr-agent.ts` - Old PR agent implementation
- `/archive/` directory - Contains old cleanup snapshots

**Status**: Already archived, no action needed.

## 5. Test Configuration
- `/integration-tests/test-config-updated.ts` - Check if this is still needed or if it's outdated

**Recommendation**: Review and potentially consolidate with main test configuration.

## Actions to Take

### 1. Delete Empty Directories
```bash
rm -rf /Users/alpinro/Code\ Prjects/codequal/integration-tests/tests/phase2-agents
rm -rf /Users/alpinro/Code\ Prjects/codequal/integration-tests/tests/phase3-tools
rm -rf /Users/alpinro/Code\ Prjects/codequal/integration-tests/tests/phase4-flow
rm -rf /Users/alpinro/Code\ Prjects/codequal/integration-tests/tests/phase5-e2e
rm -rf /Users/alpinro/Code\ Prjects/codequal/integration-tests/results
```

### 2. Archive Outdated MCP Agent
```bash
mv /Users/alpinro/Code\ Prjects/codequal/packages/agents/src/mcp/mcp-agent.ts \
   /Users/alpinro/Code\ Prjects/codequal/packages/agents/archive/mcp-agent.ts
```

### 3. Update Archive README
Add entry to `/packages/agents/archive/README.md` explaining:
- `mcp-agent.ts`: Mock implementation replaced by proper MCP Hybrid in `/packages/mcp-hybrid/`

## Current Code Status

### Active and Current
- `/packages/mcp-hybrid/` - Current MCP implementation
- `/integration-tests/tests/phase1-vectordb/` - Active tests
- `/integration-tests/tests/phase2-orchestrator/` - Active tests
- `/integration-tests/tests/phase3-agents/` - Active tests (including new ones)
- `/integration-tests/mocks/VectorContextService.ts` - Still needed for tests

### Already Archived
- `/packages/agents/archive/` - Contains old implementations
- `/packages/core/scripts/archived-scripts/` - Old calibration scripts
- `/archive/` - Old project snapshots

## Summary
The main cleanup needed is:
1. Delete 5 empty test directories
2. Archive the outdated `mcp-agent.ts` file
3. Keep all other code as it's either current or already properly archived

This will maintain a clean codebase while preserving historical implementations for reference.
