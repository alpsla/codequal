import { BaseAgent } from '../base/base-agent';
import { AnalysisResult, Insight, Suggestion, EducationalContent, Resource } from '@codequal/core/types/agent';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * Snyk scan types
 */
export enum SnykScanType {
  /**
   * Software Composition Analysis for dependencies
   */
  SCA_TEST = 'snyk_sca_test',
  
  /**
   * Static Application Security Testing for code
   */
  CODE_TEST = 'snyk_code_test',
  
  /**
   * Container security scanning
   */
  CONTAINER_TEST = 'snyk_container_test',
  
  /**
   * Infrastructure as Code security scanning
   */
  IAC_TEST = 'snyk_iac_test'
}

/**
 * Snyk agent configuration
 */
interface SnykAgentConfig {
  snykToken?: string;
  transportType?: 'stdio' | 'sse';
  debug?: boolean;
  [key: string]: unknown;
}

/**
 * PR data structure
 */
interface PRData {
  files?: FileData[];
  [key: string]: unknown;
}

/**
 * File data structure
 */
interface FileData {
  filename: string;
  content?: string;
  [key: string]: unknown;
}

/**
 * Command execution result
 */
interface CommandResult {
  stdout: string;
  stderr: string;
}

/**
 * Snyk vulnerability
 */
interface SnykVulnerability {
  title: string;
  packageName: string;
  version: string;
  severity: string;
  from?: string[];
  description?: string;
  CVE?: string;
  url?: string;
  upgradePath?: string[];
  [key: string]: unknown;
}

/**
 * Snyk code issue
 */
