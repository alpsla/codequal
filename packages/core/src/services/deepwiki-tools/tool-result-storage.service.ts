/* eslint-disable @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-unused-vars, no-console */

import { VectorStorageService, EnhancedChunk } from '@codequal/database';
// Import types from database package when used in implementation
import { ToolExecutionResult } from './tool-runner.service';
import { v4 as uuidv4 } from 'uuid';

/**
 * Formatted tool result ready for storage
 */
interface FormattedToolResult {
  toolId: string;
  agentRoles: string[];
  content: string;
  metadata: Record<string, unknown>;
}

interface VulnerabilityInfo {
  [severity: string]: number;
}

interface PackageInfo {
  name: string;
  version: string;
  license?: string;
  current?: string;
  latest?: string;
  updateType?: string;
}

interface ViolationInfo {
  rule: string;
  from: string;
  to: string;
}

interface ErrorWarningInfo {
  message: string;
}

interface ToolOutput {
  vulnerabilities?: VulnerabilityInfo;
  totalVulnerabilities?: number;
  riskyLicenses?: PackageInfo[];
  unknownLicenses?: PackageInfo[];
  totalLicenses?: number;
  circular?: string[][];
  totalModules?: number;
  violations?: ViolationInfo[];
  errors?: ErrorWarningInfo[];
  warnings?: ErrorWarningInfo[];
  outdated?: PackageInfo[];
  totalOutdated?: number;
  [key: string]: unknown;
}

/**
 * Agent role mapping for tools
 */
const TOOL_AGENT_MAPPING: Record<string, string[]> = {
  'npm-audit': ['security'],
  'license-checker': ['security', 'dependency'],
  'madge': ['architecture'],
  'dependency-cruiser': ['architecture'],
  'npm-outdated': ['dependency']
};

/**
 * Service for storing tool results in Vector DB
 * Maintains only the latest results for each repository
 */
export class ToolResultStorageService {
  constructor(
    private vectorStorage: VectorStorageService,
    private embeddingService: { generateEmbedding(text: string): Promise<number[]> }
  ) {}
  
  /**
   * Store tool results in Vector DB (replaces existing results)
   */
  async storeToolResults(
    repositoryId: string,
    toolResults: Record<string, ToolExecutionResult>,
    options: {
      prNumber?: number;
      commitHash?: string;
      scheduledRun?: boolean;
    } = {}
  ): Promise<void> {
    // 1. Delete existing tool results for this repository
    await this.deleteExistingToolResults(repositoryId);
    
    // 2. Prepare new chunks
    const chunks: EnhancedChunk[] = [];
    const embeddings: number[][] = [];
    const timestamp = new Date().toISOString();
    
    // Process each tool result
    for (const [toolId, result] of Object.entries(toolResults)) {
      if (!result.success) {
        console.warn(`Skipping failed tool result: ${toolId}`);
        continue;
      }
      
      // Format tool result for storage
      const formattedResults = this.formatToolResult(toolId, result);
      
      // Create chunks for each agent role
      for (const formatted of formattedResults) {
        for (const agentRole of formatted.agentRoles) {
          const chunk = this.createChunk(
            repositoryId,
            formatted,
            agentRole,
            {
              prNumber: options.prNumber,
              commitHash: options.commitHash,
              timestamp,
              scheduledRun: options.scheduledRun || false
            }
          );
          
          chunks.push(chunk);
          
          // Generate embedding for the content
          const embedding = await this.embeddingService.generateEmbedding(
            chunk.enhancedContent || chunk.content
          );
          embeddings.push(embedding);
        }
      }
    }
    
    // 3. Store new chunks
    if (chunks.length > 0) {
      await this.vectorStorage.storeChunks(
        chunks,
        embeddings,
        repositoryId,
        'tool',
        `tools-${Date.now()}`,
        'permanent'
      );
    }
    
    // 4. Log execution summary (lightweight audit)
    await this.logExecutionSummary(repositoryId, toolResults, options);
  }
  
