import { BaseAgent } from '../base/base-agent';
import { AnalysisResult, Insight, Suggestion, EducationalContent } from '@codequal/core/types/agent';
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
    super(config);
    this.promptTemplate = promptTemplate;
    
    // Import OPENAI_MODELS directly to avoid unused import warning
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { GPT_3_5_TURBO } = require('@codequal/core/config/models/model-versions').OPENAI_MODELS;
    this.model = config.model || DEFAULT_MODELS_BY_PROVIDER['openai'] || GPT_3_5_TURBO;
    
    this.openaiClient = this.initOpenAIClient();
  }
  
  /**
   * Initialize OpenAI client
   * @returns OpenAI client
   */
  protected initOpenAIClient(): OpenAIClient {
    const apiKey = (this.config as ChatGPTAgentConfig).openaiApiKey || process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }
    
    const openai = new OpenAI({
      apiKey: apiKey,
    });
    
    const logger = createLogger('OpenAIAPI');
    
    return {
      chat: {
        completions: {
          create: async (params: OpenAIRequestParams) => {
            try {
              logger.debug('Calling OpenAI API with model:', params.model);
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
              
              logger.error('OpenAI API error:', errorData);
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
      // 1. Load prompt template and system prompt
      const template = loadPromptTemplate(this.promptTemplate);
      const systemPrompt = loadPromptTemplate(`${this.promptTemplate}_system`) || 
                          'You are a code review assistant specialized in analyzing pull requests.';
      
      // 2. Fill template with PR data
      const prompt = this.fillPromptTemplate(template, data);
      
      // 3. Call OpenAI API
      this.log('Calling OpenAI API', { template: this.promptTemplate, model: this.model });
      
      const response = await this.openaiClient.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3, // Lower temperature for more deterministic responses
        max_tokens: 4000
      });
      
      // 4. Parse response
      const responseText = response.choices[0]?.message?.content || '';
      return this.formatResult(responseText);
    } catch (error) {
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
    
    const insightsMatch = response.match(/## Insights\s+([\s\S]*?)(?=##|$)/i);
    const suggestionsMatch = response.match(/## Suggestions\s+([\s\S]*?)(?=##|$)/i);
    const educationalMatch = response.match(/## Educational\s+([\s\S]*?)(?=##|$)/i);
    
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