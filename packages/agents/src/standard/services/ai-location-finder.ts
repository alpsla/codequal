/**
 * AI-Powered Location Finder Agent
 * 
 * This agent uses LLM capabilities to intelligently identify exact locations
 * of issues in code files based on DeepWiki's generic descriptions.
 * 
 * Replaces the MCP tools-based approach with superior AI understanding.
 */

import { ModelVersionSync, ModelVersionInfo, createLogger } from '@codequal/core';
import { UnifiedModelSelector, createUnifiedModelSelector } from '../../model-selection/unified-model-selector';
import { AIService, createAIService, AIRequest, AIResponse } from './ai-service';
import * as fs from 'fs/promises';
import * as path from 'path';

const logger = createLogger('AILocationFinder');

/**
 * Location result with confidence score
 */
export interface AILocationResult {
  line: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  codeSnippet: string;
  explanation: string;
  confidence: number; // 0-100
  alternativeLocations?: AILocationResult[];
}

/**
 * Configuration for AI location finding
 */
export interface AILocationConfig {
  maxTokens?: number;
  temperature?: number;
  includeAlternatives?: boolean;
  maxAlternatives?: number;
}

/**
 * Issue structure from DeepWiki
 */
interface DeepWikiIssue {
  type?: string;
  severity?: string;
  category?: string;
  message?: string;
  title?: string;
  file?: string;
  line?: number;
  suggestion?: string;
  remediation?: string;
  description?: string;
}

/**
 * AI-powered location finder for code issues
 * Uses LLM to understand code context and identify exact issue locations
 */
export class AILocationFinder {
  private selector: UnifiedModelSelector;
  private aiService: AIService;
  private modelCache: Map<string, { primary: ModelVersionInfo; fallback: ModelVersionInfo }> = new Map();
  
  constructor(
    private modelVersionSync: ModelVersionSync,
    private vectorStorage?: any,
    private config: AILocationConfig = {}
  ) {
    this.selector = createUnifiedModelSelector(modelVersionSync, vectorStorage);
    this.aiService = createAIService({
      temperature: config.temperature,
      maxTokens: config.maxTokens
    });
  }

  /**
   * Find exact location of an issue in a file using AI
   */
  async findLocation(
    issue: DeepWikiIssue,
    repoPath: string
  ): Promise<AILocationResult | null> {
    try {
      // Normalize issue structure
      const normalizedIssue = this.normalizeIssue(issue);
      
      // Get file path
      if (!normalizedIssue.file) {
        logger.warn('No file specified in issue');
        return null;
      }
      const filePath = path.join(repoPath, normalizedIssue.file);
      
      // Read file content
      const fileContent = await this.readFile(filePath);
      if (!fileContent) {
        logger.warn(`File not found: ${filePath}`);
        return null;
      }
      
      // Detect language from file extension
      const language = this.detectLanguage(filePath);
      
      // Get optimal models (primary and fallback) for location finding
      const models = await this.selectModels(
        language, 
        fileContent.length,
        normalizedIssue.type || normalizedIssue.category,
        normalizedIssue.severity
      );
      
      // Build prompt for location finding
      const prompt = this.buildLocationPrompt(normalizedIssue, fileContent, language);
      
      // Call AI model with automatic fallback
      const response = await this.callModelWithFallback(models, prompt);
      
      // Parse location from response
      const location = this.parseLocationResponse(response, fileContent);
      
      if (location) {
        logger.info(`Found location for issue: ${normalizedIssue.title} at line ${location.line}`);
      }
      
      return location;
    } catch (error) {
      logger.error('Error finding location with AI:', error as Error);
      return null;
    }
  }

  /**
   * Normalize DeepWiki issue to standard format
   */
  private normalizeIssue(issue: any): DeepWikiIssue {
    return {
      type: issue.type || issue.category,
      severity: issue.severity,
      category: issue.category,
      message: issue.message || issue.title,
      title: issue.title || issue.message,
      file: issue.file || issue.location,
      line: issue.line,
      suggestion: issue.suggestion || issue.remediation,
      remediation: issue.remediation || issue.suggestion,
      description: issue.description || issue.message
    };
  }

