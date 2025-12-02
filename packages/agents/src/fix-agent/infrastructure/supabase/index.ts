/**
 * Supabase Infrastructure - Unified Export
 *
 * Exports database client and utilities for the fix system.
 */

// Database client for fetching tools, rules, and mappings
export {
  // Client and config
  ToolDatabaseClient,
  ToolDatabaseConfig,
  getToolDatabaseClient,
  // Convenience functions
  fetchTools,
  fetchToolsForLanguage,
  fetchFixerForIssue,
  updateToolVersion,
  // Error classes for handling database failures
  DatabaseUnavailableError,
  DatabaseConfigurationError,
} from './tool-database-client';

// Supabase Fix Router - Two-Tier Fix System with tool context
export {
  SupabaseFixRouter,
  getSupabaseFixRouter,
  // Types
  type SupportedLanguage,
  type IssueToRoute,
  type RoutedIssue,
  type ToolContext,
  type FixBatch,
  type RoutingResult,
} from './supabase-fix-router';
