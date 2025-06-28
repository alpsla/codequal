/**
 * Diversified E2E Test Scenarios for Orchestrator Flow
 * 
 * This file defines comprehensive test scenarios covering:
 * - Different repository sizes
 * - Multiple programming languages 
 * - Various frameworks
 * - Different complexity levels
 * - Diverse PR types and domains
 * - Execution mode-specific test step configurations
 */

export interface ExecutionModeConfig {
  mode: string;
  description: string;
  stepsToExecute: {
    authentication: boolean;
    prAnalysis: boolean;
    deepWikiAnalysis: boolean;
    toolExecution: boolean;
    multiAgentAnalysis: boolean;
    educationalAgent: boolean;
    reporterAgent: boolean;
    finalValidation: boolean;
  };
  toolsToSkip?: string[];
  agentsToSkip?: string[];
  timeoutMultiplier: number; // Multiply base timeouts
  performanceTargets: {
    maxExecutionTimeMultiplier: number;
  };
}

export interface TestScenario {
  id: string;
  name: string;
  description: string;
  
  // Repository context
  repositoryUrl: string;
  prNumber: number;
  primaryLanguage: string;
  frameworks: string[];
  repositorySize: 'small' | 'medium' | 'large';
  complexity: 'simple' | 'moderate' | 'complex';
  
  // Expected agent focus areas
  expectedDominantAgents: string[]; // Which agents should find most issues
  expectedToolResults: string[]; // Which tools should produce significant results
  
  // Test expectations
  expectedFindings: {
    minTotalFindings: number;
    expectedCategories: string[];
    severityDistribution: {
      critical?: number;
      high?: number;
      medium?: number;
      low?: number;
    };
  };
  
  // Educational expectations
  expectedEducationalContent: {
    minResourceCount: number;
    expectedSkillLevels: string[];
    expectedTopics: string[];
  };
  
  // Performance expectations
  performanceTargets: {
    maxExecutionTime: number; // seconds
    maxMemoryUsage?: number; // MB
    maxTokenUsage?: number; // estimated max tokens
    maxCost?: number; // estimated max cost in USD
  };
  
  // Test configuration
  timeout: number; // milliseconds
  retryCount: number;
}

