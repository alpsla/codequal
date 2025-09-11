/* eslint-disable no-console */
import { config } from 'dotenv';
import path from 'path';
import { ResultOrchestrator, PRAnalysisRequest, AnalysisResult } from '../../../../apps/api/src/services/result-orchestrator';
import { AuthenticatedUser } from '../../../../apps/api/src/middleware/auth-middleware';
import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs/promises';
import { ModelVersionSync, RepositorySizeCategory, ModelVersionInfo } from '../../../../packages/core/src/services/model-selection/ModelVersionSync';
import { RepositoryModelSelectionService, AnalysisTier } from '../../../../packages/core/src/services/model-selection/RepositoryModelSelectionService';
import { createLogger } from '../../../../packages/core/src/utils/logger';
// import { ResearcherAgent } from '../../../../packages/agents/src/researcher/researcher-agent';
import { RepositoryType } from '../../../../packages/core/src/types/repository';

// Load environment variables
config({ path: path.resolve(__dirname, '../../../../.env') });

// Test configuration
interface TestScenario {
  name: string;
  repositoryUrl: string;
  prNumber: number;
  analysisMode: 'quick' | 'comprehensive' | 'deep';
  expectedAgents: string[];
  description: string;
}

interface TokenUsage {
  provider: string;
  model: string;
  agentType?: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  timestamp: number;
}

interface ModelSelectionEvent {
  agentType: string;
  selectedModel: string;
  provider: string;
  reason: string;
  fallbackUsed: boolean;
  timestamp: number;
}

interface ResearcherActivation {
  reason: string;
  missingConfigs: string[];
  researchTargets: string[];
  timestamp: number;
}

interface PerformanceMetrics {
  totalExecutionTime: number;
  phaseTimings: {
    prContext: number;
    repositoryStatus: number;
    modelSelection: number;
    agentExecution: number;
    resultProcessing: number;
    educationalGeneration: number;
    reportGeneration: number;
  };
  agentTimings: Record<string, number>;
  tokenUsage: TokenUsage[];
  totalCost: number;
  modelSelections: ModelSelectionEvent[];
  researcherActivations: ResearcherActivation[];
  dynamicModelStats: {
    totalSelections: number;
    providersUsed: string[];
    fallbackCount: number;
  };
}

interface TestResult extends AnalysisResult {
  performance: PerformanceMetrics;
  testDuration: number;
  success: boolean;
  error?: string;
}

// Test scenarios for different repository types and PR complexities
const TEST_SCENARIOS: TestScenario[] = [
  {
    name: 'Model Selection Test - Missing Config',
    repositoryUrl: 'https://github.com/elixir-lang/elixir',
    prNumber: 12000,
    analysisMode: 'comprehensive',
    expectedAgents: ['security', 'architecture', 'performance', 'codeQuality', 'researcher'],
    description: 'Tests researcher agent activation for unsupported language (Elixir)'
  },
  {
    name: 'Small Security Fix',
    repositoryUrl: 'https://github.com/OWASP/NodeGoat',
    prNumber: 1, // You'll need to replace with actual PR numbers
    analysisMode: 'quick',
    expectedAgents: ['security', 'codeQuality'],
    description: 'Small security-focused PR in a Node.js vulnerability teaching app'
  },
  {
    name: 'Medium React Feature',
    repositoryUrl: 'https://github.com/facebook/react',
    prNumber: 28000, // Example PR number - replace with actual
    analysisMode: 'comprehensive',
    expectedAgents: ['security', 'architecture', 'performance', 'codeQuality'],
    description: 'Medium-sized feature addition to React framework'
  },
  {
    name: 'Large TypeScript Refactor',
    repositoryUrl: 'https://github.com/microsoft/TypeScript',
    prNumber: 56000, // Example PR number - replace with actual
    analysisMode: 'deep',
    expectedAgents: ['security', 'architecture', 'performance', 'codeQuality', 'dependencies'],
    description: 'Large refactoring PR in TypeScript compiler'
  }
];

