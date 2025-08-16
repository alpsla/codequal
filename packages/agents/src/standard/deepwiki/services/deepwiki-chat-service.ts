/**
 * DeepWiki Chat Service
 * Provides chat interface for asking questions about analyzed repositories
 */

import axios from 'axios';
import { ILogger } from '../../services/interfaces/logger.interface';
import { DeepWikiContextManager } from './deepwiki-context-manager';
import { 
  ChatMessage,
  ChatSession,
  ChatCompletionOptions,
  ChatResponse,
  StreamingChatResponse
} from '../interfaces/chat.interface';

export class DeepWikiChatService {
  private contextManager: DeepWikiContextManager;
  private deepwikiUrl: string;
  private deepwikiApiKey: string;
  private logger: ILogger;
  private activeSessions: Map<string, ChatSession>;
  
  constructor(logger: ILogger, contextManager?: DeepWikiContextManager) {
    this.logger = logger;
    this.contextManager = contextManager || new DeepWikiContextManager(logger);
    this.deepwikiUrl = process.env.DEEPWIKI_API_URL || 'http://localhost:8001';
    this.deepwikiApiKey = process.env.DEEPWIKI_API_KEY || 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f';
    this.activeSessions = new Map();
  }
  
  /**
   * Start a chat session for a repository
   */
  async startChatSession(repositoryUrl: string, options?: {
    ensureContext?: boolean;
    sessionId?: string;
  }): Promise<ChatSession> {
    try {
      const sessionId = options?.sessionId || this.generateSessionId();
      
      // Ensure context exists if requested
      if (options?.ensureContext) {
        const contextCheck = await this.contextManager.checkContextAvailable(repositoryUrl);
        if (!contextCheck.available) {
          this.logger.info('Creating context before starting chat session');
          await this.contextManager.createContext(repositoryUrl);
        }
      }
      
      const session: ChatSession = {
        sessionId,
        repositoryUrl,
        startedAt: new Date(),
        messages: [],
        contextId: (await this.contextManager.getContextMetadata(repositoryUrl))?.contextId
      };
      
      this.activeSessions.set(sessionId, session);
      this.logger.info('Chat session started', { sessionId, repositoryUrl });
      
      return session;
    } catch (error) {
      this.logger.error('Failed to start chat session', { repositoryUrl, error });
      throw new Error(`Failed to start chat session: ${error}`);
    }
  }
  
  /**
   * Send a chat message and get response
   */
  async sendMessage(
    sessionId: string,
    message: string,
    options?: ChatCompletionOptions
  ): Promise<ChatResponse> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    try {
      // Add user message to session
      const userMessage: ChatMessage = {
        role: 'user',
        content: message,
        timestamp: new Date()
      };
      session.messages.push(userMessage);
      
      // Build messages array for API
      const apiMessages = this.buildApiMessages(session, message);
      
      // Call DeepWiki API
      const response = await this.callChatAPI(
        session.repositoryUrl,
        apiMessages,
        options
      );
      
      // Add assistant response to session
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        metadata: response.metadata
      };
      session.messages.push(assistantMessage);
      
      // Update session
      session.lastActivity = new Date();
      this.activeSessions.set(sessionId, session);
      
