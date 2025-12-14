# Pattern Library Calibration Plan

**Created: December 5, 2025 (Session 38)**
**Goal: Grow pattern library to 500+ patterns per language before BASIC tier launch**

---

## Overview

The self-improving pattern system learns from every successful AI-generated fix. To maximize BASIC tier value (pattern-only fixes, no AI cost), we must calibrate the system against diverse repositories across all supported languages.

### Key Metrics

| Language | Current Patterns | Target Patterns | Status |
|----------|------------------|-----------------|--------|
| TypeScript/JavaScript | ~50 | 500+ | In Progress |
| Java | ~30 | 500+ | In Progress |
| Python | ~10 | 500+ | Planned |
| Go | 0 | 300+ | Planned |
| Rust | 0 | 200+ | Future |
| PHP | 0 | 200+ | Future |

---

## Phase 1: TypeScript/JavaScript (Priority P0)

### Completed
- [x] CodeQual PR #69 - V9 Footer Fixes (282 issues, 243 fixed)

### Calibration Repositories

#### 1.1 React Ecosystem
| Repository | PR/Branch | Issues Expected | Patterns Expected |
|------------|-----------|-----------------|-------------------|
| facebook/create-react-app | Local branch | 100-200 | 50-100 |
| facebook/react | Open PR | 150-300 | 80-150 |
| vercel/next.js | Open PR | 200-400 | 100-200 |

```bash
# Command to run React calibration
ssh -T -i "$SSH_KEY" "$ORACLE_USER@$ORACLE_IP" 'cd ~/codequal/packages/agents && \
  export USER_TIER=pro && \
  npx ts-node tests/integration/calibration/calibrate-react.ts'
```

#### 1.2 Backend Frameworks
| Repository | PR/Branch | Issues Expected | Patterns Expected |
|------------|-----------|-----------------|-------------------|
| nestjs/nest | Open PR | 100-200 | 50-100 |
| expressjs/express | Local branch | 50-100 | 30-50 |
| fastify/fastify | Open PR | 80-150 | 40-80 |

#### 1.3 Build Tools & Utilities
| Repository | PR/Branch | Issues Expected | Patterns Expected |
|------------|-----------|-----------------|-------------------|
| webpack/webpack | Open PR | 100-200 | 50-100 |
| esbuild/esbuild | Local branch | 50-100 | 30-50 |
| vitejs/vite | Open PR | 80-150 | 40-80 |

### Expected Pattern Categories (TypeScript)
- `eslint/no-unused-vars` - Variable removal
- `eslint/no-explicit-any` - Type inference
- `typescript-eslint/explicit-function-return-type` - Return type addition
- `semgrep/detect-child-process` - Security (intentional use detection)
- `semgrep/sql-injection` - SQL parameterization
- `semgrep/xss-prevention` - Output encoding
- `npm-audit/*` - Dependency updates

---

## Phase 2: Java (Priority P0)

### Completed
- [x] spring-projects/spring-petclinic PR #950 (Java Spring validation)

### Calibration Repositories

#### 2.1 Spring Ecosystem
| Repository | PR/Branch | Issues Expected | Patterns Expected |
|------------|-----------|-----------------|-------------------|
| spring-projects/spring-boot | Open PR | 200-400 | 100-200 |
| spring-projects/spring-framework | Open PR | 300-500 | 150-250 |
| spring-projects/spring-security | Open PR | 150-300 | 80-150 |

#### 2.2 Enterprise Patterns
| Repository | PR/Branch | Issues Expected | Patterns Expected |
|------------|-----------|-----------------|-------------------|
| apache/kafka | Open PR | 150-300 | 80-150 |
| elastic/elasticsearch | Open PR | 200-400 | 100-200 |
| apache/flink | Open PR | 150-300 | 80-150 |

#### 2.3 Web Frameworks
| Repository | PR/Branch | Issues Expected | Patterns Expected |
|------------|-----------|-----------------|-------------------|
| quarkusio/quarkus | Open PR | 150-300 | 80-150 |
| micronaut-projects/micronaut-core | Open PR | 100-200 | 50-100 |

