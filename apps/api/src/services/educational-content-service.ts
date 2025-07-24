import { AuthenticatedUser } from '../middleware/auth-middleware';
import { Finding } from './result-processor';
import { createLogger } from '@codequal/core/utils';

const logger = createLogger('EducationalContentService');

// Import existing RAG service
// Note: We'll need to adjust the import path based on actual structure
// import { AuthenticatedRAGService } from '@codequal/core/src/services/rag/authenticated-rag-service';

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
export class EducationalContentService {
  // private ragService: AuthenticatedRAGService;

  constructor(private authenticatedUser: AuthenticatedUser) {
    // this.ragService = new AuthenticatedRAGService(authenticatedUser);
  }

  /**
   * Generate educational content for all findings
   */
  async generateContentForFindings(
    findings: Record<string, Finding[]>,
    user: AuthenticatedUser
  ): Promise<EducationalContent[]> {
    try {
      const allFindings: Finding[] = this.flattenFindings(findings);
      const userSkillLevel = await this.getUserSkillLevel(user);
      
      const educationalContent: EducationalContent[] = [];

      for (const finding of allFindings) {
        try {
          const content = await this.generateContentForFinding(finding, userSkillLevel);
          if (content) {
            educationalContent.push(content);
          }
        } catch (error) {
          logger.error(`Failed to generate content for finding ${finding.id}:`, error as Error);
          // Continue with other findings even if one fails
        }
      }

      // Sort by relevance score
      educationalContent.sort((a, b) => b.relevanceScore - a.relevanceScore);

      return educationalContent.slice(0, 10); // Limit to top 10 most relevant
    } catch (error) {
      logger.error('Educational content generation error:', error as Error);
      return []; // Return empty array instead of throwing
    }
  }

  /**
   * Generate educational content for a specific finding
   */
  async generateContentForFinding(
    finding: Finding,
    userSkillLevel: SkillLevel
  ): Promise<EducationalContent | null> {
    try {
      // Validate finding category
      const validCategories = ['security', 'architecture', 'performance', 'codeQuality'];
      if (!validCategories.includes(finding.category)) {
        logger.error(`Invalid finding category: ${finding.category}`);
        return null;
      }

      // Determine appropriate skill level for this category
      const categorySkillLevel = userSkillLevel.categories[finding.category as keyof SkillLevel['categories']] || 
                                userSkillLevel.overall;

      // Build search query for RAG system
      const searchQuery = this.buildSearchQuery(finding, categorySkillLevel);

      // Get educational content from RAG system
      const ragResults = await this.searchEducationalContent(searchQuery);

      if (!ragResults || ragResults.length === 0) {
        // Generate fallback content
        return this.generateFallbackContent(finding, categorySkillLevel);
      }

      // Process and adapt RAG results
      const adaptedContent = await this.adaptContentToSkillLevel(
        ragResults[0],
        finding,
        categorySkillLevel
      );

      return {
        findingId: finding.id,
        content: adaptedContent,
        relevanceScore: this.calculateRelevanceScore(finding, adaptedContent),
        metadata: {
          generatedAt: new Date(),
          contentSource: 'rag-system',
          adaptedForUser: true
        }
      };
    } catch (error) {
      logger.error(`Content generation failed for finding ${finding.id}:`, error as Error);
      return null;
    }
  }

  /**
   * Get user's skill level from profile
   */
  private async getUserSkillLevel(user: AuthenticatedUser): Promise<SkillLevel> {
    try {
      // In a real implementation, this would query the user's skill profile
      // For now, return a default skill level
      return {
        overall: 'intermediate',
        categories: {
          security: 'intermediate',
          architecture: 'intermediate',
          performance: 'beginner',
          codeQuality: 'advanced'
        }
      };
    } catch (error) {
      logger.error('Failed to get user skill level:', error as Error);
      // Return default intermediate level
      return {
        overall: 'intermediate',
        categories: {
          security: 'intermediate',
          architecture: 'intermediate',
          performance: 'intermediate',
          codeQuality: 'intermediate'
        }
      };
    }
  }

  /**
   * Build search query for RAG system
   */
  private buildSearchQuery(finding: Finding, skillLevel: string): string {
    const baseQuery = `${finding.category} ${finding.type} ${finding.title}`;
    const skillModifier = this.getSkillModifier(skillLevel);
    
    return `${baseQuery} ${skillModifier}`;
  }

