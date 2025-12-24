# Tools, Languages, and Agents Matrix

**Last Updated**: December 19, 2025 (Session 59)
**Purpose**: Document the complete architecture of tools, languages, and agents

---

## Quick Reference - All Tools by Priority

| Priority | Tools | Category | Languages |
|----------|-------|----------|-----------|
| **P0 - Critical Security** | gitleaks, trufflehog | Secrets | All |
| **P0 - Critical Security** | checkov | IaC Security | All |
| **P0 - Critical Security** | trivy, grype | Container Security | All |
| **P1 - API/GraphQL** | spectral | API Design | All |
| **P1 - API/GraphQL** | graphql-cop | GraphQL Security | JS/TS/Python/Ruby/Java/Go |
| **P2 - Architecture** | jdepend | Architecture | Java |
| **P2 - Architecture** | pydeps, import-linter | Architecture | Python |

---

## Language Orchestrators

| Language | Orchestrator | Docker Image | Status |
|----------|--------------|--------------|--------|
| Java | JavaToolOrchestrator | analyzer:lang-java-v5.1-arm | Production |
| TypeScript/JS | TypeScriptToolOrchestrator | analyzer:lang-typescript-v4.6-arm | Production |
| Python | PythonToolOrchestrator | analyzer:lang-python-v4.1-arm | Production |
| Go | GoToolOrchestrator | golang:1.22-alpine | Production |
| Rust | RustToolOrchestrator | rust:1.75-slim | Production |
| Ruby | RubyToolOrchestrator | ruby:3.2-slim | Production |
| PHP | PHPToolOrchestrator | php:8.2-cli | Production |
| C#/.NET | DotnetToolOrchestrator | mcr.microsoft.com/dotnet/sdk:8.0 | Production |

---

## Tools per Language

### Java
| Tool | Category | Agent | Purpose | Fix Tier |
|------|----------|-------|---------|----------|
| Checkstyle | Code Quality | CodeQualityAgent | Style and naming conventions | 2 |
| PMD | Code Quality | CodeQualityAgent | Bug patterns, unused code | 2 |
| SpotBugs | Security | SecurityAgent | Bug patterns, security issues | 2 |
| OWASP Dependency-Check | Dependencies | DependencyAgent | CVE detection in dependencies | 3 |
| Semgrep | Security | SecurityAgent | Pattern-based security scanning | 1 |
| **jdepend** | Architecture | ArchitectureAgent | Package metrics, circular deps | 3 (Rec) |
| **gitleaks** | Secrets | SecurityAgent | Secret detection | 3 (Rec) |
| **trufflehog** | Secrets | SecurityAgent | Secret detection | 3 (Rec) |
| **checkov** | IaC Security | SecurityAgent | Terraform/K8s/Docker security | 3 (Rec) |
| **trivy** | Container | SecurityAgent | Container vulnerability scan | 3 (Rec) |
| **grype** | Container | SecurityAgent | Container vulnerability scan | 3 (Rec) |
| **spectral** | API Design | CodeQualityAgent | OpenAPI/AsyncAPI linting | 3 (Rec) |
| **graphql-cop** | GraphQL | SecurityAgent | GraphQL security | 3 (Rec) |

