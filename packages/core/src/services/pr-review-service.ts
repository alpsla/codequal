// Import only types from other packages
import { AgentSelection, AgentProvider, AgentRole, DEFAULT_AGENTS } from '../config/agent-registry';
import type { AnalysisResult, Insight, Suggestion, EducationalContent } from '../types/agent';
import { SkillService } from './skill-service';
import { createLogger } from '../utils/logger';

// Import interfaces for external modules
interface AgentFactoryInterface {
  createAgent(role: AgentRole, provider: AgentProvider, config?: Record<string, unknown>): AgentInterface;
}

interface AgentInterface {
  analyze(data: unknown): Promise<AnalysisResult>;
}

// Define proper types instead of using 'any'
interface PRReviewData {
  id: string;
  prUrl: string;
  repositoryId: string;
  userId: string;
  prTitle?: string;
  prDescription?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface AnalysisResultData {
  id: string;
  prReviewId: string;
  role: string;
  provider: string;
  insights: Insight[];
  suggestions: Suggestion[];
  educational: EducationalContent[];
  metadata?: Record<string, unknown>;
  executionTime: number;
  createdAt: Date;
}

interface PRReviewModelInterface {
  create(prUrl: string, repositoryId: string, userId: string): Promise<{ id: string }>;
  update(id: string, data: Record<string, unknown>): Promise<void>;
  storeAnalysisResult(prReviewId: string, role: AgentRole, provider: AgentProvider, result: AnalysisResult, executionTime: number): Promise<void>;
  storeCombinedResult(prReviewId: string, result: AnalysisResult): Promise<void>;
  getById(id: string): Promise<PRReviewData>;
  getAnalysisResults(prReviewId: string): Promise<AnalysisResultData[]>;
  getCombinedResult(prReviewId: string): Promise<AnalysisResult | null>;
  getByUserId(userId: string): Promise<PRReviewData[]>;
}

interface RepositoryModelInterface {
  findOrCreate(provider: string, name: string, url: string): Promise<{ id: string }>;
}

// Import implementations (to be injected in a production environment)
// In a real application, you would use dependency injection
/* eslint-disable @typescript-eslint/no-var-requires */
const AgentFactory: AgentFactoryInterface = require('../../../agents/src/factory/agent-factory').AgentFactory;
const PRReviewModel: PRReviewModelInterface = require('../../../database/src/models/pr-review').PRReviewModel;
const RepositoryModel: RepositoryModelInterface = require('../../../database/src/models/repository').RepositoryModel;
/* eslint-enable @typescript-eslint/no-var-requires */

/**
 * Service for managing PR reviews
 */
export class PRReviewService {
  private skillService: SkillService;
  private logger = createLogger('PRReviewService');
  
  constructor() {
    this.skillService = new SkillService();
  }
  
  /**
   * Analyze a PR using the specified agent configuration
   * @param prUrl PR URL
   * @param userId User ID
   * @param agentSelection Agent selection configuration
   * @returns Analysis results
   */
  async analyzePR(
    prUrl: string,
    userId: string,
    agentSelection: AgentSelection = DEFAULT_AGENTS
  ): Promise<{
    prReviewId: string;
    analysisResults: Record<AgentRole, AnalysisResult>;
    combinedResult: AnalysisResult;
  }> {
    try {
      // 1. Extract repository information from PR URL
      const repoInfo = this.extractRepositoryInfo(prUrl);
      
      // 2. Find or create repository
      const repository = await RepositoryModel.findOrCreate(
        repoInfo.provider,
        repoInfo.name,
        repoInfo.url
      );
      
      // 3. Create PR review record
      const prReview = await PRReviewModel.create(
        prUrl,
        repository.id,
        userId
      );
      
      // 4. Create orchestrator agent to fetch PR data
      const orchestrator = AgentFactory.createAgent(
        AgentRole.ORCHESTRATOR,
        agentSelection[AgentRole.ORCHESTRATOR],
        {}
      );
      
      // 5. Fetch PR data
      this.logger.info(`Fetching data for PR: ${prUrl}`);
      const startOrchestrationTime = Date.now();
      const prData = await orchestrator.analyze({ url: prUrl });
      const orchestrationTime = Date.now() - startOrchestrationTime;
      
      // 6. Update PR review with metadata
      await PRReviewModel.update(prReview.id, {
        prTitle: prData.metadata?.title,
        prDescription: prData.metadata?.description
      });
      
      // 7. Store orchestrator result
      await PRReviewModel.storeAnalysisResult(
        prReview.id,
        AgentRole.ORCHESTRATOR,
        agentSelection[AgentRole.ORCHESTRATOR],
        prData,
        orchestrationTime
      );
      
      // 8. Analyze PR with each specialized agent
      const analysisResults: Record<AgentRole, AnalysisResult> = {
        [AgentRole.ORCHESTRATOR]: prData
      } as Record<AgentRole, AnalysisResult>;
      
      // Run all specialized agents in parallel for efficiency
      const analysisPromises = Object.values(AgentRole)
        .filter(role => role !== AgentRole.ORCHESTRATOR)
        .map(async (role) => {
          try {
            const agent = AgentFactory.createAgent(
              role,
              agentSelection[role],
              {}
            );
            
            this.logger.info(`Analyzing PR with ${role} agent (${agentSelection[role]})`);
            const startTime = Date.now();
            const result = await agent.analyze(prData);
            const executionTime = Date.now() - startTime;
            
            // Store result
            await PRReviewModel.storeAnalysisResult(
              prReview.id,
              role,
              agentSelection[role],
              result,
              executionTime
            );
            
            return { role, result };
          } catch (error) {
            this.logger.error(`Error analyzing PR with ${role} agent:`, error instanceof Error ? error : String(error));
            // Return empty result for this agent
            return { 
              role, 
              result: {
                insights: [],
                suggestions: [],
                educational: [],
                metadata: {
                  error: true,
                  message: error instanceof Error ? error.message : String(error)
                }
              }
            };
          }
        });
      
      // Wait for all analyses to complete
      const analysisResults2 = await Promise.all(analysisPromises);
      
      // Add results to the record
      for (const { role, result } of analysisResults2) {
        analysisResults[role] = result;
      }
      
      // 9. Combine results
      const combinedResult = this.combineResults(analysisResults);
      
      // 10. Store combined result
      await PRReviewModel.storeCombinedResult(
        prReview.id,
        combinedResult
      );
      
      // 11. Update user skills based on analysis results
      await this.skillService.updateUserSkills(
        userId,
        combinedResult,
        prReview.id
      );
      
      // 12. Return results
      return {
        prReviewId: prReview.id,
        analysisResults,
        combinedResult
      };
    } catch (error) {
      this.logger.error('Error analyzing PR:', error instanceof Error ? error : String(error));
      throw error;
    }
  }
  
