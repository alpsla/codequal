/**
 * Specialized agents for generating fix suggestions based on issue context
 * Each agent is responsible for a specific domain and uses AI to generate contextual fixes
 */

import OpenAI from 'openai';
import { DynamicModelSelector } from '../services/dynamic-model-selector';
import { getResilientAIClient } from '../services/resilient-ai-client';
import { ModelConfiguration } from '../../standard/orchestrator/model-config-resolver';

interface IssueContext {
  title: string;
  description: string;
  type: string;
  severity: string;
  file: string;
  line: number;
  codeSnippet?: string;
  tool?: string;
}

interface FixSuggestion {
  fix: string;
  correctedCode: string;
  explanation?: string;
  bestPractices?: string[];
}

/**
 * Base class for all specialized agents
 * BUG-119 FIX: Accepts ModelConfiguration from orchestrator instead of creating own selector
 */
abstract class BaseSpecializedAgent {
  protected openRouter: OpenAI;
  protected modelConfig: ModelConfiguration | null = null;
  protected agentRole: string;

  constructor(role: string, modelConfig?: ModelConfiguration) {
    this.agentRole = role;
    this.modelConfig = modelConfig || null; // BUG-119 FIX: Accept config from orchestrator

    const openRouterConfig: any = {
      apiKey: process.env.OPENROUTER_API_KEY || '',
    };

    if (process.env.OPENROUTER_API_KEY?.startsWith('sk-or-')) {
      openRouterConfig.baseURL = 'https://openrouter.ai/api/v1';
      openRouterConfig.defaultHeaders = {
        'HTTP-Referer': 'https://codequal.com',
        'X-Title': `CodeQual ${role} Agent`
      };
    }

    this.openRouter = new OpenAI(openRouterConfig);
  }

  /**
   * Generate fix suggestion using AI based on issue context
   * BUG-119 FIX: Uses model from ModelConfiguration (via orchestrator) instead of DynamicModelSelector
   * Uses centralized resilient AI client with complete fallback chain
   */
  async generateFixSuggestion(issue: IssueContext, modelOverride?: string): Promise<FixSuggestion> {
    // BUG-119 FIX: Use provided model override or model from config
    // Priority: modelOverride > modelConfig.primary_model > fallback default
    const modelToUse = modelOverride ||
                      this.modelConfig?.primary_model ||
                      'google/gemini-2.5-flash'; // Last resort fallback

    const systemPrompt = this.getSystemPrompt();
    const userPrompt = this.buildPrompt(issue);

    try {
      // Use centralized resilient AI client (handles all tiers automatically)
      const aiClient = getResilientAIClient();

      const response = await aiClient.chat({
        systemPrompt,
        userPrompt,
        role: this.agentRole,
        model: modelToUse, // BUG-119 FIX: Use specific model from config
        temperature: 0.3,
        maxTokens: 1500
      });

      return this.parseAIResponse(response.content, issue);

    } catch (error: any) {
      // If AI service is completely unavailable, rethrow the friendly error
      if (error.name === 'AIServiceUnavailableError') {
        throw error;
      }
      // For other unexpected errors, use default fix
      console.error(`[${this.agentRole}] Unexpected error, using fallback:`, error);
      return this.getDefaultFix(issue);
    }
  }

  protected abstract getSystemPrompt(): string;
  protected abstract buildPrompt(issue: IssueContext): string;

