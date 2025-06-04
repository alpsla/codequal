# RESEARCHER Agent Validation Plan
**Created**: June 3, 2025  
**Purpose**: Step-by-step validation of all RESEARCHER agent functionality

## 🎯 Testing Overview

This plan validates:
1. Vector DB repository creation and access
2. RESEARCHER agent initialization
3. Cache system functionality
4. Model research and discovery
5. Configuration storage and retrieval
6. Self-evaluation (meta-research)
7. Upgrade mechanism
8. Cache invalidation and synchronization

---

## 📋 Pre-Test Checklist

### Required Components
- [ ] Supabase project accessible
- [ ] Vector DB repository created (UUID: `00000000-0000-0000-0000-000000000001`)
- [ ] Authentication system functional
- [ ] Required packages built
- [ ] Environment variables configured

### Test User Setup
```typescript
const testUser: AuthenticatedUser = {
  id: 'test-user-123',
  email: 'test@codequal.ai',
  name: 'Test User',
  role: 'admin',
  permissions: {
    repositories: {
      '00000000-0000-0000-0000-000000000001': {
        read: true,
        write: true,
        admin: true
      }
    }
  },
  organizationId: 'test-org',
  session: {
    token: 'test-token',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    fingerprint: 'test-fingerprint',
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent'
  }
};
```

---

## 🧪 Test Phase 1: Basic Infrastructure

### Test 1.1: Verify Vector DB Repository
**Objective**: Confirm special repository exists and is accessible

```sql
-- Run in Supabase SQL Editor
SELECT 
    id,
    name,
    created_at,
    (SELECT COUNT(*) FROM analysis_chunks WHERE repository_id = r.id) as chunk_count
FROM repositories r
WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;
```

**Expected Result**:
- Repository exists with name "CodeQual Researcher Configurations"
- Initial chunk_count = 0

### Test 1.2: Create Test Script Infrastructure
**File**: `test-researcher-basic.js`

```javascript
#!/usr/bin/env node

const path = require('path');

// Test 1: Can we load the RESEARCHER modules?
console.log('🧪 Test 1.2: Loading RESEARCHER modules...');

try {
  const { ResearcherAgent } = require('../packages/agents/dist/researcher/researcher-agent');
  const { ResearcherService } = require('../packages/agents/dist/researcher/researcher-service');
  const { VectorContextService } = require('../packages/agents/dist/multi-agent/vector-context-service');
  const { loadResearcherConfigFromVectorDB } = require('../packages/agents/dist/researcher/load-researcher-config');
  
  console.log('✅ All modules loaded successfully');
} catch (error) {
  console.error('❌ Module loading failed:', error.message);
  process.exit(1);
}
```

---

## 🧪 Test Phase 2: RESEARCHER Agent Initialization

### Test 2.1: Basic Agent Creation
**Objective**: Create RESEARCHER agent with default configuration

```javascript
// Test 2.1: Create RESEARCHER agent
console.log('\n🧪 Test 2.1: Creating RESEARCHER agent...');

const agent = new ResearcherAgent(testUser, {
  researchDepth: 'quick',
  providers: ['openai', 'google'],
  prioritizeCost: true
});

console.log('✅ Agent created');
console.log('📊 Initial cache stats:', agent.getCacheStats());
```

**Expected Result**:
- Agent created successfully
- Cache stats show: `model: 'google/gemini-2.5-flash'`
- `isActive: true`, `requestCount: 0`

### Test 2.2: Vector DB Initialization
**Objective**: Test loading configuration from Vector DB (should be empty initially)

```javascript
// Test 2.2: Try to initialize from Vector DB
console.log('\n🧪 Test 2.2: Initializing from Vector DB...');

const initialized = await agent.initializeFromVectorDB();
console.log(`📊 Initialization result: ${initialized}`);
console.log('📊 Cache stats after init:', agent.getCacheStats());
```

**Expected Result**:
- `initialized: false` (no stored config yet)
- Cache remains with default model

---

## 🧪 Test Phase 3: Cache System Validation

### Test 3.1: Cache Usage for Context Requests
**Objective**: Verify token savings through caching

```javascript
// Test 3.1: Use cached researcher for context
console.log('\n🧪 Test 3.1: Testing cache usage...');

const contextResult = await agent.useResearcherForContext(
  'typescript',
  'medium',
  'security',
  ['express', 'react'],
  2.0
);

console.log('📊 Context request result:');
console.log(`  Template reused: ${contextResult.templateReused}`);
console.log(`  Tokens used: ${contextResult.tokensUsed}`);
console.log(`  Prompt length: ${contextResult.prompt.length}`);

// Check cache stats after usage
const stats = agent.getCacheStats();
console.log('📊 Cache stats after usage:');
console.log(`  Request count: ${stats.requestCount}`);
console.log(`  Tokens saved: ${stats.tokensSaved}`);
```

**Expected Result**:
- `templateReused: true`
- `tokensUsed: ~200-300` (context only)
- `requestCount: 1`
- `tokensSaved: 1301`

### Test 3.2: Multiple Cache Requests
**Objective**: Verify token savings accumulate

