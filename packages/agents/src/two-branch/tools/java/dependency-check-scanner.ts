/**
 * Dependency-Check Scanner (Read-Only Worker)
 *
 * Scans project dependencies for CVE vulnerabilities
 * Uses cached database (read-only mode)
 * Integrates with monitoring service
 *
 * @author CodeQual Team
 * @date 2025-09-30
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { UnifiedMonitoringService } from '../../../standard/monitoring/services/unified-monitoring.service';
import { DBMetadata } from './dependency-check-updater';

const execAsync = promisify(exec);

/**
 * CVE Vulnerability found by Dependency-Check
 */
export interface CVEVulnerability {
  id: string; // CVE-2023-12345
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  cvssScore: number; // 9.8
  cvssVector: string; // CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
  cwe?: string; // CWE-79
  description: string;
  dependency: {
    fileName: string; // jackson-databind-2.12.3.jar
    filePath: string;
    group: string; // com.fasterxml.jackson.core
    name: string; // jackson-databind
    version: string; // 2.12.3
  };
  references: string[]; // Links to advisories
  vulnerableSoftware: string[]; // CPE identifiers
}

/**
 * Scan result
 */
export interface ScanResult {
  projectName: string;
  scanDate: string;
  dependencies: number;
  vulnerabilities: CVEVulnerability[];
  scanDuration: number;
  databaseAge: number;
}

/**
 * Scans dependencies for CVE vulnerabilities (read-only)
 */
export class DependencyCheckScanner {
  private readonly ACTIVE_DB_PATH = '/data/dependency-check/active';

  // Oracle Container Registry
  private readonly CONTAINER_IMAGE = 'iad.ocir.io/codequal/analyzer:lang-java-v5.3';

  private monitoring: UnifiedMonitoringService;

  constructor() {
    this.monitoring = UnifiedMonitoringService.getInstance();
  }

  /**
   * Scan project for CVE vulnerabilities
   */
  async scan(projectPath: string, projectName?: string): Promise<ScanResult> {
    const operationId = this.monitoring.startPerformanceTracking('dependency-check-scan', {
      projectPath,
      projectName,
    });

    const startTime = Date.now();

    try {
      // Step 1: Check database status
      const dbStatus = await this.checkDBStatus();

      if (dbStatus.status !== 'READY') {
        throw new Error(
          `Database not ready: ${dbStatus.status}. ` +
          `Please wait for update to complete or contact support.`
        );
      }

      // Step 2: Verify database age
      const dbAge = Date.now() - dbStatus.timestamp;
      const dbAgeHours = dbAge / 3600000;

      if (dbAgeHours > 48) {
        console.warn(
          `⚠️  Database is ${dbAgeHours.toFixed(1)} hours old. ` +
          `Consider updating (recommended: < 24 hours).`
        );
      }

      // Step 3: Run scan (read-only mode)
      const outputPath = `/tmp/dependency-check-results-${Date.now()}`;

      const cmd = `
        docker run --rm \
          -v ${projectPath}:/workspace:ro \
          -v ${this.ACTIVE_DB_PATH}:/data:ro \
          ${this.CONTAINER_IMAGE} \
          bash -c 'dependency-check \
            --scan /workspace \
            --data /data \
            --noupdate \
            --format JSON \
            --out /tmp/results && cat /tmp/results/dependency-check-report.json'
      `;

      const { stdout } = await execAsync(cmd, { maxBuffer: 50 * 1024 * 1024 }); // 50MB buffer

      // Step 4: Parse results
      const results = JSON.parse(stdout);
      const vulnerabilities = this.parseVulnerabilities(results);

      const scanDuration = Date.now() - startTime;

      // Track metrics
      this.monitoring.trackPerformance('dependency-check-scan', scanDuration, {
        projectName: projectName || 'unknown',
        dependenciesScanned: results.dependencies?.length || 0,
        vulnerabilitiesFound: vulnerabilities.length,
        databaseAgeHours: dbAgeHours.toFixed(1),
        success: true,
      });

      return {
        projectName: projectName || 'Unknown',
        scanDate: new Date().toISOString(),
        dependencies: results.dependencies?.length || 0,
        vulnerabilities,
        scanDuration,
        databaseAge: dbAge,
      };

    } catch (error) {
      const duration = Date.now() - startTime;

      // Track failure
      this.monitoring.trackPerformance('dependency-check-scan', duration, {
        projectName: projectName || 'unknown',
        success: false,
        error: error.message,
      });

      throw new Error(`Dependency-Check scan failed: ${error.message}`);
    } finally {
      this.monitoring.endPerformanceTracking('dependency-check-scan');
    }
  }

