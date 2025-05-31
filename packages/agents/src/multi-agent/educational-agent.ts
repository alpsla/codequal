import { createLogger } from '@codequal/core/utils';

/**
 * Compiled findings from all analysis agents
 */
export interface CompiledFindings {
  codeQuality: {
    complexityIssues: any[];
    maintainabilityIssues: any[];
    codeSmells: any[];
    patterns: string[];
  };
  
  security: {
    vulnerabilities: any[];
    securityPatterns: string[];
    complianceIssues: any[];
    threatLandscape: any[];
  };
  
  architecture: {
    designPatternViolations: any[];
    technicalDebt: any[];
    refactoringOpportunities: any[];
    architecturalDecisions: any[];
  };
  
  performance: {
    performanceIssues: any[];
    optimizationOpportunities: any[];
    bottlenecks: any[];
    benchmarkResults: any[];
  };
  
  dependency: {
    vulnerabilityIssues: any[];
    licenseIssues: any[];
    outdatedPackages: any[];
    conflictResolution: any[];
  };
  
  // Cross-cutting concerns
  criticalIssues: any[];
  learningOpportunities: LearningOpportunity[];
  knowledgeGaps: string[];
}

/**
 * Learning opportunity identified from analysis
 */
export interface LearningOpportunity {
  topic: string;
  context: any[];
  learningLevel: 'beginner' | 'intermediate' | 'advanced';
  priority: 'low' | 'medium' | 'high';
  category: 'code_quality' | 'security' | 'architecture' | 'performance' | 'dependency';
}

/**
 * Educational content types
 */
export interface EducationalContent {
  explanations: Array<{
    concept: string;
    simpleExplanation: string;
    technicalDetails: string;
    whyItMatters: string;
    examples: CodeExample[];
  }>;
  
  tutorials: Array<{
    title: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    steps: string[];
    codeExamples: CodeExample[];
    expectedOutcome: string;
  }>;
  
  bestPractices: Array<{
    practice: string;
    rationale: string;
    implementation: string;
    commonMistakes: string[];
    examples: CodeExample[];
  }>;
  
  resources: Array<{
    type: 'documentation' | 'tutorial' | 'video' | 'book' | 'course';
    title: string;
    url?: string;
    description: string;
    difficulty: string;
    status?: 'available' | 'research_requested';
    requestId?: string;
  }>;
}

/**
 * Code example for educational content
 */
export interface CodeExample {
  title: string;
  language: string;
  code: string;
  explanation: string;
  type: 'good' | 'bad' | 'before' | 'after';
}

/**
 * Educational analysis result
 */
export interface EducationalResult {
  learningPath: {
    title: string;
    description: string;
    estimatedTime: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    steps: string[];
  };
  
  explanations: EducationalContent['explanations'];
  tutorials: EducationalContent['tutorials'];
  bestPractices: EducationalContent['bestPractices'];
  additionalResources: EducationalContent['resources'];
  
  // Personalization data for future enhancement
  skillGaps: string[];
  recommendedNextSteps: string[];
  relatedTopics: string[];
}

/**
 * Educational agent that processes compiled findings from analysis agents
 */
export class EducationalAgent {
  private readonly logger = createLogger('EducationalAgent');
  
  constructor(
    private vectorDB: any, // Vector database for educational content
    private researcherAgent?: any // Optional researcher for missing content
  ) {}
  
  /**
   * Analyze compiled findings and generate educational content
   */
  async analyze(compiledFindings: CompiledFindings): Promise<EducationalResult> {
    this.logger.info('Starting educational analysis', {
      criticalIssues: compiledFindings.criticalIssues.length,
      learningOpportunities: compiledFindings.learningOpportunities.length
    });
    
    // Extract learning opportunities from technical findings
    const learningOpportunities = this.extractLearningOpportunities(compiledFindings);
    
    // Gather educational content from various sources
    const educationalContent = await this.gatherEducationalContent(learningOpportunities);
    
    // Create personalized learning path
    const learningPath = this.createLearningPath(learningOpportunities);
    
    return {
      learningPath,
      explanations: educationalContent.explanations,
      tutorials: educationalContent.tutorials,
      bestPractices: educationalContent.bestPractices,
      additionalResources: educationalContent.resources,
      skillGaps: this.identifySkillGaps(compiledFindings),
      recommendedNextSteps: this.generateNextSteps(learningOpportunities),
      relatedTopics: this.findRelatedTopics(learningOpportunities)
    };
  }
  