class OrchestratorE2ETest {
  private supabase: any;
  private authenticatedUser: AuthenticatedUser;
  private orchestrator: ResultOrchestrator;
  private tokenUsageTracker: Map<string, TokenUsage> = new Map();
  private modelVersionSync: ModelVersionSync;
  private modelSelectionService: RepositoryModelSelectionService;
  private logger = createLogger('OrchestratorE2ETest');
  private modelSelectionEvents: ModelSelectionEvent[] = [];
  private researcherActivations: ResearcherActivation[] = [];
  private performanceTracker: PerformanceMetrics = {
    totalExecutionTime: 0,
    phaseTimings: {
      prContext: 0,
      repositoryStatus: 0,
      modelSelection: 0,
      agentExecution: 0,
      resultProcessing: 0,
      educationalGeneration: 0,
      reportGeneration: 0
    },
    agentTimings: {},
    tokenUsage: [],
    totalCost: 0,
    modelSelections: [],
    researcherActivations: [],
    dynamicModelStats: {
      totalSelections: 0,
      providersUsed: [],
      fallbackCount: 0
    }
  };

  constructor() {
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);

    // Create test authenticated user
    this.authenticatedUser = {
      id: process.env.TEST_USER_ID || 'test-user-123',
      email: process.env.TEST_USER_EMAIL || 'test@codequal.com',
      organizationId: process.env.TEST_ORG_ID || 'test-org-123',
      role: 'admin',
      status: 'active',
      permissions: ['analyze', 'write', 'admin'],
      session: {
        token: process.env.TEST_SESSION_TOKEN || 'test-session-token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
      }
    };

    // Initialize model selection services
    this.modelVersionSync = new ModelVersionSync(this.logger);
    this.modelSelectionService = new RepositoryModelSelectionService(this.logger);

    // Initialize orchestrator
    this.orchestrator = new ResultOrchestrator(this.authenticatedUser);

