/**
 * DeepWiki Service Interface
 * 
 * Defines the contract for DeepWiki integration services
 */

export interface DeepWikiAnalysisRequest {
  repositoryUrl: string;
  prNumber: string;
  mainBranch?: string;
  prBranch?: string;
}

export interface DeepWikiAnalysisResponse {
  success: boolean;
  data?: any;
  error?: string;
  analysisId?: string;
}

export interface DeepWikiServiceInterface {
  /**
   * Analyze a pull request using DeepWiki
   */
  analyzePullRequest(request: DeepWikiAnalysisRequest): Promise<DeepWikiAnalysisResponse>;
  
  /**
   * Analyze a repository using DeepWiki
   */
  analyzeRepository(repositoryUrl: string, branch?: string): Promise<DeepWikiAnalysisResponse>;
  
  /**
   * Get analysis status
   */
  getAnalysisStatus(analysisId: string): Promise<{ status: string; data?: any }>;
  
  /**
   * Health check
   */
  healthCheck(): Promise<boolean>;
}