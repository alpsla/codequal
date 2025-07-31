# Cost Analysis Examples - Dynamic Model Selection

## Real-World Repository Examples

### Example 1: E-Commerce Platform (TypeScript)

**Repository Profile:**
- 1,200 files analyzed
- 45 security issues (5 critical, 15 high)
- 30% payment processing files
- 25% authentication files
- Large repository

**Dynamic Weight Calculation:**
```
Base weights: Quality=0.4, Speed=0.2, Cost=0.3, Recency=0.1

Adjustments:
+ Large repo: Quality +0.2, Cost -0.1
+ Security files >30%: Quality +0.15, Cost -0.15
+ Critical issues: Quality +0.1, Speed +0.05, Cost -0.15

Final weights (normalized):
- Quality: 0.852 (85.2%)
- Speed: 0.126 (12.6%)
- Cost: 0.011 (1.1%)
- Recency: 0.011 (1.1%)
```

**Model Research Result:**
- Researcher discovers: Latest security-focused model
- Estimated tokens: 2.4M input, 0.72M output
- Cost calculation: ~$0.24

---

### Example 2: Open Source Library (JavaScript)

**Repository Profile:**
- 80 files analyzed
- 8 low-severity issues
- 70% test files
- 20% documentation
- Small repository

**Dynamic Weight Calculation:**
```
Base weights: Quality=0.4, Speed=0.2, Cost=0.3, Recency=0.1

Adjustments:
+ Small repo: Quality -0.1, Cost +0.1
+ Test/docs >50%: Quality -0.15, Cost +0.15

Final weights (normalized):
- Quality: 0.150 (15%)
- Speed: 0.200 (20%)
- Cost: 0.550 (55%)
- Recency: 0.100 (10%)
```

**Model Research Result:**
- Researcher discovers: Cost-efficient latest model
- Estimated tokens: 0.16M input, 0.048M output
- Cost calculation: ~$0.05

---

### Example 3: Healthcare API (Python)

**Repository Profile:**
- 450 files analyzed
- 25 issues (2 critical performance)
- 35% data processing files
- 30% API endpoints
- Medium repository

**Dynamic Weight Calculation:**
```
Base weights: Quality=0.4, Speed=0.2, Cost=0.3, Recency=0.1

Adjustments:
+ Performance files >30%: Quality +0.15, Cost -0.15
+ Critical issues: Quality +0.1, Speed +0.05, Cost -0.15

Final weights (normalized):
- Quality: 0.650 (65%)
- Speed: 0.250 (25%)
- Cost: 0.000 (0%)
- Recency: 0.100 (10%)
```

**Model Research Result:**
- Researcher discovers: High-performance analysis model
- Estimated tokens: 0.9M input, 0.27M output
- Cost calculation: ~$0.14

---

## Cost Breakdown by File Types

### Security-Critical Files
- Weight impact: Quality +15%, Cost -15%
- Typical models selected: Premium security-focused
- Average cost: $0.20-0.25

### Performance-Critical Files
- Weight impact: Quality +15%, Cost -15%
- Typical models selected: Advanced performance analysis
- Average cost: $0.18-0.22

### Test Files
- Weight impact: Quality -15%, Cost +15%
- Typical models selected: Efficient, fast models
- Average cost: $0.04-0.08

### Documentation
- Weight impact: Quality -15%, Cost +15%
- Typical models selected: Basic analysis models
- Average cost: $0.03-0.06

### Core Business Logic
- Weight impact: None (baseline)
- Typical models selected: Balanced models
- Average cost: $0.10-0.15

---

## Monthly Cost Projections

### Small Team (10 PRs/month)
```
Distribution assumption:
- 3 small repos (test heavy): 3 × $0.05 = $0.15
- 5 medium repos (balanced): 5 × $0.13 = $0.65
- 2 large repos (security): 2 × $0.24 = $0.48

Monthly total: $1.28
Annual: $15.36
```

### Medium Team (50 PRs/month)
```
Distribution assumption:
- 15 small repos: 15 × $0.05 = $0.75
- 25 medium repos: 25 × $0.13 = $3.25
- 10 large repos: 10 × $0.24 = $2.40

Monthly total: $6.40
Annual: $76.80
```

### Enterprise Team (200 PRs/month)
```
Distribution assumption:
- 60 small repos: 60 × $0.05 = $3.00
- 100 medium repos: 100 × $0.13 = $13.00
- 40 large repos: 40 × $0.24 = $9.60

Monthly total: $25.60
Annual: $307.20
```

---

## Cost Optimization Tips

### 1. Repository Structure
- Separate test files into dedicated directories
- Keep documentation in clearly marked folders
- This allows the system to identify and optimize costs

### 2. PR Strategy
- Batch non-critical changes together
- Separate security/performance fixes into focused PRs
- This ensures appropriate model selection

### 3. Configuration
- Review weight calculations in logs
- Adjust base weights if needed for your use case
- Monitor actual vs estimated costs

---

## ROI Analysis

### Cost vs Manual Review
- Manual code review: ~2 hours @ $100/hour = $200
- AI analysis: ~$0.13 average
- Savings: 99.94%

### Quality Impact
- Consistent analysis across all PRs
- No reviewer fatigue
- 24/7 availability
- Standardized reporting

### Time Savings
- Manual review: 2-4 hours
- AI analysis: 30-60 seconds
- Time saved: 99.5%

---

*Updated: July 31, 2025*