# Rex Session 101: Full Tool Validation Across All Languages

## Objective
Validate ALL 52+ tools across 8 languages. Each tool must find at least 1 issue.
Configure maintenance schedules for tools requiring updates.

---

## Tools Requiring Scheduled Maintenance

| Tool | Schedule | Purpose | Script |
|------|----------|---------|--------|
| dependency-check | Daily 2AM | NVD CVE database | `daily-cve-update.sh` |
| trivy | Daily 3AM | Container vuln DB | `trivy image --download-db-only` |
| grype | Daily 4AM | SBOM vuln DB | `grype db update` |
| govulncheck | Weekly | Go vuln DB | Auto-updates on run |
| cargo-audit | Weekly | RustSec DB | `cargo audit fetch` |
| bundler-audit | Weekly | Ruby advisory DB | `bundle audit update` |
| pip-audit | Weekly | PyPI advisory DB | Auto-updates on run |
| npm-audit | Weekly | npm advisory DB | Auto-updates on run |

---

## Phase 1: Java Tools (13 tools)

### Task 1.1: Validate Checkstyle
**Status**: Not validated
**Command**: `checkstyle -c /google_checks.xml src/`
**Test Repo**: spring-petclinic
**Expected**: Style violations (naming, formatting)

### Task 1.2: Validate PMD
**Status**: ✅ Validated (Session 98)
**Issues Found**: 50+ (UnusedPrivateMethod, EmptyCatchBlock, etc.)

### Task 1.3: Validate SpotBugs
**Status**: ✅ Validated (Session 100)
**Issues Found**: 10 (EI_EXPOSE_REP)

### Task 1.4: Validate dependency-check
**Status**: ✅ Validated (Session 100)
**Issues Found**: 59 CVEs (including Log4Shell)
**Note**: Use `--data ~/.dependency-check-cache`

### Task 1.5: Validate Semgrep (Java)
**Status**: Not validated
**Command**: `semgrep --config auto --lang java`
**Expected**: Security patterns

### Task 1.6: Validate jdepend
**Status**: Cloud-only (in analyzer containers)
**Command**: `jdepend /path/to/classes`

---

## Phase 2: TypeScript/JavaScript Tools (17 tools)

### Task 2.1: Validate ESLint
**Status**: ✅ Validated (Session 99)
**Issues Found**: 20 (@typescript-eslint/no-explicit-any)

### Task 2.2: Validate tsc (TypeScript Compiler)
**Status**: Not validated
**Command**: `tsc --noEmit`
**Expected**: Type errors (TS2322, TS2345)

### Task 2.3: Validate npm-audit
**Status**: Not validated
**Command**: `npm audit --json`
**Expected**: Vulnerable packages

### Task 2.4: Validate Semgrep (TypeScript)
**Status**: Not validated
**Command**: `semgrep --config auto --lang typescript`

### Task 2.5: Validate Madge (Circular Dependencies)
**Status**: Not validated
**Command**: `madge --circular src/`
**Expected**: Circular dependency warnings

### Task 2.6: Validate Dependency Cruiser
**Status**: Not validated
**Command**: `depcruise --validate .dependency-cruiser.js src`

### Task 2.7: Validate ts-unused-exports
**Status**: Not validated
**Command**: `ts-unused-exports tsconfig.json`
**Expected**: Unused exports

---

## Phase 3: Python Tools (15 tools)

### Task 3.1: Validate Ruff
**Status**: ✅ Validated (Session 99)
**Issues Found**: 5 (F401, F632, E722)

### Task 3.2: Validate Pylint
**Status**: Not validated
**Command**: `pylint src/`
**Expected**: Code quality issues

### Task 3.3: Validate Bandit
**Status**: Not validated
**Command**: `bandit -r src/ -f json`
**Expected**: Security issues (B101, B105)

### Task 3.4: Validate mypy
**Status**: Not validated
**Command**: `mypy src/`
**Expected**: Type errors

### Task 3.5: Validate pip-audit
**Status**: Not validated
**Command**: `pip-audit --format json`
**Expected**: Vulnerable packages

### Task 3.6: Validate Safety
**Status**: Not validated
**Command**: `safety check --json`
**Expected**: CVEs in dependencies

### Task 3.7: Validate Semgrep (Python)
**Status**: Not validated
**Command**: `semgrep --config auto --lang python`

### Task 3.8: Validate pydeps
**Status**: Not validated
**Command**: `pydeps src/ --show-cycles`
**Expected**: Circular imports

---

## Phase 4: Go Tools (11 tools)

### Task 4.1: Validate golangci-lint
**Status**: ✅ Validated (Session 100)
**Issues Found**: 33 (errcheck)
**Note**: Use `--no-config` to bypass project filtering

### Task 4.2: Validate staticcheck
**Status**: Not validated
**Command**: `staticcheck ./...`
**Expected**: Static analysis issues

### Task 4.3: Validate govulncheck
**Status**: Not validated
**Command**: `govulncheck ./...`
**Expected**: Go vulnerability matches

### Task 4.4: Validate gosec
**Status**: Not validated
**Command**: `gosec -fmt json ./...`
**Expected**: Security issues (G101, G201)

### Task 4.5: Validate Semgrep (Go)
**Status**: Not validated
**Command**: `semgrep --config auto --lang go`

---

## Phase 5: Rust Tools (8 tools)

