import { createClient, SupabaseClient } from '@supabase/supabase-js';

// =============================================================================
// Database Metadata Cache Implementation
// =============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class DatabaseMetadataCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get timezones with caching
   */
  async getTimezones(): Promise<Array<{ name: string; abbrev: string; utc_offset: string }>> {
    const cacheKey = 'timezones';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.DEFAULT_TTL) {
      console.log('Returning cached timezones');
      return cached.data as Array<{ name: string; abbrev: string; utc_offset: string }>;
    }
    
    try {
      // Use the optimized function instead of direct table query
      const { data, error } = await this.supabase
        .rpc('get_timezone_names');
      
      if (error) throw error;
      
      this.cache.set(cacheKey, {
        data: data || [],
        timestamp: Date.now()
      });
      
      return data || [];
    } catch (error) {
      console.error('Failed to fetch timezones:', error);
      // Return cached data if available, even if stale
      return (cached?.data as Array<{ name: string; abbrev: string; utc_offset: string }>) || [];
    }
  }

  /**
   * Get table metadata with caching
   */
  async getTableMetadata(schemas: string[] = ['public']): Promise<Array<{ table_schema: string; table_name: string; column_name: string; data_type: string; is_nullable: string }>> {
    const cacheKey = `tables_${schemas.join('_')}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.DEFAULT_TTL) {
      return cached.data as Array<{ table_schema: string; table_name: string; column_name: string; data_type: string; is_nullable: string }>;
    }
    
    try {
      const { data, error } = await this.supabase
        .rpc('get_table_metadata', { schema_filter: schemas });
      
      if (error) throw error;
      
      this.cache.set(cacheKey, {
        data: data || [],
        timestamp: Date.now()
      });
      
      return data || [];
    } catch (error) {
      console.error('Failed to fetch table metadata:', error);
      return (cached?.data as Array<{ table_schema: string; table_name: string; column_name: string; data_type: string; is_nullable: string }>) || [];
    }
  }

  /**
   * Clear cache for a specific key or all keys
   */
  clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// =============================================================================
// Request Deduplication Implementation
// =============================================================================

export class RequestDeduplicator {
  private inFlight = new Map<string, Promise<unknown>>();
  private stats = {
    total: 0,
    deduplicated: 0,
    errors: 0
  };

  /**
   * Deduplicate identical concurrent requests
   */
  async deduplicate<T>(
    key: string, 
    fetchFn: () => Promise<T>
  ): Promise<T> {
    this.stats.total++;
    
    const existing = this.inFlight.get(key);
    if (existing) {
      this.stats.deduplicated++;
      console.log(`Deduplicating request: ${key}`);
      return existing as T;
    }
    
    const promise = fetchFn()
      .catch((error) => {
        this.stats.errors++;
        throw error;
      })
      .finally(() => {
        this.inFlight.delete(key);
      });
    
    this.inFlight.set(key, promise);
    return promise;
  }

  /**
   * Get deduplication statistics
   */
  getStats() {
    return {
      ...this.stats,
      hitRate: this.stats.total > 0 
        ? (this.stats.deduplicated / this.stats.total * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      total: 0,
      deduplicated: 0,
      errors: 0
    };
  }
}

// =============================================================================
// Optimized Supabase Client Configuration
// =============================================================================

export function createOptimizedSupabaseClient(
  url: string,
  anonKey: string
): SupabaseClient {
  return createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'x-client-info': 'codequal-app/1.0.0',
      },
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });
}

// =============================================================================
// Performance Monitoring Utilities
// =============================================================================

export class PerformanceMonitor {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Log a slow query to the performance log
   */
  async logSlowQuery(query: string, executionTimeMs: number): Promise<void> {
    if (executionTimeMs < 100) return; // Only log slow queries
    
    try {
      await this.supabase.rpc('log_slow_query', {
        p_query_text: query,
        p_execution_time_ms: executionTimeMs
      });
    } catch (error) {
      console.error('Failed to log slow query:', error);
    }
  }

  /**
   * Get performance statistics
   */
  async getPerformanceStats(limit = 10): Promise<Array<{ query: string; calls: number; total_time: number; mean_time: number; min_time: number; max_time: number }>> {
    const { data, error } = await this.supabase
      .from('query_performance_log')
      .select('*')
      .order('avg_time_ms', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Failed to fetch performance stats:', error);
      return [];
    }
    
    return data || [];
  }

  /**
   * Clean up old performance logs
   */
  async cleanupOldLogs(): Promise<void> {
    try {
      await this.supabase.rpc('cleanup_old_performance_logs');
      console.log('Performance logs cleaned up successfully');
    } catch (error) {
      console.error('Failed to cleanup performance logs:', error);
    }
  }
}

// =============================================================================
// Query Builders with Optimizations
// =============================================================================

export class OptimizedQueries {
  constructor(
    private supabase: SupabaseClient,
    private deduplicator: RequestDeduplicator
  ) {}

  /**
   * Get repository by ID with optimized query
   */
  async getRepositoryById(id: string) {
    return this.deduplicator.deduplicate(
      `repo_${id}`,
      async () => {
        const { data, error } = await this.supabase
          .from('repositories')
          .select(`
            id,
            name,
            owner,
            platform,
            primary_language,
            last_analyzed_at,
            size
          `)
          .eq('id', id)
          .single();
        
        if (error) throw error;
        return data;
      }
    );
  }

  /**
   * Get active repositories with pagination
   */
  async getActiveRepositories(
    page = 0,
    pageSize = 20
  ) {
    const offset = page * pageSize;
    
    return this.deduplicator.deduplicate(
      `active_repos_${page}_${pageSize}`,
      async () => {
        const { data, error } = await this.supabase
          .from('v_active_repositories')
          .select('*')
          .order('last_analyzed_at', { ascending: false })
          .range(offset, offset + pageSize - 1);
        
        if (error) throw error;
        return data;
      }
    );
  }

  /**
   * Get PR reviews for a repository
   */
  async getPRReviews(
    repositoryId: string,
    state?: 'open' | 'closed',
    limit = 50
  ) {
    const key = `pr_reviews_${repositoryId}_${state || 'all'}_${limit}`;
    
    return this.deduplicator.deduplicate(key, async () => {
      let query = this.supabase
        .from('pr_reviews')
        .select(`
          id,
          number,
          title,
          state,
          created_at,
          updated_at,
          author
        `)
        .eq('repository_id', repositoryId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (state) {
        query = query.eq('state', state);
      }
      
      return query;
    });
  }

  /**
   * Search analysis chunks with vector similarity
   */
  async searchAnalysisChunks(
    repositoryId: string,
    query: string,
    limit = 10
  ) {
    // This would typically use a vector similarity search
    // For now, using text search as placeholder
    return this.supabase
      .from('analysis_chunks')
      .select(`
        id,
        content,
        metadata,
        quality_score,
        relevance_score
      `)
      .eq('repository_id', repositoryId)
      .textSearch('content', query, {
        type: 'websearch',
        config: 'english'
      })
      .order('quality_score', { ascending: false })
      .limit(limit);
  }
}

// =============================================================================
// Main Export - Optimized Database Service
// =============================================================================

export class OptimizedDatabaseService {
  public cache: DatabaseMetadataCache;
  public deduplicator: RequestDeduplicator;
  public monitor: PerformanceMonitor;
  public queries: OptimizedQueries;

  constructor(private supabase: SupabaseClient) {
    this.cache = new DatabaseMetadataCache(supabase);
    this.deduplicator = new RequestDeduplicator();
    this.monitor = new PerformanceMonitor(supabase);
    this.queries = new OptimizedQueries(supabase, this.deduplicator);
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      cache: this.cache.getCacheStats(),
      deduplication: this.deduplicator.getStats()
    };
  }

  /**
   * Reset all caches and stats
   */
  reset(): void {
    this.cache.clearCache();
    this.deduplicator.resetStats();
  }
}

// =============================================================================
// Usage Example
// =============================================================================

/*
// Initialize the optimized service
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createOptimizedSupabaseClient(supabaseUrl, supabaseAnonKey);
const dbService = new OptimizedDatabaseService(supabase);

// Use the service
async function example() {
  // Get timezones (will be cached)
  const timezones = await dbService.cache.getTimezones();
  
  // Get repository (deduplicates concurrent requests)
  const repo = await dbService.queries.getRepositoryById('some-id');
  
  // Monitor performance
  const stats = await dbService.monitor.getPerformanceStats();
  
  // Get service statistics
  console.log(dbService.getStats());
}
*/
