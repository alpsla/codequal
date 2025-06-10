import { BaseAgent } from '../base/base-agent';
import { AnalysisResult, Insight, Suggestion, EducationalContent } from '../../../core/src';
import { loadPromptTemplate } from '../prompts/prompt-loader';
import { DEFAULT_MODELS_BY_PROVIDER } from '@codequal/core/config/models/model-versions';
import { createLogger, LoggableData } from '@codequal/core/utils';

// Define Gemini models 
const GEMINI_MODELS = {
  GEMINI_1_5_FLASH: 'gemini-1.5-flash', // For backwards compatibility
  GEMINI_1_5_PRO: 'gemini-2.5-pro-preview-05-06', // Updated to use 2.5 model
  GEMINI_2_5_PRO: 'gemini-2.5-pro-preview-05-06',
  // Legacy models
  GEMINI_PRO: 'gemini-pro',
  GEMINI_ULTRA: 'gemini-ultra'
};

// Define pricing information
const GEMINI_PRICING = {
  [GEMINI_MODELS.GEMINI_1_5_FLASH]: { input: 0.35, output: 1.05 }, // Flash pricing
  [GEMINI_MODELS.GEMINI_1_5_PRO]: { input: 7.00, output: 21.00 }, // Updated for 2.5 Pro
  [GEMINI_MODELS.GEMINI_2_5_PRO]: { input: 7.00, output: 21.00 }, // 2.5 Pro pricing
  // Legacy models
  [GEMINI_MODELS.GEMINI_PRO]: { input: 3.50, output: 10.50 }, // Old 1.0 pricing
  [GEMINI_MODELS.GEMINI_ULTRA]: { input: 7.00, output: 21.00 } // Legacy Ultra pricing
};

// Define premium models for local use (this is different from the core module version)
const LOCAL_PREMIUM_MODELS_BY_PROVIDER = {
  'google': GEMINI_MODELS.GEMINI_2_5_PRO
};

/**
 * Gemini client interface
 */
interface GeminiClient {
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
  complexity?: 'simple' | 'medium' | 'complex';
}

/**
 * Gemini Agent configuration
 */
interface GeminiAgentConfig {
  model?: string;
  geminiApiKey?: string;
  debug?: boolean;
  premium?: boolean;
  [key: string]: unknown;
}

/**
 * Implementation of Gemini-based agent
 */
export class GeminiAgent extends BaseAgent {
  /**
   * Prompt template name
   */
  private promptTemplate: string;
  
  /**
   * Gemini API client
   */
  private geminiClient: GeminiClient;

  /**
   * Model name
   */
  private model: string;

  /**
   * Premium model name
   */
  private premiumModel: string;

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
  constructor(promptTemplate: string, config: GeminiAgentConfig = {}) {
    super(config);
    this.promptTemplate = promptTemplate;
    
    // Set the default model (cost-effective option)
    this.model = config.model || DEFAULT_MODELS_BY_PROVIDER['google'];
    
    // Set the premium model
    this.premiumModel = LOCAL_PREMIUM_MODELS_BY_PROVIDER['google'];
    
    this.geminiClient = this.initGeminiClient();
  }
  
  /**
   * Initialize Gemini client
   * @returns Gemini client
   */
  private initGeminiClient(): GeminiClient {
    const apiKey = (this.config as GeminiAgentConfig).geminiApiKey || process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }
    
    const logger = createLogger('GeminiAPI');
    const model = this.model;  // Capture this.model for use in the closure
    const premiumModel = this.premiumModel;
    
