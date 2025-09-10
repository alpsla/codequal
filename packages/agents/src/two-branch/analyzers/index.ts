/**
 * V9 Analyzers Public API
 * 
 * ⚠️ IMPORTANT: This is the ONLY file you should import from the analyzers directory
 * 
 * DO NOT import individual analyzer files directly
 * DO NOT import base classes directly  
 * DO NOT import old/deprecated versions
 * 
 * @example
 * ```typescript
 * import { V9AnalyzerFactory, V9ReportFormatter, V9PRCommentGenerator } from '@/two-branch/analyzers';
 * 
 * const analyzer = V9AnalyzerFactory.create('java');
 * const result = await analyzer.analyzePR(repoUrl, prNumber);
 * 
 * const formatter = new V9ReportFormatter();
 * const report = await formatter.generateReport(result, 'Java');
 * ```
 */

// Factory - ALWAYS use this to create analyzers
export { V9AnalyzerFactory, type SupportedLanguage } from './v9-analyzer-factory';

// Report Generation - Use the COMPLETE versions
export { V9ReportFormatterComplete as V9ReportFormatter } from './v9-report-formatter-complete';
export { V9PRCommentGenerator } from './v9-pr-comment-generator';

// Core Types
export * from './v9-types';

// Utilities (only if needed directly)
export { V9ScoringCalculator } from './v9-scoring-calculator';
export { V9IssueComparator } from './v9-issue-comparator';
export { V9BusinessImpact } from './v9-business-impact';
export { V9EducationalResources } from './v9-educational-resources';
export { V9RepositoryManager } from './v9-repository-manager';

// Version information
export const V9_VERSION = '9.0.0';
export const V9_RELEASE_DATE = '2025-09-10';