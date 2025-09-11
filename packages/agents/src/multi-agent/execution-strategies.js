"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionStrategyFactory = exports.HybridExecutionStrategy = exports.SpecializedExecutionStrategy = exports.SequentialExecutionStrategy = exports.ParallelExecutionStrategy = void 0;
const types_1 = require("./types");
const utils_1 = require("@codequal/core/utils");
const agent_registry_1 = require("@codequal/core/config/agent-registry");
/**
 * Parallel execution strategy - all agents run concurrently
 */
class ParallelExecutionStrategy {
    constructor() {
        this.logger = (0, utils_1.createLogger)('ParallelStrategy');
    }
    getName() {
        return 'Parallel';
    }
    getDescription() {
        return 'Execute all agents concurrently for maximum speed';
    }
    async execute(context) {
        const startTime = Date.now();
        const { agents, options } = context;
        this.logger.info('Starting parallel execution', { agentCount: agents.length });
        // Create semaphore for concurrency control
        const semaphore = new Semaphore(options.maxConcurrentAgents);
        // Execute all agents with concurrency control
        const executionPromises = agents.map(async (agentConfig) => {
            return semaphore.acquire(async () => {
                return this.executeAgent(agentConfig, context);
            });
        });
        // Wait for all agents to complete
        const results = await Promise.allSettled(executionPromises);
        // Process results
        const successfulResults = results
            .filter((result) => result.status === 'fulfilled')
            .map(result => result.value);
        const failedResults = results
            .filter((result) => result.status === 'rejected');
        if (failedResults.length > 0) {
            this.logger.warn('Some agents failed in parallel execution', {
                failed: failedResults.length,
                successful: successfulResults.length
            });
        }
        const duration = Date.now() - startTime;
        return {
            results: successfulResults,
            metadata: {
                duration,
                tokenUsage: this.calculateTokenUsage(successfulResults),
                successfulAgents: successfulResults.length,
                failedAgents: failedResults.length,
                strategy: types_1.AnalysisStrategy.PARALLEL
            }
        };
    }
    async executeAgent(agentConfig, _context) {
        // This would integrate with the actual agent execution logic
        // For now, return a mock result
        await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500));
        return {
            agentId: `${agentConfig.provider}-${agentConfig.role}`,
            config: agentConfig,
            result: {
                insights: [`Analysis from ${agentConfig.provider}`],
                suggestions: [`Suggestion from ${agentConfig.role}`],
                metadata: { executionTime: Date.now() }
            }
        };
    }
    calculateTokenUsage(results) {
        // Mock calculation - would be real in actual implementation
        return results.length * 1000;
    }
}
exports.ParallelExecutionStrategy = ParallelExecutionStrategy;
/**
 * Sequential execution strategy - agents run one after another with context passing
 */
