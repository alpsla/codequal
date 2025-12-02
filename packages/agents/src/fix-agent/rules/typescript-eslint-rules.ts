/**
 * Comprehensive TypeScript-ESLint Rules
 *
 * Contains ALL @typescript-eslint rules from the official plugin.
 * Data sourced from: https://typescript-eslint.io/rules/
 *
 * Categories:
 * - Recommended: Core rules for correctness
 * - Strict: Additional strict rules
 * - Stylistic: Code style rules
 * - Type-Checked: Rules requiring type information
 */

import { IssueType } from '../issue-classifier';

export interface TypeScriptRuleDefinition {
  type: IssueType;
  fixable: boolean;
  requiresTypeInfo: boolean;
  extendsBase?: string;  // If this extends an ESLint core rule
  description?: string;
}

// =============================================================================
// RECOMMENDED RULES - Core correctness rules
// =============================================================================
export const TS_RECOMMENDED_RULES: Record<string, TypeScriptRuleDefinition> = {
  'ban-ts-comment': { type: 'quality', fixable: false, requiresTypeInfo: false, description: 'Disallow @ts-<directive> comments' },
  'no-array-constructor': { type: 'quality', fixable: true, requiresTypeInfo: false, extendsBase: 'no-array-constructor', description: 'Disallow generic Array constructors' },
  'no-duplicate-enum-values': { type: 'quality', fixable: false, requiresTypeInfo: false, description: 'Disallow duplicate enum member values' },
  'no-empty-object-type': { type: 'quality', fixable: false, requiresTypeInfo: false, description: 'Disallow accidentally using empty object type' },
  'no-explicit-any': { type: 'quality', fixable: true, requiresTypeInfo: false, description: 'Disallow any type' },
  'no-extra-non-null-assertion': { type: 'quality', fixable: true, requiresTypeInfo: false, description: 'Disallow extra non-null assertions' },
  'no-misused-new': { type: 'quality', fixable: false, requiresTypeInfo: false, description: 'Enforce valid definition of new and constructor' },
  'no-namespace': { type: 'quality', fixable: false, requiresTypeInfo: false, description: 'Disallow TypeScript namespaces' },
  'no-non-null-asserted-optional-chain': { type: 'quality', fixable: false, requiresTypeInfo: false, description: 'Disallow non-null assertions after optional chain' },
  'no-require-imports': { type: 'quality', fixable: false, requiresTypeInfo: false, description: 'Disallow require() invocations' },
  'no-this-alias': { type: 'quality', fixable: false, requiresTypeInfo: false, description: 'Disallow aliasing this' },
  'no-unnecessary-type-constraint': { type: 'quality', fixable: true, requiresTypeInfo: false, description: 'Disallow unnecessary generic constraints' },
  'no-unsafe-declaration-merging': { type: 'quality', fixable: false, requiresTypeInfo: false, description: 'Disallow unsafe declaration merging' },
  'no-unsafe-function-type': { type: 'security', fixable: false, requiresTypeInfo: false, description: 'Disallow built-in Function type' },
  'no-unused-expressions': { type: 'quality', fixable: false, requiresTypeInfo: false, extendsBase: 'no-unused-expressions', description: 'Disallow unused expressions' },
  'no-unused-vars': { type: 'quality', fixable: false, requiresTypeInfo: false, extendsBase: 'no-unused-vars', description: 'Disallow unused variables' },
  'no-wrapper-object-types': { type: 'quality', fixable: true, requiresTypeInfo: false, description: 'Disallow primitive wrapper types' },
  'prefer-as-const': { type: 'style', fixable: true, requiresTypeInfo: false, description: 'Prefer as const over literal type' },
  'prefer-namespace-keyword': { type: 'style', fixable: true, requiresTypeInfo: false, description: 'Require namespace over module' },
  'triple-slash-reference': { type: 'quality', fixable: false, requiresTypeInfo: false, description: 'Disallow triple-slash directives' },
};

