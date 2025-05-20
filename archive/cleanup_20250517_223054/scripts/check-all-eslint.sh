#!/bin/bash

# Navigate to the agents package
cd "$(dirname "$0")"

# Print current directory for debugging
echo "Running in directory: $(pwd)"

# Count TypeScript files
echo "Counting TypeScript files in the project..."
TS_FILES=$(find src -name "*.ts" | wc -l)
echo "Found $TS_FILES TypeScript files to check."

# Run ESLint on all TypeScript files
echo ""
echo "Running ESLint on all TypeScript files (warnings only, no errors)..."
npx eslint --max-warnings 0 "src/**/*.ts" --quiet

ESLINT_RESULT=$?
if [ $ESLINT_RESULT -eq 0 ]; then
  echo "✅ ESLint check passed with no errors!"
else
  echo ""
  echo "❌ ESLint check found errors."
  echo ""
  echo "Details of all ESLint errors:"
  npx eslint "src/**/*.ts" --format stylish
  
  echo ""
  echo "Running with auto-fix to resolve fixable issues..."
  npx eslint "src/**/*.ts" --fix
  
  echo ""
  echo "Re-running ESLint to check if issues were fixed..."
  npx eslint "src/**/*.ts" --format stylish
fi

echo ""
echo "------------------------------"
echo "ESLint check summary by file:"
echo "------------------------------"
find src -name "*.ts" | sort | while read file; do
  ISSUES=$(npx eslint "$file" --format json | grep -o '"errorCount":[0-9]*,"warningCount":[0-9]*' | head -1)
  if [ -n "$ISSUES" ]; then
    ERROR_COUNT=$(echo $ISSUES | grep -o '"errorCount":[0-9]*' | grep -o '[0-9]*')
    WARNING_COUNT=$(echo $ISSUES | grep -o '"warningCount":[0-9]*' | grep -o '[0-9]*')
    if [ "$ERROR_COUNT" -gt 0 ] || [ "$WARNING_COUNT" -gt 0 ]; then
      echo "$(basename $file): Errors: $ERROR_COUNT, Warnings: $WARNING_COUNT"
    else
      echo "$(basename $file): ✅ No issues"
    fi
  else
    echo "$(basename $file): ✅ No issues"
  fi
done

echo ""
echo "ESLint check completed."