  /**
   * Search educational content using RAG system
   */
  private async searchEducationalContent(query: string): Promise<unknown[]> {
    try {
      // Mock implementation - in real system would use RAG service
      // return await this.ragService.searchEducationalContent(query);
      
      // For now, return mock data
      return [
        {
          title: `Understanding ${query}`,
          content: `This is educational content about ${query}. It provides comprehensive guidance and best practices.`,
          examples: [`Example implementation for ${query}`],
          references: ['https://docs.example.com', 'https://best-practices.example.com']
        }
      ];
    } catch (error) {
      logger.error('RAG search failed:', error as Error);
      return [];
    }
  }

  /**
   * Adapt content to user's skill level
   */
  private async adaptContentToSkillLevel(
    rawContent: unknown,
    finding: Finding,
    skillLevel: string
  ): Promise<EducationalContent['content']> {
    // Type assertion for rawContent
    const content = rawContent as {
      title?: string;
      content?: string;
      summary?: string;
      examples?: string[];
      references?: string[];
    };
    
    // Extract and adapt content based on skill level
    const baseContent = {
      title: content.title || `Understanding ${finding.title}`,
      summary: this.generateSummary(content, skillLevel),
      explanation: this.adaptExplanation(content.content || '', skillLevel),
      examples: this.adaptExamples(content.examples || [], skillLevel),
      references: content.references || [],
      skillLevel: skillLevel as 'beginner' | 'intermediate' | 'advanced'
    };

    return baseContent;
  }

  /**
   * Generate fallback content when RAG system fails
   */
  private generateFallbackContent(
    finding: Finding,
    skillLevel: string
  ): EducationalContent {
    const content = {
      title: `Understanding ${finding.title}`,
      summary: this.generateFallbackSummary(finding, skillLevel),
      explanation: this.generateFallbackExplanation(finding, skillLevel),
      examples: this.generateFallbackExamples(finding),
      references: this.generateReferences(finding),
      skillLevel: skillLevel as 'beginner' | 'intermediate' | 'advanced'
    };

    return {
      findingId: finding.id,
      content,
      relevanceScore: 0.6, // Lower score for fallback content
      metadata: {
        generatedAt: new Date(),
        contentSource: 'fallback-generation',
        adaptedForUser: true
      }
    };
  }

  /**
   * Calculate relevance score for educational content
   */
  private calculateRelevanceScore(finding: Finding, content: unknown): number {
    let score = 0.5; // Base score

    // Boost score based on finding severity
    const severityBoost = {
      critical: 0.3,
      high: 0.2,
      medium: 0.1,
      low: 0.05
    };
    score += severityBoost[finding.severity];

    // Type assertion for content
    const typedContent = content as {
      examples?: unknown[];
      references?: unknown[];
      explanation?: string;
    };
    
    // Boost score based on content quality indicators
    if (typedContent.examples && typedContent.examples.length > 0) score += 0.1;
    if (typedContent.references && typedContent.references.length > 0) score += 0.05;
    if (typedContent.explanation && typedContent.explanation.length > 100) score += 0.05;

    return Math.min(1.0, score);
  }

  // Helper methods for content adaptation
  private getSkillModifier(skillLevel: string): string {
    switch (skillLevel) {
      case 'beginner': return 'introduction tutorial basics fundamentals';
      case 'intermediate': return 'best practices patterns guidelines';
      case 'advanced': return 'optimization advanced techniques performance';
      default: return 'best practices';
    }
  }

  private generateSummary(rawContent: unknown, skillLevel: string): string {
    const content = rawContent as {
      content?: string;
      summary?: string;
    };
    const baseText = content.content || content.summary || '';
    
    if (skillLevel === 'beginner') {
      return `This is a ${skillLevel}-friendly explanation of the issue. ${baseText.substring(0, 150)}...`;
    } else if (skillLevel === 'advanced') {
      return `Advanced analysis: ${baseText.substring(0, 200)}...`;
    } else {
      return baseText.substring(0, 180) + '...';
    }
  }

