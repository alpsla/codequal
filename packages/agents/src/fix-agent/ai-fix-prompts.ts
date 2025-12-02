/**
 * Dynamic AI Fix Prompt Builder
 *
 * Generates specific prompts dynamically for ANY rule, not just hardcoded ones.
 * Uses rule metadata, issue description, and context to build targeted prompts.
 *
 * KEY INSIGHT: More specific prompts = LOWER cost + HIGHER accuracy
 *
 * | Generic Prompt | Specific Prompt |
 * |----------------|-----------------|
 * | ~500 input     | ~800 input      |
 * | ~1000 output   | ~400 output     |
 * | Total: 1500    | Total: 1200     |
 * | 60% success    | 90%+ success    |
 * | Often retry    | Usually 1-shot  |
 *
 * Why dynamic prompts work:
 * - Include the EXACT issue message (AI knows what to fix)
 * - Include the EXACT rule ID (AI can look up best practices)
 * - Include the EXACT code context (AI sees the problem)
 * - Constrain output format (less rambling = fewer tokens)
 */

export interface AIFixPrompt {
  systemPrompt: string;
  userPromptTemplate: string;
  outputFormat: 'diff' | 'full-file' | 'code-block';
  maxTokens: number;
  temperature: number;  // Lower = more deterministic
  requiredContext: ('file' | 'function' | 'class' | 'imports' | 'related-files')[];
}

export interface IssueContext {
  ruleId: string;
  tool: string;
  message: string;
  category: 'security' | 'quality' | 'performance' | 'style' | 'maintainability' | 'compatibility' | 'dependency';
  severity: 'critical' | 'high' | 'medium' | 'low';
  filePath: string;
  lineNumber: number;
  language: string;
  codeContext: string;
  snippet?: string;
  // Optional extracted metadata
  variableName?: string;
  functionName?: string;
  className?: string;
  value?: string;
  framework?: string;
}

/**
 * Category-specific system prompt templates
 * These provide the "role" and general constraints for each category
 */
const CATEGORY_SYSTEM_PROMPTS: Record<string, string> = {
  security: `You are a security engineer generating a precise code fix.

OUTPUT RULES:
1. Output ONLY the fixed code block - no explanations
2. Preserve all existing functionality
3. Use language-appropriate security patterns
4. Never introduce new vulnerabilities
5. If the fix requires architectural changes, output a comment explaining what's needed

SECURITY PRINCIPLES:
- Defense in depth (multiple layers of protection)
- Principle of least privilege
- Fail securely (deny by default)
- Don't trust user input`,

  quality: `You are a code quality engineer generating a precise code fix.

OUTPUT RULES:
1. Output ONLY the fixed code block - no explanations
2. Preserve all existing functionality
3. Follow language idioms and best practices
4. Maintain consistency with surrounding code style
5. If the fix requires context you don't have, output a comment explaining what's needed

QUALITY PRINCIPLES:
- Single responsibility
- Clear naming that reveals intent
- Minimize side effects
- Handle edge cases`,

  performance: `You are a performance engineer generating a precise code fix.

OUTPUT RULES:
1. Output ONLY the fixed code block - no explanations
2. Preserve all existing functionality and output
3. Use language-appropriate optimization patterns
4. Don't micro-optimize at the expense of readability
5. If optimization depends on runtime data you don't have, explain in a comment

PERFORMANCE PRINCIPLES:
- Avoid unnecessary allocations
- Prefer batch operations over loops
- Cache expensive computations
- Use appropriate data structures`,

  style: `You are a code style engineer generating a precise code fix.

OUTPUT RULES:
1. Output ONLY the fixed code block - no explanations
2. Follow the language's standard style guide
3. Maintain consistency with surrounding code
4. Preserve all functionality exactly

STYLE PRINCIPLES:
- Consistent formatting
- Idiomatic patterns for the language
- Clear and readable code`,

  maintainability: `You are a software engineer improving code maintainability.

OUTPUT RULES:
1. Output ONLY the fixed code block - no explanations
2. Improve clarity without changing behavior
3. Add documentation if needed
4. Refactor for better structure

MAINTAINABILITY PRINCIPLES:
- Self-documenting code
- Modular design
- Clear abstractions`,

  compatibility: `You are a software engineer fixing compatibility issues.

OUTPUT RULES:
1. Output ONLY the fixed code block - no explanations
2. Update deprecated APIs to modern equivalents
3. Maintain backward compatibility if possible
4. Follow migration guides for the language/framework`,

  dependency: `You are a software engineer fixing dependency issues.

OUTPUT RULES:
1. Output ONLY the updated configuration - no explanations
2. Use the latest secure versions
3. Maintain compatibility with other dependencies
4. Follow semantic versioning principles`,
};

