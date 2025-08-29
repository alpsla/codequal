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
  category: 'security' | 'performance' | 'code-quality' | 'architecture' | 'dependencies' | 'testing' | 'maintainability' | 'formatting' | 'style';
  type?: 'vulnerability' | 'bug' | 'code-smell' | 'optimization' | 'design-issue';
  location?: {
    file: string;
    line?: number;
    column?: number;
  };
  message: string;
  title?: string;
  description?: string;
  codeSnippet?: string;
  suggestedFix?: string;
  remediation?: string;
  references?: string[];
  age?: string;
  fingerprint?: string;
  rule?: string;
  metadata?: {
    rule?: string;
    cwe?: string;
    owasp?: string;
    confidence?: string;
    ruleSet?: string;
    [key: string]: any;
  };
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
  detectedLanguages?: Array<{name: string; percentage: number; files: number}>;
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
  repository?: string;  // Repository URL for language detection
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

// Import BreakingChange type for enhanced ComparisonResult
import { BreakingChange } from '../services/interfaces/diff-analyzer.interface';

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

export interface ComparisonRequest {
  repository: string;
  prNumber?: string;
  mainBranch?: string;
  prBranch: string;
  author?: {
    username: string;
    name?: string;
    email?: string;
  };
}

export interface IssueComparison {
  newIssues: Issue[];
  fixedIssues: Issue[];
  unchangedIssues: Issue[];
  summary: {
    totalNew: number;
    totalFixed: number;
    totalUnchanged: number;
    criticalNew: number;
    criticalFixed: number;
    criticalUnchanged: number;
  };
}

export interface ComparisonAgentInterface {
  compareRepositories(request: ComparisonRequest): Promise<ComparisonResult>;
  generateReport(comparison: ComparisonResult): Promise<string>;
}

export interface ComparisonResult {
  success: boolean;
  report?: string;                    // Full markdown report
  prComment?: string;                 // Concise PR comment
  
  // V8 Report Generator Expected Structure
  mainBranch?: {
    name?: string;
    issues: Issue[];
    metrics?: any;
  };
  prBranch?: {
    name?: string;
    issues: Issue[];
    metrics?: any;
  };
  
  // Direct issue arrays (alternative structure)
  resolvedIssues?: Issue[];
  newIssues?: Issue[];
  modifiedIssues?: Issue[];
  unchangedIssues?: Issue[];
  persistentIssues?: Issue[];
  addedIssues?: Issue[];
  fixedIssues?: Issue[];
  
  // Legacy comparison structure
  comparison?: {                      // Detailed comparison data
    resolvedIssues?: any[];
    newIssues?: any[];
    modifiedIssues?: any[];
    unchangedIssues?: any[];
    fixedIssues?: any[];
    summary?: any;
    insights?: string[];
    recommendations?: string[];
  };
  
  summary?: {
    totalResolved?: number;
    totalNew?: number;
    totalModified?: number;
    totalUnchanged?: number;
    overallAssessment?: any;
  };
  
  insights?: string[];
  recommendations?: string[];
  
  analysis?: any;                     // Raw analysis data
  aiAnalysis?: any;                   // AI analysis data
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
  // Additional fields for enhanced reporting
  repository?: string;
  prNumber?: string;
  overallScore?: number;
  categoryScores?: Record<string, number>;
  timestamp?: string;
  scanDuration?: string;
  filesChanged?: number;
  linesChanged?: number;
  linesAdded?: number;
  linesRemoved?: number;
  scoreImpact?: number;
  // Breaking changes from DiffAnalyzer
  breakingChanges?: BreakingChange[];
  diffAnalysis?: {
    usedDiffAnalysis: boolean;
    filesAnalyzed: number;
    confidence: number;
  };
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

export interface ReportConfig {
  includeMetadata?: boolean;
  includeSummary?: boolean;
  format?: 'markdown' | 'json' | 'html';
  showRecommendations?: boolean;
  showScores?: boolean;
}

export interface PRComment {
  file?: string;
  line?: number;
  body: string;
  position?: number;
}