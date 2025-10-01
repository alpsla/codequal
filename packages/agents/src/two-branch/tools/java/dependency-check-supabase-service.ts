import { SupabaseClient } from '@supabase/supabase-js';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

/**
 * Maven/Gradle dependency structure
 */
export interface Dependency {
  group: string;      // com.fasterxml.jackson.core
  artifact: string;   // jackson-databind
  version: string;    // 2.12.3
  scope?: string;     // compile, test, runtime
}

/**
 * CVE match result
 */
export interface CVEMatch {
  dependency: Dependency;
  cve: {
    cve_id: string;
    severity: string;
    cvss_v3_score?: number;
    cvss_v3_vector?: string;
    description: string;
    cwe_id?: string;
    published_date?: string;
    reference_urls?: string[];
  };
}

/**
 * Dependency-Check Supabase Service
 *
 * Provides vulnerability checking by querying the Supabase CVE cache
 * instead of running Dependency-Check locally with H2 database.
 *
 * Benefits:
 * - No ARM64 database compatibility issues
 * - Fast queries (<100ms per dependency)
 * - Centralized, always up-to-date CVE data
 * - No local database maintenance
 *
 * Usage:
 *   const service = new DependencyCheckSupabaseService(supabase);
 *   const matches = await service.checkDependencies(dependencies);
 */
