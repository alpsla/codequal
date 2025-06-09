import { AgentRole } from '@codequal/core/config/agent-registry';
import { VectorSearchResult, RepositoryVectorContext } from '@codequal/agents/multi-agent/enhanced-executor';
import { AuthenticatedUser } from '@codequal/agents/multi-agent/types';

/**
 * Mock Vector Context Service for integration tests
 * Simplifies the real VectorContextService for testing purposes
 */
export class VectorContextService {
  private supabase: any;

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  async getRepositoryContext(
    repositoryId: string,
    agentRole: string,
    authenticatedUser: AuthenticatedUser,
    options: {
      maxResults?: number;
      minSimilarity?: number;
      includeHistorical?: boolean;
    } = {}
  ): Promise<RepositoryVectorContext> {
    // Mock implementation - returns sample data
    const mockResults: VectorSearchResult[] = [
      {
        content: `Mock ${agentRole} analysis for ${repositoryId}`,
        metadata: {
          repository_id: repositoryId,
          content_type: 'analysis',
          analysis_type: agentRole,
          severity: 'medium',
          importance_score: 0.8,
          created_at: new Date().toISOString()
        },
        similarity_score: 0.85
      }
    ];

    return {
      repositoryId,
      recentAnalysis: mockResults,
      historicalPatterns: options.includeHistorical ? mockResults : [],
      similarIssues: [],
      confidenceScore: 0.85,
      lastUpdated: new Date()
    };
  }

  async getCrossRepositoryPatterns(
    agentRole: string,
    searchQuery: string,
    authenticatedUser: AuthenticatedUser,
    options: {
      maxResults?: number;
      excludeRepositoryId?: string;
      respectUserPermissions?: boolean;
      sanitizeContent?: boolean;
      anonymizeMetadata?: boolean;
    } = {}
  ): Promise<VectorSearchResult[]> {
    // Mock implementation - returns sanitized cross-repo patterns
    return [
      {
        content: `Pattern: ${searchQuery} found in multiple repositories`,
        metadata: {
          repository_id: '[EXTERNAL_REPO]',
          content_type: 'cross_repo_pattern',
          analysis_type: agentRole,
          severity: 'high',
          importance_score: 0.9,
          created_at: new Date().toISOString()
        },
        similarity_score: 0.9
      }
    ];
  }

  async storeAnalysisResults(
    repositoryId: string,
    analysisResults: any[],
    userId: string
  ): Promise<void> {
    // Mock implementation - simulates storing results
    console.log(`Storing ${analysisResults.length} results for ${repositoryId}`);
  }
}
