/**
 * Research Agent for Dynamic Model Configuration Matrix
 * 
 * This agent uses cost-effective thinking models to research optimal configurations
 * instead of expensive calibration. It keeps the matrix updated with latest
 * market intelligence about AI models, pricing, and capabilities.
 */

import { AnalysisParameters, ModelConfig, GeneratedConfiguration } from './ModelConfigurationMatrix';
import { Logger } from '../../utils/logger';

/**
 * Available research models (cost-effective thinking models)
 */
export interface ResearchModel {
  provider: 'openrouter' | 'anthropic' | 'openai';
  model: string;
  costPer1kTokens: number;
  supportsThinking: boolean;
  maxTokens: number;
}

/**
 * Market research update
 */
export interface MarketUpdate {
  action: 'add_model' | 'update_pricing' | 'deprecate_model' | 'update_capabilities';
  modelPath: string;
  changes: {
    pricing?: number;
    capabilities?: string[];
    performance?: {
      speed: 'fast' | 'medium' | 'slow';
      quality: number; // 1-10
      costEfficiency: number; // 1-10
    };
    deprecationDate?: string;
  };
  reasoning: string;
  confidence: number; // 0-100
  researchDate: Date;
}

/**
 * Research prompt templates
 */
export class ResearchPrompts {
  /**
   * Prompt 1A: Initial configuration research for PR Analysis (multi-agent)
   */
  static generateInitialPRAnalysisPrompt(patterns: AnalysisParameters[]): string {
    const currentDate = new Date().toISOString().split('T')[0];
    
    return `You are researching optimal models for PR ANALYSIS using multi-agent orchestration (${currentDate}).

CONTEXT:
- PR analysis uses MULTIPLE specialized agents (not one model)
- Speed is critical (developers wait for feedback)
- Different models optimize for different aspects
- User can choose quick/balanced/comprehensive analysis

AGENT TYPES TO CONFIGURE:
1. SYNTAX CHECKER (fastest, basic checks)
2. CODE QUALITY REVIEWER (patterns, best practices)
3. SECURITY SCANNER (vulnerabilities, precision critical)
4. PERFORMANCE ANALYZER (optimization opportunities)
5. ARCHITECTURE REVIEWER (design patterns, big picture)

PATTERNS TO RESEARCH (${patterns.length} total):
${patterns.map((p, i) => `
${i + 1}. ${p.language} + ${p.analysisType}
   - User tier: ${p.costSensitivity === 'high' ? 'Free' : p.costSensitivity === 'medium' ? 'Pro' : 'Enterprise'}
   - PR size: ${p.repoSize}
`).join('')}

For each pattern, provide optimal model FOR EACH AGENT:
{
  "configId": "pr-analysis-${patterns[0].language}-${patterns[0].costSensitivity}",
  "agents": {
    "syntaxChecker": {
      "model": "google/gemini-2.5-flash",
      "reasoning": "Fastest for basic checks"
    },
    "codeQualityReviewer": {
      "model": "anthropic/claude-3.5-haiku",
      "reasoning": "Good balance of speed and pattern detection"
    },
    "securityScanner": {
      "model": "anthropic/claude-3.5-sonnet",
      "temperature": 0.1,
      "reasoning": "High precision for security"
    }
  },
  "estimatedTotalTime": "3 minutes",
  "estimatedTotalCost": 0.002
}`;
  }

  /**
   * Prompt 1B: Initial configuration research for Repository Analysis (single model)
   */
  static generateInitialRepoAnalysisPrompt(patterns: AnalysisParameters[]): string {
    const currentDate = new Date().toISOString().split('T')[0];
    
    return `You are researching optimal models for REPOSITORY ANALYSIS using single model approach (${currentDate}).

CONTEXT:
- Repository analysis uses ONE MODEL for entire analysis (DeepWiki approach)
- Quality more important than speed (5-10 minutes acceptable)
- Model must understand entire codebase holistically
- Generates comprehensive documentation and insights

PATTERNS TO RESEARCH (${patterns.length} total):
${patterns.map((p, i) => `
${i + 1}. ${p.language} repository
   - Size: ${p.repoSize} 
   - Quality requirement: ${p.qualityRequirement}
   - Cost sensitivity: ${p.costSensitivity}
`).join('')}

For each pattern, provide ONE optimal model:
{
  "configId": "repo-analysis-${patterns[0].language}-${patterns[0].repoSize}",
  "selectedModel": {
    "provider": "openrouter",
    "model": "anthropic/claude-3.5-sonnet",
    "modelPath": "openrouter/anthropic/claude-3.5-sonnet",
    "temperature": 0.3,
    "maxTokens": 8000,
    "reasoning": "Best for understanding complex ${patterns[0].language} architectures"
  },
  "expectedMetrics": {
    "avgResponseTimeMs": 5000,
    "costPer1kTokens": 0.003,
    "qualityScore": 9.5
  },
  "fallbackModels": ["openrouter/gpt-4o", "openrouter/gemini-2.5-pro"]
}`;
  }

