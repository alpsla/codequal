/**
 * Tool Executor Service - Production Version
 * NO FALLBACKS - Real execution only with proper error reporting
 */

import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ToolExecutionResult {
  tool: string;
  success: boolean;
  issues: AnalysisIssue[];
  executionTime: number;
  executionMethod?: string;
  raw?: string;
  error?: string;
}

export interface AnalysisIssue {
  id: string;
  tool: string;
  type: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  file: string;
  line: number;
  column?: number;
  codeSnippet?: string;
  suggestedFix?: string;
}

export interface ExecutionError extends Error {
  code: string;
  details: any;
  suggestions: string[];
}

export class ToolExecutorService {
  private readonly toolServiceUrl: string;
  private readonly kubeNamespace: string;
  private readonly registry: string;
  private executionAttempts: Map<string, number> = new Map();

  constructor() {
    this.toolServiceUrl = process.env.TOOL_SERVICE_URL || 'http://tool-executor-service';
    this.kubeNamespace = process.env.KUBE_NAMESPACE || 'codequal-dev';
    // Session 88: Updated to Oracle Container Registry (DigitalOcean closed)
    this.registry = process.env.CONTAINER_REGISTRY || 'iad.ocir.io/idzaw9ddo1h5/codequal';

    // Validate configuration on initialization
    this.validateConfiguration();
  }

  /**
   * Validate that all required configuration is present
   */
  private validateConfiguration(): void {
    const errors: string[] = [];

    if (!process.env.OPENROUTER_API_KEY) {
      errors.push('OPENROUTER_API_KEY is not set');
    }

    if (!process.env.CONTAINER_REGISTRY) {
      console.warn('CONTAINER_REGISTRY not set, using default: iad.ocir.io/idzaw9ddo1h5/codequal');
    }

    if (errors.length > 0) {
      throw this.createError('CONFIGURATION_ERROR', 'Missing required configuration', {
        missing: errors
      });
    }
  }

  /**
   * Execute Java tools and get real results - NO FALLBACKS
   */
  async executeJavaTools(workspace: string, prNumber: number): Promise<Map<string, ToolExecutionResult>> {
    const results = new Map<string, ToolExecutionResult>();

    const javaTools = [
      { name: 'spotbugs', image: 'lang-java-v5.1', expectedIssues: 17 },
      { name: 'pmd', image: 'lang-java-v5.1', expectedIssues: 13 },
      { name: 'checkstyle', image: 'lang-java-v5.1', expectedIssues: 11 },
      { name: 'dependency-check', image: 'lang-java-v5.1', expectedIssues: 9 },
      { name: 'sonarqube', image: 'lang-java-v5.1', expectedIssues: 18 },
      { name: 'error-prone', image: 'lang-java-v5.1', expectedIssues: 6 },
      { name: 'infer', image: 'lang-java-v5.1', expectedIssues: 5 }
    ];

    // Check container availability first
    await this.verifyContainersAvailable(javaTools);

    // Execute tools - fail if any don't work
    for (const tool of javaTools) {
      try {
        console.log(`Executing ${tool.name}...`);
        const result = await this.executeTool(tool, workspace);

        // Validate result
        if (!result.success) {
          throw this.createError('TOOL_EXECUTION_FAILED', `${tool.name} failed to execute`, {
            tool: tool.name,
            error: result.error
          });
        }

        if (result.issues.length === 0) {
          console.warn(`WARNING: ${tool.name} returned 0 issues. This may indicate a problem.`);
        }

        if (result.issues.length < tool.expectedIssues * 0.5) {
          console.warn(`WARNING: ${tool.name} returned ${result.issues.length} issues, expected ~${tool.expectedIssues}`);
        }

        results.set(tool.name, result);
        console.log(`✅ ${tool.name}: ${result.issues.length} issues found via ${result.executionMethod}`);

      } catch (error) {
        // Don't hide errors - propagate them
        console.error(`❌ ${tool.name} failed:`, error);
        throw error;
      }
    }

    // Verify we got reasonable results
    const totalIssues = Array.from(results.values()).reduce((sum, r) => sum + r.issues.length, 0);
    if (totalIssues < 50) {
      throw this.createError('INSUFFICIENT_ISSUES', `Only ${totalIssues} issues found, expected 70+`, {
        results: Array.from(results.entries()).map(([tool, r]) => ({
          tool,
          issues: r.issues.length
        }))
      });
    }

    return results;
  }

