/**
 * Express.js Framework Configuration
 *
 * Defines how issues are handled specifically for Express.js projects:
 * - What patterns are intentional (middleware, error handlers)
 * - What errors to filter out
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
 * Express.js Framework Configuration
 *
 * Express is a minimal Node.js web framework with:
 * - Middleware-based architecture
 * - Router for routing
 * - Error handling middleware (4-param functions)
 */
export const EXPRESS_CONFIG: FrameworkConfig = {
  framework: 'express',

  // =========================================================================
  // Intentional Patterns - Don't fix these, they're by design
  // =========================================================================
  intentionalPatterns: [
    // Error handling middleware - MUST have 4 parameters
    {
      ruleId: 'no-unused-vars',
      filePatterns: [
        /middleware/i,
        /error[-_]?handler/i,
        /app\.(ts|js)$/,
      ],
      codePatterns: [
        /\(\s*err\s*,\s*req\s*,\s*res\s*,\s*next\s*\)/,
        /function\s*\(\s*err\s*,\s*req\s*,\s*res\s*,\s*next\s*\)/,
      ],
      reason: 'Express error handlers require 4 parameters (err, req, res, next) even if not all are used',
      example: 'app.use((err, req, res, next) => { res.status(500).send("Error"); });',
    },

    // Request/Response parameters often unused in specific handlers
    {
      ruleId: '@typescript-eslint/no-unused-vars',
      filePatterns: [
        /routes?\//i,
        /controllers?\//i,
        /handlers?\//i,
      ],
      codePatterns: [
        /\(\s*req\s*,\s*res\s*(?:,\s*next)?\s*\)/,
      ],
      reason: 'Express route handlers may not use all parameters',
    },

    // Child process in scripts/tools
    {
      ruleId: 'detect-child-process',
      filePatterns: [
        /scripts?\//i,
        /bin\//i,
        /cli\//i,
      ],
      reason: 'CLI scripts and build tools intentionally use child_process',
    },
  ],

  // =========================================================================
  // Filter Rules - Don't report these at all
  // =========================================================================
  filterRules: [
    // Missing dependencies when not installed
    {
      ruleId: 'TS2307',
      condition: 'when_missing_deps',
      reason: 'MISSING_DEPENDENCY',
      explanation: 'Missing Express module. Run "npm install".',
    },

    // Test files often have different patterns
    {
      ruleId: 'no-console',
      condition: 'in_test_files',
      reason: 'TEST_FIXTURE',
      explanation: 'Console usage is acceptable in test files for debugging.',
    },
  ],

  // =========================================================================
  // Environment Requirements
  // =========================================================================
  environmentRequirements: [
    {
      requirement: 'Install dependencies',
      checkCommand: 'ls node_modules/express/package.json',
      fixCommand: 'npm install',
      relatedErrorPatterns: [
        'Cannot find module \'express\'',
        'express is not defined',
      ],
    },
    {
      requirement: 'TypeScript definitions',
      checkCommand: 'ls node_modules/@types/express/package.json',
      fixCommand: 'npm install --save-dev @types/express @types/node',
      relatedErrorPatterns: [
        'Cannot find type definition',
        '@types/express',
      ],
    },
  ],

  // =========================================================================
  // Framework-Specific Fix Strategies
  // =========================================================================
  fixStrategies: [
    // Express-specific async error handling
    {
      ruleId: 'no-floating-promises',
      strategy: 'framework_pattern',
      frameworkPattern: 'Wrap async handlers with express-async-handler or try-catch with next(err)',
    },

    // Response already sent
    {
      ruleId: 'no-return-await',
      strategy: 'skip', // Often intentional in Express handlers
    },
  ],
};

/**
 * Check if an issue matches Express intentional patterns
 */
export function isExpressIntentionalUse(
  ruleId: string,
  filePath: string,
  codeSnippet?: string
): { isIntentional: boolean; reason?: string } {
  for (const pattern of EXPRESS_CONFIG.intentionalPatterns) {
    if (pattern.ruleId !== ruleId) continue;

    const fileMatches = pattern.filePatterns.some(p => p.test(filePath));
    if (!fileMatches) continue;

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

export default EXPRESS_CONFIG;