export const E2E_TEST_SCENARIOS: TestScenario[] = [
  // Scenario 1: Large TypeScript/React Application
  {
    id: 'vscode-typescript-large',
    name: 'VSCode - Large TypeScript Application',
    description: 'Complex TypeScript/Electron application with extensive codebase',
    
    repositoryUrl: 'https://github.com/microsoft/vscode',
    prNumber: 150000, // Will fallback to latest available
    primaryLanguage: 'typescript',
    frameworks: ['electron', 'node.js'],
    repositorySize: 'large',
    complexity: 'complex',
    
    expectedDominantAgents: ['codeQuality', 'architecture', 'performance'],
    expectedToolResults: ['madge', 'dependency-cruiser', 'eslint-direct', 'mcp-docs-service'],
    
    expectedFindings: {
      minTotalFindings: 15,
      expectedCategories: ['architecture', 'codeQuality', 'performance', 'dependency'],
      severityDistribution: {
        high: 3,
        medium: 8,
        low: 4
      }
    },
    
    expectedEducationalContent: {
      minResourceCount: 10,
      expectedSkillLevels: ['intermediate', 'advanced'],
      expectedTopics: ['TypeScript', 'Architecture', 'Performance', 'Code Quality']
    },
    
    performanceTargets: {
      maxExecutionTime: 300, // 5 minutes
      maxTokenUsage: 50000, // Large TypeScript project
      maxCost: 2.50 // $2.50 estimated for complex analysis
    },
    
    timeout: 600000, // 10 minutes
    retryCount: 2
  },

  // Scenario 2: Medium JavaScript/React Application  
  {
    id: 'react-javascript-medium',
    name: 'React - Medium JavaScript Application',
    description: 'Modern React application with typical web dependencies',
    
    repositoryUrl: 'https://github.com/facebook/react',
    prNumber: 25000,
    primaryLanguage: 'javascript',
    frameworks: ['react'],
    repositorySize: 'medium',
    complexity: 'moderate',
    
    expectedDominantAgents: ['codeQuality', 'security', 'dependency'],
    expectedToolResults: ['npm-audit', 'license-checker', 'bundlephobia-direct'],
    
    expectedFindings: {
      minTotalFindings: 8,
      expectedCategories: ['security', 'codeQuality', 'dependency'],
      severityDistribution: {
        critical: 1,
        high: 2,
        medium: 3,
        low: 2
      }
    },
    
    expectedEducationalContent: {
      minResourceCount: 6,
      expectedSkillLevels: ['beginner', 'intermediate'],
      expectedTopics: ['React', 'JavaScript', 'Security', 'Dependencies']
    },
    
    performanceTargets: {
      maxExecutionTime: 180, // 3 minutes
      maxTokenUsage: 30000, // Medium JavaScript project
      maxCost: 1.50 // $1.50 estimated
    },
    
    timeout: 360000, // 6 minutes
    retryCount: 1
  },

  // Scenario 3: Small Python/Flask Application
  {
    id: 'flask-python-small',
    name: 'Flask - Small Python Application',
    description: 'Lightweight Python Flask web application',
    
    repositoryUrl: 'https://github.com/pallets/flask',
    prNumber: 4500,
    primaryLanguage: 'python',
    frameworks: ['flask'],
    repositorySize: 'small',
    complexity: 'simple',
    
    expectedDominantAgents: ['security', 'codeQuality'],
    expectedToolResults: ['npm-audit', 'eslint-direct'], // Note: will test tool adaptation for Python
    
    expectedFindings: {
      minTotalFindings: 4,
      expectedCategories: ['security', 'codeQuality'],
      severityDistribution: {
        medium: 2,
        low: 2
      }
    },
    
    expectedEducationalContent: {
      minResourceCount: 4,
      expectedSkillLevels: ['beginner', 'intermediate'],
      expectedTopics: ['Python', 'Flask', 'Web Security']
    },
    
    performanceTargets: {
      maxExecutionTime: 120, // 2 minutes
      maxTokenUsage: 15000, // Small Python project
      maxCost: 0.75 // $0.75 estimated
    },
    
    timeout: 240000, // 4 minutes
    retryCount: 1
  },

  // Scenario 4: Java/Spring Enterprise Application
  {
    id: 'spring-java-large',
    name: 'Spring - Large Java Enterprise Application', 
    description: 'Enterprise Java application with Spring framework',
    
    repositoryUrl: 'https://github.com/spring-projects/spring-boot',
    prNumber: 30000,
    primaryLanguage: 'java',
    frameworks: ['spring-boot', 'maven'],
    repositorySize: 'large',
    complexity: 'complex',
    
    expectedDominantAgents: ['architecture', 'security', 'performance'],
    expectedToolResults: ['dependency-cruiser', 'madge'], // Will test tool adaptation for Java
    
    expectedFindings: {
      minTotalFindings: 12,
      expectedCategories: ['architecture', 'security', 'performance', 'dependency'],
      severityDistribution: {
        critical: 2,
        high: 4,
        medium: 4,
        low: 2
      }
    },
    
    expectedEducationalContent: {
      minResourceCount: 8,
      expectedSkillLevels: ['intermediate', 'advanced'],
      expectedTopics: ['Java', 'Spring', 'Enterprise Architecture', 'Security']
    },
    
    performanceTargets: {
      maxExecutionTime: 240, // 4 minutes
      maxTokenUsage: 45000, // Large Java project
      maxCost: 2.25 // $2.25 estimated
    },
    
    timeout: 480000, // 8 minutes
    retryCount: 2
  },

  // Scenario 5: Rust Systems Programming
  {
    id: 'rust-systems-medium',
    name: 'Rust - Medium Systems Programming',
    description: 'Systems programming application in Rust',
    
    repositoryUrl: 'https://github.com/tokio-rs/tokio',
    prNumber: 5000,
    primaryLanguage: 'rust',
    frameworks: ['tokio', 'cargo'],
    repositorySize: 'medium',
    complexity: 'complex',
    
    expectedDominantAgents: ['performance', 'architecture', 'security'],
    expectedToolResults: ['dependency-cruiser'], // Will test Rust-specific adaptations
    
    expectedFindings: {
      minTotalFindings: 6,
      expectedCategories: ['performance', 'architecture', 'security'],
      severityDistribution: {
        high: 2,
        medium: 3,
        low: 1
      }
    },
    
    expectedEducationalContent: {
      minResourceCount: 5,
      expectedSkillLevels: ['intermediate', 'advanced'],
      expectedTopics: ['Rust', 'Systems Programming', 'Performance', 'Memory Safety']
    },
    
    performanceTargets: {
      maxExecutionTime: 150, // 2.5 minutes
      maxTokenUsage: 25000, // Medium Rust project
      maxCost: 1.25 // $1.25 estimated
    },
    
    timeout: 300000, // 5 minutes
    retryCount: 1
  },

  // Scenario 6: Go Microservices
  {
    id: 'go-microservices-medium',
    name: 'Go - Medium Microservices Application',
    description: 'Cloud-native microservices application in Go',
    
    repositoryUrl: 'https://github.com/kubernetes/kubernetes',
    prNumber: 100000,
    primaryLanguage: 'go',
    frameworks: ['go-modules'],
    repositorySize: 'large',
    complexity: 'complex',
    
    expectedDominantAgents: ['architecture', 'performance', 'security'],
    expectedToolResults: ['dependency-cruiser', 'madge'],
    
    expectedFindings: {
      minTotalFindings: 10,
      expectedCategories: ['architecture', 'performance', 'security', 'dependency'],
      severityDistribution: {
        critical: 1,
        high: 3,
        medium: 4,
        low: 2
      }
    },
    
    expectedEducationalContent: {
      minResourceCount: 7,
      expectedSkillLevels: ['intermediate', 'advanced'],
      expectedTopics: ['Go', 'Microservices', 'Cloud Architecture', 'Performance']
    },
    
    performanceTargets: {
      maxExecutionTime: 300, // 5 minutes
      maxTokenUsage: 55000, // Large Go project
      maxCost: 2.75 // $2.75 estimated
    },
    
    timeout: 600000, // 10 minutes
    retryCount: 2
  }
];

