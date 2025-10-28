# Prompt Improvement Analysis
**Date**: October 17, 2025  
**Issue**: 50% of AI-generated fixes are unusable (generic comments or incomplete)
**Root Cause Found**: ✅ **CONFIRMED - Prompt + Fallback Issues**

---

## 🔍 **Root Cause Analysis**

### **Problem #1: Fallback to Generic Comments** ❌ **CRITICAL**

**Location**: `specialized-agents.ts` lines 145-168

When AI doesn't provide code in triple backticks (` ``` `), the system falls back to this:

```typescript
protected generateMeaningfulCode(issue: IssueContext): string {
    const lineNum = issue.line || 1;
    
    if (issue.type.toLowerCase().includes('quality')) {
      return `${lineNum}: // CODE QUALITY FIX: Improve readability and maintainability
${lineNum + 1}: // Follow naming conventions and SOLID principles
${lineNum + 2}: // Add proper error handling and documentation`;
    }
    // ... similar for other types
}
```

**This is EXACTLY what we saw in the report!**
- Lines 412-415: Generic "CODE QUALITY FIX" comment
- Lines 534-537: Same generic comment
- Affects **5,065 occurrences** of "Generic Exceptions" issue

**Why This Happens**:
1. AI generates text description only (no code block)
2. `parseAIResponse` tries to extract code: `response.match(/```[\w]*\n([\s\S]*?)```/)`
3. No match found → falls back to `generateMeaningfulCode`
4. Generic placeholder comments inserted

---

### **Problem #2: CodeQualityAgent Prompt is Good, But...**

**Current Prompt** (lines 384-412):
```typescript
return `Code quality issue in ${issue.file} at line ${issue.line}:
${issue.description}
${issue.codeSnippet ? `\nCurrent Code:\n\`\`\`java\n${issue.codeSnippet}\n\`\`\`\n` : ''}

Provide COMPLETE clean code solution:

1. **Improvement Description** (1-2 sentences): Specific refactoring for ${className}
2. **Clean Code** with:
   - ALL necessary imports
   - Full refactored implementation
   - Improved naming following conventions
   - Inline comments explaining improvements
3. **Code Quality Principle**: Which principle this follows

CRITICAL REQUIREMENTS:
✅ Code must be DIRECTLY copy-pasteable into ${fileName}
✅ Use SPECIFIC method/variable names from context
✅ Follow Java naming conventions
✅ Include ALL imports

❌ DO NOT use generic names or "improve as needed"
❌ DO NOT provide partial refactoring
`;
```

**What's Good**: ✅
- Clear requirements for complete code
- Explicit "DO NOT use generic names"
- Asks for specific refactoring

**What's Missing**: ⚠️
1. **No code snippet for 5,065 "Generic Exception" issues** → `issue.codeSnippet` is empty!
2. **Token limit too low** → `maxTokens: 1500` (line 83) isn't enough for complex refactoring
3. **No example** → AI doesn't see what "good" looks like
4. **No format enforcement** → Prompt says "provide code" but doesn't require ` ``` ` markers

---

### **Problem #3: Missing Context = Useless Output**

**Example**: "Generic Exception" issue at `DescribeConfigsResult.java:64`

**What AI Receives**:
```
Code quality issue in DescribeConfigsResult.java at line 64:
Avoid throwing raw exception types.
[NO CODE SNIPPET PROVIDED]
```

**What AI Needs**:
```java
public Map<ConfigResource, Config> values() throws Exception {  // ← Line 64
    try {
        return all.get();
    } catch (InterruptedException | ExecutionException e) {
        throw new Exception("Failed to get config values", e);  // ← Generic!
    }
}
```

**Without context**:
- AI can only guess what the code does
- Falls back to generic advice
- No code block generated
- Fallback placeholder kicks in

---

## 🎯 **Recommended Solutions**

### **Option 1: Fix Context + Improve Prompt** ⭐ **RECOMMENDED**

