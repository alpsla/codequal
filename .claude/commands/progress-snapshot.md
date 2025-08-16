# Progress Snapshot

Quick project progress check with estimation updates - lightweight alternative to full progress-tracker agent.

## Trigger Phrases:
- "Quick progress check"
- "Show project status"
- "What's our velocity?"
- "Are we on track?"

## Quick Status Dashboard:

### Step 1: Current Sprint Progress
```bash
echo "📊 CodeQual Progress Snapshot - $(date +%Y-%m-%d)"
echo "============================================"

# Today's commits
echo -e "\n📝 Today's Progress:"
git log --since="midnight" --oneline --no-merges | head -10

# This week's velocity
WEEK_COMMITS=$(git log --since="1 week ago" --oneline --no-merges | wc -l)
echo -e "\n📈 Weekly Velocity: $WEEK_COMMITS commits"

# Files changed today
echo -e "\n📁 Files Modified Today:"
git diff --stat --since="midnight" | tail -1
```

### Step 2: Task Completion Check
```bash
echo -e "\n✅ Task Completion Status:"

# Check TODO completion in recent sessions
if [ -f "docs/session-summaries/$(date +%Y-%m-%d).md" ]; then
  grep -E "✅|❌|⏳" docs/session-summaries/$(date +%Y-%m-%d).md | head -5
fi

# Test coverage trend
COVERAGE=$(npm test -- --coverage --silent 2>&1 | grep "All files" | awk '{print $4}')
echo "Test Coverage: ${COVERAGE:-N/A}"

# Build status
npm run typecheck --silent 2>&1 && echo "✅ TypeScript: Clean" || echo "❌ TypeScript: Has errors"
```

### Step 3: Feature Progress Tracking
```bash
echo -e "\n🎯 Feature Implementation Progress:"

# Read from operational plan
if [ -f "packages/agents/src/standard/docs/planning/OPERATIONAL-PLAN.md" ]; then
  echo "Checking against operational plan..."
  grep -E "^- \[.\]" packages/agents/src/standard/docs/planning/OPERATIONAL-PLAN.md | head -10
fi

# Count completed vs pending features
COMPLETED=$(grep -c "- \[x\]" packages/agents/src/standard/docs/planning/OPERATIONAL-PLAN.md 2>/dev/null || echo 0)
PENDING=$(grep -c "- \[ \]" packages/agents/src/standard/docs/planning/OPERATIONAL-PLAN.md 2>/dev/null || echo 0)
TOTAL=$((COMPLETED + PENDING))

if [ $TOTAL -gt 0 ]; then
  PROGRESS=$((COMPLETED * 100 / TOTAL))
  echo "Progress: $COMPLETED/$TOTAL tasks ($PROGRESS%)"
  
  # Simple progress bar
  printf "["
  for i in $(seq 1 20); do
    if [ $((i * 5)) -le $PROGRESS ]; then
      printf "█"
    else
      printf "░"
    fi
  done
  printf "] $PROGRESS%%\n"
fi
```

### Step 4: Velocity-Based Estimation
```bash
echo -e "\n⏱️ Updated Estimations:"

# Calculate average daily velocity
DAILY_AVG=$(git log --since="30 days ago" --oneline --no-merges | wc -l)
DAILY_AVG=$((DAILY_AVG / 30))

echo "Average velocity: $DAILY_AVG commits/day"

# Estimate completion based on remaining tasks
if [ $PENDING -gt 0 ] && [ $DAILY_AVG -gt 0 ]; then
  # Assume 2 commits per task average
  DAYS_REMAINING=$((PENDING * 2 / DAILY_AVG))
  COMPLETION_DATE=$(date -d "+$DAYS_REMAINING days" +%Y-%m-%d 2>/dev/null || date -v +${DAYS_REMAINING}d +%Y-%m-%d)
  echo "Estimated completion: $COMPLETION_DATE ($DAYS_REMAINING days)"
fi

# Risk factors
echo -e "\n⚠️ Risk Factors:"
[ $DAILY_AVG -lt 3 ] && echo "- Low velocity (< 3 commits/day)"
[ $PENDING -gt 50 ] && echo "- High number of pending tasks"
[ $(git status --porcelain | wc -l) -gt 10 ] && echo "- Many uncommitted changes"
```

### Step 5: Integration with Full Progress Tracking
```bash
echo -e "\n🔄 Next Actions:"

# Suggest full progress update if needed
LAST_PROGRESS_UPDATE=$(find docs/progress-reports -name "*.md" -mtime -7 | wc -l)
if [ $LAST_PROGRESS_UPDATE -eq 0 ]; then
  echo "⚡ No progress report in 7 days. Run full progress-tracker:"
  echo "   claude --agent progress-tracker"
fi

# Auto-trigger if significant changes
if [ $WEEK_COMMITS -gt 50 ] || [ $COMPLETED -gt 10 ]; then
  echo "📈 Significant progress detected! Updating estimations..."
  claude --agent progress-tracker --mode quick-update
fi
```

## Quick Commands:
```bash
# Just velocity
git log --since="1 week ago" --oneline --no-merges | wc -l

# Just progress percentage
grep -c "- \[x\]" packages/agents/src/standard/docs/planning/OPERATIONAL-PLAN.md

# Full progress tracking
claude --agent progress-tracker
```

## Auto-Integration:
This snapshot runs automatically:
- After each commit (via dev-cycle-orchestrator)
- Before daily standups
- When estimation updates are needed