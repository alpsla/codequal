/**
 * Cloud Execution Wrapper
 * Provides abstraction for executing tools either locally or on cloud pods
 * Handles fallback to local execution if cloud pod is unavailable
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export interface ExecutionOptions {
  maxBuffer?: number;
  timeout?: number;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

export interface CloudConfig {
  enabled: boolean;
  namespace?: string;
  podName?: string;
  containerName?: string;
  workDir?: string;
}

export class CloudExecutionWrapper {
  private cloudConfig: CloudConfig;
  private podAvailable = false;
  private checkedPodStatus = false;

  constructor(cloudConfig?: Partial<CloudConfig>) {
    this.cloudConfig = {
      enabled: process.env.CLOUD_EXECUTION === 'true' || false,
      namespace: 'codequal-dev',
      podName: 'analysis-minimal',  // Updated to new pod name
      containerName: 'analyzer',
      workDir: '/analysis',
      ...cloudConfig
    };
  }

  /**
   * Check if cloud pod is available
   */
  private async checkPodAvailability(): Promise<boolean> {
    if (!this.cloudConfig.enabled || this.checkedPodStatus) {
      return this.podAvailable;
    }

    try {
      const { stdout } = await execAsync(
        `kubectl get pod ${this.cloudConfig.podName} -n ${this.cloudConfig.namespace} -o jsonpath='{.status.phase}'`,
        { timeout: 5000 }
      );
      
      this.podAvailable = stdout.trim() === 'Running';
      this.checkedPodStatus = true;
      
      if (this.podAvailable) {
        console.log(`✅ Cloud pod available: ${this.cloudConfig.podName}`);
      } else {
        console.log(`⚠️ Cloud pod not ready (status: ${stdout.trim()}), falling back to local execution`);
      }
    } catch (error) {
      console.log('⚠️ Cloud pod not available, using local execution');
      this.podAvailable = false;
      this.checkedPodStatus = true;
    }

    return this.podAvailable;
  }

  /**
   * Sync files to cloud pod if needed
   */
  private async syncToCloud(localPath: string): Promise<string> {
    if (!this.podAvailable) return localPath;

    const remotePath = path.join(this.cloudConfig.workDir!, path.basename(localPath));
    
    try {
      // Create tar archive and copy to pod
      await execAsync(
        `tar czf - -C ${path.dirname(localPath)} ${path.basename(localPath)} | kubectl exec -i -n ${this.cloudConfig.namespace} ${this.cloudConfig.podName} -- tar xzf - -C ${this.cloudConfig.workDir}`,
        { maxBuffer: 50 * 1024 * 1024, timeout: 60000 }
      );
      
      console.log(`📤 Synced ${localPath} to cloud pod`);
      return remotePath;
    } catch (error) {
      console.error('Failed to sync to cloud:', error);
      throw error;
    }
  }

  /**
   * Execute command with cloud/local fallback
   */
  async execute(command: string, options: ExecutionOptions = {}): Promise<string> {
    const defaultOptions: ExecutionOptions = {
      maxBuffer: 10 * 1024 * 1024,
      timeout: 180000, // 3 minutes default
      ...options
    };

    // Check if we should use cloud execution
    const useCloud = this.cloudConfig.enabled && await this.checkPodAvailability();

    if (useCloud) {
      return this.executeOnCloud(command, defaultOptions);
    } else {
      return this.executeLocally(command, defaultOptions);
    }
  }

  /**
   * Execute command on cloud pod
   */
  private async executeOnCloud(command: string, options: ExecutionOptions): Promise<string> {
    // Increase timeout for cloud execution
    const cloudTimeout = Math.max(options.timeout || 180000, 600000); // Min 10 minutes for cloud
    
    const cloudCommand = `kubectl exec -n ${this.cloudConfig.namespace} ${this.cloudConfig.podName} -- bash -c "cd ${this.cloudConfig.workDir} && ${command}"`;
    
    console.log(`☁️ Executing on cloud pod: ${command.split(' ')[0]}...`);
    
    try {
      const { stdout, stderr } = await execAsync(cloudCommand, {
        ...options,
        timeout: cloudTimeout
      });
      
      if (stderr && !stderr.includes('Warning')) {
        console.warn('Cloud execution stderr:', stderr);
      }
      
      return stdout;
    } catch (error: any) {
      // If cloud execution fails, try local as fallback
      console.error(`☁️ Cloud execution failed: ${error.message}`);
      console.log('⚠️ Falling back to local execution...');
      return this.executeLocally(command, options);
    }
  }

  /**
   * Execute command locally
   */
  private async executeLocally(command: string, options: ExecutionOptions): Promise<string> {
    console.log(`💻 Executing locally: ${command.split(' ')[0]}...`);
    
    const { stdout } = await execAsync(command, options);
    return stdout;
  }

  /**
   * Execute tool with automatic path handling
   */
  async executeTool(
    toolName: string,
    toolCommand: string,
    targetPath: string,
    options: ExecutionOptions = {}
  ): Promise<string> {
    // Check for large repository and adjust timeout
    const isLargeRepo = await this.isLargeRepository(targetPath);
    if (isLargeRepo) {
      options.timeout = Math.max(options.timeout || 180000, 600000); // 10 minutes for large repos
      console.log(`📦 Large repository detected, using extended timeout: ${options.timeout}ms`);
    }

    // Skip slow tools for large repos if configured
    if (isLargeRepo && this.shouldSkipSlowTool(toolName)) {
      console.log(`⏭️ Skipping ${toolName} for large repository (performance optimization)`);
      return '[]'; // Return empty results
    }

    // Prepare the command with proper path
    const useCloud = this.cloudConfig.enabled && await this.checkPodAvailability();
    let finalCommand = toolCommand;
    
    if (useCloud) {
      // Sync repository to cloud if needed
      const cloudPath = await this.syncToCloud(targetPath);
      finalCommand = toolCommand.replace(targetPath, cloudPath);
    }

    return this.execute(finalCommand, options);
  }

  /**
   * Check if repository is large
   */
  private async isLargeRepository(repoPath: string): Promise<boolean> {
    try {
      const { stdout } = await execAsync(
        `find ${repoPath} -type f -name "*.rs" -o -name "*.go" -o -name "*.java" -o -name "*.py" -o -name "*.js" -o -name "*.ts" | wc -l`,
        { timeout: 5000 }
      );
      
      const fileCount = parseInt(stdout.trim());
      const threshold = parseInt(process.env.LARGE_REPO_FILE_THRESHOLD || '10000');
      
      return fileCount > threshold;
    } catch {
      return false;
    }
  }

  /**
   * Check if tool should be skipped for large repos
   */
  private shouldSkipSlowTool(toolName: string): boolean {
    if (process.env.SKIP_SLOW_TOOLS !== 'true') {
      return false;
    }

    const slowTools = ['semgrep', 'gitleaks', 'trivy'];
    return slowTools.includes(toolName.toLowerCase());
  }

  /**
   * Get execution metrics
   */
  async getMetrics(): Promise<{
    cloudAvailable: boolean;
    cloudUsed: boolean;
    podStatus?: string;
  }> {
    const available = await this.checkPodAvailability();
    
    return {
      cloudAvailable: available,
      cloudUsed: this.cloudConfig.enabled && available,
      podStatus: available ? 'Running' : 'Not Available'
    };
  }
}

// Export singleton instance for easy use
export const cloudExecutor = new CloudExecutionWrapper();