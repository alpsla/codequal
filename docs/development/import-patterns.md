# Import Patterns in CodeQual

## Overview

This document outlines the recommended import patterns for the CodeQual monorepo. Following consistent import patterns helps maintain code clarity and prevents module resolution issues.

## Recommended Import Patterns

### 1. Top-Level Package Imports

For types and utilities exported from the main package entry point:

```typescript
// Recommended
import { AgentProvider, AgentRole, AnalysisResult } from '@codequal/core';
```

Use this pattern whenever possible, as it's the most maintainable and least likely to cause issues.

### 2. Subpath Imports

For specific modules not exported from the main entry point:

```typescript
// Use when necessary
import { createLogger } from '@codequal/core/utils';
import { Agent } from '@codequal/core/types/agent';
```

Only use subpath imports when the specific item you need isn't exported from the main package entry point.

### 3. Relative Imports

For imports within the same package:

```typescript
// For imports within the same package
import { formatResult } from '../utils/formatter';
import { ConfigOptions } from './types';
```

Use relative imports for modules within the same package to maintain clear boundaries between packages.

## Export Patterns

### 1. Re-export from Package Entry Point

Make key types and utilities available from the main entry point:

```typescript
// packages/core/src/index.ts
export * from './types/agent';
export * from './config/agent-registry';
export * from './utils';
```

This allows consumers to use top-level imports for commonly used items.

### 2. Subpath Exports

Configure package.json to allow direct access to specific subpaths:

```json
"exports": {
  ".": "./dist/index.js",
  "./utils": "./dist/utils/index.js",
  "./types/*": "./dist/types/*.js"
}
```

This is necessary to support subpath imports at runtime.

## Import Resolution

### During Development (TypeScript)

TypeScript uses the path mappings in tsconfig.json to resolve imports:

```json
"paths": {
  "@codequal/core": ["../core/src"],
  "@codequal/core/*": ["../core/src/*"]
}
```

TypeScript will look in these locations during compilation.

### At Runtime (Node.js)

Node.js uses the package.json exports field to resolve imports:

```json
"exports": {
  ".": "./dist/index.js",
  "./utils": "./dist/utils/index.js"
}
```

Node.js will look at these file paths at runtime.

## Common Pitfalls

### 1. Missing Path Mappings

Missing the top-level path mapping in tsconfig.json:

```json
// Incomplete - missing top-level import path
"paths": {
  "@codequal/core/*": ["../core/src/*"]
}

// Complete - includes both patterns
"paths": {
  "@codequal/core": ["../core/src"],
  "@codequal/core/*": ["../core/src/*"]
}
```

### 2. Missing Exports Configuration

Forgetting to configure exports in package.json:

```json
// Missing exports configuration
{
  "main": "dist/index.js",
  "types": "dist/index.d.ts"
}

// Complete configuration
{
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js",
    "./utils": "./dist/utils/index.js"
  }
}
```

### 3. Inconsistent Import Patterns

Mixing different import styles unnecessarily:

```typescript
// Inconsistent - harder to maintain
import { AgentProvider } from '@codequal/core/config/agent-registry';
import { AnalysisResult } from '@codequal/core';

// Consistent - easier to maintain
import { AgentProvider, AnalysisResult } from '@codequal/core';
```

## Package-Specific Import Patterns

### Core Package

The core package exports key types, interfaces, and utilities:

```typescript
// Importing from core
import { 
  Agent, 
  AnalysisResult, 
  AgentProvider, 
  AgentRole,
  createLogger
} from '@codequal/core';
```

### Database Package

The database package provides database models and utilities:

```typescript
// Importing from database
import { PRReviewModel, RepositoryModel } from '@codequal/database';
import { getSupabase } from '@codequal/database/supabase/client';
```

### Agents Package

The agents package provides agent implementations:

```typescript
// Importing from agents
import { ClaudeAgent, ChatGPTAgent } from '@codequal/agents';
import { BaseAgent } from '@codequal/agents/base/base-agent';
```

## Conclusion

Following these consistent import patterns will help maintain code clarity and prevent module resolution issues in the CodeQual monorepo. When in doubt, prefer top-level imports, and ensure that frequently used types and utilities are properly re-exported from package entry points.
