/**
 * Validators Module
 *
 * Provides validation utilities for AI-generated fixes.
 *
 * Session 89: Created for batch validation optimization
 *
 * Components:
 * - BatchValidator: Optimizes validation by grouping fixes by tool
 * - groupFixesByTool: Groups fixes for efficient batch processing
 * - batchValidate: Convenience function for batch validation
 */

// Batch validation
export {
  BatchValidator,
  BatchValidationRequest,
  BatchValidationItemResult,
  BatchValidationResult,
  BatchValidatorOptions,
  groupFixesByTool,
  groupFixesByToolAndRule,
  batchValidate,
  toBatchRequests,
  getBatchValidator,
  resetBatchValidator,
} from './batch-validator';

// Re-export core tool revalidator for convenience
export {
  ToolRevalidator,
  ToolRevalidationRequest,
  ToolRevalidationResult,
  ToolRevalidatorOptions,
  getToolRevalidator,
  createToolRevalidator,
  resetToolRevalidatorSingleton,
  checkToolAvailability,
} from '../fix-pattern-registry/tool-revalidator';