  /**
   * Extract repository information from PR URL
   * @param prUrl PR URL
   * @returns Repository information
   */
  private extractRepositoryInfo(prUrl: string): {
    provider: string;
    name: string;
    url: string;
  } {
    // GitHub PR URL pattern: https://github.com/owner/repo/pull/123
    const githubPattern = /https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/\d+/;
    const githubMatch = prUrl.match(githubPattern);
    
    if (githubMatch) {
      const owner = githubMatch[1];
      const repo = githubMatch[2];
      return {
        provider: 'github',
        name: `${owner}/${repo}`,
        url: `https://github.com/${owner}/${repo}`
      };
    }
    
    // GitLab PR URL pattern: https://gitlab.com/owner/repo/-/merge_requests/123
    const gitlabPattern = /https:\/\/gitlab\.com\/([^/]+)\/([^/]+)\/-\/merge_requests\/\d+/;
    const gitlabMatch = prUrl.match(gitlabPattern);
    
    if (gitlabMatch) {
      const owner = gitlabMatch[1];
      const repo = gitlabMatch[2];
      return {
        provider: 'gitlab',
        name: `${owner}/${repo}`,
        url: `https://gitlab.com/${owner}/${repo}`
      };
    }
    
    throw new Error(`Unsupported PR URL format: ${prUrl}`);
  }
  
  /**
   * Combine results from different agents
   * @param results Analysis results from different agents
   * @returns Combined analysis result
   */
  private combineResults(results: Record<AgentRole, AnalysisResult>): AnalysisResult {
    // Initialize combined result
    const combined: AnalysisResult = {
      insights: [],
      suggestions: [],
      educational: []
    };
    
    // Track seen insights and suggestions to avoid duplicates
    const seenInsights = new Set<string>();
    const seenSuggestions = new Set<string>();
    
    // Process each role's results
    for (const [role, result] of Object.entries(results)) {
      // Add insights with deduplication
      for (const insight of result.insights || []) {
        const insightKey = `${insight.type}-${insight.message}`;
        if (!seenInsights.has(insightKey)) {
          seenInsights.add(insightKey);
          combined.insights.push({
            ...insight
            // Don't add source as it's not in the Insight type
          });
        }
      }
      
      // Add suggestions with deduplication
      for (const suggestion of result.suggestions || []) {
        const suggestionKey = `${suggestion.file}-${suggestion.line}-${suggestion.suggestion}`;
        if (!seenSuggestions.has(suggestionKey)) {
          seenSuggestions.add(suggestionKey);
          combined.suggestions.push({
            ...suggestion
            // Don't add source as it's not in the Suggestion type
          });
        }
      }
      
      // Add educational content
      // For educational content, we specifically want the content from the EDUCATIONAL role
      if (role === AgentRole.EDUCATIONAL && result.educational) {
        combined.educational = result.educational;
      }
    }
    
    // Sort insights by severity (high to low)
    combined.insights.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity as keyof typeof severityOrder] - 
             severityOrder[b.severity as keyof typeof severityOrder];
    });
    
    return combined;
  }
  
  /**
   * Get PR review by ID
   * @param prReviewId PR review ID
   * @returns PR review with results
   */
  async getPRReview(prReviewId: string): Promise<{
    prReview: PRReviewData;
    analysisResults: Record<string, AnalysisResult>;
    combinedResult: AnalysisResult;
  }> {
    // Get PR review
    const prReview = await PRReviewModel.getById(prReviewId);
    
    // Get analysis results
    const analysisResultsList = await PRReviewModel.getAnalysisResults(prReviewId);
    
    // Group results by role
    const analysisResults: Record<string, AnalysisResult> = {};
    for (const result of analysisResultsList) {
      analysisResults[result.role] = {
        insights: result.insights,
        suggestions: result.suggestions,
        educational: result.educational,
        metadata: result.metadata
      };
    }
    
    // Get combined result
    const combinedResult = await PRReviewModel.getCombinedResult(prReviewId);
    
    if (!combinedResult) {
      throw new Error(`Combined result not found for PR review: ${prReviewId}`);
    }
    
    return {
      prReview,
      analysisResults,
      combinedResult
    };
  }
  
  /**
   * Get PR reviews by user
   * @param userId User ID
   * @returns PR reviews
   */
  async getUserPRReviews(userId: string): Promise<PRReviewData[]> {
    return PRReviewModel.getByUserId(userId);
  }
}