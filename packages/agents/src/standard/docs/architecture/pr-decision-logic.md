# PR Decision Logic

## Overview

The PR decision system ensures code quality by automatically blocking PRs that introduce critical or high severity issues while not penalizing developers for pre-existing technical debt.

## Decision Rules

### ❌ DECLINED - Automatic Blocking

A PR is automatically DECLINED if it introduces ANY of the following NEW issues:
- 1 or more CRITICAL severity issues
- 1 or more HIGH severity issues

### ✅ APPROVED - Allowed to Proceed

A PR is APPROVED (possibly with conditions) if:
- No new CRITICAL issues
- No new HIGH issues
- May have new MEDIUM or LOW issues (should fix, but not blocking)

### ⚠️ APPROVED WITH CONDITIONS

When a PR has new medium/low issues or leaves pre-existing issues unfixed:
- PR can proceed
- Issues should be addressed soon
- Skill scores are impacted

## What Blocks vs What Doesn't

### 🚨 BLOCKING (PR Cannot Merge)

**NEW Issues Only:**
- Critical security vulnerabilities
- Critical performance degradations
- High severity bugs
- High security risks
- Breaking changes without migration path

### 📊 NON-BLOCKING (Affects Scores Only)

**Pre-existing Issues:**
- ALL repository issues that existed before the PR
- Even if critical, they don't block THIS PR
- But they reduce developer skill scores
- Motivates fixing technical debt over time

**New Minor Issues:**
- Medium severity issues
- Low severity issues
- Code style violations
- Missing documentation
- Non-critical test failures

## Severity Definitions

### CRITICAL
- Security: Data breach, authentication bypass, RCE
- Performance: Service outage, memory leak, infinite loop
- Quality: Data corruption, breaking API changes

### HIGH
- Security: XSS, SQL injection risk, weak crypto
- Performance: 10x performance degradation
- Quality: Major functionality broken

### MEDIUM
- Security: Missing rate limiting, weak passwords
- Performance: 2-5x slower operations
- Quality: Poor error handling, high complexity

### LOW
- Security: Information disclosure (non-sensitive)
- Performance: Minor inefficiencies
- Quality: Code style, naming conventions

## Example Scenarios

### Scenario 1: PR Introduces Critical Issue
```
New Issues: 1 critical, 0 high, 2 medium
Repository Issues: 5 critical, 10 high
Decision: ❌ DECLINED
Reason: New critical issue must be fixed
```

### Scenario 2: PR Only Has Medium Issues
```
New Issues: 0 critical, 0 high, 5 medium
Repository Issues: 3 critical, 5 high
Decision: ✅ APPROVED WITH CONDITIONS
Reason: No critical/high NEW issues
Note: Should fix medium issues soon
```

### Scenario 3: Perfect PR, Bad Repository
```
New Issues: 0 critical, 0 high, 0 medium
Repository Issues: 10 critical, 20 high
Decision: ✅ APPROVED
Reason: PR doesn't make things worse
Note: Developer penalized -65 skill points
```

## Skill Impact

While pre-existing issues don't block PRs, they heavily impact scores:

- Unfixed Critical: -3 points each
- Unfixed High: -2 points each
- Unfixed Medium: -1 point each
- Unfixed Low: -0.5 points each

This motivates developers to:
1. Not introduce new critical/high issues
2. Fix existing issues to improve scores
3. Leave the codebase better than they found it

## UI Integration

The PR review UI should:
1. Clearly separate NEW vs EXISTING issues
2. Show blocking issues prominently
3. Allow filtering existing issues by severity
4. Display skill score impact preview
5. Provide "Fix and Resubmit" workflow

## Override Mechanism

In rare cases, a human reviewer can override:
- Must provide written justification
- Requires senior approval
- Gets logged for audit
- Still impacts skill scores

## Summary

This approach balances:
- **Quality**: Prevents new critical issues
- **Fairness**: Doesn't blame for existing debt
- **Motivation**: Rewards fixing old issues
- **Pragmatism**: Allows progress despite debt