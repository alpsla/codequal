/**
 * Cloud Repository Manager
 *
 * Handles all repository operations in the cloud:
 * - Cloning repositories
 * - Caching and indexing
 * - Creating PR branches
 * - COW workspace management
 *
 * ALL operations happen in cloud infrastructure, NOT locally
 */

import { logger } from './logger';

export interface CloudWorkspace {
  workspaceId: string;
  repository: string;
  prNumber: number;
  mainBranch: string;
  prBranch: string;
  status: 'creating' | 'ready' | 'analyzing' | 'complete' | 'error';
  cloudPath: string;
  filesCount: number;
  modifiedFiles: string[];
}

export interface CloudAnalysisRequest {
  repository: string;
  prNumber: number;
  mainBranch?: string;
  tools: string[];
  language: string;
}

export interface CloudToolResult {
  tool: string;
  output: string;
  exitCode: number;
  duration: number;
  filesScanned: number;
}

export class CloudRepositoryManager {
  private cloudApiUrl: string;
  private apiKey: string;
  private useKubernetes: boolean;

  constructor() {
    this.cloudApiUrl = process.env.CLOUD_API_URL || 'https://api.codequal.cloud';
    this.apiKey = process.env.CLOUD_API_KEY || '';
    // Use Kubernetes if no cloud API URL is set
    this.useKubernetes = !process.env.CLOUD_API_URL;
  }

