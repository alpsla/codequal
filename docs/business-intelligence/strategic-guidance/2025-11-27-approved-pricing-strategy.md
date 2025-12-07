# CodeQual Approved Pricing Strategy (Two-Tier Model)

**Date**: November 27, 2025
**Status**: APPROVED - FINAL
**Effective**: Immediately
**Supersedes**: All previous pricing documents

---

## Executive Summary

CodeQual adopts a **two-tier pricing model** that solves the "Cursor User Problem" -- developers already paying $20/month for AI tools don't want to pay $15 more for full auto-fix. The new model offers:

1. **Analyze ($5/user/mo)** - For BYOAI users (94% margin)
2. **Analyze+Fix ($15/user/mo)** - For teams without AI tools (80% margin)
3. **Enterprise ($20/user/mo)** - Future tier (1+ year out)

---

## Approved Pricing Structure

### Tier Comparison

| Tier | Price | Margin | Target User |
|------|-------|--------|-------------|
| **Analyze** | $5/user/mo | 94% | Cursor/Copilot users (BYOAI) |
| **Analyze+Fix** | $15/user/mo | 80% | Teams without AI tools |
| **Enterprise** | $20/user/mo | 80% | Future (1+ year out) |

### Analyze Tier ($5/user/month)

**Target**: Developers who already have Cursor ($20/mo), GitHub Copilot ($10-39/mo), or Claude Desktop

**Features Included**:
- Full PR analysis (security, quality, performance, architecture, dependencies)
- Educational explanations (WHY it matters) - our unique moat
- Fix recommendations (WHAT to do)
- LSP/SARIF export for user's AI tool
- **Fix Package Download** (prompts formatted for Cursor, Copilot, Claude Desktop)
- User fixes with their own AI subscription

**Value Proposition**: "You already have the AI. We give you the intelligence."

**Cost Structure**:
- Analysis cost: ~$0.01/PR
- No fix execution costs
- 94% margin maintained

### Analyze+Fix Tier ($15/user/month)

**Target**: Teams without existing AI tool subscriptions

**Features Included**:
- Everything in Analyze tier
- One-click auto-fix (we run the AI)
- Fix preview before applying
- Automatic PR creation
- Fix verification (re-analyze after fix)
- No API key needed from user

**Value Proposition**: "Pay $10 more, we do ALL the fixing for you."

**Cost Structure**:
- Analysis cost: ~$0.01/PR
- Fix cost: ~$0.10/PR average
- 30 PRs/user/month assumption
- Total cost: ~$3.10/user/month
- **80% margin maintained**

### Enterprise Tier ($20/user/month)

**Status**: Future tier (1+ year out)
**Target**: Large organizations (200+ developers)

**Planned Features**:
- Everything in Analyze+Fix
- SSO/SAML authentication
- On-premise deployment option
- Custom SLA (99.9%+ uptime)
- Dedicated support engineer
- Custom integrations
- Compliance assistance (SOC 2, ISO 27001)
- Volume discounts

---

## Strategic Rationale

### 1. The Cursor User Problem (SOLVED)

**Problem**: Users paying $20/mo for Cursor don't want to pay $15 more for full service.

**Old Model (Broken)**:
```
User: "I pay $20/mo for Cursor. Why should I pay $15 more?"
CodeQual: "Uh... for analysis AND fixes?"
User: "But Cursor already does fixes from prompts..."
```

**New Model (Fixed)**:
```
User: "I pay $20/mo for Cursor. What can you offer?"
CodeQual: "$5/mo for analysis + fix prompts. Use your Cursor to apply them."
User: "That makes sense! I get the intelligence, I use my own AI."
```

### 2. Margin Parity Achieved

**Old Pricing (Imbalanced)**:
- Team tier: 92% margin (analysis only)
- Pro tier: 75% margin (with fixes) -- lower margin, price pressure

**New Pricing (Balanced)**:
- Analyze: 94% margin
- Analyze+Fix: 80% margin
- Both tiers maintain healthy margins

### 3. Clear 3x Value Proposition

**Pricing Psychology**:
- $15 = 3x $5
- Clear messaging: "Pay $10 more, we do ALL the fixing"
- No confusion about tier value

### 4. Competitive Positioning

| Competitor | Their Price | CodeQual Analyze | CodeQual Analyze+Fix |
|------------|-------------|------------------|---------------------|
| SonarQube Cloud | $12/user | 58% cheaper | 25% more (but with AI fixes) |
| Snyk Code | $24/user | 79% cheaper | 37% cheaper |
| GitHub Copilot | $10-39/user | 50-87% cheaper | Similar to mid-tier |
| DeepSource | $20/user | 75% cheaper | 25% cheaper |

---

## Platform Distribution (Confirmed)

