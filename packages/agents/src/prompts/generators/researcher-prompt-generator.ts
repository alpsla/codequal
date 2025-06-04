/**
 * Researcher Prompt Generator - Modular architecture for generating research prompts
 * 
 * This module provides a flexible, updateable system for generating researcher prompts
 * that can be easily modified during calibration and future improvements.
 * 
 * Features:
 * - Cached system template management
 * - Context-specific prompt generation
 * - Multiple output formats (JSON, CSV)
 * - Role-specific evaluation criteria
 * - Dynamic provider discovery
 */

import type { Logger } from '@codequal/core/utils';

export interface ResearchContext {
  agentRole: 'security' | 'performance' | 'architecture' | 'codeQuality' | 'dependency';
  language: string;
  frameworks: string[];
  repoSize: 'small' | 'medium' | 'large';
  complexity: number;
  priceTier?: 'budget' | 'standard' | 'premium' | 'enterprise'; // NEW: Price constraint
  sessionId?: string;
}

export interface PromptGeneratorConfig {
  includeEmergingProviders: boolean;
  maxOutputTokens: number;
  outputFormat: 'json' | 'csv';
  enableCaching: boolean;
  customProviders?: string[];
}

export interface GeneratedPrompt {
  type: 'system' | 'contextual';
  templateId?: string;
  content: string;
  metadata: {
    tokenEstimate: number;
    cacheReference?: string;
    outputFormat: string;
    context?: ResearchContext;
  };
}

/**
 * Role-specific evaluation criteria with weights
 */
const ROLE_EVALUATION_CRITERIA = {
  security: {
    'Threat Detection Accuracy': 30,
    'False Positive Rate': 20,
    'Reasoning Quality': 25,
    'Coverage Breadth': 15,
    'Cost for Security Tasks': 10
  },
  performance: {
    'Optimization Insight Quality': 35,
    'Technical Accuracy': 25,
    'Breadth of Analysis': 20,
    'Code Understanding': 15,
    'Cost Efficiency': 5
  },
  architecture: {
    'System Understanding': 40,
    'Pattern Recognition': 25,
    'Strategic Thinking': 20,
    'Documentation Quality': 10,
    'Cost Efficiency': 5
  },
  codeQuality: {
    'Code Understanding': 35,
    'Best Practices Knowledge': 25,
    'Refactoring Suggestions': 20,
    'Pattern Recognition': 15,
    'Cost Efficiency': 5
  },
  dependency: {
    'Vulnerability Detection': 35,
    'Update Recommendation Quality': 25,
    'Compatibility Analysis': 20,
    'Risk Assessment': 15,
    'Cost Efficiency': 5
  }
};

/**
 * Role-specific requirements templates
 */
const ROLE_REQUIREMENTS = {
  security: [
    'Identify security vulnerabilities and threats',
    'Analyze authentication and authorization flaws',
    'Detect injection attacks, XSS, CSRF patterns',
    'Assess cryptographic implementations',
    'Review access controls and privilege escalation risks',
    'Evaluate third-party dependencies for known CVEs'
  ],
  performance: [
    'Identify performance bottlenecks and inefficiencies',
    'Suggest database query optimizations',
    'Analyze algorithm complexity and suggest improvements',
    'Review memory usage and garbage collection issues',
    'Evaluate caching strategies and implementation',
    'Assess scalability and concurrent programming patterns'
  ],
  architecture: [
    'Analyze system design patterns and architectural decisions',
    'Evaluate modularity, coupling, and cohesion',
    'Assess scalability and maintainability',
    'Review microservices patterns and API design',
    'Evaluate architectural compliance and governance',
    'Assess technical debt and refactoring opportunities'
  ],
  codeQuality: [
    'Analyze code structure and maintainability',
    'Evaluate adherence to coding standards',
    'Identify code smells and anti-patterns',
    'Assess test coverage and quality',
    'Review documentation completeness',
    'Suggest refactoring opportunities'
  ],
  dependency: [
    'Analyze dependency vulnerabilities and security issues',
    'Evaluate version compatibility and update paths',
    'Assess licensing compliance and restrictions',
    'Review dependency freshness and maintenance status',
    'Identify redundant or conflicting dependencies',
    'Suggest optimization and consolidation opportunities'
  ]
};

/**
 * ResearcherPromptGenerator - Modular prompt generation system
 */
export class ResearcherPromptGenerator {
  private logger: Logger;
  private config: PromptGeneratorConfig;
  private cachedTemplates: Map<string, string> = new Map();

  constructor(logger: Logger, config: Partial<PromptGeneratorConfig> = {}) {
    this.logger = logger;
    this.config = {
      includeEmergingProviders: true,
      maxOutputTokens: 500,
      outputFormat: 'csv',
      enableCaching: true,
      ...config
    };
  }

