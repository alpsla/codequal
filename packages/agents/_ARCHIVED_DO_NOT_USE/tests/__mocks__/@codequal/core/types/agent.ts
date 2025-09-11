/**
 * Mock agent types for testing
 */

/**
 * Core interface for all analysis agents
 */
export interface Agent {
  /**
   * Analyze PR data and return results
   * @param data PR data to analyze
   * @returns Analysis result
   */
  analyze(data: any): Promise<AnalysisResult>;
}

/**
 * Standard format for analysis results
 */
export interface AnalysisResult {
  /**
   * Insights from the analysis
   */
  insights: Insight[];
  
  /**
   * Suggestions for improvement
   */
  suggestions: Suggestion[];
  
  /**
   * Educational content (optional)
   */
  educational?: EducationalContent[];
  
  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Represents an insight or issue found during analysis
 */
export interface Insight {
  /**
   * Type of insight (e.g., security, performance)
   */
  type: string;
  
  /**
   * Severity level
   */
  severity: 'high' | 'medium' | 'low';
  
  /**
   * Description of the insight
   */
  message: string;
  
  /**
   * Location in code (optional)
   */
  location?: {
    file: string;
    line?: number;
  };
}

/**
 * Represents a suggestion for improvement
 */
export interface Suggestion {
  /**
   * File path
   */
  file: string;
  
  /**
   * Line number
   */
  line: number;
  
  /**
   * Suggestion text
   */
  suggestion: string;
  
  /**
   * Suggested code (optional)
   */
  code?: string;
}

/**
 * Educational content about an issue
 */
export interface EducationalContent {
  /**
   * Topic of the content
   */
  topic: string;
  
  /**
   * Explanation text
   */
  explanation: string;
  
  /**
   * Additional resources (optional)
   */
  resources?: Resource[];
  
  /**
   * Target skill level (optional)
   */
  skillLevel?: 'beginner' | 'intermediate' | 'advanced';
}

/**
 * External resource for learning
 */
export interface Resource {
  /**
   * Title of the resource
   */
  title: string;
  
  /**
   * URL to the resource
   */
  url: string;
  
  /**
   * Type of resource
   */
  type: 'article' | 'video' | 'documentation' | 'tutorial' | 'course' | 'book' | 'other';
}