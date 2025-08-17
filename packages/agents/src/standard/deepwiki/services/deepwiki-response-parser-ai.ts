/**
 * AI-Driven DeepWiki Response Parser
 * 
 * This replaces all rule-based parsers with AI-driven sub-agents
 * using the existing model selection infrastructure.
 */

import { UnifiedAIParser, ParseConfig, ParsedDeepWikiResponse } from './unified-ai-parser';
import { 
  ArchitectureVisualizer, 
  ArchitectureComponent, 
  ComponentRelationship
} from './architecture-visualizer';
import { ILogger } from '../../services/interfaces/logger.interface';

export interface DeepWikiParseResult {
  issues: any[];
  scores: Record<string, number>;
  dependencies: any;
  codeQualityMetrics: any;
  architecture: any;
  education: any;
  security?: any;
  performance?: any;
  breakingChanges?: any;
  recommendations?: any;
  metadata?: {
    parseMethod: 'ai' | 'pattern' | 'hybrid';
    modelUsed?: string;
    parseTime: number;
    confidence: number;
  };
}

/**
 * AI-Driven parser for DeepWiki responses
 */
export class DeepWikiResponseParserAI {
  private unifiedParser: UnifiedAIParser;
  private logger?: ILogger;
  
  constructor(logger?: ILogger) {
    this.unifiedParser = new UnifiedAIParser(logger);
    this.logger = logger;
  }
  
  /**
   * Parse DeepWiki response using AI sub-agents
   */
  async parse(
    content: string,
    config?: Partial<ParseConfig>
  ): Promise<DeepWikiParseResult> {
    const startTime = Date.now();
    
    // Determine repository context
    const parseConfig: ParseConfig = {
      language: config?.language || this.detectLanguage(content),
      framework: config?.framework || this.detectFramework(content),
      repositorySize: config?.repositorySize || 'medium',
      complexity: config?.complexity || 'medium',
      useAI: config?.useAI !== false // Default to true
    };
    
    this.log('info', 'Starting AI-driven DeepWiki parsing', parseConfig);
    
    // Initialize parser with repository context
    await this.unifiedParser.initialize(parseConfig);
    
    // Parse all categories using AI sub-agents
    const parsedResponse = await this.unifiedParser.parseDeepWikiResponse(
      content,
      parseConfig
    );
    
    // Extract architecture components if not already parsed
    const architectureData = this.enhanceArchitecture(
      parsedResponse.architecture.data,
      content
    );
    
    // Calculate comprehensive scores
    const scores = this.calculateComprehensiveScores(parsedResponse);
    
    // Format educational insights
    const education = this.formatEducationalInsights(
      parsedResponse.educational.data,
      parsedResponse.recommendations.data
    );
    
    const parseTime = Date.now() - startTime;
    
    // Calculate overall confidence
    const overallConfidence = this.calculateOverallConfidence(parsedResponse);
    
    this.log('info', `AI parsing completed in ${parseTime}ms`, {
      issuesFound: parsedResponse.allIssues.length,
      confidence: overallConfidence,
      categoriesProcessed: 8
    });
    
    return {
      issues: parsedResponse.allIssues,
      scores,
      dependencies: parsedResponse.dependencies.data,
      codeQualityMetrics: parsedResponse.codeQuality.data,
      architecture: architectureData,
      education,
      security: parsedResponse.security.data,
      performance: parsedResponse.performance.data,
      breakingChanges: parsedResponse.breakingChanges.data,
      recommendations: parsedResponse.recommendations.data,
      metadata: {
        parseMethod: this.determineParseMethod(parsedResponse),
        modelUsed: parsedResponse.security.metadata.model,
        parseTime,
        confidence: overallConfidence
      }
    };
  }
  
  /**
   * Static parse method for backward compatibility
   */
  static async parse(
    content: string,
    config?: Partial<ParseConfig>
  ): Promise<DeepWikiParseResult> {
    const parser = new DeepWikiResponseParserAI();
    return parser.parse(content, config);
  }
  
