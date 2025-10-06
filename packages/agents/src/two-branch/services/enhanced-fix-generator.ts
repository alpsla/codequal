/**
 * Enhanced Fix Generator Service
 * Handles batch processing with limits and generates actual code snippets
 */

import OpenAI from 'openai';
import { createLogger } from '../../../../core/src/utils/logger';
import { trackModelUsage } from '../utils/model-usage-tracker';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PQueue = require('p-queue').default;

const logger = createLogger('enhanced-fix-generator');

export interface FixGeneratorConfig {
  maxBatchSize: number;
  timeout: number;
  maxRetries: number;
  concurrency: number;
}

export interface IssueFix {
  issueId: string;
  fix: string;
  codeSnippet: string;
  explanation: string;
  confidence: 'high' | 'medium' | 'low';
  effort: 'trivial' | 'small' | 'medium' | 'large';
}

export class EnhancedFixGenerator {
  private openai: OpenAI;
  private config: Record<string, FixGeneratorConfig>;
  private queue: any;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1'
    } as any);

    // Agent-specific configurations to prevent timeouts
    this.config = {
      security: {
        maxBatchSize: 10,
        timeout: 30000,
        maxRetries: 2,
        concurrency: 3
      },
      quality: {
        maxBatchSize: 5,  // Smaller batches for quality agent
        timeout: 25000,
        maxRetries: 3,
        concurrency: 2
      },
      performance: {
        maxBatchSize: 8,
        timeout: 30000,
        maxRetries: 2,
        concurrency: 2
      },
      architecture: {
        maxBatchSize: 5,
        timeout: 35000,
        maxRetries: 2,
        concurrency: 1
      },
      dependency: {
        maxBatchSize: 10,
        timeout: 20000,
        maxRetries: 2,
        concurrency: 3
      }
    };

    this.queue = new PQueue({ concurrency: 5 });
  }

  /**
   * Generate fixes for a batch of issues with proper batching
   */
  async generateFixes(agentType: string, issues: any[]): Promise<IssueFix[]> {
    const config = this.config[agentType] || this.config.quality;
    const allFixes: IssueFix[] = [];

    // Split issues into manageable batches
    const batches = this.splitIntoBatches(issues, config.maxBatchSize);
    logger.info(`${agentType} agent: Processing ${issues.length} issues in ${batches.length} batches`);

    // Process batches with concurrency control
    const batchPromises = batches.map((batch, index) =>
      this.queue.add(async () => {
        logger.info(`${agentType} agent: Processing batch ${index + 1}/${batches.length} (${batch.length} issues)`);
        const fixes = await this.processBatch(agentType, batch, config);
        return fixes;
      })
    );

    const batchResults = await Promise.allSettled(batchPromises);

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        allFixes.push(...result.value);
      } else {
        logger.error(`Batch processing failed: ${result.reason}`);
      }
    }

    return allFixes;
  }

  /**
   * Process a single batch of issues
   */
  private async processBatch(
    agentType: string,
    issues: any[],
    config: FixGeneratorConfig
  ): Promise<IssueFix[]> {
    const fixes: IssueFix[] = [];

    for (const issue of issues) {
      try {
        const fix = await this.generateSingleFix(agentType, issue, config);
        fixes.push(fix);
      } catch (error) {
        logger.error(`Failed to generate fix for issue ${issue.id}:`, error);
        fixes.push(this.generateFallbackFix(issue));
      }
    }

    return fixes;
  }

  /**
   * Generate fix for a single issue
   */
  private async generateSingleFix(
    agentType: string,
    issue: any,
    config: FixGeneratorConfig
  ): Promise<IssueFix> {
    const prompt = this.buildEnhancedPrompt(agentType, issue);
    const selectedModel = this.selectModel(issue);

    let retries = 0;
    while (retries < config.maxRetries) {
      try {
        const response = await this.openai.chat.completions.create({
          model: selectedModel,
          messages: [
            { role: 'system', content: this.getSystemPrompt(agentType) },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 800
        });

        const content = response.choices[0].message.content || '';

        // Track model usage (Phase 3 - BUG-110)
        const tokensUsed = response.usage?.total_tokens || 0;
        const cost = this.estimateCost(selectedModel, tokensUsed);
        trackModelUsage(selectedModel, agentType, tokensUsed, cost);

        return this.parseFixResponse(issue, content);

      } catch (error: any) {
        retries++;
        if (retries >= config.maxRetries) {
          throw error;
        }
        logger.warn(`Retry ${retries}/${config.maxRetries} for issue ${issue.id}`);
        await this.delay(1000 * retries); // Exponential backoff
      }
    }

    return this.generateFallbackFix(issue);
  }

  /**
   * Build enhanced prompt with code context
   */
  private buildEnhancedPrompt(agentType: string, issue: any): string {
    // Extract class name from file path if available
    const fileName = issue.file ? issue.file.split('/').pop() : '';
    const className = fileName ? fileName.replace(/\.\w+$/, '') : 'YourClass';

    return `Fix this ${issue.type} issue in ${issue.language || 'Java'}:

Tool: ${issue.tool}
Type: ${issue.type}
Category: ${issue.category}
Severity: ${issue.severity}
Message: ${issue.message}
File: ${issue.file}
Line: ${issue.line}
${issue.codeSnippet ? `\nContext:\n${issue.codeSnippet}\n` : ''}

Generate a response in the following JSON format:
{
  "explanation": "Brief explanation of the issue",
  "codeSnippet": "Complete, working code with proper class/method names",
  "beforeCode": "Actual problematic code",
  "afterCode": "Fixed code with complete implementation",
  "effort": "trivial|small|medium|large",
  "confidence": "high|medium|low"
}

CRITICAL REQUIREMENTS:
- Provide COMPLETE, COMPILABLE code with actual class names (e.g., ${className})
- Include ALL necessary imports at the top of the code
- Use SPECIFIC method and variable names from the context, NOT placeholders
- Include proper error handling where applicable
- Add brief inline comments explaining the fix
- Ensure the code follows ${issue.language || 'Java'} best practices
- Make the fix directly copy-pasteable into the project
- Consider the severity (${issue.severity}) when suggesting fixes

BAD EXAMPLES (DO NOT DO THIS):
❌ "// Add validation here"
❌ "YourMethod() { /* implementation */ }"
❌ "import com.example.*;"

GOOD EXAMPLES:
✅ "import java.sql.PreparedStatement;"
✅ "public void processUser(User user) { validateUser(user); }"
✅ Complete working code with specific names`;
  }

  /**
   * Get system prompt for agent
   */
  private getSystemPrompt(agentType: string): string {
    const prompts: Record<string, string> = {
      security: `You are a security expert. Generate secure code fixes with actual implementation.
Focus on: SQL injection, XSS, path traversal, authentication, authorization, cryptography.
Always provide complete, secure code snippets that can be directly used.`,

      quality: `You are a code quality expert. Generate clean, maintainable code fixes.
Focus on: code smells, complexity, duplication, naming, documentation.
Always provide refactored code that follows best practices.`,

      performance: `You are a performance optimization expert. Generate efficient code fixes.
Focus on: algorithms, caching, database queries, memory usage, concurrency.
Always provide optimized code with performance improvements.`,

      architecture: `You are a software architect. Generate architectural fixes and patterns.
Focus on: design patterns, SOLID principles, modularity, coupling, cohesion.
Always provide code that improves the overall design.`,

      dependency: `You are a dependency management expert. Generate dependency fixes.
Focus on: version updates, vulnerability patches, compatibility issues.
Always provide specific version numbers and migration guides.`
    };

    return prompts[agentType] || prompts.quality;
  }

  /**
   * Select appropriate model based on issue complexity
   */
  private selectModel(issue: any): string {
    // Use cheaper models for simple issues
    if (issue.severity === 'low' || issue.type === 'style') {
      return 'openai/gpt-3.5-turbo';
    }

    // Use better models for complex issues
    if (issue.severity === 'critical' || issue.category === 'security') {
      return 'anthropic/claude-3-haiku-20240307';
    }

    return 'openai/gpt-3.5-turbo';
  }

  /**
   * Parse LLM response to extract fix details
   */
  private parseFixResponse(issue: any, content: string): IssueFix {
    try {
      // Try to parse as JSON first
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const codeSnippet = parsed.codeSnippet || parsed.afterCode || '';

        // Validate code snippet quality
        const isQualityCode = this.validateCodeQuality(codeSnippet, issue);

        return {
          issueId: issue.id,
          fix: parsed.explanation || 'Fix generated',
          codeSnippet: isQualityCode ? codeSnippet : this.generateDefaultSnippet(issue),
          explanation: parsed.explanation || 'Apply the fix shown in the code snippet',
          confidence: isQualityCode ? (parsed.confidence || 'medium') : 'low',
          effort: parsed.effort || 'small'
        };
      }
    } catch (error) {
      // Fallback to text parsing
    }

    // Extract code blocks
    const codeMatch = content.match(/```[\s\S]*?```/);
    const codeSnippet = codeMatch
      ? codeMatch[0].replace(/```\w*\n?/g, '').trim()
      : this.generateDefaultSnippet(issue);

    // Validate extracted code
    const isQualityCode = this.validateCodeQuality(codeSnippet, issue);

    return {
      issueId: issue.id,
      fix: content.split('\n')[0] || 'Fix generated',
      codeSnippet: isQualityCode ? codeSnippet : this.generateDefaultSnippet(issue),
      explanation: content,
      confidence: isQualityCode ? 'medium' : 'low',
      effort: 'small'
    };
  }

  /**
   * Validate that generated code has good quality and specificity
   */
  private validateCodeQuality(code: string, issue: any): boolean {
    if (!code || code.length < 20) return false;

    // Check for placeholder patterns (bad)
    const badPatterns = [
      /YourClass(?!Name)/i,  // "YourClass" but not "YourClassName"
      /YourMethod/i,
      /\/\/ implementation/i,
      /\/\/ Add.*here/i,
      /\/\/ TODO/i,
      /\.\.\./,  // Ellipsis indicating incomplete code
      /\/\* .* \*\//,  // Generic comments
      /import.*\.\*/,  // Wildcard imports
    ];

    for (const pattern of badPatterns) {
      if (pattern.test(code)) {
        logger.warn(`Code validation failed for ${issue.id}: matched pattern ${pattern}`);
        return false;
      }
    }

    // Check for good patterns (required for quality)
    const hasImports = /^import\s+[\w.]+;/m.test(code);
    const hasSpecificNames = /class\s+\w+|void\s+\w+|public\s+\w+/i.test(code);
    const hasImplementation = code.split('\n').length >= 3;  // At least 3 lines

    return hasSpecificNames && hasImplementation;
  }

  /**
   * Generate default code snippet based on issue type
   */
  private generateDefaultSnippet(issue: any): string {
    const snippets: Record<string, string> = {
      'NP_NULL_ON_SOME_PATH': `if (${issue.variable || 'object'} != null) {
    ${issue.variable || 'object'}.method();
}`,

      'SQL_INJECTION': `String query = "SELECT * FROM table WHERE id = ?";
PreparedStatement pstmt = connection.prepareStatement(query);
pstmt.setString(1, userInput);
ResultSet rs = pstmt.executeQuery();`,

      'EmptyCatchBlock': `try {
    // existing code
} catch (Exception e) {
    logger.error("Error occurred: ", e);
    throw new ServiceException("Operation failed", e);
}`,

      'UnusedLocalVariable': `// Remove the unused variable declaration`,

      'CyclomaticComplexity': `// Extract complex logic into separate methods:
private void processData(Data data) {
    validateData(data);
    transformData(data);
    saveData(data);
}`,

      'vulnerability': `<!-- Update dependency in pom.xml -->
<dependency>
    <groupId>${issue.groupId || 'org.example'}</groupId>
    <artifactId>${issue.artifactId || 'library'}</artifactId>
    <version>${issue.fixedVersion || 'LATEST_SECURE_VERSION'}</version>
</dependency>`
    };

    // Try exact match first
    if (snippets[issue.type]) {
      return snippets[issue.type];
    }

    // Try partial match
    for (const [key, snippet] of Object.entries(snippets)) {
      if (issue.type.includes(key) || key.includes(issue.type)) {
        return snippet;
      }
    }

    // Generic snippet
    return `// Fix for ${issue.type}:\n// Apply appropriate fix based on the issue description`;
  }

  /**
   * Generate fallback fix when API fails
   */
  private generateFallbackFix(issue: any): IssueFix {
    return {
      issueId: issue.id,
      fix: `Fix ${issue.type} issue`,
      codeSnippet: this.generateDefaultSnippet(issue),
      explanation: `${issue.message}. Apply the suggested code fix.`,
      confidence: 'low',
      effort: 'small'
    };
  }

  /**
   * Split issues into batches
   */
  private splitIntoBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Delay helper for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate comprehensive fix summary
   */
  async generateFixSummary(fixes: IssueFix[]): Promise<string> {
    const byEffort = {
      trivial: fixes.filter(f => f.effort === 'trivial').length,
      small: fixes.filter(f => f.effort === 'small').length,
      medium: fixes.filter(f => f.effort === 'medium').length,
      large: fixes.filter(f => f.effort === 'large').length
    };

    const byConfidence = {
      high: fixes.filter(f => f.confidence === 'high').length,
      medium: fixes.filter(f => f.confidence === 'medium').length,
      low: fixes.filter(f => f.confidence === 'low').length
    };

    return `## Fix Summary

### Total Fixes Generated: ${fixes.length}

#### By Effort:
- Trivial: ${byEffort.trivial} fixes (< 5 min each)
- Small: ${byEffort.small} fixes (5-30 min each)
- Medium: ${byEffort.medium} fixes (30-120 min each)
- Large: ${byEffort.large} fixes (> 2 hours each)

#### By Confidence:
- High Confidence: ${byConfidence.high} fixes
- Medium Confidence: ${byConfidence.medium} fixes
- Low Confidence: ${byConfidence.low} fixes

#### Estimated Total Effort:
${this.calculateTotalEffort(byEffort)} hours

#### Sample Fixes:
${fixes.slice(0, 3).map(f => `
**${f.issueId}** (${f.confidence} confidence, ${f.effort} effort)
${f.explanation}

\`\`\`java
${f.codeSnippet}
\`\`\`
`).join('\n')}`;
  }

  private calculateTotalEffort(byEffort: any): number {
    const hours =
      byEffort.trivial * 0.08 +  // 5 min
      byEffort.small * 0.5 +      // 30 min
      byEffort.medium * 1.5 +     // 90 min
      byEffort.large * 3;         // 3 hours

    return Math.round(hours * 10) / 10;
  }

  /**
   * Estimate cost based on model and tokens (Phase 3 - BUG-110)
   */
  private estimateCost(model: string, tokens: number): number {
    // Approximate pricing per 1M tokens (input + output averaged)
    const pricing: Record<string, number> = {
      'openai/gpt-3.5-turbo': 1.5,  // $1.50 per 1M tokens
      'openai/gpt-4o-mini': 0.6,    // $0.60 per 1M tokens
      'anthropic/claude-3-haiku': 1.25,  // $1.25 per 1M tokens
      'anthropic/claude-3-haiku-20240307': 1.25,
      'anthropic/claude-3-sonnet': 15.0,  // $15.00 per 1M tokens
    };

    const pricePerMillion = pricing[model] || 2.0;  // Default fallback
    return (tokens / 1_000_000) * pricePerMillion;
  }
}

export const fixGenerator = new EnhancedFixGenerator();