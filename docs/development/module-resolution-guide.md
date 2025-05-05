# Module Resolution in TypeScript Monorepos

## Overview

This guide addresses common module resolution issues in TypeScript monorepos like CodeQual. It covers both development-time (TypeScript) and runtime (Node.js) module resolution and provides solutions to common problems.

## Common Issues

### 1. TypeScript Cannot Find Module Error

```
error TS2307: Cannot find module '@codequal/core' or its corresponding type declarations.
```

This error occurs when TypeScript cannot resolve a module during compilation. This is often due to:
- Missing path mappings in tsconfig.json
- Incorrect project references
- Missing type declarations

### 2. Runtime Module Not Found Error

```
Error: Cannot find module '@codequal/core/utils'
```

This error occurs when Node.js cannot resolve a module at runtime. This is often due to:
- Incorrect exports configuration in package.json
- Missing or incomplete build output
- Inconsistent module systems (ESM vs CommonJS)

## Solutions

### TypeScript Module Resolution

#### 1. Path Mappings in tsconfig.json

Ensure your tsconfig.json has proper path mappings for both top-level and subpath imports:

```json
"paths": {
  "@codequal/core": ["../core/src"],
  "@codequal/core/*": ["../core/src/*"]
}
```

The first mapping handles imports like `import { X } from '@codequal/core'` while the second handles imports like `import { Y } from '@codequal/core/utils'`.

#### 2. Project References

Use TypeScript project references to establish build dependencies:

```json
"references": [
  { "path": "../core" }
]
```

This tells TypeScript that this package depends on the core package, so core should be built first.

#### 3. Composite Projects

Enable composite projects for better build management:

```json
"compilerOptions": {
  "composite": true,
  "declaration": true
}
```

This generates declaration files that other packages can reference.

### Node.js Module Resolution

#### 1. Package Exports Configuration

Use the exports field in package.json to define how Node.js should resolve imports:

```json
"exports": {
  ".": "./dist/index.js",
  "./utils": "./dist/utils/index.js",
  "./types/*": "./dist/types/*.js"
}
```

This maps import paths directly to file locations:
- `import X from '@codequal/core'` -> ./dist/index.js
- `import Y from '@codequal/core/utils'` -> ./dist/utils/index.js
- `import Z from '@codequal/core/types/agent'` -> ./dist/types/agent.js

#### 2. Module Type Consistency

Ensure all packages use the same module system:

```json
"type": "commonjs"
```

Options are "commonjs" (default) or "module" (ESM).

#### 3. Main and Types Fields

Correctly configure the main entry point and types declaration:

```json
"main": "dist/index.js",
"types": "dist/index.d.ts",
```

## Best Practices

### 1. Import Pattern Standardization

Prefer top-level imports when possible:

```typescript
// Good
import { SomeType, someFunction } from '@codequal/core';

// Avoid unless necessary
import { someFunction } from '@codequal/core/utils';
```

### 2. Proper Re-exports

Make sure your package entry points (index.ts) re-export everything that should be publicly available:

```typescript
// core/src/index.ts
export * from './types/agent';
export * from './config/agent-registry';
export * from './utils';
```

### 3. Build Order Awareness

Build packages in dependency order:
1. Core package first
2. Dependent packages next
3. Apps last

### 4. Clean Builds for Major Changes

When encountering module resolution issues, start with a clean build:

```bash
# Clean build directories
rm -rf packages/*/dist

# Rebuild in correct order
cd packages/core && npm run build && cd ../..
cd packages/database && npm run build && cd ../..
# etc.
```

## Troubleshooting Steps

If you encounter module resolution issues:

1. **Check TypeScript Configuration**
   - Verify path mappings in tsconfig.json
   - Check project references
   - Ensure composite project settings

2. **Check Package.json Configuration**
   - Verify exports configuration
   - Check main and types fields
   - Ensure module type consistency

3. **Check Build Output**
   - Verify declaration files (.d.ts) are generated
   - Check that JavaScript output matches expected structure
   - Look for any build errors

4. **Try a Clean Build**
   - Remove all dist directories
   - Build packages in dependency order
   - Check for errors at each step

5. **Verify Runtime Imports**
   - Create a simple test script to verify imports
   - Check for runtime errors
   - Trace the module resolution path

## Tools and Scripts

### Fix Build Script

```bash
#!/bin/bash
# Clean build directories
rm -rf packages/core/dist
rm -rf packages/database/dist

# Build core package first
cd packages/core
npm run build
cd ../..

# Build database package next
cd packages/database
npm run build
cd ../..
```

### Import Verification Script

```javascript
// Test for top-level package imports
console.log('Testing top-level imports...');
try {
  // Test core top-level import
  const core = require('@codequal/core');
  console.log('✅ Core top-level import succeeded');
  
  // Test utils import from core
  const utils = require('@codequal/core/utils');
  console.log('✅ Utils import succeeded');
} catch (error) {
  console.error('❌ Import test failed:', error);
  process.exit(1);
}
```

## Further Resources

- [TypeScript Module Resolution](https://www.typescriptlang.org/docs/handbook/module-resolution.html)
- [Node.js Package Exports](https://nodejs.org/api/packages.html#exports)
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [Package.json Specifications](https://docs.npmjs.com/cli/v9/configuring-npm/package-json)
