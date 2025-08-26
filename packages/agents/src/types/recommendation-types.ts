/**
 * Recommendation Module Types
 * Defines the structured recommendations that feed into the Educational Agent
 */

export interface RecommendationPriority {
  level: 'critical' | 'high' | 'medium' | 'low';
  score: number; // 0-100
  urgency: 'immediate' | 'next_sprint' | 'backlog';
  justification?: string;
}

export interface ActionableRecommendation {
  id: string;
  title: string;
  description: string;
  category: 'security' | 'performance' | 'architecture' | 'codeQuality' | 'dependency';
  priority: RecommendationPriority;
  
  // Specific actionable steps
  actionSteps: {
    step: number;
    action: string;
    estimatedEffort: string; // e.g., "30 minutes", "2 hours"
    toolsRequired?: string[];
  }[];
  
  // Learning context for Educational Agent
  learningContext: {
    skillLevel: 'beginner' | 'intermediate' | 'advanced';
    prerequisites: string[];
    relatedConcepts: string[];
    difficultyScore: number; // 1-10
  };
  
  // Evidence from findings
  evidence: {
    findingIds: string[];
    affectedFiles: string[];
    impact: string;
    riskLevel: string;
  };
  
  // Success criteria
  successCriteria: {
    measurable: string[];
    testable: string[];
  };
}

export interface RecommendationModule {
  summary: {
    totalRecommendations: number;
    priorityBreakdown: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    estimatedTotalEffort: string;
    focusAreas: string[];
    description: string;
  };
  
  recommendations: ActionableRecommendation[];
  
  // Learning path guidance for Educational Agent
  learningPathGuidance: {
    suggestedOrder: string[]; // Recommendation IDs in learning order
    parallelizable: string[][]; // Groups that can be learned together
    dependencies: Record<string, string[]>; // prerequisite relationships
  };
  
  metadata: {
    generatedAt: Date;
    basedOnFindings: number;
    confidence: number; // 0-100
    generationMethod: 'ai_analysis' | 'rule_based' | 'hybrid';
  };
}