  /**
   * Verify containers are available before execution
   */
  private async verifyContainersAvailable(tools: any[]): Promise<void> {
    console.log('Verifying tool containers are available...');

    // Check if we can access the registry
    try {
      const { stdout } = await execAsync('docker images | grep codequal || true');
      if (!stdout.includes('lang-java')) {
        console.warn('WARNING: Java tool containers not found locally');

        // Try to pull them
        for (const tool of tools) {
          const imageName = `${this.registry}/${tool.image}`;
          console.log(`Pulling ${imageName}...`);
          try {
            await execAsync(`docker pull ${imageName}`, { timeout: 60000 });
            console.log(`✅ Pulled ${imageName}`);
          } catch (error) {
            throw this.createError('CONTAINER_PULL_FAILED', `Failed to pull ${imageName}`, {
              image: imageName,
              error: error.message
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to verify containers:', error);
    }

    // Check Kubernetes pods
    try {
      const { stdout } = await execAsync(`kubectl get pods -n ${this.kubeNamespace} -o json`);
      const pods = JSON.parse(stdout);

      const runningPods = pods.items.filter((pod: any) =>
        pod.status.phase === 'Running' &&
        pod.metadata.name.includes('tool')
      );

      if (runningPods.length === 0) {
        console.warn('WARNING: No tool executor pods running in Kubernetes');
        console.log('Attempting to create tool executor pod...');

        // Try to create a tool executor pod
        await this.createToolExecutorPod();
      }
    } catch (error) {
      console.warn('Could not check Kubernetes pods:', error.message);
    }
  }

  /**
   * Create a tool executor pod if none exists
   */
  private async createToolExecutorPod(): Promise<void> {
    const podYaml = `
apiVersion: v1
kind: Pod
metadata:
  name: tool-executor
  namespace: ${this.kubeNamespace}
  labels:
    app: tool-executor
spec:
  containers:
  - name: java-tools
    image: ${this.registry}/lang-java-v5.1
    command: ["/bin/sh", "-c", "while true; do sleep 30; done"]
    resources:
      requests:
        memory: "2Gi"
        cpu: "1"
      limits:
        memory: "4Gi"
        cpu: "2"
`;

    try {
      await execAsync(`echo '${podYaml}' | kubectl apply -f -`);
      console.log('✅ Created tool executor pod');

      // Wait for pod to be ready
      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (error) {
      throw this.createError('POD_CREATION_FAILED', 'Failed to create tool executor pod', {
        error: error.message
      });
    }
  }

  /**
   * Execute a single tool - NO FALLBACK TO SIMULATION
   */
  private async executeTool(tool: any, workspace: string): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const attempts = this.executionAttempts.get(tool.name) || 0;

    if (attempts >= 3) {
      throw this.createError('MAX_RETRIES_EXCEEDED', `Failed to execute ${tool.name} after 3 attempts`, {
        tool: tool.name,
        attempts
      });
    }

    this.executionAttempts.set(tool.name, attempts + 1);

    // Try execution methods in order of preference
    const executionMethods = [
      { method: 'kubernetes', executor: () => this.executeViaKubernetes(tool, workspace) },
      { method: 'docker', executor: () => this.executeViaDocker(tool, workspace) },
      { method: 'http', executor: () => this.executeViaHTTP(tool, workspace) }
    ];

    const errors: any[] = [];

    for (const { method, executor } of executionMethods) {
      try {
        console.log(`Attempting ${tool.name} via ${method}...`);
        const result = await executor();

        if (result.success && result.issues.length > 0) {
          return {
            ...result,
            executionMethod: method,
            executionTime: Date.now() - startTime
          };
        }

        errors.push({ method, error: 'No issues found' });
      } catch (error) {
        errors.push({ method, error: error.message });
        console.warn(`${method} failed for ${tool.name}:`, error.message);
      }
    }

    // All methods failed - throw comprehensive error
    throw this.createError('ALL_EXECUTION_METHODS_FAILED',
      `Failed to execute ${tool.name} via any method`, {
      tool: tool.name,
      attempts: errors,
      workspace,
      suggestions: [
        `1. Verify container image ${this.registry}/${tool.image} exists`,
        `2. Check if tool pod is running: kubectl get pods -n ${this.kubeNamespace}`,
        `3. Ensure Docker is running locally: docker ps`,
        `4. Check network connectivity to ${this.toolServiceUrl}`,
        `5. Verify workspace ${workspace} exists and contains Java files`
      ]
    }
    );
  }

  /**
   * Execute via Kubernetes - Real implementation
   */
  private async executeViaKubernetes(tool: any, workspace: string): Promise<ToolExecutionResult> {
    // First check if pod exists
    const podName = 'tool-executor';

    try {
      const { stdout: podStatus } = await execAsync(
        `kubectl get pod ${podName} -n ${this.kubeNamespace} -o json`
      );

      const pod = JSON.parse(podStatus);
      if (pod.status.phase !== 'Running') {
        throw new Error(`Pod ${podName} is not running: ${pod.status.phase}`);
      }

      // Execute tool in pod
      const command = this.buildToolCommand(tool.name);
      const { stdout, stderr } = await execAsync(
        `kubectl exec ${podName} -n ${this.kubeNamespace} -- bash -c "cd /workspace && ${command}"`,
        { maxBuffer: 10 * 1024 * 1024, timeout: 60000 }
      );

      if (stderr && !stderr.includes('WARNING')) {
        console.warn(`${tool.name} stderr:`, stderr);
      }

      const issues = this.parseToolOutput(tool.name, stdout);

      return {
        tool: tool.name,
        success: true,
        issues,
        executionTime: 0,
        raw: stdout.substring(0, 1000)
      };

    } catch (error) {
      throw new Error(`Kubernetes execution failed: ${error.message}`);
    }
  }

  /**
   * Execute via Docker - Real implementation
   */
  private async executeViaDocker(tool: any, workspace: string): Promise<ToolExecutionResult> {
    const image = `${this.registry}/${tool.image}`;

    // Verify image exists
    try {
      await execAsync(`docker image inspect ${image}`);
    } catch (error) {
      throw new Error(`Docker image ${image} not found. Run: docker pull ${image}`);
    }

    // Run tool in container
    const command = this.buildToolCommand(tool.name);
    const { stdout, stderr } = await execAsync(
      `docker run --rm -v ${workspace}:/workspace ${image} bash -c "cd /workspace && ${command}"`,
      { maxBuffer: 10 * 1024 * 1024, timeout: 60000 }
    );

    if (stderr && !stderr.includes('WARNING')) {
      console.warn(`${tool.name} stderr:`, stderr);
    }

    const issues = this.parseToolOutput(tool.name, stdout);

    return {
      tool: tool.name,
      success: true,
      issues,
      executionTime: 0,
      raw: stdout.substring(0, 1000)
    };
  }

  /**
   * Execute via HTTP service - Real implementation
   */
  private async executeViaHTTP(tool: any, workspace: string): Promise<ToolExecutionResult> {
    try {
      const response = await axios.post(
        `${this.toolServiceUrl}/execute`,
        {
          tool: tool.name,
          workspace,
          image: tool.image
        },
        {
          timeout: 60000
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Execution failed');
      }

      return {
        tool: tool.name,
        success: true,
        issues: response.data.issues || [],
        executionTime: response.data.executionTime || 0,
        raw: response.data.raw
      };

    } catch (error) {
      if (error.response) {
        throw new Error(`HTTP service error ${error.response.status}: ${error.response.data.error}`);
      }
      throw new Error(`Cannot reach tool service at ${this.toolServiceUrl}`);
    }
  }

  /**
   * Build actual tool commands
   */
  private buildToolCommand(toolName: string): string {
    const commands: Record<string, string> = {
      spotbugs: 'find . -name "*.class" | xargs spotbugs -textui -low -xml 2>&1',
      pmd: 'pmd pmd -d . -R rulesets/java/quickstart.xml -f json 2>&1',
      checkstyle: 'checkstyle -c /google_checks.xml . 2>&1',
      'dependency-check': 'dependency-check --scan . --format JSON --out /tmp/dc.json && cat /tmp/dc.json',
      sonarqube: 'sonar-scanner -Dsonar.projectKey=test -Dsonar.sources=.',
      'error-prone': 'javac -J-Xbootclasspath/p:/opt/error_prone.jar com.google.errorprone.ErrorProneCompiler *.java',
      infer: 'infer run -- javac *.java'
    };

    const command = commands[toolName];
    if (!command) {
      throw this.createError('UNKNOWN_TOOL', `No command defined for tool: ${toolName}`, {
        tool: toolName,
        availableTools: Object.keys(commands)
      });
    }

    return command;
  }

  /**
   * Parse real tool output
   */
  private parseToolOutput(toolName: string, output: string): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];

    if (!output || output.length === 0) {
      console.warn(`Empty output from ${toolName}`);
      return [];
    }

    // Tool-specific parsing
    switch (toolName) {
      case 'spotbugs':
        return this.parseSpotBugsXML(output);
      case 'pmd':
        return this.parsePMDJSON(output);
      case 'checkstyle':
        return this.parseCheckstyleOutput(output);
      case 'dependency-check':
        return this.parseDependencyCheckJSON(output);
      default:
        return this.parseGenericOutput(toolName, output);
    }
  }

  private parseSpotBugsXML(xml: string): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];

    // Basic XML parsing - in production use proper XML parser
    const bugMatches = xml.matchAll(/<BugInstance[^>]*type="([^"]+)"[^>]*priority="([^"]+)"[^>]*>(.*?)<\/BugInstance>/gs);

    for (const match of bugMatches) {
      const [, type, priority, content] = match;
      const fileMatch = content.match(/sourcepath="([^"]+)"/);
      const lineMatch = content.match(/start="(\d+)"/);

      issues.push({
        id: `spotbugs-${type}-${Date.now()}-${issues.length}`,
        tool: 'spotbugs',
        type,
        category: 'quality',
        severity: this.mapPriority(priority),
        message: this.getSpotBugsMessage(type),
        file: fileMatch ? fileMatch[1] : 'unknown',
        line: lineMatch ? parseInt(lineMatch[1]) : 1
      });
    }

    return issues;
  }

  private parsePMDJSON(output: string): AnalysisIssue[] {
    try {
      const data = JSON.parse(output);
      const issues: AnalysisIssue[] = [];

      if (data.files) {
        for (const file of data.files) {
          for (const violation of file.violations || []) {
            issues.push({
              id: `pmd-${violation.rule}-${Date.now()}-${issues.length}`,
              tool: 'pmd',
              type: violation.rule,
              category: 'quality',
              severity: this.mapPriority(violation.priority),
              message: violation.description,
              file: file.filename,
              line: violation.beginLine
            });
          }
        }
      }

      return issues;
    } catch (error) {
      console.error('Failed to parse PMD JSON:', error);
      return [];
    }
  }

  private parseCheckstyleOutput(output: string): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      if (line.includes('[ERROR]') || line.includes('[WARN]')) {
        const match = line.match(/\[([^\]]+)\]\s+([^:]+):(\d+):?\s*(.*)/);
        if (match) {
          const [, level, file, lineNum, message] = match;
          issues.push({
            id: `checkstyle-${Date.now()}-${issues.length}`,
            tool: 'checkstyle',
            type: 'style-violation',
            category: 'style',
            severity: level === 'ERROR' ? 'high' : 'medium',
            message: message,
            file: file,
            line: parseInt(lineNum)
          });
        }
      }
    }

    return issues;
  }

  private parseDependencyCheckJSON(output: string): AnalysisIssue[] {
    try {
      const data = JSON.parse(output);
      const issues: AnalysisIssue[] = [];

      if (data.dependencies) {
        for (const dep of data.dependencies) {
          for (const vuln of dep.vulnerabilities || []) {
            issues.push({
              id: `dependency-${vuln.name}-${Date.now()}-${issues.length}`,
              tool: 'dependency-check',
              type: vuln.name,
              category: 'security',
              severity: this.mapCVSS(vuln.cvssScore),
              message: vuln.description,
              file: dep.fileName,
              line: 1
            });
          }
        }
      }

      return issues;
    } catch (error) {
      console.error('Failed to parse Dependency Check JSON:', error);
      return [];
    }
  }

  private parseGenericOutput(toolName: string, output: string): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      if (line.toLowerCase().includes('error') ||
        line.toLowerCase().includes('warning') ||
        line.toLowerCase().includes('issue')) {
        issues.push({
          id: `${toolName}-${Date.now()}-${issues.length}`,
          tool: toolName,
          type: 'generic',
          category: 'quality',
          severity: 'medium',
          message: line.trim(),
          file: 'unknown',
          line: 1
        });
      }
    }

    return issues;
  }

  /**
   * Helper methods
   */
  private mapPriority(priority: string | number): 'critical' | 'high' | 'medium' | 'low' {
    if (typeof priority === 'string') {
      switch (priority) {
        case '1': case 'CRITICAL': return 'critical';
        case '2': case 'HIGH': return 'high';
        case '3': case 'MEDIUM': return 'medium';
        default: return 'low';
      }
    }
    if (priority <= 1) return 'critical';
    if (priority <= 2) return 'high';
    if (priority <= 3) return 'medium';
    return 'low';
  }

  private mapCVSS(score: number): 'critical' | 'high' | 'medium' | 'low' {
    if (score >= 9.0) return 'critical';
    if (score >= 7.0) return 'high';
    if (score >= 4.0) return 'medium';
    return 'low';
  }

  private getSpotBugsMessage(type: string): string {
    const messages: Record<string, string> = {
      'NP_NULL_ON_SOME_PATH': 'Possible null pointer dereference',
      'SQL_INJECTION_JDBC': 'SQL injection vulnerability',
      'PATH_TRAVERSAL_IN': 'Path traversal vulnerability',
      'DM_DEFAULT_ENCODING': 'Reliance on default encoding',
      'EI_EXPOSE_REP': 'May expose internal representation'
    };
    return messages[type] || `SpotBugs issue: ${type}`;
  }

  /**
   * Create detailed error with debugging information
   */
  private createError(code: string, message: string, details: any): ExecutionError {
    const error = new Error(message) as ExecutionError;
    error.code = code;
    error.details = details;
    error.suggestions = this.getSuggestionsForError(code);

    console.error(`\n❌ ERROR [${code}]: ${message}`);
    console.error('Details:', JSON.stringify(details, null, 2));
    console.error('Suggestions:');
    error.suggestions.forEach((s, i) => console.error(`  ${i + 1}. ${s}`));

    return error;
  }

  private getSuggestionsForError(code: string): string[] {
    const suggestions: Record<string, string[]> = {
      'CONFIGURATION_ERROR': [
        'Set missing environment variables in .env file',
        'Run: source .env',
        'Verify with: echo $OPENROUTER_API_KEY'
      ],
      'CONTAINER_PULL_FAILED': [
        'Check Docker registry credentials for Oracle OCIR',
        'Verify registry access: docker login iad.ocir.io',
        'Try manual pull: docker pull iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-java-v6.0-arm'
      ],
      'POD_CREATION_FAILED': [
        'Check Kubernetes connectivity: kubectl cluster-info',
        'Verify namespace exists: kubectl get ns codequal-dev',
        'Check permissions: kubectl auth can-i create pods -n codequal-dev'
      ],
      'ALL_EXECUTION_METHODS_FAILED': [
        'Review the detailed error output above',
        'Check if any tool containers are running: docker ps | grep codequal',
        'Verify Kubernetes pods: kubectl get pods -n codequal-dev',
        'Test with a simple command: docker run iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-java-v6.0-arm echo "test"'
      ],
      'INSUFFICIENT_ISSUES': [
        'Check if workspace contains valid Java files',
        'Verify tools are running correctly',
        'Review tool output for errors',
        'Try running tools manually to debug'
      ]
    };

    return suggestions[code] || ['Review the error details above', 'Check system logs for more information'];
  }
}

// Export singleton instance
export const toolExecutor = new ToolExecutorService();