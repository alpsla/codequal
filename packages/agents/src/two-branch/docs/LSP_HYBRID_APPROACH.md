# LSP/SARIF Hybrid Auto-Fix Approach

**Created**: November 12, 2025
**Status**: Implemented and Ready for Testing
**Goal**: Enable both prescriptive and generative fix approaches

---

## 🎯 Strategy: Best of Both Worlds

We provide **both** our pre-generated fixes AND rich metadata for IDE's AI to generate alternative fixes. This lets us:

1. **Deliver fast value** (use our fixes immediately)
2. **Enable flexibility** (IDE can generate context-aware alternatives)
3. **Validate quality** (track which approach works better)
4. **Build confidence** (gradual trust through comparison)

---

## 📊 LSP Code Action Structure

### Enhanced Code Action Format

```typescript
{
  // Standard LSP fields (backward compatible)
  "title": "Fix: Add Final Modifier",
  "kind": "quickfix",
  "edit": {
    "changes": {
      "file:///workspace/Foo.java": [{
        "range": { "start": {"line": 10, "character": 0}, "end": {"line": 11, "character": 0} },
        "newText": "final String name"
      }]
    }
  },

  // NEW: Enhanced metadata for IDE AI (hybrid approach)
  "data": {
    // Issue context
    "issue": {
      "type": "code_quality",
      "rule": "FinalParameters",
      "severity": "low",
      "category": "best_practices",
      "description": "Parameter should be declared final",
      "explanation": {
        "what": "Parameter 'name' is not declared final",
        "why": "Final parameters prevent accidental reassignment",
        "impact": "low severity: affects code maintainability"
      }
    },

    // Code context for AI
    "context": {
      "originalCode": "String name",
      "surroundingLines": [
        "public void setName(",
        "  String name",
        ") {"
      ],
      "fileType": "java",
      "language": "java",
      "framework": "spring-boot"
    },

    // AI prompt (ready to use)
    "aiPrompt": "You are a code quality expert. Fix the following java code issue:\n\nRule: FinalParameters\nIssue: Parameter should be declared final\n\nContext:\n- What: Parameter 'name' is not declared final\n- Why: Final parameters prevent accidental reassignment\n- Impact: low severity: affects code maintainability\n\nOriginal code:\nString name\n\nPlease provide a fixed version...",

    // Validation metadata
    "codequalFix": {
      "confidence": 0.95,
      "source": "ai_generated",
      "verified": false
    },

    // Telemetry
    "telemetry": {
      "ruleId": "FinalParameters",
      "toolName": "checkstyle",
      "issueCount": 1
    }
  }
}
```

---

## 🔄 IDE Implementation Options

### Option 1: Fast Path (Use Our Fix)
```typescript
// IDE just applies our pre-generated fix
const fix = codeAction.edit;
await workspace.applyEdit(fix);
// ✅ Fast, consistent, offline, no AI cost
```

### Option 2: AI Generation (Use Metadata)
```typescript
// IDE uses our metadata to generate its own fix
const aiPrompt = codeAction.data.aiPrompt;
const generatedFix = await ideAI.generateFix(aiPrompt);
const customEdit = createEdit(generatedFix);
await workspace.applyEdit(customEdit);
// ✅ Context-aware, latest models, IDE-specific preferences
```

### Option 3: Comparison Mode (Show Both)
```typescript
// IDE shows both options to user
const options = [
  { label: "CodeQual Fix (Fast)", edit: codeAction.edit },
  { label: "AI Generated (Context-aware)", edit: await generateCustomFix(codeAction.data) }
];
const chosen = await window.showQuickPick(options);
await workspace.applyEdit(chosen.edit);
// ✅ User learns which works better, builds confidence
```

### Option 4: Smart Routing (Automatic Decision)
```typescript
// IDE decides based on complexity/confidence
if (codeAction.data.codequalFix.confidence > 0.90) {
  // High confidence - use our fix
  await workspace.applyEdit(codeAction.edit);
} else {
  // Low confidence - generate with AI
  const betterFix = await ideAI.generateFix(codeAction.data.aiPrompt);
  await workspace.applyEdit(betterFix);
}
// ✅ Best of both, optimized for quality
```

---

## 📈 Tracking & Validation

### Telemetry Data to Collect

```typescript
interface FixTelemetry {
  ruleId: string;
  issueType: string;
  fixApproach: 'codequal' | 'ide_ai' | 'user_rejected';
  success: boolean;           // Did it apply without errors?
  buildPassed: boolean;        // Did build pass after fix?
  userKept: boolean;           // Did user keep the fix or revert?
  timeTaken: number;           // ms (our fix vs AI generation time)
}
```

### Success Metrics