    return {
      // Use an arrow function to maintain the lexical 'this' context
      generateResponse: async (prompt: string, systemPrompt?: string): Promise<string> => {
        // Determine if this is a complex analysis requiring the premium model
        // This logic would normally be based on PR complexity, code size, etc.
        const complexity = prompt.length > 10000 ? 'complex' : 'simple';
        const selectedModel = complexity === 'complex' ? premiumModel : model;
        
        logger.debug('Calling Gemini API with model:', selectedModel);
        logger.debug('Prompt preview:', prompt.substring(0, 100) + '...');
        logger.debug('Using premium model:', selectedModel === premiumModel);
        
        try {
          // Make a direct API call to Google's Generative AI API
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt
                    }
                  ]
                }
              ],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 4000,
                topP: 0.95,
                topK: 40
              }
            })
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API error: ${response.status} ${errorText}`);
          }
          
          const data = await response.json();
          
          // Track token usage for cost estimation
          if (data.usageMetadata) {
            this.tokenUsage = {
              input: data.usageMetadata.promptTokenCount || 0,
              output: data.usageMetadata.candidatesTokenCount || 0
            };
            
            // Log token usage to get a sense of costs
            const pricing = GEMINI_PRICING[selectedModel] || { input: 0.35, output: 1.05 }; // Default to Flash pricing
            const estimatedCost = (this.tokenUsage?.input * pricing.input + this.tokenUsage?.output * pricing.output) / 1000000; // Cost in USD
            
            logger.info('Token usage:', {
              model: selectedModel,
              inputTokens: this.tokenUsage?.input || 0,
              outputTokens: this.tokenUsage?.output || 0,
              estimatedCost: `${estimatedCost.toFixed(6)}`
            });
          }
          
          // Extract the generated text from the response
          return data.candidates[0].content.parts[0].text;
        } catch (error) {
          const errorData: LoggableData = error instanceof Error 
            ? error 
            : { message: String(error) };
          
          logger.error('Gemini API error:', errorData);
          throw error;
        }
      }
    };
  }
  
  /**
   * Analyze PR data using Gemini
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
      
      // 3. Determine complexity for model selection
      // Implement a more sophisticated complexity detection here in a real solution
      const totalCodeSize = data.files?.reduce((size, file) => size + (file.content?.length || 0), 0) || 0;
      const complexity: 'simple' | 'medium' | 'complex' = 
        totalCodeSize > 20000 ? 'complex' :
        totalCodeSize > 5000 ? 'medium' : 'simple';
      
      // 4. Check if premium model is needed based on complexity or configuration
      const usePremiumModel = complexity === 'complex' || (this.config as GeminiAgentConfig).premium === true;
      
      // 5. Set model for this analysis
      const analysisModel = usePremiumModel ? this.premiumModel : this.model;
      
      // 6. Log information about the analysis
      this.log('Calling Gemini API', { 
        template: this.promptTemplate, 
        model: analysisModel,
        complexity,
        usePremiumModel,
        codeSize: totalCodeSize
      });
      
      // 7. Call Gemini API with the appropriate model
      // In a real implementation, you would pass the model selection to the API client
      const response = await this.geminiClient.generateResponse(prompt, systemPrompt);
      
      // Update the instance model with the selected model for metadata
      this.model = analysisModel;
      
      // 8. Parse response
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
   * Format Gemini response to standard format
   * @param rawResult Raw response from Gemini
   * @returns Standardized analysis result
   */
  protected formatResult(rawResult: unknown): AnalysisResult {
    const response = rawResult as string;
    const model = this.model; // Default to instance model
    
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
      
      // Direct extraction of individual insights using regex
      const insightRegex = /- \[(high|medium|low)\] (.+?)(?=\n- \[|$)/gs;
      let match;
      
      while ((match = insightRegex.exec(insightsText)) !== null) {
        const severity = match[1].toLowerCase() as 'high' | 'medium' | 'low';
        const message = match[2].trim();
        
        if (message) {
          insights.push({
            type: 'code_review',
            severity,
            message
          });
        }
      }
      
      // If no insights were found, fall back to the previous method
      if (insights.length === 0) {
        // Add a newline at the beginning to ensure consistent splitting
        const insightItems = ('\n' + insightsText).split(/\n\s*-\s*/);
        
        // Skip the first item which would be empty due to the added newline
        for (let i = 1; i < insightItems.length; i++) {
          const item = insightItems[i];
          if (!item.trim()) continue;
          
          const severityMatch = item.match(/\[(high|medium|low)\]/i);
          const severity = severityMatch ? severityMatch[1].toLowerCase() as 'high' | 'medium' | 'low' : 'medium';
          // Remove the severity tag and any leading dash or whitespace
          const message = item.replace(/\[(high|medium|low)\]/i, '').replace(/^\s*-\s*/, '').trim();
          
          if (message) {
            insights.push({
              type: 'code_review',
              severity,
              message
            });
          }
        }
      }
    }
    
    // Parse suggestions
    if (suggestionsMatch && suggestionsMatch[1]) {
      const suggestionsText = suggestionsMatch[1].trim();
      
      // Direct extraction of individual suggestions using regex
      const suggestionRegex = /- File: ([^,]+), Line: (\d+), Suggestion: (.+?)(?=\n- File:|$)/gs;
      let match;
      
      while ((match = suggestionRegex.exec(suggestionsText)) !== null) {
        const file = match[1].trim();
        const line = parseInt(match[2], 10);
        const suggestionText = match[3].trim();
        
        // Remove any leading dash, comma, or whitespace
        const suggestion = suggestionText.replace(/^[\s,-]*/, '').trim();
        
        if (suggestion) {
          suggestions.push({
            file,
            line,
            suggestion
          });
        }
      }
      
      // If no suggestions were found, fall back to the previous method
      if (suggestions.length === 0) {
        // Add a newline at the beginning to ensure consistent splitting
        const suggestionItems = ('\n' + suggestionsText).split(/\n\s*-\s*/);
        
        // Skip the first item which would be empty due to the added newline
        for (let i = 1; i < suggestionItems.length; i++) {
          const item = suggestionItems[i];
          if (!item.trim()) continue;
          
          const fileMatch = item.match(/File:\s*([^,]+),/i);
          const lineMatch = item.match(/Line:\s*(\d+)/i);
          
          if (fileMatch) {
            const file = fileMatch[1].trim();
            const line = lineMatch ? parseInt(lineMatch[1], 10) : 1;
            const suggestionText = item
              .replace(/File:\s*[^,]+,/i, '')
              .replace(/Line:\s*\d+/i, '')
              .replace(/Suggestion:/i, '')
              .trim();

            // Remove any leading dash, comma, or whitespace
            const suggestion = suggestionText.replace(/^[\s,-]*/, '').trim();
            
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
    
    // Check if this was a premium model analysis
    const isPremiumModel = model === this.premiumModel;
    
    return {
      insights,
      suggestions,
      educational,
      metadata: {
        timestamp: new Date().toISOString(),
        template: this.promptTemplate,
        model,
        provider: 'gemini',
        premium: isPremiumModel,
        // For a real implementation, you'd include token usage here
        tokenUsage: this.tokenUsage,
        pricing: GEMINI_PRICING[model] || { input: 0.35, output: 1.05 } // Default to Flash pricing
      }
    };
  }

  /**
   * Handle error in agent operation
   * @param error Error object
   * @returns Error result
   */
  protected handleError(error: unknown): AnalysisResult {
    // Log the error using the logger from BaseAgent
    this.logger.error('Error in Gemini agent', error instanceof Error ? error : { message: String(error) });
    
    return {
      insights: [],
      suggestions: [],
      educational: [], // Add empty educational array to ensure the property exists
      metadata: {
        error: true,
        timestamp: new Date().toISOString(),
        message: error instanceof Error ? error.message : String(error)
      }
    };
  }
}