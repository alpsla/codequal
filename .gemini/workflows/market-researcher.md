---
description: Market intelligence and competitive analysis research
---

# Market Researcher Workflow

**Purpose**: Provide competitive intelligence, market monitoring, developer sentiment tracking, and industry trend analysis.

**When to use**: Competitive analysis, pricing research, developer sentiment tracking, market opportunity identification.

**Trigger**: "Run market researcher" or "MR analysis"

## Workflow Steps

### Phase 1: Read Internal Context (REQUIRED)

1. Read all files in `docs/marketing/`:
   - marketing-plan.md (competitive analysis context)
   - COST_ADVANTAGE_MESSAGING.md (our positioning)
   - COST_ANALYSIS.md (cost comparisons)

2. Read `packages/agents/src/two-branch/docs/planning/COST_ANALYSIS.md`
   - Current cost structure
   - Competitive cost comparisons

### Phase 2: Check Previous Intelligence (REQUIRED)

3. Read recent market research:
   - `docs/market-research/competitive-briefs/` (last 4 weeks)
   - `docs/market-research/competitor-profiles/` (all)
   - `docs/market-research/sentiment-analysis/` (last 3 months)
   - `docs/market-research/pricing-intelligence/` (last 6 months)

### Phase 3: Understand Request Context

Determine:
- Is this a request from Business Owner? (need concise intel)
- Is this a user direct request? (need detailed report)
- What timeframe is relevant? (this week, month, quarter)
- Which competitors are relevant?
- What's the strategic question being answered?

### Phase 4: Conduct Targeted Research

**Research Sources:**

**Competitor Websites:**
- Pricing pages (check for changes)
- Feature pages (track new features)
- Blog posts (monitor announcements)
- Documentation (understand capabilities)
- Case studies (learn about customers)

**Review Sites:**
- G2 Crowd: User reviews and ratings
- Gartner Peer Insights: Enterprise reviews
- Capterra: SMB reviews
- TrustRadius: Detailed reviews
- ProductHunt: Launch feedback

**Social Listening:**
- Twitter/X: Search "code review tools", "static analysis", "code quality"
- Reddit: r/programming, r/devops, r/softwareengineering
- Hacker News: Search for competitor mentions
- Stack Overflow: Questions about tools

**Industry Intelligence:**
- TechCrunch: Funding announcements
- The New Stack: Developer tool trends
- InfoQ: Enterprise development trends
- Crunchbase: Funding rounds

### Phase 5: Analyze Findings

**Primary Competitors (Tier 1):**
- SonarQube Cloud ($12-24/user/month)
- Snyk Code ($24-40/user/month)
- GitHub Copilot ($10-39/user/month)
- Codacy ($15-30/user/month)

**Secondary Competitors (Tier 2):**
- DeepSource ($20/user)
- CodeClimate ($10-50/user)
- Qodana (JetBrains)
- Coverity (Synopsys)
- Checkmarx

**Analysis Focus:**
- Pricing changes
- New features announced
- Marketing message shifts
- Customer sentiment
- Market positioning

### Phase 6: Generate Intelligence Report

**For Business Owner Requests (Concise):**

```markdown
## Quick Intelligence Brief

**Key Finding:** [2-3 sentence summary]

**Evidence:**
- [Specific data point 1]
- [Specific data point 2]
- [Specific data point 3]

**Recommendation:** [Actionable recommendation]

**Full Report:** [Link to detailed report]
```

**For Detailed Analysis:**

```markdown
## Market Intelligence Report - [Date]

### 🚨 Critical Updates
[Any significant competitor moves requiring immediate attention]

### Competitor Activity Summary

**SonarQube**
- Pricing: [Current pricing, any changes]
- Features: [New features or announcements]
- Marketing: [New campaigns, messaging changes]
- Sentiment: [Summary of reviews, social mentions]

**Snyk**
[Same structure]

**GitHub Copilot**
[Same structure]

**Codacy**
[Same structure]

### Emerging Competitors
[Any new tools or companies entering the space]

### Market Trends
1. [Trend 1 with evidence]
2. [Trend 2 with evidence]
3. [Trend 3 with evidence]

### Developer Sentiment Insights
- Top pain points mentioned: [List]
- Most requested features: [List]
- Tool satisfaction trends: [Analysis]

### Opportunities Identified
1. [Opportunity with evidence]
2. [Opportunity with evidence]

### Recommended Actions
[Specific recommendations for strategic consideration]
```

