export interface DeepWikiConfig {
  /**
   * Kubernetes namespace where DeepWiki is deployed
   */
  namespace?: string;
  
  /**
   * Label selector for DeepWiki pods
   */
  podLabelSelector?: string;
  
  /**
   * Specific pod name to use (if known)
   */
  specificPodName?: string;
  
  /**
   * Default local port to use for port forwarding
   */
  localPort?: number;
  
  /**
   * Authentication token for DeepWiki
   */
  authToken?: string;
  
  /**
   * Default model to use for analysis
   */
  defaultModel?: string;
  
  /**
   * Whether to verify connections by checking the health endpoint
   * Defaults to true
   */
  verifyConnections?: boolean;
}

/**
 * Supported analysis tiers
 */
export type AnalysisTier = 'quick' | 'comprehensive' | 'targeted';

/**
 * Request for repository analysis
 */
export interface RepositoryAnalysisRequest {
  /**
   * Repository URL to analyze
   */
  repositoryUrl: string;
  
  /**
   * Repository name for reference
   */
  repositoryName: string;
  
  /**
   * Branch to analyze
   */
  branch?: string;
  
  /**
   * Analysis tier to perform
   */
  tier: AnalysisTier;
  
  /**
   * Files to include in the analysis
   * If not specified, all files will be included
   */
  includeFiles?: string[];
  
  /**
   * Patterns of files to exclude from analysis
   */
  excludePatterns?: string[];
  
  /**
   * Custom prompts for specific analysis aspects
   */
  customPrompts?: Record<string, string>;
  
  /**
   * Model to use for analysis
   */
  model?: string;
  
  /**
   * Callback for progress updates
   */
  progressCallback?: (progress: AnalysisProgress) => void;
}

/**
 * Progress update for repository analysis
 */
export interface AnalysisProgress {
  /**
   * Progress percentage (0-100)
   */
  progress: number;
  
  /**
   * Current analysis stage
   */
  stage: string;
  
  /**
   * Additional details about the current stage
   */
  details: string;
}

/**
 * Result of repository analysis
 */
export interface RepositoryAnalysisResult {
  /**
   * Repository name
   */
  repository: string;
  
  /**
   * Timestamp of analysis
   */
  analysisDate: string;
  
  /**
   * Type of analysis performed
   */
  analysisType: AnalysisTier;
  
  /**
   * Raw analysis results
   */
  results: any;
  
  /**
   * Scores for various aspects of the repository
   */
  scores: {
    /**
     * Overall repository score
     */
    overall: number;
    
    /**
     * Scores by category
     */
    categories: {
      /**
       * Architecture score
       */
      architecture: number;
      
      /**
       * Code quality score
       */
      codeQuality: number;
      
      /**
       * Security score
       */
      security: number;
      
      /**
       * Performance score
       */
      performance: number;
      
      /**
       * Dependencies score
       */
      dependencies: number;
    };
  };
}

/**
 * WebSocket message structure
 */
export interface WebSocketMessage {
  /**
   * Message type
   */
  type: string;
  
  /**
   * Message ID for correlation
   */
  id: string;
  
  /**
   * Message data
   */
  data: any;
}
