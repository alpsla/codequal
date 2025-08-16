# Enhanced Dev Cycle

Complete development cycle with integrated progress tracking and estimation updates.

## Enhanced Workflow:

### Phase 1: Fix & Build
```bash
# Standard dev-cycle-orchestrator tasks
claude --agent build-ci-fixer
```

### Phase 2: Performance Validation
```bash
# Pre-commit performance check
/pre-commit-perf-check
```

### Phase 3: Commit with Context
```bash
# Smart commit with progress context
claude --agent smart-commit-manager \
  --context "$(git log --oneline -5)" \
  --performance-score "$PERF_SCORE"
```

### Phase 4: Progress Update
```bash
# Quick progress snapshot after commit
/progress-snapshot

# Update session summary
echo "## Session Summary - $(date +%Y-%m-%d)" >> docs/session-summaries/$(date +%Y-%m-%d).md
echo "### Completed Tasks:" >> docs/session-summaries/$(date +%Y-%m-%d).md
git log --since="midnight" --oneline --no-merges >> docs/session-summaries/$(date +%Y-%m-%d).md

# Calculate progress delta
BEFORE_COMPLETED=$(git show HEAD~1:packages/agents/src/standard/docs/planning/OPERATIONAL-PLAN.md | grep -c "- \[x\]" 2>/dev/null || echo 0)
AFTER_COMPLETED=$(grep -c "- \[x\]" packages/agents/src/standard/docs/planning/OPERATIONAL-PLAN.md)
DELTA=$((AFTER_COMPLETED - BEFORE_COMPLETED))

if [ $DELTA -gt 0 ]; then
  echo "✅ Progress: +$DELTA tasks completed"
  
  # Trigger full progress update if significant
  if [ $DELTA -gt 3 ]; then
    claude --agent progress-tracker \
      --instructions "Significant progress made (+$DELTA tasks). Update estimations and generate report."
  fi
fi
```

### Phase 5: Documentation & State
```bash
# Update progress documentation
claude --agent progress-doc-manager

# Save state for next session
cat > .claude/state/last-session.json << EOF
{
  "date": "$(date -Iseconds)",
  "commits": $(git log --since="midnight" --oneline | wc -l),
  "tasks_completed": $DELTA,
  "performance_score": ${PERF_SCORE:-0},
  "coverage": "${COVERAGE:-unknown}",
  "next_milestone": "$(grep -m1 '## Next Milestone' packages/agents/src/standard/docs/planning/OPERATIONAL-PLAN.md | cut -d: -f2)"
}
EOF
```

## Automatic Triggers:

### On Every Commit:
1. Performance check
2. Progress snapshot
3. Estimation update (if needed)

### Daily (via cron or manual):
```bash
# Full progress report
claude --agent progress-tracker --mode daily-report
```

### Weekly:
```bash
# Comprehensive analysis with burndown charts
claude --agent progress-tracker --mode weekly-analysis
```

## Progress Tracking Integration:

The enhanced cycle now:
- **Tracks velocity** automatically
- **Updates estimations** based on actual progress
- **Identifies blockers** from commit patterns
- **Generates reports** for stakeholders
- **Maintains history** for trend analysis

## Usage:
```bash
# Standard cycle with progress tracking
/enhanced-dev-cycle

# Quick check without full cycle
/progress-snapshot

# Full progress analysis
claude --agent progress-tracker
```