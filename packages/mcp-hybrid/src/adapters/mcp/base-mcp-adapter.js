"use strict";
/**
 * Base MCP Adapter
 * Provides common functionality for all MCP tool integrations
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
exports.BaseMCPAdapter = void 0;
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
const events_1 = require("events");
class BaseMCPAdapter extends events_1.EventEmitter {
    constructor() {
        super();
        this.type = 'mcp';
        this.isInitialized = false;
        this.mcpServerCommand = 'npx';
    }
    /**
     * Initialize MCP server if not already running
     */
    async initializeMCPServer() {
        if (this.isInitialized && this.mcpProcess) {
            return;
        }
        return new Promise((resolve, reject) => {
            console.info(`Initializing MCP server for ${this.id}...`);
            // Start MCP server
            this.mcpProcess = (0, child_process_1.spawn)(this.mcpServerCommand, this.mcpServerArgs, {
                stdio: ['pipe', 'pipe', 'pipe'],
                env: {
                    ...process.env,
                    NODE_ENV: 'production'
                }
            });
            this.mcpProcess.on('error', (error) => {
                reject(new Error(`Failed to start ${this.name} MCP server: ${error.message}`));
            });
            // Handle server stderr for debugging
            if (this.mcpProcess.stderr) {
                this.mcpProcess.stderr.on('data', (data) => {
                    console.error(`${this.id} MCP server error:`, data.toString());
                });
            }
            // Wait for server to be ready
            setTimeout(() => {
                this.isInitialized = true;
                console.info(`${this.id} MCP server initialized`);
                this.emit('initialized');
                resolve();
            }, 2000);
        });
    }
    /**
     * Execute MCP command via JSON-RPC
     */
    async executeMCPCommand(command) {
        if (!this.mcpProcess || !this.isInitialized) {
            throw new Error(`${this.name} MCP server not initialized`);
        }
        // Store reference to avoid TypeScript flow analysis issues
        const process = this.mcpProcess;
        if (!process.stdin || !process.stdout) {
            throw new Error(`${this.name} MCP server streams not available`);
        }
        return new Promise((resolve, reject) => {
            const request = {
                jsonrpc: '2.0',
                method: command.method,
                params: command.params || {},
                id: Date.now()
            };
            // Handle response
            const handleResponse = (data) => {
                try {
                    const response = JSON.parse(data.toString());
                    if (response.id === request.id) {
                        if (response.error) {
                            reject(new Error(response.error.message));
                        }
                        else {
                            resolve(response.result);
                        }
                        if (process.stdout) {
                            process.stdout.off('data', handleResponse);
                        }
                    }
                }
                catch (error) {
                    // Partial data, wait for more
                }
            };
            // Add listener first
            if (process.stdout) {
                process.stdout.on('data', handleResponse);
            }
            // Then send command
            if (process.stdin) {
                process.stdin.write(JSON.stringify(request) + '\n');
            }
            // Timeout
            setTimeout(() => {
                if (process.stdout) {
                    process.stdout.off('data', handleResponse);
                }
                reject(new Error(`${this.name} MCP command timeout`));
            }, this.requirements.timeout);
        });
    }
    /**
     * Create temporary directory for file analysis
     */
    async createTempDirectory(context) {
        const tempDir = `/tmp/${this.id}-${context.userContext.userId}-${Date.now()}`;
        await fs.mkdir(tempDir, { recursive: true });
        return tempDir;
    }
    /**
     * Write files to temporary directory
     */
    async writeFilesToTemp(files, tempDir) {
        for (const file of files) {
            const filePath = path.join(tempDir, file.path);
            await fs.mkdir(path.dirname(filePath), { recursive: true });
            await fs.writeFile(filePath, file.content);
        }
    }
    /**
     * Cleanup temporary directory
     */
    async cleanupTempDirectory(tempDir) {
        try {
            await fs.rm(tempDir, { recursive: true, force: true });
        }
        catch (error) {
            console.warn(`Failed to cleanup temp directory ${tempDir}:`, error);
        }
    }
    /**
     * Map severity from tool-specific to standard
     */
    mapSeverity(toolSeverity) {
        // Override in subclasses for tool-specific mapping
        const severityMap = {
            'error': 'high',
            'warning': 'medium',
            'info': 'low',
            'hint': 'info',
            '2': 'high',
            '1': 'medium',
            '0': 'low'
        };
        return severityMap[toolSeverity.toString().toLowerCase()] || 'info';
    }
    /**
     * Common health check implementation
     */
    async healthCheck() {
        try {
            // Try to initialize if not already done
            if (!this.isInitialized) {
                await this.initializeMCPServer();
            }
            // Send a simple health check command
            const result = await this.executeMCPCommand({
                method: 'health',
                params: {}
            }).catch(() => null);
            return result !== null;
        }
        catch {
            return false;
        }
    }
    /**
     * Cleanup MCP server process
     */
    async cleanup() {
        if (this.mcpProcess) {
            console.info(`Shutting down ${this.id} MCP server...`);
            this.mcpProcess.kill();
            this.mcpProcess = undefined;
            this.isInitialized = false;
        }
    }
    /**
     * Filter files based on supported extensions
     */
    filterSupportedFiles(files, supportedExtensions) {
        return files
            .filter(file => {
            const ext = path.extname(file.path).toLowerCase();
            return supportedExtensions.includes(ext) && file.changeType !== 'deleted';
        })
            .map(({ path, content }) => ({ path, content }));
    }
    /**
     * Create standardized error result
     */
    createErrorResult(error, startTime) {
        return {
            success: false,
            toolId: this.id,
            executionTime: Date.now() - startTime,
            error: {
                code: `${this.id.toUpperCase().replace(/-/g, '_')}_FAILED`,
                message: error.message,
                recoverable: true
            }
        };
    }
    /**
     * Create empty success result when no files to analyze
     */
    createEmptyResult(startTime) {
        return {
            success: true,
            toolId: this.id,
            executionTime: Date.now() - startTime,
            findings: [],
            metrics: {
                filesAnalyzed: 0
            }
        };
    }
}
exports.BaseMCPAdapter = BaseMCPAdapter;
//# sourceMappingURL=base-mcp-adapter.js.map