### TypeScript/JavaScript
| Tool | Category | Agent | Purpose | Fix Tier |
|------|----------|-------|---------|----------|
| ESLint | Code Quality | CodeQualityAgent | Linting, code style | 1 |
| TypeScript Compiler (tsc) | Code Quality | CodeQualityAgent | Type checking | 3 |
| npm audit | Dependencies | DependencyAgent | Package vulnerabilities | 1 |
| Semgrep | Security | SecurityAgent | Pattern-based security scanning | 1 |
| Lighthouse | Performance | PerformanceAgent | Web Core Vitals (LCP, FID, CLS) | 3 (Rec) |
| Bundle Analyzer | Performance | PerformanceAgent | Bundle size analysis | 3 (Rec) |
| ESLint Perf | Performance | PerformanceAgent | Code performance patterns | 1 |
| Madge | Architecture | ArchitectureAgent | Circular dependency detection | 3 (Rec) |
| Dependency Cruiser | Architecture | ArchitectureAgent | Architecture rule validation | 3 (Rec) |
| ts-unused-exports | Architecture | ArchitectureAgent | Dead code detection | 3 (Rec) |
| **gitleaks** | Secrets | SecurityAgent | Secret detection | 3 (Rec) |
| **trufflehog** | Secrets | SecurityAgent | Secret detection | 3 (Rec) |
| **checkov** | IaC Security | SecurityAgent | Terraform/K8s/Docker security | 3 (Rec) |
| **trivy** | Container | SecurityAgent | Container vulnerability scan | 3 (Rec) |
| **grype** | Container | SecurityAgent | Container vulnerability scan | 3 (Rec) |
| **spectral** | API Design | CodeQualityAgent | OpenAPI/AsyncAPI linting | 3 (Rec) |
| **graphql-cop** | GraphQL | SecurityAgent | GraphQL security | 3 (Rec) |

### Python
| Tool | Category | Agent | Purpose | Fix Tier |
|------|----------|-------|---------|----------|
| Ruff | Code Quality | CodeQualityAgent | Fast linting (replaces Pylint) | 1 |
| Pylint | Code Quality | CodeQualityAgent | Legacy linting | 2 |
| Bandit | Security | SecurityAgent | Security vulnerability scanning | 3 |
| mypy | Code Quality | CodeQualityAgent | Type checking | 3 |
| pip-audit | Dependencies | DependencyAgent | Package vulnerabilities | 1 |
| Safety | Dependencies | DependencyAgent | Legacy package scanning | 3 |
| Semgrep | Security | SecurityAgent | Pattern-based security scanning | 1 |
| **pydeps** | Architecture | ArchitectureAgent | Dependency graphs, cycles | 3 (Rec) |
| **import-linter** | Architecture | ArchitectureAgent | Layer validation | 3 (Rec) |
| **gitleaks** | Secrets | SecurityAgent | Secret detection | 3 (Rec) |
| **trufflehog** | Secrets | SecurityAgent | Secret detection | 3 (Rec) |
| **checkov** | IaC Security | SecurityAgent | Terraform/K8s/Docker security | 3 (Rec) |
| **trivy** | Container | SecurityAgent | Container vulnerability scan | 3 (Rec) |
| **grype** | Container | SecurityAgent | Container vulnerability scan | 3 (Rec) |
| **spectral** | API Design | CodeQualityAgent | OpenAPI/AsyncAPI linting | 3 (Rec) |
| **graphql-cop** | GraphQL | SecurityAgent | GraphQL security | 3 (Rec) |

### Go
| Tool | Category | Agent | Purpose | Fix Tier |
|------|----------|-------|---------|----------|
| golangci-lint | Code Quality | CodeQualityAgent | Meta-linter (50+ linters) | 1 |
| staticcheck | Code Quality | CodeQualityAgent | Advanced static analysis | 3 |
| govulncheck | Dependencies | DependencyAgent | Go vulnerability database | 3 |
| gosec | Security | SecurityAgent | Security scanning | 3 |
| Semgrep | Security | SecurityAgent | Pattern-based security scanning | 1 |
| **gitleaks** | Secrets | SecurityAgent | Secret detection | 3 (Rec) |
| **trufflehog** | Secrets | SecurityAgent | Secret detection | 3 (Rec) |
| **checkov** | IaC Security | SecurityAgent | Terraform/K8s/Docker security | 3 (Rec) |
| **trivy** | Container | SecurityAgent | Container vulnerability scan | 3 (Rec) |
| **spectral** | API Design | CodeQualityAgent | OpenAPI/AsyncAPI linting | 3 (Rec) |
| **graphql-cop** | GraphQL | SecurityAgent | GraphQL security | 3 (Rec) |

