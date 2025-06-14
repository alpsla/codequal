# Circular Dependency Fix Guide

## Problem Summary
The CI is failing with a circular dependency between `@codequal/core` and `@codequal/database`.

## Root Cause Analysis
Since `@codequal/core` already depends on `@codequal/database`, the issue must be that something new in `@codequal/database` is trying to import from `@codequal/core`.

## Most Likely Scenarios

### 1. DeepWiki Tools Importing Core Types
If new DeepWiki tools were added to the database package that import types or services from core:

**Fix**: Move the DeepWiki tools to the appropriate package:
- If they belong in `@codequal/mcp-hybrid`, move them there
- If they belong in `@codequal/core`, keep them there
- If they need to be in database, use type-only imports

### 2. Type-Only Import Solution
If the imports are only for TypeScript types, convert to type-only imports:

```typescript
// In packages/database/src/services/deepwiki/some-tool.ts
// Instead of:
import { ToolResult, AgentRole } from '@codequal/core';

// Use:
import type { ToolResult, AgentRole } from '@codequal/core';
```

### 3. Interface Extraction Pattern
If you need to share interfaces between packages without creating dependencies:

```typescript
// In packages/database/src/types/interfaces.ts
// Define the interface locally instead of importing
export interface ToolResult {
  success: boolean;
  data: any;
  error?: string;
}

// Then use the local interface
import { ToolResult } from '../types/interfaces';
```

## Quick Fix Steps

1. **Run the diagnosis script**:
   ```bash
   chmod +x diagnose-circular-dep.sh
   ./diagnose-circular-dep.sh
   ```

2. **If DeepWiki tools are in the wrong package**, move them:
   ```bash
   # Example: moving from database to mcp-hybrid
   mv packages/database/src/services/deepwiki/*.ts packages/mcp-hybrid/src/adapters/deepwiki/
   ```

3. **Update imports** in the moved files to use the correct paths

4. **Clean and rebuild**:
   ```bash
   npm run clean
   npm install
   npm run build
   ```

## Prevention for Future

1. **Package Dependency Rules**:
   - `@codequal/database` → should not import from any other @codequal packages
   - `@codequal/core` → can import from `@codequal/database`
   - `@codequal/mcp-hybrid` → can import from both `@codequal/core` and `@codequal/database`
   - `@codequal/agents` → can import from all other packages

2. **Use Type-Only Imports** when sharing types across packages

3. **Consider a Shared Types Package** if you have many shared interfaces

## Verification
After fixing, verify with:
```bash
npm ls | grep -B5 -A5 circular
```

This should show no circular dependencies.
