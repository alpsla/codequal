# Fix Pattern Registry

A system for capturing, storing, and applying fix patterns. This enables the transition from manual fixes to automated patterns, benefiting both individual users and the entire community.

## Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    THE FIX PATTERN LIFECYCLE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │   DETECT     │───▶│   LOOKUP     │───▶│    APPLY     │                  │
│  │   Issue      │    │   Pattern    │    │    Fix       │                  │
│  └──────────────┘    └──────────────┘    └──────────────┘                  │
│         │                   │                   │                          │
│         │            No pattern?                │                          │
│         │                   │                   │                          │
│         ▼                   ▼                   ▼                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │   Manual     │───▶│   Capture    │───▶│   Validate   │                  │
│  │   Fix        │    │   Pattern    │    │   Security   │                  │
│  └──────────────┘    └──────────────┘    └──────────────┘                  │
│                             │                   │                          │
│                             │            ┌──────┴───────┐                  │
│                             │            │              │                  │
│                             ▼            ▼              ▼                  │
│                      ┌──────────────┐  Block      ┌──────────────┐        │
│                      │   Review     │◀────────────│   Trusted?   │        │
│                      │   Queue      │   (new)     │   Activate!  │        │
│                      └──────────────┘             └──────────────┘        │
│                             │                           │                  │
│                             ▼                           ▼                  │
│                      ┌─────────────────────────────────────────────────┐  │
│                      │       PATTERN AVAILABLE FOR ALL FUTURE USERS!   │  │
│                      └─────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## How It Works

### 1. Issue Detection
- Semgrep/ESLint/etc detect an issue (e.g., shell injection)
- Issue has no native autofix from the tool

### 2. Pattern Lookup
- System checks Fix Pattern Registry for a matching pattern
- If found → Auto-generate fix using the pattern template
- If not found → Show "Manual review required"

### 3. User Fixes Manually (When No Pattern Exists)
The fix can come from:
- **User typing** - User edits the code themselves
- **IDE AI** - Cursor/Copilot generates fix (free for CodeQual!)
- **CodeQual AI** - Our AI generates fix (PRO tier)

### 4. Fix Capture
- IDE extension captures: `before_code` → `after_code`
- Sends to `/api/fix-patterns/capture`
- Pattern is extracted from the diff

