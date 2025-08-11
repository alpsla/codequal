# Session Workflow Architecture

## Agent Responsibility Matrix

We have a clear separation of concerns between session start and session end:

```
┌──────────────────────────────────────────────────────────────┐
│                   DEVELOPMENT SESSION FLOW                    │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  SESSION START                     SESSION END                │
│  ┌─────────────────────┐          ┌──────────────────────┐   │
│  │ codequal-session-   │          │ dev-cycle-           │   │
│  │ starter             │          │ orchestrator         │   │
│  └──────────┬──────────┘          └──────────┬───────────┘   │
│             │                                 │                │
│       Responsibilities:                 Responsibilities:     │
│       • Environment setup               • Fix build/lint      │
│       • State validation               • Create commits       │
│       • Bug tracking                   • Update docs          │
│       • API key export                 • Update state test    │
│       • Service checks                 • Session summary      │
│             │                                 │                │
│             ▼                                 ▼                │
│      Developer Works                    Clean Finish          │
│      on Features/Bugs                   Ready to Push         │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

## Detailed Agent Responsibilities

### 🚀 `codequal-session-starter` (Session Start)

**Trigger Phrases:**
- "start codequal session"
- "setup codequal"
- "codequal status"
- "start real production ready test"

**Primary Responsibilities:**
1. **Environment Setup**
   - Export OPENROUTER_API_KEY
   - Check Redis connection
   - Verify DeepWiki pod status
   - Setup port forwarding
   - Check Supabase configuration

2. **State Validation**
   - Run `production-ready-state-test.ts`
   - Display feature confidence scores
   - List active bugs with fixes
   - Show next development tasks

3. **Quick Start**
   - Provide copy-paste commands
   - Start development status API
   - Show reference implementations
   - Display success metrics

**Output:**
- Environment ready
- Current state visible
- Bugs and tasks listed
- Commands provided

### 🏁 `dev-cycle-orchestrator` (Session End)

**Trigger Phrases:**
- "complete my development cycle"
- "fix, commit, and document everything"
- "prepare my code for push"
- "finish codequal session"

**Primary Responsibilities:**
1. **Phase 1 - Fix Everything**
   - Run build-ci-fixer agent
   - Fix ESLint issues
   - Resolve test failures
   - Clean up TypeScript errors

2. **Phase 2 - Smart Commits**
   - Run smart-commit-manager agent
   - Create organized commits
   - Write descriptive messages
   - Clean temporary files

3. **Phase 3 - Documentation**
   - Run progress-doc-manager agent
   - Update session summaries
   - Document architecture changes
   - Update implementation plans

4. **Phase 4 - State Update** (NEW)
   - Update `production-ready-state-test.ts`
   - Increment version number
   - Update feature confidence scores
   - Add/remove bugs
   - Update next tasks list

## Enhanced Dev-Cycle-Orchestrator

The dev-cycle-orchestrator should be enhanced to include state management:

### New Phase 4 - State Management

```typescript
// After documentation phase, update the state test
async function updateStateTest() {
  // Read current state
  const stateFile = 'src/standard/tests/integration/production-ready-state-test.ts';
  
  // Update based on session achievements
  const updates = {
    version: incrementVersion(SYSTEM_STATE.version),
    lastSession: new Date().toISOString().split('T')[0],
    features: updateFeatureConfidence(),
    bugs: updateBugList(),
    nextTasks: updateTaskList()
  };
  
  // Write updated state
  await updateFile(stateFile, updates);
  
  // Commit state changes
  await git.add(stateFile);
  await git.commit('chore: Update development state after session');
}
```

## Workflow Examples

### Complete Session Flow

```bash
# Morning: Start Session
User: "start codequal session"
→ codequal-session-starter runs
→ Environment ready, bugs listed, tasks shown

# Work on features...
# Fix bugs...
# Add new capabilities...

# Evening: End Session
User: "complete my development cycle"
→ dev-cycle-orchestrator runs
  → Phase 1: Fixes all issues
  → Phase 2: Creates commits
  → Phase 3: Updates docs
  → Phase 4: Updates state test

# Next Day: Start Again
User: "start codequal session"
→ Picks up exactly where left off
```

### Quick Fix Flow

```bash
# Start
User: "start codequal session"
→ Shows BUG-001: ModelVersionSync issue

# Fix the bug
Developer fixes ModelVersionSync...

# End
User: "fix, commit, and document everything"
→ Commits fix, updates docs, marks BUG-001 as resolved
```

## Benefits of Split Responsibility

### 1. **Clear Boundaries**
- Start agent focuses on setup
- End agent focuses on cleanup
- No overlapping concerns

### 2. **Optimized Performance**
- Start agent is fast (<2 minutes)
- End agent is thorough (handles all cleanup)
- Each optimized for its purpose

### 3. **Better Error Handling**
- Start failures don't affect commits
- Commit failures don't affect next session
- Each phase isolated

### 4. **Team Collaboration**
- Anyone can start a session
- Anyone can finish a session
- State persists across team members

### 5. **Flexibility**
- Can start without finishing
- Can finish without starting fresh
- Can run multiple times per day

## Configuration Updates Needed

### 1. Update dev-cycle-orchestrator.md

Add Phase 4 for state management:

```markdown
### Phase 4 - Update State
1. Read current SYSTEM_STATE from production-ready-state-test.ts
2. Update version number
3. Update feature confidence based on fixes
4. Remove fixed bugs from list
5. Add new bugs discovered
6. Update next tasks
7. Commit state changes
```

### 2. Create State Update Module

```typescript
// src/standard/utils/state-updater.ts
export class StateUpdater {
  updateAfterSession(achievements: SessionAchievements) {
    // Update confidence scores
    // Update bug list
    // Update task list
    // Increment version
  }
}
```

## Integration Points

### State Test Integration
Both agents use `production-ready-state-test.ts`:
- **Starter:** Reads state to show current status
- **Orchestrator:** Updates state after session

### API Integration
Both can use the development status API:
- **Starter:** Starts API server
- **Orchestrator:** Updates API with session results

### Documentation Integration
- **Starter:** Shows last session summary
- **Orchestrator:** Creates new session summary

## Summary

The split responsibility model provides:
- **Clear separation** between start and end
- **Persistent state** across sessions
- **Progressive development** with tracked progress
- **Team-friendly** workflow
- **Automated maintenance** of development state

This architecture ensures every session starts efficiently and ends cleanly, with full state preservation for continuous development.