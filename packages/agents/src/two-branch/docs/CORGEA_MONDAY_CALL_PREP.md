# Corgea Integration - Monday Call Preparation

**Date**: December 20, 2025
**Purpose**: Prepare questions and document findings for Corgea representative call

---

## 1. What We've Tested

### API Endpoints Verified ✅

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /verify` | ✅ 200 OK | Authentication works with `CORGEA-TOKEN` header |
| `GET /scans` | ✅ 200 OK | Lists all scans for account |
| `GET /scan/{id}` | ✅ 200 OK | Returns scan details and status |
| `GET /scan/{id}/issues` | ✅ 200 OK | Returns issues for scan (currently 0) |
| `GET /scan/{id}/report` | ✅ 200 OK | Returns HTML report |
| `GET /issues` | ✅ 200 OK | Lists all issues (currently 0) |
| `GET /issues/sca` | ✅ 200 OK | SCA issues (currently 0) |
| `GET /blocking-rules` | ✅ 200 OK | Returns empty blocking rules |
| `POST /scan-upload` | ✅ 200 OK | Accepts SARIF, returns `sast_scan_id` |
| `POST /git-config-upload` | ✅ 200 OK | Accepts git config text |
| `POST /code-upload` | ✅ 200 OK | Accepts source code files (multipart) |

### Correct API Configuration

```
Base URL: https://www.corgea.app/api/v1
Auth Header: CORGEA-TOKEN: <api_key>

IMPORTANT: api.corgea.app returns 522 timeout errors - use www.corgea.app
```

### Upload Flow Tested

1. **SARIF Upload** → Returns `scan_id`, status becomes "processing"
2. **Git Config Upload** → Returns "ok"
3. **Code Upload** → Returns "ok" (multipart/form-data with `run_id` and `path` query params)
4. **Poll Status** → Goes from "processing" to "incomplete"

### Current Issue

All uploads succeed but:
- Scan status stays "incomplete"
- 0 issues returned
- 0 fixes generated

---

## 2. Questions for Corgea

### Pricing & Tier Questions

1. **What are the exact tier differences?**
   - Free vs Starter ($14/mo) vs Growth ($29/mo) vs Scale ($49/mo)
   - What's included in each tier?
   - API access limits per tier?

2. **Is fix generation available on free tier?**
   - Our scans show "incomplete" with 0 issues
   - Is this expected behavior on free tier?

3. **What are the rate limits?**
   - Current limit shows 1000/1000 remaining
   - What happens when exceeded?

4. **Enterprise pricing model?**
   - We're building a PR analysis platform
   - Need to understand per-fix or per-scan pricing

### Technical Questions

5. **Why are our scans "incomplete"?**
   - We uploaded: SARIF + git config + source code
   - All returned 200 OK
   - Status goes from "processing" to "incomplete"
   - What are we missing?

6. **How long does fix generation take?**
   - Real-time or queued?
   - Average processing time?

7. **Third-party SARIF requirements:**
   - What SARIF fields are required?
   - Do we need specific rule IDs?
   - Does source code need to match SARIF locations exactly?

8. **Fix retrieval API:**
   - How do we get the generated fixes?
   - Are fixes included in issue details?
   - Is there a separate endpoint for diffs?

### Integration Questions

9. **Webhook notifications:**
   - Can we get notified when fixes are ready?
   - What events can trigger webhooks?

10. **Batch processing:**
    - Can we upload multiple files at once?
    - Is there a bulk fix generation endpoint?

11. **PR integration:**
    - How does the GitHub/GitLab integration work?
    - Can we use the API to replicate this?

---

## 3. Our Use Case

### CodeQual Platform

We're building a PR analysis tool that:
- Scans PRs using multiple security tools (Semgrep, ESLint, etc.)
- Groups findings by category
- Provides AI-generated fixes

### Why Corgea?

1. **Specialized security fixes** - Corgea focuses on security, we can focus on code quality
2. **Reduce AI costs** - Potentially cheaper than running our own fix generation
3. **Verified fixes** - Corgea has security expertise we can leverage

### Integration Plan

```
┌──────────────────┐     ┌──────────────┐     ┌─────────────────┐
│  CodeQual Scan   │────▶│ SARIF Report │────▶│  Corgea API     │
│  (Semgrep, etc.) │     │              │     │  (Fix Gen)      │
└──────────────────┘     └──────────────┘     └────────┬────────┘
                                                       │
┌──────────────────┐     ┌──────────────┐              │
│  CodeQual Report │◀────│ Merge Fixes  │◀─────────────┘
│  (PR Comment)    │     │              │
└──────────────────┘     └──────────────┘
```

### Volume Estimates

| Metric | Estimate |
|--------|----------|
| PRs/month | 1,000 - 10,000 |
| Issues/PR | 10-50 average |
| Fixes needed/PR | 5-20 |
| Total fixes/month | 5,000 - 100,000 |

---

## 4. Competitive Comparison

### Current AI-Fixer Cost (OpenRouter/Claude)

- Average cost: **1.65¢ per fix**
- Quality: Good for code style, variable for security
- Speed: Real-time (1-3 seconds)

### Corgea Expected Cost

| Tier | Monthly | Fixes Included | Cost/Fix |
|------|---------|----------------|----------|
| Free | $0 | ? | ? |
| Starter | $14 | ? | ? |
| Growth | $29 | ? | ? |
| Scale | $49 | ? | ? |
| Enterprise | Custom | Unlimited? | ? |

**Key Question**: What's the effective cost per fix at scale?

---

## 5. Test Results Summary

### What Works

| Feature | Status |
|---------|--------|
| API Authentication | ✅ Working |
| SARIF Upload | ✅ Working |
| Code Upload | ✅ Working |
| Git Config Upload | ✅ Working |
| Scan Status Polling | ✅ Working |
| Issue Retrieval | ✅ Working (returns empty) |

### What Needs Clarification

| Feature | Status | Question |
|---------|--------|----------|
| Fix Generation | ❓ Unknown | Is this tier-gated? |
| Scan Completion | ❓ Unknown | Why "incomplete"? |
| Issue Detection | ❓ Unknown | Why 0 issues from our SARIF? |

---

## 6. Action Items Post-Call

After the call, we need to:

1. [ ] Understand tier limitations
2. [ ] Get fix generation working
3. [ ] Benchmark fix quality vs AI-fixer
4. [ ] Calculate cost comparison
5. [ ] Decide on Corgea vs AI-fixer routing strategy

---

## 7. Code Samples Ready

We have test code ready to demonstrate:

1. `test-corgea-complete-flow.ts` - Full upload workflow
2. `investigate-corgea.ts` - API endpoint testing
3. `test-corgea-upload.ts` - SARIF upload testing

All in: `packages/agents/tests/integration/cloud-api/`

---

## Contact Information

**Corgea**
- Website: https://corgea.com
- Docs: https://docs.corgea.app
- API Base: https://www.corgea.app/api/v1

**Our Test Account**
- API Key: e6e0a9db...6666 (masked)
- Current Tier: Free (assumed)
- Scans Created: 5
- Issues Found: 0
