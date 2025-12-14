/**
 * NestJS Extended Patterns
 *
 * Additional patterns discovered from analyzing 681 NestJS issues.
 * These cover the remaining 17 issues not covered by base patterns.
 */

import type { FrameworkPattern } from '../types/framework-issue-types';

// =============================================================================
// TypeScript Patterns (Additional)
// =============================================================================

/**
 * TS2345: Argument of type 'X | undefined' is not assignable to parameter
 *
 * Root Cause: Passing potentially undefined value to function expecting defined
 * Similar to TS2322 but for function arguments instead of assignments
 */
export const TS2345_ARGUMENT_TYPE: FrameworkPattern = {
  id: 'nestjs-ts2345-argument-type',
  ruleId: 'TS2345',
  tool: 'typescript',
  framework: 'nestjs',
  codePattern: "Argument of type '.*\\| undefined' is not assignable to parameter",
  fixTemplate: `// This error occurs when passing a potentially undefined value to a function
// that expects a defined value.
//
// SOLUTION 1: Add a guard check before calling:
if (value !== undefined) {
  functionCall(value);
}

// SOLUTION 2: Use non-null assertion (only if you're certain it's defined):
functionCall(value!);

// SOLUTION 3: Provide a default value:
functionCall(value ?? defaultValue);

// SOLUTION 4: Use optional chaining with nullish coalescing:
const result = obj?.property ?? fallback;
functionCall(result);

// SOLUTION 5: Update function signature to accept undefined:
function myFunc(param: string | undefined): void { ... }`,
  fixConfidence: 88,
  createdAt: new Date(),
  lastUsedAt: new Date(),
  useCount: 0,
  successRate: 0,
  frameworkVersion: 'nestjs@10.x',
};

// =============================================================================
// Dependency Vulnerability Patterns (GHSA-*)
// =============================================================================

/**
 * Generic GHSA pattern for dependency-check vulnerabilities
 *
 * These are found by dependency-check tool scanning package-lock.json
 * Fix involves updating packages or using overrides/resolutions
 */
export const GHSA_DEPENDENCY_VULNERABILITY: FrameworkPattern = {
  id: 'nestjs-ghsa-dependency-vuln',
  ruleId: 'GHSA-.*', // Regex pattern for all GHSA IDs
  tool: 'dependency-check',
  framework: 'nestjs',
  codePattern: 'GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}',
  fixTemplate: `// Dependency vulnerability detected (GHSA advisory).
//
// STEP 1: Identify the vulnerable package from the advisory
//
// STEP 2: Check if it's a direct or transitive dependency:
// npm ls <package-name>
//
// STEP 3: For DIRECT dependencies, update to fixed version:
// npm update <package-name>
// or
// npm install <package-name>@latest
//
// STEP 4: For TRANSITIVE dependencies, use npm overrides (npm 8.3+):
// Add to package.json:
// {
//   "overrides": {
//     "vulnerable-package": "^fixed-version"
//   }
// }
//
// STEP 5: For Lerna monorepos like NestJS:
// npx lerna exec -- npm update <package-name>
//
// STEP 6: If the package is unmaintained, consider alternatives:
// - Fork and patch
// - Find replacement package
// - Accept risk if in devDependencies only
//
// STEP 7: Verify fix:
// npm audit
// npm ls <package-name>`,
  fixConfidence: 70, // Lower confidence - needs human review
  createdAt: new Date(),
  lastUsedAt: new Date(),
  useCount: 0,
  successRate: 0,
  frameworkVersion: 'nestjs@10.x',
};

// Individual GHSA patterns for common vulnerabilities

export const GHSA_MINIMIST_PROTOTYPE: FrameworkPattern = {
  id: 'nestjs-ghsa-minimist-prototype',
  ruleId: 'GHSA-xvch-5gv4-984h',
  tool: 'dependency-check',
  framework: 'nestjs',
  codePattern: 'minimist.*Prototype Pollution',
  fixTemplate: `// Minimist Prototype Pollution (CRITICAL)
//
// FIX: Update minimist to 1.2.6+ or 0.2.4+
//
// For direct dependency:
// npm install minimist@^1.2.8
//
// For transitive dependency (common in build tools):
// Add to package.json:
// {
//   "overrides": {
//     "minimist": "^1.2.8"
//   }
// }
//
// Then run: npm install`,
  fixConfidence: 90,
  createdAt: new Date(),
  lastUsedAt: new Date(),
  useCount: 0,
  successRate: 0,
  frameworkVersion: 'nestjs@10.x',
};