```javascript
// Test 3.2: Multiple cache requests
console.log('\n🧪 Test 3.2: Multiple cache requests...');

for (let i = 0; i < 5; i++) {
  await agent.useResearcherForContext(
    'python',
    'large',
    'performance',
    ['django', 'fastapi'],
    3.0
  );
}

const multiStats = agent.getCacheStats();
console.log('📊 After 5 more requests:');
console.log(`  Total requests: ${multiStats.requestCount}`);
console.log(`  Total tokens saved: ${multiStats.tokensSaved}`);
```

**Expected Result**:
- `requestCount: 6`
- `tokensSaved: 7806` (6 * 1301)

---

## 🧪 Test Phase 4: Research and Configuration Storage

### Test 4.1: Conduct Research (Mock Mode)
**Objective**: Test research execution and result structure

```javascript
// Test 4.1: Conduct research
console.log('\n🧪 Test 4.1: Conducting research...');

const researchResult = await agent.conductResearchAndUpdate();

console.log('📊 Research summary:');
console.log(`  Models researched: ${researchResult.summary.modelsResearched}`);
console.log(`  Configurations updated: ${researchResult.summary.configurationsUpdated}`);
console.log(`  Cost savings: ${researchResult.summary.totalCostSavings}%`);
```

### Test 4.2: Store Research Results
**Objective**: Verify configurations stored in Vector DB

```javascript
// Test 4.2: Store results via service
console.log('\n🧪 Test 4.2: Storing research results...');

const service = new ResearcherService(testUser, vectorContextService);
const operation = await service.triggerResearch({
  researchDepth: 'quick',
  providers: ['google', 'openai']
});

console.log('📊 Operation started:', operation);

// Wait for completion (mock should be quick)
await new Promise(resolve => setTimeout(resolve, 2000));

const status = await service.getOperationStatus(operation.operationId);
console.log('📊 Operation status:', status);
```

### Test 4.3: Verify Vector DB Storage
**Objective**: Confirm configurations stored correctly

```sql
-- Check stored configurations
SELECT 
    ac.id,
    ac.created_at,
    ac.metadata->>'analysis_type' as type,
    jsonb_array_length(ac.metadata->'categories') as category_count,
    substring(ac.content, 1, 100) as content_preview
FROM analysis_chunks ac
WHERE repository_id = '00000000-0000-0000-0000-000000000001'::uuid
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🧪 Test Phase 5: Configuration Retrieval

### Test 5.1: Load Stored Configuration
**Objective**: Retrieve researcher configuration from Vector DB

```javascript
// Test 5.1: Load configuration
console.log('\n🧪 Test 5.1: Loading stored configuration...');

const { loadResearcherConfigFromVectorDB } = require('../packages/agents/dist/researcher/load-researcher-config');

const storedConfig = await loadResearcherConfigFromVectorDB(
  testUser,
  vectorContextService,
  console
);

console.log('📊 Loaded configuration:', storedConfig);
```

### Test 5.2: Apply Retrieved Configuration
**Objective**: Update system with loaded configuration

```javascript
// Test 5.2: Apply configuration
console.log('\n🧪 Test 5.2: Applying configuration...');

if (storedConfig) {
  const { applyResearcherConfiguration } = require('../packages/agents/dist/researcher/load-researcher-config');
  const { ModelVersionSync } = require('../packages/core/dist/services/model-selection/ModelVersionSync');
  
  const modelSync = new ModelVersionSync(console);
  const applied = applyResearcherConfiguration(storedConfig, modelSync, console);
  
  console.log(`📊 Configuration applied: ${applied}`);
}
```

---

## 🧪 Test Phase 6: Meta-Research Testing

### Test 6.1: Conduct Meta-Research
**Objective**: Test self-evaluation functionality

```javascript
// Test 6.1: Meta-research
console.log('\n🧪 Test 6.1: Conducting meta-research...');

const metaResult = await agent.conductMetaResearch();

console.log('📊 Meta-research result:');
console.log(`  Current model score: ${metaResult.currentModel.researchScore}`);
console.log(`  Should upgrade: ${metaResult.recommendation.shouldUpgrade}`);
console.log(`  Urgency: ${metaResult.upgradeRecommendation.urgency}`);
console.log(`  Confidence: ${metaResult.confidence}`);

if (metaResult.recommendation.primary) {
  console.log(`  Recommended: ${metaResult.recommendation.primary.provider}/${metaResult.recommendation.primary.model}`);
}
```

### Test 6.2: Process Meta-Research Results
**Objective**: Test upgrade decision logic

```javascript
// Test 6.2: Process results
console.log('\n🧪 Test 6.2: Processing meta-research results...');

const upgraded = await agent.processMetaResearchResults(metaResult);
console.log(`📊 Auto-upgrade triggered: ${upgraded}`);
```

---

## 🧪 Test Phase 7: Upgrade Mechanism

### Test 7.1: Manual Researcher Upgrade
**Objective**: Test explicit upgrade process

```javascript
// Test 7.1: Manual upgrade
console.log('\n🧪 Test 7.1: Testing manual upgrade...');