  /**
   * Prompt 1: Initial configuration research for common patterns
   */
  static generateInitialResearchPrompt(patterns: AnalysisParameters[]): string {
    const currentDate = new Date().toISOString().split('T')[0];
    
    return `You are researching optimal model configurations for CodeQual's launch (${currentDate}).

CONTEXT:
- This is the INITIAL setup for common usage patterns
- We need configurations that will handle 90% of actual usage
- Consider current market models and pricing

PATTERNS TO RESEARCH (${patterns.length} total):
${patterns.map((p, i) => `
${i + 1}. ${p.language} + ${p.analysisType}
   - Speed: ${p.speed}, Quality: ${p.qualityRequirement}
   - Cost Sensitivity: ${p.costSensitivity}
   - Special needs: ${JSON.stringify(p.features || {})}
`).join('')}

IMPORTANT CONSIDERATIONS:
- PR Reviews need SPEED (users wait for feedback)
- Architecture analysis can be SLOW but needs reasoning
- Security needs PRECISION (low temperature, high accuracy)
- Performance needs code execution understanding
- Different user tiers have different cost tolerances

For each pattern, provide:
{
  "configId": "${patterns[0].speed}-${patterns[0].complexity}-${patterns[0].language}-...",
  "selectedModel": {
    "provider": "openrouter",
    "model": "google/gemini-2.5-flash",
    "modelPath": "openrouter/google/gemini-2.5-flash",
    "temperature": 0.3,
    "maxTokens": 3000
  },
  "reasoning": "Selected for speed and cost-efficiency...",
  "expectedMetrics": {
    "avgResponseTimeMs": 800,
    "costPer1kTokens": 0.00015,
    "qualityScore": 8.5
  },
  "fallbackModels": ["openrouter/claude-3.5-haiku"]
}

Return configurations for ALL ${patterns.length} patterns.`;
  }

  /**
   * Prompt 2: Weekly update research (only changes)
   */
  static generateWeeklyUpdatePrompt(existingConfigs: any[]): string {
    const currentDate = new Date().toISOString().split('T')[0];
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    return `You are performing WEEKLY maintenance research for CodeQual's model configurations.

CURRENT DATE: ${currentDate}
LAST UPDATE: ${lastWeek}

EXISTING CONFIGURATIONS (${existingConfigs.length} total):
${existingConfigs.slice(0, 5).map(c => 
  `- ${c.configId}: ${c.model} ($${c.costPer1kTokens}/1k)`
).join('\n')}
... and ${existingConfigs.length - 5} more

RESEARCH TASKS:
1. NEW MODELS: Any models released in the past week?
2. PRICING: Any price changes for existing models?
3. DEPRECATIONS: Any models being discontinued?
4. PERFORMANCE: Any significant updates or benchmarks?
5. OUTPERFORMANCE: Any new models that are strictly better?

IMPORTANT: Only return CHANGES, not the entire configuration set.

RESPONSE FORMAT:
{
  "updates": [
    {
      "configId": "fast-simple-javascript-pr_review",
      "change": "model_update",
      "oldModel": "gemini-2.5-flash",
      "newModel": "gemini-2.6-flash",
      "reason": "2.6 is 30% faster with same quality and price",
      "impactedConfigs": 12
    }
  ],
  "newModels": [
    {
      "model": "anthropic/claude-3.6-haiku",
      "pricing": 0.0004,
      "bestFor": ["quick PR reviews", "simple analysis"],
      "betterThan": ["claude-3.5-haiku"]
    }
  ],
  "deprecations": [
    {
      "model": "openai/gpt-4-turbo",
      "replacedBy": "openai/gpt-4o",
      "deprecationDate": "2025-06-01"
    }
  ],
  "noChangesNeeded": false
}

If there are NO changes, return: {"noChangesNeeded": true, "updates": [], "newModels": [], "deprecations": []}`;
  }