export const GHSA_LODASH_TEMPLATE: FrameworkPattern = {
  id: 'nestjs-ghsa-lodash-template',
  ruleId: 'GHSA-35jh-r3h4-6jhm',
  tool: 'dependency-check',
  framework: 'nestjs',
  codePattern: 'lodash.*template.*injection',
  fixTemplate: `// Lodash Template Injection (HIGH)
//
// FIX: Update lodash to 4.17.21+
//
// For direct dependency:
// npm install lodash@^4.17.21
//
// For transitive dependency:
// {
//   "overrides": {
//     "lodash": "^4.17.21",
//     "lodash.template": "^4.5.0"
//   }
// }
//
// Alternative: Replace lodash.template with native template literals`,
  fixConfidence: 92,
  createdAt: new Date(),
  lastUsedAt: new Date(),
  useCount: 0,
  successRate: 0,
  frameworkVersion: 'nestjs@10.x',
};

export const GHSA_CROSS_SPAWN: FrameworkPattern = {
  id: 'nestjs-ghsa-cross-spawn',
  ruleId: 'GHSA-3xgq-45jj-v275',
  tool: 'dependency-check',
  framework: 'nestjs',
  codePattern: 'cross-spawn',
  fixTemplate: `// Cross-spawn Command Injection (HIGH)
//
// FIX: Update cross-spawn to 7.0.5+ or 6.0.6+
//
// {
//   "overrides": {
//     "cross-spawn": "^7.0.5"
//   }
// }
//
// Note: cross-spawn is commonly used by build tools (webpack, etc.)`,
  fixConfidence: 90,
  createdAt: new Date(),
  lastUsedAt: new Date(),
  useCount: 0,
  successRate: 0,
  frameworkVersion: 'nestjs@10.x',
};

export const GHSA_BRACES_REDOS: FrameworkPattern = {
  id: 'nestjs-ghsa-braces-redos',
  ruleId: 'GHSA-grv7-fg5c-xmjg',
  tool: 'dependency-check',
  framework: 'nestjs',
  codePattern: 'braces.*ReDoS',
  fixTemplate: `// Braces ReDoS Vulnerability (HIGH)
//
// FIX: Update braces to 3.0.3+
//
// {
//   "overrides": {
//     "braces": "^3.0.3"
//   }
// }
//
// Note: braces is used by micromatch, which is used by many tools`,
  fixConfidence: 90,
  createdAt: new Date(),
  lastUsedAt: new Date(),
  useCount: 0,
  successRate: 0,
  frameworkVersion: 'nestjs@10.x',
};

export const GHSA_MARKED_XSS: FrameworkPattern = {
  id: 'nestjs-ghsa-marked-xss',
  ruleId: 'GHSA-5v2h-r2cx-5xgj',
  tool: 'dependency-check',
  framework: 'nestjs',
  codePattern: 'marked.*XSS',
  fixTemplate: `// Marked XSS Vulnerability (HIGH)
//
// FIX: Update marked to 4.0.10+
//
// npm install marked@^14.0.0
//
// Or use override:
// {
//   "overrides": {
//     "marked": "^14.0.0"
//   }
// }
//
// Note: Major version changes may require code updates`,
  fixConfidence: 85,
  createdAt: new Date(),
  lastUsedAt: new Date(),
  useCount: 0,
  successRate: 0,
  frameworkVersion: 'nestjs@10.x',
};

export const GHSA_TOUGH_COOKIE: FrameworkPattern = {
  id: 'nestjs-ghsa-tough-cookie',
  ruleId: 'GHSA-72xf-g2v4-qvf3',
  tool: 'dependency-check',
  framework: 'nestjs',
  codePattern: 'tough-cookie',
  fixTemplate: `// Tough-cookie Prototype Pollution (MEDIUM)
//
// FIX: Update tough-cookie to 4.1.3+
//
// {
//   "overrides": {
//     "tough-cookie": "^4.1.4"
//   }
// }
//
// Note: Often a transitive dependency of testing libraries`,
  fixConfidence: 88,
  createdAt: new Date(),
  lastUsedAt: new Date(),
  useCount: 0,
  successRate: 0,
  frameworkVersion: 'nestjs@10.x',
};

export const GHSA_GOT_REDIRECT: FrameworkPattern = {
  id: 'nestjs-ghsa-got-redirect',
  ruleId: 'GHSA-pfrx-2q88-qq97',
  tool: 'dependency-check',
  framework: 'nestjs',
  codePattern: 'got.*redirect',
  fixTemplate: `// Got Redirect Vulnerability (MEDIUM)
//
// FIX: Update got to 11.8.5+ or 12.1.0+
//
// npm install got@^14.0.0
//
// Or use override:
// {
//   "overrides": {
//     "got": "^14.0.0"
//   }
// }`,
  fixConfidence: 88,
  createdAt: new Date(),
  lastUsedAt: new Date(),
  useCount: 0,
  successRate: 0,
  frameworkVersion: 'nestjs@10.x',
};

// =============================================================================
// Additional GHSA Patterns (from nest-cli scan)
// =============================================================================

