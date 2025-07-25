import { createClient } from '@supabase/supabase-js';
import { createLogger } from '@codequal/core/utils';
import axios from 'axios';

const logger = createLogger('supabase-storage-monitor');

export interface SupabaseStorageMetrics {
  database: {
    totalSizeGB: number;
    usedGB: number;
    availableGB: number;
    percentageUsed: number;
    plan: string;
    region: string;
  };
  tables: {
    vectorTables: TableMetric[];
    analysisTables: TableMetric[];
    otherTables: TableMetric[];
  };
  vectors: {
    totalVectors: number;
    totalSizeGB: number;
    averageVectorSize: number;
    tablesBreakdown: VectorTableMetric[];
  };
  storage: {
    bucketsUsedGB: number;
    objectCount: number;
  };
  costs: {
    databaseMonthly: number;
    storageMonthly: number;
    totalMonthly: number;
    perGBCost: number;
  };
}

export interface TableMetric {
  tableName: string;
  sizeGB: number;
  rowCount: number;
  indexSizeGB: number;
  lastVacuum?: Date;
}

export interface VectorTableMetric {
  tableName: string;
  vectorCount: number;
  dimensions: number;
  sizeGB: number;
  indexType: string;
  listCount?: number;
}

export interface SupabaseCleanupRecommendation {
  category: 'vectors' | 'analysis' | 'storage' | 'indexes';
  priority: 'high' | 'medium' | 'low';
  table?: string;
  action: string;
  potentialSavingsGB: number;
  estimatedTime: string;
  query?: string;
  risk: 'low' | 'medium' | 'high';
}

export class SupabaseStorageMonitor {
  private supabase: any;
  private readonly SUPABASE_PROJECT_REF = process.env.SUPABASE_PROJECT_REF;
  private readonly SUPABASE_MANAGEMENT_API_KEY = process.env.SUPABASE_MANAGEMENT_API_KEY;
  
  // Supabase pricing (approximate)
  private readonly PRICING = {
    DATABASE_GB_MONTH: 0.125, // $0.125/GB/month for database
    STORAGE_GB_MONTH: 0.021,  // $0.021/GB/month for storage
    VECTOR_OVERHEAD: 1.2,     // 20% overhead for vector indexes
  };

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Get comprehensive Supabase metrics
   */
  async getSupabaseMetrics(): Promise<SupabaseStorageMetrics> {
    try {
      // Get database metrics
      const databaseMetrics = await this.getDatabaseMetrics();
      
      // Get table metrics
      const tableMetrics = await this.getTableMetrics();
      
      // Get vector-specific metrics
      const vectorMetrics = await this.getVectorMetrics();
      
      // Get storage bucket metrics if using Supabase Storage
      const storageMetrics = await this.getStorageMetrics();
      
      // Calculate costs
      const costs = this.calculateCosts(databaseMetrics, storageMetrics);
      
      return {
        database: databaseMetrics,
        tables: tableMetrics,
        vectors: vectorMetrics,
        storage: storageMetrics,
        costs
      };
    } catch (error) {
      logger.error('Failed to get Supabase metrics:', error);
      throw error;
    }
  }

  /**
   * Get database-level metrics
   */
  private async getDatabaseMetrics() {
    // Get database size
    const { data: sizeData } = await this.supabase.rpc('execute_sql', {
      sql: `
        SELECT 
          pg_database_size(current_database())::float8 / (1024*1024*1024) as db_size_gb,
          current_setting('server_version') as version,
          current_database() as database_name
      `
    });

    const dbSizeGB = sizeData?.[0]?.db_size_gb || 0;

    // For Supabase, we need to check the plan limits
    // Default to your 30GB plan
    const totalSizeGB = 30;

    return {
      totalSizeGB,
      usedGB: dbSizeGB,
      availableGB: totalSizeGB - dbSizeGB,
      percentageUsed: (dbSizeGB / totalSizeGB) * 100,
      plan: 'Pro', // Update based on your actual plan
      region: process.env.SUPABASE_REGION || 'us-east-1'
    };
  }

