import { AgentProvider, AgentRole } from '@codequal/core';

/**
 * Interface defining language support levels for an agent
 */
export interface LanguageSupport {
  fullSupport: string[];
  goodSupport: string[];
  basicSupport: string[];
  limitedSupport: string[];
}

/**
 * Interface for agent-role evaluation parameters
 * This provides detailed performance metrics for each agent by role
 */
export interface AgentRoleEvaluationParameters {
  // Basic agent capabilities
  agent: {
    provider: AgentProvider;
    modelVersion: string;
    maxTokens: number;
    costPerToken: number;
    averageLatency: number;
  };
  
  // Role-specific performance metrics
  rolePerformance: {
    [role in AgentRole]: {
      overallScore: number;         // 0-100 performance score
      specialties: string[];        // e.g., "JavaScript", "Security", "API Design"
      weaknesses: string[];         // e.g., "Large Codebase", "C++", "Concurrency"
      bestPerformingLanguages: Record<string, number>; // 0-100 scores by language
      bestFileTypes: Record<string, number>;           // 0-100 scores by file type
      bestScenarios: Record<string, number>;           // 0-100 scores by scenario
    };
  };
  
  // Repository and PR-specific performance
  repoCharacteristics: {
    sizePerformance: Record<string, number>;          // By repo size
    complexityPerformance: Record<string, number>;    // By complexity
    architecturePerformance: Record<string, number>;  // By architecture
  };
  
  prCharacteristics: {
    sizePerformance: Record<string, number>;          // By PR size
    changeTypePerformance: Record<string, number>;    // By change type
  };
  
  // Framework and library specific performance
  frameworkPerformance: Record<string, number>;       // 0-100 scores by framework
  
  // Language support levels
  languageSupport: LanguageSupport;
  
  // Historical performance data
  historicalPerformance: {
    totalRuns: number;
    successRate: number;                              // 0-1.0
    averageUserSatisfaction: number;                  // 0-100
    tokenUtilization: number;                         // Efficiency
    averageFindingQuality: number;                    // 0-100
  };
  
  // MCP-specific metrics
  mcpPerformance?: {
    withMCP: {
      qualityScore: number;                           // 0-100
      speedScore: number;                             // 0-100
      costEfficiency: number;                         // 0-100
    };
    withoutMCP: {
      qualityScore: number;                           // 0-100
      speedScore: number;                             // 0-100
      costEfficiency: number;                         // 0-100
    };
    recommendMCP: boolean;                            // Whether MCP is recommended
  };
}

/**
 * Interface for repository context
 * Used to determine the optimal agent configuration
 */
export interface RepositoryContext {
  primaryLanguages: string[];
  size: {
    totalFiles: number;
    totalLoc: number;
  };
  complexity: number; // 0-100 score
  frameworks: string[];
  architecture: string;
}

/**
 * Interface for PR context
 * Used to determine the optimal agent configuration
 */
export interface PRContext {
  changedFiles: number;
  changedLoc: number;
  fileTypes: {
    code: number;
    config: number;
    docs: number;
    tests: number;
  };
  complexity: number; // 0-100 score
  impactedAreas: string[]; // e.g., 'auth', 'database', 'api'
  changeType: 'feature' | 'bugfix' | 'refactoring' | 'documentation' | 'infrastructure';
  changeImpact: number; // 0-100 score indicating business impact
}

/**
 * Interface for user preferences
 * Used to customize agent selection
 */
export interface UserPreferences {
  preferredProviders?: AgentProvider[];
  priorityConcerns?: AgentRole[];
  feedbackHistory?: Record<string, {
    useCount: number;
    positiveRating: number;
    negativeRating: number;
  }>;
  customRules?: any[];
  teamConventions?: any;
  maxCost?: number; // Maximum cost allowed for analysis
  qualityPreference?: number; // 0-100 preference for quality over speed
}