  /**
   * Prompt 3A: On-demand PR Analysis research (multi-agent edge case)
   */
  static generateOnDemandPRAnalysisPrompt(params: AnalysisParameters): string {
    return `Research optimal models for PR ANALYSIS agents for an uncommon configuration.

CONTEXT:
- User requested PR analysis for rare/unusual combination
- Need MULTIPLE specialized agents (not single model)
- This is an edge case not in our common patterns

REQUESTED CONFIGURATION:
- Language: ${params.language} (possibly rare/specialized)
- PR Size: ${params.repoSize}
- Speed requirement: ${params.speed}
- Cost sensitivity: ${params.costSensitivity}
- Quality requirement: ${params.qualityRequirement}

RESEARCH TASK:
Find optimal models for EACH agent type:

1. SYNTAX CHECKER
   - Needs to understand ${params.language} syntax
   - Must be fast (${params.speed} speed requirement)
   
2. CODE QUALITY REVIEWER
   - Needs to detect ${params.language} patterns/anti-patterns
   - Balance speed vs quality based on user tier

3. SECURITY SCANNER (if applicable)
   - Needs to understand ${params.language} security issues
   - High precision required

4. PERFORMANCE ANALYZER (if applicable)
   - Needs to understand ${params.language} performance patterns

5. ARCHITECTURE REVIEWER (if comprehensive mode)
   - Needs reasoning capabilities

Consider if specialized models exist for ${params.language}.

RESPONSE FORMAT:
{
  "configId": "pr-analysis-${params.language}-edge-case",
  "agents": {
    "syntaxChecker": { "model": "...", "reasoning": "..." },
    "codeQualityReviewer": { "model": "...", "reasoning": "..." },
    "securityScanner": { "model": "...", "reasoning": "..." }
  },
  "specialConsiderations": "Any special notes for ${params.language}",
  "estimatedCost": 0.003
}`;
  }

  /**
   * Prompt 3B: On-demand Repository Analysis research (single model edge case)
   */
  static generateOnDemandRepoAnalysisPrompt(params: AnalysisParameters): string {
    return `Research optimal SINGLE model for REPOSITORY ANALYSIS of an uncommon configuration.

CONTEXT:
- User requested full repository analysis (DeepWiki style)
- Need ONE powerful model (not multiple agents)
- This is an edge case not in our common patterns

REQUESTED CONFIGURATION:
- Language: ${params.language} (possibly rare/specialized)
- Repository size: ${params.repoSize}
- Quality requirement: ${params.qualityRequirement} (can be slow)
- Cost sensitivity: ${params.costSensitivity}

RESEARCH QUESTIONS:
1. Does ${params.language} have specialized models?
2. Which model best understands ${params.language} architecture?
3. Can the model handle ${params.repoSize} repositories?
4. What's the best option given ${params.costSensitivity} budget?

REQUIREMENTS FOR THE MODEL:
- Must understand entire codebase holistically
- Generate comprehensive documentation
- Analyze dependencies and architecture
- Provide deep insights

RESPONSE FORMAT:
{
  "configId": "repo-analysis-${params.language}-${params.repoSize}",
  "selectedModel": {
    "provider": "openrouter",
    "model": "best-single-model-for-${params.language}",
    "temperature": 0.3,
    "maxTokens": 8000,
    "reasoning": "Why this model excels at ${params.language} repository analysis"
  },
  "alternativeConsiderations": "Other models considered",
  "specialNotes": "Any ${params.language}-specific considerations",
  "expectedMetrics": {
    "avgResponseTimeMs": 5000,
    "costPer1kTokens": 0.003,
    "qualityScore": 9.0
  }
}`;
  }

