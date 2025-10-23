# Ultra-Cheap Model Strategy
**Date**: October 17, 2025  
**Goal**: Test even cheaper models with improved prompts  
**Current Cost**: $0.005/analysis with deepseek-chat-v3.1  
**Target**: <$0.003/analysis (40% additional savings)

---

## 🎯 **Strategy**

Since improved prompts work with `deepseek-chat-v3.1` ($0.14/1M), let's test even cheaper models:

---

## 📊 **Model Candidates**

### **Option 1: qwen/qwen-2.5-coder-32b-instruct** ⭐ **RECOMMENDED**

**Pricing**: $0.07/1M input, $0.07/1M output  
**Cost**: **50% cheaper** than deepseek  
**Specialization**: Code-specific (trained on code)

**Why This One**:
- ✅ **Code-specialized** - Better for PMD/code quality fixes
- ✅ **32B parameters** - Large enough for complex reasoning
- ✅ **Recent model** (2.5 series) - Modern architecture
- ✅ **50% cheaper** - $0.0025/analysis (vs $0.005)

**Expected Cost**:
```
Input:  ~500 tokens × 17 calls × $0.07/1M = $0.0006
Output: ~800 tokens × 17 calls × $0.07/1M = $0.0009
Total:  $0.0015 per analysis
```

**Risk**: Low - It's code-specialized, should handle our patterns well

---

### **Option 2: deepseek/deepseek-coder-v2-lite-instruct**

**Pricing**: $0.14/1M (same as deepseek-chat-v3.1)  
**Cost**: Same as current  
**Specialization**: Code-specific + lighter weight

**Why Consider**:
- ✅ **Code-specialized** - May be better for PMD patterns
- ✅ **Faster responses** - Lighter model
- ⚠️ **Same cost** - No savings

**Skip for now** - No cost benefit

---

### **Option 3: meta-llama/llama-3.2-3b-instruct**

**Pricing**: Potentially **free tier** or $0.04/1M  
**Cost**: Free or 71% cheaper than deepseek  
**Specialization**: General-purpose

**Why It's Risky**:
- ⚠️ **Only 3B parameters** - May struggle with complex patterns
- ⚠️ **General-purpose** - Not code-specialized
- ⚠️ **Smaller context** - May need more careful prompting

**Test Later** - After qwen-2.5-coder validates the approach

---

## 🎯 **Recommended Approach**

### **Phase 1: Test qwen-2.5-coder-32b-instruct**

1. ✅ Switch security/code_quality roles to qwen-2.5-coder
2. ✅ Run E2E test on Kafka PR
3. ✅ Audit fix quality vs deepseek-chat-v3.1
4. ✅ If quality ≥95% of deepseek → Keep it!

**Expected Outcome**: 50% cost reduction with equal or better quality (code-specialized)

### **Phase 2: Multi-Repo Testing** (Your request)

Test on diverse Java frameworks:
1. **Spring Framework** - Large, mature codebase
2. **Hibernate ORM** - Complex architectural patterns
3. **Apache Camel** - With known CVEs (Dependency-Check)
4. **Vert.x** - Modern reactive framework
5. **Quarkus** - Cloud-native patterns

**What We're Testing**:
- ✅ Fix quality across different code styles
- ✅ Architecture agent performance (SOLID, patterns)
- ✅ Security agent with real CVEs
- ✅ Prompt robustness across domains

---

## 💰 **Cost Projection**

| Model | Cost/1M | Cost/Analysis | Savings vs Baseline |
|-------|---------|---------------|---------------------|
| gemini-2.5-pro (baseline) | $2.50 | $0.096 | 0% |
| deepseek-chat-v3.1 (current) | $0.14 | $0.005 | -95% |
| **qwen-2.5-coder** (test) | **$0.07** | **$0.0025** | **-97.4%** |
| llama-3.2-3b (future?) | $0.04 | $0.0015 | -98.4% |

**Annual Savings** (12k analyses):
- Current (deepseek): Save $1,092/year vs gemini
- **With qwen**: **Save $1,122/year** (+$30 more)