  protected parseAIResponse(response: string, issue: IssueContext): FixSuggestion {
    // Handle different response formats from AI
    // Look for structured markers or take the first actionable part
    
    // Try to extract just the fix description (first paragraph or sentence)
    let fix = response;
    
    // Remove common AI preambles
    fix = fix.replace(/^(Of course\.|Certainly\.|Sure\.|I'll help|As a[\s\S]*?engineer,?|Let me analyze[\s\S]*?:)\s*/i, '');
    fix = fix.replace(/^[\s\S]*?(\*\*Fix:\*\*|\*\*Solution:\*\*|Here's the fix:|The fix is:)\s*/i, '');
    
    // Extract first meaningful paragraph
    const paragraphs = fix.split(/\n\n+/);
    const fixDescription = paragraphs[0] || fix;
    
    // Try to extract code from response
    const codeMatch = response.match(/```[\w]*\n([\s\S]*?)```/);
    let correctedCode = '';
    
    if (codeMatch && codeMatch[1].trim()) {
      correctedCode = codeMatch[1].trim();
    } else {
      // Generate meaningful code based on issue type
      correctedCode = this.generateMeaningfulCode(issue);
    }
    
    // Extract best practices if present
    const practicesMatch = response.match(/(?:best practices?|guidelines?|recommendations?)[\s\S]*?([•\-*][\s\S]*?)(?:\n\n|$)/i);
    const bestPractices = practicesMatch
      ? practicesMatch[1].split('\n')
          .filter(p => p.trim().match(/^[•\-*]/))
          .map(p => p.replace(/^[•\-*]\s*/, '').trim())
          .slice(0, 3) // Limit to 3 best practices
      : [];

    return {
      fix: fixDescription.trim(),
      correctedCode,
      explanation: response.length > 500 ? response.substring(0, 500) + '...' : response,
      bestPractices
    };
  }
  
  protected generateMeaningfulCode(issue: IssueContext): string {
    const lineNum = issue.line || 1;
    const fileName = issue.file.split('/').pop() || 'File';
    
    // Generate more specific code based on issue type
    if (issue.type.toLowerCase().includes('security')) {
      return `${lineNum}: // SECURITY FIX: Implement secure coding practice
${lineNum + 1}: // Validate and sanitize all inputs
${lineNum + 2}: // Use parameterized queries or prepared statements
${lineNum + 3}: // Apply principle of least privilege`;
    } else if (issue.type.toLowerCase().includes('performance')) {
      return `${lineNum}: // PERFORMANCE FIX: Optimize algorithm/resource usage
${lineNum + 1}: // Consider caching, lazy loading, or async processing
${lineNum + 2}: // Profile and measure performance impact`;
    } else if (issue.type.toLowerCase().includes('quality')) {
      return `${lineNum}: // CODE QUALITY FIX: Improve readability and maintainability
${lineNum + 1}: // Follow naming conventions and SOLID principles
${lineNum + 2}: // Add proper error handling and documentation`;
    } else {
      return `${lineNum}: // FIX: Address ${issue.type} issue in ${fileName}
${lineNum + 1}: // ${issue.description}
${lineNum + 2}: // Apply appropriate solution based on context`;
    }
  }

  protected generateDefaultCode(issue: IssueContext): string {
    // BUG-112 FIX: Use meaningful code instead of generic fallback
    return this.generateMeaningfulCode(issue);
  }

  protected getDefaultFix(issue: IssueContext): FixSuggestion {
    // BUG-112 FIX: Provide specific fallback based on role
    const roleSpecificFix = {
      'Security': `Implement secure coding practice: validate inputs, use prepared statements, apply least privilege`,
      'Performance': `Optimize algorithm: consider caching, use efficient data structures, profile performance`,
      'Architecture': `Refactor design: apply SOLID principles, use appropriate design patterns, reduce coupling`,
      'CodeQuality': `Improve code quality: follow naming conventions, add documentation, reduce complexity`,
      'Dependency': `Update dependency: check for security patches, verify compatibility, test thoroughly`
    };

    return {
      fix: roleSpecificFix[this.agentRole as keyof typeof roleSpecificFix] ||
           `Address this ${issue.severity} ${issue.type} issue according to ${this.agentRole.toLowerCase()} best practices`,
      correctedCode: this.generateMeaningfulCode(issue),
      bestPractices: [
        `Review ${this.agentRole.toLowerCase()} best practices documentation`,
        `Consult with team lead for ${issue.severity} ${issue.type} issues`,
        `Apply industry-standard solutions for this issue type`
      ]
    };
  }
}

/**
 * Security Agent - Handles security vulnerabilities and threats
 * BUG-119 FIX: Accepts ModelConfiguration from factory
 */
export class SecurityAgent extends BaseSpecializedAgent {
  constructor(modelConfig?: ModelConfiguration) {
    super('Security', modelConfig);
  }

  protected getSystemPrompt(): string {
    return `You are a security expert. Provide ONLY concise, actionable fixes.
DO NOT include pleasantries or introductions.
START directly with the fix.
Format: One paragraph fix description, then code example.
Be specific and practical.`;
  }

  protected buildPrompt(issue: IssueContext): string {
    return `Security issue: ${issue.description}
File: ${issue.file}, Line: ${issue.line}
${issue.codeSnippet ? `Code:\n${issue.codeSnippet}` : ''}

Provide (BUG-108 FIX - Be specific):
1. One sentence fix description with SPECIFIC class/method names
2. Required imports (if any) - e.g., "import java.sql.PreparedStatement;"
3. Corrected code (production-ready) with exact replacements
4. "Why This Works" - Brief explanation of security improvement
5. Security impact if not fixed

REQUIRED: Use specific class names, no generic phrases like "apply appropriate solution".
Be direct and actionable.`;
  }
}

/**
 * Performance Agent - Handles performance optimizations
 * BUG-119 FIX: Accepts ModelConfiguration from factory
 */
export class PerformanceAgent extends BaseSpecializedAgent {
  constructor(modelConfig?: ModelConfiguration) {
    super('Performance', modelConfig);
  }

  protected getSystemPrompt(): string {
    return `You are a performance expert. Provide ONLY actionable optimizations.
NO introductions or pleasantries.
START with the fix.
Include complexity analysis (O notation) where relevant.
Be practical and specific.`;
  }

  protected buildPrompt(issue: IssueContext): string {
    return `Performance issue: ${issue.description}
File: ${issue.file}, Line: ${issue.line}
${issue.codeSnippet ? `Code:\n${issue.codeSnippet}` : ''}

Provide (BUG-108 FIX - Be specific):
1. Specific optimization with EXACT algorithm/data structure names
2. Required imports (if any) - e.g., "import java.util.HashMap;"
3. Optimized code (production-ready) with exact replacements
4. Complexity improvement (e.g., O(n²) → O(n log n))
5. "Why This Works" - Brief performance benefit explanation

REQUIRED: Use specific data structures/algorithms, no generic phrases like "optimize appropriately".
Be direct and actionable.`;
  }
}

/**
 * Architecture Agent - Handles design patterns and structural issues
 * BUG-119 FIX: Accepts ModelConfiguration from factory
 */
export class ArchitectureAgent extends BaseSpecializedAgent {
  constructor(modelConfig?: ModelConfiguration) {
    super('Architecture', modelConfig);
  }

  protected getSystemPrompt(): string {
    return `You are an architect. Provide ONLY design improvements.
NO introductions.
Focus on SOLID principles and design patterns.
Be specific about refactoring steps.
Keep it practical.`;
  }

  protected buildPrompt(issue: IssueContext): string {
    // BUG-124 FIX: Add specific guidance for common architectural issues
    const specificGuidance = this.getSpecificGuidanceForIssue(issue);

    return `Architecture issue: ${issue.description}
File: ${issue.file}
${issue.codeSnippet ? `Code:\n${issue.codeSnippet}` : ''}

${specificGuidance}

Provide (BUG-108 & BUG-124 FIX - Be VERY specific):
1. Concrete refactoring steps with EXACT class/interface names (e.g., "Extract UserRepository, EmailService, FileService")
2. Required imports (if any)
3. Refactored code showing NEW class structure (not comments, actual code)
4. Design pattern name (e.g., "Single Responsibility Principle", "Dependency Injection")
5. "Why This Works" - Explain architectural improvement

CRITICAL: NO generic phrases like "apply appropriate solution" or "refactor as needed".
Show ACTUAL refactored code with specific names.`;
  }

  /**
   * BUG-124 FIX: Provide issue-specific guidance for better AI responses
   */
  private getSpecificGuidanceForIssue(issue: IssueContext): string {
    const description = issue.description.toLowerCase();
    const title = issue.title?.toLowerCase() || '';

    if (description.includes('god class') || description.includes('too many responsibilities') || title.includes('god class')) {
      return `SPECIFIC TASK: This is a God Class with too many responsibilities.
Extract separate classes for each responsibility domain (e.g., database operations → UserRepository, email operations → EmailService, file operations → FileService).
Show the refactored class structure with ACTUAL class names from the code.`;
    }

    if (description.includes('circular dependency') || title.includes('circular')) {
      return `SPECIFIC TASK: Break the circular dependency.
Use Dependency Inversion (introduce interface) or Event-Driven Architecture (use events/messages).
Show EXACTLY which interface to create and how to inject it.`;
    }

    if (description.includes('tight coupling') || description.includes('coupling')) {
      return `SPECIFIC TASK: Reduce coupling using interfaces or dependency injection.
Create specific interfaces and show how to inject dependencies.`;
    }

    return `SPECIFIC TASK: Apply SOLID principles to improve the design.
Show concrete refactoring with actual class and interface names.`;
  }
}

/**
 * Code Quality Agent - Handles code style, readability, and maintainability
 * BUG-119 FIX: Accepts ModelConfiguration from factory
 */
export class CodeQualityAgent extends BaseSpecializedAgent {
  constructor(modelConfig?: ModelConfiguration) {
    super('CodeQuality', modelConfig);
  }

  protected getSystemPrompt(): string {
    return `You are a code quality expert. Provide ONLY clean code improvements.
NO pleasantries.
Focus on readability and maintainability.
Be specific and practical.
Keep responses short.`;
  }

  protected buildPrompt(issue: IssueContext): string {
    return `Code quality issue: ${issue.description}
File: ${issue.file}, Line: ${issue.line}
${issue.codeSnippet ? `Code:\n${issue.codeSnippet}` : ''}

Provide (BUG-108 FIX - Be specific):
1. Improvement with SPECIFIC method/variable names
2. Required imports (if any)
3. Clean code example (production-ready) with exact replacements
4. "Why This Works" - Brief code quality benefit explanation
5. Relevant clean code principle (e.g., "Single Responsibility Principle")

REQUIRED: Use specific names, no generic phrases like "improve as needed".
Be concise and actionable.`;
  }
}

/**
 * Dependency Agent - Handles dependency issues and package management
 * BUG-119 FIX: Accepts ModelConfiguration from factory
 */
export class DependencyAgent extends BaseSpecializedAgent {
  constructor(modelConfig?: ModelConfiguration) {
    super('Dependency', modelConfig);
  }

  protected getSystemPrompt(): string {
    return `You are a dependency expert. Provide ONLY dependency fixes.
NO introductions.
Focus on version updates and security patches.
Suggest alternatives when needed.
Be direct.`;
  }

  protected buildPrompt(issue: IssueContext): string {
    return `Dependency issue: ${issue.description}
File: ${issue.file}
${issue.codeSnippet ? `Context:\n${issue.codeSnippet}` : ''}

Provide (BUG-108 FIX - Be specific):
1. Fix action with EXACT dependency name and version (e.g., "Update log4j from 2.14.0 to 2.17.1")
2. Correct configuration (production-ready) with exact syntax
3. Alternative library if replacement needed (with specific version)
4. "Why This Works" - Brief security/compatibility benefit
5. Migration steps if breaking changes exist

REQUIRED: Use exact package names and versions, no phrases like "update to latest version".
Be specific and actionable.`;
  }
}

/**
 * Agent Factory - Creates appropriate agent based on issue category
 * BUG-119 FIX: No caching - creates fresh agents with ModelConfiguration from orchestrator
 */
export class SpecializedAgentFactory {
  /**
   * BUG-119 FIX: Generate fix using role-specific, language-specific, size-specific model
   *
   * @param issue Issue context
   * @param modelConfigResolver ModelConfigResolver from orchestrator
   * @param language Repository language (from LanguageDetector)
   * @param repoSize Repository size category (from RepositorySizeCalculator)
   */
  static async generateFixForIssue(
    issue: IssueContext,
    modelConfigResolver: any,  // ModelConfigResolver from orchestrator
    language: string,
    repoSize: 'small' | 'medium' | 'large' | 'enterprise'
  ): Promise<FixSuggestion> {
    // Determine role from issue type
    const role = this.getRoleForCategory(issue.type);

    // Get model config from Supabase (or trigger Researcher if missing)
    const modelConfig = await modelConfigResolver.getModelConfiguration(
      role,
      language,
      repoSize
    );

    console.log(`[AgentFactory] ${role}/${language}/${repoSize} → ${modelConfig.primary_model}`);

    // Create agent with proper model config
    const agent = this.createAgent(issue.type, modelConfig);

    // Generate fix using role-specific, language-specific model
    return await agent.generateFixSuggestion(issue, modelConfig.primary_model);
  }

  /**
   * BUG-119 FIX: Create agent with ModelConfiguration
   */
  private static createAgent(
    category: string,
    modelConfig: ModelConfiguration
  ): BaseSpecializedAgent {
    const normalizedCategory = category.toLowerCase();

    if (normalizedCategory.includes('security') || normalizedCategory.includes('vulnerability')) {
      return new SecurityAgent(modelConfig);
    } else if (normalizedCategory.includes('performance') || normalizedCategory.includes('optimization')) {
      return new PerformanceAgent(modelConfig);
    } else if (normalizedCategory.includes('architecture') || normalizedCategory.includes('design')) {
      return new ArchitectureAgent(modelConfig);
    } else if (normalizedCategory.includes('dependency') || normalizedCategory.includes('package')) {
      return new DependencyAgent(modelConfig);
    } else {
      // Default to Code Quality for general issues
      return new CodeQualityAgent(modelConfig);
    }
  }

  /**
   * BUG-119 FIX: Map issue category to role name for Supabase lookup
   */
  private static getRoleForCategory(category: string): string {
    const cat = category.toLowerCase();

    if (cat.includes('security') || cat.includes('vulnerability')) {
      return 'security';
    }
    if (cat.includes('performance') || cat.includes('optimization')) {
      return 'performance';
    }
    if (cat.includes('architecture') || cat.includes('design')) {
      return 'architecture';
    }
    if (cat.includes('dependency') || cat.includes('package')) {
      return 'dependency';
    }

    return 'codequality';
  }
}