  /**
   * Prompt 3: On-demand configuration research for edge cases (legacy/generic)
   */
  static generateOnDemandResearchPrompt(params: AnalysisParameters): string {
    const currentDate = new Date().toISOString().split('T')[0];
    
    return `You are researching an optimal model for an UNCOMMON configuration request.

CONTEXT:
- This is an edge case not covered by common patterns
- User has requested a specific configuration
- This may be a rare language or unusual combination

REQUESTED CONFIGURATION:
- Language: ${params.language}
- Analysis Type: ${params.analysisType}
- Speed: ${params.speed}
- Complexity: ${params.complexity}
- Repository Size: ${params.repoSize}
- Cost Sensitivity: ${params.costSensitivity}
- Quality Requirement: ${params.qualityRequirement}
- Special Features: ${JSON.stringify(params.features || {})}

RESEARCH QUESTIONS:
1. Is ${params.language} a rare/specialized language?
2. Are there models specifically good at ${params.language}?
3. For ${params.analysisType} on ${params.language}, what matters most?
4. Given ${params.costSensitivity} cost sensitivity, what are the options?

CURRENT MODELS (May 2025):
- Gemini 2.5 Flash/Pro (Google)
- Claude 3.5 Sonnet/Haiku (Anthropic)
- GPT-4o/Mini (OpenAI)
- DeepSeek V3/Coder (DeepSeek)
- Llama 3.3/3.2 (Meta)
- Specialized models for certain languages

RESPONSE FORMAT:
{
  "configId": "${params.speed}-${params.complexity}-${params.language}-...",
  "selectedModel": {
    "provider": "openrouter",
    "model": "best-model-for-this-case",
    "modelPath": "openrouter/provider/model",
    "temperature": 0.3,
    "maxTokens": 3000
  },
  "reasoning": "Explain why this model is optimal for ${params.language} ${params.analysisType}",
  "alternativeConsiderations": "What other models were considered and why rejected",
  "expectedMetrics": {
    "avgResponseTimeMs": 1000,
    "costPer1kTokens": 0.001,
    "qualityScore": 8.0
  },
  "fallbackModels": ["fallback1", "fallback2"],
  "specialNotes": "Any special considerations for this edge case"
}

Focus on finding the BEST model for this specific edge case, even if it's not commonly used.

ANALYSIS REQUIREMENTS:
- Speed: ${params.speed} (fast=<2s, medium=2-5s, slow=5s+)
- Complexity: ${params.complexity} (simple=basic review, moderate=multi-file, complex=architectural)
- Language: ${params.language} (consider language-specific model strengths)
- Repository Size: ${params.repoSize} (small=<20 files, medium=20-100, large=100-1000, enterprise=1000+)
- Cost Sensitivity: ${params.costSensitivity} (high=prefer free/cheap, medium=balance, low=premium OK)
- Quality Requirement: ${params.qualityRequirement} (basic=functional, good=reliable, excellent=high-quality, perfect=best-possible)
- Analysis Type: ${params.analysisType}

RESEARCH REQUIREMENTS:
1. Consider the LATEST available models (December 2024 - May 2025):
   - Google: Gemini 2.5 Flash, Gemini 2.5 Pro, Gemini 2.0 Flash (thinking variants)
   - Anthropic: Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus
   - OpenAI: GPT-4o, GPT-4o Mini, O1-preview, O3-mini
   - Meta: Llama 3.3, Llama 3.2 (free variants)
   - DeepSeek: DeepSeek V3, DeepSeek Coder V2
   - Others: Command R+, Qwen QwQ, etc.

2. Consider current pricing (2025):
   - Free models: Gemini 2.0 Flash:free, Llama variants:free
   - Cheap: Gemini 2.5 Flash (~$0.00015/1k), Claude 3.5 Haiku (~$0.0005/1k)
   - Premium: Claude 3.5 Sonnet (~$0.003/1k), GPT-4o (~$0.005/1k)

3. Consider model strengths:
   - Code analysis: Claude 3.5 Sonnet, DeepSeek Coder, GPT-4o
   - Speed: Gemini 2.5 Flash, Claude 3.5 Haiku, Llama 3.2
   - Cost efficiency: Gemini 2.0 Flash:free, DeepSeek:free
   - Reasoning: O1-preview, Claude 3.5 Sonnet, Gemini 2.5 Pro
   - Language-specific: Consider if certain models excel at ${params.language}

RESPONSE FORMAT (JSON):
{
  "selectedModel": {
    "provider": "openrouter",
    "model": "google/gemini-2.5-flash",
    "modelPath": "openrouter/google/gemini-2.5-flash",
    "temperature": 0.3,
    "topP": 0.9,
    "maxTokens": 3000,
    "streamResponse": true,
    "includeThinking": false,
    "useCache": true
  },
  "reasoning": "Selected Gemini 2.5 Flash because it provides excellent speed (fast requirement) with good quality for ${params.language} analysis, while being very cost-effective for ${params.costSensitivity} sensitivity users. Updated from older Gemini 2.0 based on latest 2025 model releases.",
  "expectedMetrics": {
    "avgResponseTimeMs": 800,
    "costPer1kTokens": 0.00015,
    "qualityScore": 8.5,
    "successRate": 95.0
  },
  "fallbackModels": [
    "openrouter/anthropic/claude-3.5-haiku",
    "openrouter/deepseek/deepseek-coder"
  ],
  "confidence": 90,
  "marketContext": "Latest 2025 models show Gemini 2.5 Flash significantly outperforms 2.0 version with better reasoning and lower cost"
}

Focus on providing the MOST CURRENT and OPTIMAL recommendation based on 2025 market reality.`;
  }

