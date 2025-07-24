/**
 * NPM Outdated Direct Adapter
 * Checks for outdated npm packages and provides version currency information
 */

import { DirectToolAdapter } from './base-adapter';
import {
  ToolResult,
  ToolFinding,
  AnalysisContext,
  ToolMetadata,
  ToolCapability,
  ToolRequirements,
  AgentRole
} from '../../core/interfaces';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';

const execAsync = promisify(exec);

interface OutdatedPackage {
  name: string;
  current: string;
  wanted: string;
  latest: string;
  dependent?: string;
  location?: string;
  type?: 'dependencies' | 'devDependencies' | 'peerDependencies';
}

export class NpmOutdatedDirectAdapter extends DirectToolAdapter {
  readonly id = 'npm-outdated-direct';
  readonly name = 'NPM Outdated Direct';
  readonly version = '1.0.0';
  
  readonly capabilities: ToolCapability[] = [
    {
      name: 'version-currency',
      category: 'quality',
      languages: ['javascript', 'typescript'],
      fileTypes: ['package.json']
    },
    {
      name: 'update-recommendations',
      category: 'quality',
      languages: ['javascript', 'typescript'],
      fileTypes: ['package.json', 'package-lock.json']
    }
  ];
  
  readonly requirements: ToolRequirements = {
    minFiles: 1,
    executionMode: 'on-demand',
    timeout: 30000,
    authentication: {
      type: 'none',
      required: false
    }
  };
  
  /**
   * Get health check command
   */
  protected getHealthCheckCommand(): { cmd: string; args: string[] } {
    return { cmd: 'npm', args: ['--version'] };
  }
  
  /**
   * Check if tool can analyze given context
   */
  canAnalyze(context: AnalysisContext): boolean {
    // Only for dependency agent
    if (context.agentRole !== 'dependency') {
      return false;
    }
    
    // Check for package.json
    return context.pr.files.some(file => 
      file.path === 'package.json' || 
      file.path.endsWith('/package.json')
    );
  }
  
  /**
   * Execute npm outdated analysis
   */
  async analyze(context: AnalysisContext): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      // Find all package.json files
      const packageJsonFiles = context.pr.files.filter(file => 
        file.path.endsWith('package.json')
      );
      
      if (packageJsonFiles.length === 0) {
        return this.createEmptyResult(startTime);
      }
      
      const findings: ToolFinding[] = [];
      const allOutdatedPackages: OutdatedPackage[] = [];
      
      // Analyze each package.json directory
      for (const packageFile of packageJsonFiles) {
        const dir = path.dirname(packageFile.path);
        const workingDir = path.join(process.cwd(), dir);
        
        try {
          // Check if directory exists
          await fs.access(workingDir);
          
          // Run npm outdated
          const outdatedPackages = await this.checkOutdatedPackages(workingDir);
          allOutdatedPackages.push(...outdatedPackages);
          
          // Generate findings
          const dirFindings = this.generateFindings(outdatedPackages, dir);
          findings.push(...dirFindings);
        } catch (error) {
          // Directory might not exist or npm command failed
          console.warn(`Skipping ${dir}: ${error}`);
        }
      }
      
      // Calculate metrics
      const metrics = this.calculateMetrics(allOutdatedPackages);
      
