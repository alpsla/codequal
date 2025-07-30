export * from './RedisCacheService';
export { createCacheService } from './RedisCacheService';

// Re-export types for convenience
export type {
  DeepWikiReport,
  CacheStats,
} from './RedisCacheService';