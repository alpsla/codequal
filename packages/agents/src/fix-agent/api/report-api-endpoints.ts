/**
 * Report API Endpoints
 *
 * Provides REST API endpoints for accessing CodeQual analysis reports.
 *
 * Endpoints:
 * - GET /api/reports/:analysisId - Get report metadata and URLs
 * - GET /api/reports/:analysisId/lsp - Get LSP Actions file
 * - GET /api/reports/:analysisId/sarif - Get SARIF report
 * - GET /api/reports/:analysisId/gitlab - Get GitLab Code Quality file
 * - GET /api/reports/:analysisId/manifest - Get fix manifest
 * - GET /api/reports/:analysisId/download - Get all files as ZIP
 *
 * These endpoints work with the ReportOutputService to provide both:
 * - Direct file downloads
 * - API access via Supabase Storage URLs
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TYPES
// ============================================================================

export interface ReportMetadata {
  analysisId: string;
  repository: string;
  prNumber: number;
  language: string;
  analyzedAt: string;
  status: 'completed' | 'processing' | 'failed';
  outputs: {
    lsp?: OutputInfo;
    sarif?: OutputInfo;
    gitlab?: OutputInfo;
    manifest?: OutputInfo;
  };
  summary: {
    totalIssues: number;
    fixableIssues: number;
    blockedIssues: number;
  };
}

export interface OutputInfo {
  filename: string;
  sizeBytes: number;
  publicUrl?: string;
  signedUrl?: string;
  expiresAt?: string;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

// ============================================================================
// REPORT API SERVICE
// ============================================================================

export class ReportAPIService {
  private supabase: SupabaseClient | null = null;
  private storageBucket = 'codequal-reports';
  private localReportDir = process.env.CODEQUAL_REPORTS_DIR || './test-outputs';

  constructor() {
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
  // API ENDPOINTS
  // ==========================================================================

  /**
   * GET /api/reports/:analysisId
   * Get report metadata and all output URLs
   */
  async getReportMetadata(analysisId: string): Promise<APIResponse<ReportMetadata>> {
    try {
      // Check Supabase first
      if (this.supabase) {
        const { data, error } = await this.supabase
          .from('analysis_reports')
          .select('*')
          .eq('analysis_id', analysisId)
          .single();

        if (!error && data) {
          return {
            success: true,
            data: this.mapDatabaseToMetadata(data),
            timestamp: new Date().toISOString()
          };
        }
      }

      // Fallback to local storage
      const localMetadata = await this.getLocalReportMetadata(analysisId);
      if (localMetadata) {
        return {
          success: true,
          data: localMetadata,
          timestamp: new Date().toISOString()
        };
      }

      return {
        success: false,
        error: `Report not found: ${analysisId}`,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * GET /api/reports/:analysisId/lsp
   * Get LSP Actions file
   */
  async getLSPActions(analysisId: string): Promise<APIResponse<any>> {
    return this.getOutputFile(analysisId, 'lsp', 'codequal-lsp-actions.json');
  }

  /**
   * GET /api/reports/:analysisId/sarif
   * Get SARIF report
   */
  async getSARIFReport(analysisId: string): Promise<APIResponse<any>> {
    return this.getOutputFile(analysisId, 'sarif', 'codequal-sarif-report.json');
  }

  /**
   * GET /api/reports/:analysisId/gitlab
   * Get GitLab Code Quality file
   */
  async getGitLabCodeQuality(analysisId: string): Promise<APIResponse<any>> {
    return this.getOutputFile(analysisId, 'gitlab', 'codequal-gitlab-codequality.json');
  }

  /**
   * GET /api/reports/:analysisId/manifest
   * Get fix manifest
   */
  async getManifest(analysisId: string): Promise<APIResponse<any>> {
    return this.getOutputFile(analysisId, 'manifest', 'all-issues-manifest.json');
  }

  /**
   * GET /api/reports/:analysisId/url/:type
   * Get signed URL for specific file type (valid for 1 hour)
   */
  async getSignedUrl(
    analysisId: string,
    type: 'lsp' | 'sarif' | 'gitlab' | 'manifest'
  ): Promise<APIResponse<{ url: string; expiresAt: string }>> {
    if (!this.supabase) {
      return {
        success: false,
        error: 'Supabase not configured',
        timestamp: new Date().toISOString()
      };
    }

    const filenames: Record<string, string> = {
      lsp: 'codequal-lsp-actions.json',
      sarif: 'codequal-sarif-report.json',
      gitlab: 'codequal-gitlab-codequality.json',
      manifest: 'all-issues-manifest.json'
    };

    const remotePath = `reports/${analysisId}/${filenames[type]}`;

    const { data, error } = await this.supabase.storage
      .from(this.storageBucket)
      .createSignedUrl(remotePath, 3600); // 1 hour expiration

    if (error || !data) {
      return {
        success: false,
        error: error?.message || 'Failed to generate signed URL',
        timestamp: new Date().toISOString()
      };
    }

    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

    return {
      success: true,
      data: {
        url: data.signedUrl,
        expiresAt
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * POST /api/reports
   * Store new analysis report (called by Report Output Service)
   */
  async storeReportMetadata(metadata: ReportMetadata): Promise<APIResponse<{ analysisId: string }>> {
    if (!this.supabase) {
      return {
        success: false,
        error: 'Supabase not configured',
        timestamp: new Date().toISOString()
      };
    }

    try {
      const { error } = await this.supabase
        .from('analysis_reports')
        .upsert({
          analysis_id: metadata.analysisId,
          repository: metadata.repository,
          pr_number: metadata.prNumber,
          language: metadata.language,
          analyzed_at: metadata.analyzedAt,
          status: metadata.status,
          outputs: metadata.outputs,
          summary: metadata.summary
        });

      if (error) {
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }

      return {
        success: true,
        data: { analysisId: metadata.analysisId },
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Get specific output file content
   */
  private async getOutputFile(
    analysisId: string,
    type: string,
    filename: string
  ): Promise<APIResponse<any>> {
    try {
      // Try Supabase Storage first
      if (this.supabase) {
        const remotePath = `reports/${analysisId}/${filename}`;
        const { data, error } = await this.supabase.storage
          .from(this.storageBucket)
          .download(remotePath);

        if (!error && data) {
          const text = await data.text();
          return {
            success: true,
            data: JSON.parse(text),
            timestamp: new Date().toISOString()
          };
        }
      }

      // Fallback to local file
      const localPath = path.join(this.localReportDir, analysisId, filename);
      if (fs.existsSync(localPath)) {
        const content = fs.readFileSync(localPath, 'utf-8');
        return {
          success: true,
          data: JSON.parse(content),
          timestamp: new Date().toISOString()
        };
      }

      return {
        success: false,
        error: `File not found: ${filename}`,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get local report metadata from output directory
   */
  private async getLocalReportMetadata(analysisId: string): Promise<ReportMetadata | null> {
    const reportDir = path.join(this.localReportDir, analysisId);
    if (!fs.existsSync(reportDir)) {
      return null;
    }

    // Check which files exist
    const files = fs.readdirSync(reportDir);
    const outputs: ReportMetadata['outputs'] = {};

    if (files.includes('codequal-lsp-actions.json')) {
      const stats = fs.statSync(path.join(reportDir, 'codequal-lsp-actions.json'));
      outputs.lsp = {
        filename: 'codequal-lsp-actions.json',
        sizeBytes: stats.size
      };
    }

    if (files.includes('codequal-sarif-report.json')) {
      const stats = fs.statSync(path.join(reportDir, 'codequal-sarif-report.json'));
      outputs.sarif = {
        filename: 'codequal-sarif-report.json',
        sizeBytes: stats.size
      };
    }

    if (files.includes('codequal-gitlab-codequality.json')) {
      const stats = fs.statSync(path.join(reportDir, 'codequal-gitlab-codequality.json'));
      outputs.gitlab = {
        filename: 'codequal-gitlab-codequality.json',
        sizeBytes: stats.size
      };
    }

    if (files.includes('all-issues-manifest.json')) {
      const stats = fs.statSync(path.join(reportDir, 'all-issues-manifest.json'));
      outputs.manifest = {
        filename: 'all-issues-manifest.json',
        sizeBytes: stats.size
      };
    }

    // Read manifest for summary
    const summary = { totalIssues: 0, fixableIssues: 0, blockedIssues: 0 };
    if (outputs.manifest) {
      const manifestPath = path.join(reportDir, 'all-issues-manifest.json');
      const manifestContent = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      summary.totalIssues = manifestContent.summary?.totalIssues || 0;
      summary.fixableIssues = manifestContent.summary?.fixableIssues || 0;
      summary.blockedIssues = (manifestContent.summary?.bySeverity?.critical || 0) +
        (manifestContent.summary?.bySeverity?.high || 0);
    }

    return {
      analysisId,
      repository: 'unknown',
      prNumber: 0,
      language: 'unknown',
      analyzedAt: new Date().toISOString(),
      status: 'completed',
      outputs,
      summary
    };
  }

  /**
   * Map database row to ReportMetadata
   */
  private mapDatabaseToMetadata(row: any): ReportMetadata {
    return {
      analysisId: row.analysis_id,
      repository: row.repository,
      prNumber: row.pr_number,
      language: row.language,
      analyzedAt: row.analyzed_at,
      status: row.status,
      outputs: row.outputs || {},
      summary: row.summary || { totalIssues: 0, fixableIssues: 0, blockedIssues: 0 }
    };
  }
}

// ============================================================================
// SINGLETON & CONVENIENCE
// ============================================================================

let apiServiceInstance: ReportAPIService | null = null;

export function getReportAPIService(): ReportAPIService {
  if (!apiServiceInstance) {
    apiServiceInstance = new ReportAPIService();
  }
  return apiServiceInstance;
}

/**
 * Express.js route handlers (for integration with web API)
 */
export const expressHandlers = {
  async getReport(req: any, res: any): Promise<void> {
    const service = getReportAPIService();
    const result = await service.getReportMetadata(req.params.analysisId);
    res.status(result.success ? 200 : 404).json(result);
  },

  async getLSP(req: any, res: any): Promise<void> {
    const service = getReportAPIService();
    const result = await service.getLSPActions(req.params.analysisId);
    res.status(result.success ? 200 : 404).json(result);
  },

  async getSARIF(req: any, res: any): Promise<void> {
    const service = getReportAPIService();
    const result = await service.getSARIFReport(req.params.analysisId);
    res.status(result.success ? 200 : 404).json(result);
  },

  async getGitLab(req: any, res: any): Promise<void> {
    const service = getReportAPIService();
    const result = await service.getGitLabCodeQuality(req.params.analysisId);
    res.status(result.success ? 200 : 404).json(result);
  },

  async getManifest(req: any, res: any): Promise<void> {
    const service = getReportAPIService();
    const result = await service.getManifest(req.params.analysisId);
    res.status(result.success ? 200 : 404).json(result);
  },

  async getSignedUrl(req: any, res: any): Promise<void> {
    const service = getReportAPIService();
    const type = req.params.type as 'lsp' | 'sarif' | 'gitlab' | 'manifest';
    const result = await service.getSignedUrl(req.params.analysisId, type);
    res.status(result.success ? 200 : 404).json(result);
  }
};

/**
 * Express router setup helper
 */
export function setupReportRoutes(router: any): void {
  router.get('/reports/:analysisId', expressHandlers.getReport);
  router.get('/reports/:analysisId/lsp', expressHandlers.getLSP);
  router.get('/reports/:analysisId/sarif', expressHandlers.getSARIF);
  router.get('/reports/:analysisId/gitlab', expressHandlers.getGitLab);
  router.get('/reports/:analysisId/manifest', expressHandlers.getManifest);
  router.get('/reports/:analysisId/url/:type', expressHandlers.getSignedUrl);
}
