/**
 * Optimized prompt templates based on DeepWiki testing results
 * Testing showed JSON-Forced-System and Markdown-Structured work best
 */

export interface PromptStrategy {
  systemPrompt?: string;
  userPrompt: string;
  responseFormat?: any;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Best performing prompt for JSON structure (60/100 structure score)
 * Use when you need structured data that's easy to parse
 */
export const JSON_OPTIMIZED_STRATEGY: PromptStrategy = {
  systemPrompt: 'You MUST respond with valid JSON only. No additional text. Start with { and end with }.',
  userPrompt: `Analyze this repository and return ONLY a JSON object:
{
  "issues": [
    {
      "id": "issue-1",
      "severity": "critical|high|medium|low",
      "category": "security|performance|dependency|architecture|code-quality|type-safety|testing|breaking-change",
      "title": "Brief issue title",
      "description": "Detailed description of the issue",
      "file": "exact/path/to/file.ts",
      "line": 123,
      "column": 45,
      "codeSnippet": "problematic code here",
      "recommendation": "How to fix this issue",
      "cve": "CVE-2024-XXXX (if applicable for security/dependency issues)",
      "breakingChangeInfo": {
        "isBreaking": false,
        "affectedAPIs": [],
        "migrationPath": ""
      }
    }
  ],
  "dependencies": {
    "vulnerable": [
      {"name": "package-name", "version": "1.0.0", "cve": "CVE-2024-XXXX", "severity": "critical"}
    ],
    "outdated": [
      {"name": "package-name", "current": "1.0.0", "latest": "3.0.0", "versionsBehind": 2}
    ],
    "deprecated": [
      {"name": "package-name", "reason": "No longer maintained", "alternative": "new-package"}
    ]
  },
  "architecture": {
    "diagram": "ASCII representation of system architecture",
    "patterns": ["MVC", "Repository", "Observer"],
    "antiPatterns": ["God Object", "Spaghetti Code"],
    "recommendations": ["Consider implementing CQRS", "Add service layer"]
  },
  "summary": "Brief analysis summary",
  "scores": {
    "overall": 85,
    "security": 90,
    "performance": 80,
    "dependencies": 75,
    "architecture": 70,
    "codeQuality": 85,
    "testCoverage": 65
  },
  "education": {
    "bestPractices": [
      {"title": "Use parameterized queries", "example": "db.query('SELECT * FROM users WHERE id = ?', [id])"}
    ],
    "antiPatterns": [
      {"title": "Storing secrets in code", "example": "const apiKey = 'sk-12345' // Never do this"}
    ]
  },
  "filesAnalyzed": ["list", "of", "analyzed", "files"]
}

Priority order for issues (find most critical first):
1. SECURITY: SQL injection, XSS, auth flaws, exposed secrets
2. PERFORMANCE: Memory leaks, O(n²) algorithms, blocking operations  
3. DEPENDENCIES: CVEs, severely outdated (>2 major versions), deprecated
4. BREAKING CHANGES: API changes, schema changes, removed features
5. ARCHITECTURE: Poor patterns, coupling, scalability issues
6. CODE QUALITY: Maintainability, readability, duplication

Find MINIMUM 15 issues with EXACT file paths and line numbers.`,
  responseFormat: { type: 'json_object' },
  temperature: 0.1
};

/**
 * Priority-based comprehensive analysis strategy
 * Focuses on Security > Performance > Dependencies > Architecture > Code Quality
 */
export const PRIORITY_BASED_STRATEGY: PromptStrategy = {
  userPrompt: `Analyze this repository with PRIORITY focus on critical issues.

## PRIORITY 1: Security Vulnerabilities (CRITICAL)
Find ALL security issues:
- SQL/NoSQL injection risks
- XSS (Cross-Site Scripting) vulnerabilities  
- Authentication/Authorization flaws
- Exposed secrets, API keys, credentials
- Insecure data transmission (HTTP, unencrypted)
- CSRF vulnerabilities
- Path traversal risks

Format each as:
**[CRITICAL-SEC-001]** File: exact/path/to/file.ts, Lines: 123-145
- Vulnerability: [Type and description]
- Evidence: \`vulnerable code snippet\`
- CVE: CVE-2024-XXXX (if known)
- Attack Vector: How it can be exploited
- Fix: \`secure code example\`

## PRIORITY 2: Performance Issues (HIGH)
Identify performance bottlenecks:
- Memory leaks (unclosed connections, event listeners)
- Inefficient algorithms (O(n²) or worse)
- Blocking operations in async code
- Unnecessary re-renders (React/Vue)
- Database N+1 queries
- Large bundle sizes

Format each as:
**[HIGH-PERF-001]** File: exact/path/to/file.ts, Lines: 200-250  
- Issue: [Performance problem]
- Impact: [Measured/estimated impact - e.g., "10x slower for large datasets"]
- Current: \`problematic code\`
- Optimized: \`improved code\`

## PRIORITY 3: Dependency Vulnerabilities (HIGH)
Check package.json/requirements.txt/go.mod for:
- Known CVEs in dependencies
- Severely outdated packages (>2 major versions)
- Deprecated/abandoned packages
- Security advisories

Format each as:
**[HIGH-DEP-001]** File: package.json, Line: 45
- Package: package-name@current-version
- Issue: CVE-2024-XXXX or deprecation notice
- Risk: [Security/Stability impact]
- Recommendation: Update to version X.X.X

## Architecture Analysis

### Visual Architecture Diagram
IMPORTANT: Create a detailed ASCII diagram showing the actual system architecture detected in this PR.
Include all major components, their relationships, and data flows.

\`\`\`
[Create an ASCII diagram that accurately represents THIS codebase's architecture]
Example format:
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Component  │────▶│  Component  │────▶│  Component  │
│  (Tech)     │     │  (Tech)     │     │  (Tech)     │
└─────────────┘     └─────────────┘     └─────────────┘

Legend:
────▶ Synchronous call
╌╌╌▶ Asynchronous call
═══▶ Data flow
- - ▶ Event/Message
\`\`\`

### Component Details
List all detected components with their responsibilities:
- **Frontend**: [Technology used, main responsibilities]
- **Backend Services**: [Technology used, APIs exposed]
- **Data Layer**: [Databases, caching layers]
- **External Services**: [Third-party integrations]
- **Message Queue/Events**: [If applicable]

### Architectural Patterns Detected
- Pattern name: Description and where it's used
- Benefits: How it helps the system
- Potential issues: Any problems with current implementation

### Architectural Recommendations
1. **Pattern Improvements**: [Current pattern → Recommended pattern]
2. **Separation of Concerns**: [Coupling issues and solutions]
3. **Scalability Bottlenecks**: [Current limits and solutions]
4. **Testability Improvements**: [How to improve test coverage]

## Educational Insights
Key learning points from this analysis:

1. **Security Best Practice**: [What to do]
   Example: Always use parameterized queries: \`db.query('SELECT * FROM users WHERE id = ?', [userId])\`

2. **Performance Pattern**: [Optimization technique]
   Example: Use memoization for expensive computations: \`const memoized = useMemo(() => expensiveCalc(), [deps])\`

3. **Anti-Pattern Found**: [What to avoid]
   Example: Never store sensitive data in localStorage: \`localStorage.setItem('token', jwt) // DON'T DO THIS\`

## Code Quality Metrics
{
  "overall": 75,        // 100 = perfect, 0 = critical issues
  "security": 60,       // Lower score = more vulnerabilities
  "performance": 80,    // Based on identified bottlenecks
  "dependencies": 70,   // Based on outdated/vulnerable packages
  "architecture": 75,   // Based on patterns and structure
  "codeQuality": 85,    // Maintainability and readability
  "testCoverage": 65    // Estimated based on test files found
}

REQUIREMENTS:
- Find MINIMUM 15 issues, prioritize CRITICAL and HIGH severity
- MUST provide exact file paths and line numbers/ranges
- MUST include code evidence for each issue
- MUST provide actionable fixes with code examples
- Focus 60% on security/performance, 40% on other issues`,
  temperature: 0.1
};

/**
 * Architecture-focused strategy for detailed system design analysis
 * Generates comprehensive diagrams and pattern analysis
 */
export const ARCHITECTURE_FOCUS_STRATEGY: PromptStrategy = {
  systemPrompt: 'You are an expert software architect analyzing system design and architecture patterns.',
  userPrompt: `Analyze the architecture of this repository/PR with focus on:

1. **System Components & Layers**
   - Identify all major components (frontend, backend, database, cache, queue, etc.)
   - Specify technologies used for each component
   - Map component responsibilities and boundaries

2. **Architecture Diagram** (REQUIRED)
   Create a detailed ASCII diagram showing:
   - All components and their relationships
   - Data flow directions
   - Communication protocols (REST, GraphQL, WebSocket, etc.)
   - External service integrations

3. **Design Patterns**
   - Identify architectural patterns (MVC, Microservices, Event-Driven, etc.)
   - Design patterns in use (Factory, Observer, Repository, etc.)
   - Anti-patterns present (God Object, Spaghetti Code, etc.)

4. **Quality Attributes**
   - Scalability: Current limits and bottlenecks
   - Security: Authentication/authorization architecture
   - Performance: Caching strategies, async processing
   - Maintainability: Module coupling and cohesion
   - Testability: Test infrastructure and coverage

5. **Recommendations**
   - Critical architectural improvements needed
   - Patterns to adopt or remove
   - Scalability enhancements
   - Security hardening suggestions

Format the response with clear sections and include the ASCII diagram.`,
  temperature: 0.2,
  maxTokens: 4000
};

/**
 * Fast JSON strategy using smaller model (5.2s response time)
 * Use for quick analysis or when performance is critical
 */
export const FAST_JSON_STRATEGY: PromptStrategy = {
  systemPrompt: 'Respond only with valid JSON.',
  userPrompt: `Analyze this repository and return a JSON object with these exact fields:
{
  "issues": [
    {"id": "1", "severity": "critical|high|medium|low", "file": "path/to/file.ts", "line": 123, "description": "Issue description"}
  ],
  "summary": "Repository summary"
}
Find at least 5 significant issues.`,
  model: 'openai/gpt-4o-mini',
  temperature: 0.1,
  maxTokens: 2000
};

/**
 * Hybrid strategy that combines JSON structure with comprehensive analysis
 * This is a two-pass approach: first get comprehensive markdown, then convert to JSON
 */
export const HYBRID_TWO_PASS_STRATEGY = {
  // First pass: Get comprehensive analysis in markdown
  firstPass: PRIORITY_BASED_STRATEGY,
  
  // Second pass: Convert to structured JSON
  secondPass: {
    systemPrompt: 'Convert the previous analysis to valid JSON only.',
    userPrompt: `Convert the previous analysis into this JSON structure:
{
  "issues": [
    {
      "id": "unique-id",
      "severity": "critical|high|medium|low",
      "category": "category",
      "title": "title",
      "description": "description",
      "file": "file path",
      "line": line_number,
      "recommendation": "how to fix"
    }
  ],
  "scores": {
    "overall": 0-100,
    "security": 0-100,
    "performance": 0-100,
    "maintainability": 0-100
  }
}`,
    temperature: 0.0,
    maxTokens: 4000
  }
};

/**
 * Get the best strategy based on requirements
 */
export function getBestStrategy(requirements: {
  needStructured: boolean;
  needComprehensive: boolean;
  needFast: boolean;
}): PromptStrategy {
  if (requirements.needFast) {
    return FAST_JSON_STRATEGY;
  }
  
  if (requirements.needComprehensive && !requirements.needStructured) {
    return PRIORITY_BASED_STRATEGY;
  }
  
  if (requirements.needStructured) {
    return JSON_OPTIMIZED_STRATEGY;
  }
  
  // Default to JSON strategy
  return JSON_OPTIMIZED_STRATEGY;
}

/**
 * Parse DeepWiki response based on strategy used
 */
export function parseStrategyResponse(response: string, strategy: PromptStrategy): any {
  // Try JSON parse first if it looks like JSON
  if (response.trim().startsWith('{') || response.trim().startsWith('[')) {
    try {
      return JSON.parse(response);
    } catch (e) {
      // Failed to parse as JSON, falling back to text parsing
    }
  }
  
  // For priority-based strategy, parse the structured markdown  
  if (strategy === PRIORITY_BASED_STRATEGY) {
    return parseMarkdownResponse(response);
  }
  
  // Default text parsing
  return parseTextResponse(response);
}

/**
 * Parse markdown structured response
 */
function parseMarkdownResponse(content: string): any {
  const issues: any[] = [];
  const lines = content.split('\n');
  
  let currentSeverity = 'medium';
  let issueId = 1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detect severity sections
    if (line.includes('### Critical Issues')) currentSeverity = 'critical';
    else if (line.includes('### High Priority Issues')) currentSeverity = 'high';
    else if (line.includes('### Medium Priority Issues')) currentSeverity = 'medium';
    else if (line.includes('### Low Priority Issues')) currentSeverity = 'low';
    
    // Parse issues with [File: ..., Line: ...] format
    const match = line.match(/\d+\.\s+\*\*\[File:\s*([^,]+),\s*Line:\s*(\d+)\]\*\*\s*(.+)/);
    if (match) {
      const [, file, lineNum, description] = match;
      
      // Look for impact and recommendation in next lines
      let impact = '';
      let recommendation = '';
      
      if (i + 1 < lines.length && lines[i + 1].includes('Impact:')) {
        impact = lines[i + 1].replace(/^\s*-\s*Impact:\s*/, '');
      }
      if (i + 2 < lines.length && lines[i + 2].includes('Recommendation:')) {
        recommendation = lines[i + 2].replace(/^\s*-\s*Recommendation:\s*/, '');
      }
      
      issues.push({
        id: `issue-${issueId++}`,
        severity: currentSeverity,
        category: categorizeIssue(description + ' ' + impact),
        title: description.substring(0, 100),
        description: description + (impact ? `. Impact: ${impact}` : ''),
        file: file.trim(),
        line: parseInt(lineNum),
        recommendation
      });
    }
  }
  
