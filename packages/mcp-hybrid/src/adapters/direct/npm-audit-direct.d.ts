/**
 * NPM Audit Direct Adapter
 * Runs npm audit to find security vulnerabilities in dependencies
 */
import { DirectToolAdapter } from './base-adapter';
import { ToolResult, AnalysisContext, ToolMetadata, ToolCapability, ToolRequirements } from '../../core/interfaces';
export declare class NpmAuditDirectAdapter extends DirectToolAdapter {
    readonly id = "npm-audit-direct";
    readonly name = "NPM Audit Direct";
    readonly version = "1.0.0";
    readonly capabilities: ToolCapability[];
    readonly requirements: ToolRequirements;
    /**
     * Get health check command
     */
    protected getHealthCheckCommand(): {
        cmd: string;
        args: string[];
    };
    /**
     * Check if tool can analyze given context
     */
    canAnalyze(context: AnalysisContext): boolean;
    /**
     * Execute npm audit analysis
     */
    analyze(context: AnalysisContext): Promise<ToolResult>;
    /**
     * Run npm audit and get JSON report
     */
    private runNpmAudit;
    /**
     * Convert older npm audit format to v2
     */
    private convertToV2Format;
    /**
     * Generate findings from audit report
     */
    private generateFindings;
    /**
     * Map npm severity to tool severity
     */
    private mapSeverity;
    /**
     * Check if vulnerability is auto-fixable
     */
    private isAutoFixable;
    /**
     * Get fix description
     */
    private getFixDescription;
    /**
     * Format vulnerability documentation
     */
    private formatVulnerabilityDoc;
    /**
     * Format summary documentation
     */
    private formatSummaryDoc;
    /**
     * Calculate security score (0-10)
     */
    private calculateSecurityScore;
    /**
     * Create empty result when no package.json found
     */
    private createEmptyResult;
    /**
     * Get tool metadata
     */
    getMetadata(): ToolMetadata;
}
export declare const npmAuditDirectAdapter: NpmAuditDirectAdapter;
//# sourceMappingURL=npm-audit-direct.d.ts.map