**Tracking Over Time:**
```typescript
{
  "codequal_fix_success_rate": 0.94,    // 94% of our fixes work correctly
  "ide_ai_fix_success_rate": 0.91,      // 91% of IDE AI fixes work
  "agreement_rate": 0.89,                // 89% of time both produce same fix
  "user_preference": {
    "codequal": 0.85,                    // 85% choose our fix
    "ide_ai": 0.10,                      // 10% choose IDE AI
    "rejected": 0.05                     // 5% reject both
  },
  "avg_time": {
    "codequal": 0.05,                    // 50ms (instant)
    "ide_ai": 2.3                        // 2.3s (AI generation)
  }
}
```

---

## 🎯 Phased Rollout Strategy

### Phase 1 (Months 1-3): Comparison Mode
- Show BOTH fixes to users
- Let users choose
- Track preferences and success rates
- Goal: Build confidence, gather data

**Expected Outcome:**
- Users prefer CodeQual fixes for simple/mechanical changes
- Users prefer IDE AI for complex/context-dependent changes
- Agreement rate: 85-90%

### Phase 2 (Months 4-6): Smart Routing
- If agreement rate > 90%, default to our fixes
- Use IDE AI only for low-confidence fixes
- Faster UX (no generation wait for most fixes)

**Expected Outcome:**
- 90% of fixes applied instantly (our pre-generated)
- 10% use IDE AI (complex cases)
- User satisfaction improves (faster + still flexible)

### Phase 3 (Months 7+): Full Automation
- If success rate > 95%, auto-apply our fixes
- IDE AI as backup for edge cases
- Full one-click automation achieved

**Expected Outcome:**
- Users trust our fixes completely
- Rare manual intervention needed
- Cost optimized (minimal AI generation)

---

## 💰 Cost Analysis

### Cost Per 400 Fixes

| Approach | Time | Cost | Quality |
|----------|------|------|---------|
| **CodeQual Only** | < 1s | $0.00 | 85-90% |
| **IDE AI Only** | 8-12s | $4.00 | 90-95% |
| **Hybrid (90% ours, 10% AI)** | 1-2s | $0.40 | 90-95% |

**Winner:** Hybrid approach gives best quality at 10% of full AI cost!

---

## 🛠️ Implementation Status

### ✅ Completed

1. **Enhanced LSP Code Action Interface**
   - Added `LSPCodeActionData` type
   - Added `data` field to `LSPCodeAction`
   - Backward compatible (existing `edit` field preserved)

2. **Metadata Generation**
   - `determineIssueType()` - Maps tools to issue types
   - `getLanguageFromExtension()` - Detects language
   - `generateAIPrompt()` - Creates ready-to-use AI prompt

3. **Integration**
   - Metadata automatically included in all individual code actions
   - Batch actions remain simple (no metadata needed)

### 📋 Next Steps

1. **IDE Extension Development**
   - Build Cursor/VSCode extension with comparison mode
   - Implement telemetry tracking
   - Test with real users

2. **Data Collection**
   - Track fix success rates
   - Measure user preferences
   - Calculate cost savings

3. **Iteration**
   - Improve our fixes based on feedback
   - Optimize AI prompts for IDE generation
   - Refine smart routing logic

---

## 🧪 Testing Plan

### Week 1: Internal Testing
- Test comparison mode with CodeQual team
- Verify metadata completeness
- Validate AI prompt quality

### Week 2-4: Alpha Testing
- 10 external users
- Track preferences and success rates
- Gather qualitative feedback

### Month 2: Beta Testing
- 100 users
- Full telemetry collection
- Analyze data, make improvements

### Month 3: Decision Point
- If success rate > 90%: Move to Phase 2 (smart routing)
- If success rate < 90%: Improve fix generation, stay in Phase 1

---

## 📖 Example Use Case

### Scenario: Checkstyle FinalParameters Issue

**Our Fix (Prescriptive):**
```java
// Before
public void setName(String name) {
  this.name = name;
}

// CodeQual Fix (in edit.changes)
public void setName(final String name) {
  this.name = name;
}
```

**IDE AI Could Generate (Using Our Metadata):**
```java
// IDE AI might consider:
// 1. Project code style (uses 'final' or not?)
// 2. Surrounding methods (do they use 'final'?)
// 3. Spring framework context (immutability patterns)

// AI-Generated Fix (more context-aware)
public void setName(final String name) {
  this.name = Objects.requireNonNull(name, "name must not be null");
}
```

**Result:**
- Both fixes address the `FinalParameters` rule ✅
- Our fix: Simple, fast, correct ✅
- IDE AI fix: More comprehensive (adds null check) ✅
- User chooses based on preference
- We learn AI's improvements for next time!

---

## ✅ Conclusion

The hybrid approach positions CodeQual as:
- **Diagnostic Expert**: We find the issues accurately
- **Fix Suggester**: We provide fast, reliable fixes
- **Enabler**: We give IDEs rich context for enhancement

This minimizes liability (fixes are suggestions, user approves) while maximizing flexibility and learning.

**Status**: Ready for IDE extension development and user testing!