class SequentialExecutionStrategy {
    constructor() {
        this.logger = (0, utils_1.createLogger)('SequentialStrategy');
    }
    getName() {
        return 'Sequential';
    }
    getDescription() {
        return 'Execute agents sequentially, passing context between them';
    }
    async execute(context) {
        const startTime = Date.now();
        const { agents } = context;
        this.logger.info('Starting sequential execution', { agentCount: agents.length });
        const results = [];
        let accumulatedContext = { ...context.additionalContext };
        let successfulAgents = 0;
        let failedAgents = 0;
        // Execute agents sequentially
        for (let i = 0; i < agents.length; i++) {
            const agentConfig = agents[i];
            try {
                this.logger.debug(`Executing agent ${i + 1}/${agents.length}`, {
                    provider: agentConfig.provider,
                    role: agentConfig.role
                });
                const result = await this.executeAgentWithContext(agentConfig, context, accumulatedContext);
                results.push(result);
                successfulAgents++;
                // Enhance context for next agent
                accumulatedContext = {
                    ...accumulatedContext,
                    previousResults: results,
                    lastResult: result,
                    executionStep: i + 1
                };
            }
            catch (error) {
                this.logger.warn(`Agent failed in sequential execution`, {
                    agent: agentConfig.provider,
                    step: i + 1,
                    error: error instanceof Error ? error.message : error
                });
                failedAgents++;
                // Continue with next agent unless this was a critical failure
                if (agentConfig.position === 'primary' && !context.options.debug) {
                    throw error;
                }
            }
        }
        const duration = Date.now() - startTime;
        return {
            results,
            metadata: {
                duration,
                tokenUsage: this.calculateTokenUsage(results),
                successfulAgents,
                failedAgents,
                strategy: types_1.AnalysisStrategy.SEQUENTIAL
            }
        };
    }
    async executeAgentWithContext(agentConfig, context, accumulatedContext) {
        // Enhanced context for sequential execution
        const _enhancedContext = {
            ...context.repositoryData,
            executionContext: accumulatedContext,
            agentPosition: agentConfig.position,
            previousInsights: accumulatedContext.previousResults?.map((r) => r.result?.insights).flat() || []
        };
        // Mock execution - would be real agent execution
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1500 + 1000));
        return {
            agentId: `${agentConfig.provider}-${agentConfig.role}`,
            config: agentConfig,
            result: {
                insights: [
                    `Sequential analysis from ${agentConfig.provider}`,
                    `Context-aware insight based on ${accumulatedContext.executionStep || 0} previous results`
                ],
                suggestions: [`Enhanced suggestion from ${agentConfig.role}`],
                metadata: {
                    executionTime: Date.now(),
                    contextSize: Object.keys(accumulatedContext).length,
                    sequentialStep: accumulatedContext.executionStep || 1
                }
            }
        };
    }
    calculateTokenUsage(results) {
        // Sequential execution typically uses more tokens due to context passing
        return results.length * 1500;
    }
}
exports.SequentialExecutionStrategy = SequentialExecutionStrategy;
/**
 * Specialized execution strategy - agents run based on file patterns and expertise
 */
