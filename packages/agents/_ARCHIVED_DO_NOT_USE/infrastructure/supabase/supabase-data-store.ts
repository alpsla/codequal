import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  IDataStore, 
  AnalysisReport, 
  FilterCondition,
  QueryOptions 
} from '../../standard/services/interfaces/data-store.interface';

/**
 * Supabase implementation of the data store
 */
export class SupabaseDataStore implements IDataStore {
  private supabase: SupabaseClient;
  private reportsTable = 'analysis_reports';
  private cacheTable = 'cache_entries';

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async saveReport(report: AnalysisReport): Promise<string> {
    try {
      const { data, error } = await this.supabase
        .from(this.reportsTable)
        .insert(this.mapReportToDb(report))
        .select()
        .single();

      if (error) throw error;

      return data.id;
    } catch (error) {
      console.error('Error saving report:', error);
      throw error;
    }
  }

  async getReport(id: string): Promise<AnalysisReport | null> {
    try {
      const { data, error } = await this.supabase
        .from(this.reportsTable)
        .select('*')
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data ? this.mapReportFromDb(data) : null;
    } catch (error) {
      console.error('Error fetching report:', error);
      return null;
    }
  }

  async queryReports(
    filters: FilterCondition[], 
    options?: QueryOptions
  ): Promise<AnalysisReport[]> {
    try {
      let query = this.supabase.from(this.reportsTable).select('*');

      // Apply filters
      for (const filter of filters) {
        switch (filter.operator) {
          case 'eq':
            query = query.eq(filter.field, filter.value);
            break;
          case 'neq':
            query = query.neq(filter.field, filter.value);
            break;
          case 'gt':
            query = query.gt(filter.field, filter.value);
            break;
          case 'gte':
            query = query.gte(filter.field, filter.value);
            break;
          case 'lt':
            query = query.lt(filter.field, filter.value);
            break;
          case 'lte':
            query = query.lte(filter.field, filter.value);
            break;
          case 'in':
            query = query.in(filter.field, filter.value);
            break;
          case 'like':
            query = query.ilike(filter.field, `%${filter.value}%`);
            break;
        }
      }

      // Apply options
      if (options) {
        if (options.orderBy) {
          query = query.order(options.orderBy, { 
            ascending: options.orderDirection === 'asc' 
          });
        }
        if (options.limit) {
          query = query.limit(options.limit);
        }
        if (options.offset) {
          query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(this.mapReportFromDb);
    } catch (error) {
      console.error('Error querying reports:', error);
      return [];
    }
  }

  // Cache implementation
  cache = {
    get: async <T>(key: string): Promise<T | null> => {
      try {
        const { data, error } = await this.supabase
          .from(this.cacheTable)
          .select('*')
          .eq('key', key)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (!data || (data.expires_at && new Date(data.expires_at) < new Date())) {
          return null;
        }

        return data.value as T;
      } catch (error) {
        console.error('Cache get error:', error);
        return null;
      }
    },

    set: async <T>(key: string, value: T, ttl?: number): Promise<void> => {
      try {
        const expires_at = ttl 
          ? new Date(Date.now() + ttl * 1000).toISOString()
          : null;

        const { error } = await this.supabase
          .from(this.cacheTable)
          .upsert({
            key,
            value,
            expires_at,
            updated_at: new Date().toISOString()
          });

        if (error) throw error;
      } catch (error) {
        console.error('Cache set error:', error);
      }
    },

    delete: async (key: string): Promise<void> => {
      try {
        const { error } = await this.supabase
          .from(this.cacheTable)
          .delete()
          .eq('key', key);

        if (error) throw error;
      } catch (error) {
        console.error('Cache delete error:', error);
      }
    },

    deleteByTags: async (tags: string[]): Promise<void> => {
      try {
        const { error } = await this.supabase
          .from(this.cacheTable)
          .delete()
          .overlaps('tags', tags);

        if (error) throw error;
      } catch (error) {
        console.error('Cache delete by tags error:', error);
      }
    }
  };

  async transaction<T>(
    callback: (tx: IDataStore) => Promise<T>
  ): Promise<T> {
    // Supabase doesn't support transactions in the client library
    // For now, just execute the callback with this instance
    // In production, you might want to use Supabase Edge Functions
    // or implement optimistic locking
    return callback(this);
  }

  async bulkInsert<T>(table: string, items: T[]): Promise<void> {
    try {
      const { error } = await this.supabase
        .from(table)
        .insert(items);

      if (error) throw error;
    } catch (error) {
      console.error('Bulk insert error:', error);
      throw error;
    }
  }

  async bulkUpdate<T>(table: string, items: T[]): Promise<void> {
    // Supabase doesn't have bulk update, so we do it one by one
    // In production, consider using a stored procedure
    for (const item of items) {
      const { error } = await this.supabase
        .from(table)
        .update(item)
        .eq('id', (item as any).id);

      if (error) throw error;
    }
  }

  async raw<T>(query: string, params?: any[]): Promise<T[]> {
    try {
      const { data, error } = await this.supabase.rpc('execute_raw_sql', {
        query,
        params
      });

      if (error) throw error;

      return data as T[];
    } catch (error) {
      console.error('Raw query error:', error);
      throw error;
    }
  }

  // Helper methods
  private mapReportToDb(report: AnalysisReport): any {
    return {
      id: report.id,
      analysis_id: report.id,  // Use report ID as analysis_id
      pr_id: report.prId,  // Changed to snake_case
      repository_url: report.repoUrl,  // Database expects repository_url, not repo_url
      user_id: report.userId,  // Changed to snake_case
      team_id: report.teamId,  // Changed to snake_case
      timestamp: report.timestamp.toISOString(),
      score: report.score,
      issues: report.issues,
      metadata: report.metadata,
      markdown_report: report.markdownReport,  // Changed to snake_case
      report_data: {}  // Add empty report_data as it's required by database
    };
  }

  private mapReportFromDb(data: any): AnalysisReport {
    return {
      id: data.id,
      prId: data.pr_id,  // Changed from snake_case
      repoUrl: data.repository_url,  // Database has repository_url, not repo_url
      userId: data.user_id,  // Changed from snake_case
      teamId: data.team_id,  // Changed from snake_case
      timestamp: new Date(data.timestamp),
      score: data.score,
      issues: data.issues,
      metadata: data.metadata,
      markdownReport: data.markdown_report  // Changed from snake_case
    };
  }
}