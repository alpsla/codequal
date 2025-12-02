/**
 * AI Fix Prompts
 *
 * Dedicated prompts for Tier 3 AI-generated fixes.
 * Each prompt is tailored to the specific issue type and includes:
 * - Context requirements
 * - Safety constraints
 * - Output format specifications
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
 * Specific prompts:
 * - Eliminate explanation tokens (AI knows what to do)
 * - Reduce hallucination (exact fix pattern provided)
 * - Lower temperature = deterministic output
 * - Fewer retries = lower total cost
 *
 * These prompts are used when:
 * 1. No Tier 1 (native --fix) support exists
 * 2. No Tier 2 (dedicated fixer) tool exists
 * 3. The issue type allows AI assistance (aiCanHelp: true)
 */

export interface AIFixPrompt {
  systemPrompt: string;
  userPromptTemplate: string;
  outputFormat: 'diff' | 'full-file' | 'code-block';
  maxTokens: number;
  temperature: number;  // Lower = more deterministic
  requiredContext: ('file' | 'function' | 'class' | 'imports' | 'related-files')[];
}

/**
 * Security Fix Prompts
 */
export const SECURITY_FIX_PROMPTS: Record<string, AIFixPrompt> = {
  'hardcoded-password': {
    systemPrompt: `You are a security engineer fixing hardcoded secrets.

RULES:
1. Replace hardcoded secrets with environment variable lookups
2. Use the appropriate method for the language:
   - Python: os.environ.get('VAR_NAME', '') or os.getenv('VAR_NAME')
   - JavaScript/TypeScript: process.env.VAR_NAME || ''
   - Java: System.getenv("VAR_NAME")
   - Go: os.Getenv("VAR_NAME")
3. Add a comment noting the environment variable name
4. NEVER include actual secret values in your response
5. Suggest appropriate environment variable names based on context`,

    userPromptTemplate: `Fix this hardcoded secret vulnerability:

FILE: {{filePath}}
LINE: {{lineNumber}}
CODE:
\`\`\`{{language}}
{{codeContext}}
\`\`\`

ISSUE: {{issueDescription}}

Generate ONLY the fixed code. Use environment variable with name based on context.`,

    outputFormat: 'code-block',
    maxTokens: 500,
    temperature: 0.2,
    requiredContext: ['file', 'imports'],
  },

  'sql-injection': {
    systemPrompt: `You are a security engineer fixing SQL injection vulnerabilities.

RULES:
1. Convert string concatenation/formatting to parameterized queries
2. Detect the database library being used and use appropriate syntax:
   - Python psycopg2: cursor.execute("SELECT * FROM t WHERE id = %s", (id,))
   - Python SQLAlchemy: session.query(User).filter(User.id == id)
   - Node.js pg: client.query('SELECT * FROM t WHERE id = $1', [id])
   - Java JDBC: PreparedStatement with setString/setInt
3. NEVER use string formatting with user input
4. If ORM is available, prefer ORM methods over raw SQL
5. Add input validation as defense-in-depth`,

    userPromptTemplate: `Fix this SQL injection vulnerability:

FILE: {{filePath}}
LINE: {{lineNumber}}
CODE:
\`\`\`{{language}}
{{codeContext}}
\`\`\`

ISSUE: {{issueDescription}}

Identify the database library and generate parameterized query fix.`,

    outputFormat: 'code-block',
    maxTokens: 800,
    temperature: 0.2,
    requiredContext: ['file', 'function', 'imports'],
  },

  'command-injection': {
    systemPrompt: `You are a security engineer fixing command injection vulnerabilities.

RULES:
1. Remove shell=True when possible, use command as list
2. If shell features are needed (pipes, wildcards), use shlex.quote() to escape
3. Validate/sanitize input before using in commands
4. Prefer subprocess.run() over subprocess.call()
5. Use check=True to catch errors
6. If command must accept user input, whitelist allowed values

LANGUAGE-SPECIFIC:
- Python: subprocess.run(['cmd', arg], shell=False, check=True)
- JavaScript: child_process.execFile() instead of exec()
- Go: exec.Command() with explicit arguments`,

    userPromptTemplate: `Fix this command injection vulnerability:

FILE: {{filePath}}
LINE: {{lineNumber}}
CODE:
\`\`\`{{language}}
{{codeContext}}
\`\`\`

ISSUE: {{issueDescription}}

Determine if shell features are needed. Generate safe subprocess call.`,

    outputFormat: 'code-block',
    maxTokens: 600,
    temperature: 0.2,
    requiredContext: ['file', 'function'],
  },

  'weak-cryptography': {
    systemPrompt: `You are a security engineer fixing weak cryptography usage.

RULES:
1. Replace weak hashes with strong alternatives:
   - MD5/SHA1 for integrity → SHA-256 or SHA-3
   - MD5/SHA1 for passwords → bcrypt, scrypt, or Argon2
2. Replace weak ciphers:
   - DES → AES-256
   - ECB mode → GCM or CBC with HMAC
3. Use secure random number generators
4. Maintain API compatibility where possible
5. Add migration notes if existing hashes need rehashing`,

    userPromptTemplate: `Fix this weak cryptography vulnerability:

FILE: {{filePath}}
LINE: {{lineNumber}}
CODE:
\`\`\`{{language}}
{{codeContext}}
\`\`\`

ISSUE: {{issueDescription}}

Determine if this is for passwords or data integrity. Choose appropriate replacement.`,

    outputFormat: 'code-block',
    maxTokens: 600,
    temperature: 0.2,
    requiredContext: ['file', 'function', 'imports'],
  },

  'path-traversal': {
    systemPrompt: `You are a security engineer fixing path traversal vulnerabilities.

RULES:
1. Resolve the real path and validate it stays within allowed directory
2. Use language-appropriate path functions:
   - Python: os.path.realpath() + startswith check
   - JavaScript: path.resolve() + startswith check
   - Java: Paths.get().normalize().startsWith()
   - Go: filepath.Clean() + strings.HasPrefix()
3. Reject paths containing ".." after validation
4. Use allowlist of permitted paths/patterns when possible
5. Log rejected path traversal attempts for security monitoring`,

    userPromptTemplate: `Fix this path traversal vulnerability:

FILE: {{filePath}}
LINE: {{lineNumber}}
CODE:
\`\`\`{{language}}
{{codeContext}}
\`\`\`

ISSUE: {{issueDescription}}

Add path validation that ensures resolved path stays within base directory.`,

    outputFormat: 'code-block',
    maxTokens: 600,
    temperature: 0.2,
    requiredContext: ['file', 'function'],
  },
};

