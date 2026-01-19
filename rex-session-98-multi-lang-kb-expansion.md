# Session 98: Multi-Language KB Expansion

## Overview
Expand KB coverage across all supported languages with diverse frameworks. Monitor that:
- Successful fixes → Patterns saved to `fix_patterns` table
- Failed fixes → Tracked in `fix_failure_tracking` table

---

## PART 1: JAVA FRAMEWORKS

### 1.1 Spring Boot Projects
**Goal**: Test against popular Spring Boot repositories
**Repos**:
- `spring-projects/spring-petclinic` (already tested)
- `spring-projects/spring-boot` (core framework)
- `eugenp/tutorials` (Baeldung tutorials - diverse patterns)
**Steps**:
1. Run `count-kb.ts` to get baseline
2. Run AI fixer batch on each repo (limit 50)
3. Verify new patterns saved OR failures tracked
4. Log success/failure rates per rule

### 1.2 Apache Commons Libraries
**Goal**: Cover utility libraries with common patterns
**Repos**:
- `apache/commons-lang` (already tested)
- `apache/commons-io` (I/O utilities)
- `apache/commons-collections` (already tested)
- `apache/commons-text` (string manipulation)
**Steps**:
1. Run AI fixer batch (limit 50 per repo)
2. Track CloseResource, EmptyCatchBlock patterns specifically
3. Verify context-aware patterns (FileInputStream vs Connection)

### 1.3 Enterprise Java
**Goal**: Cover enterprise patterns (JPA, Hibernate, JAX-RS)
**Repos**:
- `hibernate/hibernate-orm` (ORM patterns)
- `quarkusio/quarkus` (modern Java framework)
- `eclipse-ee4j/jersey` (JAX-RS reference)
**Steps**:
1. Run AI fixer with focus on resource management
2. Track Connection, PreparedStatement, ResultSet patterns
3. Verify security-related fixes (SQL injection, etc.)

### 1.4 Build Tools & Testing
**Goal**: Cover Maven/Gradle plugins and test frameworks
**Repos**:
- `junit-team/junit5` (testing patterns)
- `mockito/mockito` (mocking patterns)
- `google/guava` (already tested)
**Steps**:
1. Run AI fixer batch
2. Focus on test-related patterns
3. Track assertion patterns and mock usage

---

## PART 2: TYPESCRIPT/JAVASCRIPT

### 2.1 Node.js Backend Frameworks
**Goal**: Cover Express, NestJS, Fastify patterns
**Repos**:
- `expressjs/express` (core Express)
- `nestjs/nest` (enterprise TypeScript)
- `fastify/fastify` (high-performance)
**Tools**: ESLint, TypeScript compiler
**Steps**:
1. Install/configure ESLint for each repo
2. Run AI fixer batch (limit 50)
3. Track async/await patterns, error handling
4. Verify TS type-related fixes

### 2.2 React/Frontend
**Goal**: Cover React component patterns
**Repos**:
- `facebook/react` (core React)
- `vercel/next.js` (Next.js framework)
- `remix-run/remix` (Remix framework)
**Steps**:
1. Focus on React hooks, component patterns
2. Track useEffect cleanup, dependency array issues
3. Verify JSX/TSX specific fixes

### 2.3 Full-Stack TypeScript
**Goal**: Cover full-stack TS patterns
**Repos**:
- `trpc/trpc` (type-safe APIs)
- `prisma/prisma` (database ORM)
- `supabase/supabase` (our own dependency!)
**Steps**:
1. Track type inference patterns
2. Focus on Prisma query patterns
3. Verify generic type fixes

---

## PART 3: PYTHON

### 3.1 Web Frameworks
**Goal**: Cover Django, Flask, FastAPI patterns
**Repos**:
- `django/django` (core Django)
- `pallets/flask` (Flask framework)
- `tiangolo/fastapi` (modern async API)
**Tools**: Pylint, Ruff, mypy
**Steps**:
1. Run Ruff/Pylint analysis
2. Focus on async patterns (FastAPI)
3. Track type hint fixes (mypy)

