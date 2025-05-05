import { AnalysisResult } from '@codequal/core';

/**
 * Base Agent interface for all types of agents.
 */
export interface Agent {
  /**
   * Analyze data and return insights, suggestions and recommendations.
   * @param data Data to analyze
   * @returns Analysis results
   */
  analyze(data: any): Promise<AnalysisResult>;
}