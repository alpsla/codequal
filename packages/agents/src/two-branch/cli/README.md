# Auto-Fix Architecture

**Last Updated:** 2024-11-24  
**Status:** 📋 Design Phase

---

## 🎯 Core Principle

**V9 provides educational guidance → User's IDE AI generates precise fixes**

CodeQual's auto-fix is NOT simple string replacement. Our analysis provides:
- ✅ **WHAT** is wrong (issue detection)
- ✅ **WHY** it's wrong (explanation)
- ✅ **HOW** to fix it conceptually (educational example)

The **user's IDE AI** (Copilot, Cursor, Claude) generates the **actual fix** because:
- It sees the full file context
- It understands the project structure
- It can generate context-appropriate code

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  V9 Analysis (Cloud)                                        │
│  ├─ Detects issues                                          │
│  ├─ Provides educational guidance                           │
│  └─ Returns structured issue data                           │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Integration Layer (IDE Extension / GitHub App / Web)       │
│  ├─ Displays issues to user                                 │
│  ├─ Provides "Fix with AI" action                           │
│  └─ Sends context to user's AI                              │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  User's AI (Copilot / Cursor / Claude)                      │
│  ├─ Receives: issue + guidance + file context               │
│  ├─ Generates: precise, context-aware fix                   │
│  └─ User reviews and accepts                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Issue Data Format

V9 returns issues in this format for integrations:

```typescript
interface CodeQualIssue {
  // Location
  file: string;
  line: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  
  // Issue details
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'security' | 'performance' | 'code-quality' | 'architecture';
  rule: string;
  
  // Educational content (for AI to interpret)
  title: string;
  description: string;
  explanation: string;      // WHY this is a problem
  recommendation: string;   // HOW to fix conceptually
  exampleFix?: string;      // Example code (educational, not exact)
  
  // References
  learnMoreUrl?: string;
  relatedRules?: string[];
}
```

---

## 🔌 Integration Options

### 1. VS Code Extension

```typescript
// When user clicks "Fix with AI"
async function fixWithAI(issue: CodeQualIssue) {
  const fileContent = await vscode.workspace.fs.readFile(issue.file);
  
  const prompt = `
Fix this code issue:

**Issue:** ${issue.title}
**File:** ${issue.file}:${issue.line}
**Severity:** ${issue.severity}

**Problem:**
${issue.explanation}

**Recommended Fix:**
${issue.recommendation}

**Example:**
${issue.exampleFix}

**Current Code:**
\`\`\`
${fileContent}
\`\`\`

Please provide the corrected code for lines ${issue.line}-${issue.endLine}.
`;

  // Send to user's AI (Copilot, Claude, etc.)
  await vscode.commands.executeCommand('copilot.chat', prompt);
}
```

### 2. GitHub App (PR Comment)

```markdown
## 🔍 CodeQual Analysis

### Issue: Unsafe Command Execution

**File:** `src/utils/exec.ts:45`  
**Severity:** 🔴 Critical

**Problem:**
Using `exec()` with unsanitized input can lead to command injection attacks.

**Recommendation:**
Use `execFile()` with explicit arguments instead of `exec()` with string concatenation.
Add input validation and consider using a whitelist of allowed commands.

**Example:**
```typescript
// Instead of: exec(`ls ${userInput}`)
// Use:
const allowedCommands = ['ls', 'pwd'];
if (allowedCommands.includes(command)) {
  execFileSync(command, args, { encoding: 'utf8' });
}
```

<details>
<summary>💡 Fix with AI</summary>

Copy this prompt to your AI assistant:

> Fix the command injection vulnerability in `src/utils/exec.ts:45`.
> Replace `exec()` with `execFile()` and add input validation.
> Only allow commands from a whitelist: ['ls', 'pwd', 'cat'].

</details>
```

### 3. Web Dashboard

- Show issues in UI
- "Copy Fix Prompt" button
- "Open in VS Code" deeplink
- Future: Built-in AI chat for fixes

---

## ❌ What We're NOT Doing

### Simple String Replacement (Archived)

We tested a CLI tool that applied exact text replacements. **This doesn't work** because:

1. Our recommendations are **educational**, not exact code
2. Applying educational examples literally **breaks code**
3. We can't predict exact replacements without full context

**Archived files:** `cli/archive/autofix-cli.ts`

---

## 📋 Implementation Priority

### Phase 1: API Foundation (Month 4-5)
- [ ] Define issue data format API
- [ ] Ensure all integrations get same data
- [ ] Include educational content in responses

### Phase 2: GitHub App (Month 5-6)
- [ ] Show issues in PR comments
- [ ] Include "Fix with AI" prompt
- [ ] Link to documentation

### Phase 3: VS Code Extension (Month 6-7)
- [ ] Display issues in Problems panel
- [ ] "Fix with AI" command
- [ ] Integration with Copilot/Claude

### Phase 4: Web Dashboard (Month 7-8)
- [ ] Issue browser
- [ ] AI chat for fixes
- [ ] One-click PR creation

---

## 🧪 Testing Strategy

Instead of testing auto-fix accuracy, we test:

1. **Issue Detection Accuracy** - Are we finding real issues?
2. **Educational Quality** - Is the guidance helpful?
3. **AI Fix Success Rate** - When users use AI, do fixes work?
4. **User Satisfaction** - Survey after fixing

---

## 📁 Directory Structure

```
cli/
├── README.md              # This file
├── archive/               # Deprecated CLI approach
│   ├── autofix-cli.ts
│   ├── autofix-cli.ts.backup
│   └── CLI_STATUS.md
└── (future integration code)
```

---

*This document defines the correct auto-fix architecture. The user's AI generates fixes, we provide guidance.*
