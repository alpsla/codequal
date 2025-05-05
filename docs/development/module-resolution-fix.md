# Module Resolution Fix for CodeQual

## Issue Description

We encountered module resolution issues in the CodeQual monorepo when trying to run tests:

```
❌ Failed to load agent implementations: Error: Cannot find module '@codequal/core/utils'
Require stack:
- /Users/alpinro/Code Prjects/codequal/packages/agents/dist/base/base-agent.js
- /Users/alpinro/Code Prjects/codequal/packages/agents/dist/claude/claude-agent.js
- /Users/alpinro/Code Prjects/codequal/packages/agents/tests/real-agent-test.js
```

Additional TypeScript build errors occurred in the database package:

```
src/models/pr-review.ts:3:42 - error TS6305: Output file '/Users/alpinro/Code Prjects/codequal/packages/core/dist/config/agent-registry.d.ts' has not been built from source file '/Users/alpinro/Code Prjects/codequal/packages/core/src/config/agent-registry.ts'.
```

## Root Cause Analysis

The issues were caused by:

1. **Node.js module resolution limitations**: When TypeScript compiles to JavaScript, the Node.js module system doesn't automatically handle subpath imports like `@codequal/core/utils` unless explicitly configured.

2. **Build order dependencies**: The packages need to be built in the correct order (core → database → agents → others) to ensure all the TypeScript declaration files are properly generated.

3. **Inconsistent import patterns**: Some files were using subpath imports that bypassed the main package entry points.

## Solution Implemented

1. **Package Exports Configuration**:
   - Added `exports` field to package.json files to map subpaths to specific file locations
   - Example:
     ```json
     "exports": {
       ".": "./dist/index.js",
       "./utils": "./dist/utils/index.js",
       "./types/*": "./dist/types/*.js"
     }
     ```

2. **TypeScript Path Mappings**:
   - Updated tsconfig.json files to include mappings for both package-level and subpath imports
   - Added mappings for the main package entry point:
     ```json
     "paths": {
       "@codequal/core": ["../core/src"],
       "@codequal/core/*": ["../core/src/*"]
     }
     ```
   - Applied these changes to all packages and the root tsconfig.json

3. **Updated Import Patterns**:
   - Modified imports to use the main package entry point where possible
   - Changed:
     ```typescript
     import { AgentProvider, AgentRole } from '@codequal/core/config/agent-registry';
     import { AnalysisResult } from '@codequal/core/types/agent';
     ```
   - To:
     ```typescript
     import { AgentProvider, AgentRole, AnalysisResult } from '@codequal/core';
     ```

4. **Type Declarations**:
   - Ensured all types are correctly exported from the main index.ts files
   - Added proper re-exports to make types available through the main package entry point

5. **Build Process Improvements**:
   - Created a clean-build script that ensures packages are built in the correct order
   - Added verification tools to test module resolution

6. **Module Type Consistency**:
   - Added explicit `"type": "commonjs"` to package.json files for consistency
   - Ensured all packages use the same module system

## Best Practices for Future Development

1. **Prefer top-level imports**:
   ```typescript
   // Good
   import { SomeType, someFunction } from '@codequal/core';
   
   // Avoid unless necessary
   import { someFunction } from '@codequal/core/utils';
   ```

2. **Follow proper build order**:
   - Always build the packages in dependency order (core → database → agents → others)
   - Use `fix-and-test.sh` when major changes are made to multiple packages

3. **Keep exports updated**:
   - When adding new subdirectories or modules to a package, update its exports configuration
   - Make sure all public APIs are exposed through the main entry point

4. **Clean builds for major changes**:
   - When encountering module resolution issues, start with a clean build
   - Run `npm run build` after making changes to package.json exports
