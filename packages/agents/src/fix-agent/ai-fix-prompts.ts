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
  /**
   * Output format:
   * - 'diff': Unified diff format
   * - 'full-file': Complete file content
   * - 'code-block': Just the fixed code block
   * - 'markdown': Structured markdown (for recommendations, not code fixes)
   */
  outputFormat: 'diff' | 'full-file' | 'code-block' | 'markdown';
  maxTokens: number;
  temperature: number;  // Lower = more deterministic
  requiredContext: ('file' | 'function' | 'class' | 'imports' | 'related-files')[];
  /**
   * Whether this is a recommendation (not a code fix)
   * Recommendations provide actionable steps instead of code changes
   */
  isRecommendation?: boolean;
}

/**
 * Issue categories for AI fix generation
 *
 * CODE-FIXABLE categories (generate code fixes):
 * - security: Code-level security issues (XSS, SQLi, etc.)
 * - quality: Code quality issues (unused vars, complexity)
 * - performance: Performance issues (N+1, inefficient patterns)
 * - style: Style/formatting issues
 * - maintainability: Code maintainability issues
 * - compatibility: API/version compatibility issues
 * - dependency: Package/dependency issues
 * - api_design: OpenAPI/AsyncAPI schema design issues (YAML/JSON fixes)
 *
 * RECOMMENDATION-ONLY categories (generate action steps, not code):
 * - secrets: Exposed secrets/credentials (needs rotation, not code fix)
 * - iac_security: Infrastructure as Code issues (needs config changes)
 * - container_security: Container/image vulnerabilities (needs image updates)
 * - graphql_security: GraphQL security misconfigurations (needs server config)
 * - architecture: Circular dependencies, god packages, coupling issues (needs refactoring guidance)
 */
export type IssueCategory =
  | 'security'
  | 'quality'
  | 'performance'
  | 'style'
  | 'maintainability'
  | 'compatibility'
  | 'dependency'
  | 'api_design'  // Session 59 P1: OpenAPI/AsyncAPI issues
  // Recommendation-only categories (Phase 1 Security Tools)
  | 'secrets'
  | 'iac_security'
  | 'container_security'
  | 'graphql_security'  // Session 59 P1: GraphQL security issues
  | 'architecture';  // Session 59 P2: Architecture analysis (pydeps, jdepend)

export interface IssueContext {
  ruleId: string;
  tool: string;
  message: string;
  category: IssueCategory;
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
  // Additional metadata for recommendation categories
  secretType?: string;           // For secrets: 'api_key', 'password', 'token', etc.
  iacFramework?: string;         // For IaC: 'terraform', 'kubernetes', 'cloudformation', etc.
  containerImage?: string;       // For containers: affected image name
  vulnerabilityId?: string;      // CVE or advisory ID
}

/**
 * SESSION 49: Universal constraint added to ALL prompts
 * This prevents corrupted patterns where AI asks for context instead of generating fixes
 */
const NEVER_ASK_CONSTRAINT = `
CRITICAL CONSTRAINT:
- NEVER ask for more code, context, or information
- NEVER say "I need to see...", "Could you provide...", "Please share..."
- ALWAYS work with the code provided - make reasonable assumptions based on context
- If context is limited, generate a generic but correct pattern that will work
- You have ONE CHANCE to generate the fix - there is no follow-up conversation`;

/**
 * Category-specific system prompt templates
 * These provide the "role" and general constraints for each category
 */