export const GHSA_JS_YAML: FrameworkPattern = {
  id: 'nestjs-ghsa-js-yaml',
  ruleId: 'GHSA-mh29-5h37-fv8m',
  tool: 'dependency-check',
  framework: 'nestjs',
  codePattern: 'js-yaml',
  fixTemplate: `// js-yaml Arbitrary Code Execution (HIGH)
//
// FIX: Update js-yaml to 3.13.1+ or 4.1.0+
//
// For direct dependency:
// npm install js-yaml@^4.1.0
//
// For transitive dependency:
// {
//   "overrides": {
//     "js-yaml": "^4.1.0"
//   }
// }
//
// Note: js-yaml 4.x has breaking changes - check for safeLoad/safeDump usage`,
  fixConfidence: 88,
  createdAt: new Date(),
  lastUsedAt: new Date(),
  useCount: 0,
  successRate: 0,
  frameworkVersion: 'nestjs@10.x',
};

export const GHSA_BABEL_HELPERS: FrameworkPattern = {
  id: 'nestjs-ghsa-babel-helpers',
  ruleId: 'GHSA-968p-4wvh-cqc8',
  tool: 'dependency-check',
  framework: 'nestjs',
  codePattern: '@babel/helpers',
  fixTemplate: `// @babel/helpers Vulnerability (MEDIUM)
//
// FIX: Update @babel/helpers and related Babel packages
//
// npm install @babel/core@latest @babel/helpers@latest
//
// Or use override:
// {
//   "overrides": {
//     "@babel/helpers": "^7.24.0"
//   }
// }
//
// Note: Babel updates often require updating multiple @babel/* packages together`,
  fixConfidence: 85,
  createdAt: new Date(),
  lastUsedAt: new Date(),
  useCount: 0,
  successRate: 0,
  frameworkVersion: 'nestjs@10.x',
};

export const GHSA_MINIMATCH: FrameworkPattern = {
  id: 'nestjs-ghsa-minimatch',
  ruleId: 'GHSA-v6h2-p8h4-qcjw',
  tool: 'dependency-check',
  framework: 'nestjs',
  codePattern: 'minimatch.*brace-expansion',
  fixTemplate: `// minimatch/brace-expansion ReDoS Vulnerability (HIGH)
//
// FIX: Update minimatch to 3.1.3+ or 5.1.0+
//
// For direct dependency:
// npm install minimatch@^5.1.0
//
// For transitive dependency (common in glob, mocha, etc.):
// {
//   "overrides": {
//     "minimatch": "^5.1.0",
//     "brace-expansion": "^2.0.1"
//   }
// }
//
// Note: minimatch 5.x may have breaking changes - check glob patterns`,
  fixConfidence: 88,
  createdAt: new Date(),
  lastUsedAt: new Date(),
  useCount: 0,
  successRate: 0,
  frameworkVersion: 'nestjs@10.x',
};

// Generic CVE pattern for cases where GHSA ID is not available
export const CVE_GENERIC: FrameworkPattern = {
  id: 'nestjs-cve-generic',
  ruleId: 'CVE-.*',
  tool: 'dependency-check',
  framework: 'nestjs',
  codePattern: 'CVE-[0-9]{4}-[0-9]+',
  fixTemplate: `// CVE Vulnerability Detected
//
// STEP 1: Identify the vulnerable package from the CVE details
//
// STEP 2: Check if it's a direct or transitive dependency:
// npm ls <package-name>
//
// STEP 3: Check for available updates:
// npm outdated <package-name>
// npm view <package-name> versions
//
// STEP 4: For DIRECT dependencies, update to fixed version:
// npm install <package-name>@latest
//
// STEP 5: For TRANSITIVE dependencies, use npm overrides:
// {
//   "overrides": {
//     "vulnerable-package": "^fixed-version"
//   }
// }
//
// STEP 6: Verify the fix:
// npm audit
//
// If no fix is available, consider:
// - Patching with patch-package
// - Finding an alternative package
// - Accepting risk if in devDependencies only`,
  fixConfidence: 70,
  createdAt: new Date(),
  lastUsedAt: new Date(),
  useCount: 0,
  successRate: 0,
  frameworkVersion: 'nestjs@10.x',
};

// =============================================================================
// Export All Extended Patterns
// =============================================================================

export const NESTJS_EXTENDED_PATTERNS: FrameworkPattern[] = [
  // TypeScript
  TS2345_ARGUMENT_TYPE,
  // Generic GHSA
  GHSA_DEPENDENCY_VULNERABILITY,
  // Specific GHSA patterns
  GHSA_MINIMIST_PROTOTYPE,
  GHSA_LODASH_TEMPLATE,
  GHSA_CROSS_SPAWN,
  GHSA_BRACES_REDOS,
  GHSA_MARKED_XSS,
  GHSA_TOUGH_COOKIE,
  GHSA_GOT_REDIRECT,
  // New patterns from nest-cli scan
  GHSA_JS_YAML,
  GHSA_BABEL_HELPERS,
  GHSA_MINIMATCH,
  CVE_GENERIC,
];

export default NESTJS_EXTENDED_PATTERNS;
