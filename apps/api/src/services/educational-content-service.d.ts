import { AuthenticatedUser } from '../middleware/auth-middleware';
import { Finding } from './result-processor';
export interface EducationalContent {
    findingId: string;
    content: {
        title: string;
        summary: string;
        explanation: string;
        examples: string[];
        references: string[];
        skillLevel: 'beginner' | 'intermediate' | 'advanced';
    };
    relevanceScore: number;
    metadata: {
        generatedAt: Date;
        contentSource: string;
        adaptedForUser: boolean;
    };
}
export interface SkillLevel {
    overall: 'beginner' | 'intermediate' | 'advanced';
    categories: {
        security: 'beginner' | 'intermediate' | 'advanced';
        architecture: 'beginner' | 'intermediate' | 'advanced';
        performance: 'beginner' | 'intermediate' | 'advanced';
        codeQuality: 'beginner' | 'intermediate' | 'advanced';
    };
}
/**
 * Educational Content Service - generates learning content for findings using RAG framework
 */
export declare class EducationalContentService {
    private authenticatedUser;
    constructor(authenticatedUser: AuthenticatedUser);
    /**
     * Generate educational content for all findings
     */
    generateContentForFindings(findings: any, user: AuthenticatedUser): Promise<EducationalContent[]>;
    /**
     * Generate educational content for a specific finding
     */
    generateContentForFinding(finding: Finding, userSkillLevel: SkillLevel): Promise<EducationalContent | null>;
    /**
     * Get user's skill level from profile
     */
    private getUserSkillLevel;
    /**
     * Build search query for RAG system
     */
    private buildSearchQuery;
    /**
     * Search educational content using RAG system
     */
    private searchEducationalContent;
    /**
     * Adapt content to user's skill level
     */
    private adaptContentToSkillLevel;
    /**
     * Generate fallback content when RAG system fails
     */
    private generateFallbackContent;
    /**
     * Calculate relevance score for educational content
     */
    private calculateRelevanceScore;
    private getSkillModifier;
    private generateSummary;
    private adaptExplanation;
    private adaptExamples;
    private generateFallbackSummary;
    private generateFallbackExplanation;
    private generateFallbackExamples;
    private generateReferences;
    private flattenFindings;
}
//# sourceMappingURL=educational-content-service.d.ts.map