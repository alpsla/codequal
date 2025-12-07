/**
 * Tier 3 Executor - AI-Based Fixing
 *
 * Wraps the UniversalFixExecutor to provide AI-powered code fixes
 * for issues that cannot be fixed by Tier 1 or Tier 2 tools.
 *
 * This executor:
 * - Queries model_configurations table for the appropriate AI model per language
 * - Requires Supabase - throws error if unavailable (no fallbacks)
 * - Model selection is managed by quarterly research, not hardcoded
 * - Handles rate limiting and parallel execution
 *
 * IMPORTANT: No hardcoded model IDs. All model configuration comes from Supabase.
 */

import {
  ToolExecutorBase,
  ToolExecutionResult,
  ToolExecutionOptions,
} from './tool-executor-base';
import { UniversalFixExecutor, FixRequest } from '../universal-fix-executor';

/**
 * Model configuration from Supabase model_configurations table
 */
interface ModelConfig {
  modelId: string;
  provider: string;
  version?: string;
  contextWindow?: number;
  qualityScore?: number;
}

/**
 * Error thrown when Supabase is not configured or model config is missing
 */
export class AIFixerConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIFixerConfigurationError';
  }
}

/**
 * Issue to fix - extended from base interface
 */
export interface Tier3Issue {
  id: string;
  ruleId: string;
  tool: string;
  file: string;
  line: number;
  column?: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  language?: string;
  fixSuggestion?: {
    explanation?: string;
    fix?: string;
    correctedCode?: string;
    bestPractices?: string[];
  };
}

/**
 * Tier 3 Execution Options
 */
export interface Tier3ExecutionOptions extends ToolExecutionOptions {
  language: string;
  issues: Tier3Issue[];
  apiKey?: string;
  modelOverride?: string;
}

/**
 * AI Fixer Executor - Tier 3 of the Three-Tier Fix System
 *
 * REQUIRES Supabase for model configuration - no hardcoded fallbacks.
 * Model selection is managed by quarterly research stored in model_configurations table.
 */
export class AIFixerExecutor extends ToolExecutorBase {
  private supabaseClient: any = null;

  constructor() {
    super({
      name: 'ai',
      command: 'codequal-ai-fix',
      fixCommand: 'codequal-ai-fix --apply',
    });
  }

  protected getVersionCommand(): string {
    return 'echo "AI Fixer v2.0.0"';
  }

  /**
   * Check if AI fixing is available (API key + Supabase required)
   */
  async checkInstalled(): Promise<boolean> {
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY;
    return !!apiKey && !!this.supabaseClient;
  }

  /**
   * Set Supabase client for fetching model configurations (REQUIRED)
   */
  setSupabaseClient(client: any): void {
    this.supabaseClient = client;
  }

