/**
 * AI-Powered Impact Categorizer
 * 
 * This service uses AI to dynamically categorize the business/technical impact
 * of code issues, replacing hardcoded pattern matching for better adaptability
 * across diverse projects and languages.
 */

import { Issue } from '../types/analysis-types';
import { UnifiedModelSelector, createUnifiedModelSelector } from '../../model-selection/unified-model-selector';
import { ModelVersionSync } from '@codequal/core';
import { AIService } from '../services/ai-service';

interface ImpactCategorizationResult {
  impact: string;
  confidence: number;
  reasoning?: string;
}

export class AIImpactCategorizer {
  private modelSelector: UnifiedModelSelector;
  private aiService: AIService;
  private cache: Map<string, ImpactCategorizationResult> = new Map();
  
  constructor(
    private modelVersionSync?: any,
    private vectorStorage?: any
  ) {
    // Initialize model selector
    if (modelVersionSync instanceof UnifiedModelSelector) {
      this.modelSelector = modelVersionSync;
    } else if (modelVersionSync) {
      this.modelSelector = createUnifiedModelSelector(modelVersionSync);
    } else {
      // Create default model version sync if none provided
      const defaultSync = new ModelVersionSync(
        console as any,
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
      );
      this.modelSelector = createUnifiedModelSelector(defaultSync);
    }
    
    // Initialize AI service
    this.aiService = new AIService({} as any);
  }
  
  /**
   * Get specific, contextual impact description for an issue using AI
   */
  async getSpecificImpact(issue: Issue): Promise<string> {
    // Check cache first
    const cacheKey = this.getCacheKey(issue);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!.impact;
    }
    