  /**
   * Get table-level metrics categorized by type
   */
  private async getTableMetrics() {
    const { data } = await this.supabase.rpc('execute_sql', {
      sql: `
        WITH table_stats AS (
          SELECT 
            schemaname,
            tablename,
            pg_total_relation_size(schemaname||'.'||tablename)::float8 / (1024*1024*1024) AS total_size_gb,
            pg_table_size(schemaname||'.'||tablename)::float8 / (1024*1024*1024) AS table_size_gb,
            pg_indexes_size(schemaname||'.'||tablename)::float8 / (1024*1024*1024) AS index_size_gb,
            n_live_tup AS row_count,
            last_vacuum,
            last_autovacuum
          FROM pg_stat_user_tables
          WHERE schemaname = 'public'
        )
        SELECT * FROM table_stats
        ORDER BY total_size_gb DESC;
      `
    });

    const vectorTables: TableMetric[] = [];
    const analysisTables: TableMetric[] = [];
    const otherTables: TableMetric[] = [];

    const vectorTableNames = [
      'analysis_chunks',
      'tool_results_vectors', 
      'educational_patterns',
      'knowledge_items',
      'rag_educational_content',
      'user_skills'
    ];

    const analysisTableNames = [
      'repository_analyses',
      'pr_analyses',
      'perspective_analyses',
      'repository_analysis_reports'
    ];

    data?.forEach((table: any) => {
      const metric: TableMetric = {
        tableName: table.tablename,
        sizeGB: parseFloat(table.total_size_gb.toFixed(3)),
        rowCount: table.row_count,
        indexSizeGB: parseFloat(table.index_size_gb.toFixed(3)),
        lastVacuum: table.last_vacuum || table.last_autovacuum
      };

      if (vectorTableNames.includes(table.tablename)) {
        vectorTables.push(metric);
      } else if (analysisTableNames.includes(table.tablename)) {
        analysisTables.push(metric);
      } else {
        otherTables.push(metric);
      }
    });

    return { vectorTables, analysisTables, otherTables };
  }

  /**
   * Get detailed vector metrics
   */
  private async getVectorMetrics(): Promise<any> {
    const vectorTables = [
      { name: 'analysis_chunks', dimensions: 1536 },
      { name: 'tool_results_vectors', dimensions: 1536 },
      { name: 'educational_patterns', dimensions: 1536 },
      { name: 'knowledge_items', dimensions: 1536 }
    ];

    const tablesBreakdown: VectorTableMetric[] = [];
    let totalVectors = 0;
    let totalSizeGB = 0;

    for (const table of vectorTables) {
      const { data } = await this.supabase.rpc('execute_sql', {
        sql: `
          SELECT 
            COUNT(*) as vector_count,
            pg_total_relation_size('${table.name}')::float8 / (1024*1024*1024) as size_gb,
            COUNT(DISTINCT list_id) as list_count
          FROM ${table.name}
          WHERE embedding IS NOT NULL;
        `
      });

      if (data?.[0]) {
        const metric: VectorTableMetric = {
          tableName: table.name,
          vectorCount: data[0].vector_count,
          dimensions: table.dimensions,
          sizeGB: parseFloat(data[0].size_gb.toFixed(3)),
          indexType: 'ivfflat', // Supabase default
          listCount: data[0].list_count
        };
        
        tablesBreakdown.push(metric);
        totalVectors += metric.vectorCount;
        totalSizeGB += metric.sizeGB;
      }
    }

    return {
      totalVectors,
      totalSizeGB,
      averageVectorSize: totalVectors > 0 ? (totalSizeGB * 1024 * 1024) / totalVectors : 0, // KB
      tablesBreakdown
    };
  }