### Rust
| Tool | Category | Agent | Purpose | Fix Tier |
|------|----------|-------|---------|----------|
| clippy | Code Quality | CodeQualityAgent | Rust linting (700+ rules) | 1 |
| cargo-audit | Dependencies | DependencyAgent | RustSec advisory database | 3 |
| cargo-deny | Dependencies | DependencyAgent | License/ban/advisory checking | 3 |
| Semgrep | Security | SecurityAgent | Pattern-based security scanning | 1 |
| **gitleaks** | Secrets | SecurityAgent | Secret detection | 3 (Rec) |
| **trufflehog** | Secrets | SecurityAgent | Secret detection | 3 (Rec) |
| **checkov** | IaC Security | SecurityAgent | Terraform/K8s/Docker security | 3 (Rec) |
| **trivy** | Container | SecurityAgent | Container vulnerability scan | 3 (Rec) |

### Ruby
| Tool | Category | Agent | Purpose | Fix Tier |
|------|----------|-------|---------|----------|
| RuboCop | Code Quality | CodeQualityAgent | Ruby linting | 1 |
| Brakeman | Security | SecurityAgent | Rails security scanner | 3 |
| bundler-audit | Dependencies | DependencyAgent | Gem vulnerabilities | 2 |
| Semgrep | Security | SecurityAgent | Pattern-based security scanning | 1 |
| **gitleaks** | Secrets | SecurityAgent | Secret detection | 3 (Rec) |
| **trufflehog** | Secrets | SecurityAgent | Secret detection | 3 (Rec) |
| **checkov** | IaC Security | SecurityAgent | Terraform/K8s/Docker security | 3 (Rec) |
| **trivy** | Container | SecurityAgent | Container vulnerability scan | 3 (Rec) |
| **spectral** | API Design | CodeQualityAgent | OpenAPI/AsyncAPI linting | 3 (Rec) |
| **graphql-cop** | GraphQL | SecurityAgent | GraphQL security | 3 (Rec) |

### PHP
| Tool | Category | Agent | Purpose | Fix Tier |
|------|----------|-------|---------|----------|
| PHPStan | Code Quality | CodeQualityAgent | Static analysis (levels 0-9) | 3 |
| Psalm | Code Quality | CodeQualityAgent | Type inference, taint analysis | 1 |
| PHP_CodeSniffer | Code Quality | CodeQualityAgent | PSR-12 style | 2 |
| composer audit | Dependencies | DependencyAgent | Package vulnerabilities | 3 |
| Semgrep | Security | SecurityAgent | Pattern-based security scanning | 1 |
| **gitleaks** | Secrets | SecurityAgent | Secret detection | 3 (Rec) |
| **trufflehog** | Secrets | SecurityAgent | Secret detection | 3 (Rec) |
| **checkov** | IaC Security | SecurityAgent | Terraform/K8s/Docker security | 3 (Rec) |
| **trivy** | Container | SecurityAgent | Container vulnerability scan | 3 (Rec) |
| **spectral** | API Design | CodeQualityAgent | OpenAPI/AsyncAPI linting | 3 (Rec) |

### C#/.NET
| Tool | Category | Agent | Purpose | Fix Tier |
|------|----------|-------|---------|----------|
| dotnet format | Code Quality | CodeQualityAgent | Code style analyzer | 1 |
| Security Code Scan | Security | SecurityAgent | Roslyn-based security | 3 |
| dotnet-outdated | Dependencies | DependencyAgent | NuGet vulnerabilities | 3 |
| Semgrep | Security | SecurityAgent | Pattern-based security scanning | 1 |
| **gitleaks** | Secrets | SecurityAgent | Secret detection | 3 (Rec) |
| **trufflehog** | Secrets | SecurityAgent | Secret detection | 3 (Rec) |
| **checkov** | IaC Security | SecurityAgent | Terraform/K8s/Docker security | 3 (Rec) |
| **trivy** | Container | SecurityAgent | Container vulnerability scan | 3 (Rec) |

---

## Universal Tools (All Languages)

### P0 - Critical Security Tools (Session 59)

