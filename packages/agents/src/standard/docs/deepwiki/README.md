# DeepWiki Integration Resources

This directory contains all DeepWiki-related resources for the standard framework.

## Directory Structure

```
standard/
├── scripts/deepwiki/
│   └── setup-deepwiki-environment.sh    # Main setup script
├── docs/deepwiki/
│   ├── README.md                         # This file
│   └── DEEPWIKI_QUICK_START.md          # Quick start guide
└── tests/integration/deepwiki/
    ├── comparison-agent-real-flow.test.ts    # Direct comparison agent test
    ├── orchestrator-real-flow.test.ts        # Orchestrator flow test
    ├── orchestrator-real-deepwiki-test.ts    # Orchestrator with DeepWiki test
    └── test-comparison-direct.ts             # Simple direct test
```

## Quick Access

### From Project Root

```bash
# Setup DeepWiki environment (convenience script)
./setup-deepwiki.sh

# Run tests
cd packages/agents
npm test src/standard/tests/integration/deepwiki/orchestrator-real-flow.test.ts
```

### Direct Access

```bash
# Setup script
./packages/agents/src/standard/scripts/deepwiki/setup-deepwiki-environment.sh

# Documentation
cat ./packages/agents/src/standard/docs/deepwiki/DEEPWIKI_QUICK_START.md

# Tests
ls ./packages/agents/src/standard/tests/integration/deepwiki/
```

## Key Files

1. **setup-deepwiki-environment.sh**
   - Automated setup script for DeepWiki pod connection
   - Handles port forwarding, validation, and environment setup
   - Creates helper scripts for quick tasks

2. **DEEPWIKI_QUICK_START.md**
   - Comprehensive guide for using DeepWiki
   - Troubleshooting steps
   - Common commands reference

3. **Test Files**
   - `comparison-agent-real-flow.test.ts` - Tests comparison agent with DeepWiki data
   - `orchestrator-real-flow.test.ts` - Tests full orchestrator flow
   - `orchestrator-real-deepwiki-test.ts` - Tests orchestrator with real DeepWiki
   - `test-comparison-direct.ts` - Simple direct comparison test

## Usage Pattern

1. **First Time Setup**
   ```bash
   # From project root
   ./setup-deepwiki.sh
   source .env.deepwiki
   ```

2. **Subsequent Sessions**
   ```bash
   # Quick reconnect
   ./scripts/deepwiki-connect.sh
   ```

3. **Run Complete Analysis** (Recommended)
   ```bash
   cd packages/agents
   
   # With mock DeepWiki (fast)
   npm run analyze -- --repo https://github.com/vercel/swr --pr 2950 --mock
   
   # With real DeepWiki
   npm run analyze -- --repo https://github.com/vercel/swr --pr 2950
   ```

4. **Run Tests**
   ```bash
   cd packages/agents
   USE_DEEPWIKI_MOCK=false npm test src/standard/tests/integration/deepwiki/your-test.test.ts
   ```

## Benefits of This Structure

- ✅ All DeepWiki resources in one place under `standard/`
- ✅ Easy to find when working on standard framework
- ✅ Will be preserved when archiving old code
- ✅ Convenience script at root for quick access
- ✅ Clear separation of scripts, docs, and tests