  /**
   * Generate cached system template for token efficiency
   */
  generateSystemTemplate(): GeneratedPrompt {
    const templateId = 'RESEARCH_TEMPLATE_V1';
    const currentYear = new Date().getFullYear();
    
    const emergingProviders = this.config.includeEmergingProviders ? 
      '- **Others**: xAI/Grok, Inflection/Pi, Aleph Alpha, AI21, Stability AI, and ANY NEW providers' : '';

    const content = `You are a cutting-edge AI model researcher. I will provide you with a base research template once, then send context-specific parameters that reference this template.

**BASE RESEARCH TEMPLATE [ID: ${templateId}]:**

Find the SINGLE BEST AI model across ALL providers for {AGENT_ROLE} analysis.

**DISCOVERY MISSION:**
- Major providers (OpenAI, Anthropic, Google, Meta, etc.)
- Emerging providers and startups (xAI/Grok, Inflection/Pi, Character.AI, etc.)
- Open-source releases
- Models released last 3-6 months
- **IMPORTANT**: Also search for ANY other AI providers not listed

**RESEARCH METHODOLOGY:**
1. **Web Search**: "latest AI models ${currentYear}", "newest LLM releases ${currentYear}", "new AI companies ${currentYear}"
2. **Provider APIs**: Check current documentation
3. **GitHub**: New open-source models
4. **Tech News**: Recent launches and announcements
5. **Startup News**: New AI companies and their models

**MARKET RESEARCH:**
Search ALL providers for LATEST models:
- OpenAI: Discover ALL current models (no assumptions)
- Anthropic: Discover ALL current models (no assumptions)
- Google: Discover ALL current models (no assumptions)
- DeepSeek: Discover ALL current models (no assumptions)
- Meta/Mistral/Cohere: Discover ALL current models
${emergingProviders}

**DISCOVERY CRITERIA:**
- Latest versions only
- Demonstrated {LANGUAGE}/{FRAMEWORK} capabilities
- {SIZE} repository performance
- {COMPLEXITY} complexity handling

**OUTPUT FORMAT OPTIONS:**

Option 1 - JSON (when detailed analysis needed):
{
  "repositoryContext": {CONTEXT_JSON},
  "recommendation": {
    "primary": { "provider": "...", "model": "...", "contextSpecificScore": 9.8 },
    "fallback": { "provider": "...", "model": "...", "contextSpecificScore": 8.5 }
  }
}

Option 2 - CSV (when concise output needed):
Return EXACTLY 2 rows in CSV format:
provider,model,cost_input,cost_output,tier,context_tokens
xai,grok-3,5.0,15.0,PREMIUM,100000
anthropic,claude-3.5-sonnet,3.0,15.0,PREMIUM,200000

**OUTPUT LIMITS:**
- CSV format: Maximum ${this.config.maxOutputTokens} characters total
- JSON format: Maximum ${this.config.maxOutputTokens * 2} characters total
- Focus on essential information only

**CRITICAL:** 
- Find THE SINGLE BEST across ALL providers for {SPECIFIC_CONTEXT}, NOT generic models
- Include providers beyond the common ones (search for Grok, Pi, etc.)
- When using CSV format, return EXACTLY 2 rows: primary and fallback

---

Please confirm you have cached this template as [${templateId}]. I will now send context-specific research requests that reference this template.`;

    this.cachedTemplates.set(templateId, content);

    return {
      type: 'system',
      templateId,
      content,
      metadata: {
        tokenEstimate: Math.ceil(content.length / 4), // Rough token estimate
        cacheReference: templateId,
        outputFormat: 'system'
      }
    };
  }

  /**
   * Generate context-specific research prompt
   */
  generateContextualPrompt(context: ResearchContext): GeneratedPrompt {
    const templateId = 'RESEARCH_TEMPLATE_V1';
    const sessionId = context.sessionId || `session_${Date.now()}`;
    const currentYear = new Date().getFullYear();

    // Generate role-specific evaluation criteria
    const evaluationCriteria = this.generateEvaluationCriteria(context.agentRole);
    
    // Generate role-specific requirements
    const requirements = this.generateRoleRequirements(context.agentRole, context.language, context.frameworks);

    const content = `**RESEARCH REQUEST [Session: ${sessionId}]**
Reference Template: [${templateId}]

**CONTEXT PARAMETERS:**
- Language: ${context.language}
- Frameworks: ${context.frameworks.join(', ')}
- Repository Size: ${context.repoSize}
- Complexity: ${context.complexity}x
- Agent Role: ${context.agentRole.toUpperCase()}
- Price Tier: ${context.priceTier ? context.priceTier.toUpperCase() : 'ANY'}
- Year: ${currentYear}
- Output Format: ${this.config.outputFormat.toUpperCase()}

**ROLE-SPECIFIC REQUIREMENTS:**
${requirements}

**EVALUATION CRITERIA:**
${evaluationCriteria}

**SPECIFIC OBJECTIVE:**
Find optimal model for ${context.language}/${context.frameworks.join('/')} ${context.agentRole} analysis in ${context.repoSize} repositories with ${context.complexity}x complexity.

**PRICE CONSTRAINTS:**
${this.generatePriceConstraints(context.priceTier)}

**OUTPUT INSTRUCTIONS:**
${this.config.outputFormat === 'csv' ? 
`Use CSV format from template. Return EXACTLY 2 rows: primary and fallback. Maximum ${this.config.maxOutputTokens} chars.` : 
`Use JSON format from template. Include reasoning. Maximum ${this.config.maxOutputTokens * 2} chars.`}

Apply the cached [${templateId}] with these parameters.`;

    return {
      type: 'contextual',
      content,
      metadata: {
        tokenEstimate: Math.ceil(content.length / 4),
        cacheReference: templateId,
        outputFormat: this.config.outputFormat,
        context
      }
    };
  }

