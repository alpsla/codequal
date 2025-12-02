# Auto-Fix Validation Strategy (Updated Session 33)

## 🎯 Validation Goal
Ensure that AI-generated fixes are safe, correct, and do not introduce regressions, specifically when applied in **batch** via the Chat interface.

## 🔄 Validation Workflow

### 1. Pre-Computation (CodeQual Engine)
- **Static Analysis**: CodeQual detects issues and generates deterministic fix suggestions where possible.
- **Prompt Generation**: Rich metadata (context, rules, impact) is pre-calculated and stored in the LSP response.

### 2. AI Generation (Chat Participant)
- **Input**: The Chat Participant receives the pre-calculated metadata.
- **Processing**: The LLM uses the metadata to generate the final code change.
- **Constraint**: The LLM is instructed to *only* fix the specific issue and follow the provided architectural guidelines.

### 3. Human-in-the-Loop Review (Critical)
- **Batch Review**: The Chat interface presents a **Workspace Edit** containing changes across multiple files.
- **Diff View**: The user *must* review the diffs before clicking "Apply".
- **Safety Net**: The extension does *not* auto-apply changes to disk without user confirmation.

### 4. Post-Fix Verification (Automated)
- **Re-Scan**: After applying fixes, the user should re-run the CodeQual analysis (or the extension should trigger it) to verify the issues are gone.
- **Build/Test**: The user's CI/CD or local build process acts as the final gatekeeper.

## 🧪 Test Scenarios for Session 33

1. **Single File Fix**: `@codequal fix file` -> Verify 1 file changes correctly.
2. **Batch Severity Fix**: `@codequal fix all high` -> Verify multiple files change correctly.
3. **Context Window Check**: Ensure sending 10+ issues doesn't break the chat context.
4. **Hallucination Check**: Verify the AI doesn't "invent" code outside the scope of the fix.
