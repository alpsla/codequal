# Module Resolution in CodeQual Monorepo

## Overview

This document explains how module resolution works in the CodeQual monorepo and provides guidance on how to properly set up imports between packages.

## Problem Description

In a TypeScript monorepo with compiled JavaScript output, Node.js module resolution can sometimes be challenging, especially with subpath imports. The following import pattern can cause issues at runtime:

```typescript
// This pattern can be problematic with compiled code
import { SomeType } from '@codequal/core/types/agent';
import { someFunction } from '@codequal/core/utils';
```

The problem occurs because TypeScript compiles these imports but Node.js's module resolution system doesn't always understand how to resolve these subpaths when running the compiled code.

## Solution: Package Exports

To solve this issue, we've configured explicit package exports in the `package.json` files of our packages. This tells Node.js exactly where to find modules when they're imported using subpaths.

### Core Package Exports Example

```json
{
  "exports": {
    ".": "./dist/index.js",
    "./utils": "./dist/utils/index.js",
    "./types/*": "./dist/types/*.js"
  }
}
```

This configuration explicitly maps import paths to file locations in the package, making it clear to Node.js how to resolve imports.

## Best Practices for Imports

1. **Prefer top-level imports when possible:**

   ```typescript
   // Good - Import from the main package entry point
   import { SomeType, someFunction } from '@codequal/core';
   ```

2. **Use subpath imports only when necessary:**

   ```typescript
   // Only use if not exported from the main entry point
   import { someUtility } from '@codequal/core/utils';
   ```

3. **Ensure proper re-exports in package entry points:**

   Make sure your `index.ts` files re-export all the functionality you want to be available:

   ```typescript
   // core/src/index.ts
   export * from './types/agent';
   export * from './utils';
   ```

## Troubleshooting

If you encounter module resolution errors like:

```
Error: Cannot find module '@codequal/core/utils'
```

Try the following steps:

1. Check if the module exists and is exported correctly
2. Run a clean build: `npm run clean-build`
3. Verify imports using the test script: `node packages/agents/tests/verify-imports.js`
4. Consider updating the package.json exports field if needed

## Further Resources

- [Node.js Package Exports Documentation](https://nodejs.org/api/packages.html#exports)
- [TypeScript Module Resolution](https://www.typescriptlang.org/docs/handbook/module-resolution.html)
