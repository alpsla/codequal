import { createLogger } from '@codequal/core/utils';
import { getServiceClient } from './supabase-service-client';
import { DeepWikiAnalysisResult } from '../types/deepwiki';
import { TokenUsage } from '@codequal/agents';

const logger = createLogger('DeepWikiReportStorage');

export interface DeepWikiReportStorageOptions {
  analysisId: string;
  repositoryUrl: string;
  branch?: string;
  commitHash?: string;
  reportType: 'main' | 'feature' | 'comparison';
  tokenUsage?: TokenUsage;
}

export class DeepWikiReportStorage {
  /**
   * Store a DeepWiki report in Vector DB
   */
  async storeReport(
    report: DeepWikiAnalysisResult,
    options: DeepWikiReportStorageOptions
  ): Promise<{ id: number; success: boolean; error?: string }> {
    try {
      logger.info('Storing DeepWiki report', {
        analysisId: options.analysisId,
        repositoryUrl: options.repositoryUrl,
        branch: options.branch,
        reportType: options.reportType
      });

      const supabase = getServiceClient();
      if (!supabase) {
        throw new Error('Supabase service client not available');
      }
      
      const { data, error } = await supabase
        .from('deepwiki_reports')
        .insert({
          analysis_id: options.analysisId,
          repository_url: options.repositoryUrl,
          branch: options.branch,
          commit_hash: options.commitHash,
          report_type: options.reportType,
          issues: report.issues || [],
          recommendations: report.recommendations || [],
          scores: report.scores || {},
          metadata: {
            ...report.metadata,
            model_used: report.metadata?.model_used,
            analyzed_at: report.metadata?.analyzed_at || new Date().toISOString()
          },
          statistics: report.statistics,
          quality: report.quality,
          testing: report.testing,
          token_usage: options.tokenUsage,
          analyzed_at: report.metadata?.analyzed_at || new Date()
        })
        .select('id')
        .single();

      if (error) {
        logger.error('Failed to store DeepWiki report', { error });
        return { id: 0, success: false, error: error.message };
      }

      logger.info('Successfully stored DeepWiki report', { 
        reportId: data.id,
        analysisId: options.analysisId 
      });

      return { id: data.id, success: true };
    } catch (error) {
      logger.error('Error storing DeepWiki report', { error });
      return { 
        id: 0, 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Retrieve DeepWiki reports for an analysis
   */
  async getReportsByAnalysis(
    analysisId: string
  ): Promise<DeepWikiAnalysisResult[]> {
    try {
      const supabase = getServiceClient();
      if (!supabase) {
        throw new Error('Supabase service client not available');
      }
      
      const { data, error } = await supabase
        .from('deepwiki_reports')
        .select('*')
        .eq('analysis_id', analysisId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Failed to retrieve DeepWiki reports', { error });
        return [];
      }

      return data.map(this.mapDbReportToResult);
    } catch (error) {
      logger.error('Error retrieving DeepWiki reports', { error });
      return [];
    }
  }

  /**
   * Retrieve DeepWiki reports for a repository
   */
  async getReportsByRepository(
    repositoryUrl: string,
    branch?: string
  ): Promise<DeepWikiAnalysisResult[]> {
    try {
      const supabase = getServiceClient();
      if (!supabase) {
        throw new Error('Supabase service client not available');
      }
      
      let query = supabase
        .from('deepwiki_reports')
        .select('*')
        .eq('repository_url', repositoryUrl);

      if (branch) {
        query = query.eq('branch', branch);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        logger.error('Failed to retrieve repository DeepWiki reports', { error });
        return [];
      }

      return data.map(this.mapDbReportToResult);
    } catch (error) {
      logger.error('Error retrieving repository DeepWiki reports', { error });
      return [];
    }
  }

  /**
   * Get comparison reports for a PR (main vs feature branch)
   */
  async getComparisonReports(
    analysisId: string
  ): Promise<{
    main?: DeepWikiAnalysisResult;
    feature?: DeepWikiAnalysisResult;
  }> {
    try {
      const reports = await this.getReportsByAnalysis(analysisId);
      
      return {
        main: reports.find(r => r.metadata.branch === 'main'),
        feature: reports.find(r => r.metadata.branch !== 'main')
      };
    } catch (error) {
      logger.error('Error retrieving comparison reports', { error });
      return {};
    }
  }

  /**
   * Store multiple reports (e.g., for PR comparison)
   */
  async storeComparisonReports(
    mainReport: DeepWikiAnalysisResult,
    featureReport: DeepWikiAnalysisResult,
    analysisId: string,
    repositoryUrl: string
  ): Promise<{ success: boolean; mainId?: number; featureId?: number; error?: string }> {
    try {
      // Store main branch report
      const mainResult = await this.storeReport(mainReport, {
        analysisId,
        repositoryUrl,
        branch: 'main',
        reportType: 'main',
        commitHash: mainReport.metadata.commit_hash
      });

      if (!mainResult.success) {
        return { 
          success: false, 
          error: `Failed to store main report: ${mainResult.error}` 
        };
      }

      // Store feature branch report  
      const featureResult = await this.storeReport(featureReport, {
        analysisId,
        repositoryUrl,
        branch: featureReport.metadata.branch || 'feature',
        reportType: 'feature',
        commitHash: featureReport.metadata.commit_hash
      });

      if (!featureResult.success) {
        return { 
          success: false, 
          mainId: mainResult.id,
          error: `Failed to store feature report: ${featureResult.error}` 
        };
      }

      logger.info('Successfully stored comparison reports', {
        analysisId,
        mainId: mainResult.id,
        featureId: featureResult.id
      });

      return {
        success: true,
        mainId: mainResult.id,
        featureId: featureResult.id
      };
    } catch (error) {
      logger.error('Error storing comparison reports', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Map database record to DeepWikiAnalysisResult
   */
  private mapDbReportToResult(dbReport: any): DeepWikiAnalysisResult {
    return {
      repository_url: dbReport.repository_url,
      analysis_id: dbReport.analysis_id,
      issues: dbReport.issues || [],
      recommendations: dbReport.recommendations || [],
      scores: dbReport.scores || {},
      metadata: {
        ...dbReport.metadata,
        analyzed_at: new Date(dbReport.analyzed_at),
        branch: dbReport.branch,
        commit_hash: dbReport.commit_hash
      },
      statistics: dbReport.statistics,
      quality: dbReport.quality,
      testing: dbReport.testing
    };
  }

  /**
   * Delete old reports (cleanup)
   */
  async deleteOldReports(daysToKeep = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const supabase = getServiceClient();
      if (!supabase) {
        throw new Error('Supabase service client not available');
      }
      
      const { data, error } = await supabase
        .from('deepwiki_reports')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .select('id');

      if (error) {
        logger.error('Failed to delete old reports', { error });
        return 0;
      }

      const deletedCount = data?.length || 0;
      logger.info(`Deleted ${deletedCount} old DeepWiki reports`);
      
      return deletedCount;
    } catch (error) {
      logger.error('Error deleting old reports', { error });
      return 0;
    }
  }
}

// Export singleton instance
export const deepWikiReportStorage = new DeepWikiReportStorage();