export class DependencyCheckSupabaseService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Check dependencies for known vulnerabilities
   *
   * @param dependencies Array of dependencies to check
   * @returns Array of CVE matches found
   */
  async checkDependencies(dependencies: Dependency[]): Promise<CVEMatch[]> {
    logger.info(`Checking ${dependencies.length} dependencies for vulnerabilities...`);

    const matches: CVEMatch[] = [];
    const startTime = Date.now();

    // Process in batches to avoid overwhelming the database
    const batchSize = 50;
    for (let i = 0; i < dependencies.length; i += batchSize) {
      const batch = dependencies.slice(i, i + batchSize);

      const batchMatches = await Promise.all(
        batch.map(dep => this.checkSingleDependency(dep))
      );

      // Flatten results
      batchMatches.forEach(depMatches => {
        matches.push(...depMatches);
      });

      logger.debug(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(dependencies.length / batchSize)}`);
    }

    const duration = Date.now() - startTime;
    logger.info(`Vulnerability check complete: ${matches.length} vulnerabilities found in ${duration}ms`);

    return matches;
  }

  /**
   * Check a single dependency for vulnerabilities
   *
   * @param dependency Dependency to check
   * @returns Array of CVE matches for this dependency
   */
  private async checkSingleDependency(dependency: Dependency): Promise<CVEMatch[]> {
    // Convert dependency to CPE format
    const cpePattern = this.toCPEPattern(dependency);

    // Query Supabase for matching CVEs
    const { data: cves, error } = await this.supabase
      .from('cve_database')
      .select('*')
      .contains('cpe_entries', [cpePattern])
      .gte('cvss_v3_score', 0); // Only include scored vulnerabilities

    if (error) {
      logger.error(`Failed to query CVEs for ${dependency.group}:${dependency.artifact}:`, error.message);
      return [];
    }

    if (!cves || cves.length === 0) {
      return [];
    }

    // Transform to CVEMatch format
    return cves.map(cve => ({
      dependency,
      cve: {
        cve_id: cve.cve_id,
        severity: cve.severity || 'UNKNOWN',
        cvss_v3_score: cve.cvss_v3_score,
        cvss_v3_vector: cve.cvss_v3_vector,
        description: cve.description,
        cwe_id: cve.cwe_id,
        published_date: cve.published_date,
        reference_urls: cve.reference_urls,
      },
    }));
  }

  /**
   * Convert Maven/Gradle dependency to CPE 2.3 format
   *
   * CPE Format: cpe:2.3:part:vendor:product:version:update:edition:language:sw_edition:target_sw:target_hw:other
   *
   * Examples:
   *   com.fasterxml.jackson.core:jackson-databind:2.12.3
   *   → cpe:2.3:a:fasterxml:jackson-databind:2.12.3:*:*:*:*:*:*:*
   *
   *   org.springframework:spring-core:5.3.20
   *   → cpe:2.3:a:spring:spring-core:5.3.20:*:*:*:*:*:*:*
   *
   * @param dependency Maven/Gradle dependency
   * @returns CPE 2.3 identifier
   */
  private toCPEPattern(dependency: Dependency): string {
    // Extract vendor from group ID (typically first part)
    // com.fasterxml.jackson.core → fasterxml
    // org.springframework → spring
    const vendor = this.extractVendor(dependency.group);

    // Product is typically the artifact name
    const product = dependency.artifact;

    // Version
    const version = dependency.version;

    // Construct CPE 2.3 URI
    // Format: cpe:2.3:a:vendor:product:version:*:*:*:*:*:*:*
    // 'a' = application
    return `cpe:2.3:a:${vendor}:${product}:${version}:*:*:*:*:*:*:*`;
  }

  /**
   * Extract vendor name from Maven group ID
   *
   * Heuristics:
   * - com.fasterxml.jackson.core → fasterxml
   * - org.springframework → spring
   * - org.apache.kafka → apache
   * - io.netty → netty
   *
   * @param groupId Maven group ID
   * @returns Vendor name
   */
  private extractVendor(groupId: string): string {
    const parts = groupId.split('.');

    // Remove common prefixes
    const filtered = parts.filter(p =>
      !['com', 'org', 'io', 'net'].includes(p)
    );

    if (filtered.length === 0) {
      // Fallback: use last part of group ID
      return parts[parts.length - 1];
    }

    // Use first significant part
    return filtered[0];
  }

  /**
   * Get CVE statistics from Supabase
   *
   * @returns CVE database statistics
   */
  async getStatistics(): Promise<{
    totalCVEs: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    lastUpdate?: string;
  }> {
    // Get total count
    const { count: totalCVEs } = await this.supabase
      .from('cve_database')
      .select('*', { count: 'exact', head: true });

    // Get severity counts
    const severityCounts = await Promise.all([
      this.supabase.from('cve_database').select('*', { count: 'exact', head: true }).eq('severity', 'CRITICAL'),
      this.supabase.from('cve_database').select('*', { count: 'exact', head: true }).eq('severity', 'HIGH'),
      this.supabase.from('cve_database').select('*', { count: 'exact', head: true }).eq('severity', 'MEDIUM'),
      this.supabase.from('cve_database').select('*', { count: 'exact', head: true }).eq('severity', 'LOW'),
    ]);

    // Get last update time
    const { data: lastUpdateLog } = await this.supabase
      .from('cve_update_log')
      .select('completed_at')
      .eq('status', 'SUCCESS')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    return {
      totalCVEs: totalCVEs || 0,
      criticalCount: severityCounts[0].count || 0,
      highCount: severityCounts[1].count || 0,
      mediumCount: severityCounts[2].count || 0,
      lowCount: severityCounts[3].count || 0,
      lastUpdate: lastUpdateLog?.completed_at,
    };
  }

  /**
   * Search for specific CVE by ID
   *
   * @param cveId CVE identifier (e.g., CVE-2023-12345)
   * @returns CVE details or null if not found
   */
  async getCVEById(cveId: string): Promise<CVEMatch['cve'] | null> {
    const { data, error } = await this.supabase
      .from('cve_database')
      .select('*')
      .eq('cve_id', cveId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      cve_id: data.cve_id,
      severity: data.severity || 'UNKNOWN',
      cvss_v3_score: data.cvss_v3_score,
      cvss_v3_vector: data.cvss_v3_vector,
      description: data.description,
      cwe_id: data.cwe_id,
      published_date: data.published_date,
      reference_urls: data.reference_urls,
    };
  }

  /**
   * Get recent high-severity vulnerabilities
   *
   * @param days Number of days to look back (default: 30)
   * @param limit Maximum number of results (default: 50)
   * @returns Recent critical/high severity CVEs
   */
  async getRecentHighSeverityCVEs(days = 30, limit = 50): Promise<CVEMatch['cve'][]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const { data, error } = await this.supabase
      .from('cve_database')
      .select('*')
      .in('severity', ['CRITICAL', 'HIGH'])
      .gte('published_date', cutoffDate.toISOString())
      .order('cvss_v3_score', { ascending: false })
      .limit(limit);

    if (error || !data) {
      logger.error('Failed to fetch recent high-severity CVEs:', error?.message);
      return [];
    }

    return data.map(cve => ({
      cve_id: cve.cve_id,
      severity: cve.severity,
      cvss_v3_score: cve.cvss_v3_score,
      cvss_v3_vector: cve.cvss_v3_vector,
      description: cve.description,
      cwe_id: cve.cwe_id,
      published_date: cve.published_date,
      reference_urls: cve.reference_urls,
    }));
  }
}