  /**
   * Delete existing tool results for a repository
   */
  private async deleteExistingToolResults(repositoryId: string): Promise<void> {
    try {
      const deleted = await this.vectorStorage.deleteChunksBySource(
        'tool',
        repositoryId,
        repositoryId
      );
      
      console.log(`Deleted ${deleted} existing tool result chunks for repository ${repositoryId}`);
    } catch (error) {
      console.error('Error deleting existing tool results:', error);
      // Continue with storage even if deletion fails
    }
  }
  
  /**
   * Log execution summary for audit/trending (lightweight)
   */
  private async logExecutionSummary(
    repositoryId: string,
    toolResults: Record<string, ToolExecutionResult>,
    options: {
      prNumber?: number;
      commitHash?: string;
      scheduledRun?: boolean;
    }
  ): Promise<void> {
    const summary = {
      tools_run: Object.keys(toolResults),
      tools_succeeded: Object.values(toolResults).filter(r => r.success).length,
      tools_failed: Object.values(toolResults).filter(r => !r.success).length,
      metrics: {} as Record<string, number>
    };
    
    // Extract key metrics only (not full results)
    Object.entries(toolResults).forEach(([toolId, result]) => {
      if (result.success && result.metadata) {
        switch (toolId) {
          case 'npm-audit':
            summary.metrics.vulnerabilities = (result.metadata as any).totalVulnerabilities || 0;
            break;
          case 'license-checker':
            summary.metrics.riskyLicenses = (result.metadata as any).riskyLicenses || 0;
            break;
          case 'madge':
            summary.metrics.circularDependencies = (result.metadata as any).circularDependencies || 0;
            break;
          case 'npm-outdated':
            summary.metrics.outdatedPackages = (result.metadata as any).totalOutdated || 0;
            break;
        }
      }
    });
    
    // This could be stored in a separate lightweight table
    // For now, we'll just log it
    console.log('Tool execution summary:', {
      repository_id: repositoryId,
      executed_at: new Date(),
      scheduled_run: options.scheduledRun || false,
      ...summary
    });
  }
  
  /**
   * Format tool result for storage
   */
  private formatToolResult(
    toolId: string,
    result: ToolExecutionResult
  ): FormattedToolResult[] {
    const agentRoles = TOOL_AGENT_MAPPING[toolId] || [];
    const results: FormattedToolResult[] = [];
    
    switch (toolId) {
      case 'npm-audit':
        results.push(this.formatNpmAuditResult(result, agentRoles));
        break;
        
      case 'license-checker':
        results.push(this.formatLicenseCheckerResult(result, agentRoles));
        break;
        
      case 'madge':
        results.push(this.formatMadgeResult(result, agentRoles));
        break;
        
      case 'dependency-cruiser':
        results.push(this.formatDependencyCruiserResult(result, agentRoles));
        break;
        
      case 'npm-outdated':
        results.push(this.formatNpmOutdatedResult(result, agentRoles));
        break;
        
      default:
        // Generic formatting
        results.push({
          toolId,
          agentRoles,
          content: JSON.stringify(result.output, null, 2),
          metadata: result.metadata || {}
        });
    }
    
    return results;
  }
  
  // ... (keep the existing format methods from the original implementation)
  
  /**
   * Create enhanced chunk for storage
   */
  private createChunk(
    repositoryId: string,
    formatted: FormattedToolResult,
    agentRole: string,
    options: {
      prNumber?: number;
      commitHash?: string;
      timestamp: string;
      scheduledRun: boolean;
    }
  ): EnhancedChunk {
    const chunkId = uuidv4();
    
    return {
      id: chunkId,
      content: formatted.content,
      enhancedContent: formatted.content,
      type: 'tool_result',
      metadata: {
        ...formatted.metadata,
        chunkIndex: 0,
        totalChunks: 1,
        agent_role: agentRole,
        tool_id: formatted.toolId,
        tool_name: formatted.toolId,
        content_type: 'tool_result',
        pr_number: options.prNumber,
        commit_hash: options.commitHash,
        timestamp: options.timestamp,
        scheduled_run: options.scheduledRun || false,
        is_latest: true // Mark as latest result
      },
      windowContext: '',
      filePath: `tool-results/${formatted.toolId}`
    };
  }
  