  /**
   * Setup repository in cloud (clone, cache, index)
   * This replaces local cloning
   */
  async setupRepository(repoUrl: string, mainBranch = 'main'): Promise<CloudWorkspace> {
    logger.info(`[Cloud] Setting up repository in cloud: ${repoUrl}`);

    try {
      const response = await fetch(`${this.cloudApiUrl}/repositories/setup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          repositoryUrl: repoUrl,
          mainBranch: mainBranch,
          operations: ['clone', 'cache', 'index']  // Clone ONCE, cache and index
        })
      });

      if (!response.ok) {
        throw new Error(`Cloud API error: ${response.status}`);
      }

      const workspace = await response.json() as CloudWorkspace;
      logger.info(`[Cloud] Repository setup complete: ${workspace.workspaceId}`);
      logger.info(`[Cloud] Files indexed: ${workspace.filesCount}`);
      logger.info(`[Cloud] Cache location: ${workspace.cloudPath}`);

      return workspace;
    } catch (error) {
      logger.error(`[Cloud] Failed to setup repository: ${error.message}`);
      logger.error(`[Cloud] Cloud API URL: ${this.cloudApiUrl}`);
      logger.error(`[Cloud] Ensure cloud service is running or use Kubernetes mode`);
      throw new Error(`Cloud repository setup failed: ${error.message}`);
    }
  }

  /**
   * Create PR workspace in cloud
   * This replaces local COW workspace creation
   */
  async createPRWorkspace(repoUrl: string, prNumber: number): Promise<CloudWorkspace> {
    logger.info(`[Cloud] Creating PR workspace for PR #${prNumber}`);
    logger.info(`[Cloud] Using cached repository - NOT cloning again`);

    try {
      const response = await fetch(`${this.cloudApiUrl}/workspaces/pr`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          repositoryUrl: repoUrl,
          prNumber: prNumber,
          useCOW: true,  // Use Copy-on-Write for efficiency
          useCache: true, // Use cached repository
          fetchOnly: true // Only fetch PR changes, don't clone
        })
      });

      if (!response.ok) {
        throw new Error(`Cloud API error: ${response.status}`);
      }

      const workspace = await response.json() as CloudWorkspace;
      logger.info(`[Cloud] PR workspace created using CACHED repo: ${workspace.workspaceId}`);
      logger.info(`[Cloud] Modified files in PR: ${workspace.modifiedFiles.length}`);
      logger.info(`[Cloud] Reusing cached path: ${workspace.cloudPath}`);

      return workspace;
    } catch (error) {
      logger.error(`[Cloud] Failed to create PR workspace: ${error.message}`);
      logger.error(`[Cloud] Cloud API URL: ${this.cloudApiUrl}`);
      logger.error(`[Cloud] Ensure cloud service is running or use Kubernetes mode`);
      throw new Error(`Cloud PR workspace creation failed: ${error.message}`);
    }
  }

  // NO LOCAL FALLBACK - Use proper cloud/Kubernetes infrastructure only
  // Repository flow:
  // 1. Clone ONCE with setupRepository() → cache & index
  // 2. Create PR workspace with createPRWorkspace() → git fetch PR changes only
  // 3. Use cached repository for all analysis

  /**
   * Run tools in cloud pods
   * This replaces local tool execution
   * Uses Kubernetes Jobs with automatic cleanup (ttlSecondsAfterFinished)
   */
  async runToolsInCloud(
    workspaceId: string,
    tools: string[],
    language: string
  ): Promise<CloudToolResult[]> {
    logger.info(`[Cloud] Running ${tools.length} tools for ${language} in cloud`);

    // If Kubernetes is available, create a Job that auto-cleans up
    if (this.useKubernetes) {
      // Use KubernetesRepositoryManager instead
      throw new Error('Kubernetes mode should use KubernetesRepositoryManager directly');
    }

    try {
      const response = await fetch(`${this.cloudApiUrl}/tools/run`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workspaceId: workspaceId,
          tools: tools,
          language: language,
          parallel: true,  // Run tools in parallel in cloud
          autoCleanup: true,  // Enable automatic cleanup after completion
          ttlSeconds: 300  // Cleanup after 5 minutes
        })
      });

      if (!response.ok) {
        throw new Error(`Cloud API error: ${response.status}`);
      }

      const results = await response.json() as CloudToolResult[];
      logger.info(`[Cloud] Tools execution complete: ${results.length} results`);
      logger.info(`[Cloud] Pod/Job will auto-cleanup in 5 minutes`);

      return results;
    } catch (error) {
      logger.error(`[Cloud] Failed to run tools: ${error.message}`);
      throw new Error(`Cloud tool execution failed: ${error.message}`);
    }
  }

  /**
   * Get files from cloud workspace (for AI analysis)
   */
  async getWorkspaceFiles(workspaceId: string, pattern?: string): Promise<string[]> {
    logger.info(`[Cloud] Getting files from workspace: ${workspaceId}`);

    try {
      const response = await fetch(`${this.cloudApiUrl}/workspaces/${workspaceId}/files`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Cloud API error: ${response.status}`);
      }

      const files = await response.json() as string[];
      logger.info(`[Cloud] Retrieved ${files.length} files from cloud`);

      return files;
    } catch (error) {
      logger.error(`[Cloud] Failed to get files: ${error.message}`);
      return [];
    }
  }

  /**
   * Clean up cloud workspace after analysis
   */
  async cleanupWorkspace(workspaceId: string): Promise<void> {
    logger.info(`[Cloud] Cleaning up workspace: ${workspaceId}`);

    try {
      const response = await fetch(`${this.cloudApiUrl}/workspaces/${workspaceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Cloud API error: ${response.status}`);
      }

      logger.info(`[Cloud] Workspace cleaned up successfully`);
    } catch (error) {
      logger.error(`[Cloud] Failed to cleanup workspace: ${error.message}`);
    }
  }

  // Simulation methods for testing without cloud infrastructure

  private simulateCloudWorkspace(repoUrl: string, mainBranch: string): CloudWorkspace {
    logger.warn('[Cloud] Using simulation mode - no real cloud connection');

    const repoName = repoUrl.split('/').slice(-2).join('/');
    return {
      workspaceId: `sim-${Date.now()}`,
      repository: repoUrl,
      prNumber: 0,
      mainBranch: mainBranch,
      prBranch: '',
      status: 'ready',
      cloudPath: `cloud://workspaces/${repoName}`,
      filesCount: 1000,  // Simulated
      modifiedFiles: []
    };
  }

  private simulatePRWorkspace(repoUrl: string, prNumber: number): CloudWorkspace {
    const repoName = repoUrl.split('/').slice(-2).join('/');
    return {
      workspaceId: `sim-pr-${prNumber}-${Date.now()}`,
      repository: repoUrl,
      prNumber: prNumber,
      mainBranch: 'main',
      prBranch: `pr-${prNumber}`,
      status: 'ready',
      cloudPath: `cloud://workspaces/${repoName}/pr-${prNumber}`,
      filesCount: 1000,
      modifiedFiles: ['src/main/java/Example.java']  // Simulated
    };
  }

  private simulateToolResults(tools: string[]): CloudToolResult[] {
    // Return realistic results based on Kubernetes pod execution
    const toolOutputs: Record<string, string> = {
      'spotbugs': 'SpotBugs: 0 security issues found',
      'pmd-quality': 'PMD-Quality: 2 code style issues\nsrc/main/java/Example.java:45: Avoid deeply nested if statements\nsrc/main/java/Utils.java:120: Method too complex (cyclomatic complexity = 12)',
      'pmd-performance': 'PMD-Performance: 0 performance issues',
      'pmd-architecture': 'PMD-Architecture: 1 design issue\nsrc/main/java/Service.java:200: Class has too many methods (42)',
      'checkstyle': 'Checkstyle: 5 formatting issues\n[WARN] Missing Javadoc\n[WARN] Line too long\n[WARN] Incorrect indentation',
      'semgrep': '{"results": [], "errors": []}',
      'dependency-check': '{"dependencies": [], "vulnerabilities": []}'
    };

    return tools.map(tool => ({
      tool: tool,
      output: toolOutputs[tool] || `Cloud execution completed for ${tool}`,
      exitCode: 0,
      duration: 2000 + Math.random() * 3000,
      filesScanned: 250
    }));
  }
}

export default CloudRepositoryManager;