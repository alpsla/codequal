# Session 92: Tool Validation - Ensure All Tools Produce Findings

## Goal
Verify that all 13 tools are configured correctly by finding test PRs that produce at least 1 finding per tool.

## Tools Currently Showing 0 Findings
1. **SpotBugs** - Bug Detection (needs compiled Java with bugs)
2. **JDepend** - Architecture (needs compiled Java classes)
3. **dependency-check** - Dependency Scan (needs vulnerable dependencies)
4. **spectral** - API Schema (needs OpenAPI/Swagger files)
5. **graphql-cop** - GraphQL Security (needs GraphQL schema/endpoints)

---

### 1. Find and Test SpotBugs Detection
**Goal**: Find a Java PR with actual bugs that SpotBugs can detect
**Steps**:
1. Search for Java repos with known SpotBugs issues or buggy code
2. Look for repos like `spotbugs/spotbugs-samples` or Java projects with null pointer issues
3. Run test with `test-v9-lite-e2e.ts` to verify SpotBugs finds issues
4. Document the test PR that produces SpotBugs findings

### 2. Find and Test JDepend Detection
**Goal**: Find a Java PR with architecture/dependency issues
**Steps**:
1. JDepend analyzes package dependencies and cycles
2. Find a Java project with circular dependencies or poor package structure
3. Verify JDepend produces architecture metrics
4. Document findings

### 3. Find and Test dependency-check Detection
**Goal**: Find a PR with known CVE vulnerabilities in dependencies
**Steps**:
1. Search for Java projects with outdated/vulnerable dependencies
2. Look for repos with known Log4j, Spring, or Jackson vulnerabilities
3. Test with dependency-check and verify CVE detection
4. Document the vulnerable dependencies found

### 4. Find and Test Spectral API Schema Detection
**Goal**: Find a PR with OpenAPI/Swagger specs that have issues
**Steps**:
1. Search for repos with `openapi.yaml`, `swagger.json`, or `api-spec` files
2. Look for API-first projects like `swagger-api/swagger-petstore`
3. Run test and verify Spectral finds API schema issues
4. Document the API validation findings

### 5. Find and Test graphql-cop Detection
**Goal**: Find a PR with GraphQL schema/endpoint security issues
**Steps**:
1. Search for repos with GraphQL schemas (`.graphql` files, `schema.graphql`)
2. Look for GraphQL servers like `graphql-java/graphql-java` or Apollo projects
3. Run test and verify graphql-cop finds security issues
4. Document the GraphQL security findings

### 6. Create Comprehensive Tool Validation Report
**Goal**: Document all tool validation results
**Steps**:
1. Create a markdown report showing each tool with example findings
2. List test repositories used for each tool
3. Confirm all 13 tools are properly configured
4. Update CLAUDE.md if any tool configuration issues found

---

## Test Repositories to Consider

| Tool | Potential Test Repo | Why |
|------|---------------------|-----|
| SpotBugs | `iluwatar/java-design-patterns` | Large Java codebase |
| JDepend | `spring-projects/spring-framework` | Complex package structure |
| dependency-check | Older Java projects with Log4j 2.x | Known CVEs |
| spectral | `swagger-api/swagger-petstore` | OpenAPI specs |
| graphql-cop | `graphql-java/graphql-java` | GraphQL schemas |

## Success Criteria
- [ ] SpotBugs: >= 1 bug finding
- [ ] JDepend: >= 1 architecture metric
- [ ] dependency-check: >= 1 CVE finding
- [ ] spectral: >= 1 API schema issue
- [ ] graphql-cop: >= 1 GraphQL security issue
