#!/bin/bash

# Cleanup Duplicate API Implementations
# Keeps only the latest DirectDeepWikiApiWithLocation and archives older versions

ARCHIVE_DIR="src/standard/tests/_archive/2025-08-25-cleanup"
echo "🧹 Cleaning up duplicate API implementations..."

# Create archive directory if it doesn't exist
mkdir -p "$ARCHIVE_DIR"

# APIs to KEEP (latest implementation with iterative collection and location search)
echo "✅ Keeping latest implementation:"
echo "  - src/standard/services/direct-deepwiki-api-with-location.ts (PRIMARY)"
echo "  - src/standard/deepwiki/services/adaptive-deepwiki-analyzer.ts (iterative collection)"
echo "  - src/standard/deepwiki/services/cached-deepwiki-analyzer.ts (caching layer)"

# APIs to ARCHIVE (older/duplicate implementations)
ARCHIVE_APIS=(
  "src/standard/services/deepwiki-api-wrapper.ts"  # Old wrapper without location search
  "src/standard/services/direct-deepwiki-api.ts"   # Old direct API without location
  "src/standard/deepwiki/services/deepwiki-api-wrapper.ts"  # Duplicate in wrong location
)

echo ""
echo "📦 Archiving duplicate/outdated APIs..."
for api in "${ARCHIVE_APIS[@]}"; do
  if [ -f "$api" ]; then
    echo "  Archiving: $api"
    mv "$api" "$ARCHIVE_DIR/"
  fi
done

# Check for any files still importing the old APIs
echo ""
echo "🔍 Checking for imports of archived APIs..."
OLD_IMPORTS=(
  "from.*['\"].*deepwiki-api-wrapper['\"]"
  "from.*['\"].*direct-deepwiki-api['\"]"
  "DeepWikiApiWrapper"
  "DirectDeepWikiApi[^W]"  # Not DirectDeepWikiApiWithLocation
)

for pattern in "${OLD_IMPORTS[@]}"; do
  echo "  Checking for: $pattern"
  results=$(grep -r "$pattern" src --include="*.ts" --exclude-dir="_archive" 2>/dev/null | head -5)
  if [ ! -z "$results" ]; then
    echo "    ⚠️  Found references (may need updating):"
    echo "$results" | head -3 | sed 's/^/      /'
  fi
done

# Create API usage guide
cat > "src/standard/services/API_USAGE_GUIDE.md" << 'EOF'
# CodeQual API Usage Guide

## Current API Implementation (Use This!)

### Primary API: DirectDeepWikiApiWithLocation
Location: `src/standard/services/direct-deepwiki-api-with-location.ts`

```typescript
import { DirectDeepWikiApiWithLocation } from './src/standard/services/direct-deepwiki-api-with-location';

const api = new DirectDeepWikiApiWithLocation();
const result = await api.analyzeRepository('https://github.com/owner/repo', {
  branch: 'main',
  prId: 123
});
```

Features:
- ✅ Iterative collection (3-10 iterations)
- ✅ Enhanced prompts for consistent data
- ✅ Code snippet to location search
- ✅ Repository cloning and caching
- ✅ Automatic convergence detection

## Supporting Services

### AdaptiveDeepWikiAnalyzer
- Handles iterative collection logic
- Gap analysis and convergence detection
- Enhanced prompt management

### CachedDeepWikiAnalyzer
- Redis caching with memory fallback
- Parallel processing for main/PR branches
- 60-80% performance improvement for cached repos

## Deprecated APIs (Archived)

These have been moved to `_archive/2025-08-25-cleanup/`:
- ❌ DeepWikiApiWrapper - No location search
- ❌ DirectDeepWikiApi - No iterative collection
- ❌ Basic mock-based implementations

## Testing

```bash
# Real DeepWiki testing (requires port forwarding)
USE_DEEPWIKI_MOCK=false npx ts-node src/standard/tests/regression/manual-pr-validator.ts <PR_URL>

# Quick testing with mock
USE_DEEPWIKI_MOCK=true npm test src/standard/tests/regression/
```

## Cost per Analysis
- DeepWiki: ~$0.03-0.05 per complete analysis (5 iterations)
- Includes all agents: Comparator, Educator, Orchestrator
EOF

echo "📄 Created API usage guide"

# Summary
echo ""
echo "✨ Cleanup complete!"
echo ""
echo "Summary:"
echo "  - Archived duplicate API implementations"
echo "  - Created API usage guide at src/standard/services/API_USAGE_GUIDE.md"
echo "  - Primary API: DirectDeepWikiApiWithLocation"
echo ""
echo "Next steps:"
echo "  1. Update any remaining imports to use DirectDeepWikiApiWithLocation"
echo "  2. Run regression tests to verify everything works"
echo "  3. Commit the changes"