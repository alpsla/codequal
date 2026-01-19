"use strict";
/**
 * Real Data Environment Helper
 *
 * This utility helps set up and manage the real data environment for testing
 * with actual DeepWiki API and Redis cache. It provides a consistent way to
 * run tests against real services instead of mocks.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.realDataEnv = exports.RealDataEnvironment = void 0;
exports.withRealData = withRealData;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
class RealDataEnvironment {
    constructor(config) {
        this.envBackup = {};
        this.config = this.getDefaultConfig();
        if (config) {
            this.config = { ...this.config, ...config };
        }
    }
    /**
     * Get default configuration for real data testing
     */
    getDefaultConfig() {
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
    setUp() {
        console.log('🚀 Setting up real data environment...');
        // Backup current env vars
        this.backupEnvironment();
        // Set real data env vars
        process.env.USE_MOCK_ANALYZER = 'false';
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
    backupEnvironment() {
        const varsToBackup = [
            'USE_MOCK_ANALYZER',
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
    tearDown() {
        console.log('🔄 Restoring original environment...');
        Object.entries(this.envBackup).forEach(([key, value]) => {
            if (value === undefined) {
                delete process.env[key];
            }
            else {
                process.env[key] = value;
            }
        });
        console.log('✅ Environment restored');
    }
    /**
     * Ensure output directory exists
     */
    ensureOutputDirectory() {
        if (!fs.existsSync(this.config.output.dir)) {
            fs.mkdirSync(this.config.output.dir, { recursive: true });
        }
    }
    /**
     * Check if required services are running
     */
    checkServices() {
        const status = {
            deepwiki: false,
            redis: false,
            kubernetes: false
        };
        // Check Kubernetes/DeepWiki
        try {
            const kubectlOutput = (0, child_process_1.execSync)('kubectl get pods -n codequal-dev 2>/dev/null || echo "Not found"', { encoding: 'utf-8' });
            if (kubectlOutput && kubectlOutput.includes('Running')) {
                status.kubernetes = true;
                status.deepwiki = true;
            }
            else {
                this.setupPortForward();
            }
        }
        catch (error) {
            console.warn('⚠️ Kubernetes not accessible, assuming local DeepWiki');
        }
        // Check Redis
        if (this.config.redis.enabled) {
            try {
                (0, child_process_1.execSync)('redis-cli ping', { stdio: 'ignore' });
                status.redis = true;
                console.log('✅ Redis is running');
            }
            catch (error) {
                console.warn('⚠️ Redis not running - caching disabled');
            }
        }
        return status;
    }
    /**
     * Set up port forwarding for DeepWiki
     */
    setupPortForward() {
        try {
            // Kill any existing port forwards
            try {
                (0, child_process_1.execSync)('pkill -f "kubectl port-forward.*8001" 2>/dev/null', { stdio: 'ignore' });
            }
            catch (_a) {
                // Ignore errors from pkill
            }
            // Start new port forward in background
            (0, child_process_1.execSync)('kubectl port-forward -n codequal-dev svc/deepwiki-service 8001:8001 > /dev/null 2>&1 &', { stdio: 'ignore' });
            // Wait a moment for port forward to establish
            (0, child_process_1.execSync)('sleep 2');
            console.log('✅ Port forward established on localhost:8001');
        }
        catch (error) {
            console.error('❌ Failed to set up port forward:', error);
        }
    }
    /**
     * Run a test with real data
     */
    async runTest(testName, testFn) {
        console.log(`\\n🧪 Running test: ${testName}`);
        console.log('='.repeat(50));
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
        }
        catch (error) {
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
    saveTestResult(testName, result, duration) {
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
    saveErrorReport(testName, error, duration) {
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
    convertToHTML(markdown, metadata) {
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
    markdownToHTML(markdown) {
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
exports.RealDataEnvironment = RealDataEnvironment;
// Export singleton instance for easy use
exports.realDataEnv = new RealDataEnvironment();
// Helper function for quick real data tests
async function withRealData(testName, testFn) {
    const env = new RealDataEnvironment();
    env.setUp();
    try {
        return await env.runTest(testName, testFn);
    }
    finally {
        env.tearDown();
    }
}
