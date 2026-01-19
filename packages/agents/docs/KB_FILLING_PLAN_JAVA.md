# KB Filling Plan: Java Frameworks by Impact

**Goal**: Fill KB with patterns by running AI fixer on high-impact rules. Auto-learning is now enabled by default - successful fixes automatically add patterns to KB.

## Auto-Learning Flow (Session 94 Update)

```
┌─────────────────────────────────────────────────────────────────┐
│  NEW DEFAULT: submitToRegistry = true                           │
├─────────────────────────────────────────────────────────────────┤
│  1. AI fixer processes issue                                    │
│  2. Generates fix                                               │
│  3. Validation tool re-runs (PMD/ESLint/etc.)                   │
│  4. If PASSES:                                                  │
│     → Pattern AUTOMATICALLY added to Supabase KB                │
│     → Future fixes for same rule use cached pattern             │
│  5. If FAILS:                                                   │
│     → Failure tracked for manual KB review                      │
│     → Human creates pattern after analyzing failures            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Java Framework Priority Order

### Tier 1: Universal Java (All Frameworks)

These rules apply to ANY Java project regardless of framework.

| Priority | Rule | Tool | Typical Volume | Impact |
|----------|------|------|----------------|--------|
| 1 | **EmptyCatchBlock** | PMD | High | Security/Reliability |
| 2 | **CloseResource** | PMD | High | Memory leaks |
| 3 | **AvoidCatchingThrowable** | PMD | Medium | Error handling |
| 4 | **MissingOverride** | PMD | High | Maintainability |
| 5 | **LooseCoupling** | PMD | High | Design |
| 6 | **UseUtilityClass** | PMD | Medium | Design |
| 7 | **ShortVariable** | PMD | Very High | Readability |
| 8 | **LongVariable** | PMD | High | Readability |
| 9 | **FieldDeclarationsShouldBeAtStartOfClass** | PMD | High | Convention |
| 10 | **CommentDefaultAccessModifier** | PMD | Medium | Clarity |

**Current KB Coverage**: 10/10 ✅ (Session 84 + Session 94)

---

### Tier 2: Spring Framework

Most popular Java framework - Spring Boot, Spring MVC, Spring Data.

| Priority | Rule | Tool | Volume | Spring-Specific Pattern |
|----------|------|------|--------|------------------------|
| 1 | **AvoidFieldInjection** | PMD | High | Use constructor injection |
| 2 | **TransactionalMethodVisibility** | PMD | Medium | @Transactional on public methods |
| 3 | **BeanMethodsMustBePublic** | Custom | Medium | @Bean methods must be public |
| 4 | **AvoidUsingRequestMappingOnClass** | Custom | Low | Use specific @GetMapping etc. |
| 5 | **ProperServiceLayerException** | Custom | Medium | Don't catch and swallow in @Service |
| 6 | **LawOfDemeter** | PMD | Medium | Inject dependencies, don't chain |
| 7 | **CyclomaticComplexity** | PMD | Medium | Extract to @Service methods |

**Test Repositories**:
- `spring-projects/spring-petclinic` (already tested)
- `spring-projects/spring-boot` (large)
- `alibaba/spring-cloud-alibaba`

---

### Tier 3: Jakarta EE / Java EE

Enterprise Java applications.

| Priority | Rule | Tool | Volume | Pattern |
|----------|------|------|--------|---------|
| 1 | **AvoidStatefulSessionBeans** | PMD | Medium | Prefer stateless |
| 2 | **EJBExceptionHandling** | PMD | Medium | Proper exception wrapping |
| 3 | **JPAEntityRequirements** | Custom | High | @Entity must have no-arg constructor |
| 4 | **CDIInjectionPatterns** | Custom | Medium | @Inject over @Autowired |
| 5 | **ServletResourceManagement** | PMD | Medium | Proper stream closing |

**Test Repositories**:
- `eclipse-ee4j/jakartaee-examples`
- `wildfly/quickstart`

---

### Tier 4: Android

Mobile Java/Kotlin development.

| Priority | Rule | Tool | Volume | Pattern |
|----------|------|------|--------|---------|
| 1 | **AvoidLeakingContext** | Android Lint | High | WeakReference for Activity |
| 2 | **AsyncTaskUsage** | Android Lint | High | Use Coroutines/RxJava |
| 3 | **ViewBindingPatterns** | Custom | High | Proper null handling |
| 4 | **LifecycleAwareness** | Android Lint | Medium | Respect lifecycle |
| 5 | **PermissionHandling** | Android Lint | Medium | Runtime permissions |

**Test Repositories**:
- `android/sunflower`
- `google/iosched`

---

### Tier 5: Apache Commons / Utility Libraries

Heavily used in enterprise Java.

| Priority | Rule | Tool | Volume | Pattern |
|----------|------|------|--------|---------|
| 1 | **NullCheck** | PMD | Very High | Objects.requireNonNull |
| 2 | **StringUtils** | PMD | High | Use Apache StringUtils |
| 3 | **CollectionInitialization** | PMD | High | Specify initial capacity |
| 4 | **StreamResourceManagement** | PMD | High | Try-with-resources |
| 5 | **DeprecatedAPIUsage** | PMD | Medium | Update to new APIs |

**Test Repositories**:
- `apache/commons-io` (already tested)
- `apache/commons-lang`
- `apache/commons-collections`

---

## Execution Plan

### Phase 1: Run AI Fixer on Test Repositories (Auto-Learn)

```bash
# For each repository, run AI fixer with auto-learning enabled
# Patterns automatically added to KB on success

