/**
 * Framework Configurations Index
 *
 * Central export for all framework-specific configurations.
 * Add new frameworks here as they're supported.
 */

// Framework configs
export { NESTJS_CONFIG, isNestJSIntentionalUse, shouldFilterForNestJS, getNestJSEnvironmentFixes } from './nestjs-config';
export { EXPRESS_CONFIG, isExpressIntentionalUse } from './express-config';
export { REACT_CONFIG, isReactIntentionalUse } from './react-config';
export { SPRING_BOOT_CONFIG, isSpringBootIntentionalUse } from './spring-boot-config';

// Types
export type { FrameworkConfig, IntentionalPattern, FilterRule, EnvironmentRequirement, FrameworkFixStrategy } from '../types/framework-issue-types';

// Framework type
import type { Framework, FrameworkConfig } from '../types/framework-issue-types';
import { NESTJS_CONFIG } from './nestjs-config';
import { EXPRESS_CONFIG } from './express-config';
import { REACT_CONFIG } from './react-config';
import { SPRING_BOOT_CONFIG } from './spring-boot-config';

/**
 * Registry of all framework configurations
 */
export const FRAMEWORK_CONFIGS: Partial<Record<Framework, FrameworkConfig>> = {
  nestjs: NESTJS_CONFIG,
  express: EXPRESS_CONFIG,
  react: REACT_CONFIG,
  'spring-boot': SPRING_BOOT_CONFIG,
};

/**
 * Get configuration for a framework
 */
export function getFrameworkConfig(framework: Framework): FrameworkConfig | undefined {
  return FRAMEWORK_CONFIGS[framework];
}

/**
 * Check if a framework has configuration
 */
export function hasFrameworkConfig(framework: Framework): boolean {
  return framework in FRAMEWORK_CONFIGS;
}

/**
 * List all configured frameworks
 */
export function getConfiguredFrameworks(): Framework[] {
  return Object.keys(FRAMEWORK_CONFIGS) as Framework[];
}