### Expected Pattern Categories (Java)
- `pmd/unused-imports` - Import cleanup
- `checkstyle/missing-javadoc` - Documentation
- `spotbugs/null-pointer` - Null safety
- `dependency-check/CVE-*` - Vulnerability fixes
- `semgrep/sql-injection` - Prepared statements
- `semgrep/path-traversal` - Path sanitization

---

## Phase 3: Python (Priority P0)

### Calibration Repositories

#### 3.1 Web Frameworks
| Repository | PR/Branch | Issues Expected | Patterns Expected |
|------------|-----------|-----------------|-------------------|
| tiangolo/fastapi | Open PR | 100-200 | 50-100 |
| django/django | Open PR | 200-400 | 100-200 |
| pallets/flask | Open PR | 80-150 | 40-80 |

#### 3.2 Data Science
| Repository | PR/Branch | Issues Expected | Patterns Expected |
|------------|-----------|-----------------|-------------------|
| pandas-dev/pandas | Open PR | 150-300 | 80-150 |
| numpy/numpy | Open PR | 100-200 | 50-100 |
| scikit-learn/scikit-learn | Open PR | 150-300 | 80-150 |

#### 3.3 DevOps & CLI Tools
| Repository | PR/Branch | Issues Expected | Patterns Expected |
|------------|-----------|-----------------|-------------------|
| ansible/ansible | Open PR | 150-300 | 80-150 |
| kubernetes/kubernetes (Python parts) | Open PR | 50-100 | 30-50 |

### Expected Pattern Categories (Python)
- `ruff/unused-import` - Import cleanup
- `bandit/sql-injection` - SQL parameterization
- `bandit/hardcoded-password` - Secret removal
- `mypy/type-annotation` - Type hints
- `pip-audit/CVE-*` - Dependency updates

---

## Phase 4: Go (Priority P1)

### Calibration Repositories

#### 4.1 Infrastructure Tools
| Repository | PR/Branch | Issues Expected | Patterns Expected |
|------------|-----------|-----------------|-------------------|
| kubernetes/kubernetes | Open PR | 200-400 | 100-200 |
| hashicorp/terraform | Open PR | 150-300 | 80-150 |
| docker/cli | Open PR | 100-200 | 50-100 |

#### 4.2 Web & API
| Repository | PR/Branch | Issues Expected | Patterns Expected |
|------------|-----------|-----------------|-------------------|
| gin-gonic/gin | Open PR | 80-150 | 40-80 |
| gofiber/fiber | Open PR | 80-150 | 40-80 |
| go-chi/chi | Open PR | 50-100 | 30-50 |

### Expected Pattern Categories (Go)
- `golangci-lint/ineffassign` - Unused assignments
- `golangci-lint/errcheck` - Error handling
- `gosec/hardcoded-credentials` - Secret removal
- `semgrep/sql-injection` - SQL parameterization

---

## Calibration Script Structure

### Run Single Calibration

```bash
# Set up environment
export SSH_KEY="/Users/alpinro/CodePrjects/codequal/keys/oracle/ssh-key-2025-10-07.key"
export ORACLE_IP="129.213.49.128"
export ORACLE_USER="opc"

# Run calibration for specific repo
ssh -T -i "$SSH_KEY" "$ORACLE_USER@$ORACLE_IP" 'cd ~/codequal/packages/agents && \
  export USER_TIER=pro && \
  export CALIBRATION_REPO="facebook/create-react-app" && \
  export CALIBRATION_LANGUAGE="typescript" && \
  npx ts-node --transpile-only tests/integration/test-v9-lite-e2e.ts 2>&1 | tee /tmp/calibration-react.log'
```

### Batch Calibration

