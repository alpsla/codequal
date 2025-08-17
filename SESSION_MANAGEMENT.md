# Session Management System

## Overview
This document defines the unified session management system for the CodeQual project, clarifying the roles of different session tracking mechanisms and how they integrate.

## Directory Structure and Roles

### 1. Operational Session Summaries
**Location**: `/packages/agents/src/standard/docs/session_summary/`
**Purpose**: Day-to-day operational tracking and immediate task planning
**Contents**:
- `SESSION_SUMMARY_YYYY_MM_DD_*.md` - Daily work summaries
- `NEXT_SESSION_PLAN.md` - Immediate next steps and context
- Bug fixes, feature implementations, current sprint work

**When to Update**:
- At the end of each development session
- When completing significant tasks
- Before context switch or session end

### 2. Strategic Session Summaries
**Location**: `/docs/session-summaries/`
**Purpose**: Long-term architectural decisions and major milestones
**Contents**:
- Major architecture changes
- Strategic pivots
- Release milestones
- Cross-cutting concerns

**When to Update**:
- After major feature completions
- When making architectural decisions
- At sprint/milestone boundaries

### 3. Implementation Plans
**Location**: `/docs/implementation-plans/`
**Purpose**: Current development state and implementation roadmaps
**Contents**:
- `current-implementation-status-*.md` - Current system state
- Feature implementation plans
- Technical debt tracking

## Session Workflow

### Starting a Session

1. **Run Session Starter**:
   ```bash
   cd packages/agents
   npm run session
   ```
   This automatically:
   - Loads environment from `.env`
   - Checks service health
   - Shows last session summary
   - Provides context-aware commands

2. **Review Context**:
   - Check `NEXT_SESSION_PLAN.md` for immediate tasks
   - Review active bugs and priorities
   - Note any blocking issues from previous session

### During the Session

1. **Track Progress**:
   - Use TodoWrite tool for task tracking
   - Update bug status as issues are resolved
   - Document significant decisions

2. **Test Regularly**:
   ```bash
   npm run test:pr:small  # Quick validation
   npm run test:pr:large  # Comprehensive test
   ```

### Ending a Session

1. **Use Session Wrapper**:
   The session-wrapper agent should be invoked to:
   - Create operational session summary
   - Update NEXT_SESSION_PLAN.md
   - Commit changes with descriptive messages
   - Update strategic summaries if major milestones reached

2. **Session Wrapper Integration**:
   ```bash
   # The session-wrapper agent will:
   # 1. Create session summary in operational directory
   # 2. Update NEXT_SESSION_PLAN.md with context
   # 3. Create commits for the day's work
   # 4. Update implementation status if needed
   ```

## Integration Rules

### Session-Wrapper Agent Responsibilities

The session-wrapper agent handles:
1. **Operational Updates** (always):
   - Creates `SESSION_SUMMARY_YYYY_MM_DD_*.md`
   - Updates `NEXT_SESSION_PLAN.md`
   - Preserves context for next session

2. **Strategic Updates** (when appropriate):
   - Major feature completions
   - Architectural changes
   - Milestone achievements

3. **Git Operations**:
   - Creates atomic commits
   - Updates documentation
   - Preserves work state

### Session-Starter Agent Responsibilities

The session-starter agent handles:
1. **Environment Setup**:
   - Loads environment variables
   - Starts required services
   - Validates configuration

2. **Context Retrieval**:
   - Reads NEXT_SESSION_PLAN.md
   - Shows git status
   - Lists active bugs

3. **Quick Commands**:
   - Provides relevant test commands
   - Shows service-specific fixes
   - Offers context-aware actions

## File Naming Conventions

### Operational Summaries
```
SESSION_SUMMARY_YYYY_MM_DD_<TOPIC>.md
Example: SESSION_SUMMARY_2025_08_17_BUG_032_RESOLUTION.md
```

### Strategic Summaries
```
YYYY-MM-DD-<topic-kebab-case>.md
Example: 2025-08-17-bug-032-deepwiki-integration-fixes.md
```

### Next Session Plans
Always named: `NEXT_SESSION_PLAN.md` (overwritten each session)

## Priority Hierarchy

1. **NEXT_SESSION_PLAN.md** - Highest priority, immediate context
2. **Recent operational summaries** - Current sprint work
3. **Implementation status** - Overall system state
4. **Strategic summaries** - Long-term context

## Best Practices

### DO:
- ✅ Always update NEXT_SESSION_PLAN.md before ending session
- ✅ Use session-wrapper for proper session closure
- ✅ Keep operational summaries focused on immediate work
- ✅ Escalate major decisions to strategic summaries
- ✅ Use consistent naming conventions

### DON'T:
- ❌ Mix operational and strategic content
- ❌ Skip session-wrapper when ending work
- ❌ Create duplicate summaries in wrong directories
- ❌ Forget to update NEXT_SESSION_PLAN.md
- ❌ Leave uncommitted changes

## Quick Reference

### Start Session
```bash
npm run session          # Complete setup and context
```

### During Session
```bash
npm run test:pr:small    # Test with small PR
npm run test:pr:large    # Test with large PR
npm run analyze <URL>    # Analyze specific PR
```

### End Session
Use session-wrapper agent to:
- Create summaries
- Update plans
- Commit work
- Preserve context

## Environment Variables

The session management system relies on these being properly set:
- `OPENROUTER_API_KEY` - For AI model access
- `DEEPWIKI_API_URL` - For code analysis
- `SUPABASE_URL` - For data storage
- `REDIS_URL` - For caching

These are automatically loaded by the session-starter from `.env` file.

## Troubleshooting

### Session Context Lost
1. Check `NEXT_SESSION_PLAN.md` exists
2. Review recent operational summaries
3. Check git log for recent commits

### Environment Issues
1. Run `npm run setup` to fix services
2. Check `.env` file exists with required keys
3. Verify port forwarding is active

### Conflicting Information
Priority order:
1. NEXT_SESSION_PLAN.md (most recent)
2. Latest operational summary
3. Implementation status
4. Strategic summaries

---

*Last Updated: 2025-08-17*
*Version: 1.0*