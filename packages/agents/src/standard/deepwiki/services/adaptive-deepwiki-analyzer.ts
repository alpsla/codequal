/**
 * AdaptiveDeepWikiAnalyzer - Implements 3-iteration adaptive analysis with gap filling
 */

import { GapAnalyzer, GapAnalysis } from './gap-analyzer';
import { UnifiedAIParser } from './unified-ai-parser';
import { ITERATION_1_COMPREHENSIVE_PROMPT } from '../prompts/iteration-1-comprehensive';
import axios from 'axios';

export interface IterationResult {
  iteration: number;
  response: string;
  parsed: any;
  gaps: GapAnalysis;
  duration: number;
}

export interface AdaptiveAnalysisResult {
  finalResult: any;
  iterations: IterationResult[];
  totalDuration: number;
  completeness: number;
}

export class AdaptiveDeepWikiAnalyzer {
  private gapAnalyzer: GapAnalyzer;
  private aiParser: UnifiedAIParser;
  private deepwikiUrl: string;
  private deepwikiKey: string;
  private maxIterations = 3;
  private logger: any;

  constructor(
    deepwikiUrl: string,
    deepwikiKey?: string,
    logger?: any
  ) {
    this.deepwikiUrl = deepwikiUrl;
    this.deepwikiKey = deepwikiKey || '';
    this.gapAnalyzer = new GapAnalyzer();
    this.aiParser = new UnifiedAIParser(logger);
    this.logger = logger || console;
  }

  /**
   * Perform adaptive analysis with gap filling
   */
  async analyzeWithGapFilling(
    repoUrl: string,
    branch?: string
  ): Promise<AdaptiveAnalysisResult> {
    const startTime = Date.now();
    const iterations: IterationResult[] = [];
    let result: any = {};

    this.logger.info(`Starting adaptive DeepWiki analysis for ${repoUrl} (${branch || 'main'})`);

    for (let i = 0; i < this.maxIterations; i++) {
      const iterationStart = Date.now();
      
      // Analyze gaps in current result
      const gaps = this.gapAnalyzer.analyzeGaps(result);
      
      this.logger.info(`Iteration ${i + 1}: Completeness ${gaps.completeness}%, Gaps: ${gaps.totalGaps} (${gaps.criticalGaps} critical)`);

      // Check if we're complete enough
      if (this.gapAnalyzer.isComplete(gaps)) {
        this.logger.info(`Analysis complete at iteration ${i + 1} with ${gaps.completeness}% completeness`);
        break;
      }

      // Generate prompt for this iteration
      const prompt = this.generateIterationPrompt(gaps, i);
      
      // Call DeepWiki
      const response = await this.callDeepWiki(repoUrl, branch, prompt);
      
      // Parse response
      const parsed = await this.parseResponse(response, i);
      
      // Merge with existing result
      result = this.mergeResults(result, parsed);
      
      // Store iteration data
      iterations.push({
        iteration: i + 1,
        response,
        parsed,
        gaps,
        duration: Date.now() - iterationStart
      });

      // Log progress
      const newGaps = this.gapAnalyzer.analyzeGaps(result);
      const gapsFilled = gaps.totalGaps - newGaps.totalGaps;
      this.logger.info(`Iteration ${i + 1} complete: Filled ${gapsFilled} gaps, ${newGaps.totalGaps} remaining`);
    }

    // Final gap analysis
    const finalGaps = this.gapAnalyzer.analyzeGaps(result);

    return {
      finalResult: result,
      iterations,
      totalDuration: Date.now() - startTime,
      completeness: finalGaps.completeness
    };
  }

  /**
   * Generate prompt for specific iteration
   */
  private generateIterationPrompt(gaps: GapAnalysis, iteration: number): string {
    if (iteration === 0) {
      // First iteration: comprehensive analysis
      return ITERATION_1_COMPREHENSIVE_PROMPT;
    }

    // Subsequent iterations: gap-specific prompts
    return this.gapAnalyzer.generateGapFillingPrompt(gaps.gaps, iteration + 1);
  }