  /**
   * Generate evaluation criteria for specific role
   */
  private generateEvaluationCriteria(agentRole: ResearchContext['agentRole']): string {
    const criteria = ROLE_EVALUATION_CRITERIA[agentRole as keyof typeof ROLE_EVALUATION_CRITERIA];
    if (!criteria) {
      return '- **General Analysis Quality** (50%): Overall capability\n- **Cost Efficiency** (50%): Value proposition';
    }

    return Object.entries(criteria)
      .map(([criterion, weight]) => `- **${criterion}** (${weight}%): ${this.getCriterionDescription(criterion)}`)
      .join('\n');
  }

  /**
   * Generate role-specific requirements
   */
  private generateRoleRequirements(
    agentRole: ResearchContext['agentRole'], 
    language: string, 
    frameworks: string[]
  ): string {
    const requirements = ROLE_REQUIREMENTS[agentRole as keyof typeof ROLE_REQUIREMENTS] || [
      'Perform general analysis of the codebase',
      'Identify general issues and improvements',
      'Provide overall quality assessment'
    ];
    const frameworkContext = frameworks.length > 0 ? `/${frameworks.join('/')}` : '';
    
    return requirements
      .map(req => `• ${req.replace('{language}', language).replace('{frameworks}', frameworkContext)}`)
      .join('\n');
  }

  /**
   * Get description for evaluation criterion
   */
  private getCriterionDescription(criterion: string): string {
    const descriptions: Record<string, string> = {
      'Threat Detection Accuracy': 'How well it identifies real security issues',
      'False Positive Rate': 'Minimizes noise from incorrect flags',
      'Reasoning Quality': 'Explains WHY something is a security risk',
      'Coverage Breadth': 'Finds diverse types of security issues',
      'Cost for Security Tasks': 'Value for security-focused analysis',
      'Optimization Insight Quality': 'Actionable performance improvements',
      'Technical Accuracy': 'Correct analysis of performance issues',
      'Breadth of Analysis': 'Covers CPU, memory, I/O, network issues',
      'Code Understanding': 'Grasps complex performance patterns',
      'Cost Efficiency': 'Good value for analysis tasks',
      'System Understanding': 'Grasps complex architectural patterns',
      'Pattern Recognition': 'Identifies design patterns and anti-patterns',
      'Strategic Thinking': 'Long-term architectural implications',
      'Documentation Quality': 'Clear architectural explanations',
      'Best Practices Knowledge': 'Understands coding standards',
      'Refactoring Suggestions': 'Provides actionable improvements',
      'Vulnerability Detection': 'Identifies security issues in dependencies',
      'Update Recommendation Quality': 'Suggests appropriate version updates',
      'Compatibility Analysis': 'Assesses breaking changes',
      'Risk Assessment': 'Evaluates impact of dependency issues'
    };
    
    return descriptions[criterion] || 'Quality assessment for this criterion';
  }

  /**
   * Update configuration for calibration
   */
  updateConfig(newConfig: Partial<PromptGeneratorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('Prompt generator configuration updated', { newConfig });
  }

  /**
   * Get current configuration
   */
  getConfig(): PromptGeneratorConfig {
    return { ...this.config };
  }

  /**
   * Generate price constraints based on tier
   */
  private generatePriceConstraints(priceTier?: string): string {
    if (!priceTier) return 'Consider all price ranges, but prioritize value and quality.';
    
    const constraints = {
      budget: `- BUDGET TIER: Focus on cost-effective models under $2.00 per 1M input tokens
- Target models with good quality/price ratio
- Consider open-source and cheaper commercial options
- Maximum cost: $5.00 per 1M output tokens`,
      
      standard: `- STANDARD TIER: Balanced cost/performance models $2.00-$10.00 per 1M input tokens
- Focus on mainstream commercial models
- Good balance of quality and affordability
- Maximum cost: $20.00 per 1M output tokens`,
      
      premium: `- PREMIUM TIER: High-quality models $10.00-$30.00 per 1M input tokens
- Focus on latest flagship models from major providers
- Prioritize quality and capability over cost
- Maximum cost: $50.00 per 1M output tokens`,
      
      enterprise: `- ENTERPRISE TIER: Best-in-class models, cost secondary consideration
- Include most advanced models regardless of price
- Focus on maximum capability and reliability
- Consider specialized enterprise features and SLAs`
    };
    
    return constraints[priceTier as keyof typeof constraints] || constraints.standard;
  }

  /**
   * Clear cached templates (useful for testing new versions)
   */
  clearCache(): void {
    this.cachedTemplates.clear();
    this.logger.info('Prompt generator cache cleared');
  }
}