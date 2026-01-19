# Session 107: Complete Language Coverage - Live Integration Tests

**Goal**: Cover all remaining languages and tools not tested in Session 106 to achieve full pipeline validation.

**Prerequisites**:
- Session 106 completed successfully
- OpenRouter API key configured
- Supabase connection active

---

## Tasks

### 1. Create Live Test Fixture - Go
**Goal**: Create a Go test file with REAL fixable issues
**Steps**:
1. Create fixtures/live-test-go directory with go.mod
2. Create main.go with formatting issues (gofmt)
3. Add unused imports (goimports)
4. Add issues that golangci-lint can fix
5. Add errcheck issue that requires AI (tier 3)
**Files**:
- packages/agents/src/fix-agent/__tests__/fixtures/live-test-go/main.go
- packages/agents/src/fix-agent/__tests__/fixtures/live-test-go/go.mod

---

### 2. Create Live Test Fixture - C++
**Goal**: Create a C++ test file with REAL fixable issues
**Steps**:
1. Create fixtures/live-test-cpp directory
2. Create main.cpp with formatting issues (clang-format)
3. Add modernize-use-nullptr issues (clang-tidy)
4. Add modernize-use-override issues
5. Add cppcheck issue that requires AI (tier 3)
**Files**:
- packages/agents/src/fix-agent/__tests__/fixtures/live-test-cpp/main.cpp

---

### 3. Create Live Test Fixture - C#
**Goal**: Create a C# test file with REAL fixable issues
**Steps**:
1. Create fixtures/live-test-csharp directory with .csproj
2. Create Program.cs with formatting issues (dotnet-format)
3. Add IDE0055 (formatting) issues
4. Add SA1000 (spacing) issues
5. Add CA1822 issue that requires AI (tier 3)
**Files**:
- packages/agents/src/fix-agent/__tests__/fixtures/live-test-csharp/Program.cs
- packages/agents/src/fix-agent/__tests__/fixtures/live-test-csharp/LiveTest.csproj

---

### 4. Create Live Test Fixture - Rust
**Goal**: Create a Rust test file with REAL fixable issues (clippy patterns exist)
**Steps**:
1. Create fixtures/live-test-rust directory with Cargo.toml
2. Create main.rs with rustfmt issues
3. Add clippy-fixable issues (needless_return, redundant_clone)
4. Add clippy issue that requires AI (tier 3)
**Files**:
- packages/agents/src/fix-agent/__tests__/fixtures/live-test-rust/main.rs
- packages/agents/src/fix-agent/__tests__/fixtures/live-test-rust/Cargo.toml

---

### 5. Create Live Test Fixture - Ruby
**Goal**: Create a Ruby test file with REAL fixable issues (rubocop patterns exist)
**Steps**:
1. Create fixtures/live-test-ruby directory
2. Create main.rb with rubocop auto-correctable issues
3. Add Style/StringLiterals issues
4. Add Layout issues (spacing, indentation)
5. Add Metrics/MethodLength that requires AI
**Files**:
- packages/agents/src/fix-agent/__tests__/fixtures/live-test-ruby/main.rb

---

### 6. Run Live Go Tests - Tier 1 & 2
**Goal**: Execute REAL Go fixes and verify files are modified
**Steps**:
1. Create live-go.test.ts
2. Run gofmt on Go fixture and verify formatting fixed
3. Run goimports and verify unused imports removed
4. Run golangci-lint --fix and verify applicable fixes
5. Document which issues need AI (errcheck, staticcheck)
**Files**:
- packages/agents/src/fix-agent/__tests__/live-go.test.ts

---

### 7. Run Live C++ Tests - Tier 1 & 2
**Goal**: Execute REAL C++ fixes and verify files are modified
**Steps**:
1. Create live-cpp.test.ts
2. Run clang-format and verify formatting fixed
3. Run clang-tidy --fix with modernize-* checks
4. Verify nullptr and override fixes applied
5. Document SDK path requirements for CI
**Files**:
- packages/agents/src/fix-agent/__tests__/live-cpp.test.ts

---

### 8. Run Live C# Tests - Tier 1 & 2
**Goal**: Execute REAL C# fixes and verify files are modified
**Steps**:
1. Create live-csharp.test.ts
2. Run dotnet-format and verify formatting fixed
3. Verify IDE0055, SA1000 fixes applied
4. Document .csproj context requirements
5. Document which rules need AI (CA1822, CA2000)
**Files**:
- packages/agents/src/fix-agent/__tests__/live-csharp.test.ts

---

### 9. Run Live Rust Tests - Tier 1 & 2
**Goal**: Execute REAL Rust fixes and verify files are modified
**Steps**:
1. Create live-rust.test.ts
2. Run rustfmt and verify formatting fixed
3. Run cargo clippy --fix and verify clippy fixes
4. Verify needless_return, redundant_clone fixed
5. Document which clippy rules need AI
**Files**:
- packages/agents/src/fix-agent/__tests__/live-rust.test.ts

---

### 10. Run Live Ruby Tests - Tier 1 & 2
**Goal**: Execute REAL Ruby fixes and verify files are modified
**Steps**:
1. Create live-ruby.test.ts
2. Run rubocop --autocorrect and verify fixes
3. Verify Style and Layout rules fixed
4. Document which rules need AI (Metrics/*)
**Files**:
- packages/agents/src/fix-agent/__tests__/live-ruby.test.ts

---

### 11. Run Live TypeScript Prettier Test
**Goal**: Test Prettier separately from ESLint
**Steps**:
1. Create live-prettier.test.ts
2. Create fixture with formatting issues that Prettier handles
3. Run prettier --write and verify formatting
4. Verify integration with ESLint (eslint-config-prettier)
**Files**:
- packages/agents/src/fix-agent/__tests__/live-prettier.test.ts

---

### 12. Update Coverage Report
**Goal**: Document complete language coverage
**Steps**:
1. Query Supabase for updated pattern counts
2. Document all languages now tested
3. Update LIVE_INTEGRATION_RESULTS.md with Session 107 results
4. Create COMPLETE_LANGUAGE_COVERAGE.md summary
**Files**:
- docs/COMPLETE_LANGUAGE_COVERAGE.md

---

## Validation

```bash
# Run all new live tests
npm test -- --testPathPattern="live-(go|cpp|csharp|rust|ruby|prettier)" --verbose
```

## Expected Outcomes

| Language | Tier 1 Tools | Tier 2 Tools | AI-Required |
|----------|--------------|--------------|-------------|
| Go | gofmt, goimports | golangci-lint | errcheck, staticcheck |
| C++ | clang-format | clang-tidy | cppcheck |
| C# | dotnet-format | - | CA1822, CA2000 |
| Rust | rustfmt | clippy --fix | complex clippy |
| Ruby | rubocop --autocorrect | - | Metrics/* |
| TypeScript | prettier | - | - |

## Notes

- Go requires `go` installed
- C++ requires `clang-format` and `clang-tidy` (brew install llvm)
- C# requires `dotnet` SDK
- Rust requires `cargo` and `rustfmt`
- Ruby requires `rubocop` gem
- If a tool is not installed, test should skip gracefully
