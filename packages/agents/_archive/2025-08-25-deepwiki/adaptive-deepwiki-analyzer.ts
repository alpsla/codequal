/**
 * AdaptiveDeepWikiAnalyzer - Implements 3-iteration adaptive analysis with gap filling
 */

import { GapAnalyzer, GapAnalysis } from './gap-analyzer';
import { UnifiedAIParser } from './unified-ai-parser';
import { ITERATION_1_COMPREHENSIVE_PROMPT } from '../prompts/iteration-1-comprehensive';
import { ENHANCED_COMPREHENSIVE_PROMPT } from '../prompts/enhanced-comprehensive-prompt';
import { getIterationPrompt, combineWithGapPrompt } from '../prompts/iteration-prompts-enhanced';
import { 
  validateAnalysisResult, 
  validateConfig,
  type AnalysisResult,
  type AnalyzerConfig 
} from '../schemas/analysis-schema';
import axios from 'axios';
import { AnalysisMonitor, MemoryOptimizer } from './analysis-monitor';

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
  protected deepwikiUrl: string;
  protected deepwikiKey: string;
  protected maxIterations = 3;
  protected timeout = 300000;
  private retryAttempts = 3;
  private minCompleteness = 80;
  protected logger: any;
  private monitor: AnalysisMonitor;

  constructor(
    deepwikiUrl: string,
    deepwikiKey?: string,
    logger?: any,
    config?: Partial<AnalyzerConfig>
  ) {
    // BUG-050: Validate configuration
    const validatedConfig = config ? validateConfig({
      deepwikiUrl,
      deepwikiKey,
      ...config,
      logger
    }) : {
      deepwikiUrl,
      deepwikiKey,
      maxIterations: 3,
      timeout: 300000,
      retryAttempts: 3,
      minCompleteness: 80,
      logger
    };
    
    this.deepwikiUrl = validatedConfig.deepwikiUrl;
    this.deepwikiKey = validatedConfig.deepwikiKey || '';
    this.maxIterations = validatedConfig.maxIterations;
    this.timeout = validatedConfig.timeout;
    this.retryAttempts = validatedConfig.retryAttempts;
    this.minCompleteness = validatedConfig.minCompleteness;
    this.gapAnalyzer = new GapAnalyzer();
    this.aiParser = new UnifiedAIParser(logger);
    this.logger = validatedConfig.logger || console;
    
    // Initialize monitor for tracking iterations and memory
    this.monitor = AnalysisMonitor.getInstance(this.logger);
  }

  /**
   * Perform adaptive analysis with gap filling
   * BUG-043 FIX: Added comprehensive error handling
   * BUG-047 FIX: Added infinite loop prevention
   */
  async analyzeWithGapFilling(
    repoUrl: string,
    branch?: string
  ): Promise<AdaptiveAnalysisResult> {
    const startTime = Date.now();
    const startMemory = this.monitor.getMemoryUsage();
    const iterations: IterationResult[] = [];
    let result: any = {};
    let previousGapCount = Number.MAX_SAFE_INTEGER;
    let noProgressCount = 0;
    const MAX_NO_PROGRESS = 2; // BUG-047: Stop after 2 iterations with no progress
    let previousIssueCount = 0;
    let noNewIssuesCount = 0;
    const cacheHit = false;

    try {
      this.logger.info(`Starting adaptive DeepWiki analysis for ${repoUrl} (${branch || 'main'})`);
      
      // Check memory before starting
      if (MemoryOptimizer.isMemoryHigh()) {
        this.logger.warn('Memory usage is high, forcing garbage collection');
        MemoryOptimizer.forceGC();
      }

      for (let i = 0; i < this.maxIterations; i++) {
        const iterationStart = Date.now();
        
        try {
          // Monitor memory usage per iteration
          if (i > 0 && MemoryOptimizer.isMemoryHigh()) {
            this.logger.warn(`High memory usage at iteration ${i + 1}, cleaning up previous iteration data`);
            // Clear large response strings from previous iterations
            if (iterations.length > 0) {
              iterations.forEach(iter => {
                if (iter.response && iter.response.length > 10000) {
                  iter.response = '[Response cleared for memory optimization]';
                }
                MemoryOptimizer.clearLargeObjects(iter.parsed);
              });
            }
            MemoryOptimizer.forceGC();
          }
          
          // Analyze gaps in current result
          const gaps = this.gapAnalyzer.analyzeGaps(result);
          
          this.logger.info(`Iteration ${i + 1}: Completeness ${gaps.completeness}%, Gaps: ${gaps.totalGaps} (${gaps.criticalGaps} critical)`);

          // Check if we're complete enough
          // IMPORTANT: Minimum 3 iterations required to ensure stability and avoid random matches
          if (i >= 2 && this.gapAnalyzer.isComplete(gaps)) {
            this.logger.info(`Analysis complete at iteration ${i + 1} with ${gaps.completeness}% completeness`);
            break;
          }

          // BUG-047: Check for progress to prevent infinite loops
          if (gaps.totalGaps >= previousGapCount) {
            noProgressCount++;
            this.logger.warn(`No progress in iteration ${i + 1}. No progress count: ${noProgressCount}`);
            
            if (noProgressCount >= MAX_NO_PROGRESS) {
              this.logger.warn(`Stopping analysis: No progress for ${MAX_NO_PROGRESS} iterations`);
              break;
            }
          } else {
            noProgressCount = 0; // Reset counter on progress
            previousGapCount = gaps.totalGaps;
          }

          // Generate prompt for this iteration
          const prompt = this.generateIterationPrompt(gaps, i);
          
          // Call DeepWiki with timeout and error handling
          let response: string;
          try {
            response = await this.callDeepWiki(repoUrl, branch, prompt);
          } catch (error) {
            // BUG-043: Proper error handling for API failures
            this.logger.error(`DeepWiki call failed in iteration ${i + 1}:`, error);
            if (i === 0) {
              throw new Error(`Initial DeepWiki analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
            // Continue with partial results for non-first iterations
            break;
          }
          
          // Parse response with error handling
          let parsed: any;
          try {
            parsed = await this.parseResponse(response, i);
          } catch (parseError) {
            this.logger.error(`Failed to parse response in iteration ${i + 1}:`, parseError);
            // Continue with what we have so far
            if (i === 0) {
              throw new Error(`Failed to parse initial response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
            }
            break;
          }
          
          // Merge with existing result
          result = this.mergeResults(result, parsed);
          
          // Check for new unique issues
          const currentIssueCount = (result.issues || []).length;
          const newIssuesFound = currentIssueCount - previousIssueCount;
          
          if (newIssuesFound === 0 && i >= 2) {
            noNewIssuesCount++;
            this.logger.info(`Iteration ${i + 1}: No new unique issues found (count: ${noNewIssuesCount})`);
            
            // After minimum 3 iterations, if we find no new issues for 2 consecutive iterations, we're done
            if (noNewIssuesCount >= 2) {
              this.logger.info(`Analysis stabilized: No new unique issues for ${noNewIssuesCount} consecutive iterations after minimum 3 iterations`);
              break;
            }
          } else {
            noNewIssuesCount = 0; // Reset counter when new issues are found
            previousIssueCount = currentIssueCount;
            this.logger.info(`Iteration ${i + 1}: Found ${newIssuesFound} new unique issues (total: ${currentIssueCount})`);
          }
          
          // Store iteration data with memory optimization
          iterations.push({
            iteration: i + 1,
            response: response.length > 50000 ? '[Large response truncated]' : response, // Truncate very large responses
            parsed,
            gaps,
            duration: Date.now() - iterationStart
          });

          // Log progress
          const newGaps = this.gapAnalyzer.analyzeGaps(result);
          const gapsFilled = gaps.totalGaps - newGaps.totalGaps;
          this.logger.info(`Iteration ${i + 1} complete: Filled ${gapsFilled} gaps, ${newGaps.totalGaps} remaining`);
          
        } catch (iterationError) {
          // BUG-043: Handle iteration-specific errors
          this.logger.error(`Error in iteration ${i + 1}:`, iterationError);
          if (i === 0) {
            throw iterationError; // Re-throw if first iteration fails
          }
          // Otherwise continue with partial results
          break;
        }
      }

      // Final gap analysis
      const finalGaps = this.gapAnalyzer.analyzeGaps(result);
      const totalDuration = Date.now() - startTime;
      const memoryUsed = this.monitor.getMemoryUsage() - startMemory;
      const issuesFound = (result.issues || []).length;
      const actualIterations = iterations.length;

      // Record metrics for monitoring
      await this.monitor.recordAnalysis({
        repositoryUrl: repoUrl,
        prNumber: branch ? branch.replace(/\D/g, '') : undefined, // Extract PR number from branch if available
        iterations: actualIterations,
        duration: totalDuration,
        memoryUsed,
        cacheHit,
        issuesFound,
        timestamp: new Date(),
        success: true
      });
      
      // Log aggregated metrics periodically
      const metrics = this.monitor.getAggregatedMetrics();
      this.logger.info(`Analysis complete - Average iterations across all analyses: ${metrics.averageIterations.toFixed(2)}`);

      return {
        finalResult: result,
        iterations,
        totalDuration,
        completeness: finalGaps.completeness
      };
      
    } catch (error) {
      // Record failed analysis
      await this.monitor.recordAnalysis({
        repositoryUrl: repoUrl,
        prNumber: branch ? branch.replace(/\D/g, '') : undefined,
        iterations: iterations.length,
        duration: Date.now() - startTime,
        memoryUsed: this.monitor.getMemoryUsage() - startMemory,
        cacheHit: false,
        issuesFound: 0,
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // BUG-043: Comprehensive error handling
      this.logger.error('Analysis failed:', error);
      throw new Error(
        `DeepWiki analysis failed for ${repoUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      // Memory cleanup after analysis
      if (MemoryOptimizer.isMemoryHigh()) {
        this.logger.info('Performing post-analysis memory cleanup');
        iterations.forEach(iter => {
          MemoryOptimizer.clearLargeObjects(iter);
        });
        MemoryOptimizer.forceGC();
      }
    }
  }

  /**
   * Generate prompt for specific iteration
   */
  private generateIterationPrompt(gaps: GapAnalysis, iteration: number): string {
    if (iteration === 0) {
      // First iteration: Use enhanced prompt that explicitly requests code snippets
      // and structured data with categories, impact, and education
      return ENHANCED_COMPREHENSIVE_PROMPT;
    }

    // Subsequent iterations: Use enhanced iteration prompts that maintain
    // the same requirements for code snippets and structured data
    const baseIterationPrompt = getIterationPrompt(iteration + 1);
    const gapPrompt = this.gapAnalyzer.generateGapFillingPrompt(gaps.gaps, iteration + 1);
    
    // Combine gap-specific requests with enhanced requirements
    if (baseIterationPrompt) {
      // If we have a specific iteration prompt, use it
      return baseIterationPrompt;
    } else {
      // Otherwise, enhance the gap prompt with our requirements
      return combineWithGapPrompt(gapPrompt, iteration + 1);
    }
  }

  /**
   * Call DeepWiki API
   * BUG-051 FIX: Added resource cleanup and timeout handling
   */
  private async callDeepWiki(repoUrl: string, branch: string | undefined, prompt: string): Promise<string> {
    // BUG-051: Set up abort controller for cleanup
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 300000); // 5 minute timeout
    
    try {
      // Add JSON format request to prompt for better structure
      const enhancedPrompt = `${prompt}

CRITICAL REQUIREMENTS:
1. EVERY issue MUST have: title, category, severity, impact, file, line, codeSnippet, recommendation, education
2. The "file" field MUST be the ACTUAL file path from the repository (e.g., "source/index.ts", "test/retry.ts")
3. The "codeSnippet" field MUST contain REAL code from the repository, not examples
4. The "line" field MUST be the EXACT line number where the issue occurs
5. The "category" MUST be one of: security, performance, code-quality, dependencies, testing, architecture
6. The "impact" field MUST describe business/technical impact (2-3 sentences)
7. The "education" field MUST explain why this is an issue and best practices

Return your response in valid JSON format with these keys:
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
          timeout: 300000, // 5 minutes for comprehensive analysis
          signal: abortController.signal // BUG-051: Add abort signal for cleanup
        }
      );

      // BUG-051: Clear timeout on success
      clearTimeout(timeout);
      
      return typeof response.data === 'string' 
        ? response.data 
        : JSON.stringify(response.data, null, 2);
    } catch (error) {
      // BUG-051: Ensure cleanup on error
      clearTimeout(timeout);
      
      // BUG-049: Improved error messages
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.detail || error.response?.data?.message || error.message;
        
        if (status === 404) {
          throw new Error(`Repository not found: ${repoUrl}`);
        } else if (status === 401) {
          throw new Error('DeepWiki authentication failed. Please check your API key.');
        } else if (status === 429) {
          throw new Error('DeepWiki rate limit exceeded. Please try again later.');
        } else if (status === 500) {
          throw new Error(`DeepWiki server error: ${message}`);
        } else if (error.code === 'ECONNABORTED') {
          throw new Error('DeepWiki request timed out after 5 minutes');
        }
        
        throw new Error(`DeepWiki API error (${status || 'network'}): ${message}`);
      }
      
      throw new Error(`DeepWiki request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // BUG-051: Always cleanup resources
      abortController.abort();
    }
  }

  /**
   * Parse DeepWiki response
   * BUG-048 FIX: Added JSON schema validation
   */
  private async parseResponse(response: string, iteration: number): Promise<AnalysisResult> {
    // Check for error responses
    if (response.includes('unable to assist') || response.includes('I cannot') || response.length < 50) {
      this.logger.warn('DeepWiki returned an error or refusal');
      return validateAnalysisResult({}); // Return validated empty result
    }

    // First, try to parse as JSON (since we're requesting JSON format)
    try {
      const trimmed = response.trim();
      if (trimmed.startsWith('{')) {
        const jsonData = JSON.parse(trimmed);
        
        // BUG-048: Validate JSON against schema
        if (jsonData.issues !== undefined || jsonData.testCoverage !== undefined) {
          this.logger.info('Successfully parsed JSON response from DeepWiki');
          
          try {
            // Validate and return structured data
            const validated = validateAnalysisResult(jsonData);
            this.logger.info('JSON response validated against schema');
            return validated;
          } catch (validationError) {
            // BUG-049: Better error messages
            this.logger.warn(`JSON validation failed: ${validationError instanceof Error ? validationError.message : 'Unknown error'}`);
            // Try fallback parser first since it can extract real file locations
            this.logger.info('Trying fallback parser to extract issues with real file locations');
            const fallbackResult = this.fallbackParse(response);
            if (fallbackResult.issues && fallbackResult.issues.length > 0) {
              this.logger.info(`Fallback parser extracted ${fallbackResult.issues.length} issues with locations`);
              return fallbackResult;
            }
            this.logger.info('Fallback parser found no issues, falling back to AI parser');
          }
        }
      }
    } catch (e) {
      this.logger.info('Response is not valid JSON, trying fallback parser first');
      // Try fallback parser first for text responses
      const fallbackResult = this.fallbackParse(response);
      if (fallbackResult.issues && fallbackResult.issues.length > 0) {
        this.logger.info(`Fallback parser extracted ${fallbackResult.issues.length} issues from text response`);
        return fallbackResult;
      }
    }

    // If not JSON or doesn't have expected structure, and fallback didn't work, use AI parser
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
  protected fallbackParse(response: string): any {
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
    const pattern1 = /File:?\s*([a-zA-Z0-9/_.-]+\.[tj]sx?)[,\s]+Line:?\s*(\d+)[,:\s]*(.+?)(?=\n|File:|$)/gi;
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
    const pattern2 = /\*?\*?File\s*(?:Path)?:?\s*([^*\n]+?)\*?\*?[\s\n-]*\*?\*?Line\s*(\d+)\*?\*?:?\s*(.+?)(?=\n\n|\*\*File|$)/gi;
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
    const pattern3 = /([a-zA-Z0-9/_.-]+\.[tj]sx?):(\d+)\s*[-:]\s*(.+?)(?=\n|$)/g;
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
    
    // Pattern 5: New DeepWiki format with "**Exact file path:**" and "**Line number:**"
    const pattern5 = /\*\*Issue type:\*\*\s*(\w+)[\s\S]*?\*\*Severity:\*\*\s*(\w+)[\s\S]*?\*\*Exact file path:\*\*\s*([^\n]+)[\s\S]*?\*\*Line number:\*\*\s*(\d+)[\s\S]*?\*\*Description:\*\*\s*([^\n]+)/gi;
    for (const match of response.matchAll(pattern5)) {
      const issueType = match[1].trim();
      const severity = match[2].toLowerCase().trim();
      const file = match[3].trim();
      const line = parseInt(match[4]);
      const description = match[5].trim();
      const key = `${file}:${line}`;
      
      if (!foundIssues.has(key)) {
        foundIssues.set(key, {
          title: issueType,
          description,
          severity,
          category: issueType.toLowerCase() === 'security' ? 'security' : 
                    issueType.toLowerCase() === 'performance' ? 'performance' :
                    issueType.toLowerCase() === 'quality' ? 'code-quality' : 'code-quality',
          file,
          line,
          location: {
            file,
            line,
            column: 0
          }
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
   * BUG-041 FIX: Improved merging for complex PRs with better deduplication
   */
  private mergeResults(existing: any, newData: any): any {
    const merged = { ...existing };

    // BUG-041: Enhanced issue merging for complex PRs
    if (newData.issues && newData.issues.length > 0) {
      // Create composite keys for better deduplication
      const existingIssueMap = new Map();
      (merged.issues || []).forEach((issue: any) => {
        // Use multiple keys for matching: title, file+line, or description
        const keys = [
          issue.title,
          issue.file && issue.line ? `${issue.file}:${issue.line}` : null,
          issue.description?.substring(0, 50)
        ].filter(Boolean);
        
        keys.forEach(key => {
          if (key) existingIssueMap.set(key, issue);
        });
      });

      // Process new issues
      const uniqueNewIssues: any[] = [];
      newData.issues.forEach((newIssue: any) => {
        // Check if issue already exists using multiple criteria
        const keys = [
          newIssue.title,
          newIssue.file && newIssue.line ? `${newIssue.file}:${newIssue.line}` : null,
          newIssue.description?.substring(0, 50)
        ].filter(Boolean);
        
        let existingIssue = null;
        for (const key of keys) {
          if (existingIssueMap.has(key)) {
            existingIssue = existingIssueMap.get(key);
            break;
          }
        }
        
        if (existingIssue) {
          // Merge data into existing issue
          Object.assign(existingIssue, {
            ...existingIssue,
            ...newIssue,
            // Preserve non-empty fields
            file: newIssue.file || existingIssue.file,
            line: newIssue.line || existingIssue.line,
            column: newIssue.column || existingIssue.column,
            severity: newIssue.severity || existingIssue.severity,
            category: newIssue.category || existingIssue.category,
            codeSnippet: newIssue.codeSnippet || existingIssue.codeSnippet,
            description: newIssue.description || existingIssue.description,
            // Merge location object if present
            location: {
              ...(existingIssue.location || {}),
              ...(newIssue.location || {}),
              file: newIssue.location?.file || existingIssue.location?.file || newIssue.file || existingIssue.file,
              line: newIssue.location?.line || existingIssue.location?.line || newIssue.line || existingIssue.line
            }
          });
        } else {
          // Add as new issue
          uniqueNewIssues.push(newIssue);
          // Register in map for future deduplication
          keys.forEach(key => {
            if (key) existingIssueMap.set(key, newIssue);
          });
        }
      });
      
      // Combine existing and new issues
      merged.issues = [...(merged.issues || []), ...uniqueNewIssues];
    }

    // BUG-041: Enhanced test coverage merging
    if (newData.testCoverage) {
      merged.testCoverage = {
        ...merged.testCoverage,
        ...newData.testCoverage,
        // Keep all coverage metrics, preferring higher values
        overall: Math.max(
          merged.testCoverage?.overall || 0,
          newData.testCoverage.overall || 0
        ),
        unit: Math.max(
          merged.testCoverage?.unit || 0,
          newData.testCoverage.unit || 0
        ),
        integration: Math.max(
          merged.testCoverage?.integration || 0,
          newData.testCoverage.integration || 0
        ),
        e2e: Math.max(
          merged.testCoverage?.e2e || 0,
          newData.testCoverage.e2e || 0
        )
      };
    }

    // BUG-041: Enhanced dependency merging
    if (newData.dependencies) {
      merged.dependencies = {
        ...merged.dependencies,
        ...newData.dependencies,
        total: Math.max(
          merged.dependencies?.total || 0,
          newData.dependencies.total || 0
        ),
        outdated: this.mergeArrayUnique(
          merged.dependencies?.outdated || [],
          newData.dependencies.outdated || [],
          'name'
        ),
        vulnerable: this.mergeArrayUnique(
          merged.dependencies?.vulnerable || [],
          newData.dependencies.vulnerable || [],
          'name'
        )
      };
    }

    // BUG-041: Enhanced breaking changes merging
    if (newData.breakingChanges && newData.breakingChanges.length > 0) {
      merged.breakingChanges = this.mergeArrayUnique(
        merged.breakingChanges || [],
        newData.breakingChanges,
        'title'
      );
    }

    // Merge other fields with deep merge
    ['architecture', 'teamMetrics', 'documentation', 'scores'].forEach(field => {
      if (newData[field]) {
        merged[field] = this.deepMerge(
          merged[field] || {},
          newData[field]
        );
      }
    });

    return merged;
  }

  /**
   * Helper: Merge arrays with unique constraint
   * BUG-041: Better deduplication for complex data
   */
  private mergeArrayUnique(existing: any[], newItems: any[], uniqueKey: string): any[] {
    const map = new Map();
    
    // Add existing items
    existing.forEach(item => {
      const key = item[uniqueKey] || JSON.stringify(item);
      map.set(key, item);
    });
    
    // Add or merge new items
    newItems.forEach(item => {
      const key = item[uniqueKey] || JSON.stringify(item);
      if (map.has(key)) {
        // Merge with existing
        map.set(key, { ...map.get(key), ...item });
      } else {
        map.set(key, item);
      }
    });
    
    return Array.from(map.values());
  }

  /**
   * Helper: Deep merge objects
   * BUG-041: Properly merge nested structures
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else if (Array.isArray(source[key])) {
        result[key] = [...(result[key] || []), ...source[key]];
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }
}