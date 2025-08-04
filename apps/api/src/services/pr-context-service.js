"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRContextService = void 0;
const axios_1 = __importDefault(require("axios"));
const ModelVersionSync_1 = require("@codequal/core/services/model-selection/ModelVersionSync");
const utils_1 = require("@codequal/core/utils");
const logger = (0, utils_1.createLogger)('PRContextService');
/**
 * PR Context Service - handles GitHub/GitLab integration for PR details and diff analysis
 */
class PRContextService {
    constructor() {
        this.githubApiBase = 'https://api.github.com';
        this.gitlabApiBase = 'https://gitlab.com/api/v4';
    }
    /**
     * Fetch PR details from GitHub or GitLab
     */
    async fetchPRDetails(repositoryUrl, prNumber, accessToken) {
        try {
            const repoInfo = this.parseRepositoryUrl(repositoryUrl);
            if (repoInfo.platform === 'github') {
                return this.fetchGitHubPRDetails(repoInfo, prNumber, accessToken);
            }
            else if (repoInfo.platform === 'gitlab') {
                return this.fetchGitLabPRDetails(repoInfo, prNumber, accessToken);
            }
            else {
                throw new Error(`Unsupported platform: ${repoInfo.platform}`);
            }
        }
        catch (error) {
            logger.error('Failed to fetch PR details:', error);
            // Re-throw parsing and platform errors directly for better test compatibility
            if (error instanceof Error && (error.message.includes('Unable to parse repository URL') ||
                error.message.includes('Unsupported platform'))) {
                throw error;
            }
            throw new Error(`PR fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get PR diff data
     */
    async getPRDiff(prDetails) {
        try {
            const repoInfo = this.parseRepositoryUrl(prDetails.url);
            if (repoInfo.platform === 'github') {
                return this.getGitHubDiff(repoInfo, prDetails.number);
            }
            else if (repoInfo.platform === 'gitlab') {
                return this.getGitLabDiff(repoInfo, prDetails.number);
            }
            else {
                throw new Error(`Unsupported platform: ${repoInfo.platform}`);
            }
        }
        catch (error) {
            logger.error('Failed to fetch PR diff:', error);
            throw new Error(`Diff fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Extract changed files from diff
     */
    extractChangedFiles(diff) {
        return diff.files.map(file => file.filename);
    }
    /**
     * Analyze changes for impact and complexity
     */
    analyzeChanges(diff) {
        const files = diff.files;
        const totalChanges = diff.totalChanges;
        // Analyze impact level
        const impactLevel = this.calculateImpactLevel(files, totalChanges);
        // Categorize changes
        const categories = this.categorizeChanges(files);
        // Identify affected areas
        const affectedAreas = this.identifyAffectedAreas(files);
        // Assess risk factors
        const riskFactors = this.assessRiskFactors(files);
        // Calculate complexity
        const complexity = this.calculateComplexity(files, totalChanges);
        return {
            impactLevel,
            categories,
            affectedAreas,
            riskFactors,
            complexity
        };
    }
    /**
     * Detect primary programming language
     */
    async detectPrimaryLanguage(repositoryUrl, changedFiles) {
        try {
            // Analyze file extensions in changed files
            const extensions = changedFiles
                .map(file => this.getFileExtension(file))
                .filter(ext => ext !== '');
            // Count extensions
            const extensionCounts = extensions.reduce((counts, ext) => {
                counts[ext] = (counts[ext] || 0) + 1;
                return counts;
            }, {});
            // Map extensions to languages
            const languageCounts = Object.entries(extensionCounts).reduce((counts, [ext, count]) => {
                const language = this.mapExtensionToLanguage(ext);
                if (language) {
                    counts[language] = (counts[language] || 0) + count;
                }
                return counts;
            }, {});
            // Find most common language
            const primaryLanguage = Object.entries(languageCounts)
                .sort(([, a], [, b]) => b - a)[0]?.[0] || 'unknown';
            return primaryLanguage;
        }
        catch (error) {
            logger.error('Failed to detect primary language:', error);
            return 'unknown';
        }
    }
    /**
     * Estimate repository size category
     */
    async estimateRepositorySize(repositoryUrl) {
        try {
            const repoInfo = this.parseRepositoryUrl(repositoryUrl);
            if (repoInfo.platform === 'github') {
                const response = await axios_1.default.get(`${this.githubApiBase}/repos/${repoInfo.owner}/${repoInfo.repo}`, { headers: this.getHeaders() });
                const sizeKB = response.data.size; // GitHub returns size in KB
                if (sizeKB < 1000)
                    return ModelVersionSync_1.RepositorySizeCategory.SMALL; // < 1MB
                if (sizeKB < 50000)
                    return ModelVersionSync_1.RepositorySizeCategory.MEDIUM; // < 50MB
                return ModelVersionSync_1.RepositorySizeCategory.LARGE; // >= 50MB
            }
            // Default to medium if we can't determine size
            return ModelVersionSync_1.RepositorySizeCategory.MEDIUM;
        }
        catch (error) {
            logger.error('Failed to estimate repository size:', error);
            return ModelVersionSync_1.RepositorySizeCategory.MEDIUM;
        }
    }
    // Private helper methods
    parseRepositoryUrl(url) {
        // GitHub patterns
        const githubMatch = url.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/);
        if (githubMatch) {
            return {
                platform: 'github',
                owner: githubMatch[1],
                repo: githubMatch[2]
            };
        }
        // GitLab patterns
        const gitlabMatch = url.match(/gitlab\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/);
        if (gitlabMatch) {
            return {
                platform: 'gitlab',
                owner: gitlabMatch[1],
                repo: gitlabMatch[2]
            };
        }
        // Check for other common platforms (unsupported)
        if (url.includes('bitbucket.org') || url.includes('gitlab.') || url.includes('github.')) {
            const match = url.match(/[/:]([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/);
            if (match) {
                return {
                    platform: 'unknown',
                    owner: match[1],
                    repo: match[2]
                };
            }
        }
        throw new Error(`Unable to parse repository URL: ${url}`);
    }
    async fetchGitHubPRDetails(repoInfo, prNumber, accessToken) {
        try {
            const headers = this.getHeaders(accessToken);
            const response = await axios_1.default.get(`${this.githubApiBase}/repos/${repoInfo.owner}/${repoInfo.repo}/pulls/${prNumber}`, { headers });
            const pr = response.data;
            // Validate required fields
            if (!pr || typeof pr !== 'object') {
                throw new Error('Invalid PR data received from GitHub API');
            }
            if (!pr.user || !pr.base || !pr.head) {
                throw new Error('Incomplete PR data received from GitHub API');
            }
            return {
                number: pr.number || 0,
                title: pr.title || 'Untitled PR',
                description: pr.body || '',
                author: pr.user?.login || 'unknown',
                baseBranch: pr.base?.ref || 'unknown',
                headBranch: pr.head?.ref || 'unknown',
                state: pr.state === 'closed' && pr.merged_at ? 'merged' : (pr.state || 'open'),
                url: pr.html_url || '',
                createdAt: new Date(pr.created_at || Date.now()),
                updatedAt: new Date(pr.updated_at || Date.now()),
                changedFiles: pr.changed_files || 0,
                additions: pr.additions || 0,
                deletions: pr.deletions || 0
            };
        }
        catch (error) {
            logger.error('Failed to fetch GitHub PR details:', error);
            throw new Error(`GitHub PR fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async fetchGitLabPRDetails(repoInfo, prNumber, accessToken) {
        try {
            const headers = this.getHeaders(accessToken);
            const projectPath = encodeURIComponent(`${repoInfo.owner}/${repoInfo.repo}`);
            const response = await axios_1.default.get(`${this.gitlabApiBase}/projects/${projectPath}/merge_requests/${prNumber}`, { headers });
            const mr = response.data;
            // Validate required fields
            if (!mr || typeof mr !== 'object') {
                throw new Error('Invalid MR data received from GitLab API');
            }
            if (!mr.author) {
                throw new Error('Incomplete MR data received from GitLab API');
            }
            return {
                number: mr.iid || 0,
                title: mr.title || 'Untitled MR',
                description: mr.description || '',
                author: mr.author?.username || 'unknown',
                baseBranch: mr.target_branch || 'unknown',
                headBranch: mr.source_branch || 'unknown',
                state: mr.state || 'opened',
                url: mr.web_url || '',
                createdAt: new Date(mr.created_at || Date.now()),
                updatedAt: new Date(mr.updated_at || Date.now()),
                changedFiles: mr.changes_count || 0,
                additions: 0, // GitLab doesn't provide this directly
                deletions: 0 // GitLab doesn't provide this directly
            };
        }
        catch (error) {
            logger.error('Failed to fetch GitLab MR details:', error);
            throw new Error(`GitLab MR fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async getGitHubDiff(repoInfo, prNumber) {
        try {
            const headers = this.getHeaders();
            const response = await axios_1.default.get(`${this.githubApiBase}/repos/${repoInfo.owner}/${repoInfo.repo}/pulls/${prNumber}/files`, { headers });
            if (!response.data || !Array.isArray(response.data)) {
                throw new Error('Invalid diff data received from GitHub API');
            }
            const files = response.data.map((file) => ({
                filename: file?.filename || 'unknown',
                status: file?.status || 'modified',
                additions: file?.additions || 0,
                deletions: file?.deletions || 0,
                changes: file?.changes || 0,
                patch: file?.patch,
                previousFilename: file?.previous_filename
            }));
            const totalAdditions = files.reduce((sum, file) => sum + (file.additions || 0), 0);
            const totalDeletions = files.reduce((sum, file) => sum + (file.deletions || 0), 0);
            const totalChanges = files.reduce((sum, file) => sum + (file.changes || 0), 0);
            return {
                files,
                totalAdditions,
                totalDeletions,
                totalChanges
            };
        }
        catch (error) {
            logger.error('Failed to fetch GitHub diff:', error);
            throw new Error(`GitHub diff fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async getGitLabDiff(repoInfo, prNumber) {
        try {
            const headers = this.getHeaders();
            const projectPath = encodeURIComponent(`${repoInfo.owner}/${repoInfo.repo}`);
            const response = await axios_1.default.get(`${this.gitlabApiBase}/projects/${projectPath}/merge_requests/${prNumber}/changes`, { headers });
            if (!response.data || !response.data.changes || !Array.isArray(response.data.changes)) {
                throw new Error('Invalid diff data received from GitLab API');
            }
            const changes = response.data.changes;
            const files = changes.map((file) => ({
                filename: file?.new_path || 'unknown',
                status: file?.new_file ? 'added' : file?.deleted_file ? 'deleted' : 'modified',
                additions: 0, // GitLab doesn't provide line-level stats easily
                deletions: 0,
                changes: 1, // Simplified - each file counts as 1 change
                patch: file?.diff,
                previousFilename: file?.old_path !== file?.new_path ? file?.old_path : undefined
            }));
            return {
                files,
                totalAdditions: 0,
                totalDeletions: 0,
                totalChanges: files.length
            };
        }
        catch (error) {
            logger.error('Failed to fetch GitLab diff:', error);
            throw new Error(`GitLab diff fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    getHeaders(accessToken) {
        const headers = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'CodeQual-API/1.0'
        };
        if (accessToken) {
            headers['Authorization'] = `token ${accessToken}`;
        }
        return headers;
    }
    calculateImpactLevel(files, totalChanges) {
        const criticalFiles = files.filter(f => this.isCriticalFile(f.filename)).length;
        const coreFiles = files.filter(f => this.isCoreFile(f.filename)).length;
        if (criticalFiles > 0 || totalChanges > 1000)
            return 'critical';
        if (coreFiles > 3 || totalChanges > 500)
            return 'high';
        if (files.length > 10 || totalChanges > 100)
            return 'medium';
        return 'low';
    }
    categorizeChanges(files) {
        const categories = new Set();
        files.forEach(file => {
            if (this.isTestFile(file.filename))
                categories.add('tests');
            if (this.isDocumentationFile(file.filename))
                categories.add('documentation');
            if (this.isConfigFile(file.filename))
                categories.add('configuration');
            if (this.isSecurityFile(file.filename))
                categories.add('security');
            if (this.isDatabaseFile(file.filename))
                categories.add('database');
            if (this.isUIFile(file.filename))
                categories.add('ui');
            if (this.isAPIFile(file.filename))
                categories.add('api');
            if (!categories.size)
                categories.add('core-logic');
        });
        return Array.from(categories);
    }
    identifyAffectedAreas(files) {
        const areas = new Set();
        files.forEach(file => {
            const pathParts = file.filename.split('/');
            if (pathParts.length > 1) {
                areas.add(pathParts[0]); // First directory
                if (pathParts.length > 2) {
                    areas.add(`${pathParts[0]}/${pathParts[1]}`); // First two directories
                }
            }
        });
        return Array.from(areas).slice(0, 10); // Limit to top 10 areas
    }
    assessRiskFactors(files) {
        const risks = [];
        if (files.some(f => this.isCriticalFile(f.filename))) {
            risks.push('Critical system files modified');
        }
        if (files.some(f => this.isSecurityFile(f.filename))) {
            risks.push('Security-related changes');
        }
        if (files.some(f => this.isDatabaseFile(f.filename))) {
            risks.push('Database schema changes');
        }
        if (files.filter(f => f.status === 'deleted').length > 5) {
            risks.push('Many files deleted');
        }
        if (files.some(f => f.changes > 200)) {
            risks.push('Large file modifications');
        }
        return risks;
    }
    calculateComplexity(files, totalChanges) {
        let complexity = 0;
        // Base complexity from change volume
        complexity += Math.min(totalChanges / 100, 5); // Max 5 points from volume
        // File count complexity
        complexity += Math.min(files.length / 10, 3); // Max 3 points from file count
        // File type complexity
        files.forEach(file => {
            if (this.isCriticalFile(file.filename))
                complexity += 1;
            if (this.isSecurityFile(file.filename))
                complexity += 0.5;
            if (this.isDatabaseFile(file.filename))
                complexity += 0.5;
        });
        return Math.round(Math.min(complexity, 10) * 10) / 10; // Scale 0-10, round to 1 decimal
    }
    // File type detection helpers
    isCriticalFile(filename) {
        const criticalPatterns = [
            /package\.json$/,
            /package-lock\.json$/,
            /yarn\.lock$/,
            /Dockerfile$/,
            /docker-compose/,
            /\.env/,
            /config/,
            /settings/
        ];
        return criticalPatterns.some(pattern => pattern.test(filename));
    }
    isCoreFile(filename) {
        return filename.includes('/src/') || filename.includes('/lib/') || filename.includes('/app/');
    }
    isTestFile(filename) {
        return filename.includes('test') || filename.includes('spec') || filename.includes('__tests__');
    }
    isDocumentationFile(filename) {
        return /\.(md|txt|rst|adoc)$/i.test(filename) || filename.includes('docs/');
    }
    isConfigFile(filename) {
        return /\.(json|yaml|yml|toml|ini|conf)$/i.test(filename) || filename.includes('config');
    }
    isSecurityFile(filename) {
        return filename.includes('auth') || filename.includes('security') || filename.includes('permission');
    }
    isDatabaseFile(filename) {
        return filename.includes('migration') || filename.includes('schema') || filename.includes('model');
    }
    isUIFile(filename) {
        return /\.(css|scss|less|vue|jsx|tsx)$/i.test(filename) || filename.includes('component');
    }
    isAPIFile(filename) {
        return filename.includes('api/') || filename.includes('endpoint') || filename.includes('route');
    }
    getFileExtension(filename) {
        const match = filename.match(/\.([^.]+)$/);
        return match ? match[1].toLowerCase() : '';
    }
    mapExtensionToLanguage(extension) {
        const extensionMap = {
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescript',
            'py': 'python',
            'java': 'java',
            'c': 'c',
            'cpp': 'cpp',
            'cc': 'cpp',
            'cxx': 'cpp',
            'cs': 'csharp',
            'php': 'php',
            'rb': 'ruby',
            'go': 'go',
            'rs': 'rust',
            'swift': 'swift',
            'kt': 'kotlin',
            'scala': 'scala',
            'clj': 'clojure',
            'hs': 'haskell',
            'ml': 'ocaml',
            'r': 'r',
            'sql': 'sql',
            'sh': 'bash',
            'bash': 'bash',
            'zsh': 'bash',
            'fish': 'bash'
        };
        return extensionMap[extension] || null;
    }
}
exports.PRContextService = PRContextService;
