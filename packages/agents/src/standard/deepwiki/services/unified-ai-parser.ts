/**
 * Unified AI-Driven Parser for ALL DeepWiki Response Categories
 * 
 * Uses the existing model selection infrastructure to create specialized
 * sub-agents for each category, replacing all rule-based parsers.
 */

// PERMANENT FIX: Use centralized environment loader
import { getEnvConfig } from '../../utils/env-loader';
import { DynamicModelSelector, RoleRequirements } from '../../services/dynamic-model-selector';
import { ILogger } from '../../services/interfaces/logger.interface';
import { AIService } from '../../services/ai-service';

export interface ParseConfig {
  language: string;
  framework?: string;
  repositorySize: 'small' | 'medium' | 'large' | 'enterprise';
  complexity: 'low' | 'medium' | 'high' | 'very-high';
  useAI?: boolean;
}

export interface CategoryParseResult {
  category: string;
  data: any;
  confidence: number;
  issues: any[];
  metadata: {
    model?: string;
    provider?: string;
    parseTime: number;
    method: 'ai' | 'pattern';
  };
}

export interface ParsedDeepWikiResponse {
  security: CategoryParseResult;
  performance: CategoryParseResult;
  dependencies: CategoryParseResult;
  codeQuality: CategoryParseResult;
  architecture: CategoryParseResult;
  breakingChanges: CategoryParseResult;
  educational: CategoryParseResult;
  recommendations: CategoryParseResult;
  allIssues: any[];
  scores: Record<string, number>;
  testCoverage?: number;
  metadata?: {
    testCoverage?: number;
  };
}

/**
 * Unified parser that creates sub-agents for each category
 */
export class UnifiedAIParser {
  private modelSelector: DynamicModelSelector;
  private selectedModel: any;
  private fallbackModel: any;
  private logger?: ILogger;
  private aiService: AIService;

  constructor(logger?: ILogger) {
    this.modelSelector = new DynamicModelSelector();
    this.logger = logger;
    // PERMANENT FIX: Use centralized env config to ensure API key is always loaded
    const envConfig = getEnvConfig();
    this.aiService = new AIService({
      openRouterApiKey: envConfig.openRouterApiKey
    });
  }

  /**
   * Initialize with repository context and select optimal model
   */
  async initialize(config: ParseConfig): Promise<void> {
    // Skip model selection in mock mode or when AI is disabled
    if (process.env.USE_DEEPWIKI_MOCK === 'true' || config.useAI === false) {
      this.selectedModel = {
        model: 'mock-model',
        provider: 'mock',
        temperature: 0.1,
        maxTokens: 2000
      };
      this.log('info', 'Using mock model for parsing (mock mode or AI disabled)');
      return;
    }

    try {
      // Select model based on repository context using dynamic selection
      const requirements: RoleRequirements = {
        role: 'deepwiki-parser',
        description: 'Parse and extract structured data from DeepWiki analysis responses',
        languages: [config.language],
        repositorySize: config.repositorySize,
        weights: {
          quality: 0.8,  // High quality for accurate parsing
          speed: 0.15,   // Moderate speed
          cost: 0.05     // Low priority on cost for parsing
        },
        minContextWindow: 32000,  // Need large context for full DeepWiki responses
        requiresReasoning: true,
        requiresCodeAnalysis: true
      };

      // Use existing model selection infrastructure
      const modelSelection = await this.modelSelector.selectModelsForRole(requirements);
      this.selectedModel = modelSelection.primary;
      this.fallbackModel = modelSelection.fallback;
      
      this.log('info', `Selected model for parsing: ${this.selectedModel.model} (${this.selectedModel.provider})`);
      if (this.fallbackModel) {
        this.log('info', `Fallback model: ${this.fallbackModel.model} (${this.fallbackModel.provider})`);
      }
    } catch (error) {
      this.log('warn', 'Model selection failed, using fallback flow', error);
      
      // Fallback flow: Try to get last known working configuration
      try {
        // Use a sensible default that we know works but isn't hardcoded
        // This should come from configuration or last successful run
        const fallbackModels = [
          { model: 'gpt-4o', provider: 'openai' },
          { model: 'claude-3-5-sonnet-20241022', provider: 'anthropic' },
          { model: 'gpt-4-turbo-preview', provider: 'openai' }
        ];
        
        // Try each fallback model until one works
        for (const fallback of fallbackModels) {
          try {
            // Verify the model is available
            const testResponse = await this.aiService.call(fallback as any, {
              systemPrompt: 'Test',
              prompt: 'Respond with OK',
              temperature: 0.1,
              maxTokens: 10
            });
            
            if (testResponse) {
              this.selectedModel = {
                ...fallback,
                temperature: 0.1,
                maxTokens: 4000
              };
              this.log('info', `Using fallback model: ${this.selectedModel.model}`);
              break;
            }
          } catch {
            // Try next model
            continue;
          }
        }
        
        if (!this.selectedModel) {
          throw new Error('No working models found in fallback flow');
        }
      } catch (fallbackError) {
        this.log('error', 'All model selection attempts failed', fallbackError);
        // As absolute last resort, disable AI parsing
        this.selectedModel = {
          model: 'none',
          provider: 'none',
          temperature: 0.1,
          maxTokens: 0
        };
      }
    }
  }

