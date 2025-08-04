/**
 * Core types for analysis system
 */

export interface DeepWikiAnalysisResult {
  issues: Issue[];
  metadata?: {
    files_analyzed?: number;
    total_lines?: number;
    scan_duration?: number;
  };
  score?: number;
  summary?: string;
}

export interface Issue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'security' | 'performance' | 'code-quality' | 'architecture' | 'dependencies';
  type?: 'vulnerability' | 'bug' | 'code-smell' | 'optimization' | 'design-issue';
  location?: {
    file: string;
    line?: number;
    column?: number;
  };
  message: string;
  description?: string;
  suggestedFix?: string;
  references?: string[];
}

export interface RepositoryContext {
  repoType: string;
  language: string;
  sizeCategory: string;
  complexity: 'low' | 'medium' | 'high';
  issueCount: number;
  criticalIssueCount: number;
  filesAnalyzed: number;
  hasSecurityIssues: boolean;
  hasPerformanceIssues: boolean;
  fileTypes: Record<string, number>;
}

export interface ComparisonAnalysisRequest {
  mainBranchAnalysis: DeepWikiAnalysisResult;
  featureBranchAnalysis: DeepWikiAnalysisResult;
  prMetadata?: PRMetadata;
  userProfile?: any;
  teamProfiles?: any[];
  historicalIssues?: any[];
  generateReport?: boolean;
  includeEducation?: boolean;
  language?: string;
  sizeCategory?: string;
  userId: string;
  teamId?: string;
}

export interface PRMetadata {
  id?: string;
  number?: number;
  title?: string;
  description?: string;
  author?: string;
  created_at?: string;
  repository_url?: string;
  linesAdded?: number;
  linesRemoved?: number;
}

export interface AnalysisResult {
  issues: Issue[];
  recommendations?: string[];
  scores?: {
    overall: number;
    security: number;
    performance: number;
    maintainability: number;
    testing: number;
  };
  metadata?: any;
}

export interface ComparisonInput {
  mainBranchAnalysis: AnalysisResult;
  featureBranchAnalysis: AnalysisResult;
  prMetadata?: PRMetadata;
  userProfile?: any;
  teamProfiles?: any[];
  historicalIssues?: any[];
  generateReport?: boolean;
  includeEducation?: boolean;
}

export interface ComparisonConfig {
  language?: string;
  complexity?: string;
  performance?: string;
  sizeCategory?: string;
  role?: string;
  prompt?: string;
  rolePrompt?: string;
  qualityThreshold?: number;
  weights?: any;
}

export interface DeveloperSkills {
  userId: string;
  overallScore: number;
  categoryScores: {
    security: number;
    performance: number;
    codeQuality: number;
    architecture: number;
    testing: number;
  };
  level?: {
    current: string;
    progress: number;
  };
}

export interface ComparisonResult {
  success: boolean;
  report?: string;                    // Full markdown report
  prComment?: string;                 // Concise PR comment
  comparison?: {                      // Detailed comparison data
    resolvedIssues?: any[];
    newIssues?: any[];
    modifiedIssues?: any[];
    unchangedIssues?: any[];
    summary?: any;
    insights?: string[];
    recommendations?: string[];
  };
  analysis?: any;                     // Raw analysis data
  education?: EducationalEnhancements; // Optional course recommendations
  skillTracking?: any;               // Skill updates
  metadata?: {
    orchestratorVersion?: string;
    modelUsed?: any;
    configId?: string;
    repositoryContext?: RepositoryContext;
    timestamp?: Date;
    estimatedCost?: number;
    format?: 'markdown' | 'json';
    agentId?: string;
    agentVersion?: string;
    confidence?: number;
  };
  // Legacy fields for backward compatibility
  resolvedIssues?: any[];
  newIssues?: any[];
  modifiedIssues?: any[];
  unchangedIssues?: any[];
  summary?: any;
  insights?: string[];
  recommendations?: string[];
}

export interface ModelSelectionWeights {
  quality: number;
  speed: number;
  cost: number;
  recency: number;
}

export interface SkillProfile {
  userId: string;
  overallScore: number;
  categoryScores: {
    security: number;
    performance: number;
    codeQuality: number;
    architecture: number;
    dependencies: number;
  };
  level: string;
  lastUpdated: Date;
}

export interface EducationalEnhancements {
  courses: Course[];
  articles: Article[];
  videos: Video[];
  estimatedLearningTime: number;
  personalizedPath?: LearningPath;
}

export interface Course {
  title: string;
  provider: string;
  url: string;
  price?: string;
  duration: string;
  rating?: number;
  relevance: number;
  level: 'beginner' | 'intermediate' | 'advanced';
}

export interface Article {
  title: string;
  author?: string;
  url: string;
  readTime: string;
  source: string;
  relevance: number;
}

export interface Video {
  title: string;
  channel: string;
  url: string;
  duration: string;
  views?: number;
  relevance: number;
}

export interface LearningPath {
  totalDuration: string;
  steps: LearningStep[];
}

export interface LearningStep {
  order: number;
  resource: Course | Article | Video;
  reason: string;
}