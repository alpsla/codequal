/**
 * V9 Real Analysis Engine
 * Core implementation for actual code analysis using AI agents and tools
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

export interface AnalysisIssue {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  file: string;
  line: number;
  column?: number;
  tool: string;
  agent?: string;
  confidence: number;
  description: string;
  suggestion?: string;
  codeSnippet?: string;
  suggestedFix?: string;
  model_used?: string;
  inModifiedFile?: boolean;
}

export class V9RealAnalysisEngine {
  private supabase: any;
  private openRouterKey: string;
  private modelCache: Map<string, string> = new Map();

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    this.openRouterKey = process.env.OPENROUTER_API_KEY!;
  }

  /**
   * Main entry point for running real analysis
   */
  async analyzeFiles(
    files: string[],
    repoPath: string,
    language: string,
    tools: any[]
  ): Promise<AnalysisIssue[]> {
    const allIssues: AnalysisIssue[] = [];

    // Group files by type for efficient analysis
    const fileGroups = this.groupFilesByType(files, language);

    // Run each configured tool
    for (const tool of tools) {
      try {
        logger.info(`Running ${tool.name} for ${tool.agent}`);

        // Get relevant files for this tool
        const relevantFiles = this.getRelevantFiles(fileGroups, tool);

        if (relevantFiles.length === 0) {
          logger.debug(`No relevant files for ${tool.name}`);
          continue;
        }

        // Run the analysis
        const toolIssues = await this.runToolAnalysis(
          tool,
          relevantFiles,
          repoPath,
          language
        );

        allIssues.push(...toolIssues);
        logger.info(`${tool.name} found ${toolIssues.length} issues`);

      } catch (error) {
        logger.error(`Tool ${tool.name} failed: ${error.message}`);
      }
    }

    return allIssues;
  }

  /**
   * Run analysis for a specific tool
   */
  private async runToolAnalysis(
    tool: any,
    files: string[],
    repoPath: string,
    language: string
  ): Promise<AnalysisIssue[]> {
    const issues: AnalysisIssue[] = [];

    // Strategy 1: Use AI agent analysis (primary)
    if (tool.agent) {
      const aiIssues = await this.runAIAgentAnalysis(
        tool,
        files,
        repoPath,
        language
      );
      issues.push(...aiIssues);
    }

    // Strategy 2: Run actual CLI tools if configured
    if (tool.command && process.env.USE_LOCAL_TOOLS === 'true') {
      const toolIssues = await this.runCLITool(tool, repoPath);
      issues.push(...toolIssues);
    }

    return issues;
  }

  /**
   * Run AI agent analysis using OpenRouter
   */
  private async runAIAgentAnalysis(
    tool: any,
    files: string[],
    repoPath: string,
    language: string
  ): Promise<AnalysisIssue[]> {
    const issues: AnalysisIssue[] = [];

    // Get the appropriate AI model for this analysis
    const model = await this.getModelForAnalysis(tool.agent, language);
    if (!model) {
      logger.warn(`No model available for ${tool.agent}/${language}`);
      return issues;
    }

    // Analyze files in batches to avoid overwhelming the API
    const batchSize = 5;
    const batches = this.createBatches(files, batchSize);

    for (const batch of batches) {
      const batchPromises = batch.map(file =>
        this.analyzeFileWithAI(file, repoPath, tool, model, language)
      );

      const batchResults = await Promise.allSettled(batchPromises);

      for (const result of batchResults) {
        if (result.status === 'fulfilled' && result.value) {
          issues.push(...result.value);
        }
      }
    }

    return issues;
  }

  /**
   * Analyze a single file with AI
   */
  private async analyzeFileWithAI(
    file: string,
    repoPath: string,
    tool: any,
    model: string,
    language: string
  ): Promise<AnalysisIssue[]> {
    try {
      // Read file content
      const filePath = path.join(repoPath, file);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return [];
      }

      const content = await fs.promises.readFile(filePath, 'utf-8');

      // Skip very large files
      if (content.length > 100000) {
        logger.debug(`Skipping large file: ${file}`);
        return [];
      }

      // Skip binary files
      if (this.isBinaryFile(content)) {
        return [];
      }

      // Build the analysis prompt
      const prompt = this.buildAnalysisPrompt(tool, language, file);

      // Call OpenRouter API
      const response = await this.callOpenRouterAPI({
        model,
        systemPrompt: prompt.system,
        userPrompt: prompt.user(content),
        maxTokens: 3000
      });

      // Parse the response
      const parsedIssues = this.parseAIResponse(response, tool, file, model);
      return parsedIssues;

    } catch (error) {
      logger.debug(`Failed to analyze ${file}: ${error.message}`);
      return [];
    }
  }

  /**
   * Build analysis prompt based on tool and language
   */
  private buildAnalysisPrompt(tool: any, language: string, file: string) {
    const fileExt = path.extname(file);

    const prompts: Record<string, any> = {
      'SecurityAnalyzer': {
        system: `You are a security expert analyzing ${language} code.
                 Identify security vulnerabilities including:
                 - SQL injection, XSS, CSRF vulnerabilities
                 - Authentication and authorization issues
                 - Insecure data handling
                 - Cryptographic weaknesses
                 - Input validation problems

                 Return ONLY a JSON object with an "issues" array.
                 Each issue must have: title, severity, line, description, suggestion.`,
        user: (code: string) => `Analyze this ${fileExt} file for security issues:\n\n${code}`
      },
      'QualityAnalyzer': {
        system: `You are a code quality expert analyzing ${language} code.
                 Identify code quality issues including:
                 - Code smells and anti-patterns
                 - Complexity issues
                 - Maintainability problems
                 - Dead code
                 - Duplicate code

                 Return ONLY a JSON object with an "issues" array.`,
        user: (code: string) => `Analyze this ${fileExt} file for quality issues:\n\n${code}`
      },
      'PerformanceAnalyzer': {
        system: `You are a performance expert analyzing ${language} code.
                 Identify performance issues including:
                 - Inefficient algorithms (O(n²) or worse)
                 - Memory leaks
                 - Unnecessary database queries
                 - Resource-intensive operations
                 - Blocking I/O operations

                 Return ONLY a JSON object with an "issues" array.`,
        user: (code: string) => `Analyze this ${fileExt} file for performance issues:\n\n${code}`
      },
      'ArchitectureAnalyzer': {
        system: `You are a software architect analyzing ${language} code.
                 Identify architectural issues including:
                 - SOLID principle violations
                 - Tight coupling
                 - Missing abstractions
                 - Circular dependencies
                 - Poor separation of concerns

                 Return ONLY a JSON object with an "issues" array.`,
        user: (code: string) => `Analyze this ${fileExt} file for architecture issues:\n\n${code}`
      },
      'DependencyAnalyzer': {
        system: `You are a dependency expert analyzing ${language} code.
                 Identify dependency issues including:
                 - Vulnerable dependencies
                 - Outdated packages
                 - Unused dependencies
                 - Version conflicts
                 - License compliance issues

                 Return ONLY a JSON object with an "issues" array.`,
        user: (code: string) => `Analyze this ${fileExt} file for dependency issues:\n\n${code}`
      }
    };

    return prompts[tool.agent] || prompts['QualityAnalyzer'];
  }

  /**
   * Call OpenRouter API
   */
  private async callOpenRouterAPI(params: {
    model: string;
    systemPrompt: string;
    userPrompt: string;
    maxTokens: number;
  }): Promise<any> {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/codequal/agents',
          'X-Title': 'CodeQual V9 Real Analysis'
        },
        body: JSON.stringify({
          model: params.model,
          messages: [
            { role: 'system', content: params.systemPrompt },
            { role: 'user', content: params.userPrompt }
          ],
          max_tokens: params.maxTokens,
          temperature: 0.2,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
      }

      const data = await response.json() as any;
      return data.choices[0]?.message?.content || '{}';

    } catch (error) {
      logger.error(`OpenRouter API call failed: ${error.message}`);
      return '{}';
    }
  }

  /**
   * Parse AI response into issues
   */
  private parseAIResponse(
    response: string,
    tool: any,
    file: string,
    model: string
  ): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];

    try {
      const parsed = JSON.parse(response);
      const aiIssues = parsed.issues || [];

      for (const issue of aiIssues) {
        // Skip if essential fields are missing
        if (!issue.title || !issue.severity) continue;

        issues.push({
          id: `${tool.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: issue.title,
          severity: this.normalizeSeverity(issue.severity),
          category: this.mapAgentToCategory(tool.agent),
          file: file,
          line: issue.line || 1,
          column: issue.column,
          tool: tool.name,
          agent: tool.agent,
          confidence: issue.confidence || 0.75,
          description: issue.description || issue.message || issue.title,
          suggestion: issue.suggestion || issue.fix,
          codeSnippet: issue.codeSnippet,
          suggestedFix: issue.suggestedFix || issue.fixedCode,
          model_used: model
        });
      }
    } catch (error) {
      logger.debug(`Failed to parse AI response: ${error.message}`);
    }

    return issues;
  }

  /**
   * Run CLI tool if available
   */
  private async runCLITool(tool: any, repoPath: string): Promise<AnalysisIssue[]> {
    try {
      logger.info(`Executing CLI tool: ${tool.name}`);
      const { stdout, stderr } = await execAsync(tool.command, {
        cwd: repoPath,
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });

      // Use the tool's parser if available
      if (tool.parser && typeof tool.parser === 'function') {
        return tool.parser(stdout + stderr);
      }

      // Generic parsing for common output formats
      return this.parseGenericToolOutput(stdout + stderr, tool);

    } catch (error) {
      logger.warn(`CLI tool ${tool.name} failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Generic parser for tool outputs
   */
  private parseGenericToolOutput(output: string, tool: any): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];

    // Try to parse JSON output
    try {
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.issues || parsed.results || parsed.findings) {
          const items = parsed.issues || parsed.results || parsed.findings;
          for (const item of items) {
            issues.push(this.convertToIssue(item, tool));
          }
        }
      }
    } catch {
      // Fall back to line-based parsing
      const lines = output.split('\n');
      for (const line of lines) {
        if (line.includes('error') || line.includes('warning') || line.includes('issue')) {
          issues.push({
            id: `${tool.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: `${tool.name} issue`,
            severity: line.includes('error') ? 'high' : 'medium',
            category: this.mapAgentToCategory(tool.agent),
            file: 'unknown',
            line: 1,
            tool: tool.name,
            agent: tool.agent,
            confidence: 0.6,
            description: line.trim()
          });
        }
      }
    }

    return issues;
  }

  /**
   * Get model for specific analysis type
   */
  private async getModelForAnalysis(agent: string, language: string): Promise<string | null> {
    const cacheKey = `${agent}-${language}`;

    // Check cache first
    if (this.modelCache.has(cacheKey)) {
      return this.modelCache.get(cacheKey)!;
    }

    try {
      // Map agent to role
      const role = this.mapAgentToRole(agent);

      // Query Supabase for model configuration
      const { data, error } = await this.supabase
        .from('model_configurations')
        .select('primary_model')
        .eq('role', role)
        .eq('language', language)
        .single();

      if (!error && data?.primary_model) {
        this.modelCache.set(cacheKey, data.primary_model);
        return data.primary_model;
      }

      // Fallback models
      const fallbacks: Record<string, string> = {
        'SecurityAnalyzer': 'anthropic/claude-3-opus',
        'QualityAnalyzer': 'anthropic/claude-3-sonnet',
        'PerformanceAnalyzer': 'deepseek/deepseek-chat',
        'ArchitectureAnalyzer': 'anthropic/claude-3-sonnet',
        'DependencyAnalyzer': 'openai/gpt-4-turbo'
      };

      const fallbackModel = fallbacks[agent] || 'anthropic/claude-3-haiku';
      this.modelCache.set(cacheKey, fallbackModel);
      return fallbackModel;

    } catch (error) {
      logger.error(`Failed to get model for ${agent}: ${error.message}`);
      return 'anthropic/claude-3-haiku'; // Ultimate fallback
    }
  }

  /**
   * Helper methods
   */

  private groupFilesByType(files: string[], language: string): Record<string, string[]> {
    const groups: Record<string, string[]> = {
      source: [],
      test: [],
      config: [],
      dependency: []
    };

    const sourceExts = this.getSourceExtensions(language);
    const testPatterns = ['test', 'spec', '__tests__', 'tests'];
    const configPatterns = ['config', 'rc', 'json', 'yml', 'yaml', 'xml'];
    const depPatterns = ['package.json', 'pom.xml', 'build.gradle', 'requirements.txt', 'Cargo.toml'];

    for (const file of files) {
      const lowerFile = file.toLowerCase();

      if (depPatterns.some(p => lowerFile.includes(p))) {
        groups.dependency.push(file);
      } else if (testPatterns.some(p => lowerFile.includes(p))) {
        groups.test.push(file);
      } else if (configPatterns.some(p => lowerFile.endsWith(`.${p}`))) {
        groups.config.push(file);
      } else if (sourceExts.some(ext => file.endsWith(ext))) {
        groups.source.push(file);
      }
    }

    return groups;
  }

  private getSourceExtensions(language: string): string[] {
    const extensions: Record<string, string[]> = {
      java: ['.java'],
      python: ['.py'],
      javascript: ['.js', '.jsx'],
      typescript: ['.ts', '.tsx'],
      go: ['.go'],
      rust: ['.rs'],
      ruby: ['.rb'],
      php: ['.php'],
      csharp: ['.cs'],
      cpp: ['.cpp', '.cc', '.h', '.hpp']
    };
    return extensions[language] || ['.txt'];
  }

  private getRelevantFiles(fileGroups: Record<string, string[]>, tool: any): string[] {
    // Map tools to relevant file types
    if (tool.agent === 'DependencyAnalyzer') {
      return fileGroups.dependency;
    } else if (tool.name === 'test-coverage') {
      return fileGroups.test;
    } else {
      // Most tools analyze source files
      return fileGroups.source;
    }
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private isBinaryFile(content: string): boolean {
    // Check for null bytes or high proportion of non-printable characters
    for (let i = 0; i < Math.min(content.length, 8000); i++) {
      const charCode = content.charCodeAt(i);
      if (charCode === 0) return true;
    }
    return false;
  }

  private normalizeSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' {
    const lower = severity.toLowerCase();
    if (lower.includes('critical') || lower.includes('blocker')) return 'critical';
    if (lower.includes('high') || lower.includes('major')) return 'high';
    if (lower.includes('medium') || lower.includes('moderate')) return 'medium';
    return 'low';
  }

  private mapAgentToRole(agent: string): string {
    const mapping: Record<string, string> = {
      'SecurityAnalyzer': 'security',
      'QualityAnalyzer': 'code-quality',
      'PerformanceAnalyzer': 'performance',
      'DependencyAnalyzer': 'dependencies',
      'ArchitectureAnalyzer': 'architecture'
    };
    return mapping[agent] || 'code-quality';
  }

  private mapAgentToCategory(agent: string): string {
    const mapping: Record<string, string> = {
      'SecurityAnalyzer': 'security',
      'QualityAnalyzer': 'code-quality',
      'PerformanceAnalyzer': 'performance',
      'DependencyAnalyzer': 'dependencies',
      'ArchitectureAnalyzer': 'architecture'
    };
    return mapping[agent] || 'general';
  }

  private convertToIssue(item: any, tool: any): AnalysisIssue {
    return {
      id: item.id || `${tool.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: item.title || item.message || 'Issue found',
      severity: this.normalizeSeverity(item.severity || item.level || 'medium'),
      category: this.mapAgentToCategory(tool.agent),
      file: item.file || item.path || 'unknown',
      line: item.line || item.lineNumber || 1,
      column: item.column,
      tool: tool.name,
      agent: tool.agent,
      confidence: item.confidence || 0.7,
      description: item.description || item.message || item.details || '',
      suggestion: item.suggestion || item.remediation,
      codeSnippet: item.code,
      suggestedFix: item.fix
    };
  }
}