/**
 * Decision criteria for using secondary agents
 */
export interface SecondaryAgentDecisionCriteria {
  repositoryComplexity: number;  // Threshold for repo complexity
  changeImpact: number;          // Threshold for PR impact
  confidenceThreshold: number;   // Threshold for primary agent confidence
  languageFactors: Record<string, number>;  // Language-specific factors
  businessCriticalityScore: number;  // Importance to business
  costBudget: number;            // Available budget for analysis
}

/**
 * Default temperatures by role
 * Used to optimize agent configuration
 */
// Default temperatures for each agent role - using lazy initialization to avoid enum evaluation during module loading
let _defaultTemperatures: Record<AgentRole, number> | undefined;

export function getDefaultTemperatures(): Record<AgentRole, number> {
  if (!_defaultTemperatures) {
    _defaultTemperatures = {
      [AgentRole.CODE_QUALITY]: 0.2,   // More deterministic
      [AgentRole.SECURITY]: 0.3,       // Balanced
      [AgentRole.PERFORMANCE]: 0.25,   // More deterministic
      [AgentRole.EDUCATIONAL]: 0.5,    // More creative
      [AgentRole.ORCHESTRATOR]: 0.3,   // Balanced
      [AgentRole.DEPENDENCY]: 0.3,     // Balanced
      [AgentRole.REPORT_GENERATION]: 0.4 // Slightly creative
    };
  }
  return _defaultTemperatures;
}

// Export as a getter for backward compatibility
export const defaultTemperatures = new Proxy({} as Record<AgentRole, number>, {
  get(target, prop) {
    return getDefaultTemperatures()[prop as AgentRole];
  },
  ownKeys(target) {
    return Object.keys(getDefaultTemperatures());
  },
  getOwnPropertyDescriptor(target, prop) {
    const temps = getDefaultTemperatures();
    if (prop in temps) {
      return {
        enumerable: true,
        configurable: true,
        value: temps[prop as AgentRole]
      };
    }
    return undefined;
  }
});

/**
 * Determines if a secondary agent should be used based on context
 * @param context Repository context
 * @param prContext PR context
 * @param primaryAgentResult Result from primary agent
 * @param criteria Decision criteria
 * @returns Whether to use a secondary agent
 */
export function shouldUseSecondaryAgent(
  context: RepositoryContext, 
  prContext: PRContext,
  primaryAgentResult: any, // Using any for now, will be refined with actual type
  criteria: SecondaryAgentDecisionCriteria
): boolean {
  // Calculate a weighted score based on multiple factors
  let score = 0;
  
  // Add complexity factor
  score += context.complexity * 0.2;
  
  // Add impact factor
  score += prContext.changeImpact * 0.3;
  
  // Add confidence factor (lower confidence = higher score)
  const confidenceFactor = criteria.confidenceThreshold - 
    (primaryAgentResult.metadata?.confidence || 0.5);
  score += Math.max(0, confidenceFactor) * 0.3;
  
  // Add language factor
  const language = context.primaryLanguages[0] || '';
  score += (criteria.languageFactors[language] || 0) * 0.1;
  
  // Add business criticality
  score += criteria.businessCriticalityScore * 0.1;
  
  // Decision threshold (configurable)
  return score > 50;
}

/**
 * Mock agent evaluation data for testing
 */
