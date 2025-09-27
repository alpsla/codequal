/**
 * Repository Utils Factory
 * Provides centralized access to repository management utilities
 * using factory pattern to avoid circular dependencies
 *
 * UPDATED: 2025-09-20 - Added Kubernetes support per V9 requirements
 */

import { CloudRepositoryManager } from './cloud-repository-manager';
import { KubernetesRepositoryManager } from './kubernetes-repository-manager';
import { SmartFileSelector } from './smart-file-selector';

export interface RepositoryUtilsConfig {
  cacheDir?: string;
  workspaceDir?: string;
  redisUrl?: string;
  useKubernetes?: boolean;
}

/**
 * Factory for creating repository utility instances
 */
export class RepositoryUtilsFactory {
  private static repoManagerInstance: CloudRepositoryManager | KubernetesRepositoryManager | null = null;
  private static fileSelectorInstance: SmartFileSelector | null = null;

  /**
   * Get or create repository manager instance
   * Uses KubernetesRepositoryManager when USE_KUBERNETES env var is set or config specifies it
   */
  static getRepoManager(config?: RepositoryUtilsConfig): CloudRepositoryManager | KubernetesRepositoryManager {
    if (!this.repoManagerInstance) {
      // Check if we should use Kubernetes mode (per V9 requirements)
      const useKubernetes = config?.useKubernetes ||
                           process.env.USE_KUBERNETES === 'true' ||
                           process.env.USE_LOCAL_TOOLS === 'false';

      if (useKubernetes) {
        console.log('[Two-Branch] Using KubernetesRepositoryManager for V9 execution');
        this.repoManagerInstance = new KubernetesRepositoryManager();
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
  static createRepoManager(config?: RepositoryUtilsConfig): CloudRepositoryManager | KubernetesRepositoryManager {
    const useKubernetes = config?.useKubernetes ||
                         process.env.USE_KUBERNETES === 'true' ||
                         process.env.USE_LOCAL_TOOLS === 'false';

    if (useKubernetes) {
      return new KubernetesRepositoryManager();
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
export { CloudRepositoryManager, KubernetesRepositoryManager, SmartFileSelector };
export type { CloudWorkspace, CloudAnalysisRequest, CloudToolResult } from './cloud-repository-manager';
export type { FileSelectionConfig, SelectedFiles } from './smart-file-selector';