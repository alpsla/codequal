# Priority Check

Quick priority assessment with immediate recommendations for what to work on next.

## Trigger Phrases:
- "What should I work on?"
- "Check priorities"
- "Am I working on the right thing?"
- "Quick priority check"

## Instant Priority Analysis:

### Step 1: Current Focus Assessment
```bash
echo "🎯 Priority Assessment - $(date +%H:%M)"
echo "======================================="

# What are you currently working on?
echo -e "\n📍 Current Work (uncommitted changes):"
git status --short | head -5

# Check if it's on critical path
CURRENT_FILES=$(git diff --name-only)
echo -e "\n🔍 Checking priority alignment..."
```

### Step 2: Critical Path Analysis
```bash
# Read operational plan for P0 items
OPERATIONAL_PLAN="packages/agents/src/standard/docs/planning/OPERATIONAL-PLAN.md"

echo -e "\n🚨 Critical Items (P0):"
grep -E "P0|CRITICAL|BLOCKER" "$OPERATIONAL_PLAN" 2>/dev/null | head -3

echo -e "\n⚡ Urgent Items (due this week):"
grep -E "Due:|Deadline:" "$OPERATIONAL_PLAN" 2>/dev/null | grep -E "$(date +%Y-%m)" | head -3
```

### Step 3: Quick ROI Calculation
```bash
echo -e "\n💰 Highest ROI Tasks (Value/Effort):"

# Simple scoring based on patterns in plan
declare -A task_scores
task_scores["API"]="90"  # High value, blocks others
task_scores["Auth"]="85"  # Security critical
task_scores["Testing"]="80"  # Reduces risk
task_scores["UI"]="70"  # User-facing
task_scores["Docs"]="40"  # Important but not blocking

# Check what needs work
for component in "${!task_scores[@]}"; do
  if grep -q "- \[ \].*$component" "$OPERATIONAL_PLAN" 2>/dev/null; then
    echo "  [$component]: Score ${task_scores[$component]}/100"
  fi
done
```

### Step 4: Blocker Detection
```bash
echo -e "\n🚧 Current Blockers:"

# Check for failing tests
TEST_FAILURES=$(npm test 2>&1 | grep -c "FAIL" || echo 0)
[ $TEST_FAILURES -gt 0 ] && echo "  ❌ $TEST_FAILURES failing tests - FIX FIRST"

# Check for build errors
npm run typecheck --silent 2>&1 || echo "  ❌ TypeScript errors - FIX FIRST"

# Check DeepWiki status
curl -s http://localhost:8001/health || echo "  ⚠️ DeepWiki offline - may block testing"
```

### Step 5: Smart Recommendation
```bash
echo -e "\n✅ RECOMMENDATION:"

# Decision tree for priorities
if [ $TEST_FAILURES -gt 0 ]; then
  echo "🔴 STOP: Fix failing tests first"
  echo "   Run: npm test -- --onlyFailures"
  
elif ! npm run typecheck --silent 2>&1; then
  echo "🔴 STOP: Fix TypeScript errors"
  echo "   Run: npm run typecheck"
  
elif grep -q "- \[ \].*API.*CRITICAL" "$OPERATIONAL_PLAN" 2>/dev/null; then
  echo "🟡 FOCUS: Critical API work pending"
  echo "   This blocks multiple features"
  
elif grep -q "- \[ \].*Auth" "$OPERATIONAL_PLAN" 2>/dev/null; then
  echo "🟡 FOCUS: Authentication system"
  echo "   Security requirement for launch"
  
else
  echo "🟢 CONTINUE: Current work aligned"
  echo "   Progress: On track"
fi
```

### Step 6: Time-boxed Suggestions
```bash
echo -e "\n⏰ Based on time available:"

HOUR=$(date +%H)
if [ $HOUR -lt 12 ]; then
  echo "Morning (high focus): Tackle complex/critical tasks"
  echo "  Suggested: Architecture, algorithms, critical bugs"
elif [ $HOUR -lt 15 ]; then
  echo "Afternoon: Collaborative work"
  echo "  Suggested: Code reviews, API integration, testing"
else
  echo "Late day: Low-complexity tasks"
  echo "  Suggested: Documentation, cleanup, planning"
fi
```

### Step 7: Quick Priority Shift
```bash
echo -e "\n🔄 Quick Commands:"

# Provide instant action commands
cat << 'EOF'
# Switch to highest priority:
git stash && git checkout -b fix/critical-api-issue

# Check full analysis:
claude --agent progress-advisor

# Update priorities in plan:
code packages/agents/src/standard/docs/planning/OPERATIONAL-PLAN.md
EOF
```

## Integration with Progress Advisor:

```bash
# If significant misalignment detected
MISALIGNED=$([ $TEST_FAILURES -gt 5 ] || ! npm run typecheck --silent 2>&1 && echo "true" || echo "false")

if [ "$MISALIGNED" = "true" ]; then
  echo -e "\n⚠️ Priority misalignment detected!"
  echo "Running full analysis..."
  claude --agent progress-advisor --mode quick-assessment
fi
```

## Quick Priority Matrix:

```
URGENT + IMPORTANT:     DO NOW
- Failing tests         
- Build breaks         
- Security issues      
- Critical blockers    

NOT URGENT + IMPORTANT: SCHEDULE
- Refactoring
- Documentation
- Performance optimization
- Technical debt

URGENT + NOT IMPORTANT: DELEGATE/DEFER
- Non-critical bugs
- Feature requests
- Nice-to-haves

NOT URGENT + NOT IMPORTANT: DROP
- Premature optimization
- Gold plating
- Scope creep items
```