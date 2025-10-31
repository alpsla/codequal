/**
 * V9 Cleanup Service
 *
 * Comprehensive cleanup service for all analysis artifacts.
 * Ensures no data persists after report delivery.
 *
 * Features:
 * - Repository cleanup (via V9RepositoryManager)
 * - Report artifacts cleanup (IDE fix files, manifest, markdown)
 * - Configurable retention policies
 * - Safe deletion with validation
 * - Automatic cleanup after report delivery
 *
 * Usage:
 *   const cleanup = new V9CleanupService();
 *   await cleanup.cleanupAfterReport(analysisId, {
 *     repository: repoPath,
 *     outputDir: outputPath
 *   });
 */

import * as fs from 'fs';
import * as path from 'path';
import { V9RepositoryManager } from './v9-repository-manager';

export interface CleanupConfig {
  /**
   * Automatically cleanup after report delivery
   * @default true
   */
  cleanupAfterDelivery: boolean;

  /**
   * Delay in seconds before cleanup (allows download time)
   * @default 300 (5 minutes)
   */
  cleanupDelaySeconds: number;

  /**
   * Keep successful reports for debugging
   * @default false (clean all reports)
   */
  keepSuccessfulReports: boolean;

  /**
   * Maximum age of reports to keep (seconds)
   * @default 86400 (24 hours)
   */
  maxReportAge: number;

  /**
   * Paths to exclude from cleanup (safety)
   */
  excludePaths: string[];
}

export interface CleanupTargets {
  /**
   * Repository directory path
   */
  repository?: string;

  /**
   * Report output directory
   */
  outputDir?: string;

  /**
   * Specific IDE fix files directory
   */
  ideFixFilesDir?: string;

  /**
   * Temporary working directory
   */
  tempDir?: string;

  /**
   * Additional paths to clean
   */
  additionalPaths?: string[];
}

export interface CleanupResult {
  success: boolean;
  cleaned: {
    repositories: number;
    reports: number;
    ideFixFiles: number;
    manifests: number;
    totalSizeMB: number;
  };
  errors: string[];
  duration: number;
}

export class V9CleanupService {
  private readonly repoManager: V9RepositoryManager;
  private readonly config: CleanupConfig;

  constructor(config?: Partial<CleanupConfig>) {
    this.repoManager = new V9RepositoryManager();
    this.config = {
      cleanupAfterDelivery: config?.cleanupAfterDelivery ?? true,
      cleanupDelaySeconds: config?.cleanupDelaySeconds ?? 300, // 5 minutes
      keepSuccessfulReports: config?.keepSuccessfulReports ?? false,
      maxReportAge: config?.maxReportAge ?? 86400, // 24 hours
      excludePaths: config?.excludePaths || []
    };
  }

