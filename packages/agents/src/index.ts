/**
 * CodeQual Agents Package
 *
 * Main export file for agent functionality
 */

// Export multi-agent compatibility stubs
export * from './multi-agent';

// Export factory and enums
export { AgentFactory, AgentProvider, AgentRole } from './factory';

// Export services
export { ReportFormatterService } from './services/report-formatter.service';
export { RecommendationService } from './services/recommendation-service';
export { EducationalCompilationService } from './services/educational-compilation-service';
export { SkillTrackingService } from './services/skill-tracking-service';
export { IssueResolutionDetector } from './services/issue-resolution-detector';
export { ModelTokenTracker, TokenUsageSummary } from './services/model-token-tracker';

// Mock exports for compatibility
export const EnhancedMultiAgentExecutor = class {
  constructor() {
    console.log('EnhancedMultiAgentExecutor: Legacy stub');
  }
};

export enum AnalysisStrategy {
  STANDARD = 'standard',
  ENHANCED = 'enhanced'
}

export enum AgentPosition {
  PRIMARY = 'primary',
  SECONDARY = 'secondary'
}

export enum ReportFormat {
  HTML = 'html',
  JSON = 'json',
  MARKDOWN = 'markdown'
}

export const ReporterAgent = class {
  constructor() {
    console.log('ReporterAgent: Legacy stub');
  }
};

// Re-export the REAL StandardReport from report-formatter.service
// Do NOT define a stub here - it shadows the real interface!
export type { StandardReport } from './services/report-formatter.service';

// Temporarily commented out two-branch exports due to build issues
// These need to be re-enabled after fixing missing dependencies in two-branch

/*
// Export the main V9 framework
export { V9AnalyzerFramework as CodeQualAnalyzer } from './two-branch/analyzers/v9-analyzer-framework';
export { V9BaseAnalyzer } from './two-branch/analyzers/v9-base-analyzer';

// Export all 11 language-specific analyzers
export { V9JavaAnalyzer } from './two-branch/analyzers/v9-java-analyzer';
export { V9PythonAnalyzer } from './two-branch/analyzers/v9-python-analyzer';
export { V9JavaScriptAnalyzer } from './two-branch/analyzers/v9-javascript-analyzer';
export { V9GoAnalyzer } from './two-branch/analyzers/v9-go-analyzer';
export { V9RustAnalyzer } from './two-branch/analyzers/v9-rust-analyzer';
export { V9RubyAnalyzer } from './two-branch/analyzers/v9-ruby-analyzer';
export { V9PHPAnalyzer } from './two-branch/analyzers/v9-php-analyzer';
export { V9CSharpAnalyzer } from './two-branch/analyzers/v9-csharp-analyzer';
export { V9CPPAnalyzer } from './two-branch/analyzers/v9-cpp-analyzer';
export { V9CAnalyzer } from './two-branch/analyzers/v9-c-analyzer';
export { V9SwiftAnalyzer } from './two-branch/analyzers/v9-swift-analyzer';
export { V9KotlinAnalyzer } from './two-branch/analyzers/v9-kotlin-analyzer';

// Export types
export * from './two-branch/analyzers/v9-types';

// Export utilities
export { getRepoManager, getFileSelector } from './two-branch/utils/repository-utils-factory';
*/

// Export other working modules
export * from './standard/utils';
export * from './types';

// Session validator
// export { validateImplementation } from './session-validator';

console.log('CodeQual Agents Package Loaded - Two-branch temporarily disabled for build fixes');