/**
 * Quality Fix Prompts
 */
export const QUALITY_FIX_PROMPTS: Record<string, AIFixPrompt> = {
  'unused-variable': {
    systemPrompt: `You are a code quality engineer fixing unused variables.

RULES:
1. Analyze the context to determine the intent:
   - If variable was meant to be used, find where it should be used
   - If variable is a debugging leftover, remove it
   - If variable is intentionally unused (e.g., loop counter), prefix with _
2. For destructuring, use rest operator to indicate unused: const { used, ..._ } = obj;
3. For function parameters that must stay (interface compliance), prefix with _
4. Check if removing the variable would cause side effects`,

    userPromptTemplate: `Fix this unused variable:

FILE: {{filePath}}
LINE: {{lineNumber}}
CODE:
\`\`\`{{language}}
{{codeContext}}
\`\`\`

VARIABLE: {{variableName}}
ISSUE: {{issueDescription}}

Analyze context and determine: remove, use, or prefix with underscore.`,

    outputFormat: 'code-block',
    maxTokens: 400,
    temperature: 0.3,
    requiredContext: ['function', 'class'],
  },

  'empty-catch-block': {
    systemPrompt: `You are a code quality engineer fixing empty catch blocks.

RULES:
1. At minimum, add logging to track the error
2. For expected errors: catch specific exception type, log at warning level
3. For unexpected errors: re-raise after logging
4. Consider if the error should propagate or be handled
5. Use language-appropriate logging:
   - Python: logging.exception() or logger.error()
   - JavaScript: console.error() or logger.error()
   - Java: logger.error("message", e)`,

    userPromptTemplate: `Fix this empty catch block:

FILE: {{filePath}}
LINE: {{lineNumber}}
CODE:
\`\`\`{{language}}
{{codeContext}}
\`\`\`

ISSUE: {{issueDescription}}

Add appropriate error handling. Determine if error should be logged, re-raised, or handled.`,

    outputFormat: 'code-block',
    maxTokens: 500,
    temperature: 0.3,
    requiredContext: ['function', 'imports'],
  },

  'magic-number': {
    systemPrompt: `You are a code quality engineer extracting magic numbers to constants.

RULES:
1. Create a descriptively named constant that explains the value's purpose
2. Use UPPER_SNAKE_CASE for constants
3. Place constant at appropriate scope:
   - Class-level if used in class
   - Module/file level if used across functions
   - Near usage if only used once
4. Add brief comment if name isn't self-explanatory
5. Common patterns:
   - 86400 → SECONDS_PER_DAY
   - 1000 → commonly MAX_ITEMS or MILLISECONDS_PER_SECOND
   - HTTP codes → HTTP_OK, HTTP_NOT_FOUND`,

    userPromptTemplate: `Fix this magic number:

FILE: {{filePath}}
LINE: {{lineNumber}}
CODE:
\`\`\`{{language}}
{{codeContext}}
\`\`\`

MAGIC NUMBER: {{value}}
ISSUE: {{issueDescription}}

Create descriptive constant name based on context. Show constant definition and usage.`,

    outputFormat: 'code-block',
    maxTokens: 400,
    temperature: 0.3,
    requiredContext: ['function', 'class'],
  },
};