  /**
   * Main cleanup method - called after report delivery
   */
  async cleanupAfterReport(
    analysisId: string,
    targets: CleanupTargets
  ): Promise<CleanupResult> {
    const startTime = Date.now();
    const result: CleanupResult = {
      success: true,
      cleaned: {
        repositories: 0,
        reports: 0,
        ideFixFiles: 0,
        manifests: 0,
        totalSizeMB: 0
      },
      errors: [],
      duration: 0
    };

    console.log(`\n🧹 Starting cleanup for analysis: ${analysisId}`);
    console.log(`   Config: cleanupAfterDelivery=${this.config.cleanupAfterDelivery}, delay=${this.config.cleanupDelaySeconds}s`);

    if (!this.config.cleanupAfterDelivery) {
      console.log(`   ℹ️  Cleanup disabled by configuration`);
      result.duration = Date.now() - startTime;
      return result;
    }

    // Apply delay if configured (allows time for downloads)
    if (this.config.cleanupDelaySeconds > 0) {
      console.log(`   ⏳ Waiting ${this.config.cleanupDelaySeconds}s before cleanup...`);
      await this.sleep(this.config.cleanupDelaySeconds * 1000);
    }

    try {
      // 1. Clean repository
      if (targets.repository) {
        const repoSize = await this.getDirectorySize(targets.repository);
        await this.cleanRepository(targets.repository, result);
        result.cleaned.totalSizeMB += repoSize;
      }

      // 2. Clean report output directory
      if (targets.outputDir) {
        await this.cleanReportOutputs(targets.outputDir, result);
      }

      // 3. Clean IDE fix files
      if (targets.ideFixFilesDir) {
        await this.cleanIDEFixFiles(targets.ideFixFilesDir, result);
      }

      // 4. Clean temp directory
      if (targets.tempDir) {
        const tempSize = await this.getDirectorySize(targets.tempDir);
        await this.cleanDirectory(targets.tempDir, 'temp');
        result.cleaned.totalSizeMB += tempSize;
      }

      // 5. Clean additional paths
      if (targets.additionalPaths) {
        for (const additionalPath of targets.additionalPaths) {
          const pathSize = await this.getDirectorySize(additionalPath);
          await this.cleanDirectory(additionalPath, 'additional');
          result.cleaned.totalSizeMB += pathSize;
        }
      }

      console.log(`\n   ✅ Cleanup complete:`);
      console.log(`      Repositories: ${result.cleaned.repositories}`);
      console.log(`      Reports: ${result.cleaned.reports}`);
      console.log(`      IDE Fix Files: ${result.cleaned.ideFixFiles}`);
      console.log(`      Manifests: ${result.cleaned.manifests}`);
      console.log(`      Total Size Freed: ${result.cleaned.totalSizeMB.toFixed(2)} MB`);

    } catch (error: any) {
      result.success = false;
      result.errors.push(`Cleanup failed: ${error.message}`);
      console.error(`\n   ❌ Cleanup error: ${error.message}`);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Clean repository directory
   */
  private async cleanRepository(repoPath: string, result: CleanupResult): Promise<void> {
    if (!this.isSafePath(repoPath)) {
      result.errors.push(`Unsafe repository path: ${repoPath}`);
      return;
    }

    try {
      console.log(`   🗂️  Cleaning repository: ${repoPath}`);
      await this.repoManager.cleanup(repoPath);
      result.cleaned.repositories++;
    } catch (error: any) {
      result.errors.push(`Repository cleanup failed: ${error.message}`);
      console.warn(`   ⚠️  Repository cleanup warning: ${error.message}`);
    }
  }

  /**
   * Clean report output directory (markdown reports)
   */
  private async cleanReportOutputs(outputDir: string, result: CleanupResult): Promise<void> {
    if (!this.isSafePath(outputDir) || !fs.existsSync(outputDir)) {
      return;
    }

    try {
      console.log(`   📄 Cleaning report outputs: ${outputDir}`);

      const files = fs.readdirSync(outputDir);

      for (const file of files) {
        const filePath = path.join(outputDir, file);
        const stats = fs.statSync(filePath);

        // Check if file is old enough to clean
        const ageSeconds = (Date.now() - stats.mtimeMs) / 1000;
        if (ageSeconds < this.config.maxReportAge) {
          continue;
        }

        if (file.endsWith('.md')) {
          // Markdown report
          result.cleaned.totalSizeMB += stats.size / (1024 * 1024);
          fs.unlinkSync(filePath);
          result.cleaned.reports++;
        }
      }
    } catch (error: any) {
      result.errors.push(`Report cleanup failed: ${error.message}`);
      console.warn(`   ⚠️  Report cleanup warning: ${error.message}`);
    }
  }

  /**
   * Clean IDE fix files and manifest
   */
  private async cleanIDEFixFiles(dir: string, result: CleanupResult): Promise<void> {
    if (!this.isSafePath(dir) || !fs.existsSync(dir)) {
      return;
    }

    try {
      console.log(`   🔧 Cleaning IDE fix files: ${dir}`);

      const files = fs.readdirSync(dir);

      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);

        // Check age
        const ageSeconds = (Date.now() - stats.mtimeMs) / 1000;
        if (ageSeconds < this.config.maxReportAge) {
          continue;
        }

        if (file.endsWith('.json')) {
          result.cleaned.totalSizeMB += stats.size / (1024 * 1024);

          // Check if it's the manifest file
          try {
            const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            if (content.groupId === 'all-issues' || file.includes('manifest')) {
              result.cleaned.manifests++;
            } else {
              result.cleaned.ideFixFiles++;
            }
          } catch {
            result.cleaned.ideFixFiles++;
          }

          fs.unlinkSync(filePath);
        }
      }
    } catch (error: any) {
      result.errors.push(`IDE fix files cleanup failed: ${error.message}`);
      console.warn(`   ⚠️  IDE fix files cleanup warning: ${error.message}`);
    }
  }