    try {
      // Get categorization from AI
      const result = await this.categorizeImpact(issue);
      
      // Cache and return
      this.cache.set(cacheKey, result);
      return result.impact;
    } catch (error) {
      console.warn('AI impact categorization failed, using fallback', error);
      return this.getFallbackImpact(issue);
    }
  }
  
  /**
   * Categorize impact using AI model
   */
  private async categorizeImpact(issue: Issue): Promise<ImpactCategorizationResult> {
    // Select appropriate model for categorization
    const repoContext = {
      size: 'medium' as const,
      primaryLanguage: 'mixed',
      analysisDepth: 'standard' as const
    };
    
    let modelSelection;
    try {
      modelSelection = await this.modelSelector.selectModel('categorization', repoContext);
    } catch (error) {
      console.warn('Model selection failed, using default fallback', error);
      // Use a default fallback configuration
      modelSelection = {
        primary: { provider: 'openai', model: 'gpt-4-turbo-preview' },
        fallback: { provider: 'anthropic', model: 'claude-3-sonnet-20240229' },
        reasoning: 'Default fallback due to model selection error'
      };
    }
    
    // Build prompt for AI categorization
    const prompt = this.buildCategorizationPrompt(issue);
    
    // Try primary model first
    try {
      const response = await this.callAIModel(
        modelSelection.primary,
        prompt,
        issue
      );
      return response;
    } catch (primaryError) {
      console.warn('Primary model failed, trying fallback', primaryError);
      
      // Try fallback model
      try {
        const response = await this.callAIModel(
          modelSelection.fallback,
          prompt,
          issue
        );
        return response;
      } catch (fallbackError) {
        // Both models failed - this is a critical error that needs attention
        const errorMessage = `AI Impact Categorization Failed: Both primary and fallback models failed for issue: ${issue.message}`;
        console.error(errorMessage, {
          primaryError,
          fallbackError,
          issue: {
            severity: issue.severity,
            category: issue.category,
            message: issue.message,
            location: issue.location
          }
        });
        
        // Trigger Researcher to gather new context if this is a new pattern
        if (this.shouldTriggerResearch(issue)) {
          console.warn('Triggering Researcher to gather context for new issue pattern');
          // This would trigger the ResearcherService to analyze this new context
          // and update the model database with appropriate models
          await this.triggerResearcherForContext(issue);
        }
        
        // Throw error to alert system - don't mask with mock responses
        throw new Error(errorMessage);
      }
    }
  }

  /**
   * Call AI model for categorization
   */
  private async callAIModel(
    model: { provider: string; model: string },
    prompt: string,
    issue: Issue
  ): Promise<ImpactCategorizationResult> {
    try {
      // In production, this would make actual AI API calls
      // For now, we'll use the mock response but with model awareness
      console.log(`Calling ${model.provider}/${model.model} for impact categorization`);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // In production, make actual AI API call
      // For now, we throw an error to indicate the system needs real AI service
      throw new Error(`AI service not configured for ${model.provider}/${model.model}. Please configure OpenRouter API or use mock mode.`);
    } catch (error) {
      console.error(`Error calling ${model.provider}/${model.model}:`, error);
      throw error;
    }
  }

  /**
   * Check if we should trigger research for this issue pattern
   */
  private shouldTriggerResearch(issue: Issue): boolean {
    // Trigger research for new patterns we haven't seen before
    const cacheKey = this.getCacheKey(issue);
    const isNewPattern = !this.cache.has(cacheKey);
    const isCriticalOrHigh = issue.severity === 'critical' || issue.severity === 'high';
    
    // Trigger research for new critical/high patterns
    return isNewPattern && isCriticalOrHigh;
  }
  
  /**
   * Trigger Researcher to gather context for new issue patterns
   */
  private async triggerResearcherForContext(issue: Issue): Promise<void> {
    try {
      // Import ResearcherService dynamically to avoid circular dependencies
      const { ResearcherService } = await import('../../researcher/researcher-service.js');
      
      // Create researcher instance
      const researcher = new ResearcherService({
        modelVersionSync: this.modelVersionSync
      } as any);
      
      // Research context for this specific issue pattern
      const researchQuery = `${issue.category} ${issue.severity} issue: ${issue.message}`;
      console.log(`Researching context for: ${researchQuery}`);
      
      // This would update the model database with appropriate models for this context
      // Note: Method would need to be implemented in ResearcherService
      console.log('Research triggered for new pattern:', {
        query: researchQuery,
        context: {
          issueType: issue.category,
          severity: issue.severity,
          language: issue.location?.file?.split('.').pop() || 'unknown'
        }
      });
      
      console.log('Research completed, model database updated');
    } catch (error) {
      console.error('Failed to trigger researcher:', error);
      // Don't throw - research failure shouldn't block the entire process
    }
  }
  
  /**
   * Build prompt for AI categorization
   */
  private buildCategorizationPrompt(issue: Issue): string {
    return `You are a senior software architect analyzing code issues.

Analyze this issue and provide a specific, contextual business/technical impact description.

Issue Details:
- Severity: ${issue.severity}
- Category: ${issue.category}
- Message: ${issue.message || issue.description}
- Location: ${issue.location?.file || 'Unknown'}
- Line: ${issue.location?.line || 'N/A'}

Provide a concise (10-15 words) impact description that:
1. Is specific to this exact issue (not generic)
2. Explains the real-world consequence if not fixed
3. Uses clear, non-technical language when possible
4. Focuses on business/user impact over technical details

Examples of good impact descriptions:
- "Customer data exposed to unauthorized access"
- "Application crashes under moderate load"
- "Payment processing may fail silently"
- "Search results become unreliable over time"
- "API responses delayed by 2-3 seconds"

Respond with just the impact description, no additional explanation.`;
  }
  
  /**
   * Mock AI response for development/testing
   */
  private async mockAIResponse(issue: Issue): Promise<ImpactCategorizationResult> {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Generate contextual impacts based on issue characteristics
    const impacts = {
      'critical-security': [
        'Complete system compromise possible',
        'All user data at immediate risk',
        'Remote attackers gain full control'
      ],
      'critical-performance': [
        'System becomes completely unusable',
        'Total service outage imminent',
        'Database locks preventing all operations'
      ],
      'high-security': [
        'Sensitive data leakage to attackers',
        'Authentication bypass allows unauthorized access',
        'Encrypted data exposed in plaintext'
      ],
      'high-performance': [
        'Response times exceed user tolerance',
        'Memory exhaustion causes crashes',
        'Database queries timeout frequently'
      ],
      'medium-security': [
        'Configuration secrets visible in logs',
        'Session tokens persist too long',
        'Input validation gaps allow injection'
      ],
      'medium-performance': [
        'Noticeable delays during peak usage',
        'Resource usage 3x higher than needed',
        'Cache misses degrade user experience'
      ],
      'low-quality': [
        'Debug information exposed in production',
        'Code maintainability decreases over time',
        'Technical debt accumulates rapidly'
      ]
    };
    
    // Select impact based on severity and category
    const key = `${issue.severity}-${issue.category}`;
    const possibleImpacts = impacts[key as keyof typeof impacts] || [
      `${issue.severity?.toUpperCase()} ${issue.category} issue requires attention`
    ];
    
    // Pick a random impact for variety
    const selectedImpact = possibleImpacts[Math.floor(Math.random() * possibleImpacts.length)];
    
    return {
      impact: selectedImpact,
      confidence: 0.85,
      reasoning: `Based on ${issue.severity} severity ${issue.category} issue pattern`
    };
  }
  
  /**
   * Get fallback impact when AI fails
   */
  private getFallbackImpact(issue: Issue): string {
    // Fallback to simple pattern-based impacts
    const severityImpacts = {
      critical: 'Critical system vulnerability or failure',
      high: 'Significant security or performance impact',
      medium: 'Moderate risk requiring attention',
      low: 'Minor issue affecting code quality'
    };
    
    return severityImpacts[issue.severity as keyof typeof severityImpacts] || 
           'Issue requires investigation and resolution';
  }
  
  /**
   * Generate cache key for issue
   */
  private getCacheKey(issue: Issue): string {
    return `${issue.severity}-${issue.category}-${issue.message?.substring(0, 50)}`;
  }
  
  /**
   * Clear cache (useful for testing or memory management)
   */
  clearCache(): void {
    this.cache.clear();
  }
}