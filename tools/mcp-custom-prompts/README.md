# CodeQual Custom MCP Setup

This directory contains the configuration and scripts for using Model Context Protocol (MCP) with the CodeQual project.

## Current Files

- **complete-config.json**: Complete Claude Desktop configuration with all your MCP servers.
- **copy-prompt.sh**: Script to copy a concise prompt to your clipboard for pasting into Claude.
- **prompt.json**: Full version of the prompt (used by copy-prompt.sh).
- **update-config.sh**: Script to update your Claude Desktop configuration.

## Usage

1. **Update Configuration**:
   ```
   ./update-config.sh
   ```
   This will update your Claude Desktop configuration to include all servers except the problematic prompt server.

2. **Start New Chat**:
   ```
   ./copy-prompt.sh
   ```
   This will copy a concise prompt to your clipboard. Paste it at the beginning of a new Claude chat.

3. **End Session with Summary**:
   When you want to end a session and have Claude create a summary, simply tell Claude "let's end here" or "that's all for today" and it will create a session summary in the specified directory.

## Outdated Files

Previous attempts at creating a custom prompt server are stored in the `outdated` directory for reference.