  /**
   * Get Supabase Storage metrics
   */
  private async getStorageMetrics() {
    try {
      // Check if using Supabase Storage
      const { data, error } = await this.supabase.storage.listBuckets();
      
      if (error || !data) {
        return { bucketsUsedGB: 0, objectCount: 0 };
      }

      let totalSize = 0;
      let totalObjects = 0;

      for (const bucket of data) {
        // Note: Supabase doesn't provide direct bucket size API
        // You might need to track this separately or use management API
        const { data: objects } = await this.supabase.storage
          .from(bucket.name)
          .list('', { limit: 1000 });
        
        if (objects) {
          totalObjects += objects.length;
          // Size calculation would require iterating through objects
        }
      }

      return {
        bucketsUsedGB: totalSize / (1024 * 1024 * 1024),
        objectCount: totalObjects
      };
    } catch (error) {
      logger.warn('Could not fetch storage metrics:', error);
      return { bucketsUsedGB: 0, objectCount: 0 };
    }
  }

  /**
   * Get cleanup recommendations specific to Supabase
   */
  async getCleanupRecommendations(): Promise<SupabaseCleanupRecommendation[]> {
    const recommendations: SupabaseCleanupRecommendation[] = [];

    // Check expired vector chunks
    const { data: expiredData } = await this.supabase.rpc('execute_sql', {
      sql: `
        SELECT 
          COUNT(*) as count,
          SUM(octet_length(embedding::text) + octet_length(content))::float8 / (1024*1024*1024) as size_gb
        FROM analysis_chunks
        WHERE storage_type IN ('cached', 'temporary')
        AND expires_at < NOW();
      `
    });

    if (expiredData?.[0]?.count > 0) {
      recommendations.push({
        category: 'vectors',
        priority: 'high',
        table: 'analysis_chunks',
        action: 'Remove expired vector embeddings',
        potentialSavingsGB: expiredData[0].size_gb,
        estimatedTime: '5-10 minutes',
        query: `DELETE FROM analysis_chunks WHERE storage_type != 'permanent' AND expires_at < NOW();`,
        risk: 'low'
      });
    }

    // Check vector index efficiency
    const { data: indexData } = await this.supabase.rpc('execute_sql', {
      sql: `
        SELECT 
          indexname,
          tablename,
          pg_size_pretty(pg_relation_size(indexrelid)) as index_size
        FROM pg_indexes i
        JOIN pg_stat_user_indexes ui ON i.indexname = ui.indexrelname
        WHERE i.tablename LIKE '%vectors%' OR i.tablename LIKE '%chunks%'
        ORDER BY pg_relation_size(indexrelid) DESC;
      `
    });

    // Check for unused indexes
    const { data: unusedIndexes } = await this.supabase.rpc('execute_sql', {
      sql: `
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_scan,
          pg_size_pretty(pg_relation_size(indexrelid)) as size
        FROM pg_stat_user_indexes
        WHERE idx_scan = 0
        AND indexrelname NOT LIKE 'pg_%'
        AND pg_relation_size(indexrelid) > 1000000; -- > 1MB
      `
    });

    if (unusedIndexes?.length > 0) {
      recommendations.push({
        category: 'indexes',
        priority: 'medium',
        action: 'Remove unused indexes',
        potentialSavingsGB: 0.1, // Estimate
        estimatedTime: '2-5 minutes',
        risk: 'medium'
      });
    }

    // Check for duplicate vectors
    const { data: duplicates } = await this.supabase.rpc('execute_sql', {
      sql: `
        WITH vector_duplicates AS (
          SELECT 
            content_hash,
            COUNT(*) as dup_count,
            (COUNT(*) - 1) * AVG(octet_length(embedding::text))::float8 / (1024*1024*1024) as waste_gb
          FROM analysis_chunks
          WHERE content_hash IS NOT NULL
          GROUP BY content_hash
          HAVING COUNT(*) > 1
        )
        SELECT 
          COUNT(*) as duplicate_groups,
          SUM(dup_count - 1) as total_duplicates,
          SUM(waste_gb) as total_waste_gb
        FROM vector_duplicates;
      `
    });

    if (duplicates?.[0]?.total_duplicates > 0) {
      recommendations.push({
        category: 'vectors',
        priority: 'medium',
        table: 'analysis_chunks',
        action: 'Remove duplicate vector embeddings',
        potentialSavingsGB: duplicates[0].total_waste_gb,
        estimatedTime: '10-15 minutes',
        risk: 'low'
      });
    }

    // Check old analysis data
    const { data: oldAnalyses } = await this.supabase.rpc('execute_sql', {
      sql: `
        SELECT 
          COUNT(*) as count,
          SUM(pg_column_size(analysis_data))::float8 / (1024*1024*1024) as size_gb
        FROM repository_analyses
        WHERE created_at < NOW() - INTERVAL '90 days'
        AND repository_id NOT IN (
          SELECT DISTINCT repository_id 
          FROM pr_analyses 
          WHERE created_at > NOW() - INTERVAL '30 days'
        );
      `
    });

    if (oldAnalyses?.[0]?.count > 0) {
      recommendations.push({
        category: 'analysis',
        priority: 'medium',
        table: 'repository_analyses',
        action: 'Archive analyses older than 90 days',
        potentialSavingsGB: oldAnalyses[0].size_gb,
        estimatedTime: '15-30 minutes',
        risk: 'medium'
      });
    }

    // Sort by priority and potential savings
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      return priorityDiff !== 0 ? priorityDiff : b.potentialSavingsGB - a.potentialSavingsGB;
    });
  }

  /**
   * Monitor pgvector-specific metrics
   */
  async getVectorIndexHealth() {
    const { data } = await this.supabase.rpc('execute_sql', {
      sql: `
        WITH index_stats AS (
          SELECT 
            c.relname AS table_name,
            i.relname AS index_name,
            am.amname AS index_method,
            pg_size_pretty(pg_relation_size(i.oid)) AS index_size,
            idx_scan,
            idx_tup_read,
            idx_tup_fetch
          FROM pg_class c
          JOIN pg_index idx ON c.oid = idx.indrelid
          JOIN pg_class i ON i.oid = idx.indexrelid
          JOIN pg_am am ON i.relam = am.oid
          LEFT JOIN pg_stat_user_indexes ui ON ui.indexrelid = i.oid
          WHERE am.amname = 'ivfflat'
        )
        SELECT * FROM index_stats;
      `
    });

    return data?.map((idx: any) => ({
      tableName: idx.table_name,
      indexName: idx.index_name,
      indexSize: idx.index_size,
      scans: idx.idx_scan || 0,
      efficiency: idx.idx_scan > 0 ? (idx.idx_tup_fetch / idx.idx_tup_read) : 0
    }));
  }

  /**
   * Calculate costs based on Supabase pricing
   */
  private calculateCosts(database: any, storage: any) {
    const databaseCost = database.usedGB * this.PRICING.DATABASE_GB_MONTH;
    const storageCost = storage.bucketsUsedGB * this.PRICING.STORAGE_GB_MONTH;
    const totalMonthly = databaseCost + storageCost;

    return {
      databaseMonthly: parseFloat(databaseCost.toFixed(2)),
      storageMonthly: parseFloat(storageCost.toFixed(2)),
      totalMonthly: parseFloat(totalMonthly.toFixed(2)),
      perGBCost: parseFloat((totalMonthly / (database.usedGB || 1)).toFixed(2))
    };
  }

  /**
   * Generate Supabase-specific optimization report
   */
  async generateOptimizationReport(): Promise<string> {
    const metrics = await this.getSupabaseMetrics();
    const recommendations = await this.getCleanupRecommendations();
    const indexHealth = await this.getVectorIndexHealth();

    const report = `
# Supabase Storage Optimization Report
Generated: ${new Date().toISOString()}

## Database Overview
- **Plan**: ${metrics.database.plan} (${metrics.database.totalSizeGB}GB)
- **Used**: ${metrics.database.usedGB.toFixed(2)}GB (${metrics.database.percentageUsed.toFixed(1)}%)
- **Available**: ${metrics.database.availableGB.toFixed(2)}GB
- **Region**: ${metrics.database.region}

## Vector Storage Analysis
- **Total Vectors**: ${metrics.vectors.totalVectors.toLocaleString()}
- **Vector Storage**: ${metrics.vectors.totalSizeGB.toFixed(2)}GB
- **Average Vector Size**: ${metrics.vectors.averageVectorSize.toFixed(2)}KB

### Vector Tables Breakdown:
${metrics.vectors.tablesBreakdown.map(t => 
  `- **${t.tableName}**: ${t.vectorCount.toLocaleString()} vectors (${t.sizeGB.toFixed(2)}GB)`
).join('\n')}

## pgvector Index Health
${indexHealth?.map(idx => 
  `- **${idx.tableName}.${idx.indexName}**: ${idx.indexSize} (${idx.scans} scans, ${(idx.efficiency * 100).toFixed(1)}% efficiency)`
).join('\n') || 'No vector indexes found'}

## Storage Distribution
### Vector Tables (${metrics.tables.vectorTables.reduce((sum, t) => sum + t.sizeGB, 0).toFixed(2)}GB)
${metrics.tables.vectorTables.slice(0, 5).map(t => 
  `- ${t.tableName}: ${t.sizeGB.toFixed(2)}GB (${t.rowCount.toLocaleString()} rows)`
).join('\n')}

### Analysis Tables (${metrics.tables.analysisTables.reduce((sum, t) => sum + t.sizeGB, 0).toFixed(2)}GB)
${metrics.tables.analysisTables.slice(0, 5).map(t => 
  `- ${t.tableName}: ${t.sizeGB.toFixed(2)}GB (${t.rowCount.toLocaleString()} rows)`
).join('\n')}

## Cost Analysis
- **Database Cost**: $${metrics.costs.databaseMonthly}/month
- **Storage Cost**: $${metrics.costs.storageMonthly}/month
- **Total Monthly**: $${metrics.costs.totalMonthly}
- **Cost per GB**: $${metrics.costs.perGBCost}

## Optimization Recommendations
${recommendations.length > 0 ? recommendations.map(r => 
  `### ${r.priority.toUpperCase()}: ${r.action}
- **Category**: ${r.category}
- **Table**: ${r.table || 'Multiple'}
- **Potential Savings**: ${r.potentialSavingsGB.toFixed(2)}GB ($${(r.potentialSavingsGB * this.PRICING.DATABASE_GB_MONTH).toFixed(2)}/month)
- **Estimated Time**: ${r.estimatedTime}
- **Risk**: ${r.risk}
`).join('\n') : 'No immediate optimization opportunities found.'}

## Total Optimization Potential
- **Space to recover**: ${recommendations.reduce((sum, r) => sum + r.potentialSavingsGB, 0).toFixed(2)}GB
- **Monthly savings**: $${recommendations.reduce((sum, r) => sum + (r.potentialSavingsGB * this.PRICING.DATABASE_GB_MONTH), 0).toFixed(2)}

## Supabase-Specific Recommendations

1. **Vector Index Optimization**:
   - Consider using pgvector's new HNSW index type for better performance
   - Tune ivfflat lists parameter based on your dataset size

2. **Connection Pooling**:
   - Use Supabase connection pooler for better resource utilization
   - Current endpoint: ${process.env.SUPABASE_URL?.includes('pooler') ? 'Using pooler ✓' : 'Direct connection ⚠️'}

3. **Storage Policies**:
   - Implement RLS policies to prevent unauthorized data growth
   - Use Supabase Edge Functions for data cleanup automation

4. **Monitoring**:
   - Enable Supabase dashboard metrics
   - Set up LogFlare integration for detailed query analysis
`;

    return report;
  }
}

// Export singleton instance
export const supabaseStorageMonitor = new SupabaseStorageMonitor();