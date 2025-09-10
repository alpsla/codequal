# V9 Analyzer Framework - ESTABLISHED IMPLEMENTATION

## ✅ Framework Validation Complete

All tests passed successfully. The V9 Analyzer Framework is now established with the correct data flow.

## 🎯 Core Principles (NO DEVIATIONS ALLOWED)

### 1. Model Selection
- **ALWAYS** fetch from Supabase using `model_configurations` table
- **NEVER** hardcode model names or versions
- Models in Supabase are kept fresh (<6 months old)
- Current models in Supabase:
  - DeepSeek: `deepseek-r1-distill-llama-8b`, `deepseek-r1-distill-llama-70b`
  - Google: `gemini-2.5-flash-image-preview`
  - NO Claude 3.5, NO outdated models

### 2. File Selection Logic
Per `SMART_FILE_SELECTION_GUIDE.md`:
- **< 10,000 files**: 100% Full Analysis
- **≥ 10,000 files**: Smart Selection (500 max)
- NO OTHER LOGIC PERMITTED

### 3. Decision Logic
- **DECLINED**: Critical issues in new/modified code
- **CHANGES REQUESTED**: High issues in new/modified code
- **APPROVED**: Only low/medium issues

### 4. Code Snippets
- Generate for ALL active issues (new, modified, unmodified)
- NO snippets for resolved issues
- Include before/issue/after context

### 5. Metadata Requirements
All reports must include:
- Tool performance metrics
- Agent & model usage with costs
- File selection mode
- Complete issue categorization

## 📂 Framework Location

```
src/two-branch/analyzers/v9-analyzer-framework.ts
```

## 🚀 Usage Example

```typescript
import V9AnalyzerFramework from './src/two-branch/analyzers/v9-analyzer-framework';

const framework = new V9AnalyzerFramework();

// Analyze a PR
const result = await framework.analyzePR(
  'https://github.com/apache/kafka',
  17620,
  'java'
);

// Result includes:
// - Dynamic models from Supabase
// - Correct file selection
// - Proper decision logic
// - Complete metadata
```

## ❌ Common Mistakes to AVOID

1. **NEVER hardcode models** like:
   - `claude-3.5-sonnet` (not in Supabase)
   - `gpt-4-turbo` (not in Supabase)
   - Any specific version strings

2. **NEVER change file selection logic**:
   - Don't use gradual percentages
   - Don't use custom thresholds
   - Follow the guide EXACTLY

3. **NEVER fetch models from anywhere except Supabase**:
   - No OpenRouter direct calls for model selection
   - No hardcoded fallbacks
   - Supabase is the ONLY source of truth

## ✅ Test Results

### File Selection Tests
- ✅ 500 files → Full Analysis
- ✅ 6,948 files → Full Analysis  
- ✅ 9,999 files → Full Analysis
- ✅ 10,000 files → Smart Selection (500 max)
- ✅ 25,000 files → Smart Selection (500 max)
- ✅ 100,000 files → Smart Selection (500 max)

### Decision Logic Tests
- ✅ Critical in new → DECLINED
- ✅ High in modified → CHANGES REQUESTED
- ✅ Only low/medium → APPROVED

### Model Fetching Tests
- ✅ Security/Java → google/gemini-2.5-flash-image-preview:free
- ✅ Fetched from Supabase (NOT hardcoded)

### Code Snippet Tests
- ✅ 3 active issues → 3 snippets
- ✅ 1 resolved issue → 0 snippets

## 📋 Checklist for Future Development

Before making ANY changes to V9:

- [ ] Are you fetching models from Supabase?
- [ ] Are you following SMART_FILE_SELECTION_GUIDE.md exactly?
- [ ] Is decision logic correct (DECLINED for critical/high)?
- [ ] Are code snippets only for active issues?
- [ ] Is all metadata complete?

## 🔒 This Framework is FINAL

The V9 Analyzer Framework at `src/two-branch/analyzers/v9-analyzer-framework.ts` is the established implementation. 

**DO NOT**:
- Create alternate implementations
- Hardcode any data
- Change the established flow

**ALWAYS**:
- Use this framework as the base
- Fetch models from Supabase
- Follow the documented rules

---

*Last Updated: 2025-09-10*
*Status: PRODUCTION READY*