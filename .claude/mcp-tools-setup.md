# MCP Tools Setup Guide

This guide will help you set up REF, Semgrep, and EXA Search MCP tools for your CodeQual project.

## Quick Start

We've successfully configured REF and Semgrep MCP tools for your CodeQual project.

### Current Setup (Completed)

1. **Installed Tools:**
   - ✅ REF MCP Server (via npx)
   - ✅ Semgrep CLI (via pipx)
   - ✅ Semgrep MCP Server (via npx)

2. **API Keys Configured:**
   - ✅ REF_API_KEY: `ref-498218bce18e561f5cd0`
   - ✅ SEMGREP_APP_TOKEN: `ffb5ee37b5843c7e7eb12fbf04ff77450209db675eb1e4d2aa48998e1c67c88a`

3. **Quick Setup Script:**
   ```bash
   ./.claude/quick-setup.sh
   ```
   This script tests the installations and deploys configurations automatically.

4. **Configuration Files:**
   - `.claude/claude_desktop_config.json` - Deployed to Claude Desktop
   - `.claude/claude_code_config.json` - Ready for Code Claude

### Available MCP Servers

1. **REF** - Documentation search
   - `ref_search_documentation` - Search technical documentation
   - `ref_read_url` - Read documentation pages

2. **Semgrep** - Security scanning  
   - Automatic security vulnerability detection
   - Code quality analysis

3. **Serena** - Code navigation (existing)
   - File navigation and editing capabilities

### Next Steps

Restart Claude Desktop to load the new MCP servers. The configuration has been automatically deployed.

## Prerequisites

1. **Node.js** - Required for REF and EXA (you already have this)
2. **Python 3.8+** - Required for Semgrep
3. **API Keys** - You'll need to obtain API keys for each service

## 1. REF Setup

### Step 1: Get REF API Key
1. Visit https://ref.tools
2. Sign up for an account
3. Navigate to API Keys section
4. Generate a new API key

### Step 2: Install REF MCP Server
```bash
npm install -g @ref.tools/ref-mcp-server
```

### Step 3: Test REF Installation
```bash
npx @ref.tools/ref-mcp-server --version
```

## 2. Semgrep Setup

### Step 1: Create Semgrep Account
1. Visit https://semgrep.dev
2. Sign up for a free account
3. Go to Settings → Tokens
4. Create a new API token with "CI" scope

### Step 2: Install Semgrep
```bash
# Install Python package manager if needed
brew install python3

# Install semgrep
pip3 install semgrep

# Install semgrep MCP server
pip3 install semgrep-mcp
```

### Step 3: Test Semgrep Installation
```bash
semgrep --version
uvx semgrep-mcp --help
```

## 3. EXA Search Setup

### Step 1: Get EXA API Key
1. Visit https://exa.ai
2. Sign up for an account
3. Go to Dashboard → API Keys
4. Create a new API key

### Step 2: Install EXA MCP Server
```bash
npm install -g exa-mcp-server
```

### Step 3: Test EXA Installation
```bash
npx exa-mcp-server --version
```

## 4. Configure MCP Settings

Create or update your Claude configuration files:

### For Claude Desktop App
Location: `~/Library/Application Support/Claude/claude_desktop_config.json`

### For Code Claude
Location: `~/.vscode/extensions/codeclaudeapp.claude-code-*/claude_code_config.json`

## 5. Environment Variables

Add these to your shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
# REF API Key
export REF_API_KEY="your_ref_api_key_here"

# Semgrep API Token
export SEMGREP_APP_TOKEN="your_semgrep_token_here"

# EXA API Key
export EXA_API_KEY="your_exa_api_key_here"
```

Then reload your shell:
```bash
source ~/.zshrc  # or source ~/.bashrc
```

## 6. Verify Setup

After configuration, restart Claude Desktop and/or VS Code to load the new MCP servers.

You can verify they're working by asking Claude:
- "Can you search documentation for Express.js middleware?" (tests REF)
- "Can you scan this file for security issues?" (tests Semgrep)
- "Can you search for recent articles about code analysis tools?" (tests EXA)

## Troubleshooting

### REF Issues
- Ensure Node.js version is 16 or higher
- Check REF_API_KEY is set correctly
- Try running `npx @ref.tools/ref-mcp-server` directly to see errors

### Semgrep Issues
- Ensure Python 3.8+ is installed
- Check SEMGREP_APP_TOKEN is valid
- Run `semgrep --config=auto .` to test local scanning

### EXA Issues
- Verify EXA_API_KEY is set
- Check network connectivity
- Try a simple search: `curl -H "X-API-Key: $EXA_API_KEY" https://api.exa.ai/search?q=test`

## Next Steps

1. Set up API keys from each service
2. Install the MCP servers
3. Configure your Claude apps
4. Test each integration

Let me know when you have the API keys, and I'll help you create the configuration files!