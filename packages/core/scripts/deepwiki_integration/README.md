# DeepWiki Integration

This directory contains scripts for integrating with DeepWiki for repository analysis.

## Current Approach: Native Providers

The current implementation uses DeepWiki's native provider clients directly, without going through OpenRouter. This provides better compatibility with DeepWiki's internal architecture.

See the [native_providers](./native_providers) directory for the current implementation.

## Archived Implementations

Previous attempts to integrate with DeepWiki via OpenRouter have been archived due to persistent issues with API authentication and compatibility with DeepWiki's internal architecture.