  /**
   * Get model configuration for a language from Supabase
   *
   * @throws AIFixerConfigurationError if Supabase not configured or config not found
   */
  private async getModelConfig(language: string): Promise<ModelConfig> {
    // Supabase is REQUIRED - no fallbacks
    if (!this.supabaseClient) {
      throw new AIFixerConfigurationError(
        'Supabase client not configured. AI Fixer requires Supabase for model configuration. ' +
        'Call setSupabaseClient() before using the executor.'
      );
    }

    try {
      const { data, error } = await this.supabaseClient
        .from('model_configurations')
        .select('primary_model, primary_provider, context_window, quality_score')
        .eq('role', 'ai_fixer')
        .eq('language', language)
        .single();

      if (error) {
        throw new AIFixerConfigurationError(
          `Failed to fetch model configuration for language '${language}': ${error.message}. ` +
          'Ensure model_configurations table has an entry for role=ai_fixer, language=' + language
        );
      }

      if (!data) {
        throw new AIFixerConfigurationError(
          `No model configuration found for language '${language}' and role 'ai_fixer'. ` +
          'Run quarterly research to populate model_configurations table.'
        );
      }

      return {
        modelId: data.primary_model,
        provider: data.primary_provider,
        contextWindow: data.context_window,
        qualityScore: data.quality_score,
      };
    } catch (e) {
      if (e instanceof AIFixerConfigurationError) {
        throw e;
      }
      throw new AIFixerConfigurationError(
        `Supabase error fetching model config for '${language}': ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  /**
   * Execute AI-based fixes for a batch of issues
   */
  async executeFix(options: ToolExecutionOptions): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    // Get API key
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        tool: this.config.name,
        command: this.config.command,
        exitCode: 1,
        stdout: '',
        stderr: 'No API key found. Set OPENROUTER_API_KEY or ANTHROPIC_API_KEY',
        filesFixed: [],
        issuesFixed: 0,
        durationMs: Date.now() - startTime,
        error: 'Missing API key for AI fixer',
      };
    }

    // Dry run mode
    if (options.dryRun) {
      return {
        success: true,
        tool: this.config.name,
        command: `${this.config.fixCommand} [AI dry run]`,
        exitCode: 0,
        stdout: '[DRY RUN] AI fixer would process files',
        stderr: '',
        filesFixed: options.files || [],
        issuesFixed: 0,
        durationMs: Date.now() - startTime,
      };
    }

    // For now, return a placeholder result
    // Full implementation would call UniversalFixExecutor
    return {
      success: true,
      tool: this.config.name,
      command: this.config.fixCommand || '',
      exitCode: 0,
      stdout: 'AI fixer placeholder - full implementation pending',
      stderr: '',
      filesFixed: options.files || [],
      issuesFixed: 0,
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Execute AI fixes with full issue context
   */
  async executeFixWithIssues(options: Tier3ExecutionOptions): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    // Get API key
    const apiKey = options.apiKey ||
      process.env.OPENROUTER_API_KEY ||
      process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        tool: this.config.name,
        command: this.config.command,
        exitCode: 1,
        stdout: '',
        stderr: 'No API key found',
        filesFixed: [],
        issuesFixed: 0,
        durationMs: Date.now() - startTime,
        error: 'Missing API key for AI fixer',
      };
    }

    // Get model configuration for language
    const modelConfig = await this.getModelConfig(options.language);
    const model = options.modelOverride || modelConfig.modelId;

    // Determine API URL based on provider
    const apiUrl = modelConfig.provider === 'anthropic'
      ? 'https://api.anthropic.com/v1/messages'
      : 'https://openrouter.ai/api/v1/chat/completions';

    // Convert issues to FixRequest format
    const fixRequests: FixRequest[] = options.issues.map(issue => ({
      file: issue.file,
      line: issue.line,
      column: issue.column,
      severity: this.mapSeverity(issue.severity),
      rule: issue.ruleId,
      message: issue.message,
      category: issue.tool,
      fixSuggestion: issue.fixSuggestion,
    }));

    // Dry run mode
    if (options.dryRun) {
      return {
        success: true,
        tool: this.config.name,
        command: `${this.config.fixCommand} --model ${model} [DRY RUN]`,
        exitCode: 0,
        stdout: `[DRY RUN] Would fix ${fixRequests.length} issues using ${model}`,
        stderr: '',
        filesFixed: options.files || [],
        issuesFixed: 0,
        durationMs: Date.now() - startTime,
      };
    }

    try {
      // Create and execute the universal fix executor
      const executor = new UniversalFixExecutor({
        apiKey,
        apiUrl,
        model,
        workspaceRoot: options.workingDir,
        dryRun: false,
        backup: true,
        parallel: 3,
        rateLimit: 30,
        timeout: options.timeout || 60000,
        verbose: options.verbose,
        onProgress: (progress) => {
          if (options.verbose) {
            console.log(`[AI Fixer] ${progress.current}/${progress.total}: ${progress.file} - ${progress.status}`);
          }
        },
      });

      // Execute fixes
      const result = await executor.executeAll(fixRequests);

      return {
        success: result.issuesFailed === 0,
        tool: this.config.name,
        command: `${this.config.fixCommand} --model ${model}`,
        exitCode: result.issuesFailed > 0 ? 1 : 0,
        stdout: `Fixed ${result.issuesFixed}/${result.totalIssues} issues in ${result.filesProcessed} files`,
        stderr: result.issuesFailed > 0
          ? `Failed to fix ${result.issuesFailed} issues`
          : '',
        filesFixed: result.results
          .filter(r => r.success)
          .map(r => r.file),
        issuesFixed: result.issuesFixed,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        tool: this.config.name,
        command: `${this.config.fixCommand} --model ${model}`,
        exitCode: 1,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        filesFixed: [],
        issuesFixed: 0,
        durationMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Map severity levels
   */
  private mapSeverity(severity: 'error' | 'warning' | 'info'): 'critical' | 'high' | 'medium' | 'low' {
    switch (severity) {
      case 'error':
        return 'high';
      case 'warning':
        return 'medium';
      case 'info':
        return 'low';
      default:
        return 'medium';
    }
  }
}

/**
 * Factory to create Tier 3 executor
 */
export function createTier3Executor(): AIFixerExecutor {
  return new AIFixerExecutor();
}

/**
 * Get Tier 3 tool name
 */
export function getTier3ToolName(): string {
  return 'ai';
}
