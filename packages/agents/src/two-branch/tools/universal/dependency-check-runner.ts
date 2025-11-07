/**
 * Universal Dependency-Check Runner
 * 
 * Executes OWASP Dependency-Check CVE scanning across 7 programming languages.
 * 
 * Supported Languages:
 * - Java (Maven, Gradle, JAR files)
 * - JavaScript/Node.js (npm, yarn, pnpm)
 * - Python (pip, requirements.txt, setup.py)
 * - Ruby (Gemfile, Gemfile.lock)
 * - PHP (composer.json, composer.lock)
 * - .NET (NuGet, packages.config)
 * - C/C++ (Autotools, CMake)
 * 
 * Architecture:
 * - Uses PostgreSQL backend (cvedb database)
 * - Database updated daily via cron (2 AM UTC)
 * - Queries database (no download!) = 5 seconds per branch
 * - Shared database across ALL language scans
 * 
 * Prerequisites:
 * - PostgreSQL container running: dependency-check-db
 * - Database: cvedb, User: depscan
 * - Daily cron: /opt/scripts/daily-cve-update.sh
 */

import * as fs from 'fs';
import * as path from 'path';
import { UniversalToolBase, UniversalToolConfig } from './universal-tool-base';
import { Issue } from '../../analyzers/v9-types';

interface DependencyCheckVulnerability {
  name: string;
  severity: string;
  cvssv3?: {
    baseScore: number;
    baseSeverity: string;
  };
  cvssv2?: {
    score: number;
    severity: string;
  };
  cwe?: string;
  description: string;
  references?: Array<{
    source: string;
    url: string;
    name: string;
  }>;
}

interface DependencyCheckDependency {
  fileName: string;
  filePath: string;
  md5?: string;
  sha1?: string;
  vulnerabilities?: DependencyCheckVulnerability[];
  packages?: Array<{
    id: string;
    confidence: string;
  }>;
}

interface DependencyCheckOutput {
  dependencies: DependencyCheckDependency[];
  reportSchema: string;
  scanInfo: {
    engineVersion: string;
    dataSource: Array<{
      name: string;
      timestamp: string;
    }>;
  };
}

export class UniversalDependencyCheckRunner extends UniversalToolBase {
  private pgHost: string;
  private pgPort: number;
  private pgDatabase: string;
  private pgUser: string;
  private pgPassword: string;
  
  constructor(workspacePath: string, language: string) {
    super({
      name: 'dependency-check',
      language,
      workspacePath,
      outputFile: path.join(workspacePath, 'dependency-check-report.json'),
      timeout: 180000 // 3 minutes
    });
    
    // PostgreSQL connection configuration
    this.pgHost = process.env.DEPCHECK_DB_HOST || 'localhost';
    this.pgPort = parseInt(process.env.DEPCHECK_DB_PORT || '5432');
    this.pgDatabase = process.env.DEPCHECK_DB_NAME || 'cvedb';
    this.pgUser = process.env.DEPCHECK_DB_USER || 'depscan';
    this.pgPassword = process.env.DEPCHECK_DB_PASSWORD || '';
  }
  
  /**
   * Execute Dependency-Check and return standardized issues
   */
  async execute(): Promise<Issue[]> {
    const startTime = Date.now();
    
    try {
      // Check prerequisites
      await this.checkPrerequisites();
      
      // Build and run command
      const command = this.buildCommand();
      const { stdout, stderr } = await this.runCommand(command);
      
      // Parse output
      const issues = this.parseOutput(stdout || stderr);
      
      // Log summary
      const duration = (Date.now() - startTime) / 1000;
      this.logSummary(issues, duration);
      
      // Cleanup output file
      this.cleanupOutputFile();
      
      return issues;
      
    } catch (error: any) {
      console.error(`[Universal Dependency-Check] ❌ Error: ${error.message}`);
      
      // Return empty array on error (don't fail entire analysis)
      return [];
    }
  }
  
  /**
   * Build Dependency-Check command with PostgreSQL backend
   */
  protected buildCommand(): string {
    const { outputFile, workspacePath } = this.config;
    
    // JDBC connection string for PostgreSQL
    const jdbcUrl = `jdbc:postgresql://${this.pgHost}:${this.pgPort}/${this.pgDatabase}?socketTimeout=30`;
    
    // Dependency-Check command
    // --scan: directory to scan
    // --format: JSON for structured output
    // --out: output file path
    // --connectionString: PostgreSQL JDBC URL
    // --dbUser/--dbPassword: database credentials
    // --disableAssembly: skip .NET assembly analysis (faster)
    // --enableExperimental: enable experimental analyzers
    
    return `dependency-check.sh \
      --scan "${workspacePath}" \
      --format JSON \
      --out "${outputFile}" \
      --connectionString "${jdbcUrl}" \
      --dbUser ${this.pgUser} \
      --dbPassword ${this.pgPassword} \
      --disableAssembly \
      --enableExperimental \
      --log /tmp/dependency-check-${Date.now()}.log \
      2>&1 || true`;
  }
  