  /**
   * Format npm audit result
   */
  private formatNpmAuditResult(
    result: ToolExecutionResult,
    agentRoles: string[]
  ): FormattedToolResult {
    const metadata = result.metadata || {};
    const vulnerabilities = (metadata as any).vulnerabilities || {};
    
    const content = `
NPM Audit Security Report:
${'='.repeat(50)}

Total Vulnerabilities: ${(metadata as any).totalVulnerabilities || 0}

Breakdown:
- Critical: ${(vulnerabilities as any).critical || 0}
- High: ${(vulnerabilities as any).high || 0}
- Moderate: ${(vulnerabilities as any).moderate || 0}
- Low: ${(vulnerabilities as any).low || 0}
- Info: ${(vulnerabilities as any).info || 0}

Detailed Findings:
${JSON.stringify(result.output, null, 2)}
`;
    
    return {
      toolId: 'npm-audit',
      agentRoles,
      content,
      metadata: {
        ...metadata,
        security_score: this.calculateSecurityScore(vulnerabilities as VulnerabilityInfo)
      }
    };
  }
  
  /**
   * Format license checker result
   */
  private formatLicenseCheckerResult(
    result: ToolExecutionResult,
    agentRoles: string[]
  ): FormattedToolResult {
    const output = result.output as ToolOutput;
    const riskyLicenses = output.riskyLicenses || [];
    const unknownLicenses = output.unknownLicenses || [];
    
    const content = `
License Compliance Report:
${'='.repeat(50)}

Total Packages: ${(output as any).totalPackages || 0}
Risky Licenses: ${riskyLicenses.length}
Unknown Licenses: ${unknownLicenses.length}

Risky License Details:
${riskyLicenses.map((pkg: PackageInfo) => `- ${pkg.name}@${pkg.version}: ${pkg.license}`).join('\n')}

Unknown License Packages:
${unknownLicenses.map((pkg: PackageInfo) => `- ${pkg.name}@${pkg.version}`).join('\n')}

License Distribution:
${JSON.stringify((output as any).licenseDistribution || {}, null, 2)}
`;
    
    return {
      toolId: 'license-checker',
      agentRoles,
      content,
      metadata: {
        totalPackages: (output as any).totalPackages || 0,
        riskyLicenses: riskyLicenses.length,
        unknownLicenses: unknownLicenses.length,
        compliance_score: this.calculateComplianceScore(output)
      }
    };
  }
  
  /**
   * Format madge result
   */
  private formatMadgeResult(
    result: ToolExecutionResult,
    agentRoles: string[]
  ): FormattedToolResult {
    const output = result.output as ToolOutput;
    const circular = output.circular || [];
    const orphans = (output as any).orphans || [];
    
    const content = `
Architecture Analysis Report (Madge):
${'='.repeat(50)}

Circular Dependencies: ${circular.length}
Orphan Modules: ${(orphans as any[]).length}

Circular Dependency Details:
${circular.map((cycle: string[]) => `- ${cycle.join(' → ')}`).join('\n') || 'None found'}

Orphan Modules:
${((orphans as any[]).join('\n')) || 'None found'}

Modularity Metrics:
${JSON.stringify(result.metadata || {}, null, 2)}
`;
    
    return {
      toolId: 'madge',
      agentRoles,
      content,
      metadata: {
        circularDependencies: circular.length,
        orphanModules: (orphans as any[]).length,
        moduleCount: (result.metadata as any)?.moduleCount || 0,
        architecture_score: this.calculateArchitectureScore(output)
      }
    };
  }
  
  /**
   * Format dependency cruiser result
   */
  private formatDependencyCruiserResult(
    result: ToolExecutionResult,
    agentRoles: string[]
  ): FormattedToolResult {
    const output = result.output as ToolOutput;
    const violations = output.violations || [];
    const errors = output.errors || [];
    const warnings = output.warnings || [];
    
    const content = `
Dependency Rules Validation Report:
${'='.repeat(50)}

Total Violations: ${violations.length}
Errors: ${errors.length}
Warnings: ${warnings.length}

Violation Details:
${violations.map((v: ViolationInfo) => `- ${v.rule}: ${v.from} → ${v.to}`).join('\n') || 'None found'}

Error Details:
${errors.map((e: ErrorWarningInfo) => `- ${e.message}`).join('\n') || 'None found'}

Warning Details:
${warnings.map((w: ErrorWarningInfo) => `- ${w.message}`).join('\n') || 'None found'}
`;
    
    return {
      toolId: 'dependency-cruiser',
      agentRoles,
      content,
      metadata: {
        violations: violations.length,
        errors: errors.length,
        warnings: warnings.length,
        dependency_score: this.calculateDependencyScore(output)
      }
    };
  }
  
