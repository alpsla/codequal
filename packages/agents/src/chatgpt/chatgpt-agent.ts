import { BaseAgent } from '../base/base-agent';
import { AnalysisResult, Insight, Suggestion, EducationalContent } from '../agent';
import { loadPromptTemplate } from '../prompts/prompt-loader';
import { DEFAULT_MODELS_BY_PROVIDER } from '@codequal/core/config/models/model-versions';
import { createLogger, LoggableData } from '@codequal/core/utils';
import OpenAI from 'openai';

/**
 * OpenAI chat choice type
 * @private - Used internally for typing the OpenAI API response 
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface OpenAIChoice {
  message: {
    content: string | null;
    role: string;
  };
  index: number;
  finish_reason: string;
}

/**
 * OpenAI API completion response type
 */
interface OpenAIResponse {
  choices: Array<{
    message?: {
      content: string;
      role: string;
    };
    text?: string;
    index: number;
    finish_reason: string;
  }>;
  created: number;
  id: string;
  model: string;
  object: string;
  usage: {
    completion_tokens: number;
    prompt_tokens: number;
    total_tokens: number;
  } | undefined;
}

/**
 * OpenAI API request parameters
 */
interface OpenAIRequestParams {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
}

/**
 * OpenAI Chat client interface
 */
interface OpenAIClient {
  chat: {
    completions: {
      create: (params: OpenAIRequestParams) => Promise<OpenAIResponse>;
    };
  };
}

/**
 * File data structure
 */
interface FileData {
  filename: string;
  content?: string;
  patch?: string;
  status?: string;
  additions?: number;
  deletions?: number;
}

/**
 * PR data structure
 */
interface PRData {
  url?: string;
  title?: string;
  description?: string;
  files?: FileData[];
  branch?: string;
  baseBranch?: string;
  author?: string;
  repository?: string;
}

/**
 * ChatGPT Agent configuration
 */
interface ChatGPTAgentConfig {
  model?: string;
  openaiApiKey?: string;
  debug?: boolean;
  [key: string]: unknown;
}

/**
 * Implementation of ChatGPT/OpenAI-based agent
 */
export class ChatGPTAgent extends BaseAgent {
  /**
   * Prompt template name
   */
  private promptTemplate: string;
  
  /**
   * OpenAI API client
   */
  private openaiClient: OpenAIClient;
  
  /**
   * Model name
   */
  private model: string;
  
  /**
   * @param promptTemplate Template name
   * @param config Configuration
   */
  constructor(promptTemplate: string, config: ChatGPTAgentConfig = {}) {
    // Clean the config to prevent circular references
    const cleanConfig = {
      model: config.model,
      openaiApiKey: config.openaiApiKey,
      debug: config.debug,
      useOpenRouter: config.useOpenRouter !== undefined ? config.useOpenRouter : true,
      openRouterApiKey: config.openRouterApiKey,
      maxTokens: config.maxTokens,
      temperature: config.temperature
    };
    
    super(cleanConfig);
    this.promptTemplate = promptTemplate;
    
    // Use default model from provider configuration
    // No hardcoded fallback - rely on DEFAULT_MODELS_BY_PROVIDER
    this.model = cleanConfig.model || DEFAULT_MODELS_BY_PROVIDER['openai'];
    
    // Log model configuration for debugging
    this.log('ChatGPTAgent initialized with model:', { 
      configModel: cleanConfig.model,
      defaultModel: DEFAULT_MODELS_BY_PROVIDER['openai'],
      finalModel: this.model 
    });
    
    this.openaiClient = this.initOpenAIClient();
  }
  
  /**
   * Initialize OpenAI client
   * @returns OpenAI client
   */
  protected initOpenAIClient(): OpenAIClient {
    // Check if we should use OpenRouter
    const useOpenRouter = this.config.useOpenRouter !== false; // Default to true
    const apiKey = useOpenRouter 
      ? process.env.OPENROUTER_API_KEY 
      : ((this.config as ChatGPTAgentConfig).openaiApiKey || process.env.OPENAI_API_KEY);
    
    // Log configuration for debugging
    this.log('Initializing OpenAI client', { 
      useOpenRouter, 
      hasApiKey: !!apiKey,
      model: this.model,
      config: this.config 
    });
    
    if (!apiKey) {
      throw new Error(`${useOpenRouter ? 'OpenRouter' : 'OpenAI'} API key is required`);
    }
    
    const openai = new OpenAI({
      apiKey: apiKey,
      ...(useOpenRouter && {
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          'HTTP-Referer': 'https://codequal.ai',
          'X-Title': 'CodeQual Analysis'
        }
      })
    });
    