// Helper function to create a default agent evaluation data with basic values
const createDefaultAgentData = (): Partial<AgentRoleEvaluationParameters> => ({
  rolePerformance: {
    [AgentRole.ORCHESTRATOR]: {
      overallScore: 75,
      specialties: ['Basic Orchestration'],
      weaknesses: ['Complex Workflows'],
      bestPerformingLanguages: {
        'JavaScript': 75,
        'TypeScript': 75,
        'Python': 75,
        'Java': 75
      },
      bestFileTypes: {},
      bestScenarios: {}
    },
    [AgentRole.CODE_QUALITY]: {
      overallScore: 75,
      specialties: ['Basic Quality Analysis'],
      weaknesses: ['Advanced Analysis'],
      bestPerformingLanguages: {
        'JavaScript': 75,
        'TypeScript': 75,
        'Python': 75,
        'Java': 75
      },
      bestFileTypes: {},
      bestScenarios: {}
    },
    [AgentRole.SECURITY]: {
      overallScore: 75,
      specialties: ['Basic Security Analysis'],
      weaknesses: ['Complex Vulnerabilities'],
      bestPerformingLanguages: {},
      bestFileTypes: {},
      bestScenarios: {}
    },
    [AgentRole.PERFORMANCE]: {
      overallScore: 75,
      specialties: ['Basic Performance Analysis'],
      weaknesses: ['Advanced Optimization'],
      bestPerformingLanguages: {},
      bestFileTypes: {},
      bestScenarios: {}
    },
    [AgentRole.DEPENDENCY]: {
      overallScore: 75,
      specialties: ['Basic Dependency Analysis'],
      weaknesses: ['Complex Dependency Trees'],
      bestPerformingLanguages: {},
      bestFileTypes: {},
      bestScenarios: {}
    },
    [AgentRole.EDUCATIONAL]: {
      overallScore: 75,
      specialties: ['Basic Educational Content'],
      weaknesses: ['Advanced Topics'],
      bestPerformingLanguages: {},
      bestFileTypes: {},
      bestScenarios: {}
    },
    [AgentRole.REPORT_GENERATION]: {
      overallScore: 75,
      specialties: ['Basic Reports'],
      weaknesses: ['Advanced Documentation'],
      bestPerformingLanguages: {},
      bestFileTypes: {},
      bestScenarios: {}
    }
  },
  languageSupport: {
    fullSupport: ['JavaScript', 'Python'],
    goodSupport: ['TypeScript', 'Java'],
    basicSupport: ['C++', 'Go'],
    limitedSupport: ['Rust', 'Scala']
  }
});

