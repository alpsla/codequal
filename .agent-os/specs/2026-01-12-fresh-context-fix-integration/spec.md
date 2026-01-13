# Spec Requirements Document

> Spec: Fresh Context Fix Flow Integration
> Created: 2026-01-12

## Overview

Integrate the Session 82 Ralph-inspired fix flow components (FreshContextFixService, StoryDecomposer, PRFixStateManager, RepositoryLearningService) into the V9 production API for PRO tier users, enabling resumable fix sessions with fresh AI context per attempt and cross-repository knowledge sharing.

## User Stories

### PRO Tier User Gets Intelligent Auto-Fixes

As a PRO tier user, I want my PR analysis to automatically fix code issues using accumulated knowledge from similar repositories, so that I get higher quality fixes that avoid known anti-patterns.

**Workflow:**
1. User submits PR for analysis with `generateFixes: true`
2. System detects issues via tool execution (PMD, SpotBugs, etc.)
3. Issues are grouped into atomic "fix stories" by file and rule
4. Each story is fixed with fresh AI context, including:
   - KB guidance (anti-patterns to avoid)
   - Cross-repo learnings (what worked in similar repos)
   - Within-PR learnings (accumulated during this session)
5. Failed fixes retry up to 3 times with structured feedback
6. Valuable learnings are saved for future PRs
7. User receives fixed code with high success rate

### Developer Resumes Interrupted Fix Session

As a developer, I want to resume a fix session that was interrupted, so that I don't lose progress on partially completed fixes.

**Workflow:**
1. Fix session starts, state saved to `pr-fix-state.json`
2. Session interrupted (timeout, error, user stops)
3. User re-submits same PR for analysis
4. System detects existing state file
5. Processing resumes from last incomplete story
6. No duplicate work on already-fixed issues

## Spec Scope

1. **Story Decomposition** - Group detected issues into atomic fix stories by file and rule similarity
2. **Fresh Context Fix Service** - Process each fix with completely fresh AI context (no conversation bloat)
3. **State Persistence** - Save fix progress to disk for resumability
4. **Repository Learnings** - Fetch and apply cross-repo knowledge during fix generation
5. **Learning Accumulation** - Track what works/fails and persist valuable insights to KB
6. **API Integration** - Wire components into `/api/v9/analyze` PRO tier flow

## Out of Scope

- Changes to BASIC tier flow (no fixes generated)
- Modifications to tool execution logic (V9ToolOrchestrator unchanged)
- Changes to agent processing (5 agents stay as-is)
- New UI components (API-only changes)
- Real-time progress streaming (batch response only)

## Expected Deliverable

1. PRO tier analysis uses FreshContextFixService for all fix generation
2. Fix success rate improves due to KB guidance and cross-repo learnings
3. Interrupted sessions can be resumed without losing progress
4. E2E test `test-fix-flow-framework-e2e.ts` passes with mocks
5. Integration test with real API passes for Java language
