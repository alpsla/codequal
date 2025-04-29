import { BaseAgent } from '../base/base-agent';
import { AnalysisResult, Insight, Suggestion, EducationalContent } from '@codequal/core/types/agent';
import { loadPromptTemplate } from '../prompts/prompt-loader';

/**
 * DeepSeek API response type
 */
interface DeepSeekResponse {
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
  };
}

/**
 * DeepSeek API request parameters
 */
interface DeepSeekRequestParams {
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
 * DeepSeek API client
 */
interface DeepSeekClient {
  chat: {
    completions: {
      create: (params: DeepSeekRequestParams) => Promise<DeepSeekResponse>;
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
 * DeepSeek Agent configuration
 */
interface DeepSeekAgentConfig {
  model?: string;
  deepseekApiKey?: string;
  debug?: boolean;
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
   * @param promptTemplate Template name
   * @param config Configuration
   */
  constructor(promptTemplate: string, config: DeepSeekAgentConfig = {}) {
    super(config);
    this.promptTemplate = promptTemplate;
    this.model = config.model || 'deepseek-coder';
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
    
    return {
      chat: {
        completions: {
          create: async (params: DeepSeekRequestParams) => {
            const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
              },
              body: JSON.stringify(params)
            });
            
            if (!response.ok) {
              const errorData = await response.json() as { error?: { message?: string } };
              throw new Error(`DeepSeek API error: ${errorData.error?.message || response.statusText}`);
            }
            
            return response.json() as Promise<DeepSeekResponse>;
          }
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
      // 1. Load prompt template
      const template = loadPromptTemplate(this.promptTemplate);
      
      // 2. Fill template with PR data
      const prompt = this.fillPromptTemplate(template, data);
      
      // 3. Call DeepSeek API
      this.log('Calling DeepSeek API', { template: this.promptTemplate });
      
      const response = await this.deepseekClient.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: 'You are a code review assistant specialized in analyzing pull requests.' },
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
        model: this.model
      }
    };
  }
}