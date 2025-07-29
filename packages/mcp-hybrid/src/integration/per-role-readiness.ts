/**
 * Per-Role Readiness Check System
 * Allows agents to start as soon as their tools are ready
 */

import { AgentRole } from '../core/interfaces';
import { agentToolAwareness } from './agent-tool-awareness';
import { logging } from '@codequal/core';
import { EventEmitter } from 'events';

export interface RoleReadinessStatus {
  role: AgentRole;
  ready: boolean;
  toolsCompleted: string[];
  completedAt?: Date;
  dependencies?: AgentRole[]; // Some roles may depend on others
}

export class PerRoleReadinessManager extends EventEmitter {
  private logger = logging.createLogger('PerRoleReadinessManager');
  private roleStatus = new Map<AgentRole, RoleReadinessStatus>();
  
  constructor() {
    super();
    this.initializeRoleStatuses();
  }
  
  private initializeRoleStatuses(): void {
    const roles: AgentRole[] = ['security', 'codeQuality', 'dependency', 'performance', 'architecture', 'educational', 'reporting'];
    
    roles.forEach(role => {
      this.roleStatus.set(role, {
        role,
        ready: false,
        toolsCompleted: [],
        dependencies: this.getRoleDependencies(role)
      });
    });
  }
  
  /**
   * Define role dependencies
   * Educational and Reporting are NOT parallel - they run AFTER orchestration
   */
  private getRoleDependencies(role: AgentRole): AgentRole[] {
    // Educational and Reporting agents are handled differently
    // They receive compiled results from Orchestrator, not raw tool results
    switch (role) {
      case 'educational':
        // Educational runs AFTER Orchestrator compiles all agent results
        // It receives: compiled results + DeepWiki chunk + MCP tools
        return []; // Educational runs after orchestration, not parallel
      case 'reporting':
        // Reporting runs AFTER Educational agent completes
        // It receives: compiled results + educational output + MCP tools
        return []; // Reporting runs after educational, not parallel
      default:
        // Analysis agents (security, codeQuality, dependency, performance, architecture)
        // can run independently as soon as their tools are ready
        return [];
    }
  }
  
  /**
   * Update tool completion for a role
   * Emits 'role-ready' event when role is ready
   */
  async updateRoleToolCompletion(
    repository: string,
    prNumber: number,
    role: AgentRole,
    completedTools: string[]
  ): Promise<void> {
    const status = this.roleStatus.get(role);
    if (!status) return;
    
    status.toolsCompleted = completedTools;
    
    // Check if all dependencies are met
    const dependenciesMet = this.checkDependencies(role);
    
    if (dependenciesMet && completedTools.length > 0) {
      status.ready = true;
      status.completedAt = new Date();
      
      // Notify agent tool awareness
      await agentToolAwareness.updateToolExecutionProgress(
        repository,
        prNumber,
        role,
        completedTools
      );
      
      // Emit event for waiting agents
      this.emit('role-ready', {
        role,
        repository,
        prNumber,
        tools: completedTools
      });
      
      this.logger.info(`Role ${role} is ready to start analysis`);
    }
  }
  
  /**
   * Check if role dependencies are met
   */
  private checkDependencies(role: AgentRole): boolean {
    const status = this.roleStatus.get(role);
    if (!status || !status.dependencies) return true;
    
    return status.dependencies.every(depRole => {
      const depStatus = this.roleStatus.get(depRole);
      return depStatus?.ready === true;
    });
  }
  
  /**
   * Check if a specific role is ready
   */
  isRoleReady(role: AgentRole): boolean {
    const status = this.roleStatus.get(role);
    return status?.ready === true;
  }
  
  /**
   * Get readiness status for all roles
   */
  getAllRoleStatuses(): Map<AgentRole, RoleReadinessStatus> {
    return new Map(this.roleStatus);
  }
  
  /**
   * Wait for a role to be ready
   */
  async waitForRole(role: AgentRole, timeout = 300000): Promise<void> {
    if (this.isRoleReady(role)) return;
    
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for role ${role} to be ready`));
      }, timeout);
      
      const handler = (event: any) => {
        if (event.role === role) {
          clearTimeout(timer);
          this.removeListener('role-ready', handler);
          resolve();
        }
      };
      
      this.on('role-ready', handler);
    });
  }
  
  /**
   * Reset all statuses
   */
  reset(): void {
    this.roleStatus.clear();
    this.initializeRoleStatuses();
    this.removeAllListeners();
  }
}

// Export singleton
export const roleReadinessManager = new PerRoleReadinessManager();