const CATEGORY_SYSTEM_PROMPTS: Record<string, string> = {
  security: `You are a security engineer generating a precise code fix.
${NEVER_ASK_CONSTRAINT}

OUTPUT RULES:
1. Output ONLY the fixed code block - no explanations
2. Preserve all existing functionality
3. Use language-appropriate security patterns
4. Never introduce new vulnerabilities
5. If you need to reference code you don't have, use placeholder comments like // TODO: verify this path

SECURITY PRINCIPLES:
- Defense in depth (multiple layers of protection)
- Principle of least privilege
- Fail securely (deny by default)
- Don't trust user input`,

  quality: `You are a code quality engineer generating a precise code fix.
${NEVER_ASK_CONSTRAINT}

OUTPUT RULES:
1. Output ONLY the fixed code block - no explanations
2. Preserve all existing functionality
3. Follow language idioms and best practices
4. Maintain consistency with surrounding code style
5. If you need to reference code you don't have, use placeholder comments like // TODO: verify this

QUALITY PRINCIPLES:
- Single responsibility
- Clear naming that reveals intent
- Minimize side effects
- Handle edge cases`,

  performance: `You are a performance engineer generating a precise code fix.
${NEVER_ASK_CONSTRAINT}

OUTPUT RULES:
1. Output ONLY the fixed code block - no explanations
2. Preserve all existing functionality and output
3. Use language-appropriate optimization patterns
4. Don't micro-optimize at the expense of readability
5. If you need runtime data, use comments like // TODO: measure actual performance

PERFORMANCE PRINCIPLES:
- Avoid unnecessary allocations
- Prefer batch operations over loops
- Cache expensive computations
- Use appropriate data structures`,

  style: `You are a code style engineer generating a precise code fix.
${NEVER_ASK_CONSTRAINT}

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
${NEVER_ASK_CONSTRAINT}

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
${NEVER_ASK_CONSTRAINT}

OUTPUT RULES:
1. Output ONLY the fixed code block - no explanations
2. Update deprecated APIs to modern equivalents
3. Maintain backward compatibility if possible
4. Follow migration guides for the language/framework`,

  dependency: `You are a software engineer fixing dependency issues.
${NEVER_ASK_CONSTRAINT}

OUTPUT RULES:
1. Output ONLY the updated configuration - no explanations
2. Use the latest secure versions
3. Maintain compatibility with other dependencies
4. Follow semantic versioning principles`,

  // =============================================================================
  // RECOMMENDATION-ONLY CATEGORIES (Phase 1 Security Tools)
  // These generate actionable recommendations, NOT code fixes
  // =============================================================================

  secrets: `You are a security engineer providing remediation guidance for exposed secrets.
${NEVER_ASK_CONSTRAINT}

IMPORTANT: This is NOT a code fix. Generate ACTIONABLE REMEDIATION STEPS.

OUTPUT FORMAT (use this exact structure):
## Secret Exposure Remediation

**Severity:** [CRITICAL/HIGH based on secret type]
**Secret Type:** [API Key/Password/Token/Certificate/etc.]
**Detected By:** [Tool name]

### Immediate Actions (Do Now)
1. [First priority step - usually revoke/rotate]
2. [Second priority step]
3. [Third priority step]

### Prevention Measures
- [How to prevent this in the future]
- [Tools/practices to implement]

### Verification Steps
- [How to verify remediation was successful]

REMEDIATION PRINCIPLES:
- ALWAYS assume the secret has been compromised
- Rotate/revoke before removing from code
- Check git history for exposure duration
- Use secret managers (Vault, AWS Secrets Manager, etc.)
- Never commit secrets to version control`,

  iac_security: `You are an infrastructure security engineer providing remediation guidance for IaC misconfigurations.
${NEVER_ASK_CONSTRAINT}

IMPORTANT: Generate CONFIGURATION RECOMMENDATIONS, not just code snippets.

OUTPUT FORMAT (use this exact structure):
## Infrastructure Security Remediation

**Issue:** [Brief description of the misconfiguration]
**Framework:** [Terraform/Kubernetes/CloudFormation/Dockerfile/Helm]
**Risk Level:** [CRITICAL/HIGH/MEDIUM/LOW]

### Configuration Change Required
\`\`\`[language]
[The corrected configuration snippet]
\`\`\`

### Why This Matters
[1-2 sentences on the security impact]

### Implementation Steps
1. [Step to locate affected resources]
2. [Step to apply the fix]
3. [Step to verify the change]

### Additional Hardening (Optional)
- [Related security improvements]

IAC SECURITY PRINCIPLES:
- Principle of least privilege
- Defense in depth
- Immutable infrastructure where possible
- No secrets in IaC files
- Use managed identities over static credentials`,

  container_security: `You are a container security engineer providing remediation guidance for container vulnerabilities.
${NEVER_ASK_CONSTRAINT}

IMPORTANT: Generate ACTIONABLE REMEDIATION STEPS for container/image issues.

OUTPUT FORMAT (use this exact structure):
## Container Security Remediation

**Vulnerability:** [CVE ID or issue description]
**Affected Image:** [Image name:tag]
**Component:** [Package/library name and version]
**Fixed In:** [Version that fixes the issue, if known]

### Remediation Options (choose one)

**Option 1: Update Base Image**
\`\`\`dockerfile
FROM [updated-base-image:tag]
\`\`\`

**Option 2: Update Specific Package**
\`\`\`dockerfile
RUN [package manager update command]
\`\`\`

### Verification Steps
1. [How to rebuild the image]
2. [How to scan the new image]
3. [How to verify the vulnerability is fixed]

### Risk Assessment
- **Exploitability:** [Remote/Local/Network]
- **Impact:** [What could happen if exploited]
- **Workaround:** [Temporary mitigation if update not immediately possible]

CONTAINER SECURITY PRINCIPLES:
- Use minimal base images (distroless, alpine)
- Don't run as root
- Scan images regularly
- Pin image versions (avoid :latest)
- Keep base images updated`,

  // =============================================================================
  // P1 TOOL CATEGORIES (Session 59)
  // =============================================================================

  api_design: `You are an API design engineer fixing OpenAPI/AsyncAPI schema issues.
${NEVER_ASK_CONSTRAINT}

OUTPUT RULES:
1. Output ONLY the corrected YAML/JSON snippet - no explanations
2. Preserve the overall schema structure
3. Follow OpenAPI 3.x or AsyncAPI 2.x specification
4. Ensure valid YAML/JSON syntax

OUTPUT FORMAT:
\`\`\`yaml
[corrected schema section]
\`\`\`

API DESIGN PRINCIPLES:
- Use consistent naming conventions
- Define proper response schemas for all status codes
- Include descriptions for operations and parameters
- Use appropriate security schemes
- Follow RESTful best practices for paths`,

  graphql_security: `You are a GraphQL security engineer providing remediation guidance for GraphQL security issues.
${NEVER_ASK_CONSTRAINT}

IMPORTANT: Generate CONFIGURATION RECOMMENDATIONS, not just code snippets.
Most GraphQL security issues require server configuration changes.

OUTPUT FORMAT (use this exact structure):
## GraphQL Security Remediation

**Issue:** [Brief description of the security issue]
**Risk Level:** [CRITICAL/HIGH/MEDIUM/LOW]

### Configuration Change Required
\`\`\`javascript
// Server configuration example
{
  [configuration key]: [value]
}
\`\`\`

### Why This Matters
[1-2 sentences on the security impact]

### Implementation Steps
1. [Step to locate the GraphQL server configuration]
2. [Step to apply the configuration change]
3. [Step to verify the change]

### Verification
- [How to test that the issue is fixed]

GRAPHQL SECURITY PRINCIPLES:
- Disable introspection in production
- Implement query depth limiting
- Implement query complexity analysis
- Rate limit queries
- Validate and sanitize all inputs
- Use persisted queries in production
- Don't expose sensitive data in error messages`,

  // =============================================================================
  // P2 TOOL CATEGORIES (Session 59)
  // =============================================================================

  architecture: `You are a software architect providing remediation guidance for architecture and design issues.
${NEVER_ASK_CONSTRAINT}

IMPORTANT: Generate REFACTORING RECOMMENDATIONS, not direct code fixes.
Architecture issues require careful planning and cannot be fixed with simple code changes.

OUTPUT FORMAT (use this exact structure):
## Architecture Remediation

**Issue Type:** [Circular Dependency/God Package/High Coupling/Layer Violation/etc.]
**Scope:** [Package/Module names affected]
**Impact Level:** [CRITICAL/HIGH/MEDIUM/LOW]

### Problem Analysis
[1-3 sentences explaining why this is a problem]

### Recommended Solution
**Option 1: [Primary Solution Name]**
[2-4 sentences describing the approach]

\`\`\`
[Package/module structure diagram or pseudo-structure if helpful]
\`\`\`

**Option 2: [Alternative Solution Name]** (if applicable)
[2-4 sentences describing the alternative]

### Implementation Steps
1. [First step - usually identify all dependencies]
2. [Second step - create new package/module structure]
3. [Third step - migrate code incrementally]
4. [Fourth step - verify no circular dependencies]
5. [Fifth step - clean up old structure]

### Testing Strategy
- [How to verify the refactoring doesn't break functionality]
- [How to verify the architecture issue is resolved]

### Metrics to Monitor
- [Specific metrics to track improvement]

ARCHITECTURE PRINCIPLES:
- Single Responsibility for packages/modules
- Acyclic Dependencies Principle (no circular dependencies)
- Stable Dependencies Principle (depend on stable packages)
- Stable Abstractions Principle (abstract packages should be stable)
- Package Cohesion (group related functionality)
- Minimize coupling between packages
- Layer architecture should only allow downward dependencies`,
};