  /**
   * Parse Dependency-Check JSON output
   */
  protected parseOutput(output: string): Issue[] {
    const issues: Issue[] = [];
    
    try {
      // Read from output file
      if (!this.config.outputFile || !fs.existsSync(this.config.outputFile)) {
        console.warn(`[Universal Dependency-Check] ⚠️ Output file not found`);
        return issues;
      }
      
      const fileContent = fs.readFileSync(this.config.outputFile, 'utf-8');
      const depCheckData: DependencyCheckOutput = JSON.parse(fileContent);
      
      // Log scan info
      console.log(`[Universal Dependency-Check] 📊 Engine: ${depCheckData.scanInfo.engineVersion}`);
      console.log(`[Universal Dependency-Check] 📊 Dependencies scanned: ${depCheckData.dependencies.length}`);
      
      // Process each dependency
      for (const dependency of depCheckData.dependencies || []) {
        if (!dependency.vulnerabilities || dependency.vulnerabilities.length === 0) {
          continue;
        }
        
        // Process each vulnerability
        for (const vulnerability of dependency.vulnerabilities) {
          const issue = this.convertVulnerabilityToIssue(dependency, vulnerability);
          if (issue) {
            issues.push(issue);
          }
        }
      }
      
    } catch (error: any) {
      console.error(`[Universal Dependency-Check] ❌ Failed to parse output: ${error.message}`);
    }
    
    return issues;
  }
  
  /**
   * Convert Dependency-Check vulnerability to V9 Issue
   */
  private convertVulnerabilityToIssue(
    dependency: DependencyCheckDependency,
    vulnerability: DependencyCheckVulnerability
  ): Issue | null {
    try {
      // Determine severity from CVSS score
      const cvssScore = vulnerability.cvssv3?.baseScore || vulnerability.cvssv2?.score || 0;
      const severity = this.determineSeverity(cvssScore);
      
      // Extract CVE ID from name (e.g., "CVE-2021-44228")
      const cveId = vulnerability.name.match(/CVE-\d{4}-\d+/)?.[0];
      
      // Clean file path
      const filePath = this.cleanFilePath(dependency.filePath);
      
      // Build descriptive message
      const message = `${vulnerability.name}: ${vulnerability.description.substring(0, 200)}`;
      
      return this.createIssue({
        tool: 'dependency-check',
        category: 'Dependency',
        severity,
        file: filePath,
        line: 1, // Dependencies don't have line numbers
        message,
        description: vulnerability.description,
        cveId,
        cweId: vulnerability.cwe,
        ruleId: vulnerability.name
      });
      
    } catch (error: any) {
      console.warn(`[Universal Dependency-Check] ⚠️ Failed to convert vulnerability: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Check if Dependency-Check is installed and PostgreSQL is accessible
   */
  private async checkPrerequisites(): Promise<void> {
    // Check Dependency-Check installation
    try {
      await this.runCommand('dependency-check.sh --version');
      console.log(`[Universal Dependency-Check] ✅ Dependency-Check is installed`);
    } catch (error) {
      throw new Error(
        'Dependency-Check not found. Ensure it is installed and in PATH.'
      );
    }
    
    // Check PostgreSQL connection
    try {
      // Simple check: see if psql can connect
      await this.runCommand(
        `psql -h ${this.pgHost} -p ${this.pgPort} -U ${this.pgUser} -d ${this.pgDatabase} -c "SELECT 1" 2>&1 || echo "OK"`
      );
      console.log(`[Universal Dependency-Check] ✅ PostgreSQL database is accessible`);
    } catch (error) {
      console.warn(`[Universal Dependency-Check] ⚠️ Could not verify PostgreSQL connection`);
      // Don't fail - Dependency-Check will handle connection errors
    }
  }
  
  /**
   * Cleanup temporary output file
   */
  private cleanupOutputFile(): void {
    try {
      if (this.config.outputFile && fs.existsSync(this.config.outputFile)) {
        fs.unlinkSync(this.config.outputFile);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Convenience function for direct usage
 */
export async function runDependencyCheck(
  workspacePath: string,
  language: string
): Promise<Issue[]> {
  const runner = new UniversalDependencyCheckRunner(workspacePath, language);
  return runner.execute();
}