  private adaptExplanation(content: string, skillLevel: string): string {
    if (!content) return '';

    switch (skillLevel) {
      case 'beginner':
        return `**For beginners:** ${content}\n\n**Why this matters:** This type of issue can impact your code's reliability and security. Understanding and fixing these issues early helps prevent larger problems later.`;
      
      case 'advanced':
        return `**Advanced details:** ${content}\n\n**Technical implications:** Consider the performance impact, maintainability concerns, and potential architectural improvements when addressing this issue.`;
      
      default:
        return content;
    }
  }

  private adaptExamples(examples: string[], skillLevel: string): string[] {
    if (!examples || examples.length === 0) return [];

    return examples.map(example => {
      switch (skillLevel) {
        case 'beginner':
          return `// Beginner-friendly example:\n${example}\n// This example shows the basic approach to solving this issue.`;
        
        case 'advanced':
          return `// Advanced implementation:\n${example}\n// Consider error handling, performance optimization, and edge cases.`;
        
        default:
          return example;
      }
    });
  }

  // Fallback content generation methods
  private generateFallbackSummary(finding: Finding, skillLevel: string): string {
    const category = finding.category;
    const severity = finding.severity;
    
    const templates = {
      beginner: `This ${severity} ${category} issue needs attention. ${finding.description}`,
      intermediate: `${severity.charAt(0).toUpperCase() + severity.slice(1)} ${category} finding: ${finding.description}`,
      advanced: `${severity.toUpperCase()} ${category} analysis: ${finding.description} - requires architectural consideration.`
    };

    return templates[skillLevel as keyof typeof templates] || templates.intermediate;
  }

  private generateFallbackExplanation(finding: Finding, skillLevel: string): string {
    const explanations = {
      security: {
        beginner: 'Security issues can make your application vulnerable to attacks. It\'s important to fix these to keep user data safe.',
        intermediate: 'This security finding indicates a potential vulnerability that could be exploited by malicious actors.',
        advanced: 'Security vulnerability requiring immediate attention. Consider threat modeling and security architecture implications.'
      },
      architecture: {
        beginner: 'Architecture issues affect how well your code is organized and how easy it is to maintain.',
        intermediate: 'This architectural concern may impact code maintainability and system scalability.',
        advanced: 'Architectural anti-pattern detected. Consider design principles, SOLID principles, and long-term maintainability.'
      },
      performance: {
        beginner: 'Performance issues can make your application run slowly for users.',
        intermediate: 'This performance issue may impact user experience and system efficiency.',
        advanced: 'Performance bottleneck identified. Analyze algorithmic complexity, memory usage, and system resources.'
      },
      codeQuality: {
        beginner: 'Code quality issues make your code harder to read and maintain.',
        intermediate: 'This code quality issue affects readability and maintainability.',
        advanced: 'Code quality concern impacting technical debt and development velocity.'
      }
    };

    const categoryExplanations = explanations[finding.category as keyof typeof explanations];
    if (categoryExplanations) {
      return categoryExplanations[skillLevel as keyof typeof categoryExplanations] || 
             categoryExplanations.intermediate;
    }

    return `This ${finding.severity} issue in ${finding.category} requires attention: ${finding.description}`;
  }

  private generateFallbackExamples(finding: Finding): string[] {
    // Generate basic examples based on finding type and category
    const examples = [];

    if (finding.recommendation) {
      examples.push(`// Recommended approach:\n${finding.recommendation}`);
    }

    if (finding.file && finding.line) {
      examples.push(`// Issue location:\n// File: ${finding.file}\n// Line: ${finding.line}`);
    }

    return examples;
  }

  private generateReferences(finding: Finding): string[] {
    const references = [];

    // Add category-specific references
    switch (finding.category) {
      case 'security':
        references.push('https://owasp.org/');
        references.push('https://cwe.mitre.org/');
        break;
      case 'performance':
        references.push('https://web.dev/performance/');
        break;
      case 'architecture':
        references.push('https://martinfowler.com/architecture/');
        break;
    }

    return references;
  }

  // Utility methods
  private flattenFindings(findings: Record<string, Finding[]>): Finding[] {
    const allFindings: Finding[] = [];

    Object.values(findings).forEach((categoryFindings) => {
      if (Array.isArray(categoryFindings)) {
        allFindings.push(...categoryFindings);
      }
    });

    return allFindings;
  }
}