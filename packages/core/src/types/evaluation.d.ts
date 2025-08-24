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
                [language: string]: number;
            };
            /**
             * File types where the agent performs well
             */
            bestFileTypes: {
                [fileType: string]: number;
            };
            /**
             * Specific scenarios where the agent excels
             */
            bestScenarios: {
                [scenario: string]: number;
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
            small: number;
            medium: number;
            large: number;
            enterprise: number;
        };
        /**
         * Performance by repository complexity
         */
        complexityPerformance: {
            simple: number;
            moderate: number;
            complex: number;
            highlyComplex: number;
        };
        /**
         * Performance by architecture type
         */
        architecturePerformance: {
            monolith: number;
            microservices: number;
            serverless: number;
            hybrid: number;
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
            tiny: number;
            small: number;
            medium: number;
            large: number;
        };
        /**
         * Performance by change type
         */
        changeTypePerformance: {
            feature: number;
            bugfix: number;
            refactoring: number;
            documentation: number;
            infrastructureChange: number;
        };
    };
    /**
     * Framework and library specific performance
     */
    frameworkPerformance: {
        [framework: string]: number;
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
            qualityScore: number;
            speedScore: number;
            costEfficiency: number;
        };
        /**
         * Performance without MCP
         */
        withoutMCP: {
            qualityScore: number;
            speedScore: number;
            costEfficiency: number;
        };
        /**
         * Whether MCP is recommended for this agent-role combination
         */
        recommendMCP: boolean;
    };
}
