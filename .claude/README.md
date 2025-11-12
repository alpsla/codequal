# Claude Code Configuration for CodeQual

This directory contains custom configuration for Claude Code CLI when working on the CodeQual project.

## 📁 Directory Structure

```
.claude/
├── README.md                     # This file
├── setup-environment.sh          # Environment setup script
├── claude_code_config.json       # Claude Code configuration
├── claude_desktop_config.json    # Claude Desktop configuration (MCP servers)
├── agents/                       # Custom specialized agents
│   ├── bug-tracker.md
│   ├── build-ci-fixer.md
│   ├── codequal-session-starter.md
│   ├── market-researcher.md           # NEW: Market intelligence agent
│   ├── mcp-tool-scout.md
│   ├── progress-doc-manager.md
│   ├── session-wrapper.md
│   ├── smart-commit-manager.md
│   ├── strategic-business-owner.md    # NEW: CEO/Strategy agent
│   └── test-coverage-generator.md
└── commands/                     # Custom slash commands
    ├── enhanced-dev-cycle.md
    ├── pre-commit-perf-check.md
    ├── primer.md
    ├── priority-check.md
    ├── progress-snapshot.md
    └── quick-marketing.md
```

## 🚀 Quick Start

### 1. Setup Environment

From the project root, run:

```bash
source .claude/setup-environment.sh
```

This will:
- Set `CODEQUAL_ROOT` environment variable
- Check project structure
- Verify services (Redis, build status, dependencies)
- Create helpful aliases

### 2. Use Custom Agents

Claude Code will automatically detect and use agents in `.claude/agents/`. Key agents:

**Session Management:**
- `codequal-session-starter` - Start development sessions (checks Redis, loads context)
- `session-wrapper` - End sessions (fixes issues, commits, updates docs)

**Development:**
- `smart-commit-manager` - Comprehensive git commit management
- `bug-tracker` - Track bugs with proper IDs and state
- `test-coverage-generator` - Generate tests for new code
- `build-ci-fixer` - Fix CI/CD failures

**Documentation:**
- `progress-doc-manager` - Update session summaries and architecture docs

**Strategic & Business:**
- `strategic-business-owner` - CEO-level strategic analysis and business oversight (Opus)
- `market-researcher` - Competitive intelligence and market monitoring (Sonnet)

### 3. Use Custom Slash Commands

Available commands (type `/` in Claude Code to see all):
- `/primer` - ?
- `/enhanced-dev-cycle` - ?
- `/pre-commit-perf-check` - Performance checks before commit
- `/priority-check` - Validate priorities
- `/progress-snapshot` - Create session snapshot
- `/quick-marketing` - Marketing tasks

## 🔧 Configuration Files

### `claude_code_config.json`

Configures Claude Code CLI behavior:
- **Session Management**: Where summaries, plans, and docs are stored
- **MCP Servers**: External tool integrations (ref, semgrep, serena, tavily)

### `claude_desktop_config.json`

MCP server configuration (also used by Claude Desktop if present).

## 🤖 Specialized Agents

### codequal-session-starter (Model: Opus)
**When to use:** At the start of any CodeQual work session

**What it does:**
- Checks latest session plan (NEXT_SESSION_PLAN.md)
- Verifies Redis, build, dependencies
- Shows active bugs
- Provides copy-paste ready commands

**Usage:**
```
"start codequal session"
"setup codequal"
"codequal status"
```

### smart-commit-manager
**When to use:** Ready to commit complex multi-file changes

**What it does:**
- Scans ALL changes (staged, unstaged, untracked)
- Identifies temp files and dead code
- Resolves competing implementations
- Creates atomic commits with detailed messages

**Usage:**
```
"I've finished implementing X, help me commit"
"Create commits for my changes"
```

### bug-tracker
**When to use:** Discovering issues that need formal tracking

**What it does:**
- Creates formatted bug reports with IDs (BUG-XXX)
- Updates production-ready-state-test.ts
- Optionally creates GitHub issues
- Tracks bug lifecycle

**Usage:**
```
"open a bug for X"
"track this issue"
"what bugs are currently open?"
```

### test-coverage-generator
**When to use:** After implementing features or before PRs

**What it does:**
- Generates unit tests, integration tests
- Creates edge case and error scenario tests
- Adds security-focused test cases

**Usage:**
```
"generate tests for the new login function"
"I need tests for the refactored data parser"
```

