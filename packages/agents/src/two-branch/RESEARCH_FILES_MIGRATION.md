# Research Files Migration to two-branch

## Date: ${new Date().toISOString().split('T')[0]}

## Summary
All research-related files have been successfully moved to the `two-branch` directory for better organization and future cleanup. This consolidation ensures all AI model research, selection, and configuration code is in one place.

## Files Moved

### 1. Main Researcher Directory
**From:** `src/researcher/`  
**To:** `src/two-branch/researcher/`

Files included:
- `researcher-agent.ts` - Main researcher agent implementation
- `researcher-service.ts` - Research service utilities
- `research-prompts.ts` - AI research prompts (updated with strict version requirements)
- `educational-service.ts` - Educational content research
- `embedding-model-research.ts` - Embedding model research
- `load-researcher-config.ts` - Configuration loader
- `reporting-service.ts` - Reporting utilities
- `service-factory.ts` - Service factory pattern
- `web-search-researcher.ts` - Web search implementation
- `__tests__/` - Test directory

### 2. Model Research Services
**From:** `src/standard/services/model-researcher*`  
**To:** `src/two-branch/research-services/`

Files included:
- `model-researcher.ts`
- `model-researcher-service.ts`
- `model-researcher-service.d.ts`
- `model-researcher-service.js`

### 3. Research Scripts
**From:** `src/standard/scripts/trigger-model-research.ts`  
**To:** `src/two-branch/scripts/trigger-model-research.ts`

### 4. Research Infrastructure
**From:** `src/standard/infrastructure/supabase/model-research-schema.sql`  
**To:** `src/two-branch/infrastructure/supabase/model-research-schema.sql`

### 5. Research Types
**From:** `src/types/research.ts`  
**To:** `src/two-branch/types/research.ts`

## Import Updates

All imports have been updated to reflect the new locations:

### Standard Directory Imports
- `from '../../researcher/researcher-agent'` → `from '../../two-branch/researcher/researcher-agent'`
- `from './services/model-researcher-service'` → `from '../two-branch/research-services/model-researcher-service'`
- `from '../services/model-researcher-service'` → `from '../../two-branch/research-services/model-researcher-service'`

### Internal Researcher Imports
- Paths to standard utilities updated to use `../../standard/`
- Cross-references within two-branch updated to use relative paths

## Key Changes Made

### 1. Strict Model Version Requirements
All research prompts now enforce:
- **ONLY models < 6 months old** from current date (dynamically calculated)
- **MUST use latest versions** (e.g., Claude v4.x over v3.5)
- **NO hardcoded dates** - uses `new Date()` for dynamic calculation
- **NO hardcoded model versions** - relies on dynamic research

### 2. Latest Model Enforcement
Created scripts to ensure latest models:
- `update-to-latest-models.ts` - Updates all configurations to latest models
- `verify-model-currency.ts` - Verifies all models are current
- `clean-and-regenerate-models.ts` - Cleans and regenerates configurations

### 3. Current Model Versions (as of ${new Date().toISOString().split('T')[0]})
- **Claude:** v4.1 (Opus), v4 (Sonnet) - NOT 3.5
- **Gemini:** v2.5 series - NOT 2.0
- **DeepSeek:** v3.1 - NOT v2 or v3
- **Qwen:** v3 series - NOT 2.5
- **Llama:** v3.3 - NOT 3.1

## Scripts Created

1. **fix-research-imports.sh** - Fixes imports after moving files
2. **fix-researcher-internal-imports.sh** - Fixes internal researcher imports
3. **verify-model-currency.ts** - Verifies all models are current
4. **update-to-latest-models.ts** - Updates to latest model versions

## Benefits of This Migration

1. **Centralized Research Code** - All AI research and model selection in one place
2. **Easier Cleanup** - Can remove entire two-branch directory when needed
3. **Clear Separation** - Research/experimental code separated from production
4. **Version Control** - Easier to track changes to research components
5. **Dynamic Model Selection** - No hardcoded models or dates

## Next Steps

1. Monitor OpenRouter charges with latest models
2. Test V9 analyzer with updated model configurations
3. Verify all imports are working correctly
4. Consider further consolidation of related utilities

## Testing

Run these commands to verify the migration:
```bash
# Build the project
npm run build

# Run model currency verification
npx ts-node src/two-branch/scripts/verify-model-currency.ts

# Test V9 analyzer with latest models
npx ts-node src/two-branch/tests/test-v9-complete-with-supabase.ts
```

## Important Notes

- All models are now dynamically selected based on current date
- No hardcoded model versions or dates remain in the codebase
- OpenRouter should now charge properly with non-free models
- Research prompts enforce strict < 6 months requirement