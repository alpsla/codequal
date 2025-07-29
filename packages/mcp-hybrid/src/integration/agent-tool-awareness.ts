/**
 * Agent Tool Awareness System
 * Manages how agents know when tool content is available
 * and coordinates with the feature branch file system
 */

import { AgentRole, AnalysisContext } from '../core/interfaces';
import { logging } from '@codequal/core';
import * as path from 'path';
import * as fs from 'fs/promises';
import { gitOperationCache } from './operation-cache';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ToolAvailabilityStatus {
  repository: string;
  prNumber: number;
  featureBranch: string;
  availableRoles: AgentRole[];
  toolsExecuted: Map<AgentRole, string[]>;
  executionTimestamp: Date;
  featureRepoPath: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
}

export class AgentToolAwareness {
  private logger = logging.createLogger('AgentToolAwareness');
  private availabilityCache = new Map<string, ToolAvailabilityStatus>();
  
  /**
   * Create feature branch working directory with git diff applied
   */
  async createFeatureBranchWorkspace(
    clonedRepoPath: string,
    prNumber: number,
    baseBranch: string,
    featureBranch: string
  ): Promise<string> {
    const cacheKey = `feature-workspace:${clonedRepoPath}:${prNumber}:${baseBranch}:${featureBranch}`;
    
    return gitOperationCache.getOrExecute(cacheKey, async () => {
      this.logger.info(`Creating feature branch workspace for PR #${prNumber}`);
      
      // Create isolated workspace for this PR
      const workspacePath = path.join('/tmp', 'codequal-workspaces', `pr-${prNumber}`);
      const featureRepoPath = path.join(workspacePath, 'feature-repo');
      
      try {
        // Check if workspace already exists and is valid
        try {
          const stats = await fs.stat(featureRepoPath);
          if (stats.isDirectory()) {
            // Verify it's on the correct branch
            const { stdout } = await execAsync('git branch --show-current', { cwd: featureRepoPath });
            if (stdout.trim() === featureBranch) {
              this.logger.info(`Reusing existing feature branch workspace at: ${featureRepoPath}`);
              return featureRepoPath;
            }
          }
        } catch (e) {
          // Directory doesn't exist, continue with creation
        }
        
        // Clean up any existing workspace
        await fs.rm(workspacePath, { recursive: true, force: true });
        await fs.mkdir(workspacePath, { recursive: true });
        
        // Copy the cloned repo to workspace
        await this.copyDirectory(clonedRepoPath, featureRepoPath);
        
        // Ensure we're on the feature branch
        await execAsync(`git checkout ${featureBranch}`, { cwd: featureRepoPath });
        
        // Create a snapshot of the feature branch state
        await execAsync(`git add -A && git stash`, { cwd: featureRepoPath });
        await execAsync(`git checkout ${baseBranch}`, { cwd: featureRepoPath });
        await execAsync(`git checkout ${featureBranch}`, { cwd: featureRepoPath });
        
        // Now we have the feature branch state
        this.logger.info(`Feature branch workspace created at: ${featureRepoPath}`);
        
        return featureRepoPath;
        
      } catch (error) {
        this.logger.error(`Failed to create feature workspace: ${error}`);
        throw error;
      }
    });
  }
  
  /**
   * Register tool execution start
   * Agents check this before attempting to use tools
   */
  async registerToolExecutionStart(
    repository: string,
    prNumber: number,
    featureBranch: string,
    featureRepoPath: string
  ): Promise<void> {
    const key = this.getAvailabilityKey(repository, prNumber);
    
    const status: ToolAvailabilityStatus = {
      repository,
      prNumber,
      featureBranch,
      availableRoles: [],
      toolsExecuted: new Map(),
      executionTimestamp: new Date(),
      featureRepoPath,
      status: 'executing'
    };
    
    this.availabilityCache.set(key, status);
    
    // Also store in Vector DB for persistence
    await this.storeAvailabilityStatus(key, status);
  }
  