/**
 * Build a dynamic user prompt based on issue context
 */
function buildDynamicUserPrompt(context: IssueContext): string {
  const parts: string[] = [];

  // Header with rule identification
  parts.push(`FIX THIS ${context.category.toUpperCase()} ISSUE:`);
  parts.push('');
  parts.push(`RULE: ${context.ruleId} (${context.tool})`);
  parts.push(`SEVERITY: ${context.severity}`);
  parts.push(`MESSAGE: ${context.message}`);
  parts.push('');

  // Location
  parts.push(`FILE: ${context.filePath}`);
  parts.push(`LINE: ${context.lineNumber}`);
  parts.push('');

  // Code context
  parts.push('CODE:');
  parts.push('```' + context.language);
  parts.push(context.codeContext || context.snippet || '// No code context available');
  parts.push('```');
  parts.push('');

  // Additional metadata if available
  const metadata: string[] = [];
  if (context.variableName) metadata.push(`Variable: ${context.variableName}`);
  if (context.functionName) metadata.push(`Function: ${context.functionName}`);
  if (context.className) metadata.push(`Class: ${context.className}`);
  if (context.value) metadata.push(`Value: ${context.value}`);
  if (context.framework) metadata.push(`Framework: ${context.framework}`);

  if (metadata.length > 0) {
    parts.push('CONTEXT:');
    metadata.forEach(m => parts.push(`- ${m}`));
    parts.push('');
  }

  // Clear instruction
  parts.push('OUTPUT: Generate ONLY the corrected code. No explanations.');

  return parts.join('\n');
}

/**
 * Determine required context based on issue type
 */
function determineRequiredContext(context: IssueContext): ('file' | 'function' | 'class' | 'imports' | 'related-files')[] {
  const required: ('file' | 'function' | 'class' | 'imports' | 'related-files')[] = ['file'];

  // Security issues often need imports context
  if (context.category === 'security') {
    required.push('function', 'imports');
  }

  // Quality issues about unused variables need function/class context
  if (context.message.toLowerCase().includes('unused') ||
      context.message.toLowerCase().includes('undefined')) {
    required.push('function', 'class');
  }

  // Performance issues need function context
  if (context.category === 'performance') {
    required.push('function');
  }

  // N+1 queries need related files for ORM patterns
  if (context.message.toLowerCase().includes('n+1') ||
      context.message.toLowerCase().includes('query')) {
    required.push('imports', 'related-files');
  }

  return Array.from(new Set(required));  // Deduplicate
}

/**
 * Calculate appropriate max tokens based on issue complexity
 */
function calculateMaxTokens(context: IssueContext): number {
  // Base tokens by category
  const baseBySeverity: Record<string, number> = {
    critical: 800,
    high: 600,
    medium: 500,
    low: 400,
  };

  let tokens = baseBySeverity[context.severity] || 500;

  // Adjust for code context length
  const contextLength = (context.codeContext || '').length;
  if (contextLength > 500) tokens += 200;  // Longer context may need longer fix

  // Security fixes may need more tokens for proper patterns
  if (context.category === 'security') tokens += 100;

  return Math.min(tokens, 1000);  // Cap at 1000
}

/**
 * Calculate appropriate temperature based on issue type
 */