/**
 * Test scenario categories for organized execution
 */
export const SCENARIO_CATEGORIES = {
  BY_SIZE: {
    small: E2E_TEST_SCENARIOS.filter(s => s.repositorySize === 'small'),
    medium: E2E_TEST_SCENARIOS.filter(s => s.repositorySize === 'medium'),
    large: E2E_TEST_SCENARIOS.filter(s => s.repositorySize === 'large')
  },
  
  BY_LANGUAGE: {
    typescript: E2E_TEST_SCENARIOS.filter(s => s.primaryLanguage === 'typescript'),
    javascript: E2E_TEST_SCENARIOS.filter(s => s.primaryLanguage === 'javascript'),
    python: E2E_TEST_SCENARIOS.filter(s => s.primaryLanguage === 'python'),
    java: E2E_TEST_SCENARIOS.filter(s => s.primaryLanguage === 'java'),
    rust: E2E_TEST_SCENARIOS.filter(s => s.primaryLanguage === 'rust'),
    go: E2E_TEST_SCENARIOS.filter(s => s.primaryLanguage === 'go')
  },
  
  BY_COMPLEXITY: {
    simple: E2E_TEST_SCENARIOS.filter(s => s.complexity === 'simple'),
    moderate: E2E_TEST_SCENARIOS.filter(s => s.complexity === 'moderate'),
    complex: E2E_TEST_SCENARIOS.filter(s => s.complexity === 'complex')
  },
  
  QUICK_SMOKE_TEST: E2E_TEST_SCENARIOS.filter(s => 
    s.repositorySize === 'small' || s.performanceTargets.maxExecutionTime <= 120
  ),
  
  COMPREHENSIVE_TEST: E2E_TEST_SCENARIOS,
  
  PERFORMANCE_FOCUSED: E2E_TEST_SCENARIOS.filter(s => 
    s.expectedDominantAgents.includes('performance')
  )
};

/**
 * Smart Orchestrator Testing Configuration
 * 
 * We use COMPREHENSIVE_TEST as the baseline to measure real performance,
 * then let the orchestrator's intelligence handle optimization based on:
 * 
 * 1. PR Context Analysis:
 *    - Small UI changes → Skip Security/Dependencies agents
 *    - File extensions → Language-specific tool filtering  
 *    - Change scope → Agent relevance scoring
 * 
 * 2. Repository Analysis Intelligence:
 *    - DeepWiki scheduler → Fresh vs cached analysis
 *    - Repository activity → Analysis frequency optimization
 *    - Change magnitude → Tool execution prioritization
 * 
 * 3. Performance Learning:
 *    - Tool execution time tracking
 *    - Agent relevance scoring per repo type
 *    - Dynamic timeout adjustment
 */