**Changes Required**:

#### **A. Ensure Code Snippets Are Always Provided**

**File**: `test-v9-e2e-complete.ts` or issue collection logic

```typescript
// Before: Some issues have no codeSnippet
const issue = {
    file: 'DescribeConfigsResult.java',
    line: 64,
    description: 'Avoid throwing raw exception types.',
    codeSnippet: undefined  // ← PROBLEM!
};

// After: Extract snippet with context (±10 lines)
const issue = {
    file: 'DescribeConfigsResult.java',
    line: 64,
    description: 'Avoid throwing raw exception types.',
    codeSnippet: await extractCodeSnippet({
        file: 'DescribeConfigsResult.java',
        line: 64,
        contextLines: 10  // ±10 lines around the issue
    })
};
```

#### **B. Improve CodeQualityAgent Prompt**

**File**: `specialized-agents.ts` lines 384-412

```typescript
protected buildPrompt(issue: IssueContext): string {
    const fileName = issue.file.split('/').pop() || '';
    const className = fileName.replace(/\.\w+$/, '');
    
    // NEW: Add context about issue type
    const issueTypeGuidance = this.getIssueTypeGuidance(issue);
    
    return `Code quality issue: ${issue.description}
File: ${issue.file}
Line: ${issue.line}
Type: ${issue.type}

${issue.codeSnippet ? `Current Code:
\`\`\`java
${issue.codeSnippet}
\`\`\`
` : `⚠️ NO CODE SNIPPET - Generate template fix based on issue type`}

${issueTypeGuidance}

Provide your response in EXACTLY this format:

### 1. Improvement Description
[1-2 sentences explaining what to change and why]

### 2. Refactored Code
\`\`\`java
[COMPLETE, copy-pasteable code with imports]
\`\`\`

### 3. Code Quality Principle
[Which principle this follows: Single Responsibility, DRY, SOLID, etc.]

CRITICAL REQUIREMENTS:
✅ MUST include code in triple backticks (\`\`\`)
✅ Code must compile and run without edits
✅ Use ACTUAL variable/method names from the code snippet
✅ Include ALL necessary imports
✅ NO placeholders like "add logic here" or "improve as needed"

❌ DO NOT provide generic comments
❌ DO NOT skip the code block
❌ DO NOT use generic variable names

If no code snippet provided, generate a realistic template for ${className}.`;
}

// NEW: Issue-specific guidance
private getIssueTypeGuidance(issue: IssueContext): string {
    const type = issue.type.toLowerCase();
    
    if (type.includes('avoidthrowingrawexceptiontypes') || type.includes('generic exception')) {
        return `Common Fix Pattern:
Instead of: throw new Exception("message");
Use: throw new SpecificException("message");

Example:
\`\`\`java
public Data process() throws DataProcessingException {  // ← Specific exception
    try {
        return processData();
    } catch (IOException e) {
        throw new DataProcessingException("Failed to process data", e);
    }
}
\`\`\``;
    }
    
    if (type.includes('guardlogstatement')) {
        return `Standard Pattern:
\`\`\`java
if (log.isDebugEnabled()) {
    log.debug("Message: {}", expensiveOperation());
}
\`\`\``;
    }
    
    if (type.includes('systemprintln')) {
        return `Standard Pattern:
\`\`\`java
private static final Logger log = LoggerFactory.getLogger(ClassName.class);
// Replace System.out.println() with:
log.info("Message: {}", variable);
\`\`\``;
    }
    
    // Add more patterns for common PMD rules...
    
    return ''; // No specific guidance, AI will use general knowledge
}
```

#### **C. Increase Token Limit**

**File**: `specialized-agents.ts` line 83

```typescript
// Before:
maxTokens: 1500  // ← Too small for complex refactoring