interface SnykCodeIssue {
  ruleId?: string;
  message?: {
    text?: string;
  };
  shortDescription?: {
    text?: string;
  };
  helpUri?: string;
  locations?: Array<{
    physicalLocation?: {
      artifactLocation?: {
        uri?: string;
      };
      region?: {
        startLine?: number;
      };
    };
  }>;
  properties?: {
    priorityScore?: number;
    suggestions?: string[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Snyk scan results
 */
interface SnykResults {
  vulnerabilities?: SnykVulnerability[];
  runs?: Array<{
    results?: SnykCodeIssue[];
    [key: string]: unknown;
  }>;
  snykVersion?: string;
  [key: string]: unknown;
}

/**
 * MCP request
 */
interface MCPRequest {
  jsonrpc: string;
  id: string;
  method: string;
  params: {
    target: string;
    options: Record<string, unknown>;
  };
}

/**
 * MCP response
 */
interface MCPResponse {
  result?: SnykResults;
  error?: {
    message: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Implementation of Snyk security agent using MCP protocol
 */
export class SnykAgent extends BaseAgent {
  /**
   * Scan type to perform
   */
  private scanType: SnykScanType;
  
  /**
   * Snyk API token
   */
  private snykToken: string | undefined;
  
  /**
   * MCP transport type ('stdio' or 'sse')
   */
  private transportType: 'stdio' | 'sse';
  
  /**
   * @param scanType Scan type
   * @param config Configuration
   */
  constructor(scanType: SnykScanType, config: SnykAgentConfig = {}) {
    super(config);
    this.scanType = scanType;
    this.snykToken = config.snykToken || process.env.SNYK_TOKEN;
    this.transportType = config.transportType || 'stdio';
  }
  
  /**
   * Analyze PR data using Snyk
   * @param data PR data
   * @returns Analysis result
   */
  async analyze(data: PRData): Promise<AnalysisResult> {
    try {
      // Check if Snyk CLI is installed
      await this.checkSnykInstallation();
      
      // Create temp directory for code if needed
      const tempDir = await this.prepareCodeForScan(data);
      
      // Execute Snyk scan using MCP
      this.log('Executing Snyk scan', { scanType: this.scanType, dir: tempDir });
      const scanResults = await this.executeScan(tempDir);
      
      // Format results
      return this.formatResult(scanResults);
    } catch (error) {
      return this.handleError(error);
    }
  }
  
  /**
   * Check if Snyk CLI is installed
   */
  private async checkSnykInstallation(): Promise<void> {
    try {
      // Execute 'snyk --version' to check if Snyk is installed
      const { stdout } = await this.executeCommand('snyk', ['--version']);
      
      // Parse version string
      const versionMatch = stdout.match(/([0-9]+\.[0-9]+\.[0-9]+)/);
      const version = versionMatch ? versionMatch[1] : '';
      
      // Check if version is sufficient (>=1.1296.2)
      const [major, minor, patch] = version.split('.').map(Number);
      const isVersionSufficient = 
        major > 1 || 
        (major === 1 && minor > 1296) || 
        (major === 1 && minor === 1296 && patch >= 2);
      
      if (!isVersionSufficient) {
        throw new Error(`Snyk CLI version ${version} is too old for MCP support. Please upgrade to v1.1296.2 or later.`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Snyk CLI is not installed or not in PATH. Please install Snyk CLI v1.1296.2 or later: ${errorMessage}`);
    }
  }
  
  /**
   * Prepare code for scanning
   * @param data PR data
   * @returns Path to temporary directory
   */
  private async prepareCodeForScan(data: PRData): Promise<string> {
    // Create temp directory
    const tempDir = path.join(os.tmpdir(), `snyk-scan-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    
    // Write files to temp directory
    const files = data.files || [];
    
    for (const file of files) {
      const filePath = path.join(tempDir, file.filename);
      
      // Create directories if needed
      const fileDir = path.dirname(filePath);
      fs.mkdirSync(fileDir, { recursive: true });
      
      // Write file content
      fs.writeFileSync(filePath, file.content || '');
    }
    
    return tempDir;
  }
  
  /**
   * Execute command as promise
   * @param command Command
   * @param args Arguments
   * @returns Standard output
   */
  private executeCommand(command: string, args: string[]): Promise<CommandResult> {
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      
      // Create shallow copy of process.env to avoid modifying global
      const envCopy: NodeJS.ProcessEnv = { ...(process.env as NodeJS.ProcessEnv) };
      if (this.snykToken) {
        envCopy.SNYK_TOKEN = this.snykToken;
      }
      
      const childProcess = spawn(command, args, { env: envCopy });
      
      childProcess.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });
      
      childProcess.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });
      
      childProcess.on('close', (code: number | null) => {
        if (code === 0 || code === 1) {
          // Code 1 is often used by Snyk to indicate vulnerabilities found
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });
      
      childProcess.on('error', (error: Error) => {
        reject(error);
      });
    });
  }
  
  /**
   * Execute Snyk scan
   * @param targetDir Directory to scan
   * @returns Scan results
   */
  private async executeScan(targetDir: string): Promise<SnykResults> {
    // Choose scan command based on scan type
    let snykCommand: string[];
    
    switch (this.scanType) {
      case SnykScanType.CODE_TEST:
        snykCommand = ['code', 'test', '--json'];
        break;
      case SnykScanType.SCA_TEST:
        snykCommand = ['test', '--json'];
        break;
      case SnykScanType.CONTAINER_TEST:
        snykCommand = ['container', 'test', '--json'];
        break;
      case SnykScanType.IAC_TEST:
        snykCommand = ['iac', 'test', '--json'];
        break;
      default:
        snykCommand = ['test', '--json'];
    }
    
    // Use MCP protocol
    const mcpArgs = ['mcp', `-t`, this.transportType, '--experimental'];
    
    try {
      // First authenticate if token is provided
      if (this.snykToken) {
        await this.executeCommand('snyk', ['auth', this.snykToken]);
      }
      
      // Create shallow copy of process.env to avoid modifying global
      const envCopy: NodeJS.ProcessEnv = { ...(process.env as NodeJS.ProcessEnv) };
      if (this.snykToken) {
        envCopy.SNYK_TOKEN = this.snykToken;
      }
      
      // Start MCP server
      const mcpProcess = spawn('snyk', mcpArgs, {
        cwd: targetDir,
        env: envCopy
      });
      
      // Prepare MCP client request
      const mcpRequest: MCPRequest = {
        jsonrpc: '2.0',
        id: '1',
        method: this.scanType,
        params: {
          target: targetDir,
          options: {
            json: true,
            allProjects: true
          }
        }
      };
      
      // Send request to MCP server
      mcpProcess.stdin.write(JSON.stringify(mcpRequest) + '\n');
      
      // Get results from MCP server
      return await this.processMCPOutput(mcpProcess);
    } catch (error) {
      // If MCP fails, fall back to direct command
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log('MCP scan failed, falling back to direct command', { error: errorMessage });
      
      // Create environment with cwd for direct command
      const envCopy: NodeJS.ProcessEnv = { ...(process.env as NodeJS.ProcessEnv) };
      if (this.snykToken) {
        envCopy.SNYK_TOKEN = this.snykToken;
      }
      
      const { stdout } = await this.executeCommand('snyk', snykCommand);
      
      try {
        return JSON.parse(stdout) as SnykResults;
      } catch (parseError) {
        const parseErrorMessage = parseError instanceof Error ? parseError.message : String(parseError);
        throw new Error(`Failed to parse Snyk output: ${parseErrorMessage}`);
      }
    }
  }
  
  /**
   * Process MCP output stream
   * @param mcpProcess MCP process
   * @returns Snyk results
   */
  private processMCPOutput(mcpProcess: ChildProcess): Promise<SnykResults> {
    return new Promise<SnykResults>((resolve, reject) => {
      let responseData = '';
      
      mcpProcess.stdout?.on('data', (data: Buffer) => {
        responseData += data.toString();
        
        try {
          // Try to parse JSON response
          const lines = responseData.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            const response = JSON.parse(line) as MCPResponse;
            
            if (response.result) {
              // Kill MCP process after getting result
              mcpProcess.kill();
              resolve(response.result);
              return;
            } else if (response.error) {
              // Handle error response
              mcpProcess.kill();
              reject(new Error(response.error.message));
              return;
            }
          }
        } catch (error) {
          // Incomplete JSON, continue reading
        }
      });
      
      mcpProcess.stderr?.on('data', (data: Buffer) => {
        this.logger.error(`Snyk MCP stderr: ${data.toString()}`);
      });
      
      mcpProcess.on('close', (code: number | null) => {
        if (code !== 0) {
          reject(new Error(`Snyk MCP process exited with code ${code}`));
        }
      });
      
      mcpProcess.on('error', (error: Error) => {
        reject(error);
      });
      
      // Set timeout for MCP response
      setTimeout(() => {
        mcpProcess.kill();
        reject(new Error('Snyk MCP scan timed out after 120 seconds'));
      }, 120000); // 2 minutes timeout
    });
  }
  
  /**
   * Format Snyk results to standard format
   * @param results Snyk scan results
   * @returns Standardized analysis result
   */
  protected formatResult(results: SnykResults): AnalysisResult {
    const insights: Insight[] = [];
    const suggestions: Suggestion[] = [];
    const educational: EducationalContent[] = [];
    
    // Process vulnerabilities (SCA test)
    if (results.vulnerabilities) {
      for (const vuln of results.vulnerabilities) {
        // Add as insight
        insights.push({
          type: 'security',
          severity: this.mapSnykSeverity(vuln.severity),
          message: `${vuln.packageName}@${vuln.version} has ${vuln.severity} severity vulnerability: ${vuln.title}`,
          location: {
            file: vuln.from?.join(' > ') || 'package.json'
          }
        });
        
        // Add as suggestion
        suggestions.push({
          file: 'package.json',
          line: 1, // We don't have exact line info from Snyk
          suggestion: `Update ${vuln.packageName} to ${vuln.upgradePath?.[1] || 'latest version'} to fix ${vuln.title}`
        });
        
        // Add educational content
        educational.push({
          topic: vuln.title,
          explanation: vuln.description || `This vulnerability in ${vuln.packageName} can lead to ${vuln.title}. ${vuln.CVE ? `CVE: ${vuln.CVE}` : ''}`,
          resources: [
            {
              title: 'Snyk Vulnerability Database',
              url: vuln.url || 'https://snyk.io/vuln/',
              type: 'documentation' as 'documentation' | 'article' | 'video' | 'tutorial' | 'course' | 'book' | 'other'
            }
          ]
        });
      }
    }
    
    // Process code issues (Code test)
    if (results.runs?.[0]?.results) {
      for (const issue of results.runs[0].results) {
        const file = issue.locations?.[0]?.physicalLocation?.artifactLocation?.uri || '';
        const line = issue.locations?.[0]?.physicalLocation?.region?.startLine || 1;
        
        // Add as insight
        insights.push({
          type: 'security',
          severity: this.mapSnykSeverity(issue.properties?.priorityScore || 0),
          message: issue.message?.text || issue.shortDescription?.text || 'Security issue detected',
          location: {
            file,
            line
          }
        });
        
        // Add as suggestion
        suggestions.push({
          file,
          line,
          suggestion: issue.properties?.suggestions?.[0] || `Fix the security issue: ${issue.message?.text}`
        });
        
        // Add educational content
        educational.push({
          topic: issue.ruleId || 'Security Issue',
          explanation: issue.message?.text || issue.shortDescription?.text || 'Security issue detected',
          resources: [
            {
              title: 'Security Best Practices',
              url: issue.helpUri || 'https://snyk.io/learn/secure-coding-practices/',
              type: 'documentation' as 'documentation' | 'article' | 'video' | 'tutorial' | 'course' | 'book' | 'other'
            }
          ]
        });
      }
    }
    
    return {
      insights,
      suggestions,
      educational,
      metadata: {
        timestamp: new Date().toISOString(),
        scanType: this.scanType,
        snykVersion: results.snykVersion
      }
    };
  }
  
  /**
   * Map Snyk severity to standard severity
   * @param severity Snyk severity
   * @returns Standard severity
   */
  private mapSnykSeverity(severity: string | number): 'high' | 'medium' | 'low' {
    if (typeof severity === 'number') {
      // For priorityScore (0-100)
      if (severity >= 700) return 'high';
      if (severity >= 400) return 'medium';
      return 'low';
    }
    
    // For string severity
    switch (severity?.toLowerCase()) {
      case 'critical':
      case 'high':
        return 'high';
      case 'medium':
        return 'medium';
      case 'low':
      default:
        return 'low';
    }
  }
}