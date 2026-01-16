# Ralph - Autonomous Feature Implementation System

Ralph is an autonomous coding loop that implements features from PRD to production with minimal human intervention.

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     RALPH WORKFLOW                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   /rex "feature"  ──►  Questions  ──►  PRD  ──►  tasks.json     │
│                                                                  │
│         │                                                        │
│         ▼                                                        │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              AUTONOMOUS ITERATION LOOP                   │   │
│   │                                                          │   │
│   │   ┌──────────┐    ┌──────────┐    ┌──────────┐         │   │
│   │   │ Iteration│───►│ Iteration│───►│ Iteration│───► ... │   │
│   │   │    1     │    │    2     │    │    3     │         │   │
│   │   └──────────┘    └──────────┘    └──────────┘         │   │
│   │        │               │               │                │   │
│   │        ▼               ▼               ▼                │   │
│   │   [Fresh Context] [Fresh Context] [Fresh Context]       │   │
│   │                                                          │   │
│   └─────────────────────────────────────────────────────────┘   │
│         │                                                        │
│         ▼                                                        │
│   Feature Complete! (commits on each story)                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Key Concepts

### Fresh Context Per Iteration
Each iteration spawns a **new Claude instance** with no memory of previous iterations. This means:
- Stories must be self-contained
- Progress is tracked in `progress.txt` (learnings persist across iterations)
- Tasks are tracked in `tasks.json` (state persists)

### Story Sizing
Each story must be completable in **one context window** (~10 minutes of AI work).

| Too Big | Split Into |
|---------|------------|
| "Build the dashboard" | Schema, queries, UI, filters |
| "Add authentication" | Schema, middleware, login UI, session |
| "Refactor the API" | One story per endpoint |

### Progress Tracking
- `tasks.json` - Machine-readable task state
- `progress.txt` - Human-readable learnings and errors

## Quick Start

```bash
# One command to rule them all
/rex Add dark mode with theme persistence
```

## Documentation

- [Quick Start Guide](./QUICK_START.md)
- [Commands Reference](./COMMANDS.md)
- [Troubleshooting](./TROUBLESHOOTING.md)
- [Best Practices](./BEST_PRACTICES.md)

## File Locations

```
~/.claude/
├── commands/
│   ├── ralph-execute.md    # /rex command
│   ├── ralph.md            # /ralph command
│   └── prd.md              # /prd command
└── scripts/
    ├── claude-ralph.sh     # Generic loop
    └── codequal-ralph.sh   # CodeQual-specific loop
```
