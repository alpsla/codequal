import { getSupabase } from '../supabase/client';
import { AgentProvider, AgentRole } from '@codequal/core/config/agent-registry';
import { AnalysisResult } from '@codequal/core/types/agent';

/**
 * Interface for PR review data
 */
export interface PRReview {
  id: string;
  prUrl: string;
  prTitle?: string;
  prDescription?: string;
  repositoryId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface for analysis result data
 */
export interface AnalysisResultRecord {
  id: string;
  prReviewId: string;
  role: string;
  provider: string;
  insights: any[];
  suggestions: any[];
  educational?: any[];
  metadata?: Record<string, any>;
  executionTimeMs?: number;
  tokenCount?: number;
  createdAt: Date;
}

/**
 * PR Review model for database operations
 */
export class PRReviewModel {
  /**
   * Create a new PR review
   * @param prUrl PR URL
   * @param repositoryId Repository ID
   * @param userId User ID
   * @param prTitle PR title (optional)
   * @param prDescription PR description (optional)
   * @returns Created PR review
   */
  static async create(
    prUrl: string,
    repositoryId: string,
    userId: string,
    prTitle?: string,
    prDescription?: string
  ): Promise<PRReview> {
    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from('pr_reviews')
      .insert({
        pr_url: prUrl,
        pr_title: prTitle,
        pr_description: prDescription,
        repository_id: repositoryId,
        user_id: userId
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(`Error creating PR review: ${error.message}`);
    }
    
    return this.mapToPRReview(data);
  }
  
  /**
   * Store analysis result
   * @param prReviewId PR review ID
   * @param role Agent role
   * @param provider Agent provider
   * @param result Analysis result
   * @param executionTimeMs Execution time in milliseconds
   * @param tokenCount Token count
   * @returns Created analysis result record
   */
  static async storeAnalysisResult(
    prReviewId: string,
    role: AgentRole,
    provider: AgentProvider,
    result: AnalysisResult,
    executionTimeMs?: number,
    tokenCount?: number
  ): Promise<AnalysisResultRecord> {
    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from('analysis_results')
      .insert({
        pr_review_id: prReviewId,
        role: role,
        provider: provider,
        insights: result.insights,
        suggestions: result.suggestions,
        educational: result.educational || [],
        metadata: result.metadata || {},
        execution_time_ms: executionTimeMs,
        token_count: tokenCount
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(`Error storing analysis result: ${error.message}`);
    }
    
    return this.mapToAnalysisResult(data);
  }
  
  /**
   * Store combined result
   * @param prReviewId PR review ID
   * @param result Combined analysis result
   * @returns Created combined result record
   */
  static async storeCombinedResult(
    prReviewId: string,
    result: AnalysisResult
  ): Promise<AnalysisResultRecord> {
    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from('combined_results')
      .insert({
        pr_review_id: prReviewId,
        insights: result.insights,
        suggestions: result.suggestions,
        educational: result.educational || [],
        metadata: result.metadata || {}
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(`Error storing combined result: ${error.message}`);
    }
    
    return {
      id: data.id,
      prReviewId: data.pr_review_id,
      role: 'combined',
      provider: 'combined',
      insights: data.insights,
      suggestions: data.suggestions,
      educational: data.educational,
      metadata: data.metadata,
      createdAt: new Date(data.created_at)
    };
  }
  
  /**
   * Get PR review by ID
   * @param id PR review ID
   * @returns PR review
   */
  static async getById(id: string): Promise<PRReview> {
    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from('pr_reviews')
      .select()
      .eq('id', id)
      .single();
    
    if (error) {
      throw new Error(`Error getting PR review: ${error.message}`);
    }
    
    return this.mapToPRReview(data);
  }
  
  /**
   * Get PR reviews by user ID
   * @param userId User ID
   * @returns PR reviews
   */
  static async getByUserId(userId: string): Promise<PRReview[]> {
    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from('pr_reviews')
      .select()
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(`Error getting PR reviews: ${error.message}`);
    }
    
    return data.map(this.mapToPRReview);
  }
  
  /**
   * Get analysis results for PR review
   * @param prReviewId PR review ID
   * @returns Analysis results
   */
  static async getAnalysisResults(prReviewId: string): Promise<AnalysisResultRecord[]> {
    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from('analysis_results')
      .select()
      .eq('pr_review_id', prReviewId)
      .order('created_at', { ascending: true });
    
    if (error) {
      throw new Error(`Error getting analysis results: ${error.message}`);
    }
    
    return data.map(this.mapToAnalysisResult);
  }
  
  /**
   * Get combined result for PR review
   * @param prReviewId PR review ID
   * @returns Combined result
   */
  static async getCombinedResult(prReviewId: string): Promise<AnalysisResult | null> {
    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from('combined_results')
      .select()
      .eq('pr_review_id', prReviewId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No records found
        return null;
      }
      throw new Error(`Error getting combined result: ${error.message}`);
    }
    
    return {
      insights: data.insights,
      suggestions: data.suggestions,
      educational: data.educational,
      metadata: data.metadata
    };
  }
  
  /**
   * Map database record to PR review
   * @param data Database record
   * @returns PR review
   */
  private static mapToPRReview(data: any): PRReview {
    return {
      id: data.id,
      prUrl: data.pr_url,
      prTitle: data.pr_title,
      prDescription: data.pr_description,
      repositoryId: data.repository_id,
      userId: data.user_id,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }
  
  /**
   * Map database record to analysis result
   * @param data Database record
   * @returns Analysis result record
   */
  private static mapToAnalysisResult(data: any): AnalysisResultRecord {
    return {
      id: data.id,
      prReviewId: data.pr_review_id,
      role: data.role,
      provider: data.provider,
      insights: data.insights,
      suggestions: data.suggestions,
      educational: data.educational,
      metadata: data.metadata,
      executionTimeMs: data.execution_time_ms,
      tokenCount: data.token_count,
      createdAt: new Date(data.created_at)
    };
  }
}