  /**
   * Extract learning opportunities from compiled findings
   */
  private extractLearningOpportunities(findings: CompiledFindings): LearningOpportunity[] {
    const opportunities: LearningOpportunity[] = [];
    
    // From code quality findings
    if (findings.codeQuality.complexityIssues.length > 0) {
      opportunities.push({
        topic: "Code Complexity Management",
        context: findings.codeQuality.complexityIssues,
        learningLevel: "intermediate",
        priority: "high",
        category: "code_quality"
      });
    }
    
    if (findings.codeQuality.codeSmells.length > 0) {
      opportunities.push({
        topic: "Code Smells and Refactoring",
        context: findings.codeQuality.codeSmells,
        learningLevel: "intermediate",
        priority: "medium",
        category: "code_quality"
      });
    }
    
    // From security findings
    if (findings.security.vulnerabilities.length > 0) {
      opportunities.push({
        topic: "Security Best Practices",
        context: findings.security.vulnerabilities,
        learningLevel: "advanced",
        priority: "high",
        category: "security"
      });
    }
    
    // From architecture findings
    if (findings.architecture.designPatternViolations.length > 0) {
      opportunities.push({
        topic: "Design Patterns",
        context: findings.architecture.designPatternViolations,
        learningLevel: "intermediate",
        priority: "medium",
        category: "architecture"
      });
    }
    
    if (findings.architecture.technicalDebt.length > 0) {
      opportunities.push({
        topic: "Technical Debt Management",
        context: findings.architecture.technicalDebt,
        learningLevel: "advanced",
        priority: "medium",
        category: "architecture"
      });
    }
    
    // From performance findings
    if (findings.performance.performanceIssues.length > 0) {
      opportunities.push({
        topic: "Performance Optimization",
        context: findings.performance.performanceIssues,
        learningLevel: "advanced",
        priority: "medium",
        category: "performance"
      });
    }
    
    // From dependency findings
    if (findings.dependency.vulnerabilityIssues.length > 0) {
      opportunities.push({
        topic: "Dependency Security",
        context: findings.dependency.vulnerabilityIssues,
        learningLevel: "intermediate",
        priority: "high",
        category: "dependency"
      });
    }
    
    return opportunities;
  }
  
  /**
   * Gather educational content from Vector DB and research requests
   */
  private async gatherEducationalContent(opportunities: LearningOpportunity[]): Promise<EducationalContent> {
    const content: EducationalContent = {
      explanations: [],
      tutorials: [],
      bestPractices: [],
      resources: []
    };
    
    for (const opportunity of opportunities) {
      try {
        // Search Vector DB for existing educational content
        const existingContent = await this.searchEducationalContent(opportunity);
        
        if (existingContent) {
          content.explanations.push(...existingContent.explanations);
          content.tutorials.push(...existingContent.tutorials);
          content.bestPractices.push(...existingContent.bestPractices);
          content.resources.push(...existingContent.resources);
        } else if (this.researcherAgent) {
          // Request researcher to gather new content
          const researchRequest = await this.requestResearcherContent(opportunity);
          content.resources.push({
            type: 'documentation',
            title: `Research: ${opportunity.topic}`,
            description: `Educational content being researched for ${opportunity.topic}`,
            difficulty: opportunity.learningLevel,
            status: 'research_requested',
            requestId: researchRequest.id
          });
        }
      } catch (error) {
        this.logger.warn('Failed to gather educational content', {
          topic: opportunity.topic,
          error: error instanceof Error ? error.message : error
        });
      }
    }
    
    return content;
  }
  
  /**
   * Search Vector DB for educational content
   */
  private async searchEducationalContent(opportunity: LearningOpportunity): Promise<EducationalContent | null> {
    if (!this.vectorDB) {
      return null;
    }
    
    try {
      const searchResults = await this.vectorDB.searchEducationalContent({
        topic: opportunity.topic,
        category: opportunity.category,
        level: opportunity.learningLevel,
        limit: 10
      });
      
      if (searchResults && searchResults.length > 0) {
        return this.formatSearchResults(searchResults);
      }
    } catch (error) {
      this.logger.warn('Vector DB search failed', {
        topic: opportunity.topic,
        error: error instanceof Error ? error.message : error
      });
    }
    
    return null;
  }
  
  /**
   * Request researcher to gather educational content
   */
  private async requestResearcherContent(opportunity: LearningOpportunity): Promise<{ id: string; estimatedCompletion: Date }> {
    if (!this.researcherAgent) {
      throw new Error('No researcher agent available');
    }
    
    return await this.researcherAgent.requestEducationalContent({
      topic: opportunity.topic,
      context: opportunity.context,
      level: opportunity.learningLevel,
      priority: opportunity.priority,
      category: opportunity.category
    });
  }
  