// =============================================================================
// TYPE-CHECKED RECOMMENDED - Requires type information
// =============================================================================
export const TS_TYPE_CHECKED_RULES: Record<string, TypeScriptRuleDefinition> = {
  'await-thenable': { type: 'quality', fixable: false, requiresTypeInfo: true, description: 'Disallow awaiting non-Thenable values' },
  'no-array-delete': { type: 'quality', fixable: false, requiresTypeInfo: true, description: 'Disallow delete on arrays' },
  'no-base-to-string': { type: 'quality', fixable: false, requiresTypeInfo: true, description: 'Require meaningful toString()' },
  'no-deprecated': { type: 'quality', fixable: false, requiresTypeInfo: true, description: 'Disallow @deprecated code usage' },
  'no-duplicate-type-constituents': { type: 'quality', fixable: true, requiresTypeInfo: true, description: 'Disallow duplicate union/intersection types' },
  'no-floating-promises': { type: 'quality', fixable: false, requiresTypeInfo: true, description: 'Require Promise handling' },
  'no-for-in-array': { type: 'quality', fixable: false, requiresTypeInfo: true, description: 'Disallow for-in on arrays' },
  'no-implied-eval': { type: 'security', fixable: false, requiresTypeInfo: true, extendsBase: 'no-implied-eval', description: 'Disallow eval-like methods' },
  'no-misused-promises': { type: 'quality', fixable: false, requiresTypeInfo: true, description: 'Disallow Promises in unsuitable contexts' },
  'no-misused-spread': { type: 'quality', fixable: false, requiresTypeInfo: true, description: 'Disallow problematic spread usage' },
  'no-mixed-enums': { type: 'quality', fixable: false, requiresTypeInfo: true, description: 'Disallow mixed enum members' },
  'no-redundant-type-constituents': { type: 'quality', fixable: false, requiresTypeInfo: true, description: 'Disallow redundant type constituents' },
  'no-unnecessary-type-assertion': { type: 'quality', fixable: true, requiresTypeInfo: true, description: 'Disallow useless type assertions' },
  'no-unsafe-argument': { type: 'security', fixable: false, requiresTypeInfo: true, description: 'Disallow calling with any arguments' },
  'no-unsafe-assignment': { type: 'security', fixable: false, requiresTypeInfo: true, description: 'Disallow assigning any to variables' },
  'no-unsafe-call': { type: 'security', fixable: false, requiresTypeInfo: true, description: 'Disallow calling any-typed values' },
  'no-unsafe-enum-comparison': { type: 'quality', fixable: false, requiresTypeInfo: true, description: 'Disallow comparing enums to non-enums' },
  'no-unsafe-member-access': { type: 'security', fixable: false, requiresTypeInfo: true, description: 'Disallow member access on any values' },
  'no-unsafe-return': { type: 'security', fixable: false, requiresTypeInfo: true, description: 'Disallow returning any from functions' },
  'no-unsafe-type-assertion': { type: 'security', fixable: false, requiresTypeInfo: true, description: 'Disallow narrowing type assertions' },
  'no-unsafe-unary-minus': { type: 'quality', fixable: false, requiresTypeInfo: true, description: 'Require negation on numbers only' },
  'only-throw-error': { type: 'quality', fixable: false, requiresTypeInfo: true, description: 'Require throwing Error objects' },
  'prefer-promise-reject-errors': { type: 'quality', fixable: false, requiresTypeInfo: true, extendsBase: 'prefer-promise-reject-errors', description: 'Require Error in Promise.reject()' },
  'require-await': { type: 'quality', fixable: false, requiresTypeInfo: true, extendsBase: 'require-await', description: 'Require await in async functions' },
  'restrict-plus-operands': { type: 'quality', fixable: false, requiresTypeInfo: true, description: 'Require matching operand types' },
  'restrict-template-expressions': { type: 'quality', fixable: false, requiresTypeInfo: true, description: 'Restrict template literal types' },
  'unbound-method': { type: 'quality', fixable: false, requiresTypeInfo: true, description: 'Enforce proper unbound method usage' },
  'use-unknown-in-catch-callback-variable': { type: 'quality', fixable: false, requiresTypeInfo: true, description: 'Type catch variables as unknown' },
};

