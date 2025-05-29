import { exec } from 'child_process';
import { promisify } from 'util';
import * as k8s from '@kubernetes/client-node';
import { Logger } from '../utils/logger';
import { 
  RepositoryAnalysisRequest, 
  RepositoryAnalysisResult, 
  DeepWikiConfig 
} from './deepwiki/types';

const execAsync = promisify(exec);

/**
 * Service for interacting with DeepWiki in a Kubernetes environment using CLI commands
 * Rather than trying to use WebSockets (which may not be supported), this service
 * executes commands directly in the pod.
 */
export class DeepWikiKubernetesService {
  private k8sApi: k8s.CoreV1Api;
  private config: DeepWikiConfig;
  private namespace: string;
  private podLabelSelector: string;
  private specificPodName: string | null = null;
  private logger: Logger;

  constructor(logger: Logger, config: DeepWikiConfig) {
    this.logger = logger;
    this.config = config;
    this.namespace = config.namespace || 'codequal-dev'; // Default to codequal-dev namespace
    this.podLabelSelector = config.podLabelSelector || 'app=deepwiki-fixed'; // Updated label selector
    this.specificPodName = config.specificPodName || null;
    
    // Initialize Kubernetes client
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();
    this.k8sApi = kc.makeApiClient(k8s.CoreV1Api);
    
    this.logger.info(`DeepWikiKubernetesService initialized with namespace ${this.namespace}`);
  }