/**
 * Categories that generate recommendations instead of code fixes
 * These issues cannot be fixed with code changes alone
 */
const RECOMMENDATION_ONLY_CATEGORIES: IssueCategory[] = [
  'secrets',
  'iac_security',
  'container_security',
  'graphql_security',  // Session 59 P1: GraphQL security needs server config changes
  'architecture',  // Session 59 P2: Architecture issues need refactoring guidance
];

/**
 * Check if a category requires recommendation output (not code fix)
 */
export function isRecommendationCategory(category: IssueCategory): boolean {
  return RECOMMENDATION_ONLY_CATEGORIES.includes(category);
}

/**
 * Build user prompt for recommendation-only categories (secrets, IaC, container, GraphQL)
 * These generate actionable remediation steps, not code fixes
 */
function buildRecommendationUserPrompt(context: IssueContext): string {
  const parts: string[] = [];

  // Header based on category
  const categoryHeaders: Record<string, string> = {
    secrets: 'GENERATE REMEDIATION STEPS FOR THIS EXPOSED SECRET:',
    iac_security: 'GENERATE REMEDIATION FOR THIS INFRASTRUCTURE SECURITY ISSUE:',
    container_security: 'GENERATE REMEDIATION FOR THIS CONTAINER VULNERABILITY:',
    graphql_security: 'GENERATE REMEDIATION FOR THIS GRAPHQL SECURITY ISSUE:',
    architecture: 'GENERATE REFACTORING GUIDANCE FOR THIS ARCHITECTURE ISSUE:',
  };

  parts.push(categoryHeaders[context.category] || 'GENERATE REMEDIATION STEPS:');
  parts.push('');
  parts.push(`RULE: ${context.ruleId} (${context.tool})`);
  parts.push(`SEVERITY: ${context.severity}`);
  parts.push(`MESSAGE: ${context.message}`);
  parts.push('');

  // Location
  parts.push(`FILE: ${context.filePath}`);
  if (context.lineNumber > 0) {
    parts.push(`LINE: ${context.lineNumber}`);
  }
  parts.push('');

  // Category-specific metadata
  if (context.category === 'secrets') {
    if (context.secretType) parts.push(`SECRET TYPE: ${context.secretType}`);
    parts.push('');
    parts.push('CONTEXT (DO NOT include actual secret values in output):');
    parts.push('```');
    parts.push(context.codeContext || context.snippet || '// Secret location context');
    parts.push('```');
  } else if (context.category === 'iac_security') {
    if (context.iacFramework) parts.push(`FRAMEWORK: ${context.iacFramework}`);
    parts.push('');
    parts.push('CONFIGURATION CONTEXT:');
    parts.push('```' + (context.iacFramework || context.language));
    parts.push(context.codeContext || context.snippet || '// IaC configuration context');
    parts.push('```');
  } else if (context.category === 'container_security') {
    if (context.containerImage) parts.push(`IMAGE: ${context.containerImage}`);
    if (context.vulnerabilityId) parts.push(`VULNERABILITY: ${context.vulnerabilityId}`);
    parts.push('');
    parts.push('DOCKERFILE/IMAGE CONTEXT:');
    parts.push('```dockerfile');
    parts.push(context.codeContext || context.snippet || '// Container configuration context');
    parts.push('```');
  } else if (context.category === 'graphql_security') {
    if (context.framework) parts.push(`GRAPHQL SERVER: ${context.framework}`);
    parts.push('');
    parts.push('GRAPHQL CONFIGURATION/SCHEMA CONTEXT:');
    parts.push('```' + (context.language || 'javascript'));
    parts.push(context.codeContext || context.snippet || '// GraphQL server configuration context');
    parts.push('```');
  } else if (context.category === 'architecture') {
    parts.push(`LANGUAGE: ${context.language || 'unknown'}`);
    if (context.className) parts.push(`PACKAGE/MODULE: ${context.className}`);
    parts.push('');
    parts.push('ARCHITECTURE CONTEXT:');
    parts.push('```' + (context.language || ''));
    parts.push(context.codeContext || context.snippet || '// Package/module structure context');
    parts.push('```');
  }
  parts.push('');

  // Additional metadata if available
  const metadata: string[] = [];
  if (context.value) metadata.push(`Affected Value: ${context.value}`);
  if (context.framework) metadata.push(`Framework: ${context.framework}`);

  if (metadata.length > 0) {
    parts.push('ADDITIONAL CONTEXT:');
    metadata.forEach(m => parts.push(`- ${m}`));
    parts.push('');
  }

  // Category-specific output instruction
  const outputInstructions: Record<string, string> = {
    secrets: 'OUTPUT: Generate remediation steps following the format in your system prompt. Include rotation steps, prevention measures, and verification.',
    iac_security: 'OUTPUT: Generate the corrected configuration and implementation steps following the format in your system prompt.',
    graphql_security: 'OUTPUT: Generate configuration recommendations and implementation steps following the format in your system prompt. Include verification steps.',
    container_security: 'OUTPUT: Generate remediation options with verification steps following the format in your system prompt.',
    architecture: 'OUTPUT: Generate refactoring guidance following the format in your system prompt. Include solution options, implementation steps, and metrics to monitor.',
  };

  parts.push(outputInstructions[context.category] || 'OUTPUT: Generate actionable remediation steps.');

  return parts.join('\n');
}

