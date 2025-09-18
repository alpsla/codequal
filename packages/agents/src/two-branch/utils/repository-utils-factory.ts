/**
 * Repository Utils Factory
 * Provides centralized access to repository management utilities
 * using factory pattern to avoid circular dependencies
 */

import { CloudRepositoryManager } from './cloud-repository-manager';
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
  private static repoManagerInstance: CloudRepositoryManager | null = null;
  private static fileSelectorInstance: SmartFileSelector | null = null;

  /**
   * Get or create CloudRepositoryManager instance
   */
  static getRepoManager(config?: RepositoryUtilsConfig): CloudRepositoryManager {
    if (!this.repoManagerInstance) {
      this.repoManagerInstance = new CloudRepositoryManager();
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
  static createRepoManager(config?: RepositoryUtilsConfig): CloudRepositoryManager {
    return new CloudRepositoryManager();
  }

  static createFileSelector(): SmartFileSelector {
    return new SmartFileSelector();
  }

  /**
   * Reset singleton instances
   */
  static reset(): void {
    if (this.repoManagerInstance) {
      // CloudRepositoryManager doesn't have close method
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
export { CloudRepositoryManager, SmartFileSelector };
export type { CloudWorkspace, CloudAnalysisRequest, CloudToolResult } from './cloud-repository-manager';
export type { FileSelectionConfig, SelectedFiles } from './smart-file-selector';