  // Calculate scores based on issues
  const scores = calculateScores(issues);
  
  return {
    issues,
    scores,
    summary: 'Analysis completed'
  };
}

/**
 * Parse plain text response
 */
function parseTextResponse(content: string): any {
  // This is a fallback - use the existing parseDeepWikiResponse logic
  // Import is handled at the top of the file
  const { parseDeepWikiResponse } = (typeof require !== 'undefined') 
    ? require('../services/deepwiki-response-parser')
    : { parseDeepWikiResponse: (c: string) => ({ issues: [], scores: {} }) };
  return parseDeepWikiResponse(content);
}

/**
 * Categorize issue based on description (priority order)
 */
function categorizeIssue(description: string): string {
  const lower = description.toLowerCase();
  
  // Priority 1: Security
  if (lower.includes('security') || lower.includes('vulnerability') || 
      lower.includes('injection') || lower.includes('xss') || 
      lower.includes('csrf') || lower.includes('auth') ||
      lower.includes('secret') || lower.includes('password') ||
      lower.includes('cve-')) {
    return 'security';
  }
  
  // Priority 2: Performance  
  if (lower.includes('performance') || lower.includes('slow') || 
      lower.includes('optimization') || lower.includes('memory leak') ||
      lower.includes('bottleneck') || lower.includes('o(n')) {
    return 'performance';
  }
  
  // Priority 3: Dependencies
  if (lower.includes('dependency') || lower.includes('package') ||
      lower.includes('outdated') || lower.includes('deprecated') ||
      lower.includes('version') || lower.includes('cve-')) {
    return 'dependency';
  }
  
  // Priority 4: Breaking Changes
  if (lower.includes('breaking') || lower.includes('migration') ||
      lower.includes('api change') || lower.includes('removed') ||
      lower.includes('incompatible')) {
    return 'breaking-change';
  }
  
  // Priority 5: Architecture
  if (lower.includes('architecture') || lower.includes('pattern') ||
      lower.includes('design') || lower.includes('coupling') ||
      lower.includes('scalability') || lower.includes('structure')) {
    return 'architecture';
  }
  
  // Type safety
  if (lower.includes('type') || lower.includes('typescript') || 
      lower.includes('any') || lower.includes('interface')) {
    return 'type-safety';
  }
  
  // Testing
  if (lower.includes('test') || lower.includes('coverage') || 
      lower.includes('spec') || lower.includes('unit test')) {
    return 'testing';
  }
  
  // Default: Code Quality
  return 'code-quality';
}

