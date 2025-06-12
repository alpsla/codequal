import { spawn } from 'child_process';
import { Logger } from '../utils/logger';

// Use dynamic import for Kubernetes client to avoid module resolution issues
let k8s: any;

// Repository configuration interface used in various places
// (prefixed with underscore to indicate it's not currently used but may be needed later)
interface _RepositoryConfig {
  id: string;
  url: string;
  name: string;
  type: 'github' | 'gitlab' | 'bitbucket';
}

/**
 * Configuration options for DeepWiki analysis
 */
export interface DeepWikiAnalysisOptions {
  /**
   * GitHub repository URL to analyze
   */
  repositoryUrl: string;
  
  /**
   * Branch to analyze (default: main branch)
   */
  branch?: string;
  
  /**
   * Analysis mode (comprehensive or concise)
   */
  mode?: 'comprehensive' | 'concise';
  
  /**
   * Model provider to use (e.g., 'openai', 'google', etc.)
   */
  provider?: string;
  
  /**
   * Specific model to use (e.g., 'gpt-4', 'claude-3-opus', etc.)
   */
  model?: string;
  
  /**
   * Language to focus on (optional)
   */
  language?: string;
  
  /**
   * Maximum execution time in seconds
   */
  timeout?: number;
  
  /**
   * Additional command-line parameters
   */
  additionalParams?: Record<string, string | boolean | number>;
}

/**
 * Structure of DeepWiki analysis results
 * Note: This is a placeholder and will be updated based on actual output structure
 */
export interface DeepWikiAnalysisResult {
  /**
   * Unique identifier for the analysis
   */
  id: string;
  
  /**
   * Repository URL that was analyzed
   */
  repositoryUrl: string;
  
  /**
   * Branch that was analyzed
   */
  branch: string;
  
  /**
   * Status of the analysis (success, error, timeout)
   */
  status: 'success' | 'error' | 'timeout';
  
  /**
   * Timestamp when the analysis started
   */
  startTime: Date;
  
  /**
   * Timestamp when the analysis completed
   */
  endTime: Date;
  
  /**
   * Duration of the analysis in seconds
   */
  duration: number;
  
  /**
   * Options used for the analysis
   */
  options: DeepWikiAnalysisOptions;
  
  /**
   * Raw output from the analysis
   * This is a generic structure that varies based on the analysis type
   */
  output: Record<string, unknown>;
  
  /**
   * Error message if analysis failed
   */
  error?: string;
}

/**
 * Query options for the DeepWiki chat interface
 */
export interface DeepWikiChatQuery {
  /**
   * The question to ask about the repository
   */
  question: string;
  
  /**
   * The repository context
   */
  repositoryContext: {
    /**
     * Repository URL
     */
    url: string;
    
    /**
     * Repository ID from a previous analysis (optional)
     */
    analysisId?: string;
  };
  
  /**
   * Maximum tokens to generate in the response
   */
  maxTokens?: number;
  
  /**
   * Model provider to use
   */
  provider?: string;
  
  /**
   * Specific model to use
   */
  model?: string;
}

/**
 * Result from a DeepWiki chat query
 */
export interface DeepWikiChatResult {
  /**
   * The original question
   */
  question: string;
  
  /**
   * The generated answer
   */
  answer: string;
  
  /**
   * Time taken to generate the answer in milliseconds
   */
  timeTaken: number;
  
  /**
   * Repository context used
   */
  repositoryContext: {
    url: string;
    analysisId?: string;
  };
  
  /**
   * Tokens used in the request
   */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  
  /**
   * Error if the chat query failed
   */
  error?: string;
}

/**
 * Service for interacting with DeepWiki deployed in Kubernetes
 */
export class DeepWikiKubernetesService {
  private readonly kc: any;
  private readonly k8sExecApi: any;
  private readonly namespace: string;
  private readonly podName: string;
  private readonly containerName: string;
  private readonly logger: Logger;
  private k8sInitialized = false;
  
  /**
   * Creates a new DeepWikiKubernetesService
   * 
   * @param logger Logger instance
   * @param options Configuration options
   */
  constructor(
    logger: Logger, 
    options?: { 
      namespace?: string;
      podName?: string;
      containerName?: string;
    }
  ) {
    this.logger = logger;
    
    // Set DeepWiki pod details from options or use defaults
    this.namespace = options?.namespace || 'default';
    this.podName = options?.podName || 'deepwiki';
    this.containerName = options?.containerName || 'deepwiki';
    
    this.logger.info(`DeepWikiKubernetesService initialized with pod ${this.podName} in namespace ${this.namespace}`);
  }
  
