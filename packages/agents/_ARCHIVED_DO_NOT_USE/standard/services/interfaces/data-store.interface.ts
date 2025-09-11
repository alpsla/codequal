export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  select?: string[];
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
}

export interface FilterCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'like';
  value: any;
}

export interface AnalysisReport {
  id: string;
  prId: string;
  repoUrl: string;
  userId: string;
  teamId: string;
  timestamp: Date;
  score: number;
  issues: AnalysisIssue[];
  metadata: ReportMetadata;
  markdownReport?: string;
}

export interface AnalysisIssue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  type: 'new' | 'existing';
  file: string;
  line?: number;
  description: string;
  suggestedFix?: string;
  age?: string;
}

export interface ReportMetadata {
  modelUsed: string;
  duration: number;
  filesAnalyzed: number;
  linesChanged: number;
  language: string;
  prSize: 'small' | 'medium' | 'large';
}

export interface CacheEntry<T> {
  key: string;
  value: T;
  expiresAt?: Date;
  tags?: string[];
}

export interface IDataStore {
  /**
   * Store analysis report
   */
  saveReport(report: AnalysisReport): Promise<string>;
  
  /**
   * Retrieve analysis report
   */
  getReport(id: string): Promise<AnalysisReport | null>;
  
  /**
   * Query reports with filters
   */
  queryReports(filters: FilterCondition[], options?: QueryOptions): Promise<AnalysisReport[]>;
  
  /**
   * Cache operations
   */
  cache: {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, ttl?: number): Promise<void>;
    delete(key: string): Promise<void>;
    deleteByTags(tags: string[]): Promise<void>;
  };
  
  /**
   * Transaction support
   */
  transaction<T>(callback: (tx: IDataStore) => Promise<T>): Promise<T>;
  
  /**
   * Bulk operations
   */
  bulkInsert<T>(table: string, items: T[]): Promise<void>;
  bulkUpdate<T>(table: string, items: T[]): Promise<void>;
  
  /**
   * Raw query support (use sparingly)
   */
  raw<T>(query: string, params?: any[]): Promise<T[]>;
}