class SpecializedExecutionStrategy {
    constructor() {
        this.logger = (0, utils_1.createLogger)('SpecializedStrategy');
    }
    getName() {
        return 'Specialized';
    }
    getDescription() {
        return 'Execute agents based on their specialization and file patterns';
    }
    async execute(context) {
        const startTime = Date.now();
        const { agents, repositoryData } = context;
        this.logger.info('Starting specialized execution', { agentCount: agents.length });
        // Group agents by specialization
        const specializations = this.groupAgentsBySpecialization(agents, repositoryData);
        const results = [];
        let successfulAgents = 0;
        let failedAgents = 0;
        // Execute each specialization group
        for (const [specialization, specializationData] of specializations.entries()) {
            this.logger.debug(`Executing specialization: ${specialization}`, {
                agentCount: specializationData.agents.length,
                fileCount: specializationData.relevantFiles.length
            });
            try {
                const specializationResults = await this.executeSpecializationGroup(specializationData, context);
                results.push(...specializationResults);
                successfulAgents += specializationResults.length;
            }
            catch (error) {
                this.logger.warn(`Specialization group failed`, {
                    specialization,
                    error: error instanceof Error ? error.message : error
                });
                failedAgents += specializationData.agents.length;
            }
        }
        const duration = Date.now() - startTime;
        return {
            results,
            metadata: {
                duration,
                tokenUsage: this.calculateTokenUsage(results),
                successfulAgents,
                failedAgents,
                strategy: types_1.AnalysisStrategy.SPECIALIZED
            }
        };
    }
    groupAgentsBySpecialization(agents, repositoryData) {
        const specializations = new Map();
        for (const agent of agents) {
            let specialization = 'general';
            let relevantFiles = repositoryData.files;
            let patterns = [];
            // Determine specialization based on file patterns
            if (agent.filePatterns && agent.filePatterns.length > 0) {
                patterns = agent.filePatterns;
                relevantFiles = repositoryData.files.filter(file => patterns.some(pattern => file.path.match(new RegExp(pattern))));
                // Create specialization name based on patterns
                specialization = this.getSpecializationName(patterns);
            }
            // Determine specialization based on role
            if (agent.role === agent_registry_1.AgentRole.SECURITY) {
                specialization = 'security';
            }
            else if (agent.role === agent_registry_1.AgentRole.PERFORMANCE) {
                specialization = 'performance';
            }
            else if (agent.role === agent_registry_1.AgentRole.CODE_QUALITY) {
                specialization = 'code-quality';
            }
            if (!specializations.has(specialization)) {
                specializations.set(specialization, {
                    agents: [],
                    relevantFiles,
                    patterns
                });
            }
            specializations.get(specialization).agents.push(agent);
        }
        return specializations;
    }
    getSpecializationName(patterns) {
        // Determine specialization based on file patterns
        const patternStr = patterns.join('|').toLowerCase();
        if (patternStr.includes('test') || patternStr.includes('spec')) {
            return 'testing';
        }
        else if (patternStr.includes('config') || patternStr.includes('yml') || patternStr.includes('json')) {
            return 'configuration';
        }
        else if (patternStr.includes('docker') || patternStr.includes('ci') || patternStr.includes('cd')) {
            return 'devops';
        }
        else if (patternStr.includes('frontend') || patternStr.includes('ui') || patternStr.includes('css')) {
            return 'frontend';
        }
        else if (patternStr.includes('api') || patternStr.includes('backend') || patternStr.includes('server')) {
            return 'backend';
        }
        else {
            return 'file-specific';
        }
    }
    async executeSpecializationGroup(specializationData, context) {
        const { agents, relevantFiles } = specializationData;
        // Create specialized context
        const specializedContext = {
            ...context.repositoryData,
            files: relevantFiles,
            specialization: {
                patterns: specializationData.patterns,
                fileCount: relevantFiles.length,
                focusArea: agents[0]?.focusAreas?.[0] || 'general'
            }
        };
        // Execute agents in this specialization (parallel within group)
        const executionPromises = agents.map(async (agentConfig) => {
            return this.executeSpecializedAgent(agentConfig, specializedContext);
        });
        const results = await Promise.allSettled(executionPromises);
        return results
            .filter((result) => result.status === 'fulfilled')
            .map(result => result.value);
    }
    async executeSpecializedAgent(agentConfig, specializedContext) {
        // Mock specialized execution
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
        return {
            agentId: `${agentConfig.provider}-${agentConfig.role}`,
            config: agentConfig,
            result: {
                insights: [
                    `Specialized analysis from ${agentConfig.provider}`,
                    `Focus area: ${specializedContext.specialization.focusArea}`,
                    `Analyzed ${specializedContext.specialization.fileCount} relevant files`
                ],
                suggestions: [`Specialized suggestion for ${agentConfig.role}`],
                metadata: {
                    executionTime: Date.now(),
                    specialization: specializedContext.specialization,
                    filePatterns: agentConfig.filePatterns || []
                }
            }
        };
    }
    calculateTokenUsage(results) {
        // Specialized execution may use fewer tokens due to focused analysis
        return results.length * 800;
    }
}
exports.SpecializedExecutionStrategy = SpecializedExecutionStrategy;
/**
 * Hybrid execution strategy - combines parallel and sequential approaches
 */