/**
 * Calculate scores based on issues found (lower score = more issues/worse)
 */
function calculateScores(issues: any[]): any {
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const highCount = issues.filter(i => i.severity === 'high').length;
  const mediumCount = issues.filter(i => i.severity === 'medium').length;
  const lowCount = issues.filter(i => i.severity === 'low').length;
  
  // Overall score heavily weighted by critical issues
  const overall = Math.max(0, 100 - (criticalCount * 20) - (highCount * 10) - (mediumCount * 5) - (lowCount * 2));
  
  // Security score (Priority 1)
  const securityIssues = issues.filter(i => i.category === 'security');
  const security = Math.max(0, 100 - 
    (securityIssues.filter(i => i.severity === 'critical').length * 30) -
    (securityIssues.filter(i => i.severity === 'high').length * 20) -
    (securityIssues.filter(i => i.severity === 'medium').length * 10));
  
  // Performance score (Priority 2)
  const performanceIssues = issues.filter(i => i.category === 'performance');
  const performance = Math.max(0, 100 - 
    (performanceIssues.filter(i => i.severity === 'critical').length * 25) -
    (performanceIssues.filter(i => i.severity === 'high').length * 15) -
    (performanceIssues.length * 5));
  
  // Dependencies score (Priority 3)
  const dependencyIssues = issues.filter(i => i.category === 'dependency');
  const dependencies = Math.max(0, 100 - 
    (dependencyIssues.filter(i => i.severity === 'critical').length * 25) -
    (dependencyIssues.filter(i => i.severity === 'high').length * 15) -
    (dependencyIssues.length * 5));
  
  // Architecture score (Priority 5)
  const architectureIssues = issues.filter(i => i.category === 'architecture');
  const architecture = Math.max(0, 100 - 
    (architectureIssues.filter(i => i.severity === 'high').length * 15) -
    (architectureIssues.length * 8));
  
  // Code Quality score (Priority 6)
  const qualityIssues = issues.filter(i => i.category === 'code-quality');
  const codeQuality = Math.max(0, 100 - 
    (qualityIssues.filter(i => i.severity === 'high').length * 10) -
    (qualityIssues.length * 5));
  
  // Test Coverage estimate (based on testing issues found)
  const testingIssues = issues.filter(i => i.category === 'testing');
  const testCoverage = Math.max(30, 100 - (testingIssues.length * 15));
  
  return {
    overall,
    security,
    performance,
    dependencies,
    architecture,
    codeQuality,
    testCoverage
  };
}