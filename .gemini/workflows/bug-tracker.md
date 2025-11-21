---
description: Bug tracking and documentation management
---

# Bug Tracker Workflow

**Purpose**: Create, track, and manage bugs with proper validation and documentation

**When to use**: When discovering bugs, tracking issues, managing bug lifecycle

**Trigger**: "Track bug" or "Create bug report"

## Workflow Steps

### Phase 1: Gather Information

**Ask for bug details:**

```
🐛 Bug Report Creation
=====================

Please provide the following information:

1. What happened? (Description)
2. What should have happened? (Expected behavior)
3. How can we reproduce it? (Steps)
4. Which component is affected?
5. How severe is this issue?
6. Do you have a suggested fix?
```

### Phase 2: Validate and Classify

**Determine severity:**

**HIGH Severity:**
- Blocks core functionality
- Data loss or corruption risk
- Security vulnerabilities
- System crashes
- No workaround available

**MEDIUM Severity:**
- Degraded functionality
- Performance issues
- Missing features
- Workaround available but inconvenient

**LOW Severity:**
- Minor inconveniences
- Cosmetic issues
- Nice-to-have improvements
- Easy workarounds available

### Phase 3: Check for Duplicates

**Search existing bugs:**

```bash
# Check docs/bugs/ for similar issues
ls docs/bugs/BUG_*.md

# Search for similar descriptions
grep -r "similar keywords" docs/bugs/
```

**If duplicate found:**
- Link to existing bug
- Add additional context if needed
- Don't create new bug

### Phase 4: Assign Bug ID

**Get next bug ID:**

```bash
# Find highest bug number
ls docs/bugs/ | grep "BUG_" | sort -V | tail -1

# Increment for new bug
# Example: BUG_070.md → BUG_071.md
```

### Phase 5: Create Bug Report

**Generate bug report:**

```markdown
# BUG-XXX: [Brief Title]

**Status**: Open
**Severity**: [High/Medium/Low]
**Created**: [Date]
**Component**: [Affected component]
**Assigned To**: [Person or null]

## Description

[Detailed description of the issue]

## Impact

[How this affects users/system]

## Reproduction Steps

1. [Step 1]
2. [Step 2]
3. [Step 3]
4. [Observe issue]

## Expected Behavior

[What should happen]

## Actual Behavior

[What actually happens]

## Environment

- Version: [Version number]
- Component: [File path]
- Line: [Line number if known]

## Suggested Fix

[Proposed approach to fix]

## Related Bugs

- [BUG-XXX] - [Related issue]

## Workaround

[If available, describe workaround]

## Resolution

[To be filled when resolved]
- Fixed in: [Commit hash]
- Fixed by: [Person]
- Fixed on: [Date]
```

### Phase 6: Save Bug Report

**Save to appropriate location:**

```bash
# Save bug report
cat > docs/bugs/BUG_XXX.md << 'EOF'
[Bug report content]
EOF
```

### Phase 7: Update Tracking

**Update QUICK_START_NEXT_SESSION.md:**

Add bug to pending issues section:

```markdown
### ⚠️ Pending Critical Issues

1. **BUG-XXX: [Title]**
   - **Problem**: [Brief description]
   - **Impact**: [Impact statement]
   - **Status**: Open
   - **Priority**: [High/Medium/Low]
```

### Phase 8: Optional GitHub Issue

**If requested, create GitHub issue:**

```markdown
## 🐛 Bug Report: [Title]

**Bug ID:** BUG-XXX
**Severity:** [Severity]
**Component:** [Component]
**Version:** [Version]

### Description
[Description]

### Impact
- [Impact point 1]
- [Impact point 2]

### Reproduction Steps
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Expected Behavior
[Expected]

### Current Behavior
[Actual]

### Suggested Fix
[Fix approach]

### Environment
- Version: [Version]
- Component: [File path]

### Labels
`bug`, `[severity]-severity`, `[component]`
```

## Bug Lifecycle Management

### Bug States

```
NEW → CONFIRMED → IN_PROGRESS → RESOLVED → CLOSED
 ↓        ↓           ↓            ↓         ↓
 ↓        ↓           ↓            ↓      ARCHIVED
 ↓        ↓           ↓            ↓
 ↓        ↓           ↓         REOPENED
 ↓        ↓           ↓
 ↓        ↓        BLOCKED
 ↓        ↓
 ↓     DUPLICATE
 ↓
INVALID
```

### Update Bug Status

**When bug is fixed:**

1. Update bug report:
```markdown
## Resolution

**Status**: Resolved
**Fixed in**: [commit hash]
**Fixed by**: [person]
**Fixed on**: [date]
**Verification**: [How fix was verified]
```

2. Update QUICK_START_NEXT_SESSION.md:
   - Move from pending to completed
   - Document resolution

3. Optional: Close GitHub issue

## Bug Query Commands

### List All Bugs

```bash
# List all bug files
ls docs/bugs/BUG_*.md

# Count open bugs
grep -l "Status: Open" docs/bugs/BUG_*.md | wc -l
```

### Find Specific Bug

```bash
# Find bug by ID
cat docs/bugs/BUG_XXX.md

# Search by keyword
grep -r "keyword" docs/bugs/
```

### Filter by Severity

```bash
# Find high severity bugs
grep -l "Severity: High" docs/bugs/BUG_*.md

# Find open high severity bugs
grep -l "Status: Open" docs/bugs/BUG_*.md | xargs grep -l "Severity: High"
```

## Common Use Cases

### Single Bug Discovery
**Trigger**: "Track bug for line numbers not displaying"

**Result**: Bug report created, saved, tracked

### Multiple Bugs
**Trigger**: "Track 3 bugs: API auth fails, reports missing sections, tests timeout"

**Result**: Three separate bug reports created

### Bug Status Check
**Trigger**: "Show all open bugs"

**Result**: List of all open bugs with severity

## Success Criteria

✅ Bug information gathered
✅ Severity classified correctly
✅ Duplicate check performed
✅ Unique bug ID assigned
✅ Bug report created with all details
✅ Saved to docs/bugs/
✅ QUICK_START_NEXT_SESSION.md updated
✅ GitHub issue created (if requested)
✅ User confirmation received
