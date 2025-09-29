#!/usr/bin/env npx ts-node

import * as fs from 'fs';
import * as path from 'path';

export interface BatchConfig {
  maxFilesPerBatch: number;
  maxBatchSizeBytes?: number;
  concurrentBatches?: number;
  prioritizeBySize?: boolean;
  excludePatterns?: string[];
}

export interface FileBatch {
  id: string;
  files: string[];
  totalSize: number;
  fileCount: number;
}

export class FileBatcher {
  private readonly DEFAULT_BATCH_SIZE = 500;
  private readonly DEFAULT_MAX_SIZE_MB = 50;

  constructor(private config: BatchConfig) {
    this.config = {
      maxFilesPerBatch: config.maxFilesPerBatch || this.DEFAULT_BATCH_SIZE,
      maxBatchSizeBytes: config.maxBatchSizeBytes || (this.DEFAULT_MAX_SIZE_MB * 1024 * 1024),
      concurrentBatches: config.concurrentBatches || 2,
      prioritizeBySize: config.prioritizeBySize !== false,
      excludePatterns: config.excludePatterns || []
    };
  }

  async createBatches(filePaths: string[]): Promise<FileBatch[]> {
    console.log(`📦 Creating batches for ${filePaths.length} files`);

    // Filter out excluded patterns
    const eligibleFiles = this.filterFiles(filePaths);
    console.log(`   After filtering: ${eligibleFiles.length} files`);

    // Get file sizes if prioritizing
    const fileInfo = await this.getFileInfo(eligibleFiles);

    // Sort by size if configured (larger files first for better distribution)
    if (this.config.prioritizeBySize) {
      fileInfo.sort((a, b) => b.size - a.size);
    }

    // Create batches
    const batches: FileBatch[] = [];
    let currentBatch: FileBatch = this.createEmptyBatch(batches.length);

    for (const file of fileInfo) {
      // Check if adding this file would exceed limits
      const wouldExceedFileLimit = currentBatch.files.length >= this.config.maxFilesPerBatch!;
      const wouldExceedSizeLimit = this.config.maxBatchSizeBytes &&
        (currentBatch.totalSize + file.size) > this.config.maxBatchSizeBytes;

      if (wouldExceedFileLimit || wouldExceedSizeLimit) {
        // Save current batch and start a new one
        if (currentBatch.files.length > 0) {
          batches.push(currentBatch);
          currentBatch = this.createEmptyBatch(batches.length);
        }
      }

      // Add file to current batch
      currentBatch.files.push(file.path);
      currentBatch.totalSize += file.size;
      currentBatch.fileCount++;
    }

    // Add the last batch if it has files
    if (currentBatch.files.length > 0) {
      batches.push(currentBatch);
    }

    console.log(`   Created ${batches.length} batches`);
    batches.forEach((batch, i) => {
      const sizeMB = (batch.totalSize / (1024 * 1024)).toFixed(2);
      console.log(`   Batch ${i + 1}: ${batch.fileCount} files, ${sizeMB} MB`);
    });

    return batches;
  }

  async processBatchesInParallel<T>(
    batches: FileBatch[],
    processor: (batch: FileBatch) => Promise<T>
  ): Promise<T[]> {
    const concurrency = this.config.concurrentBatches || 2;
    console.log(`\n🚀 Processing ${batches.length} batches with concurrency ${concurrency}`);

    const results: T[] = [];
    const inProgress: Set<Promise<void>> = new Set();

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      // Wait if we've hit the concurrency limit
      if (inProgress.size >= concurrency) {
        await Promise.race(inProgress);
      }

      // Start processing this batch
      const processPromise = this.processBatch(batch, processor, i + 1, batches.length)
        .then(result => {
          results[i] = result;
          inProgress.delete(processPromise);
        });

      inProgress.add(processPromise);
    }

    // Wait for all remaining batches
    await Promise.all(inProgress);

    return results;
  }

  async processBatchesSequentially<T>(
    batches: FileBatch[],
    processor: (batch: FileBatch) => Promise<T>
  ): Promise<T[]> {
    console.log(`\n🔄 Processing ${batches.length} batches sequentially`);

    const results: T[] = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const result = await this.processBatch(batch, processor, i + 1, batches.length);
      results.push(result);
    }

    return results;
  }

  private async processBatch<T>(
    batch: FileBatch,
    processor: (batch: FileBatch) => Promise<T>,
    batchNumber: number,
    totalBatches: number
  ): Promise<T> {
    const startTime = Date.now();
    console.log(`\n⚙️  Processing batch ${batchNumber}/${totalBatches} (${batch.fileCount} files)`);

    try {
      const result = await processor(batch);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`✅ Batch ${batchNumber} completed in ${duration}s`);
      return result;
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.error(`❌ Batch ${batchNumber} failed after ${duration}s:`, error);
      throw error;
    }
  }

  private filterFiles(filePaths: string[]): string[] {
    if (!this.config.excludePatterns || this.config.excludePatterns.length === 0) {
      return filePaths;
    }

    return filePaths.filter(filePath => {
      for (const pattern of this.config.excludePatterns!) {
        if (filePath.includes(pattern)) {
          return false;
        }
      }
      return true;
    });
  }

  private async getFileInfo(filePaths: string[]): Promise<Array<{path: string, size: number}>> {
    const fileInfo: Array<{path: string, size: number}> = [];

    for (const filePath of filePaths) {
      try {
        const stats = await fs.promises.stat(filePath);
        fileInfo.push({
          path: filePath,
          size: stats.size
        });
      } catch {
        // If we can't stat the file, assume it's small
        fileInfo.push({
          path: filePath,
          size: 1000
        });
      }
    }

    return fileInfo;
  }

  private createEmptyBatch(index: number): FileBatch {
    return {
      id: `batch-${index + 1}`,
      files: [],
      totalSize: 0,
      fileCount: 0
    };
  }

  // Utility method to create file lists for tools that need them
  async createBatchFileLists(
    batches: FileBatch[],
    outputDir: string
  ): Promise<string[]> {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const fileListPaths: string[] = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const fileListPath = path.join(outputDir, `batch-${i + 1}-files.txt`);

      // Write the file list
      await fs.promises.writeFile(
        fileListPath,
        batch.files.join('\n'),
        'utf8'
      );

      fileListPaths.push(fileListPath);
    }

    return fileListPaths;
  }

  // Merge results from multiple batches
  mergeResults<T>(
    batchResults: T[],
    merger: (accumulated: T, current: T) => T,
    initialValue: T
  ): T {
    return batchResults.reduce(merger, initialValue);
  }
}

// Export a factory function for easy creation
export function createFileBatcher(config: Partial<BatchConfig> = {}): FileBatcher {
  const defaultConfig: BatchConfig = {
    maxFilesPerBatch: 500,
    maxBatchSizeBytes: 50 * 1024 * 1024, // 50MB
    concurrentBatches: 2,
    prioritizeBySize: true,
    excludePatterns: ['test/', 'tests/', '__tests__/', 'node_modules/', '.git/']
  };

  return new FileBatcher({
    ...defaultConfig,
    ...config
  });
}