/**
 * Performance Fix Prompts
 */
export const PERFORMANCE_FIX_PROMPTS: Record<string, AIFixPrompt> = {
  'string-concat-in-loop': {
    systemPrompt: `You are a performance engineer fixing string concatenation in loops.

RULES:
1. Replace += with appropriate pattern:
   - Python: list.append() then ''.join()
   - JavaScript: array.push() then join(), or template literals
   - Java: StringBuilder
   - Go: strings.Builder
2. Preserve the original logic and output format
3. Handle separator between items if needed
4. Consider f-strings/template literals for complex formatting`,

    userPromptTemplate: `Fix this string concatenation in loop:

FILE: {{filePath}}
LINE: {{lineNumber}}
CODE:
\`\`\`{{language}}
{{codeContext}}
\`\`\`

ISSUE: {{issueDescription}}

Convert to efficient string building pattern for {{language}}.`,

    outputFormat: 'code-block',
    maxTokens: 500,
    temperature: 0.2,
    requiredContext: ['function'],
  },

  'object-creation-in-loop': {
    systemPrompt: `You are a performance engineer optimizing object creation.

RULES:
1. If object doesn't depend on loop variable, hoist outside loop
2. Common patterns to hoist:
   - Compiled regex patterns
   - Date formatters
   - Database connections
   - Configuration objects
3. If object DOES depend on loop variable, leave it (it's correct)
4. Consider object pooling for expensive objects`,

    userPromptTemplate: `Fix this object creation in loop:

FILE: {{filePath}}
LINE: {{lineNumber}}
CODE:
\`\`\`{{language}}
{{codeContext}}
\`\`\`

OBJECT TYPE: {{objectType}}
ISSUE: {{issueDescription}}

Analyze if object depends on loop variable. If not, hoist outside loop.`,

    outputFormat: 'code-block',
    maxTokens: 500,
    temperature: 0.2,
    requiredContext: ['function'],
  },

  'n-plus-one-query': {
    systemPrompt: `You are a performance engineer fixing N+1 query problems.

RULES:
1. Detect ORM/framework and use appropriate eager loading:
   - Django: select_related() for FK, prefetch_related() for M2M
   - SQLAlchemy: joinedload() or subqueryload()
   - ActiveRecord: includes() or eager_load()
   - Prisma: include: { relation: true }
   - TypeORM: relations: ['relation'] or leftJoinAndSelect
2. Consider if all related data is actually needed
3. For complex cases, suggest batch loading pattern`,

    userPromptTemplate: `Fix this N+1 query issue:

FILE: {{filePath}}
LINE: {{lineNumber}}
CODE:
\`\`\`{{language}}
{{codeContext}}
\`\`\`

ISSUE: {{issueDescription}}
ORM/FRAMEWORK: {{framework}}

Add appropriate eager loading to eliminate N+1 queries.`,

    outputFormat: 'code-block',
    maxTokens: 600,
    temperature: 0.2,
    requiredContext: ['function', 'imports', 'related-files'],
  },
};

