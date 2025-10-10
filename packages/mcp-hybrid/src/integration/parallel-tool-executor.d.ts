/**
 * Parallel Tool Executor
 * Manages async execution of all tools against changed files from git diff
 */
import { AnalysisContext, ToolResult, AgentRole } from '../core/interfaces';
export interface ChangedFile {
    path: string;
    status: 'A' | 'M' | 'D';
    additions: number;
    deletions: number;
    patch?: string;
    content?: string;
}
export interface ToolExecutionPlan {
    toolId: string;
    agentRoles: AgentRole[];
    targetFiles: ChangedFile[];
    priority: number;
}
export declare class ParallelToolExecutor {
    private logger;
    /**
     * Extract changed files from cloned repository using git diff
     */
    extractChangedFiles(repoPath: string, baseBranch: string, prBranch: string): Promise<ChangedFile[]>;
    /**
     * Create execution plans for all tools based on changed files
     */
    createExecutionPlans(changedFiles: ChangedFile[]): Promise<ToolExecutionPlan[]>;
    /**
     * Execute all tools in parallel with proper context
     */
    executeToolsInParallel(plans: ToolExecutionPlan[], baseContext: AnalysisContext): Promise<Map<string, Map<AgentRole, ToolResult>>>;
    /**
     * Filter files that are relevant for a specific tool
     */
    private filterFilesForTool;
    /**
     * Determine if tool analyzes all files regardless of changes
     */
    private isGlobalTool;
    /**
     * Calculate execution priority for tools
     */
    private calculatePriority;
    /**
     * Check if tool handles deleted files
     */
    private toolHandlesDeletedFiles;
    /**
     * Detect language from file path
     */
    private detectLanguage;
}
export declare const parallelToolExecutor: ParallelToolExecutor;
//# sourceMappingURL=parallel-tool-executor.d.ts.map