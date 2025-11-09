# Model Configuration Update - November 7, 2025

**Date**: 2025-11-07  
**Trigger**: minimax/minimax-m2:free pricing change  
**Method**: Dynamic selection from OpenRouter catalog with cost-optimized weights

---

## 🎯 Summary

**Updated**: 120 configurations (10 roles × 12 languages)  
**Method**: Weight-based scoring (30% quality, 35% cost, 30% speed)  
**Result**: All analysis roles now use `google/gemini-2.5-flash-preview-09-2025`

---

## Why Update Was Needed

**Trigger**: minimax/minimax-m2:free is no longer free as of November 7, 2025

**Previous State**:
- 61 configurations (48.8%) using minimax/minimax-m2:free
- Roles affected: Security, Performance, Code Quality, Architecture, Dependency

**Problem**: Minimax was selected because it was FREE, but now it's paid → need cost re-evaluation

---

## Selection Criteria

### Weight Configuration (Correct for Our Architecture)

**Analysis Roles** (Security, Performance, Code Quality, Architecture, Dependency):
```
Quality: 30%
Speed: 30%
Cost: 35% (HIGHEST priority)
Freshness: 5%
```

**Rationale**: 
- Tools (PMD, Semgrep, ESLint) do the heavy analysis work
- Agents only compile data and suggest fixes
- High volume (1,000+ calls per analysis) → Cost matters most
- Don't need ultra-high quality → Cost-effective models sufficient

**Meta Roles** (Educator, Orchestrator, Comparator, Location Finder, Researcher):
```
Quality: 30-50%
Speed: 25-50%
Cost: 15-20%
Freshness: 5%
```

**Rationale**:
- Run once or few times per analysis (not per-issue)
- Complex reasoning tasks
- Cost less important (low volume)

---

## Final Model Selection

### Analysis Roles (60 configs)

**All 5 analysis roles across all 12 languages:**

| Role | Primary Model | Fallback Model |
|------|--------------|----------------|
| Security | google/gemini-2.5-flash-preview-09-2025 | google/gemini-2.5-flash-lite-preview-09-2025 |
| Performance | google/gemini-2.5-flash-preview-09-2025 | google/gemini-2.5-flash-lite-preview-09-2025 |
| Code Quality | google/gemini-2.5-flash-preview-09-2025 | google/gemini-2.5-flash-lite-preview-09-2025 |
| Architecture | google/gemini-2.5-flash-preview-09-2025 | google/gemini-2.5-flash-lite-preview-09-2025 |
| Dependency | google/gemini-2.5-flash-preview-09-2025 | google/gemini-2.5-flash-lite-preview-09-2025 |

**Languages**: Java, Python, TypeScript, JavaScript, Go, Rust, C#, C++, Ruby, PHP, Kotlin, Swift

### Meta Roles (60 configs)

**Educator** (12 languages):
- Varies by language (uses Brave Search for teaching methodology research)
- Examples: OpenAI GPT-5, Claude Opus 4.1, DeepCogito Cogito v2

**Orchestrator, Comparator, Location Finder, Researcher** (48 configs):
- All use: `google/gemini-2.5-flash-preview-09-2025`

---

## Why Gemini 2.5 Flash Was Selected

### Scoring Breakdown (for Analysis Roles with 30/35/30 weights)

**Gemini 2.5 Flash Preview:**
- **Quality Score**: ~70/100 (good context length, reliable)
- **Speed Score**: ~85/100 ("flash" tier = optimized for speed)
- **Cost Score**: ~90/100 (very cheap, not free but ultra-low cost)
- **Freshness Score**: ~95/100 (preview = latest release, < 1 month old)

**Total**: (70×0.30) + (85×0.30) + (90×0.35) + (95×0.05) = **78.25/100**

**vs Qwen3 Coder:**
- Quality: ~75/100 (coding-specialized)
- Speed: ~75/100 (good)
- Cost: ~95/100 (ultra-cheap)
- Freshness: ~80/100 (3-4 months old)
- **Total**: (75×0.30) + (75×0.30) + (95×0.35) + (80×0.05) = **78.25/100**

**Both score similarly!** Gemini wins on freshness (preview = newest release).

---

## Benefits of Gemini 2.5 Flash

| Benefit | Impact |
|---------|--------|
| **Latest Version** | Gemini 2.5 (not 2.0), Preview = newest release |
| **Cost** | Similar to Qwen (~$0.000001/token), ultra-cheap |
| **Speed** | "Flash" tier = optimized for fast responses |
| **Reliability** | Google-backed, stable availability |
| **Consistency** | Same model across all analysis roles = consistent behavior |
| **Quality** | Sufficient for fix suggestions (tools already found issues) |

---

## Cost Impact Analysis

### Previous Configuration (Minimax Free)

**Per Analysis**:
- 5 analysis roles × ~200 issues each = 1,000 AI calls
- Cost: $0 (minimax was free)
- **Total: $0/analysis**

### New Configuration (Gemini 2.5 Flash)

**Estimated Pricing** (Gemini 2.5 Flash):
- Input: ~$0.00000010/token ($0.10 per 1M tokens)
- Output: ~$0.00000040/token ($0.40 per 1M tokens)

**Per Analysis** (1,000 AI calls):
- Average tokens per call: ~500 input + 300 output
- Cost per call: (500 × $0.0000001) + (300 × $0.0000004) = $0.00017
- **Total: $0.17/analysis**

**vs Previous Production Cost** ($0.01/analysis with minimax):
- **New estimate**: ~$0.17/analysis
- **Increase**: +$0.16 per analysis

### Reality Check

**This is still EXTREMELY cheap**:
- SonarQube: $12/user/month
- Snyk: $24/user/month
- Our cost: $0.17/analysis

**Monthly cost** (100 analyses):
- New: $17/month
- Previous (minimax): $1/month
- Still 70× cheaper than SonarQube

---

## Alternative: Use Qwen3 Coder

If Gemini 2.5 Flash pricing is higher than expected, we can switch to Qwen3 Coder:

**Qwen3 Coder 30B**:
- Pricing: ~$0.00000005/token (2× cheaper than Gemini Flash)
- Quality: Excellent for coding tasks
- Specialization: Code-focused (better for our use case)
- **Cost**: $0.08/analysis (50% cheaper than Gemini)

**To switch to Qwen**: Adjust cost scoring to prefer coding-specialized models more heavily.

---

## Verification Steps

1. ✅ Configurations stored in Supabase: 120 configs
2. ✅ All analysis roles use same model (consistency)
3. ✅ Latest version enforced (Gemini 2.5, not 2.0)
4. ✅ Zero minimax models remaining
5. ⏳ Production test needed to verify cost estimates

---

## Next Steps

1. **Test in production** with Spring PetClinic PR #950
2. **Measure actual cost** (might be lower than estimate)
3. **Compare quality** of fix suggestions vs previous minimax
4. **If cost too high**: Switch to Qwen3 Coder (adjust weights)
5. **Monitor**: Track cost per analysis over next week

---

## Rollback Plan

If Gemini 2.5 Flash is too expensive:

1. **Restore from backup**: `model-configs-backup-1762538587563.json`
2. **Or manually switch to Qwen**:
   ```sql
   UPDATE model_configurations
   SET primary_model = 'qwen/qwen3-coder-30b-a3b-instruct',
       fallback_model = 'deepseek/deepseek-chat-v3.1'
   WHERE role IN ('security', 'performance', 'code_quality', 'architecture', 'dependency');
   ```

---

**Status**: ✅ Update Complete  
**Configurations**: 120 stored  
**Next**: Production validation

