/**
 * Specialized agents for generating fix suggestions based on issue context
 * Each agent is responsible for a specific domain and uses AI to generate contextual fixes
 * 
 * BUG #76 FIX: Two-prompt architecture with compact JSON examples
 * - System Prompt: Defines role and output structure (reusable)
 * - User Prompt: Issue details + 2 compact JSON examples (per-issue)
 * - Cost: ~600 tokens per issue (fits $0.01 budget)
 */

import OpenAI from 'openai';
import { DynamicModelSelector } from '../services/dynamic-model-selector';
import { getResilientAIClient } from '../services/resilient-ai-client';
import { getSimpleOpenRouterClient } from '../services/simple-openrouter-client';
import { ModelConfiguration } from '../../standard/orchestrator/model-config-resolver';
import { getExamplesForCategory, type FixExample } from './examples-database';

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
  explanation?: string; // Keep for backward compatibility
  // BUG #89 FIX: Add structured description for rule-specific, actionable information
  issueDescription?: {
    what: string;        // What is this issue? (2-3 sentences, rule-specific)
    why: string;         // Why does it matter? (2-3 sentences with real consequences)
    causes: string[];    // Common causes (3-5 specific bullet points)
    impact: string;      // Impact if not fixed (2-3 sentences with business/security context)
  };
  bestPractices?: string[];
  // BUG #6 FIX: Track which model was used for generating this fix
  model?: string;
  // SESSION 21 FIX: Track actual cost from OpenRouter
  cost?: number;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Base class for all specialized agents
 * BUG-119 FIX: Accepts ModelConfiguration from orchestrator instead of creating own selector
 * BUG-76 FIX: Supports category-based examples for few-shot learning
 */
abstract class BaseSpecializedAgent {
  protected openRouter: OpenAI;
  protected modelConfig: ModelConfiguration | null = null;
  protected agentRole: string;
  protected category: string; // BUG-76: Category for example selection