| Platform | Target % | Rationale |
|----------|----------|-----------|
| GitLab | 40% | PRIORITY - no native code quality |
| GitHub | 20% | CAP - platform risk |
| Bitbucket | 15% | Atlassian ecosystem |
| Self-hosted | 15% | Enterprise, high security |
| API/CLI | 10% | Platform independence |

---

## Positioning (Approved)

### Primary Tagline
> "The Auto-Fix Tool You Can Trust -- Because We Teach You Why"

### Alternative Tagline (BYOAI Focus)
> "CodeQual finds the issues. Your AI fixes them. No vendor lock-in."

### Key Differentiators

1. **Educational Content** (Unique Moat)
   - We teach WHY issues matter
   - Competitors just flag problems

2. **Fix Package Download** (BYOAI Innovation)
   - Pre-formatted prompts for Cursor, Copilot, Claude Desktop
   - Works with user's existing AI subscription

3. **Platform Independence**
   - Works with GitHub, GitLab, Bitbucket, self-hosted
   - Unlike GitHub Copilot (GitHub-only)

4. **Cost Transparency**
   - Clear per-user pricing
   - No hidden costs or surprise bills

---

## Revenue Projections (12 Months)

### Conservative Scenario

| Tier | Users | Price | MRR |
|------|-------|-------|-----|
| Analyze | 1,000 | $5 | $5,000 |
| Analyze+Fix | 500 | $15 | $7,500 |
| **Total** | **1,500** | - | **$12,500** |

**ARR**: $150,000
**Margin**: 85% blended

### Realistic Scenario

| Tier | Users | Price | MRR |
|------|-------|-------|-----|
| Analyze | 2,000 | $5 | $10,000 |
| Analyze+Fix | 1,000 | $15 | $15,000 |
| **Total** | **3,000** | - | **$25,000** |

**ARR**: $300,000
**Margin**: 85% blended

---

## Implementation Timeline

### Week 1 (November 27 - December 4)
- [x] Approve pricing strategy (this document)
- [ ] Update all marketing documents
- [ ] Create comparison charts for website
- [ ] Draft "Two-Tier Pricing Explained" blog post

### Week 2-3 (December 5 - December 18)
- [ ] Update website pricing page
- [ ] Create ROI calculator (savings calculator)
- [ ] Build "Fix Package Download" feature
- [ ] Update API documentation

### Week 4-5 (December 19 - January 1)
- [ ] Beta test with 10 users
- [ ] Gather feedback on tier clarity
- [ ] Adjust if needed

### Month 3 (Price Evaluation)
- [ ] A/B test: $5 vs $6 Analyze tier
- [ ] Monitor conversion rates
- [ ] Survey users: "What would you pay?"

---

## Objection Handling

### "Why should I pay for analysis when GitHub has it built-in?"

**Response**: "GitHub shows you problems. CodeQual teaches you WHY they matter and gives you fix prompts that work with your existing AI tools. It's like having a senior developer review every PR -- for $5/month."

### "Why is Analyze+Fix 3x the price of Analyze?"

**Response**: "With Analyze, you use your own AI to apply fixes. With Analyze+Fix, we run the AI for you -- one-click fixes, automatic PR creation, and fix verification. The $10 difference covers our AI costs and saves you time."

### "I already use Cursor. Why do I need CodeQual?"

**Response**: "Cursor is great at applying fixes, but it doesn't analyze your code for issues. CodeQual finds the problems (security, quality, performance), teaches you why they matter, and gives you fix prompts that work perfectly in Cursor. Think of it as the intelligence layer that makes Cursor even better."

### "This is too cheap. Is the quality good?"

**Response**: "We use the same static analysis tools as enterprise competitors (PMD, Semgrep, SpotBugs) plus AI agents for deeper insights. Our cost advantage comes from efficient architecture (issue grouping, optimized AI models), not cutting corners on quality. Try it free and compare the results yourself."

---

## Success Metrics

### Month 3
- Analyze → Analyze+Fix upgrade rate: >10%
- Free → Analyze conversion: >5%
- ARPU: >$8
- Churn: <10% monthly

### Month 6
- 1,500+ paid users
- $12,500+ MRR
- NPS: >50
- Analyze:Analyze+Fix ratio: 60:40

### Month 12
- 3,000+ paid users
- $25,000+ MRR
- Ready for Series A ($300k+ ARR)

---

## Document Control

**Last Updated**: November 27, 2025
**Next Review**: February 27, 2026 (Month 3 post-implementation)
**Owner**: Founder / Strategic Business Owner
**Status**: APPROVED - ACTIVE

---

## Related Documents

- `/docs/marketing/REVISED_STRATEGY_NOV_2025.md` - Marketing strategy (update with new pricing)
- `/docs/marketing/COST_ADVANTAGE_MESSAGING.md` - Cost messaging (update with new pricing)
- `/docs/marketing/marketing-plan.md` - Full marketing plan (update pricing section)
- `/docs/business-intelligence/strategic-guidance/2025-11-27-fix-delivery-strategy.md` - Fix delivery analysis
