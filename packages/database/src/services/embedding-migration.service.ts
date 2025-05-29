import { createClient } from '@supabase/supabase-js';
import { EmbeddingService } from './embedding.service';

export interface MigrationOptions {
  batchSize?: number;
  validateSamples?: boolean;
  keepOldData?: boolean;
  progressCallback?: (progress: MigrationProgress) => void;
}

export interface MigrationProgress {
  total: number;
  processed: number;
  percentage: number;
  estimatedTimeRemaining: number; // in seconds
  currentBatch: number;
  totalBatches: number;
}

export class EmbeddingModelMigrationService {
  private supabase = (() => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    
    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are required');
    }
    
    return createClient(url, key);
  })();
  
  private oldEmbeddingService: EmbeddingService;
  private newEmbeddingService: EmbeddingService;
  private startTime = 0;
  
  constructor(
    private sourceModel: string,
    private sourceDimensions: number,
    private targetModel: string,
    private targetDimensions: number
  ) {
    // Create service instances for both models
    this.oldEmbeddingService = new EmbeddingService();
    this.newEmbeddingService = new EmbeddingService();
    this.newEmbeddingService.updateModel(targetModel, targetDimensions);
  }
  
  /**
   * Full re-indexing migration strategy
   */
  async fullReindex(options: MigrationOptions = {}): Promise<void> {
    const {
      batchSize = 100,
      validateSamples = true,
      keepOldData = true,
      progressCallback
    } = options;
    
    // eslint-disable-next-line no-console
    console.log(`Starting full reindex from ${this.sourceModel} to ${this.targetModel}`);
    this.startTime = Date.now();
    
    try {
      // Step 1: Get total count
      const { count } = await this.supabase
        .from('analysis_chunks')
        .select('*', { count: 'exact', head: true });
      
      if (!count) {
        throw new Error('Could not get chunk count');
      }
      
      const totalBatches = Math.ceil(count / batchSize);
      
      // Step 2: Validate migration with samples
      if (validateSamples) {
        await this.validateMigration();
      }
      
      // Step 3: Create migration table
      await this.createMigrationTable();
      
      // Step 4: Process all chunks in batches
      let offset = 0;
      let processed = 0;
      let currentBatch = 0;
      
      while (processed < count) {
        currentBatch++;
        
        // Fetch batch of chunks
        const { data: chunks, error } = await this.supabase
          .from('analysis_chunks')
          .select('*')
          .range(offset, offset + batchSize - 1);
        
        if (error) throw error;
        if (!chunks || chunks.length === 0) break;
        
        // Generate new embeddings
        const contents = chunks.map(c => c.content);
        const newEmbeddings = await this.newEmbeddingService.generateEmbeddings(contents);
        
        // Prepare migration records
        const migrationRecords = chunks.map((chunk, idx) => ({
          id: chunk.id, // Keep same ID
          repository_id: chunk.repository_id,
          source_type: chunk.source_type,
          source_id: chunk.source_id,
          content: chunk.content,
          embedding: `[${newEmbeddings[idx].join(',')}]`, // Format for pgvector
          metadata: {
            ...chunk.metadata,
            embedding_model: this.targetModel,
            embedding_dimensions: this.targetDimensions,
            migrated_at: new Date().toISOString(),
            original_model: this.sourceModel
          },
          quality_score: chunk.quality_score,
          relevance_score: chunk.relevance_score,
          storage_type: chunk.storage_type,
          ttl: chunk.ttl,
          created_at: chunk.created_at,
          updated_at: new Date().toISOString(),
          last_accessed_at: chunk.last_accessed_at,
          access_count: chunk.access_count
        }));
        
        // Insert into migration table
        const { error: insertError } = await this.supabase
          .from('analysis_chunks_migration')
          .insert(migrationRecords);
        
        if (insertError) throw insertError;
        
        processed += chunks.length;
        
        // Report progress
        if (progressCallback) {
          const progress: MigrationProgress = {
            total: count,
            processed,
            percentage: Math.round((processed / count) * 100),
            estimatedTimeRemaining: this.estimateTimeRemaining(processed, count),
            currentBatch,
            totalBatches
          };
          progressCallback(progress);
        }
        
        // eslint-disable-next-line no-console
        console.log(`Processed ${processed}/${count} chunks (${Math.round((processed / count) * 100)}%)`);
        
        offset += batchSize;
        
        // Rate limiting to avoid overwhelming OpenAI
        await this.sleep(100); // 100ms between batches
      }
      
      // Step 5: Validate migration
      await this.validateMigrationComplete(count);
      
      // Step 6: Swap tables
      await this.swapTables(keepOldData);
      
      const duration = (Date.now() - this.startTime) / 1000;
      // eslint-disable-next-line no-console
      console.log(`Migration complete! Processed ${processed} chunks in ${duration.toFixed(2)} seconds.`);
      
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Migration failed:', error);
      await this.rollback();
      throw error;
    }
  }
  
  /**
   * Validate migration with sample comparisons
   */
  private async validateMigration(): Promise<void> {
    // eslint-disable-next-line no-console
    console.log('Validating migration with sample embeddings...');
    
    // Get a few sample chunks
    const { data: samples } = await this.supabase
      .from('analysis_chunks')
      .select('*')
      .limit(5);
    
    if (!samples || samples.length === 0) return;
    
    // Generate embeddings with both models
    const contents = samples.map(s => s.content);
    const oldEmbeddings = await this.oldEmbeddingService.generateEmbeddings(contents);
    const newEmbeddings = await this.newEmbeddingService.generateEmbeddings(contents);
    
    // eslint-disable-next-line no-console
    console.log('Sample validation:');
    // eslint-disable-next-line no-console
    console.log(`- Old model dimensions: ${oldEmbeddings[0].length}`);
    // eslint-disable-next-line no-console
    console.log(`- New model dimensions: ${newEmbeddings[0].length}`);
    // eslint-disable-next-line no-console
    console.log(`- Samples processed: ${samples.length}`);
    
    // Basic sanity checks
    if (oldEmbeddings[0].length !== this.sourceDimensions) {
      throw new Error(`Old embeddings have wrong dimensions: ${oldEmbeddings[0].length}`);
    }
    
    if (newEmbeddings[0].length !== this.targetDimensions) {
      throw new Error(`New embeddings have wrong dimensions: ${newEmbeddings[0].length}`);
    }
    
    // eslint-disable-next-line no-console
    console.log('Validation passed! ✓');
  }
  
  /**
   * Create migration table
   */
  private async createMigrationTable(): Promise<void> {
    // eslint-disable-next-line no-console
    console.log('Creating migration table...');
    
    // Drop if exists and create fresh
    const { error } = await this.supabase.rpc('execute_sql', {
      query: `
        DROP TABLE IF EXISTS analysis_chunks_migration CASCADE;
        
        CREATE TABLE analysis_chunks_migration (
          LIKE analysis_chunks INCLUDING ALL
        );
        
        -- Drop old embedding column
        ALTER TABLE analysis_chunks_migration 
        DROP COLUMN embedding;
        
        -- Add new embedding column with new dimensions
        ALTER TABLE analysis_chunks_migration 
        ADD COLUMN embedding vector(${this.targetDimensions});
        
        -- Create index for new embeddings
        CREATE INDEX idx_analysis_chunks_migration_embedding 
        ON analysis_chunks_migration 
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100);
      `
    });
    
    if (error) throw error;
    // eslint-disable-next-line no-console
    console.log('Migration table created ✓');
  }
  
  /**
   * Validate migration is complete
   */
  private async validateMigrationComplete(expectedCount: number): Promise<void> {
    const { count } = await this.supabase
      .from('analysis_chunks_migration')
      .select('*', { count: 'exact', head: true });
    
    if (count !== expectedCount) {
      throw new Error(`Migration incomplete: expected ${expectedCount} chunks, got ${count}`);
    }
    
    // eslint-disable-next-line no-console
    console.log(`Migration validation passed: ${count} chunks migrated ✓`);
  }
  
  /**
   * Swap old and new tables
   */
  private async swapTables(keepOldData: boolean): Promise<void> {
    // eslint-disable-next-line no-console
    console.log('Swapping tables...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupTableName = `analysis_chunks_backup_${timestamp}`;
    
    const query = keepOldData ? `
      BEGIN;
      
      -- Rename current table to backup
      ALTER TABLE analysis_chunks RENAME TO ${backupTableName};
      
      -- Rename migration table to main
      ALTER TABLE analysis_chunks_migration RENAME TO analysis_chunks;
      
      -- Update function to use new dimensions
      ${this.getUpdatedSearchFunction()}
      
      COMMIT;
    ` : `
      BEGIN;
      
      -- Drop old table
      DROP TABLE analysis_chunks CASCADE;
      
      -- Rename migration table to main
      ALTER TABLE analysis_chunks_migration RENAME TO analysis_chunks;
      
      -- Update function to use new dimensions
      ${this.getUpdatedSearchFunction()}
      
      COMMIT;
    `;
    
    const { error } = await this.supabase.rpc('execute_sql', { query });
    
    if (error) throw error;
    // eslint-disable-next-line no-console
    console.log('Table swap complete ✓');
    
    if (keepOldData) {
      // eslint-disable-next-line no-console
      console.log(`Old data backed up to table: ${backupTableName}`);
    }
  }
  
  /**
   * Get updated search function with new dimensions
   */
  private getUpdatedSearchFunction(): string {
    return `
      DROP FUNCTION IF EXISTS search_similar_chunks;
      
      CREATE FUNCTION search_similar_chunks(
        query_embedding vector(${this.targetDimensions}),
        repo_id UUID DEFAULT NULL,
        limit_count INTEGER DEFAULT 10,
        min_score FLOAT DEFAULT 0.7
      )
      RETURNS TABLE (
        chunk_id UUID,
        content TEXT,
        metadata JSONB,
        similarity FLOAT
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          ac.id,
          ac.content,
          ac.metadata,
          1 - (ac.embedding <=> query_embedding) as similarity
        FROM analysis_chunks ac
        WHERE 
          (repo_id IS NULL OR ac.repository_id = repo_id)
          AND ac.embedding IS NOT NULL
          AND 1 - (ac.embedding <=> query_embedding) >= min_score
        ORDER BY ac.embedding <=> query_embedding
        LIMIT limit_count;
      END;
      $$ LANGUAGE plpgsql;
    `;
  }
  
  /**
   * Rollback in case of failure
   */
  private async rollback(): Promise<void> {
    // eslint-disable-next-line no-console
    console.log('Rolling back migration...');
    
    const { error } = await this.supabase.rpc('execute_sql', {
      query: `DROP TABLE IF EXISTS analysis_chunks_migration CASCADE;`
    });
    
    if (!error) {
      // eslint-disable-next-line no-console
      console.log('Rollback complete ✓');
    }
  }
  
  /**
   * Estimate time remaining
   */
  private estimateTimeRemaining(processed: number, total: number): number {
    if (processed === 0) return 0;
    
    const elapsed = (Date.now() - this.startTime) / 1000; // seconds
    const rate = processed / elapsed; // chunks per second
    const remaining = total - processed;
    
    return Math.round(remaining / rate);
  }
  
  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
