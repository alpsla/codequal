# Gemini Workflows for CodeQual

This directory contains Gemini-compatible workflows that mirror the functionality of Claude agents in `.claude/agents/`.

## Available Workflows

### 1. Business Owner Analysis (`business-owner-analysis.md`)
**Purpose**: Strategic business analysis with CEO-level oversight

**Trigger**: "Run business owner analysis" or "BO analysis"

**Use Cases**:
- Weekly status reviews
- Feature prioritization decisions
- Launch go/no-go decisions
- Competitive analysis
- Strategic planning

**Output**: Saves to `/docs/business-intelligence/[subdirectory]/`

---

### 2. Market Researcher (`market-researcher.md`)
**Purpose**: Competitive intelligence and market monitoring

**Trigger**: "Run market researcher" or "MR analysis"

**Use Cases**:
- Competitive pricing analysis
- Developer sentiment tracking
- Industry trend analysis
- Market opportunity identification
- Competitor feature comparison

**Output**: Saves to `/docs/market-research/[subdirectory]/`

---

### 3. Session Starter (`session-starter.md`)
**Purpose**: Quick session preparation and environment setup

**Trigger**: "Start session" or "Session startup"

**Use Cases**:
- Beginning every development session
- Environment verification
- Loading session context
- Identifying pending tasks

**Output**: Console output with status and quick commands

---

## How to Use Workflows

### Method 1: Direct Trigger (Recommended)

Simply say the trigger phrase:

```
"Run business owner analysis"
```

The AI will:
1. Read the workflow file
2. Execute each phase sequentially
3. Generate the appropriate output
4. Save to the correct location

### Method 2: Specific Request

Provide context with your request:

```
"Run business owner analysis for weekly status report"
```

```
"Run market researcher to analyze GitHub Copilot pricing"
```

```
"Start session"
```

### Method 3: Workflow Orchestration

Workflows can trigger each other:

```
Business Owner Analysis
  ↓ (if market intel needed)
Market Researcher
  ↓ (returns intelligence)
Business Owner Analysis
  ↓ (synthesizes final report)
```

## Workflow Structure

Each workflow follows this pattern:

```markdown
---
description: [Short description]
---

# [Workflow Name]

**Purpose**: [What it does]
**When to use**: [Use cases]
**Trigger**: [Trigger phrases]

## Workflow Steps

### Phase 1: [Phase Name]
[Steps to execute]

### Phase 2: [Phase Name]
[Steps to execute]

...

## Output Format
[Expected output structure]

## Success Criteria
[Checklist of completion criteria]
```

## Comparison with Claude Agents

| Feature | Claude Agents | Gemini Workflows |
|---------|---------------|------------------|
| **Invocation** | Automatic via agent system | Manual trigger phrase |
| **Execution** | Autonomous | Step-by-step guided |
| **Orchestration** | Automatic | Manual coordination |
| **Output** | Automatic saving | Guided saving |
| **Context** | Auto-loaded | Explicitly loaded |

## Creating New Workflows

To create a new workflow:

1. **Create file**: `.gemini/workflows/[workflow-name].md`

2. **Follow template**:
```markdown
---
description: [Short description]
---

# [Workflow Name]

**Purpose**: [What it does]
**When to use**: [Use cases]
**Trigger**: [Trigger phrase]

## Workflow Steps
[Detailed steps]

## Success Criteria
[Completion checklist]
```

3. **Update this README**: Add to "Available Workflows" section

4. **Update AI_ASSISTANT_GUIDE.md**: Add to workflow list

## Best Practices

### 1. Be Explicit
Instead of "run the business owner agent", say:
```
"Run business owner analysis for feature prioritization"
```

### 2. Provide Context
Give the AI context about what you need:
```
"Run market researcher to analyze SonarQube's latest pricing changes"
```

### 3. Verify Completion
Check that all success criteria are met:
```
✅ All required documents read
✅ Analysis generated
✅ Report saved
✅ Recommendations provided
```

### 4. Chain Workflows
Use workflows in sequence:
```
1. "Start session" (session-starter)
2. [Do development work]
3. "Run business owner analysis" (weekly review)
```

## Workflow Dependencies

```
session-starter.md
  ↓ (reads)
QUICK_START_NEXT_SESSION.md
  ↑ (writes)
session-wrapper.md (future)

business-owner-analysis.md
  ↓ (may trigger)
market-researcher.md
  ↓ (returns intel to)
business-owner-analysis.md
```

## Future Workflows

Planned workflows to add:

- `session-wrapper.md` - End-of-session cleanup and documentation
- `smart-commit-manager.md` - Intelligent commit creation
- `bug-tracker.md` - Bug documentation and tracking
- `test-coverage-generator.md` - Test generation
- `build-ci-fixer.md` - CI/CD issue resolution

## Integration with Claude Agents

These workflows are designed to work alongside Claude agents:

- **In VS Code with Claude**: Use `.claude/agents/` (automatic)
- **In Antigravity with Gemini**: Use `.gemini/workflows/` (manual trigger)
- **Both systems**: Share same documentation and output locations

## Support

For issues or questions about workflows:
1. Check the workflow file for detailed steps
2. Review `AI_ASSISTANT_GUIDE.md` for general guidance
3. Compare with Claude agent file in `.claude/agents/` for reference

---

**Last Updated**: 2025-11-19
**Maintained By**: CodeQual Development Team
