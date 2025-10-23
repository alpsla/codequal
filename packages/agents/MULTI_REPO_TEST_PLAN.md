# Multi-Repository Test Plan
**Date**: October 17, 2025  
**Goal**: Validate prompts & models across diverse Java frameworks  
**Duration**: 2-3 hours  
**Model**: qwen-2.5-coder-32b-instruct (after validation)

---

## 🎯 **Test Objectives**

1. **Validate Prompt Robustness** - Do prompts work across different code styles?
2. **Test Architecture Agent** - How well does it detect SOLID violations?
3. **Test Security with Real CVEs** - Dependency-Check + Semgrep on vulnerable code
4. **Identify Prompt Gaps** - What patterns are we missing?
5. **Cost Validation** - Confirm $0.0025/analysis across repos

---

## 📋 **Test Repositories**

### **1. Spring Framework** 🌱

**Repo**: https://github.com/spring-projects/spring-framework  
**Why**: Mature, complex DI patterns, extensive use of annotations

**Test PR**: Recent PR with:
- Dependency injection changes
- Complex class hierarchies
- Bean lifecycle management

**What We're Testing**:
- ✅ Architecture agent on DI patterns
- ✅ Code quality on annotation-heavy code
- ✅ Performance on reflection-heavy patterns

**Expected Challenges**:
- Many circular dependencies
- Complex proxy patterns
- Extensive use of reflection

**Success Criteria**:
- Detects God Objects
- Identifies tight coupling
- Suggests proper DI patterns

---

### **2. Hibernate ORM** 💾

**Repo**: https://github.com/hibernate/hibernate-orm  
**Why**: Complex architectural patterns, performance-critical code

**Test PR**: Recent PR with:
- Entity mapping changes
- Query optimization
- Cache management

**What We're Testing**:
- ✅ Performance agent on N+1 queries
- ✅ Architecture agent on layering violations
- ✅ Code quality on complex state machines

**Expected Challenges**:
- Complex inheritance hierarchies
- Lazy loading patterns
- Transaction management

**Success Criteria**:
- Detects N+1 query patterns
- Identifies session management issues
- Suggests caching strategies

---

### **3. Apache Camel 3.x** 🐫

**Repo**: https://github.com/apache/camel  
**Why**: Known CVEs in older versions, integration patterns

**Test Branch**: Use version with known CVEs (e.g., 3.14.x with CVE-2023-44487)

**What We're Testing**:
- ✅ Security agent with real CVEs
- ✅ Dependency-Check finds vulnerabilities
- ✅ Architecture agent on routing patterns

**Expected Challenges**:
- DSL-heavy code
- Dynamic routing
- Complex error handling

**Success Criteria**:
- Finds CVEs in dependencies
- Security fixes are actionable
- Architecture suggestions are valid

---

### **4. Eclipse Vert.x** ⚡

**Repo**: https://github.com/eclipse-vertx/vert.x  
**Why**: Async/reactive patterns, modern Java

**Test PR**: Recent PR with:
- Async handler changes
- Event loop modifications
- Reactive streams

**What We're Testing**:
- ✅ Code quality on async patterns
- ✅ Performance agent on non-blocking code
- ✅ Architecture agent on event-driven design

**Expected Challenges**:
- Callback hell patterns
- Race conditions
- Reactive streams complexity

**Success Criteria**:
- Detects blocking in event loop
- Identifies callback pyramids
- Suggests CompletableFuture patterns

---

### **5. Quarkus** 🔥

**Repo**: https://github.com/quarkusio/quarkus  
**Why**: Modern cloud-native, build-time optimization, GraalVM

**Test PR**: Recent PR with:
- Native compilation changes
- Extension development
- Build-time initialization

**What We're Testing**:
- ✅ Code quality on modern Java (17+)
- ✅ Architecture agent on modular design
- ✅ Performance agent on native hints

**Expected Challenges**:
- Build-time vs runtime separation
- Native image reflection
- CDI extensions

**Success Criteria**:
- Understands @RegisterForReflection
- Detects build-time leaks
- Suggests proper lazy initialization

---

## 🧪 **Test Procedure**

### **For Each Repository**:

#### **Step 1: Setup** (2 min)
```bash
# Clone repo
cd /tmp
git clone <repo-url>
cd <repo-name>

# Find recent PR
git log --oneline --merges | head -20
# Pick a PR with 100-500 files changed
```

#### **Step 2: Run Analysis** (5 min)
```bash
cd ~/codequal/packages/agents

# Update E2E test with new repo
# Run analysis
npx ts-node test-v9-e2e-complete.ts
```

#### **Step 3: Audit Results** (10 min)

Check report for:
1. **Fix Quality**:
   - [ ] All code blocks present?
   - [ ] Imports correct?
   - [ ] Context-specific names?
   - [ ] Production-ready?

2. **Agent Performance**:
   - [ ] Architecture: Valid patterns?
   - [ ] Security: Real vulnerabilities found?
   - [ ] Performance: Actionable optimizations?
   - [ ] Code Quality: Relevant suggestions?

3. **Cost**:
   - [ ] Within $0.003 budget?
   - [ ] Token usage reasonable?

#### **Step 4: Document** (3 min)

```markdown
## <Repo Name>

**PR**: #XXXX (XXX files changed)
**Issues Found**: XXX
**Fix Quality**: XX% actionable

### Highlights:
- ✅ Good: [What worked well]
- ⚠️ Needs Improvement: [What could be better]
- 🐛 Bug: [Any failures]

### Cost:
- Total: $X.XXX
- Within budget: Yes/No
```

---