  /**
   * Detect primary language from DeepWiki response
   */
  private detectLanguage(content: string): string {
    const languagePatterns: Record<string, RegExp[]> = {
      'typescript': [/TypeScript/i, /\.tsx?/i, /interface\s+\w+/],
      'javascript': [/JavaScript/i, /\.jsx?/i, /const\s+\w+\s*=/],
      'python': [/Python/i, /\.py/i, /def\s+\w+/],
      'java': [/Java/i, /\.java/i, /public\s+class/],
      'go': [/Go(?:lang)?/i, /\.go/i, /func\s+\w+/],
      'rust': [/Rust/i, /\.rs/i, /fn\s+\w+/],
      'cpp': [/C\+\+/i, /\.cpp/i, /#include/]
    };
    
    for (const [lang, patterns] of Object.entries(languagePatterns)) {
      if (patterns.some(pattern => pattern.test(content))) {
        return lang;
      }
    }
    
    return 'javascript'; // Default
  }
  
  /**
   * Detect framework from DeepWiki response
   */
  private detectFramework(content: string): string | undefined {
    const frameworkPatterns: Record<string, RegExp[]> = {
      'react': [/React/i, /jsx/i, /useState/],
      'vue': [/Vue/i, /\.vue/i],
      'angular': [/Angular/i, /@Component/],
      'nextjs': [/Next\.js/i, /getServerSideProps/],
      'express': [/Express/i, /app\.(get|post|put)/],
      'django': [/Django/i, /models\.py/],
      'fastapi': [/FastAPI/i, /@app\.(get|post)/],
      'spring': [/Spring/i, /@Controller/]
    };
    
    for (const [framework, patterns] of Object.entries(frameworkPatterns)) {
      if (patterns.some(pattern => pattern.test(content))) {
        return framework;
      }
    }
    
    return undefined;
  }
  
  /**
   * Enhance architecture data with visualization
   */
  private enhanceArchitecture(architectureData: any, content: string): any {
    const components = architectureData?.components || [];
    const patterns = architectureData?.patterns || [];
    const metrics = architectureData?.metrics || {};
    
    // Generate or enhance diagram
    let diagram = architectureData?.diagram;
    if (!diagram && components.length > 0) {
      const relationships = this.inferRelationships(components);
      diagram = ArchitectureVisualizer.generateSystemDiagram(
        components,
        relationships
      );
    }
    
    // Analyze patterns if not already done
    if (patterns.length === 0 && components.length > 0) {
      const relationships = this.inferRelationships(components);
      const patternAnalysis = ArchitectureVisualizer.analyzePatterns(
        components,
        relationships
      );
      patterns.push(...patternAnalysis.patterns);
    }
    
    // Generate recommendations based on architecture
    const recommendations = architectureData?.recommendations || 
      ArchitectureVisualizer.generateRecommendations(
        components,
        patterns.filter((p: any) => p.type !== 'anti-pattern'),
        patterns.filter((p: any) => p.type === 'anti-pattern')
      );
    
    // Calculate metrics if not present
    const finalMetrics = Object.keys(metrics).length > 0 ? metrics :
      ArchitectureVisualizer.calculateMetrics(
        components,
        this.inferRelationships(components)
      );
    
    return {
      diagram,
      patterns,
      antiPatterns: patterns.filter((p: any) => p.type === 'anti-pattern'),
      recommendations,
      components,
      relationships: this.inferRelationships(components),
      metrics: finalMetrics
    };
  }
  
  /**
   * Infer relationships between components
   */
  private inferRelationships(components: any[]): ComponentRelationship[] {
    const relationships: ComponentRelationship[] = [];
    
    // Basic inference rules
    const frontend = components.find((c: any) => c.type === 'frontend');
    const backend = components.find((c: any) => c.type === 'backend');
    const database = components.find((c: any) => c.type === 'database');
    const cache = components.find((c: any) => c.type === 'cache');
    
    if (frontend && backend) {
      relationships.push({
        from: frontend.id || frontend.name,
        to: backend.id || backend.name,
        type: 'sync',
        protocol: 'HTTP/REST'
      });
    }
    
    if (backend && database) {
      relationships.push({
        from: backend.id || backend.name,
        to: database.id || database.name,
        type: 'sync',
        protocol: 'SQL'
      });
    }
    
    if (backend && cache) {
      relationships.push({
        from: backend.id || backend.name,
        to: cache.id || cache.name,
        type: 'sync',
        protocol: 'Redis Protocol'
      });
    }
    
    return relationships;
  }
  
  /**
   * Calculate comprehensive scores from all categories
   */
  private calculateComprehensiveScores(parsed: ParsedDeepWikiResponse): Record<string, number> {
    // Use AI-calculated scores if available
    if (parsed.scores && Object.keys(parsed.scores).length > 0) {
      return parsed.scores;
    }
    
    // Fallback calculation
    const scores: Record<string, number> = {};
    
    // Security score
    const securityIssues = parsed.security.issues || [];
    scores.security = Math.max(0, 100 - 
      securityIssues.filter((i: any) => i.severity === 'critical').length * 25 -
      securityIssues.filter((i: any) => i.severity === 'high').length * 15 -
      securityIssues.filter((i: any) => i.severity === 'medium').length * 5
    );
    
    // Performance score
    const perfIssues = parsed.performance.issues || [];
    scores.performance = Math.max(0, 100 -
      perfIssues.filter((i: any) => i.severity === 'high').length * 20 -
      perfIssues.filter((i: any) => i.severity === 'medium').length * 10
    );
    
    // Dependencies score
    const depData = parsed.dependencies.data || {};
    scores.dependencies = Math.max(0, 100 -
      (depData.vulnerable?.length || 0) * 20 -
      (depData.outdated?.length || 0) * 5 -
      (depData.deprecated?.length || 0) * 10
    );
    
    // Code quality score
    const qualityData = parsed.codeQuality.data || {};
    let qualityScore = 100;
    if (qualityData.complexity?.average > 10) qualityScore -= 20;
    if (qualityData.duplication?.percentage > 10) qualityScore -= 15;
    if (qualityData.coverage?.overall < 80) qualityScore -= 20;
    scores.codeQuality = Math.max(0, qualityScore);
    
    // Architecture score
    const archData = parsed.architecture.data || {};
    scores.architecture = archData.metrics?.modularity || 75;
    
    // Test coverage score
    scores.testCoverage = qualityData.coverage?.overall || 50;
    
    // Overall score
    scores.overall = Math.round(
      (scores.security + scores.performance + scores.dependencies + 
       scores.codeQuality + scores.architecture) / 5
    );
    
    return scores;
  }
  
  /**
   * Format educational insights for report
   */
  private formatEducationalInsights(educationalData: any, recommendationsData: any): any {
    const bestPractices = educationalData?.bestPractices || [];
    const antiPatterns = educationalData?.antiPatterns || [];
    const learningPaths = educationalData?.learningPaths || [];
    
    // Add recommendations as learning opportunities
    if (recommendationsData?.training) {
      recommendationsData.training.forEach((training: any) => {
        learningPaths.push({
          topic: training.topic,
          difficulty: 'intermediate',
          resources: [],
          estimatedTime: training.duration,
          reason: training.reason
        });
      });
    }
    
    return {
      bestPractices,
      antiPatterns,
      learningPaths,
      resources: educationalData?.resources || [],
      exercises: educationalData?.exercises || []
    };
  }
  
  /**
   * Calculate overall confidence based on all categories
   */
  private calculateOverallConfidence(parsed: ParsedDeepWikiResponse): number {
    const confidences = [
      parsed.security.confidence,
      parsed.performance.confidence,
      parsed.dependencies.confidence,
      parsed.codeQuality.confidence,
      parsed.architecture.confidence,
      parsed.breakingChanges.confidence,
      parsed.educational.confidence,
      parsed.recommendations.confidence
    ].filter(c => c > 0);
    
    if (confidences.length === 0) return 0.5;
    
    return confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
  }
  
  /**
   * Determine which parse method was primarily used
   */
  private determineParseMethod(parsed: ParsedDeepWikiResponse): 'ai' | 'pattern' | 'hybrid' {
    const methods = [
      parsed.security.metadata.method,
      parsed.performance.metadata.method,
      parsed.dependencies.metadata.method,
      parsed.codeQuality.metadata.method
    ];
    
    const aiCount = methods.filter(m => m === 'ai').length;
    const patternCount = methods.filter(m => m === 'pattern').length;
    
    if (aiCount === methods.length) return 'ai';
    if (patternCount === methods.length) return 'pattern';
    return 'hybrid';
  }
  
  private log(level: 'info' | 'error' | 'warn' | 'debug', message: string, data?: any): void {
    if (this.logger) {
      const logMessage = `[DeepWikiParserAI] ${message}`;
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
          this.logger.debug(logMessage, data);
          break;
      }
    } else {
      console.log(`[DeepWikiParserAI] [${level.toUpperCase()}] ${message}`, data || '');
    }
  }
}

/**
 * Export for backward compatibility
 */
export function parseDeepWikiResponse(content: string) {
  // For synchronous backward compatibility, we'll use the fallback parsing
  // Real AI parsing should be done through the async method
  const parser = new DeepWikiResponseParserAI();
  
  // Return a promise-like result that can be awaited if needed
  return parser.parse(content, { useAI: false });
}

/**
 * Export as class for consistency
 */
export class DeepWikiResponseParser {
  static async parse(content: string, config?: Partial<ParseConfig>) {
    return DeepWikiResponseParserAI.parse(content, config);
  }
}