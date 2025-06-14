# Fix Circular Dependency Issue

## Problem
The CI is failing with:
```
Cyclic dependency detected:
@codequal/database, @codequal/core
```

## Analysis
- `@codequal/core` already depends on `@codequal/database` (see packages/core/package.json)
- Something in the recent changes is making `@codequal/database` depend on `@codequal/core`

## Solutions

### Option 1: Use Type-Only Imports
If the imports from `@codequal/core` in `@codequal/database` are only for types, change them to type-only imports:

```typescript
// Instead of:
import { SomeType } from '@codequal/core';

// Use:
import type { SomeType } from '@codequal/core';
```

### Option 2: Move Shared Types to a Common Package
Create a new package `@codequal/shared-types` that both packages can depend on:

1. Create `packages/shared-types/package.json`
2. Move shared interfaces/types there
3. Update both packages to import from `@codequal/shared-types`

### Option 3: Refactor Service Location
If services are being imported across packages, consider:
- Moving shared services to a neutral package
- Using dependency injection instead of direct imports
- Creating interfaces in the dependent package

## Quick Fix for CI
To identify the exact issue:

1. Run locally:
```bash
npm run build
```

2. Check for new imports in database package:
```bash
grep -r "from '@codequal/core" packages/database/src/
```

3. Check recent changes that might have added imports:
```bash
git diff main -- packages/database/src/
```

## Recommended Immediate Action
Without seeing the exact files, the most likely cause is new DeepWiki tool imports. If DeepWiki tools in the database package are importing from core, either:
1. Move the DeepWiki tools to the core package
2. Use type-only imports if only types are needed
3. Create interfaces instead of importing concrete implementations
