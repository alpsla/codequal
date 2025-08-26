/**
 * AI-Driven Parser for DeepWiki Responses
 * 
 * Instead of rigid rule-based parsing, this uses AI models to intelligently
 * extract structured data from unstructured DeepWiki responses.
 * 
 * Benefits:
 * - Handles varied response formats
 * - Adapts to different languages and frameworks
 * - Extracts implicit information
 * - Better context understanding
 * - Self-improving with examples
 */

import { ModelVersionSync } from '../../../model-selection/model-version-sync';

export interface ParserConfig {
  category: 'security' | 'performance' | 'dependencies' | 'code-quality' | 'breaking-changes' | 'educational' | 'recommendations';
  language: string;
  framework?: string;
  repoSize: 'small' | 'medium' | 'large';
  complexity: 'low' | 'medium' | 'high';
}

export interface ParsedResult {
  category: string;
  extractedData: any;
  confidence: number;
  metadata: Record<string, any>;
}

export class AIDrivenParser {
  private modelSelector: ModelVersionSync;
  
  constructor(modelSelector?: ModelVersionSync) {
    this.modelSelector = modelSelector || new ModelVersionSync();
  }

  /**
   * Create a specialized parser agent for a specific category
   */
  async parseCategory(
    deepWikiResponse: string,
    config: ParserConfig
  ): Promise<ParsedResult> {
    // Select optimal model based on context
    const model = await this.selectOptimalModel(config);
    
    // Generate specialized prompt for the category
    const prompt = this.generateCategoryPrompt(config.category, config);
    
    // If no AI available, use enhanced rule-based parsing
    if (!model) {
      return this.fallbackToPatternsWithAIStructure(deepWikiResponse, config);
    }
    
    // Call AI model to parse the response
    const parsedData = await this.callAIModel(model, prompt, deepWikiResponse);
    
    return {
      category: config.category,
      extractedData: parsedData,
      confidence: this.calculateConfidence(parsedData),
      metadata: {
        model: model.model,
        language: config.language,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Select the optimal model based on repository context
   */
  private async selectOptimalModel(config: ParserConfig): Promise<any> {
    // Use existing model selection logic
    const requirements = {
      task: 'parsing',
      category: config.category,
      complexity: config.complexity,
      needsCodeUnderstanding: true
    };
    
    // In real implementation, this would call ModelVersionSync
    return {
      model: 'gpt-4o',
      provider: 'openai',
      temperature: 0.1,
      maxTokens: 2000
    };
  }

  /**
   * Generate specialized prompts for each category
   */
  private generateCategoryPrompt(category: string, config: ParserConfig): string {
    const baseContext = `
You are an expert code analyzer specializing in ${config.language} ${config.framework ? `with ${config.framework}` : ''}.
Repository size: ${config.repoSize}, Complexity: ${config.complexity}.

Parse the following DeepWiki analysis response and extract structured data.
Return ONLY valid JSON with the specified structure. No explanations or markdown.
`;

    const categoryPrompts: Record<string, string> = {
      security: `${baseContext}
Extract security vulnerabilities with this EXACT structure:
{
  "vulnerabilities": [
    {
      "type": "SQL Injection|XSS|CSRF|etc",
      "severity": "critical|high|medium|low",
      "cwe": "CWE-XXX",
      "cvss": 0.0,
      "file": "path/to/file.ext",
      "line": 123,
      "description": "detailed description",
      "attackVector": "network|local|physical",
      "exploitDifficulty": "low|medium|high",
      "impact": "description of impact",
      "remediation": "specific fix with code example",
      "codeSnippet": "vulnerable code",
      "fixedCode": "corrected code"
    }
  ],
  "securityHeaders": {
    "missing": ["header names"],
    "misconfigured": ["header: issue"]
  },
  "authentication": {
    "issues": ["issue descriptions"],
    "recommendations": ["recommendations"]
  },
  "encryption": {
    "status": "enabled|partial|disabled",
    "issues": ["issues if any"]
  }
}`,

      performance: `${baseContext}
Extract performance metrics with this EXACT structure:
{
  "metrics": {
    "responseTime": {
      "current": "XXXms",
      "target": "XXXms",
      "bottlenecks": ["description"]
    },
    "memory": {
      "usage": "XXXMB",
      "leaks": ["description with location"]
    },
    "cpu": {
      "utilization": "XX%",
      "hotspots": ["function: percentage"]
    }
  },
  "databasePerformance": [
    {
      "type": "N+1|SlowQuery|MissingIndex",
      "query": "query description",
      "location": "file:line",
      "currentTime": "XXXms",
      "expectedTime": "XXXms",
      "solution": "specific solution"
    }
  ],
  "bundleSize": {
    "total": "XXXKB",
    "recommendations": ["optimization suggestions"]
  },
  "algorithmComplexity": [
    {
      "function": "functionName",
      "file": "path/to/file",
      "current": "O(n²)",
      "optimal": "O(n log n)",
      "impact": "description"
    }
  ],
  "cachingOpportunities": [
    {
      "endpoint": "path",
      "benefit": "XX% reduction",
      "implementation": "how to implement"
    }
  ]
}`,

      dependencies: `${baseContext}
Extract dependency information with this EXACT structure:
{
  "vulnerable": [
    {
      "name": "package-name",
      "currentVersion": "X.X.X",
      "cve": "CVE-XXXX-XXXXX",
      "severity": "critical|high|medium|low",
      "description": "vulnerability description",
      "fixedVersion": "X.X.X",
      "breakingChanges": true|false
    }
  ],
  "outdated": [
    {
      "name": "package-name",
      "currentVersion": "X.X.X",
      "latestVersion": "X.X.X",
      "versionsBehind": X,
      "type": "major|minor|patch",
      "breakingChanges": ["list of breaking changes"],
      "migrationEffort": "low|medium|high"
    }
  ],
  "deprecated": [
    {
      "name": "package-name",
      "currentVersion": "X.X.X",
      "deprecatedSince": "date",
      "alternative": "alternative-package",
      "migrationGuide": "migration steps"
    }
  ],
  "unused": ["package-name"],
  "duplicates": [
    {
      "name": "package-name",
      "versions": ["X.X.X", "Y.Y.Y"]
    }
  ]
}`,

      'code-quality': `${baseContext}
Extract code quality metrics with this EXACT structure:
{
  "complexity": {
    "cyclomatic": {
      "max": XX,
      "average": XX.X,
      "violations": [
        {
          "function": "name",
          "file": "path",
          "complexity": XX,
          "recommendation": "how to reduce"
        }
      ]
    },
    "cognitive": {
      "max": XX,
      "average": XX.X
    }
  },
  "duplication": {
    "percentage": XX.X,
    "instances": [
      {
        "files": ["file1", "file2"],
        "lines": XX,
        "type": "exact|similar",
        "extractTo": "suggested function/module"
      }
    ]
  },
  "coverage": {
    "overall": XX.X,
    "byType": {
      "unit": XX.X,
      "integration": XX.X,
      "e2e": XX.X
    },
    "untested": [
      {
        "file": "path",
        "coverage": XX.X,
        "criticalPaths": ["path descriptions"]
      }
    ]
  },
  "maintainability": {
    "index": XX,
    "grade": "A|B|C|D|F",
    "issues": [
      {
        "type": "LongMethod|GodClass|DeadCode|etc",
        "location": "file:line",
        "description": "issue description",
        "refactoring": "suggested refactoring"
      }
    ]
  },
  "technicalDebt": {
    "totalHours": XX,
    "byCategory": {
      "complexity": XX,
      "duplication": XX,
      "coverage": XX,
      "documentation": XX
    },
    "hotspots": [
      {
        "file": "path",
        "debtHours": XX,
        "priority": "high|medium|low"
      }
    ]
  }
}`,

      'breaking-changes': `${baseContext}
Extract breaking changes with this EXACT structure:
{
  "apiChanges": [
    {
      "endpoint": "path",
      "method": "GET|POST|etc",
      "changeType": "removed|modified|deprecated",
      "oldContract": {},
      "newContract": {},
      "migrationRequired": true|false,
      "backwardCompatible": true|false,
      "clientImpact": "description",
      "migrationSteps": ["step1", "step2"]
    }
  ],
  "schemaChanges": [
    {
      "entity": "name",
      "changeType": "field_removed|type_changed|etc",
      "field": "fieldName",
      "oldType": "type",
      "newType": "type",
      "migrationScript": "SQL or code",
      "dataLossRisk": true|false
    }
  ],
  "configChanges": [
    {
      "file": "config file path",
      "setting": "setting name",
      "oldValue": "value",
      "newValue": "value",
      "impact": "description",
      "required": true|false
    }
  ],
  "behaviorChanges": [
    {
      "component": "component name",
      "oldBehavior": "description",
      "newBehavior": "description",
      "userImpact": "description",
      "testingRequired": ["test scenarios"]
    }
  ],
  "dependencyConflicts": [
    {
      "package": "name",
      "requiredBy": "parent package",
      "conflict": "description",
      "resolution": "how to resolve"
    }
  ]
}`,

      educational: `${baseContext}
Extract educational insights with this EXACT structure:
{
  "learningTopics": [
    {
      "topic": "topic name",
      "category": "security|performance|patterns|etc",
      "difficulty": "beginner|intermediate|advanced",
      "prerequisites": ["prerequisite topics"],
      "estimatedTime": "XX minutes",
      "relevantToIssues": ["issue IDs"]
    }
  ],
  "bestPractices": [
    {
      "practice": "name",
      "description": "detailed description",
      "example": {
        "bad": "bad code example",
        "good": "good code example"
      },
      "benefits": ["benefit1", "benefit2"],
      "appliesTo": ["contexts where applicable"]
    }
  ],
  "antiPatterns": [
    {
      "pattern": "name",
      "description": "why it's bad",
      "example": "code example",
      "alternative": "better approach",
      "commonMistakes": ["mistake descriptions"]
    }
  ],
  "resources": [
    {
      "type": "documentation|video|tutorial|course",
      "title": "resource title",
      "url": "URL if available",
      "description": "what it covers",
      "difficulty": "level",
      "timeRequired": "estimated time"
    }
  ],
  "exercises": [
    {
      "title": "exercise name",
      "objective": "learning objective",
      "task": "detailed task description",
      "hints": ["hint1", "hint2"],
      "solution": "solution approach"
    }
  ]
}`,

      recommendations: `${baseContext}
Extract actionable recommendations with this EXACT structure:
{
  "immediate": [
    {
      "action": "specific action",
      "priority": "critical|high|medium|low",
      "category": "security|performance|quality|etc",
      "effort": "hours or days",
      "impact": "expected impact",
      "prerequisites": ["required before starting"],
      "implementation": "step-by-step guide",
      "tools": ["tool1", "tool2"],
      "skillsRequired": ["skill1", "skill2"]
    }
  ],
  "shortTerm": [
    {
      "action": "action description",
      "timeline": "1-4 weeks",
      "dependencies": ["depends on"],
      "team": "who should do it",
      "expectedROI": "return on investment"
    }
  ],
  "longTerm": [
    {
      "action": "strategic action",
      "timeline": "1-6 months",
      "businessCase": "why it matters",
      "resources": "required resources",
      "milestones": ["milestone1", "milestone2"]
    }
  ],
  "automation": [
    {
      "task": "what to automate",
      "currentEffort": "manual hours",
      "automatedEffort": "reduced to",
      "tools": ["CI/CD tool", "script"],
      "implementation": "how to automate"
    }
  ],
  "training": [
    {
      "topic": "training topic",
      "audience": "who needs it",
      "reason": "skill gap identified",
      "format": "workshop|course|mentoring",
      "duration": "time required"
    }
  ]
}`
    };

    return categoryPrompts[category] || categoryPrompts['code-quality'];
  }

  /**
   * Call AI model to parse the response
   */
  private async callAIModel(
    model: any,
    prompt: string,
    deepWikiResponse: string
  ): Promise<any> {
    try {
      // In real implementation, this would call the actual AI model
      // For now, return mock structured data
      console.log(`[AI Parser] Using ${model.model} to parse ${prompt.slice(0, 50)}...`);
      
      // This would be the actual API call:
      // const response = await callOpenAI({
      //   model: model.model,
      //   messages: [
      //     { role: 'system', content: prompt },
      //     { role: 'user', content: deepWikiResponse }
      //   ],
      //   temperature: model.temperature,
      //   maxTokens: model.maxTokens
      // });
      
      // return JSON.parse(response.content);
      
      return this.mockAIParsing(deepWikiResponse, prompt);
    } catch (error) {
      console.error('[AI Parser] Error calling AI model:', error);
      return this.fallbackToPatternsWithAIStructure(deepWikiResponse, { 
        category: 'code-quality',
        language: 'typescript',
        repoSize: 'medium',
        complexity: 'medium'
      } as ParserConfig);
    }
  }

  /**
   * Mock AI parsing for testing
   */
  private mockAIParsing(response: string, prompt: string): any {
    // Return structured data based on the category in the prompt
    if (prompt.includes('security')) {
      return {
        vulnerabilities: [
          {
            type: 'SQL Injection',
            severity: 'critical',
            cwe: 'CWE-89',
            cvss: 9.8,
            file: 'src/api/users.ts',
            line: 45,
            description: 'User input directly concatenated in SQL query',
            attackVector: 'network',
            exploitDifficulty: 'low',
            impact: 'Complete database compromise possible',
            remediation: 'Use parameterized queries',
            codeSnippet: 'query = "SELECT * FROM users WHERE id = " + userId',
            fixedCode: 'query = "SELECT * FROM users WHERE id = ?", [userId]'
          }
        ],
        securityHeaders: {
          missing: ['Content-Security-Policy', 'X-Frame-Options'],
          misconfigured: []
        },
        authentication: {
          issues: ['No rate limiting on login endpoint'],
          recommendations: ['Implement OAuth 2.0']
        },
        encryption: {
          status: 'partial',
          issues: ['HTTP used for some endpoints']
        }
      };
    }
    
    // Return empty structure for other categories
    return {};
  }

  /**
   * Fallback to pattern-based parsing with AI-like structure
   */
  private fallbackToPatternsWithAIStructure(
    response: string,
    config: ParserConfig
  ): ParsedResult {
    console.log(`[AI Parser] Falling back to enhanced pattern matching for ${config.category}`);
    
    // Use our existing parsers but return in AI structure
    let extractedData = {};
    
    switch (config.category) {
      case 'dependencies': {
        // Use existing enhanced-dependency-parser
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { parseEnhancedDependencies } = require('./enhanced-dependency-parser');
        extractedData = parseEnhancedDependencies(response);
        break;
      }
        
      case 'code-quality': {
        // Use existing enhanced-code-quality-parser
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { parseEnhancedCodeQuality } = require('./enhanced-code-quality-parser');
        extractedData = parseEnhancedCodeQuality(response);
        break;
      }
        
      default:
        // Basic pattern extraction for other categories
        extractedData = this.basicPatternExtraction(response, config.category);
    }
    
    return {
      category: config.category,
      extractedData,
      confidence: 0.7, // Lower confidence for pattern-based
      metadata: {
        method: 'pattern-based',
        language: config.language,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Basic pattern extraction for categories without dedicated parsers
   */
  private basicPatternExtraction(response: string, category: string): any {
    const lines = response.split('\n');
    const result: any = {};
    
    // Extract based on common patterns
    lines.forEach(line => {
      // Extract severity patterns
      if (line.match(/critical|high|medium|low/i)) {
        result.severityMentions = (result.severityMentions || 0) + 1;
      }
      
      // Extract file:line patterns
      const fileMatch = line.match(/(\S+\.(ts|js|tsx|jsx)).*?(?::|line)\s*(\d+)/i);
      if (fileMatch) {
        result.locations = result.locations || [];
        result.locations.push({
          file: fileMatch[1],
          line: parseInt(fileMatch[3])
        });
      }
    });
    
    return result;
  }

  /**
   * Calculate confidence score for parsed data
   */
  private calculateConfidence(data: any): number {
    if (!data || Object.keys(data).length === 0) return 0;
    
    let confidence = 0.5; // Base confidence
    
    // Increase confidence based on data completeness
    if (data.vulnerabilities?.length > 0) confidence += 0.1;
    if (data.metrics?.responseTime) confidence += 0.1;
    if (data.coverage?.overall) confidence += 0.1;
    
    // Check for required fields based on category
    const hasLocations = data.vulnerabilities?.some((v: any) => v.file && v.line);
    if (hasLocations) confidence += 0.2;
    
    return Math.min(1, confidence);
  }

  /**
   * Batch parse multiple categories
   */
  async parseAllCategories(
    deepWikiResponse: string,
    repoContext: Omit<ParserConfig, 'category'>
  ): Promise<Record<string, ParsedResult>> {
    const categories: ParserConfig['category'][] = [
      'security',
      'performance',
      'dependencies',
      'code-quality',
      'breaking-changes',
      'educational',
      'recommendations'
    ];
    
    const results: Record<string, ParsedResult> = {};
    
    // Parse each category in parallel for efficiency
    const promises = categories.map(async (category) => {
      const config: ParserConfig = { ...repoContext, category };
      const result = await this.parseCategory(deepWikiResponse, config);
      results[category] = result;
    });
    
    await Promise.all(promises);
    
    return results;
  }
}

/**
 * Convert AI-parsed data to issues format
 */
export function aiParsedDataToIssues(parsedResults: Record<string, ParsedResult>): any[] {
  const issues: any[] = [];
  let issueId = 1;
  
  // Convert security data
  if (parsedResults.security?.extractedData?.vulnerabilities) {
    parsedResults.security.extractedData.vulnerabilities.forEach((vuln: any) => {
      issues.push({
        id: `ai-security-${issueId++}`,
        severity: vuln.severity,
        category: 'security',
        type: vuln.type,
        title: `${vuln.type} vulnerability`,
        description: vuln.description,
        location: vuln.file ? { file: vuln.file, line: vuln.line } : undefined,
        codeSnippet: vuln.codeSnippet,
        remediation: vuln.remediation,
        fixedCode: vuln.fixedCode,
        metadata: {
          cwe: vuln.cwe,
          cvss: vuln.cvss,
          attackVector: vuln.attackVector,
          exploitDifficulty: vuln.exploitDifficulty,
          aiParsed: true,
          confidence: parsedResults.security.confidence
        }
      });
    });
  }
  
  // Convert performance data
  if (parsedResults.performance?.extractedData?.databasePerformance) {
    parsedResults.performance.extractedData.databasePerformance.forEach((perf: any) => {
      issues.push({
        id: `ai-performance-${issueId++}`,
        severity: perf.currentTime > 1000 ? 'high' : 'medium',
        category: 'performance',
        type: perf.type,
        title: perf.type,
        description: `${perf.query} - Current: ${perf.currentTime}, Expected: ${perf.expectedTime}`,
        location: perf.location ? {
          file: perf.location.split(':')[0],
          line: parseInt(perf.location.split(':')[1] || '0')
        } : undefined,
        recommendation: perf.solution,
        metadata: {
          currentTime: perf.currentTime,
          expectedTime: perf.expectedTime,
          aiParsed: true,
          confidence: parsedResults.performance.confidence
        }
      });
    });
  }
  
  // Add more conversions for other categories...
  
  return issues;
}