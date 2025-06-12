/**
 * License Checker Direct Adapter
 * Scans all dependencies for license compliance using license-checker npm package
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

interface LicenseInfo {
  licenses: string | string[];
  repository?: string;
  publisher?: string;
  email?: string;
  url?: string;
  private?: boolean;
  licenseFile?: string;
}

interface LicenseReport {
  [packageName: string]: LicenseInfo;
}

interface LicenseCategory {
  permissive: string[];      // MIT, Apache-2.0, BSD, ISC
  copyleft: string[];        // GPL, AGPL, LGPL
  weakCopyleft: string[];    // MPL, EPL, CDDL
  proprietary: string[];     // Proprietary, Commercial
  unknown: string[];         // Unknown or custom licenses
  publicDomain: string[];    // CC0, Unlicense, 0BSD
}

export class LicenseCheckerDirectAdapter extends DirectToolAdapter {
  readonly id = 'license-checker-direct';
  readonly name = 'License Checker Direct';
  readonly version = '1.0.0';
  
  readonly capabilities: ToolCapability[] = [
    {
      name: 'license-compliance',
      category: 'security',
      languages: ['javascript', 'typescript'],
      fileTypes: ['package.json']
    },
    {
      name: 'dependency-licensing',
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
  
  // License categories for compliance checking
  private readonly licenseCategories: LicenseCategory = {
    permissive: ['MIT', 'Apache-2.0', 'Apache 2.0', 'BSD-3-Clause', 'BSD-2-Clause', 
                 'BSD', 'ISC', 'CC-BY-3.0', 'CC-BY-4.0', 'Python-2.0', 'Zlib', 'BSL-1.0'],
    copyleft: ['GPL-3.0', 'GPL-2.0', 'GPL-3.0-or-later', 'GPL-2.0-or-later', 
               'AGPL-3.0', 'AGPL-3.0-or-later'],
    weakCopyleft: ['LGPL-3.0', 'LGPL-2.1', 'LGPL-3.0-or-later', 'LGPL-2.1-or-later',
                   'MPL-2.0', 'EPL-1.0', 'EPL-2.0', 'CDDL-1.0', 'CDDL-1.1'],
    proprietary: ['UNLICENSED', 'SEE LICENSE IN LICENSE', 'PROPRIETARY', 'COMMERCIAL'],
    unknown: ['UNKNOWN', 'Custom', 'UNDEFINED'],
    publicDomain: ['CC0-1.0', 'CC0', 'Unlicense', 'WTFPL', '0BSD']
  };
  
  // High-risk licenses for commercial use
  private readonly riskyLicenses = [
    'GPL-3.0', 'GPL-2.0', 'AGPL-3.0', 'AGPL-3.0-or-later',
    'SSPL', 'Commons Clause', 'BUSL-1.1'
  ];
  
  /**
   * Get health check command
   */
  protected getHealthCheckCommand(): { cmd: string; args: string[] } {
    // Check if license-checker is available globally or via npx
    return { cmd: 'npx', args: ['license-checker', '--version'] };
  }
  
  /**
   * Check if tool can analyze given context
   */
  canAnalyze(context: AnalysisContext): boolean {
    // For both dependency and security agents
    if (context.agentRole !== 'dependency' && context.agentRole !== 'security') {
      return false;
    }
    
    // Check for package.json
    return context.pr.files.some(file => 
      file.path === 'package.json' || 
      file.path.endsWith('/package.json')
    );
  }
  
  /**
   * Execute license checking analysis
   */
  async analyze(context: AnalysisContext): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      // Find all package.json files
      const packageJsonFiles = context.pr.files.filter(file => 
        file.path.endsWith('package.json') && file.changeType !== 'deleted'
      );
      
      if (packageJsonFiles.length === 0) {
        return this.createEmptyResult(startTime);
      }
      
      const findings: ToolFinding[] = [];
      
      // IMPORTANT: License checking requires access to node_modules
      // In PR context, we can only analyze package.json changes
      
      // Add informational finding about limitations
      findings.push({
        type: 'info',
        severity: 'info',
        category: 'dependency',
        message: '⚠️ Limited analysis: Full license compliance checking requires node_modules access',
        ruleId: 'limited-context',
        documentation: 'License-checker analyzes installed dependencies in node_modules. In PR context, only package.json changes are analyzed. Consider running full license audit in CI/CD pipeline.'
      });
      
      // Analyze package.json changes
      for (const packageFile of packageJsonFiles) {
        if (!packageFile.content) continue;
        
        try {
          const packageData = JSON.parse(packageFile.content);
          const packageFindings = this.analyzePackageJson(packageData, packageFile.path);
          findings.push(...packageFindings);
          
          // Check for added dependencies with risky licenses
          if (packageFile.changeType === 'modified' && packageFile.diff) {
            const diffFindings = this.analyzeDependencyDiff(packageFile.diff, packageFile.path);
            findings.push(...diffFindings);
          }
        } catch (error) {
          findings.push({
            type: 'issue',
            severity: 'medium',
            category: 'dependency',
            message: `Failed to parse package.json: ${error}`,
            file: packageFile.path,
            ruleId: 'parse-error'
          });
        }
      }
      
      // Calculate metrics based on available data
      const metrics = {
        filesAnalyzed: packageJsonFiles.length,
        potentialIssues: findings.filter(f => f.type === 'issue').length,
        suggestions: findings.filter(f => f.type === 'suggestion').length,
        complianceScore: this.calculateLimitedComplianceScore(findings)
      };
      
      return {
        success: true,
        toolId: this.id,
        executionTime: Date.now() - startTime,
        findings,
        metrics
      };
    } catch (error) {
      return {
        success: false,
        toolId: this.id,
        executionTime: Date.now() - startTime,
        error: {
          code: 'LICENSE_CHECK_FAILED',
          message: error instanceof Error ? error.message : String(error),
          recoverable: true
        }
      };
    }
  }
  
  /**
   * Analyze package.json for license-related issues
   */
  private analyzePackageJson(packageData: any, filePath: string): ToolFinding[] {
    const findings: ToolFinding[] = [];
    
    // Check if package has a license field
    if (!packageData.license && !packageData.licenses) {
      findings.push({
        type: 'issue',
        severity: 'high',
        category: 'dependency',
        message: '🚨 Package missing license declaration',
        file: filePath,
        ruleId: 'missing-license',
        documentation: 'Your package.json should declare a license field. This is important for users to understand how they can use your package.'
      });
    } else {
      // Check for proprietary/unclear licenses
      const license = packageData.license || packageData.licenses;
      const licenseStr = Array.isArray(license) ? license.join(', ') : String(license);
      
      if (this.riskyLicenses.some(risky => licenseStr.includes(risky))) {
        findings.push({
          type: 'issue',
          severity: 'critical',
          category: 'dependency',
          message: `🚨 Package uses high-risk license: ${licenseStr}`,
          file: filePath,
          ruleId: 'risky-package-license',
          documentation: 'This license may have significant restrictions for commercial use. Ensure you understand the implications.'
        });
      }
    }
    
    // Check dependencies for known risky packages
    const allDeps = {
      ...packageData.dependencies,
      ...packageData.devDependencies,
      ...packageData.peerDependencies
    };
    
    // Known packages with license issues
    const riskyPackages: Record<string, string> = {
      'react-native-navigation': 'Uses modified MIT license with additional terms',
      'highcharts': 'Commercial license required for commercial use',
      'ag-grid-enterprise': 'Requires commercial license',
      'font-awesome-pro': 'Requires Pro license'
    };
    
    Object.keys(allDeps).forEach(dep => {
      if (riskyPackages[dep]) {
        findings.push({
          type: 'issue',
          severity: 'high',
          category: 'dependency',
          message: `⚠️ Dependency '${dep}' has special licensing requirements`,
          file: filePath,
          ruleId: 'known-license-issue',
          documentation: riskyPackages[dep]
        });
      }
    });
    
    return findings;
  }
  
  /**
   * Analyze dependency changes in diff
   */
  private analyzeDependencyDiff(diff: string, filePath: string): ToolFinding[] {
    const findings: ToolFinding[] = [];
    
    // Extract added dependencies from diff
    const addedDeps: string[] = [];
    const lines = diff.split('\n');
    
    let inDependencies = false;
    lines.forEach(line => {
      // Check if we're in a dependencies section
      if (line.includes('"dependencies"') || 
          line.includes('"devDependencies"') || 
          line.includes('"peerDependencies"')) {
        inDependencies = true;
      } else if (line.includes('}') && inDependencies) {
        inDependencies = false;
      }
      
      // Look for added dependencies
      if (inDependencies && line.startsWith('+') && line.includes(':')) {
        const match = line.match(/"([^"]+)"\s*:/);;
        if (match) {
          addedDeps.push(match[1]);
        }
      }
    });
    
    // Check added dependencies against known problematic ones
    const gplPackages = ['mysql', 'readline', 'node-gpl'];
    const agplPackages = ['mongodb', 'parse-server'];
    
    addedDeps.forEach(dep => {
      if (gplPackages.includes(dep)) {
        findings.push({
          type: 'issue',
          severity: 'high',
          category: 'dependency',
          message: `⚠️ Added dependency '${dep}' typically uses GPL license`,
          file: filePath,
          ruleId: 'potential-gpl-dependency',
          documentation: 'GPL licensed dependencies may require your entire application to be open-sourced. Verify the license before using.'
        });
      }
      
      if (agplPackages.includes(dep)) {
        findings.push({
          type: 'issue',
          severity: 'critical',
          category: 'dependency',
          message: `🚨 Added dependency '${dep}' may use AGPL license`,
          file: filePath,
          ruleId: 'potential-agpl-dependency',
          documentation: 'AGPL requires source code disclosure even for network use. This has serious implications for SaaS applications.'
        });
      }
    });
    
    if (addedDeps.length > 0) {
      findings.push({
        type: 'suggestion',
        severity: 'medium',
        category: 'dependency',
        message: `📦 ${addedDeps.length} new dependencies added - run full license audit`,
        file: filePath,
        ruleId: 'new-dependencies',
        documentation: `New dependencies: ${addedDeps.join(', ')}. Run \`npx license-checker\` to verify all licenses are compatible with your project.`
      });
    }
    
    return findings;
  }
  
  /**
   * Calculate limited compliance score
   */
  private calculateLimitedComplianceScore(findings: ToolFinding[]): number {
    let score = 10;
    
    findings.forEach(finding => {
      if (finding.severity === 'critical') score -= 2;
      if (finding.severity === 'high') score -= 1;
      if (finding.severity === 'medium') score -= 0.5;
    });
    
    return Math.max(0, Math.round(score * 10) / 10);
  }
  
  /**
   * Run license-checker and get JSON report
   */
  private async checkLicenses(workingDir: string): Promise<LicenseReport> {
    try {
      // Run license-checker --json
      const { stdout } = await execAsync('npx license-checker --json --direct', {
        cwd: workingDir,
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large reports
      });
      
      if (!stdout || stdout.trim() === '') {
        return {};
      }
      
      return JSON.parse(stdout);
    } catch (error) {
      // Try fallback without --direct flag (older versions)
      try {
        const { stdout } = await execAsync('npx license-checker --json', {
          cwd: workingDir,
          encoding: 'utf8',
          maxBuffer: 10 * 1024 * 1024
        });
        
        if (!stdout || stdout.trim() === '') {
          return {};
        }
        
        return JSON.parse(stdout);
      } catch (fallbackError) {
        console.error('Error running license-checker:', fallbackError);
        return {};
      }
    }
  }
  
  /**
   * Categorize licenses by type
   */
  private categorizeLicenses(report: LicenseReport): {
    byCategory: Record<keyof LicenseCategory, string[]>;
    byLicense: Record<string, string[]>;
  } {
    const byCategory: Record<keyof LicenseCategory, string[]> = {
      permissive: [],
      copyleft: [],
      weakCopyleft: [],
      proprietary: [],
      unknown: [],
      publicDomain: []
    };
    
    const byLicense: Record<string, string[]> = {};
    
    Object.entries(report).forEach(([packageName, info]) => {
      const licenses = Array.isArray(info.licenses) ? info.licenses : [info.licenses];
      
      licenses.forEach(license => {
        // Track by license type
        if (!byLicense[license]) {
          byLicense[license] = [];
        }
        byLicense[license].push(packageName);
        
        // Categorize
        let categorized = false;
        for (const [category, licenseList] of Object.entries(this.licenseCategories)) {
          if (licenseList.some((l: string) => license.includes(l))) {
            byCategory[category as keyof LicenseCategory].push(packageName);
            categorized = true;
            break;
          }
        }
        
        if (!categorized) {
          byCategory.unknown.push(packageName);
        }
      });
    });
    
    return { byCategory, byLicense };
  }
  
  /**
   * Generate findings from license report
   */
  private generateFindings(
    report: LicenseReport, 
    categorized: ReturnType<typeof this.categorizeLicenses>,
    directory: string
  ): ToolFinding[] {
    const findings: ToolFinding[] = [];
    
    // Check for GPL/copyleft licenses (high risk for commercial use)
    if (categorized.byCategory.copyleft.length > 0) {
      findings.push({
        type: 'issue',
        severity: 'high',
        category: 'dependency',
        message: `⚠️ ${categorized.byCategory.copyleft.length} packages use copyleft licenses (GPL/AGPL)`,
        file: path.join(directory, 'package.json'),
        ruleId: 'copyleft-license',
        documentation: this.formatCopyleftDoc(categorized.byCategory.copyleft, report)
      });
    }
    
    // Check for unknown licenses
    if (categorized.byCategory.unknown.length > 0) {
      findings.push({
        type: 'issue',
        severity: 'medium',
        category: 'dependency',
        message: `❓ ${categorized.byCategory.unknown.length} packages have unknown or unclear licenses`,
        file: path.join(directory, 'package.json'),
        ruleId: 'unknown-license',
        documentation: this.formatUnknownDoc(categorized.byCategory.unknown, report)
      });
    }
    
    // Check for proprietary/unlicensed packages
    if (categorized.byCategory.proprietary.length > 0) {
      findings.push({
        type: 'issue',
        severity: 'high',
        category: 'dependency',
        message: `🔒 ${categorized.byCategory.proprietary.length} packages appear to be proprietary or unlicensed`,
        file: path.join(directory, 'package.json'),
        ruleId: 'proprietary-license',
        documentation: this.formatProprietaryDoc(categorized.byCategory.proprietary, report)
      });
    }
    
    // Check for weak copyleft licenses (medium risk)
    if (categorized.byCategory.weakCopyleft.length > 0) {
      findings.push({
        type: 'suggestion',
        severity: 'medium',
        category: 'dependency',
        message: `📋 ${categorized.byCategory.weakCopyleft.length} packages use weak copyleft licenses (LGPL/MPL/EPL)`,
        file: path.join(directory, 'package.json'),
        ruleId: 'weak-copyleft-license',
        documentation: this.formatWeakCopyleftDoc(categorized.byCategory.weakCopyleft, report)
      });
    }
    
    // License diversity check
    const uniqueLicenses = Object.keys(categorized.byLicense).length;
    if (uniqueLicenses > 10) {
      findings.push({
        type: 'info',
        severity: 'low',
        category: 'dependency',
        message: `📊 High license diversity: ${uniqueLicenses} different licenses detected`,
        file: path.join(directory, 'package.json'),
        ruleId: 'license-diversity',
        documentation: this.formatDiversityDoc(categorized.byLicense)
      });
    }
    
    // Check for specific risky licenses
    const riskyPackages: string[] = [];
    Object.entries(report).forEach(([packageName, info]) => {
      const licenses = Array.isArray(info.licenses) ? info.licenses : [info.licenses];
      if (licenses.some(license => 
        this.riskyLicenses.some(risky => license.includes(risky))
      )) {
        riskyPackages.push(packageName);
      }
    });
    
    if (riskyPackages.length > 0) {
      findings.push({
        type: 'issue',
        severity: 'critical',
        category: 'dependency',
        message: `🚨 ${riskyPackages.length} packages use high-risk licenses for commercial use`,
        file: path.join(directory, 'package.json'),
        ruleId: 'high-risk-license',
        documentation: this.formatRiskyDoc(riskyPackages, report)
      });
    }
    
    return findings;
  }
  
  /**
   * Format copyleft license documentation
   */
  private formatCopyleftDoc(packages: string[], report: LicenseReport): string {
    let doc = '## Copyleft License Warning\n\n';
    doc += 'These packages use strong copyleft licenses that may require you to:\n';
    doc += '- Open source your entire application\n';
    doc += '- License your code under the same terms\n';
    doc += '- Provide source code to users\n\n';
    
    doc += '### Affected Packages:\n';
    packages.forEach(pkg => {
      const info = report[pkg];
      const licenses = Array.isArray(info.licenses) ? info.licenses.join(', ') : info.licenses;
      doc += `- **${pkg}**: ${licenses}\n`;
    });
    
    doc += '\n### Recommendations:\n';
    doc += '1. Review your usage of these packages\n';
    doc += '2. Consider alternatives with permissive licenses\n';
    doc += '3. Consult legal counsel for commercial projects\n';
    doc += '4. Ensure compliance with license terms\n';
    
    return doc;
  }
  
  /**
   * Format unknown license documentation
   */
  private formatUnknownDoc(packages: string[], report: LicenseReport): string {
    let doc = '## Unknown or Unclear Licenses\n\n';
    doc += 'These packages have licenses that could not be clearly identified:\n\n';
    
    packages.forEach(pkg => {
      const info = report[pkg];
      const licenses = Array.isArray(info.licenses) ? info.licenses.join(', ') : info.licenses;
      doc += `- **${pkg}**: "${licenses}"\n`;
    });
    
    doc += '\n### Actions Required:\n';
    doc += '1. Check the package repository for license information\n';
    doc += '2. Contact package maintainers if unclear\n';
    doc += '3. Consider replacing with clearly licensed alternatives\n';
    doc += '4. Document any custom license agreements\n';
    
    return doc;
  }
  
  /**
   * Format proprietary license documentation
   */
  private formatProprietaryDoc(packages: string[], report: LicenseReport): string {
    let doc = '## Proprietary or Unlicensed Packages\n\n';
    doc += '⚠️ These packages appear to be proprietary or have no clear license:\n\n';
    
    packages.forEach(pkg => {
      const info = report[pkg];
      const licenses = Array.isArray(info.licenses) ? info.licenses.join(', ') : info.licenses;
      doc += `- **${pkg}**: ${licenses}\n`;
      if (info.repository) {
        doc += `  Repository: ${info.repository}\n`;
      }
    });
    
    doc += '\n### Critical Actions:\n';
    doc += '1. Verify you have proper licenses for these packages\n';
    doc += '2. Check for commercial licensing requirements\n';
    doc += '3. Remove unlicensed packages immediately\n';
    doc += '4. Document all proprietary licenses\n';
    
    return doc;
  }
  
  /**
   * Format weak copyleft documentation
   */
  private formatWeakCopyleftDoc(packages: string[], report: LicenseReport): string {
    let doc = '## Weak Copyleft Licenses\n\n';
    doc += 'These packages use weak copyleft licenses with specific requirements:\n\n';
    
    const grouped: Record<string, string[]> = {};
    packages.forEach(pkg => {
      const info = report[pkg];
      const licenses = Array.isArray(info.licenses) ? info.licenses : [info.licenses];
      licenses.forEach(license => {
        if (!grouped[license]) grouped[license] = [];
        grouped[license].push(pkg);
      });
    });
    
    Object.entries(grouped).forEach(([license, pkgs]) => {
      doc += `### ${license}:\n`;
      pkgs.forEach(pkg => doc += `- ${pkg}\n`);
      doc += '\n';
    });
    
    doc += '### Compliance Notes:\n';
    doc += '- LGPL: Must provide source for the library (not your app)\n';
    doc += '- MPL: Must provide source for modified files only\n';
    doc += '- EPL: Must provide source for modifications\n';
    
    return doc;
  }
  
  /**
   * Format license diversity documentation
   */
  private formatDiversityDoc(byLicense: Record<string, string[]>): string {
    let doc = '## License Diversity Report\n\n';
    doc += 'Multiple license types detected in dependencies:\n\n';
    
    // Sort by package count
    const sorted = Object.entries(byLicense)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 10); // Top 10
    
    doc += '| License | Package Count |\n';
    doc += '|---------|---------------|\n';
    sorted.forEach(([license, packages]) => {
      doc += `| ${license} | ${packages.length} |\n`;
    });
    
    doc += '\n### Recommendations:\n';
    doc += '- Standardize on compatible licenses where possible\n';
    doc += '- Document license compliance requirements\n';
    doc += '- Regular license audits recommended\n';
    
    return doc;
  }
  
  /**
   * Format risky license documentation
   */
  private formatRiskyDoc(packages: string[], report: LicenseReport): string {
    let doc = '## High-Risk Licenses for Commercial Use\n\n';
    doc += '🚨 **CRITICAL**: These licenses may be incompatible with commercial use:\n\n';
    
    packages.forEach(pkg => {
      const info = report[pkg];
      const licenses = Array.isArray(info.licenses) ? info.licenses.join(', ') : info.licenses;
      doc += `- **${pkg}**: ${licenses}\n`;
      
      // Add specific warnings
      if (licenses.includes('AGPL')) {
        doc += `  ⚠️ AGPL requires source disclosure for network use\n`;
      }
      if (licenses.includes('SSPL')) {
        doc += `  ⚠️ SSPL has strict service requirements\n`;
      }
      if (licenses.includes('Commons Clause')) {
        doc += `  ⚠️ Commons Clause restricts commercial use\n`;
      }
    });
    
    doc += '\n### Immediate Actions Required:\n';
    doc += '1. **Legal Review**: Consult with legal counsel immediately\n';
    doc += '2. **Risk Assessment**: Evaluate business impact\n';
    doc += '3. **Alternatives**: Find permissively licensed alternatives\n';
    doc += '4. **Compliance**: Ensure full compliance or remove packages\n';
    
    return doc;
  }
  
  /**
   * Calculate compliance score (0-10)
   */
  private calculateComplianceScore(findings: ToolFinding[], totalPackages: number): number {
    if (totalPackages === 0) return 10;
    
    let score = 10;
    
    // Deduct for critical issues
    const critical = findings.filter(f => f.severity === 'critical').length;
    score -= critical * 2;
    
    // Deduct for high severity
    const high = findings.filter(f => f.severity === 'high').length;
    score -= high * 1;
    
    // Deduct for medium severity
    const medium = findings.filter(f => f.severity === 'medium').length;
    score -= medium * 0.5;
    
    // Deduct for unknown licenses
    const unknown = findings.filter(f => f.ruleId === 'unknown-license').length;
    score -= unknown * 0.3;
    
    return Math.max(0, Math.round(score * 10) / 10);
  }
  
  /**
   * Get license distribution for metrics
   */
  private getLicenseDistribution(licenses: Map<string, number>): Record<string, number> {
    const distribution: Record<string, number> = {
      MIT: 0,
      'Apache-2.0': 0,
      ISC: 0,
      BSD: 0,
      GPL: 0,
      Other: 0
    };
    
    licenses.forEach((count, license) => {
      if (license.includes('MIT')) {
        distribution.MIT += count;
      } else if (license.includes('Apache')) {
        distribution['Apache-2.0'] += count;
      } else if (license.includes('ISC')) {
        distribution.ISC += count;
      } else if (license.includes('BSD')) {
        distribution.BSD += count;
      } else if (license.includes('GPL')) {
        distribution.GPL += count;
      } else {
        distribution.Other += count;
      }
    });
    
    return distribution;
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
        uniqueLicenses: 0,
        complianceScore: 10,
        licenseDistribution: 0,
        riskyLicenses: 0,
        unknownLicenses: 0
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
      description: 'License compliance checker for npm dependencies',
      author: 'CodeQual',
      homepage: 'https://www.npmjs.com/package/license-checker',
      documentationUrl: 'https://docs.codequal.com/tools/license-checker',
      supportedRoles: ['dependency', 'security'] as AgentRole[],
      supportedLanguages: ['javascript', 'typescript'],
      supportedFrameworks: ['node', 'react', 'vue', 'angular', 'express', 'next', 'nuxt'],
      tags: ['license', 'compliance', 'legal', 'dependencies', 'open-source', 'proprietary'],
      securityVerified: true,
      lastVerified: new Date('2025-06-11')
    };
  }
}

// Export singleton instance
export const licenseCheckerDirectAdapter = new LicenseCheckerDirectAdapter();
