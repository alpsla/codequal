import { createLogger } from '@codequal/core/utils';
import { getSupabase } from '@codequal/database/supabase/client';

/**
 * Service to maintain mapping between report IDs and repository URLs
 * This allows retrieval of Vector DB content using report IDs
 */
interface ReportMapping {
  reportId: string;
  repositoryUrl: string;
  prNumber: number;
  userId: string;
  createdAt: Date;
}

export class ReportIdMappingService {
  private readonly logger = createLogger('ReportIdMappingService');
  private readonly memoryCache = new Map<string, ReportMapping>();
  
  /**
   * Store a mapping between report ID and repository URL
   */
  async storeMapping(
    reportId: string, 
    repositoryUrl: string, 
    prNumber: number,
    userId: string
  ): Promise<void> {
    const mapping: ReportMapping = {
      reportId,
      repositoryUrl,
      prNumber,
      userId,
      createdAt: new Date()
    };
    
    // Store in memory cache
    this.memoryCache.set(reportId, mapping);
    
    try {
      // Store in database (create this table)
      await getSupabase()
        .from('report_id_mappings')
        .insert({
          report_id: reportId,
          repository_url: repositoryUrl,
          pr_number: prNumber,
          user_id: userId,
          created_at: mapping.createdAt
        });
    } catch (error) {
      this.logger.warn('Failed to store mapping in database, using memory only', { error });
    }
  }
  
  /**
   * Get repository URL from report ID
   */
  async getRepositoryUrl(reportId: string): Promise<string | null> {
    // Check memory cache first
    const cached = this.memoryCache.get(reportId);
    if (cached) {
      return cached.repositoryUrl;
    }
    
    try {
      // Check database
      const { data, error } = await getSupabase()
        .from('report_id_mappings')
        .select('repository_url')
        .eq('report_id', reportId)
        .single();
        
      if (data && data.repository_url) {
        return data.repository_url as string;
      }
    } catch (error) {
      this.logger.warn('Failed to retrieve mapping from database', { error });
    }
    
    return null;
  }
  
  /**
   * Clean up old mappings (run periodically)
   */
  async cleanupOldMappings(daysToKeep: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    // Clean memory cache
    for (const [reportId, mapping] of this.memoryCache.entries()) {
      if (mapping.createdAt < cutoffDate) {
        this.memoryCache.delete(reportId);
      }
    }
    
    try {
      // Clean database
      await getSupabase()
        .from('report_id_mappings')
        .delete()
        .lt('created_at', cutoffDate.toISOString());
    } catch (error) {
      this.logger.warn('Failed to cleanup old mappings', { error });
    }
  }
}

// Singleton instance
export const reportIdMappingService = new ReportIdMappingService();