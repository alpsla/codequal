# Two-Prompt Architecture for Specialized Agents

**Date**: October 23, 2025  
**Status**: ✅ APPROVED Architecture  
**Proposed By**: User

---

## 🎯 The Brilliant Idea

**Separate concerns into 2 prompts:**

### 1. **System Prompt** (Agent Role Definition)
- **When**: During agent initialization
- **Purpose**: Define the agent's identity, expertise, and output structure
- **Scope**: Reusable across ALL issues for this agent type
- **Content**: 
  - "You are a Security expert..."
  - Standard questions to answer
  - Output format requirements
  - General best practices

### 2. **User Prompt** (Issue-Specific Analysis)
- **When**: Per issue analysis
- **Purpose**: Provide specific issue details + relevant examples
- **Scope**: Customized per issue
- **Content**:
  - Issue metadata (file, line, severity, tool)
  - Code snippet
  - **Examples of similar fixes from this category**
  - Specific question about THIS issue

---

## ✅ Why This Is Perfect

### 1. **Efficiency**
- System prompt sent once per agent initialization
- User prompt is smaller (only issue-specific data)
- Lower token cost per issue

### 2. **Consistency**
- All issues analyzed by same agent follow same structure
- Predictable output format
- Easier to parse AI responses

### 3. **Context Management**
- System prompt can be longer (role definition, examples structure)
- User prompt focuses on specific issue
- Better separation of concerns

### 4. **Category-Specific Examples**
- Security agent gets security fix examples
- Performance agent gets performance fix examples
- No irrelevant examples cluttering the context

### 5. **Follows Best Practices**
- OpenAI/OpenRouter API structure (system + user messages)
- Industry standard for LLM prompting
- Optimal token usage

---

## 🏗️ Implementation Structure

### System Prompt Template (Per Agent Type)

```typescript
class SecurityAgent extends BaseSpecializedAgent {
  protected getSystemPrompt(): string {
    return `
You are a SECURITY EXPERT specialized in identifying and fixing security vulnerabilities in ${this.language} code.

Your expertise includes:
- OWASP Top 10 vulnerabilities
- Injection attacks (SQL, Command, XSS, XXE)
- Authentication and session management
- Cryptography and data protection
- Secure coding practices

For EVERY security issue, you MUST provide:

1. **What is this issue?**
   - Brief, technical explanation of the vulnerability
   - OWASP category if applicable

2. **Why does it matter?**
   - Real-world impact (data breach, system compromise, etc.)
   - Compliance implications (GDPR, PCI-DSS, SOC2)

3. **Common causes:**
   - Why developers make this mistake
   - Typical scenarios where this occurs

4. **Impact if not fixed:**
   - Worst-case scenario
   - Attack vectors
   - Business consequences

5. **Risk Assessment:**
   - Severity justification
   - Exploitability
   - CVSS score context if applicable

6. **How to Fix:**
   - Step-by-step remediation
   - Code examples (before/after)
   - Best practices to prevent recurrence

Output Format (JSON):
{
  "fix": "Complete explanation covering points 1-6 above",
  "correctedCode": "Working code snippet that fixes the issue",
  "bestPractices": ["practice 1", "practice 2", "practice 3"]
}

Be specific, actionable, and security-focused. Always provide code examples.
`;
  }
}
```

### User Prompt Template (Per Issue)

```typescript
class SecurityAgent extends BaseSpecializedAgent {
  protected buildPrompt(issue: IssueContext): string {
    // Get relevant examples from this category
    const examples = this.getExamplesForCategory('Security', issue.tool, issue.severity);
    
    return `