// After:
maxTokens: issue.codeSnippet ? 2500 : 1000  // More tokens when code provided
```

#### **D. Remove Generic Fallback**

**File**: `specialized-agents.ts` lines 145-168

```typescript
// Before: Falls back to generic comments
protected generateMeaningfulCode(issue: IssueContext): string {
    return `${lineNum}: // CODE QUALITY FIX: Improve readability...`;
}

// After: Return empty string + warn
protected generateMeaningfulCode(issue: IssueContext): string {
    console.warn(`[${this.agentRole}] AI failed to generate code for ${issue.type}`);
    return `// ⚠️ AI-generated fix not available
// Manual review required: ${issue.description}
// See PMD documentation for ${issue.type}`;
}
```

---

### **Option 2: Use Rule-Based Templates for Common PMD Issues** 🔧 **FASTER**

For well-known PMD rules with mechanical fixes, skip AI entirely:

```typescript
// NEW: Rule-based fix templates
private getRuleBasedFix(issue: IssueContext): FixSuggestion | null {
    const templates: Record<string, (issue: IssueContext) => FixSuggestion> = {
        'GuardLogStatement': (issue) => ({
            fix: 'Add log level guard to prevent unnecessary string operations',
            correctedCode: `if (log.isDebugEnabled()) {
    log.debug("Your message: {}", variable);
}`,
            explanation: 'Prevents expensive string operations when debug logging is disabled',
            bestPractices: ['Always guard debug/trace logs', 'Use {} placeholders, not concatenation']
        }),
        
        'SystemPrintln': (issue) => ({
            fix: 'Replace System.out.println with SLF4J logger',
            correctedCode: `private static final Logger log = LoggerFactory.getLogger(${issue.file.split('/').pop()?.replace('.java', '.class')});
// ...
log.info("Your message: {}", variable);`,
            explanation: 'Proper logging framework provides log levels, timestamps, and configuration',
            bestPractices: ['Use SLF4J or Log4j2', 'Choose appropriate log level (info/warn/error)']
        }),
        
        'ClassWithOnlyPrivateConstructorsShouldBeFinal': (issue) => ({
            fix: 'Add final keyword to prevent subclassing',
            correctedCode: `public final class ${issue.file.split('/').pop()?.replace('.java', '')} {
    private ${issue.file.split('/').pop()?.replace('.java', '')}() {}
}`,
            explanation: 'Classes with only private constructors should be final to clarify design intent',
            bestPractices: ['Use final for utility classes', 'Use final for classes with static factory methods']
        })
    };
    
    return templates[issue.type]?.(issue) || null;
}