  /**
   * Initialize Kubernetes client lazily
   */
  private async initializeK8s(): Promise<void> {
    if (this.k8sInitialized) return;
    
    try {
      k8s = await import('@kubernetes/client-node');
      const kc = new k8s.KubeConfig();
      kc.loadFromDefault();
      (this as any).kc = kc;
      (this as any).k8sExecApi = kc.makeApiClient(k8s.CoreV1Api);
      this.k8sInitialized = true;
    } catch (error) {
      this.logger.warn('Kubernetes client not available', { error: error instanceof Error ? error.message : String(error) });
      throw new Error('Kubernetes client initialization failed');
    }
  }
  
  /**
   * Analyzes a repository using DeepWiki
   * 
   * @param options Analysis options
   * @returns Analysis result
   */
  public async analyzeRepository(options: DeepWikiAnalysisOptions): Promise<DeepWikiAnalysisResult> {
    await this.initializeK8s();
    this.logger.info(`Starting DeepWiki analysis for ${options.repositoryUrl}`);
    
    const startTime = new Date();
    const id = `analysis-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    try {
      // Build the command
      const command = this.buildAnalysisCommand(options);
      
      // Execute the command in the Kubernetes pod
      const output = await this.executeCommandInPod(command, options.timeout || 3600);
      
      const endTime = new Date();
      const duration = (endTime.getTime() - startTime.getTime()) / 1000;
      
      this.logger.info(`DeepWiki analysis completed in ${duration} seconds`);
      
      // Parse the output
      // This will be implemented based on the actual output format
      const parsedOutput = await this.parseAnalysisOutput(output);
      
      return {
        id,
        repositoryUrl: options.repositoryUrl,
        branch: options.branch || 'main',
        status: 'success',
        startTime,
        endTime,
        duration,
        options,
        output: parsedOutput
      };
    } catch (error: unknown) {
      const endTime = new Date();
      const duration = (endTime.getTime() - startTime.getTime()) / 1000;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.logger.error(`DeepWiki analysis failed: ${errorMessage}`, { error });
      
      return {
        id,
        repositoryUrl: options.repositoryUrl,
        branch: options.branch || 'main',
        status: 'error',
        startTime,
        endTime,
        duration,
        options,
        output: {},
        error: errorMessage
      };
    }
  }
  
  /**
   * Queries the DeepWiki chat interface
   * 
   * @param query Chat query options
   * @returns Chat query result
   */
  public async queryChat(query: DeepWikiChatQuery): Promise<DeepWikiChatResult> {
    await this.initializeK8s();
    this.logger.info(`Starting DeepWiki chat query: ${query.question}`);
    
    const startTime = Date.now();
    
    try {
      // Build the command
      const command = this.buildChatCommand(query);
      
      // Execute the command in the Kubernetes pod
      const output = await this.executeCommandInPod(command, 300); // 5-minute timeout for chat
      
      const timeTaken = Date.now() - startTime;
      
      this.logger.info(`DeepWiki chat query completed in ${timeTaken}ms`);
      
      // Parse the output
      // This will be implemented based on the actual output format
      const parsedOutput = await this.parseChatOutput(output);
      
      return {
        question: query.question,
        answer: parsedOutput.answer,
        timeTaken,
        repositoryContext: query.repositoryContext,
        usage: parsedOutput.usage
      };
    } catch (error: unknown) {
      const timeTaken = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.logger.error(`DeepWiki chat query failed: ${errorMessage}`, { error });
      
      return {
        question: query.question,
        answer: '',
        timeTaken,
        repositoryContext: query.repositoryContext,
        error: errorMessage
      };
    }
  }
  
  /**
   * Builds the command to execute for repository analysis
   * 
   * @param options Analysis options
   * @returns Command to execute
   */
  private buildAnalysisCommand(options: DeepWikiAnalysisOptions): string {
    // This implementation will be updated based on the actual DeepWiki CLI interface
    let command = 'deepwiki analyze';
    
    // Add repository URL
    command += ` '${options.repositoryUrl}'`;
    
    // Add branch if specified
    if (options.branch) {
      command += ` --branch '${options.branch}'`;
    }
    
    // Add mode if specified
    if (options.mode === 'concise') {
      command += ' --concise';
    }
    
    // Add provider if specified
    if (options.provider) {
      command += ` --provider '${options.provider}'`;
    }
    
    // Add model if specified
    if (options.model) {
      command += ` --model '${options.model}'`;
    }
    
    // Add language if specified
    if (options.language) {
      command += ` --language '${options.language}'`;
    }
    
    // Add additional parameters
    if (options.additionalParams) {
      for (const [key, value] of Object.entries(options.additionalParams)) {
        if (typeof value === 'boolean') {
          if (value) {
            command += ` --${key}`;
          }
        } else {
          command += ` --${key} '${value}'`;
        }
      }
    }
    
    return command;
  }
  
  /**
   * Builds the command to execute for chat queries
   * 
   * @param query Chat query options
   * @returns Command to execute
   */
  private buildChatCommand(query: DeepWikiChatQuery): string {
    // This implementation will be updated based on the actual DeepWiki CLI interface
    let command = 'deepwiki chat';
    
    // Add repository URL
    command += ` --repo '${query.repositoryContext.url}'`;
    
    // Add analysis ID if specified
    if (query.repositoryContext.analysisId) {
      command += ` --analysis-id '${query.repositoryContext.analysisId}'`;
    }
    
    // Add provider if specified
    if (query.provider) {
      command += ` --provider '${query.provider}'`;
    }
    
    // Add model if specified
    if (query.model) {
      command += ` --model '${query.model}'`;
    }
    
    // Add max tokens if specified
    if (query.maxTokens) {
      command += ` --max-tokens ${query.maxTokens}`;
    }
    
    // Add the question (should be the last parameter)
    command += ` '${query.question}'`;
    
    return command;
  }
  
  /**
   * Executes a command in the DeepWiki Kubernetes pod
   * 
   * @param command Command to execute
   * @param timeoutSeconds Timeout in seconds
   * @returns Command output
   */
  private async executeCommandInPod(command: string, timeoutSeconds: number): Promise<string> {
    this.logger.debug(`Executing command in pod: ${command}`);
    
    // TODO: Implement this based on Kubernetes API or kubectl exec
    // This is a placeholder implementation
    return new Promise<string>((resolve, reject) => {
      // Use kubectl exec to run the command in the pod
      const kubectl = spawn('kubectl', [
        'exec',
        this.podName,
        '-n',
        this.namespace,
        '-c',
        this.containerName,
        '--',
        'sh',
        '-c',
        command
      ]);
      
      let output = '';
      let errorOutput = '';
      
      kubectl.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      kubectl.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      kubectl.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Command failed with exit code ${code}: ${errorOutput}`));
        }
      });
      
      // Set timeout
      const timeout = setTimeout(() => {
        kubectl.kill();
        reject(new Error(`Command timed out after ${timeoutSeconds} seconds`));
      }, timeoutSeconds * 1000);
      
      kubectl.on('close', () => {
        clearTimeout(timeout);
      });
    });
  }
  
  /**
   * Parses the output from a repository analysis
   * 
   * @param output Raw output from the analysis
   * @returns Parsed output
   */
  private async parseAnalysisOutput(output: string): Promise<Record<string, unknown>> {
    // This implementation will be updated based on the actual output format
    try {
      // Try to parse as JSON
      return JSON.parse(output);
    } catch (error: unknown) {
      // If not JSON, return as a wrapped string object
      return { raw: output };
    }
  }
  
  /**
   * Parses the output from a chat query
   * 
   * @param output Raw output from the chat query
   * @returns Parsed output
   */
  private async parseChatOutput(output: string): Promise<{ 
    answer: string; 
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number; } 
  }> {
    // This implementation will be updated based on the actual output format
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(output);
      
      // Type guard for usage property
      let usage: { promptTokens: number; completionTokens: number; totalTokens: number; } | undefined;
      if (parsed.usage && 
          typeof parsed.usage === 'object' &&
          'promptTokens' in parsed.usage &&
          'completionTokens' in parsed.usage &&
          'totalTokens' in parsed.usage &&
          typeof parsed.usage.promptTokens === 'number' &&
          typeof parsed.usage.completionTokens === 'number' &&
          typeof parsed.usage.totalTokens === 'number') {
        usage = {
          promptTokens: parsed.usage.promptTokens,
          completionTokens: parsed.usage.completionTokens,
          totalTokens: parsed.usage.totalTokens
        };
      }
      
      return {
        answer: parsed.answer || parsed.text || parsed.result || output,
        usage
      };
    } catch (error: unknown) {
      // If not JSON, return as is
      return { answer: output };
    }
  }
  
  /**
   * Gets the status of the DeepWiki pod
   * 
   * @returns Pod status
   */
  public async getPodStatus(): Promise<Record<string, unknown>> {
    await this.initializeK8s();
    try {
      // Real implementation that communicates with Kubernetes
      const response = await this.k8sExecApi.readNamespacedPod({
        name: this.podName,
        namespace: this.namespace
      });
      
      return {
        name: response.metadata?.name,
        namespace: response.metadata?.namespace,
        status: response.status?.phase,
        containerStatuses: response.status?.containerStatuses,
        creationTimestamp: response.metadata?.creationTimestamp
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get pod status: ${errorMessage}`, { error });
      throw error;
    }
  }
  
  /**
   * Checks if DeepWiki is ready
   * 
   * @returns True if DeepWiki is ready
   */
  public async isReady(): Promise<boolean> {
    try {
      const status = await this.getPodStatus();
      return status.status === 'Running';
    } catch (error: unknown) {
      return false;
    }
  }
}