/**
 * Build a dynamic user prompt based on issue context
 * Routes to recommendation prompt for non-code-fixable categories
 */
function buildDynamicUserPrompt(context: IssueContext): string {
  // Route to recommendation prompt for non-code-fixable categories
  if (isRecommendationCategory(context.category)) {
    return buildRecommendationUserPrompt(context);
  }

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

  // Recommendation-only categories need minimal context (just the file/config)
  if (isRecommendationCategory(context.category)) {
    // Secrets might need related files to check for other occurrences
    if (context.category === 'secrets') {
      required.push('related-files');
    }
    // Architecture issues need to understand the dependency structure
    if (context.category === 'architecture') {
      required.push('imports', 'related-files');
    }
    return required;
  }

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
  // Recommendation categories need more tokens for detailed remediation steps
  if (isRecommendationCategory(context.category)) {
    const recommendationTokens: Record<string, number> = {
      secrets: 800,          // Needs rotation steps, prevention, verification
      iac_security: 900,     // Needs config snippet + steps + explanation
      container_security: 1000,  // Needs multiple options + CVE details
      graphql_security: 900, // Needs config + implementation steps
      architecture: 1200,    // Needs detailed refactoring plan + multiple options + metrics
    };
    return recommendationTokens[context.category] || 800;
  }

  // Base tokens by severity for code fixes
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
  // Recommendation categories should be deterministic but allow some flexibility
  if (isRecommendationCategory(context.category)) {
    return 0.2;  // Slightly more creative for recommendations
  }

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
 * Determine output format based on category
 */
function determineOutputFormat(context: IssueContext): 'diff' | 'full-file' | 'code-block' | 'markdown' {
  // Recommendation categories output markdown format (not code)
  if (isRecommendationCategory(context.category)) {
    return 'markdown';
  }
  return 'code-block';
}

/**
 * Generate a dynamic AI prompt for any issue
 * This is the main entry point - works for ANY rule, not just known ones
 */
export function generateDynamicPrompt(context: IssueContext): AIFixPrompt {
  // Get category-specific system prompt
  const systemPrompt = CATEGORY_SYSTEM_PROMPTS[context.category] || CATEGORY_SYSTEM_PROMPTS.quality;

  // Determine if this is a recommendation-only category
  const isRecommendation = isRecommendationCategory(context.category);

  // Enhance system prompt with rule-specific information
  // Different suffix for code fixes vs recommendations
  const promptSuffix = isRecommendation
    ? 'Generate actionable remediation steps following the output format specified above.'
    : 'Fix this specific problem. Output only the corrected code.';

  const enhancedSystemPrompt = `${systemPrompt}

SPECIFIC ISSUE: ${context.ruleId}
This is a ${context.severity} ${context.category.replace('_', ' ')} issue detected by ${context.tool}.
The issue is: "${context.message}"

${promptSuffix}`;

  return {
    systemPrompt: enhancedSystemPrompt,
    userPromptTemplate: buildDynamicUserPrompt(context),
    outputFormat: determineOutputFormat(context),
    maxTokens: calculateMaxTokens(context),
    temperature: calculateTemperature(context),
    requiredContext: determineRequiredContext(context),
    isRecommendation,
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