const upgradeResult = await agent.upgradeResearcher(
  'anthropic',
  'claude-3-5-sonnet',
  'claude-3-5-sonnet-20250603',
  'Testing upgrade mechanism',
  {
    codeQuality: 9.0,
    speed: 8.0,
    contextWindow: 200000,
    reasoning: 9.5,
    detailLevel: 9.0
  },
  { input: 3.0, output: 15.0 },
  'premium'
);

console.log('📊 Upgrade result:', upgradeResult);
console.log('📊 Cache stats after upgrade:', agent.getCacheStats());
```

**Expected Result**:
- `success: true`
- `requiresRecaching: true`
- Cache shows `isActive: false`

### Test 7.2: Cache Synchronization After Upgrade
**Objective**: Verify cache rebuilds with new model

```javascript
// Test 7.2: Use researcher after upgrade
console.log('\n🧪 Test 7.2: Testing cache sync after upgrade...');

const postUpgradeResult = await agent.useResearcherForContext(
  'java',
  'small',
  'architecture',
  ['spring'],
  1.5
);

console.log('📊 Post-upgrade cache stats:', agent.getCacheStats());
```

**Expected Result**:
- Cache rebuilt with new model
- New session ID and template ID
- `requestCount` reset to 1

---

## 🧪 Test Phase 8: End-to-End Flow

### Test 8.1: Complete Lifecycle Test
**Objective**: Test full flow from initialization to upgrade

```javascript
// Test 8.1: Complete lifecycle
console.log('\n🧪 Test 8.1: Complete lifecycle test...');

// 1. Create new agent
const lifecycleAgent = new ResearcherAgent(testUser);

// 2. Initialize from Vector DB
await lifecycleAgent.initializeFromVectorDB();

// 3. Conduct research
const research = await lifecycleAgent.conductResearchAndUpdate();

// 4. Use cache multiple times
for (let i = 0; i < 3; i++) {
  await lifecycleAgent.useResearcherForContext('go', 'medium', 'dependency', ['gin'], 2.0);
}

// 5. Meta-research
const meta = await lifecycleAgent.conductMetaResearch();

// 6. Check final state
console.log('📊 Final lifecycle stats:', lifecycleAgent.getCacheStats());
```

---

## 📊 Validation Criteria

### ✅ Phase 1: Infrastructure
- [ ] Vector DB repository exists
- [ ] All modules load without errors
- [ ] Authentication works

### ✅ Phase 2: Initialization
- [ ] Agent creates with default Gemini 2.5 Flash
- [ ] Cache initializes properly
- [ ] Vector DB initialization handles empty state

### ✅ Phase 3: Cache System
- [ ] Template caching works
- [ ] Token savings calculated correctly
- [ ] Request counting accurate
- [ ] Cache persists across calls

### ✅ Phase 4: Research & Storage
- [ ] Research executes successfully
- [ ] Results transform to proper format
- [ ] Vector DB stores configurations
- [ ] All agent roles covered

### ✅ Phase 5: Retrieval
- [ ] Configurations load from Vector DB
- [ ] Parse stored JSON correctly
- [ ] Apply to model system

### ✅ Phase 6: Meta-Research
- [ ] Self-evaluation executes
- [ ] Scoring logic works
- [ ] Recommendations generated
- [ ] Decision logic correct

### ✅ Phase 7: Upgrades
- [ ] Manual upgrade works
- [ ] Cache invalidates properly
- [ ] Vector DB updates
- [ ] Cache rebuilds on next use

### ✅ Phase 8: End-to-End
- [ ] Complete flow works
- [ ] No memory leaks
- [ ] Error handling robust
- [ ] Performance acceptable

---

## 🐛 Common Issues & Solutions

### Issue 1: Module Not Found
**Solution**: Ensure packages are built
```bash
cd /Users/alpinro/Code\ Prjects/codequal
npm run build
```

### Issue 2: Vector DB Access Denied
**Solution**: Check user permissions for repository UUID

### Issue 3: Cache Not Syncing
**Solution**: Check DB config exists and timestamps

### Issue 4: Research Takes Too Long
**Solution**: Use 'quick' depth for testing

---

## 📝 Test Report Template

```markdown
# RESEARCHER Validation Report
**Date**: [DATE]
**Tester**: [NAME]

## Summary
- Total Tests: X
- Passed: Y
- Failed: Z

## Phase Results
### Phase 1: Infrastructure
- [✅/❌] Test 1.1: Vector DB Repository
- [✅/❌] Test 1.2: Module Loading

### Phase 2: Initialization
- [✅/❌] Test 2.1: Agent Creation
- [✅/❌] Test 2.2: Vector DB Init

[Continue for all phases...]

## Issues Found
1. [Issue description and resolution]

## Performance Metrics
- Research execution time: X seconds
- Cache hit rate: Y%
- Token savings: Z tokens

## Recommendations
[Any improvements or concerns]
```

---

## 🚀 Ready to Start Testing!

Begin with Phase 1 and work through each test systematically. Document results in the test report template.
