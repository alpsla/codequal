# Session Continuity Documentation Paths

## Critical Session Files for CodeQual

### Primary Session Documentation
**Location**: `/packages/agents/src/standard/docs/session_summary/`
- `NEXT_SESSION_PLAN.md` - Primary source for next session priorities and tasks
- `SESSION_SUMMARY_*.md` - Historical session summaries
- Bug tracking files in `/packages/agents/src/standard/docs/bugs/`

### DeepWiki-Specific Documentation  
**Location**: `/packages/agents/src/standard/deepwiki/docs/`
- `NEXT_SESSION_PLAN.md` - DeepWiki-specific tasks and issues
- Session summaries for DeepWiki work

### Development State Documentation
**Location**: `/packages/agents/src/standard/docs/development_state/`
- State files tracking current development progress
- Bug fix documentation

## Agent Configuration Requirements

### codequal-session-starter
Must read from BOTH:
1. `/packages/agents/src/standard/docs/session_summary/NEXT_SESSION_PLAN.md`
2. `/packages/agents/src/standard/deepwiki/docs/NEXT_SESSION_PLAN.md`

### session-wrapper
Must update BOTH:
1. `/packages/agents/src/standard/docs/session_summary/` (create new session summary)
2. `/packages/agents/src/standard/deepwiki/docs/` (if DeepWiki work was done)
3. Update or create NEXT_SESSION_PLAN.md in appropriate location

## Important Notes

- **IGNORE** `/Users/alpinro/.claude/CLAUDE.md` for project-specific issues
- **USE ONLY** project documentation in the paths above
- **MAINTAIN** session continuity through these documented files
- **CREATE** bug tracking files in `/packages/agents/src/standard/docs/bugs/` when new issues arise

## Current Active Session Plan

The current NEXT_SESSION_PLAN.md indicates:
- **Priority**: V8 Report Testing & Bug Fixes
- **Critical Bugs**: BUG-058, BUG-059, BUG-062
- **Focus**: Fix location issues, issue counting, PR metadata display

## Session Wrapper Update Instructions

When wrapping a session, the agent should:
1. Check both NEXT_SESSION_PLAN.md locations
2. Update completed tasks
3. Move pending tasks to next session
4. Document any new bugs discovered
5. Create session summary with timestamp
6. Update NEXT_SESSION_PLAN.md with current state