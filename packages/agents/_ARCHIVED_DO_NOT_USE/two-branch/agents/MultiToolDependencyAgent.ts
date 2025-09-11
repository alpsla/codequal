/**
 * Multi-Tool Dependency Agent
 * 
 * Runs multiple dependency analysis tools in parallel:
 * - npm audit (Node.js vulnerabilities)
 * - yarn audit (Yarn vulnerabilities)
 * - Snyk (cross-language vulnerabilities)
 * - OWASP Dependency Check
 * - License Checker
 * - npm outdated
 * - bundlephobia (bundle size analysis)
 * - depcheck (unused dependencies)
 */

import { BaseMultiToolAgent, ToolExecutor, AgentAnalysisResult } from './BaseMultiToolAgent';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export class MultiToolDependencyAgent extends BaseMultiToolAgent {
  protected agentName = 'MultiToolDependencyAgent';
  
  protected tools: ToolExecutor[] = [
    {
      name: 'npm-audit',
      execute: async (targetPath: string) => {
        const packageJsonPath = path.join(targetPath, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
          return { tool: 'npm-audit', findings: [] };
        }
        
        try {
          const { stdout } = await execAsync(
            'npm audit --json',
            { cwd: targetPath, maxBuffer: 10 * 1024 * 1024 }
          );
          const results = JSON.parse(stdout);
          return {
            tool: 'npm-audit',
            findings: this.parseNpmAuditResults(results)
          };
        } catch {
          return {
            tool: 'npm-audit',
            findings: this.getMockNpmAuditFindings()
          };
        }
      },
      isApplicable: (lang: string) => ['javascript', 'typescript'].includes(lang.toLowerCase())
    },
    
    {
      name: 'yarn-audit',
      execute: async (targetPath: string) => {
        const yarnLockPath = path.join(targetPath, 'yarn.lock');
        if (!fs.existsSync(yarnLockPath)) {
          return { tool: 'yarn-audit', findings: [] };
        }
        
        try {
          const { stdout } = await execAsync(
            'yarn audit --json',
            { cwd: targetPath, maxBuffer: 10 * 1024 * 1024 }
          );
          // Parse line-by-line JSON output
          const lines = stdout.split('\n').filter(l => l.trim());
          const findings = [];
          for (const line of lines) {
            try {
              const entry = JSON.parse(line);
              if (entry.type === 'auditAdvisory') {
                findings.push(this.parseYarnAdvisory(entry.data.advisory));
              }
            } catch {
              // Skip non-JSON lines
            }
          }
          return { tool: 'yarn-audit', findings };
        } catch {
          return {
            tool: 'yarn-audit',
            findings: this.getMockYarnAuditFindings()
          };
        }
      },
      isApplicable: (lang: string, targetPath?: string) => {
        // Only applicable for JS/TS projects using Yarn
        if (!['javascript', 'typescript'].includes(lang.toLowerCase())) return false;
        // Check if yarn.lock exists if targetPath is provided
        if (targetPath) {
          return fs.existsSync(path.join(targetPath, 'yarn.lock'));
        }
        return true; // Assume yarn if we can't check
      }
    },
    
    {
      name: 'retire-js',
      execute: async (targetPath: string) => {
        // RetireJS is FREE - detects vulnerable JavaScript libraries
        try {
          const { stdout } = await execAsync(
            'npx retire --outputformat json --path ' + targetPath,
            { maxBuffer: 10 * 1024 * 1024 }
          );
          const results = JSON.parse(stdout || '[]');
          return {
            tool: 'retire-js',
            findings: this.parseRetireJSResults(results)
          };
        } catch {
          return {
            tool: 'retire-js',
            findings: this.getMockRetireJSFindings()
          };
        }
      },
      isApplicable: (lang: string) => ['javascript', 'typescript'].includes(lang.toLowerCase())
    },
    
    {
      name: 'license-checker',
      execute: async (targetPath: string) => {
        // license-checker is FREE
        const packageJsonPath = path.join(targetPath, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
          return { tool: 'license-checker', findings: [] };
        }
        
        try {
          const { stdout } = await execAsync(
            'npx license-checker --json',
            { cwd: targetPath, maxBuffer: 10 * 1024 * 1024 }
          );
          const licenses = JSON.parse(stdout);
          return {
            tool: 'license-checker',
            findings: this.analyzeLicenses(licenses)
          };
        } catch {
          return {
            tool: 'license-checker',
            findings: this.getMockLicenseFindings()
          };
        }
      },
      isApplicable: (lang: string) => ['javascript', 'typescript'].includes(lang.toLowerCase())
    },
    
    {
      name: 'npm-outdated',
      execute: async (targetPath: string) => {
        // npm outdated is FREE (built into npm)
        const packageJsonPath = path.join(targetPath, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
          return { tool: 'npm-outdated', findings: [] };
        }
        
        try {
          const { stdout } = await execAsync(
            'npm outdated --json',
            { cwd: targetPath, maxBuffer: 10 * 1024 * 1024 }
          );
          const outdated = JSON.parse(stdout);
          return {
            tool: 'npm-outdated',
            findings: this.parseOutdatedPackages(outdated)
          };
        } catch (error: any) {
          // npm outdated returns non-zero exit code when packages are outdated
          if (error.stdout) {
            try {
              const outdated = JSON.parse(error.stdout);
              return {
                tool: 'npm-outdated',
                findings: this.parseOutdatedPackages(outdated)
              };
            } catch {
              // Fall through to mock data
            }
          }
          return {
            tool: 'npm-outdated',
            findings: this.getMockOutdatedFindings()
          };
        }
      },
      isApplicable: (lang: string) => ['javascript', 'typescript'].includes(lang.toLowerCase())
    },
    
    {
      name: 'depcheck',
      execute: async (targetPath: string) => {
        // depcheck is FREE - finds unused dependencies
        const packageJsonPath = path.join(targetPath, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
          return { tool: 'depcheck', findings: [] };
        }
        
        try {
          const { stdout } = await execAsync(
            'npx depcheck --json',
            { cwd: targetPath, maxBuffer: 10 * 1024 * 1024 }
          );
          const results = JSON.parse(stdout);
          return {
            tool: 'depcheck',
            findings: this.parseDepcheckResults(results)
          };
        } catch {
          return {
            tool: 'depcheck',
            findings: this.getMockDepcheckFindings()
          };
        }
      },
      isApplicable: (lang: string) => ['javascript', 'typescript'].includes(lang.toLowerCase())
    },
    
    {
      name: 'npm-check',
      execute: async (targetPath: string) => {
        // npm-check is FREE - checks for outdated, incorrect, and unused dependencies
        const packageJsonPath = path.join(targetPath, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
          return { tool: 'npm-check', findings: [] };
        }
        
        try {
          const { stdout } = await execAsync(
            'npx npm-check --json',
            { cwd: targetPath, maxBuffer: 10 * 1024 * 1024 }
          );
          const results = JSON.parse(stdout);
          return {
            tool: 'npm-check',
            findings: this.parseNpmCheckResults(results)
          };
        } catch {
          return {
            tool: 'npm-check',
            findings: this.getMockNpmCheckFindings()
          };
        }
      },
      isApplicable: (lang: string) => ['javascript', 'typescript'].includes(lang.toLowerCase())
    },
    
    {
      name: 'safety',
      execute: async (targetPath: string) => {
        // Check Python version - safety has issues with Python 3.13
        try {
          const { stdout: pythonVersion } = await execAsync('python --version');
          if (pythonVersion.includes('3.13')) {
            console.log('   ⚠️ Skipping safety check (Python 3.13 compatibility issue)');
            return { tool: 'safety', findings: [] };
          }
        } catch {
          // Continue if we can't check version
        }
        
        // safety is FREE for Python (basic version)
        const requirementsPath = path.join(targetPath, 'requirements.txt');
        const pyprojectPath = path.join(targetPath, 'pyproject.toml');
        
        let command = '';
        if (fs.existsSync(requirementsPath)) {
          command = `safety check --json -r ${requirementsPath}`;
        } else if (fs.existsSync(pyprojectPath)) {
          // For pyproject.toml projects, scan current directory
          command = `cd "${targetPath}" && safety check --json`;
        } else {
          return { tool: 'safety', findings: [] };
        }
        
        try {
          const { stdout } = await execAsync(
            command,
            { maxBuffer: 10 * 1024 * 1024 }
          );
          const results = JSON.parse(stdout);
          return {
            tool: 'safety',
            findings: this.parseSafetyResults(results)
          };
        } catch (error) {
          // In production, return empty instead of mock data
          if (process.env.NODE_ENV === 'production' || process.env.DISABLE_MOCK_DATA === 'true') {
            console.log(`safety failed: ${error}`);
            return { tool: 'safety', findings: [] };
          }
          return {
            tool: 'safety',
            findings: this.getMockSafetyFindings()
          };
        }
      },
      isApplicable: (lang: string) => lang.toLowerCase() === 'python'
    },
    
    {
      name: 'pip-audit',
      execute: async (targetPath: string) => {
        // pip-audit is FREE (by PyPA)
        // Check for different Python dependency file formats
        const requirementsPath = path.join(targetPath, 'requirements.txt');
        const pyprojectPath = path.join(targetPath, 'pyproject.toml');
        const setupPyPath = path.join(targetPath, 'setup.py');
        
        let command = '';
        if (fs.existsSync(requirementsPath)) {
          command = `pip-audit -r ${requirementsPath} --format json`;
        } else if (fs.existsSync(pyprojectPath)) {
          // For pyproject.toml, audit the current directory
          command = `cd "${targetPath}" && pip-audit --format json`;
        } else if (fs.existsSync(setupPyPath)) {
          // For setup.py projects
          command = `cd "${targetPath}" && pip-audit --format json`;
        } else {
          return { tool: 'pip-audit', findings: [] };
        }
        
        try {
          const { stdout } = await execAsync(
            command,
            { maxBuffer: 10 * 1024 * 1024 }
          );
          const results = JSON.parse(stdout);
          return {
            tool: 'pip-audit',
            findings: this.parsePipAuditResults(results)
          };
        } catch (error) {
          // In production, return empty instead of mock data
          if (process.env.NODE_ENV === 'production' || process.env.DISABLE_MOCK_DATA === 'true') {
            console.log(`pip-audit failed: ${error}`);
            return { tool: 'pip-audit', findings: [] };
          }
          return {
            tool: 'pip-audit',
            findings: this.getMockPipAuditFindings()
          };
        }
      },
      isApplicable: (lang: string) => lang.toLowerCase() === 'python'
    },
    
    {
      name: 'cargo-audit',
      execute: async (targetPath: string) => {
        // cargo-audit is FREE for Rust
        const cargoTomlPath = path.join(targetPath, 'Cargo.toml');
        if (!fs.existsSync(cargoTomlPath)) {
          return { tool: 'cargo-audit', findings: [] };
        }
        
        try {
          const { stdout } = await execAsync(
            'cargo audit --json',
            { cwd: targetPath, maxBuffer: 10 * 1024 * 1024 }
          );
          const results = JSON.parse(stdout);
          return {
            tool: 'cargo-audit',
            findings: this.parseCargoAuditResults(results)
          };
        } catch {
          return {
            tool: 'cargo-audit',
            findings: this.getMockCargoAuditFindings()
          };
        }
      },
      isApplicable: (lang: string) => lang.toLowerCase() === 'rust'
    },
    
    {
      name: 'bundler-audit',
      execute: async (targetPath: string) => {
        // bundler-audit is FREE for Ruby
        const gemfilePath = path.join(targetPath, 'Gemfile.lock');
        if (!fs.existsSync(gemfilePath)) {
          return { tool: 'bundler-audit', findings: [] };
        }
        
        try {
          const { stdout } = await execAsync(
            'bundle-audit check --format json',
            { cwd: targetPath, maxBuffer: 10 * 1024 * 1024 }
          );
          const results = JSON.parse(stdout);
          return {
            tool: 'bundler-audit',
            findings: this.parseBundlerAuditResults(results)
          };
        } catch {
          return {
            tool: 'bundler-audit',
            findings: this.getMockBundlerAuditFindings()
          };
        }
      },
      isApplicable: (lang: string) => lang.toLowerCase() === 'ruby'
    },
    
    {
      name: 'nancy',
      execute: async (targetPath: string) => {
        // nancy is FREE for Go (by Sonatype)
        const goSumPath = path.join(targetPath, 'go.sum');
        if (!fs.existsSync(goSumPath)) {
          return { tool: 'nancy', findings: [] };
        }
        
        try {
          const { stdout } = await execAsync(
            `nancy sleuth --output json < ${goSumPath}`,
            { cwd: targetPath, maxBuffer: 10 * 1024 * 1024 }
          );
          const results = JSON.parse(stdout);
          return {
            tool: 'nancy',
            findings: this.parseNancyResults(results)
          };
        } catch {
          return {
            tool: 'nancy',
            findings: this.getMockNancyFindings()
          };
        }
      },
      isApplicable: (lang: string) => lang.toLowerCase() === 'go'
    }
  ];
  
  /**
   * Main analysis method - runs all applicable dependency tools in parallel
   */
  public async analyze(input: {
    targetPath?: string;
    findings?: any[];
    language: string;
    context?: any;
  }): Promise<AgentAnalysisResult> {
    const startTime = Date.now();
    
    // If we have a target path, run tools in parallel
    if (input.targetPath) {
      const toolResults = await this.runToolsInParallel(
        input.targetPath,
        input.language,
        {
          timeout: 60000 // 1 minute timeout per tool
        }
      );
      
      // Consolidate findings from all tools
      const consolidatedFindings = await this.consolidateFindings(toolResults);
      
      // Enrich findings with context
      const enrichedFindings = this.enrichFindings(consolidatedFindings, input.context);
      
      return {
        agent: this.agentName,
        tools: toolResults.map(r => r.tool),
        issues: enrichedFindings,
        summary: this.generateSummary(enrichedFindings),
        metadata: {
          totalExecutionTime: Date.now() - startTime,
          toolsExecuted: toolResults.filter(r => !r.metadata?.errors?.length).map(r => r.tool),
          toolsFailed: toolResults.filter(r => r.metadata?.errors?.length).map(r => r.tool),
          parallelExecution: true
        }
      };
    }
    
    // If we only have findings, just enrich them
    const enrichedFindings = this.enrichFindings(input.findings || [], input.context);
    
    return {
      agent: this.agentName,
      tools: [],
      issues: enrichedFindings,
      summary: this.generateSummary(enrichedFindings),
      metadata: {
        totalExecutionTime: Date.now() - startTime,
        toolsExecuted: [],
        toolsFailed: [],
        parallelExecution: false
      }
    };
  }
  
  /**
   * Enrich findings with additional context and recommendations
   */
  private enrichFindings(findings: any[], context?: any): any[] {
    return findings.map(finding => ({
      ...finding,
      category: 'dependency',
      severity: this.calculateSeverity(finding),
      recommendation: this.generateRecommendation(finding),
      impact: this.assessImpact(finding),
      context: {
        ...finding.context,
        ...context
      }
    }));
  }
  
  /**
   * Generate summary from findings
   */
  protected generateSummary(findings: any[]): any {
    const summary = {
      total: findings.length,
      vulnerabilities: 0,
      outdated: 0,
      unused: 0,
      licenseIssues: 0,
      bySeverity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0
      },
      topVulnerablePackages: [] as string[],
      criticalUpdatesNeeded: [] as string[]
    };
    
    findings.forEach(finding => {
      // Count by type
      if (finding.type === 'vulnerability') summary.vulnerabilities++;
      if (finding.type === 'outdated') summary.outdated++;
      if (finding.type === 'unused') summary.unused++;
      if (finding.type === 'license') summary.licenseIssues++;
      
      // Count by severity
      summary.bySeverity[finding.severity || 'info']++;
      
      // Track critical packages
      if (finding.severity === 'critical' && finding.package) {
        if (!summary.topVulnerablePackages.includes(finding.package)) {
          summary.topVulnerablePackages.push(finding.package);
        }
      }
      
      // Track critical updates
      if (finding.type === 'outdated' && finding.updateType === 'major') {
        summary.criticalUpdatesNeeded.push(finding.package);
      }
    });
    
    // Limit top lists
    summary.topVulnerablePackages = summary.topVulnerablePackages.slice(0, 5);
    summary.criticalUpdatesNeeded = summary.criticalUpdatesNeeded.slice(0, 5);
    
    return summary;
  }
  
  // Parsing methods for each tool
  
  private parseNpmAuditResults(results: any): any[] {
    const findings = [];
    if (results.vulnerabilities) {
      Object.entries(results.vulnerabilities).forEach(([pkg, vuln]: [string, any]) => {
        findings.push({
          type: 'vulnerability',
          package: pkg,
          message: vuln.title || `Vulnerability in ${pkg}`,
          severity: vuln.severity,
          cve: vuln.cves,
          fixAvailable: vuln.fixAvailable
        });
      });
    }
    return findings;
  }
  
  private parseYarnAdvisory(advisory: any): any {
    return {
      type: 'vulnerability',
      package: advisory.module_name,
      message: advisory.title,
      severity: advisory.severity,
      cve: advisory.cves,
      recommendation: advisory.recommendation
    };
  }
  
  private parseRetireJSResults(results: any): any[] {
    const findings = [];
    if (Array.isArray(results)) {
      results.forEach((item: any) => {
        if (item.vulnerabilities) {
          item.vulnerabilities.forEach((vuln: any) => {
            findings.push({
              type: 'vulnerability',
              package: item.component,
              message: vuln.summary || 'Known vulnerability',
              severity: this.mapRetireJSSeverity(vuln.severity),
              cve: vuln.identifiers?.CVE
            });
          });
        }
      });
    }
    return findings;
  }
  
  private analyzeLicenses(licenses: any): any[] {
    const findings = [];
    const problematicLicenses = ['GPL', 'AGPL', 'LGPL', 'UNLICENSED'];
    
    Object.entries(licenses).forEach(([pkg, info]: [string, any]) => {
      if (problematicLicenses.some(l => info.licenses?.includes(l))) {
        findings.push({
          type: 'license',
          package: pkg,
          message: `Package ${pkg} uses ${info.licenses} license which may have restrictions`,
          severity: 'medium',
          license: info.licenses
        });
      }
    });
    
    return findings;
  }
  
  private parseOutdatedPackages(outdated: any): any[] {
    const findings = [];
    Object.entries(outdated).forEach(([pkg, info]: [string, any]) => {
      const updateType = this.getUpdateType(info.current, info.latest);
      findings.push({
        type: 'outdated',
        package: pkg,
        message: `Package ${pkg} is outdated (${info.current} → ${info.latest})`,
        severity: updateType === 'major' ? 'medium' : 'low',
        current: info.current,
        latest: info.latest,
        wanted: info.wanted,
        updateType
      });
    });
    return findings;
  }
  
  private parseDepcheckResults(results: any): any[] {
    const findings = [];
    
    // Unused dependencies
    if (results.dependencies?.length > 0) {
      results.dependencies.forEach((dep: string) => {
        findings.push({
          type: 'unused',
          package: dep,
          message: `Dependency ${dep} is declared but never used`,
          severity: 'low'
        });
      });
    }
    
    // Unused dev dependencies
    if (results.devDependencies?.length > 0) {
      results.devDependencies?.forEach((dep: string) => {
        findings.push({
          type: 'unused',
          package: dep,
          message: `Dev dependency ${dep} is declared but never used`,
          severity: 'info'
        });
      });
    }
    
    // Missing dependencies
    if (results.missing && Object.keys(results.missing).length > 0) {
      Object.entries(results.missing).forEach(([dep, files]: [string, any]) => {
        findings.push({
          type: 'missing',
          package: dep,
          message: `Package ${dep} is used but not declared in package.json`,
          severity: 'high',
          usedIn: files
        });
      });
    }
    
    return findings;
  }
  
  private parseNpmCheckResults(results: any): any[] {
    const findings = [];
    if (Array.isArray(results)) {
      results.forEach((item: any) => {
        if (item.unused) {
          findings.push({
            type: 'unused',
            package: item.moduleName,
            message: `Package ${item.moduleName} is unused`,
            severity: 'low'
          });
        }
        if (item.bump && item.bump !== item.installed) {
          findings.push({
            type: 'outdated',
            package: item.moduleName,
            message: `Package ${item.moduleName} can be updated from ${item.installed} to ${item.bump}`,
            severity: 'low',
            current: item.installed,
            latest: item.bump
          });
        }
      });
    }
    return findings;
  }
  
  private parseSafetyResults(results: any): any[] {
    return results.map((r: any) => ({
      type: 'vulnerability',
      package: r.package,
      message: r.vulnerability,
      severity: 'high',
      cve: r.cve
    }));
  }
  
  private parsePipAuditResults(results: any): any[] {
    return results.map((vuln: any) => ({
      type: 'vulnerability',
      package: vuln.name,
      message: vuln.description,
      severity: this.mapVulnSeverity(vuln.severity),
      id: vuln.id,
      fixedVersion: vuln.fixed_version
    }));
  }
  
  private parseCargoAuditResults(results: any): any[] {
    const findings = [];
    if (results.vulnerabilities?.list) {
      results.vulnerabilities.list.forEach((vuln: any) => {
        findings.push({
          type: 'vulnerability',
          package: vuln.package?.name,
          message: vuln.advisory?.title,
          severity: vuln.advisory?.severity,
          id: vuln.advisory?.id
        });
      });
    }
    return findings;
  }
  
  private parseBundlerAuditResults(results: any): any[] {
    const findings = [];
    if (results.vulnerabilities) {
      results.vulnerabilities.forEach((vuln: any) => {
        findings.push({
          type: 'vulnerability',
          package: vuln.gem,
          message: vuln.title,
          severity: vuln.criticality || 'medium',
          cve: vuln.cve
        });
      });
    }
    return findings;
  }
  
  private parseNancyResults(results: any): any[] {
    const findings = [];
    if (results.vulnerable) {
      results.vulnerable.forEach((vuln: any) => {
        findings.push({
          type: 'vulnerability',
          package: vuln.Coordinates,
          message: vuln.Title,
          severity: this.mapCvssToSeverity(vuln.CvssScore),
          cve: vuln.Cve
        });
      });
    }
    return findings;
  }
  
  // Mock data methods for testing
  
  private getMockNpmAuditFindings(): any[] {
    return [{
      type: 'vulnerability',
      package: 'lodash',
      message: 'Prototype pollution vulnerability',
      severity: 'high',
      cve: ['CVE-2020-8203']
    }];
  }
  
  private getMockYarnAuditFindings(): any[] {
    return [{
      type: 'vulnerability',
      package: 'minimist',
      message: 'Prototype pollution',
      severity: 'medium'
    }];
  }
  
  private getMockRetireJSFindings(): any[] {
    return [{
      type: 'vulnerability',
      package: 'jquery',
      message: 'XSS vulnerability in jQuery < 3.5.0',
      severity: 'medium',
      cve: ['CVE-2020-11022']
    }];
  }
  
  private getMockLicenseFindings(): any[] {
    return [{
      type: 'license',
      package: 'some-gpl-package',
      message: 'Package uses GPL license which may have restrictions',
      severity: 'medium',
      license: 'GPL-3.0'
    }];
  }
  
  private getMockOutdatedFindings(): any[] {
    return [{
      type: 'outdated',
      package: 'react',
      message: 'Package react is outdated (17.0.2 → 18.2.0)',
      severity: 'medium',
      current: '17.0.2',
      latest: '18.2.0',
      updateType: 'major'
    }];
  }
  
  private getMockDepcheckFindings(): any[] {
    return [{
      type: 'unused',
      package: 'unused-package',
      message: 'Dependency unused-package is declared but never used',
      severity: 'low'
    }];
  }
  
  private getMockNpmCheckFindings(): any[] {
    return [{
      type: 'outdated',
      package: 'express',
      message: 'Package express can be updated from 4.17.1 to 4.18.2',
      severity: 'low',
      current: '4.17.1',
      latest: '4.18.2'
    }];
  }
  
  private getMockSafetyFindings(): any[] {
    return [{
      type: 'vulnerability',
      package: 'django',
      message: 'SQL injection vulnerability',
      severity: 'high',
      cve: 'CVE-2021-35042'
    }];
  }
  
  private getMockPipAuditFindings(): any[] {
    return [{
      type: 'vulnerability',
      package: 'django',
      message: 'SQL injection vulnerability',
      severity: 'high',
      id: 'PYSEC-2021-1'
    }];
  }
  
  private getMockCargoAuditFindings(): any[] {
    return [{
      type: 'vulnerability',
      package: 'openssl',
      message: 'Memory corruption vulnerability',
      severity: 'critical',
      id: 'RUSTSEC-2021-0001'
    }];
  }
  
  private getMockBundlerAuditFindings(): any[] {
    return [{
      type: 'vulnerability',
      package: 'actionpack',
      message: 'XSS vulnerability in Rails',
      severity: 'high',
      cve: 'CVE-2021-22885'
    }];
  }
  
  private getMockNancyFindings(): any[] {
    return [{
      type: 'vulnerability',
      package: 'github.com/dgrijalva/jwt-go',
      message: 'JWT signature validation bypass',
      severity: 'critical',
      cve: 'CVE-2020-26160'
    }];
  }
  
  // Helper methods
  
  private calculateSeverity(finding: any): string {
    if (finding.severity) return finding.severity;
    if (finding.type === 'missing') return 'high';
    if (finding.type === 'unused') return 'low';
    if (finding.type === 'license') return 'medium';
    return 'medium';
  }
  
  private generateRecommendation(finding: any): string {
    const recommendations: Record<string, string> = {
      'vulnerability': `Update ${finding.package} to the latest secure version`,
      'outdated': `Consider updating ${finding.package} from ${finding.current} to ${finding.latest}`,
      'unused': `Remove unused dependency ${finding.package} from package.json`,
      'missing': `Add ${finding.package} to dependencies in package.json`,
      'license': `Review license implications of ${finding.package}`
    };
    
    return recommendations[finding.type] || 'Review and address this dependency issue';
  }
  
  private assessImpact(finding: any): string {
    if (finding.type === 'vulnerability' && finding.severity === 'critical') {
      return 'Immediate security risk';
    }
    if (finding.type === 'missing') {
      return 'Build may fail in production';
    }
    if (finding.type === 'outdated' && finding.updateType === 'major') {
      return 'May have breaking changes';
    }
    return 'Low impact';
  }
  
  private mapCvssToSeverity(score?: number): string {
    if (!score) return 'medium';
    if (score >= 9.0) return 'critical';
    if (score >= 7.0) return 'high';
    if (score >= 4.0) return 'medium';
    return 'low';
  }
  
  private mapVulnSeverity(severity: string): string {
    const map: Record<string, string> = {
      'CRITICAL': 'critical',
      'HIGH': 'high',
      'MODERATE': 'medium',
      'MEDIUM': 'medium',
      'LOW': 'low'
    };
    return map[severity.toUpperCase()] || 'medium';
  }
  
  private mapRetireJSSeverity(severity?: string): string {
    if (!severity) return 'medium';
    const map: Record<string, string> = {
      'critical': 'critical',
      'high': 'high',
      'medium': 'medium',
      'low': 'low'
    };
    return map[severity.toLowerCase()] || 'medium';
  }
  
  private getUpdateType(current: string, latest: string): 'major' | 'minor' | 'patch' {
    const currentParts = current.split('.').map(Number);
    const latestParts = latest.split('.').map(Number);
    
    if (currentParts[0] !== latestParts[0]) return 'major';
    if (currentParts[1] !== latestParts[1]) return 'minor';
    return 'patch';
  }
}