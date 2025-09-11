/**
 * Platform Agent Interface
 * Platform agents analyze entire repositories across all languages
 * and provide cross-cutting security insights
 */

export interface PlatformScanResult {
  platform: 'github' | 'gitlab' | 'bitbucket';
  repository: string;
  branch: string;
  languages: string[];
  securityFindings: {
    dependencies: DependencyVulnerability[];
    secrets: SecretExposure[];
    codeScanning: CodeScanningAlert[];
    containerScanning?: ContainerVulnerability[];
    licenseCompliance?: LicenseIssue[];
    infrastructureAsCode?: IaCIssue[];
  };
  metadata: {
    scanTime: number;
    toolsUsed: string[];
    apiCalls: number;
    rateLimitRemaining?: number;
  };
  policies?: {
    branchProtection: boolean;
    requiredReviewers: number;
    signedCommits: boolean;
    secretScanning: boolean;
  };
}

export interface DependencyVulnerability {
  id: string;
  package: string;
  version: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  cve?: string;
  ghsa?: string;
  title: string;
  description: string;
  fixedVersion?: string;
  language: string;
  manifestFile: string;
}

export interface SecretExposure {
  id: string;
  type: string;
  file: string;
  line?: number;
  commit?: string;
  author?: string;
  date?: string;
  resolved: boolean;
}

export interface CodeScanningAlert {
  id: string;
  rule: string;
  severity: 'error' | 'warning' | 'note';
  message: string;
  file: string;
  line: number;
  column?: number;
  tool: string;
  language?: string;
  cwe?: string;
}

export interface ContainerVulnerability {
  id: string;
  image: string;
  tag: string;
  vulnerability: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  fixedVersion?: string;
}

export interface LicenseIssue {
  dependency: string;
  license: string;
  compatibility: 'incompatible' | 'restricted' | 'unknown';
  file: string;
}

export interface IaCIssue {
  id: string;
  type: 'terraform' | 'cloudformation' | 'kubernetes' | 'docker';
  severity: 'critical' | 'high' | 'medium' | 'low';
  rule: string;
  message: string;
  file: string;
  line: number;
}

export abstract class PlatformAgent {
  protected apiToken?: string;
  protected rateLimiter: RateLimiter;

  constructor(protected platform: 'github' | 'gitlab' | 'bitbucket') {
    this.apiToken = this.loadApiToken();
    this.rateLimiter = new RateLimiter(platform);
  }

  abstract scanRepository(repoUrl: string, options?: ScanOptions): Promise<PlatformScanResult>;
  abstract enhanceLanguageFindings(language: string, localFindings: any[], platformData: PlatformScanResult): Promise<any[]>;
  abstract checkPolicies(repoUrl: string): Promise<any>;
  
  protected abstract loadApiToken(): string | undefined;

  /**
   * Correlate platform findings with language-specific findings
   */
  correlateFindigs(platformFindings: PlatformScanResult, languageFindings: Map<string, any[]>): CorrelatedFindings {
    const correlated: CorrelatedFindings = {
      confirmed: [],      // Found by both platform and language tools
      platformOnly: [],   // Only found by platform scanning
      languageOnly: [],   // Only found by language tools
      enhanced: []        // Language findings enhanced with platform context
    };

    // Implementation for correlation logic
    return correlated;
  }
}

export interface ScanOptions {
  branch?: string;
  includeContainerScanning?: boolean;
  includeLicenseScanning?: boolean;
  includeIaCScanning?: boolean;
  depth?: number;
}

export interface CorrelatedFindings {
  confirmed: any[];
  platformOnly: any[];
  languageOnly: any[];
  enhanced: any[];
}

class RateLimiter {
  private requests: number[] = [];
  private limits = {
    github: { perHour: 5000, perMinute: 100 },
    gitlab: { perHour: 2000, perMinute: 60 },
    bitbucket: { perHour: 1000, perMinute: 30 }
  };

  constructor(private platform: 'github' | 'gitlab' | 'bitbucket') {}

  async throttle(): Promise<void> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Clean old requests
    this.requests = this.requests.filter(time => time > oneMinuteAgo);
    
    const limit = this.limits[this.platform].perMinute;
    if (this.requests.length >= limit) {
      const oldestRequest = this.requests[0];
      const waitTime = 60000 - (now - oldestRequest);
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    this.requests.push(now);
  }
}