/**
 * Get the appropriate AI prompt for an issue
 */
export function getAIFixPrompt(
  ruleId: string,
  category: 'security' | 'quality' | 'performance'
): AIFixPrompt | null {
  const prompts = {
    security: SECURITY_FIX_PROMPTS,
    quality: QUALITY_FIX_PROMPTS,
    performance: PERFORMANCE_FIX_PROMPTS,
  };

  const categoryPrompts = prompts[category];

  // Direct match
  if (categoryPrompts[ruleId]) {
    return categoryPrompts[ruleId];
  }

  // Pattern matching
  const patterns: Record<string, string> = {
    // Security
    'S105|S106|S107|hardcoded': 'hardcoded-password',
    'S608|sql.*injection': 'sql-injection',
    'S602|subprocess|shell.*true': 'command-injection',
    'S303|S304|S324|md5|sha1|weak': 'weak-cryptography',
    'path.*traversal': 'path-traversal',

    // Quality
    'F841|unused.*var': 'unused-variable',
    'empty.*catch': 'empty-catch-block',
    'magic.*number': 'magic-number',

    // Performance
    'string.*concat|InefficientString': 'string-concat-in-loop',
    'object.*loop|Instantiating.*Loop': 'object-creation-in-loop',
    'n\\+1|N\\+1': 'n-plus-one-query',
  };

  for (const [pattern, key] of Object.entries(patterns)) {
    if (new RegExp(pattern, 'i').test(ruleId)) {
      return categoryPrompts[key] || null;
    }
  }

  return null;
}

/**
 * Build the complete prompt for AI fix generation
 */
export function buildAIFixRequest(
  prompt: AIFixPrompt,
  context: {
    filePath: string;
    lineNumber: number;
    language: string;
    codeContext: string;
    issueDescription: string;
    variableName?: string;
    value?: string;
    objectType?: string;
    framework?: string;
  }
): { system: string; user: string; maxTokens: number; temperature: number } {
  let userPrompt = prompt.userPromptTemplate;

  // Replace template variables
  userPrompt = userPrompt.replace(/\{\{filePath\}\}/g, context.filePath);
  userPrompt = userPrompt.replace(/\{\{lineNumber\}\}/g, String(context.lineNumber));
  userPrompt = userPrompt.replace(/\{\{language\}\}/g, context.language);
  userPrompt = userPrompt.replace(/\{\{codeContext\}\}/g, context.codeContext);
  userPrompt = userPrompt.replace(/\{\{issueDescription\}\}/g, context.issueDescription);

  // Optional replacements
  if (context.variableName) {
    userPrompt = userPrompt.replace(/\{\{variableName\}\}/g, context.variableName);
  }
  if (context.value) {
    userPrompt = userPrompt.replace(/\{\{value\}\}/g, context.value);
  }
  if (context.objectType) {
    userPrompt = userPrompt.replace(/\{\{objectType\}\}/g, context.objectType);
  }
  if (context.framework) {
    userPrompt = userPrompt.replace(/\{\{framework\}\}/g, context.framework);
  }

  return {
    system: prompt.systemPrompt,
    user: userPrompt,
    maxTokens: prompt.maxTokens,
    temperature: prompt.temperature,
  };
}
