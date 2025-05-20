#!/bin/bash

# Run ESLint with TypeScript support
echo "Running ESLint..."
npx eslint src/**/*.ts tests/**/*.ts --fix

# Check for type errors
echo "Checking TypeScript types..."
npx tsc --noEmit

echo "Lint check complete."