```typescript
// tests/integration/calibration/run-batch-calibration.ts
const CALIBRATION_REPOS = {
  typescript: [
    { repo: 'facebook/create-react-app', framework: 'react' },
    { repo: 'nestjs/nest', framework: 'nestjs' },
    { repo: 'expressjs/express', framework: 'express' },
  ],
  java: [
    { repo: 'spring-projects/spring-boot', framework: 'spring' },
    { repo: 'quarkusio/quarkus', framework: 'quarkus' },
  ],
  python: [
    { repo: 'tiangolo/fastapi', framework: 'fastapi' },
    { repo: 'django/django', framework: 'django' },
  ],
  go: [
    { repo: 'gin-gonic/gin', framework: 'gin' },
    { repo: 'gofiber/fiber', framework: 'fiber' },
  ],
};
```

---

## Success Metrics

### Per Calibration Run
- **Issues Found**: Target 100+ per repo
- **Auto-Fix Rate**: Target 95%+ (PRO tier)
- **New Patterns Created**: Track unique patterns
- **Pattern Reuse Rate**: Track patterns reused from previous runs

### Overall Goals
| Milestone | Description | Target Date |
|-----------|-------------|-------------|
| M1 | 500+ TypeScript patterns | Dec 10, 2025 |
| M2 | 500+ Java patterns | Dec 15, 2025 |
| M3 | 500+ Python patterns | Dec 20, 2025 |
| M4 | 300+ Go patterns | Dec 25, 2025 |
| M5 | BASIC tier launch | Jan 1, 2026 |

### Pattern Quality Criteria
- **Confidence**: >= 0.8 for auto-apply
- **Apply Count**: Track usage across repos
- **Success Count**: Track successful applications
- **Revert Count**: Track if fixes cause issues (< 1% revert rate)

---

## Monitoring & Reporting

### Pattern Growth Dashboard (Supabase Query)

```sql
-- Pattern count by language
SELECT
  CASE
    WHEN rule_id LIKE '%eslint%' OR rule_id LIKE '%typescript%' THEN 'typescript'
    WHEN rule_id LIKE '%pmd%' OR rule_id LIKE '%checkstyle%' THEN 'java'
    WHEN rule_id LIKE '%ruff%' OR rule_id LIKE '%bandit%' THEN 'python'
    WHEN rule_id LIKE '%golangci%' OR rule_id LIKE '%gosec%' THEN 'go'
    ELSE 'other'
  END as language,
  COUNT(*) as pattern_count,
  AVG(confidence) as avg_confidence,
  SUM(apply_count) as total_applications,
  SUM(success_count) as successful_applications
FROM fix_patterns
WHERE status = 'active'
GROUP BY 1
ORDER BY pattern_count DESC;
```

### Daily Calibration Report

```bash
# Check pattern growth
ssh -T -i "$SSH_KEY" "$ORACLE_USER@$ORACLE_IP" 'cd ~/codequal && \
  psql -U postgres -d codequal -c "
    SELECT
      DATE(created_at) as date,
      COUNT(*) as new_patterns
    FROM fix_patterns
    WHERE created_at > NOW() - INTERVAL '\''7 days'\''
    GROUP BY 1
    ORDER BY 1 DESC;
  "'
```

---

## Next Steps

1. **Immediate (Today)**: Run calibration on Spring PetClinic to validate Java patterns
2. **Next**: Add FastAPI calibration for Python patterns
3. **This Week**: Complete TypeScript calibration with React/Next.js/NestJS
4. **Next Week**: Java enterprise patterns (Spring Boot, Kafka)
5. **Following Week**: Python and Go calibration

---

## Files Modified

When implementing this plan:

1. `tests/integration/test-v9-lite-e2e.ts` - Add calibration scenarios
2. `src/fix-agent/fix-pattern-registry/supabase-pattern-store.ts` - Pattern storage
3. `src/fix-agent/scan-fix-executor.ts` - Pattern lookup before AI generation

---

## Risk Mitigation

### Potential Issues
1. **Rate Limiting**: Use staggered execution, respect GitHub API limits
2. **Storage Costs**: Monitor Supabase row count, implement cleanup for low-confidence patterns
3. **Pattern Conflicts**: Use rule_id + tool as unique key, version patterns

### Rollback Strategy
- Keep pattern status as 'pending' until verified
- Allow manual deprecation of problematic patterns
- Track revert_count to auto-deprecate failing patterns

---

*This is a living document. Update as calibration progresses.*