  /**
   * Generate prompt for weekly market research
   */
  static generateMarketResearchPrompt(): string {
    const currentDate = new Date().toISOString().split('T')[0];
    
    return `You are an AI market research analyst. Analyze the current AI model landscape (as of ${currentDate}) and identify key updates since last week.

RESEARCH AREAS:
1. NEW MODELS: Any models released in the past week
2. PRICING CHANGES: Updated pricing for existing models
3. CAPABILITY UPDATES: Improved performance, new features
4. DEPRECATIONS: Models being discontinued
5. PROVIDER CHANGES: New providers, API changes

FOCUS ON CODE ANALYSIS MODELS:
- Google (Gemini family)
- Anthropic (Claude family)
- OpenAI (GPT-4, O1 family)
- Meta (Llama family)
- DeepSeek (Coder variants)
- Open source alternatives

RESPONSE FORMAT (JSON array):
[
  {
    "action": "add_model",
    "modelPath": "openrouter/google/gemini-2.6-flash",
    "changes": {
      "pricing": 0.0001,
      "capabilities": ["faster-inference", "better-code-understanding"],
      "performance": {
        "speed": "fast",
        "quality": 9,
        "costEfficiency": 10
      }
    },
    "reasoning": "New Gemini 2.6 Flash released with 50% speed improvement and 30% cost reduction",
    "confidence": 85
  },
  {
    "action": "update_pricing",
    "modelPath": "openrouter/anthropic/claude-3.5-sonnet",
    "changes": {
      "pricing": 0.0025
    },
    "reasoning": "Claude 3.5 Sonnet pricing reduced from $0.003 to $0.0025 per 1k tokens",
    "confidence": 95
  }
]

Only include changes that would affect our model selection decisions for code analysis tasks.`;
  }

  /**
   * Generate prompt for specific model capability research
   */
  static generateModelCapabilityPrompt(modelPath: string, language: string): string {
    return `Research the specific capabilities of ${modelPath} for ${language} code analysis.

RESEARCH FOCUS:
1. Code understanding quality for ${language}
2. Performance benchmarks
3. Current pricing and availability
4. Special features (reasoning, tool use, etc.)
5. Optimal configuration parameters

Provide detailed analysis of why this model would be good/bad for ${language} analysis compared to alternatives.

RESPONSE FORMAT (JSON):
{
  "modelPath": "${modelPath}",
  "language": "${language}",
  "capabilities": {
    "codeUnderstanding": 8.5,
    "reasoning": 7.0,
    "speed": 9.0,
    "costEfficiency": 9.5
  },
  "optimalConfig": {
    "temperature": 0.2,
    "topP": 0.9,
    "maxTokens": 4000,
    "includeThinking": false
  },
  "strengths": ["Fast inference", "Good at ${language} syntax", "Cost effective"],
  "weaknesses": ["Limited reasoning for complex architecture"],
  "recommendation": "Excellent for basic ${language} PR reviews, not ideal for complex architectural analysis"
}`;
  }