### Phase 7: Save Report

Save to appropriate location in `/docs/market-research/`:

**Competitive Briefs (Weekly):**
```
/docs/market-research/competitive-briefs/YYYY-MM-DD-weekly-brief.md
```

**Competitor Profiles (Deep Dives):**
```
/docs/market-research/competitor-profiles/[competitor-name]-YYYY-MM.md
```

**Sentiment Analysis (Monthly):**
```
/docs/market-research/sentiment-analysis/YYYY-MM-developer-sentiment.md
```

**Pricing Intelligence:**
```
/docs/market-research/pricing-intelligence/YYYY-MM-pricing-analysis.md
```

**Market Opportunities:**
```
/docs/market-research/opportunities/YYYY-MM-DD-[opportunity-name].md
```

## Research Workflows

### Daily Monitoring
**Trigger**: "Run market researcher daily check"

**Steps:**
1. Check Twitter for competitor mentions
2. Scan Hacker News front page
3. Check Reddit r/programming hot posts
4. Monitor competitor blogs
5. Google News alerts
6. Generate digest if significant findings

### Weekly Competitive Brief
**Trigger**: "Run market researcher weekly brief"

**Steps:**
1. Deep dive on each Tier 1 competitor
2. Check for pricing changes
3. Review new blog posts/announcements
4. Scan recent reviews on G2/Capterra
5. Monitor social media sentiment
6. Quick scan of Tier 2 competitors
7. Identify new competitors
8. Compile weekly report
9. Flag urgent items

### Monthly Market Report
**Trigger**: "Run market researcher monthly report"

**Steps:**
1. Comprehensive competitor analysis
2. Feature comparison matrix update
3. Pricing analysis and trends
4. Marketing message analysis
5. Customer review sentiment analysis
6. Market trend analysis
7. Developer sentiment analysis
8. Opportunity identification
9. Generate monthly report

### Ad-Hoc Research
**Trigger**: "Run market researcher for [specific request]"

**Examples:**
- "Research pricing for SonarQube"
- "What are developers saying about Snyk?"
- "Analyze new competitor CodeAnalyzer AI"
- "Find case studies of companies switching from competitors"

## Common Use Cases

### Competitive Pricing Analysis
**Request**: "Get latest pricing from SonarQube, Snyk, Codacy"

**Output**: Concise pricing comparison with our advantage highlighted

### Developer Sentiment Check
**Request**: "What are developers saying about code review tools this month?"

**Output**: Sentiment analysis with pain points and feature requests

### Competitor Feature Analysis
**Request**: "What's GitHub Copilot Enterprise adding?"

**Output**: Feature analysis with competitive implications

### Market Opportunity Research
**Request**: "What market segments are underserved?"

**Output**: Market gap analysis with opportunity sizing

## Integration with Business Owner

This workflow is often triggered BY the Business Owner workflow when external market context is needed:

**Orchestration Example:**
1. Business Owner identifies need for competitive intelligence
2. Triggers Market Researcher: "Get competitor pricing"
3. Market Researcher conducts research
4. Returns concise intelligence brief
5. Business Owner incorporates into strategic analysis

## Response Format for Business Owner

When invoked by Business Owner, provide:

**Concise Summary (2-3 sentences):**
- What's the key finding?
- What does it mean for CodeQual?
- What action is recommended?

**Supporting Evidence (bullet points):**
- Specific data points
- Competitor quotes or features
- Developer sentiment examples
- Market trends

**Full Report Reference:**
- Where detailed findings are saved
- Link to report file

## Success Criteria

✅ All required context documents read
✅ Previous intelligence reviewed
✅ Targeted research conducted
✅ Findings analyzed and synthesized
✅ Report generated (concise or detailed as needed)
✅ Report saved to correct location
✅ Actionable recommendations provided
✅ If for Business Owner, concise brief provided
