/**
 * AI Model Selector
 * 
 * Uses LLM to make intelligent model selections based on:
 * - Dynamic evaluation scores
 * - Role requirements
 * - Context-specific needs
 */

import { Logger } from 'winston';
import axios from 'axios';
import { EvaluatedModel, DYNAMIC_ROLE_WEIGHTS } from './dynamic-model-evaluator';

export interface SelectionContext {
  role: keyof typeof DYNAMIC_ROLE_WEIGHTS;
  language?: string;
  repositorySize?: 'small' | 'medium' | 'large' | 'enterprise';
  complexity?: number; // 1-10
  requirements?: {
    minQuality?: number;
    maxCost?: number;
    minSpeed?: number;
    needsLongContext?: boolean;
  };
}

export interface ModelSelection {
  primary: {
    id: string;
    provider: string;
    model: string;
    reasoning: string;
  };
  fallback: {
    id: string;
    provider: string;
    model: string;
    reasoning: string;
  };
  analysis: string;
  tokenUsage?: {
    prompt: number;
    completion: number;
    cost: number;
  };
}

export class AIModelSelector {
  private selectorModel: string | null = null;
  
  constructor(
    private logger: Logger,
    private openRouterApiKey: string
  ) {}

  /**
   * Select best models using AI
   */
  async selectModels(
    evaluatedModels: EvaluatedModel[],
    context: SelectionContext
  ): Promise<ModelSelection> {
    // Sort models by composite score
    const sortedModels = [...evaluatedModels].sort((a, b) => 
      b.scores.composite - a.scores.composite
    );
    
    // Take top 15 candidates for more diversity
    const candidates = sortedModels.slice(0, 15);
    
    // Find the best available AI model for selection
    await this.selectAIModel(sortedModels);
    
    if (!this.selectorModel) {
      this.logger.warn('No suitable AI model found for selection, using score-based fallback');
      return this.createFallbackSelection(candidates);
    }
    
    // Create selection prompt
    const prompt = this.createSelectionPrompt(candidates, context);
    
    try {
      // Call AI selector
      const response = await this.callAISelector(prompt);
      
      // Parse response
      return this.parseAIResponse(response, candidates);
      
    } catch (error) {
      this.logger.error('AI selection failed, using fallback', { error });
      // Fallback to top 2 by score
      return this.createFallbackSelection(candidates);
    }
  }

