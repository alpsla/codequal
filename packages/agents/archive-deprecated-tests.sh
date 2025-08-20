#!/bin/bash

# Archive deprecated test files to avoid confusion
# These files are broken or use deprecated V7 code

echo "🗄️ Archiving deprecated test files..."

# Create archive directory
mkdir -p archived/deprecated-tests

# List of deprecated test files to archive
deprecated_tests=(
    "test-v7-html-pr700.ts"
    "test-report-simple-scalability.ts"
    "test-beautiful-report.ts"
    "test-chunk-4-report-generation.ts"
    "test-chunk-5-error-handling.ts"
    "test-performance-summary.ts"
    "test-full-flow-validation.ts"
    "test-full-location-flow.ts"
    "test-json-format-fixes.ts"
)

# Archive each file
for file in "${deprecated_tests[@]}"; do
    if [ -f "$file" ]; then
        echo "  Moving $file to archived/deprecated-tests/"
        mv "$file" archived/deprecated-tests/
    fi
done

# Create a README in the archive
cat > archived/deprecated-tests/README.md << 'EOF'
# Deprecated Test Files

These test files have been archived because they:
- Use deprecated V7 report generator
- Have known bugs that won't be fixed
- Create confusion about which code is working

## DO NOT USE THESE FILES

Instead, use:
- `test-v8-final.ts` - The verified working V8 test
- `src/standard/tests/regression/` - Current regression tests

## Archived on: 2025-08-20
## Reason: Cleanup to maintain only healthy, working code
EOF

echo "✅ Deprecated tests archived successfully"
echo ""
echo "📝 Use test-v8-final.ts as the reference implementation"