### 5. Security Validation (ALL Users)
**Critical step!** Every captured fix goes through security validation:
- Static analysis for malicious patterns (eval, exec, etc.)
- Scope validation (fix shouldn't be too large)
- Semantic validation (fix should match the issue type)
- Dependency check (shouldn't inject new packages)
- URL/IP check (shouldn't add external connections)

### 6. Review & Activation
| User Type | Security Check | Result |
|-----------|----------------|--------|
| **Trusted** | Pass | Pattern **activates immediately** |
| **Trusted** | Fail (malicious) | **PERMANENTLY BANNED** |
| **New** | Pass | Goes to **review queue** |
| **New** | Fail (malicious) | **PERMANENTLY BANNED** |
| **Banned** | N/A | Cannot contribute (IDE hides option) |

### 7. Pattern Activated
- Pattern joins the registry
- Next time anyone hits this rule → Automatic fix!

---

## User Trust System

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         USER TRUST LEVELS                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  NEW USER                                                            │   │
│  │  ─────────────────────────────────────────────────────────────────── │   │
│  │  • First-time contributor                                            │   │
│  │  • Submissions go to REVIEW QUEUE                                    │   │
│  │  • Must wait for admin approval                                      │   │
│  │  • Rank: Bronze                                                      │   │
│  │  • Points: 10 per submission                                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                               │                                             │
│                               ▼ (After 5 approved patterns)                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  TRUSTED USER                                                        │   │
│  │  ─────────────────────────────────────────────────────────────────── │   │
│  │  • Proven contributor with track record                              │   │
│  │  • Patterns ACTIVATE IMMEDIATELY (after security check)              │   │
│  │  • Still goes through FULL security validation                       │   │
│  │  • Points: 50 per approved pattern                                   │   │
│  │                                                                      │   │
│  │  Ranks:                                                              │   │
│  │    Silver   (5+ approved)                                            │   │
│  │    Gold     (20+ approved)                                           │   │
│  │    Platinum (50+ approved)                                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                               │                                             │
│                               ▼ (If submits malicious code)                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  BANNED USER                                                         │   │
│  │  ─────────────────────────────────────────────────────────────────── │   │
│  │  • PERMANENT ban - NO appeal                                         │   │
│  │  • Cannot contribute ever again                                      │   │
│  │  • IDE does NOT show "Contribute" option                             │   │
│  │  • All future submissions immediately rejected                       │   │
│  │  • Ban reason logged for audit                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Promotion Criteria (New → Trusted)
- **5 approved patterns** required
- All submissions must pass security validation
- No rejected patterns due to security issues

### Rank Progression
| Rank | Approved Patterns | Benefits |
|------|-------------------|----------|
| Bronze | 0-4 | Submissions go to review queue |
| Silver | 5-19 | Patterns activate immediately |
| Gold | 20-49 | Patterns activate immediately |
| Platinum | 50+ | Patterns activate immediately |

---

## Security Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SECURITY VALIDATION LAYERS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Layer 1: STATIC ANALYSIS                                                   │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Check for known malicious patterns:                                        │
│  • eval(), exec(), new Function()                                          │
│  • child_process, subprocess                                               │
│  • External HTTP requests (fetch, axios, XMLHttpRequest)                   │
│  • Hardcoded credentials (API keys, tokens, passwords)                     │
│  • Obfuscated code (hex encoding, base64, fromCharCode)                    │
│  • System file access (/etc/passwd, /etc/shadow)                           │
│  • Shell piping (curl | bash, wget | sh)                                   │
│                                                                             │
│  Layer 2: SCOPE VALIDATION                                                  │
│  ─────────────────────────────────────────────────────────────────────────  │
│  • Fix shouldn't change more than ~50 lines (warning at 20)                │
│  • Fix shouldn't be 3x larger than original code                           │
│  • Fix should be localized to issue location                               │
│                                                                             │
│  Layer 3: SEMANTIC VALIDATION                                               │
│  ─────────────────────────────────────────────────────────────────────────  │
│  • Shell injection fix → Should add env: block or sanitization             │
│  • XSS fix → Should add escaping or encoding                               │
│  • SQL injection fix → Should use parameterized queries                    │
│                                                                             │
│  Layer 4: DEPENDENCY CHECK                                                  │
│  ─────────────────────────────────────────────────────────────────────────  │
│  • Shouldn't add new npm/pip packages                                      │
│  • Shouldn't add new imports from untrusted sources                        │
│                                                                             │
│  Layer 5: NETWORK CHECK                                                     │
│  ─────────────────────────────────────────────────────────────────────────  │
│  • Shouldn't add external URLs (except safe CDNs)                          │
│  • Shouldn't add IP addresses                                              │
│  • Safe domains: github.com, npmjs.com, cdnjs.cloudflare.com, etc.        │
│                                                                             │
│  Layer 6: PERMANENT BAN ENFORCEMENT                                         │
│  ─────────────────────────────────────────────────────────────────────────  │
│  • Malicious code submission → User PERMANENTLY BANNED                     │
│  • Banned users cannot contribute ever again                               │
│  • IDE checks ban status BEFORE showing contribute option                  │
│  • Ban reasons logged for audit trail                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Security Score
Each submission receives a security score (0-100):
- **100**: No risks detected
- **75-99**: Minor warnings, passes validation
- **50-74**: Medium risks, may require additional review
- **0-49**: High/critical risks, blocked

### Malicious Patterns That Trigger Ban
| Pattern | Severity | Action |
|---------|----------|--------|
| `eval()`, `exec()`, `new Function()` | Critical | Block + Ban |
| `child_process`, `subprocess` | High | Block + Ban |
| Private keys, GitHub tokens | Critical | Block + Ban |
| `curl \| bash`, `wget \| sh` | Critical | Block + Ban |
| Data exfiltration URLs | High | Block + Ban |

---

## Benefit Distribution

### For the User Who Submits a Fix

1. **Immediate** - Their fix is applied to their code
2. **Points** - Earn contributor points (10 for new, 50 for trusted)
3. **Reputation** - Work toward trusted contributor status
4. **Recognition** - Name in contributor list, rank badges

### For Future Users

1. **Automatic fix** - No manual work needed
2. **Consistent quality** - Same fix pattern every time
3. **Faster resolution** - Milliseconds vs AI generation time
4. **Offline capable** - Works without API calls

### For the Community

1. **Knowledge sharing** - Best fixes become standard
2. **Coverage growth** - More rules get patterns over time
3. **Quality improvement** - Patterns improve through feedback
4. **Security** - All patterns are security-validated

---

## API Reference

### Check if User Can Contribute
**Call this BEFORE showing the "Contribute" dialog!**

```typescript
GET /api/fix-patterns/can-contribute/{userId}

Response:
{
  "canContribute": true,           // false for banned users
  "trustStatus": "new",            // "new" | "trusted" | "banned"
  "reason": "...",                 // only if canContribute is false
  "stats": {
    "totalContributions": 3,
    "acceptedContributions": 2,
    "rank": "bronze"
  }
}
```

### Capture a Fix
```typescript
POST /api/fix-patterns/capture
{
  "ruleId": "yaml.github-actions.security.run-shell-injection",
  "tool": "semgrep",
  "filePath": ".github/workflows/deploy.yml",
  "beforeCode": "...",
  "afterCode": "...",
  "lineNumber": 48,
  "issueMessage": "Shell injection vulnerability",
  "userId": "user@example.com"
}

Response:
{
  "success": true,
  "patternId": "abc123",
  "status": "active",              // "active" for trusted, "pending_review" for new
  "message": "Pattern activated!", // or "Submitted for review"
  "autoApproved": true             // true for trusted users
}
```

### Lookup Pattern
```typescript
GET /api/fix-patterns/lookup/{ruleId}?tool=semgrep&fileType=yaml

Response:
{
  "found": true,
  "patterns": [...],
  "recommended": { ... }
}
```

### Apply Pattern
```typescript
POST /api/fix-patterns/apply
{
  "patternId": "builtin-github-actions-shell-injection-001",
  "fileContent": "...",
  "filePath": ".github/workflows/deploy.yml",
  "lineNumber": 48
}

Response:
{
  "success": true,
  "fixedCode": "...",
  "diff": "...",
  "confidence": 90
}
```

### Report Result
```typescript
POST /api/fix-patterns/result
{
  "patternId": "abc123",
  "success": true,
  "reverted": false,
  "userId": "user@example.com"
}
```

---

## IDE Extension Integration

```typescript
import { FixPatternClient } from 'codequal-sdk';

const client = new FixPatternClient('https://api.codequal.dev');

// When user fixes an issue manually
async function onUserFix(issue, beforeCode, afterCode) {
  // 1. Check if pattern already exists
  const lookup = await client.lookupPattern(issue.ruleId);

  if (!lookup.found) {
    const userId = getUserId();

    // 2. CRITICAL: Check if user can contribute BEFORE showing dialog
    const canContributeResult = await client.canContribute(userId);

    // Don't show contribute option to banned users
    if (!canContributeResult.canContribute) {
      // User is banned - silently skip, don't show contribute option
      return;
    }

    // 3. Show appropriate dialog based on trust level
    const message = canContributeResult.trustStatus === 'trusted'
      ? "Would you like to contribute this fix? (Your patterns activate immediately!)"
      : "Would you like to contribute this fix pattern for review?";

    const contribute = await showDialog(message);

    if (contribute) {
      // 4. Capture the fix
      const result = await client.captureFix({
        ruleId: issue.ruleId,
        tool: issue.tool,
        filePath: issue.file,
        beforeCode,
        afterCode,
        lineNumber: issue.line,
        issueMessage: issue.message,
        userId,
      });

      // 5. Show result and stats
      showMessage(result.message);

      if (canContributeResult.stats) {
        showContributorBadge(canContributeResult.stats.rank);
      }
    }
  }
}

// When pattern is applied
async function onPatternApplied(patternId, success) {
  await client.reportResult({
    patternId,
    success,
    reverted: false,
    userId: getUserId(),
  });
}

// When user reverts a fix
async function onFixReverted(patternId, reason) {
  await client.reportResult({
    patternId,
    success: false,
    reverted: true,
    revertReason: reason,
    userId: getUserId(),
  });
}
```

---

## Built-in Patterns

The registry ships with curated patterns for common issues:

| Rule | Tool | Confidence | Description |
|------|------|------------|-------------|
| `yaml.github-actions...shell-injection` | Semgrep | 90% | Wrap `${{ github.* }}` in env: block |

More patterns will be added as the community contributes.

---

## Contributing Patterns

1. Fix an issue in your IDE
2. If no pattern exists, you'll see "Contribute this fix?"
3. Accept → Pattern is security-validated
4. **New users**: Pattern goes to review queue
5. **Trusted users**: Pattern activates immediately!
6. Pattern helps everyone who encounters the same issue

---

## Files

```
fix-pattern-registry/
├── types.ts                    # Type definitions (FixPattern, UserContributionRecord, etc.)
├── fix-pattern-registry.ts     # Core registry with user trust management
├── fix-pattern-applicator.ts   # LSP integration for applying patterns
├── fix-capture-api.ts          # REST API handlers + Client SDK
├── fix-security-validator.ts   # Security validation (malicious pattern detection)
├── index.ts                    # Module exports
├── test-pattern-registry.ts    # Basic functionality tests
├── test-security-flow.ts       # Security and ban system tests
└── README.md                   # This documentation
```

---

## Testing

```bash
# Run basic functionality tests
npx ts-node src/fix-agent/fix-pattern-registry/test-pattern-registry.ts

# Run security flow tests (includes ban scenarios)
npx ts-node src/fix-agent/fix-pattern-registry/test-security-flow.ts
```

### Test Coverage
- Pattern lookup and application
- Safe fix submission (new user → review queue)
- Safe fix submission (trusted user → immediate activation)
- Malicious fix detection and user ban
- Banned user rejection
- `canContribute` API for IDE integration
