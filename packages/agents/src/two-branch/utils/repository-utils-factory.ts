/**
 * Repository Utils Factory
 * Provides centralized access to repository management utilities
 * using factory pattern to avoid circular dependencies
 *
 * UPDATED: 2025-09-20 - Added Kubernetes support per V9 requirements
 */

import { CloudRepositoryManager } from './cloud-repository-manager';
import { OracleRepositoryManager } from './oracle-repository-manager';
import { SmartFileSelector } from './smart-file-selector';

export interface RepositoryUtilsConfig {
  cacheDir?: string;
  workspaceDir?: string;
  redisUrl?: string;
  useOracle?: boolean;
}

/**
 * Factory for creating repository utility instances
 */
export class RepositoryUtilsFactory {
  private static repoManagerInstance: CloudRepositoryManager | OracleRepositoryManager | null = null;
  private static fileSelectorInstance: SmartFileSelector | null = null;

  /**
   * Get or create repository manager instance
   * Uses OracleRepositoryManager for ARM direct execution, CloudRepositoryManager as fallback
   */
  static getRepoManager(config?: RepositoryUtilsConfig): CloudRepositoryManager | OracleRepositoryManager {
    if (!this.repoManagerInstance) {
      // Check if we should use Oracle direct execution mode
      const useOracle = config?.useOracle ||
                       process.env.USE_ORACLE === 'true' ||
                       process.env.DIRECT_DOCKER_EXECUTION === 'true' ||
                       process.env.USE_ARM_ANALYZERS === 'true';

      if (useOracle) {
        console.log('[Two-Branch] Using OracleRepositoryManager for ARM direct execution');
        this.repoManagerInstance = new OracleRepositoryManager();
      } else {
        console.log('[Two-Branch] Using CloudRepositoryManager (fallback mode)');
        this.repoManagerInstance = new CloudRepositoryManager();
      }
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
  static createRepoManager(config?: RepositoryUtilsConfig): CloudRepositoryManager | OracleRepositoryManager {
    const useOracle = config?.useOracle ||
                     process.env.USE_ORACLE === 'true' ||
                     process.env.DIRECT_DOCKER_EXECUTION === 'true' ||
                     process.env.USE_ARM_ANALYZERS === 'true';

    if (useOracle) {
      return new OracleRepositoryManager();
    } else {
      return new CloudRepositoryManager();
    }
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
export { CloudRepositoryManager, OracleRepositoryManager, SmartFileSelector };
export type { CloudWorkspace, CloudAnalysisRequest, CloudToolResult } from './cloud-repository-manager';
export type { OracleWorkspace, OracleToolResult } from './oracle-repository-manager';
export type { FileSelectionConfig, SelectedFiles } from './smart-file-selector';
