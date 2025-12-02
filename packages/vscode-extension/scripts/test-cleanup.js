"use strict";
/**
 * Test Cleanup Utility
 *
 * Resets test repository to pre-fix state for consistent integration testing.
 * This ensures each test scenario starts with the same set of issues to detect/fix.
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
exports.TestRepoCleanup = void 0;
exports.cleanupLSPAffectedFiles = cleanupLSPAffectedFiles;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Test Repository Cleaner
 * Provides multiple strategies for resetting test repos to clean state
 */
class TestRepoCleanup {
    constructor(options) {
        this.options = {
            branch: 'main',
            verbose: false,
            ...options,
        };
    }
    /**
     * Execute cleanup using the configured mode
     */
    async cleanup() {
        switch (this.options.mode) {
            case 'git-reset':
                return this.gitReset();
            case 'git-stash':
                return this.gitStash();
            case 'fresh-clone':
                return this.freshClone();
            default:
                throw new Error(`Unknown cleanup mode: ${this.options.mode}`);
        }
    }
    /**
     * Mode 1: Git Reset - Discard all local changes
     * Fast, but loses any uncommitted work
     */
    async gitReset() {
        const { repoPath, branch, verbose } = this.options;
        try {
            // Check for modified files first
            const status = (0, child_process_1.execSync)('git status --porcelain', { cwd: repoPath, encoding: 'utf-8' });
            const modifiedFiles = status.split('\n').filter(line => line.trim()).length;
            if (modifiedFiles === 0) {
                return {
                    success: true,
                    mode: 'git-reset',
                    filesReset: 0,
                    message: 'Repository already clean',
                };
            }
            if (verbose) {
                console.log(`Found ${modifiedFiles} modified files, resetting...`);
            }
            // Reset all changes
            (0, child_process_1.execSync)('git checkout -- .', { cwd: repoPath });
            // Clean untracked files
            (0, child_process_1.execSync)('git clean -fd', { cwd: repoPath });
            // Ensure we're on the correct branch
            (0, child_process_1.execSync)(`git checkout ${branch}`, { cwd: repoPath });
            return {
                success: true,
                mode: 'git-reset',
                filesReset: modifiedFiles,
                message: `Reset ${modifiedFiles} files to clean state`,
            };
        }
        catch (error) {
            return {
                success: false,
                mode: 'git-reset',
                filesReset: 0,
                message: `Git reset failed: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    }
    /**
     * Mode 2: Git Stash - Save changes for later
     * Preserves work while providing clean state
     */
    async gitStash() {
        const { repoPath, verbose } = this.options;
        try {
            const status = (0, child_process_1.execSync)('git status --porcelain', { cwd: repoPath, encoding: 'utf-8' });
            const modifiedFiles = status.split('\n').filter(line => line.trim()).length;
            if (modifiedFiles === 0) {
                return {
                    success: true,
                    mode: 'git-stash',
                    filesReset: 0,
                    message: 'Repository already clean',
                };
            }
            if (verbose) {
                console.log(`Stashing ${modifiedFiles} modified files...`);
            }
            // Stash all changes including untracked files
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            (0, child_process_1.execSync)(`git stash push -u -m "test-cleanup-${timestamp}"`, { cwd: repoPath });
            return {
                success: true,
                mode: 'git-stash',
                filesReset: modifiedFiles,
                message: `Stashed ${modifiedFiles} files (can recover with 'git stash pop')`,
            };
        }
        catch (error) {
            return {
                success: false,
                mode: 'git-stash',
                filesReset: 0,
                message: `Git stash failed: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    }
    /**
     * Mode 3: Fresh Clone - Clone to isolated directory
     * Most reliable, completely isolated testing
     */
    async freshClone() {
        const { repoPath, branch, verbose } = this.options;
        try {
            // Get remote URL
            const remoteUrl = (0, child_process_1.execSync)('git remote get-url origin', {
                cwd: repoPath,
                encoding: 'utf-8'
            }).trim();
            // Create timestamped clone directory
            const timestamp = Date.now();
            const parentDir = path.dirname(repoPath);
            const repoName = path.basename(repoPath);
            const cloneDir = path.join(parentDir, `${repoName}-test-${timestamp}`);
            if (verbose) {
                console.log(`Cloning fresh copy to ${cloneDir}...`);
            }
            // Clone the repo
            (0, child_process_1.execSync)(`git clone --branch ${branch} --single-branch ${remoteUrl} ${cloneDir}`, {
                encoding: 'utf-8',
            });
            return {
                success: true,
                mode: 'fresh-clone',
                filesReset: -1, // All files are fresh
                message: `Fresh clone created at: ${cloneDir}`,
            };
        }
        catch (error) {
            return {
                success: false,
                mode: 'fresh-clone',
                filesReset: 0,
                message: `Fresh clone failed: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    }
    /**
     * List stashed changes
     */
    listStashes() {
        try {
            const stashes = (0, child_process_1.execSync)('git stash list', {
                cwd: this.options.repoPath,
                encoding: 'utf-8'
            });
            return stashes.split('\n').filter(s => s.includes('test-cleanup'));
        }
        catch {
            return [];
        }
    }
    /**
     * Restore most recent stash
     */
    restoreStash() {
        try {
            (0, child_process_1.execSync)('git stash pop', { cwd: this.options.repoPath });
            return true;
        }
        catch {
            return false;
        }
    }
}
exports.TestRepoCleanup = TestRepoCleanup;
/**
 * Cleanup specific files from LSP actions
 * Only resets files that had fixes applied
 */
function cleanupLSPAffectedFiles(repoPath, lspActionsPath) {
    try {
        const lspData = JSON.parse(fs.readFileSync(lspActionsPath, 'utf-8'));
        const affectedFiles = new Set();
        // Extract unique file paths from LSP actions
        for (const action of lspData.actions || []) {
            if (action.filePath) {
                affectedFiles.add(action.filePath);
            }
        }
        if (affectedFiles.size === 0) {
            return {
                success: true,
                mode: 'lsp-targeted',
                filesReset: 0,
                message: 'No files to reset',
            };
        }
        // Reset only affected files
        const fileList = Array.from(affectedFiles);
        for (const file of fileList) {
            const fullPath = path.join(repoPath, file);
            if (fs.existsSync(fullPath)) {
                (0, child_process_1.execSync)(`git checkout -- "${file}"`, { cwd: repoPath });
            }
        }
        return {
            success: true,
            mode: 'lsp-targeted',
            filesReset: fileList.length,
            message: `Reset ${fileList.length} files affected by LSP actions`,
        };
    }
    catch (error) {
        return {
            success: false,
            mode: 'lsp-targeted',
            filesReset: 0,
            message: `Targeted cleanup failed: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
}
// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.log(`
Usage: npx ts-node test-cleanup.ts <mode> <repo-path> [options]

Modes:
  git-reset    - Discard all local changes (fast, destructive)
  git-stash    - Save changes to stash (recoverable)
  fresh-clone  - Clone to new directory (isolated)

Options:
  --branch=<name>  - Branch to reset to (default: main)
  --verbose        - Show detailed output

Examples:
  npx ts-node test-cleanup.ts git-reset /path/to/repo
  npx ts-node test-cleanup.ts git-stash /path/to/repo --verbose
  npx ts-node test-cleanup.ts fresh-clone /path/to/repo --branch=develop
`);
        process.exit(1);
    }
    const mode = args[0];
    const repoPath = args[1];
    const verbose = args.includes('--verbose');
    const branchArg = args.find(a => a.startsWith('--branch='));
    const branch = branchArg ? branchArg.split('=')[1] : 'main';
    const cleaner = new TestRepoCleanup({
        repoPath,
        mode,
        branch,
        verbose,
    });
    cleaner.cleanup().then(result => {
        console.log('\n📋 Cleanup Result:');
        console.log(`   Mode: ${result.mode}`);
        console.log(`   Success: ${result.success ? '✅' : '❌'}`);
        console.log(`   Files: ${result.filesReset}`);
        console.log(`   Message: ${result.message}`);
        process.exit(result.success ? 0 : 1);
    });
}
//# sourceMappingURL=test-cleanup.js.map