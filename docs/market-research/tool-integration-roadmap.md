# Tool Integration Roadmap

**Date**: December 18, 2025
**Purpose**: Prioritized list of tools to integrate for maximum category coverage

---

## Current State: 103 Tools, 7/10 Categories

| Category | Status | Current Tools |
|----------|--------|---------------|
| Code Quality | ✅ Complete | ESLint, Prettier, Ruff, PMD, etc. (34 tools) |
| Security (SAST) | ✅ Complete | Semgrep, Bandit, gosec, SpotBugs, etc. (34 tools) |
| Dependencies (SCA) | ✅ Complete | npm audit, pip-audit, cargo-audit, etc. |
| Architecture | ✅ Complete | Madge, JDepend, pydeps, etc. (6 tools) |
| Performance | ✅ Complete | Lighthouse, Radon, PMD Perf, etc. |
| Secret Detection | ❌ Missing | None |
| IaC Security | ❌ Missing | Only Semgrep rules |
| Container Security | ❌ Missing | None |
| API Security | ❌ Missing | None |
| License Compliance | ⚠️ Partial | Basic via dependency scanners |

---

## Phase 1: Security Parity (HIGH PRIORITY)

**Goal**: Achieve parity with GitLab/Aikido on security categories
**Timeline**: 1 week
**Impact**: Covers 3 missing categories with 4 tools

### 1.1 Secret Detection

| Tool | Type | Why | Effort |
|------|------|-----|--------|
| **Gitleaks** | OSS | Fast, CI/CD friendly, 140+ patterns | 1 day |
| **TruffleHog** | OSS | 800+ types, validates credentials | 1 day |

**Integration Approach**:
```typescript
// New file: src/two-branch/tools/universal/secret-scanner.ts
export class SecretScanner {
  async runGitleaks(repoPath: string): Promise<SecretIssue[]>
  async runTruffleHog(repoPath: string): Promise<SecretIssue[]>
  async runAll(repoPath: string): Promise<SecretIssue[]>
}
```

### 1.2 Infrastructure as Code (IaC) Security

| Tool | Type | Why | Effort |
|------|------|-----|--------|
| **Checkov** | OSS | 1000+ policies, Terraform/K8s/CloudFormation | 1 day |
| **Trivy** (IaC mode) | OSS | All-in-one, successor to tfsec | 0.5 day |

**Integration Approach**:
```typescript
// New file: src/two-branch/tools/universal/iac-scanner.ts
export class IaCScanner {
  async runCheckov(repoPath: string): Promise<IaCIssue[]>
  async runTrivyIaC(repoPath: string): Promise<IaCIssue[]>
  async runAll(repoPath: string): Promise<IaCIssue[]>
}
```

### 1.3 Container Security

| Tool | Type | Why | Effort |
|------|------|-----|--------|
| **Trivy** (container mode) | OSS | Images + OS + deps | 1 day |
| **Grype** | OSS | Fast SBOM-based scanning | 0.5 day |

**Integration Approach**:
```typescript
// New file: src/two-branch/tools/universal/container-scanner.ts
export class ContainerScanner {
  async runTrivy(imagePath: string): Promise<ContainerIssue[]>
  async runGrype(imagePath: string): Promise<ContainerIssue[]>
  async scanDockerfiles(repoPath: string): Promise<DockerfileIssue[]>
}
```

---

## Phase 2: API & Compliance (MEDIUM PRIORITY)

**Goal**: Cover API security and license compliance
**Timeline**: 1 week
**Impact**: Differentiates from most competitors

### 2.1 API Security

| Tool | Type | Why | Effort |
|------|------|-----|--------|
| **Spectral** | OSS | OpenAPI/AsyncAPI linting | 1 day |
| **graphql-cop** | OSS | GraphQL security auditing | 0.5 day |