## 📊 **Data Collection**

### **Per Repository**:

| Metric | Spring | Hibernate | Camel | Vert.x | Quarkus |
|--------|--------|-----------|-------|--------|---------|
| **Files Changed** | | | | | |
| **Issues Found** | | | | | |
| **Fix Quality %** | | | | | |
| **Code Blocks** | | | | | |
| **Cost** | | | | | |
| **Duration** | | | | | |

### **Agent Performance**:

| Agent | Spring | Hibernate | Camel | Vert.x | Quarkus |
|-------|--------|-----------|-------|--------|---------|
| **Architecture** | | | | | |
| **Security** | | | | | |
| **Performance** | | | | | |
| **Code Quality** | | | | | |

Rating: ⭐ Excellent | ✅ Good | ⚠️ Needs Work | ❌ Failed

---

## 🎯 **Success Criteria**

### **Overall**:
- ✅ **80%+ average fix quality** across all repos
- ✅ **All code blocks present** (no missing fixes)
- ✅ **<$0.003 per analysis** average cost
- ✅ **No crashes** or failures

### **Per Agent**:
- **Architecture**: ≥3/5 repos rated ✅ or better
- **Security**: Finds real CVEs in Camel
- **Performance**: Valid optimizations in Hibernate/Vert.x
- **Code Quality**: Consistent across all repos

### **Prompt Robustness**:
- ✅ Works on DI-heavy code (Spring)
- ✅ Works on ORM patterns (Hibernate)
- ✅ Works on async code (Vert.x)
- ✅ Works on modern Java (Quarkus)
- ✅ Handles security issues (Camel)

---

## 📝 **Test Commands**

### **Quick Test Script**

```bash
#!/bin/bash
# File: test-multi-repos.sh

REPOS=(
  "https://github.com/spring-projects/spring-framework|spring-framework"
  "https://github.com/hibernate/hibernate-orm|hibernate-orm"
  "https://github.com/apache/camel|camel"
  "https://github.com/eclipse-vertx/vert.x|vertx"
  "https://github.com/quarkusio/quarkus|quarkus"
)

for REPO_INFO in "${REPOS[@]}"; do
  IFS='|' read -r REPO_URL REPO_NAME <<< "$REPO_INFO"
  
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║  Testing: $REPO_NAME"
  echo "╚════════════════════════════════════════════════════════════════╝"
  
  # Clone if not exists
  if [ ! -d "/tmp/$REPO_NAME" ]; then
    cd /tmp
    git clone --depth 1 "$REPO_URL"
  fi
  
  # Find recent PR
  cd "/tmp/$REPO_NAME"
  RECENT_PR=$(git log --oneline --merges | head -1)
  echo "Recent PR: $RECENT_PR"
  
  # Run analysis
  cd ~/codequal/packages/agents
  REPO_PATH="/tmp/$REPO_NAME" npx ts-node test-v9-e2e-complete.ts
  
  echo ""
  echo "✅ $REPO_NAME complete"
  echo ""
done

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  All Tests Complete                                            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
```

---

## 🔍 **Specific Things to Look For**

### **Architecture Agent**:
- [ ] Detects God Objects (Spring's ApplicationContext?)
- [ ] Identifies circular dependencies
- [ ] Suggests proper layering (Controller → Service → Repository)
- [ ] Recognizes design patterns (Factory, Strategy, etc.)

### **Security Agent**:
- [ ] Finds CVEs in Camel dependencies
- [ ] Detects SQL injection patterns
- [ ] Identifies unsafe deserialization
- [ ] Suggests proper input validation

### **Performance Agent**:
- [ ] Detects N+1 queries (Hibernate)
- [ ] Identifies blocking calls in event loop (Vert.x)
- [ ] Suggests caching opportunities
- [ ] Finds inefficient collections usage

### **Code Quality Agent**:
- [ ] Consistent across all repos
- [ ] Handles annotation-heavy code (Spring)
- [ ] Works with DSLs (Camel)
- [ ] Understands modern Java syntax (Quarkus)

---

## 📊 **Expected Timeline**

| Phase | Duration | Activity |
|-------|----------|----------|
| **Setup** | 10 min | Clone repos, prepare environment |
| **Spring** | 20 min | Test + audit |
| **Hibernate** | 20 min | Test + audit |
| **Camel** | 25 min | Test + audit (CVE focus) |
| **Vert.x** | 20 min | Test + audit |
| **Quarkus** | 20 min | Test + audit |
| **Analysis** | 30 min | Compare results, identify patterns |
| **Documentation** | 15 min | Final report |
| **Total** | **~2.5 hours** | |

---

## ✅ **Deliverables**

1. **`MULTI_REPO_TEST_RESULTS.md`** - Complete findings
2. **`PROMPT_GAPS_IDENTIFIED.md`** - What needs improvement
3. **`MODEL_PERFORMANCE_COMPARISON.md`** - qwen vs deepseek
4. **Updated prompts** (if gaps found)
5. **Final model recommendation**

---

## 🎯 **Decision Points**

### **After Each Repo**:
- Is fix quality acceptable? (≥80%)
- Any crashes or failures?
- Continue or stop?

### **After All Repos**:
- **If avg quality ≥85%**: ✅ Keep qwen-2.5-coder
- **If avg quality 75-85%**: ⚠️ Improve prompts, retest
- **If avg quality <75%**: ❌ Revert to deepseek-chat-v3.1

---

**Status**: ⏳ **Ready to Execute**  
**Next Step**: Switch models → Run tests → Analyze results  
**Expected Outcome**: Validated ultra-cheap model + robust prompts