  /**
   * Update tool execution progress
   * Called as each role's tools complete
   */
  async updateToolExecutionProgress(
    repository: string,
    prNumber: number,
    role: AgentRole,
    executedTools: string[]
  ): Promise<void> {
    const key = this.getAvailabilityKey(repository, prNumber);
    const status = this.availabilityCache.get(key);
    
    if (!status) {
      throw new Error('Tool execution not registered');
    }
    
    status.availableRoles.push(role);
    status.toolsExecuted.set(role, executedTools);
    
    await this.storeAvailabilityStatus(key, status);
  }
  
  /**
   * Mark tool execution as complete
   */
  async registerToolExecutionComplete(
    repository: string,
    prNumber: number
  ): Promise<void> {
    const key = this.getAvailabilityKey(repository, prNumber);
    const status = this.availabilityCache.get(key);
    
    if (!status) {
      throw new Error('Tool execution not registered');
    }
    
    status.status = 'completed';
    await this.storeAvailabilityStatus(key, status);
  }
  
  /**
   * Check if tools are available for an agent
   * This is called by agents before they start analysis
   */
  async checkToolAvailability(
    repository: string,
    prNumber: number,
    role: AgentRole
  ): Promise<{
    available: boolean;
    status: ToolAvailabilityStatus | null;
    message: string;
  }> {
    const key = this.getAvailabilityKey(repository, prNumber);
    
    // Check cache first
    let status: ToolAvailabilityStatus | undefined = this.availabilityCache.get(key);
    
    // If not in cache, check Vector DB
    if (!status) {
      const loadedStatus = await this.loadAvailabilityStatus(key);
      status = loadedStatus || undefined;
      if (status) {
        this.availabilityCache.set(key, status);
      }
    }
    
    if (!status) {
      return {
        available: false,
        status: null,
        message: 'Tools have not been executed for this PR yet'
      };
    }
    
    if (status.status === 'executing') {
      return {
        available: false,
        status,
        message: `Tools are currently being executed (started ${status.executionTimestamp})`
      };
    }
    
    if (status.status === 'failed') {
      return {
        available: false,
        status,
        message: 'Tool execution failed for this PR'
      };
    }
    
    if (!status.availableRoles.includes(role)) {
      return {
        available: false,
        status,
        message: `Tools for role '${role}' are not available yet`
      };
    }
    
    return {
      available: true,
      status,
      message: `Tools available: ${status.toolsExecuted.get(role)?.join(', ') || 'none'}`
    };
  }
  
  /**
   * Get feature branch file content
   * Agents use this to access the actual file state
   */
  async getFeatureBranchFile(
    repository: string,
    prNumber: number,
    filePath: string
  ): Promise<string | null> {
    const availability = await this.checkToolAvailability(repository, prNumber, 'security');
    
    if (!availability.available || !availability.status) {
      throw new Error('Feature branch not available');
    }
    
    const fullPath = path.join(availability.status.featureRepoPath, filePath);
    
    try {
      return await fs.readFile(fullPath, 'utf-8');
    } catch (error) {
      this.logger.warn(`File not found in feature branch: ${filePath}`);
      return null;
    }
  }
  
  // Helper methods
  
  private getAvailabilityKey(repository: string, prNumber: number): string {
    return `tool-availability:${repository}:pr-${prNumber}`;
  }
  
  private async storeAvailabilityStatus(key: string, status: ToolAvailabilityStatus): Promise<void> {
    // In production, store in Vector DB
    // For now, just log
    this.logger.info(`Storing availability status: ${key}`);
  }
  
  private async loadAvailabilityStatus(key: string): Promise<ToolAvailabilityStatus | null> {
    // In production, load from Vector DB
    // For now, return null
    return null;
  }
  
  private async copyDirectory(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }
}

// Export singleton
export const agentToolAwareness = new AgentToolAwareness();