# Session 33 Handover: Strategic Pivot to Batch Automation

## 🚨 Strategic Decision
**Do NOT release the current "Manual Mode" workflow.**
- **Problem**: The current workflow requires users to manually copy/paste prompts for every single issue (e.g., 267 times for 267 issues). This is high friction and low business value.
- **Solution**: Implement the **VSCode Chat Participant API** (`@codequal`) to enable **Batch Automation**.
- **Goal**: Turn "267 clicks" into "2 clicks" (Command + Review).

## ✅ Current Status (Session 32 Complete)
- **Foundation Built**: Extension correctly detects issues, generates smart prompts, and has a working "Manual Mode" fallback.
- **Verified**: End-to-end fix verified for a Security Injection vulnerability using the manual workflow.
- **Metadata Ready**: The `lsp-sarif-converter.ts` already generates the rich `data` object needed for the Chat API.

## 🎯 Session 33 Objectives: "The Killer Feature"

### 1. Implement Chat Participant (`@codequal`)
- Register a new Chat Participant in `package.json`.
- Create a handler that accepts natural language commands.
- **Key Commands**:
  - `@codequal fix all high` -> Fixes all high-severity issues.
  - `@codequal fix file` -> Fixes all issues in the current file.
  - `@codequal explain` -> Explains the issue context.

### 2. Build Batch Orchestrator
- Instead of copying to clipboard, the extension should:
  1. **Retrieve** the list of issues (e.g., all High severity).
  2. **Feed** them to the Chat Participant context.
  3. **Request** a batch fix from the LLM.
  4. **Present** a Workspace Edit for user review.

### 3. Polish & Packaging
- Only AFTER the batch workflow is working should we package the extension.
- Update README to highlight the `@codequal` automation as the primary feature.

## 📝 Technical Notes for Next Agent
- **Data Source**: Use the `data` property in `LSPCodeAction` (from `lsp-sarif-converter.ts`). It contains the `issue`, `fix`, and `context` objects ready for the LLM.
- **API Reference**: Use `vscode.chat.createChatParticipant` (or similar depending on VSCode version compatibility).
- **Fallback**: Keep the "Clipboard + Chat" workflow as a fallback for users without Chat access or for specific edge cases.