    // Set up comprehensive tracking
    this.setupTokenTracking();
    this.setupModelSelectionTracking();
    this.setupResearcherTracking();
  }

  /**
   * Set up interceptors to track token usage from AI providers
   */
  private setupTokenTracking() {
    // Hook into console.log to capture token usage logs
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      const logStr = args.join(' ');
      
      // OpenRouter API response pattern
      if (logStr.includes('OpenRouter response:') || logStr.includes('openrouter')) {
        this.parseOpenRouterResponse(logStr);
      }
      
      // Direct provider token usage patterns
      if (logStr.includes('tokens') && logStr.includes('OpenAI')) {
        this.parseOpenAITokenUsage(logStr);
      }
      
      if (logStr.includes('tokens') && logStr.includes('Claude')) {
        this.parseClaudeTokenUsage(logStr);
      }
      
      if (logStr.includes('tokens') && logStr.includes('Gemini')) {
        this.parseGeminiTokenUsage(logStr);
      }
      
      if (logStr.includes('tokens') && logStr.includes('DeepSeek')) {
        this.parseDeepSeekTokenUsage(logStr);
      }
      
      // Agent execution timing
      if (logStr.includes('Agent execution time:')) {
        this.parseAgentTiming(logStr);
      }
      
      originalLog.apply(console, args);
    };
  }

  /**
   * Set up model selection tracking
   */
  private setupModelSelectionTracking() {
    // Hook into logger to capture model selection events
    const originalInfo = this.logger.info.bind(this.logger);
    this.logger.info = (message: string, ...args: any[]) => {
      if (message.includes('Selected model') || message.includes('Model selection')) {
        this.captureModelSelectionEvent(message, args);
      }
      originalInfo(message, ...args);
    };
  }

  /**
   * Set up researcher agent activation tracking
   */
  private setupResearcherTracking() {
    // Hook into logger to capture researcher activations
    const originalWarn = this.logger.warn.bind(this.logger);
    this.logger.warn = (message: string, ...args: any[]) => {
      if (message.includes('No configurations found') || message.includes('Researcher agent activated')) {
        this.captureResearcherActivation(message, args);
      }
      originalWarn(message, ...args);
    };
  }

  private async parseOpenRouterResponse(log: string) {
    try {
      // Parse OpenRouter API response for model and token info
      const modelMatch = log.match(/model["']?:\s*["']([^"']+)["']/i);
      const usageMatch = log.match(/usage.*?prompt_tokens["']?:\s*(\d+).*?completion_tokens["']?:\s*(\d+)/i);
      const agentMatch = log.match(/agent["']?:\s*["']([^"']+)["']/i);
      
      if (modelMatch && usageMatch) {
        const model = modelMatch[1];
        const inputTokens = parseInt(usageMatch[1]);
        const outputTokens = parseInt(usageMatch[2]);
        const agentType = agentMatch ? agentMatch[1] : 'unknown';
        
        // Get cost from model configuration
        const modelInfo = await this.getModelInfo(model);
        const cost = this.calculateCost(inputTokens, outputTokens, modelInfo);
        
        this.tokenUsageTracker.set(`openrouter-${Date.now()}`, {
          provider: 'openrouter',
          model,
          agentType,
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          cost,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('Error parsing OpenRouter response:', error);
    }
  }

  private async getModelInfo(model: string): Promise<ModelVersionInfo | null> {
    // Try to get model info from canonical versions
    const canonicalModel = await this.modelVersionSync.getCanonicalVersion('openrouter', model);
    if (canonicalModel) return canonicalModel;
    
    // Try without openrouter prefix
    const [provider, ...modelParts] = model.split('/');
    if (provider && modelParts.length > 0) {
      return await this.modelVersionSync.getCanonicalVersion(provider, modelParts.join('/'));
    }
    
    return null;
  }

  private calculateCost(inputTokens: number, outputTokens: number, modelInfo: ModelVersionInfo | null): number {
    if (!modelInfo?.pricing) {
      // Fallback to default pricing if not found
      return (inputTokens / 1000000) * 10 + (outputTokens / 1000000) * 30;
    }
    
    // Use pricing from model configuration (per 1M tokens)
    const inputCost = (inputTokens / 1000000) * modelInfo.pricing.input;
    const outputCost = (outputTokens / 1000000) * modelInfo.pricing.output;
    return inputCost + outputCost;
  }

  private async parseOpenAITokenUsage(log: string) {
    try {
      const match = log.match(/(\d+)\s+input\s+tokens.*?(\d+)\s+output\s+tokens/i);
      const agentMatch = log.match(/\[(\w+)\s+Agent\]/i);
      if (match) {
        const inputTokens = parseInt(match[1]);
        const outputTokens = parseInt(match[2]);
        const agentType = agentMatch ? agentMatch[1].toLowerCase() : 'unknown';
        
        const modelInfo = await this.modelVersionSync.getCanonicalVersion('openai', 'gpt-4o');
        const cost = this.calculateCost(inputTokens, outputTokens, modelInfo);
        
        this.tokenUsageTracker.set(`openai-${Date.now()}`, {
          provider: 'openai',
          model: 'gpt-4o',
          agentType,
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          cost,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('Error parsing OpenAI token usage:', error);
    }
  }

  private async parseClaudeTokenUsage(log: string) {
    try {
      const match = log.match(/(\d+)\s+input\s+tokens.*?(\d+)\s+output\s+tokens/i);
      const agentMatch = log.match(/\[(\w+)\s+Agent\]/i);
      if (match) {
        const inputTokens = parseInt(match[1]);
        const outputTokens = parseInt(match[2]);
        const agentType = agentMatch ? agentMatch[1].toLowerCase() : 'unknown';
        
        const modelInfo = await this.modelVersionSync.getCanonicalVersion('anthropic', 'claude-3-7-sonnet');
        const cost = this.calculateCost(inputTokens, outputTokens, modelInfo);
        
        this.tokenUsageTracker.set(`claude-${Date.now()}`, {
          provider: 'anthropic',
          model: 'claude-3-7-sonnet',
          agentType,
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          cost,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('Error parsing Claude token usage:', error);
    }
  }

  private async parseGeminiTokenUsage(log: string) {
    try {
      const match = log.match(/(\d+)\s+input\s+tokens.*?(\d+)\s+output\s+tokens/i);
      const agentMatch = log.match(/\[(\w+)\s+Agent\]/i);
      if (match) {
        const inputTokens = parseInt(match[1]);
        const outputTokens = parseInt(match[2]);
        const agentType = agentMatch ? agentMatch[1].toLowerCase() : 'unknown';
        
        const modelInfo = await this.modelVersionSync.getCanonicalVersion('google', 'gemini-2.5-pro-preview-05-06');
        const cost = this.calculateCost(inputTokens, outputTokens, modelInfo);
        
        this.tokenUsageTracker.set(`gemini-${Date.now()}`, {
          provider: 'google',
          model: 'gemini-2.5-pro-preview-05-06',
          agentType,
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          cost,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('Error parsing Gemini token usage:', error);
    }
  }

  private async parseDeepSeekTokenUsage(log: string) {
    try {
      const match = log.match(/(\d+)\s+input\s+tokens.*?(\d+)\s+output\s+tokens/i);
      const agentMatch = log.match(/\[(\w+)\s+Agent\]/i);
      if (match) {
        const inputTokens = parseInt(match[1]);
        const outputTokens = parseInt(match[2]);
        const agentType = agentMatch ? agentMatch[1].toLowerCase() : 'unknown';
        
        const modelInfo = await this.modelVersionSync.getCanonicalVersion('deepseek', 'deepseek-coder');
        const cost = this.calculateCost(inputTokens, outputTokens, modelInfo);
        
        this.tokenUsageTracker.set(`deepseek-${Date.now()}`, {
          provider: 'deepseek',
          model: 'deepseek-coder',
          agentType,
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          cost,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('Error parsing DeepSeek token usage:', error);
    }
  }

  private parseAgentTiming(log: string) {
    try {
      const match = log.match(/(\w+)\s+Agent\s+execution\s+time:\s+(\d+)ms/i);
      if (match) {
        const agentName = match[1].toLowerCase();
        const executionTime = parseInt(match[2]);
        this.performanceTracker.agentTimings[agentName] = executionTime;
      }
    } catch (error) {
      console.error('Error parsing agent timing:', error);
    }
  }

  private captureModelSelectionEvent(message: string, args: any[]) {
    try {
      const data = args[0] || {};
      if (data.provider && data.model) {
        const event: ModelSelectionEvent = {
          agentType: data.agentType || data.agent || 'unknown',
          selectedModel: data.model,
          provider: data.provider,
          reason: data.reason || data.notes || 'dynamic selection',
          fallbackUsed: data.fallback || false,
          timestamp: Date.now()
        };
        this.modelSelectionEvents.push(event);
        this.performanceTracker.dynamicModelStats.totalSelections++;
        
        if (!this.performanceTracker.dynamicModelStats.providersUsed.includes(data.provider)) {
          this.performanceTracker.dynamicModelStats.providersUsed.push(data.provider);
        }
        
        if (event.fallbackUsed) {
          this.performanceTracker.dynamicModelStats.fallbackCount++;
        }
      }
    } catch (error) {
      console.error('Error capturing model selection event:', error);
    }
  }

  private captureResearcherActivation(message: string, args: any[]) {
    try {
      if (message.includes('No configurations found') || message.includes('Researcher agent activated')) {
        const activation: ResearcherActivation = {
          reason: message,
          missingConfigs: args[0]?.missingConfigs || [],
          researchTargets: args[0]?.targets || [],
          timestamp: Date.now()
        };
        this.researcherActivations.push(activation);
      }
    } catch (error) {
      console.error('Error capturing researcher activation:', error);
    }
  }

  /**
   * Run a single test scenario
   */
  async runScenario(scenario: TestScenario): Promise<TestResult> {
    const spinner = ora(`Running scenario: ${chalk.cyan(scenario.name)}`).start();
    const startTime = Date.now();
    
    try {
      // Reset trackers for this scenario
      this.tokenUsageTracker.clear();
      this.modelSelectionEvents = [];
      this.researcherActivations = [];
      this.performanceTracker = {
        totalExecutionTime: 0,
        phaseTimings: {
          prContext: 0,
          repositoryStatus: 0,
          modelSelection: 0,
          agentExecution: 0,
          resultProcessing: 0,
          educationalGeneration: 0,
          reportGeneration: 0
        },
        agentTimings: {},
        tokenUsage: [],
        totalCost: 0,
        modelSelections: [],
        researcherActivations: [],
        dynamicModelStats: {
          totalSelections: 0,
          providersUsed: [],
          fallbackCount: 0
        }
      };

      // Create PR analysis request
      const request: PRAnalysisRequest = {
        repositoryUrl: scenario.repositoryUrl,
        prNumber: scenario.prNumber,
        analysisMode: scenario.analysisMode,
        authenticatedUser: this.authenticatedUser,
        githubToken: process.env.GITHUB_TOKEN,
        reportFormat: {
          type: 'full-report',
          includeEducational: true,
          educationalDepth: 'comprehensive'
        }
      };

      spinner.text = `${scenario.name} - Extracting PR context...`;
      const _phaseStart1 = Date.now();
      
      // Track model selection phase
      const _phaseStart = Date.now();
      spinner.text = `${scenario.name} - Selecting optimal models...`;
      
      // Execute orchestrator analysis
      const result = await this.orchestrator.analyzePR(request);
      
      // Compile performance metrics
      this.performanceTracker.totalExecutionTime = Date.now() - startTime;
      this.performanceTracker.tokenUsage = Array.from(this.tokenUsageTracker.values());
      this.performanceTracker.totalCost = this.performanceTracker.tokenUsage.reduce(
        (sum, usage) => sum + usage.cost, 
        0
      );
      this.performanceTracker.modelSelections = this.modelSelectionEvents;
      this.performanceTracker.researcherActivations = this.researcherActivations;

      // Validate result
      this.validateResult(result, scenario);

      spinner.succeed(
        `${chalk.green('✓')} ${scenario.name} completed in ${chalk.yellow(
          ((Date.now() - startTime) / 1000).toFixed(1) + 's'
        )}`
      );

      return {
        ...result,
        performance: this.performanceTracker,
        testDuration: Date.now() - startTime,
        success: true
      };

    } catch (error) {
      spinner.fail(`${chalk.red('✗')} ${scenario.name} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        analysisId: `failed-${Date.now()}`,
        status: 'complete',
        repository: { url: scenario.repositoryUrl, name: '', primaryLanguage: '' },
        pr: { number: scenario.prNumber, title: '', changedFiles: 0 },
        analysis: { mode: scenario.analysisMode, agentsUsed: [], totalFindings: 0, processingTime: 0 },
        findings: { security: [], architecture: [], performance: [], codeQuality: [] },
        educationalContent: [],
        metrics: { totalFindings: 0, severity: { critical: 0, high: 0, medium: 0, low: 0 }, confidence: 0, coverage: 0 },
        report: { summary: '', recommendations: [], prComment: '' },
        metadata: { timestamp: new Date(), modelVersions: {}, processingSteps: [] },
        performance: this.performanceTracker,
        testDuration: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate analysis result meets expectations
   */
  private validateResult(result: AnalysisResult, scenario: TestScenario) {
    // Check status
    if (result.status !== 'complete') {
      throw new Error(`Analysis did not complete successfully: ${result.status}`);
    }

    // Check agents used
    const agentsUsed = result.analysis.agentsUsed;
    const missingAgents = scenario.expectedAgents.filter(agent => !agentsUsed.includes(agent));
    if (missingAgents.length > 0 && !scenario.expectedAgents.includes('researcher')) {
      console.warn(`Warning: Expected agents not used: ${missingAgents.join(', ')}`);
    }
    
    // Special check for researcher agent activation
    if (scenario.expectedAgents.includes('researcher')) {
      const researcherUsed = agentsUsed.includes('researcher') || 
                           this.researcherActivations.length > 0;
      if (!researcherUsed) {
        throw new Error('Researcher agent was expected but not activated');
      }
    }

    // Check for findings
    if (result.analysis.totalFindings === 0) {
      console.warn('Warning: No findings detected in analysis');
    }

    // Check educational content
    if (!result.educationalContent || result.educationalContent.length === 0) {
      console.warn('Warning: No educational content generated');
    }

    // Check report
    if (!result.report.fullReport) {
      throw new Error('Full report not generated');
    }

    // Check token usage captured
    if (this.performanceTracker.tokenUsage.length === 0) {
      console.warn('Warning: No token usage captured');
    }
    
    // Check model selection events
    if (this.performanceTracker.modelSelections.length === 0) {
      console.warn('Warning: No model selection events captured');
    }
    
    // Log dynamic model selection stats
    console.log(chalk.gray(`Model selections: ${this.performanceTracker.dynamicModelStats.totalSelections}`));
    console.log(chalk.gray(`Providers used: ${this.performanceTracker.dynamicModelStats.providersUsed.join(', ')}`));
    console.log(chalk.gray(`Fallbacks: ${this.performanceTracker.dynamicModelStats.fallbackCount}`));
  }

  /**
   * Generate performance report
   */
  async generateReport(results: TestResult[]): Promise<void> {
    const reportPath = path.join(
      __dirname, 
      '../../reports', 
      `orchestrator-e2e-${new Date().toISOString()}.json`
    );

    const report = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        orchestratorVersion: '1.0.0'
      },
      summary: {
        totalScenarios: results.length,
        successfulScenarios: results.filter(r => r.success).length,
        failedScenarios: results.filter(r => !r.success).length,
        totalDuration: results.reduce((sum, r) => sum + r.testDuration, 0),
        totalCost: results.reduce((sum, r) => sum + (r.performance?.totalCost || 0), 0),
        totalTokens: results.reduce((sum, r) => 
          sum + r.performance.tokenUsage.reduce((tSum, usage) => tSum + usage.totalTokens, 0), 0
        )
      },
      scenarios: results.map(r => ({
        name: TEST_SCENARIOS.find(s => s.repositoryUrl === r.repository.url)?.name || 'Unknown',
        success: r.success,
        duration: r.testDuration,
        findings: r.analysis.totalFindings,
        agentsUsed: r.analysis.agentsUsed,
        cost: r.performance.totalCost,
        tokenUsage: r.performance.tokenUsage,
        modelSelections: r.performance.modelSelections,
        researcherActivations: r.performance.researcherActivations,
        dynamicModelStats: r.performance.dynamicModelStats,
        error: r.error
      })),
      detailedResults: results
    };

    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n${chalk.green('Performance report saved to:')} ${reportPath}`);

    // Print summary
    console.log('\n' + chalk.bold('Test Summary:'));
    console.log(`Total Scenarios: ${report.summary.totalScenarios}`);
    console.log(`Successful: ${chalk.green(report.summary.successfulScenarios.toString())}`);
    console.log(`Failed: ${chalk.red(report.summary.failedScenarios.toString())}`);
    console.log(`Total Duration: ${chalk.yellow((report.summary.totalDuration / 1000).toFixed(1) + 's')}`);
    console.log(`Total Model Selections: ${chalk.blue(results.reduce((sum, r) => sum + r.performance.dynamicModelStats.totalSelections, 0).toString())}`);
    console.log(`Unique Providers: ${chalk.cyan([...new Set(results.flatMap(r => r.performance.dynamicModelStats.providersUsed))].join(', '))}`);
    console.log(`Researcher Activations: ${chalk.magenta(results.reduce((sum, r) => sum + r.performance.researcherActivations.length, 0).toString())}`);
    console.log(`Total Cost: ${chalk.cyan('$' + report.summary.totalCost.toFixed(4))}`);
    console.log(`Total Tokens: ${chalk.magenta(report.summary.totalTokens.toLocaleString())}`);
  }

  /**
   * Run all test scenarios
   */
  async runAllScenarios(): Promise<void> {
    console.log(chalk.bold('\n🚀 Starting CodeQual Orchestrator E2E Tests\n'));
    
    const results: TestResult[] = [];

    for (const scenario of TEST_SCENARIOS) {
      console.log(`\n${chalk.blue('━'.repeat(60))}`);
      console.log(chalk.bold(`Scenario: ${scenario.name}`));
      console.log(chalk.gray(scenario.description));
      console.log(chalk.blue('━'.repeat(60)) + '\n');

      const result = await this.runScenario(scenario);
      results.push(result);

      // Add delay between scenarios to avoid rate limiting
      if (TEST_SCENARIOS.indexOf(scenario) < TEST_SCENARIOS.length - 1) {
        console.log(chalk.gray('\nWaiting 5 seconds before next scenario...'));
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    await this.generateReport(results);
  }

  /**
   * Run a specific scenario by repository URL
   */
  async runSpecificScenario(repositoryUrl: string, prNumber: number): Promise<void> {
    const customScenario: TestScenario = {
      name: 'Custom PR Analysis',
      repositoryUrl,
      prNumber,
      analysisMode: 'comprehensive',
      expectedAgents: ['security', 'architecture', 'performance', 'codeQuality'],
      description: `Custom analysis of PR #${prNumber} in ${repositoryUrl}`
    };

    console.log(chalk.bold('\n🚀 Running Custom Orchestrator E2E Test\n'));
    
    const result = await this.runScenario(customScenario);
    await this.generateReport([result]);
  }

  /**
   * Test token usage tracking
   */
  async testTokenTracking(): Promise<void> {
    console.log(chalk.bold('\n📊 Testing Token Usage Tracking\n'));

    // Simulate various token usage logs
    console.log('OpenRouter response: {"model": "anthropic/claude-3-7-sonnet", "usage": {"prompt_tokens": 1500, "completion_tokens": 500}, "agent": "security"}');
    console.log('[Security Agent] OpenAI GPT-4 usage: 1200 input tokens, 400 output tokens');
    console.log('[Architecture Agent] Claude-3 usage: 2000 input tokens, 800 output tokens');
    console.log('[Performance Agent] Gemini usage: 1800 input tokens, 600 output tokens');
    console.log('[Dependencies Agent] DeepSeek usage: 1600 input tokens, 550 output tokens');
    console.log('Security Agent execution time: 5234ms');
    console.log('Architecture Agent execution time: 3456ms');
    
    // Simulate model selection events
    this.logger.info('Selected model for security agent', { 
      provider: 'openrouter', 
      model: 'anthropic/claude-3-7-sonnet',
      agentType: 'security',
      reason: 'optimal for security analysis'
    });
    
    // Simulate researcher activation
    this.logger.warn('No configurations found for language: elixir', {
      missingConfigs: ['elixir/small', 'elixir/medium', 'elixir/large'],
      targets: ['elixir']
    });

    // Check if tracking worked
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log('\nCaptured token usage:');
    this.tokenUsageTracker.forEach((usage, key) => {
      console.log(`${key}: ${JSON.stringify(usage, null, 2)}`);
    });

    console.log('\nCaptured agent timings:');
    console.log(JSON.stringify(this.performanceTracker.agentTimings, null, 2));
    
    console.log('\nCaptured model selections:');
    console.log(JSON.stringify(this.modelSelectionEvents, null, 2));
    
    console.log('\nCaptured researcher activations:');
    console.log(JSON.stringify(this.researcherActivations, null, 2));
  }

  /**
   * Test model selection for specific contexts
   */
  async testModelSelection(): Promise<void> {
    console.log(chalk.bold('\n🎯 Testing Model Selection\n'));
    
    // Test selection for different contexts
    const testContexts = [
      { language: 'typescript', size: RepositorySizeCategory.SMALL, tier: AnalysisTier.QUICK },
      { language: 'python', size: RepositorySizeCategory.LARGE, tier: AnalysisTier.COMPREHENSIVE },
      { language: 'elixir', size: RepositorySizeCategory.MEDIUM, tier: AnalysisTier.COMPREHENSIVE },
      { language: 'rust', size: RepositorySizeCategory.LARGE, tier: AnalysisTier.TARGETED }
    ];
    
    for (const context of testContexts) {
      const model = this.modelSelectionService.getModelForRepository(
        {
          owner: 'test',
          repo: 'test-repo',
          repoType: 'github' as RepositoryType,
          language: context.language,
          sizeBytes: context.size === RepositorySizeCategory.SMALL ? 1000000 : 
                     context.size === RepositorySizeCategory.MEDIUM ? 20000000 : 100000000
        },
        context.tier
      );
      
      console.log(`${context.language}/${context.size}/${context.tier}: ${model.provider}/${model.model}`);
      
      // Check calibration need
      const calibration = this.modelSelectionService.checkCalibrationNeeded({
        owner: 'test',
        repo: 'test-repo',
        repoType: 'github' as RepositoryType,
        language: context.language,
        sizeBytes: context.size === RepositorySizeCategory.SMALL ? 1000000 : 20000000
      });
      
      if (calibration.requiresCalibration) {
        console.log(chalk.yellow(`  ⚠️  Calibration needed: ${calibration.reason}`));
      }
    }
  }
}

// Main execution
async function main() {
  const tester = new OrchestratorE2ETest();

  // Parse command line arguments
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Run all scenarios
    await tester.runAllScenarios();
  } else if (args[0] === '--test-tracking') {
    // Test token tracking
    await tester.testTokenTracking();
  } else if (args[0] === '--test-model-selection') {
    // Test model selection
    await tester.testModelSelection();
  } else if (args[0] === '--repo' && args[1] && args[2]) {
    // Run specific repository
    const repoUrl = args[1];
    const prNumber = parseInt(args[2]);
    
    if (isNaN(prNumber)) {
      console.error(chalk.red('Invalid PR number provided'));
      process.exit(1);
    }
    
    await tester.runSpecificScenario(repoUrl, prNumber);
  } else {
    console.log(chalk.yellow('Usage:'));
    console.log('  npm run test:orchestrator-e2e           # Run all test scenarios');
    console.log('  npm run test:orchestrator-e2e -- --test-tracking  # Test token tracking');
    console.log('  npm run test:orchestrator-e2e -- --test-model-selection  # Test model selection');
    console.log('  npm run test:orchestrator-e2e -- --repo <url> <pr-number>  # Test specific PR');
    console.log('\nExample:');
    console.log('  npm run test:orchestrator-e2e -- --repo https://github.com/facebook/react 28000');
  }
}

// Handle errors
main().catch(error => {
  console.error(chalk.red('\n❌ Test failed with error:'), error);
  process.exit(1);
});

// Ensure clean exit
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\nTest interrupted by user'));
  process.exit(0);
});