  /**
   * Call DeepWiki API
   */
  private async callDeepWiki(repoUrl: string, branch: string | undefined, prompt: string): Promise<string> {
    try {
      // Add JSON format request to prompt for better structure
      const enhancedPrompt = `${prompt}

IMPORTANT: Return your response in valid JSON format with these keys:
{
  "issues": [...],
  "testCoverage": {...},
  "dependencies": {...},
  "architecture": {...},
  "teamMetrics": {...},
  "documentation": {...},
  "breakingChanges": [...],
  "scores": {...}
}`;

      const response = await axios.post(
        `${this.deepwikiUrl}/chat/completions/stream`,
        {
          repo_url: repoUrl,
          messages: [{
            role: 'user',
            content: enhancedPrompt
          }],
          stream: false,
          provider: 'openrouter',
          model: 'openai/gpt-4o-mini',
          temperature: 0.1,
          max_tokens: 8000, // Increased for comprehensive response
          response_format: { type: 'json' }, // Request JSON format explicitly
          ...(branch && { branch })
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(this.deepwikiKey && { 'Authorization': `Bearer ${this.deepwikiKey}` })
          },
          timeout: 300000 // 5 minutes for comprehensive analysis
        }
      );

      return typeof response.data === 'string' 
        ? response.data 
        : JSON.stringify(response.data, null, 2);
    } catch (error) {
      this.logger.error('DeepWiki API call failed:', error);
      throw error;
    }
  }

  /**
   * Parse DeepWiki response
   */
  private async parseResponse(response: string, iteration: number): Promise<any> {
    // Check for error responses
    if (response.includes('unable to assist') || response.includes('I cannot') || response.length < 50) {
      this.logger.warn('DeepWiki returned an error or refusal');
      return {};
    }

    // First, try to parse as JSON (since we're requesting JSON format)
    try {
      const trimmed = response.trim();
      if (trimmed.startsWith('{')) {
        const jsonData = JSON.parse(trimmed);
        
        // If it's valid JSON with expected structure, return it directly
        if (jsonData.issues !== undefined || jsonData.testCoverage !== undefined) {
          this.logger.info('Successfully parsed JSON response from DeepWiki');
          
          // Ensure all expected fields exist
          return {
            issues: jsonData.issues || [],
            testCoverage: jsonData.testCoverage || {},
            dependencies: jsonData.dependencies || {},
            architecture: jsonData.architecture || {},
            teamMetrics: jsonData.teamMetrics || {},
            documentation: jsonData.documentation || {},
            breakingChanges: jsonData.breakingChanges || [],
            scores: jsonData.scores || {}
          };
        }
      }
    } catch (e) {
      this.logger.info('Response is not valid JSON, using AI parser');
    }

    // If not JSON or doesn't have expected structure, use AI parser
    try {
      const result = await this.aiParser.parseDeepWikiResponse(response, {
        useAI: true, // Always use AI for non-JSON responses
        maxRetries: 2
      } as any);

      // Transform to our expected format
      return {
        issues: result.allIssues || [],
        testCoverage: (result as any).testCoverage || {},
        dependencies: (result as any).dependencies || {},
        architecture: (result as any).architecture || {},
        teamMetrics: (result as any).teamMetrics || {},
        documentation: (result as any).documentation || {},
        breakingChanges: (result as any).breakingChanges || [],
        scores: result.scores || {}
      };
    } catch (error) {
      this.logger.error('Failed to parse response:', error);
      // Fall back to rule-based parsing
      return this.fallbackParse(response);
    }
  }

  /**
   * Fallback parsing for when AI parser fails
   */
  private fallbackParse(response: string): any {
    const result: any = {
      issues: [],
      testCoverage: {},
      dependencies: { outdated: [] },
      teamMetrics: {},
      documentation: {}
    };

    // Extract test coverage
    const coverageMatch = response.match(/(?:test coverage|coverage)(?:\s*is)?(?:\s*:)?\s*(\d+)%/i);
    if (coverageMatch) {
      result.testCoverage.overall = parseInt(coverageMatch[1]);
    }

    // Extract contributor count
    const contributorMatch = response.match(/(\d+)\s*contributors?/i);
    if (contributorMatch) {
      result.teamMetrics.contributors = parseInt(contributorMatch[1]);
    }

    // Extract issues with file locations - IMPROVED PATTERNS
    const foundIssues = new Map<string, any>(); // Use map to avoid duplicates
    
    // Pattern 1: "File: path/to/file.ts, Line: 42" or "File: path/to/file.ts Line: 42"
    const pattern1 = /File:?\s*([a-zA-Z0-9\/_.-]+\.[tj]sx?)[,\s]+Line:?\s*(\d+)[,:\s]*(.+?)(?=\n|File:|$)/gi;
    for (const match of response.matchAll(pattern1)) {
      const file = match[1].trim();
      const line = parseInt(match[2]);
      const description = match[3].trim();
      const key = `${file}:${line}`;
      
      if (!foundIssues.has(key)) {
        foundIssues.set(key, {
          title: description.substring(0, 100),
          description,
          severity: this.detectSeverity(description),
          category: this.detectCategory(description),
          file,
          line,
          codeSnippet: description
        });
      }
    }
    
    // Pattern 2: "**File Path: path/to/file.ts**" with line numbers
    const pattern2 = /\*?\*?File\s*(?:Path)?:?\s*([^\*\n]+?)\*?\*?[\s\n-]*\*?\*?Line\s*(\d+)\*?\*?:?\s*(.+?)(?=\n\n|\*\*File|$)/gi;
    for (const match of response.matchAll(pattern2)) {
      const file = match[1].trim();
      const line = parseInt(match[2]);
      const description = match[3].trim();
      const key = `${file}:${line}`;
      
      if (!foundIssues.has(key)) {
        foundIssues.set(key, {
          title: description.substring(0, 100),
          description,
          severity: this.detectSeverity(description),
          category: this.detectCategory(description),
          file,
          line,
          codeSnippet: description
        });
      }
    }
    
    // Pattern 3: "path/to/file.ts:42 - Description" or "path/to/file.ts:42: Description"
    const pattern3 = /([a-zA-Z0-9\/_.-]+\.[tj]sx?):(\d+)\s*[-:]\s*(.+?)(?=\n|$)/g;
    for (const match of response.matchAll(pattern3)) {
      const file = match[1].trim();
      const line = parseInt(match[2]);
      const description = match[3].trim();
      const key = `${file}:${line}`;
      
      if (!foundIssues.has(key)) {
        foundIssues.set(key, {
          title: description.substring(0, 100),
          description,
          severity: this.detectSeverity(description),
          category: this.detectCategory(description),
          file,
          line,
          codeSnippet: description
        });
      }
    }
    
    // Pattern 4: Issues in code blocks with file references
    const pattern4 = /`([^`]+\.[tj]sx?)`[^\n]*\n[^\n]*line\s*(\d+)[^\n]*\n[^\n]*(.+?)(?=\n\n|$)/gi;
    for (const match of response.matchAll(pattern4)) {
      const file = match[1].trim();
      const line = parseInt(match[2]);
      const description = match[3].trim();
      const key = `${file}:${line}`;
      
      if (!foundIssues.has(key)) {
        foundIssues.set(key, {
          title: description.substring(0, 100),
          description,
          severity: this.detectSeverity(description),
          category: this.detectCategory(description),
          file,
          line,
          codeSnippet: description
        });
      }
    }
    
    // Convert map to array
    result.issues = Array.from(foundIssues.values());
    
    // If no issues found with file locations, try generic issue extraction
    if (result.issues.length === 0) {
      // Pattern for numbered issues without file locations
      const issueMatches = response.matchAll(/\d+\.\s+\*?\*?(.+?)\*?\*?[:\s-]+(.+?)(?=\n\d+\.|\n\n|$)/gs);
      for (const match of issueMatches) {
        const title = match[1].trim();
        const description = match[2].trim();
        
        result.issues.push({
          title: title.substring(0, 100),
          description,
          severity: this.detectSeverity(description),
          category: this.detectCategory(description),
          codeSnippet: description
        });
      }
    }

    return result;
  }
  
  /**
   * Detect severity from issue description
   */
  private detectSeverity(description: string): string {
    const desc = description.toLowerCase();
    if (desc.includes('critical') || desc.includes('security') || desc.includes('vulnerability')) {
      return 'critical';
    }
    if (desc.includes('high') || desc.includes('error') || desc.includes('fail')) {
      return 'high';
    }
    if (desc.includes('medium') || desc.includes('warning') || desc.includes('deprecated')) {
      return 'medium';
    }
    return 'low';
  }
  
  /**
   * Detect category from issue description
   */
  private detectCategory(description: string): string {
    const desc = description.toLowerCase();
    if (desc.includes('security') || desc.includes('vulnerability') || desc.includes('injection')) {
      return 'security';
    }
    if (desc.includes('performance') || desc.includes('memory') || desc.includes('slow')) {
      return 'performance';
    }
    if (desc.includes('test') || desc.includes('coverage')) {
      return 'testing';
    }
    if (desc.includes('depend')) {
      return 'dependencies';
    }
    return 'code-quality';
  }

  /**
   * Merge results from multiple iterations
   */
  private mergeResults(existing: any, newData: any): any {
    const merged = { ...existing };

    // Merge issues (avoid duplicates)
    if (newData.issues && newData.issues.length > 0) {
      const existingTitles = new Set((merged.issues || []).map((i: any) => i.title));
      const newIssues = newData.issues.filter((i: any) => !existingTitles.has(i.title));
      merged.issues = [...(merged.issues || []), ...newIssues];

      // Update existing issues with more data
      merged.issues = merged.issues.map((issue: any) => {
        const update = newData.issues.find((i: any) => i.title === issue.title);
        if (update) {
          return {
            ...issue,
            ...update,
            // Preserve existing data if new data is empty
            file: update.file || issue.file,
            line: update.line || issue.line,
            codeSnippet: update.codeSnippet || issue.codeSnippet
          };
        }
        return issue;
      });
    }

    // Merge test coverage (prefer higher values)
    if (newData.testCoverage) {
      merged.testCoverage = {
        ...merged.testCoverage,
        ...newData.testCoverage,
        overall: Math.max(
          merged.testCoverage?.overall || 0,
          newData.testCoverage.overall || 0
        )
      };
    }

    // Merge dependencies
    if (newData.dependencies) {
      merged.dependencies = {
        ...merged.dependencies,
        ...newData.dependencies,
        outdated: [
          ...(merged.dependencies?.outdated || []),
          ...(newData.dependencies.outdated || [])
        ].filter((dep, index, self) => 
          index === self.findIndex(d => d.name === dep.name)
        )
      };
    }

    // Merge other fields
    ['architecture', 'teamMetrics', 'documentation', 'breakingChanges'].forEach(field => {
      if (newData[field]) {
        merged[field] = {
          ...merged[field],
          ...newData[field]
        };
      }
    });

    return merged;
  }
}