// =============================================================================
// STRICT RULES - Additional strict rules
// =============================================================================
export const TS_STRICT_RULES: Record<string, TypeScriptRuleDefinition> = {
  'no-confusing-non-null-assertion': { type: 'quality', fixable: false, requiresTypeInfo: false, description: 'Disallow confusing non-null assertions' },
  'no-dynamic-delete': { type: 'quality', fixable: true, requiresTypeInfo: false, description: 'Disallow delete on computed keys' },
  'no-extraneous-class': { type: 'quality', fixable: false, requiresTypeInfo: false, description: 'Disallow classes as namespaces' },
  'no-invalid-void-type': { type: 'quality', fixable: false, requiresTypeInfo: false, description: 'Disallow void outside specific contexts' },
  'no-non-null-assertion': { type: 'quality', fixable: false, requiresTypeInfo: false, description: 'Disallow non-null assertions' },
  'no-useless-constructor': { type: 'quality', fixable: false, requiresTypeInfo: false, extendsBase: 'no-useless-constructor', description: 'Disallow useless constructors' },
  'prefer-literal-enum-member': { type: 'style', fixable: false, requiresTypeInfo: false, description: 'Require literal enum values' },
  'unified-signatures': { type: 'style', fixable: false, requiresTypeInfo: false, description: 'Require unified overload signatures' },
};

// =============================================================================
// STRICT TYPE-CHECKED RULES
// =============================================================================
export const TS_STRICT_TYPE_CHECKED_RULES: Record<string, TypeScriptRuleDefinition> = {
  'no-confusing-void-expression': { type: 'quality', fixable: true, requiresTypeInfo: true, description: 'Require void in statement position' },
  'no-meaningless-void-operator': { type: 'quality', fixable: true, requiresTypeInfo: true, description: 'Disallow unnecessary void operator' },
  'no-unnecessary-boolean-literal-compare': { type: 'quality', fixable: true, requiresTypeInfo: true, description: 'Disallow unnecessary boolean comparisons' },
  'no-unnecessary-condition': { type: 'quality', fixable: true, requiresTypeInfo: true, description: 'Disallow always-true/false conditions' },
  'no-unnecessary-template-expression': { type: 'style', fixable: true, requiresTypeInfo: true, description: 'Disallow unnecessary template expressions' },
  'no-unnecessary-type-arguments': { type: 'style', fixable: true, requiresTypeInfo: true, description: 'Disallow redundant type arguments' },
  'no-unnecessary-type-parameters': { type: 'quality', fixable: false, requiresTypeInfo: true, description: 'Disallow unused type parameters' },
  'prefer-includes': { type: 'style', fixable: true, requiresTypeInfo: true, description: 'Prefer includes() over indexOf()' },
  'prefer-reduce-type-parameter': { type: 'style', fixable: true, requiresTypeInfo: true, description: 'Prefer type parameter in reduce()' },
  'prefer-return-this-type': { type: 'style', fixable: true, requiresTypeInfo: true, description: 'Prefer this return type annotation' },
};

