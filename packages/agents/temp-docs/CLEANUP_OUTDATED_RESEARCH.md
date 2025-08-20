# Cleanup List: Outdated Research Implementations

## ❌ Files to Remove/Archive

### In `/packages/agents/src/researcher/`:

#### Disabled/Outdated Files:
- `comprehensive-researcher-service.ts.disabled` - Old implementation
- `enhanced-production-researcher-service.ts.disabled` - Old implementation  
- `enhanced-scheduled-research-runner.ts.disabled` - Old implementation

#### Outdated Research Implementations:
- `enhanced-web-search.ts` - Replaced by web-search-researcher.ts
- `fixed-characteristic-selection.ts` - Old hardcoded approach
- `pure-prompt-discovery.ts` - Old implementation
- `real-web-search.ts` - Has HARDCODED models (GPT-5, Opus 4, etc.)
- `speed-optimized-prompt.ts` - Old approach
- `truly-dynamic-selector.ts` - Replaced by dynamic-model-selector-v8.ts
- `openrouter-model-matcher.ts` - Old implementation
- `location-finder-researcher.ts` - Contains hardcoded models
- `enhanced-model-selection-rules.ts` - Duplicate (one in main, one in archive)

#### Archive Directory (already archived, can be deleted):
- `_archive_2025_01/*` - All files already archived

#### Final Directory (outdated):
- `final/` - Old comparison results from June 2025

### Test/Demo Files to Remove:
- `run-embedding-research.ts` - Test file
- `run-location-finder-research.ts` - Test file  
- `update-researcher-roles.ts` - Migration script

## ✅ Files to KEEP (Current Implementation)

### Core Files:
- `researcher-agent.ts` - Main researcher agent (NOW UPDATED)
- `researcher-service.ts` - Main researcher service
- `research-prompts.ts` - Research prompt templates
- `web-search-researcher.ts` - Current web search implementation (but needs update to remove hardcoded patterns)
- `load-researcher-config.ts` - Configuration loader
- `service-factory.ts` - Service factory
- `educational-service.ts` - Educational service
- `reporting-service.ts` - Reporting service

### Generated Files:
- `researcher-agent.d.ts` - TypeScript definitions
- `researcher-agent.js` - Compiled JavaScript

### In `/packages/agents/src/standard/services/`:
- `model-researcher-service.ts` - MAIN implementation (KEEP - this is the correct one)

## 🔧 Files That Need Updates

### Remove Hardcoded Models From:
1. `web-search-researcher.ts` - Remove hardcoded model patterns
2. Any remaining files with hardcoded model names

## 📝 Summary

**Total files to remove/archive**: ~15 files
**Files to keep**: ~10 files
**Files needing updates**: 1-2 files

The main implementation should be:
- `/packages/agents/src/standard/services/model-researcher-service.ts` - The correct flow with Web Search → OpenRouter

All other "researcher" implementations for model selection should be removed to avoid confusion.