**Integration Approach**:
```typescript
// New file: src/two-branch/tools/universal/api-scanner.ts
export class APIScanner {
  async runSpectral(repoPath: string): Promise<APIIssue[]>
  async runGraphQLCop(repoPath: string): Promise<APIIssue[]>
  async scanOpenAPISpecs(repoPath: string): Promise<APIIssue[]>
}
```

### 2.2 License Compliance

| Tool | Type | Languages | Effort |
|------|------|-----------|--------|
| **license-checker** | OSS | npm/Node.js | 0.5 day |
| **pip-licenses** | OSS | Python | 0.5 day |
| **go-licenses** | OSS | Go | 0.5 day |

**Integration Approach**:
```typescript
// New file: src/two-branch/tools/universal/license-scanner.ts
export class LicenseScanner {
  async runNpmLicenseChecker(repoPath: string): Promise<LicenseIssue[]>
  async runPipLicenses(repoPath: string): Promise<LicenseIssue[]>
  async runGoLicenses(repoPath: string): Promise<LicenseIssue[]>
}
```

---

## Phase 3: Enhanced Coverage (LOW PRIORITY)

**Goal**: Additional tools for depth
**Timeline**: 2 weeks
**Impact**: Nice-to-have improvements

### 3.1 Additional IaC Tools

| Tool | Type | Why | Effort |
|------|------|-----|--------|
| **KICS** | OSS | 1900+ queries, Checkmarx maintained | 1 day |
| **TFLint** | OSS | Terraform-specific best practices | 0.5 day |
| **Hadolint** | OSS | Dockerfile best practices | 0.5 day |

### 3.2 Additional Container Tools

| Tool | Type | Why | Effort |
|------|------|-----|--------|
| **Dockle** | OSS | Container image linting | 0.5 day |
| **Anchore** | OSS | Policy-based scanning | 1 day |

### 3.3 Additional Secret Tools

| Tool | Type | Why | Effort |
|------|------|-----|--------|
| **detect-secrets** | OSS | Low false positives, baseline methodology | 0.5 day |

---

## Phase 4: Future Consideration (NOT PRIORITY)

These are NOT recommended unless customer demand exists:

| Category | Tool | Why Skip |
|----------|------|----------|
| Mobile Security | MobSF | Niche market |
| DAST | OWASP ZAP | Different product category |
| Runtime | Falco | Different product category |
| C/C++ | cppcheck | Not target market |
| SonarQube | Direct integration | We cover same ground |

---

## Tool Count After Integration

| Phase | New Tools | Total | Categories |
|-------|-----------|-------|------------|
| Current | 0 | 103 | 7/10 |
| Phase 1 | +6 | 109 | 10/10 |
| Phase 2 | +5 | 114 | 10/10 (deeper) |
| Phase 3 | +5 | 119 | 10/10 (comprehensive) |

---

## Installation Commands

### Phase 1 Tools

```bash
# Gitleaks
brew install gitleaks  # macOS
# or: go install github.com/gitleaks/gitleaks/v8@latest

# TruffleHog
brew install trufflehog  # macOS
# or: pip install trufflehog

# Checkov
pip install checkov

# Trivy
brew install trivy  # macOS
# or: curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh

# Grype
brew install grype  # macOS
# or: curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh
```

### Phase 2 Tools

```bash
# Spectral
npm install -g @stoplight/spectral-cli

# graphql-cop
pip install graphql-cop

# license-checker
npm install -g license-checker

# pip-licenses
pip install pip-licenses

# go-licenses
go install github.com/google/go-licenses@latest
```

---

## Success Metrics

| Metric | Current | After Phase 1 | After Phase 2 |
|--------|---------|---------------|---------------|
| Category Coverage | 7/10 | 10/10 | 10/10 |
| Competitor Parity | GitLab: 70% | GitLab: 100% | Aikido: 90% |
| Total Tools | 103 | 109 | 114 |

---

*Roadmap created: December 18, 2025*
