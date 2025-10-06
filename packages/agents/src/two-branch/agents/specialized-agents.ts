/**
 * Specialized agents for generating fix suggestions based on issue context
 * Each agent is responsible for a specific domain and uses AI to generate contextual fixes
 */

import OpenAI from 'openai';
import { DynamicModelSelector } from '../services/dynamic-model-selector';
import { getResilientAIClient } from '../services/resilient-ai-client';

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
 */
abstract class BaseSpecializedAgent {
  protected openRouter: OpenAI;
  protected modelSelector: DynamicModelSelector;
  protected agentRole: string;

  constructor(role: string) {
    this.agentRole = role;
    this.modelSelector = new DynamicModelSelector(process.env.OPENROUTER_API_KEY);

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
   * Uses centralized resilient AI client with complete fallback chain
   */
  async generateFixSuggestion(issue: IssueContext): Promise<FixSuggestion> {
    const modelConfig = await this.modelSelector.selectModelsForTwoBranchAnalysis(
      this.agentRole.toLowerCase(),
      'medium'
    );

    const systemPrompt = this.getSystemPrompt();
    const userPrompt = this.buildPrompt(issue);

    try {
      // Use centralized resilient AI client (handles all tiers automatically)
      const aiClient = getResilientAIClient();

      const response = await aiClient.chat({
        systemPrompt,
        userPrompt,
        role: this.agentRole,
        model: modelConfig.primary.id,
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
    const lineNum = issue.line || 1;
    return `${lineNum}: // Apply fix for ${issue.type} issue
${lineNum + 1}: // ${issue.description}
${lineNum + 2}: // TODO: Implement proper fix based on context`;
  }

  protected getDefaultFix(issue: IssueContext): FixSuggestion {
    return {
      fix: `Address this ${issue.severity} ${issue.type} issue according to ${this.agentRole.toLowerCase()} best practices`,
      correctedCode: this.generateDefaultCode(issue),
      bestPractices: [`Review ${this.agentRole.toLowerCase()} guidelines`, 'Apply appropriate fix based on context']
    };
  }
}

/**
 * Security Agent - Handles security vulnerabilities and threats
 */
export class SecurityAgent extends BaseSpecializedAgent {
  constructor() {
    super('Security');
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
 */
export class PerformanceAgent extends BaseSpecializedAgent {
  constructor() {
    super('Performance');
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
 */
export class ArchitectureAgent extends BaseSpecializedAgent {
  constructor() {
    super('Architecture');
  }

  protected getSystemPrompt(): string {
    return `You are an architect. Provide ONLY design improvements.
NO introductions.
Focus on SOLID principles and design patterns.
Be specific about refactoring steps.
Keep it practical.`;
  }

  protected buildPrompt(issue: IssueContext): string {
    return `Architecture issue: ${issue.description}
File: ${issue.file}
${issue.codeSnippet ? `Code:\n${issue.codeSnippet}` : ''}

Provide (BUG-108 FIX - Be specific):
1. Refactoring approach with SPECIFIC class/interface names
2. Required imports (if any)
3. Improved code structure with exact implementations
4. Design pattern used (be specific - e.g., "Strategy Pattern" not "appropriate pattern")
5. "Why This Works" - Explain architectural benefit

REQUIRED: Use specific class names, no phrases like "apply appropriate solution".
Be direct and actionable.`;
  }
}

/**
 * Code Quality Agent - Handles code style, readability, and maintainability
 */
export class CodeQualityAgent extends BaseSpecializedAgent {
  constructor() {
    super('CodeQuality');
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
 */
export class DependencyAgent extends BaseSpecializedAgent {
  constructor() {
    super('Dependency');
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
 */
export class SpecializedAgentFactory {
  private static agents = new Map<string, BaseSpecializedAgent>();

  static getAgent(category: string): BaseSpecializedAgent {
    // Normalize category
    const normalizedCategory = category.toLowerCase();

    // Check cache
    if (this.agents.has(normalizedCategory)) {
      return this.agents.get(normalizedCategory)!;
    }

    // Create appropriate agent
    let agent: BaseSpecializedAgent;

    if (normalizedCategory.includes('security') || normalizedCategory.includes('vulnerability')) {
      agent = new SecurityAgent();
    } else if (normalizedCategory.includes('performance') || normalizedCategory.includes('optimization')) {
      agent = new PerformanceAgent();
    } else if (normalizedCategory.includes('architecture') || normalizedCategory.includes('design')) {
      agent = new ArchitectureAgent();
    } else if (normalizedCategory.includes('dependency') || normalizedCategory.includes('package')) {
      agent = new DependencyAgent();
    } else {
      // Default to Code Quality for general issues
      agent = new CodeQualityAgent();
    }

    // Cache and return
    this.agents.set(normalizedCategory, agent);
    return agent;
  }

  static async generateFixForIssue(issue: IssueContext): Promise<FixSuggestion> {
    const agent = this.getAgent(issue.type);
    return agent.generateFixSuggestion(issue);
  }
}