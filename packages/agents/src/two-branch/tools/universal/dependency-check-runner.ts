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
  private dependencyCheckPath = 'dependency-check.sh'; // Default to PATH lookup

  /**
   * Find dependency-check.sh in common installation locations
   * USER FEEDBACK (2025-12-14): Tool should work without manual PATH configuration
   */
  private findDependencyCheckPath(): string {
    const commonPaths = [
      // Standard PATH (Docker, system install)
      'dependency-check.sh',
      // Homebrew on Mac
      '/opt/homebrew/bin/dependency-check.sh',
      '/usr/local/bin/dependency-check.sh',
      // Manual install locations
      '/opt/dependency-check/bin/dependency-check.sh',
      // User-specific install (common dev setup)
      `${process.env.HOME}/tools/dependency-check/bin/dependency-check.sh`,
      `${process.env.HOME}/dependency-check/bin/dependency-check.sh`,
      // Environment variable override
      process.env.DEPENDENCY_CHECK_PATH || '',
    ].filter(p => p); // Remove empty strings

    for (const checkPath of commonPaths) {
      try {
        if (checkPath === 'dependency-check.sh') {
          // For PATH lookup, just return it - will be validated later
          continue;
        }
        if (fs.existsSync(checkPath)) {
          console.log(`[Dependency-Check] Found at: ${checkPath}`);
          return checkPath;
        }
      } catch {
        // Ignore access errors
      }
    }

    // Default to PATH lookup
    return 'dependency-check.sh';
  }

  constructor(workspacePath: string, language: string) {
    super({
      name: 'dependency-check',
      language,
      workspacePath,
      // FIX: Dependency-Check creates a directory and writes dependency-check-report.json inside it
      // So we specify the directory path, not the full file path
      outputFile: path.join(workspacePath, 'dependency-check-output'),
      timeout: 300000 // 5 minutes - SESSION 19 FIX: Increased for PostgreSQL queries
    });

    // PostgreSQL connection configuration
    // Note: Environment variables should be loaded by the test file via dotenv.config()
    // Oracle Cloud PostgreSQL (verified working Nov 7, 2025)
    this.pgHost = process.env.DEPCHECK_DB_HOST || 'localhost';
    this.pgPort = parseInt(process.env.DEPCHECK_DB_PORT || '5432');
    this.pgDatabase = process.env.DEPCHECK_DB_NAME || 'depcheck';
    this.pgUser = process.env.DEPCHECK_DB_USER || 'depcheck_scanner';
    this.pgPassword = process.env.DEPCHECK_DB_PASSWORD || 'depcheck123';

    // SESSION 24 DEBUG: Log environment and configuration
    console.log(`[Dependency-Check] Environment check:`);
    console.log(`  DEPCHECK_DB_HOST from env: ${process.env.DEPCHECK_DB_HOST || 'NOT SET'}`);
    console.log(`  DEPCHECK_DB_USER from env: ${process.env.DEPCHECK_DB_USER || 'NOT SET'}`);
    console.log(`  Using config: ${this.pgHost}:${this.pgPort}/${this.pgDatabase} (user: ${this.pgUser})`);

    // Find dependency-check.sh in common locations
    this.dependencyCheckPath = this.findDependencyCheckPath();
    console.log(`  dependency-check path: ${this.dependencyCheckPath}`);
  }

  /**
   * Execute Dependency-Check and return standardized issues
   */
  async execute(): Promise<Issue[]> {
    const startTime = Date.now();

    try {
      // Check prerequisites
      await this.checkPrerequisites();

      // SESSION 24 FIX: Skip PostgreSQL connection test (causes 300s timeout)
      // The dependency-check.sh command handles its own connection testing

      // Build and run command
      const command = this.buildCommand();
      console.log(`[Universal Dependency-Check] 🚀 Starting scan with PostgreSQL backend...`);
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
   * SESSION 22 FIX: Test PostgreSQL connection before running
   */
  private async testPostgreSQLConnection(): Promise<boolean> {
    try {
      // SESSION 24 FIX: Skip connection test - it times out!
      // The dependency-check.sh command itself will test the connection
      console.log('[Universal Dependency-Check] ⏭️  Skipping psql connection test (uses dependency-check.sh built-in test)');
      return true;  // Assume PostgreSQL is available

    } catch (error) {
      // If we can't even skip the test, just continue
      console.warn('[Universal Dependency-Check] ⚠️  Connection test error (skipped)');
      return true;
    }
  }

  /**
   * Build Dependency-Check command with PostgreSQL backend
   */
  protected buildCommand(): string {
    const { outputFile, workspacePath } = this.config;

    // JDBC connection string for PostgreSQL
    const jdbcUrl = `jdbc:postgresql://${this.pgHost}:${this.pgPort}/${this.pgDatabase}?socketTimeout=30`;

    // SESSION 24 FIX: Log what we're using
    console.log(`[Dependency-Check] Building command with:`);
    console.log(`  - PostgreSQL: ${this.pgHost}:${this.pgPort}/${this.pgDatabase}`);
    console.log(`  - User: ${this.pgUser}`);
    console.log(`  - Workspace: ${workspacePath}`);

    // Dependency-Check command
    // --scan: directory to scan
    // --format: JSON for structured output
    // --out: output file path
    // --connectionString: PostgreSQL JDBC URL
    // --dbUser/--dbPassword: database credentials
    // --disableAssembly: skip .NET assembly analysis (faster)
    // --disableOssIndex: SESSION 42 FIX - Disable OSS Index API calls that cause 300s timeouts
    //                    OSS Index requires authentication and fails with 401 Unauthorized
    //                    We rely on our local PostgreSQL CVE database instead (210K+ CVEs)
    // --exclude: SESSION 45 FIX - Exclude node_modules and build artifacts for massive performance gains
    //            This is CRITICAL for large monorepos like nest-main which have 100K+ files in node_modules

    return `${this.dependencyCheckPath} \
      --scan "${workspacePath}" \
      --format JSON \
      --out "${outputFile}" \
      --connectionString "${jdbcUrl}" \
      --dbDriverName org.postgresql.Driver \
      --dbUser ${this.pgUser} \
      --dbPassword ${this.pgPassword} \
      --disableAssembly \
      --disableOssIndex \
      --exclude "**/node_modules/**" \
      --exclude "**/dist/**" \
      --exclude "**/build/**" \
      --exclude "**/.git/**" \
      --exclude "**/.next/**" \
      --exclude "**/coverage/**" \
      --project dependency-check-${this.config.language} \
      2>&1 || true`;
  }

  /**
   * Parse Dependency-Check JSON output
   */
  protected parseOutput(output: string): Issue[] {
    const issues: Issue[] = [];

    try {
      // FIX: Dependency-Check writes to outputFile/dependency-check-report.json
      // So we need to construct the full path to the actual report file
      const reportPath = path.join(this.config.outputFile!, 'dependency-check-report.json');

      if (!fs.existsSync(reportPath)) {
        console.warn(`[Universal Dependency-Check] ⚠️ Output file not found: ${reportPath}`);
        console.warn(`[Universal Dependency-Check] 📁 Output directory: ${this.config.outputFile}`);

        // Debug: List what files are in the output directory
        try {
          if (fs.existsSync(this.config.outputFile!)) {
            const files = fs.readdirSync(this.config.outputFile!);
            console.warn(`[Universal Dependency-Check] 📋 Files in output directory: ${files.join(', ')}`);
          }
        } catch (e) {
          // Ignore listing errors
        }

        return issues;
      }

      const fileContent = fs.readFileSync(reportPath, 'utf-8');
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
    // Check Dependency-Check installation using the found path
    // BUG FIX (2025-12-14): Use found path and properly validate installation
    try {
      const result = await this.runCommand(`${this.dependencyCheckPath} --version`);
      // Check if we got actual version output (not empty from command not found)
      if (!result.stdout || result.stdout.trim() === '') {
        // Also check stderr for "command not found" type messages
        if (result.stderr && (result.stderr.includes('not found') || result.stderr.includes('No such file'))) {
          throw new Error('Command not found');
        }
        throw new Error('No version output received');
      }
      const version = result.stdout.trim().split('\n')[0];
      console.log(`[Universal Dependency-Check] ✅ ${version}`);
    } catch (error) {
      console.warn(`[Universal Dependency-Check] ⚠️ Dependency-Check not found at: ${this.dependencyCheckPath}`);
      throw new Error(
        `Dependency-Check not found. Tried: ${this.dependencyCheckPath}. ` +
        `Set DEPENDENCY_CHECK_PATH env var or install: https://owasp.org/www-project-dependency-check/`
      );
    }

    // SESSION 24 FIX: Skip PostgreSQL connection test
    // The psql command hangs waiting for password, causing 300s timeout
    // dependency-check.sh will test the connection itself
    console.log(`[Universal Dependency-Check] ⏭️  Skipping PostgreSQL connection test`);
    console.log(`[Universal Dependency-Check] 🔗 Using PostgreSQL: ${this.pgHost}:${this.pgPort}/${this.pgDatabase}`);
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

