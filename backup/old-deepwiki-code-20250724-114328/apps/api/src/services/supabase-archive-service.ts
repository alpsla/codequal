import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '@codequal/core/utils';
import * as zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

const logger = createLogger('supabase-archive-service');

export interface ArchiveMetadata {
  analysisId: string;
  repositoryUrl?: string;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  compressionRatio: number;
  archivedAt: Date;
  archivePath: string;
  retrievalCount: number;
}

export interface ArchiveResult {
  success: boolean;
  path?: string;
  compressionRatio?: number;
  savedBytes?: number;
  error?: string;
}

export class SupabaseArchiveService {
  private supabase: SupabaseClient;
  private readonly ARCHIVE_BUCKET = 'codequal-archives';
  private readonly TEMP_BUCKET = 'codequal-temp';
  
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    this.initializeBuckets();
  }

  /**
   * Initialize storage buckets if they don't exist
   */
  private async initializeBuckets() {
    try {
      // Create archive bucket for long-term storage
      const { error: archiveError } = await this.supabase.storage.createBucket(
        this.ARCHIVE_BUCKET,
        {
          public: false,
          fileSizeLimit: 1024 * 1024 * 100, // 100MB limit
          allowedMimeTypes: ['application/gzip', 'application/json']
        }
      );
      
      if (archiveError && !archiveError.message.includes('already exists')) {
        logger.error('Failed to create archive bucket:', archiveError);
      }

      // Create temp bucket for short-term storage
      const { error: tempError } = await this.supabase.storage.createBucket(
        this.TEMP_BUCKET,
        {
          public: false,
          fileSizeLimit: 1024 * 1024 * 50, // 50MB limit
          allowedMimeTypes: ['application/json']
        }
      );

      if (tempError && !tempError.message.includes('already exists')) {
        logger.error('Failed to create temp bucket:', tempError);
      }
    } catch (error) {
      logger.error('Failed to initialize buckets:', error);
    }
  }

  /**
   * Archive analysis data to Supabase Storage
   */
  async archiveAnalysis(
    analysisId: string,
    data: any,
    metadata?: Partial<ArchiveMetadata>
  ): Promise<ArchiveResult> {
    try {
      // Convert to JSON and compress
      const jsonStr = JSON.stringify(data);
      const originalSize = Buffer.byteLength(jsonStr);
      const compressed = await gzip(jsonStr);
      const compressedSize = compressed.length;
      const compressionRatio = originalSize / compressedSize;

      logger.info(`Archiving analysis ${analysisId}: ${originalSize} -> ${compressedSize} bytes (${compressionRatio.toFixed(2)}x compression)`);

      // Generate archive path
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const path = `analyses/${year}/${month}/${analysisId}/${Date.now()}.json.gz`;

      // Upload to Supabase Storage
      const { error: uploadError } = await this.supabase.storage
        .from(this.ARCHIVE_BUCKET)
        .upload(path, compressed, {
          contentType: 'application/gzip',
          metadata: {
            analysisId,
            originalSize: originalSize.toString(),
            compressedSize: compressedSize.toString(),
            compressionRatio: compressionRatio.toFixed(2),
            archivedAt: date.toISOString(),
            ...metadata
          }
        });

      if (uploadError) {
        throw uploadError;
      }

      // Store archive metadata in database
      await this.storeArchiveMetadata({
        analysisId,
        originalSizeBytes: originalSize,
        compressedSizeBytes: compressedSize,
        compressionRatio,
        archivedAt: date,
        archivePath: path,
        retrievalCount: 0,
        ...metadata
      });

      return {
        success: true,
        path,
        compressionRatio,
        savedBytes: originalSize - compressedSize
      };
    } catch (error) {
      logger.error(`Failed to archive analysis ${analysisId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Archive repository data to Supabase Storage
   */
  async archiveRepository(
    repositoryPath: string,
    repositoryUrl: string
  ): Promise<ArchiveResult> {
    try {
      // This would typically involve:
      // 1. Tar and gzip the repository
      // 2. Upload to Supabase Storage
      // 3. Remove from DeepWiki storage
      
      const repoName = repositoryPath.split('/').pop() || 'unknown';
      const date = new Date();
      const path = `repositories/${date.getFullYear()}/${repoName}/${Date.now()}.tar.gz`;

      // For now, just return a placeholder
      logger.info(`Would archive repository ${repositoryUrl} to ${path}`);

      return {
        success: true,
        path,
        compressionRatio: 5, // Typical for git repos
        savedBytes: 0
      };
    } catch (error) {
      logger.error(`Failed to archive repository ${repositoryUrl}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Retrieve archived analysis from Supabase Storage
   */
  async retrieveAnalysis(analysisId: string): Promise<any | null> {
    try {
      // Get archive metadata
      const metadata = await this.getArchiveMetadata(analysisId);
      if (!metadata) {
        logger.warn(`No archive found for analysis ${analysisId}`);
        return null;
      }

      // Download from Supabase Storage
      const { data, error } = await this.supabase.storage
        .from(this.ARCHIVE_BUCKET)
        .download(metadata.archivePath);

      if (error) {
        throw error;
      }

      // Decompress
      const buffer = await data.arrayBuffer();
      const decompressed = await gunzip(Buffer.from(buffer));
      const jsonStr = decompressed.toString('utf-8');

      // Update retrieval count
      await this.incrementRetrievalCount(analysisId);

      return JSON.parse(jsonStr);
    } catch (error) {
      logger.error(`Failed to retrieve analysis ${analysisId}:`, error);
      return null;
    }
  }

  /**
   * List archived analyses with filtering
   */
  async listArchives(options?: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<ArchiveMetadata[]> {
    const query = this.supabase
      .from('archive_metadata')
      .select('*')
      .order('archived_at', { ascending: false });

    if (options?.startDate) {
      query.gte('archived_at', options.startDate.toISOString());
    }

    if (options?.endDate) {
      query.lte('archived_at', options.endDate.toISOString());
    }

    if (options?.limit) {
      query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to list archives:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Calculate potential savings by archiving
   */
  async calculateArchiveSavings(
    analysisIds: string[]
  ): Promise<{
    totalSizeGB: number;
    compressedSizeGB: number;
    savedGB: number;
    monthlySavings: number;
  }> {
    try {
      // Get sizes of analyses to be archived
      const { data } = await this.supabase
        .from('repository_analyses')
        .select('id, pg_column_size(analysis_data) as size')
        .in('id', analysisIds);

      const totalBytes = data?.reduce((sum, row) => sum + (row.size || 0), 0) || 0;
      const totalGB = totalBytes / (1024 * 1024 * 1024);
      
      // Estimate compression (typically 5-10x for JSON)
      const compressionRatio = 7;
      const compressedGB = totalGB / compressionRatio;
      
      // Calculate savings
      // DigitalOcean: $0.50/GB, Supabase Storage: $0.021/GB
      const doMonthlyCost = totalGB * 0.50;
      const supabaseMonthlyCost = compressedGB * 0.021;
      const monthlySavings = doMonthlyCost - supabaseMonthlyCost;

      return {
        totalSizeGB: totalGB,
        compressedSizeGB: compressedGB,
        savedGB: totalGB - compressedGB,
        monthlySavings
      };
    } catch (error) {
      logger.error('Failed to calculate savings:', error);
      return {
        totalSizeGB: 0,
        compressedSizeGB: 0,
        savedGB: 0,
        monthlySavings: 0
      };
    }
  }

  /**
   * Batch archive multiple analyses
   */
  async batchArchive(
    analysisIds: string[],
    onProgress?: (processed: number, total: number) => void
  ): Promise<{
    successful: number;
    failed: number;
    totalSaved: number;
    errors: Array<{ id: string; error: string }>;
  }> {
    const results = {
      successful: 0,
      failed: 0,
      totalSaved: 0,
      errors: [] as Array<{ id: string; error: string }>
    };

    for (let i = 0; i < analysisIds.length; i++) {
      const id = analysisIds[i];
      
      try {
        // Get analysis data
        const { data } = await this.supabase
          .from('repository_analyses')
          .select('analysis_data, repository_url')
          .eq('id', id)
          .single();

        if (data) {
          const result = await this.archiveAnalysis(id, data.analysis_data, {
            repositoryUrl: data.repository_url
          });

          if (result.success) {
            results.successful++;
            results.totalSaved += result.savedBytes || 0;
          } else {
            results.failed++;
            results.errors.push({ id, error: result.error || 'Unknown error' });
          }
        }
      } catch (error) {
        results.failed++;
        results.errors.push({ 
          id, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }

      if (onProgress) {
        onProgress(i + 1, analysisIds.length);
      }
    }

    return results;
  }

  // Helper methods
  private async storeArchiveMetadata(metadata: ArchiveMetadata) {
    await this.supabase
      .from('archive_metadata')
      .upsert({
        analysis_id: metadata.analysisId,
        repository_url: metadata.repositoryUrl,
        original_size_bytes: metadata.originalSizeBytes,
        compressed_size_bytes: metadata.compressedSizeBytes,
        compression_ratio: metadata.compressionRatio,
        archived_at: metadata.archivedAt,
        archive_path: metadata.archivePath,
        retrieval_count: metadata.retrievalCount
      });
  }

  private async getArchiveMetadata(analysisId: string): Promise<ArchiveMetadata | null> {
    const { data } = await this.supabase
      .from('archive_metadata')
      .select('*')
      .eq('analysis_id', analysisId)
      .single();

    return data ? {
      analysisId: data.analysis_id,
      repositoryUrl: data.repository_url,
      originalSizeBytes: data.original_size_bytes,
      compressedSizeBytes: data.compressed_size_bytes,
      compressionRatio: data.compression_ratio,
      archivedAt: new Date(data.archived_at),
      archivePath: data.archive_path,
      retrievalCount: data.retrieval_count
    } : null;
  }

  private async incrementRetrievalCount(analysisId: string) {
    await this.supabase.rpc('increment', {
      table_name: 'archive_metadata',
      column_name: 'retrieval_count',
      row_id: analysisId
    });
  }
}

// Export singleton instance
export const supabaseArchiveService = new SupabaseArchiveService();