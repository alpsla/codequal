"use strict";
/**
 * Unified Location Service
 *
 * Consolidates all location finding functionality into a single, efficient service.
 * Replaces: LocationFinder, OptimizedLocationFinder, EnhancedLocationFinder,
 * AILocationFinder, LocationFinderEnhanced, LocationEnhancer
 *
 * Features:
 * - Intelligent caching with LRU eviction
 * - Multi-strategy location finding (exact, fuzzy, AI-powered)
 * - Performance monitoring and metrics
 * - Fallback strategies for robust location detection
 * - Code snippet extraction with context
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
exports.UnifiedLocationService = void 0;
exports.createUnifiedLocationService = createUnifiedLocationService;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const crypto_1 = require("crypto");
class UnifiedLocationService {
    constructor(config = {}) {
        this.cache = new Map();
        this.metrics = {
            totalSearches: 0,
            cacheHits: 0,
            exactMatches: 0,
            fuzzyMatches: 0,
            aiMatches: 0,
            fallbacks: 0,
            averageSearchTime: 0,
            failedSearches: 0
        };
        this.fileCache = new Map();
        this.config = {
            cacheSize: config.cacheSize ?? 1000,
            enableAI: config.enableAI ?? false,
            aiModel: config.aiModel ?? 'gpt-4',
            searchTimeout: config.searchTimeout ?? 5000,
            contextLines: config.contextLines ?? 3,
            enableMetrics: config.enableMetrics ?? true,
            projectRoot: config.projectRoot ?? process.cwd(),
            excludePatterns: config.excludePatterns ?? [
                'node_modules',
                'dist',
                'build',
                '.git',
                'coverage',
                '__tests__',
                '*.test.ts',
                '*.spec.ts'
            ],
            preferredStrategies: config.preferredStrategies ?? ['exact', 'fuzzy', 'ai']
        };
    }
    /**
     * Find location for an issue using multiple strategies
     */
    async findLocation(issue) {
        const startTime = Date.now();
        this.metrics.totalSearches++;
        // Check cache first
        const cacheKey = this.getCacheKey(issue);
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            this.metrics.cacheHits++;
            return {
                ...cached,
                performance: {
                    searchTime: Date.now() - startTime,
                    cacheHit: true
                }
            };
        }
        let result = null;
        // Try strategies in preferred order
        for (const strategy of this.config.preferredStrategies) {
            try {
                switch (strategy) {
                    case 'exact':
                        result = await this.exactLocationSearch(issue);
                        if (result)
                            this.metrics.exactMatches++;
                        break;
                    case 'fuzzy':
                        result = await this.fuzzyLocationSearch(issue);
                        if (result)
                            this.metrics.fuzzyMatches++;
                        break;
                    case 'ai':
                        if (this.config.enableAI && this.aiService) {
                            result = await this.aiLocationSearch(issue);
                            if (result)
                                this.metrics.aiMatches++;
                        }
                        break;
                }
                if (result && result.confidence > 0.7) {
                    break; // Found good match
                }
            }
            catch (error) {
                // Continue to next strategy
                console.warn(`Strategy ${strategy} failed:`, error);
            }
        }
        // Fallback if no good match found
        if (!result || result.confidence < 0.5) {
            result = await this.fallbackLocationSearch(issue);
            this.metrics.fallbacks++;
        }
        // Extract code snippet
        if (result && result.file && result.line) {
            const snippet = await this.extractCodeSnippet(result.file, result.line, result.column);
            if (snippet) {
                result.codeSnippet = snippet.code;
                result.context = snippet.context;
            }
        }
        // Add performance metrics
        result = {
            ...result,
            performance: {
                searchTime: Date.now() - startTime,
                cacheHit: false
            }
        };
        // Cache the result
        this.addToCache(cacheKey, result);
        // Update average search time
        this.updateMetrics(Date.now() - startTime);
        return result;
    }
    /**
     * Exact location search using file and line from issue
     */
    async exactLocationSearch(issue) {
        if (!issue.file || !issue.line) {
            return null;
        }
        const fullPath = this.resolveFilePath(issue.file);
        const exists = await this.fileExists(fullPath);
        if (!exists) {
            return null;
        }
        return {
            file: issue.file,
            line: issue.line,
            column: issue.column,
            confidence: 1.0,
            strategy: 'exact'
        };
    }
    /**
     * Fuzzy location search using patterns and heuristics
     */
    async fuzzyLocationSearch(issue) {
        const searchPatterns = this.generateSearchPatterns(issue);
        const candidates = [];
        // Search for patterns in likely files
        const files = await this.findRelevantFiles(issue);
        for (const file of files) {
            const content = await this.readFileContent(file);
            if (!content)
                continue;
            for (const pattern of searchPatterns) {
                const matches = this.searchInContent(content, pattern);
                for (const match of matches) {
                    candidates.push({
                        file: this.getRelativePath(file),
                        line: match.line,
                        column: match.column,
                        confidence: match.confidence * 0.8, // Fuzzy match penalty
                        strategy: 'fuzzy'
                    });
                }
            }
        }
        // Return best candidate
        return candidates.sort((a, b) => b.confidence - a.confidence)[0] || null;
    }
    /**
     * AI-powered location search
     */
    async aiLocationSearch(issue) {
        if (!this.aiService) {
            return null;
        }
        try {
            const prompt = this.buildAIPrompt(issue);
            const response = await this.aiService.findLocation(prompt);
            if (response && response.file && response.line) {
                return {
                    file: response.file,
                    line: response.line,
                    column: response.column,
                    confidence: response.confidence || 0.7,
                    strategy: 'ai',
                    alternativeLocations: response.alternatives
                };
            }
        }
        catch (error) {
            console.warn('AI location search failed:', error);
        }
        return null;
    }
    /**
     * Fallback location search - best effort
     */
    async fallbackLocationSearch(issue) {
        // Try to extract file hint from message
        const fileHint = this.extractFileHint(issue.message);
        // Default to main source file or entry point
        const defaultFile = fileHint || 'src/index.ts';
        return {
            file: defaultFile,
            line: 1,
            confidence: 0.1,
            strategy: 'fallback'
        };
    }
    /**
     * Extract code snippet with context
     */
    async extractCodeSnippet(file, line, column) {
        try {
            const fullPath = this.resolveFilePath(file);
            const content = await this.readFileContent(fullPath);
            if (!content || content.length === 0)
                return null;
            const lines = content; // Already an array of lines
            const targetLine = lines[line - 1];
            if (!targetLine)
                return null;
            // Get context lines
            const beforeStart = Math.max(0, line - 1 - this.config.contextLines);
            const afterEnd = Math.min(lines.length, line + this.config.contextLines);
            const before = lines.slice(beforeStart, line - 1);
            const after = lines.slice(line, afterEnd);
            // Highlight column if provided
            let code = targetLine;
            if (column && column > 0 && column <= targetLine.length) {
                code = targetLine.substring(0, column - 1) +
                    '>>>' + targetLine.substring(column - 1, column) + '<<<' +
                    targetLine.substring(column);
            }
            return {
                code,
                context: { before, after }
            };
        }
        catch (error) {
            console.warn('Failed to extract code snippet:', error);
            return null;
        }
    }
    /**
     * Helper methods
     */
    getCacheKey(issue) {
        const data = JSON.stringify({
            message: issue.message,
            type: issue.type,
            file: issue.file,
            line: issue.line
        });
        return (0, crypto_1.createHash)('md5').update(data).digest('hex');
    }
    getFromCache(key) {
        const entry = this.cache.get(key);
        if (entry) {
            // Check if cache entry is still fresh (5 minutes)
            if (Date.now() - entry.timestamp < 5 * 60 * 1000) {
                entry.hits++;
                return entry.result;
            }
            // Remove stale entry
            this.cache.delete(key);
        }
        return null;
    }
    addToCache(key, result) {
        // Implement LRU eviction
        if (this.cache.size >= this.config.cacheSize) {
            // Remove least recently used
            const lru = Array.from(this.cache.entries())
                .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
            if (lru) {
                this.cache.delete(lru[0]);
            }
        }
        this.cache.set(key, {
            result,
            timestamp: Date.now(),
            hits: 0
        });
    }
    generateSearchPatterns(issue) {
        const patterns = [];
        if (issue.codePattern) {
            patterns.push(issue.codePattern);
        }
        if (issue.functionName) {
            patterns.push(`function ${issue.functionName}`);
            patterns.push(`${issue.functionName}\\s*\\(`);
            patterns.push(`\\.${issue.functionName}\\s*=`);
        }
        if (issue.className) {
            patterns.push(`class ${issue.className}`);
            patterns.push(`interface ${issue.className}`);
            patterns.push(`type ${issue.className}`);
        }
        // Extract potential identifiers from message
        const identifiers = issue.message.match(/`([^`]+)`/g);
        if (identifiers) {
            patterns.push(...identifiers.map(id => id.replace(/`/g, '')));
        }
        return patterns;
    }
    async findRelevantFiles(issue) {
        // Implementation would scan project for relevant files
        // For now, return mock data
        return [];
    }
    searchInContent(content, pattern) {
        const matches = [];
        const regex = new RegExp(pattern, 'gi');
        content.forEach((lineContent, index) => {
            let match;
            while ((match = regex.exec(lineContent)) !== null) {
                matches.push({
                    line: index + 1,
                    column: match.index + 1,
                    confidence: this.calculateConfidence(pattern, lineContent, match)
                });
            }
        });
        return matches;
    }
    calculateConfidence(pattern, line, match) {
        // Simple confidence calculation
        let confidence = 0.5;
        // Exact match bonus
        if (match[0] === pattern) {
            confidence += 0.3;
        }
        // Whole word match bonus
        const wordBoundary = /\b/.test(line[match.index - 1] || '') &&
            /\b/.test(line[match.index + match[0].length] || '');
        if (wordBoundary) {
            confidence += 0.2;
        }
        return Math.min(confidence, 1.0);
    }
    resolveFilePath(file) {
        if (path.isAbsolute(file)) {
            return file;
        }
        return path.join(this.config.projectRoot, file);
    }
    getRelativePath(file) {
        return path.relative(this.config.projectRoot, file);
    }
    async fileExists(file) {
        try {
            await fs.access(file);
            return true;
        }
        catch {
            return false;
        }
    }
    async readFileContent(file) {
        // Check file cache first
        if (this.fileCache.has(file)) {
            return this.fileCache.get(file);
        }
        try {
            const content = await fs.readFile(file, 'utf-8');
            const lines = content.split('\n');
            // Cache for future use
            this.fileCache.set(file, lines);
            // Limit cache size
            if (this.fileCache.size > 100) {
                const firstKey = this.fileCache.keys().next().value;
                this.fileCache.delete(firstKey);
            }
            return lines;
        }
        catch {
            return [];
        }
    }
    extractFileHint(message) {
        // Try to extract file path from message
        const patterns = [
            /in\s+[`']?([^\s`']+\.[tj]sx?)[`']?/i,
            /file:\s*[`']?([^\s`']+\.[tj]sx?)[`']?/i,
            /at\s+[`']?([^\s`']+\.[tj]sx?)[`']?/i,
            /\(([^\s()]+\.[tj]sx?)(?::\d+)?\)/
        ];
        for (const pattern of patterns) {
            const match = message.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        return null;
    }
    buildAIPrompt(issue) {
        return `Find the exact location of this issue in the codebase:
Message: ${issue.message}
Type: ${issue.type || 'unknown'}
Category: ${issue.category || 'unknown'}
${issue.description ? `Description: ${issue.description}` : ''}
${issue.functionName ? `Function: ${issue.functionName}` : ''}
${issue.className ? `Class: ${issue.className}` : ''}

Return the file path and line number where this issue is most likely located.`;
    }
    updateMetrics(searchTime) {
        if (!this.config.enableMetrics)
            return;
        const total = this.metrics.totalSearches;
        const currentAvg = this.metrics.averageSearchTime;
        this.metrics.averageSearchTime = (currentAvg * (total - 1) + searchTime) / total;
    }
    /**
     * Set AI service for enhanced location finding
     */
    setAIService(service) {
        this.aiService = service;
        this.config.enableAI = true;
    }
    /**
     * Get performance metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }
    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        this.fileCache.clear();
    }
    /**
     * Batch location finding for performance
     */
    async findLocations(issues) {
        const results = await Promise.all(issues.map(issue => this.findLocation(issue)));
        return results;
    }
}
exports.UnifiedLocationService = UnifiedLocationService;
// Factory function for convenience
function createUnifiedLocationService(config) {
    return new UnifiedLocationService(config);
}
// Default export for easy migration
exports.default = UnifiedLocationService;
