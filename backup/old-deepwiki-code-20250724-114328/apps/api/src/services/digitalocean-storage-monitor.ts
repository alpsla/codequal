import { createClient } from '@supabase/supabase-js';
import { createLogger } from '@codequal/core/utils';
import axios from 'axios';

const logger = createLogger('digitalocean-storage-monitor');

export interface DODatabaseMetrics {
  totalSizeGB: number;
  usedGB: number;
  availableGB: number;
  percentageUsed: number;
  largestTables: TableMetric[];
  vectorDataGB: number;
  analysisDataGB: number;
  growthRateGBPerDay: number;
  estimatedDaysUntilFull: number;
}

export interface TableMetric {
  tableName: string;
  sizeGB: number;
  rowCount: number;
  indexSizeGB: number;
  growthRate: number;
}

export interface CleanupRecommendation {
  table: string;
  action: string;
  potentialSpaceGB: number;
  risk: 'low' | 'medium' | 'high';
  query: string;
}

export class DigitalOceanStorageMonitor {
  private supabase: any;
  private readonly TOTAL_SIZE_GB = 30; // DigitalOcean plan size
  private readonly WARNING_THRESHOLD = 0.70; // 70%
  private readonly CRITICAL_THRESHOLD = 0.85; // 85%
  private readonly DO_API_TOKEN = process.env.DIGITALOCEAN_API_TOKEN;
  private readonly DO_DATABASE_ID = process.env.DO_DATABASE_CLUSTER_ID;
  
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
  }

  /**
   * Get comprehensive database metrics
   */
  async getDatabaseMetrics(): Promise<DODatabaseMetrics> {
    try {
      // Get database size from DigitalOcean API
      const doMetrics = await this.getDigitalOceanMetrics();
      
      // Get table-level metrics from PostgreSQL
      const tableMetrics = await this.getTableMetrics();
      
      // Calculate specialized metrics
      const vectorDataGB = await this.calculateVectorDataSize();
      const analysisDataGB = await this.calculateAnalysisDataSize();
      
      // Get growth rate
      const growthRate = await this.calculateGrowthRate();
      
      const usedGB = doMetrics.diskUsageGB || this.calculateTotalUsedSize(tableMetrics);
      const availableGB = this.TOTAL_SIZE_GB - usedGB;
      const percentageUsed = (usedGB / this.TOTAL_SIZE_GB) * 100;
      
      return {
        totalSizeGB: this.TOTAL_SIZE_GB,
        usedGB,
        availableGB,
        percentageUsed,
        largestTables: tableMetrics.slice(0, 10), // Top 10 tables
        vectorDataGB,
        analysisDataGB,
        growthRateGBPerDay: growthRate,
        estimatedDaysUntilFull: growthRate > 0 ? availableGB / growthRate : Infinity
      };
    } catch (error) {
      logger.error('Failed to get database metrics:', error);
      throw error;
    }
  }

  /**
   * Get metrics from DigitalOcean API
   */
  private async getDigitalOceanMetrics(): Promise<any> {
    if (!this.DO_API_TOKEN || !this.DO_DATABASE_ID) {
      logger.warn('DigitalOcean API credentials not configured');
      return {};
    }

    try {
      const response = await axios.get(
        `https://api.digitalocean.com/v2/databases/${this.DO_DATABASE_ID}/metrics/disk_usage`,
        {
          headers: {
            'Authorization': `Bearer ${this.DO_API_TOKEN}`,
            'Content-Type': 'application/json'
          },
          params: {
            start: new Date(Date.now() - 3600000).toISOString(), // Last hour
            end: new Date().toISOString()
          }
        }
      );

      const data = response.data.data;
      if (data && data.length > 0) {
        const latestMetric = data[data.length - 1];
        return {
          diskUsageGB: latestMetric.value / (1024 * 1024 * 1024)
        };
      }

      return {};
    } catch (error) {
      logger.error('Failed to get DigitalOcean metrics:', error);
      return {};
    }
  }

  /**
   * Get table-level metrics from PostgreSQL
   */
  private async getTableMetrics(): Promise<TableMetric[]> {
    const query = `
      WITH table_sizes AS (
        SELECT 
          schemaname,
          tablename,
          pg_total_relation_size(schemaname||'.'||tablename) AS total_size,
          pg_relation_size(schemaname||'.'||tablename) AS table_size,
          pg_indexes_size(schemaname||'.'||tablename) AS index_size,
          n_live_tup AS row_count
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
      )
      SELECT 
        tablename,
        total_size::float8 / (1024*1024*1024) AS size_gb,
        table_size::float8 / (1024*1024*1024) AS data_size_gb,
        index_size::float8 / (1024*1024*1024) AS index_size_gb,
        row_count
      FROM table_sizes
      ORDER BY total_size DESC;
    `;

    const { data, error } = await this.supabase.rpc('execute_query', { query_text: query });
    
    if (error) {
      logger.error('Failed to get table metrics:', error);
      return [];
    }

    return data.map((row: any) => ({
      tableName: row.tablename,
      sizeGB: parseFloat(row.size_gb.toFixed(3)),
      rowCount: row.row_count,
      indexSizeGB: parseFloat(row.index_size_gb.toFixed(3)),
      growthRate: 0 // Will be calculated separately
    }));
  }

  /**
   * Calculate vector data size
   */
  private async calculateVectorDataSize(): Promise<number> {
    const vectorTables = [
      'analysis_chunks',
      'tool_results_vectors',
      'educational_patterns',
      'knowledge_items',
      'rag_educational_content',
      'user_skills'
    ];

    const query = `
      SELECT SUM(pg_total_relation_size(tablename::regclass))::float8 / (1024*1024*1024) AS total_gb
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = ANY($1);
    `;

    const { data, error } = await this.supabase.rpc('execute_query', { 
      query_text: query,
      params: [vectorTables]
    });

    return error ? 0 : (data[0]?.total_gb || 0);
  }

  /**
   * Calculate analysis data size
   */
  private async calculateAnalysisDataSize(): Promise<number> {
    const analysisTables = [
      'repository_analyses',
      'pr_analyses',
      'perspective_analyses',
      'repository_analysis_reports',
      'ai_suggestions'
    ];

    const query = `
      SELECT SUM(pg_total_relation_size(tablename::regclass))::float8 / (1024*1024*1024) AS total_gb
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = ANY($1);
    `;

    const { data, error } = await this.supabase.rpc('execute_query', { 
      query_text: query,
      params: [analysisTables]
    });

    return error ? 0 : (data[0]?.total_gb || 0);
  }

  /**
   * Get cleanup recommendations based on current usage
   */
  async getCleanupRecommendations(): Promise<CleanupRecommendation[]> {
    const metrics = await this.getDatabaseMetrics();
    const recommendations: CleanupRecommendation[] = [];

    // Check expired vector chunks
    const expiredChunks = await this.checkExpiredChunks();
    if (expiredChunks.sizeGB > 0.1) {
      recommendations.push({
        table: 'analysis_chunks',
        action: 'Clean up expired vector chunks',
        potentialSpaceGB: expiredChunks.sizeGB,
        risk: 'low',
        query: `DELETE FROM analysis_chunks WHERE storage_type != 'permanent' AND expires_at < NOW();`
      });
    }

    // Check old analysis data
    const oldAnalyses = await this.checkOldAnalyses();
    if (oldAnalyses.sizeGB > 0.5) {
      recommendations.push({
        table: 'repository_analyses',
        action: 'Archive analyses older than 90 days',
        potentialSpaceGB: oldAnalyses.sizeGB,
        risk: 'medium',
        query: `DELETE FROM repository_analyses WHERE created_at < NOW() - INTERVAL '90 days' AND repository_id NOT IN (SELECT DISTINCT repository_id FROM pr_analyses WHERE created_at > NOW() - INTERVAL '30 days');`
      });
    }

    // Check duplicate vectors
    const duplicates = await this.checkDuplicateVectors();
    if (duplicates.sizeGB > 0.1) {
      recommendations.push({
        table: 'analysis_chunks',
        action: 'Remove duplicate vector embeddings',
        potentialSpaceGB: duplicates.sizeGB,
        risk: 'low',
        query: `WITH duplicates AS (SELECT content_hash, MIN(id) as keep_id FROM analysis_chunks GROUP BY content_hash HAVING COUNT(*) > 1) DELETE FROM analysis_chunks WHERE content_hash IN (SELECT content_hash FROM duplicates) AND id NOT IN (SELECT keep_id FROM duplicates);`
      });
    }

    // Check orphaned data
    const orphaned = await this.checkOrphanedData();
    if (orphaned.sizeGB > 0.05) {
      recommendations.push({
        table: 'multiple',
        action: 'Clean up orphaned records',
        potentialSpaceGB: orphaned.sizeGB,
        risk: 'low',
        query: 'Multiple queries needed - see cleanup script'
      });
    }

    // Sort by potential space savings
    return recommendations.sort((a, b) => b.potentialSpaceGB - a.potentialSpaceGB);
  }

  /**
   * Monitor and alert on storage usage
   */
  async monitorAndAlert(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    message: string;
    metrics: DODatabaseMetrics;
    recommendations?: CleanupRecommendation[];
  }> {
    const metrics = await this.getDatabaseMetrics();
    
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    let message = 'Database storage usage is healthy';
    let recommendations: CleanupRecommendation[] | undefined;

    if (metrics.percentageUsed >= this.CRITICAL_THRESHOLD * 100) {
      status = 'critical';
      message = `CRITICAL: Database is ${metrics.percentageUsed.toFixed(1)}% full. Immediate action required!`;
      recommendations = await this.getCleanupRecommendations();
      
      // Send critical alert
      await this.sendAlert('critical', message, metrics);
      
    } else if (metrics.percentageUsed >= this.WARNING_THRESHOLD * 100) {
      status = 'warning';
      message = `WARNING: Database is ${metrics.percentageUsed.toFixed(1)}% full. Consider cleanup actions.`;
      recommendations = await this.getCleanupRecommendations();
      
      // Send warning alert
      await this.sendAlert('warning', message, metrics);
    }

    // Log metrics for tracking
    await this.logMetrics(metrics);

    return {
      status,
      message,
      metrics,
      recommendations
    };
  }

  /**
   * Create storage usage report
   */
  async generateStorageReport(): Promise<string> {
    const metrics = await this.getDatabaseMetrics();
    const recommendations = await this.getCleanupRecommendations();
    
    let report = `
# DigitalOcean Database Storage Report
Generated: ${new Date().toISOString()}

## Storage Overview
- **Total Size**: ${this.TOTAL_SIZE_GB}GB
- **Used**: ${metrics.usedGB.toFixed(2)}GB (${metrics.percentageUsed.toFixed(1)}%)
- **Available**: ${metrics.availableGB.toFixed(2)}GB
- **Growth Rate**: ${metrics.growthRateGBPerDay.toFixed(3)}GB/day
- **Days Until Full**: ${metrics.estimatedDaysUntilFull === Infinity ? 'N/A' : Math.floor(metrics.estimatedDaysUntilFull)}

## Storage Breakdown
- **Vector Data**: ${metrics.vectorDataGB.toFixed(2)}GB
- **Analysis Data**: ${metrics.analysisDataGB.toFixed(2)}GB
- **Other Data**: ${(metrics.usedGB - metrics.vectorDataGB - metrics.analysisDataGB).toFixed(2)}GB

## Largest Tables
${metrics.largestTables.map(t => 
  `- **${t.tableName}**: ${t.sizeGB.toFixed(2)}GB (${t.rowCount.toLocaleString()} rows)`
).join('\n')}

## Cleanup Recommendations
${recommendations.length > 0 ? recommendations.map(r => 
  `### ${r.action}
- **Table**: ${r.table}
- **Potential Space**: ${r.potentialSpaceGB.toFixed(2)}GB
- **Risk**: ${r.risk}
`).join('\n') : 'No immediate cleanup actions recommended.'}

## Monthly Cost Analysis
- **Current Plan**: $${this.calculateMonthlyCost()}
- **Usage Efficiency**: ${((metrics.usedGB / this.TOTAL_SIZE_GB) * 100).toFixed(1)}%
- **Cost per GB Used**: $${(this.calculateMonthlyCost() / metrics.usedGB).toFixed(2)}
`;

    return report;
  }

  // Helper methods
  private calculateTotalUsedSize(tables: TableMetric[]): number {
    return tables.reduce((sum, table) => sum + table.sizeGB, 0);
  }

  private async calculateGrowthRate(): Promise<number> {
    // Query historical data if available, otherwise estimate
    // For now, returning a conservative estimate
    return 0.1; // 100MB per day
  }

  private async checkExpiredChunks(): Promise<{ count: number; sizeGB: number }> {
    const query = `
      SELECT 
        COUNT(*) as count,
        SUM(pg_column_size(embedding) + pg_column_size(content))::float8 / (1024*1024*1024) as size_gb
      FROM analysis_chunks
      WHERE storage_type != 'permanent' 
      AND expires_at < NOW();
    `;

    const { data } = await this.supabase.rpc('execute_query', { query_text: query });
    return data[0] || { count: 0, sizeGB: 0 };
  }

  private async checkOldAnalyses(): Promise<{ count: number; sizeGB: number }> {
    const query = `
      WITH old_analyses AS (
        SELECT id, pg_column_size(analysis_data)::float8 / (1024*1024*1024) as size_gb
        FROM repository_analyses
        WHERE created_at < NOW() - INTERVAL '90 days'
      )
      SELECT COUNT(*) as count, SUM(size_gb) as size_gb
      FROM old_analyses;
    `;

    const { data } = await this.supabase.rpc('execute_query', { query_text: query });
    return data[0] || { count: 0, sizeGB: 0 };
  }

  private async checkDuplicateVectors(): Promise<{ count: number; sizeGB: number }> {
    const query = `
      WITH duplicates AS (
        SELECT content_hash, COUNT(*) as dup_count
        FROM analysis_chunks
        GROUP BY content_hash
        HAVING COUNT(*) > 1
      )
      SELECT 
        SUM(d.dup_count - 1) as count,
        SUM((d.dup_count - 1) * pg_column_size(ac.embedding)::float8 / (1024*1024*1024)) as size_gb
      FROM duplicates d
      JOIN analysis_chunks ac ON ac.content_hash = d.content_hash;
    `;

    const { data } = await this.supabase.rpc('execute_query', { query_text: query });
    return data[0] || { count: 0, sizeGB: 0 };
  }

  private async checkOrphanedData(): Promise<{ count: number; sizeGB: number }> {
    // Check for various types of orphaned data
    return { count: 0, sizeGB: 0 }; // Placeholder
  }

  private async sendAlert(level: string, message: string, metrics: DODatabaseMetrics) {
    // Implement your alert mechanism here (Slack, email, etc.)
    logger.warn(`Storage Alert [${level}]: ${message}`);
  }

  private async logMetrics(metrics: DODatabaseMetrics) {
    // Log to a metrics table for historical tracking
    logger.info('Storage Metrics:', {
      usedGB: metrics.usedGB,
      percentageUsed: metrics.percentageUsed,
      growthRate: metrics.growthRateGBPerDay
    });
  }

  private calculateMonthlyCost(): number {
    // DigitalOcean Database pricing (rough estimate)
    // Actual pricing depends on your plan
    return 15; // $15/month for basic plan
  }
}

// Export singleton instance
export const digitalOceanStorageMonitor = new DigitalOceanStorageMonitor();