| Tool | Category | Purpose | Fix Capability |
|------|----------|---------|----------------|
| **gitleaks** | Secrets | Detect hardcoded secrets, API keys, tokens | Recommendation only (rotation required) |
| **trufflehog** | Secrets | Deep secret scanning with verification | Recommendation only (rotation required) |
| **checkov** | IaC Security | Terraform, Kubernetes, Docker security | Recommendation only (config changes) |
| **trivy** | Container | Container image vulnerability scanning | Recommendation only (image updates) |
| **grype** | Container | SBOM-based vulnerability scanning | Recommendation only (image updates) |

### P1 - API/GraphQL Tools (Session 59)

| Tool | Category | Purpose | Fix Capability |
|------|----------|---------|----------------|
| **spectral** | API Design | OpenAPI/AsyncAPI schema linting | Recommendation only (schema design) |
| **graphql-cop** | GraphQL | GraphQL security misconfigurations | Recommendation only (server config) |

### P2 - Architecture Tools (Session 59)

| Tool | Category | Purpose | Fix Capability |
|------|----------|---------|----------------|
| **jdepend** | Architecture | Java package metrics, coupling analysis | Recommendation only (refactoring) |
| **pydeps** | Architecture | Python dependency graphs, cycles | Recommendation only (refactoring) |
| **import-linter** | Architecture | Python layer validation | Recommendation only (refactoring) |

---

## 5 Specialized Agents

| Agent | Category | Responsibility |
|-------|----------|----------------|
| SecurityAgent | Security | Security vulnerabilities, injection flaws, authentication issues |
| CodeQualityAgent | Code Quality | Style, conventions, potential bugs, code smells |
| PerformanceAgent | Performance | Performance issues, optimization opportunities |
| ArchitectureAgent | Architecture | Design patterns, coupling, cohesion, complexity |
| DependencyAgent | Dependencies | CVEs, outdated packages, license issues |

---

## Three-Tier Fix System

| Tier | Description | Tools | Confidence |
|------|-------------|-------|------------|
| **Tier 1** | Native `--fix` | ESLint, Ruff, RuboCop, Clippy, golangci-lint, Semgrep | 85-99% |
| **Tier 2** | Dedicated Fixer | Prettier, Black, Sorald, phpcbf | 60-90% |
| **Tier 3** | AI Generation | All unfixable issues | 40-60% |
| **Recommendation** | Manual guidance | Secrets, IaC, Container, GraphQL, Architecture | N/A |

---

## Category Detection Rules

### Secrets Category (P0)
- Tools: gitleaks, trufflehog
- Always recommendation-only (secrets must be rotated manually)

### IaC Security Category (P0)
- Tools: checkov
- Always recommendation-only (infrastructure config changes)

### Container Security Category (P0)
- Tools: trivy, grype
- Always recommendation-only (image/dependency updates)

### GraphQL Security Category (P1)
- Tools: graphql-cop
- Always recommendation-only (server configuration)

### API Design Category (P1)
- Tools: spectral
- Always recommendation-only (schema design decisions)

### Architecture Category (P2)
- Tools: jdepend, pydeps, import-linter, madge, dependency-cruiser
- Always recommendation-only (structural refactoring)

### Security Category
- Tools: semgrep, bandit, brakeman, gosec, security-code-scan
- Rules containing: security, injection, xss, csrf, auth, hardcoded
- Mix of fixable (Semgrep autofix) and recommendation-only

### Dependencies Category
- Tools: dependency-check, npm-audit, pip-audit, safety, bundler-audit, cargo-audit
- Rules containing: dependency, cve
- Mix of fixable (npm audit fix) and recommendation-only

### Performance Category
- Tools: lighthouse, bundle-analyzer, eslint-perf
- Rules containing: perf, performance, optimization, cache, memory
- Mostly recommendation-only

