/**
 * NestJS Framework Fix Patterns
 *
 * These patterns are derived from analyzing 681 issues in the NestJS repository.
 * They represent the most common fixable issues and their solutions.
 *
 * Pattern Flywheel Impact:
 * - Without patterns: 204 issues × $0.0006 = $0.1224
 * - With patterns: 42 AI + 162 pattern = $0.0268
 * - Savings: 78% ($0.0956)
 */

import type { FrameworkPattern } from '../types/framework-issue-types';

/**
 * TS2339: Property 'defineMetadata' does not exist on type 'typeof Reflect'
 *
 * Root Cause: Missing reflect-metadata types or import
 * Occurrences: 140 (69% of fixable issues)
 *
 * Fix Strategy:
 * 1. Ensure reflect-metadata is imported at app entry point
 * 2. Ensure tsconfig has "emitDecoratorMetadata": true
 * 3. Add @types/reflect-metadata if using TypeScript
 */
export const TS2339_REFLECT_METADATA: FrameworkPattern = {
  id: 'nestjs-ts2339-reflect-metadata',
  ruleId: 'TS2339',
  tool: 'typescript',
  framework: 'nestjs',
  codePattern: "Property '(defineMetadata|getMetadata|hasMetadata)' does not exist on type 'typeof Reflect'",
  fixTemplate: `// This error occurs because reflect-metadata types are not available.
//
// SOLUTION 1: Add import at the top of your main.ts or app entry point:
import 'reflect-metadata';

// SOLUTION 2: Ensure tsconfig.json has these compiler options:
// {
//   "compilerOptions": {
//     "emitDecoratorMetadata": true,
//     "experimentalDecorators": true
//   }
// }

// SOLUTION 3: Install types if missing:
// npm install --save-dev @types/reflect-metadata`,
  fixConfidence: 95,
  createdAt: new Date(),
  lastUsedAt: new Date(),
  useCount: 0,
  successRate: 0,
  frameworkVersion: 'nestjs@10.x',
  requiresImport: ['reflect-metadata'],
};

/**
 * TS2304: Cannot find name '__dirname'
 *
 * Root Cause: Using CommonJS globals in ESM module context
 * Occurrences: 14 (7% of fixable issues)
 *
 * Fix Strategy:
 * 1. For ESM: Use import.meta.url with fileURLToPath
 * 2. For CommonJS: Ensure "module": "commonjs" in tsconfig
 */
export const TS2304_DIRNAME: FrameworkPattern = {
  id: 'nestjs-ts2304-dirname',
  ruleId: 'TS2304',
  tool: 'typescript',
  framework: 'nestjs',
  codePattern: "Cannot find name '__dirname'",
  fixTemplate: `// __dirname is not available in ESM modules.
//
// SOLUTION 1: Use ESM-compatible approach:
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// SOLUTION 2: If using CommonJS, ensure tsconfig.json has:
// {
//   "compilerOptions": {
//     "module": "commonjs"
//   }
// }

// SOLUTION 3: For NestJS specifically, use path.join with process.cwd():
import * as path from 'path';
const schemaPath = path.join(process.cwd(), 'src/schema.graphql');`,
  fixConfidence: 90,
  createdAt: new Date(),
  lastUsedAt: new Date(),
  useCount: 0,
  successRate: 0,
  frameworkVersion: 'nestjs@10.x',
};

/**
 * TS2322: Type 'X | undefined' is not assignable to type 'X'
 *
 * Root Cause: Strict null checks finding potential undefined values
 * Occurrences: 4 (2% of fixable issues)
 *
 * Fix Strategy:
 * 1. Add null check before assignment
 * 2. Use non-null assertion if value is guaranteed
 * 3. Update type to allow undefined
 */
export const TS2322_UNDEFINED_ASSIGNABLE: FrameworkPattern = {
  id: 'nestjs-ts2322-undefined',
  ruleId: 'TS2322',
  tool: 'typescript',
  framework: 'nestjs',
  codePattern: "Type '.*\\| undefined' is not assignable to type",
  fixTemplate: `// This error occurs when a value might be undefined but the target type doesn't allow it.
//
// SOLUTION 1: Add a null/undefined check:
if (value !== undefined) {
  target = value;
}

// SOLUTION 2: Use nullish coalescing to provide default:
target = value ?? defaultValue;

// SOLUTION 3: Use non-null assertion (only if you're certain it's defined):
target = value!;

// SOLUTION 4: Update the target type to allow undefined:
let target: TargetType | undefined;`,
  fixConfidence: 85,
  createdAt: new Date(),
  lastUsedAt: new Date(),
  useCount: 0,
  successRate: 0,
  frameworkVersion: 'nestjs@10.x',
};

