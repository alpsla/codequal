# Rex Session 100: Validate Tools with 0 Issues

## Context
- Session 92 validated 13 Java tools - some showed 0 issues due to clean test repos
- Session 99 extended batch runner for multi-language (ESLint, Ruff, golangci-lint)
- Need to find repos that produce at least 1 issue per tool for complete validation

## Tools Needing Validation (Found 0 Issues)

| Tool | Language | Issue |
|------|----------|-------|
| SpotBugs | Java | Needs bytecode with detectable bugs |
| JDepend | Java | Needs compiled classes for metrics |
| dependency-check | Java | Needs vulnerable dependencies |
| spectral | All | Needs OpenAPI/Swagger/AsyncAPI specs |
| graphql-cop | All | Needs GraphQL schemas |
| golangci-lint | Go | Well-maintained projects filter all issues |

---

## Task 1: Find SpotBugs Issues (Java)

**Goal**: Find a Java repo where SpotBugs detects actual bugs

**Approach**:
1. Look for repos with known null pointer issues, resource leaks
2. Try older/less-maintained Java projects
3. Projects without SpotBugs in CI pipeline

**Repos to try**:
- `apache/commons-io` (older versions)
- `jenkinsci/jenkins` (complex codebase)
- `hibernate/hibernate-orm`

**Command**:
```bash
# Run V9 analyzer with SpotBugs focus
npx ts-node tests/integration/test-v9-lite-e2e.ts --repo <repo> --tools spotbugs
```

---

## Task 2: Find JDepend Issues (Java)

**Goal**: Find Java repo with circular dependencies or poor package structure

**Approach**:
1. Look for large monolithic Java projects
2. Projects without package structure guidelines
3. Older enterprise projects

**Repos to try**:
- `apache/tomcat` (complex package structure)
- `eclipse/jetty.project`
- `wildfly/wildfly`

**Validation**: JDepend produces package metrics (even 0 cycles is valid output)

---

## Task 3: Find dependency-check CVEs (Java/All)

**Goal**: Find repo with known vulnerable dependencies

**Approach**:
1. Look for projects using Log4j 2.x (before 2.17.1)
2. Projects with older Spring Framework versions
3. Projects with vulnerable Jackson versions

**Repos to try**:
- Older Java tutorials/samples with outdated deps
- `apache/struts` (historically vulnerable)
- Any project not updated since 2022

**Command**:
```bash
# Check if dependency-check finds CVEs
dependency-check --scan /path/to/pom.xml --format JSON
```

---

## Task 4: Find Spectral API Issues (All)

**Goal**: Find repo with OpenAPI/Swagger specs that have linting issues

**Approach**:
1. Search for repos with `openapi.yaml`, `swagger.json`
2. API-first projects with large specs
3. Projects without spectral in CI

**Repos to try**:
- `swagger-api/swagger-petstore`
- `OAI/OpenAPI-Specification/examples`
- `APIs-guru/openapi-directory` (many APIs)

**Command**:
```bash
spectral lint openapi.yaml --ruleset spectral:oas
```

---

## Task 5: Find graphql-cop Issues (All)

**Goal**: Find repo with GraphQL security misconfigurations

**Approach**:
1. Look for GraphQL servers with introspection enabled
2. Projects without rate limiting on GraphQL
3. Older GraphQL implementations

**Repos to try**:
- `graphql/graphql-js`
- `apollographql/apollo-server`
- Older GraphQL tutorial projects

**Command**:
```bash
graphql-cop --schema schema.graphql
```

---

## Task 6: Find golangci-lint Issues (Go)

**Goal**: Find Go repo where golangci-lint finds issues

**Approach**:
1. Use `--no-config` to ignore project's golangci.yml
2. Try older Go projects
3. Enable more aggressive linters

**Repos to try**:
- Older Go tutorials
- `golang/example` (official examples)
- Smaller Go projects without strict linting

**Command**:
```bash
golangci-lint run --no-config --enable-all ./... 2>/dev/null
```

---

## Task 7: Update KB with New Tool Findings

**Goal**: Add patterns for any new issues found

**Steps**:
1. For each tool that finds issues, run through AI fixer
2. Track any failed fixes
3. Create guidance patterns for common rules

---

## Task 8: Analyze Failed Fixes & Create Manual Patterns

**Goal**: For any AI fix failures, manually create guidance patterns in Supabase

**Steps**:
1. Run `count-kb.ts` to check for failures needing review
2. For each failure with 3+ occurrences:
   - Analyze the common failure mode
   - Create a guidance pattern with:
     - `anti_patterns`: What NOT to do
     - `correct_patterns`: What TO do
     - `prompt_additions`: Extra context for AI
3. Store in Supabase `fix_pattern_guidance` table
4. Verify patterns are stored correctly

**Script**:
```bash
# Check failures needing review
npx ts-node src/fix-agent/fix-pattern-registry/kb-review-cli.ts list

# Run manual pattern creation
npx ts-node tests/integration/analyze-failures-create-patterns.ts
```

---

## Task 9: Create Final Tool Validation Matrix

**Goal**: Document all tools with sample issue counts

**Deliverable**: Markdown table showing:
- Tool name
- Languages supported
- Sample repo used for validation
- Number of issues found
- Sample rule IDs

---

## Success Criteria
- [ ] SpotBugs: >= 1 bug finding
- [ ] JDepend: Valid package metrics output
- [ ] dependency-check: >= 1 CVE finding
- [ ] spectral: >= 1 API schema issue
- [ ] graphql-cop: >= 1 GraphQL issue
- [ ] golangci-lint: >= 1 Go lint issue (with --no-config)

## Quick Commands

```bash
# Test with specific tool
npx ts-node tests/integration/run-ai-fixer-batch.ts --repo <owner/repo> --language java --tool spotbugs --limit 10

# Run full V9 analysis
npx ts-node test-v9-lite-e2e.ts --scenario <repo>

# Check tool availability
which spotbugs jdepend dependency-check spectral graphql-cop golangci-lint
```