### Task 5.1: Validate clippy
**Status**: Not validated
**Command**: `cargo clippy -- -D warnings`
**Expected**: Lint warnings

### Task 5.2: Validate cargo-audit
**Status**: Not validated
**Command**: `cargo audit --json`
**Expected**: RustSec advisories

### Task 5.3: Validate cargo-deny
**Status**: Not validated
**Command**: `cargo deny check`
**Expected**: License/ban violations

### Task 5.4: Validate Semgrep (Rust)
**Status**: Not validated
**Command**: `semgrep --config auto --lang rust`

---

## Phase 6: Ruby Tools (10 tools)

### Task 6.1: Validate RuboCop
**Status**: Not validated
**Command**: `rubocop --format json`
**Expected**: Style violations

### Task 6.2: Validate Brakeman
**Status**: Not validated
**Command**: `brakeman -f json`
**Expected**: Rails security issues

### Task 6.3: Validate bundler-audit
**Status**: Not validated
**Command**: `bundle audit check --format json`
**Expected**: Gem vulnerabilities

### Task 6.4: Validate Semgrep (Ruby)
**Status**: Not validated
**Command**: `semgrep --config auto --lang ruby`

---

## Phase 7: PHP Tools (10 tools)

### Task 7.1: Validate PHPStan
**Status**: Not validated
**Command**: `phpstan analyse src/ --level 5 --error-format json`
**Expected**: Type errors

### Task 7.2: Validate Psalm
**Status**: Not validated
**Command**: `psalm --output-format json`
**Expected**: Type and taint issues

### Task 7.3: Validate PHP_CodeSniffer
**Status**: Not validated
**Command**: `phpcs --standard=PSR12 --report=json`
**Expected**: PSR-12 violations

### Task 7.4: Validate composer audit
**Status**: Not validated
**Command**: `composer audit --format json`
**Expected**: Package vulnerabilities

### Task 7.5: Validate Semgrep (PHP)
**Status**: Not validated
**Command**: `semgrep --config auto --lang php`

---

## Phase 8: C#/.NET Tools (8 tools)

### Task 8.1: Validate dotnet format
**Status**: Not validated
**Command**: `dotnet format --verify-no-changes`
**Expected**: Style violations

### Task 8.2: Validate Security Code Scan
**Status**: Not validated
**Command**: `dotnet build /p:EnableSecurityCodeAnalysis=true`
**Expected**: Roslyn security issues

### Task 8.3: Validate dotnet-outdated
**Status**: Not validated
**Command**: `dotnet outdated`
**Expected**: Outdated NuGet packages

### Task 8.4: Validate Semgrep (C#)
**Status**: Not validated
**Command**: `semgrep --config auto --lang csharp`

---

## Phase 9: Universal Tools (7 tools)

### Task 9.1: Validate gitleaks
**Status**: Not validated
**Command**: `gitleaks detect --source . --report-format json`
**Expected**: Hardcoded secrets

### Task 9.2: Validate trufflehog
**Status**: Not validated
**Command**: `trufflehog filesystem --directory . --json`
**Expected**: Secrets with verification

### Task 9.3: Validate checkov
**Status**: Not validated
**Command**: `checkov -d . --output json`
**Expected**: IaC misconfigurations

### Task 9.4: Validate trivy
**Status**: Not validated
**Command**: `trivy fs . --format json`
**Expected**: Filesystem vulnerabilities

### Task 9.5: Validate grype
**Status**: Not validated
**Command**: `grype dir:. --output json`
**Expected**: SBOM-based vulnerabilities

### Task 9.6: Validate spectral
**Status**: ✅ Validated (Session 100)
**Issues Found**: 2 (oas3-unused-component)

### Task 9.7: Validate graphql-cop
**Status**: Needs live endpoint
**Command**: `python graphql-cop.py -t <endpoint>`

---

## Phase 10: Configure Maintenance Cron Jobs

### Task 10.1: Setup dependency-check daily update
```bash
# /etc/cron.d/codequal-cve-update
0 2 * * * codequal /path/to/daily-cve-update.sh >> /var/log/cve-update.log 2>&1
```

### Task 10.2: Setup trivy daily update
```bash
0 3 * * * codequal trivy image --download-db-only >> /var/log/trivy-update.log 2>&1
```

### Task 10.3: Setup grype daily update
```bash
0 4 * * * codequal grype db update >> /var/log/grype-update.log 2>&1
```

---

## Phase 11: Fix Non-Working Tools

### Task 11.1: Configure batch runner for all tools
- Add scanner functions for each tool
- Map output to AIFixerIssue schema
- Enable fix validation

### Task 11.2: Document tool-specific requirements
- Required config files
- Environment variables
- Docker image versions

---

## Success Criteria

- [ ] All 52+ tools executed successfully
- [ ] Each tool found at least 1 issue
- [ ] Fix validation working for Tier 1 tools
- [ ] Cron jobs configured for DB-dependent tools
- [ ] Documentation updated with findings

---

## Test Repositories per Language

| Language | Repo | Why |
|----------|------|-----|
| Java | spring-petclinic | Well-known, has issues |
| TypeScript | expressjs/express | Large, real-world |
| Python | pallets/flask | Moderate size |
| Go | spf13/cobra | Has lint issues (--no-config) |
| Rust | tokio-rs/tokio | Large async runtime |
| Ruby | rails/rails | Large framework |
| PHP | laravel/laravel | Popular framework |
| C# | dotnet/aspnetcore | Official samples |
