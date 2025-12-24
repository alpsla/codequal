# Tools Scanning vs Fixing Capability Matrix

**Last Updated**: December 14, 2025 (Session 57)
**Purpose**: Document which tools scan (detect) vs fix (remediate) issues

---

## Issue Value Flow

Even when auto-fix isn't available, users ALWAYS receive valuable issue information:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ISSUE VALUE FLOW                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Scanner Tool → Issue Detected                                           │
│       │                                                                  │
│       ▼                                                                  │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ ALWAYS PROVIDED (100% of issues):                               │    │
│  │  • Issue description & location (file:line)                     │    │
│  │  • Severity (critical/high/medium/low)                          │    │
│  │  • Category (Security/Performance/Architecture/etc.)            │    │
│  │  • Rule ID and documentation link                               │    │
│  │  • Business impact explanation                                  │    │
│  │  • Priority guidance (P0-P3)                                    │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│       │                                                                  │
│       ▼                                                                  │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐    │
│  │ Tier 1 Native   │     │ Tier 2 Fixer    │     │ Tier 3 AI       │    │
│  │ --fix available │     │ Tool available  │     │ Generation      │    │
│  │ (26% of tools)  │     │ (19% of tools)  │     │ (55% of tools)  │    │
│  └────────┬────────┘     └────────┬────────┘     └────────┬────────┘    │
│           │                       │                       │              │
│           ▼                       ▼                       ▼              │
│     Auto-fix code           Suggested fix          AI-generated fix     │
│     (high confidence)       (medium confidence)    OR detailed guidance │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### What Users ALWAYS Get (Even Without Auto-Fix)

| Component | Description |
|-----------|-------------|
| **Issue Location** | Exact file path and line number |
| **Severity** | Risk-based classification (critical/high/medium/low) |
| **Category** | Security, Performance, Architecture, Code Quality, Dependencies |
| **Rule Documentation** | Link to rule explanation and examples |
| **Business Impact** | Why this matters (security risk, performance degradation, tech debt) |
| **Priority Guidance** | P0-P3 classification with timeframe recommendations |
| **Remediation Guidance** | Step-by-step guidance even for manual fixes |

### Scanner-Only Tools Value Proposition

For tools like **Lighthouse**, **Madge**, and **Bundle Analyzer** that have no auto-fix:

| Tool | Issue Type | User Gets |
|------|------------|-----------|
| **Lighthouse** | Slow LCP | Metric value, threshold comparison, optimization strategies |
| **Lighthouse** | High CLS | Layout shift causes, CSS/JS recommendations |
| **Bundle Analyzer** | Large Bundle | Bundle breakdown, code-splitting recommendations |
| **Madge** | Circular Dependency | Full cycle path, refactoring patterns |
| **Dependency Cruiser** | Architecture Violation | Rule details, dependency alternatives |
| **ts-unused-exports** | Dead Code | Export list, safe removal checklist |

---

## Overview

Tools in CodeQual are classified by their **purpose**:

| Purpose | Description | Examples |
|---------|-------------|----------|
| **Scanner** | Detects issues only, no auto-fix capability | Bandit, SpotBugs, gosec |
| **Fixer** | Fixes/formats code, no detection | Prettier, Black, gofmt |
| **Dual** | Can both detect AND auto-fix issues | ESLint, Ruff, RuboCop |

---

## Three-Tier Fix System

Our fix system routes issues based on tool capabilities:

| Tier | Description | Speed | Confidence | Safe for Auto-Apply |
|------|-------------|-------|------------|---------------------|
| **Tier 1** | Native `--fix` flag | Fast | 85-99% | Usually Yes |
| **Tier 2** | Dedicated fixer tool | Medium | 60-90% | Review Needed |
| **Tier 3** | AI-generated fix | Slow | 40-60% | Always Review |

---

## TypeScript/JavaScript

### Scanning Tools (Detection Only)
| Tool | Category | Purpose | Tier | Notes |
|------|----------|---------|------|-------|
| TypeScript Compiler (tsc) | Code Quality | Scanner | 3 | Type errors need manual/AI fix |
| npm audit | Dependencies | Scanner | 2 | Use `npm audit fix` separately |
| Lighthouse | Performance | Scanner | 3 | Reports metrics, no auto-fix |
| Bundle Analyzer | Performance | Scanner | 3 | Reports sizes, no auto-fix |
| Madge | Architecture | Scanner | 3 | Detects circular deps |
| Dependency Cruiser | Architecture | Scanner | 3 | Validates architecture rules |
| ts-unused-exports | Architecture | Scanner | 3 | Detects dead code |

### Fixing Tools (Remediation Only)
| Tool | Category | Purpose | Tier | Command |
|------|----------|---------|------|---------|
| Prettier | Formatting | Fixer | 1 | `prettier --write` |