// =============================================================================
// STYLISTIC RULES - Code style
// =============================================================================
export const TS_STYLISTIC_RULES: Record<string, TypeScriptRuleDefinition> = {
  'adjacent-overload-signatures': { type: 'style', fixable: false, requiresTypeInfo: false, description: 'Require adjacent overload signatures' },
  'array-type': { type: 'style', fixable: true, requiresTypeInfo: false, description: 'Require consistent array type syntax' },
  'ban-tslint-comment': { type: 'style', fixable: true, requiresTypeInfo: false, description: 'Disallow TSLint comments' },
  'class-literal-property-style': { type: 'style', fixable: true, requiresTypeInfo: false, description: 'Enforce class literal property style' },
  'consistent-generic-constructors': { type: 'style', fixable: true, requiresTypeInfo: false, description: 'Enforce consistent generic type syntax' },
  'consistent-indexed-object-style': { type: 'style', fixable: true, requiresTypeInfo: false, description: 'Require Record type or index signature' },
  'consistent-type-assertions': { type: 'style', fixable: true, requiresTypeInfo: false, description: 'Enforce consistent type assertions' },
  'consistent-type-definitions': { type: 'style', fixable: true, requiresTypeInfo: false, description: 'Enforce interface vs type' },
  'no-empty-function': { type: 'quality', fixable: false, requiresTypeInfo: false, extendsBase: 'no-empty-function', description: 'Disallow empty functions' },
  'no-inferrable-types': { type: 'style', fixable: true, requiresTypeInfo: false, description: 'Disallow explicit inferrable types' },
  'prefer-for-of': { type: 'style', fixable: false, requiresTypeInfo: false, description: 'Prefer for-of over index loops' },
  'prefer-function-type': { type: 'style', fixable: true, requiresTypeInfo: false, description: 'Prefer function type over interface' },
};

// =============================================================================
// STYLISTIC TYPE-CHECKED RULES
// =============================================================================
export const TS_STYLISTIC_TYPE_CHECKED_RULES: Record<string, TypeScriptRuleDefinition> = {
  'dot-notation': { type: 'style', fixable: true, requiresTypeInfo: true, extendsBase: 'dot-notation', description: 'Enforce dot notation for object access' },
  'non-nullable-type-assertion-style': { type: 'style', fixable: true, requiresTypeInfo: true, description: 'Prefer non-null assertion over casts' },
  'prefer-find': { type: 'style', fixable: false, requiresTypeInfo: true, description: 'Prefer find() over filter()[0]' },
  'prefer-optional-chain': { type: 'style', fixable: true, requiresTypeInfo: true, description: 'Prefer optional chaining' },
  'prefer-regexp-exec': { type: 'style', fixable: true, requiresTypeInfo: true, description: 'Prefer RegExp#exec over String#match' },
  'prefer-string-starts-ends-with': { type: 'style', fixable: true, requiresTypeInfo: true, description: 'Prefer startsWith/endsWith' },
};

