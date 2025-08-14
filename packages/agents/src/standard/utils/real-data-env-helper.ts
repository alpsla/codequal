/**
 * Real Data Environment Helper
 * 
 * This utility helps set up and manage the real data environment for testing
 * with actual DeepWiki API and Redis cache. It provides a consistent way to
 * run tests against real services instead of mocks.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export interface RealDataConfig {
  deepwiki: {
    apiUrl: string;
    apiKey: string;
    timeout?: number;
    useMock: boolean;
  };
  redis: {
    url: string;
    enabled: boolean;
  };
  supabase?: {
    url: string;
    serviceRoleKey: string;
  };
  output: {
    dir: string;
    formats: ('markdown' | 'json' | 'html')[];
  };
}

export class RealDataEnvironment {
  private config: RealDataConfig;
  private envBackup: Record<string, string | undefined> = {};
  
  constructor(config?: Partial<RealDataConfig>) {
    this.config = this.getDefaultConfig();
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }
  
  /**
   * Get default configuration for real data testing
   */
  private getDefaultConfig(): RealDataConfig {
    return {
      deepwiki: {
        apiUrl: process.env.DEEPWIKI_API_URL || 'http://localhost:8001',
        apiKey: process.env.DEEPWIKI_API_KEY || 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f',
        timeout: 120000,
        useMock: false
      },
      redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        enabled: true
      },
      supabase: process.env.SUPABASE_URL ? {
        url: process.env.SUPABASE_URL,
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
      } : undefined,
      output: {
        dir: './test-outputs/real-data',
        formats: ['markdown', 'json', 'html']
      }
    };
  }
  
  /**
   * Set up environment for real data testing
   */
  setUp(): void {
    console.log('🚀 Setting up real data environment...');
    
    // Backup current env vars
    this.backupEnvironment();
    
    // Set real data env vars
    process.env.USE_DEEPWIKI_MOCK = 'false';
    process.env.DEEPWIKI_API_URL = this.config.deepwiki.apiUrl;
    process.env.DEEPWIKI_API_KEY = this.config.deepwiki.apiKey;
    
    if (this.config.redis.enabled) {
      process.env.REDIS_URL = this.config.redis.url;
    }
    
    if (this.config.supabase) {
      process.env.SUPABASE_URL = this.config.supabase.url;
      process.env.SUPABASE_SERVICE_ROLE_KEY = this.config.supabase.serviceRoleKey;
    }
    
    // Ensure output directory exists
    this.ensureOutputDirectory();
    
    // Check services
    this.checkServices();
    
    console.log('✅ Real data environment ready');
  }
  
  /**
   * Backup current environment variables
   */
  private backupEnvironment(): void {
    const varsToBackup = [
      'USE_DEEPWIKI_MOCK',
      'DEEPWIKI_API_URL',
      'DEEPWIKI_API_KEY',
      'REDIS_URL',
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];
    
    varsToBackup.forEach(varName => {
      this.envBackup[varName] = process.env[varName];
    });
  }
  
  /**
   * Restore original environment variables
   */
  tearDown(): void {
    console.log('🔄 Restoring original environment...');
    
    Object.entries(this.envBackup).forEach(([key, value]) => {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
    
    console.log('✅ Environment restored');
  }
  
  /**
   * Ensure output directory exists
   */
  private ensureOutputDirectory(): void {
    if (!fs.existsSync(this.config.output.dir)) {
      fs.mkdirSync(this.config.output.dir, { recursive: true });
    }
  }
  
  /**
   * Check if required services are running
   */
  checkServices(): { deepwiki: boolean; redis: boolean; kubernetes: boolean } {
    const status = {
      deepwiki: false,
      redis: false,
      kubernetes: false
    };
    
    // Check Kubernetes/DeepWiki
    try {
      const kubectlOutput = execSync(
        'kubectl get pods -n codequal-dev -l app=deepwiki --no-headers 2>/dev/null',
        { encoding: 'utf-8' }
      );
      
      if (kubectlOutput && kubectlOutput.includes('Running')) {
        status.kubernetes = true;
        status.deepwiki = true;
        console.log('✅ DeepWiki pod is running');
      } else {
        console.warn('⚠️ DeepWiki pod not running - using port forward instead');
        this.setupPortForward();
      }
    } catch (error) {
      console.warn('⚠️ Kubernetes not accessible, assuming local DeepWiki');
    }
    
    // Check Redis
    if (this.config.redis.enabled) {
      try {
        execSync('redis-cli ping', { stdio: 'ignore' });
        status.redis = true;
        console.log('✅ Redis is running');
      } catch (error) {
        console.warn('⚠️ Redis not running - caching disabled');
      }
    }
    
    return status;
  }
  
  /**
   * Set up port forwarding for DeepWiki
   */
  private setupPortForward(): void {
    try {
      console.log('Setting up port forward to DeepWiki pod...');
      
      // Kill any existing port forwards
      try {
        execSync('pkill -f "kubectl port-forward.*8001" 2>/dev/null', { stdio: 'ignore' });
      } catch {
        // Ignore errors from pkill
      }
      
      // Start new port forward in background
      execSync(
        'kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8000 > /dev/null 2>&1 &',
        { stdio: 'ignore' }
      );
      
      // Wait a moment for port forward to establish
      execSync('sleep 2');
      
      console.log('✅ Port forward established on localhost:8001');
    } catch (error) {
      console.error('❌ Failed to set up port forward:', error);
    }
  }
  
  /**
   * Run a test with real data
   */
  async runTest(
    testName: string,
    testFn: () => Promise<any>
  ): Promise<any> {
    console.log(`\\n🧪 Running test: ${testName}`);
    console.log('=' .repeat(50));
    
    const startTime = Date.now();
    
    try {
      const result = await testFn();
      
      const duration = Date.now() - startTime;
      console.log(`✅ Test completed in ${duration}ms`);
      
      // Save result if configured
      if (this.config.output.formats.length > 0) {
        this.saveTestResult(testName, result, duration);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Test failed after ${duration}ms:`, error);
      
      // Save error report
      this.saveErrorReport(testName, error, duration);
      
      throw error;
    }
  }
  
  /**
   * Save test result in configured formats
   */
  private saveTestResult(testName: string, result: any, duration: number): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseFileName = `${testName}-${timestamp}`;
    
    if (this.config.output.formats.includes('json')) {
      const jsonPath = path.join(this.config.output.dir, `${baseFileName}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify({
        testName,
        timestamp: new Date().toISOString(),
        duration,
        result
      }, null, 2));
      console.log(`📄 JSON saved: ${jsonPath}`);
    }
    
    if (this.config.output.formats.includes('markdown') && result.report) {
      const mdPath = path.join(this.config.output.dir, `${baseFileName}.md`);
      fs.writeFileSync(mdPath, result.report);
      console.log(`📄 Markdown saved: ${mdPath}`);
    }
    
    if (this.config.output.formats.includes('html') && result.report) {
      const htmlPath = path.join(this.config.output.dir, `${baseFileName}.html`);
      const htmlContent = this.convertToHTML(result.report, {
        testName,
        timestamp: new Date().toISOString(),
        duration
      });
      fs.writeFileSync(htmlPath, htmlContent);
      console.log(`📄 HTML saved: ${htmlPath}`);
    }
  }
  
  /**
   * Save error report
   */
  private saveErrorReport(testName: string, error: any, duration: number): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const errorPath = path.join(this.config.output.dir, `${testName}-error-${timestamp}.txt`);
    
    const errorContent = `
Test: ${testName}
Timestamp: ${new Date().toISOString()}
Duration: ${duration}ms

Error:
${error.stack || error.message || error}

Environment:
${JSON.stringify(this.config, null, 2)}
    `;
    
    fs.writeFileSync(errorPath, errorContent);
    console.log(`📄 Error report saved: ${errorPath}`);
  }
  
  /**
   * Convert markdown to HTML
   */
  private convertToHTML(markdown: string, metadata: any): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${metadata.testName} - Test Report</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.6;
    }
    pre { 
      background: #f4f4f4;
      padding: 10px;
      border-radius: 5px;
      overflow-x: auto;
    }
    code {
      background: #f4f4f4;
      padding: 2px 5px;
      border-radius: 3px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    th {
      background: #f4f4f4;
    }
    .metadata {
      background: #e8f4f8;
      padding: 10px;
      border-radius: 5px;
      margin-bottom: 20px;
    }
    h1 { color: #333; }
    h2 { color: #555; border-bottom: 2px solid #e0e0e0; padding-bottom: 5px; }
    h3 { color: #666; }
    .critical { color: #d32f2f; font-weight: bold; }
    .high { color: #f57c00; font-weight: bold; }
    .medium { color: #fbc02d; }
    .low { color: #388e3c; }
  </style>
</head>
<body>
  <div class="metadata">
    <strong>Test:</strong> ${metadata.testName}<br>
    <strong>Generated:</strong> ${metadata.timestamp}<br>
    <strong>Duration:</strong> ${metadata.duration}ms
  </div>
  ${this.markdownToHTML(markdown)}
</body>
</html>`;
  }
  
  /**
   * Simple markdown to HTML converter
   */
  private markdownToHTML(markdown: string): string {
    return markdown
      .replace(/^### (.*)/gm, '<h3>$1</h3>')
      .replace(/^## (.*)/gm, '<h2>$1</h2>')
      .replace(/^# (.*)/gm, '<h1>$1</h1>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/```([^`]*)```/g, '<pre><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/^- (.*)/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\s*)+/g, '<ul>$&</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');
  }
}

// Export singleton instance for easy use
export const realDataEnv = new RealDataEnvironment();

// Helper function for quick real data tests
export async function withRealData<T>(
  testName: string,
  testFn: () => Promise<T>
): Promise<T> {
  const env = new RealDataEnvironment();
  env.setUp();
  
  try {
    return await env.runTest(testName, testFn);
  } finally {
    env.tearDown();
  }
}