### build-ci-fixer
**When to use:** CI/CD pipeline failures

**What it does:**
- Fixes build failures
- Resolves ESLint violations
- Fixes failing tests

**Usage:**
```
"fix the build errors"
"the CI is failing, help fix it"
```

### progress-doc-manager
**When to use:** After code commits or at session end

**What it does:**
- Updates session summaries
- Maintains architecture docs
- Updates implementation plans

**Usage:**
```
"update the documentation"
"create today's session summary"
```

### session-wrapper
**When to use:** Ending a development session

**What it does:**
- Wraps up all work
- Fixes remaining issues
- Creates commits
- Updates documentation
- Saves state for next session

**Usage:**
```
"wrap up the session"
"end session"
```

### strategic-business-owner (Model: Opus)
**When to use:** Need strategic business decisions, investor updates, market positioning

**What it does:**
- CEO-level strategic oversight and business analysis
- Analyzes session summaries, planning docs, market research
- Monitors development progress and alpha/beta testing
- Provides investor relations support and metrics tracking
- Compares market position vs competitors
- Coordinates with market-researcher agent for intelligence

**Usage:**
```
"Evaluate our go-to-market strategy"
"Should we pivot based on GitHub Copilot launch?"
"Prepare investor update with current metrics"
"Analyze competitive positioning vs SonarQube"
```

### market-researcher (Model: Sonnet)
**When to use:** Need competitor analysis, market research, pricing intelligence

**What it does:**
- Competitive intelligence and market monitoring
- Tracks competitor pricing, features, and positioning
- Monitors developer sentiment across social media
- Analyzes industry trends and emerging technologies
- Provides weekly competitive briefs and monthly reports

**Usage:**
```
"Research GitHub Copilot's new code quality features"
"What's GitLab's current market share?"
"Track competitor pricing changes"
"Analyze developer sentiment about AI code tools"
```

## 🔍 Path Configuration

All agents now use **relative paths** from the project root instead of hardcoded absolute paths.

**Key directories (relative to project root):**
- `packages/agents` - Main agents code
- `packages/agents/src/standard/docs/session_summary` - Session summaries
- `packages/agents/src/standard/docs/bugs` - Bug tracking
- `packages/agents/src/standard/docs/planning` - Implementation plans

## 🌐 MCP Server Tools

The following MCP servers are configured:

1. **ref** - Reference documentation tool
2. **semgrep** - Security and code analysis
3. **serena** - ? (needs documentation)
4. **tavily** - Web search capabilities

## 📝 Adding New Agents

To create a new agent:

1. Create a markdown file in `.claude/agents/`
2. Use this frontmatter structure:

```markdown
---
name: my-agent
description: When to use this agent...
model: claude-3-5-sonnet  # or opus for complex tasks
---

Agent instructions here...
```

3. Claude Code will automatically detect it

## 📝 Adding New Slash Commands

To create a new slash command:

1. Create a markdown file in `.claude/commands/`
2. Add description in frontmatter
3. Command name = filename (e.g., `my-command.md` → `/my-command`)

## 🔄 Maintenance

### Updating Paths

If project structure changes, update paths in:
- `.claude/agents/codequal-session-starter.md`
- `.claude/agents/progress-doc-manager.md`
- `.claude/agents/session-wrapper.md`
- `.claude/setup-environment.sh`

### Updating Agent Descriptions

Edit the agent markdown files directly. Changes take effect immediately.

## 📚 Additional Resources

- Main project instructions: `/CLAUDE.md`
- V9 Critical Knowledge: `packages/agents/src/two-branch/docs/next/V9_CRITICAL_KNOWLEDGE_BASE.md`
- V9 System Overview: `V9-SYSTEM-OVERVIEW.md`
- V9 Production Architecture: `packages/agents/V9_PRODUCTION_ARCHITECTURE.md`

## 🆘 Troubleshooting

**Agent not found:**
- Check `.claude/agents/` directory
- Verify filename ends with `.md`
- Check frontmatter format

**Paths not working:**
- Run `source .claude/setup-environment.sh`
- Verify `CODEQUAL_ROOT` is set correctly
- Check you're in project root

**Services not starting:**
- Redis: `redis-server --daemonize yes`
- Build: `cd packages/agents && npm run build`
- Dependencies: `cd packages/agents && npm install`

---

_Last updated: 2025-11-04 (Option C: Full System Update)_