// =============================================================================
// ADDITIONAL RULES - Not in default configs
// =============================================================================
export const TS_ADDITIONAL_RULES: Record<string, TypeScriptRuleDefinition> = {
  'class-methods-use-this': { type: 'quality', fixable: false, requiresTypeInfo: false, extendsBase: 'class-methods-use-this', description: 'Require this in class methods' },
  'consistent-return': { type: 'quality', fixable: false, requiresTypeInfo: true, extendsBase: 'consistent-return', description: 'Require consistent return' },
  'consistent-type-exports': { type: 'style', fixable: true, requiresTypeInfo: true, description: 'Require type-only exports' },
  'consistent-type-imports': { type: 'style', fixable: true, requiresTypeInfo: false, description: 'Require type-only imports' },
  'default-param-last': { type: 'quality', fixable: false, requiresTypeInfo: false, extendsBase: 'default-param-last', description: 'Default params last' },
  'explicit-function-return-type': { type: 'maintainability', fixable: false, requiresTypeInfo: false, description: 'Require explicit return types' },
  'explicit-member-accessibility': { type: 'maintainability', fixable: true, requiresTypeInfo: false, description: 'Require accessibility modifiers' },
  'explicit-module-boundary-types': { type: 'maintainability', fixable: false, requiresTypeInfo: false, description: 'Require explicit types on exports' },
  'init-declarations': { type: 'style', fixable: false, requiresTypeInfo: false, extendsBase: 'init-declarations', description: 'Require/disallow variable init' },
  'max-params': { type: 'maintainability', fixable: false, requiresTypeInfo: false, extendsBase: 'max-params', description: 'Limit function parameters' },
  'member-ordering': { type: 'style', fixable: false, requiresTypeInfo: false, description: 'Enforce member order in classes' },
  'method-signature-style': { type: 'style', fixable: true, requiresTypeInfo: false, description: 'Enforce method signature syntax' },
  'naming-convention': { type: 'style', fixable: false, requiresTypeInfo: true, description: 'Enforce naming conventions' },
  'no-confusing-void-expression': { type: 'quality', fixable: true, requiresTypeInfo: true, description: 'Require void in statements' },
  'no-dupe-class-members': { type: 'quality', fixable: false, requiresTypeInfo: false, extendsBase: 'no-dupe-class-members', description: 'Disallow duplicate members' },
  'no-empty-interface': { type: 'quality', fixable: true, requiresTypeInfo: false, description: 'Disallow empty interfaces' },
  'no-import-type-side-effects': { type: 'style', fixable: true, requiresTypeInfo: false, description: 'Enforce top-level type imports' },
  'no-invalid-this': { type: 'quality', fixable: false, requiresTypeInfo: false, extendsBase: 'no-invalid-this', description: 'Disallow invalid this' },
  'no-loop-func': { type: 'quality', fixable: false, requiresTypeInfo: false, extendsBase: 'no-loop-func', description: 'Disallow loop function creation' },
  'no-loss-of-precision': { type: 'quality', fixable: false, requiresTypeInfo: false, extendsBase: 'no-loss-of-precision', description: 'Disallow precision loss' },
  'no-magic-numbers': { type: 'maintainability', fixable: false, requiresTypeInfo: false, extendsBase: 'no-magic-numbers', description: 'Disallow magic numbers' },
  'no-redeclare': { type: 'quality', fixable: false, requiresTypeInfo: false, extendsBase: 'no-redeclare', description: 'Disallow redeclaration' },
  'no-restricted-imports': { type: 'quality', fixable: false, requiresTypeInfo: false, extendsBase: 'no-restricted-imports', description: 'Disallow specific imports' },
  'no-restricted-types': { type: 'quality', fixable: true, requiresTypeInfo: false, description: 'Disallow certain types' },
  'no-shadow': { type: 'quality', fixable: false, requiresTypeInfo: false, extendsBase: 'no-shadow', description: 'Disallow variable shadowing' },
  'no-type-alias': { type: 'style', fixable: false, requiresTypeInfo: false, description: 'Disallow type aliases' },
  'no-unnecessary-parameter-property-assignment': { type: 'quality', fixable: false, requiresTypeInfo: false, description: 'Disallow redundant constructor assignments' },
  'no-unnecessary-qualifier': { type: 'style', fixable: true, requiresTypeInfo: true, description: 'Disallow unnecessary namespace qualifiers' },
  'no-unnecessary-type-conversion': { type: 'quality', fixable: false, requiresTypeInfo: true, description: 'Disallow unnecessary type conversions' },
  'no-unused-private-class-members': { type: 'quality', fixable: false, requiresTypeInfo: false, extendsBase: 'no-unused-private-class-members', description: 'Disallow unused private members' },
  'no-use-before-define': { type: 'quality', fixable: false, requiresTypeInfo: false, extendsBase: 'no-use-before-define', description: 'Disallow use before define' },
  'no-useless-empty-export': { type: 'style', fixable: true, requiresTypeInfo: false, description: 'Disallow empty exports' },
  'no-var-requires': { type: 'quality', fixable: false, requiresTypeInfo: false, description: 'Disallow require statements' },
  'parameter-properties': { type: 'style', fixable: false, requiresTypeInfo: false, description: 'Require/disallow param properties' },
  'prefer-destructuring': { type: 'style', fixable: true, requiresTypeInfo: true, extendsBase: 'prefer-destructuring', description: 'Prefer destructuring' },
  'prefer-enum-initializers': { type: 'style', fixable: false, requiresTypeInfo: false, description: 'Require enum initializers' },
  'prefer-nullish-coalescing': { type: 'style', fixable: true, requiresTypeInfo: true, description: 'Prefer nullish coalescing' },
  'prefer-readonly': { type: 'style', fixable: true, requiresTypeInfo: true, description: 'Prefer readonly for unmodified members' },
  'prefer-readonly-parameter-types': { type: 'style', fixable: false, requiresTypeInfo: true, description: 'Require readonly params' },
  'prefer-ts-expect-error': { type: 'style', fixable: true, requiresTypeInfo: false, description: 'Prefer @ts-expect-error' },
  'promise-function-async': { type: 'style', fixable: true, requiresTypeInfo: true, description: 'Mark Promise functions async' },
  'related-getter-setter-pairs': { type: 'quality', fixable: false, requiresTypeInfo: true, description: 'Ensure getter/setter compatibility' },
  'require-array-sort-compare': { type: 'quality', fixable: false, requiresTypeInfo: true, description: 'Require sort compare function' },
  'return-await': { type: 'style', fixable: true, requiresTypeInfo: true, description: 'Enforce return await consistency' },
  'sort-type-constituents': { type: 'style', fixable: true, requiresTypeInfo: false, description: 'Sort union/intersection types' },
  'strict-boolean-expressions': { type: 'quality', fixable: true, requiresTypeInfo: true, description: 'Restrict boolean expression types' },
  'switch-exhaustiveness-check': { type: 'quality', fixable: false, requiresTypeInfo: true, description: 'Require exhaustive switch' },
  'typedef': { type: 'maintainability', fixable: false, requiresTypeInfo: false, description: 'Require type annotations' },
};