  /**
   * Create prompt for AI selection
   */
  private createSelectionPrompt(
    candidates: EvaluatedModel[],
    context: SelectionContext
  ): string {
    const roleDesc = this.getRoleDescription(context.role);
    
    // CRITICAL: Add strong context-specific guidance
    let contextGuidance = '';
    if (context.language && context.repositorySize) {
      if (context.language === 'python' && context.repositorySize === 'small') {
        contextGuidance = '\n🎯 CONTEXT: Small Python repos need FAST, CHEAP models. Prefer flash/turbo variants.';
      } else if (context.language === 'python' && context.repositorySize === 'large') {
        contextGuidance = '\n🎯 CONTEXT: Large Python repos need DEEP ANALYSIS. Prefer larger, smarter models.';
      } else if (context.language === 'typescript' && context.repositorySize === 'small') {
        contextGuidance = '\n🎯 CONTEXT: Small TS repos need BALANCED models with good type understanding.';
      } else if (context.language === 'typescript' && context.repositorySize === 'large') {
        contextGuidance = '\n🎯 CONTEXT: Large TS repos need PREMIUM models for complex type analysis.';
      } else if (['rust', 'c', 'cpp'].includes(context.language)) {
        contextGuidance = '\n🎯 CONTEXT: Systems languages REQUIRE highest quality models for safety.';
      }
    }
    
    // Role-specific guidance
    let roleGuidance = '';
    if (context.role === 'deepwiki') {
      roleGuidance = '\n⚡ DEEPWIKI: Needs HIGHEST quality model available, cost is secondary.';
    } else if (context.role === 'security') {
      roleGuidance = '\n⚡ SECURITY: CRITICAL accuracy needed. Choose most reliable model.';
    } else if (context.role === 'educational') {
      roleGuidance = '\n⚡ EDUCATIONAL: MUST be cost-effective. Choose cheapest reasonable option.';
    }
    
    let prompt = `You are an expert AI model selector. Select the best PRIMARY and FALLBACK models for the following use case:

ROLE: ${context.role}
DESCRIPTION: ${roleDesc}${contextGuidance}${roleGuidance}
${context.language ? `LANGUAGE: ${context.language}` : ''}
${context.repositorySize ? `REPOSITORY SIZE: ${context.repositorySize}` : ''}
${context.complexity ? `COMPLEXITY: ${context.complexity}/10` : ''}

REQUIREMENTS:
- Primary model should be the best overall choice
- Fallback should be reliable but can prioritize cost savings
- 🚨 CRITICAL: ONLY select models released in the LAST 3 MONTHS (90 days)
- 🚨 AUTOMATIC REJECTION: Any model older than 6 months
- 🚨 STRICT DATE CHECKING: Look for YYYYMMDD patterns (e.g., 20241022)
- 🚨 VERSION PRIORITY: Always choose highest version (3.0 > 2.5 > 2.0)
- 🚨 NEVER select models with old date patterns like:
  - 20240229 (February 2024) - TOO OLD
  - 20240718 (July 2024) - TOO OLD  
  - 20240912 (September 2024) - BORDERLINE
- 🚨 ONLY ACCEPT models with recent dates like:
  - 202410XX (October 2024) - ACCEPTABLE
  - 202411XX (November 2024) - GOOD
  - 202412XX (December 2024) - EXCELLENT
- If no model meets the 3-month requirement, EXPLICITLY STATE this problem
- The system should be searching web for latest models BEFORE this selection

CANDIDATE MODELS (sorted by composite score):
`;

    candidates.forEach((model, i) => {
      prompt += `
${i + 1}. ${model.id}
   Scores: Quality=${model.scores.quality.toFixed(1)}, Speed=${model.scores.speed.toFixed(1)}, Cost=${model.scores.cost.toFixed(1)}, Fresh=${model.scores.freshness.toFixed(1)}
   Composite: ${model.scores.composite.toFixed(2)}
   Key points: ${model.reasoning.slice(-3).join(', ')}
`;
    });

    prompt += `
IMPORTANT: Models are already sorted by composite score, but you should consider:
1. Specific role requirements (${roleDesc})
2. Model compatibility and proven track record
3. Cost-benefit trade-offs
4. Freshness vs stability balance

🚨 DIVERSITY REQUIREMENT:
- DO NOT always pick the same models for different contexts
- Small repos should use DIFFERENT (cheaper/faster) models than large repos
- Python should use DIFFERENT models than TypeScript when appropriate
- DeepWiki needs DIFFERENT (higher quality) models than Educational
- If context suggests "fast/cheap", pick models with "flash", "turbo", "mini" in name
- If context suggests "quality", pick models with "opus", "ultra", larger parameter counts
- VARY your selections based on the specific context provided

OUTPUT FORMAT (JSON only):
{
  "primary": {
    "number": <candidate number>,
    "reasoning": "<one sentence why this is best for primary>"
  },
  "fallback": {
    "number": <candidate number>,
    "reasoning": "<one sentence why this is good for fallback>"
  },
  "analysis": "<brief analysis of the selection>"
}`;

    return prompt;
  }

  /**
   * Get role description
   */
  private getRoleDescription(role: string): string {
    const descriptions: Record<string, string> = {
      deepwiki: 'Deep code analysis and understanding, needs high quality',
      researcher: 'Model discovery and evaluation, balance cost and quality',
      security: 'Security vulnerability detection, requires highest accuracy',
      architecture: 'System design analysis, needs broad understanding',
      performance: 'Performance optimization, requires speed and efficiency',
      code_quality: 'Code review and suggestions, balance all factors',
      dependencies: 'Dependency analysis, can use cheaper models',
      documentation: 'Documentation generation, cost-effective choices',
      testing: 'Test generation, pragmatic and cost-conscious',
      translator: 'Code translation between languages, reliable and fast'
    };
    
    return descriptions[role] || 'General purpose code analysis';
  }