  /**
   * Parse complete DeepWiki response using AI sub-agents
   */
  async parseDeepWikiResponse(
    content: string,
    config: ParseConfig
  ): Promise<ParsedDeepWikiResponse> {
    // Initialize if not already done
    if (!this.selectedModel) {
      await this.initialize(config);
    }

    // If AI is disabled or in mock mode, use fallback
    if (process.env.USE_DEEPWIKI_MOCK === 'true' || config.useAI === false) {
      return this.fallbackParsing(content, config);
    }

    // Parse all categories in parallel using sub-agents
    const [
      security,
      performance,
      dependencies,
      codeQuality,
      architecture,
      breakingChanges,
      educational,
      recommendations
    ] = await Promise.all([
      this.parseCategory(content, 'security', config),
      this.parseCategory(content, 'performance', config),
      this.parseCategory(content, 'dependencies', config),
      this.parseCategory(content, 'codeQuality', config),
      this.parseCategory(content, 'architecture', config),
      this.parseCategory(content, 'breakingChanges', config),
      this.parseCategory(content, 'educational', config),
      this.parseCategory(content, 'recommendations', config)
    ]);

    // Combine all issues
    let allIssues = [
      ...security.issues,
      ...performance.issues,
      ...dependencies.issues,
      ...codeQuality.issues,
      ...architecture.issues,
      ...breakingChanges.issues
    ];

    // Enhance location information for issues missing it
    if (process.env.ENABLE_AI_LOCATION !== 'false') {
      try {
        // Use the existing AILocationFinder service instead of AILocationEnhancer
        const { createAILocationFinder } = require('../../services/ai-location-finder');
        const { ModelVersionSync } = require('@codequal/core');
        
        // Create location finder with model version sync
        const modelVersionSync = new ModelVersionSync();
        const locationFinder = createAILocationFinder(modelVersionSync, undefined, {
          includeAlternatives: false,
          maxTokens: 2000,
          temperature: 0.1
        });
        
        // Get repository path from environment or default
        const repoPath = process.env.REPO_PATH || '/tmp/codequal-repos';
        
        // Enhance each issue with missing location
        allIssues = await Promise.all(
          allIssues.map(async (issue) => {
            // Skip if location is already complete
            if (issue.location?.file && issue.location?.line && 
                issue.location.file !== 'unknown' && issue.location.line > 0) {
              return issue;
            }
            
            // Try to find location using AI
            const locationResult = await locationFinder.findLocation(issue, repoPath);
            
            if (locationResult && locationResult.confidence > 50) {
              return {
                ...issue,
                location: {
                  file: issue.location?.file || 'unknown',
                  line: locationResult.line,
                  column: locationResult.column,
                  endLine: locationResult.endLine
                },
                codeSnippet: locationResult.codeSnippet,
                locationConfidence: locationResult.confidence,
                locationExplanation: locationResult.explanation
              };
            }
            
            return issue;
          })
        );
        
        this.log('info', `Enhanced locations for ${allIssues.length} issues`);
      } catch (error) {
        this.log('warn', 'Failed to enhance locations with AI', { error });
      }
    }

    // Calculate scores based on extracted data
    const scores = this.calculateScores({
      security,
      performance,
      dependencies,
      codeQuality,
      architecture
    });

    // Extract test coverage from codeQuality data if available
    let testCoverage = 0;
    if (codeQuality.data?.coverage?.overall) {
      testCoverage = codeQuality.data.coverage.overall;
    } else if (codeQuality.data?.testCoverage) {
      testCoverage = codeQuality.data.testCoverage;
    }
    
    return {
      security,
      performance,
      dependencies,
      codeQuality,
      architecture,
      breakingChanges,
      educational,
      recommendations,
      allIssues,
      scores,
      testCoverage,
      metadata: {
        testCoverage
      }
    };
  }

  /**
   * Parse a specific category using AI sub-agent
   */
  private async parseCategory(
    content: string,
    category: string,
    config: ParseConfig
  ): Promise<CategoryParseResult> {
    const startTime = Date.now();
    
    try {
      // Create specialized prompt for this category
      const prompt = this.createCategoryPrompt(category, config);
      
      // Call AI model with the specialized prompt
      const extractedData = await this.callAIModel(prompt, content);
      
      // Convert extracted data to issues
      const issues = this.convertToIssues(extractedData, category);
      
      return {
        category,
        data: extractedData,
        confidence: this.calculateConfidence(extractedData, category),
        issues,
        metadata: {
          model: this.selectedModel.model,
          provider: this.selectedModel.provider,
          parseTime: Date.now() - startTime,
          method: 'ai'
        }
      };
    } catch (error) {
      this.log('error', `Failed to parse ${category} with AI`, { error });
      // Fallback to pattern-based parsing for this category
      return this.parseCategoryWithPatterns(content, category, startTime);
    }
  }

