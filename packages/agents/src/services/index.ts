// Export all skill tracking services
export { SkillTrackingService } from './skill-tracking-service';
export { PRSkillAssessmentService } from './pr-skill-assessment-service';
export { SkillIntegrationService } from './skill-integration-service';
export { SkillAwareRAGService } from './skill-aware-rag-service';

// Export existing services
export { RecommendationService } from './recommendation-service';
export { AgentResultProcessor } from './agent-result-processor';
export { BasicDeduplicator } from './basic-deduplicator';
export { EducationalCompilationService } from './educational-compilation-service';
export { IssueResolutionDetector, type IssueComparison } from './issue-resolution-detector';
export { ReportFormatterService, StandardReport } from './report-formatter.service';

// Export debug logger
export { DebugLogger, getDebugLogger } from './debug-logger';

// Export types
export type { 
  SkillAssessment, 
  SkillProgression, 
  LearningEngagement 
} from './skill-tracking-service';

export type { 
  PRMetadata, 
  PRSkillAssessmentResult 
} from './pr-skill-assessment-service';

export type { 
  SkillIntegrationResult 
} from './skill-integration-service';

export type { 
  SkillAwareQueryResult, 
  SkillAwareSearchResult 
} from './skill-aware-rag-service';

export type {
  DebugContext,
  ExecutionTrace
} from './debug-logger';