  /**
   * Prompt 4: Infrastructure Agent Research (stable, long-term models)
   */
  static generateInfrastructureAgentPrompt(): string {
    const currentDate = new Date().toISOString().split('T')[0];
    
    return `Research optimal models for INFRASTRUCTURE agents that require long-term stability (${currentDate}).

CONTEXT:
- These agents need STABLE configurations (updated quarterly, not weekly)
- They perform specialized system functions
- Enhanced with MCP (Model Context Protocol) tools
- Quality and reliability more important than cost

INFRASTRUCTURE AGENTS TO CONFIGURE:

1. EDUCATIONAL AGENT
   - Purpose: Generate learning content, track user progress
   - Needs: Creativity, pedagogical understanding, consistency
   - MCP Tools: Web search (examples), code execution (demos), visualization
   - Usage: Creates tutorials, exercises, explanations adapted to skill level

2. MASTER ORCHESTRATOR
   - Purpose: Coordinate all agents, combine analyses
   - Needs: High reasoning, context management, reliability
   - MCP Tools: Database access, vector search, agent control, analytics
   - Usage: Routes requests, combines PR+Repo analyses, tracks company skills

3. REPORT COMPILER
   - Purpose: Merge multiple analyses into polished reports
   - Needs: Synthesis, formatting, clarity
   - MCP Tools: Database access, visualization generation
   - Usage: Creates final user-facing reports

4. SKILL TRACKER
   - Purpose: Analyze code quality evolution over time
   - Needs: Pattern recognition, trend analysis
   - MCP Tools: Analytics, database, long-term memory
   - Usage: Tracks individual and team skill progression

For each agent, recommend:
{
  "agentType": "educational",
  "recommendedModel": {
    "provider": "openrouter",
    "model": "anthropic/claude-3.5-sonnet",
    "reasoning": "Best pedagogical capabilities, consistent explanations"
  },
  "configuration": {
    "temperature": 0.7,
    "maxTokens": 4000,
    "specialSettings": "Enable thinking for educational reasoning"
  },
  "mcpEnhancements": [
    "Web search for finding relevant examples",
    "Code execution for interactive demos",
    "Image generation for diagrams"
  ],
  "updateFrequency": "quarterly",
  "estimatedCost": 0.003
}

IMPORTANT: These models should be VERY STABLE. Prioritize:
- Proven reliability over newest features
- Consistent behavior over marginal improvements
- Models with strong reasoning and instruction-following`;
  }

  /**
   * Generate configuration research prompt for specific parameters
   */
  static generateConfigurationResearchPrompt(params: AnalysisParameters): string {
    // Use appropriate prompt based on analysis type
    if (params.analysisType === 'pr_review') {
      return this.generateInitialPRAnalysisPrompt([params]);
    } else {
      return this.generateInitialRepoAnalysisPrompt([params]);
    }
  }

}

export class ResearchAgent {
  private researchModels: ResearchModel[] = [
    {
      provider: 'openrouter',
      model: 'deepseek/deepseek-chat',
      costPer1kTokens: 0.00014,
      supportsThinking: false,
      maxTokens: 4000
    },
    {
      provider: 'openrouter',
      model: 'google/gemini-2.5-flash',
      costPer1kTokens: 0.00015,
      supportsThinking: false,
      maxTokens: 8000
    },
    {
      provider: 'openrouter',
      model: 'anthropic/claude-3.5-haiku',
      costPer1kTokens: 0.0005,
      supportsThinking: false,
      maxTokens: 4000
    }
  ];

  constructor(
    private logger: Logger,
    private apiKey: string
  ) {}

  /**
   * Research optimal configuration for given parameters
   */
  async researchOptimalConfiguration(params: AnalysisParameters): Promise<GeneratedConfiguration> {
    try {
      this.logger.info('Researching optimal configuration', { params });

      const prompt = ResearchPrompts.generateConfigurationResearchPrompt(params);
      const response = await this.executeResearch(prompt);
      
      const result = JSON.parse(response);
      
      const configuration: GeneratedConfiguration = {
        configId: this.generateConfigId(params),
        parameters: params,
        modelConfig: result.selectedModel,
        expectedMetrics: result.expectedMetrics,
        fallbackConfigs: result.fallbackModels,
        generatedAt: new Date(),
        lastValidated: new Date(),
        usageCount: 0
      };

      this.logger.info('Configuration research completed', {
        configId: configuration.configId,
        selectedModel: result.selectedModel.model,
        confidence: result.confidence,
        reasoning: result.reasoning.substring(0, 100) + '...'
      });

      return configuration;
    } catch (error) {
      this.logger.error('Error researching configuration', { params, error });
      throw new Error(`Research failed: ${error}`);
    }
  }

  /**
   * Perform weekly market research
   */
  async performMarketResearch(): Promise<MarketUpdate[]> {
    try {
      this.logger.info('Performing weekly market research');

      const prompt = ResearchPrompts.generateMarketResearchPrompt();
      const response = await this.executeResearch(prompt);
      
      const updates: MarketUpdate[] = JSON.parse(response);
      
      // Add research date to all updates
      updates.forEach(update => {
        update.researchDate = new Date();
      });

      this.logger.info('Market research completed', {
        updateCount: updates.length,
        newModels: updates.filter(u => u.action === 'add_model').length,
        pricingUpdates: updates.filter(u => u.action === 'update_pricing').length
      });

      return updates;
    } catch (error) {
      this.logger.error('Error performing market research', { error });
      throw new Error(`Market research failed: ${error}`);
    }
  }

