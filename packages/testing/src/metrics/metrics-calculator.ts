import { AnalysisResult } from '@codequal/core/types/agent';

/**
 * Metrics result interface
 */
export interface MetricsResult {
  issueDetectionRate?: number;
  insightCount?: number;
  falsePositiveRate?: number;
  explanationQuality?: number;
  educationalValue?: number;
  suggestionCount?: number;
  [key: string]: number | undefined;
}

/**
 * Metrics configuration
 */
export interface MetricsConfig {
  /**
   * Track issue detection rate
   */
  issueDetection: boolean;
  
  /**
   * Track false positive rate
   */
  falsePositiveRate: boolean;
  
  /**
   * Track explanation quality
   */
  explanationQuality: boolean;
  
  /**
   * Track educational value
   */
  educationalValue: boolean;
  
  /**
   * Track response time
   */
  responseTime: boolean;
  
  /**
   * Track token usage
   */
  tokenUsage: boolean;
}

/**
 * Calculator for agent performance metrics
 */
export class MetricsCalculator {
  /**
   * Metrics configuration
   */
  private config: MetricsConfig;
  
  /**
   * @param config Metrics configuration
   */
  constructor(config: MetricsConfig) {
    this.config = config;
  }
  
  /**
   * Calculate metrics for analysis results
   * @param roleResults Analysis results by role
   * @returns Calculated metrics
   */
  calculateMetrics(roleResults: Record<string, AnalysisResult>): MetricsResult {
    const metrics: MetricsResult = {};
    
    // Calculate each enabled metric
    if (this.config.issueDetection) {
      metrics.issueDetectionRate = this.calculateIssueDetectionRate(roleResults);
      metrics.insightCount = this.countInsights(roleResults);
    }
    
    if (this.config.falsePositiveRate) {
      metrics.falsePositiveRate = this.estimateFalsePositiveRate(roleResults);
    }
    
    if (this.config.explanationQuality) {
      metrics.explanationQuality = this.evaluateExplanationQuality(roleResults);
    }
    
    if (this.config.educationalValue) {
      metrics.educationalValue = this.evaluateEducationalValue(roleResults);
    }
    
    // Add suggestion count metric
    metrics.suggestionCount = this.countSuggestions(roleResults);
    
    return metrics;
  }
  
  /**
   * Calculate issue detection rate
   * @param roleResults Analysis results by role
   * @returns Issue detection rate
   */
  private calculateIssueDetectionRate(roleResults: Record<string, AnalysisResult>): number {
    // In a real implementation, this would compare with known issues
    // For demonstration purposes, we'll use a heuristic based on the number of insights
    const totalInsights = this.countInsights(roleResults);
    
    // Normalize to a 0-1 scale with a soft cap at 20 insights
    return Math.min(totalInsights / 20, 1);
  }
  
  /**
   * Count insights
   * @param roleResults Analysis results by role
   * @returns Total insight count
   */
  private countInsights(roleResults: Record<string, AnalysisResult>): number {
    let totalInsights = 0;
    
    // Count unique insights across all roles
    const seenInsights = new Set<string>();
    
    for (const result of Object.values(roleResults)) {
      for (const insight of result.insights || []) {
        const insightKey = `${insight.type}-${insight.message}`;
        if (!seenInsights.has(insightKey)) {
          seenInsights.add(insightKey);
          totalInsights++;
        }
      }
    }
    
    return totalInsights;
  }
  
  /**
   * Count suggestions
   * @param roleResults Analysis results by role
   * @returns Total suggestion count
   */
  private countSuggestions(roleResults: Record<string, AnalysisResult>): number {
    let totalSuggestions = 0;
    
    // Count unique suggestions across all roles
    const seenSuggestions = new Set<string>();
    
    for (const result of Object.values(roleResults)) {
      for (const suggestion of result.suggestions || []) {
        const suggestionKey = `${suggestion.file}-${suggestion.line}-${suggestion.suggestion}`;
        if (!seenSuggestions.has(suggestionKey)) {
          seenSuggestions.add(suggestionKey);
          totalSuggestions++;
        }
      }
    }
    
    return totalSuggestions;
  }
  
  /**
   * Estimate false positive rate
   * @param roleResults Analysis results by role
   * @returns Estimated false positive rate
   */
  private estimateFalsePositiveRate(roleResults: Record<string, AnalysisResult>): number {
    // In a real implementation, this would compare with known issues
    // For demonstration purposes, we'll use a simple heuristic
    
    // We'll assume that insights with more details (location, file) are more likely to be true positives
    let detailedInsights = 0;
    let totalInsights = 0;
    
    for (const result of Object.values(roleResults)) {
      for (const insight of result.insights || []) {
        totalInsights++;
        
        if (insight.location && insight.location.file) {
          detailedInsights++;
        }
      }
    }
    
    if (totalInsights === 0) {
      return 0;
    }
    
    // Estimate false positive rate as the proportion of insights without detailed location
    return 1 - (detailedInsights / totalInsights);
  }
  
  /**
   * Evaluate explanation quality
   * @param roleResults Analysis results by role
   * @returns Explanation quality score (0-1)
   */
  private evaluateExplanationQuality(roleResults: Record<string, AnalysisResult>): number {
    // Check if educational content is available
    if (!roleResults['educational'] || 
        !roleResults['educational'].educational || 
        roleResults['educational'].educational.length === 0) {
      return 0;
    }
    
    const educational = roleResults['educational'].educational;
    
    // Calculate average explanation length as a proxy for quality
    let totalLength = 0;
    let count = 0;
    
    for (const content of educational) {
      totalLength += content.explanation.length;
      count++;
    }
    
    if (count === 0) {
      return 0;
    }
    
    const avgLength = totalLength / count;
    
    // Normalize to a 0-1 scale with a soft cap at 500 characters
    return Math.min(avgLength / 500, 1);
  }
  
  /**
   * Evaluate educational value
   * @param roleResults Analysis results by role
   * @returns Educational value score (0-1)
   */
  private evaluateEducationalValue(roleResults: Record<string, AnalysisResult>): number {
    // Check if educational content is available
    if (!roleResults['educational'] || 
        !roleResults['educational'].educational || 
        roleResults['educational'].educational.length === 0) {
      return 0;
    }
    
    const educational = roleResults['educational'].educational;
    
    // Calculate score based on number of resources and content breadth
    let resourceCount = 0;
    const topics = new Set<string>();
    
    for (const content of educational) {
      topics.add(content.topic);
      
      if (content.resources) {
        resourceCount += content.resources.length;
      }
    }
    
    // Calculate educational value score
    // 40% from topic diversity, 60% from resource count
    const topicScore = Math.min(topics.size / 5, 1) * 0.4;
    const resourceScore = Math.min(resourceCount / 10, 1) * 0.6;
    
    return topicScore + resourceScore;
  }
}