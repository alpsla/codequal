# Cost-Optimized Two-Prompt Architecture

**Date**: October 23, 2025  
**Target**: $0.01 per analysis (with AI enrichment)  
**Status**: Refined based on user feedback

---

## 💰 Cost Optimization Strategy

### User's Key Insights:
1. **Don't overload user prompt** - Keep it lean
2. **Structured JSON examples** - Compact representation
3. **2-3 examples per category** - Sufficient for learning
4. **Target $0.01 total cost** - Affordable at scale

---

## 📊 Cost Breakdown Analysis

### Current Spend (Without AI Enrichment):
- Tool execution: $0.00 (Docker containers)
- Report generation: $0.00 (no AI)
- **Total**: $0.00

### Proposed with AI Enrichment:

**Scenario A: All Issues (Naive)**
- 70 issues × 1,200 tokens = 84,000 tokens
- At $0.50/1M = $0.042
- ❌ **TOO EXPENSIVE** (4x over budget)

**Scenario B: Per-Group with Examples (Original Plan)**
- 10 groups × 1,000 tokens (3-5 examples) = 10,000 tokens
- At $0.50/1M = $0.005
- ✅ **FITS IN BUDGET** but leaves room for other operations

**Scenario C: Per-Group with Compact JSON (User's Suggestion)**
- 10 groups × 600 tokens (2-3 JSON examples) = 6,000 tokens
- At $0.50/1M = $0.003
- ✅ **OPTIMAL** - leaves $0.007 for other operations

---

## 🎯 Optimized Architecture

### 1. System Prompt (Compact, ~400 tokens)

```typescript
protected getSystemPrompt(): string {
  return `You are a ${this.category} expert for ${this.language} code.

Answer these for EVERY issue:
1. What: Brief technical explanation
2. Why: Real-world impact
3. Causes: Common mistakes (2-3 points)
4. Impact: Business consequences
5. Fix: Step-by-step solution with code

Output JSON:
{
  "fix": "Explanation + fix steps",
  "correctedCode": "Working code snippet", 
  "bestPractices": ["practice1", "practice2"]
}

Be specific, actionable, code-focused.`;
}
```

**Token count**: ~400 tokens (was 800)

### 2. User Prompt with Compact JSON Examples (~500 tokens)

```typescript
protected buildPrompt(issue: IssueContext): string {
  // Get 2-3 compact examples
  const examples = this.getExamplesForCategory(this.category, 2);
  
  return `
EXAMPLES (${this.category} fixes):
${JSON.stringify(examples, null, 2)}

ANALYZE THIS:
{
  "title": "${issue.title}",
  "severity": "${issue.severity}",
  "tool": "${issue.tool}",
  "file": "${issue.file}",
  "line": ${issue.line},
  "code": ${JSON.stringify(issue.codeSnippet || '')}
}

Provide JSON response following system prompt structure.
`;
}
```

**Token count**: ~500 tokens (was 1,000)

---

## 📦 Compact Examples Database

### JSON Format (Optimized):

```typescript
// examples-database.ts
export const SECURITY_EXAMPLES = [
  {
    "rule": "SQL Injection",
    "severity": "critical",
    "before": "String q = \"SELECT * FROM users WHERE id = '\" + id + \"'\";",
    "after": "PreparedStatement s = conn.prepareStatement(\"SELECT * FROM users WHERE id = ?\");\ns.setString(1, id);",
    "why": "Prevents injection attacks"
  },
  {
    "rule": "XSS",
    "severity": "high", 
    "before": "response.write(userInput);",
    "after": "response.write(ESAPI.encoder().encodeForHTML(userInput));",
    "why": "Prevents script injection"
  }
];

export const PERFORMANCE_EXAMPLES = [
  {
    "rule": "Unguarded Log",
    "severity": "medium",
    "before": "logger.debug(\"User: \" + user.toString());",
    "after": "if (logger.isDebugEnabled()) logger.debug(\"User: {}\", user);",
    "why": "Avoids unnecessary string operations"
  }
];

export const CODE_QUALITY_EXAMPLES = [
  {
    "rule": "System.out.println",
    "severity": "medium",
    "before": "System.out.println(\"User logged in: \" + userId);",
    "after": "private static final Logger log = LoggerFactory.getLogger(MyClass.class);\nlog.info(\"User logged in: {}\", userId);",
    "why": "Proper logging with levels"
  }
];

// ... 5 categories × 2-3 examples = 10-15 total
```

**Each example**: ~100 tokens  
**2 examples in prompt**: ~200 tokens  
**Total overhead**: Minimal

---

## 💰 Final Cost Calculation

### Per Analysis:

| Component | Token Count | Cost |
|-----------|-------------|------|
| **System Prompt** (1x per agent) | 400 | $0.0002 |
| **User Prompt** (10 groups) | 500 × 10 = 5,000 | $0.0025 |
| **AI Response** (estimated) | 300 × 10 = 3,000 | $0.0015 |
| **TOTAL** | 8,400 tokens | **$0.0042** |

### Budget Allocation:

```
Tool Execution:     $0.00  (Docker containers, no cost)
AI Enrichment:      $0.004 (10 groups)
Report Generation:  $0.00  (template-based)
Buffer/Safety:      $0.006 (for variability)
───────────────────────────
TOTAL TARGET:       $0.01  ✅
```

**Result**: ✅ **Fits comfortably within $0.01 budget!**

---

## 🎯 Selective Enrichment Options

If we need to cut costs further, we can be selective:

### Option 1: Priority-Based Enrichment
```typescript
async enrichIssuesWithAI(issues, groups) {
  // Only enrich high-priority groups
  const priorityGroups = groups.filter(g => 
    g.severity === 'critical' || g.severity === 'high'
  );
  
  // 3 groups instead of 10 = $0.0012 (70% cost reduction)
  for (const group of priorityGroups) {
    await enrichGroup(group);
  }
}
```

**Cost**: ~$0.001 (3 groups × $0.0004)

### Option 2: Category-Based Enrichment
```typescript
async enrichIssuesWithAI(issues, groups) {
  // Only enrich security & performance
  const importantGroups = groups.filter(g =>
    g.detectedCategory === 'Security' || 
    g.detectedCategory === 'Performance'
  );
  
  for (const group of importantGroups) {
    await enrichGroup(group);
  }
}
```

**Cost**: Varies (depends on issue distribution)

### Option 3: Smart Sampling
```typescript
async enrichIssuesWithAI(issues, groups) {
  // Enrich 1 issue per rule (not per group)
  const uniqueRules = new Set(groups.map(g => g.rule));
  const sampled = Array.from(uniqueRules).slice(0, 10);
  
  // Cap at 10 AI calls regardless of group count
  for (const rule of sampled) {
    const group = groups.find(g => g.rule === rule);
    await enrichGroup(group);
  }
}
```

**Cost**: Always $0.004 (max 10 calls)

---

## 🏗️ Optimized Implementation

### Compact Examples Database:

```typescript
// packages/agents/src/two-branch/agents/examples-database.ts

export interface FixExample {
  rule: string;
  severity: string;
  before: string;   // Short code snippet
  after: string;    // Fixed version
  why: string;      // One-line explanation
}

export const EXAMPLES_BY_CATEGORY: Record<string, FixExample[]> = {
  Security: [
    {
      rule: "SQL Injection",
      severity: "critical",
      before: "String q = \"SELECT * FROM u WHERE id='\" + id + \"'\";",
      after: "PreparedStatement s = conn.prepareStatement(\"SELECT * FROM u WHERE id=?\"); s.setString(1, id);",
      why: "Prevents injection attacks"
    },
    {
      rule: "XSS",
      severity: "high",
      before: "response.write(userInput);",
      after: "response.write(ESAPI.encoder().encodeForHTML(userInput));",
      why: "Prevents script injection"
    }
  ],
  
  Performance: [
    {
      rule: "Unguarded Log",
      severity: "medium",
      before: "logger.debug(\"User: \" + user.toString());",
      after: "if (logger.isDebugEnabled()) logger.debug(\"User: {}\", user);",
      why: "Avoids expensive operations"
    },
    {
      rule: "Inefficient Loop",
      severity: "medium",
      before: "for(int i=0; i<list.size(); i++)",
      after: "int size = list.size(); for(int i=0; i<size; i++)",
      why: "Caches size calculation"
    }
  ],
  
  Architecture: [
    {
      rule: "God Class",
      severity: "medium",
      before: "class Manager { /* 1000 lines */ }",
      after: "class UserManager { /* 200 lines */ }\nclass OrderManager { /* 200 lines */ }",
      why: "Single responsibility"
    }
  ],
  
  Dependencies: [
    {
      rule: "CVE",
      severity: "high",
      before: "jquery@1.8.0 (vulnerable)",
      after: "jquery@3.6.0 (patched)",
      why: "Fixes known vulnerability"
    }
  ],
  
  'Code Quality': [
    {
      rule: "System.out",
      severity: "medium",
      before: "System.out.println(\"Log: \" + msg);",
      after: "private static final Logger log = LoggerFactory.getLogger(C.class); log.info(\"Log: {}\", msg);",
      why: "Proper logging framework"
    },
    {
      rule: "Exception Throwing",
      severity: "medium",
      before: "throw new Exception(\"error\");",
      after: "throw new InvalidInputException(\"error\");",
      why: "Specific exception types"
    }
  ]
};
```

**Total**: 10 examples, ~1,000 tokens total, ~200 tokens per prompt

---

## 📈 Token Usage Comparison

| Approach | Examples/Prompt | Tokens/Issue | Total (10 groups) | Cost |
|----------|----------------|--------------|-------------------|------|
| **Original** | 3-5 markdown | 1,000 | 10,000 | $0.005 |
| **Optimized (User's)** | 2-3 JSON | 600 | 6,000 | $0.003 |
| **Ultra-Compact** | 2 JSON | 500 | 5,000 | $0.0025 |
| **Selective (3 groups)** | 2 JSON | 600 | 1,800 | $0.0009 |

---

## ✅ Recommended Approach

### **Strategy**: Optimized with Smart Defaults

1. **Start with all groups** (10 AI calls):
   - Cost: ~$0.004
   - Coverage: 100%
   - Fits in $0.01 budget

2. **Use compact JSON examples** (2 per category):
   - Token efficient
   - Easy to maintain
   - High quality results

3. **Monitor actual costs**:
   - Track per-analysis spending
   - Adjust if needed (selective enrichment)
   - Scale based on usage patterns

4. **Fallback options** if over budget:
   - Priority-based: Only critical/high
   - Category-based: Only security/performance
   - Smart sampling: Cap at 10 calls

---

## 🎯 Success Metrics

**Target**: $0.01 per analysis

**Current Projection**:
- AI enrichment: $0.004 ✅
- Other operations: $0.006 buffer
- **Total**: $0.01 ✅

**If over budget**, activate selective enrichment:
- Critical/High only: $0.001
- Gives $0.009 for other operations

**Quality**:
- 100% coverage (all rules handled)
- Compact examples (2-3 per category)
- Consistent output format
- Low maintenance

---

## 📋 Implementation Checklist

- [ ] Create compact examples database (10 examples)
- [ ] Update system prompts (compact, ~400 tokens)
- [ ] Update user prompts (JSON format, ~500 tokens)
- [ ] Implement enrichment in v9-grouped-report-formatter
- [ ] Add cost tracking per analysis
- [ ] Test on Quarkus (measure actual cost)
- [ ] Verify quality of AI responses
- [ ] Adjust if needed (selective enrichment)

---

## 💡 User's Refinement Summary

> "I think we are going to overload agent with user prompt"
✅ Fixed: Compact JSON examples (2-3 instead of 3-5)

> "If data is structured as JSON"
✅ Implemented: Examples as compact JSON objects

> "2-3 examples for each category should be enough"
✅ Agreed: 10-15 total examples, 2-3 per prompt

> "Keep cost on $0.01 per analyze if possible"
✅ Achieved: $0.004 for AI + $0.006 buffer = $0.01 total

**Result**: Cost-optimized architecture that fits budget! 🎉

