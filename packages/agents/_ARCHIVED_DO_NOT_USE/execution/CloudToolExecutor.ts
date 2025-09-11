/**
 * CloudToolExecutor - Kubernetes Job-based tool execution
 * 
 * Executes language-specific analysis tools in containerized Jobs
 * Uses language detection to route to appropriate container
 * Implements job-based execution model for resource efficiency
 */

import { spawn } from 'child_process';
import * as k8s from '@kubernetes/client-node';
import { v4 as uuidv4 } from 'uuid';
import { LanguageDetector } from '../two-branch/utils/language-detector';

export interface CloudExecutionRequest {
  repositoryPath: string;
  prNumber?: number;
  language?: string;  // Can be auto-detected or specified
  branch: 'main' | 'pr';
}

export interface CloudExecutionResult {
  success: boolean;
  jobName: string;
  output: string;
  errors?: string[];
  duration: number;
  containerImage: string;
}

export class CloudToolExecutor {
  private k8sApi: k8s.BatchV1Api;
  private k8sCoreApi: k8s.CoreV1Api;
  private namespace: string;
  
  // Language to container mapping (AMD64 versions)
  private readonly containerImages = {
    python: 'registry.digitalocean.com/codequal/analyzer:python-test-amd64',
    javascript: 'registry.digitalocean.com/codequal/analyzer:lang-javascript-amd64',
    typescript: 'registry.digitalocean.com/codequal/analyzer:lang-javascript-amd64',
    java: 'registry.digitalocean.com/codequal/analyzer:lang-java-amd64',
    go: 'registry.digitalocean.com/codequal/analyzer:lang-go-amd64',
    rust: 'registry.digitalocean.com/codequal/analyzer:lang-rust-amd64',
    ruby: 'registry.digitalocean.com/codequal/analyzer:lang-ruby-amd64',
    php: 'registry.digitalocean.com/codequal/analyzer:lang-php-amd64',
    perl: 'registry.digitalocean.com/codequal/analyzer:lang-perl-amd64',
    cpp: 'registry.digitalocean.com/codequal/analyzer:lang-cpp-amd64',
    c: 'registry.digitalocean.com/codequal/analyzer:lang-cpp-amd64',
    csharp: 'registry.digitalocean.com/codequal/analyzer:lang-csharp-amd64',
  };

  constructor(namespace = 'codequal-dev') {
    // Initialize Kubernetes client
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();
    
    this.k8sApi = kc.makeApiClient(k8s.BatchV1Api);
    this.k8sCoreApi = kc.makeApiClient(k8s.CoreV1Api);
    this.namespace = namespace;
  }

  /**
   * Execute analysis in a Kubernetes Job
   */
  async executeAnalysis(request: CloudExecutionRequest): Promise<CloudExecutionResult> {
    const startTime = Date.now();
    
    // Detect language if not provided
    let language = request.language;
    if (!language) {
      language = await LanguageDetector.detectLanguage(request.repositoryPath);
      language = language.toLowerCase();
    }

    // Get container image for the language
    const containerImage = this.containerImages[language as keyof typeof this.containerImages];
    if (!containerImage) {
      throw new Error(`No container image configured for language: ${language}`);
    }

    // Create unique job name
    const jobName = `analysis-${language}-${uuidv4().substring(0, 8)}`;

    try {
      // Create Kubernetes Job
      const job = await this.createAnalysisJob(jobName, containerImage, request);
      
      // Wait for job completion
      const output = await this.waitForJobCompletion(jobName);
      
      // Clean up job
      await this.deleteJob(jobName);

      return {
        success: true,
        jobName,
        output,
        duration: Date.now() - startTime,
        containerImage
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        jobName,
        output: '',
        errors: [errorMessage],
        duration: Date.now() - startTime,
        containerImage
      };
    }
  }

  /**
   * Create a Kubernetes Job for analysis
   */
  private async createAnalysisJob(
    jobName: string,
    image: string,
    request: CloudExecutionRequest
  ): Promise<k8s.V1Job> {
    const job: k8s.V1Job = {
      apiVersion: 'batch/v1',
      kind: 'Job',
      metadata: {
        name: jobName,
        namespace: this.namespace,
        labels: {
          'app': 'codequal-analyzer',
          'type': 'analysis-job',
          'branch': request.branch
        }
      },
      spec: {
        ttlSecondsAfterFinished: 300, // Cleanup after 5 minutes
        backoffLimit: 1, // Only retry once
        activeDeadlineSeconds: 600, // 10 minute timeout
        template: {
          metadata: {
            labels: {
              'app': 'codequal-analyzer',
              'job': jobName
            }
          },
          spec: {
            restartPolicy: 'Never',
            containers: [{
              name: 'analyzer',
              image: image,
              command: ['/bin/bash', '-c'],
              args: [
                this.buildAnalysisScript(request)
              ],
              resources: {
                requests: {
                  memory: '512Mi',
                  cpu: '250m'
                },
                limits: {
                  memory: '1Gi',
                  cpu: '500m'
                }
              },
              volumeMounts: [{
                name: 'repo',
                mountPath: '/workspace'
              }]
            }],
            initContainers: [{
              name: 'git-clone',
              image: 'alpine/git:latest',
              command: ['sh', '-c'],
              args: [
                `git clone --depth 1 --branch ${request.branch} ${request.repositoryPath} /workspace`
              ],
              volumeMounts: [{
                name: 'repo',
                mountPath: '/workspace'
              }]
            }],
            volumes: [{
              name: 'repo',
              emptyDir: {}
            }]
          }
        }
      }
    };

    const response = await this.k8sApi.createNamespacedJob({
      namespace: this.namespace,
      body: job
    });
    return response;
  }