### Dual-Purpose Tools (Scan + Fix)
| Tool | Category | Purpose | Tier | Scan Command | Fix Command |
|------|----------|---------|------|--------------|-------------|
| ESLint | Code Quality | Dual | 1 | `eslint` | `eslint --fix` |
| Biome | Code Quality | Dual | 1 | `biome check` | `biome check --apply` |
| Semgrep | Security | Dual | 1 | `semgrep` | `semgrep --autofix` |

---

## Python

### Scanning Tools (Detection Only)
| Tool | Category | Purpose | Tier | Notes |
|------|----------|---------|------|-------|
| Bandit | Security | Scanner | 3 | Security issues need AI fix |
| mypy | Code Quality | Scanner | 3 | Type errors need manual fix |
| Pylint | Code Quality | Scanner | 2 | Use Ruff for fixes |
| pip-audit | Dependencies | Scanner | 3 | Dependency updates manual |
| Safety | Dependencies | Scanner | 3 | Dependency updates manual |
| py-spy | Performance | Scanner | 3 | Profiling only |
| pydeps | Architecture | Scanner | 3 | Visualization only |

### Fixing Tools (Remediation Only)
| Tool | Category | Purpose | Tier | Command |
|------|----------|---------|------|---------|
| Black | Formatting | Fixer | 1 | `black` |
| isort | Imports | Fixer | 1 | `isort` |
| autoflake | Unused Code | Fixer | 1 | `autoflake --in-place` |
| pyupgrade | Modernization | Fixer | 2 | `pyupgrade --py39-plus` |

### Dual-Purpose Tools (Scan + Fix)
| Tool | Category | Purpose | Tier | Scan Command | Fix Command |
|------|----------|---------|------|--------------|-------------|
| Ruff | Code Quality | Dual | 1 | `ruff check` | `ruff check --fix` |
| Semgrep | Security | Dual | 1 | `semgrep` | `semgrep --autofix` |

---

## Java

### Scanning Tools (Detection Only)
| Tool | Category | Purpose | Tier | Notes |
|------|----------|---------|------|-------|
| Checkstyle | Code Quality | Scanner | 2 | Use google-java-format |
| PMD | Code Quality | Scanner | 2 | Use Sorald for some fixes |
| SpotBugs | Security | Scanner | 2 | Use Sorald for some fixes |
| OWASP Dependency-Check | Dependencies | Scanner | 2 | Use Renovate |
| jmh | Performance | Scanner | 3 | Benchmarking only |
| jdepend | Architecture | Scanner | 3 | Metrics only |

### Fixing Tools (Remediation Only)
| Tool | Category | Purpose | Tier | Command |
|------|----------|---------|------|---------|
| google-java-format | Formatting | Fixer | 2 | `google-java-format -i` |
| Sorald | Bug Fixes | Fixer | 2 | `java -jar sorald.jar repair` |
| Spotless | Formatting | Fixer | 2 | `./gradlew spotlessApply` |

### Dual-Purpose Tools (Scan + Fix)
| Tool | Category | Purpose | Tier | Scan Command | Fix Command |
|------|----------|---------|------|--------------|-------------|
| Semgrep | Security | Dual | 1 | `semgrep` | `semgrep --autofix` |

---

## Go

### Scanning Tools (Detection Only)
| Tool | Category | Purpose | Tier | Notes |
|------|----------|---------|------|-------|
| staticcheck | Code Quality | Scanner | 3 | Issues need manual fix |
| gosec | Security | Scanner | 3 | Security issues need AI fix |
| govulncheck | Dependencies | Scanner | 3 | Dependency updates manual |
| pprof | Performance | Scanner | 3 | Profiling only |

### Fixing Tools (Remediation Only)
| Tool | Category | Purpose | Tier | Command |
|------|----------|---------|------|---------|
| gofmt | Formatting | Fixer | 1 | `gofmt -w` |
| goimports | Imports | Fixer | 1 | `goimports -w` |

### Dual-Purpose Tools (Scan + Fix)
| Tool | Category | Purpose | Tier | Scan Command | Fix Command |
|------|----------|---------|------|--------------|-------------|
| golangci-lint | Code Quality | Dual | 1 | `golangci-lint run` | `golangci-lint run --fix` |
| Semgrep | Security | Dual | 1 | `semgrep` | `semgrep --autofix` |

---

## Rust

### Scanning Tools (Detection Only)
| Tool | Category | Purpose | Tier | Notes |
|------|----------|---------|------|-------|
| cargo-audit | Dependencies | Scanner | 3 | Dependency updates manual |
| cargo-deny | Dependencies | Scanner | 3 | License/ban checking |

### Fixing Tools (Remediation Only)
| Tool | Category | Purpose | Tier | Command |
|------|----------|---------|------|---------|
| rustfmt | Formatting | Fixer | 1 | `rustfmt` |

### Dual-Purpose Tools (Scan + Fix)
| Tool | Category | Purpose | Tier | Scan Command | Fix Command |
|------|----------|---------|------|--------------|-------------|
| Clippy | Code Quality | Dual | 1 | `cargo clippy` | `cargo clippy --fix` |
| Semgrep | Security | Dual | 1 | `semgrep` | `semgrep --autofix` |

