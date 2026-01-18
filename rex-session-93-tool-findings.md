# Session 93: Find Repos That Produce Findings for All Tools

## Goal
Find and test repositories that produce at least 1 finding for each tool that showed 0 issues in Session 92.

## Tools Needing Validation with Real Findings

| Tool | Requirement | Candidate Repo |
|------|-------------|----------------|
| **SpotBugs** | Buggy Java code (null derefs, resource leaks) | findbugsproject/findbugs or spotbugs/spotbugs |
| **JDepend** | Pre-compiled .class files | Fix compilation path issue |
| **dependency-check** | Vulnerable dependencies (Log4j, Spring 4.x) | Old Java projects |
| **Spectral** | OpenAPI/Swagger files | swagger-api/swagger-petstore PR #218 |
| **graphql-cop** | GraphQL schema files | Netflix/dgs-examples-java PR #196 |

---

### 1. Validate Spectral with swagger-petstore
**Goal**: Run full E2E test on swagger-petstore to confirm Spectral fix works in pipeline
**Steps**:
1. Run test-v9-lite-e2e.ts with swagger-petstore PR #218
2. Verify Spectral produces >= 1 finding
3. Document the actual findings
**Files**: packages/agents/tests/integration/test-v9-lite-e2e.ts

### 2. Validate graphql-cop with Netflix DGS
**Goal**: Run full E2E test on Netflix DGS Examples to confirm graphql-cop finds issues
**Steps**:
1. Run test-v9-lite-e2e.ts with Netflix/dgs-examples-java PR #196
2. Verify graphql-cop produces >= 1 finding (or confirms clean schema)
3. Document the findings
**Files**: packages/agents/tests/integration/test-v9-lite-e2e.ts

### 3. Find SpotBugs Test Repository
**Goal**: Find a Java repo with actual bugs that SpotBugs detects
**Steps**:
1. Search for repos with known SpotBugs issues
2. Try spotbugs/spotbugs itself (has test cases with intentional bugs)
3. Try OWASP WebGoat (intentionally vulnerable)
4. Run test and verify SpotBugs finds >= 1 bug
**Candidates**:
- spotbugs/spotbugs (has findbugsTestCases)
- WebGoat/WebGoat (intentionally buggy)
- iluwatar/java-design-patterns (large codebase)

### 4. Find dependency-check Test Repository
**Goal**: Find a Java repo with known CVE vulnerabilities
**Steps**:
1. Search for repos with outdated Log4j 2.x (CVE-2021-44228)
2. Search for repos with Spring Framework 4.x vulnerabilities
3. Try OWASP dependency-check's own test fixtures
4. Run test and verify dependency-check finds >= 1 CVE
**Candidates**:
- Repos using Log4j < 2.17.0
- Repos using Spring < 5.3.18
- OWASP/dependency-check (has test fixtures)

### 5. Fix JDepend Compilation Issue
**Goal**: Make JDepend find compiled .class files
**Steps**:
1. Investigate why auto-compilation doesn't produce classes where JDepend expects
2. Check JDepend search paths in the scanner
3. Either fix the path or ensure Maven/Gradle build runs first
4. Test with any Java repo and verify JDepend produces metrics
**Files**: packages/agents/src/two-branch/tools/java/jdepend-scanner.ts

### 6. Create Final Validation Summary
**Goal**: Document all tools with confirmed findings
**Steps**:
1. Update TOOL_VALIDATION_REPORT.md with new test results
2. List each tool with the repo that produces findings
3. Confirm all 13 tools can produce findings when given appropriate content
4. Mark validation complete
**Files**: docs/TOOL_VALIDATION_REPORT.md

---

## Success Criteria
- [ ] Spectral: >= 1 finding on swagger-petstore
- [ ] graphql-cop: >= 1 finding on Netflix DGS (or confirm clean)
- [ ] SpotBugs: >= 1 bug finding
- [ ] dependency-check: >= 1 CVE finding
- [ ] JDepend: >= 1 architecture metric
