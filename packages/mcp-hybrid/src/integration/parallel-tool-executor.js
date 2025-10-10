"use strict";
/**
 * Parallel Tool Executor
 * Manages async execution of all tools against changed files from git diff
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.parallelToolExecutor = exports.ParallelToolExecutor = void 0;
const registry_1 = require("../core/registry");
const core_1 = require("@codequal/core");
const child_process_1 = require("child_process");
const util_1 = require("util");
const operation_cache_1 = require("./operation-cache");
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
const supabase_metrics_reporter_1 = require("../monitoring/supabase-metrics-reporter");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class ParallelToolExecutor {
    constructor() {
        this.logger = core_1.logging.createLogger('ParallelToolExecutor');
    }
    /**
     * Extract changed files from cloned repository using git diff
     */
    async extractChangedFiles(repoPath, baseBranch = 'main', prBranch) {
        const cacheKey = `git-diff:${repoPath}:${baseBranch}:${prBranch}`;
        return operation_cache_1.gitOperationCache.getOrExecute(cacheKey, async () => {
            this.logger.info(`Extracting changed files between ${baseBranch} and ${prBranch}`);
            try {
                // Get list of changed files with stats
                const { stdout: fileList } = await execAsync(`git diff --name-status ${baseBranch}...${prBranch}`, { cwd: repoPath });
                const changedFiles = [];
                for (const line of fileList.trim().split('\n')) {
                    if (!line)
                        continue;
                    const [status, filePath] = line.split('\t');
                    // Get detailed diff for each file
                    const { stdout: diffStat } = await execAsync(`git diff --numstat ${baseBranch}...${prBranch} -- "${filePath}"`, { cwd: repoPath });
                    const [additions, deletions] = diffStat.trim().split('\t').map(n => parseInt(n) || 0);
                    // Get the patch (diff content)
                    const { stdout: patch } = await execAsync(`git diff ${baseBranch}...${prBranch} -- "${filePath}"`, { cwd: repoPath });
                    // Get current file content (for modified/added files)
                    let content;
                    if (status !== 'D') {
                        try {
                            content = await fs.readFile(path.join(repoPath, filePath), 'utf-8');
                        }
                        catch (error) {
                            this.logger.warn(`Could not read file ${filePath}: ${error}`);
                        }
                    }
                    changedFiles.push({
                        path: filePath,
                        status: status,
                        additions,
                        deletions,
                        patch,
                        content
                    });
                }
                this.logger.info(`Found ${changedFiles.length} changed files`);
                return changedFiles;
            }
            catch (error) {
                this.logger.error(`Failed to extract changed files: ${error}`);
                throw error;
            }
        });
    }
    /**
     * Create execution plans for all tools based on changed files
     */
    async createExecutionPlans(changedFiles) {
        const plans = [];
        const allRoles = ['security', 'codeQuality', 'dependency', 'performance', 'architecture', 'educational', 'reporting'];
        // Get all tools for all roles
        const toolsMap = new Map();
        for (const role of allRoles) {
            const tools = await registry_1.toolRegistry.getToolsForRole(role);
            for (const tool of tools) {
                if (!toolsMap.has(tool.id)) {
                    toolsMap.set(tool.id, new Set());
                }
                toolsMap.get(tool.id).add(role);
            }
        }
        // Create execution plans
        for (const [toolId, roles] of toolsMap) {
            const tool = await registry_1.toolRegistry.getTool(toolId);
            if (!tool)
                continue;
            // Determine which files this tool should analyze
            const targetFiles = this.filterFilesForTool(tool, changedFiles);
            if (targetFiles.length > 0 || this.isGlobalTool(toolId)) {
                plans.push({
                    toolId,
                    agentRoles: Array.from(roles),
                    targetFiles,
                    priority: this.calculatePriority(toolId, targetFiles)
                });
            }
        }
        // Sort by priority (higher priority first)
        plans.sort((a, b) => b.priority - a.priority);
        this.logger.info(`Created ${plans.length} execution plans for tools`);
        return plans;
    }
    /**
     * Execute all tools in parallel with proper context
     */
    async executeToolsInParallel(plans, baseContext) {
        this.logger.info(`Executing ${plans.length} tools in parallel`);
        const results = new Map();
        // Group plans by priority for batch execution
        const priorityGroups = new Map();
        plans.forEach(plan => {
            const priority = plan.priority;
            if (!priorityGroups.has(priority)) {
                priorityGroups.set(priority, []);
            }
            priorityGroups.get(priority).push(plan);
        });
        // Execute each priority group in parallel
        const sortedPriorities = Array.from(priorityGroups.keys()).sort((a, b) => b - a);
        for (const priority of sortedPriorities) {
            const group = priorityGroups.get(priority);
            this.logger.info(`Executing priority ${priority} group with ${group.length} tools`);
            // Execute all tools in this priority group in parallel
            const groupPromises = group.map(async (plan) => {
                const tool = await registry_1.toolRegistry.getTool(plan.toolId);
                if (!tool)
                    return;
                // Prepare context with changed files
                const toolContext = {
                    ...baseContext,
                    pr: {
                        ...baseContext.pr,
                        files: plan.targetFiles.map(cf => ({
                            path: cf.path,
                            content: cf.content || '',
                            language: this.detectLanguage(cf.path),
                            changeType: cf.status === 'A' ? 'added' : cf.status === 'M' ? 'modified' : 'deleted',
                            diff: cf.patch
                        }))
                    }
                };
                // Execute tool for each role
                const toolResults = new Map();
                for (const role of plan.agentRoles) {
                    const startTime = Date.now();
                    try {
                        // Create role-specific context
                        const roleContext = { ...toolContext, agentRole: role };
                        // Execute tool
                        const result = await tool.analyze(roleContext);
                        result.executionTime = Date.now() - startTime;
                        toolResults.set(role, result);
                        // Report tool execution metrics
                        await supabase_metrics_reporter_1.metricsReporter.reportToolExecution(plan.toolId, tool.type, role, baseContext.repository.name, baseContext.pr.prNumber, result, {
                            changedFilesCount: plan.targetFiles.length
                        });
                        // Report Tavily usage if applicable
                        if (plan.toolId === 'tavily-mcp' && result.metrics?.queriesPerformed) {
                            await supabase_metrics_reporter_1.metricsReporter.reportTavilyUsage(baseContext.repository.name, baseContext.pr.prNumber, role, result.metrics.queriesPerformed, result.executionTime);
                        }
                        this.logger.info(`✓ Tool ${plan.toolId} completed for role ${role} in ${result.executionTime}ms`);
                    }
                    catch (error) {
                        this.logger.error(`✗ Tool ${plan.toolId} failed for role ${role}: ${error}`);
                        const errorResult = {
                            success: false,
                            toolId: plan.toolId,
                            executionTime: Date.now() - startTime,
                            error: {
                                code: 'EXECUTION_ERROR',
                                message: String(error),
                                recoverable: true
                            }
                        };
                        toolResults.set(role, errorResult);
                        // Report failed execution metrics
                        await supabase_metrics_reporter_1.metricsReporter.reportToolExecution(plan.toolId, tool.type, role, baseContext.repository.name, baseContext.pr.prNumber, errorResult, {
                            changedFilesCount: plan.targetFiles.length
                        });
                    }
                }
                results.set(plan.toolId, toolResults);
            });
            // Wait for all tools in this priority group
            await Promise.all(groupPromises);
        }
        return results;
    }
    /**
     * Filter files that are relevant for a specific tool
     */
    filterFilesForTool(tool, changedFiles) {
        // Check if tool has file type restrictions
        const capabilities = tool.capabilities;
        return changedFiles.filter(file => {
            // Skip deleted files for most tools
            if (file.status === 'D' && !this.toolHandlesDeletedFiles(tool.id)) {
                return false;
            }
            // Check language compatibility
            const fileLanguage = this.detectLanguage(file.path);
            if (capabilities.some(cap => cap.languages &&
                cap.languages.length > 0 &&
                !cap.languages.includes(fileLanguage))) {
                return false;
            }
            // Check file type compatibility
            const fileExt = path.extname(file.path).toLowerCase();
            if (capabilities.some(cap => cap.fileTypes &&
                cap.fileTypes.length > 0 &&
                !cap.fileTypes.includes(fileExt))) {
                return false;
            }
            return true;
        });
    }
    /**
     * Determine if tool analyzes all files regardless of changes
     */
    isGlobalTool(toolId) {
        const globalTools = [
            'tavily-mcp', // Web search
            'context-mcp', // Context retrieval
            'knowledge-graph-mcp', // Knowledge extraction
            'git-mcp' // Repository analysis
        ];
        return globalTools.includes(toolId);
    }
    /**
     * Calculate execution priority for tools
     */
    calculatePriority(toolId, targetFiles) {
        // Higher number = higher priority
        // Critical security tools get highest priority
        if (toolId.includes('security') || toolId === 'semgrep-mcp') {
            return 100;
        }
        // Dependency tools are high priority
        if (toolId.includes('dependency') || toolId === 'npm-audit-direct') {
            return 90;
        }
        // Code quality tools
        if (toolId.includes('eslint') || toolId.includes('sonar')) {
            return 80;
        }
        // Global analysis tools
        if (this.isGlobalTool(toolId)) {
            return 70;
        }
        // Performance tools
        if (toolId.includes('performance') || toolId.includes('lighthouse')) {
            return 60;
        }
        // Default priority based on file count
        return 50 + Math.min(targetFiles.length, 10);
    }
    /**
     * Check if tool handles deleted files
     */
    toolHandlesDeletedFiles(toolId) {
        const deletionAwareTools = [
            'git-mcp',
            'dependency-cruiser-direct',
            'madge-direct'
        ];
        return deletionAwareTools.includes(toolId);
    }
    /**
     * Detect language from file path
     */
    detectLanguage(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const languageMap = {
            '.js': 'javascript',
            '.jsx': 'javascript',
            '.ts': 'typescript',
            '.tsx': 'typescript',
            '.py': 'python',
            '.java': 'java',
            '.go': 'go',
            '.rs': 'rust',
            '.rb': 'ruby',
            '.php': 'php',
            '.cs': 'csharp',
            '.cpp': 'cpp',
            '.c': 'c',
            '.swift': 'swift',
            '.kt': 'kotlin',
            '.scala': 'scala',
            '.r': 'r',
            '.m': 'objc',
            '.mm': 'objc'
        };
        return languageMap[ext] || 'unknown';
    }
}
exports.ParallelToolExecutor = ParallelToolExecutor;
// Export singleton
exports.parallelToolExecutor = new ParallelToolExecutor();
//# sourceMappingURL=parallel-tool-executor.js.map