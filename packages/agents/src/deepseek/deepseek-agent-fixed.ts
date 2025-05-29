import { BaseAgent } from '../base/base-agent';
import { AnalysisResult, Insight, Suggestion, EducationalContent, DEFAULT_MODELS_BY_PROVIDER, DEEPSEEK_MODELS, DEEPSEEK_PRICING, createLogger } from '@codequal/core';
import { loadPromptTemplate } from '../prompts/prompt-loader';
import { formatError } from '../utils/error-utils';

/**
 * DeepSeek client interface
 */
interface DeepSeekClient {
  generateResponse(prompt: string, systemPrompt?: string): Promise<string>;
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
 * DeepSeek Agent configuration
 */
interface DeepSeekAgentConfig {
  model?: string;
  deepseekApiKey?: string;
  debug?: boolean;
  premium?: boolean;
  [key: string]: unknown;
}

/**
 * Implementation of DeepSeek-based agent
 */
export class DeepSeekAgent extends BaseAgent {
  /**
   * Prompt template name
   */
  private promptTemplate: string;
  
  /**
   * DeepSeek API client
   */
  private deepseekClient: DeepSeekClient;

  /**
   * Model name
   */
  private model: string;

  /**
   * Token usage for cost tracking
   */
  private tokenUsage = {
    input: 0,
    output: 0
  };
  
  /**
   * @param promptTemplate Template name
   * @param config Configuration
   */
  constructor(promptTemplate: string, config: DeepSeekAgentConfig = {}) {
    super(config);
    this.promptTemplate = promptTemplate;
    
    // Determine model to use - premium or default
    // Note: Since DEEPSEEK_CODER is the only available model now, we use it for both premium and default
    this.model = config.premium
      ? DEEPSEEK_MODELS.DEEPSEEK_CODER // Premium model
      : config.model || DEFAULT_MODELS_BY_PROVIDER['deepseek']; // Default or specified model
    
    this.deepseekClient = this.initDeepSeekClient();
  }
  
  /**
   * Initialize DeepSeek client
   * @returns DeepSeek client
   */
  private initDeepSeekClient(): DeepSeekClient {
    const apiKey = (this.config as DeepSeekAgentConfig).deepseekApiKey || process.env.DEEPSEEK_API_KEY;
    
    if (!apiKey) {
      throw new Error('DeepSeek API key is required');
    }
    
    const logger = createLogger('DeepSeekAPI');
    const model = this.model;  // Capture this.model for use in the closure
    
    // Create a reference to update token usage
    const updateTokenUsage = (input: number, output: number) => {
      this.tokenUsage = { input, output };
    };
    
    return {
      async generateResponse(prompt: string, systemPrompt?: string): Promise<string> {
        logger.debug('Calling DeepSeek API with model:', model);
        logger.debug('Prompt preview:', prompt.substring(0, 100) + '...');
        
        try {
          // Make a direct API call to DeepSeek API
          const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: model,
              messages: [
                ...(systemPrompt ? [{
                  role: 'system',
                  content: systemPrompt
                }] : []),
                {
                  role: 'user',
                  content: prompt
                }
              ],
              temperature: 0.7,
              max_tokens: 4000
            })
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`DeepSeek API error: ${response.status} ${errorText}`);
          }
          
          const data = await response.json();
          
          // Track token usage for cost estimation
          if (data.usage) {
            const inputTokens = data.usage.prompt_tokens || 0;
            const outputTokens = data.usage.completion_tokens || 0;
            
            // Update token usage via the closure
            updateTokenUsage(inputTokens, outputTokens);
            
            // Log token usage to get a sense of costs
            const pricing = DEEPSEEK_PRICING[model] || { input: 0.7, output: 1.0 }; // Default to standard pricing
            const estimatedCost = (inputTokens * pricing.input + outputTokens * pricing.output) / 1000000; // Cost in USD
            
            logger.info('Token usage:', {
              model,
              inputTokens,
              outputTokens,
              estimatedCost: `$${estimatedCost.toFixed(6)}`
            });
          }
          
          return data.choices[0].message.content;
        } catch (error) {
          logger.error('DeepSeek API error:', formatError(error));
          throw error;
        }
      }
    };
  }
  
  /**
   * Analyze PR data using DeepSeek
   * @param data PR data
   * @returns Analysis result
   */
  async analyze(data: PRData): Promise<AnalysisResult> {
    try {
      // 1. Load prompt template and system prompt
      const template = loadPromptTemplate(this.promptTemplate);
      const systemPrompt = loadPromptTemplate(`${this.promptTemplate}_system`) || undefined;
      
      // 2. Fill template with PR data
      const prompt = this.fillPromptTemplate(template, data);
      
      // 3. Call DeepSeek API
      this.log('Calling DeepSeek API', { template: this.promptTemplate, model: this.model });
      const response = await this.deepseekClient.generateResponse(prompt, systemPrompt);
      
      // 4. Parse response
      return this.formatResult(response);
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
   * Format DeepSeek response to standard format
   * @param response DeepSeek response
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
        const message = item.replace(/\[(high|medium|low)\]/i, '').trim();
        
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
      const topicBlocks = educationalText.split(/\n\s*###\s*/);
      
      for (const block of topicBlocks) {
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
        model: this.model,
        provider: 'deepseek',
        // Include token usage information
        tokenUsage: this.tokenUsage
      }
    };
  }
}