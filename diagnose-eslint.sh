#!/bin/bash

cd /Users/alpinro/Code\ Prjects/codequal/packages/core

echo "=== Running ESLint to see specific errors ==="
npm run lint -- --format compact 2>&1 | grep "deepwiki-tools" | head -20

echo -e "\n=== Let's check the actual ESLint errors ==="
npx eslint src/services/deepwiki-tools --no-error-on-unmatched-pattern 2>&1 | head -100

echo -e "\n=== Files in deepwiki-tools ==="
find src/services/deepwiki-tools -name "*.ts" -type f | while read file; do
    echo -e "\n--- $file ---"
    head -n 3 "$file"
done