  /**
   * Create learning path from opportunities
   */
  private createLearningPath(opportunities: LearningOpportunity[]): EducationalResult['learningPath'] {
    // Sort by priority and difficulty
    const sortedOpportunities = opportunities.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      const difficultyWeight = { beginner: 1, intermediate: 2, advanced: 3 };
      
      return (priorityWeight[b.priority] - priorityWeight[a.priority]) ||
             (difficultyWeight[a.learningLevel] - difficultyWeight[b.learningLevel]);
    });
    
    const steps = sortedOpportunities.map((opp, index) => 
      `${index + 1}. ${opp.topic} (${opp.learningLevel})`
    );
    
    const totalTime = this.estimateLearningTime(sortedOpportunities);
    const maxDifficulty = this.getMaxDifficulty(sortedOpportunities);
    
    return {
      title: "Personalized Learning Path",
      description: `Based on the analysis findings, here's a recommended learning path to address the identified areas for improvement.`,
      estimatedTime: totalTime,
      difficulty: maxDifficulty,
      steps
    };
  }
  
  /**
   * Identify skill gaps from findings
   */
  private identifySkillGaps(findings: CompiledFindings): string[] {
    const gaps: string[] = [];
    
    if (findings.security.vulnerabilities.length > 2) {
      gaps.push("Security awareness and secure coding practices");
    }
    
    if (findings.codeQuality.complexityIssues.length > 3) {
      gaps.push("Code complexity management and refactoring techniques");
    }
    
    if (findings.architecture.technicalDebt.length > 2) {
      gaps.push("Architectural design and technical debt management");
    }
    
    if (findings.performance.performanceIssues.length > 2) {
      gaps.push("Performance optimization and profiling");
    }
    
    return gaps;
  }
  
  /**
   * Generate next steps recommendations
   */
  private generateNextSteps(opportunities: LearningOpportunity[]): string[] {
    const nextSteps: string[] = [];
    
    const highPriorityItems = opportunities.filter(opp => opp.priority === 'high');
    
    if (highPriorityItems.length > 0) {
      nextSteps.push(`Start with high-priority topics: ${highPriorityItems.map(opp => opp.topic).join(', ')}`);
    }
    
    const beginnerItems = opportunities.filter(opp => opp.learningLevel === 'beginner');
    if (beginnerItems.length > 0) {
      nextSteps.push(`Build foundation with beginner topics first`);
    }
    
    nextSteps.push("Apply learnings to current codebase immediately");
    nextSteps.push("Set up automated tools to prevent similar issues");
    
    return nextSteps;
  }
  
  /**
   * Find related topics for further learning
   */
  private findRelatedTopics(opportunities: LearningOpportunity[]): string[] {
    const relatedTopics = new Set<string>();
    
    opportunities.forEach(opp => {
      switch (opp.category) {
        case 'code_quality':
          relatedTopics.add("Test-Driven Development");
          relatedTopics.add("Clean Code Principles");
          break;
        case 'security':
          relatedTopics.add("Threat Modeling");
          relatedTopics.add("Secure Development Lifecycle");
          break;
        case 'architecture':
          relatedTopics.add("Software Architecture Patterns");
          relatedTopics.add("Domain-Driven Design");
          break;
        case 'performance':
          relatedTopics.add("Profiling and Monitoring");
          relatedTopics.add("Scalability Patterns");
          break;
        case 'dependency':
          relatedTopics.add("Supply Chain Security");
          relatedTopics.add("Dependency Management Best Practices");
          break;
      }
    });
    
    return Array.from(relatedTopics);
  }
  
  // Helper methods
  private formatSearchResults(results: any[]): EducationalContent {
    // Format vector DB results into educational content structure
    return {
      explanations: results.filter(r => r.type === 'explanation').map(r => r.content),
      tutorials: results.filter(r => r.type === 'tutorial').map(r => r.content),
      bestPractices: results.filter(r => r.type === 'best_practice').map(r => r.content),
      resources: results.filter(r => r.type === 'resource').map(r => r.content)
    };
  }
  
  private estimateLearningTime(opportunities: LearningOpportunity[]): string {
    const timePerTopic = { beginner: 30, intermediate: 60, advanced: 90 }; // minutes
    const totalMinutes = opportunities.reduce((sum, opp) => sum + timePerTopic[opp.learningLevel], 0);
    
    if (totalMinutes < 60) {
      return `${totalMinutes} minutes`;
    } else {
      const hours = Math.ceil(totalMinutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    }
  }
  
  private getMaxDifficulty(opportunities: LearningOpportunity[]): 'beginner' | 'intermediate' | 'advanced' {
    const levels = opportunities.map(opp => opp.learningLevel);
    
    if (levels.includes('advanced')) return 'advanced';
    if (levels.includes('intermediate')) return 'intermediate';
    return 'beginner';
  }
}