/**
 * Vector Database Service
 * Handles storage and retrieval of embeddings and associated data
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logging } from '@codequal/core';

export interface VectorDBService {
  store(key: string, data: any): Promise<void>;
  retrieve(key: string): Promise<any>;
  semanticSearch(baseKey: string, embedding: number[], topK: number): Promise<any[]>;
  deleteByPattern(pattern: string): Promise<void>;
}

/**
 * Supabase-based Vector DB implementation
 */
export class SupabaseVectorDB implements VectorDBService {
  private client: SupabaseClient;
  private logger = logging.createLogger('SupabaseVectorDB');
  
  constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
    
    if (!url || !key) {
      throw new Error('Missing Supabase credentials');
    }
    
    this.client = createClient(url, key);
  }
  
  async store(key: string, data: any): Promise<void> {
    try {
      const { error } = await this.client
        .from('vector_storage')
        .upsert({
          key,
          data,
          embedding: data.embedding,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (error) {
        // Log the full error for debugging
        this.logger.debug('Supabase error object:', JSON.stringify(error, null, 2));
        throw error;
      }
      this.logger.debug(`Stored data with key: ${key}`);
    } catch (error: any) {
      // If table doesn't exist, log warning but don't throw
      if (error.message?.includes('relation "public.vector_storage" does not exist')) {
        this.logger.warn(`Vector storage table not found. Please run: CREATE EXTENSION IF NOT EXISTS vector; and create the vector_storage table.`);
        this.logger.warn(`Data would have been stored with key: ${key}`);
        return;
      }
      this.logger.error(`Failed to store data:`, error);
      throw error;
    }
  }
  
  async retrieve(key: string): Promise<any> {
    try {
      const { data, error } = await this.client
        .from('vector_storage')
        .select('data')
        .eq('key', key)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        if (error.message?.includes('relation "public.vector_storage" does not exist')) {
          this.logger.warn(`Vector storage table not found for retrieve`);
          return null;
        }
        throw error;
      }
      
      return data?.data || null;
    } catch (error: any) {
      if (error.message?.includes('relation "public.vector_storage" does not exist')) {
        this.logger.warn(`Vector storage table not found for retrieve`);
        return null;
      }
      this.logger.error(`Failed to retrieve data: ${error}`);
      throw error;
    }
  }
  
  async semanticSearch(baseKey: string, embedding: number[], topK = 10): Promise<any[]> {
    try {
      // Use Supabase's vector similarity search
      const { data, error } = await this.client
        .rpc('vector_search', {
          query_embedding: embedding,
          base_key: baseKey,
          match_count: topK
        });
      
      if (error) {
        if (error.message?.includes('function "vector_search" does not exist')) {
          this.logger.warn(`Vector search function not found`);
          return [];
        }
        throw error;
      }
      return data || [];
    } catch (error: any) {
      if (error.message?.includes('relation "public.vector_storage" does not exist') ||
          error.message?.includes('function "vector_search" does not exist')) {
        this.logger.warn(`Vector storage not properly set up for semantic search`);
        return [];
      }
      this.logger.error(`Failed to perform semantic search: ${error}`);
      throw error;
    }
  }
  
  async deleteByPattern(pattern: string): Promise<void> {
    try {
      const { error } = await this.client
        .from('vector_storage')
        .delete()
        .like('key', `${pattern}%`);
      
      if (error) {
        if (error.message?.includes('relation "public.vector_storage" does not exist')) {
          this.logger.warn(`Vector storage table not found for delete`);
          return;
        }
        throw error;
      }
      this.logger.debug(`Deleted entries matching pattern: ${pattern}`);
    } catch (error: any) {
      if (error.message?.includes('relation "public.vector_storage" does not exist')) {
        this.logger.warn(`Vector storage table not found for delete`);
        return;
      }
      this.logger.error(`Failed to delete by pattern: ${error}`);
      throw error;
    }
  }
}

/**
 * In-memory Vector DB for testing
 */
export class InMemoryVectorDB implements VectorDBService {
  private storage = new Map<string, any>();
  private logger = logging.createLogger('InMemoryVectorDB');
  
  async store(key: string, data: any): Promise<void> {
    this.storage.set(key, data);
    this.logger.debug(`Stored in memory: ${key}`);
  }
  
  async retrieve(key: string): Promise<any> {
    return this.storage.get(key) || null;
  }
  
  async semanticSearch(baseKey: string, embedding: number[], topK = 10): Promise<any[]> {
    // Simple implementation - return all matching baseKey
    const results: any[] = [];
    
    for (const [key, data] of this.storage) {
      if (key.startsWith(baseKey) && data.embedding) {
        const similarity = this.cosineSimilarity(embedding, data.embedding);
        results.push({ ...data, similarity, key });
      }
    }
    
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }
  
  async deleteByPattern(pattern: string): Promise<void> {
    const keysToDelete: string[] = [];
    for (const key of this.storage.keys()) {
      if (key.startsWith(pattern)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.storage.delete(key));
    this.logger.debug(`Deleted ${keysToDelete.length} entries matching pattern: ${pattern}`);
  }
  
  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
  
  // Test helper
  getStats() {
    return {
      totalKeys: this.storage.size,
      keys: Array.from(this.storage.keys())
    };
  }
}

/**
 * Factory to create appropriate Vector DB instance
 */
export function createVectorDB(): VectorDBService {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  
  // Debug logging
  console.log('Vector DB initialization:');
  console.log('  SUPABASE_URL exists:', !!url);
  console.log('  SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log('  SUPABASE_KEY exists:', !!process.env.SUPABASE_KEY);
  
  // For now, always use in-memory DB until Supabase table is created
  // This allows the test to complete and show tool metrics
  if (process.env.USE_SUPABASE_VECTOR_DB === 'true' && url && key) {
    try {
      return new SupabaseVectorDB();
    } catch (error) {
      console.warn('Failed to create Supabase Vector DB, falling back to in-memory:', error);
    }
  }
  
  console.warn('Using in-memory Vector DB (Supabase table not yet configured)');
  console.warn('To enable Supabase Vector DB:');
  console.warn('1. Run the SQL in packages/mcp-hybrid/src/db/supabase-schema.sql');
  console.warn('2. Set USE_SUPABASE_VECTOR_DB=true in your environment');
  return new InMemoryVectorDB();
}