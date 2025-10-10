/**
 * Dependency Cruiser Direct Adapter - Enhanced with role-based filtering
 * Serves both Architecture and Dependency agents with filtered results
 */
import { DirectToolAdapter } from './base-adapter';
import { AnalysisContext, ToolResult, AgentRole } from '../../core/interfaces';
export declare class DependencyCruiserDirectAdapter extends DirectToolAdapter {
    readonly id = "dependency-cruiser-direct";
    readonly name = "Dependency Cruiser";
    readonly version = "15.0.0";
    readonly capabilities: {
        name: string;
        category: "architecture";
        languages: string[];
        fileTypes: string[];
    }[];
    readonly requirements: {
        minFiles: number;
        executionMode: "on-demand";
        timeout: number;
        authentication: {
            type: "none";
            required: boolean;
        };
    };
    constructor();
    analyze(context: AnalysisContext): Promise<ToolResult>;
    private isFileSupported;
    private runDependencyCruiser;
    private filterFindingsByRole;
    private calculateMetricsByRole;
    private inferAgentRole;
    private processViolations;
    private mapSeverity;
    healthCheck(): Promise<boolean>;
    canAnalyze(context: AnalysisContext): boolean;
    protected getHealthCheckCommand(): {
        cmd: string;
        args: string[];
    };
    getMetadata(): {
        id: string;
        name: string;
        description: string;
        author: string;
        supportedRoles: AgentRole[];
        supportedLanguages: string[];
        tags: string[];
        securityVerified: boolean;
        lastVerified: Date;
    };
}
//# sourceMappingURL=dependency-cruiser-direct.d.ts.map