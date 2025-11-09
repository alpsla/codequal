# CRITICAL: Dependency-Check Performance Bug

**Date**: November 9, 2025  
**Priority**: 🔴 **CRITICAL**  
**Impact**: 78× slower than expected

---

## 🐛 The Problem

**Expected**: 3-5 seconds per branch with PostgreSQL  
**Actual**: 152-153 seconds per branch (305s total)  
**Difference**: 78× SLOWER

---

## 🔬 Evidence

### Direct Test (Correct):
```bash
dependency-check.sh --scan /tmp/petclinic-test \
  --connectionString 'jdbc:postgresql://localhost:5432/depcheck' \
  --dbDriverName org.postgresql.Driver \
  --dbUser depcheck_scanner \
  --dbPassword depcheck123

Result: 3.9 seconds ✅
```

### In PR #950 Analysis (Wrong):
```
Tool Performance:
dependency-check | N/A | 0 | 305.7s

Result: 305.7 seconds (both branches) ❌
```

---

## 🔍 Possible Causes

### 1. Environment Variables Not Loaded
**Symptom**: PostgreSQL connection fails, falls back to NVD download  
**Evidence**: Earlier log showed "Could not verify PostgreSQL connection"  
**Fix**: Ensure .env is loaded before tool execution

### 2. Timeout Hit
**Symptom**: Process killed after 300s timeout  
**Evidence**: 305s is very close to 300s timeout  
**Fix**: Check if timeout is being hit

### 3. Running in Docker Container
**Symptom**: Container can't access host PostgreSQL  
**Evidence**: UniversalDependencyCheckRunner runs natively, not in Docker  
**Status**: Should not be the issue

### 4. Different Analyzers Enabled
**Symptom**: More analyzers running than in direct test  
**Evidence**: Direct test shows only essential analyzers  
**Check**: Compare analyzer list

---

## 🎯 Investigation Steps

### Step 1: Verify Environment Variables Are Loaded
```bash
# In test execution, log the env vars
console.log('DEPCHECK_DB_HOST:', process.env.DEPCHECK_DB_HOST);
console.log('DEPCHECK_DB_USER:', process.env.DEPCHECK_DB_USER);
```

### Step 2: Add Debug Logging to Universal Runner
```typescript
// In dependency-check-runner.ts
protected buildCommand(): string {
  console.log('[DepCheck] Using PostgreSQL:', this.pgHost, this.pgDatabase);
  console.log('[DepCheck] Connection string:', jdbcUrl);
  // ... existing code
}
```

### Step 3: Check for Timeout
```typescript
// In universal-tool-base.ts
if (error.killed && error.signal === 'SIGTERM') {
  console.error(`[Universal ${this.config.name}] ⏱️ TIMEOUT HIT!`);
}
```

### Step 4: Test PostgreSQL Connection
```bash
# Before running dependency-check
psql -h localhost -U depcheck_scanner -d depcheck -c "SELECT 1"
```

---

## 💡 Most Likely Cause

**Environment variables are NOT being passed to the child process** that runs dependency-check.sh.

The universal runner creates the command with:
```bash
--dbUser ${this.pgUser}
--dbPassword ${this.pgPassword}
```

But `this.pgUser` comes from:
```typescript
this.pgUser = process.env.DEPCHECK_DB_USER || 'depcheck_scanner';
```

If `process.env.DEPCHECK_DB_USER` is undefined when the runner initializes, it uses the default, which might not work.

---

## ✅ Solution

### Fix 1: Explicit Environment Loading
```typescript
// In UniversalDependencyCheckRunner constructor
constructor(workspacePath: string, language: string) {
  // SESSION 22 FIX: Load .env explicitly if vars not found
  if (!process.env.DEPCHECK_DB_HOST) {
    require('dotenv').config({ path: __dirname + '/../../../../.env' });
  }
  
  // Then initialize with env vars
  this.pgHost = process.env.DEPCHECK_DB_HOST || 'localhost';
  // ...
}
```

### Fix 2: Verify Connection Before Running
```typescript
async execute(): Promise<Issue[]> {
  // Test PostgreSQL connection first
  const canConnect = await this.testPostgreSQLConnection();
  if (!canConnect) {
    console.warn('[DepCheck] PostgreSQL not available - analysis may be slow');
  }
  
  // Continue with execution...
}
```

### Fix 3: Add Detailed Timing Logs
```typescript
const phases = {
  connectionTest: 0,
  scanStart: 0,
  analysisComplete: 0,
  parseOutput: 0
};

// Log each phase
console.log(`[DepCheck] Timing: ${JSON.stringify(phases)}`);
```

---

## 🚨 Impact

**Current**: 10-minute analysis (305s is Dependency-Check)  
**Expected**: 3-4 minute analysis (8s is Dependency-Check)  
**Improvement**: 60% faster overall!

This is a **critical performance bug** affecting production viability!

---

## 📋 Action Plan

1. ✅ Document the bug (this file)
2. Add debug logging to dependency-check-runner.ts
3. Verify .env loading in tests
4. Test with explicit env var injection
5. Verify PostgreSQL connection before scan
6. Re-test to confirm 4-second execution

---

*Critical bug: Dependency-Check not using PostgreSQL, causing 76× slowdown.*

