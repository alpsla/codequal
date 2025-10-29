# ✅ Session 13 - AI Severity Classification Implementation

**Date:** 2025-10-28
**Status:** ✅ **IMPLEMENTATION COMPLETE** (Ready for integration testing)

---

## 🎯 What Was Implemented

### 1. ✅ Scoring Documentation Corrected (COMPLETE)

**File Updated:** `SESSION_13_SECURITY_SCORE_EXPLANATION.md`

**Changes Made:**
- Added critical clarification section at the beginning
- Corrected base score understanding:
  - **APP Score base = 100/100** (repository health)
  - **Skill Score base = 50/100** (developer competency baseline)
- Updated Skill Score vs APP Score comparison table
- Clarified that Skill Score of 63/100 = **ABOVE baseline** (Good performance!)

**Key Insight:**
Categories showing 100/100 are APP scores (no issues in repository).
Skill Score of 63/100 means: (16 + 100 + 100 + 100 + 0) / 5 = 63 > 50 baseline ✅

---

### 2. ✅ AI Severity Classifier Created (COMPLETE)

**New File Created:** `src/two-branch/services/ai-severity-classifier.ts` (295 lines)

**What It Does:**
Provides AI-powered severity classification that intelligently analyzes issues and assigns correct severity based on ACTUAL impact, not just tool defaults.

**Key Features:**

1. **Comprehensive System Prompt:**
   - Clear severity definitions (CRITICAL, HIGH, MEDIUM, LOW)
   - Classification rules based on actual impact
   - Examples for each severity level
   - Tool-specific guidance (CheckStyle, PMD, SpotBugs, Semgrep)

2. **Main Function:**
   ```typescript
   async function classifyIssueSeverity(
     input: SeverityClassificationInput,
     modelOverride?: string
   ): Promise<SeverityClassificationResult>
   ```

3. **Input:**
   - Tool name (CheckStyle, PMD, etc.)
   - Rule name
   - Original severity from tool
   - Title/description
   - Optional code snippet

4. **Output:**
   - Re-classified severity (critical/high/medium/low)
   - Reasoning (1-2 sentences explaining why)
   - Confidence level (high/medium/low)

5. **Batch Processing:**
   ```typescript
   async function classifyIssueSeverityBatch(
     issues: SeverityClassificationInput[],
     modelOverride?: string,
     concurrency: number = 5
   ): Promise<SeverityClassificationResult[]>
   ```

6. **Configuration:**
   - `USE_AI_SEVERITY_CLASSIFICATION=true` (default: enabled)
   - `SEVERITY_CLASSIFIER_MODEL` (default: google/gemini-2.0-flash-exp:free)
   - Fallback to original severity if AI fails

---

## 🔧 How It Works

### Classification Logic

**🔴 CRITICAL** (security vulnerabilities, data loss):
- SQL injection, command injection, RCE
- Auth bypass, hardcoded credentials
- Data corruption, system crashes

**🟠 HIGH** (bugs, serious security weaknesses):
- NullPointerExceptions, resource leaks
- Weak crypto, insecure deserialization
- Logic bugs affecting functionality

**🟡 MEDIUM** (code smells, maintainability):
- High cyclomatic complexity
- Inefficient algorithms
- Poor error handling

**🟢 LOW** (style, documentation - NO runtime impact):
- Code formatting (line length, indentation)
- Documentation (missing Javadoc)
- Naming conventions
- Import organization

### Example Classification Flow

1. **Input:**
   ```json
   {
     "tool": "checkstyle",
     "rule": "LineLengthCheck",
     "originalSeverity": "high",
     "title": "Line is longer than 120 characters"
   }
   ```

2. **AI Analyzes:**
   - Does it affect runtime? NO
   - Is it a security issue? NO
   - Is it a bug? NO
   - Is it style/formatting? YES → **LOW**

3. **Output:**
   ```json
   {
     "severity": "low",
     "reasoning": "Code style issue with no runtime impact. Auto-fixable formatting rule.",
     "confidence": "high"
   }
   ```

