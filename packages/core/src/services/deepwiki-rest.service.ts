import { exec } from 'child_process';
import { promisify } from 'util';
import * as k8s from '@kubernetes/client-node';
import { Logger } from '../utils/logger';
import { 
  RepositoryAnalysisRequest, 
  RepositoryAnalysisResult, 
  AnalysisTier, 
  DeepWikiConfig 
} from './deepwiki/types';
import fetch from 'node-fetch';

const execAsync = promisify(exec);

/**
 * Service for interacting with DeepWiki in a Kubernetes environment using REST API
 * This alternative approach uses port-forwarding to connect to the DeepWiki REST API
 */
export class DeepWikiKubernetesService {
  private k8sApi: k8s.CoreV1Api;
  private config: DeepWikiConfig;
  private namespace: string;
  private podLabelSelector: string;
  private specificPodName: string | null = null;
  private logger: Logger;
  private portForwardProcess: any = null;
  private localPort: number;

  constructor(logger: Logger, config: DeepWikiConfig) {
    this.logger = logger;
    this.config = config;
    this.namespace = config.namespace || 'codequal-dev';
    this.podLabelSelector = config.podLabelSelector || 'app=deepwiki-fixed';
    this.specificPodName = config.specificPodName || null;
    this.localPort = config.localPort || 8000;
    
    // Initialize Kubernetes client
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();
    this.k8sApi = kc.makeApiClient(k8s.CoreV1Api);
    
    this.logger.info(`DeepWikiKubernetesService initialized with namespace ${this.namespace}`);
    
    // Set up cleanup on exit
    process.on('exit', () => {
      this.cleanupPortForward();
    });
    
    // Handle unexpected shutdowns
    process.on('SIGINT', () => {
      this.cleanupPortForward();
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      this.cleanupPortForward();
      process.exit(0);
    });
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
        }) as any;

        const readyPods = response.body.items.filter(
          (pod: any) => pod.status?.phase === 'Running' && 
          pod.status.containerStatuses?.some((status: any) => status.ready)
        );

        if (readyPods.length > 0) {
          // Select a random pod to distribute load
          const randomIndex = Math.floor(Math.random() * readyPods.length);
          return readyPods[randomIndex].metadata!.name!;
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
      
      // Try to find a pod with "deepwiki" in the name
      try {
        const { stdout } = await execAsync(`kubectl get pods -n ${this.namespace}`);
        this.logger.debug(`Available pods in namespace: ${stdout}`);
        
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
   * Setup port-forwarding to the DeepWiki pod
   */
  private async setupPortForward(): Promise<void> {
    // Clean up any existing port-forward
    this.cleanupPortForward();
    
    // Get DeepWiki pod name
    const podName = await this.getDeepWikiPodName();
    this.logger.info(`Setting up port-forward to pod ${podName} on port ${this.localPort}`);
    
    // Set up port-forwarding
    this.portForwardProcess = exec(
      `kubectl port-forward -n ${this.namespace} ${podName} ${this.localPort}:8000`,
      { maxBuffer: 1024 * 1024 * 10 }
    );
    
    // Log any errors
    this.portForwardProcess.stderr.on('data', (data: string) => {
      this.logger.warn(`Port-forward stderr: ${data}`);
    });
    
    // Wait for port-forward to be ready
    await new Promise<void>((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      
      this.portForwardProcess.stdout.on('data', (data: string) => {
        stdout += data.toString();
        if (stdout.includes('Forwarding from')) {
          resolve();
        }
      });
      
      this.portForwardProcess.stderr.on('data', (data: string) => {
        stderr += data.toString();
        if (stderr.includes('Forwarding from')) {
          resolve();
        }
      });
      
      this.portForwardProcess.on('error', (error: Error) => {
        reject(error);
      });
      
      // Resolve after a timeout even if we don't see the expected output
      setTimeout(resolve, 3000);
    });
    
    // Give it a moment to stabilize
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  /**
   * Clean up port-forwarding
   */
  private cleanupPortForward(): void {
    if (this.portForwardProcess) {
      try {
        this.portForwardProcess.kill();
        this.logger.info('Port-forward process terminated');
      } catch (error) {
        this.logger.warn(`Error killing port-forward process: ${error}`);
      }
      this.portForwardProcess = null;
    }
  }

  /**
   * Analyze a repository using DeepWiki REST API
   */
  public async analyzeRepository(request: RepositoryAnalysisRequest): Promise<RepositoryAnalysisResult> {
    try {
      // Set up port-forwarding
      await this.setupPortForward();
      
      // Prepare request body
      const requestBody = {
        repositoryUrl: request.repositoryUrl,
        repositoryName: request.repositoryName,
        branch: request.branch || 'main',
        depth: this.getTierDepth(request.tier),
        includeFiles: request.includeFiles || [],
        excludePatterns: request.excludePatterns || [],
        customPrompts: request.customPrompts || {},
        model: request.model || this.config.defaultModel || 'gpt-4'
      };
      
      this.logger.info(`Sending repository analysis request: ${JSON.stringify(requestBody)}`);
      
      // Send request to DeepWiki API
      const response = await fetch(`http://localhost:${this.localPort}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}: ${await response.text()}`);
      }
      
      // Parse the response
      const results = await response.json();
      
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
    } finally {
      // Clean up port-forwarding
      this.cleanupPortForward();
    }
  }
  
  /**
   * Map analysis tier to depth level
   */
  private getTierDepth(tier: AnalysisTier): string {
    switch (tier) {
      case 'quick':
        return 'shallow';
      case 'comprehensive':
        return 'deep';
      case 'targeted':
        return 'focused';
      default:
        return 'standard';
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
        return sum + (scores.categories as any)[category] * (weights as any)[category];
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
   * Health check for DeepWiki service
   */
  public async healthCheck(): Promise<boolean> {
    try {
      // Set up port-forwarding
      await this.setupPortForward();
      
      // Check if API is responsive
      const response = await fetch(`http://localhost:${this.localPort}/api/health`);
      
      return response.ok;
    } catch (error) {
      this.logger.error('DeepWiki health check failed', { error });
      return false;
    } finally {
      // Clean up port-forwarding
      this.cleanupPortForward();
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
      
      // Set up port-forwarding
      await this.setupPortForward();
      
      // Get DeepWiki version
      let version = 'unknown';
      try {
        const response = await fetch(`http://localhost:${this.localPort}/api/version`);
        if (response.ok) {
          const versionData = await response.json();
          version = versionData.version || 'unknown';
        }
      } catch (e) {
        // Ignore errors
      }
      
      // Get available APIs
      let apis = [];
      try {
        const response = await fetch(`http://localhost:${this.localPort}/api`);
        if (response.ok) {
          const apiData = await response.json();
          apis = apiData.endpoints || [];
        }
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
        apis
      };
    } catch (error) {
      this.logger.error('Failed to get deployment info', { error });
      throw new Error(`Failed to get deployment info: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      // Clean up port-forwarding
      this.cleanupPortForward();
    }
  }
}