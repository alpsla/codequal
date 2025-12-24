/**
 * Report Output Service
 *
 * Generates dual output (files + URLs) for CodeQual analysis reports.
 *
 * Output Formats:
 * 1. LSP Actions (codequal-lsp-actions.json) - For IDE integration (Cursor, VSCode, JetBrains)
 * 2. SARIF Report (codequal-sarif-report.json) - For CI/CD and GitHub Code Scanning
 * 3. GitLab Code Quality (codequal-gitlab-codequality.json) - For GitLab MR integration
 * 4. Fix Manifest (all-issues-manifest.json) - For AI assistants and batch fixes
 *
 * Each output is available as:
 * - File: Local path for direct download or file system access
 * - URL: Public API URL for web/API access
 *
 * Architecture:
 * - Files are stored in Supabase Storage under: /reports/{analysisId}/
 * - URLs are generated as signed URLs with configurable expiration
 * - Both are included in the report metadata for consumer flexibility
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { LSPSARIFConverter, LSPCodeAction, SARIFReport } from '../../two-branch/analyzers/lsp-sarif-converter';
import { IssueGroup } from '../../two-branch/utils/issue-grouping';

// ============================================================================
// TYPES
// ============================================================================

export interface OutputFormat {
  type: 'lsp' | 'sarif' | 'gitlab' | 'manifest';
  filename: string;
  content: any;
  mimeType: string;
}

export interface DualOutput {
  type: OutputFormat['type'];
  filename: string;

  // File output (for local/download access)
  filePath: string;

  // URL output (for API/web access)
  publicUrl?: string;
  signedUrl?: string;
  expiresAt?: Date;

  // Metadata
  sizeBytes: number;
  generatedAt: Date;
}

export interface ReportOutputConfig {
  // Analysis identification
  analysisId: string;
  repository: string;
  prNumber: number;
  language: string;

  // Output options
  outputDir: string;
  uploadToStorage?: boolean;
  urlExpirationHours?: number;

  // Repository context
  isGitLab?: boolean;
  workspaceRoot?: string;
}

export interface ReportOutputResult {
  outputs: DualOutput[];

  // Convenience getters
  lsp?: DualOutput;
  sarif?: DualOutput;
  gitlab?: DualOutput;
  manifest?: DualOutput;

  // Summary
  totalFiles: number;
  totalBytes: number;
  hasUrls: boolean;

  // For metadata footer
  metadata: {
    lspUrl?: string;
    sarifUrl?: string;
    gitlabUrl?: string;
    manifestUrl?: string;
  };
}

// GitLab Code Quality format (Code Climate compatible)
export interface GitLabCodeQualityIssue {
  type: 'issue';
  check_name: string;
  description: string;
  content: { body: string };
  categories: string[];
  severity: 'blocker' | 'critical' | 'major' | 'minor' | 'info';
  fingerprint: string;
  location: {
    path: string;
    lines: {
      begin: number;
      end?: number;
    };
  };
}

// ============================================================================
// REPORT OUTPUT SERVICE
// ============================================================================

export class ReportOutputService {
  private supabase: SupabaseClient | null = null;
  private converter: LSPSARIFConverter;
  private storageBucket = 'codequal-reports';

  constructor() {
    this.converter = new LSPSARIFConverter();
    this.initializeSupabase();
  }

  private initializeSupabase(): void {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      this.supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
    }
  }

  // ==========================================================================
  // MAIN API
  // ==========================================================================

  /**
   * Generate all output formats with dual output (files + URLs)
   */
  async generateAllOutputs(
    issues: any[], // EnrichedIssue[]
    groups: IssueGroup[],
    config: ReportOutputConfig
  ): Promise<ReportOutputResult> {
    console.log(`\n📦 Report Output Service`);
    console.log(`   Analysis ID: ${config.analysisId}`);
    console.log(`   Repository: ${config.repository}`);
    console.log(`   PR: #${config.prNumber}`);
    console.log('');

    const outputs: DualOutput[] = [];
    const startTime = Date.now();

    // 1. Generate LSP Actions
    console.log('   📝 Generating LSP Actions...');
    const lspOutput = await this.generateLSPOutput(issues, config);
    outputs.push(lspOutput);
    console.log(`      ✓ ${lspOutput.filename} (${this.formatBytes(lspOutput.sizeBytes)})`);

    // 2. Generate SARIF Report
    console.log('   📋 Generating SARIF Report...');
    const sarifOutput = await this.generateSARIFOutput(issues, groups, config);
    outputs.push(sarifOutput);
    console.log(`      ✓ ${sarifOutput.filename} (${this.formatBytes(sarifOutput.sizeBytes)})`);

    // 3. Generate GitLab Code Quality (only for GitLab repos)
    if (config.isGitLab) {
      console.log('   🦊 Generating GitLab Code Quality...');
      const gitlabOutput = await this.generateGitLabOutput(issues, config);
      outputs.push(gitlabOutput);
      console.log(`      ✓ ${gitlabOutput.filename} (${this.formatBytes(gitlabOutput.sizeBytes)})`);
    }

    // 4. Generate Fix Manifest
    console.log('   📦 Generating Fix Manifest...');
    const manifestOutput = await this.generateManifestOutput(issues, groups, config);
    outputs.push(manifestOutput);
    console.log(`      ✓ ${manifestOutput.filename} (${this.formatBytes(manifestOutput.sizeBytes)})`);

    // 5. Upload to Supabase Storage (if enabled)
    if (config.uploadToStorage && this.supabase) {
      console.log('   ☁️  Uploading to Supabase Storage...');
      await this.uploadAllToStorage(outputs, config);
      console.log('      ✓ All files uploaded');
    }

    // Build result
    const result: ReportOutputResult = {
      outputs,
      lsp: outputs.find(o => o.type === 'lsp'),
      sarif: outputs.find(o => o.type === 'sarif'),
      gitlab: outputs.find(o => o.type === 'gitlab'),
      manifest: outputs.find(o => o.type === 'manifest'),
      totalFiles: outputs.length,
      totalBytes: outputs.reduce((sum, o) => sum + o.sizeBytes, 0),
      hasUrls: outputs.some(o => o.publicUrl),
      metadata: {
        lspUrl: outputs.find(o => o.type === 'lsp')?.publicUrl,
        sarifUrl: outputs.find(o => o.type === 'sarif')?.publicUrl,
        gitlabUrl: outputs.find(o => o.type === 'gitlab')?.publicUrl,
        manifestUrl: outputs.find(o => o.type === 'manifest')?.publicUrl,
      }
    };

    const duration = Date.now() - startTime;
    console.log('');
    console.log(`   ✅ Report Output Complete: ${duration}ms`);
    console.log(`      Files: ${result.totalFiles}`);
    console.log(`      Size: ${this.formatBytes(result.totalBytes)}`);
    console.log(`      URLs: ${result.hasUrls ? 'Yes' : 'No'}`);

    return result;
  }

  // ==========================================================================
  // OUTPUT GENERATORS
  // ==========================================================================

  /**
   * Generate LSP Code Actions output
   */
  private async generateLSPOutput(
    issues: any[],
    config: ReportOutputConfig
  ): Promise<DualOutput> {
    const workspaceRoot = config.workspaceRoot || '/workspace';
    const codeActions = this.converter.generateLSPCodeActions(issues, workspaceRoot);

    const content = {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      repository: config.repository,
      prNumber: config.prNumber,
      language: config.language,
      totalActions: codeActions.length,
      batchActions: codeActions.filter(a => a.title.startsWith('Apply ')),
      individualActions: codeActions.filter(a => !a.title.startsWith('Apply ')),
      codeActions
    };

    return this.writeOutput({
      type: 'lsp',
      filename: 'codequal-lsp-actions.json',
      content,
      mimeType: 'application/json'
    }, config);
  }

  /**
   * Generate SARIF Report output
   */
  private async generateSARIFOutput(
    issues: any[],
    groups: IssueGroup[],
    config: ReportOutputConfig
  ): Promise<DualOutput> {
    const sarifReport = this.converter.generateSARIFReport(issues, groups, {
      repository: config.repository,
      version: '9.0.0',
      analyzedAt: new Date().toISOString(),
      workspaceRoot: config.workspaceRoot  // Use relative paths in SARIF output
    });

    return this.writeOutput({
      type: 'sarif',
      filename: 'codequal-sarif-report.json',
      content: sarifReport,
      mimeType: 'application/sarif+json'
    }, config);
  }

  /**
   * Generate GitLab Code Quality output
   */
  private async generateGitLabOutput(
    issues: any[],
    config: ReportOutputConfig
  ): Promise<DualOutput> {
    const gitlabIssues: GitLabCodeQualityIssue[] = issues
      .filter(issue => issue.file && issue.line)
      .map(issue => this.convertToGitLabFormat(issue));

    return this.writeOutput({
      type: 'gitlab',
      filename: 'codequal-gitlab-codequality.json',
      content: gitlabIssues,
      mimeType: 'application/json'
    }, config);
  }

  /**
   * Generate Fix Manifest output
   */
  private async generateManifestOutput(
    issues: any[],
    groups: IssueGroup[],
    config: ReportOutputConfig
  ): Promise<DualOutput> {
    // Filter issues with fixes
    const fixableIssues = issues.filter(i => i.fixSuggestion?.correctedCode);

    // Group by severity for lazy loading
    const bySeverity = {
      critical: fixableIssues.filter(i => i.severity === 'critical'),
      high: fixableIssues.filter(i => i.severity === 'high'),
      medium: fixableIssues.filter(i => i.severity === 'medium'),
      low: fixableIssues.filter(i => i.severity === 'low')
    };

    const manifest = {
      version: '2.0.0',
      generatedAt: new Date().toISOString(),
      repository: config.repository,
      prNumber: config.prNumber,
      language: config.language,

      summary: {
        totalIssues: issues.length,
        fixableIssues: fixableIssues.length,
        groups: groups.length,
        bySeverity: {
          critical: bySeverity.critical.length,
          high: bySeverity.high.length,
          medium: bySeverity.medium.length,
          low: bySeverity.low.length
        }
      },

      // Lazy loading: Critical issues are embedded, others reference files
      embedded: {
        critical: bySeverity.critical.slice(0, 50).map(this.toManifestEntry),
        high: bySeverity.high.slice(0, 20).map(this.toManifestEntry)
      },

      // References to full issue lists (for AI assistants)
      files: {
        allIssues: 'codequal-lsp-actions.json',
        sarifReport: 'codequal-sarif-report.json'
      },

      // Group metadata for batch operations
      groups: groups.map(g => ({
        id: `${g.rule}-${g.severity}-${g.tool}`.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        rule: g.rule,
        tool: g.tool,
        severity: g.severity,
        count: g.count,
        category: g.category,
        autoFixable: this.isAutoFixable(g)
      }))
    };

    return this.writeOutput({
      type: 'manifest',
      filename: 'all-issues-manifest.json',
      content: manifest,
      mimeType: 'application/json'
    }, config);
  }

  // ==========================================================================
  // FILE OPERATIONS
  // ==========================================================================

  /**
   * Write output to file and create DualOutput
   */
  private async writeOutput(
    format: OutputFormat,
    config: ReportOutputConfig
  ): Promise<DualOutput> {
    // Ensure output directory exists
    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir, { recursive: true });
    }

    const filePath = path.join(config.outputDir, format.filename);
    const contentStr = JSON.stringify(format.content, null, 2);

    // Write file
    fs.writeFileSync(filePath, contentStr, 'utf-8');
    const sizeBytes = Buffer.byteLength(contentStr, 'utf-8');

    return {
      type: format.type,
      filename: format.filename,
      filePath,
      sizeBytes,
      generatedAt: new Date()
    };
  }

  /**
   * Upload all outputs to Supabase Storage
   */
  private async uploadAllToStorage(
    outputs: DualOutput[],
    config: ReportOutputConfig
  ): Promise<void> {
    if (!this.supabase) {
      console.warn('[ReportOutput] Supabase not configured, skipping upload');
      return;
    }

    const storagePath = `reports/${config.analysisId}`;
    const expirationHours = config.urlExpirationHours || 24 * 7; // 1 week default

    for (const output of outputs) {
      try {
        // Read file content
        const content = fs.readFileSync(output.filePath, 'utf-8');
        const remotePath = `${storagePath}/${output.filename}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await this.supabase.storage
          .from(this.storageBucket)
          .upload(remotePath, content, {
            contentType: 'application/json',
            upsert: true
          });

        if (uploadError) {
          console.error(`[ReportOutput] Upload failed for ${output.filename}:`, uploadError);
          continue;
        }

        // Get public URL
        const { data: publicUrlData } = this.supabase.storage
          .from(this.storageBucket)
          .getPublicUrl(remotePath);

        if (publicUrlData) {
          output.publicUrl = publicUrlData.publicUrl;
        }

        // Get signed URL (with expiration)
        const { data: signedUrlData, error: signedError } = await this.supabase.storage
          .from(this.storageBucket)
          .createSignedUrl(remotePath, expirationHours * 3600);

        if (!signedError && signedUrlData) {
          output.signedUrl = signedUrlData.signedUrl;
          output.expiresAt = new Date(Date.now() + expirationHours * 3600 * 1000);
        }
      } catch (error: any) {
        console.error(`[ReportOutput] Error uploading ${output.filename}:`, error.message);
      }
    }
  }

  // ==========================================================================
  // CONVERTERS
  // ==========================================================================

  /**
   * Convert issue to GitLab Code Quality format
   */
  private convertToGitLabFormat(issue: any): GitLabCodeQualityIssue {
    return {
      type: 'issue',
      check_name: `${issue.tool}/${issue.rule}`,
      description: issue.message,
      content: {
        body: issue.fixSuggestion?.explanation || issue.message
      },
      categories: [issue.category || 'Code Quality'],
      severity: this.mapSeverityToGitLab(issue.severity),
      fingerprint: this.generateFingerprint(issue),
      location: {
        path: issue.file,
        lines: {
          begin: issue.line || 1,
          end: issue.line ? issue.line + 1 : undefined
        }
      }
    };
  }

  /**
   * Convert issue to manifest entry
   */
  private toManifestEntry = (issue: any) => ({
    file: issue.file,
    line: issue.line,
    rule: issue.rule,
    tool: issue.tool,
    severity: issue.severity,
    message: issue.message?.substring(0, 200),
    fix: issue.fixSuggestion?.fix?.substring(0, 300)
  });

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  private mapSeverityToGitLab(severity: string): GitLabCodeQualityIssue['severity'] {
    switch (severity) {
      case 'critical': return 'blocker';
      case 'high': return 'critical';
      case 'medium': return 'major';
      case 'low': return 'minor';
      default: return 'info';
    }
  }

  private generateFingerprint(issue: any): string {
    const data = `${issue.file}:${issue.line}:${issue.rule}:${issue.tool}`;
    // Simple hash for fingerprint
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  }

  private isAutoFixable(group: IssueGroup): boolean {
    const autoFixableTools = ['checkstyle', 'eslint', 'prettier', 'ruff', 'black'];
    return autoFixableTools.includes(group.tool?.toLowerCase() || '');
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

// ============================================================================
// SINGLETON & CONVENIENCE FUNCTIONS
// ============================================================================

let serviceInstance: ReportOutputService | null = null;

export function getReportOutputService(): ReportOutputService {
  if (!serviceInstance) {
    serviceInstance = new ReportOutputService();
  }
  return serviceInstance;
}

/**
 * Generate all report outputs with dual output (files + URLs)
 */
export async function generateReportOutputs(
  issues: any[],
  groups: IssueGroup[],
  config: ReportOutputConfig
): Promise<ReportOutputResult> {
  const service = getReportOutputService();
  return service.generateAllOutputs(issues, groups, config);
}