---

## Ruby

### Scanning Tools (Detection Only)
| Tool | Category | Purpose | Tier | Notes |
|------|----------|---------|------|-------|
| Brakeman | Security | Scanner | 3 | Rails security scanner |
| bundler-audit | Dependencies | Scanner | 3 | Gem vulnerabilities |

### Dual-Purpose Tools (Scan + Fix)
| Tool | Category | Purpose | Tier | Scan Command | Fix Command |
|------|----------|---------|------|--------------|-------------|
| RuboCop | Code Quality | Dual | 1 | `rubocop` | `rubocop -a` |
| Semgrep | Security | Dual | 1 | `semgrep` | `semgrep --autofix` |

---

## PHP

### Scanning Tools (Detection Only)
| Tool | Category | Purpose | Tier | Notes |
|------|----------|---------|------|-------|
| PHPStan | Code Quality | Scanner | 3 | Static analysis |
| Psalm | Code Quality | Scanner | 3 | Type inference |
| composer audit | Dependencies | Scanner | 3 | Package vulnerabilities |

### Fixing Tools (Remediation Only)
| Tool | Category | Purpose | Tier | Command |
|------|----------|---------|------|---------|
| PHP-CS-Fixer | Formatting | Fixer | 1 | `php-cs-fixer fix` |
| phpcbf | Style | Fixer | 2 | `phpcbf` |

### Dual-Purpose Tools (Scan + Fix)
| Tool | Category | Purpose | Tier | Scan Command | Fix Command |
|------|----------|---------|------|--------------|-------------|
| PHPCS | Code Quality | Dual | 2 | `phpcs` | `phpcbf` (via phpcbf) |
| Semgrep | Security | Dual | 1 | `semgrep` | `semgrep --autofix` |

---

## C#/.NET

### Scanning Tools (Detection Only)
| Tool | Category | Purpose | Tier | Notes |
|------|----------|---------|------|-------|
| Security Code Scan | Security | Scanner | 3 | Roslyn-based |
| dotnet-outdated | Dependencies | Scanner | 3 | NuGet vulnerabilities |

### Dual-Purpose Tools (Scan + Fix)
| Tool | Category | Purpose | Tier | Scan Command | Fix Command |
|------|----------|---------|------|--------------|-------------|
| dotnet format | Code Quality | Dual | 1 | `dotnet format --verify-no-changes` | `dotnet format` |
| Semgrep | Security | Dual | 1 | `semgrep` | `semgrep --autofix` |

---

## Summary Statistics

### By Language

| Language | Scanners | Fixers | Dual | Total |
|----------|----------|--------|------|-------|
| TypeScript | 7 | 1 | 3 | 11 |
| Python | 7 | 4 | 2 | 13 |
| Java | 6 | 3 | 1 | 10 |
| Go | 4 | 2 | 2 | 8 |
| Rust | 2 | 1 | 2 | 5 |
| Ruby | 2 | 0 | 2 | 4 |
| PHP | 3 | 2 | 2 | 7 |
| C#/.NET | 2 | 0 | 2 | 4 |
| **Total** | **33** | **13** | **16** | **62** |

### By Tier

| Tier | Tools | Percentage |
|------|-------|------------|
| Tier 1 (Native Fix) | 16 | 26% |
| Tier 2 (Dedicated Fixer) | 12 | 19% |
| Tier 3 (AI Required) | 20 | 32% |
| Scanner Only | 14 | 23% |

---

## Integration with Category Detector

The `category-detector.ts` routes issues to agents. The `tool-fix-registry.ts` then determines fix capability:

```typescript
// Detection flow
Issue → Category Detector → Agent (Security, Quality, etc.)
                         ↓
// Fix flow
Issue → Tool Fix Registry → Tier Router → Fixer Execution
                         ↓
                 Tier 1: Native --fix
                 Tier 2: Dedicated fixer
                 Tier 3: AI generation
```

---

## Extending the System

### To add a new Scanner:
1. Add to language orchestrator's tool list
2. Add to `category-detector.ts` for agent routing
3. Add to `TIER3_AI_REQUIRED` in `tool-fix-registry.ts`

### To add a new Fixer:
1. Add to `TIER1_NATIVE_FIXERS` or `TIER2_DEDICATED_FIXERS`
2. Add fix command and confidence score
3. Set `safeForAutoApply` based on determinism

### To add a Dual-Purpose tool:
1. Add scanning logic to orchestrator
2. Add to category detector
3. Add to appropriate tier in fix registry with both scan and fix commands

---

## Related Files

| File | Purpose |
|------|---------|
| `src/two-branch/fix-agent/tool-fix-registry.ts` | Central fix capability registry |
| `src/two-branch/fix-agent/fix-router.ts` | Routes issues to appropriate fixers |
| `src/two-branch/fix-agent/issue-classifier.ts` | Classifies issues by type |
| `src/two-branch/report/category-detector.ts` | Maps tools to agent categories |
| `src/two-branch/config/analysis-modes.ts` | Analysis mode configuration |