      return {
        success: true,
        toolId: this.id,
        executionTime: Date.now() - startTime,
        findings,
        metrics: metrics as Record<string, number>
      };
    } catch (error) {
      return {
        success: false,
        toolId: this.id,
        executionTime: Date.now() - startTime,
        error: {
          code: 'NPM_OUTDATED_FAILED',
          message: error instanceof Error ? error.message : String(error),
          recoverable: true
        }
      };
    }
  }
  
  /**
   * Check for outdated packages using npm outdated
   */
  private async checkOutdatedPackages(workingDir: string): Promise<OutdatedPackage[]> {
    try {
      // Run npm outdated --json
      // Note: npm outdated exits with code 1 if packages are outdated, so we handle that
      const { stdout } = await execAsync('npm outdated --json', {
        cwd: workingDir,
        encoding: 'utf8'
      }).catch(error => {
        // If exit code is 1 and we have stdout, it's just outdated packages
        if (error.code === 1 && error.stdout) {
          return { stdout: error.stdout };
        }
        throw error;
      });
      
      if (!stdout || stdout.trim() === '') {
        return [];
      }
      
      const outdatedData = JSON.parse(stdout);
      const packages: OutdatedPackage[] = [];
      
      // Parse npm outdated JSON output
      for (const [packageName, info] of Object.entries(outdatedData) as [string, {
        current?: string;
        wanted?: string;
        latest?: string;
        type?: string;
        dependent?: string;
        location?: string;
      }][]) {
        packages.push({
          name: packageName,
          current: info.current || 'not installed',
          wanted: info.wanted || '',
          latest: info.latest || '',
          type: (info.type || 'dependencies') as 'dependencies' | 'devDependencies' | 'peerDependencies',
          dependent: info.dependent,
          location: info.location
        });
      }
      
      return packages;
    } catch (error) {
      console.error('Error checking outdated packages:', error);
      return [];
    }
  }
  
  /**
   * Generate findings from outdated packages
   */
  private generateFindings(packages: OutdatedPackage[], directory: string): ToolFinding[] {
    const findings: ToolFinding[] = [];
    
    // Group by update type
    const majorUpdates = packages.filter(p => this.isMajorUpdate(p.current, p.latest));
    const minorUpdates = packages.filter(p => 
      !this.isMajorUpdate(p.current, p.latest) && this.isMinorUpdate(p.current, p.latest)
    );
    const patchUpdates = packages.filter(p => 
      !this.isMajorUpdate(p.current, p.latest) && 
      !this.isMinorUpdate(p.current, p.latest) &&
      p.current !== p.latest
    );
    
    // Major version updates (high priority)
    if (majorUpdates.length > 0) {
      findings.push({
        type: 'issue',
        severity: 'high',
        category: 'dependency',
        message: `🔄 ${majorUpdates.length} packages have major version updates available`,
        ruleId: 'major-updates-available',
        file: path.join(directory, 'package.json'),
        documentation: this.formatMajorUpdates(majorUpdates)
      });
    }
    
    // Minor version updates (medium priority)
    if (minorUpdates.length > 0) {
      findings.push({
        type: 'suggestion',
        severity: 'medium',
        category: 'dependency',
        message: `📦 ${minorUpdates.length} packages have minor version updates available`,
        ruleId: 'minor-updates-available',
        file: path.join(directory, 'package.json'),
        documentation: this.formatMinorUpdates(minorUpdates)
      });
    }
    
    // Patch updates (low priority)
    if (patchUpdates.length > 0) {
      findings.push({
        type: 'info',
        severity: 'low',
        category: 'dependency',
        message: `🔧 ${patchUpdates.length} packages have patch updates available`,
        ruleId: 'patch-updates-available',
        file: path.join(directory, 'package.json'),
        documentation: this.formatPatchUpdates(patchUpdates)
      });
    }
    
    // Check for very outdated packages (>1 year behind)
    const veryOutdated = packages.filter(p => this.isVeryOutdated(p.current, p.latest));
    if (veryOutdated.length > 0) {
      findings.push({
        type: 'issue',
        severity: 'high',
        category: 'dependency',
        message: `⚠️ ${veryOutdated.length} packages are severely outdated (>1 year behind)`,
        ruleId: 'severely-outdated-packages',
        file: path.join(directory, 'package.json'),
        documentation: this.formatSeverelyOutdated(veryOutdated)
      });
    }
    
    return findings;
  }
  
  /**
   * Calculate metrics from outdated packages
   */
  private calculateMetrics(packages: OutdatedPackage[]): Record<string, unknown> {
    const majorUpdates = packages.filter(p => this.isMajorUpdate(p.current, p.latest));
    const minorUpdates = packages.filter(p => 
      !this.isMajorUpdate(p.current, p.latest) && this.isMinorUpdate(p.current, p.latest)
    );
    const patchUpdates = packages.filter(p => 
      !this.isMajorUpdate(p.current, p.latest) && 
      !this.isMinorUpdate(p.current, p.latest) &&
      p.current !== p.latest
    );
    
    const updateScore = this.calculateUpdateScore(packages);
    
    return {
      totalPackages: packages.length,
      majorUpdates: majorUpdates.length,
      minorUpdates: minorUpdates.length,
      patchUpdates: patchUpdates.length,
      upToDate: packages.filter(p => p.current === p.latest).length,
      updateScore, // 0-10 score for how up-to-date dependencies are
      recommendations: patchUpdates.length + minorUpdates.length + majorUpdates.length
    };
  }
  
  /**
   * Check if update is a major version change
   */
  private isMajorUpdate(current: string, latest: string): boolean {
    // Handle undefined or null versions
    if (!current || !latest || typeof current !== 'string' || typeof latest !== 'string') {
      return false;
    }
    
    const currentMajor = this.extractMajorVersion(current);
    const latestMajor = this.extractMajorVersion(latest);
    return currentMajor !== latestMajor;
  }
  
  /**
   * Check if update is a minor version change
   */
  private isMinorUpdate(current: string, latest: string): boolean {
    // Handle undefined or null versions
    if (!current || !latest || typeof current !== 'string' || typeof latest !== 'string') {
      return false;
    }
    
    const currentParts = current.split('.');
    const latestParts = latest.split('.');
    
    if (currentParts[0] !== latestParts[0]) return false; // Different major
    return currentParts[1] !== latestParts[1]; // Different minor
  }
  
  /**
   * Check if package is very outdated (simplified check)
   */
  private isVeryOutdated(current: string, latest: string): boolean {
    // This is a simplified check - in production, you'd check actual release dates
    const currentMajor = parseInt(this.extractMajorVersion(current));
    const latestMajor = parseInt(this.extractMajorVersion(latest));
    
    // If more than 2 major versions behind, consider it very outdated
    return latestMajor - currentMajor > 2;
  }
  
  /**
   * Extract major version number
   */
  private extractMajorVersion(version: string): string {
    // Handle undefined or null versions
    if (!version || typeof version !== 'string') {
      return '0';
    }
    
    // Remove any prefixes (^, ~, etc.) and get first number
    const cleanVersion = version.replace(/^[^0-9]*/, '');
    return cleanVersion.split('.')[0] || '0';
  }
  
  /**
   * Calculate update score (0-10)
   */
  private calculateUpdateScore(packages: OutdatedPackage[]): number {
    if (packages.length === 0) return 10;
    
    const upToDate = packages.filter(p => p.current === p.latest).length;
    const ratio = upToDate / packages.length;
    
    // Deduct points for outdated packages
    let score = 10 * ratio;
    
    // Additional penalties
    const majorOutdated = packages.filter(p => this.isMajorUpdate(p.current, p.latest)).length;
    score -= (majorOutdated * 0.5); // -0.5 for each major version behind
    
    return Math.max(0, Math.round(score * 10) / 10);
  }
  
  /**
   * Format major updates for documentation
   */
  private formatMajorUpdates(packages: OutdatedPackage[]): string {
    let doc = 'Major version updates require careful review:\n\n';
    
    packages.forEach(pkg => {
      doc += `• **${pkg.name}**: ${pkg.current} → ${pkg.latest}\n`;
      doc += `  Breaking changes may exist. Check the changelog.\n\n`;
    });
    
    doc += '\n💡 **Tip**: Update major versions one at a time and test thoroughly.';
    
    return doc;
  }
  
  /**
   * Format minor updates for documentation
   */
  private formatMinorUpdates(packages: OutdatedPackage[]): string {
    let doc = 'Minor version updates (new features, backwards compatible):\n\n';
    
    packages.forEach(pkg => {
      doc += `• ${pkg.name}: ${pkg.current} → ${pkg.latest}\n`;
    });
    
    doc += '\n✅ These updates are generally safe to apply.';
    
    return doc;
  }
  
  /**
   * Format patch updates for documentation
   */
  private formatPatchUpdates(packages: OutdatedPackage[]): string {
    let doc = 'Patch version updates (bug fixes):\n\n';
    
    packages.forEach(pkg => {
      doc += `• ${pkg.name}: ${pkg.current} → ${pkg.latest}\n`;
    });
    
    doc += '\n✅ These updates are safe and recommended.';
    
    return doc;
  }
  
  /**
   * Format severely outdated packages
   */
  private formatSeverelyOutdated(packages: OutdatedPackage[]): string {
    let doc = 'These packages are severely outdated and may have:\n';
    doc += '• Security vulnerabilities\n';
    doc += '• Missing important features\n';
    doc += '• Compatibility issues\n\n';
    
    packages.forEach(pkg => {
      doc += `• **${pkg.name}**: ${pkg.current} → ${pkg.latest} ⚠️\n`;
    });
    
    doc += '\n🚨 **Action Required**: Plan updates for these packages immediately.';
    
    return doc;
  }
  
  /**
   * Create empty result when no package.json found
   */
  private createEmptyResult(startTime: number): ToolResult {
    return {
      success: true,
      toolId: this.id,
      executionTime: Date.now() - startTime,
      findings: [],
      metrics: {
        totalPackages: 0,
        majorUpdates: 0,
        minorUpdates: 0,
        patchUpdates: 0,
        upToDate: 0,
        updateScore: 10,
        recommendations: 0
      }
    };
  }
  
  /**
   * Get tool metadata
   */
  getMetadata(): ToolMetadata {
    return {
      id: this.id,
      name: this.name,
      description: 'Checks npm packages for available updates and version currency',
      author: 'CodeQual',
      homepage: 'https://docs.npmjs.com/cli/v10/commands/npm-outdated',
      documentationUrl: 'https://docs.codequal.com/tools/npm-outdated',
      supportedRoles: ['dependency'] as AgentRole[],
      supportedLanguages: ['javascript', 'typescript'],
      supportedFrameworks: ['node', 'react', 'vue', 'angular', 'express', 'next', 'nuxt'],
      tags: ['npm', 'dependencies', 'versions', 'updates', 'outdated', 'currency'],
      securityVerified: true,
      lastVerified: new Date('2025-06-11')
    };
  }
}

// Export singleton instance
export const npmOutdatedDirectAdapter = new NpmOutdatedDirectAdapter();