  /**
   * Create specialized prompt for each category
   */
  private createCategoryPrompt(category: string, config: ParseConfig): string {
    const baseContext = `
You are an expert code analyzer for ${config.language}${config.framework ? ` with ${config.framework}` : ''}.
Repository: ${config.repositorySize} size, ${config.complexity} complexity.

IMPORTANT: Extract ALL issues mentioned in the text, including:
- Numbered lists (1., 2., 3.)
- Bullet points (-, *, •)
- Issues mentioned in paragraphs
- Problems described in any format
- Both explicit issues AND implied problems

Look for keywords like: vulnerability, issue, problem, bug, error, concern, risk, threat, weakness, flaw, defect, missing, lacks, should, must, need, required, violation, breach, leak, exposure, inefficient, slow, deprecated, outdated, insecure, unsafe

Return ONLY valid JSON. Extract as much information as possible.
`;

    const categoryPrompts: Record<string, string> = {
      security: `${baseContext}
Extract ALL security issues from the text. Look for:
- SQL injection, XSS, CSRF, authentication issues, authorization problems
- Missing security headers, exposed sensitive data, weak encryption
- Any mention of CVE, CWE, or security vulnerabilities
- Issues marked as "Critical", "High", "Security Issue", etc.

EXAMPLE INPUT:
"1. **SQL Injection Vulnerability**: Direct string concatenation in database query
   - File: src/api/users.ts, Line: 45
   - The user input is directly concatenated into the SQL query
   - Code Snippet:
   \`\`\`typescript
   const query = "SELECT * FROM users WHERE id = " + userId;
   \`\`\`
2. **Missing Authentication**: API endpoint lacks authentication checks
   - File: src/api/admin.ts, Line: 12"

IMPORTANT: Extract code snippets and fixed code whenever available!

EXAMPLE OUTPUT:
{
  "vulnerabilities": [
    {
      "type": "SQL Injection",
      "severity": "critical",
      "cwe": "CWE-89",
      "cvss": 9.0,
      "file": "src/api/users.ts",
      "line": 45,
      "description": "Direct string concatenation in database query",
      "impact": "User input is directly concatenated into SQL query without parameterization",
      "remediation": "Use parameterized queries or prepared statements",
      "codeSnippet": "const query = \"SELECT * FROM users WHERE id = \" + userId;",
      "fixedCode": "const query = \"SELECT * FROM users WHERE id = ?\"; db.query(query, [userId]);"
    },
    {
      "type": "Missing Authentication",
      "severity": "high",
      "cwe": "CWE-306",
      "cvss": 7.5,
      "file": "src/api/admin.ts",
      "line": 12,
      "description": "API endpoint lacks authentication checks",
      "impact": "Unauthorized access to admin endpoints",
      "remediation": "Add authentication middleware",
      "codeSnippet": "",
      "fixedCode": ""
    }
  ],
  "securityMetrics": {
    "totalVulnerabilities": 2,
    "criticalCount": 1,
    "highCount": 1
  }
}`,

      performance: `${baseContext}
Extract ALL performance issues. Look for:
- N+1 queries, slow queries, inefficient algorithms, memory leaks
- High response times, excessive memory/CPU usage
- Unoptimized database queries, missing indexes
- Synchronous operations that should be async
- Any mention of "slow", "inefficient", "bottleneck", "performance"

EXAMPLE: "N+1 Query Problem: Each product fetch triggers individual queries
Code Snippet:
\`\`\`javascript
products.forEach(product => {
  product.reviews = db.query('SELECT * FROM reviews WHERE product_id = ?', product.id);
});
\`\`\`"

IMPORTANT: Extract code snippets showing the performance issue and the solution!

OUTPUT FORMAT:
{
  "issues": [
    {
      "type": "N+1 Query",
      "severity": "high",
      "location": {"file": "src/services/product.ts", "line": 78},
      "currentPerformance": "500ms per request",
      "expectedPerformance": "50ms per request",
      "impact": "Each product fetch triggers individual queries for related data",
      "solution": "Use eager loading or batch queries"
    }
  ],
  "metrics": {
    "responseTime": "500ms",
    "memoryUsage": "",
    "cpuUsage": "",
    "queryCount": 0
  }
}`,

      dependencies: `${baseContext}
Extract dependency issues:
{
  "vulnerable": [
    {
      "name": "package-name",
      "currentVersion": "X.X.X",
      "cve": "CVE-XXXX-XXXXX",
      "severity": "critical|high|medium|low",
      "fixedVersion": "X.X.X",
      "description": "string"
    }
  ],
  "outdated": [
    {
      "name": "package-name",
      "currentVersion": "X.X.X",
      "latestVersion": "X.X.X",
      "versionsBehind": number,
      "breakingChanges": boolean
    }
  ],
  "deprecated": [
    {
      "name": "package-name",
      "alternative": "string",
      "reason": "string"
    }
  ]
}`,

      codeQuality: `${baseContext}
Extract ALL code quality issues. Look for:
- Code smells, complexity issues, duplication, technical debt
- Missing tests, low coverage, untested code paths
- Maintainability problems, hard-to-read code
- Type safety issues, missing TypeScript types, any errors
- Linting violations, formatting issues
- Any mention of "bug", "issue", "problem", "error", "warning"
- Testing concerns, missing documentation

IMPORTANT: Include ANY issue that doesn't fit other categories!

EXAMPLE: "Missing TypeScript types in API handlers
Code Snippet:
\`\`\`typescript
export function handleRequest(req, res) {  // Missing types
  const data = req.body;  // 'any' type
  processData(data);
}
\`\`\`"

IMPORTANT: Include code snippets for any code quality issues found!

OUTPUT FORMAT:
{
  "complexity": {
    "cyclomatic": {"max": 0, "average": 0},
    "violations": []
  },
  "duplication": {
    "percentage": 0,
    "instances": []
  },
  "coverage": {
    "overall": 0,
    "line": 0,
    "branch": 0,
    "untested": []
  },
  "maintainability": {
    "index": 0,
    "grade": "C",
    "issues": [
      {"type": "Missing Types", "file": "src/api/handlers.ts", "description": "API handlers lack TypeScript type definitions"},
      {"type": "Code Smell", "file": "", "description": "Any other issue found"}
    ]
  },
  "technicalDebt": {
    "totalHours": 0,
    "hotspots": []
  }
}`,

      architecture: `${baseContext}
Extract architecture analysis:
{
  "components": [
    {
      "name": "string",
      "type": "frontend|backend|database|service",
      "dependencies": ["string"],
      "issues": ["string"]
    }
  ],
  "patterns": [
    {
      "name": "string",
      "type": "design-pattern|anti-pattern",
      "location": "string",
      "description": "string",
      "recommendation": "string"
    }
  ],
  "metrics": {
    "modularity": number,
    "coupling": number,
    "cohesion": number,
    "complexity": number
  },
  "diagram": "string (ASCII or description)",
  "recommendations": ["string"]
}`,

      breakingChanges: `${baseContext}
Extract breaking changes:
{
  "apiChanges": [
    {
      "endpoint": "string",
      "changeType": "removed|modified|deprecated",
      "oldContract": {},
      "newContract": {},
      "migrationRequired": boolean,
      "impact": "string"
    }
  ],
  "schemaChanges": [
    {
      "entity": "string",
      "changeType": "string",
      "field": "string",
      "migration": "string"
    }
  ],
  "behaviorChanges": [
    {
      "component": "string",
      "oldBehavior": "string",
      "newBehavior": "string",
      "userImpact": "string"
    }
  ]
}`,

      educational: `${baseContext}
Extract educational insights:
{
  "bestPractices": [
    {
      "title": "string",
      "description": "string",
      "example": {"bad": "string", "good": "string"},
      "relatedIssues": ["string"]
    }
  ],
  "antiPatterns": [
    {
      "name": "string",
      "description": "string",
      "example": "string",
      "alternative": "string"
    }
  ],
  "learningPaths": [
    {
      "topic": "string",
      "difficulty": "beginner|intermediate|advanced",
      "resources": ["string"],
      "estimatedTime": "string"
    }
  ]
}`,

      recommendations: `${baseContext}
Extract recommendations:
{
  "immediate": [
    {
      "action": "string",
      "priority": "critical|high|medium|low",
      "effort": "string",
      "impact": "string",
      "implementation": "string"
    }
  ],
  "shortTerm": [
    {
      "action": "string",
      "timeline": "string",
      "dependencies": ["string"],
      "expectedROI": "string"
    }
  ],
  "longTerm": [
    {
      "action": "string",
      "timeline": "string",
      "businessCase": "string"
    }
  ],
  "automation": [
    {
      "task": "string",
      "tool": "string",
      "benefit": "string"
    }
  ]
}`
    };

    return categoryPrompts[category] || categoryPrompts.codeQuality;
  }

