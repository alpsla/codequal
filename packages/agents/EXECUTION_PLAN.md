# Execution Plan - Ultra-Cheap Models + Multi-Repo Testing
**Date**: October 17, 2025  
**Duration**: 3-4 hours  
**Goal**: Validate qwen-2.5-coder across diverse Java frameworks

---

## 🎯 **Two-Phase Approach**

### **Phase 1: Switch to qwen-2.5-coder** (30 min)
1. Update Supabase configs
2. Test on Kafka (baseline)
3. Quick quality audit
4. **Decision**: Keep or revert?

### **Phase 2: Multi-Repo Testing** (2.5-3 hours)
5 repos × 20 min = ~2.5 hours + analysis

---

## 💰 **Cost Target**

| Model | Current | Target | Savings |
|-------|---------|--------|---------|
| deepseek-chat-v3.1 | $0.005 | baseline | 0% |
| **qwen-2.5-coder** | - | **$0.0025** | **-50%** |

**Annual Impact**: +$30 savings (on top of $1,092 from deepseek switch)

---

## 📋 **Phase 1: Model Switch**

### **Step 1.1: Update Security Agent**
```bash
# Delete deepseek config
# Insert qwen-2.5-coder config
role: security
language: java
primary_model: qwen/qwen-2.5-coder-32b-instruct
weights: { quality: 0.35, speed: 0.30, cost: 0.35 }
```

### **Step 1.2: Update Code Quality Agent**
```bash
role: code_quality
language: java
primary_model: qwen/qwen-2.5-coder-32b-instruct
weights: { quality: 0.40, speed: 0.30, cost: 0.30 }
```

### **Step 1.3: Test on Kafka**
```bash
cd ~/codequal/packages/agents
npx ts-node test-v9-e2e-complete.ts
```

### **Step 1.4: Quick Audit**
- [ ] All code blocks present?
- [ ] Imports correct?
- [ ] Fix quality ≥90%?

**If YES**: ✅ Proceed to Phase 2  
**If NO**: ❌ Revert to deepseek, investigate

---

## 📋 **Phase 2: Multi-Repo Testing**

### **Test Matrix**

| Repo | Focus | Expected CVEs | Duration |
|------|-------|---------------|----------|
| **Spring** | Architecture (DI) | No | 20 min |
| **Hibernate** | Performance (N+1) | No | 20 min |
| **Camel** | Security (CVEs) | ✅ Yes | 25 min |
| **Vert.x** | Async Patterns | No | 20 min |
| **Quarkus** | Modern Java | No | 20 min |

### **Per-Repo Checklist**

```bash
# 1. Clone/Update
cd /tmp && git clone <repo-url>

# 2. Find Recent PR
git log --oneline --merges | head -5

# 3. Checkout PR branch
git checkout <branch>

# 4. Run Analysis
cd ~/codequal/packages/agents
REPO_PATH=/tmp/<repo-name> npx ts-node test-v9-e2e-complete.ts

# 5. Audit Report
- Fix quality?
- Agent performance?
- Cost?
- Issues?

# 6. Document Findings
```

---

## 📊 **Data to Collect**

### **Quality Metrics**:
- [ ] Fix actionability % (target: ≥80%)
- [ ] Code blocks present (target: 100%)
- [ ] Correct imports (target: ≥95%)
- [ ] Context-specific (target: ≥90%)

### **Cost Metrics**:
- [ ] Per-repo cost
- [ ] Average cost
- [ ] Token usage

### **Agent Performance**:
- [ ] Architecture: SOLID detection
- [ ] Security: CVE findings
- [ ] Performance: Real optimizations
- [ ] Code Quality: Consistency

---

## ✅ **Success Criteria**

### **Phase 1 (Kafka Baseline)**:
✅ Fix quality ≥90% vs deepseek  
✅ All code blocks present  
✅ No regressions  
✅ Cost <$0.003  

### **Phase 2 (Multi-Repo)**:
✅ Average fix quality ≥80%  
✅ All repos tested successfully  
✅ Architecture agent performs well on ≥3/5 repos  
✅ Security agent finds CVEs in Camel  
✅ Cost stays <$0.003/analysis  

---

## 🚨 **Abort Conditions**

**Stop if**:
1. ❌ Phase 1 quality <85% (revert to deepseek)
2. ❌ Two consecutive repos fail quality (<75%)
3. ❌ Cost exceeds $0.005 (no savings)
4. ❌ Critical bugs discovered

---

## 📝 **Deliverables**

1. **`QWEN_VALIDATION_RESULTS.md`** - Phase 1 findings
2. **`MULTI_REPO_TEST_RESULTS.md`** - Phase 2 findings
3. **`PROMPT_IMPROVEMENTS_V2.md`** - If gaps found
4. **`FINAL_MODEL_RECOMMENDATION.md`** - Decision document

---

## 🎯 **Final Decision Tree**

```
Phase 1: Kafka Test
├─ Quality ≥90%? 
│  ├─ YES → Proceed to Phase 2
│  └─ NO → Revert to deepseek
│
Phase 2: Multi-Repo (if Phase 1 passed)
├─ Avg Quality ≥85%?
│  ├─ YES → ✅ KEEP qwen-2.5-coder
│  │         Update all configs
│  │         Document savings
│  │
│  ├─ 75-85% → ⚠️ IMPROVE PROMPTS
│  │           Identify gaps
│  │           Enhance prompts
│  │           Retest
│  │
│  └─ <75% → ❌ REVERT to deepseek
│              qwen not suitable
│              deepseek is excellent value
```

---

## 💡 **Expected Learnings**

### **About Models**:
- Can code-specialized models outperform general models?
- What's the quality floor for cost savings?
- Are 32B parameters enough for complex reasoning?

### **About Prompts**:
- Do they work across diverse Java frameworks?
- What domain-specific patterns are missing?
- How robust are security/architecture agents?

### **About Testing**:
- Which repos stress which agents most?
- Are there common failure patterns?
- What improvements would have highest ROI?

---

## 🚀 **Ready to Start?**

**Estimated Time**: 3-4 hours  
**Expected Outcome**: 50% additional cost savings + validated robust prompts  
**Risk**: Low (can revert anytime)

**Next Command**: Update Supabase configs for qwen-2.5-coder

---

**Status**: ⏳ **READY TO EXECUTE**  
**Confidence**: High (proven approach with deepseek)  
**Downside Protection**: Can revert at any point





