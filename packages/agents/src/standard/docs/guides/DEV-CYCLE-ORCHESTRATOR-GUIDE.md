# Dev Cycle Orchestrator Guide

## Overview

The Dev Cycle Orchestrator is a workflow management system that helps maintain consistent development practices across the Standard Framework. One of its key responsibilities is creating session summaries to document development progress.

## Session Summary Updates

### Current Location
Session summaries should be written to:
```
/packages/agents/src/standard/docs/session_summary/
```

### File Naming Convention
```
SESSION_SUMMARY_YYYY_MM_DD.md
```

Example: `SESSION_SUMMARY_2025_08_14.md`

## Implementation Update Required

### Current Issue
The dev-cycle-orchestrator may be writing session summaries to the wrong location. It needs to be updated to write to the Standard Framework's session_summary directory.

### Required Changes

1. **Update the session summary path in orchestrator**:

```typescript
// OLD PATH (incorrect)
const SESSION_SUMMARY_PATH = '/docs/session-summaries/';

// NEW PATH (correct)
const SESSION_SUMMARY_PATH = '/packages/agents/src/standard/docs/session_summary/';
```

2. **Update the file naming format**:

```typescript
// Generate session summary filename
const date = new Date();
const year = date.getFullYear();
const month = String(date.getMonth() + 1).padStart(2, '0');
const day = String(date.getDate()).padStart(2, '0');
const filename = `SESSION_SUMMARY_${year}_${month}_${day}.md`;
const filepath = path.join(SESSION_SUMMARY_PATH, filename);
```

3. **Session Summary Template**:

```markdown
# Session Summary - [Date]

## Overview
Brief description of the session's focus and achievements.

## Tasks Completed
- [ ] Task 1 description
- [ ] Task 2 description
- [ ] Task 3 description

## Code Changes
### Files Modified
- `path/to/file1.ts` - Description of changes
- `path/to/file2.ts` - Description of changes

### New Files Created
- `path/to/newfile.ts` - Purpose of the file

### Files Deleted
- `path/to/oldfile.ts` - Reason for deletion

## Issues Resolved
- Issue #1: Description and solution
- Issue #2: Description and solution

## Next Steps
1. Priority task for next session
2. Secondary task
3. Nice-to-have task

## Notes
Any additional context or important observations from the session.
```

## Workflow Integration

### When to Create Session Summaries

1. **At Session End**: Always create a summary when completing a development session
2. **Major Milestone**: When completing a significant feature or phase
3. **Before Context Switch**: When switching to a different task or project
4. **Weekly**: At minimum, create a weekly summary of progress

### What to Include

1. **Objective Metrics**:
   - Lines of code added/removed
   - Files modified/created/deleted
   - Tests added/passing/failing
   - Build status

2. **Subjective Assessment**:
   - Progress toward goals
   - Challenges encountered
   - Solutions implemented
   - Technical decisions made

3. **Action Items**:
   - Incomplete tasks
   - Discovered issues
   - Technical debt identified
   - Next session priorities

## Automation Script

Create a helper script to generate session summaries:

```bash
#!/bin/bash
# generate-session-summary.sh

DATE=$(date +%Y_%m_%d)
SUMMARY_DIR="/packages/agents/src/standard/docs/session_summary"
SUMMARY_FILE="$SUMMARY_DIR/SESSION_SUMMARY_$DATE.md"

# Create directory if it doesn't exist
mkdir -p $SUMMARY_DIR

# Generate summary template
cat > $SUMMARY_FILE << EOF
# Session Summary - $(date +"%B %d, %Y")

## Overview
[Brief description of session focus]

## Tasks Completed
- [ ] 

## Code Changes
### Files Modified
- 

### New Files Created
- 

### Files Deleted
- 

## Issues Resolved
- 

## Next Steps
1. 

## Notes
[Additional context]
EOF

echo "Session summary created at: $SUMMARY_FILE"
```

## Best Practices

1. **Be Concise**: Summaries should be scannable in 1-2 minutes
2. **Be Specific**: Include file paths and issue numbers
3. **Be Honest**: Document challenges and blockers
4. **Be Forward-Looking**: Always include next steps
5. **Use Consistent Format**: Follow the template for easy parsing

## Integration with OPERATIONAL-PLAN

Session summaries should reference the current phase from [`planning/OPERATIONAL-PLAN.md`](../planning/OPERATIONAL-PLAN.md):

```markdown
## Current Phase
Phase 0: Fix Core Flow & Monitoring (Week 1)
- Task 1: Move Monitoring to Standard ✅
- Task 2: Implement Educator.research() 🔄
```

This helps track progress against the operational plan.

## Related Documentation
- [OPERATIONAL-PLAN.md](../planning/OPERATIONAL-PLAN.md) - Current development roadmap
- [Session summaries](../session_summary/) - Historical session documentation