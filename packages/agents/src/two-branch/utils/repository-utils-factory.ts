/**
 * Repository Utils Factory
 * Provides centralized access to repository management utilities
 * using factory pattern to avoid circular dependencies
 */

import { OptimizedRepoManager } from './optimized-repo-manager';
import { SmartFileSelector } from './smart-file-selector';

export interface RepositoryUtilsConfig {
  cacheDir?: string;
  workspaceDir?: string;
  redisUrl?: string;
}

/**
 * Factory for creating repository utility instances
 */
export class RepositoryUtilsFactory {
  private static repoManagerInstance: OptimizedRepoManager | null = null;
  private static fileSelectorInstance: SmartFileSelector | null = null;

  /**
   * Get or create OptimizedRepoManager instance
   */
  static getRepoManager(config?: RepositoryUtilsConfig): OptimizedRepoManager {
    if (!this.repoManagerInstance) {
      this.repoManagerInstance = new OptimizedRepoManager(
        config?.cacheDir,
        config?.workspaceDir,
        config?.redisUrl
      );
    }
    return this.repoManagerInstance;
  }

  /**
   * Get or create SmartFileSelector instance
   */
  static getFileSelector(): SmartFileSelector {
    if (!this.fileSelectorInstance) {
      this.fileSelectorInstance = new SmartFileSelector();
    }
    return this.fileSelectorInstance;
  }

  /**
   * Create new instances (non-singleton)
   */
  static createRepoManager(config?: RepositoryUtilsConfig): OptimizedRepoManager {
    return new OptimizedRepoManager(
      config?.cacheDir,
      config?.workspaceDir,
      config?.redisUrl
    );
  }

  static createFileSelector(): SmartFileSelector {
    return new SmartFileSelector();
  }

  /**
   * Reset singleton instances
   */
  static reset(): void {
    if (this.repoManagerInstance) {
      this.repoManagerInstance.close().catch(() => {});
      this.repoManagerInstance = null;
    }
    this.fileSelectorInstance = null;
  }
}

// Export convenient singleton accessors
export const getRepoManager = (config?: RepositoryUtilsConfig) => 
  RepositoryUtilsFactory.getRepoManager(config);

export const getFileSelector = () => 
  RepositoryUtilsFactory.getFileSelector();

// Export classes for direct instantiation if needed
export { OptimizedRepoManager, SmartFileSelector };
export type { RepoConfig, PRWorkspace, CloneMetrics } from './optimized-repo-manager';
export type { FileSelectionConfig, SelectedFiles } from './smart-file-selector';