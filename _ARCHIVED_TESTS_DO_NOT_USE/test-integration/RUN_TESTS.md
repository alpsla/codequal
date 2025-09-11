# How to Run Tests - Progressive Order

## ✅ Build Status: PASSING

All TypeScript build errors have been fixed. The system is ready for testing.

## Test Execution Order

### 1. Basic Monitoring Test (No API Keys Required)
```bash
cd packages/test-integration
npx ts-node src/tests/example-monitored-test.ts
```

### 2. DeepWiki Integration Test
```bash
npx ts-node src/e2e/test-deepwiki-trigger.ts
```

### 3. Tool Verification Test
```bash
npx ts-node src/e2e/simple-tool-verification.ts
```

### 4. Real Model Discovery (Requires OPENROUTER_API_KEY)
```bash
# Set API key first
export OPENROUTER_API_KEY=your_key

# Run discovery
npx ts-node src/e2e/discover-and-seed-real-models.ts
```

### 5. PR Analysis Tests (Requires Both Keys)
```bash
# Set both keys
export OPENROUTER_API_KEY=your_key
export GITHUB_TOKEN=your_token

# Basic scenarios
npx ts-node src/e2e/pr-basic-scenarios.ts

# Comprehensive scenarios
npx ts-node src/e2e/pr-comprehensive-scenarios.ts
```

### 6. Performance Benchmarking
```bash
npx ts-node src/e2e/test-performance-benchmarking.ts
```

## Test Reports Location
All test reports are saved to:
```
test-reports/
└── test-run-{timestamp}/
    ├── monitoring-report.md
    ├── monitoring-report.json
    └── summary.json
```

## Key Features Tested
- ✅ Monitoring infrastructure
- ✅ Token tracking and cost calculation
- ✅ Skill tracking and progression
- ✅ DeepWiki integration
- ✅ Real OpenRouter model discovery
- ✅ PR content analysis
- ✅ Multi-agent orchestration
- ✅ False positive detection (via precision metrics)