      return response;
    } catch (error) {
      this.logger.error('Failed to send message', { sessionId, error });
      throw new Error(`Failed to send message: ${error}`);
    }
  }
  
  /**
   * Ask a question about a repository (one-off, no session)
   */
  async askQuestion(
    repositoryUrl: string,
    question: string,
    options?: ChatCompletionOptions
  ): Promise<ChatResponse> {
    try {
      // Check if context exists
      const contextCheck = await this.contextManager.checkContextAvailable(repositoryUrl);
      
      if (!contextCheck.available) {
        // Try to answer without context or create context
        this.logger.warn('No context available for repository', { repositoryUrl });
        
        if (options?.requireContext) {
          await this.contextManager.createContext(repositoryUrl);
        }
      }
      
      const messages: ChatMessage[] = [{
        role: 'user',
        content: question,
        timestamp: new Date()
      }];
      
      return await this.callChatAPI(repositoryUrl, messages, options);
    } catch (error) {
      this.logger.error('Failed to ask question', { repositoryUrl, question, error });
      throw new Error(`Failed to ask question: ${error}`);
    }
  }
  
  /**
   * Stream a chat response
   */
  async *streamMessage(
    sessionId: string,
    message: string,
    options?: ChatCompletionOptions
  ): AsyncGenerator<StreamingChatResponse> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    try {
      const apiMessages = this.buildApiMessages(session, message);
      
      // Call streaming API
      const response = await axios.post(
        `${this.deepwikiUrl}/chat/completions/stream`,
        {
          repo_url: session.repositoryUrl,
          messages: apiMessages,
          stream: true,
          provider: options?.provider || 'openrouter',
          model: options?.model || 'openai/gpt-4o',
          temperature: options?.temperature ?? 0.1,
          max_tokens: options?.maxTokens || 2000,
          response_format: options?.responseFormat
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.deepwikiApiKey}`
          },
          responseType: 'stream',
          timeout: options?.timeout || 60000
        }
      );
      
      // Parse streaming response
      let buffer = '';
      for await (const chunk of response.data) {
        buffer += chunk.toString();
        
        // Parse SSE events
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return;
            }
            
            try {
              const parsed = JSON.parse(data);
              yield {
                content: parsed.choices?.[0]?.delta?.content || '',
                isComplete: false,
                metadata: parsed.metadata
              };
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to stream message', { sessionId, error });
      throw new Error(`Failed to stream message: ${error}`);
    }
  }
  
  /**
   * Get chat session history
   */
  getSessionHistory(sessionId: string): ChatMessage[] {
    const session = this.activeSessions.get(sessionId);
    return session?.messages || [];
  }
  
  /**
   * End a chat session
   */
  endSession(sessionId: string): void {
    if (this.activeSessions.delete(sessionId)) {
      this.logger.info('Chat session ended', { sessionId });
    }
  }
  
  /**
   * Call the DeepWiki chat API
   */
  private async callChatAPI(
    repositoryUrl: string,
    messages: ChatMessage[],
    options?: ChatCompletionOptions
  ): Promise<ChatResponse> {
    try {
      const response = await axios.post(
        `${this.deepwikiUrl}/chat/completions/stream`,
        {
          repo_url: repositoryUrl,
          messages: messages.map(m => ({
            role: m.role,
            content: m.content
          })),
          stream: false,
          provider: options?.provider || 'openrouter',
          model: options?.model || 'openai/gpt-4o',
          temperature: options?.temperature ?? 0.1,
          max_tokens: options?.maxTokens || 2000,
          response_format: options?.responseFormat || { type: "json_object" }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.deepwikiApiKey}`
          },
          timeout: options?.timeout || 60000
        }
      );
      
      const content = response.data?.choices?.[0]?.message?.content || response.data;
      
      return {
        content,
        role: 'assistant',
        timestamp: new Date(),
        metadata: {
          model: options?.model || 'openai/gpt-4o',
          tokensUsed: response.data?.usage?.total_tokens
        }
      };
    } catch (error: any) {
      this.logger.error('Chat API call failed', { repositoryUrl, error: error.message });
      throw error;
    }
  }
  
  /**
   * Build API messages from session
   */
  private buildApiMessages(session: ChatSession, currentMessage?: string): ChatMessage[] {
    const messages: ChatMessage[] = [];
    
    // Add system message for context
    messages.push({
      role: 'system',
      content: `You are analyzing the repository: ${session.repositoryUrl}. Provide specific, actionable insights based on the code.`,
      timestamp: new Date()
    });
    
    // Add conversation history (limit to last 10 messages for context window)
    const historyMessages = session.messages.slice(-10);
    messages.push(...historyMessages);
    
    // Add current message if provided
    if (currentMessage) {
      messages.push({
        role: 'user',
        content: currentMessage,
        timestamp: new Date()
      });
    }
    
    return messages;
  }
  
  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(maxAge: number = 3600000): void {
    const now = Date.now();
    const expired: string[] = [];
    
    this.activeSessions.forEach((session, id) => {
      const age = now - (session.lastActivity || session.startedAt).getTime();
      if (age > maxAge) {
        expired.push(id);
      }
    });
    
    expired.forEach(id => {
      this.activeSessions.delete(id);
      this.logger.info('Cleaned up expired session', { sessionId: id });
    });
  }
}