// =============================================================================
// COMBINED EXPORT - All TypeScript-ESLint rules with @typescript-eslint prefix
// =============================================================================
export const ALL_TYPESCRIPT_ESLINT_RULES: Record<string, TypeScriptRuleDefinition> = {};

// Combine all rules and add @typescript-eslint/ prefix
const allRuleSets = [
  TS_RECOMMENDED_RULES,
  TS_TYPE_CHECKED_RULES,
  TS_STRICT_RULES,
  TS_STRICT_TYPE_CHECKED_RULES,
  TS_STYLISTIC_RULES,
  TS_STYLISTIC_TYPE_CHECKED_RULES,
  TS_ADDITIONAL_RULES,
];

for (const ruleSet of allRuleSets) {
  for (const [rule, definition] of Object.entries(ruleSet)) {
    ALL_TYPESCRIPT_ESLINT_RULES[`@typescript-eslint/${rule}`] = definition;
  }
}

/**
 * Get statistics about TypeScript-ESLint rule coverage
 */
export function getTypeScriptESLintRuleStats(): {
  total: number;
  fixable: number;
  requiresTypeInfo: number;
  extendsBase: number;
  byCategory: Record<string, number>;
} {
  const stats = {
    total: 0,
    fixable: 0,
    requiresTypeInfo: 0,
    extendsBase: 0,
    byCategory: {} as Record<string, number>,
  };

  for (const rule of Object.values(ALL_TYPESCRIPT_ESLINT_RULES)) {
    stats.total++;
    if (rule.fixable) stats.fixable++;
    if (rule.requiresTypeInfo) stats.requiresTypeInfo++;
    if (rule.extendsBase) stats.extendsBase++;
    stats.byCategory[rule.type] = (stats.byCategory[rule.type] || 0) + 1;
  }

  return stats;
}

/**
 * Get the base ESLint rule that a TypeScript-ESLint rule extends
 */
export function getBaseRule(tsRule: string): string | undefined {
  const rule = ALL_TYPESCRIPT_ESLINT_RULES[tsRule];
  return rule?.extendsBase;
}
