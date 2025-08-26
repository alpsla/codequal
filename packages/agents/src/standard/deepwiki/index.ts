/**
 * DeepWiki Module - Main exports
 */

// Services
// Archived: DeepWikiClient - replaced by DirectDeepWikiApiWithLocation
// export { DeepWikiClient, DeepWikiService, IDeepWikiService, createDeepWikiService } from './services/deepwiki-client';
// Archived: DeepWikiRepositoryAnalyzer - uses outdated parser approach
// export { 
//   DeepWikiRepositoryAnalyzer,
//   ModelConfig,
//   ModelPreferences,
//   RepositoryAnalysisOptions,
//   RepositoryAnalysisResult,
//   CodeIssue 
// } from './services/deepwiki-repository-analyzer';
export { DeepWikiContextManager } from './services/deepwiki-context-manager';
export { DeepWikiChatService } from './services/deepwiki-chat-service';
// Archived: DeepWikiResponseParser, parseDeepWikiResponse - using direct DeepWiki API with location finder instead
// Archived: TwoPassAnalyzer - uses outdated parser approach
// export { TwoPassAnalyzer } from './services/two-pass-analyzer';
export { 
  ArchitectureVisualizer,
  ArchitectureDiagram,
  ArchitectureComponent,
  ComponentRelationship,
  ArchitectureAnalysis,
  ArchitecturePattern,
  ArchitectureAntiPattern,
  ArchitectureRecommendation,
  ArchitectureMetrics
} from './services/architecture-visualizer';
export { DeepWikiCacheManager } from './services/deepwiki-cache-manager';
// Archived: DeepWikiApiWrapper - duplicate functionality

// Interfaces
export * from './interfaces/deepwiki.interface';
export * from './interfaces/context.interface';
export * from './interfaces/chat.interface';
export * from './interfaces/analysis.interface';

// Config
export * from './config/prompt-templates';