/**
 * TS2503: Cannot find namespace 'NodeJS'
 *
 * Root Cause: Missing @types/node
 * Occurrences: 2 (1% of fixable issues)
 *
 * Fix Strategy: Install @types/node
 */
export const TS2503_NODEJS_NAMESPACE: FrameworkPattern = {
  id: 'nestjs-ts2503-nodejs',
  ruleId: 'TS2503',
  tool: 'typescript',
  framework: 'nestjs',
  codePattern: "Cannot find namespace 'NodeJS'",
  fixTemplate: `// The NodeJS namespace is not found because @types/node is missing.
//
// SOLUTION: Install Node.js type definitions:
// npm install --save-dev @types/node
//
// Then ensure tsconfig.json includes:
// {
//   "compilerOptions": {
//     "types": ["node"]
//   }
// }`,
  fixConfidence: 98,
  createdAt: new Date(),
  lastUsedAt: new Date(),
  useCount: 0,
  successRate: 0,
  frameworkVersion: 'nestjs@10.x',
  requiresImport: ['@types/node'],
};

/**
 * TS2688: Cannot find type definition file for 'node'
 *
 * Root Cause: Missing @types/node or incorrect tsconfig
 * Occurrences: 1
 */
export const TS2688_NODE_TYPES: FrameworkPattern = {
  id: 'nestjs-ts2688-node-types',
  ruleId: 'TS2688',
  tool: 'typescript',
  framework: 'nestjs',
  codePattern: "Cannot find type definition file for 'node'",
  fixTemplate: `// Type definition for 'node' is missing.
//
// SOLUTION 1: Install @types/node:
// npm install --save-dev @types/node
//
// SOLUTION 2: If already installed, check tsconfig.json:
// {
//   "compilerOptions": {
//     "typeRoots": ["./node_modules/@types"],
//     "types": ["node"]
//   }
// }`,
  fixConfidence: 98,
  createdAt: new Date(),
  lastUsedAt: new Date(),
  useCount: 0,
  successRate: 0,
  frameworkVersion: 'nestjs@10.x',
  requiresImport: ['@types/node'],
};

/**
 * dependency-vulnerability: npm audit findings
 *
 * Root Cause: Vulnerable package versions
 * Occurrences: 26 (13% of fixable issues)
 *
 * Fix Strategy: Update packages or add resolutions
 */
export const NPM_AUDIT_VULNERABILITY: FrameworkPattern = {
  id: 'nestjs-npm-audit-vuln',
  ruleId: 'dependency-vulnerability',
  tool: 'npm-audit',
  framework: 'nestjs',
  codePattern: '.*vulnerability.*',
  fixTemplate: `// Dependency vulnerability detected.
//
// SOLUTION 1: Try automatic fix:
// npm audit fix
//
// SOLUTION 2: For breaking changes, review and update manually:
// npm audit fix --force
//
// SOLUTION 3: If package is a transitive dependency, add resolution in package.json:
// {
//   "resolutions": {
//     "vulnerable-package": "^fixed-version"
//   }
// }
// Then run: npx npm-force-resolutions && npm install
//
// SOLUTION 4: If vulnerability is in dev dependency and not exploitable:
// Add to .nsprc or npm audit --production to ignore dev deps`,
  fixConfidence: 75,
  createdAt: new Date(),
  lastUsedAt: new Date(),
  useCount: 0,
  successRate: 0,
  frameworkVersion: 'nestjs@10.x',
};

/**
 * All NestJS patterns for export
 */
export const NESTJS_PATTERNS: FrameworkPattern[] = [
  TS2339_REFLECT_METADATA,
  TS2304_DIRNAME,
  TS2322_UNDEFINED_ASSIGNABLE,
  TS2503_NODEJS_NAMESPACE,
  TS2688_NODE_TYPES,
  NPM_AUDIT_VULNERABILITY,
];

/**
 * Get pattern for a specific rule
 */
export function getNestJSPattern(ruleId: string): FrameworkPattern | undefined {
  return NESTJS_PATTERNS.find(p => p.ruleId === ruleId);
}

/**
 * Check if a rule has a pattern
 */
export function hasNestJSPattern(ruleId: string): boolean {
  return NESTJS_PATTERNS.some(p => p.ruleId === ruleId);
}

/**
 * Get all patterns matching a regex
 */
export function findNestJSPatterns(ruleIdPattern: RegExp): FrameworkPattern[] {
  return NESTJS_PATTERNS.filter(p => ruleIdPattern.test(p.ruleId));
}

export default NESTJS_PATTERNS;