  /**
   * Get the name of an available DeepWiki pod
   */
  private async getDeepWikiPodName(): Promise<string> {
    // If a specific pod name is provided, use it directly
    if (this.specificPodName) {
      this.logger.debug(`Using specific pod name: ${this.specificPodName}`);
      
      // Verify that the pod exists
      try {
        const { stdout } = await execAsync(`kubectl get pod -n ${this.namespace} ${this.specificPodName} -o name`);
        if (stdout.trim()) {
          return this.specificPodName;
        }
      } catch (error) {
        this.logger.warn(`Specified pod ${this.specificPodName} not found, falling back to label selector`);
      }
    }
  
    try {
      this.logger.debug(`Finding available pods with selector: ${this.podLabelSelector}`);
      
      // First try using the Kubernetes API
      try {
        const response = await this.k8sApi.listNamespacedPod({
          namespace: this.namespace
        });

        const readyPods = response.items.filter(
          (pod: k8s.V1Pod) => pod.status?.phase === 'Running' && 
          pod.status.containerStatuses?.some((status: k8s.V1ContainerStatus) => status.ready)
        );

        if (readyPods.length > 0) {
          // Select a random pod to distribute load
          const randomIndex = Math.floor(Math.random() * readyPods.length);
          const selectedPod = readyPods[randomIndex];
          const podName = selectedPod.metadata?.name;
          if (!podName) {
            throw new Error('Selected pod has no name');
          }
          return podName;
        }
      } catch (error) {
        this.logger.warn('Failed to get pod using K8s API, falling back to kubectl', { error });
      }
      
      // Fall back to kubectl if API fails
      const { stdout } = await execAsync(
        `kubectl get pods -n ${this.namespace} -l ${this.podLabelSelector} -o jsonpath='{.items[0].metadata.name}'`
      );
      
      if (!stdout) {
        throw new Error(`No pods found with selector: ${this.podLabelSelector}`);
      }
      
      return stdout.trim();
    } catch (error) {
      this.logger.error('Failed to get DeepWiki pod name', { error });
      
      // Try to list all pods for debugging
      try {
        const { stdout } = await execAsync(`kubectl get pods -n ${this.namespace}`);
        this.logger.debug(`Available pods in namespace: ${stdout}`);
        
        // If the selector failed, try to find a pod with "deepwiki" in the name
        if (stdout.includes('deepwiki')) {
          const { stdout: deepwikiPod } = await execAsync(
            `kubectl get pods -n ${this.namespace} | grep deepwiki | awk '{print $1}' | head -1`
          );
          
          if (deepwikiPod.trim()) {
            this.logger.info(`Found DeepWiki pod by name: ${deepwikiPod.trim()}`);
            return deepwikiPod.trim();
          }
        }
      } catch (e) {
        // Ignore errors from debug command
      }
      
      throw new Error(`Failed to get DeepWiki pod: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Analyze a repository using DeepWiki CLI
   */
  public async analyzeRepository(request: RepositoryAnalysisRequest): Promise<RepositoryAnalysisResult> {
    try {
      // Get DeepWiki pod name
      const podName = await this.getDeepWikiPodName();
      this.logger.info(`Using DeepWiki pod: ${podName}`);

      // Build the CLI command
      const command = this.buildAnalysisCommand(request);
      this.logger.info(`Executing command in pod: ${command}`);

      // Execute the command in the pod
      const { stdout, stderr } = await execAsync(
        `kubectl exec -n ${this.namespace} ${podName} -- ${command}`
      );

      if (stderr) {
        this.logger.warn(`Command produced stderr: ${stderr}`);
      }

      // Parse the results
      const results = this.parseAnalysisOutput(stdout);
      
      // Calculate scores from the analysis results
      const scores = this.calculateScores(results);
      
      return {
        repository: request.repositoryName,
        analysisDate: new Date().toISOString(),
        analysisType: request.tier,
        results,
        scores
      };
    } catch (error) {
      this.logger.error('Repository analysis failed', { 
        error, 
        repository: request.repositoryUrl 
      });
      throw new Error(`Repository analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Build the CLI command for repository analysis
   */
  private buildAnalysisCommand(request: RepositoryAnalysisRequest): string {
    // This should be updated based on the actual DeepWiki CLI interface
    let command = 'deepwiki analyze';
    
    // Add repository URL
    command += ` '${request.repositoryUrl}'`;
    
    // Add branch if specified
    if (request.branch) {
      command += ` --branch '${request.branch}'`;
    }
    
    // Add analysis depth based on tier
    switch (request.tier) {
      case 'quick':
        command += ' --depth shallow';
        break;
      case 'comprehensive':
        command += ' --depth deep';
        break;
      case 'targeted':
        command += ' --depth focused';
        break;
      default:
        command += ' --depth standard';
    }
    
    // Add model if specified
    if (request.model) {
      command += ` --model '${request.model}'`;
    } else if (this.config.defaultModel) {
      command += ` --model '${this.config.defaultModel}'`;
    }
    
    // Add include files if specified
    if (request.includeFiles && request.includeFiles.length > 0) {
      command += ` --include '${request.includeFiles.join(',')}'`;
    }
    
    // Add exclude patterns if specified
    if (request.excludePatterns && request.excludePatterns.length > 0) {
      command += ` --exclude '${request.excludePatterns.join(',')}'`;
    }
    
    // Add output format
    command += ' --format json';
    
    return command;
  }
  
  /**
   * Parse the output from the DeepWiki CLI
   */
  private parseAnalysisOutput(output: string): any {
    try {
      return JSON.parse(output);
    } catch (error) {
      this.logger.error('Failed to parse analysis output', { error, output });
      
      // If it's not valid JSON, return the raw output
      return { rawOutput: output };
    }
  }
  
  /**
   * Calculate scores from analysis results
   */
  private calculateScores(analysisResult: any): any {
    try {
      // Implementation will depend on the actual format of the analysis results
      // This is a placeholder - replace with actual scoring logic
      const scores = {
        overall: 0,
        categories: {
          architecture: 0,
          codeQuality: 0,
          security: 0,
          performance: 0,
          dependencies: 0
        }
      };
      
      // Extract architecture score
      if (analysisResult.architecture) {
        scores.categories.architecture = this.extractCategoryScore(analysisResult.architecture);
      }
      
      // Extract code quality score
      if (analysisResult.codeQuality) {
        scores.categories.codeQuality = this.extractCategoryScore(analysisResult.codeQuality);
      }
      
      // Extract security score
      if (analysisResult.security) {
        scores.categories.security = this.extractCategoryScore(analysisResult.security);
      }
      
      // Extract performance score
      if (analysisResult.performance) {
        scores.categories.performance = this.extractCategoryScore(analysisResult.performance);
      }
      
      // Extract dependencies score
      if (analysisResult.dependencies) {
        scores.categories.dependencies = this.extractCategoryScore(analysisResult.dependencies);
      }
      
      // Calculate overall score (weighted average)
      const weights = {
        architecture: 0.25,
        codeQuality: 0.25,
        security: 0.2,
        performance: 0.15,
        dependencies: 0.15
      };
      
      scores.overall = Object.keys(weights).reduce((sum, category) => {
        return sum + scores.categories[category as keyof typeof scores.categories] * weights[category as keyof typeof weights];
      }, 0);
      
      return scores;
    } catch (error) {
      this.logger.error('Error calculating scores', { error });
      // Return default scores if calculation fails
      return {
        overall: 5,
        categories: {
          architecture: 5,
          codeQuality: 5,
          security: 5,
          performance: 5,
          dependencies: 5
        }
      };
    }
  }
  
  /**
   * Extract a category score from analysis results
   */
  private extractCategoryScore(categoryResult: any): number {
    // Implementation will depend on the actual format of the analysis results
    // This is a placeholder - replace with actual scoring logic
    if (typeof categoryResult.score === 'number') {
      return categoryResult.score;
    }
    
    // If no score is found, calculate one based on issues
    if (Array.isArray(categoryResult.issues)) {
      // Start with perfect score and deduct based on issues
      let score = 10;
      
      // Count issues by severity
      const issues = {
        high: 0,
        medium: 0,
        low: 0
      };
      
      categoryResult.issues.forEach((issue: any) => {
        if (issue.severity === 'high') {
          issues.high++;
        } else if (issue.severity === 'medium') {
          issues.medium++;
        } else {
          issues.low++;
        }
      });
      
      // Deduct points based on severity
      score -= issues.high * 1.5;
      score -= issues.medium * 0.5;
      score -= issues.low * 0.2;
      
      // Ensure score is between 1 and 10
      return Math.max(1, Math.min(10, score));
    }
    
    // Default score if no information is available
    return 5;
  }
  
  /**
   * Execute a command inside a DeepWiki pod
   * Useful for debug and maintenance operations
   */
  public async executeCommand(command: string): Promise<string> {
    try {
      // Get DeepWiki pod name
      const podName = await this.getDeepWikiPodName();
      this.logger.info(`Executing command in pod ${podName}: ${command}`);
      
      // Execute command in pod
      const { stdout, stderr } = await execAsync(
        `kubectl exec -n ${this.namespace} ${podName} -- ${command}`
      );
      
      if (stderr) {
        this.logger.warn(`Command produced stderr: ${stderr}`);
      }
      
      return stdout;
    } catch (error) {
      this.logger.error('Failed to execute command in pod', { error });
      throw new Error(`Failed to execute command: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Health check for DeepWiki service
   */
  public async healthCheck(): Promise<boolean> {
    try {
      // Get DeepWiki pod name
      const podName = await this.getDeepWikiPodName();
      
      // Check if pod is responsive
      await execAsync(
        `kubectl exec -n ${this.namespace} ${podName} -- echo "Health check"`
      );
      
      return true;
    } catch (error) {
      this.logger.error('DeepWiki health check failed', { error });
      return false;
    }
  }
  
  /**
   * Get information about the DeepWiki deployment
   */
  public async getDeploymentInfo(): Promise<any> {
    try {
      // Find all available pods
      const { stdout: podList } = await execAsync(
        `kubectl get pods -n ${this.namespace} -l ${this.podLabelSelector} -o jsonpath='{range .items[*]}{.metadata.name}{": "}{.status.phase}{", "}{.status.podIP}{"\n"}{end}'`
      );
      
      // Get DeepWiki version (if available)
      let version = 'unknown';
      try {
        const podName = await this.getDeepWikiPodName();
        const { stdout: versionOutput } = await execAsync(
          `kubectl exec -n ${this.namespace} ${podName} -- deepwiki --version 2>/dev/null || echo "Version not available"`
        );
        version = versionOutput.trim();
      } catch (e) {
        // Ignore errors
      }
      
      // Get available commands
      let commands: string[] = [];
      try {
        const podName = await this.getDeepWikiPodName();
        const { stdout: helpOutput } = await execAsync(
          `kubectl exec -n ${this.namespace} ${podName} -- deepwiki help 2>/dev/null || echo "Help not available"`
        );
        commands = helpOutput.split('\n').filter((line: string) => line.trim().length > 0);
      } catch (e) {
        // Ignore errors
      }
      
      return {
        pods: podList.split('\n').filter(Boolean).map(line => {
          const [name, status, ip] = line.split(', ');
          return { name, status: status.replace(/^[^:]+: /, ''), ip };
        }),
        version,
        namespace: this.namespace,
        selector: this.podLabelSelector,
        commands
      };
    } catch (error) {
      this.logger.error('Failed to get deployment info', { error });
      throw new Error(`Failed to get deployment info: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}