// Create the mock agent evaluation data for all providers (lazy initialization)
export function getMockAgentEvaluationData(): Record<AgentProvider, Partial<AgentRoleEvaluationParameters>> {
  return {
    // MCP options
    [AgentProvider.MCP_CODE_REVIEW]: createDefaultAgentData(),
    [AgentProvider.MCP_DEPENDENCY]: createDefaultAgentData(),
    [AgentProvider.MCP_CODE_CHECKER]: createDefaultAgentData(),
    [AgentProvider.MCP_REPORTER]: createDefaultAgentData(),
  
  // Direct LLM providers
  [AgentProvider.CLAUDE]: {
    rolePerformance: {
      [AgentRole.ORCHESTRATOR]: {
        overallScore: 90,
        specialties: ['Complex Workflows', 'Coordination'],
        weaknesses: ['Hardware-specific Orchestration'],
        bestPerformingLanguages: {
          'JavaScript': 90,
          'TypeScript': 92,
          'Python': 89,
          'Java': 85
        },
        bestFileTypes: {},
        bestScenarios: {}
      },
      [AgentRole.CODE_QUALITY]: {
        overallScore: 92,
        specialties: ['JavaScript', 'Python', 'API Design'],
        weaknesses: ['Assembly', 'Embedded Systems'],
        bestPerformingLanguages: {
          'JavaScript': 93,
          'TypeScript': 90,
          'Python': 88,
          'Java': 85
        },
        bestFileTypes: {},
        bestScenarios: {}
      },
      [AgentRole.SECURITY]: {
        overallScore: 85,
        specialties: ['Web Security', 'Authorization'],
        weaknesses: ['Cryptography', 'Low-level Security'],
        bestPerformingLanguages: {},
        bestFileTypes: {},
        bestScenarios: {}
      },
      [AgentRole.PERFORMANCE]: {
        overallScore: 78,
        specialties: ['Algorithm Analysis', 'Database Optimization'],
        weaknesses: ['Hardware Optimization', 'Kernel-level Performance'],
        bestPerformingLanguages: {},
        bestFileTypes: {},
        bestScenarios: {}
      },
      [AgentRole.DEPENDENCY]: {
        overallScore: 88,
        specialties: ['Dependency Resolution', 'Version Management'],
        weaknesses: ['Native Dependencies'],
        bestPerformingLanguages: {},
        bestFileTypes: {},
        bestScenarios: {}
      },
      [AgentRole.EDUCATIONAL]: {
        overallScore: 95,
        specialties: ['Detailed Explanations', 'Beginner Tutorials'],
        weaknesses: [],
        bestPerformingLanguages: {},
        bestFileTypes: {},
        bestScenarios: {}
      },
      [AgentRole.REPORT_GENERATION]: {
        overallScore: 90,
        specialties: ['API Documentation', 'User Guides'],
        weaknesses: [],
        bestPerformingLanguages: {},
        bestFileTypes: {},
        bestScenarios: {}
      }
    },
    languageSupport: {
      fullSupport: ['JavaScript', 'TypeScript', 'Python', 'Java'],
      goodSupport: ['Go', 'Ruby', 'PHP', 'C#'],
      basicSupport: ['C++', 'Rust', 'Swift'],
      limitedSupport: ['Kotlin', 'Scala', 'Perl']
    }
  },
  [AgentProvider.OPENAI]: {
    rolePerformance: {
      [AgentRole.ORCHESTRATOR]: {
        overallScore: 89,
        specialties: ['Workflow Management', 'Task Distribution'],
        weaknesses: ['Complex System Integration'],
        bestPerformingLanguages: {
          'JavaScript': 87,
          'TypeScript': 88,
          'Python': 90,
          'Java': 84
        },
        bestFileTypes: {},
        bestScenarios: {}
      },
      [AgentRole.CODE_QUALITY]: {
        overallScore: 88,
        specialties: ['Refactoring', 'Code Style'],
        weaknesses: ['Legacy Systems'],
        bestPerformingLanguages: {
          'JavaScript': 86,
          'TypeScript': 85,
          'Python': 90,
          'Java': 82
        },
        bestFileTypes: {},
        bestScenarios: {}
      },
      [AgentRole.SECURITY]: {
        overallScore: 91,
        specialties: ['Injection Vulnerabilities', 'Authentication'],
        weaknesses: [],
        bestPerformingLanguages: {},
        bestFileTypes: {},
        bestScenarios: {}
      },
      [AgentRole.PERFORMANCE]: {
        overallScore: 82,
        specialties: ['Memory Usage', 'Execution Efficiency'],
        weaknesses: [],
        bestPerformingLanguages: {},
        bestFileTypes: {},
        bestScenarios: {}
      },
      [AgentRole.DEPENDENCY]: {
        overallScore: 85,
        specialties: ['Package Management', 'Library Compatibility'],
        weaknesses: ['Complex Dependency Trees'],
        bestPerformingLanguages: {},
        bestFileTypes: {},
        bestScenarios: {}
      },
      [AgentRole.EDUCATIONAL]: {
        overallScore: 87,
        specialties: ['Interactive Tutorials', 'Concise Explanations'],
        weaknesses: [],
        bestPerformingLanguages: {},
        bestFileTypes: {},
        bestScenarios: {}
      },
      [AgentRole.REPORT_GENERATION]: {
        overallScore: 85,
        specialties: ['Technical Writing', 'Code Comments'],
        weaknesses: [],
        bestPerformingLanguages: {},
        bestFileTypes: {},
        bestScenarios: {}
      }
    },
    languageSupport: {
      fullSupport: ['JavaScript', 'Python', 'Java', 'C#'],
      goodSupport: ['TypeScript', 'Go', 'Ruby', 'PHP'],
      basicSupport: ['C++', 'Swift', 'Rust'],
      limitedSupport: ['Haskell', 'Scala', 'R']
    }
  },
  [AgentProvider.DEEPSEEK_CODER]: {
    rolePerformance: {
      [AgentRole.ORCHESTRATOR]: {
        overallScore: 82,
        specialties: ['System Analysis', 'Technical Integration'],
        weaknesses: ['Business Logic Orchestration'],
        bestPerformingLanguages: {
          'C++': 90,
          'JavaScript': 80,
          'TypeScript': 82,
          'Python': 86
        },
        bestFileTypes: {},
        bestScenarios: {}
      },
      [AgentRole.CODE_QUALITY]: {
        overallScore: 83,
        specialties: ['Low-level Optimization', 'Complex Logic'],
        weaknesses: ['Web Frameworks'],
        bestPerformingLanguages: {
          'C++': 92,
          'JavaScript': 78,
          'TypeScript': 80,
          'Python': 85
        },
        bestFileTypes: {},
        bestScenarios: {}
      },
      [AgentRole.SECURITY]: {
        overallScore: 76,
        specialties: ['Buffer Overflows', 'Memory Safety'],
        weaknesses: ['Web Security'],
        bestPerformingLanguages: {},
        bestFileTypes: {},
        bestScenarios: {}
      },
      [AgentRole.PERFORMANCE]: {
        overallScore: 93,
        specialties: ['Algorithm Optimization', 'Execution Speed'],
        weaknesses: [],
        bestPerformingLanguages: {},
        bestFileTypes: {},
        bestScenarios: {}
      },
      [AgentRole.DEPENDENCY]: {
        overallScore: 79,
        specialties: ['System Dependency Analysis', 'Binary Compatibility'],
        weaknesses: ['Modern Package Ecosystems'],
        bestPerformingLanguages: {},
        bestFileTypes: {},
        bestScenarios: {}
      },
      [AgentRole.EDUCATIONAL]: {
        overallScore: 80,
        specialties: ['Advanced Topics', 'Deep Dives'],
        weaknesses: ['Beginner Material'],
        bestPerformingLanguages: {},
        bestFileTypes: {},
        bestScenarios: {}
      },
      [AgentRole.REPORT_GENERATION]: {
        overallScore: 75,
        specialties: ['Technical API Details', 'Implementation Notes'],
        weaknesses: ['User-friendly Documentation'],
        bestPerformingLanguages: {},
        bestFileTypes: {},
        bestScenarios: {}
      }
    },
    languageSupport: {
      fullSupport: ['C++', 'C', 'Rust', 'Go'],
      goodSupport: ['Python', 'Java', 'TypeScript'],
      basicSupport: ['JavaScript', 'C#', 'Ruby'],
      limitedSupport: ['PHP', 'Swift', 'Kotlin']
    }
  },
  [AgentProvider.GEMINI_2_5_PRO]: {
    rolePerformance: {
      [AgentRole.ORCHESTRATOR]: {
        overallScore: 88,
        specialties: ['Cross-discipline Coordination', 'Balanced Decision Making'],
        weaknesses: ['Complex System Engineering'],
        bestPerformingLanguages: {
          'JavaScript': 89,
          'TypeScript': 90,
          'Python': 88,
          'Java': 87
        },
        bestFileTypes: {},
        bestScenarios: {}
      },
      [AgentRole.CODE_QUALITY]: {
        overallScore: 86,
        specialties: ['Mobile Development', 'Modern Frameworks'],
        weaknesses: ['Legacy Code'],
        bestPerformingLanguages: {
          'JavaScript': 88,
          'TypeScript': 89,
          'Python': 87,
          'Java': 90
        },
        bestFileTypes: {},
        bestScenarios: {}
      },
      [AgentRole.SECURITY]: {
        overallScore: 84,
        specialties: ['Access Control', 'Secure Communication'],
        weaknesses: [],
        bestPerformingLanguages: {},
        bestFileTypes: {},
        bestScenarios: {}
      },
      [AgentRole.PERFORMANCE]: {
        overallScore: 87,
        specialties: ['Resource Utilization', 'Concurrency'],
        weaknesses: [],
        bestPerformingLanguages: {},
        bestFileTypes: {},
        bestScenarios: {}
      },
      [AgentRole.DEPENDENCY]: {
        overallScore: 83,
        specialties: ['Modern Package Ecosystems', 'Dependency Visualization'],
        weaknesses: ['System-level Dependencies'],
        bestPerformingLanguages: {},
        bestFileTypes: {},
        bestScenarios: {}
      },
      [AgentRole.EDUCATIONAL]: {
        overallScore: 91,
        specialties: ['Visual Explanations', 'Step-by-step Guides'],
        weaknesses: [],
        bestPerformingLanguages: {},
        bestFileTypes: {},
        bestScenarios: {}
      },
      [AgentRole.REPORT_GENERATION]: {
        overallScore: 87,
        specialties: ['Comprehensive Coverage', 'Structured Documentation'],
        weaknesses: [],
        bestPerformingLanguages: {},
        bestFileTypes: {},
        bestScenarios: {}
      }
    },
    languageSupport: {
      fullSupport: ['JavaScript', 'TypeScript', 'Python', 'Kotlin'],
      goodSupport: ['Java', 'Go', 'Swift', 'C#'],
      basicSupport: ['C++', 'Ruby', 'PHP'],
      limitedSupport: ['Rust', 'Dart', 'Scala']
    }
  },
  // Add all remaining providers
  [AgentProvider.DEEPSEEK_CODER_LITE]: createDefaultAgentData(),
  [AgentProvider.DEEPSEEK_CODER_PLUS]: createDefaultAgentData(),
  [AgentProvider.DEEPSEEK_CHAT]: createDefaultAgentData(),
  [AgentProvider.GEMINI_1_5_PRO]: createDefaultAgentData(),
  [AgentProvider.GEMINI_2_5_FLASH]: createDefaultAgentData(),
  [AgentProvider.BITO]: createDefaultAgentData(),
    [AgentProvider.CODE_RABBIT]: createDefaultAgentData(),
    [AgentProvider.MCP_GEMINI]: createDefaultAgentData(),
    [AgentProvider.MCP_OPENAI]: createDefaultAgentData(),
    [AgentProvider.MCP_GROK]: createDefaultAgentData(),
    [AgentProvider.MCP_LLAMA]: createDefaultAgentData(),
    [AgentProvider.MCP_DEEPSEEK]: createDefaultAgentData()
  };
}

// Export with lazy initialization to avoid enum evaluation during module loading
let _mockAgentEvaluationData: Record<AgentProvider, Partial<AgentRoleEvaluationParameters>> | undefined;

export const mockAgentEvaluationData = new Proxy({} as Record<AgentProvider, Partial<AgentRoleEvaluationParameters>>, {
  get(target, prop) {
    if (!_mockAgentEvaluationData) {
      _mockAgentEvaluationData = getMockAgentEvaluationData();
    }
    return _mockAgentEvaluationData[prop as AgentProvider];
  },
  ownKeys(target) {
    if (!_mockAgentEvaluationData) {
      _mockAgentEvaluationData = getMockAgentEvaluationData();
    }
    return Object.keys(_mockAgentEvaluationData);
  },
  getOwnPropertyDescriptor(target, prop) {
    if (!_mockAgentEvaluationData) {
      _mockAgentEvaluationData = getMockAgentEvaluationData();
    }
    if (prop in _mockAgentEvaluationData) {
      return {
        enumerable: true,
        configurable: true,
        value: _mockAgentEvaluationData[prop as AgentProvider]
      };
    }
    return undefined;
  }
});