  /**
   * Clean generic directory
   */
  private async cleanDirectory(dirPath: string, type: string): Promise<void> {
    if (!this.isSafePath(dirPath)) {
      console.warn(`   ⚠️  Refusing to clean unsafe path: ${dirPath}`);
      return;
    }

    if (!fs.existsSync(dirPath)) {
      return;
    }

    try {
      console.log(`   🗑️  Cleaning ${type} directory: ${dirPath}`);
      await this.repoManager.cleanup(dirPath);
    } catch (error: any) {
      console.warn(`   ⚠️  ${type} cleanup warning: ${error.message}`);
    }
  }

  /**
   * Clean old reports based on age
   */
  async cleanOldReports(outputDir: string, maxAgeSeconds: number): Promise<number> {
    if (!fs.existsSync(outputDir)) {
      return 0;
    }

    let cleaned = 0;
    const files = fs.readdirSync(outputDir);
    const now = Date.now();

    for (const file of files) {
      const filePath = path.join(outputDir, file);
      const stats = fs.statSync(filePath);
      const ageSeconds = (now - stats.mtimeMs) / 1000;

      if (ageSeconds > maxAgeSeconds) {
        try {
          fs.unlinkSync(filePath);
          cleaned++;
        } catch (error: any) {
          console.warn(`   ⚠️  Failed to delete old file: ${file}`);
        }
      }
    }

    return cleaned;
  }

  /**
   * Get directory size in MB
   */
  private async getDirectorySize(dirPath: string): Promise<number> {
    if (!fs.existsSync(dirPath)) {
      return 0;
    }

    let totalSize = 0;

    const getSize = (itemPath: string): void => {
      const stats = fs.statSync(itemPath);

      if (stats.isDirectory()) {
        const items = fs.readdirSync(itemPath);
        for (const item of items) {
          getSize(path.join(itemPath, item));
        }
      } else {
        totalSize += stats.size;
      }
    };

    try {
      getSize(dirPath);
      return totalSize / (1024 * 1024); // Convert to MB
    } catch (error) {
      return 0;
    }
  }

  /**
   * Safety check for paths
   */
  private isSafePath(targetPath: string): boolean {
    // Dangerous paths that should never be cleaned
    const dangerousPaths = [
      '/',
      '/home',
      '/Users',
      '/usr',
      '/etc',
      '/var',
      '/bin',
      '/sbin',
      '/opt',
      ...this.config.excludePaths
    ];

    const normalizedPath = path.normalize(targetPath);

    // Check if path is in dangerous list
    if (dangerousPaths.some(dangerous => normalizedPath === dangerous)) {
      return false;
    }

    // Must be in /tmp or test-outputs or similar safe location
    const safePrefixes = ['/tmp', '/var/tmp', process.cwd()];
    return safePrefixes.some(prefix => normalizedPath.startsWith(prefix));
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Schedule automatic cleanup after delay
   */
  scheduleCleanup(analysisId: string, targets: CleanupTargets): void {
    if (!this.config.cleanupAfterDelivery) {
      return;
    }

    const delayMs = this.config.cleanupDelaySeconds * 1000;

    console.log(`   ⏲️  Scheduled cleanup in ${this.config.cleanupDelaySeconds}s for analysis: ${analysisId}`);

    setTimeout(async () => {
      try {
        await this.cleanupAfterReport(analysisId, targets);
      } catch (error: any) {
        console.error(`   ❌ Scheduled cleanup failed for ${analysisId}: ${error.message}`);
      }
    }, delayMs);
  }
}