function calculateTemperature(context: IssueContext): number {
  // Security and style fixes should be very deterministic
  if (context.category === 'security') return 0.1;
  if (context.category === 'style') return 0.1;

  // Quality and performance can have slight variation
  if (context.category === 'quality') return 0.2;
  if (context.category === 'performance') return 0.2;

  // Maintainability may need more creativity
  if (context.category === 'maintainability') return 0.3;

  return 0.2;  // Default
}

/**
 * Generate a dynamic AI prompt for any issue
 * This is the main entry point - works for ANY rule, not just known ones
 */
export function generateDynamicPrompt(context: IssueContext): AIFixPrompt {
  // Get category-specific system prompt
  const systemPrompt = CATEGORY_SYSTEM_PROMPTS[context.category] || CATEGORY_SYSTEM_PROMPTS.quality;

  // Enhance system prompt with rule-specific information
  const enhancedSystemPrompt = `${systemPrompt}

SPECIFIC ISSUE: ${context.ruleId}
This is a ${context.severity} ${context.category} issue detected by ${context.tool}.
The issue is: "${context.message}"

Fix this specific problem. Output only the corrected code.`;

  return {
    systemPrompt: enhancedSystemPrompt,
    userPromptTemplate: buildDynamicUserPrompt(context),
    outputFormat: 'code-block',
    maxTokens: calculateMaxTokens(context),
    temperature: calculateTemperature(context),
    requiredContext: determineRequiredContext(context),
  };
}

/**
 * Build the complete prompt for AI fix generation
 * Returns ready-to-use prompt for the AI model
 */
export function buildAIFixRequest(
  context: IssueContext
): { system: string; user: string; maxTokens: number; temperature: number } {
  const prompt = generateDynamicPrompt(context);

  return {
    system: prompt.systemPrompt,
    user: prompt.userPromptTemplate,
    maxTokens: prompt.maxTokens,
    temperature: prompt.temperature,
  };
}

// =============================================================================
// KNOWN PATTERNS - Optimized prompts for common issue types
// These override dynamic prompts when we have high-confidence patterns
// =============================================================================

/**
 * Known patterns that get special handling
 * Maps rule ID patterns to optimized prompt customizations
 */
