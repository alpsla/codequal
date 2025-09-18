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