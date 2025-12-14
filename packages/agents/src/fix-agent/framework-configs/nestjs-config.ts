/**
 * NestJS Framework Configuration
 *
 * Defines how issues are handled specifically for NestJS projects:
 * - What patterns are intentional (CLI tools, adapters)
 * - What errors to filter out (monorepo cross-refs, missing Lerna bootstrap)
 * - Framework-specific fix strategies
 */

import {
  FrameworkConfig,
  IntentionalPattern,
  FilterRule,
  EnvironmentRequirement,
  FrameworkFixStrategy,
} from '../types/framework-issue-types';

/**
 * NestJS Framework Configuration
 *
 * NestJS is a Lerna monorepo with:
 * - Multiple packages in /packages/*
 * - Integration tests with their own dependencies
 * - CLI tools and adapters that legitimately use child_process
 */
export const NESTJS_CONFIG: FrameworkConfig = {
  framework: 'nestjs',

  // =========================================================================
  // Intentional Patterns - Don't fix these, they're by design
  // =========================================================================
  intentionalPatterns: [
    // CLI and Build Tools
    {
      ruleId: 'detect-child-process',
      filePatterns: [
        /cli\//i,
        /scripts\//i,
        /tools\//i,
        /build\//i,
        /schematics\//i,
      ],
      codePatterns: [
        /spawn\s*\(\s*['"](?:node|npm|npx|tsc|webpack)/i,
        /exec\s*\(\s*['"](?:npm|yarn|pnpm)/i,
      ],
      reason: 'CLI tools and build scripts intentionally spawn processes',
      example: 'spawn("npm", ["run", "build"])',
    },

    // Test Utilities
    {
      ruleId: 'detect-child-process',
      filePatterns: [
        /\.spec\.ts$/,
        /\.test\.ts$/,
        /e2e.*\.ts$/,
        /integration\//i,
      ],
      codePatterns: [
        /spawn\s*\(\s*['"]node/i,
        /exec.*test/i,
      ],
      reason: 'Test utilities spawn test processes',
    },

    // Platform Adapters
    {
      ruleId: 'detect-child-process',
      filePatterns: [
        /adapter/i,
        /platform-/i,
      ],
      reason: 'Platform adapters may need to spawn platform-specific processes',
    },

    // Microservices Transport
    {
      ruleId: 'detect-child-process',
      filePatterns: [
        /microservices\//i,
        /transport/i,
      ],
      codePatterns: [
        /spawn.*redis|rabbitmq|kafka|nats/i,
      ],
      reason: 'Microservice transports may spawn broker connections',
    },
  ],

  // =========================================================================
  // Filter Rules - Don't report these at all
  // SESSION 44 FIX: Added TS2580 and TS2582 for missing @types/node and @types/jest
  // =========================================================================
  filterRules: [
    // Monorepo cross-references (Lerna bootstrap needed)
    {
      ruleId: 'TS2307',  // Cannot find module
      condition: 'when_missing_deps',
      reason: 'MONOREPO_CROSS_REF',
      explanation: 'NestJS is a Lerna monorepo. Run "npx lerna bootstrap" to link packages.',
    },

    // Missing NestJS internal types
    {
      ruleId: 'TS2305',  // Module has no exported member
      condition: 'when_missing_deps',
      reason: 'MISSING_DEPENDENCY',
      explanation: 'Internal type not exported. Ensure packages are built with "npm run build".',
    },

    // Missing @types/node (require, module, process, etc.)
    {
      ruleId: 'TS2580',  // Cannot find name 'require'
      condition: 'always',
      reason: 'MISSING_DEPENDENCY',
      explanation: 'Missing @types/node. Run "npm install -D @types/node" to fix.',
    },

    // Missing @types/jest (describe, it, expect, etc.)
    {
      ruleId: 'TS2582',  // Cannot find name 'describe'/'it'/'expect'
      condition: 'always',
      reason: 'MISSING_DEPENDENCY',
      explanation: 'Missing @types/jest. Run "npm install -D @types/jest" to fix.',
    },

    // Integration test dependencies
    {
      ruleId: 'TS2307',
      condition: 'in_test_files',
      reason: 'TEST_FIXTURE',
      explanation: 'Integration tests have their own package.json. Run npm install in test directory.',
    },

    // Generated GraphQL types
    {
      ruleId: 'TS2304',  // Cannot find name
      condition: 'in_generated_code',
      reason: 'BUILD_ARTIFACT',
      explanation: 'GraphQL types are generated at build time. Run "npm run build" first.',
    },

    // Sample/Example code
    {
      ruleId: 'TS7006',  // Parameter implicitly has 'any' type
      condition: 'always',
      reason: 'EXAMPLE_CODE',
      explanation: 'Sample code in /sample/ directories uses implicit any for simplicity.',
    },
  ],

  // =========================================================================
  // Environment Requirements
  // =========================================================================
  environmentRequirements: [
    {
      requirement: 'Lerna bootstrap (links monorepo packages)',
      checkCommand: 'ls node_modules/@nestjs/core/package.json',
      fixCommand: 'npx lerna bootstrap',
      relatedErrorPatterns: [
        'Cannot find module \'@nestjs/',
        'Module \'"@nestjs/',
      ],
    },
    {
      requirement: 'Build packages (generates types)',
      checkCommand: 'ls packages/core/dist/index.js',
      fixCommand: 'npm run build',
      relatedErrorPatterns: [
        'Cannot find module',
        'has no exported member',
      ],
    },
    {
      requirement: 'Integration test dependencies',
      checkCommand: 'ls integration/node_modules',
      fixCommand: 'cd integration && npm install',
      relatedErrorPatterns: [
        'integration/',
        '/e2e/',
      ],
    },
  ],

  // =========================================================================
  // Framework-Specific Fix Strategies
  // =========================================================================
  fixStrategies: [
    // Decorator-based fixes
    {
      ruleId: '@typescript-eslint/no-explicit-any',
      strategy: 'framework_pattern',
      frameworkPattern: 'Use NestJS decorators with proper typing: @Inject(TOKEN) private readonly service: ServiceType',
    },

    // Dependency injection fixes
    {
      ruleId: 'no-unused-vars',
      strategy: 'skip',  // Often constructor injection that looks unused
    },

    // Module import fixes
    {
      ruleId: 'import/no-cycle',
      strategy: 'framework_pattern',
      frameworkPattern: 'Use forwardRef() for circular dependencies: @Inject(forwardRef(() => ServiceName))',
    },

    // Exception handling
    {
      ruleId: 'no-throw-literal',
      strategy: 'framework_pattern',
      frameworkPattern: 'Use NestJS exceptions: throw new HttpException(message, HttpStatus.BAD_REQUEST)',
    },
  ],
};

/**
 * Check if an issue matches NestJS intentional patterns
 */
export function isNestJSIntentionalUse(
  ruleId: string,
  filePath: string,
  codeSnippet?: string
): { isIntentional: boolean; reason?: string } {
  for (const pattern of NESTJS_CONFIG.intentionalPatterns) {
    if (pattern.ruleId !== ruleId) continue;

    // Check file path patterns
    const fileMatches = pattern.filePatterns.some(p => p.test(filePath));
    if (!fileMatches) continue;

    // If code patterns specified, check those too
    if (pattern.codePatterns && codeSnippet) {
      const codeMatches = pattern.codePatterns.some(p => p.test(codeSnippet));
      if (!codeMatches) continue;
    }

    return {
      isIntentional: true,
      reason: pattern.reason,
    };
  }

  return { isIntentional: false };
}

/**
 * Check if an issue should be filtered out for NestJS
 */
export function shouldFilterForNestJS(
  ruleId: string,
  filePath: string,
  errorMessage: string,
  hasDependencies: boolean
): { shouldFilter: boolean; reason?: string; explanation?: string } {
  for (const rule of NESTJS_CONFIG.filterRules) {
    if (rule.ruleId !== ruleId) continue;

    // Check condition
    switch (rule.condition) {
      case 'always':
        return {
          shouldFilter: true,
          reason: rule.reason,
          explanation: rule.explanation,
        };

      case 'when_missing_deps':
        if (!hasDependencies) {
          return {
            shouldFilter: true,
            reason: rule.reason,
            explanation: rule.explanation,
          };
        }
        break;

      case 'in_test_files':
        if (/\.(spec|test|e2e)\.ts$/.test(filePath) || /integration\//.test(filePath)) {
          return {
            shouldFilter: true,
            reason: rule.reason,
            explanation: rule.explanation,
          };
        }
        break;

      case 'in_generated_code':
        if (/\.(generated|g)\.ts$/.test(filePath) || /generated\//.test(filePath)) {
          return {
            shouldFilter: true,
            reason: rule.reason,
            explanation: rule.explanation,
          };
        }
        break;
    }
  }

  return { shouldFilter: false };
}

/**
 * Get environment fix suggestions for NestJS
 */
export function getNestJSEnvironmentFixes(errorMessages: string[]): string[] {
  const fixes: string[] = [];

  for (const req of NESTJS_CONFIG.environmentRequirements) {
    const hasRelatedError = req.relatedErrorPatterns.some(pattern =>
      errorMessages.some(msg => msg.includes(pattern))
    );

    if (hasRelatedError) {
      fixes.push(`${req.requirement}: ${req.fixCommand}`);
    }
  }

  return [...new Set(fixes)];  // Deduplicate
}

export default NESTJS_CONFIG;
