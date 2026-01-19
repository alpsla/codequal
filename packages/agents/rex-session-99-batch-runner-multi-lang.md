# Rex Session 99: Extend Batch Runner for Multi-Language KB Filling

## Context
- All 52+ tools are configured and working in V9 production flow
- Cloud containers exist for all languages (Java, TypeScript, Python, Go, Rust, Ruby, PHP, C#)
- **Blocker**: KB filling batch runner (`run-ai-fixer-batch.ts`) only supports PMD (Java)

## Objective
Extend the batch runner to support ESLint (TypeScript), Ruff (Python), and golangci-lint (Go) for KB pattern generation.

---

## Task 1: Add ESLint Scanner Function

**Goal**: Add `runESLintAndCollectIssues()` to batch runner

**Steps**:
1. Check ESLint availability in container (`npx eslint --version`)
2. Create function similar to `runPMDAndCollectIssues()`
3. Parse ESLint JSON output format
4. Map to `AIFixerIssue` schema
5. Test with a TypeScript repository

**Reference**: ESLint JSON output format:
```json
[{"filePath": "/path/file.ts", "messages": [{"ruleId": "no-unused-vars", "line": 10, "message": "..."}]}]
```

---

## Task 2: Add Ruff Scanner Function

**Goal**: Add `runRuffAndCollectIssues()` to batch runner

**Steps**:
1. Check Ruff availability (`ruff --version`)
2. Create function for Ruff JSON output
3. Parse Ruff output format
4. Map to `AIFixerIssue` schema
5. Test with a Python repository

**Reference**: Ruff JSON output:
```bash
ruff check . --output-format json
```

---

## Task 3: Add golangci-lint Scanner Function

**Goal**: Add `runGolangciLintAndCollectIssues()` to batch runner

**Steps**:
1. Check golangci-lint availability
2. Create function for golangci-lint JSON output
3. Parse output format
4. Map to `AIFixerIssue` schema
5. Test with a Go repository

**Reference**:
```bash
golangci-lint run --out-format json
```

---

## Task 4: Add Language Router to Batch Runner

**Goal**: Route to correct scanner based on `--language` parameter

**Steps**:
1. Add switch statement based on language parameter
2. Call appropriate scanner function
3. Handle unsupported languages gracefully

---

## Task 5: Test TypeScript KB Filling

**Goal**: Run batch fixer on a TypeScript repository

**Repos to test**:
- `expressjs/express`
- `nestjs/nest`

**Command**:
```bash
npx ts-node tests/integration/run-ai-fixer-batch.ts --repo expressjs/express --language typescript --limit 50
```

---

## Task 6: Test Python KB Filling

**Goal**: Run batch fixer on a Python repository

**Repos to test**:
- `pallets/flask`
- `django/django`

**Command**:
```bash
npx ts-node tests/integration/run-ai-fixer-batch.ts --repo pallets/flask --language python --limit 50
```

---

## Task 7: Test Go KB Filling

**Goal**: Run batch fixer on a Go repository

**Repos to test**:
- `gin-gonic/gin`
- `gofiber/fiber`

**Command**:
```bash
npx ts-node tests/integration/run-ai-fixer-batch.ts --repo gin-gonic/gin --language go --limit 50
```

---

## Task 8: Update KB Statistics

**Goal**: Document new patterns added per language

**Steps**:
1. Run `count-kb.ts` to get current counts
2. Document patterns by language
3. Update rex-tasks.json with final summary

---

## Success Criteria
- [ ] ESLint scanner working for TypeScript
- [ ] Ruff scanner working for Python
- [ ] golangci-lint scanner working for Go
- [ ] At least 50 issues processed per language
- [ ] KB patterns created for each language
- [ ] Failures tracked for manual review