---

## 🧪 **Test Plan**

### **Step 1: Switch Models**

Update Supabase configs:
- `security/java/any` → qwen-2.5-coder-32b-instruct
- `code_quality/java/any` → qwen-2.5-coder-32b-instruct
- Keep others unchanged initially

### **Step 2: Validate on Kafka**

Run same Kafka PR test:
- Compare fix quality to deepseek baseline
- Check for any degradation

### **Step 3: Multi-Repo Testing**

| Repo | Purpose | Expected Challenges |
|------|---------|---------------------|
| **Spring Framework** | Complex DI patterns | Architecture agent workout |
| **Hibernate** | Performance issues | Performance agent workout |
| **Apache Camel 3.x** | Known CVEs | Security + Dependency agent |
| **Vert.x** | Async patterns | Code quality for reactive |
| **Quarkus** | Modern Java | Test on cutting-edge code |

### **Step 4: Document Findings**

For each repo, capture:
- Fix quality scores (% actionable)
- Architecture agent insights
- Security findings (if CVEs present)
- Any prompt improvements needed

---

## 📋 **Acceptance Criteria**

### **For qwen-2.5-coder to be accepted**:

✅ **Fix Quality**: ≥90% actionable (deepseek is ~95%)  
✅ **Code Blocks**: All fixes have proper code  
✅ **Imports**: Correct Java imports included  
✅ **Context-Aware**: Uses actual class/method names  
✅ **No Regressions**: No worse than deepseek on any category  

### **If qwen-2.5-coder fails**:

Plan B: Keep deepseek-chat-v3.1 (already excellent value)

---

## 🚀 **Implementation Plan**

### **Now** (Next 30 minutes):
1. ✅ Switch security/code_quality to qwen-2.5-coder
2. ✅ Run Kafka E2E test
3. ✅ Quick quality audit

### **Today** (Next 2-3 hours):
1. ✅ Multi-repo testing (5 frameworks)
2. ✅ Document findings per repo
3. ✅ Identify any prompt gaps

### **Tomorrow**:
1. ✅ Refine prompts based on findings
2. ✅ Final decision on model choice
3. ✅ Update all agent configurations

---

## 🎓 **What We'll Learn**

### **About Model Cost/Quality Trade-offs**:
- Can code-specialized models outperform general models?
- Where is the floor for quality vs cost?
- Do different repos need different models?

### **About Prompt Robustness**:
- Do current prompts work across Java frameworks?
- Are there domain-specific patterns we're missing?
- How does Architecture agent handle real SOLID violations?

### **About Security Analysis**:
- How does the agent handle real CVEs?
- Are security fix recommendations production-ready?
- Can we detect subtle security patterns?

---

## 📊 **Success Metrics**

| Metric | Target | Current (deepseek) |
|--------|--------|-------------------|
| Fix Actionability | ≥90% | ~95% |
| Code Blocks Present | 100% | 100% |
| Correct Imports | ≥95% | ~98% |
| Context-Specific Names | ≥90% | ~95% |
| Cost per Analysis | <$0.003 | $0.005 |

---

## ⚠️ **Risk Mitigation**

### **If qwen-2.5-coder underperforms**:

**Plan B**: Keep deepseek-chat-v3.1
- Already validated as excellent
- 95% cheaper than gemini-2.5-pro
- No need to risk quality for $30/year

### **If multi-repo testing reveals prompt gaps**:

**Plan C**: Enhance prompts further
- Add domain-specific examples
- Expand architecture patterns
- Add more security scenarios

---

## 🎯 **Next Steps**

Ready to proceed? Here's the order:

1. **Switch to qwen-2.5-coder** (5 min)
2. **Run Kafka test** (5 min)
3. **Quick audit** (10 min)
4. **Multi-repo tests** (2-3 hours)
5. **Final report** (30 min)

Total time: ~3-4 hours for complete validation

---

**Status**: ⏳ **Ready to Start**  
**Expected Outcome**: 50% cost savings + validated prompts across diverse codebases  
**Risk**: Low - Can always revert to deepseek if quality drops