class HybridExecutionStrategy {
    constructor() {
        this.logger = (0, utils_1.createLogger)('HybridStrategy');
    }
    getName() {
        return 'Hybrid';
    }
    getDescription() {
        return 'Execute primary agents first, then secondary agents in parallel with enhanced context';
    }
    async execute(context) {
        const startTime = Date.now();
        const { agents } = context;
        this.logger.info('Starting hybrid execution', { agentCount: agents.length });
        // Separate agents by position
        const primaryAgents = agents.filter(agent => agent.position === 'primary');
        const secondaryAgents = agents.filter(agent => agent.position === 'secondary');
        const specialistAgents = agents.filter(agent => agent.position === 'specialist');
        const results = [];
        let successfulAgents = 0;
        let failedAgents = 0;
        // Phase 1: Execute primary agents sequentially
        if (primaryAgents.length > 0) {
            this.logger.debug('Phase 1: Executing primary agents sequentially');
            const sequentialStrategy = new SequentialExecutionStrategy();
            const primaryResult = await sequentialStrategy.execute({
                ...context,
                agents: primaryAgents
            });
            results.push(...primaryResult.results);
            successfulAgents += primaryResult.metadata.successfulAgents;
            failedAgents += primaryResult.metadata.failedAgents;
        }
        // Phase 2: Execute secondary agents in parallel with primary context
        if (secondaryAgents.length > 0) {
            this.logger.debug('Phase 2: Executing secondary agents in parallel');
            const enhancedContext = {
                ...context,
                agents: secondaryAgents,
                additionalContext: {
                    ...context.additionalContext,
                    primaryResults: results,
                    enhancementMode: true
                }
            };
            const parallelStrategy = new ParallelExecutionStrategy();
            const secondaryResult = await parallelStrategy.execute(enhancedContext);
            results.push(...secondaryResult.results);
            successfulAgents += secondaryResult.metadata.successfulAgents;
            failedAgents += secondaryResult.metadata.failedAgents;
        }
        // Phase 3: Execute specialist agents based on findings
        if (specialistAgents.length > 0) {
            this.logger.debug('Phase 3: Executing specialist agents');
            const specializedStrategy = new SpecializedExecutionStrategy();
            const specialistResult = await specializedStrategy.execute({
                ...context,
                agents: specialistAgents,
                additionalContext: {
                    ...context.additionalContext,
                    allPreviousResults: results,
                    specialistMode: true
                }
            });
            results.push(...specialistResult.results);
            successfulAgents += specialistResult.metadata.successfulAgents;
            failedAgents += specialistResult.metadata.failedAgents;
        }
        const duration = Date.now() - startTime;
        return {
            results,
            metadata: {
                duration,
                tokenUsage: this.calculateTokenUsage(results),
                successfulAgents,
                failedAgents,
                strategy: types_1.AnalysisStrategy.PARALLEL // Note: Using PARALLEL as closest match
            }
        };
    }
    calculateTokenUsage(results) {
        // Hybrid execution balances token usage
        return results.length * 1200;
    }
}
exports.HybridExecutionStrategy = HybridExecutionStrategy;
/**
 * Strategy factory for creating execution strategies
 */
class ExecutionStrategyFactory {
    static createStrategy(strategy) {
        const factory = this.strategies.get(strategy);
        if (!factory) {
            throw new Error(`Unknown execution strategy: ${strategy}`);
        }
        return factory();
    }
    static createHybridStrategy() {
        return new HybridExecutionStrategy();
    }
    static getAvailableStrategies() {
        return [
            { strategy: types_1.AnalysisStrategy.PARALLEL, description: 'Execute all agents concurrently' },
            { strategy: types_1.AnalysisStrategy.SEQUENTIAL, description: 'Execute agents one after another with context' },
            { strategy: types_1.AnalysisStrategy.SPECIALIZED, description: 'Execute agents based on specialization' }
        ];
    }
}
exports.ExecutionStrategyFactory = ExecutionStrategyFactory;
ExecutionStrategyFactory.strategies = new Map([
    [types_1.AnalysisStrategy.PARALLEL, () => new ParallelExecutionStrategy()],
    [types_1.AnalysisStrategy.SEQUENTIAL, () => new SequentialExecutionStrategy()],
    [types_1.AnalysisStrategy.SPECIALIZED, () => new SpecializedExecutionStrategy()]
]);
/**
 * Semaphore for controlling concurrent execution
 */
class Semaphore {
    constructor(permits) {
        this.waitQueue = [];
        this.permits = permits;
    }
    async acquire(fn) {
        return new Promise((resolve, reject) => {
            if (this.permits > 0) {
                this.permits--;
                this.executeAndRelease(fn, resolve, reject);
            }
            else {
                this.waitQueue.push(() => {
                    this.permits--;
                    this.executeAndRelease(fn, resolve, reject);
                });
            }
        });
    }
    async executeAndRelease(fn, resolve, reject) {
        try {
            const result = await fn();
            resolve(result);
        }
        catch (error) {
            reject(error);
        }
        finally {
            this.permits++;
            if (this.waitQueue.length > 0) {
                const next = this.waitQueue.shift();
                if (next)
                    next();
            }
        }
    }
}
