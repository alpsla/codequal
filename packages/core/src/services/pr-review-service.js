"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRReviewService = void 0;
// Import only types from other packages
const agent_registry_1 = require("../config/agent-registry");
const agent_configuration_service_1 = require("./agent-configuration-service");
const skill_service_1 = require("./skill-service");
const logger_1 = require("../utils/logger");
// Import implementations (to be injected in a production environment)
// In a real application, you would use dependency injection
/* eslint-disable @typescript-eslint/no-var-requires */
const AgentFactory = require('@codequal/agents').AgentFactory;
const PRReviewModel = require('../../../database/dist/models/pr-review').PRReviewModel;
const RepositoryModel = require('../../../database/dist/models/repository').RepositoryModel;
/* eslint-enable @typescript-eslint/no-var-requires */
/**
 * Service for managing PR reviews
 */
class PRReviewService {
    constructor() {
        this.logger = (0, logger_1.createLogger)('PRReviewService');
        this.skillService = new skill_service_1.SkillService();
    }
    /**
     * Analyze a PR using the specified agent configuration
     * @param prUrl PR URL
     * @param userId User ID
     * @param agentSelection Agent selection configuration
     * @returns Analysis results
     */
    async analyzePR(prUrl, userId, agentSelection) {
        try {
            // 1. Extract repository information from PR URL
            const repoInfo = this.extractRepositoryInfo(prUrl);
            // 1.5. Get agent selection using dynamic system
            const effectiveAgentSelection = agentSelection || await (0, agent_configuration_service_1.getDefaultAgentSelection)();
            // 2. Find or create repository
            const repository = await RepositoryModel.findOrCreate(repoInfo.provider, repoInfo.name, repoInfo.url);
            // 3. Create PR review record
            const prReview = await PRReviewModel.create(prUrl, repository.id, userId);
            // 4. Create orchestrator agent to fetch PR data
            const orchestrator = AgentFactory.createAgent(agent_registry_1.AgentRole.ORCHESTRATOR, effectiveAgentSelection[agent_registry_1.AgentRole.ORCHESTRATOR], {});
            // 5. Fetch PR data
            this.logger.info(`Fetching data for PR: ${prUrl}`);
            const startOrchestrationTime = Date.now();
            const prData = await orchestrator.analyze({ url: prUrl });
            const orchestrationTime = Date.now() - startOrchestrationTime;
            // 6. Update PR review with metadata
            await PRReviewModel.update(prReview.id, {
                prTitle: prData.metadata?.title,
                prDescription: prData.metadata?.description
            });
            // 7. Store orchestrator result
            await PRReviewModel.storeAnalysisResult(prReview.id, agent_registry_1.AgentRole.ORCHESTRATOR, effectiveAgentSelection[agent_registry_1.AgentRole.ORCHESTRATOR], prData, orchestrationTime);
            // 8. Analyze PR with each specialized agent
            const analysisResults = {
                [agent_registry_1.AgentRole.ORCHESTRATOR]: prData
            };
            // Run all specialized agents in parallel for efficiency
            const analysisPromises = Object.values(agent_registry_1.AgentRole)
                .filter(role => role !== agent_registry_1.AgentRole.ORCHESTRATOR && role !== agent_registry_1.AgentRole.RESEARCHER) // Skip orchestrator and researcher
                .map(async (role) => {
                try {
                    const selectedProvider = effectiveAgentSelection[role];
                    if (!selectedProvider) {
                        throw new Error(`No provider selected for role ${role}`);
                    }
                    const agent = AgentFactory.createAgent(role, selectedProvider, {});
                    this.logger.info(`Analyzing PR with ${role} agent (${selectedProvider})`);
                    const startTime = Date.now();
                    const result = await agent.analyze(prData);
                    const executionTime = Date.now() - startTime;
                    // Store result
                    await PRReviewModel.storeAnalysisResult(prReview.id, role, selectedProvider, result, executionTime);
                    return { role, result };
                }
                catch (error) {
                    this.logger.error(`Error analyzing PR with ${role} agent:`, error instanceof Error ? error : String(error));
                    // Return empty result for this agent
                    return {
                        role,
                        result: {
                            insights: [],
                            suggestions: [],
                            educational: [],
                            metadata: {
                                error: true,
                                message: error instanceof Error ? error.message : String(error)
                            }
                        }
                    };
                }
            });
            // Wait for all analyses to complete
            const analysisResults2 = await Promise.all(analysisPromises);
            // Add results to the record
            for (const { role, result } of analysisResults2) {
                analysisResults[role] = result;
            }
            // 9. Combine results
            const combinedResult = this.combineResults(analysisResults);
            // 10. Store combined result
            await PRReviewModel.storeCombinedResult(prReview.id, combinedResult);
            // 11. Update user skills based on analysis results
            await this.skillService.updateUserSkills(userId, combinedResult, prReview.id);
            // 12. Return results
            return {
                prReviewId: prReview.id,
                analysisResults,
                combinedResult
            };
        }
        catch (error) {
            this.logger.error('Error analyzing PR:', error instanceof Error ? error : String(error));
            throw error;
        }
    }
    /**
     * Extract repository information from PR URL
     * @param prUrl PR URL
     * @returns Repository information
     */
    extractRepositoryInfo(prUrl) {
        // GitHub PR URL pattern: https://github.com/owner/repo/pull/123
        const githubPattern = /https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/\d+/;
        const githubMatch = prUrl.match(githubPattern);
        if (githubMatch) {
            const owner = githubMatch[1];
            const repo = githubMatch[2];
            return {
                provider: 'github',
                name: `${owner}/${repo}`,
                url: `https://github.com/${owner}/${repo}`
            };
        }
        // GitLab PR URL pattern: https://gitlab.com/owner/repo/-/merge_requests/123
        const gitlabPattern = /https:\/\/gitlab\.com\/([^/]+)\/([^/]+)\/-\/merge_requests\/\d+/;
        const gitlabMatch = prUrl.match(gitlabPattern);
        if (gitlabMatch) {
            const owner = gitlabMatch[1];
            const repo = gitlabMatch[2];
            return {
                provider: 'gitlab',
                name: `${owner}/${repo}`,
                url: `https://gitlab.com/${owner}/${repo}`
            };
        }
        throw new Error(`Unsupported PR URL format: ${prUrl}`);
    }
    /**
     * Combine results from different agents
     * @param results Analysis results from different agents
     * @returns Combined analysis result
     */
    combineResults(results) {
        // Initialize combined result
        const combined = {
            insights: [],
            suggestions: [],
            educational: []
        };
        // Track seen insights and suggestions to avoid duplicates
        const seenInsights = new Set();
        const seenSuggestions = new Set();
        // Process each role's results
        for (const [role, result] of Object.entries(results)) {
            // Add insights with deduplication
            for (const insight of result.insights || []) {
                const insightKey = `${insight.type}-${insight.message}`;
                if (!seenInsights.has(insightKey)) {
                    seenInsights.add(insightKey);
                    combined.insights.push({
                        ...insight
                        // Don't add source as it's not in the Insight type
                    });
                }
            }
            // Add suggestions with deduplication
            for (const suggestion of result.suggestions || []) {
                const suggestionKey = `${suggestion.file}-${suggestion.line}-${suggestion.suggestion}`;
                if (!seenSuggestions.has(suggestionKey)) {
                    seenSuggestions.add(suggestionKey);
                    combined.suggestions.push({
                        ...suggestion
                        // Don't add source as it's not in the Suggestion type
                    });
                }
            }
            // Add educational content
            // For educational content, we specifically want the content from the EDUCATIONAL role
            if (role === agent_registry_1.AgentRole.EDUCATIONAL && result.educational) {
                combined.educational = result.educational;
            }
        }
        // Sort insights by severity (high to low)
        combined.insights.sort((a, b) => {
            const severityOrder = { high: 0, medium: 1, low: 2 };
            return severityOrder[a.severity] -
                severityOrder[b.severity];
        });
        return combined;
    }
    /**
     * Get PR review by ID
     * @param prReviewId PR review ID
     * @returns PR review with results
     */
    async getPRReview(prReviewId) {
        // Get PR review
        const prReview = await PRReviewModel.getById(prReviewId);
        // Get analysis results
        const analysisResultsList = await PRReviewModel.getAnalysisResults(prReviewId);
        // Group results by role
        const analysisResults = {};
        for (const result of analysisResultsList) {
            analysisResults[result.role] = {
                insights: result.insights,
                suggestions: result.suggestions,
                educational: result.educational,
                metadata: result.metadata
            };
        }
        // Get combined result
        const combinedResult = await PRReviewModel.getCombinedResult(prReviewId);
        if (!combinedResult) {
            throw new Error(`Combined result not found for PR review: ${prReviewId}`);
        }
        return {
            prReview,
            analysisResults,
            combinedResult
        };
    }
    /**
     * Get PR reviews by user
     * @param userId User ID
     * @returns PR reviews
     */
    async getUserPRReviews(userId) {
        return PRReviewModel.getByUserId(userId);
    }
}
exports.PRReviewService = PRReviewService;