# Apache Commons (already have data)
npx ts-node tests/integration/run-ai-fixer-batch.ts \
  --repo apache/commons-io \
  --rules "EmptyCatchBlock,CloseResource,ShortVariable,LongVariable"

# Spring PetClinic
npx ts-node tests/integration/run-ai-fixer-batch.ts \
  --repo spring-projects/spring-petclinic \
  --rules "AvoidFieldInjection,LooseCoupling,MissingOverride"

# Jakarta EE Examples
npx ts-node tests/integration/run-ai-fixer-batch.ts \
  --repo eclipse-ee4j/jakartaee-examples \
  --rules "JPAEntityRequirements,ServletResourceManagement"
```

### Phase 2: Analyze Failures

After Phase 1, check failures:

```bash
# List rules that failed frequently
npx ts-node src/fix-agent/fix-pattern-registry/kb-review-cli.ts list

# For each failure, decide:
# - Can pattern be manually created?
# - Is rule architectural (not AI-fixable)?
```

### Phase 3: Manual Pattern Creation (Only for Failures)

Only create patterns manually for rules where AI consistently fails:

```typescript
// Example: If AvoidFieldInjection fails repeatedly
await addFixGuidance({
  ruleId: 'AvoidFieldInjection',
  language: 'java',
  tool: 'pmd',
  antiPatterns: [
    { pattern: '@Autowired on field', why: 'Cannot be mocked in tests, hidden dependency' }
  ],
  correctPatterns: [
    { pattern: 'Constructor injection', example:
      'private final MyService service;\n\npublic MyController(MyService service) {\n    this.service = service;\n}'
    }
  ],
  promptAdditions: `CRITICAL for AvoidFieldInjection:
- Replace @Autowired field with constructor parameter
- Add private final to the field
- Add @RequiredArgsConstructor if using Lombok
- Remove @Autowired annotation entirely`
});
```

---

## Priority Execution Order

| Week | Focus | Repositories | Expected KB Additions |
|------|-------|--------------|----------------------|
| 1 | Universal Java | commons-io, commons-lang | 10-15 patterns |
| 2 | Spring | petclinic, spring-boot | 8-12 patterns |
| 3 | Jakarta EE | jakartaee-examples | 5-8 patterns |
| 4 | Android | sunflower | 5-8 patterns |
| 5 | Review & Manual | Failed patterns | 3-5 patterns |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| KB Patterns Total | 50+ |
| Auto-learned (AI success) | 80%+ |
| Manually created (AI fail) | <20% |
| Java Universal Coverage | 100% |
| Spring Coverage | 80%+ |
| Jakarta EE Coverage | 70%+ |

---

## Key Principle

> **"Let AI fill the KB automatically. Only intervene when it fails."**
>
> With `submitToRegistry: true` (now default), every successful fix teaches the system.
> Human effort should only be spent on patterns AI cannot learn.

---

## Quick Start Command

```bash
# Session 95: Start KB filling with auto-learning
cd packages/agents
npx ts-node tests/integration/run-ai-fixer-batch.ts --repo apache/commons-lang
```