  constructor(role: string, modelConfig?: ModelConfiguration) {
    this.agentRole = role;
    this.category = this.getCategoryFromRole(role); // BUG-76: Map role to category
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
   * BUG-76: Map agent role to category for example selection
   */
  protected getCategoryFromRole(role: string): string {
    const normalized = role.toLowerCase();
    if (normalized.includes('security')) return 'Security';
    if (normalized.includes('performance')) return 'Performance';
    if (normalized.includes('architecture')) return 'Architecture';
    if (normalized.includes('dependency') || normalized.includes('dependen')) return 'Dependencies';
    return 'Code Quality'; // Default for CodeQuality and others
  }

  /**
   * Generate fix suggestion using AI based on issue context
   * BUG-119 FIX: Uses model from ModelConfiguration (via orchestrator) instead of DynamicModelSelector
   * COST FIX: Uses simple client (1 call, fallback on 401 only)
   */
  async generateFixSuggestion(issue: IssueContext, modelOverride?: string): Promise<FixSuggestion> {
    // BUG-119 FIX: Use provided model override or model from config
    // Priority: modelOverride > modelConfig.primary_model > fallback default
    const strict = process.env.STRICT_NO_FALLBACK === 'true' || process.env.E2E_DISABLE_EMERGENCY_FALLBACK === 'true';
    const modelToUse = modelOverride || this.modelConfig?.primary_model || (strict
      ? (() => { throw new Error('ALERT: No model configured for agent under STRICT_NO_FALLBACK'); })()
      : 'google/gemini-2.5-flash');

    const systemPrompt = this.getSystemPrompt();
    const userPrompt = this.buildPrompt(issue);

    try {
      // COST FIX: Use simple client (no retries, fallback on 401 only)
      const aiClient = getSimpleOpenRouterClient();

      const response = await aiClient.chat({
        systemPrompt,
        userPrompt,
        model: modelToUse,
        temperature: 0.3,
        maxTokens: issue.codeSnippet ? 2500 : 1200  // More tokens when code snippet provided
      });

      // BUG-76 FIX: Clean <think> tags and AI reasoning BEFORE parsing
      const cleanedResponse = this.cleanAIContent(response.content);
      const result = this.parseAIResponse(cleanedResponse, issue);

      // BUG #6 FIX: Add model information to fix suggestion
      result.model = modelToUse;
      
      // SESSION 21 FIX: Add cost and usage from OpenRouter response
      result.cost = response.cost || 0;
      result.usage = response.usage;
      
      return result;

    } catch (error: any) {
      // Under strict mode, surface the failure to abort the flow
      const strict = process.env.STRICT_NO_FALLBACK === 'true' || process.env.E2E_DISABLE_EMERGENCY_FALLBACK === 'true';
      if (strict) {
        throw error;
      }
      console.error(`[${this.agentRole}] Error generating fix, using fallback:`, error.message);
      const fallbackFix = this.getDefaultFix(issue);
      fallbackFix.model = 'fallback';  // BUG #6 FIX: Mark fallback fixes
      return fallbackFix;
    }
  }

  protected abstract getSystemPrompt(): string;
  protected abstract buildPrompt(issue: IssueContext): string;

  /**
   * BUG-76: Helper to build prompt with compact JSON examples
   * Agents can call this or implement their own buildPrompt()
   */
  protected buildPromptWithExamples(issue: IssueContext): string {
    // Get 2 examples for this category
    const examples = getExamplesForCategory(this.category, 2);
    
    return `EXAMPLES (${this.category} fixes):
${JSON.stringify(examples, null, 2)}

ANALYZE THIS:
{
  "title": ${JSON.stringify(issue.title)},
  "severity": "${issue.severity}",
  "tool": "${issue.tool || 'unknown'}",
  "file": "${issue.file}",
  "line": ${issue.line},
  "code": ${JSON.stringify(issue.codeSnippet || '')}
}

Provide JSON response following system prompt structure.`;
  }

  /**
   * BUG-76 FIX: Clean AI response BEFORE parsing
   * Removes <think> tags, AI reasoning patterns, and generic preambles
   * CRITICAL: Must run BEFORE parseAIResponse to prevent parsing failures
   */
  protected cleanAIContent(content: string): string {
    if (!content) return content;
    
    let cleaned = content;
    
    // PRIORITY 1: Remove <think> tags (MOST CRITICAL - causes 50% failure rate)
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '');    // <think>...</think>
    cleaned = cleaned.replace(/<think>[\s\S]*?(?=\n\n|$)/gi, '');   // <think>... (no closing tag)
    
    // PRIORITY 2: Remove AI reasoning patterns at start of response
    cleaned = cleaned.replace(/^(First,|Okay,|Alright,|So,|Let me|I need to|I'll|What's)\s+[\s\S]*?\n\n/i, '');
    
    // PRIORITY 3: Remove generic AI preambles
    cleaned = cleaned.replace(/^(Of course\.|Certainly\.|Sure\.|I'll help|As a[\s\S]*?engineer,?)\s*/i, '');
    
    // PRIORITY 4: Remove "Here's the fix:" type intros
    cleaned = cleaned.replace(/^[\s\S]*?(\*\*Fix:\*\*|\*\*Solution:\*\*|Here's the fix:|The fix is:)\s*/i, '');
    
    // Remove empty lines at start/end
    cleaned = cleaned.trim();
    
    return cleaned;
  }

  protected parseAIResponse(response: string, issue: IssueContext): FixSuggestion {
    // BUG-76 FIX: Try JSON extraction FIRST (highest priority)
    
    // PATTERN 0: Brace-counting JSON extraction (most robust - handles newlines in strings)
    const jsonStart = response.indexOf('{');
    if (jsonStart !== -1 && response.includes('"fix"') && response.includes('"correctedCode"')) {
      try {
        let braceCount = 0;
        let inString = false;
        let escaped = false;
        
        for (let i = jsonStart; i < response.length; i++) {
          const char = response[i];
          
          if (escaped) {
            escaped = false;
            continue;
          }
          
          if (char === '\\') {
            escaped = true;
            continue;
          }
          
          if (char === '"') {
            inString = !inString;
            continue;
          }
          
          if (!inString) {
            if (char === '{') braceCount++;
            if (char === '}') {
              braceCount--;
              if (braceCount === 0) {
                // Found complete JSON
                const jsonStr = response.substring(jsonStart, i + 1);
                const parsed = JSON.parse(jsonStr);

                // BUG #89 DEBUG: Log what AI actually returned
                console.log(`[BUG #89 parseAIResponse] AI JSON parsed:`, {
                  hasFix: !!parsed.fix,
                  hasCorrectedCode: !!parsed.correctedCode,
                  hasIssueDescription: !!parsed.issueDescription,
                  issueDescriptionKeys: parsed.issueDescription ? Object.keys(parsed.issueDescription) : []
                });

                if (parsed.fix && parsed.correctedCode) {
                  return {
                    fix: parsed.fix,
                    correctedCode: parsed.correctedCode,
                    explanation: parsed.fix,
                    // BUG #89 FIX: Copy issueDescription from AI response
                    issueDescription: parsed.issueDescription,
                    bestPractices: parsed.bestPractices || []
                  };
                }
                break;
              }
            }
          }
        }
      } catch (e) {
        // Brace-counting or JSON parsing failed, continue with other methods
      }
    }
    
    // Pattern 1: JSON in markdown block
    const jsonBlockMatch = response.match(/```json\s*\n([\s\S]*?)\n```/);
    if (jsonBlockMatch) {
      try {
        const parsed = JSON.parse(jsonBlockMatch[1]);
        if (parsed.fix && parsed.correctedCode) {
          return {
            fix: parsed.fix,
            correctedCode: parsed.correctedCode,
            explanation: parsed.fix,
            // BUG #89 FIX: Copy issueDescription from AI response
            issueDescription: parsed.issueDescription,
            bestPractices: parsed.bestPractices || []
          };
        }
      } catch (e) {
        // JSON parsing failed, continue with other methods
      }
    }
    
    // Pattern 2: JSON in generic code block
    const codeBlockJsonMatch = response.match(/```\s*\n(\{[\s\S]*?"fix"[\s\S]*?\})\s*\n```/);
    if (codeBlockJsonMatch) {
      try {
        const parsed = JSON.parse(codeBlockJsonMatch[1]);
        if (parsed.fix && parsed.correctedCode) {
          return {
            fix: parsed.fix,
            correctedCode: parsed.correctedCode,
            explanation: parsed.fix,
            // BUG #89 FIX: Copy issueDescription from AI response
            issueDescription: parsed.issueDescription,
            bestPractices: parsed.bestPractices || []
          };
        }
      } catch (e) {
        // JSON parsing failed, continue with other methods
      }
    }
    
    // Fallback: Extract text and code separately
    const fix = response;
    
    // Extract first meaningful paragraph as fix description
    const paragraphs = fix.split(/\n\n+/);
    const fixDescription = paragraphs[0] || fix;
    
    // Try to extract code from response - be lenient with different formats
    // Try multiple patterns:
    // 1. Standard markdown: ```lang\ncode```
    // 2. Without language: ```\ncode```
    // 3. Multiple blocks: take the largest one
    const codeBlockPattern = /```[\w]*\n([\s\S]*?)```/g;
    const matches = Array.from(response.matchAll(codeBlockPattern));
    
    let correctedCode = '';
    
    if (matches.length > 0) {
      // Take the longest code block (likely the actual fix, not example)
      correctedCode = matches
        .map(m => m[1].trim())
        .filter(code => code.length > 10) // Filter out tiny snippets
        .sort((a, b) => b.length - a.length)[0] || '';
    }
    
    // If still no code, try to extract code-like content without markdown
    if (!correctedCode && response.includes(issue.file.split('/').pop() || '')) {
      // Look for indented code blocks (likely code even without markdown)
      const linesWithCode = response.split('\n').filter(line => 
        /^\s{2,}/.test(line) && // Indented
        /[{};()=]/.test(line)    // Has code-like syntax
      );
      if (linesWithCode.length > 2) {
        correctedCode = linesWithCode.join('\n').trim();
      }
    }
    
    // Last resort: check if there's meaningful content that looks like guidance
    if (!correctedCode) {
      // If the response has specific method/class names from the issue, use it as guidance
      if (response.length > 50 && (response.includes('class ') || response.includes('public ') || response.includes('private '))) {
        correctedCode = '// Apply this fix to your code:\n' + response.substring(0, 500);
      } else {
        // Only then fall back to generic message
        correctedCode = this.generateMeaningfulCode(issue);
      }
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
    
    // FALLBACK: AI failed to generate code - warn user
    console.warn(`[${this.agentRole}] AI failed to generate code block for ${issue.type} in ${fileName}:${lineNum}`);
    
    // Return a clear "manual review required" message instead of generic placeholders
    return `${lineNum}: // ⚠️ AI-generated fix not available - Manual review required
${lineNum + 1}: // Issue: ${issue.description}
${lineNum + 2}: // See ${issue.type} documentation for fix patterns
${lineNum + 3}: // Context: ${fileName} line ${lineNum}`;
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
 * BUG-76 FIX: Compact system prompt + JSON examples
 */
export class SecurityAgent extends BaseSpecializedAgent {
  constructor(modelConfig?: ModelConfiguration) {
    super('Security', modelConfig);
  }

  protected getSystemPrompt(): string {
    return `You are a SECURITY EXPERT for code vulnerabilities.

⚠️ CRITICAL: Output ONLY the JSON response. NO thinking process, NO reasoning, NO "First, I...", NO "Let me...". Start DIRECTLY with JSON.

SEVERITY CLASSIFICATION:
🔴 CRITICAL: SQL injection, command injection, RCE, auth bypass, hardcoded credentials, data loss
🟠 HIGH: Potential bugs (NPE, resource leaks), security weaknesses, crypto issues
🟡 MEDIUM: Code smells, maintainability issues, moderate complexity
🟢 LOW: Style/formatting/documentation (checkstyle=LOW 99.9% of cases)

Output ONLY this JSON (nothing else):
{
  "severity": "critical|high|medium|low",
  "issueDescription": {
    "what": "RULE-SPECIFIC description (2-3 sentences). NOT generic. Explain THIS EXACT vulnerability/rule",
    "why": "SPECIFIC consequences with real attack scenarios (2-3 sentences)",
    "causes": ["Specific cause 1 for THIS rule", "Specific cause 2", "Specific cause 3"],
    "impact": "CONCRETE business/security impact for THIS vulnerability (2-3 sentences). Include compliance if relevant"
  },
  "fix": "Step-by-step solution with security references (focus on HOW to fix)",
  "correctedCode": "ONLY the corrected code that replaces the problematic code. NO comments like '// Should be changed to:', NO before/after comparison, NO original code. Just the replacement code.",
  "bestPractices": ["Best practice 1", "Best practice 2", "Best practice 3"]
}

CRITICAL: Be RULE-SPECIFIC. NO generic boilerplate. Reference the EXACT vulnerability type, tool, and rule name.`;
  }

  protected buildPrompt(issue: IssueContext): string {
    // BUG-76: Use compact JSON examples
    return this.buildPromptWithExamples(issue);
  }

  /**
   * Provide security-specific guidance with attack examples
   */
  private getSecurityGuidance(issue: IssueContext): string {
    const type = issue.type.toLowerCase();
    
    // Command Injection
    if (type.includes('command') || type.includes('injection') || type.includes('processbuilder')) {
      return `🚨 CRITICAL: Command Injection Vulnerability

Attack Example:
\`\`\`bash
# Attacker input: "file.txt; rm -rf /"
# Result: Executes BOTH commands!
\`\`\`

Secure Pattern:
\`\`\`java
// ❌ NEVER do this:
ProcessBuilder pb = new ProcessBuilder(userInput.split(" "));  // UNSAFE!

// ✅ DO THIS instead - Option 1: Whitelist
private static final Set<String> ALLOWED_COMMANDS = Set.of("gzip", "tar");
if (!ALLOWED_COMMANDS.contains(cmd)) {
    throw new SecurityException("Unauthorized command");
}

// ✅ Option 2: Validate - reject shell metacharacters
if (input.matches(".*[;&|$\\\`<>\\\\n].*")) {
    throw new SecurityException("Dangerous characters detected");
}

// ✅ Option 3: Use command array (NOT split!)
ProcessBuilder pb = new ProcessBuilder("/usr/bin/gzip", "-9", sanitizedFile);
\`\`\`

OWASP: A03:2021 - Injection`;
    }
    
    // Unsafe Reflection
    if (type.includes('reflection') || type.includes('forname')) {
      return `⚠️ HIGH: Unsafe Reflection/Arbitrary Class Loading

Secure Pattern for Plugin Systems:
\`\`\`java
public <T> T loadPlugin(String className, Class<T> expectedInterface) {
    Class<?> clazz = Class.forName(className);
    
    // 1. Verify expected interface
    if (!expectedInterface.isAssignableFrom(clazz)) {
        throw new SecurityException("Must implement " + expectedInterface);
    }
    
    // 2. Block dangerous system classes
    if (clazz.getName().startsWith("java.lang.Process") ||
        clazz.getName().startsWith("java.lang.Runtime")) {
        throw new SecurityException("System class not allowed");
    }
    
    return clazz.asSubclass(expectedInterface).getDeclaredConstructor().newInstance();
}
\`\`\`

Note: For Kafka plugins, validate against Serializer/Deserializer interfaces.

OWASP: A08:2021 - Software Integrity Failures`;
    }
    
    return ''; // No specific guidance, use AI's general security knowledge
  }
}

/**
 * Performance Agent - Handles performance optimizations
 * BUG-119 FIX: Accepts ModelConfiguration from factory
 * BUG-76 FIX: Compact system prompt + JSON examples
 */
export class PerformanceAgent extends BaseSpecializedAgent {
  constructor(modelConfig?: ModelConfiguration) {
    super('Performance', modelConfig);
  }

  protected getSystemPrompt(): string {
    return `You are a PERFORMANCE EXPERT for code optimization.

⚠️ CRITICAL: Output ONLY the JSON response. NO thinking process, NO reasoning, NO "First, I...", NO "Let me...". Start DIRECTLY with JSON.

SEVERITY CLASSIFICATION:
🔴 CRITICAL: System crashes, memory leaks causing outages, infinite loops
🟠 HIGH: N² algorithms in hot paths, significant resource waste, scalability blockers
🟡 MEDIUM: Suboptimal algorithms, minor inefficiencies
🟢 LOW: Style/formatting/documentation (checkstyle=LOW 99.9% of cases)

Output ONLY this JSON (nothing else):
{
  "severity": "critical|high|medium|low",
  "issueDescription": {
    "what": "RULE-SPECIFIC description (2-3 sentences). NOT generic. Explain THIS EXACT performance issue/rule",
    "why": "SPECIFIC consequences with real performance impacts (2-3 sentences)",
    "causes": ["Specific cause 1 for THIS rule", "Specific cause 2", "Specific cause 3"],
    "impact": "CONCRETE business/performance impact for THIS issue (2-3 sentences). Include scalability concerns"
  },
  "fix": "Step-by-step optimization with Big-O complexity analysis (focus on HOW to optimize)",
  "correctedCode": "ONLY the optimized code that replaces the problematic code. NO comments like '// Should be changed to:', NO before/after comparison, NO original code. Just the replacement code.",
  "bestPractices": ["Best practice 1", "Best practice 2", "Best practice 3"]
}

CRITICAL: Be RULE-SPECIFIC. NO generic boilerplate. Reference the EXACT performance issue type, tool, and rule name.`;
  }

  protected buildPrompt(issue: IssueContext): string {
    // BUG-76: Use compact JSON examples
    return this.buildPromptWithExamples(issue);
  }
}

/**
 * Architecture Agent - Handles design patterns and structural issues
 * BUG-119 FIX: Accepts ModelConfiguration from factory
 * BUG-76 FIX: Compact system prompt + JSON examples
 */
export class ArchitectureAgent extends BaseSpecializedAgent {
  constructor(modelConfig?: ModelConfiguration) {
    super('Architecture', modelConfig);
  }

  protected getSystemPrompt(): string {
    return `You are an ARCHITECTURE EXPERT for software design.

⚠️ CRITICAL: Output ONLY the JSON response. NO thinking process, NO reasoning, NO "First, I...", NO "Let me...". Start DIRECTLY with JSON.

SEVERITY CLASSIFICATION:
🔴 CRITICAL: Circular dependencies breaking builds, major SOLID violations causing outages
🟠 HIGH: God classes (1000+ lines), tight coupling blocking features
🟡 MEDIUM: Minor design smells, moderate complexity
🟢 LOW: Style/formatting/documentation (checkstyle=LOW 99.9% of cases)

Output ONLY this JSON (nothing else):
{
  "severity": "critical|high|medium|low",
  "issueDescription": {
    "what": "RULE-SPECIFIC description (2-3 sentences). NOT generic. Explain THIS EXACT architectural issue/rule",
    "why": "SPECIFIC consequences with real maintainability impacts (2-3 sentences)",
    "causes": ["Specific cause 1 for THIS rule", "Specific cause 2", "Specific cause 3"],
    "impact": "CONCRETE business/technical debt impact for THIS issue (2-3 sentences). Include maintainability concerns"
  },
  "fix": "Step-by-step refactoring with SOLID principles and specific class/interface names (focus on HOW to refactor)",
  "correctedCode": "ONLY the refactored code that replaces the problematic code. NO comments like '// Should be changed to:', NO before/after comparison, NO original code. Just the replacement code.",
  "bestPractices": ["Best practice 1", "Best practice 2", "Best practice 3"]
}

CRITICAL: Be RULE-SPECIFIC. NO generic boilerplate. Reference the EXACT architectural issue type, tool, and rule name.`;
  }

  protected buildPrompt(issue: IssueContext): string {
    // BUG-76: Use compact JSON examples
    return this.buildPromptWithExamples(issue);
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
 * BUG-76 FIX: Compact system prompt + JSON examples
 */
export class CodeQualityAgent extends BaseSpecializedAgent {
  constructor(modelConfig?: ModelConfiguration) {
    super('CodeQuality', modelConfig);
  }

  protected getSystemPrompt(): string {
    return `You are a CODE QUALITY EXPERT for best practices.

⚠️ CRITICAL: Output ONLY the JSON response. NO thinking process, NO reasoning, NO "First, I...", NO "Let me...". Start DIRECTLY with JSON.

SEVERITY CLASSIFICATION (CRITICAL for CodeQuality):
🔴 CRITICAL: Never for code quality (reserved for security/crashes)
🟠 HIGH: Logic bugs, potential NPE, incorrect exception handling
🟡 MEDIUM: Complexity warnings, code duplication, refactoring candidates
🟢 LOW: Style/formatting/documentation/naming (checkstyle/PMD naming rules = LOW)

⚠️ CHECKSTYLE = LOW (99.9%): DesignForExtensionCheck, naming conventions, line length, imports, Javadoc

Output ONLY this JSON (nothing else):
{
  "severity": "critical|high|medium|low",
  "issueDescription": {
    "what": "RULE-SPECIFIC description (2-3 sentences). NOT generic. Explain THIS EXACT code quality issue/rule",
    "why": "SPECIFIC consequences with real readability/maintainability impacts (2-3 sentences)",
    "causes": ["Specific cause 1 for THIS rule", "Specific cause 2", "Specific cause 3"],
    "impact": "CONCRETE team/maintainability impact for THIS issue (2-3 sentences). Include technical debt concerns"
  },
  "fix": "Step-by-step refactoring for clean code (focus on HOW to fix)",
  "correctedCode": "ONLY the clean code that replaces the problematic code. NO comments like '// Should be changed to:', NO before/after comparison, NO original code. Just the replacement code.",
  "bestPractices": ["Best practice 1", "Best practice 2", "Best practice 3"]
}

CRITICAL: Be RULE-SPECIFIC. NO generic boilerplate. Reference the EXACT code quality issue type, tool, and rule name.`;
  }

  protected buildPrompt(issue: IssueContext): string {
    // BUG-76: Use compact JSON examples
    return this.buildPromptWithExamples(issue);
  }

  // Old implementation removed - using compact JSON examples now
  private _oldBuildPrompt(issue: IssueContext): string {
    const fileName = issue.file.split('/').pop() || '';
    const className = fileName.replace(/\.\w+$/, '');
    
    // Add issue-specific guidance with examples
    const guidance = this.getIssueSpecificGuidance(issue);
    
    return `Code quality issue: ${issue.type}
File: ${issue.file} (line ${issue.line})
Description: ${issue.description}

${issue.codeSnippet ? `Current Code:
\`\`\`java
${issue.codeSnippet}
\`\`\`
` : `⚠️ No code snippet available - provide a realistic fix based on the issue type and file context.`}

${guidance}

REQUIRED OUTPUT FORMAT:

### 1. Improvement Description
[1-2 sentences explaining WHAT to change and WHY]

### 2. Refactored Code
\`\`\`java
[Complete, compilable code that can be directly copy-pasted]
\`\`\`

### 3. Code Quality Principle
[Single Responsibility | DRY | SOLID | etc.]

CRITICAL REQUIREMENTS:
✅ MUST wrap code in triple backticks (\`\`\`java)
✅ Code must compile without any modifications
✅ Use ACTUAL variable/method names from the code snippet
✅ Include ALL necessary imports at the top
✅ NO placeholders like "// add logic here" or "improve as needed"
✅ NO generic comments - show ACTUAL implementation

❌ NEVER use generic variable names (foo, bar, temp)
❌ NEVER skip the code block
❌ NEVER provide just comments without implementation

If no code snippet: Generate realistic template for ${className} based on issue type.`;
  }

  /**
   * Provide issue-specific guidance with concrete examples
   */
  private getIssueSpecificGuidance(issue: IssueContext): string {
    const type = issue.type.toLowerCase();
    
    // AvoidThrowingRawExceptionTypes (5,065 occurrences)
    if (type.includes('avoidthrowingrawexceptiontypes') || type.includes('exception')) {
      return `Common Pattern for This Issue:

❌ AVOID:
\`\`\`java
public void process() throws Exception {  // Generic!
    throw new Exception("Error");
}
\`\`\`

✅ PREFER:
\`\`\`java
public void process() throws DataProcessingException {
    throw new DataProcessingException("Failed to process data", cause);
}
\`\`\`

Create a specific exception class or use existing domain-specific exceptions.`;
    }
    
    // GuardLogStatement (1,292 occurrences)
    if (type.includes('guardlogstatement') || type.includes('log')) {
      return `Standard Pattern for This Issue:

❌ AVOID:
\`\`\`java
log.debug("Value: " + expensiveOperation());
\`\`\`

✅ PREFER:
\`\`\`java
if (log.isDebugEnabled()) {
    log.debug("Value: {}", expensiveOperation());
}
\`\`\`

Guard debug/trace logs to prevent unnecessary computation.`;
    }
    
    // SystemPrintln (335 occurrences)
    if (type.includes('systemprintln') || type.includes('print')) {
      return `Standard Pattern for This Issue:

❌ AVOID:
\`\`\`java
System.out.println("Config: " + config);
\`\`\`

✅ PREFER:
\`\`\`java
private static final Logger log = LoggerFactory.getLogger(ClassName.class);
// ...
log.info("Config: {}", config);
\`\`\`

Use proper logging framework (SLF4J) with appropriate log level.`;
    }
    
    // AvoidUsingVolatile (217 occurrences)
    if (type.includes('volatile')) {
      return `Modern Pattern for This Issue:

❌ AVOID:
\`\`\`java
private volatile boolean stopped = false;
\`\`\`

✅ PREFER:
\`\`\`java
private final AtomicBoolean stopped = new AtomicBoolean(false);
// Usage: stopped.get(), stopped.set(true), stopped.compareAndSet(false, true)
\`\`\`

Use java.util.concurrent.atomic classes for thread-safe operations.`;
    }
    
    // ClassWithOnlyPrivateConstructorsShouldBeFinal (131 occurrences)
    if (type.includes('privateconstructor') || type.includes('final')) {
      return `Simple Pattern for This Issue:

❌ AVOID:
\`\`\`java
public class Utilities {
    private Utilities() {}
}
\`\`\`

✅ PREFER:
\`\`\`java
public final class Utilities {
    private Utilities() {}
}
\`\`\`

Add 'final' keyword to prevent subclassing.`;
    }
    
    // ReturnEmptyCollectionRatherThanNull (87 occurrences)
    if (type.includes('emptycollection') || type.includes('null')) {
      return `Null-Safe Pattern for This Issue:

❌ AVOID:
\`\`\`java
public List<String> getItems() {
    return null;  // Caller must check for null
}
\`\`\`

✅ PREFER:
\`\`\`java
public List<String> getItems() {
    return Collections.emptyList();  // Never null
}
\`\`\`

Return empty collections instead of null to prevent NullPointerException.`;
    }
    
    // AvoidReassigningParameters (111 occurrences)
    if (type.includes('parameter') || type.includes('reassign')) {
      return `Clean Code Pattern for This Issue:

❌ AVOID:
\`\`\`java
public void process(String input) {
    input = input.trim();  // Reassigning parameter
    // ...
}
\`\`\`

✅ PREFER:
\`\`\`java
public void process(String input) {
    String trimmedInput = input.trim();  // Local variable
    // Use trimmedInput instead
}
\`\`\`

Use local variables instead of reassigning parameters.`;
    }
    
    // ConstructorCallsOverridableMethod (29 occurrences)
    if (type.includes('constructor') || type.includes('overridable')) {
      return `Safe Initialization Pattern for This Issue:

❌ AVOID:
\`\`\`java
public class Base {
    public Base() {
        init();  // Can be overridden!
    }
    protected void init() { }
}
\`\`\`

✅ PREFER:
\`\`\`java
public class Base {
    public Base() {
        initInternal();  // Private or final
    }
    private void initInternal() { }
}
\`\`\`

Make initialization methods private or final to prevent issues in subclasses.`;
    }
    
    return ''; // No specific guidance, rely on AI's general knowledge
  }
}

/**
 * Dependency Agent - Handles dependency issues and package management
 * BUG-119 FIX: Accepts ModelConfiguration from factory
 * BUG-76 FIX: Compact system prompt + JSON examples
 */
export class DependencyAgent extends BaseSpecializedAgent {
  constructor(modelConfig?: ModelConfiguration) {
    super('Dependency', modelConfig);
  }

  protected getSystemPrompt(): string {
    return `You are a DEPENDENCY EXPERT for package management.

⚠️ CRITICAL: Output ONLY the JSON response. NO thinking process, NO reasoning, NO "First, I...", NO "Let me...". Start DIRECTLY with JSON.

SEVERITY CLASSIFICATION:
🔴 CRITICAL: Known CVE with exploit code, RCE vulnerabilities, authentication bypass
🟠 HIGH: CVEs without public exploit, deprecated packages, security weaknesses
🟡 MEDIUM: Outdated dependencies, minor vulnerabilities
🟢 LOW: Style/formatting/documentation (checkstyle=LOW 99.9% of cases)

Output ONLY this JSON (nothing else):
{
  "severity": "critical|high|medium|low",
  "issueDescription": {
    "what": "RULE-SPECIFIC description (2-3 sentences). NOT generic. Explain THIS EXACT dependency issue/vulnerability",
    "why": "SPECIFIC consequences with real security/stability impacts (2-3 sentences)",
    "causes": ["Specific cause 1 for THIS rule", "Specific cause 2", "Specific cause 3"],
    "impact": "CONCRETE security/business impact for THIS vulnerability (2-3 sentences). Include CVE details if applicable"
  },
  "fix": "Exact version update steps with package name and version numbers (focus on HOW to update with migration notes)",
  "correctedCode": "Standardized format: Only the dependency update (e.g., '@babel/traverse': '^7.23.2') - NOT full package.json structure",
  "bestPractices": ["Best practice 1", "Best practice 2", "Best practice 3"]
}

CRITICAL: Be RULE-SPECIFIC. NO generic boilerplate. Reference the EXACT dependency/vulnerability, tool, and rule name. Use specific version numbers.`;
  }

  protected buildPrompt(issue: IssueContext): string {
    // BUG-76: Use compact JSON examples
    return this.buildPromptWithExamples(issue);
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