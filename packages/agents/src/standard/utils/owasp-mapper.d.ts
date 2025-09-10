/**
 * OWASP Top 10 2021 Mapping Utility
 * Provides intelligent mapping of security issues to OWASP categories
 */
export interface OWASPCategory {
    code: string;
    name: string;
    description: string;
    patterns: SecurityPattern[];
    priority: number;
}
export interface SecurityPattern {
    keywords?: string[];
    categories?: string[];
    types?: string[];
    filePatterns?: RegExp[];
    severities?: string[];
    confidence: number;
    requireAll?: boolean;
}
/**
 * OWASP Top 10 2021 Categories with intelligent pattern matching
 */
export declare const OWASP_CATEGORIES: OWASPCategory[];
/**
 * Enhanced OWASP Mapper with machine learning-style scoring
 */
export declare class OWASPMapper {
    private categories;
    constructor(customCategories?: OWASPCategory[]);
    /**
     * Map a security issue to OWASP category
     */
    mapIssue(issue: {
        message?: string;
        description?: string;
        category?: string;
        type?: string;
        severity?: string;
        location?: {
            file?: string;
        };
    }): {
        category: string;
        confidence: number;
    };
    /**
     * Score how well a pattern matches an issue
     */
    private scorePattern;
    /**
     * Get all issues mapped to OWASP categories
     */
    mapMultipleIssues(issues: any[]): Record<string, number>;
    /**
     * Get OWASP category details
     */
    getCategoryDetails(code: string): OWASPCategory | undefined;
    /**
     * Add or update custom patterns for specific use cases
     */
    addCustomPattern(categoryCode: string, pattern: SecurityPattern): void;
}
export declare const owaspMapper: OWASPMapper;
