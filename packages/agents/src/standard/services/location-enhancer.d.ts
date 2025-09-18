interface ILocationFinder {
    findExactLocation(issue: any, repoPath: string): Promise<any>;
}
import { ModelVersionSync } from '../utils';
export interface EnhancedIssue {
    id: string;
    title: string;
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    category: string;
    location?: {
        file?: string;
        line?: number;
        column?: number;
    };
    codeSnippet?: string;
    contextLines?: string[];
    remediation?: string;
    evidence?: any;
    locationConfidence?: number;
}
export interface EnhancementResult {
    enhanced: number;
    failed: number;
    issues: EnhancedIssue[];
}
export declare class LocationEnhancer {
    private locationFinder;
    constructor(locationFinder?: ILocationFinder, modelVersionSync?: ModelVersionSync, vectorStorage?: any);
    enhanceIssuesWithLocations(issues: any[], repoUrl: string, prNumber?: string): Promise<EnhancementResult>;
    private getRepoPath;
    private getFromRedisCache;
    private mergeLocationWithIssue;
    private normalizeIssue;
    private generateIssueId;
    private simpleHash;
}
export declare class BatchLocationEnhancer {
    private enhancer;
    constructor();
    enhanceComparisonResults(comparisonResult: any, repoUrl: string, prNumber: string): Promise<any>;
}
export {};
