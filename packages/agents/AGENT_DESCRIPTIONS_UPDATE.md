# Agent Description Updates for Claude Configuration

## 1. Update codequal-session-starter Agent

### Current Description:
```
Use this agent when you need to quickly prepare the CodeQual development environment and get session context. This includes checking the latest session status, verifying that DeepWiki kubernetes pod and Redis are running, providing copy-paste ready commands, and identifying pending tasks from previous sessions.
```

### Updated Description (ADD THIS):
```
Use this agent when you need to quickly prepare the CodeQual development environment and get session context. This includes checking the latest session status, verifying that DeepWiki kubernetes pod and Redis are running, providing copy-paste ready commands, and identifying pending tasks from previous sessions. 

IMPORTANT: The agent should ALWAYS check for and read the NEXT_SESSION_START.md file if it exists at /Users/alpinro/Code Prjects/codequal/packages/agents/NEXT_SESSION_START.md. This file contains:
- Quick start instructions from the previous session
- Essential documentation paths
- Current bug status and debugging strategies
- Test commands to verify current state
- Priority tasks and where to continue

If NEXT_SESSION_START.md exists, the agent should:
1. Display its key sections (priority task, quick setup, current state)
2. Provide the exact commands to continue debugging
3. Reference the session summary documentation
4. Show the current working/broken status

Trigger phrases include 'start codequal session', 'setup codequal', 'codequal status', 'prepare environment', 'quick setup', or at the beginning of any CodeQual development work.
```

## 2. Update session-wrapper Agent

### Current Description:
```
Wraps up your coding session by fixing all issues, creating commits, updating docs, and preserving state. Perfect for ending work sessions or preparing code for push. Runs build-ci-fixer, smart-commit-manager, progress-doc-manager, and state updates sequentially.
```

### Updated Description (ADD THIS):
```
Wraps up your coding session by fixing all issues, creating commits, updating docs, preserving state, and creating a Next Session Quick Start Guide. Perfect for ending work sessions or preparing code for push. Runs build-ci-fixer, smart-commit-manager, progress-doc-manager, and state updates sequentially.

IMPORTANT: The agent should ALWAYS create a NEXT_SESSION_START.md file at /Users/alpinro/Code Prjects/codequal/packages/agents/NEXT_SESSION_START.md containing:

1. **Session Context**: Brief summary of what was accomplished
2. **Essential Documentation Paths**: Links to session summaries and key docs
3. **Quick Environment Setup**: Exact commands to restore the working environment
4. **Current State**: What's working, what's broken, what needs attention
5. **Priority Tasks**: Clear next steps with specific file locations
6. **Test Commands**: Commands to verify current state
7. **Debugging Strategy**: For any outstanding bugs
8. **Success Criteria**: How to know when the priority task is complete

The NEXT_SESSION_START.md should be:
- Self-contained (no need to search for context)
- Action-oriented (commands ready to copy-paste)
- Clear about the current bug/issue status
- Include expected vs actual results

This ensures the next session (whether same developer or someone else) can start productively within 1 minute.
```

## 3. How to Apply These Updates

### For Local Claude Desktop Config:
1. Open Claude Desktop settings
2. Navigate to Agent configurations
3. Update the descriptions for:
   - `codequal-session-starter`
   - `session-wrapper`

### For Team Configuration:
Add these updated descriptions to your team's shared agent configuration file.

## 4. Workflow Benefits

### Starting a Session:
```
User: "start codequal session"
Agent: 
- Checks for NEXT_SESSION_START.md
- Shows priority tasks and current state
- Provides exact commands to continue
- References all relevant documentation
```

### Ending a Session:
```
User: "wrap up session"
Agent:
- Fixes issues and creates commits
- Updates documentation
- Creates NEXT_SESSION_START.md for next session
- Preserves complete context
```

## 5. Example NEXT_SESSION_START.md Structure

```markdown
# 🚀 Quick Start for Next Session

## Session Context
- Previous session date and main achievement
- Outstanding issue/bug number

## 📁 Essential Documentation
- Session summary path
- Bug documentation path
- Architecture docs if relevant

## 🔧 Quick Environment Setup
```bash
# Copy-paste ready commands
cd /path/to/project
kubectl port-forward ...
npm run build
```

## 🎯 Continue Where We Left Off
### Current State:
- ✅ What's working
- ❌ What's broken

### Priority Task:
- Specific bug number
- Exact file and line number
- Debugging strategy

## Test Commands
```bash
# Command to test working state
# Command to reproduce bug
```

## Success Criteria
- Clear definition of "fixed"
- Expected output
```

---

## Implementation Note

These updates ensure a seamless handoff between sessions, reducing context-switching time from 15-30 minutes to under 1 minute. The `codequal-session-starter` becomes context-aware and the `session-wrapper` becomes forward-thinking, creating a perfect development workflow loop.