# Ralph Commands Reference

## Claude Skills (In-Session Commands)

### `/rex` or `/ralph-execute`

**Full automation** - Questions → PRD → Tasks → Execute

```bash
/rex Add user authentication with OAuth support
```

**What it does:**
1. Asks 3-5 clarifying questions
2. Creates `tasks/prd-[feature].md`
3. Creates `tasks.json`
4. Creates `progress.txt`
5. Shows confirmation prompt
6. Launches autonomous loop

**Options after confirmation:**
- `A` - Start execution (background)
- `B` - Review PRD first
- `C` - Adjust stories
- `D` - Cancel

---

### `/prd`

**Create PRD only** - No execution

```bash
/prd Add dark mode toggle with persistence
```

**What it does:**
1. Asks clarifying questions
2. Creates `tasks/prd-[feature].md`
3. Stops (no execution)

**Use when:** You want to review/edit the PRD before running.

---

### `/ralph`

**Convert PRD to tasks** - Prepare for execution

```bash
# Auto-detect latest PRD
/ralph

# Specify PRD file
/ralph tasks/prd-dark-mode.md
```

**What it does:**
1. Reads PRD file
2. Creates `tasks.json`
3. Creates `progress.txt`
4. Shows command to run loop

---

## Shell Scripts

### `claude-ralph.sh`

**Generic** autonomous loop for any project.

```bash
~/.claude/scripts/claude-ralph.sh [iterations] [tasks_file] [timeout]
```

**Parameters:**
| Param | Default | Description |
|-------|---------|-------------|
| iterations | 10 | Max iterations before stopping |
| tasks_file | tasks.json | Path to tasks file |
| timeout | 300 | Seconds per iteration |

**Examples:**
```bash
# Default (10 iterations)
~/.claude/scripts/claude-ralph.sh

# 20 iterations
~/.claude/scripts/claude-ralph.sh 20

# Custom tasks file
~/.claude/scripts/claude-ralph.sh 10 my-tasks.json

# 10 minute timeout per iteration
~/.claude/scripts/claude-ralph.sh 10 tasks.json 600
```

---

### `codequal-ralph.sh`

**CodeQual-specific** loop with project validation.

```bash
~/.claude/scripts/codequal-ralph.sh [iterations] [timeout]
```

**Requirements:**
- Must run from CodeQual project root
- Must have `turbo.json` and `packages/agents/`

**Quality gates:**
```bash
turbo run build --filter=@codequal/agents
cd packages/agents && npx tsc --noEmit --skipLibCheck
```

---

## File Outputs

### `tasks.json`

Machine-readable task state:

```json
{
  "feature": "Dark Mode",
  "branchName": "feature/dark-mode",
  "currentIteration": 3,
  "stories": [
    {
      "id": 1,
      "title": "Add theme toggle",
      "passes": true,
      "attempts": 1,
      "completedAt": "2024-01-15T10:30:00Z"
    },
    {
      "id": 2,
      "title": "Implement theme context",
      "passes": false,
      "attempts": 2,
      "lastError": "Type error in ThemeProvider"
    }
  ]
}
```

---

### `progress.txt`

Human-readable progress log:

```
# Ralph Progress Log
# Feature: Dark Mode
# Started: 2024-01-15T10:00:00Z

## Learnings
- Use CSS variables for theme colors
- ThemeContext must wrap entire app

---

=== ITERATION 1 ===
Story: Add theme toggle
Status: COMPLETE
Changes: src/components/ThemeToggle.tsx
Learnings: Used existing Switch component
---

=== ITERATION 2 ===
Story: Implement theme context
Status: FAILED
Error: ThemeProvider missing children prop type
Next Steps: Add React.ReactNode type to props
---
```

---

### `tasks/prd-[feature].md`

PRD document:

```markdown
# PRD: Dark Mode

## Overview
Add theme switching capability...

## Branch
`feature/dark-mode`

## User Stories

### Story 1: Add Theme Toggle
**As a** user
**I want** to toggle dark mode
**So that** I can reduce eye strain

**Acceptance Criteria:**
- [ ] Toggle in settings
- [ ] Typecheck passes
```

---

## Environment Variables

None required. All configuration via command arguments.

---

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All stories complete |
| 1 | Max iterations reached (stories remain) |
| 124 | Iteration timeout |