    // Adjust model name for OpenRouter format
    if (useOpenRouter && this.model) {
      // Handle aion model specifically
      if (this.model === 'aion-1.0-mini') {
        this.model = 'aion-labs/aion-1.0-mini';
      }
      // Only add openai/ prefix for actual OpenAI models
      else if (!this.model.includes('/') && 
          (this.model.startsWith('gpt-') || 
           this.model.startsWith('o1-') || 
           this.model === 'chatgpt-4o-latest')) {
        this.model = `openai/${this.model}`;
      }
      this.log('Using OpenRouter model', { originalModel: this.config.model, adjustedModel: this.model });
    }
    
    const logger = createLogger(useOpenRouter ? 'OpenRouterAPI' : 'OpenAIAPI');
    return this.createClientWrapper(openai, logger);
  }
  
  /**
   * Create a client wrapper for OpenAI/OpenRouter
   * @param openai OpenAI client instance
   * @param logger Logger instance
   * @returns OpenAI client wrapper
   */
  private createClientWrapper(openai: OpenAI, logger: any): OpenAIClient {
    return {
      chat: {
        completions: {
          create: async (params: OpenAIRequestParams) => {
            try {
              logger.debug('Calling API with model:', params.model);
              logger.debug('Prompt preview:', JSON.stringify(params.messages).substring(0, 100) + '...');
              
              const response = await openai.chat.completions.create({
                model: params.model,
                messages: params.messages,
                temperature: params.temperature,
                max_tokens: params.max_tokens,
                top_p: params.top_p,
                frequency_penalty: params.frequency_penalty,
                presence_penalty: params.presence_penalty,
              });
              
              // Transform the OpenAI response to match our interface
              const transformedResponse: OpenAIResponse = {
                choices: response.choices.map((choice: any) => ({
                  message: {
                    content: choice.message.content || '',
                    role: choice.message.role
                  },
                  index: choice.index,
                  finish_reason: choice.finish_reason
                })),
                created: response.created,
                id: response.id,
                model: response.model,
                object: response.object,
                usage: response.usage || {
                  completion_tokens: 0,
                  prompt_tokens: 0,
                  total_tokens: 0
                }
              };
              
              return transformedResponse;
            } catch (error) {
              const errorData: LoggableData = error instanceof Error 
                ? error 
                : { message: String(error) };
              
              logger.error('API error:', errorData);
              throw error;
            }
          }
        }
      }
    };
  }
  
  /**
   * Analyze PR data using ChatGPT
   * @param data PR data
   * @returns Analysis result
   */
  async analyze(data: PRData): Promise<AnalysisResult> {
    try {
      this.log('Starting analysis', { 
        template: this.promptTemplate, 
        hasData: !!data,
        dataKeys: data ? Object.keys(data) : [],
        filesCount: data?.files?.length || 0 
      });
      
      // 1. Load prompt template and system prompt
      const template = loadPromptTemplate(this.promptTemplate);
      const systemPrompt = loadPromptTemplate(`${this.promptTemplate}_system`) || 
                          'You are a code review assistant specialized in analyzing pull requests.';
      
      this.log('Templates loaded', { 
        hasTemplate: !!template,
        templateLength: template?.length || 0,
        hasSystemPrompt: !!systemPrompt 
      });
      
      // 2. Fill template with PR data
      const prompt = this.fillPromptTemplate(template, data);
      
      this.log('Prompt filled', { 
        promptLength: prompt.length,
        promptPreview: prompt.substring(0, 200) + '...' 
      });
      
      // If prompt is empty or too short, something went wrong
      if (!prompt || prompt.length < 50) {
        this.log('WARNING: Prompt seems too short or empty', { prompt });
      }
      
      // 3. Call OpenAI API
      this.log('Calling OpenAI API', { 
        template: this.promptTemplate, 
        model: this.model,
        useOpenRouter: this.config.useOpenRouter !== false,
        hasApiKey: !!process.env.OPENROUTER_API_KEY
      });
      
      const response = await this.openaiClient.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3, // Lower temperature for more deterministic responses
        max_tokens: 4000
      });
      
      this.log('API response received', {
        hasResponse: !!response,
        hasChoices: !!response?.choices,
        choicesCount: response?.choices?.length || 0,
        responseLength: response?.choices[0]?.message?.content?.length || 0
      });
      
      // 4. Parse response
      let responseText = response.choices[0]?.message?.content || '';
      
      // Clean up thinking tags if present (for models like aion that include them)
      responseText = responseText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      responseText = responseText.replace(/<think>[\s\S]*?<\\?/g, '').trim(); // Handle unclosed tags
      
      const result = this.formatResult(responseText);
      
      // 5. Add token usage using the abstraction layer
      const finalResult = this.addTokenUsage(result, response);
      
      this.log('Analysis complete', {
        insightsCount: finalResult.insights?.length || 0,
        suggestionsCount: finalResult.suggestions?.length || 0,
        educationalCount: finalResult.educational?.length || 0,
        hasTokenUsage: !!finalResult.tokenUsage
      });
      
      return finalResult;
    } catch (error) {
      this.log('Analysis error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        template: this.promptTemplate,
        model: this.model
      });
      return this.handleError(error);
    }
  }
  
  /**
   * Fill prompt template with PR data
   * @param template Prompt template
   * @param data PR data
   * @returns Filled prompt
   */
  private fillPromptTemplate(template: string, data: PRData): string {
    // Replace placeholders in template with actual data
    return template
      .replace('{{PR_URL}}', data.url || '')
      .replace('{{PR_TITLE}}', data.title || '')
      .replace('{{PR_DESCRIPTION}}', data.description || '')
      .replace('{{FILES_CHANGED}}', this.formatFilesForPrompt(data.files || []));
  }
  
  /**
   * Format files for prompt
   * @param files Files changed
   * @returns Formatted files string
   */
  private formatFilesForPrompt(files: FileData[]): string {
    let result = '';
    
    for (const file of files) {
      result += `\n## File: ${file.filename}\n`;
      result += '```\n';
      result += file.content || file.patch || '';
      result += '\n```\n';
    }
    
    return result;
  }
  
  /**
   * Format ChatGPT response to standard format
   * @param response OpenAI response
   * @returns Standardized analysis result
   */
  protected formatResult(response: string): AnalysisResult {
    // This is a simplified parsing logic
    // In reality, you'd implement more robust parsing based on your prompt structure
    
    this.log('Formatting result', { 
      responseLength: response.length,
      responsePreview: response.substring(0, 200) + '...'
    });
    
    const insightsMatch = response.match(/## Insights\s+([\s\S]*?)(?=##|$)/i);
    const suggestionsMatch = response.match(/## Suggestions\s+([\s\S]*?)(?=##|$)/i);
    const educationalMatch = response.match(/## Educational\s+([\s\S]*?)(?=##|$)/i);
    
    this.log('Regex matches', {
      hasInsights: !!insightsMatch,
      hasSuggestions: !!suggestionsMatch,
      hasEducational: !!educationalMatch
    });
    
    const insights: Insight[] = [];
    const suggestions: Suggestion[] = [];
    const educational: EducationalContent[] = [];
    
    // Parse insights
    if (insightsMatch && insightsMatch[1]) {
      const insightsText = insightsMatch[1].trim();
      const insightItems = insightsText.split(/\n\s*-\s*/);
      
      for (const item of insightItems) {
        if (!item.trim()) continue;
        
        const severityMatch = item.match(/\[(high|medium|low)\]/i);
        const severity = severityMatch ? severityMatch[1].toLowerCase() as 'high' | 'medium' | 'low' : 'medium';
        // Remove the severity tag and any leading whitespace or dash/bullet characters
        const message = item.replace(/\[(high|medium|low)\]/i, '')
                           .replace(/^[\s-]+/, '')
                           .trim();
        
        if (message) {
          insights.push({
            type: 'code_review',
            severity,
            message
          });
        }
      }
    }
    
    // Parse suggestions
    if (suggestionsMatch && suggestionsMatch[1]) {
      const suggestionsText = suggestionsMatch[1].trim();
      const suggestionItems = suggestionsText.split(/\n\s*-\s*/);
      
      for (const item of suggestionItems) {
        if (!item.trim()) continue;
        
        const fileMatch = item.match(/File:\s*([^,]+),/i);
        const lineMatch = item.match(/Line:\s*(\d+)/i);
        
        if (fileMatch) {
          const file = fileMatch[1].trim();
          const line = lineMatch ? parseInt(lineMatch[1], 10) : 1;
          const suggestion = item
            .replace(/File:\s*[^,]+,/i, '')
            .replace(/Line:\s*\d+/i, '')
            .replace(/Suggestion:/i, '')
            .replace(/^[\s\-,]+/, '')  // Remove any leading whitespace, dashes, commas
            .trim();
          
          if (suggestion) {
            suggestions.push({
              file,
              line,
              suggestion
            });
          }
        }
      }
    }
    
    // Parse educational content
    if (educationalMatch && educationalMatch[1]) {
      const educationalText = educationalMatch[1].trim();
      // Split by ### or \n### to handle both newline and non-newline cases
      const topicBlocks = educationalText.split(/(\n\s*|\s*)###\s*/);
      
      // First element might be empty if content started with ###
      const blocks = topicBlocks.filter(block => block.trim());
      
      for (const block of blocks) {
        if (!block.trim()) continue;
        
        const lines = block.split('\n');
        const topic = lines[0].trim();
        const explanation = lines.slice(1).join('\n').trim();
        
        if (topic && explanation) {
          educational.push({
            topic,
            explanation,
            skillLevel: 'intermediate' as 'beginner' | 'intermediate' | 'advanced' // Default value
          });
        }
      }
    }
    
    return {
      insights,
      suggestions,
      educational,
      metadata: {
        timestamp: new Date().toISOString(),
        template: this.promptTemplate,
        model: this.model
      }
    };
  }
}