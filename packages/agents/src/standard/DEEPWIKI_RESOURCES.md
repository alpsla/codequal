# DeepWiki Resources Location

All DeepWiki-related resources have been moved to the standard directory for easier access and preservation.

## Quick Access from Project Root

```bash
# Setup DeepWiki (convenience script)
./setup-deepwiki.sh
```

## Resource Locations

### Scripts
- **Main Setup Script**: `packages/agents/src/standard/scripts/deepwiki/setup-deepwiki-environment.sh`
  - Automated DeepWiki pod connection and setup
  - Creates helper scripts and environment files

### Documentation  
- **Quick Start Guide**: `packages/agents/src/standard/docs/deepwiki/DEEPWIKI_QUICK_START.md`
  - Comprehensive setup and usage guide
  - Troubleshooting steps
  - Common commands

- **README**: `packages/agents/src/standard/docs/deepwiki/README.md`
  - Directory structure overview
  - Quick access commands

### Tests
All test files are in: `packages/agents/src/standard/tests/integration/deepwiki/`

- `comparison-agent-real-flow.test.ts` - Direct comparison agent test with DeepWiki
- `orchestrator-real-flow.test.ts` - Full orchestrator flow test  
- `orchestrator-real-deepwiki-test.ts` - Orchestrator with real DeepWiki integration
- `test-comparison-direct.ts` - Simple direct comparison test

## Benefits of This Organization

✅ **All in one place** - No more searching across the codebase  
✅ **Under standard/** - Will be preserved when archiving old code  
✅ **Easy to find** - Clear directory structure  
✅ **Quick access** - Convenience script at project root  

## Usage

1. **First time setup**:
   ```bash
   ./setup-deepwiki.sh
   ```

2. **Run tests**:
   ```bash
   cd packages/agents
   USE_DEEPWIKI_MOCK=false npm test src/standard/tests/integration/deepwiki/
   ```

3. **View documentation**:
   ```bash
   cat packages/agents/src/standard/docs/deepwiki/DEEPWIKI_QUICK_START.md
   ```