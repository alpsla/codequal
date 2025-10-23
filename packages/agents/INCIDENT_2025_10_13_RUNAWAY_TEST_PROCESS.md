# 🚨 INCIDENT REPORT: Runaway Test Process - Money Burning Bug

**Date:** October 13, 2025  
**Severity:** CRITICAL  
**Cost Impact:** $78.40 (21,000 API requests)  
**Status:** ✅ RESOLVED

---

## 📊 Summary

A runaway test process (`test-v9-e2e-streamlined.ts`) ran continuously for **3+ hours**, making **21,000 API requests** to OpenRouter, resulting in unexpected charges of $78.40.

## 🔍 Root Causes (TWO BUGS FOUND)

### Bug #1: Runaway Test Process (Immediate Cause)

**Process Details:**
- **PID:** 1386894
- **Command:** `node /home/opc/codequal/node_modules/.bin/ts-node test-v9-e2e-streamlined.ts`
- **Started:** 01:49 GMT
- **Discovered:** 18:46 GMT (17 hours later!)
- **CPU Usage:** 20.8% (continuous activity)
- **Runtime:** 213:34 (3 hours 33 minutes of active processing)

**Why It Happened:**
1. Test was started and never stopped (likely hung or infinite loop)
2. No timeout mechanism in the test script
3. No monitoring/alerting for long-running processes
4. Process continued making API calls while hung

### Bug #2: Quarterly Research Triggered on Every Missing Config (Systemic Issue)

**Code Location:** `src/two-branch/research-services/model-researcher-service.ts:58-89`

**The Problem:**
```typescript
// BEFORE (WRONG):
async getOptimalModelForContext(context: ContextRequest) {
  const hasRecentResearch = await this.checkResearchFreshness();
  
  if (!hasRecentResearch) {
    await this.conductQuarterlyResearch();  // 🔥 RESEARCHES ALL MODELS!
  }
  
  // Then query for specific context...
}
```

**What Should Happen:**
- Orchestrator needs "java/security/medium" config
- Check Supabase → Not found?
- Research ONLY that specific context
- Save and return

**What Actually Happened:**
- Orchestrator needs "java/security/medium" config
- Check if quarterly research is fresh → NO?
- **RUN FULL QUARTERLY RESEARCH** (100+ models, web searches, hundreds of API calls!)
- Then query for specific context
- Context still not found → Research it again (duplicate work!)

**Why This Is Critical:**
- Every missing config triggers FULL quarterly research
- Quarterly research = web searches + testing 100+ models
- Could make 500-1000+ API calls PER missing config
- With 5 agents × multiple contexts = potential for 5,000+ API calls

**Fix Applied:**
```typescript
// AFTER (CORRECT):
async getOptimalModelForContext(context: ContextRequest) {
  // Query Supabase directly (no quarterly check!)
  const { data, error } = await this.supabase
    .from('model_research')
    .select('*')
    .contains('optimal_for->languages', [context.language])
    .contains('optimal_for->repo_sizes', [context.repo_size])
    .single();

  if (error || !data) {
    // Research ONLY this specific context
    return await this.requestSpecificContextResearch(context);
  }
  
  return data.model_id;
}
```

**Note:** Quarterly research should ONLY run via scheduled cron job, NEVER on-demand!

## 💰 Financial Impact

```
Total Spent: $78.40
Total Requests: 21,000
Average per day: $2.53 / 678 requests
Peak month: $78.40 / 33.2M tokens / 21K requests

Cost Breakdown:
- Expected per E2E test: $0.05 (17 API calls)
- Actual runaway cost: $78.40 (21,000 API calls)
- Waste: $78.35 (1,235x normal cost)
```

## 🛠️ Resolution

**Immediate Actions:**
1. ✅ Killed runaway process (PID 1386894 and 1386883)
2. ✅ Changed OpenRouter API key (security precaution)
3. ✅ Verified no other runaway processes

**Process Status After Kill:**
```bash
$ ps aux | grep 'test-v9'
No test processes running ✅
```

## 🚫 Prevention Measures

### 1. Add Timeouts to All Test Scripts