### 3.2 Data Science
**Goal**: Cover pandas, numpy patterns
**Repos**:
- `pandas-dev/pandas` (data manipulation)
- `numpy/numpy` (numerical computing)
- `scikit-learn/scikit-learn` (ML library)
**Steps**:
1. Track vectorization patterns
2. Focus on deprecation warnings
3. Verify numpy array type fixes

### 3.3 Infrastructure/DevOps
**Goal**: Cover Ansible, infrastructure patterns
**Repos**:
- `ansible/ansible` (automation)
- `boto/boto3` (AWS SDK)
- `apache/airflow` (workflow orchestration)
**Steps**:
1. Track YAML handling patterns
2. Focus on security patterns (credential handling)
3. Verify async I/O patterns

---

## PART 4: GO

### 4.1 Web/API Frameworks
**Goal**: Cover Gin, Echo, standard library patterns
**Repos**:
- `gin-gonic/gin` (HTTP framework)
- `labstack/echo` (high-performance)
- `gofiber/fiber` (Express-inspired)
**Tools**: golangci-lint, staticcheck
**Steps**:
1. Configure golangci-lint
2. Track error handling patterns
3. Focus on goroutine leak prevention

### 4.2 Cloud Native
**Goal**: Cover Kubernetes, Docker patterns
**Repos**:
- `kubernetes/kubernetes` (large, sample subset)
- `docker/cli` (Docker CLI)
- `containerd/containerd` (container runtime)
**Steps**:
1. Focus on context.Context usage
2. Track defer patterns
3. Verify channel handling fixes

### 4.3 Database/Storage
**Goal**: Cover database driver patterns
**Repos**:
- `go-gorm/gorm` (ORM)
- `go-redis/redis` (Redis client)
- `jackc/pgx` (PostgreSQL driver)
**Steps**:
1. Track connection pool patterns
2. Focus on transaction handling
3. Verify resource cleanup (rows.Close())

---

## PART 5: MONITORING & VERIFICATION

### 5.1 Pattern Persistence Monitoring
**Goal**: Verify every successful fix creates a pattern
**Steps**:
1. Before each batch: Record pattern count
2. After each batch: Compare pattern count
3. Calculate: `new_patterns = after - before`
4. Verify: `new_patterns >= successful_fixes * 0.8` (80% save rate minimum)

### 5.2 Failure Tracking Monitoring
**Goal**: Verify failed fixes are tracked for learning
**Steps**:
1. Query `fix_failure_tracking` before/after
2. Verify failures with 3+ occurrences flagged
3. Run `kb-review-cli.ts list` to check queue

### 5.3 Pattern Quality Audit
**Goal**: Verify patterns are usable (not empty/corrupted)
**Steps**:
1. Query patterns with empty `fix_template`
2. Query patterns with corrupted content markers
3. Clean up any invalid patterns

### 5.4 Cross-Session Reuse Test
**Goal**: Verify patterns work across sessions
**Steps**:
1. Run batch on repo A (creates patterns)
2. Clear in-memory cache
3. Run batch on repo B (same rules)
4. Verify patterns reused from Supabase (not regenerated)

---

## EXECUTION ORDER

**Phase 1 (Java)**: Tasks 1.1-1.4 (4 repos each = 16 repos)
**Phase 2 (TypeScript)**: Tasks 2.1-2.3 (3 repos each = 9 repos)
**Phase 3 (Python)**: Tasks 3.1-3.3 (3 repos each = 9 repos)
**Phase 4 (Go)**: Tasks 4.1-4.3 (3 repos each = 9 repos)
**Phase 5 (Monitoring)**: Tasks 5.1-5.4 (run after each phase)

**Total**: ~43 repositories to test

---

## SUCCESS CRITERIA

- [ ] 90%+ fix success rate per language
- [ ] Pattern count increases after each batch
- [ ] Failures tracked when fixes fail
- [ ] Pattern reuse verified across sessions
- [ ] No corrupted patterns in database