export const SMART_ORCHESTRATOR_CONFIG = {
  mode: 'SMART_COMPREHENSIVE',
  description: 'Full orchestrator execution with built-in intelligence and performance measurement',
  stepsToExecute: {
    authentication: true,
    prAnalysis: true,             // Always analyze PR context first
    deepWikiAnalysis: true,       // Let scheduler decide fresh vs cached
    toolExecution: true,          // Let orchestrator decide tool relevance
    multiAgentAnalysis: true,     // Let orchestrator decide agent relevance
    educationalAgent: true,       // Always include for learning content
    reporterAgent: true,          // Always generate reports
    finalValidation: true
  },
  
  // Intelligence features to test (based on actual implementation)
  existingIntelligenceFeatures: {
    repositoryStatusChecking: true,      // ✅ IMPLEMENTED: Check Vector DB freshness
    modelSelectionOptimization: true,    // ✅ IMPLEMENTED: Context-aware model selection
    agentSelectionLogic: true,          // ✅ IMPLEMENTED: Sophisticated agent scoring
    analysisModeIntelligence: true,     // ✅ IMPLEMENTED: Mode-based agent selection
    toolFilteringBasic: true,           // ✅ IMPLEMENTED: File extension-based filtering
    repositoryScheduling: true,         // ✅ IMPLEMENTED: Activity-based scheduling
    vectorContextRetrieval: true        // ✅ IMPLEMENTED: Agent-specific context
  },
  
  // Intelligence features priorities for implementation
  prioritizedIntelligenceFeatures: {
    contextBasedAgentSkipping: {
      status: 'HIGH_PRIORITY',           // ✅ IMPLEMENT: Skip agents based on PR changes
      description: 'Skip Security/Dependencies for UI-only PRs, skip Performance for docs-only PRs',
      estimatedImpact: '30-50% time reduction for small PRs'
    },
    intelligentToolResultIntegration: {
      status: 'HIGH_PRIORITY',           // ✅ IMPLEMENT: Smart filtering of tool results
      description: 'Filter duplicate findings, merge related issues, prioritize critical results',
      estimatedImpact: 'Better agent accuracy, reduced noise'
    },
    dynamicTimeoutAdjustment: {
      status: 'MEDIUM_PRIORITY',         // ⚠️ CONSIDER: Adjust timeouts based on repo size
      description: 'Prevent analysis failures on large repos, faster feedback on small repos',
      estimatedImpact: 'Reduced timeout failures'
    }
  },
  
  // Features explicitly deprioritized
  deprioritizedFeatures: {
    performanceLearningSystem: 'PHASE_2',    // Focus on quality over learning optimization
    costAwareOptimization: 'NOT_NEEDED',     // Sufficient profit margin for detailed analysis
    resourceUsageLearning: 'PHASE_2'         // Performance optimization post-release
  },
  
  // Measurement targets
  performanceTracking: {
    trackIndividualToolTimes: true,
    trackAgentRelevanceScores: true,
    trackDeepWikiCacheHitRatio: true,
    trackOverallExecutionTime: true,
    trackMemoryUsage: true
  },
  
  timeoutMultiplier: 2.0,        // Generous timeout for measurement phase
  performanceTargets: {
    maxExecutionTimeMultiplier: 1.0  // Measure actual intelligent execution time
  }
};

/**
 * Utility functions for test scenario management
 */
export class TestScenarioManager {
  
  static getScenarioById(id: string): TestScenario | undefined {
    return E2E_TEST_SCENARIOS.find(s => s.id === id);
  }
  
  static getScenariosByCategory(category: keyof typeof SCENARIO_CATEGORIES): TestScenario[] {
    return SCENARIO_CATEGORIES[category] as TestScenario[];
  }
  
  static validateScenarioCompatibility(scenario: TestScenario): boolean {
    // Validate that the scenario is compatible with current system capabilities
    const supportedLanguages = ['typescript', 'javascript', 'python', 'java', 'rust', 'go'];
    return supportedLanguages.includes(scenario.primaryLanguage);
  }
  
  static estimateTotalExecutionTime(scenarios: TestScenario[]): number {
    return scenarios.reduce((total, scenario) => {
      return total + scenario.performanceTargets.maxExecutionTime;
    }, 0);
  }
  
  static generateTestReport(scenario: TestScenario, results: Record<string, unknown>): Record<string, unknown> {
    const executionTime = results.executionTime as number;
    const findingsCount = results.findingsCount as number;
    const educationalContentCount = results.educationalContentCount as number;
    
    return {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      executionTime,
      success: results.success,
      findingsGenerated: findingsCount,
      expectedFindings: scenario.expectedFindings.minTotalFindings,
      meetsFindingsExpectation: findingsCount >= scenario.expectedFindings.minTotalFindings,
      meetsPerformanceTarget: executionTime <= scenario.performanceTargets.maxExecutionTime,
      educationalContentGenerated: educationalContentCount,
      agentResults: results.agentResults,
      issues: results.issues || []
    };
  }
  
  static getExecutionModeConfig(_mode: string): ExecutionModeConfig {
    // For now, return the smart orchestrator config
    return SMART_ORCHESTRATOR_CONFIG;
  }
  
  static shouldExecuteStep(mode: string, step: keyof ExecutionModeConfig['stepsToExecute']): boolean {
    const config = this.getExecutionModeConfig(mode);
    return config.stepsToExecute[step];
  }
  
  static getToolsToSkip(mode: string): string[] {
    const config = this.getExecutionModeConfig(mode);
    return config.toolsToSkip || [];
  }
  
  static getAgentsToSkip(mode: string): string[] {
    const config = this.getExecutionModeConfig(mode);
    return config.agentsToSkip || [];
  }
  
  static getTimeoutMultiplier(mode: string): number {
    const config = this.getExecutionModeConfig(mode);
    return config.timeoutMultiplier;
  }
}