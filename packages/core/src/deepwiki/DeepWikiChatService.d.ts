import { DeepWikiClient, RepositoryContext, ModelConfig, DeepWikiProvider, ChatMessage } from './DeepWikiClient';
import { Logger } from '../utils/logger';
/**
 * Chat message history interface
 */
export interface ChatHistory {
    /**
     * Repository context this chat is about
     */
    repository: RepositoryContext;
    /**
     * Messages in the conversation
     */
    messages: ChatMessage[];
}
/**
 * Chat response interface
 */
export interface ChatResponse {
    /**
     * Message content from the assistant
     */
    content: string;
    /**
     * Model that was used to generate the response
     */
    model: string;
    /**
     * Provider that was used to generate the response
     */
    provider: string;
    /**
     * Raw response from the API
     */
    rawResponse: Record<string, unknown>;
}
/**
 * Service for chatting with repositories using DeepWiki
 */
export declare class DeepWikiChatService {
    private deepWikiClient;
    private logger;
    /**
     * System prompts for different context scenarios
     */
    private readonly SYSTEM_PROMPTS;
    /**
     * Constructor
     * @param deepWikiClient DeepWiki client instance
     * @param logger Logger instance
     */
    constructor(deepWikiClient: DeepWikiClient, logger: Logger);
    /**
     * Send a chat message about a repository
     * @param repository Repository context
     * @param message User message
     * @param history Previous chat history (optional)
     * @param modelConfig Model configuration (optional)
     * @returns Chat response
     */
    sendMessage(repository: RepositoryContext, message: string, history?: ChatMessage[], modelConfig?: ModelConfig<DeepWikiProvider>): Promise<ChatResponse>;
    /**
     * Continue a conversation based on an existing chat history
     * @param chatHistory Chat history
     * @param message New user message
     * @param modelConfig Model configuration (optional)
     * @returns Chat response
     */
    continueConversation(chatHistory: ChatHistory, message: string, modelConfig?: ModelConfig<DeepWikiProvider>): Promise<ChatResponse>;
    /**
     * Extract content from the API response
     * @param response API response
     * @returns Message content
     */
    private extractContentFromResponse;
    /**
     * Get available perspectives that can be used for targeted questions
     * @returns Array of available perspectives
     */
    getAvailablePerspectives(): string[];
    /**
     * Ask a targeted question about a specific perspective
     * @param repository Repository context
     * @param perspective Perspective to analyze
     * @param question Specific question (optional)
     * @param modelConfig Model configuration (optional)
     * @returns Chat response
     */
    askPerspectiveQuestion(repository: RepositoryContext, perspective: string, question?: string, modelConfig?: ModelConfig<DeepWikiProvider>): Promise<ChatResponse>;
}