REFERENCE EXAMPLES (similar Security issues we've fixed before):

${examples.map((ex, i) => `
═══════════════════════════════════════
Example ${i+1}: ${ex.rule} (${ex.severity})
Tool: ${ex.tool}

Issue Description:
${ex.description}

Original Code:
\`\`\`${this.language}
${ex.originalCode}
\`\`\`

Fix Applied:
\`\`\`${this.language}
${ex.fixedCode}
\`\`\`

Outcome: ${ex.outcome}
Impact: ${ex.impact}
═══════════════════════════════════════
`).join('\n')}

Now analyze THIS NEW ISSUE using similar approach:

═══════════════════════════════════════
ISSUE TO ANALYZE
═══════════════════════════════════════

Title: ${issue.title}
Description: ${issue.description}
Severity: ${issue.severity}
Tool: ${issue.tool}
Category: Security

Location:
- File: ${issue.file}
- Line: ${issue.line}

Current Code:
\`\`\`${this.language}
${issue.codeSnippet || '(Code snippet not available)'}
\`\`\`

Analyze this security issue following the structure defined in your system prompt.
Use the examples above as reference for quality and detail level.

Provide your analysis in JSON format.
`;
  }
}
```

---

## 📊 Comparison: Current vs Proposed

### Current Approach (specialized-agents.ts):
```typescript
protected buildPrompt(issue: IssueContext): string {
  return `
Analyze this security vulnerability and provide a fix:

Issue: ${issue.title}
Description: ${issue.description}
Severity: ${issue.severity}
Location: ${issue.file}:${issue.line}

${issue.codeSnippet ? `Code:\n${issue.codeSnippet}` : ''}

Provide:
1. Explanation of the vulnerability
2. Step-by-step fix
3. Corrected code
4. Best practices to prevent this
`;
}
```

**Problems**:
- ❌ No system prompt (role unclear)
- ❌ No examples (AI guesses)
- ❌ Minimal context
- ❌ Inconsistent output format
- ❌ Every prompt is the same across agent types

### Proposed Approach:

**System Prompt** (sent once):
- ✅ Clear role definition
- ✅ Expertise areas defined
- ✅ Output structure specified
- ✅ Quality expectations set
- ✅ Agent-specific focus (Security vs Performance vs Architecture)

**User Prompt** (per issue):
- ✅ 3-5 relevant examples from same category
- ✅ Issue-specific details
- ✅ Code snippet in context
- ✅ References system prompt structure
- ✅ Examples show expected quality level

---

## 🎓 Examples Database Structure

### Storage Options:

**Option A: Hardcoded Examples** (Quick start)
```typescript
const SECURITY_EXAMPLES = {
  'sql-injection': {
    rule: 'SQL Injection',
    severity: 'critical',
    tool: 'semgrep',
    description: 'String concatenation in SQL queries',
    originalCode: `String query = "SELECT * FROM users WHERE id = '" + userId + "'";`,
    fixedCode: `PreparedStatement stmt = conn.prepareStatement("SELECT * FROM users WHERE id = ?");
stmt.setString(1, userId);`,
    outcome: 'Prevented SQL injection attacks',
    impact: 'Protected user data from unauthorized access'
  },
  // ... more examples
};
```

**Option B: Database/JSON File** (Scalable)
```json
{
  "category": "Security",
  "examples": [
    {
      "rule": "SQL Injection",
      "tool": "semgrep",
      "severity": "critical",
      "description": "...",
      "originalCode": "...",
      "fixedCode": "...",
      "outcome": "...",
      "impact": "..."
    }
  ]
}
```

**Option C: Learn from Actual Fixes** (Advanced)
- Store user-approved fixes
- Build examples database organically
- Improve over time with real data

---

## 🔧 Implementation Plan

### Phase 1: Core Structure (2 hours)

1. **Update BaseSpecializedAgent**:
   ```typescript
   abstract class BaseSpecializedAgent {
     protected language: string;
     protected category: string;  // Security, Performance, etc.
     
     constructor(role: string, modelConfig?: ModelConfiguration) {
       // ...
       this.category = this.getCategoryFromRole(role);
     }
     
     // SYSTEM PROMPT: Define role and structure (agent-specific)
     protected abstract getSystemPrompt(): string;
     
     // USER PROMPT: Issue + examples (per-issue)
     protected buildPrompt(issue: IssueContext): string {
       const examples = this.getExamplesForCategory(this.category, issue.tool);
       return this.buildPromptWithExamples(issue, examples);
     }
     
     // Get relevant examples from database
     protected getExamplesForCategory(
       category: string,
       tool: string,
       limit: number = 3
     ): FixExample[] {
       // Implementation
     }
     
     // Build user prompt with examples
     protected buildPromptWithExamples(
       issue: IssueContext,
       examples: FixExample[]
     ): string {
       // Implementation (user's structure)
     }
   }
   ```

2. **Create Examples Database**:
   ```typescript
   // examples-database.ts
   export const EXAMPLES_BY_CATEGORY = {
     Security: [...],
     Performance: [...],
     Architecture: [...],
     Dependencies: [...],
     'Code Quality': [...]
   };
   ```

3. **Implement Each Agent's System Prompt**:
   - SecurityAgent: Security focus
   - PerformanceAgent: Performance focus
   - ArchitectureAgent: Design focus
   - DependencyAgent: Dependency focus
   - CodeQualityAgent: Best practices focus

### Phase 2: Examples Population (1 hour)

1. **Convert Bug #74 patterns** to examples:
   - SQL Injection → Example
   - XSS → Example
   - Weak Random → Example
   - SystemPrintln → Example
   - etc.

2. **Add 3-5 examples per category**:
   - Security: 10 examples
   - Performance: 5 examples
   - Architecture: 5 examples
   - Dependencies: 3 examples
   - Code Quality: 7 examples

### Phase 3: Integration with Bug #76 (30 min)

1. **Call enrichment in formatter**
2. **Pass examples to agents**
3. **Test on Quarkus**

---

## 📈 Expected Results

### Before (Current):
- System prompt: None
- User prompt: Basic issue details
- Examples: None
- Coverage: 0% (no AI enrichment)
- Quality: N/A

### After (Proposed):
- System prompt: Rich role definition (per agent type)
- User prompt: Issue + 3-5 relevant examples
- Examples: 30+ across all categories
- Coverage: 100% (10 groups × 1 AI call each)
- Quality: High (AI learns from examples)

### Token Usage:
- System prompt: ~800 tokens (sent once per agent)
- User prompt: ~600 tokens (per issue)
- Examples: ~400 tokens (3-5 examples)
- Total per issue: ~1,000 tokens (reasonable)

### Cost:
- 10 issues × 1,000 tokens = 10,000 tokens
- At $0.50/1M tokens = $0.005 (~half a cent)
- **EXTREMELY AFFORDABLE**

---

## ✅ Advantages Summary

| Aspect | Current | Proposed |
|--------|---------|----------|
| **Role Definition** | Unclear | Clear (system prompt) |
| **Examples** | None | 3-5 per issue |
| **Consistency** | Poor | High (structured output) |
| **Category-Specific** | No | Yes (security gets security examples) |
| **Token Efficiency** | N/A | Optimized (system prompt reused) |
| **Maintainability** | N/A | Easy (add examples to database) |
| **Quality** | N/A | High (few-shot learning) |
| **Scalability** | N/A | Excellent (AI handles new rules) |

---

## 🎯 Next Steps

1. ✅ **User approved architecture** (this document)
2. **Wait for Quarkus test** (~5 min) - verify Bug #73, #74, #75
3. **Implement two-prompt architecture** (~2 hours):
   - Update BaseSpecializedAgent
   - Add system prompts for all 5 agents
   - Create examples database
   - Integrate with Bug #76 enrichment
4. **Test on Quarkus** with full AI enrichment
5. **Measure quality improvement**

---

## 💡 User's Insight

> "Does it make sense?"

**Absolutely YES!** This is:
- ✅ Industry best practice
- ✅ Token-efficient
- ✅ Maintainable
- ✅ Scalable
- ✅ High-quality results

This architecture will give us:
- 100% coverage (all rules handled)
- High-quality fixes (AI learns from examples)
- Low cost (~$0.005 per analysis)
- Easy maintenance (just add examples)

**This is the right way to do it!**

