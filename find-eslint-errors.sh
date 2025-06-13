#!/bin/bash

cd /Users/alpinro/Code\ Prjects/codequal/packages/core

echo "=== Checking which files have ESLint errors ==="

# Run ESLint and capture the output with file names
npx eslint src --format unix 2>&1 | grep -E "^[^:]+\.ts:" | cut -d: -f1 | sort | uniq -c | sort -rn | head -20

echo -e "\n=== Top directories with errors ==="
npx eslint src --format unix 2>&1 | grep -E "^[^:]+\.ts:" | cut -d: -f1 | xargs -I {} dirname {} | sort | uniq -c | sort -rn | head -10

echo -e "\n=== Specific deepwiki-tools errors ==="
npx eslint src/services/deepwiki-tools --format stylish 2>&1 | head -50