  /**
   * Check database status
   */
  async checkDBStatus(): Promise<DBMetadata> {
    const metadataPath = join(this.ACTIVE_DB_PATH, 'metadata.json');

    if (!existsSync(metadataPath)) {
      throw new Error(
        'Dependency-Check database not initialized. ' +
        'Please run the updater first or contact support.'
      );
    }

    const metadata: DBMetadata = JSON.parse(readFileSync(metadataPath, 'utf8'));

    // Validate status
    if (!metadata.status || !metadata.timestamp) {
      throw new Error('Invalid database metadata');
    }

    return metadata;
  }

  /**
   * Parse vulnerabilities from Dependency-Check JSON output
   */
  private parseVulnerabilities(results: any): CVEVulnerability[] {
    const vulnerabilities: CVEVulnerability[] = [];

    if (!results.dependencies) {
      return vulnerabilities;
    }

    for (const dep of results.dependencies) {
      if (!dep.vulnerabilities) continue;

      for (const vuln of dep.vulnerabilities) {
        // Map CVSS score to severity
        const severity = this.mapCVSSToSeverity(vuln.cvssv3?.baseScore || vuln.cvssv2?.score || 0);

        vulnerabilities.push({
          id: vuln.name, // CVE-2023-12345
          severity,
          cvssScore: vuln.cvssv3?.baseScore || vuln.cvssv2?.score || 0,
          cvssVector: vuln.cvssv3?.vectorString || vuln.cvssv2?.vectorString || '',
          cwe: vuln.cwe,
          description: vuln.description || '',
          dependency: {
            fileName: dep.fileName,
            filePath: dep.filePath,
            group: dep.packages?.[0]?.id?.split(':')[0] || '',
            name: dep.packages?.[0]?.id?.split(':')[1] || '',
            version: dep.packages?.[0]?.id?.split(':')[2] || '',
          },
          references: vuln.references?.map((r: any) => r.url) || [],
          vulnerableSoftware: dep.vulnerableSoftware || [],
        });
      }
    }

    return vulnerabilities;
  }

  /**
   * Map CVSS score to severity level
   */
  private mapCVSSToSeverity(cvssScore: number): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
    if (cvssScore >= 9.0) return 'CRITICAL';
    if (cvssScore >= 7.0) return 'HIGH';
    if (cvssScore >= 4.0) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Get database info (for status endpoints)
   */
  async getDatabaseInfo(): Promise<{
    status: string;
    lastUpdate: string;
    ageHours: number;
    healthy: boolean;
  }> {
    try {
      const metadata = await this.checkDBStatus();
      const ageHours = (Date.now() - metadata.timestamp) / 3600000;

      return {
        status: metadata.status,
        lastUpdate: new Date(metadata.timestamp).toISOString(),
        ageHours: parseFloat(ageHours.toFixed(1)),
        healthy: metadata.status === 'READY' && ageHours < 24,
      };
    } catch (error) {
      return {
        status: 'ERROR',
        lastUpdate: 'N/A',
        ageHours: -1,
        healthy: false,
      };
    }
  }
}

export default DependencyCheckScanner;