  /**
   * Research specific model capabilities
   */
  async researchModelCapabilities(modelPath: string, language: string): Promise<any> {
    try {
      this.logger.info('Researching model capabilities', { modelPath, language });

      const prompt = ResearchPrompts.generateModelCapabilityPrompt(modelPath, language);
      const response = await this.executeResearch(prompt);
      
      const capabilities = JSON.parse(response);

      this.logger.info('Model capability research completed', {
        modelPath,
        language,
        recommendation: capabilities.recommendation
      });

      return capabilities;
    } catch (error) {
      this.logger.error('Error researching model capabilities', { modelPath, language, error });
      throw new Error(`Capability research failed: ${error}`);
    }
  }

  /**
   * Execute research using optimal research model
   */
  private async executeResearch(prompt: string): Promise<string> {
    // Select best research model based on cost and availability
    const researchModel = this.selectOptimalResearchModel(prompt.length);
    
    this.logger.debug('Executing research', {
      model: researchModel.model,
      estimatedCost: this.estimateResearchCost(prompt, researchModel)
    });

    // In a real implementation, this would call the AI model API
    // For now, we'll return a mock response to demonstrate the structure
    return this.mockResearchResponse(prompt);
  }

  /**
   * Select optimal research model based on prompt complexity
   */
  private selectOptimalResearchModel(promptLength: number): ResearchModel {
    // For longer prompts, use models with higher token limits
    if (promptLength > 3000) {
      return this.researchModels.find(m => m.maxTokens >= 8000) || this.researchModels[0];
    }
    
    // For cost-sensitive research, prefer cheapest model
    return this.researchModels.reduce((cheapest, current) => 
      current.costPer1kTokens < cheapest.costPer1kTokens ? current : cheapest
    );
  }

  /**
   * Estimate cost for research query
   */
  private estimateResearchCost(prompt: string, model: ResearchModel): number {
    const inputTokens = Math.ceil(prompt.length / 4); // Rough token estimate
    const outputTokens = 1000; // Estimated response size
    const totalTokens = inputTokens + outputTokens;
    
    return (totalTokens / 1000) * model.costPer1kTokens;
  }

  /**
   * Generate configuration ID
   */
  private generateConfigId(params: AnalysisParameters): string {
    return [
      params.speed,
      params.complexity,
      params.language.toLowerCase(),
      params.repoSize,
      params.costSensitivity,
      params.qualityRequirement,
      params.analysisType
    ].join('-');
  }

  /**
   * Mock research response (to be replaced with real API calls)
   */
  private mockResearchResponse(prompt: string): string {
    // This is a simplified mock - in production, this would call the actual AI model
    if (prompt.includes('market research')) {
      return JSON.stringify([
        {
          action: 'update_pricing',
          modelPath: 'openrouter/google/gemini-2.5-flash',
          changes: {
            pricing: 0.00012
          },
          reasoning: 'Gemini 2.5 Flash pricing reduced by 20% as of May 2025',
          confidence: 90
        }
      ]);
    }
    
    // Mock configuration research response
    return JSON.stringify({
      selectedModel: {
        provider: 'openrouter',
        model: 'google/gemini-2.5-flash',
        modelPath: 'openrouter/google/gemini-2.5-flash',
        temperature: 0.3,
        topP: 0.9,
        maxTokens: 3000,
        streamResponse: true,
        includeThinking: false,
        useCache: true
      },
      reasoning: 'Selected Gemini 2.5 Flash for optimal speed/cost balance with current 2025 pricing and performance improvements over 2.0 version',
      expectedMetrics: {
        avgResponseTimeMs: 800,
        costPer1kTokens: 0.00012,
        qualityScore: 8.5,
        successRate: 95.0
      },
      fallbackModels: [
        'openrouter/anthropic/claude-3.5-haiku',
        'openrouter/deepseek/deepseek-coder'
      ],
      confidence: 85,
      marketContext: 'Latest 2025 models show significant improvements in code analysis capabilities'
    });
  }
}