  /**
   * Build the analysis script to run in the container
   * This runs the appropriate tools for the detected language
   */
  private buildAnalysisScript(request: CloudExecutionRequest): string {
    const language = request.language || 'python';
    
    // Map language to tool commands based on what's available in containers
    const toolScripts: Record<string, string> = {
      python: `
        echo "Running Python analysis tools..."
        
        # Run Bandit for security
        if which bandit >/dev/null 2>&1; then
          echo "Running Bandit security scan..."
          bandit -r /workspace -f json > /tmp/bandit-results.json 2>&1 || true
          echo "Bandit completed"
        fi
        
        # Run Pylint for code quality
        if which pylint >/dev/null 2>&1; then
          echo "Running Pylint..."
          find /workspace -name "*.py" -type f | head -20 | xargs pylint --output-format=json > /tmp/pylint-results.json 2>&1 || true
          echo "Pylint completed"
        fi
        
        # Run Safety for dependency vulnerabilities
        if which safety >/dev/null 2>&1; then
          echo "Running Safety check..."
          safety check --json > /tmp/safety-results.json 2>&1 || true
          echo "Safety completed"
        fi
        
        # Summary
        echo "Python analysis complete"
        ls -la /tmp/*.json 2>/dev/null || echo "No results generated"
      `,
      
      javascript: `
        echo "Running JavaScript analysis tools..."
        
        # Run ESLint
        if which eslint >/dev/null 2>&1; then
          echo "Running ESLint..."
          eslint /workspace --format=json > /tmp/eslint-results.json 2>&1 || true
          echo "ESLint completed"
        fi
        
        # Run npm audit
        if [ -f /workspace/package.json ]; then
          echo "Running npm audit..."
          cd /workspace && npm audit --json > /tmp/npm-audit-results.json 2>&1 || true
          echo "npm audit completed"
        fi
        
        echo "JavaScript analysis complete"
      `,
      
      java: `
        echo "Running Java analysis tools..."
        
        # Run SpotBugs
        if which spotbugs >/dev/null 2>&1; then
          echo "Running SpotBugs..."
          spotbugs -textui /workspace > /tmp/spotbugs-results.txt 2>&1 || true
          echo "SpotBugs completed"
        fi
        
        # Run PMD
        if which pmd >/dev/null 2>&1; then
          echo "Running PMD..."
          pmd check -d /workspace -R rulesets/java/quickstart.xml -f json > /tmp/pmd-results.json 2>&1 || true
          echo "PMD completed"
        fi
        
        echo "Java analysis complete"
      `
    };
    
    const baseScript = `
      cd /workspace
      echo "====================================="
      echo "Starting analysis for ${request.branch} branch"
      echo "Repository: ${request.repositoryPath}"
      echo "Language: ${language}"
      echo "====================================="
      
      # Ensure temp directory exists
      mkdir -p /tmp
      
      ${toolScripts[language] || toolScripts.python}
      
      echo "====================================="
      echo "Analysis phase complete"
      echo "====================================="
    `;
    
    return baseScript;
  }

  /**
   * Wait for job to complete and get logs
   */
  private async waitForJobCompletion(jobName: string, maxWaitMs = 300000): Promise<string> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitMs) {
      try {
        // Check job status
        const jobResponse = await this.k8sApi.readNamespacedJobStatus({
          name: jobName,
          namespace: this.namespace
        });
        
        if (jobResponse.status?.succeeded === 1) {
          // Job succeeded, get logs
          return await this.getJobLogs(jobName);
        }
        
        if (jobResponse.status?.failed && jobResponse.status?.failed > 0) {
          // Job failed
          const logs = await this.getJobLogs(jobName);
          throw new Error(`Job failed: ${logs}`);
        }
        
      } catch (error) {
        if ((error as any).statusCode !== 404) {
          throw error;
        }
      }
      
      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    throw new Error(`Job ${jobName} timed out after ${maxWaitMs}ms`);
  }

  /**
   * Get logs from completed job
   */
  private async getJobLogs(jobName: string): Promise<string> {
    try {
      // Find pods for this job
      const podsResponse = await this.k8sCoreApi.listNamespacedPod({
        namespace: this.namespace,
        labelSelector: `job=${jobName}`
      });
      
      if (!podsResponse.items || podsResponse.items.length === 0) {
        return 'No pods found for job';
      }
      
      const podName = podsResponse.items[0].metadata?.name;
      if (!podName) {
        return 'Pod name not found';
      }
      
      // Get logs from the pod
      const logsResponse = await this.k8sCoreApi.readNamespacedPodLog({
        name: podName,
        namespace: this.namespace,
        container: 'analyzer'
      });
      
      return logsResponse;
    } catch (error) {
      return `Failed to get logs: ${error}`;
    }
  }

  /**
   * Delete completed job
   */
  private async deleteJob(jobName: string): Promise<void> {
    try {
      await this.k8sApi.deleteNamespacedJob({
        name: jobName,
        namespace: this.namespace,
        body: {
          propagationPolicy: 'Background'
        }
      });
    } catch (error) {
      console.error(`Failed to delete job ${jobName}:`, error);
    }
  }

  /**
   * Test connectivity to Kubernetes cluster
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.k8sCoreApi.listNamespace();
      return true;
    } catch (error) {
      console.error('Failed to connect to Kubernetes:', error);
      return false;
    }
  }
}