const KNOWN_PATTERNS: {
  pattern: RegExp;
  category: string;
  systemAddendum: string;
  outputHint: string;
}[] = [
  // Hardcoded secrets
  {
    pattern: /S105|S106|S107|hardcoded.*secret|hardcoded.*password|hardcoded.*key/i,
    category: 'security',
    systemAddendum: `
SPECIFIC FIX PATTERN:
- Replace hardcoded secrets with environment variable lookups
- Python: os.environ.get('VAR_NAME', '') or os.getenv('VAR_NAME')
- JavaScript/TypeScript: process.env.VAR_NAME || ''
- Java: System.getenv("VAR_NAME")
- Go: os.Getenv("VAR_NAME")
- NEVER include actual secret values in output`,
    outputHint: 'Use environment variable with name based on context.',
  },

  // SQL Injection
  {
    pattern: /S608|sql.*injection|sqli/i,
    category: 'security',
    systemAddendum: `
SPECIFIC FIX PATTERN:
- Convert string concatenation to parameterized queries
- Python psycopg2: cursor.execute("SELECT * FROM t WHERE id = %s", (id,))
- Python SQLAlchemy: session.query(User).filter(User.id == id)
- Node.js pg: client.query('SELECT * FROM t WHERE id = $1', [id])
- Java JDBC: PreparedStatement with setString/setInt
- NEVER use string formatting with user input`,
    outputHint: 'Identify the database library and generate parameterized query.',
  },

  // Command Injection
  {
    pattern: /S602|S603|subprocess|shell.*true|command.*injection/i,
    category: 'security',
    systemAddendum: `
SPECIFIC FIX PATTERN:
- Remove shell=True when possible, use command as list
- Python: subprocess.run(['cmd', arg], shell=False, check=True)
- JavaScript: child_process.execFile() instead of exec()
- If shell features needed, use shlex.quote() to escape`,
    outputHint: 'Determine if shell features are needed. Generate safe subprocess call.',
  },

  // Unused variables
  {
    pattern: /F841|unused.*var|no-unused-vars/i,
    category: 'quality',
    systemAddendum: `
SPECIFIC FIX PATTERN:
- Analyze if variable was meant to be used somewhere
- If debugging leftover: remove it
- If intentionally unused (interface compliance): prefix with _
- For destructuring: const { used, ..._ } = obj;`,
    outputHint: 'Analyze context and determine: remove, use, or prefix with underscore.',
  },

  // Empty catch blocks
  {
    pattern: /empty.*catch|bare.*except|EmptyCatchBlock/i,
    category: 'quality',
    systemAddendum: `
SPECIFIC FIX PATTERN:
- At minimum, add logging to track the error
- For expected errors: catch specific exception, log at warning level
- For unexpected errors: re-raise after logging
- Use language-appropriate logging patterns`,
    outputHint: 'Add appropriate error handling. Determine if error should be logged, re-raised, or handled.',
  },

  // N+1 queries
  {
    pattern: /n\+1|N\+1|eager.*load/i,
    category: 'performance',
    systemAddendum: `
SPECIFIC FIX PATTERN:
- Django: select_related() for FK, prefetch_related() for M2M
- SQLAlchemy: joinedload() or subqueryload()
- ActiveRecord: includes() or eager_load()
- Prisma: include: { relation: true }
- TypeORM: relations: ['relation'] or leftJoinAndSelect`,
    outputHint: 'Add appropriate eager loading to eliminate N+1 queries.',
  },

  // String concatenation in loop
  {
    pattern: /string.*concat|InefficientString|StringBuffer/i,
    category: 'performance',
    systemAddendum: `
SPECIFIC FIX PATTERN:
- Python: list.append() then ''.join()
- JavaScript: array.push() then join(), or template literals
- Java: StringBuilder
- Go: strings.Builder`,
    outputHint: 'Convert to efficient string building pattern.',
  },
];

/**
 * Get optimized prompt for known patterns
 * Falls back to dynamic prompt if pattern not recognized
 */
export function getOptimizedPrompt(context: IssueContext): AIFixPrompt {
  // Check if this matches a known pattern
  for (const known of KNOWN_PATTERNS) {
    if (known.pattern.test(context.ruleId) || known.pattern.test(context.message)) {
      // Generate base dynamic prompt
      const basePrompt = generateDynamicPrompt(context);

      // Enhance with known pattern specifics
      return {
        ...basePrompt,
        systemPrompt: basePrompt.systemPrompt + known.systemAddendum,
        userPromptTemplate: basePrompt.userPromptTemplate + `\n\nHINT: ${known.outputHint}`,
        temperature: 0.1,  // More deterministic for known patterns
      };
    }
  }

  // No known pattern - use fully dynamic prompt
  return generateDynamicPrompt(context);
}

// =============================================================================
// LEGACY EXPORTS - For backward compatibility with existing code
// =============================================================================

// Legacy interface - kept for compatibility
export function getAIFixPrompt(
  ruleId: string,
  category: 'security' | 'quality' | 'performance'
): AIFixPrompt | null {
  // Create minimal context for legacy calls
  const context: IssueContext = {
    ruleId,
    tool: 'unknown',
    message: ruleId,  // Use ruleId as message fallback
    category,
    severity: 'medium',
    filePath: '',
    lineNumber: 0,
    language: '',
    codeContext: '',
  };

  return getOptimizedPrompt(context);
}

// Legacy hardcoded prompts - kept for reference but not used
export const SECURITY_FIX_PROMPTS: Record<string, AIFixPrompt> = {};
export const QUALITY_FIX_PROMPTS: Record<string, AIFixPrompt> = {};
export const PERFORMANCE_FIX_PROMPTS: Record<string, AIFixPrompt> = {};