### Code Quality Category (Default)
- Tools: checkstyle, pmd, eslint, pylint, mypy, ruff, golangci-lint, rubocop, phpstan
- Rules containing: naming, style, convention, null, exception, bug
- Mostly fixable (Tier 1 or Tier 2)

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           V9 PR ANALYZER                                     │
│  Receives: Repository URL, PR Number, Language                               │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     LANGUAGE ORCHESTRATOR                                    │
│  Selects tools based on:                                                     │
│  - Language (Java/Python/TS/etc.)                                            │
│  - Framework (Spring/Django/React/etc.)                                      │
│  - Analysis mode (quick/thorough/complete)                                   │
│                                                                              │
│  Configuration sources:                                                      │
│  - universal-tool-config.ts (UNIVERSAL_TOOL_REGISTRY)                        │
│  - language-specific orchestrator config                                     │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    ▼                           ▼
    ┌────────────────────────┐    ┌────────────────────────┐
    │    MAIN BRANCH         │    │    PR BRANCH           │
    │    Tool Execution      │    │    Tool Execution      │
    └───────────┬────────────┘    └───────────┬────────────┘
                │                             │
                └──────────────┬──────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ISSUE COMPARISON                                        │
│  - Deduplication                                                             │
│  - NEW vs EXISTING classification                                            │
│  - Severity aggregation                                                      │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     CATEGORY DETECTOR                                        │
│  Routes issues to agents based on:                                           │
│  - Tool name (gitleaks → secrets)                                            │
│  - Rule ID patterns                                                          │
│  - Message keywords                                                          │
│                                                                              │
│  File: src/two-branch/report/category-detector.ts                            │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
    ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
    │ SecurityAgent    │ │ QualityAgent     │ │ ArchitectureAgent│
    │ DependencyAgent  │ │ PerformanceAgent │ │                  │
    └────────┬─────────┘ └────────┬─────────┘ └────────┬─────────┘
             │                    │                    │
             └────────────────────┼────────────────────┘
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      FIX AGENT (Three-Tier System)                           │
│                                                                              │
│  Tier 1: Native Fix (--fix flag)                                             │
│  Tier 2: Dedicated Fixer Tool                                                │
│  Tier 3: AI Generation                                                       │
│  Recommendation: Manual guidance (secrets, architecture, etc.)               │
│                                                                              │
│  Files:                                                                      │
│  - src/two-branch/fix-agent/tool-fix-registry.ts                             │
│  - src/fix-agent/ai-fix-prompts.ts                                           │
│  - src/fix-agent/agents/ai-fixer-agent.ts                                    │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      REPORT GENERATOR                                        │
│                                                                              │
│  Sections include:                                                           │
│  - Executive Summary                                                         │
│  - Issues by Category (with tool attribution)                                │
│  - Fix Summary (fixes applied + recommendations)                             │
│  - Tool Coverage Summary                                                     │
│                                                                              │
│  File: src/two-branch/analyzers/v9-grouped-report-formatter.ts               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Configuration Files Reference

| File | Purpose |
|------|---------|
| `src/two-branch/config/universal-tool-config.ts` | Master tool registry, framework mappings |
| `src/two-branch/report/category-detector.ts` | Maps tools to agents/categories |
| `src/two-branch/fix-agent/tool-fix-registry.ts` | Fix capability registry |
| `src/fix-agent/ai-fix-prompts.ts` | AI prompts for all categories |
| `src/fix-agent/schemas/tool-database-schema.ts` | Comprehensive tool database |
| `src/fix-agent/schemas/tool-matrix-bridge.ts` | Legacy format compatibility |

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| `TOOLS_SCAN_FIX_MAPPING.md` | Scan vs Fix capability matrix |
| `TOOLS_GAP_ANALYSIS.md` | Gap analysis (now complete) |
| `UNIVERSAL_TOOLS_MATRIX.md` | Universal vs language-specific tools |

---

## Changelog

### Session 59 (December 19, 2025)
- Added P0 security tools: gitleaks, trufflehog, checkov, trivy, grype
- Added P1 API tools: spectral, graphql-cop
- Added P2 architecture tools: jdepend, pydeps, import-linter
- Updated universal-tool-config.ts with all new tools
- Added 'architecture' category to AI fix prompts
- Created architecture runners for Java and Python

### Session 57 Part 3 (December 14, 2025)
- Integrated TypeScript performance/architecture tools
- Added Lighthouse, Bundle Analyzer, ESLint Perf
- Added Madge, Dependency-Cruiser, ts-unused-exports