  /**
   * Read file content with error handling
   */
  private async readFile(filePath: string): Promise<string | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      logger.debug(`Could not read file ${filePath}:`, error as Error);
      return null;
    }
  }

  /**
   * Detect programming language from file path
   */
  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.java': 'java',
      '.go': 'go',
      '.rs': 'rust',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.rb': 'ruby',
      '.php': 'php',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala',
      '.r': 'r',
      '.m': 'objc',
      '.vue': 'vue',
      '.svelte': 'svelte'
    };
    
    return languageMap[ext] || 'unknown';
  }

  /**
   * Select optimal models (primary and fallback) for location finding
   */
  private async selectModels(
    language: string, 
    fileSize: number,
    issueType?: string,
    issueSeverity?: string
  ): Promise<{ primary: ModelVersionInfo; fallback: ModelVersionInfo }> {
    // Determine file size category
    const sizeCategory = this.getSizeCategory(fileSize);
    const complexity = this.estimateComplexity(fileSize);
    
    // Build cache key including issue type for better caching
    const cacheKey = `${language}-${sizeCategory}-${issueType || 'general'}-${issueSeverity || 'medium'}`;
    if (this.modelCache.has(cacheKey)) {
      const cached = this.modelCache.get(cacheKey)!;
      logger.debug(`Using cached model selection: ${cached.primary.provider}/${cached.primary.model}`);
      return cached;
    }
    
    // Build enhanced context for model selection
    const context: any = {
      primaryLanguage: language,
      size: sizeCategory,
      complexity,
      fileLanguage: language,
      fileSize: sizeCategory,
      fileComplexity: complexity
    };
    
    // Add issue-specific context if available
    if (issueType) {
      context.issueType = this.normalizeIssueType(issueType);
    }
    if (issueSeverity) {
      context.issueSeverity = issueSeverity.toLowerCase();
    }
    
    // Override for security issues - use more capable models
    const role = 'location_finder';
    if (issueType && this.isSecurityIssue(issueType)) {
      logger.info('Security issue detected - using enhanced model selection');
      context.requiresHighAccuracy = true;
      context.minContextWindow = 64000;
    }
    
    // Override for performance issues - balance speed and quality
    if (issueType && this.isPerformanceIssue(issueType)) {
      logger.info('Performance issue detected - optimizing for algorithmic analysis');
      context.requiresAlgorithmicAnalysis = true;
    }
    
    // Select models using UnifiedModelSelector - returns primary and fallback
    const selection = await this.selector.selectModel(role, context);
    
    const models = {
      primary: selection.primary,
      fallback: selection.fallback
    };
    
    // Log selection reasoning
    logger.info(`Models selected for ${language}/${sizeCategory}/${issueType || 'general'}:`, {
      primary: `${models.primary.provider}/${models.primary.model}`,
      fallback: `${models.fallback.provider}/${models.fallback.model}`,
      reasoning: selection.reasoning,
      estimatedCost: selection.estimatedCost
    });
    
    // Cache the selection
    this.modelCache.set(cacheKey, models);
    
    return models;
  }

  /**
   * Get size category based on file size
   */
  private getSizeCategory(fileSize: number): 'small' | 'medium' | 'large' | 'enterprise' {
    if (fileSize < 1000) return 'small';
    if (fileSize < 5000) return 'medium';
    if (fileSize < 20000) return 'large';
    return 'enterprise';
  }

  /**
   * Estimate complexity based on file size
   */
  private estimateComplexity(fileSize: number): number {
    // Simple heuristic: larger files are more complex
    if (fileSize < 500) return 2;
    if (fileSize < 1000) return 3;
    if (fileSize < 2000) return 4;
    if (fileSize < 5000) return 5;
    if (fileSize < 10000) return 6;
    if (fileSize < 20000) return 7;
    if (fileSize < 50000) return 8;
    return 9;
  }

  /**
   * Build comprehensive prompt for location finding
   */
  private buildLocationPrompt(
    issue: DeepWikiIssue,
    fileContent: string,
    language: string
  ): string {
    // Add line numbers to file content for easier reference
    const numberedContent = this.addLineNumbers(fileContent);
    
    return `You are an expert code analyzer specializing in identifying exact locations of code issues.

TASK: Find the exact location of the following issue in the provided code file.

ISSUE DETAILS:
- Type: ${issue.type || 'Not specified'}
- Category: ${issue.category || 'Not specified'}
- Severity: ${issue.severity || 'Not specified'}
- Description: ${issue.title || issue.message || 'Not specified'}
- Suggested Fix: ${issue.remediation || issue.suggestion || 'Not specified'}

FILE INFORMATION:
- Language: ${language}
- File Path: ${issue.file || 'unknown'}

CODE CONTENT (with line numbers):
\`\`\`${language}
${numberedContent}
\`\`\`

INSTRUCTIONS:
1. Carefully analyze the code to identify where the described issue occurs
2. Consider the issue type and description to understand what pattern to look for
3. Look for code patterns that match the issue description
4. Identify the MOST LIKELY location where this issue manifests
5. If multiple locations are possible, identify up to 3 alternatives

IMPORTANT CONSIDERATIONS:
- For "No Input Validation" issues, look for places where user input is accepted without checks
- For "Performance" issues, look for inefficient algorithms, unnecessary loops, or blocking operations
- For "Security" issues, look for unsafe practices, hardcoded secrets, or injection vulnerabilities
- For "Code Quality" issues, look for duplicated code, poor naming, or complexity
- For "Error Handling" issues, look for missing try-catch blocks or unhandled promises

RESPONSE FORMAT (JSON):
{
  "primary_location": {
    "line_start": <number>,
    "line_end": <number>,
    "column_start": <number>,
    "column_end": <number>,
    "code_snippet": "<exact code causing the issue>",
    "explanation": "<brief explanation of why this location matches the issue>",
    "confidence": <0-100>
  },
  "alternative_locations": [
    {
      "line_start": <number>,
      "line_end": <number>,
      "code_snippet": "<code>",
      "explanation": "<why this might also be the issue>",
      "confidence": <0-100>
    }
  ],
  "reasoning": "<detailed reasoning about the identification process>",
  "suggested_fix_location": {
    "line": <number>,
    "description": "<where and how to apply the fix>"
  }
}

Respond ONLY with valid JSON. Do not include any additional text or explanations outside the JSON structure.`;
  }

  /**
   * Add line numbers to file content
   */
  private addLineNumbers(content: string): string {
    const lines = content.split('\n');
    return lines.map((line, index) => {
      const lineNum = (index + 1).toString().padStart(4, ' ');
      return `${lineNum}: ${line}`;
    }).join('\n');
  }

  /**
   * Call AI model with automatic fallback
   */
  private async callModelWithFallback(
    models: { primary: ModelVersionInfo; fallback: ModelVersionInfo },
    prompt: string
  ): Promise<string> {
    // For testing with mock
    if (process.env.AI_LOCATION_MOCK === 'true') {
      return this.getMockResponse(prompt);
    }
    
    const request: AIRequest = {
      prompt,
      systemPrompt: 'You are an expert code analyzer. Respond only with valid JSON.',
      temperature: this.config.temperature || 0.1,
      maxTokens: this.config.maxTokens || 3000,
      jsonMode: true
    };
    
    // Use AIService with fallback
    const response = await this.aiService.callWithFallback(models, request);
    
    return response.content;
  }
  
  /**
   * Get mock response for testing
   */
  private getMockResponse(prompt: string): string {
    const hasValidation = prompt.toLowerCase().includes('validation');
    const hasPerformance = prompt.toLowerCase().includes('performance');
    const hasSecurity = prompt.toLowerCase().includes('security');
    
    if (hasValidation || hasSecurity) {
      return JSON.stringify({
        primary_location: {
          line_start: 10,
          line_end: 15,
          column_start: 1,
          column_end: 50,
          code_snippet: "function handleRequest(req) { /* process req.body */ }",
          explanation: "This function processes request body without validation",
          confidence: 85
        },
        alternative_locations: [{
          line_start: 25,
          line_end: 27,
          code_snippet: "const userId = req.params.id",
          explanation: "User ID from params used without validation",
          confidence: 70
        }],
        reasoning: "The function directly uses req.body without any validation checks",
        suggested_fix_location: {
          line: 11,
          description: "Add input validation before processing req.body"
        }
      });
    }
    
    if (hasPerformance) {
      return JSON.stringify({
        primary_location: {
          line_start: 45,
          line_end: 52,
          column_start: 1,
          column_end: 80,
          code_snippet: "for (let i = 0; i < items.length; i++) { for (let j = 0; j < items.length; j++) {",
          explanation: "Nested loops creating O(n²) complexity",
          confidence: 95
        },
        reasoning: "Inefficient nested iteration over the same array",
        suggested_fix_location: {
          line: 46,
          description: "Use a Map or Set for O(n) lookup instead of nested loops"
        }
      });
    }
    
    return JSON.stringify({
      primary_location: {
        line_start: 5,
        line_end: 7,
        column_start: 1,
        column_end: 40,
        code_snippet: "// Issue location",
        explanation: "Mock location for testing",
        confidence: 50
      },
      reasoning: "Mock response for testing purposes",
      suggested_fix_location: {
        line: 6,
        description: "Apply fix here"
      }
    });
  }


  /**
   * Parse the AI response to extract location information
   */
  private parseLocationResponse(response: string, fileContent: string): AILocationResult | null {
    try {
      const parsed = JSON.parse(response);
      
      if (!parsed.primary_location) {
        logger.warn('No primary location found in AI response');
        return null;
      }
      
      const loc = parsed.primary_location;
      
      // Validate line numbers
      const maxLines = fileContent.split('\n').length;
      if (loc.line_start < 1 || loc.line_start > maxLines) {
        logger.warn(`Invalid line number: ${loc.line_start}`);
        return null;
      }
      
      // Build result
      const result: AILocationResult = {
        line: loc.line_start,
        column: loc.column_start || 1,
        endLine: loc.line_end || loc.line_start,
        endColumn: loc.column_end,
        codeSnippet: loc.code_snippet || this.extractSnippet(fileContent, loc.line_start),
        explanation: loc.explanation || parsed.reasoning || 'Issue identified by AI',
        confidence: loc.confidence || 70
      };
      
      // Add alternatives if available
      if (parsed.alternative_locations && this.config.includeAlternatives) {
        result.alternativeLocations = parsed.alternative_locations
          .slice(0, this.config.maxAlternatives || 2)
          .map((alt: any) => ({
            line: alt.line_start,
            column: alt.column_start || 1,
            endLine: alt.line_end || alt.line_start,
            codeSnippet: alt.code_snippet,
            explanation: alt.explanation,
            confidence: alt.confidence || 50
          }));
      }
      
      return result;
    } catch (error) {
      logger.error('Failed to parse AI response:', error as Error);
      logger.debug('Raw response:', response);
      return null;
    }
  }

  /**
   * Extract code snippet around a line
   */
  private extractSnippet(content: string, lineNumber: number, context = 2): string {
    const lines = content.split('\n');
    const startLine = Math.max(0, lineNumber - 1 - context);
    const endLine = Math.min(lines.length, lineNumber + context);
    
    return lines.slice(startLine, endLine).join('\n');
  }

  /**
   * Normalize issue type to standard categories
   */
  private normalizeIssueType(type: string): string {
    const normalized = type.toLowerCase();
    
    if (this.isSecurityIssue(type)) return 'security';
    if (this.isPerformanceIssue(type)) return 'performance';
    if (this.isQualityIssue(type)) return 'quality';
    
    return 'other';
  }
  
  /**
   * Check if issue is security-related
   */
  private isSecurityIssue(type: string): boolean {
    const securityKeywords = [
      'security', 'vulnerability', 'injection', 'xss', 'csrf',
      'authentication', 'authorization', 'validation', 'sanitization',
      'encryption', 'password', 'token', 'secret', 'credential'
    ];
    
    const normalized = type.toLowerCase();
    return securityKeywords.some(keyword => normalized.includes(keyword));
  }
  
  /**
   * Check if issue is performance-related
   */
  private isPerformanceIssue(type: string): boolean {
    const performanceKeywords = [
      'performance', 'slow', 'bottleneck', 'optimization', 'inefficient',
      'complexity', 'algorithm', 'memory', 'cpu', 'latency', 'throughput'
    ];
    
    const normalized = type.toLowerCase();
    return performanceKeywords.some(keyword => normalized.includes(keyword));
  }
  
  /**
   * Check if issue is quality-related
   */
  private isQualityIssue(type: string): boolean {
    const qualityKeywords = [
      'quality', 'duplicate', 'maintainability', 'readability', 'complexity',
      'smell', 'refactor', 'naming', 'documentation', 'test', 'coverage'
    ];
    
    const normalized = type.toLowerCase();
    return qualityKeywords.some(keyword => normalized.includes(keyword));
  }
  
  /**
   * Clear model cache (useful when models are updated)
   */
  clearCache(): void {
    this.modelCache.clear();
    logger.info('Model cache cleared');
  }
}

/**
 * Factory function to create AILocationFinder
 */
export function createAILocationFinder(
  modelVersionSync: ModelVersionSync,
  vectorStorage?: any,
  config?: AILocationConfig
): AILocationFinder {
  return new AILocationFinder(modelVersionSync, vectorStorage, config);
}