---

## 📊 Expected Impact

### Current State (From Validation Report):
- 🔴 Critical: 6 (0.0%)
- 🟠 **High: 15,537 (58.0%)** ← TOO MANY
- 🟡 Medium: 60 (0.2%)
- 🟢 Low: 11,200 (41.8%)

### After AI Classification (Expected):
- 🔴 **Critical: ~50-100 (0.4%)** - Real security vulnerabilities
- 🟠 **High: ~2,000-3,000 (11-13%)** - Actual bugs (**85% reduction!**)
- 🟡 **Medium: ~3,000-4,000 (13-16%)** - Code smells
- 🟢 **Low: ~18,000-20,000 (75-80%)** - Style/documentation

**Result:** Much more accurate severity distribution reflecting actual risk!

---

## 🚀 Next Steps: Integration

### Step 1: Integrate into Java Tool Orchestrator

**File to Modify:** `src/two-branch/tools/java/java-tool-orchestrator.ts`

**Where to Add:**
After line 672 (end of `mapCheckstyleSeverity()` function)

**Integration Code:**
```typescript
import { classifyIssueSeverity, shouldUseAISeverityClassification } from '../../services/ai-severity-classifier';

// Add to class
private async enhanceSeverityWithAI(
  issue: RawIssue,
  tool: string,
  initialSeverity: 'critical' | 'high' | 'medium' | 'low'
): Promise<'critical' | 'high' | 'medium' | 'low'> {
  // Check if AI classification is enabled
  if (!shouldUseAISeverityClassification()) {
    return initialSeverity;
  }

  try {
    const result = await classifyIssueSeverity({
      tool,
      rule: issue.rule || issue.type || 'unknown',
      originalSeverity: initialSeverity,
      title: issue.message,
      description: issue.message,
      codeSnippet: issue.codeSnippet
    });

    console.log(`[AI Severity] ${tool}/${issue.rule}: ${initialSeverity} → ${result.severity} (${result.reasoning})`);

    return result.severity;
  } catch (error: any) {
    console.error(`[AI Severity] Classification failed for ${tool}/${issue.rule}:`, error.message);
    return initialSeverity; // Fallback to original
  }
}
```

**Then Update Each Tool Parser:**

1. **CheckStyle** (after line 726):
   ```typescript
   // BEFORE (Session 13 Fix #2)
   const severity = this.mapCheckstyleSeverity(violation.severity, violation.source);

   // AFTER (Session 13 Fix #3 - AI Enhancement)
   const initialSeverity = this.mapCheckstyleSeverity(violation.severity, violation.source);
   const severity = await this.enhanceSeverityWithAI(issue, 'checkstyle', initialSeverity);
   ```

2. **PMD** (similar changes needed)
3. **SpotBugs** (similar changes needed)
4. **Semgrep** (similar changes needed)

### Step 2: Test with Validation Report

```bash
# Re-run Micronaut Core PR #200 analysis
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents
npx ts-node test-v9-lite-e2e.ts

# Check severity distribution in report
grep -A 5 "By Severity" /Users/alpinro/Code\ Prjects/codequal/reports/session13-validation-report.md
```

**Expected Results:**
- HIGH severity issues reduced from 15,537 to ~2,000-3,000
- LOW severity issues increased from 11,200 to ~18,000-20,000
- More accurate risk assessment overall

### Step 3: Performance Optimization (Optional)

If AI classification is too slow, enable batch processing:

```typescript
// Instead of classifying one-by-one
const allIssues = [/* all parsed issues */];
const classifications = await classifyIssueSeverityBatch(
  allIssues.map(issue => ({
    tool: 'checkstyle',
    rule: issue.rule,
    originalSeverity: this.mapCheckstyleSeverity(issue.severity, issue.source),
    title: issue.message
  })),
  undefined, // Use default model
  10 // Classify 10 issues concurrently
);

// Then apply classifications to issues
allIssues.forEach((issue, index) => {
  issue.severity = classifications[index].severity;
});
```