  /**
   * Call AI model with prompt
   */
  private async callAIModel(prompt: string, content: string): Promise<any> {
    const maxRetries = 2;
    let lastError: any;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        this.log('debug', `Calling model: ${this.selectedModel.provider}/${this.selectedModel.model}`, {
          temperature: 0.1,
          maxTokens: 4000
        });
        
        const response = await this.aiService.call(
          {
            model: this.selectedModel.id || this.selectedModel.model,
            provider: this.selectedModel.provider
          } as any,
          {
            systemPrompt: prompt,
            prompt: `Analyze the following DeepWiki output and extract issues according to the instructions:\n\n${content}`,
            temperature: 0.1,
            maxTokens: 4000,
            jsonMode: true
          }
        );
        
        try {
          return JSON.parse(response.content);
        } catch (parseError) {
          this.log('warn', 'Failed to parse AI response as JSON', { parseError });
          // Clean markdown code blocks
          let cleanedContent = response.content;
          if (cleanedContent.includes('```json')) {
            cleanedContent = cleanedContent.replace(/```json\s*/g, '').replace(/```\s*/g, '');
          } else if (cleanedContent.includes('```')) {
            cleanedContent = cleanedContent.replace(/```\s*/g, '');
          }
          
          // Try to parse the cleaned content
          try {
            return JSON.parse(cleanedContent.trim());
          } catch {
            // If still fails, try to extract JSON object
            const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              return JSON.parse(jsonMatch[0]);
            }
          }
          return {};
        }
      } catch (primaryError: any) {
        lastError = primaryError;
        
        // If primary model fails, try fallback
        if (this.fallbackModel && attempt === 0) {
          this.log('warn', 'Primary model failed, trying fallback', {
            primaryModel: this.selectedModel.model,
            error: primaryError
          });
          
          try {
            this.log('debug', `Calling model: ${this.fallbackModel.provider}/${this.fallbackModel.model}`, {
              temperature: 0.1,
              maxTokens: 4000
            });
            
            const response = await this.aiService.call(
              {
                model: this.fallbackModel.id || this.fallbackModel.model,
                provider: this.fallbackModel.provider
              } as any,
              {
                systemPrompt: prompt,
                prompt: `Analyze the following DeepWiki output and extract issues according to the instructions:\n\n${content}`,
                temperature: 0.1,
                maxTokens: 4000,
                jsonMode: true
              }
            );

            // Try multiple parsing strategies for fallback response
            try {
              return JSON.parse(response.content);
            } catch (parseError) {
              this.log('warn', 'Failed to parse fallback AI response as JSON, attempting text extraction', { parseError });
              
              // Strategy 1: Clean markdown code blocks
              let cleanedContent = response.content;
              if (cleanedContent.includes('```json')) {
                cleanedContent = cleanedContent.replace(/```json\s*/g, '').replace(/```\s*/g, '');
              } else if (cleanedContent.includes('```')) {
                cleanedContent = cleanedContent.replace(/```\s*/g, '');
              }
              
              // Strategy 2: Try to parse cleaned content
              try {
                return JSON.parse(cleanedContent.trim());
              } catch {
                // Strategy 3: Extract JSON object from text
                const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  try {
                    return JSON.parse(jsonMatch[0]);
                  } catch {}
                }
                
                // Strategy 4: If fallback returns text analysis, parse it manually
                this.log('warn', 'Fallback model returned text, attempting manual extraction');
                return this.extractIssuesFromText(response.content);
              }
            }
          } catch (fallbackError) {
            this.log('error', 'Both primary and fallback models failed', { 
              primaryError,
              fallbackError 
            });
            // Try to extract issues from the original content directly
            return this.extractIssuesFromText(content);
          }
        } else {
          this.log('error', 'Primary model failed and no fallback available', { primaryError });
          // Try to extract issues from the original content directly
          return this.extractIssuesFromText(content);
        }
      }
    }
    
    throw lastError;
  }
  
  /**
   * Extract issues from text when AI models fail to return JSON
   */
  private extractIssuesFromText(text: string): any {
    const result: any = {
      vulnerabilities: [],
      issues: [],
      complexity: { violations: [] },
      maintainability: { issues: [] }
    };
    
    // Pattern to match numbered issues like "1. **Title**: Description"
    const issuePattern = /(\d+)\.\s+\*\*([^*]+)\*\*:?\s*([^\n]+)(?:\n\s+(?:File|Location):\s*([^,\n]+)(?:,\s*Line:\s*(\d+))?)?/gi;
    let match;
    
    while ((match = issuePattern.exec(text)) !== null) {
      const issue = {
        type: match[2].trim(),
        description: match[3].trim(),
        file: match[4] ? match[4].trim() : 'unknown',
        line: match[5] ? parseInt(match[5]) : undefined,
        severity: this.extractSeverity(text, match.index)
      };
      
      // Categorize based on keywords
      if (issue.type.toLowerCase().includes('security') || 
          issue.type.toLowerCase().includes('injection') ||
          issue.type.toLowerCase().includes('authentication')) {
        result.vulnerabilities.push({
          ...issue,
          cwe: '',
          impact: issue.description,
          remediation: 'Review and fix the security issue'
        });
      } else if (issue.type.toLowerCase().includes('performance') ||
                 issue.type.toLowerCase().includes('slow') ||
                 issue.type.toLowerCase().includes('n+1')) {
        result.issues.push({
          ...issue,
          location: { file: issue.file, line: issue.line }
        });
      } else {
        result.maintainability.issues.push(issue);
      }
    }
    
    return result;
  }
  
  private extractSeverity(text: string, position: number): string {
    // Look for severity mentioned near the issue (within 200 chars)
    const contextStart = Math.max(0, position - 100);
    const contextEnd = Math.min(text.length, position + 200);
    const context = text.substring(contextStart, contextEnd).toLowerCase();
    
    if (context.includes('critical')) return 'critical';
    if (context.includes('high')) return 'high';
    if (context.includes('medium')) return 'medium';
    if (context.includes('low')) return 'low';
    
    // Default based on issue type keywords
    if (context.includes('security') || context.includes('injection')) return 'high';
    if (context.includes('performance')) return 'medium';
    
    return 'medium'; // default
  }

  /**
   * Infer severity from issue type and description
   */
  private inferSeverity(type: string, description: string): string {
    const text = `${type} ${description}`.toLowerCase();
    
    if (text.includes('critical') || text.includes('security') || text.includes('vulnerability')) {
      return 'critical';
    }
    if (text.includes('high') || text.includes('error') || text.includes('fail') || text.includes('broken')) {
      return 'high';
    }
    if (text.includes('low') || text.includes('minor') || text.includes('suggestion')) {
      return 'low';
    }
    return 'medium';
  }

  /**
   * Convert extracted data to issues format
   */
  private convertToIssues(data: any, category: string): any[] {
    const issues: any[] = [];
    let id = 1;

    switch (category) {
      case 'security':
        if (data.vulnerabilities) {
          data.vulnerabilities.forEach((vuln: any) => {
            issues.push({
              id: `${category}-${id++}`,
              category: 'security',
              severity: vuln.severity,
              type: vuln.type,
              title: `${vuln.type} vulnerability`,
              description: vuln.description,
              location: vuln.file ? { file: vuln.file, line: vuln.line } : undefined,
              impact: vuln.impact,
              remediation: vuln.remediation,
              codeSnippet: vuln.codeSnippet,
              fixedCode: vuln.fixedCode,
              metadata: {
                cwe: vuln.cwe,
                cvss: vuln.cvss,
                aiExtracted: true
              }
            });
          });
        }
        break;

      case 'performance':
        if (data.issues) {
          data.issues.forEach((perf: any) => {
            issues.push({
              id: `${category}-${id++}`,
              category: 'performance',
              severity: perf.severity,
              type: perf.type,
              title: perf.type,
              description: `Current: ${perf.currentPerformance}, Expected: ${perf.expectedPerformance}`,
              location: perf.location,
              impact: perf.impact,
              recommendation: perf.solution,
              metadata: {
                currentPerformance: perf.currentPerformance,
                expectedPerformance: perf.expectedPerformance,
                aiExtracted: true
              }
            });
          });
        }
        break;

      case 'dependencies':
        // Process vulnerable dependencies
        if (data.vulnerable) {
          data.vulnerable.forEach((dep: any) => {
            issues.push({
              id: `dep-vuln-${id++}`,
              category: 'dependencies',
              severity: dep.severity,
              type: 'vulnerable',
              title: `Vulnerable: ${dep.name}@${dep.currentVersion}`,
              description: dep.description,
              message: `${dep.name} has ${dep.cve}`,
              recommendation: `Update to ${dep.fixedVersion}`,
              metadata: {
                packageName: dep.name,
                currentVersion: dep.currentVersion,
                cve: dep.cve,
                fixedVersion: dep.fixedVersion,
                dependencyType: 'vulnerable',
                aiExtracted: true
              }
            });
          });
        }

        // Process outdated dependencies
        if (data.outdated) {
          data.outdated.forEach((dep: any) => {
            issues.push({
              id: `dep-outdated-${id++}`,
              category: 'dependencies',
              severity: dep.versionsBehind > 2 ? 'medium' : 'low',
              type: 'outdated',
              title: `Outdated: ${dep.name}@${dep.currentVersion}`,
              description: `${dep.versionsBehind} versions behind`,
              message: `Update ${dep.name} to ${dep.latestVersion}`,
              recommendation: `Update to ${dep.latestVersion}`,
              metadata: {
                packageName: dep.name,
                currentVersion: dep.currentVersion,
                latestVersion: dep.latestVersion,
                versionsBehind: dep.versionsBehind,
                dependencyType: 'outdated',
                aiExtracted: true
              }
            });
          });
        }

        // Process deprecated dependencies
        if (data.deprecated) {
          data.deprecated.forEach((dep: any) => {
            issues.push({
              id: `dep-deprecated-${id++}`,
              category: 'dependencies',
              severity: 'medium',
              type: 'deprecated',
              title: `Deprecated: ${dep.name}`,
              description: dep.reason,
              message: `Replace ${dep.name}`,
              recommendation: `Use ${dep.alternative}`,
              metadata: {
                packageName: dep.name,
                alternative: dep.alternative,
                dependencyType: 'deprecated',
                aiExtracted: true
              }
            });
          });
        }
        break;

      case 'codeQuality':
        // MOST IMPORTANT: Process maintainability issues (this is where most issues are!)
        if (data.maintainability?.issues) {
          data.maintainability.issues.forEach((issue: any) => {
            issues.push({
              id: `quality-${id++}`,
              category: 'code-quality',
              severity: this.inferSeverity(issue.type, issue.description),
              type: issue.type || 'code-quality',
              title: issue.type || 'Code Quality Issue',
              description: issue.description,
              location: issue.file ? { file: issue.file, line: 0 } : undefined,
              metadata: {
                aiExtracted: true
              }
            });
          });
        }

        // Process complexity violations
        if (data.complexity?.violations) {
          data.complexity.violations.forEach((violation: any) => {
            issues.push({
              id: `quality-complexity-${id++}`,
              category: 'code-quality',
              severity: violation.complexity > 20 ? 'high' : violation.complexity > 15 ? 'medium' : 'low',
              type: 'complexity',
              title: `High complexity in ${violation.function}`,
              description: `Complexity: ${violation.complexity}`,
              location: { file: violation.file, line: 0 },
              recommendation: 'Refactor to reduce complexity',
              metadata: {
                metricType: 'complexity',
                value: violation.complexity,
                aiExtracted: true
              }
            });
          });
        }

        // Process duplication
        if (data.duplication?.percentage > 5) {
          issues.push({
            id: `quality-duplication-${id++}`,
            category: 'code-quality',
            severity: data.duplication.percentage > 15 ? 'high' : data.duplication.percentage > 10 ? 'medium' : 'low',
            type: 'duplication',
            title: `Code duplication: ${data.duplication.percentage}%`,
            description: 'Extract common code into reusable functions',
            metadata: {
              metricType: 'duplication',
              percentage: data.duplication.percentage,
              instances: data.duplication.instances,
              aiExtracted: true
            }
          });
        }

        // Process test coverage
        if (data.coverage?.overall > 0 && data.coverage.overall < 80) {
          issues.push({
            id: `quality-coverage-${id++}`,
            category: 'code-quality',
            severity: data.coverage.overall < 50 ? 'high' : data.coverage.overall < 70 ? 'medium' : 'low',
            type: 'testing',
            title: `Low test coverage: ${data.coverage.overall}%`,
            description: 'Increase test coverage to at least 80%',
            metadata: {
              metricType: 'coverage',
              overall: data.coverage.overall,
              aiExtracted: true
            }
          });
        }
        break;

      case 'architecture':
        // Process architecture anti-patterns
        if (data.patterns) {
          data.patterns
            .filter((p: any) => p.type === 'anti-pattern')
            .forEach((pattern: any) => {
              issues.push({
                id: `arch-${id++}`,
                category: 'architecture',
                severity: 'medium',
                type: 'anti-pattern',
                title: pattern.name,
                description: pattern.description,
                location: pattern.location,
                recommendation: pattern.recommendation,
                metadata: {
                  patternType: 'anti-pattern',
                  aiExtracted: true
                }
              });
            });
        }
        break;

      case 'breakingChanges':
        // Process API changes
        if (data.apiChanges) {
          data.apiChanges.forEach((change: any) => {
            issues.push({
              id: `breaking-${id++}`,
              category: 'breaking-change',
              severity: 'high',
              type: 'api-change',
              title: `Breaking: ${change.endpoint} ${change.changeType}`,
              description: change.impact,
              message: `API ${change.changeType}: ${change.endpoint}`,
              metadata: {
                endpoint: change.endpoint,
                changeType: change.changeType,
                migrationRequired: change.migrationRequired,
                aiExtracted: true
              }
            });
          });
        }
        break;
    }

    return issues;
  }

  /**
   * Calculate confidence score for extracted data
   */
  private calculateConfidence(data: any, category: string): number {
    if (!data || Object.keys(data).length === 0) return 0.3;
    
    // Higher base confidence for AI extraction (we're using advanced models)
    let confidence = 0.65; // Base confidence increased from 0.5
    
    // Generic quality checks that apply to all categories
    const hasData = Object.keys(data).some(key => {
      const value = data[key];
      return value && (
        (Array.isArray(value) && value.length > 0) ||
        (typeof value === 'object' && Object.keys(value).length > 0) ||
        (typeof value === 'string' && value.length > 0) ||
        (typeof value === 'number' && value > 0)
      );
    });
    
    if (hasData) confidence += 0.1;
    
    // Check for completeness based on category
    switch (category) {
      case 'security':
        if (data.vulnerabilities?.length > 0) {
          confidence += 0.15;
          // Extra confidence for detailed vulnerability data
          if (data.vulnerabilities.some((v: any) => v.file && v.line)) confidence += 0.05;
          if (data.vulnerabilities.some((v: any) => v.cwe)) confidence += 0.05;
          if (data.vulnerabilities.some((v: any) => v.remediation)) confidence += 0.05;
          // HIGH confidence boost for code snippets and fixes
          if (data.vulnerabilities.some((v: any) => v.codeSnippet && v.codeSnippet.length > 0)) confidence += 0.1;
          if (data.vulnerabilities.some((v: any) => v.fixedCode && v.fixedCode.length > 0)) confidence += 0.05;
        }
        if (data.securityMetrics) confidence += 0.05;
        break;
      
      case 'performance':
        if (data.issues?.length > 0) {
          confidence += 0.15;
          // Extra confidence for location data
          if (data.issues.some((i: any) => i.location?.file)) confidence += 0.05;
          if (data.issues.some((i: any) => i.solution)) confidence += 0.05;
          // Code snippets boost confidence significantly
          if (data.issues.some((i: any) => i.codeSnippet && i.codeSnippet.length > 0)) confidence += 0.1;
          if (data.issues.some((i: any) => i.fixedCode && i.fixedCode.length > 0)) confidence += 0.05;
        }
        if (data.metrics && Object.keys(data.metrics).length > 0) confidence += 0.05;
        break;
      
      case 'dependencies':
        const hasDepData = data.vulnerable?.length > 0 || 
                          data.outdated?.length > 0 || 
                          data.deprecated?.length > 0;
        if (hasDepData) {
          confidence += 0.2;
          if (data.vulnerable?.some((v: any) => v.cve)) confidence += 0.1;
          if (data.outdated?.some((o: any) => o.latestVersion)) confidence += 0.05;
        }
        break;
      
      case 'codeQuality':
        // Much better confidence calculation for code quality
        if (data.maintainability?.issues?.length > 0) {
          confidence += 0.2; // Main source of code quality issues
          if (data.maintainability.issues.some((i: any) => i.file)) confidence += 0.05;
          // Code snippets for quality issues increase confidence
          if (data.maintainability.issues.some((i: any) => i.codeSnippet && i.codeSnippet.length > 0)) confidence += 0.1;
        }
        if (data.complexity?.violations?.length > 0) confidence += 0.05;
        if (data.duplication?.percentage > 0) confidence += 0.05;
        if (data.coverage?.overall > 0) confidence += 0.05;
        if (data.technicalDebt?.totalHours > 0) confidence += 0.05;
        break;
        
      case 'architecture':
        if (data.patterns?.length > 0) confidence += 0.15;
        if (data.components?.length > 0) confidence += 0.1;
        if (data.recommendations?.length > 0) confidence += 0.1;
        break;
        
      case 'breakingChanges':
        if (data.apiChanges?.length > 0) confidence += 0.2;
        if (data.schemaChanges?.length > 0) confidence += 0.1;
        if (data.behaviorChanges?.length > 0) confidence += 0.05;
        break;
        
      case 'educational':
        if (data.concepts?.length > 0) confidence += 0.15;
        if (data.bestPractices?.length > 0) confidence += 0.1;
        if (data.learningResources?.length > 0) confidence += 0.1;
        break;
        
      case 'recommendations':
        if (data.immediate?.length > 0) confidence += 0.15;
        if (data.shortTerm?.length > 0) confidence += 0.1;
        if (data.longTerm?.length > 0) confidence += 0.1;
        break;
    }
    
    return Math.min(1, confidence);
  }

  /**
   * Calculate scores based on extracted data
   */
  private calculateScores(categories: Record<string, CategoryParseResult>): Record<string, number> {
    const scores: Record<string, number> = {};
    
    // Security score
    const securityIssues = categories.security.issues;
    scores.security = Math.max(0, 100 - 
      securityIssues.filter(i => i.severity === 'critical').length * 25 -
      securityIssues.filter(i => i.severity === 'high').length * 15 -
      securityIssues.filter(i => i.severity === 'medium').length * 5
    );
    
    // Performance score
    const perfIssues = categories.performance.issues;
    scores.performance = Math.max(0, 100 -
      perfIssues.filter(i => i.severity === 'high').length * 20 -
      perfIssues.filter(i => i.severity === 'medium').length * 10
    );
    
    // Dependencies score
    const depData = categories.dependencies.data;
    scores.dependencies = Math.max(0, 100 -
      (depData.vulnerable?.length || 0) * 20 -
      (depData.outdated?.length || 0) * 5 -
      (depData.deprecated?.length || 0) * 10
    );
    
    // Code quality score
    const qualityData = categories.codeQuality.data;
    let qualityScore = 100;
    if (qualityData.complexity?.average > 10) qualityScore -= 20;
    if (qualityData.duplication?.percentage > 10) qualityScore -= 15;
    if (qualityData.coverage?.overall < 80) qualityScore -= 20;
    scores.codeQuality = Math.max(0, qualityScore);
    
    // Architecture score
    const archData = categories.architecture.data;
    scores.architecture = archData.metrics?.modularity || 75;
    
    // Overall score
    scores.overall = Math.round(
      (scores.security + scores.performance + scores.dependencies + 
       scores.codeQuality + scores.architecture) / 5
    );
    
    return scores;
  }

  /**
   * Fallback to pattern-based parsing when AI is unavailable
   */
  private fallbackParsing(content: string, config: ParseConfig): ParsedDeepWikiResponse {
    // Use existing parsers as fallback
    const { parseEnhancedDependencies } = require('./enhanced-dependency-parser');
    const { parseEnhancedCodeQuality } = require('./enhanced-code-quality-parser');
    
    const startTime = Date.now();
    
    // Parse with existing enhanced parsers
    const dependencies = parseEnhancedDependencies(content);
    const codeQuality = parseEnhancedCodeQuality(content);
    
    // Create category results
    const dependenciesResult: CategoryParseResult = {
      category: 'dependencies',
      data: dependencies,
      confidence: 0.7,
      issues: this.convertToIssues(dependencies, 'dependencies'),
      metadata: {
        parseTime: Date.now() - startTime,
        method: 'pattern'
      }
    };
    
    const codeQualityResult: CategoryParseResult = {
      category: 'codeQuality',
      data: codeQuality,
      confidence: 0.7,
      issues: this.convertToIssues(codeQuality, 'codeQuality'),
      metadata: {
        parseTime: Date.now() - startTime,
        method: 'pattern'
      }
    };
    
    // Create empty results for other categories
    const emptyResult = (category: string): CategoryParseResult => ({
      category,
      data: {},
      confidence: 0,
      issues: [],
      metadata: {
        parseTime: 0,
        method: 'pattern'
      }
    });
    
    return {
      security: emptyResult('security'),
      performance: emptyResult('performance'),
      dependencies: dependenciesResult,
      codeQuality: codeQualityResult,
      architecture: emptyResult('architecture'),
      breakingChanges: emptyResult('breakingChanges'),
      educational: emptyResult('educational'),
      recommendations: emptyResult('recommendations'),
      allIssues: [...dependenciesResult.issues, ...codeQualityResult.issues],
      scores: this.calculateScores({
        security: emptyResult('security'),
        performance: emptyResult('performance'),
        dependencies: dependenciesResult,
        codeQuality: codeQualityResult,
        architecture: emptyResult('architecture')
      })
    };
  }

  /**
   * Parse a specific category with pattern matching (fallback)
   */
  private parseCategoryWithPatterns(
    content: string,
    category: string,
    startTime: number
  ): CategoryParseResult {
    // Basic pattern extraction for fallback
    const issues: any[] = [];
    const lines = content.split('\n');
    
    lines.forEach(line => {
      // Extract issues based on patterns
      if (category === 'security' && line.match(/vulnerability|CVE-|security/i)) {
        issues.push({
          id: `${category}-pattern-${issues.length + 1}`,
          category: 'security',
          severity: 'medium',
          title: 'Security issue detected',
          description: line.trim(),
          metadata: { patternMatched: true }
        });
      }
    });
    
    return {
      category,
      data: {},
      confidence: 0.3,
      issues,
      metadata: {
        parseTime: Date.now() - startTime,
        method: 'pattern'
      }
    };
  }

  private log(level: 'info' | 'error' | 'warn' | 'debug', message: string, data?: any): void {
    if (this.logger) {
      const logMessage = `[UnifiedAIParser] ${message}`;
      switch (level) {
        case 'info':
          this.logger.info(logMessage, data);
          break;
        case 'error':
          this.logger.error(logMessage, data);
          break;
        case 'warn':
          this.logger.warn(logMessage, data);
          break;
        case 'debug':
          if ('debug' in this.logger && typeof this.logger.debug === 'function') {
            (this.logger as any).debug(logMessage, data);
          } else {
            this.logger.info(logMessage, data);
          }
          break;
      }
    } else {
      console.log(`[UnifiedAIParser] [${level.toUpperCase()}] ${message}`, data || '');
    }
  }
}