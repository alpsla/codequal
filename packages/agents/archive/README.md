# Archived Components

This directory contains components that were previously part of the CodeQual project but have been removed from the active codebase.

## PR Agent

The PR Agent integration was removed because we decided to use direct model integrations (Claude, DeepSeek, etc.) instead of using PR Agent as a mediator.

The files are kept here for reference in case we want to revisit this approach in the future.

## Date Archived

April 28, 2025

## MCP Agent

The MCP Agent (`mcp-agent.ts`) was a mock/placeholder implementation that has been superseded by the proper MCP Hybrid implementation in `/packages/mcp-hybrid/`. This file contained:
- Mock MCP SDK calls
- Placeholder response formatting
- Basic type definitions

The new MCP Hybrid implementation provides:
- Real tool integration framework
- Proper agent enhancement without modification
- Integration with the orchestrator flow
- Support for multiple tool adapters

## Date Archived

June 9, 2025
