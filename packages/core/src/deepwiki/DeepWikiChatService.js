"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeepWikiChatService = void 0;
/**
 * Service for chatting with repositories using DeepWiki
 */
class DeepWikiChatService {
    /**
     * Constructor
     * @param deepWikiClient DeepWiki client instance
     * @param logger Logger instance
     */
    constructor(deepWikiClient, logger) {
        /**
         * System prompts for different context scenarios
         */
        this.SYSTEM_PROMPTS = {
            /**
             * System prompt for repository context
             */
            REPOSITORY_CONTEXT: "You are an AI assistant that specializes in helping developers understand code repositories. " +
                "You have been given context about a GitHub repository, and your task is to answer questions about " +
                "its structure, architecture, and code patterns. Be specific, accurate, and helpful. " +
                "When discussing code and file structures, reference relevant paths and files from the repository.",
            /**
             * System prompt when there isn't enough context
             */
            MINIMAL_CONTEXT: "You are an AI assistant that specializes in helping developers understand code repositories. " +
                "You will be answering questions about a GitHub repository. If you don't have enough context " +
                "to answer a specific question, explain what additional information would be needed, or suggest " +
                "that the user provide more details about the repository structure they're asking about."
        };
        this.deepWikiClient = deepWikiClient;
        this.logger = logger;
        this.logger.info('DeepWikiChatService initialized');
    }
    /**
     * Send a chat message about a repository
     * @param repository Repository context
     * @param message User message
     * @param history Previous chat history (optional)
     * @param modelConfig Model configuration (optional)
     * @returns Chat response
     */
    async sendMessage(repository, message, history = [], modelConfig) {
        try {
            this.logger.info('Sending message to DeepWiki chat', {
                repository,
                messageLength: message.length,
                historyLength: history.length,
                modelConfig
            });
            // Build the messages array with system prompt and history
            const systemPrompt = this.SYSTEM_PROMPTS.REPOSITORY_CONTEXT;
            const messages = [
                { role: 'system', content: systemPrompt },
                ...history,
                { role: 'user', content: message }
            ];
            // Get chat completion
            const response = await this.deepWikiClient.getChatCompletionForRepo(repository, {
                messages,
                modelConfig,
                stream: false // No streaming for POC
            });
            // Extract model info from response
            const model = String(response.model || (modelConfig?.model || 'unknown'));
            const provider = String(response.provider || (modelConfig?.provider || 'unknown'));
            // Extract content from response
            const content = this.extractContentFromResponse(response);
            return {
                content,
                model,
                provider,
                rawResponse: response
            };
        }
        catch (error) {
            this.logger.error('Error getting chat response', { repository, error });
            throw error;
        }
    }
    /**
     * Continue a conversation based on an existing chat history
     * @param chatHistory Chat history
     * @param message New user message
     * @param modelConfig Model configuration (optional)
     * @returns Chat response
     */
    async continueConversation(chatHistory, message, modelConfig) {
        return this.sendMessage(chatHistory.repository, message, chatHistory.messages, modelConfig);
    }
    /**
     * Extract content from the API response
     * @param response API response
     * @returns Message content
     */
    extractContentFromResponse(response) {
        // Handle various response formats from different providers
        // Check for choices array (OpenAI style response)
        if (Array.isArray(response.choices) && response.choices.length > 0) {
            const choice = response.choices[0];
            // Handle OpenAI style response
            if (typeof choice.message === 'object' && choice.message !== null) {
                const message = choice.message;
                if (typeof message.content === 'string') {
                    return message.content;
                }
            }
            // Fallback to content if it exists
            if (typeof choice.content === 'string') {
                return choice.content;
            }
        }
        // Check for completion (Anthropic style)
        if (typeof response.completion === 'string') {
            return response.completion;
        }
        // Check for content (OpenRouter style)
        if (typeof response.content === 'string') {
            return response.content;
        }
        // Check for text (another possible format)
        if (typeof response.text === 'string') {
            return response.text;
        }
        // Check for message format
        if (typeof response.message === 'object' && response.message !== null) {
            const message = response.message;
            if (typeof message.content === 'string') {
                return message.content;
            }
        }
        // Stringify the response as a last resort
        this.logger.warn('Unable to extract content from response, using string representation', { response });
        return `[Response format not recognized: ${JSON.stringify(response).substring(0, 100)}...]`;
    }
    /**
     * Get available perspectives that can be used for targeted questions
     * @returns Array of available perspectives
     */
    getAvailablePerspectives() {
        return [
            'architecture',
            'patterns',
            'performance',
            'security',
            'testing',
            'dependencies',
            'maintainability'
        ];
    }
    /**
     * Ask a targeted question about a specific perspective
     * @param repository Repository context
     * @param perspective Perspective to analyze
     * @param question Specific question (optional)
     * @param modelConfig Model configuration (optional)
     * @returns Chat response
     */
    async askPerspectiveQuestion(repository, perspective, question, modelConfig) {
        // Verify perspective is valid
        const availablePerspectives = this.getAvailablePerspectives();
        if (!availablePerspectives.includes(perspective)) {
            throw new Error(`Invalid perspective: ${perspective}. Available perspectives: ${availablePerspectives.join(', ')}`);
        }
        // Craft the message based on the perspective and optional question
        let message;
        switch (perspective) {
            case 'architecture':
                message = question ||
                    "What is the overall architecture of this repository? Please identify the main components, how they interact with each other, and evaluate the architectural approach used.";
                break;
            case 'patterns':
                message = question ||
                    "What design patterns and architectural approaches are used in this codebase? Are there any anti-patterns that should be addressed?";
                break;
            case 'performance':
                message = question ||
                    "What are the potential performance bottlenecks in this codebase? How efficiently are resources managed in critical paths?";
                break;
            case 'security':
                message = question ||
                    "What security vulnerabilities or potential risks exist in this codebase? Are there any insecure coding practices or areas where security best practices aren't being followed?";
                break;
            case 'testing':
                message = question ||
                    "How well is this codebase tested? Evaluate the test coverage, testing approaches used, and identify any gaps in the testing strategy.";
                break;
            case 'dependencies':
                message = question ||
                    "Analyze the dependency management in this codebase. Are dependencies up-to-date, properly managed, and appropriately used?";
                break;
            case 'maintainability':
                message = question ||
                    "How maintainable is this codebase? Evaluate code organization, documentation, complexity, and adherence to coding standards.";
                break;
            default:
                message = question ||
                    `Analyze this repository from the ${perspective} perspective.`;
        }
        // If there's a specific question, combine it with the perspective
        if (question && question !== message) {
            message = `From the ${perspective} perspective: ${question}`;
        }
        return this.sendMessage(repository, message, [], modelConfig);
    }
}
exports.DeepWikiChatService = DeepWikiChatService;
