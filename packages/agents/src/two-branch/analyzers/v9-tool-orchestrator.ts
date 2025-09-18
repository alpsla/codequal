/**
 * V9 Tool Orchestrator
 * Manages the execution of scanning tools and coordination with AI agents
 *
 * Architecture:
 * 1. Tools run FIRST to scan code (SpotBugs, PMD, Semgrep, etc.)
 * 2. Agents COMPILE and INTERPRET the tool results
 * 3. Results are deduplicated and categorized
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';
import { UnifiedLocationService } from '../../standard/services/unified-location-service';
import { KubernetesCodeFetcher } from '../utils/kubernetes-code-fetcher';

const execAsync = promisify(exec);

export interface ToolScanResult {
  tool: string;
  output: string;
  exitCode: number;
  duration: number;
  filesScanned: number;
}

export interface ProcessedIssue {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  file: string;
  line: number;
  column?: number;
  tool: string;
  agent: string;
  confidence: number;
  description: string;
  suggestion?: string;
  codeSnippet?: string;
  suggestedFix?: string;
  rawToolOutput?: string;
}

export class V9ToolOrchestrator {
  private supabase: any;
  private openRouterKey: string;
  private toolResults: Map<string, ToolScanResult> = new Map();
  private cloudPodUrl: string;
  private locationService: UnifiedLocationService;
  private k8sCodeFetcher: KubernetesCodeFetcher;
  private useKubernetes: boolean;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    this.openRouterKey = process.env.OPENROUTER_API_KEY!;
    this.cloudPodUrl = process.env.CLOUD_POD_URL || 'http://localhost:8080';
    this.locationService = new UnifiedLocationService({
      enableMetrics: true,
      contextLines: 3
    });
    this.k8sCodeFetcher = new KubernetesCodeFetcher();
    this.useKubernetes = !process.env.CLOUD_API_URL || process.env.USE_KUBERNETES !== 'false';
  }

  /**
   * Main orchestration flow
   * STEP 1: Run all tools to scan code
   * STEP 2: Send results to agents for interpretation
   * STEP 3: Compile and deduplicate results
   */
  async orchestrateAnalysis(
    files: string[],
    repoPath: string,
    language: string,
    tools: any[],
    workspaceId?: string,
    pvcName?: string
  ): Promise<ProcessedIssue[]> {
    logger.info(`🎯 Starting Tool Orchestration for ${language}`);
    logger.info(`📁 Repository: ${repoPath}`);
    logger.info(`📊 Files to analyze: ${files.length}`);
    logger.info(`🔧 Tools configured: ${tools.length}`);

    // STEP 1: Run all scanning tools in parallel
    logger.info('\n📡 STEP 1: Running scanning tools...');
    const toolResults = await this.runAllTools(tools, files, repoPath);

    // Store results for caching
    toolResults.forEach(result => {
      this.toolResults.set(result.tool, result);
    });

    logger.info(`✅ Tool scanning complete. ${toolResults.length} tools executed.`);

    // STEP 2: Send tool results to AI agents for interpretation
    logger.info('\n🤖 STEP 2: Sending results to AI agents for interpretation...');
    const interpretedIssues = await this.sendResultsToAgents(
      toolResults,
      language,
      tools
    );

    logger.info(`✅ Agent interpretation complete. ${interpretedIssues.length} issues identified.`);

    // STEP 3: Deduplicate and categorize issues
    logger.info('\n🔍 STEP 3: Deduplicating and categorizing issues...');
    const dedupedIssues = this.deduplicateIssues(interpretedIssues);

    // STEP 4: Fetch actual code snippets from Kubernetes or locally
    logger.info('\n📝 STEP 4: Fetching code snippets for issues...');
    if (this.useKubernetes && workspaceId && pvcName) {
      await this.fetchCodeSnippetsFromKubernetes(dedupedIssues, workspaceId, pvcName);
    } else {
      logger.info('Using placeholder code snippets (local mode or missing K8s params)');
    }

    logger.info(`✅ Final result: ${dedupedIssues.length} unique issues found.`);
    this.logIssueSummary(dedupedIssues);

    return dedupedIssues;
  }

  /**
   * Process already-executed tool results (for Kubernetes execution)
   * Use this when tools have been executed externally (e.g., in Kubernetes)
   */
  async processExecutedToolResults(
    toolResults: ToolScanResult[],
    language: string,
    tools: any[],
    workspaceId?: string,
    pvcName?: string
  ): Promise<ProcessedIssue[]> {
    logger.info(`🎯 Processing pre-executed tool results for ${language}`);
    logger.info(`📊 Tool results to process: ${toolResults.length}`);

    // Store results for caching
    toolResults.forEach(result => {
      this.toolResults.set(result.tool, result);
    });

    // STEP 2: Send tool results to AI agents for interpretation
    logger.info('\n🤖 STEP 2: Sending results to AI agents for interpretation...');
    const interpretedIssues = await this.sendResultsToAgents(
      toolResults,
      language,
      tools
    );

    logger.info(`✅ Agent interpretation complete. ${interpretedIssues.length} issues identified.`);

    // STEP 3: Deduplicate and categorize issues
    logger.info('\n🔍 STEP 3: Deduplicating and categorizing issues...');
    const dedupedIssues = this.deduplicateIssues(interpretedIssues);

    // STEP 4: Fetch actual code snippets from Kubernetes or locally
    logger.info('\n📝 STEP 4: Fetching code snippets for issues...');
    if (this.useKubernetes && workspaceId && pvcName) {
      await this.fetchCodeSnippetsFromKubernetes(dedupedIssues, workspaceId, pvcName);
    } else {
      logger.info('Using placeholder code snippets (local mode or missing K8s params)');
    }

    logger.info(`✅ Final result: ${dedupedIssues.length} unique issues found.`);
    this.logIssueSummary(dedupedIssues);

    return dedupedIssues;
  }

  /**
   * STEP 1: Run all scanning tools
   * Tools are executed either locally or on cloud pod
   */
  private async runAllTools(
    tools: any[],
    files: string[],
    repoPath: string
  ): Promise<ToolScanResult[]> {
    const results: ToolScanResult[] = [];

    logger.info(`📊 Tool execution configuration:`);
    logger.info(`   Total tools: ${tools.length}`);
    logger.info(`   USE_LOCAL_TOOLS: ${process.env.USE_LOCAL_TOOLS || 'not set'}`);
    logger.info(`   USE_CLOUD_POD: ${process.env.USE_CLOUD_POD || 'not set'}`);

    // Log tool details
    tools.forEach((tool, index) => {
      logger.info(`   Tool ${index + 1}: ${tool.name}`);
      logger.info(`     - runLocally: ${tool.runLocally}`);
      logger.info(`     - runOnCloud: ${tool.runOnCloud}`);
      logger.info(`     - image: ${tool.image || 'not specified'}`);
      logger.info(`     - command: ${tool.command || 'not specified'}`);
    });

    // Group tools by execution strategy
    const localTools = tools.filter(t => t.runLocally !== false);
    const cloudTools = tools.filter(t => t.runOnCloud === true);

    logger.info(`📦 Tool categorization:`);
    logger.info(`   Local tools: ${localTools.length} (${localTools.map(t => t.name).join(', ')})`);
    logger.info(`   Cloud tools: ${cloudTools.length} (${cloudTools.map(t => t.name).join(', ')})`);

    // Run local tools in parallel
    const useLocalTools = process.env.USE_LOCAL_TOOLS === 'true';
    if (localTools.length > 0) {
      if (useLocalTools) {
        logger.info(`  🖥️ Running ${localTools.length} tools locally...`);
        const localPromises = localTools.map(tool =>
          this.runLocalTool(tool, repoPath, files)
        );
        const localResults = await Promise.allSettled(localPromises);

        for (let i = 0; i < localResults.length; i++) {
          const result = localResults[i];
          const toolName = localTools[i].name;
          if (result.status === 'fulfilled' && result.value) {
            results.push(result.value);
            logger.info(`     ✅ ${toolName} succeeded`);
          } else if (result.status === 'rejected') {
            logger.error(`     ❌ ${toolName} failed: ${result.reason}`);
          }
        }
      } else {
        logger.warn(`  ⚠️ Local tools available but USE_LOCAL_TOOLS not set to 'true'`);
      }
    }

    // Run cloud pod tools
    const useCloudPod = process.env.USE_CLOUD_POD === 'true';
    if (cloudTools.length > 0) {
      if (useCloudPod) {
        logger.info(`  ☁️ Running ${cloudTools.length} tools on cloud pod...`);
        const cloudResults = await this.runCloudPodTools(cloudTools, repoPath);
        results.push(...cloudResults);
      } else {
        logger.warn(`  ⚠️ Cloud tools available but USE_CLOUD_POD not set to 'true'`);
      }
    }

    // If no real tools available, throw error instead of simulating
    if (results.length === 0) {
      logger.error('  ❌ No real tools executed successfully');
      logger.error('  💡 Debugging information:');
      logger.error(`     - Tools provided: ${tools.length}`);
      logger.error(`     - Local tools available: ${localTools.length}`);
      logger.error(`     - Cloud tools available: ${cloudTools.length}`);
      logger.error(`     - USE_LOCAL_TOOLS: ${useLocalTools}`);
      logger.error(`     - USE_CLOUD_POD: ${useCloudPod}`);
      logger.error('  🔧 To fix: Set USE_LOCAL_TOOLS=true or USE_CLOUD_POD=true in environment');
      throw new Error('Tool execution failed - no tools returned results. Check environment variables and tool configuration.');
    }

    logger.info(`✅ Tool execution complete: ${results.length} results collected`);
    return results;
  }

  /**
   * Run a tool locally
   */
  private async runLocalTool(
    tool: any,
    repoPath: string,
    files: string[]
  ): Promise<ToolScanResult | null> {
    try {
      const startTime = Date.now();
      logger.debug(`    Running ${tool.name}...`);

      const { stdout, stderr } = await execAsync(tool.command, {
        cwd: repoPath,
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer
        timeout: 300000 // 5 minute timeout
      });

      const duration = Date.now() - startTime;
      const output = stdout + '\n' + stderr;

      logger.debug(`    ${tool.name} completed in ${duration}ms`);

      return {
        tool: tool.name,
        output: output,
        exitCode: 0,
        duration: duration,
        filesScanned: files.length
      };
    } catch (error: any) {
      logger.warn(`    ${tool.name} failed: ${error.message}`);

      // Even if tool fails, capture its output
      return {
        tool: tool.name,
        output: error.stdout || error.stderr || error.message,
        exitCode: error.code || 1,
        duration: 0,
        filesScanned: 0
      };
    }
  }

  /**
   * Run tools on cloud pod
   */
  private async runCloudPodTools(
    tools: any[],
    repoPath: string
  ): Promise<ToolScanResult[]> {
    const results: ToolScanResult[] = [];

    try {
      // Send request to cloud pod
      const response = await fetch(`${this.cloudPodUrl}/api/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CLOUD_POD_TOKEN}`
        },
        body: JSON.stringify({
          tools: tools.map(t => t.name),
          repoPath: repoPath,
          language: 'java'
        })
      });

      if (!response.ok) {
        throw new Error(`Cloud pod error: ${response.status}`);
      }

      const data = await response.json() as any;

      for (const toolResult of data.results || []) {
        results.push({
          tool: toolResult.tool,
          output: toolResult.output,
          exitCode: toolResult.exitCode || 0,
          duration: toolResult.duration || 0,
          filesScanned: toolResult.filesScanned || 0
        });
      }
    } catch (error) {
      logger.error(`Cloud pod scan failed: ${error.message}`);
    }

    return results;
  }

  // REMOVED: simulateToolScans method - NO SIMULATIONS ALLOWED
  // All tool execution must be real or fail with clear errors

  /**
   * STEP 2: Send tool results to AI agents for interpretation
   */
  private async sendResultsToAgents(
    toolResults: ToolScanResult[],
    language: string,
    tools: any[]
  ): Promise<ProcessedIssue[]> {
    const allIssues: ProcessedIssue[] = [];

    // Group results by agent type
    const resultsByAgent = new Map<string, ToolScanResult[]>();

    for (const result of toolResults) {
      const tool = tools.find(t => t.name === result.tool);
      if (tool && tool.agent) {
        if (!resultsByAgent.has(tool.agent)) {
          resultsByAgent.set(tool.agent, []);
        }
        resultsByAgent.get(tool.agent)!.push(result);
      }
    }

    // Send to each agent for interpretation
    for (const [agent, results] of resultsByAgent) {
      logger.info(`  Sending ${results.length} tool results to ${agent}...`);

      const interpretedIssues = await this.interpretToolResults(
        agent,
        results,
        language
      );

      allIssues.push(...interpretedIssues);
      logger.info(`  ${agent} identified ${interpretedIssues.length} issues`);
    }

    return allIssues;
  }

  /**
   * Interpret tool results using AI agent
   */
  private async interpretToolResults(
    agent: string,
    toolResults: ToolScanResult[],
    language: string
  ): Promise<ProcessedIssue[]> {
    const issues: ProcessedIssue[] = [];

    try {
      // Get the appropriate model for this agent
      const model = await this.getModelForAgent(agent, language);

      if (!model) {
        logger.warn(`No model available for ${agent}`);
        return this.parseToolOutputsDirectly(toolResults, agent);
      }

      // Prepare the tool outputs for AI interpretation
      const combinedOutput = toolResults.map(r =>
        `=== ${r.tool} Output ===\n${r.output}\n`
      ).join('\n');

      // Call AI to interpret the results
      const interpretation = await this.callAIForInterpretation(
        model,
        agent,
        combinedOutput,
        language
      );

      // Convert AI interpretation to issues
      if (interpretation && interpretation.issues) {
        for (const issue of interpretation.issues) {
          issues.push({
            id: `${agent}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: issue.title || 'Issue detected',
            severity: this.normalizeSeverity(issue.severity),
            category: this.mapAgentToCategory(agent),
            file: issue.file || 'unknown',
            line: issue.line || 1,
            column: issue.column,
            tool: issue.tool || toolResults[0]?.tool || 'unknown',
            agent: agent,
            confidence: issue.confidence || 0.75,
            description: issue.description || issue.message,
            suggestion: issue.suggestion,
            codeSnippet: issue.codeSnippet,
            suggestedFix: issue.suggestedFix,
            rawToolOutput: issue.rawOutput
          });
        }
      }
    } catch (error) {
      logger.error(`Failed to interpret results with ${agent}: ${error.message}`);
      // Fall back to direct parsing
      return this.parseToolOutputsDirectly(toolResults, agent);
    }

    return issues;
  }

  /**
   * Call AI to interpret tool outputs
   */
  private async callAIForInterpretation(
    model: string,
    agent: string,
    toolOutput: string,
    language: string
  ): Promise<any> {
    const prompts = {
      'SecurityAnalyzer': `You are a security expert. Analyze these security tool outputs and identify real vulnerabilities.
                          Extract: file, line, severity (critical/high/medium/low), title, description, suggestion.`,
      'QualityAnalyzer': `You are a code quality expert. Analyze these quality tool outputs and identify code issues.
                         Extract: file, line, severity, title, description, suggestion.`,
      'PerformanceAnalyzer': `You are a performance expert. Analyze these performance tool outputs and identify bottlenecks.
                             Extract: file, line, severity, title, description, suggestion.`,
      'ArchitectureAnalyzer': `You are an architecture expert. Analyze these tool outputs and identify design issues.
                              Extract: file, line, severity, title, description, suggestion.`,
      'DependencyAnalyzer': `You are a dependency expert. Analyze these dependency scan outputs and identify risks.
                            Extract: file, line, severity, title, description, suggestion.`
    };

    const systemPrompt = prompts[agent] || prompts['QualityAnalyzer'];

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/codequal/agents',
          'X-Title': 'CodeQual Tool Result Interpretation'
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'system',
              content: `${systemPrompt}

                       Return ONLY a JSON object with an "issues" array.
                       Each issue must have the fields mentioned above.
                       Focus on REAL issues found in the tool output, not hypothetical ones.`
            },
            {
              role: 'user',
              content: `Interpret these ${language} scanning tool results and extract the actual issues found:\n\n${toolOutput}`
            }
          ],
          max_tokens: 4000,
          temperature: 0.1,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status}`);
      }

      const data = await response.json() as any;
      const content = data.choices[0]?.message?.content || '{}';
      return JSON.parse(content);

    } catch (error) {
      logger.error(`AI interpretation failed: ${error.message}`);
      return { issues: [] };
    }
  }

  /**
   * Parse tool outputs directly without AI
   */
  private parseToolOutputsDirectly(
    toolResults: ToolScanResult[],
    agent: string
  ): ProcessedIssue[] {
    const issues: ProcessedIssue[] = [];

    for (const result of toolResults) {
      const lines = result.output.split('\n');

      for (const line of lines) {
        // Look for common patterns in tool outputs
        const patterns = [
          /\[(CRITICAL|HIGH|MEDIUM|LOW)\]\s+(.+)\s+in\s+(.+):(\d+)/i,
          /Error:\s+(.+)\s+at\s+(.+):(\d+)/i,
          /Warning:\s+(.+)\s+in\s+(.+):(\d+)/i,
          /(.+\.java):(\d+):\s+(.+)/
        ];

        for (const pattern of patterns) {
          const match = line.match(pattern);
          if (match) {
            issues.push({
              id: `${result.tool}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              title: `${result.tool} issue`,
              severity: this.extractSeverityFromLine(line),
              category: this.mapAgentToCategory(agent),
              file: match[3] || match[2] || 'unknown',
              line: parseInt(match[4] || match[3] || '1') || 1,
              tool: result.tool,
              agent: agent,
              confidence: 0.6,
              description: match[2] || match[1] || line,
              rawToolOutput: line,
              // In simulation mode, provide placeholder snippets
              codeSnippet: `// Code snippet will be fetched by UnifiedLocationService`,
              suggestedFix: `Apply ${result.tool} recommended fix`
            });
            break;
          }
        }
      }
    }

    return issues;
  }

  /**
   * STEP 3: Deduplicate issues
   */
  private deduplicateIssues(issues: ProcessedIssue[]): ProcessedIssue[] {
    const uniqueIssues = new Map<string, ProcessedIssue>();

    for (const issue of issues) {
      // Create a unique key based on file, line, and issue type
      const key = `${issue.file}:${issue.line}:${issue.category}:${issue.title.substring(0, 30)}`;

      if (!uniqueIssues.has(key)) {
        uniqueIssues.set(key, issue);
      } else {
        // If duplicate, keep the one with higher confidence
        const existing = uniqueIssues.get(key)!;
        if (issue.confidence > existing.confidence) {
          uniqueIssues.set(key, issue);
        }
      }
    }

    return Array.from(uniqueIssues.values());
  }

  /**
   * Fetch code snippets from Kubernetes PVC
   */
  private async fetchCodeSnippetsFromKubernetes(
    issues: ProcessedIssue[],
    workspaceId: string,
    pvcName: string
  ): Promise<void> {
    logger.info(`Fetching code snippets for ${issues.length} issues from Kubernetes`);

    // Group issues by file for efficiency
    const issuesByFile = new Map<string, ProcessedIssue[]>();
    for (const issue of issues) {
      if (!issuesByFile.has(issue.file)) {
        issuesByFile.set(issue.file, []);
      }
      issuesByFile.get(issue.file)!.push(issue);
    }

    // Fetch snippets for each file
    let fetchedCount = 0;
    for (const [file, fileIssues] of issuesByFile) {
      // Prepare locations for batch fetching
      const locations = fileIssues.map(issue => ({
        file: issue.file,
        line: issue.line,
        column: issue.column
      }));

      try {
        const snippets = await this.k8sCodeFetcher.fetchCodeSnippets(
          workspaceId,
          pvcName,
          locations
        );

        // Update issues with fetched snippets
        for (const issue of fileIssues) {
          const key = `${issue.file}:${issue.line}`;
          const snippet = snippets.get(key);
          if (snippet) {
            issue.codeSnippet = snippet.code;
            fetchedCount++;
          }
        }
      } catch (error) {
        logger.warn(`Failed to fetch snippets for ${file}: ${error.message}`);
      }
    }

    logger.info(`✅ Fetched ${fetchedCount} code snippets from Kubernetes`);
  }

  /**
   * Helper methods
   */

  private async getModelForAgent(agent: string, language: string): Promise<string | null> {
    try {
      const role = this.mapAgentToRole(agent);

      logger.debug(`Querying Supabase for agent=${agent}, role=${role}, language=${language}`);

      // Use limit(1) instead of single() to handle multiple rows
      // Take the first matching row
      const { data, error } = await this.supabase
        .from('model_configurations')
        .select('primary_model')
        .eq('role', role)
        .eq('language', language)
        .limit(1);

      if (!error && data && data.length > 0 && data[0].primary_model) {
        logger.debug(`Found model for ${agent}: ${data[0].primary_model}`);
        return data[0].primary_model;
      }

      // FALLBACK TO RESEARCHER AGENT for dynamic discovery
      logger.info(`No model configuration found for ${agent}/${language}, triggering Researcher Agent discovery...`);
      
      try {
        // Import and use ModelResearcherService for discovery
        const { ModelResearcherService } = await import('../research-services/model-researcher-service');
        const modelResearcher = new ModelResearcherService();
        
        // Determine repository size (you may want to pass this as parameter)
        const repoSize = 'medium'; // Default, should be determined dynamically
        
        // Create context for model discovery
        const context = {
          role,
          language,
          repo_size: repoSize
        };
        
        // Discover optimal model
        const optimalModel = await modelResearcher.getOptimalModelForContext(context);
        
        logger.info(`✅ Researcher Agent discovered optimal model for ${agent}/${language}: ${optimalModel}`);
        
        // Store the discovered configuration for future use
        const { error: insertError } = await this.supabase
          .from('model_configurations')
          .insert({
            role,
            language,
            repository_size: repoSize,
            primary_model: optimalModel,
            fallback_model: 'openai/gpt-3.5-turbo', // Default fallback
            temperature: 0.3,
            max_tokens: 4000,
            last_updated: new Date().toISOString(),
            discovered_by: 'ResearcherAgent',
            auto_discovered: true
          });
        
        if (insertError) {
          logger.warn(`Failed to store discovered model configuration: ${insertError.message}`);
        } else {
          logger.info(`✅ Stored new model configuration for future use`);
        }
        
        return optimalModel;
        
      } catch (researchError: any) {
        logger.error(`Researcher Agent failed to discover model:`, researchError);
        
        // Last resort: Use a sensible default based on role
        const fallbackModels: Record<string, string> = {
          'analyzer': 'openai/gpt-4o-mini',
          'security': 'anthropic/claude-3-haiku',
          'performance': 'openai/gpt-3.5-turbo',
          'quality': 'openai/gpt-3.5-turbo',
          'architecture': 'openai/gpt-4o-mini',
          'dependency': 'openai/gpt-3.5-turbo'
        };
        
        const defaultModel = fallbackModels[role] || 'openai/gpt-3.5-turbo';
        logger.warn(`Using fallback model for ${agent}: ${defaultModel}`);
        
        return defaultModel;
      }
    } catch (error: any) {
      logger.error(`Failed to get model for ${agent}:`, error);
      logger.error('Full error stack:', error.stack);
      
      // Return a default model instead of throwing
      return 'openai/gpt-3.5-turbo';
    }
  }

  private normalizeSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' {
    const lower = severity?.toLowerCase() || '';
    if (lower.includes('critical') || lower.includes('blocker')) return 'critical';
    if (lower.includes('high') || lower.includes('major')) return 'high';
    if (lower.includes('medium') || lower.includes('moderate')) return 'medium';
    return 'low';
  }

  private extractSeverityFromLine(line: string): 'critical' | 'high' | 'medium' | 'low' {
    const lower = line.toLowerCase();
    if (lower.includes('critical') || lower.includes('blocker')) return 'critical';
    if (lower.includes('high') || lower.includes('error')) return 'high';
    if (lower.includes('medium') || lower.includes('warning')) return 'medium';
    return 'low';
  }

  private mapAgentToRole(agent: string): string {
    const mapping: Record<string, string> = {
      // Old names (for backward compatibility)
      'SecurityAnalyzer': 'security',
      'QualityAnalyzer': 'code_quality',
      'PerformanceAnalyzer': 'performance',
      'DependencyAnalyzer': 'dependency',
      'ArchitectureAnalyzer': 'architecture',
      // New V9 agent names
      'SecurityAgent': 'security',
      'CodeQualityAgent': 'code_quality',
      'PerformanceAgent': 'performance',
      'DependencyAgent': 'dependency',
      'ArchitectureAgent': 'architecture'
    };
    return mapping[agent] || 'code_quality';
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

  private logIssueSummary(issues: ProcessedIssue[]): void {
    const bySeverity: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const byTool: Record<string, number> = {};

    for (const issue of issues) {
      bySeverity[issue.severity] = (bySeverity[issue.severity] || 0) + 1;
      byCategory[issue.category] = (byCategory[issue.category] || 0) + 1;
      byTool[issue.tool] = (byTool[issue.tool] || 0) + 1;
    }

    logger.info('\n📊 Issue Summary:');
    logger.info('  By Severity:', bySeverity);
    logger.info('  By Category:', byCategory);
    logger.info('  By Tool:', byTool);
  }
}