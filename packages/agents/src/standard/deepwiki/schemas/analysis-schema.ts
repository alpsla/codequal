/**
 * JSON Schema validation for DeepWiki responses
 * BUG-048 FIX: Added comprehensive schema validation
 */

import { z } from 'zod';

// Issue schema
export const IssueSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  message: z.string().optional(),
  severity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  category: z.string().optional(),
  file: z.string().optional(),
  line: z.number().optional(),
  column: z.number().optional(),
  codeSnippet: z.string().optional(),
  location: z.object({
    file: z.string().optional(),
    line: z.number().optional(),
    column: z.number().optional()
  }).optional()
}).refine(
  data => data.title || data.description || data.message,
  { message: 'Issue must have at least title, description, or message' }
);

// Test coverage schema
export const TestCoverageSchema = z.object({
  overall: z.number().min(0).max(100).optional(),
  unit: z.number().min(0).max(100).optional(),
  integration: z.number().min(0).max(100).optional(),
  e2e: z.number().min(0).max(100).optional(),
  files: z.number().optional(),
  lines: z.number().optional(),
  functions: z.number().optional(),
  branches: z.number().optional()
});

// Dependencies schema
export const DependenciesSchema = z.object({
  total: z.number().optional(),
  outdated: z.array(z.object({
    name: z.string(),
    current: z.string().optional(),
    latest: z.string().optional(),
    type: z.enum(['major', 'minor', 'patch']).optional()
  })).optional(),
  vulnerable: z.array(z.object({
    name: z.string(),
    severity: z.enum(['critical', 'high', 'medium', 'low']),
    description: z.string().optional()
  })).optional()
});

// Architecture schema
export const ArchitectureSchema = z.object({
  patterns: z.array(z.string()).optional(),
  frameworks: z.array(z.string()).optional(),
  complexity: z.enum(['low', 'medium', 'high']).optional(),
  maintainability: z.number().min(0).max(100).optional()
});

// Team metrics schema
export const TeamMetricsSchema = z.object({
  contributors: z.number().optional(),
  commits: z.number().optional(),
  activeDays: z.number().optional(),
  lastCommit: z.string().optional()
});

// Documentation schema
export const DocumentationSchema = z.object({
  readme: z.boolean().optional(),
  api: z.boolean().optional(),
  comments: z.number().min(0).max(100).optional(),
  examples: z.boolean().optional()
});

// Scores schema
export const ScoresSchema = z.object({
  overall: z.number().min(0).max(100).optional(),
  security: z.number().min(0).max(100).optional(),
  performance: z.number().min(0).max(100).optional(),
  maintainability: z.number().min(0).max(100).optional(),
  reliability: z.number().min(0).max(100).optional()
});

// Complete analysis result schema
export const AnalysisResultSchema = z.object({
  issues: z.array(IssueSchema).optional().default([]),
  testCoverage: TestCoverageSchema.optional().default({}),
  dependencies: DependenciesSchema.optional().default({}),
  architecture: ArchitectureSchema.optional().default({}),
  teamMetrics: TeamMetricsSchema.optional().default({}),
  documentation: DocumentationSchema.optional().default({}),
  breakingChanges: z.array(IssueSchema).optional().default([]),
  scores: ScoresSchema.optional().default({})
});

// Configuration schema for adaptive analyzer
export const AnalyzerConfigSchema = z.object({
  deepwikiUrl: z.string().url(),
  deepwikiKey: z.string().optional(),
  maxIterations: z.number().min(3).max(10).default(3), // Min 3 iterations for stability
  timeout: z.number().min(10000).max(600000).default(300000),
  retryAttempts: z.number().min(0).max(5).default(3),
  minCompleteness: z.number().min(50).max(100).default(80),
  logger: z.any().optional()
});

// Export types
export type Issue = z.infer<typeof IssueSchema>;
export type TestCoverage = z.infer<typeof TestCoverageSchema>;
export type Dependencies = z.infer<typeof DependenciesSchema>;
export type Architecture = z.infer<typeof ArchitectureSchema>;
export type TeamMetrics = z.infer<typeof TeamMetricsSchema>;
export type Documentation = z.infer<typeof DocumentationSchema>;
export type Scores = z.infer<typeof ScoresSchema>;
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
export type AnalyzerConfig = z.infer<typeof AnalyzerConfigSchema>;

/**
 * Validate analysis result against schema
 * BUG-048: Ensure JSON responses meet expected format
 */
export function validateAnalysisResult(data: unknown): AnalysisResult {
  try {
    return AnalysisResultSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`Invalid analysis result format: ${issues}`);
    }
    throw error;
  }
}

/**
 * Validate configuration
 * BUG-050: Ensure configuration is properly validated
 */
export function validateConfig(config: unknown): AnalyzerConfig {
  try {
    return AnalyzerConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`Invalid configuration: ${issues}`);
    }
    throw error;
  }
}