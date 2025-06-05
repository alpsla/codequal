/**
 * Loop Prompt Generator - For multi-agent loop scenarios
 * 
 * This generator creates specialized prompts for the loop-based multi-agent
 * research scenarios where we iterate through different agent roles, languages,
 * and repository sizes to populate the Vector DB comprehensively.
 * 
 * Features:
 * - Batch generation for multiple contexts
 * - CSV-optimized output for parsing
 * - Context matrix generation
 * - Token usage optimization
 */

import type { Logger } from '@codequal/core/utils';
import { ResearcherPromptGenerator, ResearchContext, PromptGeneratorConfig } from './researcher-prompt-generator';

export interface LoopContext {
  agentRoles: Array<'security' | 'performance' | 'architecture' | 'codeQuality' | 'dependency'>;
  languages: string[];
  frameworks: Record<string, string[]>; // language -> frameworks mapping
  repoSizes: Array<'small' | 'medium' | 'large'>;
  complexityRange: [number, number]; // [min, max]
  priceTiers: Array<'budget' | 'standard' | 'premium' | 'enterprise'>; // NEW: Price factor
}

export interface LoopBatch {
  batchId: string;
  contexts: ResearchContext[];
  prompts: Array<{
    context: ResearchContext;
    prompt: string;
    tokenEstimate: number;
  }>;
  totalTokenEstimate: number;
  estimatedCost: number;
}

/**
 * Default loop contexts for comprehensive coverage
 */
const DEFAULT_LOOP_CONTEXT: LoopContext = {
  agentRoles: ['security', 'performance', 'architecture', 'codeQuality', 'dependency'],
  languages: ['typescript', 'python', 'java', 'javascript', 'go', 'rust'],
  frameworks: {
    typescript: ['react', 'nextjs', 'angular', 'vue'],
    python: ['django', 'fastapi', 'flask', 'pytest'],
    java: ['spring', 'springboot', 'hibernate', 'junit'],
    javascript: ['nodejs', 'express', 'jest', 'webpack'],
    go: ['gin', 'echo', 'gorm', 'testify'],
    rust: ['actix', 'tokio', 'serde', 'cargo']
  },
  repoSizes: ['small', 'medium', 'large'],
  complexityRange: [1, 5],
  priceTiers: ['budget', 'standard', 'premium', 'enterprise'] // NEW: Price tiers
};

/**
 * LoopPromptGenerator - Specialized for multi-agent loop scenarios
 */
export class LoopPromptGenerator {
  private logger: Logger;
  private baseGenerator: ResearcherPromptGenerator;
  private loopContext: LoopContext;

  constructor(logger: Logger, config: Partial<PromptGeneratorConfig> = {}) {
    this.logger = logger;
    
    // Configure for CSV output and efficiency
    const loopConfig = {
      outputFormat: 'csv' as const,
      maxOutputTokens: 500,
      enableCaching: true,
      includeEmergingProviders: true,
      ...config
    };
    
    this.baseGenerator = new ResearcherPromptGenerator(logger, loopConfig);
    this.loopContext = DEFAULT_LOOP_CONTEXT;
  }