  /**
   * Format npm outdated result
   */
  private formatNpmOutdatedResult(
    result: ToolExecutionResult,
    agentRoles: string[]
  ): FormattedToolResult {
    const output = result.output as ToolOutput;
    const outdated = output.outdated || [];
    const metadata = result.metadata || {};
    
    const content = `
Dependency Currency Report:
${'='.repeat(50)}

Outdated Packages: ${(output as any).outdatedCount || 0}
Major Updates: ${(metadata as any).majorUpdates || 0}
Minor Updates: ${(metadata as any).minorUpdates || 0}
Patch Updates: ${(metadata as any).patchUpdates || 0}

Outdated Package Details:
${outdated.map((pkg: PackageInfo) => `- ${pkg.name}: ${pkg.current} → ${pkg.latest} (${pkg.updateType})`).join('\n') || 'All packages up to date'}
`;
    
    return {
      toolId: 'npm-outdated',
      agentRoles,
      content,
      metadata: {
        totalOutdated: (output as any).outdatedCount || 0,
        majorUpdates: (metadata as any).majorUpdates || 0,
        minorUpdates: (metadata as any).minorUpdates || 0,
        patchUpdates: (metadata as any).patchUpdates || 0,
        maintenance_score: this.calculateMaintenanceScore(output)
      }
    };
  }
  
  /**
   * Calculate security score based on vulnerabilities
   */
  private calculateSecurityScore(vulnerabilities: VulnerabilityInfo): number {
    const weights = {
      critical: 10,
      high: 5,
      moderate: 2,
      low: 1,
      info: 0.5
    };
    
    let totalWeight = 0;
    Object.entries(vulnerabilities).forEach(([level, count]) => {
      totalWeight += (weights[level as keyof typeof weights] || 0) * (Number(count) || 0);
    });
    
    // Score decreases with more vulnerabilities
    return Math.max(0, 10 - totalWeight / 10);
  }
  
  /**
   * Calculate compliance score based on licenses
   */
  private calculateComplianceScore(output: ToolOutput): number {
    const riskyCount = output.riskyLicenses?.length || 0;
    const unknownCount = output.unknownLicenses?.length || 0;
    const totalPackages = (output as any).totalPackages || 1;
    
    const riskyRatio = riskyCount / totalPackages;
    const unknownRatio = unknownCount / totalPackages;
    
    return Math.max(0, 10 - (riskyRatio * 8 + unknownRatio * 2));
  }
  
  /**
   * Calculate architecture score based on circular dependencies
   */
  private calculateArchitectureScore(output: ToolOutput): number {
    const circularCount = output.circular?.length || 0;
    const orphanCount = (output as any).orphans?.length || 0;
    
    return Math.max(0, 10 - circularCount * 2 - orphanCount * 0.5);
  }
  
  /**
   * Calculate dependency score based on violations
   */
  private calculateDependencyScore(output: ToolOutput): number {
    const violations = output.violations?.length || 0;
    const errors = output.errors?.length || 0;
    const warnings = output.warnings?.length || 0;
    
    return Math.max(0, 10 - errors * 2 - violations * 1 - warnings * 0.5);
  }
  
  /**
   * Calculate maintenance score based on outdated packages
   */
  private calculateMaintenanceScore(output: ToolOutput): number {
    const majorUpdates = (output as any).metadata?.majorUpdates || 0;
    const minorUpdates = (output as any).metadata?.minorUpdates || 0;
    const totalOutdated = (output as any).outdatedCount || 0;
    
    if (totalOutdated === 0) return 10;
    
    return Math.max(0, 10 - majorUpdates * 2 - minorUpdates * 0.5);
  }
}
