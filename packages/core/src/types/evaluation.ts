import { AgentRole, AgentProvider } from '../config/agent-registry';

/**
 * Represents the model version with its capabilities
 */
export interface ModelVersion {
  /**
   * Name of the model version
   */
  name: string;
  
  /**
   * Provider of the model
   */
  provider: AgentProvider;
  
  /**
   * Maximum tokens the model can process
   */
  maxTokens: number;
  
  /**
   * Date when the model was released
   */
  releaseDate: string;
  
  /**
   * Whether the model is in preview/experimental stage
   */
  isPreview?: boolean;
}

/**
 * Performance evaluation parameters for agent-role combinations
 */
export interface AgentRoleEvaluationParameters {
  /**
   * Basic agent capabilities
   */
  agent: {
    /**
     * Provider of the agent
     */
    provider: AgentProvider;
    
    /**
     * Model version used by the agent
     */
    modelVersion: ModelVersion;
    
    /**
     * Maximum tokens the agent can process
     */
    maxTokens: number;
    
    /**
     * Cost per token for the agent
     */
    costPerToken: number;
    
    /**
     * Average latency in milliseconds
     */
    averageLatency: number;
  };
  
  /**
   * Role-specific performance metrics
   */
  rolePerformance: {
    [role in AgentRole]: {
      /**
       * Overall performance score (0-100)
       */
      overallScore: number;
      
      /**
       * Areas where the agent excels
       */
      specialties: string[];
      
      /**
       * Areas where the agent struggles
       */
      weaknesses: string[];
      
      /**
       * Languages where the agent performs well
       */
      bestPerformingLanguages: {
        [language: string]: number; // 0-100 score
      };
      
      /**
       * File types where the agent performs well
       */
      bestFileTypes: {
        [fileType: string]: number; // 0-100 score
      };
      
      /**
       * Specific scenarios where the agent excels
       */
      bestScenarios: {
        [scenario: string]: number; // 0-100 score
      };
    };
  };
  
  /**
   * Performance metrics for specific repository characteristics
   */
  repoCharacteristics: {
    /**
     * Performance by repository size
     */
    sizePerformance: {
      small: number;      // 0-100 score
      medium: number;     // 0-100 score
      large: number;      // 0-100 score
      enterprise: number; // 0-100 score
    };
    
    /**
     * Performance by repository complexity
     */
    complexityPerformance: {
      simple: number;         // 0-100 score
      moderate: number;       // 0-100 score 
      complex: number;        // 0-100 score
      highlyComplex: number;  // 0-100 score
    };
    
    /**
     * Performance by architecture type
     */
    architecturePerformance: {
      monolith: number;       // 0-100 score
      microservices: number;  // 0-100 score
      serverless: number;     // 0-100 score
      hybrid: number;         // 0-100 score
    };
  };
  
  /**
   * Performance metrics for specific PR characteristics
   */
  prCharacteristics: {
    /**
     * Performance by PR size
     */
    sizePerformance: {
      tiny: number;    // 0-100 score (1-10 files)
      small: number;   // 0-100 score (11-50 files)
      medium: number;  // 0-100 score (51-200 files)
      large: number;   // 0-100 score (201+ files)
    };
    
    /**
     * Performance by change type
     */
    changeTypePerformance: {
      feature: number;             // 0-100 score
      bugfix: number;              // 0-100 score
      refactoring: number;         // 0-100 score
      documentation: number;       // 0-100 score
      infrastructureChange: number; // 0-100 score
    };
  };
  
  /**
   * Framework and library specific performance
   */
  frameworkPerformance: {
    [framework: string]: number;   // 0-100 score
  };
  
  /**
   * Historical performance data
   */
  historicalPerformance: {
    /**
     * Total number of runs
     */
    totalRuns: number;
    
    /**
     * Success rate (0-1.0)
     */
    successRate: number;
    
    /**
     * Average user satisfaction (0-100)
     */
    averageUserSatisfaction: number;
    
    /**
     * Token utilization efficiency
     */
    tokenUtilization: number;
    
    /**
     * Average finding quality (0-100)
     */
    averageFindingQuality: number;
  };
  
  /**
   * Performance metrics for Model Control Plane integration
   */
  mcpPerformance?: {
    /**
     * Performance with MCP
     */
    withMCP: {
      qualityScore: number;    // 0-100
      speedScore: number;      // 0-100
      costEfficiency: number;  // 0-100
    };
    
    /**
     * Performance without MCP
     */
    withoutMCP: {
      qualityScore: number;    // 0-100
      speedScore: number;      // 0-100
      costEfficiency: number;  // 0-100
    };
    
    /**
     * Whether MCP is recommended for this agent-role combination
     */
    recommendMCP: boolean;
  };
}