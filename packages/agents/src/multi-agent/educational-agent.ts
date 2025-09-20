/**
 * Educational types for backward compatibility
 * These are stub types to maintain compatibility after multi-agent removal
 */

export interface EducationalResult {
  topic: string;
  content: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  examples?: string[];
  resources?: string[];
  metadata?: Record<string, any>;
  
  // Extended properties for educational compilation
  explanations?: Array<{
    concept: string;
    explanation: string;
    examples: string[];
    simpleExplanation?: string;
    technicalDetails?: string;
    whyItMatters?: string;
  }>;
  tutorials?: Array<{
    title: string;
    steps: string[];
    codeExamples: string[];
    difficulty?: 'easy' | 'medium' | 'hard';
    expectedOutcome?: string;
  }>;
  bestPractices?: Array<{
    practice: string;
    rationale: string;
    examples: string[];
    implementation?: string;
    commonMistakes?: string[];
  }>;
  additionalResources?: Array<{
    title: string;
    url: string;
    type: string;
    description?: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
  }>;
  learningPath?: string[];
  skillGaps?: string[];
  relatedTopics?: string[];
  recommendedNextSteps?: string[];
}

/**
 * Educational Agent stub for backward compatibility
 */
export class EducationalAgent {
  constructor(config?: any) {
    console.log('EducationalAgent: Legacy stub initialized');
  }

  async generateEducationalContent(findings: any[]): Promise<EducationalResult[]> {
    console.log(`Generating educational content for ${findings.length} findings`);
    return findings.map((finding, index) => ({
      topic: `Learning Topic ${index + 1}`,
      content: `Educational content for ${finding.type || 'issue'}`,
      level: 'intermediate' as const,
      examples: [`Example for ${finding.type || 'issue'}`],
      resources: [`Resource link for ${finding.type || 'issue'}`],
      metadata: { findingId: finding.id }
    }));
  }

  async compileEducationalReport(results: EducationalResult[]): Promise<any> {
    console.log(`Compiling educational report for ${results.length} results`);
    return {
      summary: `Educational report compiled for ${results.length} topics`,
      results,
      metadata: {
        timestamp: Date.now(),
        totalTopics: results.length
      }
    };
  }
}