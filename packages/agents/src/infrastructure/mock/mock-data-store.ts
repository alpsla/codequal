/**
 * Mock implementation of IDataStore for testing
 */

import { 
  IDataStore, 
  AnalysisReport, 
  CacheEntry,
  FilterCondition,
  QueryOptions 
} from '../../standard/services/interfaces/data-store.interface';

export class MockDataStore implements IDataStore {
  private reports: Map<string, AnalysisReport> = new Map();
  private cacheData: Map<string, CacheEntry<any>> = new Map();
  
  cache = {
    get: async <T>(key: string): Promise<T | null> => {
      const entry = this.cacheData.get(key);
      if (!entry) return null;
      
      // Check if expired
      if (entry.expiresAt && entry.expiresAt < new Date()) {
        this.cacheData.delete(key);
        return null;
      }
      
      return entry.value as T;
    },
    
    set: async <T>(key: string, value: T, ttlSeconds?: number): Promise<void> => {
      const expiresAt = ttlSeconds 
        ? new Date(Date.now() + ttlSeconds * 1000)
        : undefined;
      
      this.cacheData.set(key, {
        key,
        value,
        expiresAt
      });
    },
    
    delete: async (key: string): Promise<void> => {
      this.cacheData.delete(key);
    },
    
    clear: async (): Promise<void> => {
      this.cacheData.clear();
    },
    
    deleteByTags: async (tags: string[]): Promise<void> => {
      // Mock implementation - delete entries with matching tags
      for (const [key, entry] of this.cacheData.entries()) {
        if (tags.some(tag => key.includes(tag))) {
          this.cacheData.delete(key);
        }
      }
    }
  };
  
  async saveReport(report: AnalysisReport): Promise<string> {
    this.reports.set(report.id, report);
    
    // Also cache by PR ID for quick lookup
    if (report.prId) {
      await this.cache.set(`report:pr:${report.prId}`, report);
    }
    
    return report.id;
  }
  
  async getReport(reportId: string): Promise<AnalysisReport | null> {
    return this.reports.get(reportId) || null;
  }
  
  async getReportsByUser(
    userId: string, 
    limit?: number
  ): Promise<AnalysisReport[]> {
    const userReports = Array.from(this.reports.values())
      .filter(r => r.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return limit ? userReports.slice(0, limit) : userReports;
  }
  
  async getReportsByTeam(
    teamId: string, 
    startDate?: Date, 
    endDate?: Date
  ): Promise<AnalysisReport[]> {
    return Array.from(this.reports.values())
      .filter(r => {
        if (r.teamId !== teamId) return false;
        if (startDate && r.timestamp < startDate) return false;
        if (endDate && r.timestamp > endDate) return false;
        return true;
      })
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
  
  async deleteReport(reportId: string): Promise<void> {
    const report = this.reports.get(reportId);
    if (report?.prId) {
      await this.cache.delete(`report:pr:${report.prId}`);
    }
    this.reports.delete(reportId);
  }
  
  async getReportByPR(prId: string): Promise<AnalysisReport | null> {
    // Try cache first
    const cached = await this.cache.get<AnalysisReport>(`report:pr:${prId}`);
    if (cached) return cached;
    
    // Search in reports
    return Array.from(this.reports.values()).find(r => r.prId === prId) || null;
  }
  
  async updateReportMetrics(
    reportId: string, 
    metrics: Record<string, any>
  ): Promise<void> {
    const report = this.reports.get(reportId);
    if (report) {
      report.metadata = { ...report.metadata, ...metrics };
      this.reports.set(reportId, report);
    }
  }
  
  async queryReports(
    filters: FilterCondition[], 
    options?: QueryOptions
  ): Promise<AnalysisReport[]> {
    let results = Array.from(this.reports.values());
    
    // Apply filters
    for (const filter of filters) {
      results = results.filter(report => {
        const value = (report as any)[filter.field];
        
        switch (filter.operator) {
          case 'eq':
            return value === filter.value;
          case 'neq':
            return value !== filter.value;
          case 'gt':
            return value > filter.value;
          case 'gte':
            return value >= filter.value;
          case 'lt':
            return value < filter.value;
          case 'lte':
            return value <= filter.value;
          case 'in':
            return Array.isArray(filter.value) && filter.value.includes(value);
          case 'like':
            return String(value).includes(String(filter.value));
          default:
            return true;
        }
      });
    }
    
    // Apply options
    if (options?.sort) {
      results.sort((a, b) => {
        const aVal = (a as any)[options.sort!.field];
        const bVal = (b as any)[options.sort!.field];
        const order = options.sort!.order === 'asc' ? 1 : -1;
        return aVal > bVal ? order : -order;
      });
    }
    
    if (options?.limit) {
      results = results.slice(options.offset || 0, (options.offset || 0) + options.limit);
    }
    
    return results;
  }
  
  async transaction<T>(callback: (tx: IDataStore) => Promise<T>): Promise<T> {
    // Mock transaction - just execute the callback with this instance
    return await callback(this);
  }
  
  async bulkInsert<T>(table: string, items: T[]): Promise<void> {
    // Mock implementation - just store if it's analysis reports
    if (table === 'analysis_reports') {
      for (const item of items) {
        await this.saveReport(item as unknown as AnalysisReport);
      }
    }
    // For other tables, just log
    console.log(`Mock bulkInsert to table ${table}:`, items.length, 'items');
  }
  
  async bulkUpdate<T>(table: string, items: T[]): Promise<void> {
    // Mock implementation - for now just log
    console.log(`Mock bulkUpdate to table ${table}:`, items.length, 'items');
  }
  
  async raw(query: string, params?: any[]): Promise<any> {
    // Mock raw query - return empty result
    console.log('Mock raw query:', query, params);
    return [];
  }
}