  /**
   * Generate comprehensive context matrix for loop processing
   */
  generateContextMatrix(limit?: number): ResearchContext[] {
    const contexts: ResearchContext[] = [];
    const sessionId = `loop_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    let count = 0;

    for (const agentRole of this.loopContext.agentRoles) {
      for (const language of this.loopContext.languages) {
        const frameworks = this.loopContext.frameworks[language] || [];
        
        for (const repoSize of this.loopContext.repoSizes) {
          for (const priceTier of this.loopContext.priceTiers) {
            // Generate multiple combinations with different framework sets
            const frameworkCombinations = this.generateFrameworkCombinations(frameworks, repoSize);
            
            for (const frameworkSet of frameworkCombinations) {
              if (limit && count >= limit) {
                return contexts;
              }
              // Generate complexity based on repo size and role
              const complexity = this.calculateComplexity(agentRole, repoSize);
              
              contexts.push({
                agentRole,
                language,
                frameworks: frameworkSet,
                repoSize,
                complexity,
                priceTier,
                sessionId: `${sessionId}_${agentRole}_${language}_${repoSize}_${priceTier}_${frameworkSet.join('')}`
              });
              count++;
            }
          }
        }
      }
    }

    this.logger.info('Generated enhanced context matrix for loop processing', {
      totalContexts: contexts.length,
      agentRoles: this.loopContext.agentRoles.length,
      languages: this.loopContext.languages.length,
      repoSizes: this.loopContext.repoSizes.length,
      averageFrameworkCombinations: Math.round(contexts.length / (this.loopContext.agentRoles.length * this.loopContext.languages.length * this.loopContext.repoSizes.length))
    });

    return contexts;
  }

  /**
   * Generate multiple framework combinations for better coverage
   */
  private generateFrameworkCombinations(frameworks: string[], repoSize: 'small' | 'medium' | 'large'): string[][] {
    if (frameworks.length === 0) return [[]];
    
    const combinations: string[][] = [];
    
    switch (repoSize) {
      case 'small':
        // Small repos: test individual frameworks + one combination
        frameworks.forEach(fw => combinations.push([fw]));
        if (frameworks.length >= 2) {
          combinations.push(frameworks.slice(0, 2));
        }
        break;
        
      case 'medium':
        // Medium repos: test framework pairs + one triple
        frameworks.forEach(fw => combinations.push([fw]));
        for (let i = 0; i < frameworks.length - 1; i++) {
          combinations.push([frameworks[i], frameworks[i + 1]]);
        }
        if (frameworks.length >= 3) {
          combinations.push(frameworks.slice(0, 3));
        }
        break;
        
      case 'large':
        // Large repos: test all combinations up to max
        frameworks.forEach(fw => combinations.push([fw]));
        for (let i = 0; i < frameworks.length - 1; i++) {
          for (let j = i + 1; j < frameworks.length; j++) {
            combinations.push([frameworks[i], frameworks[j]]);
          }
        }
        if (frameworks.length >= 3) {
          combinations.push(frameworks.slice(0, 3));
          combinations.push(frameworks); // All frameworks
        }
        break;
    }
    
    // Remove duplicates
    return combinations.filter((combo, index, self) => 
      index === self.findIndex(c => JSON.stringify(c.sort()) === JSON.stringify(combo.sort()))
    );
  }

  /**
   * Generate prompts in optimized batches
   */
  generateBatches(contexts: ResearchContext[], batchSize = 10): LoopBatch[] {
    const batches: LoopBatch[] = [];
    
    for (let i = 0; i < contexts.length; i += batchSize) {
      const batchContexts = contexts.slice(i, i + batchSize);
      const batchId = `batch_${Math.floor(i / batchSize) + 1}_of_${Math.ceil(contexts.length / batchSize)}`;
      
      const prompts = batchContexts.map(context => {
        const generatedPrompt = this.baseGenerator.generateContextualPrompt(context);
        return {
          context,
          prompt: generatedPrompt.content,
          tokenEstimate: generatedPrompt.metadata.tokenEstimate
        };
      });
      
      const totalTokenEstimate = prompts.reduce((sum, p) => sum + p.tokenEstimate, 0);
      const estimatedCost = this.calculateEstimatedCost(totalTokenEstimate);
      
      batches.push({
        batchId,
        contexts: batchContexts,
        prompts,
        totalTokenEstimate,
        estimatedCost
      });
    }

    this.logger.info('Generated loop batches', {
      totalBatches: batches.length,
      totalContexts: contexts.length,
      batchSize,
      estimatedTotalTokens: batches.reduce((sum, b) => sum + b.totalTokenEstimate, 0)
    });

    return batches;
  }

  /**
   * Generate optimized prompt for specific context (token-efficient)
   */
  generateOptimizedPrompt(context: ResearchContext, variant: 'minimal' | 'structured' = 'minimal'): string {
    if (variant === 'minimal') {
      return this.generateMinimalPrompt(context);
    } else {
      return this.generateStructuredPrompt(context);
    }
  }

  /**
   * Generate minimal prompt variant (lowest token usage)
   */
  private generateMinimalPrompt(context: ResearchContext): string {
    return `Find 2 AI models for ${context.agentRole} analysis of ${context.language} code (${context.repoSize} repos, complexity ${context.complexity}/5).

Output CSV only:
provider,model,input_cost,output_cost,tier,max_tokens

Requirements:
- Row 1: Best model for ${context.agentRole}
- Row 2: Cost-effective alternative
- Latest versions only
- No headers/explanations`;
  }

  /**
   * Generate structured prompt variant (balanced efficiency)
   */
  private generateStructuredPrompt(context: ResearchContext): string {
    const frameworks = context.frameworks.length > 0 ? ` with ${context.frameworks.join('/')}` : '';
    
    return `Research AI models for ${context.agentRole} analysis.

Target: ${context.language}${frameworks} repositories
Size: ${context.repoSize} (complexity ${context.complexity}/5)
${context.priceTier ? `Budget: ${context.priceTier} tier` : ''}

Find:
1. PRIMARY: Best performance for ${context.agentRole}
2. FALLBACK: Cost-effective alternative

Output format:
provider,model,input_cost,output_cost,tier,max_tokens

Requirements:
- Latest model versions
- No headers or explanations
- Exact CSV format only`;
  }

  /**
   * Generate CSV-optimized prompt for specific context (legacy)
   */
  generateCSVPrompt(context: ResearchContext): string {
    return this.generateOptimizedPrompt(context, 'structured');
  }

  /**
   * Generate system template (cached) for loop processing
   */
  generateLoopSystemTemplate(): string {
    const systemPrompt = this.baseGenerator.generateSystemTemplate();
    
    // Add loop-specific instructions
    const loopInstructions = `

**LOOP PROCESSING CONTEXT:**
This template will be referenced for multiple rapid research requests across:
- Agent roles: ${this.loopContext.agentRoles.join(', ')}
- Languages: ${this.loopContext.languages.join(', ')}
- Repository sizes: ${this.loopContext.repoSizes.join(', ')}

Each request will specify a unique combination for comprehensive coverage.
Focus on efficiency and consistency across all requests.`;

    return systemPrompt.content + loopInstructions;
  }

  /**
   * Select appropriate frameworks for context
   */
  private selectFrameworksForContext(frameworks: string[], repoSize: 'small' | 'medium' | 'large'): string[] {
    if (frameworks.length === 0) return [];
    
    // Select frameworks based on repo size
    switch (repoSize) {
      case 'small':
        return frameworks.slice(0, 1); // Single framework
      case 'medium':
        return frameworks.slice(0, 2); // Two frameworks
      case 'large':
        return frameworks.slice(0, 3); // Up to three frameworks
      default:
        return frameworks.slice(0, 1);
    }
  }

  /**
   * Calculate appropriate complexity for context
   */
  private calculateComplexity(
    agentRole: ResearchContext['agentRole'], 
    repoSize: 'small' | 'medium' | 'large'
  ): number {
    const [minComplexity, maxComplexity] = this.loopContext.complexityRange;
    
    // Base complexity on repo size
    const sizeComplexity = {
      small: minComplexity,
      medium: Math.ceil((minComplexity + maxComplexity) / 2),
      large: maxComplexity
    }[repoSize];
    
    // Adjust for agent role
    const roleAdjustment = {
      security: 1, // Security can be complex in any size
      performance: 0, // Performance scales with size
      architecture: 1, // Architecture complexity grows with size
      codeQuality: 0, // Code quality is consistent
      dependency: 0 // Dependency complexity varies
    }[agentRole];
    
    return Math.min(maxComplexity, sizeComplexity + roleAdjustment);
  }

  /**
   * Calculate estimated cost for token usage
   */
  private calculateEstimatedCost(tokens: number): number {
    // Rough estimate: $0.50 per 1M tokens for research models
    return (tokens / 1000000) * 0.50;
  }

  /**
   * Update loop context for different scenarios
   */
  updateLoopContext(newContext: Partial<LoopContext>): void {
    this.loopContext = { ...this.loopContext, ...newContext };
    this.logger.info('Loop context updated', { newContext });
  }

  /**
   * Get current loop context
   */
  getLoopContext(): LoopContext {
    return { ...this.loopContext };
  }

  /**
   * Generate summary of loop processing plan
   */
  generateProcessingSummary(): {
    totalCombinations: number;
    estimatedTokens: number;
    estimatedCost: number;
    processingTime: string;
    coverage: Record<string, number>;
  } {
    const contexts = this.generateContextMatrix();
    const estimatedTokensPerContext = 300; // Average tokens per context
    const totalTokens = contexts.length * estimatedTokensPerContext;
    const estimatedCost = this.calculateEstimatedCost(totalTokens);
    
    return {
      totalCombinations: contexts.length,
      estimatedTokens: totalTokens,
      estimatedCost,
      processingTime: `${Math.ceil(contexts.length * 2 / 60)} minutes`, // 2 seconds per request
      coverage: {
        agentRoles: this.loopContext.agentRoles.length,
        languages: this.loopContext.languages.length,
        repoSizes: this.loopContext.repoSizes.length,
        priceTiers: this.loopContext.priceTiers.length,
        frameworks: Object.values(this.loopContext.frameworks).flat().length
      }
    };
  }
}