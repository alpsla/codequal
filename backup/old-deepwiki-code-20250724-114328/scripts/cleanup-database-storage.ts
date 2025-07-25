#!/usr/bin/env tsx
/**
 * Database Storage Cleanup Script
 * Safely cleans up expired and unnecessary data from the database
 */

import { createClient } from '@supabase/supabase-js';
import { createLogger } from '@codequal/core/utils';

const logger = createLogger('db-cleanup');

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Need service role for cleanup operations
);

interface CleanupResult {
  operation: string;
  recordsCleaned: number;
  spaceFreedGB: number;
  duration: number;
  error?: string;
}

class DatabaseCleaner {
  private results: CleanupResult[] = [];
  private dryRun: boolean;

  constructor(dryRun: boolean = false) {
    this.dryRun = dryRun;
  }

  async cleanExpiredVectorChunks(): Promise<CleanupResult> {
    const startTime = Date.now();
    const operation = 'Expired Vector Chunks';

    try {
      // First, check what would be deleted
      const { data: checkData } = await supabase.rpc('execute_query', {
        query_text: `
          SELECT COUNT(*) as count,
                 SUM(pg_column_size(embedding) + pg_column_size(content))::float8 / (1024*1024*1024) as size_gb
          FROM analysis_chunks
          WHERE storage_type != 'permanent' 
          AND expires_at < NOW();
        `
      });

      const count = checkData?.[0]?.count || 0;
      const sizeGB = checkData?.[0]?.size_gb || 0;

      if (count === 0) {
        return {
          operation,
          recordsCleaned: 0,
          spaceFreedGB: 0,
          duration: Date.now() - startTime
        };
      }

      logger.info(`Found ${count} expired chunks (${sizeGB.toFixed(2)}GB)`);

      if (!this.dryRun) {
        // Delete in batches to avoid locking
        const batchSize = 1000;
        let totalDeleted = 0;

        while (totalDeleted < count) {
          const { error } = await supabase
            .from('analysis_chunks')
            .delete()
            .match({ storage_type: 'cached' })
            .lt('expires_at', new Date().toISOString())
            .limit(batchSize);

          if (error) throw error;
          
          totalDeleted += batchSize;
          logger.info(`Deleted ${Math.min(totalDeleted, count)} / ${count} chunks`);
          
          // Small delay between batches
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      return {
        operation,
        recordsCleaned: count,
        spaceFreedGB: sizeGB,
        duration: Date.now() - startTime
      };

    } catch (error) {
      logger.error(`Failed to clean expired chunks:`, error);
      return {
        operation,
        recordsCleaned: 0,
        spaceFreedGB: 0,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async cleanOldAnalyses(daysOld: number = 90): Promise<CleanupResult> {
    const startTime = Date.now();
    const operation = `Analyses older than ${daysOld} days`;

    try {
      // Check what would be deleted
      const { data: checkData } = await supabase.rpc('execute_query', {
        query_text: `
          WITH old_analyses AS (
            SELECT ra.id, 
                   pg_column_size(ra.analysis_data)::float8 / (1024*1024*1024) as size_gb
            FROM repository_analyses ra
            WHERE ra.created_at < NOW() - INTERVAL '${daysOld} days'
            AND NOT EXISTS (
              SELECT 1 FROM pr_analyses pa 
              WHERE pa.repository_id = ra.repository_id 
              AND pa.created_at > NOW() - INTERVAL '30 days'
            )
          )
          SELECT COUNT(*) as count, SUM(size_gb) as size_gb
          FROM old_analyses;
        `
      });

      const count = checkData?.[0]?.count || 0;
      const sizeGB = checkData?.[0]?.size_gb || 0;

      if (count === 0) {
        return {
          operation,
          recordsCleaned: 0,
          spaceFreedGB: 0,
          duration: Date.now() - startTime
        };
      }

      logger.info(`Found ${count} old analyses (${sizeGB.toFixed(2)}GB)`);

      if (!this.dryRun) {
        // Archive before deletion (optional)
        // await this.archiveAnalyses(oldAnalyses);

        // Delete old analyses
        const { error } = await supabase.rpc('execute_query', {
          query_text: `
            DELETE FROM repository_analyses
            WHERE created_at < NOW() - INTERVAL '${daysOld} days'
            AND NOT EXISTS (
              SELECT 1 FROM pr_analyses pa 
              WHERE pa.repository_id = repository_analyses.repository_id 
              AND pa.created_at > NOW() - INTERVAL '30 days'
            );
          `
        });

        if (error) throw error;
      }

      return {
        operation,
        recordsCleaned: count,
        spaceFreedGB: sizeGB,
        duration: Date.now() - startTime
      };

    } catch (error) {
      logger.error(`Failed to clean old analyses:`, error);
      return {
        operation,
        recordsCleaned: 0,
        spaceFreedGB: 0,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async cleanDuplicateVectors(): Promise<CleanupResult> {
    const startTime = Date.now();
    const operation = 'Duplicate Vectors';

    try {
      // Find duplicates
      const { data: checkData } = await supabase.rpc('execute_query', {
        query_text: `
          WITH duplicates AS (
            SELECT content_hash, 
                   COUNT(*) as dup_count,
                   MIN(id) as keep_id
            FROM analysis_chunks
            WHERE content_hash IS NOT NULL
            GROUP BY content_hash
            HAVING COUNT(*) > 1
          )
          SELECT SUM(dup_count - 1) as count,
                 SUM((dup_count - 1) * 6)::float8 / 1024 as size_gb
          FROM duplicates;
        `
      });

      const count = checkData?.[0]?.count || 0;
      const sizeGB = checkData?.[0]?.size_gb || 0;

      if (count === 0) {
        return {
          operation,
          recordsCleaned: 0,
          spaceFreedGB: 0,
          duration: Date.now() - startTime
        };
      }

      logger.info(`Found ${count} duplicate vectors (${sizeGB.toFixed(2)}GB)`);

      if (!this.dryRun) {
        // Delete duplicates keeping the oldest one
        const { error } = await supabase.rpc('execute_query', {
          query_text: `
            WITH duplicates AS (
              SELECT content_hash, MIN(id) as keep_id
              FROM analysis_chunks
              WHERE content_hash IS NOT NULL
              GROUP BY content_hash
              HAVING COUNT(*) > 1
            )
            DELETE FROM analysis_chunks
            WHERE content_hash IN (SELECT content_hash FROM duplicates)
            AND id NOT IN (SELECT keep_id FROM duplicates);
          `
        });

        if (error) throw error;
      }

      return {
        operation,
        recordsCleaned: count,
        spaceFreedGB: sizeGB,
        duration: Date.now() - startTime
      };

    } catch (error) {
      logger.error(`Failed to clean duplicate vectors:`, error);
      return {
        operation,
        recordsCleaned: 0,
        spaceFreedGB: 0,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async vacuumDatabase(): Promise<CleanupResult> {
    const startTime = Date.now();
    const operation = 'VACUUM Database';

    try {
      if (!this.dryRun) {
        logger.info('Running VACUUM ANALYZE...');
        
        // VACUUM reclaims storage and updates statistics
        const { error } = await supabase.rpc('execute_query', {
          query_text: 'VACUUM ANALYZE;'
        });

        if (error) throw error;
      }

      return {
        operation,
        recordsCleaned: 0,
        spaceFreedGB: 0, // VACUUM doesn't directly report freed space
        duration: Date.now() - startTime
      };

    } catch (error) {
      logger.error(`Failed to vacuum database:`, error);
      return {
        operation,
        recordsCleaned: 0,
        spaceFreedGB: 0,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async runAllCleanups(): Promise<void> {
    logger.info(`Starting database cleanup (dry run: ${this.dryRun})`);

    // Get initial metrics
    const { data: beforeData } = await supabase.rpc('execute_query', {
      query_text: `SELECT pg_database_size(current_database())::float8 / (1024*1024*1024) as size_gb`
    });
    const sizeBefore = beforeData?.[0]?.size_gb || 0;

    // Run cleanup operations
    this.results.push(await this.cleanExpiredVectorChunks());
    this.results.push(await this.cleanOldAnalyses());
    this.results.push(await this.cleanDuplicateVectors());
    
    if (!this.dryRun) {
      this.results.push(await this.vacuumDatabase());
    }

    // Get final metrics
    const { data: afterData } = await supabase.rpc('execute_query', {
      query_text: `SELECT pg_database_size(current_database())::float8 / (1024*1024*1024) as size_gb`
    });
    const sizeAfter = afterData?.[0]?.size_gb || 0;

    // Generate report
    this.generateReport(sizeBefore, sizeAfter);
  }

  private generateReport(sizeBefore: number, sizeAfter: number) {
    console.log('\n📊 Database Cleanup Report');
    console.log('=========================\n');

    if (this.dryRun) {
      console.log('🔍 DRY RUN MODE - No actual deletions performed\n');
    }

    console.log(`Database Size Before: ${sizeBefore.toFixed(2)}GB`);
    console.log(`Database Size After: ${sizeAfter.toFixed(2)}GB`);
    console.log(`Space Freed: ${(sizeBefore - sizeAfter).toFixed(2)}GB\n`);

    console.log('Cleanup Operations:');
    console.log('------------------');

    let totalRecords = 0;
    let totalSpace = 0;
    let totalTime = 0;

    this.results.forEach(result => {
      console.log(`\n${result.operation}:`);
      if (result.error) {
        console.log(`  ❌ Error: ${result.error}`);
      } else {
        console.log(`  ✅ Records cleaned: ${result.recordsCleaned.toLocaleString()}`);
        console.log(`  💾 Space freed: ${result.spaceFreedGB.toFixed(2)}GB`);
        console.log(`  ⏱️  Duration: ${(result.duration / 1000).toFixed(1)}s`);
        
        totalRecords += result.recordsCleaned;
        totalSpace += result.spaceFreedGB;
        totalTime += result.duration;
      }
    });

    console.log('\n📈 Summary:');
    console.log('---------');
    console.log(`Total records cleaned: ${totalRecords.toLocaleString()}`);
    console.log(`Total space freed: ${totalSpace.toFixed(2)}GB`);
    console.log(`Total duration: ${(totalTime / 1000).toFixed(1)}s`);
    console.log(`Estimated monthly savings: $${(totalSpace * 0.50).toFixed(2)}`);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const help = args.includes('--help');

if (help) {
  console.log(`
Database Storage Cleanup Script

Usage: tsx cleanup-database-storage.ts [options]

Options:
  --dry-run    Show what would be cleaned without actually deleting
  --help       Show this help message

Examples:
  tsx cleanup-database-storage.ts --dry-run    # Preview cleanup
  tsx cleanup-database-storage.ts              # Perform actual cleanup
`);
  process.exit(0);
}

// Run cleanup
const cleaner = new DatabaseCleaner(dryRun);
cleaner.runAllCleanups().catch(error => {
  logger.error('Cleanup failed:', error);
  process.exit(1);
});