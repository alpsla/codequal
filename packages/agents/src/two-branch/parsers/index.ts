/**
 * Two-Branch Parsers - Centralized Export
 *
 * Tool output parsing components
 *
 * Architecture (as of Session 57):
 * - UniversalToolParser: Original parser with partial implementations
 * - EnhancedUniversalToolParser: Complete implementations for all integrated tools
 * - ParserShadowMode: Safe transition utility for comparing parser outputs
 * - Language-specific parsers: Execute AND parse tools (used by orchestrators)
 */

// Universal parsers
export { UniversalToolParser } from './UniversalToolParser';
export type {
  StandardizedToolOutput,
  StandardizedIssue,
  FileAnalysis,
  CodeMetrics,
  DependencyInfo
} from './UniversalToolParser';

// Enhanced universal parser (Session 57)
export {
  EnhancedUniversalToolParser,
  type EnhancedParserOptions,
  type ParserComparison,
  type ParseContext
} from './enhanced-universal-tool-parser';

// Shadow mode for safe parser transition (Session 57)
export {
  ParserShadowMode,
  createShadowModeForOrchestrator,
  type ShadowModeResult,
  type ShadowModeConfig,
  type IssueDifference,
  type LegacyIssue
} from './parser-shadow-mode';

// Parser validation wrapper for orchestrators (Session 57)
export {
  ParserValidationWrapper,
  createParserValidationWrapper,
  validateParsing,
  type ParserValidationConfig,
  type ValidationResult,
  type ValidationStats
} from './parser-validation-wrapper';

// Language-specific tool parsers (execute AND parse)
export { default as RustToolParser } from './rust-tool-parser';
export type { RustIssue, RustToolResult } from './rust-tool-parser';

export { default as PythonToolParser } from './python-tool-parser';
export type { PythonIssue, PythonToolResult } from './python-tool-parser';

export { default as TypeScriptToolParser } from './typescript-tool-parser';
export type { TypeScriptIssue, TypeScriptToolResult } from './typescript-tool-parser';

export { default as GoToolParser } from './go-tool-parser';
export type { GoIssue, GoToolResult } from './go-tool-parser';