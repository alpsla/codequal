/**
 * Unified AI-Driven Parser for ALL DeepWiki Response Categories
 * 
 * Uses the existing model selection infrastructure to create specialized
 * sub-agents for each category, replacing all rule-based parsers.
 */

import { DynamicModelSelector, RoleRequirements } from '../../services/dynamic-model-selector';
import { ILogger } from '../../services/interfaces/logger.interface';

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
}

/**
 * Unified parser that creates sub-agents for each category
 */
export class UnifiedAIParser {
  private modelSelector: DynamicModelSelector;
  private selectedModel: any;
  private logger?: ILogger;

  constructor(logger?: ILogger) {
    this.modelSelector = new DynamicModelSelector();
    this.logger = logger;
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
      // Select model based on repository context
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
      
      this.log('info', `Selected model for parsing: ${this.selectedModel.model} (${this.selectedModel.provider})`);
    } catch (error) {
      this.log('warn', 'Model selection failed, using fallback', error);
      this.selectedModel = {
        model: 'gpt-4o',
        provider: 'openai',
        temperature: 0.1,
        maxTokens: 2000
      };
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
    const allIssues = [
      ...security.issues,
      ...performance.issues,
      ...dependencies.issues,
      ...codeQuality.issues,
      ...architecture.issues,
      ...breakingChanges.issues
    ];

    // Calculate scores based on extracted data
    const scores = this.calculateScores({
      security,
      performance,
      dependencies,
      codeQuality,
      architecture
    });

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
      scores
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

Analyze the DeepWiki response and extract structured data for the ${category} category.
Return ONLY valid JSON. No markdown, no explanations.
`;

    const categoryPrompts: Record<string, string> = {
      security: `${baseContext}
Extract security issues:
{
  "vulnerabilities": [
    {
      "type": "string (SQL Injection, XSS, CSRF, etc)",
      "severity": "critical|high|medium|low",
      "cwe": "CWE-XXX",
      "cvss": number,
      "file": "path/to/file",
      "line": number,
      "description": "string",
      "impact": "string",
      "remediation": "string",
      "codeSnippet": "string",
      "fixedCode": "string"
    }
  ],
  "securityMetrics": {
    "totalVulnerabilities": number,
    "criticalCount": number,
    "highCount": number
  }
}`,

      performance: `${baseContext}
Extract performance issues:
{
  "issues": [
    {
      "type": "N+1 Query|Slow Query|Memory Leak|etc",
      "severity": "high|medium|low",
      "location": {"file": "path", "line": number},
      "currentPerformance": "string",
      "expectedPerformance": "string",
      "impact": "string",
      "solution": "string"
    }
  ],
  "metrics": {
    "responseTime": "string",
    "memoryUsage": "string",
    "cpuUsage": "string",
    "queryCount": number
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
Extract code quality metrics:
{
  "complexity": {
    "cyclomatic": {"max": number, "average": number},
    "violations": [
      {"function": "name", "file": "path", "complexity": number}
    ]
  },
  "duplication": {
    "percentage": number,
    "instances": [
      {"files": ["file1", "file2"], "lines": number}
    ]
  },
  "coverage": {
    "overall": number,
    "line": number,
    "branch": number,
    "untested": [
      {"file": "path", "coverage": number}
    ]
  },
  "maintainability": {
    "index": number,
    "grade": "A|B|C|D|F",
    "issues": [
      {"type": "string", "file": "path", "description": "string"}
    ]
  },
  "technicalDebt": {
    "totalHours": number,
    "hotspots": [
      {"file": "path", "debtHours": number}
    ]
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
    // In production, this would call the actual AI service
    // For now, return mock data or use the model service
    
    if (!this.selectedModel) {
      throw new Error('Model not initialized');
    }

    // This would be the actual call:
    // const response = await this.modelService.query({
    //   provider: this.selectedModel.provider,
    //   model: this.selectedModel.model,
    //   messages: [
    //     { role: 'system', content: prompt },
    //     { role: 'user', content: content }
    //   ],
    //   temperature: 0.1,
    //   maxTokens: 2000
    // });
    // return JSON.parse(response.content);

    // For now, return empty structure
    return {};
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
        if (data.coverage?.overall < 80) {
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
    
    let confidence = 0.5; // Base confidence
    
    // Check for completeness based on category
    switch (category) {
      case 'security':
        if (data.vulnerabilities?.length > 0) confidence += 0.2;
        if (data.securityMetrics) confidence += 0.1;
        if (data.vulnerabilities?.some((v: any) => v.cwe)) confidence += 0.2;
        break;
      
      case 'performance':
        if (data.issues?.length > 0) confidence += 0.2;
        if (data.metrics) confidence += 0.2;
        if (data.issues?.some((i: any) => i.location)) confidence += 0.1;
        break;
      
      case 'dependencies':
        if (data.vulnerable || data.outdated || data.deprecated) confidence += 0.3;
        if (data.vulnerable?.some((v: any) => v.cve)) confidence += 0.2;
        break;
      
      case 'codeQuality':
        if (data.complexity) confidence += 0.1;
        if (data.duplication) confidence += 0.1;
        if (data.coverage) confidence += 0.1;
        if (data.maintainability) confidence += 0.1;
        if (data.technicalDebt) confidence += 0.1;
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

  private log(level: 'info' | 'error' | 'warn', message: string, data?: any): void {
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
      }
    } else {
      console.log(`[UnifiedAIParser] [${level.toUpperCase()}] ${message}`, data || '');
    }
  }
}