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
export interface LocationResult {
    file: string;
    line: number;
    column?: number;
    confidence: number;
    strategy: 'exact' | 'fuzzy' | 'ai' | 'fallback';
    codeSnippet?: string;
    context?: {
        before: string[];
        after: string[];
    };
    alternativeLocations?: LocationResult[];
    performance?: {
        searchTime: number;
        cacheHit: boolean;
    };
}
export interface IssueToLocate {
    message: string;
    description?: string;
    type?: string;
    category?: string;
    file?: string;
    line?: number;
    column?: number;
    codePattern?: string;
    functionName?: string;
    className?: string;
}
export interface LocationServiceConfig {
    cacheSize?: number;
    enableAI?: boolean;
    aiModel?: string;
    searchTimeout?: number;
    contextLines?: number;
    enableMetrics?: boolean;
    projectRoot?: string;
    excludePatterns?: string[];
    preferredStrategies?: Array<'exact' | 'fuzzy' | 'ai'>;
}
export declare class UnifiedLocationService {
    private cache;
    private metrics;
    private readonly config;
    private aiService?;
    private fileCache;
    constructor(config?: LocationServiceConfig);
    /**
     * Find location for an issue using multiple strategies
     */
    findLocation(issue: IssueToLocate): Promise<LocationResult>;
    /**
     * Exact location search using file and line from issue
     */
    private exactLocationSearch;
    /**
     * Fuzzy location search using patterns and heuristics
     */
    private fuzzyLocationSearch;
    /**
     * AI-powered location search
     */
    private aiLocationSearch;
    /**
     * Fallback location search - best effort
     */
    private fallbackLocationSearch;
    /**
     * Extract code snippet with context
     */
    private extractCodeSnippet;
    /**
     * Helper methods
     */
    private getCacheKey;
    private getFromCache;
    private addToCache;
    private generateSearchPatterns;
    private findRelevantFiles;
    private searchInContent;
    private calculateConfidence;
    private resolveFilePath;
    private getRelativePath;
    private fileExists;
    private readFileContent;
    private extractFileHint;
    private buildAIPrompt;
    private updateMetrics;
    /**
     * Set AI service for enhanced location finding
     */
    setAIService(service: any): void;
    /**
     * Get performance metrics
     */
    getMetrics(): typeof this.metrics;
    /**
     * Clear cache
     */
    clearCache(): void;
    /**
     * Batch location finding for performance
     */
    findLocations(issues: IssueToLocate[]): Promise<LocationResult[]>;
}
export declare function createUnifiedLocationService(config?: LocationServiceConfig): UnifiedLocationService;
export default UnifiedLocationService;