---

## 🎯 Benefits of AI Approach

✅ **Scalable:** Works for ANY rule from ANY tool, any language
✅ **Intelligent:** Understands context, not just rule names
✅ **Maintainable:** One prompt vs thousands of rules
✅ **Accurate:** AI reads code snippets and understands actual impact
✅ **Flexible:** Easy to adjust classification logic by updating prompt
✅ **Cost-Effective:** Uses free Gemini model, ~500 tokens per issue

---

## 📋 Configuration Options

### Environment Variables

```bash
# Enable/disable AI severity classification (default: true)
USE_AI_SEVERITY_CLASSIFICATION=true

# Override model for severity classification
SEVERITY_CLASSIFIER_MODEL=google/gemini-2.0-flash-exp:free

# Strict mode (fail if AI unavailable)
STRICT_NO_FALLBACK=false
```

### Cost Considerations

**Per Issue Cost:**
- System prompt: ~400 tokens
- User prompt: ~100 tokens
- Response: ~50 tokens
- **Total: ~550 tokens per issue**

**For 26,803 issues (validation report):**
- Total tokens: ~14.7M tokens
- Cost with Gemini Flash (free): **$0**
- Cost with paid model ($0.50/1M): **~$7.35**

**Optimization:**
- Only classify HIGH severity issues → 15,537 issues = ~8.5M tokens = $4.25
- Use batch processing for faster execution

---

## 🐛 Troubleshooting

### Issue: AI classification too slow

**Solution 1:** Use batch processing (concurrent classification)
```typescript
classifyIssueSeverityBatch(issues, undefined, 10) // 10 concurrent
```

**Solution 2:** Only classify HIGH severity issues
```typescript
if (initialSeverity === 'high') {
  severity = await this.enhanceSeverityWithAI(issue, tool, initialSeverity);
} else {
  severity = initialSeverity; // Skip AI for low/medium
}
```

### Issue: AI returning incorrect severity

**Solution:** Update system prompt with more examples or clearer rules
- File: `src/two-branch/services/ai-severity-classifier.ts`
- Edit: `SEVERITY_CLASSIFIER_SYSTEM_PROMPT` constant

### Issue: API key errors

**Solution:** Ensure OPENROUTER_API_KEY is set
```bash
echo $OPENROUTER_API_KEY
# Should output: sk-or-v1-...
```

---

## 📄 Files Created/Modified

### Created:
1. ✅ `src/two-branch/services/ai-severity-classifier.ts` (295 lines)
   - Main AI severity classification module
   - Batch processing support
   - Configuration helpers

### Modified:
1. ✅ `SESSION_13_SECURITY_SCORE_EXPLANATION.md`
   - Added base score clarification (Skill=50, APP=100)
   - Updated interpretation tables

### To Be Modified (Next Session):
1. ⏳ `src/two-branch/tools/java/java-tool-orchestrator.ts`
   - Add `enhanceSeverityWithAI()` method
   - Update CheckStyle, PMD, SpotBugs, Semgrep parsers
   - Import AI classifier module

---

## ✅ Completion Checklist

- [x] ✅ Correct scoring documentation with base=50 for Skill scores
- [x] ✅ Create AI severity classifier module
- [x] ✅ Define comprehensive system prompt
- [x] ✅ Implement classification function
- [x] ✅ Add batch processing support
- [x] ✅ Add configuration helpers
- [ ] ⏳ Integrate into Java tool orchestrator
- [ ] ⏳ Test with validation report
- [ ] ⏳ Verify 85% reduction in HIGH severity issues

---

## 🚀 Ready for User Testing

**Status:** Implementation complete, ready for integration testing.

**User Can Now:**
1. Review the AI severity classifier implementation
2. Test the classification logic
3. Proceed with integration into tool orchestrator
4. Re-run validation test to verify impact

**Expected Outcome:**
HIGH severity issues: 15,537 → ~2,000-3,000 (85% reduction!)

---

*End of AI Severity Implementation Summary*