**Create:** `packages/agents/run-test-with-timeout.sh`
```bash
#!/bin/bash
# Run test with automatic timeout kill
TEST_SCRIPT=$1
TIMEOUT=${2:-300}  # Default 5 minutes

echo "Running $TEST_SCRIPT with ${TIMEOUT}s timeout..."
timeout --kill-after=10s ${TIMEOUT}s npx ts-node "$TEST_SCRIPT"

EXIT_CODE=$?
if [ $EXIT_CODE == 124 ]; then
    echo "❌ Test timed out after ${TIMEOUT}s - KILLED"
    exit 1
elif [ $EXIT_CODE == 137 ]; then
    echo "❌ Test forcefully killed after timeout"
    exit 1
else
    echo "✅ Test completed normally"
    exit $EXIT_CODE
fi
```

**Usage:**
```bash
# Run with 5-minute timeout (default)
./run-test-with-timeout.sh test-v9-e2e-complete.ts

# Run with custom 10-minute timeout
./run-test-with-timeout.sh test-v9-e2e-complete.ts 600
```

### 2. Add Test-Level Timeouts

**Update all test files to include:**
```typescript
// At top of test file
const TEST_TIMEOUT = 10 * 60 * 1000; // 10 minutes
const startTime = Date.now();

function checkTimeout() {
  if (Date.now() - startTime > TEST_TIMEOUT) {
    console.error('❌ Test exceeded timeout - aborting');
    process.exit(1);
  }
}

// Call periodically
setInterval(checkTimeout, 30000); // Check every 30s
```

### 3. Add Process Monitoring

**Create:** `packages/agents/monitor-processes.sh`
```bash
#!/bin/bash
# Kill any test process running > 15 minutes

while true; do
  ps aux | grep 'ts-node test-v9' | grep -v grep | while read line; do
    PID=$(echo $line | awk '{print $2}')
    RUNTIME=$(echo $line | awk '{print $10}')
    
    # Extract minutes from runtime (format: HH:MM or MM:SS)
    MINUTES=$(echo $RUNTIME | awk -F: '{print $1}')
    
    if [ "$MINUTES" -gt 15 ]; then
      echo "⚠️  Killing long-running test process (PID $PID, runtime $RUNTIME)"
      kill -9 $PID
    fi
  done
  
  sleep 300  # Check every 5 minutes
done
```

### 4. Add API Call Monitoring

**Update SimpleOpenRouterClient:**
```typescript
private callCount = 0;
private readonly MAX_CALLS_PER_SESSION = 100;

async chat(request: SimpleAIRequest): Promise<SimpleAIResponse> {
  this.callCount++;
  
  if (this.callCount > this.MAX_CALLS_PER_SESSION) {
    throw new Error(`🚨 SAFETY LIMIT: Exceeded ${this.MAX_CALLS_PER_SESSION} API calls in one session!`);
  }
  
  // ... rest of method
}
```

### 5. Add Cost Alerts

**Configure OpenRouter:**
- Set daily spending limit: $5
- Set monthly spending limit: $50
- Enable email alerts at 50% and 80% thresholds

## 📋 Post-Incident Checklist

- [x] Identify and kill runaway process
- [x] Change API keys (security)
- [x] Verify no other runaway processes
- [x] Document incident
- [ ] Implement timeout wrapper script
- [ ] Add test-level timeouts to all E2E tests
- [ ] Set up process monitoring cron job
- [ ] Add API call limits to clients
- [ ] Configure OpenRouter spending alerts
- [ ] Review all long-running tests for infinite loop risks

## 🎓 Lessons Learned

1. **Always use timeouts** for test scripts (shell-level + code-level)
2. **Monitor long-running processes** automatically
3. **Limit API calls per session** as a safety mechanism
4. **Set up spending alerts** before testing in production
5. **Check for runaway processes** before starting new tests

## 📚 Related Documents

- `V9_CRITICAL_KNOWLEDGE_BASE.md` - Update with new safety measures
- `QUICK_START_NEXT_SESSION.md` - Add runaway process check to start-of-session checklist

---

**Incident Closed:** October 13, 2025  
**Total Duration:** 17 hours (discovery to resolution)  
**Estimated Cost Savings from Prevention:** $1,000+/year