  /**
   * Call AI selector
   */
  private async callAISelector(prompt: string): Promise<any> {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: this.selectorModel,
        messages: [
          {
            role: 'system',
            content: 'You are an expert at selecting AI models based on requirements. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.3 // Slightly higher for more diversity in selection
      },
      {
        headers: {
          'Authorization': `Bearer ${this.openRouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/codequal/ai-selector',
          'X-Title': 'CodeQual AI Model Selector'
        }
      }
    );
    
    const usage = response.data.usage;
    const content = response.data.choices[0].message.content;
    
    return {
      content,
      usage: {
        prompt: usage.prompt_tokens,
        completion: usage.completion_tokens,
        cost: this.calculateCost(usage)
      }
    };
  }

  /**
   * Parse AI response
   */
  private parseAIResponse(
    response: any,
    candidates: EvaluatedModel[]
  ): ModelSelection {
    try {
      // Extract JSON from response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Get selected models
      const primaryIdx = parsed.primary.number - 1;
      const fallbackIdx = parsed.fallback.number - 1;
      
      if (primaryIdx < 0 || primaryIdx >= candidates.length ||
          fallbackIdx < 0 || fallbackIdx >= candidates.length) {
        throw new Error('Invalid model selection indices');
      }
      
      const primary = candidates[primaryIdx];
      const fallback = candidates[fallbackIdx];
      
      return {
        primary: {
          id: primary.id,
          provider: primary.provider,
          model: primary.model,
          reasoning: parsed.primary.reasoning
        },
        fallback: {
          id: fallback.id,
          provider: fallback.provider,
          model: fallback.model,
          reasoning: parsed.fallback.reasoning
        },
        analysis: parsed.analysis,
        tokenUsage: response.usage
      };
      
    } catch (error) {
      this.logger.error('Failed to parse AI response', { error, content: response.content });
      throw error;
    }
  }

  /**
   * Create fallback selection
   */
  private createFallbackSelection(candidates: EvaluatedModel[]): ModelSelection {
    const primary = candidates[0];
    const fallback = candidates[1] || candidates[0];
    
    return {
      primary: {
        id: primary.id,
        provider: primary.provider,
        model: primary.model,
        reasoning: 'Highest composite score'
      },
      fallback: {
        id: fallback.id,
        provider: fallback.provider,
        model: fallback.model,
        reasoning: 'Second highest composite score'
      },
      analysis: 'Fallback selection based on scores'
    };
  }

  /**
   * Select the best AI model for making selections
   */
  private async selectAIModel(availableModels: EvaluatedModel[]): Promise<void> {
    // Find models suitable for AI selection tasks
    // Criteria: Good quality, fast, cost-effective, supports JSON output
    const aiCandidates = availableModels.filter(model => {
      const id = model.id.toLowerCase();
      // Look for models that are good at following instructions and generating JSON
      return (
        model.scores.quality >= 7.0 && // Good enough quality
        model.scores.speed >= 7.0 && // Fast response
        model.scores.cost >= 7.0 && // Cost effective
        !id.includes('vision') && // Not vision models
        !id.includes('embed') // Not embedding models
      );
    });
    
    if (aiCandidates.length === 0) {
      this.logger.error('No suitable AI models found for selection');
      return;
    }
    
    // Sort by balance of speed and cost (for selection tasks)
    aiCandidates.sort((a, b) => {
      const scoreA = a.scores.speed * 0.4 + a.scores.cost * 0.4 + a.scores.quality * 0.2;
      const scoreB = b.scores.speed * 0.4 + b.scores.cost * 0.4 + b.scores.quality * 0.2;
      return scoreB - scoreA;
    });
    
    // Use the best available model
    this.selectorModel = aiCandidates[0].id;
    this.logger.info(`Selected AI model for selection: ${this.selectorModel}`);
  }
  
  /**
   * Calculate cost for selector usage
   */
  private calculateCost(usage: any): number {
    // Dynamic cost calculation based on actual usage
    // This will be calculated based on the actual model used
    // For now, return a placeholder
    return 0.001; // Will be calculated from actual model pricing
  }
}