/**
 * DeepWiki Model Configurations
 * Manages model performance metrics and configurations
 */

import { createLogger } from '@codequal/core/utils';

const logger = createLogger('deepwiki-model-configurations');

export interface ModelPerformanceMetrics {
  averageDuration: number;
  successRate: number;
  averageIssuesFound: number;
  lastUpdated: Date;
}

export class DeepWikiModelConfig {
  private performanceMetrics: Map<string, ModelPerformanceMetrics> = new Map();
  
  async updatePerformanceMetrics(
    language: string,
    repositorySize: string,
    duration: number,
    issuesFound: number,
    success: boolean
  ): Promise<void> {
    const key = `${language}-${repositorySize}`;
    const existing = this.performanceMetrics.get(key) || {
      averageDuration: 0,
      successRate: 0,
      averageIssuesFound: 0,
      lastUpdated: new Date()
    };
    
    // Update metrics with rolling average
    const count = existing.successRate > 0 ? 10 : 1; // Assume 10 previous runs
    existing.averageDuration = (existing.averageDuration * count + duration) / (count + 1);
    existing.averageIssuesFound = (existing.averageIssuesFound * count + issuesFound) / (count + 1);
    existing.successRate = success ? (existing.successRate * count + 1) / (count + 1) : existing.successRate * count / (count + 1);
    existing.lastUpdated = new Date();
    
    this.performanceMetrics.set(key, existing);
    
    logger.debug('Updated performance metrics', {
      key,
      metrics: existing
    });
  }
  
  getPerformanceMetrics(language: string, repositorySize: string): ModelPerformanceMetrics | null {
    return this.performanceMetrics.get(`${language}-${repositorySize}`) || null;
  }
  
  async getModelConfiguration(language: string, repositorySize: string): Promise<any> {
    // For now, return null to use Vector DB lookup
    // In a real implementation, this would return pre-researched configurations
    return null;
  }
}

export const deepWikiModelConfig = new DeepWikiModelConfig();