/**
 * DeepWiki Module - Main exports
 */

// Services
export { DeepWikiClient, DeepWikiService, IDeepWikiService, createDeepWikiService } from './services/deepwiki-client';
export { 
  DeepWikiRepositoryAnalyzer,
  ModelConfig,
  ModelPreferences,
  RepositoryAnalysisOptions,
  RepositoryAnalysisResult,
  CodeIssue 
} from './services/deepwiki-repository-analyzer';
export { DeepWikiContextManager } from './services/deepwiki-context-manager';
export { DeepWikiChatService } from './services/deepwiki-chat-service';
export { DeepWikiResponseParser, parseDeepWikiResponse } from './services/deepwiki-response-parser';
export { TwoPassAnalyzer } from './services/two-pass-analyzer';
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
export { DeepWikiApiWrapper, MockDeepWikiApiWrapper } from './services/deepwiki-api-wrapper';

// Interfaces
export * from './interfaces/deepwiki.interface';
export * from './interfaces/context.interface';
export * from './interfaces/chat.interface';
export * from './interfaces/analysis.interface';

// Config
export * from './config/prompt-templates';