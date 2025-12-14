/**
 * React Framework Configuration
 *
 * Defines how issues are handled specifically for React projects:
 * - What patterns are intentional (hooks, effects, JSX)
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
 * React Framework Configuration
 *
 * React is a component-based UI library with:
 * - JSX syntax
 * - Hooks for state and effects
 * - Virtual DOM rendering
 * - Component lifecycle
 */
export const REACT_CONFIG: FrameworkConfig = {
  framework: 'react',

  // =========================================================================
  // Intentional Patterns - Don't fix these, they're by design
  // =========================================================================
  intentionalPatterns: [
    // useEffect with empty dependency array - intentional "mount only"
    {
      ruleId: 'react-hooks/exhaustive-deps',
      filePatterns: [
        /\.tsx?$/,
        /\.jsx?$/,
      ],
      codePatterns: [
        /useEffect\s*\(\s*\(\)\s*=>\s*\{[\s\S]*?\}\s*,\s*\[\s*\]\s*\)/,
      ],
      reason: 'Empty dependency array is intentional for "mount only" effects',
      example: 'useEffect(() => { fetchData(); }, []); // Run once on mount',
    },

    // Event handlers with unused event parameter
    {
      ruleId: 'no-unused-vars',
      filePatterns: [
        /components?\//i,
        /\.tsx?$/,
      ],
      codePatterns: [
        /on\w+\s*=\s*\{\s*\(\s*e\s*\)\s*=>/,
        /handle\w+\s*=\s*\(\s*event\s*\)/,
      ],
      reason: 'Event handlers often declare event parameter for type inference even when not used',
    },

    // Props spreading - common pattern
    {
      ruleId: 'react/jsx-props-no-spreading',
      filePatterns: [
        /components?\//i,
      ],
      codePatterns: [
        /\{\s*\.\.\.\w+\s*\}/,
      ],
      reason: 'Props spreading is a common React pattern for HOCs and wrapper components',
    },

    // dangerouslySetInnerHTML - sometimes necessary
    {
      ruleId: 'react/no-danger',
      filePatterns: [
        /rich[-_]?text/i,
        /markdown/i,
        /html[-_]?content/i,
      ],
      reason: 'dangerouslySetInnerHTML is necessary for rich text/markdown rendering',
    },
  ],

  // =========================================================================
  // Filter Rules - Don't report these at all
  // =========================================================================
  filterRules: [
    // Generated files
    {
      ruleId: 'TS2307',
      condition: 'in_generated_code',
      reason: 'BUILD_ARTIFACT',
      explanation: 'Build artifacts and generated code should not be analyzed.',
    },

    // Storybook files
    {
      ruleId: 'import/no-extraneous-dependencies',
      condition: 'always',
      reason: 'DEVTOOL_CODE',
      explanation: 'Storybook files can import devDependencies.',
    },

    // Test files
    {
      ruleId: 'testing-library/no-unnecessary-act',
      condition: 'in_test_files',
      reason: 'TEST_FIXTURE',
      explanation: 'Test-specific rules should not trigger in test files.',
    },
  ],

  // =========================================================================
  // Environment Requirements
  // =========================================================================
  environmentRequirements: [
    {
      requirement: 'Install dependencies',
      checkCommand: 'ls node_modules/react/package.json',
      fixCommand: 'npm install',
      relatedErrorPatterns: [
        'Cannot find module \'react\'',
        'react is not defined',
      ],
    },
    {
      requirement: 'TypeScript React types',
      checkCommand: 'ls node_modules/@types/react/package.json',
      fixCommand: 'npm install --save-dev @types/react @types/react-dom',
      relatedErrorPatterns: [
        'Cannot find type definition',
        '@types/react',
        'JSX element type',
      ],
    },
  ],

  // =========================================================================
  // Framework-Specific Fix Strategies
  // =========================================================================
  fixStrategies: [
    // React key prop
    {
      ruleId: 'react/jsx-key',
      strategy: 'framework_pattern',
      frameworkPattern: 'Add unique key prop: key={item.id} or key={index} (if order is stable)',
    },

    // Hooks rules
    {
      ruleId: 'react-hooks/rules-of-hooks',
      strategy: 'framework_pattern',
      frameworkPattern: 'Move hook call to component/custom hook body, not inside conditions/loops',
    },

    // Missing dependencies
    {
      ruleId: 'react-hooks/exhaustive-deps',
      strategy: 'framework_pattern',
      frameworkPattern: 'Add missing dependencies or use useCallback/useMemo to stabilize references',
    },

    // Avoid inline functions in JSX
    {
      ruleId: 'react/jsx-no-bind',
      strategy: 'framework_pattern',
      frameworkPattern: 'Extract to useCallback: const handleClick = useCallback(() => {...}, [deps]);',
    },
  ],
};

/**
 * Check if an issue matches React intentional patterns
 */
export function isReactIntentionalUse(
  ruleId: string,
  filePath: string,
  codeSnippet?: string
): { isIntentional: boolean; reason?: string } {
  for (const pattern of REACT_CONFIG.intentionalPatterns) {
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

export default REACT_CONFIG;