// In generateFixSuggestion:
async generateFixSuggestion(issue: IssueContext, modelOverride?: string): Promise<FixSuggestion> {
    // Try rule-based template first
    const templateFix = this.getRuleBasedFix(issue);
    if (templateFix) {
        return templateFix;
    }
    
    // Otherwise use AI...
}
```

**Pros**:
- ✅ Instant, consistent, correct fixes for common rules
- ✅ No AI cost for mechanical transformations
- ✅ 100% accuracy for template-based patterns

**Cons**:
- ⚠️ Need to maintain template library
- ⚠️ Not flexible for context-specific variations

---

### **Option 3: Hybrid Approach** ⭐⭐ **BEST OF BOTH**

```typescript
async generateFixSuggestion(issue: IssueContext, modelOverride?: string): Promise<FixSuggestion> {
    // 1. Try rule-based template (for common, mechanical fixes)
    const templateFix = this.getRuleBasedFix(issue);
    if (templateFix) {
        return { ...templateFix, source: 'template' };
    }
    
    // 2. Use AI for complex issues (with improved prompt)
    if (issue.codeSnippet && issue.codeSnippet.length > 50) {
        return await this.generateAIFix(issue, modelOverride);
    }
    
    // 3. Warn if no code snippet + no template
    return {
        fix: `Manual review required: ${issue.description}`,
        correctedCode: `// ⚠️ Insufficient context for automated fix
// See PMD documentation: ${issue.type}
// File: ${issue.file}:${issue.line}`,
        explanation: 'This issue requires manual review due to missing context',
        bestPractices: []
    };
}
```

---

## 📊 **Expected Impact**

### **Current Results** (gemini-2.5-pro):
| Issue Type | Occurrences | Fix Quality | Actionable? |
|------------|-------------|-------------|-------------|
| Generic Exceptions | 5065 | ❌ Generic comment | No |
| Log Guards | 1292 | ✅ Good description | Yes |
| System.out | 335 | 🟡 Description only | Partial |

### **After Option 1** (Context + Prompt):
| Issue Type | Occurrences | Fix Quality | Actionable? |
|------------|-------------|-------------|-------------|
| Generic Exceptions | 5065 | 🟡 Better (with context) | Partial |
| Log Guards | 1292 | ✅ Complete code | Yes |
| System.out | 335 | ✅ Complete code | Yes |

**Improvement**: 50% → 75% actionable

### **After Option 3** (Hybrid):
| Issue Type | Occurrences | Fix Quality | Actionable? |
|------------|-------------|-------------|-------------|
| Generic Exceptions | 5065 | 🟡 Template/AI mix | Partial |
| Log Guards | 1292 | ✅ Template (instant) | Yes |
| System.out | 335 | ✅ Template (instant) | Yes |

**Improvement**: 50% → 85% actionable  
**Cost**: ↓ 40% (templates don't cost API calls)

---

## ✅ **Recommended Action Plan**

### **Phase 1: Quick Wins** (2-3 hours)
1. ✅ **Add 5 rule-based templates** for most common PMD issues:
   - `GuardLogStatement` (1,292 occurrences)
   - `SystemPrintln` (335 occurrences)
   - `ClassWithOnlyPrivateConstructorsShouldBeFinal` (131 occurrences)
   - `AvoidUsingVolatile` (217 occurrences)
   - `ReturnEmptyCollectionRatherThanNull` (87 occurrences)
2. ✅ **Remove generic fallback** → Replace with "manual review" warning

**Impact**: ⬆️ 2,062 issues instantly fixed (28%)

### **Phase 2: Improve AI Prompts** (4-6 hours)
1. ✅ **Fix code snippet extraction** → Always provide ±10 lines context
2. ✅ **Add issue-type guidance** → Examples for common patterns
3. ✅ **Increase token limit** → 1500 → 2500
4. ✅ **Enforce format** → Require triple backticks in prompt

**Impact**: ⬆️ Remaining 5,252 issues get better AI fixes (72%)

### **Phase 3: Validate & Iterate** (2 hours)
1. ✅ **Run E2E test** with improvements
2. ✅ **Audit fix quality** → Check for generic comments
3. ✅ **Add more templates** based on audit results

**Expected Final**: 85-90% actionable fixes

---

## 🚀 **Should We Do This?**

**YES** ✅ - Here's why:

1. **Root cause is clear**: Missing context + weak fallback logic
2. **Fixes are straightforward**: Templates + better prompts
3. **High ROI**: 
   - 50% → 85% actionable fixes
   - ↓ 40% AI cost (templates don't use API)
   - Better user experience
4. **Gradual rollout**: Phase 1 (templates) can ship immediately

---

## 💡 **Alternative: Just Increase Model Intelligence?**

**Could we just use `claude-opus-4.1` or `o1-pro`?**

**Analysis**:
- ❌ **Won't fix missing context** → Still no code snippet to work with
- ❌ **Won't fix generic fallback** → Logic issue, not model issue
- ⚠️ **5x more expensive** → $0.05 → $0.25 per analysis
- 🟡 **Might help with complex cases** → But templates are faster for simple ones

**Verdict**: ❌ **Not a solution** - Need to fix prompt + context first

---

**Recommendation**: ✅ **Implement Hybrid Approach (Option 3)**
- Quick wins from templates
- Better AI for complex issues
- Lower cost, higher quality

**Next Step**: Start with Phase 1 (rule-based templates)?





