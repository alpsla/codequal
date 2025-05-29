/**
 * Types and interfaces for the ingestion pipeline
 */

// Input source types
export type SourceType = 'deepwiki_analysis' | 'documentation' | 'pr_analysis' | 'manual' | 'repository_analysis';
export type ContentType = 'analysis' | 'documentation' | 'code' | 'mixed';

// DeepWiki report structure
export interface DeepWikiReport {
  repositoryUrl: string;
  repositoryName: string;
  analysisDate: Date;
  model: string;
  sections: {
    architecture: ArchitectureAnalysis;
    codeQuality: CodeQualityAnalysis;
    security: SecurityAnalysis;
    dependencies: DependencyAnalysis;
    performance: PerformanceAnalysis;
  };
  overallScore: number;
  metadata: AnalysisMetadata;
}

export interface ArchitectureAnalysis {
  score: number;
  summary: string;
  findings: AnalysisItem[];
  recommendations: string[];
}

export interface CodeQualityAnalysis {
  score: number;
  summary: string;
  findings: AnalysisItem[];
  metrics: {
    complexity: number;
    maintainability: number;
    testCoverage?: number;
  };
}

export interface SecurityAnalysis {
  score: number;
  summary: string;
  findings: AnalysisItem[];
  vulnerabilities: SecurityVulnerability[];
}

export interface DependencyAnalysis {
  score: number;
  summary: string;
  directDependencies: number;
  devDependencies: number;
  outdated: number;
  vulnerabilities: number;
  findings: AnalysisItem[];
}

export interface PerformanceAnalysis {
  score: number;
  summary: string;
  findings: AnalysisItem[];
  metrics: {
    bundleSize?: number;
    loadTime?: number;
    memoryUsage?: number;
  };
}

export interface AnalysisItem {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  filePath?: string;
  lineNumber?: number;
  codeExample?: string;
  recommendation?: string;
  beforeExample?: string;
  afterExample?: string;
  effort?: 'low' | 'medium' | 'high';
  tags: string[];
}

export interface SecurityVulnerability {
  id: string;
  cve?: string;
  package: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  fixAvailable: boolean;
}

export interface AnalysisMetadata {
  primaryLanguage: string;
  languages: Record<string, number>; // language -> percentage
  frameworks: string[];
  totalFiles: number;
  totalLines: number;
  analyzedFiles: number;
  processingTime: number;
  topics?: string[];
  issues?: IssueCount;
}

// Input source wrapper
export interface InputSource {
  type: SourceType;
  content: string | DeepWikiReport | DocumentationFile;
  metadata: SourceMetadata;
  repositoryId: string;
}

export interface DocumentationFile {
  path: string;
  type: 'markdown' | 'api' | 'readme' | 'guide';
  content: string;
  metadata: {
    lastModified: Date;
    author?: string;
    version?: string;
  };
}

export interface SourceMetadata {
  sourceId: string;
  timestamp: Date;
  version?: string;
  tags?: string[];
}

// Preprocessing output
export interface PreprocessedContent {
  cleanContent: string;
  metadata: ContentMetadata;
  structure: ContentStructure;
  codeBlocks: CodeBlock[];
  sourceType: SourceType;
  keyElements: KeyElement[];
}

export interface ContentMetadata {
  contentType: ContentType;
  length: number;
  language?: string;
  languages?: string[];
  primaryLanguage?: string;
  frameworks?: string[];
  topics: string[];
  keywords: string[];
  scores?: Record<string, number>;
  issues?: IssueCount;
  sections?: string[];
  codeExamples?: number;
}

export interface ContentStructure {
  sections: Section[];
  hierarchy: HierarchyNode[];
}

export interface Section {
  id: string;
  title: string;
  content: string;
  level: number;
  startIndex: number;
  endIndex: number;
  subsections?: Section[];
  items?: AnalysisItem[];
}

export interface HierarchyNode {
  id: string;
  title: string;
  level: number;
  children: HierarchyNode[];
}

export interface CodeBlock {
  id: string;
  language: string;
  content: string;
  startLine: number;
  endLine: number;
  filePath?: string;
  isComplete: boolean;
}

export interface KeyElement {
  type: 'issue' | 'improvement' | 'pattern' | 'metric';
  content: string;
  importance: 'critical' | 'high' | 'medium' | 'low';
  metadata?: Record<string, string | number | boolean>;
}

export interface IssueCount {
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

// Chunking output
export interface Chunk {
  id: string;
  content: string;
  type: 'section' | 'item' | 'group' | 'overview';
  level: number;
  metadata: ChunkMetadata;
  relationships: ChunkRelationship[];
}

export interface ChunkMetadata {
  sectionName?: string;
  subsectionName?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  language?: string;
  filePaths?: string[];
  lineNumbers?: number[];
  hasCode: boolean;
  hasBeforeAfter: boolean;
  actionable: boolean;
  chunkIndex: number;
  totalChunks: number;
  tokenCount?: number;
  tags: string[];
}

export interface ChunkRelationship {
  targetChunkId: string;
  type: 'parent' | 'child' | 'sibling' | 'reference';
  strength: number;
}

// Window context for sliding window
export interface WindowContext {
  before?: string;
  after?: string;
}

// Enhanced chunk with context
export interface EnhancedChunk extends Chunk {
  enhancedContent: string;
  windowContext: WindowContext;
  metadata: ChunkMetadata & {
    semanticTags: string[];
    codeReferences: {
      files: string[];
      functions: string[];
      classes: string[];
      imports: string[];
    };
    potentialQuestions: string[];
    contextWindow: {
      hasPrevious: boolean;
      hasNext: boolean;
      previousTokens: number;
      nextTokens: number;
    };
  };
}

export interface CodeReference {
  filePath: string;
  functionName?: string;
  className?: string;
  startLine?: number;
  endLine?: number;
}

// Processing options
export interface ProcessingOptions {
  chunkSize?: number;
  overlapSize?: number;
  embeddingModel?: string;
  batchSize?: number;
}

export interface ChunkingOptions {
  targetChunkSize: number;
  maxChunkSize: number;
  minChunkSize: number;
  overlapSize: number;
  preserveStructure: boolean;
  hierarchyLevels: number;
}

export interface EnhancementContext {
  repository: string;
  repositoryName?: string;
  language?: string;
  analysisType?: string;
  analysisDate?: Date;
}
