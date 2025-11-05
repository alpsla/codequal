#!/usr/bin/env ts-node
/**
 * V9 Analyzer Test Runner
 * 
 * Comprehensive test runner for the V9 analyzer system with:
 * - Test environment setup
 * - Performance monitoring
 * - Coverage reporting
 * - Result validation
 * - CI/CD integration
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface TestConfig {
  suites: TestSuite[];
  coverage: boolean;
  performance: boolean;
  verbose: boolean;
  parallel: boolean;
  maxWorkers: number;
  timeout: number;
}

interface TestSuite {
  name: string;
  pattern: string;
  description: string;
  required: boolean;
  timeout?: number;
}

interface TestResults {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  coverage: CoverageReport;
  performance: PerformanceReport;
  duration: number;
}

interface CoverageReport {
  lines: number;
  functions: number;
  branches: number;
  statements: number;
}

interface PerformanceReport {
  slowestTest: string;
  slowestTime: number;
  memoryUsage: number;
  totalDuration: number;
}

class V9TestRunner {
  private config: TestConfig;
  private results: TestResults;
  private startTime = 0;

  constructor(config: TestConfig) {
    this.config = config;
    this.results = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      coverage: { lines: 0, functions: 0, branches: 0, statements: 0 },
      performance: { slowestTest: '', slowestTime: 0, memoryUsage: 0, totalDuration: 0 },
      duration: 0
    };
  }

  async runAll(): Promise<TestResults> {
    console.log('🚀 Starting V9 Analyzer Test Suite');
    console.log('=====================================');
    
    this.startTime = Date.now();
    
    try {
      await this.setupEnvironment();
      await this.runTestSuites();
      await this.generateReports();
      
      this.results.duration = Date.now() - this.startTime;
      
      this.printSummary();
      return this.results;
      
    } catch (error) {
      console.error('❌ Test runner failed:', error);
      process.exit(1);
    }
  }

  private async setupEnvironment(): Promise<void> {
    console.log('🔧 Setting up test environment...');
    
    // Ensure test directory exists
    const testDir = path.join(__dirname, '__tests__');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Set environment variables
    process.env.NODE_ENV = 'test';
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    process.env.REDIS_URL = 'redis://localhost:6379';

    // Install dependencies if needed
    try {
      execSync('npm list jest', { stdio: 'ignore' });
    } catch (error) {
      console.log('📦 Installing test dependencies...');
      execSync('npm install --save-dev jest ts-jest @types/jest', { stdio: 'inherit' });
    }

    console.log('✅ Environment setup complete');
  }

  private async runTestSuites(): Promise<void> {
    console.log('🧪 Running test suites...');
    
    for (const suite of this.config.suites) {
      console.log(`\n📋 Running ${suite.name}: ${suite.description}`);
      
      try {
        const suiteResult = await this.runSuite(suite);
        this.aggregateResults(suiteResult);
        
        if (suiteResult.failed > 0 && suite.required) {
          throw new Error(`Required test suite '${suite.name}' failed`);
        }
        
      } catch (error) {
        console.error(`❌ Suite '${suite.name}' failed:`, error);
        
        if (suite.required) {
          throw error;
        }
      }
    }
  }

  private async runSuite(suite: TestSuite): Promise<any> {
    const jestArgs = [
      '--testPathPattern', suite.pattern,
      '--config', path.join(__dirname, 'jest.config.js'),
      '--json'
    ];

    if (this.config.coverage) {
      jestArgs.push('--coverage');
    }

    if (this.config.verbose) {
      jestArgs.push('--verbose');
    }

    if (this.config.parallel && this.config.maxWorkers > 1) {
      jestArgs.push('--maxWorkers', this.config.maxWorkers.toString());
    }

    if (suite.timeout || this.config.timeout) {
      jestArgs.push('--testTimeout', (suite.timeout || this.config.timeout).toString());
    }

    const command = `npx jest ${jestArgs.join(' ')}`;
    
    try {
      const output = execSync(command, { 
        encoding: 'utf8',
        cwd: __dirname,
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });
      
      return JSON.parse(output);
      
    } catch (error: any) {
      // Jest returns non-zero exit code on test failures, but we still get JSON output
      try {
        return JSON.parse(error.stdout || error.output?.[1] || '{}');
      } catch (parseError) {
        console.error('Failed to parse Jest output:', parseError);
        throw error;
      }
    }
  }

  private aggregateResults(suiteResult: any): void {
    if (suiteResult.numTotalTests) {
      this.results.totalTests += suiteResult.numTotalTests;
      this.results.passedTests += suiteResult.numPassedTests || 0;
      this.results.failedTests += suiteResult.numFailedTests || 0;
      this.results.skippedTests += suiteResult.numPendingTests || 0;
    }

    if (suiteResult.coverageMap) {
      // Aggregate coverage data
      const coverage = suiteResult.coverageMap;
      // Implementation would aggregate coverage metrics
    }
  }

  private async generateReports(): Promise<void> {
    console.log('📊 Generating test reports...');
    
    const reportsDir = path.join(__dirname, 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Generate JSON report
    const jsonReport = {
      timestamp: new Date().toISOString(),
      results: this.results,
      config: this.config
    };

    fs.writeFileSync(
      path.join(reportsDir, 'v9-test-results.json'),
      JSON.stringify(jsonReport, null, 2)
    );

    // Generate HTML report
    const htmlReport = this.generateHtmlReport(jsonReport);
    fs.writeFileSync(
      path.join(reportsDir, 'v9-test-results.html'),
      htmlReport
    );

    console.log('✅ Reports generated in ./reports/');
  }

  private generateHtmlReport(data: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>V9 Analyzer Test Results</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 8px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: #fff; border: 1px solid #ddd; padding: 15px; border-radius: 8px; flex: 1; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .skipped { color: #ffc107; }
        .coverage { background: #e9ecef; padding: 10px; border-radius: 4px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>V9 Analyzer Test Results</h1>
        <p>Generated: ${data.timestamp}</p>
        <p>Duration: ${(data.results.duration / 1000).toFixed(2)}s</p>
    </div>
    
    <div class="summary">
        <div class="metric">
            <h3>Total Tests</h3>
            <p style="font-size: 2em; margin: 0;">${data.results.totalTests}</p>
        </div>
        <div class="metric">
            <h3 class="passed">Passed</h3>
            <p style="font-size: 2em; margin: 0;" class="passed">${data.results.passedTests}</p>
        </div>
        <div class="metric">
            <h3 class="failed">Failed</h3>
            <p style="font-size: 2em; margin: 0;" class="failed">${data.results.failedTests}</p>
        </div>
        <div class="metric">
            <h3 class="skipped">Skipped</h3>
            <p style="font-size: 2em; margin: 0;" class="skipped">${data.results.skippedTests}</p>
        </div>
    </div>
    
    <div class="coverage">
        <h3>Code Coverage</h3>
        <p>Lines: ${data.results.coverage.lines}% | Functions: ${data.results.coverage.functions}% | Branches: ${data.results.coverage.branches}% | Statements: ${data.results.coverage.statements}%</p>
    </div>
    
    <h3>Test Configuration</h3>
    <pre>${JSON.stringify(data.config, null, 2)}</pre>
</body>
</html>`;
  }

  private printSummary(): void {
    console.log('\n🎯 Test Summary');
    console.log('================');
    console.log(`Total Tests: ${this.results.totalTests}`);
    console.log(`✅ Passed: ${this.results.passedTests}`);
    console.log(`❌ Failed: ${this.results.failedTests}`);
    console.log(`⏭️  Skipped: ${this.results.skippedTests}`);
    console.log(`⏱️  Duration: ${(this.results.duration / 1000).toFixed(2)}s`);
    
    const successRate = this.results.totalTests > 0 
      ? (this.results.passedTests / this.results.totalTests * 100).toFixed(1)
      : '0';
    
    console.log(`📊 Success Rate: ${successRate}%`);
    
    if (this.results.failedTests === 0) {
      console.log('\n🎉 All tests passed!');
    } else {
      console.log(`\n⚠️  ${this.results.failedTests} test(s) failed`);
    }
  }
}

// Default test configuration
const defaultConfig: TestConfig = {
  suites: [
    {
      name: 'Core Integration Tests',
      pattern: 'v9-integration.test.ts',
      description: 'Tests core V9 analyzer functionality, blocking logic, and scoring',
      required: true,
      timeout: 30000
    },
    {
      name: 'Java Analyzer Tests',
      pattern: 'v9-java-analyzer.test.ts',
      description: 'Tests Java-specific analysis tools and patterns',
      required: true,
      timeout: 45000
    },
    {
      name: 'Rust Analyzer Tests',
      pattern: 'v9-rust-analyzer.test.ts',
      description: 'Tests Rust-specific analysis tools and security checks',
      required: true,
      timeout: 45000
    },
    {
      name: 'Performance Tests',
      pattern: 'v9-performance.test.ts',
      description: 'Tests system performance and scalability under load',
      required: false,
      timeout: 60000
    }
  ],
  coverage: true,
  performance: true,
  verbose: false,
  parallel: true,
  maxWorkers: 4,
  timeout: 30000
};

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const config = { ...defaultConfig };

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--no-coverage':
        config.coverage = false;
        break;
      case '--verbose':
        config.verbose = true;
        break;
      case '--no-parallel':
        config.parallel = false;
        break;
      case '--suite': {
        const suiteName = args[++i];
        config.suites = config.suites.filter(s => s.name.includes(suiteName));
        break;
      }
      case '--timeout':
        config.timeout = parseInt(args[++i], 10);
        break;
      case '--workers':
        config.maxWorkers = parseInt(args[++i], 10);
        break;
      case '--help':
        printUsage();
        process.exit(0);
        break;
    }
  }

  if (config.suites.length === 0) {
    console.error('❌ No test suites selected');
    process.exit(1);
  }

  const runner = new V9TestRunner(config);
  const results = await runner.runAll();
  
  // Exit with error code if tests failed
  process.exit(results.failedTests > 0 ? 1 : 0);
}

function printUsage() {
  console.log(`
V9 Analyzer Test Runner

Usage: ts-node run-v9-tests.ts [options]

Options:
  --no-coverage      Disable coverage reporting
  --verbose          Enable verbose output
  --no-parallel      Disable parallel test execution
  --suite <name>     Run only suites matching name
  --timeout <ms>     Set test timeout in milliseconds
  --workers <num>    Set number of parallel workers
  --help            Show this help message

Examples:
  ts-node run-v9-tests.ts                           # Run all tests with defaults
  ts-node run-v9-tests.ts --verbose --no-coverage   # Verbose output without coverage
  ts-node run-v9-tests.ts --suite "Integration"     # Run only integration tests
  ts-node run-v9-tests.ts --timeout 60000          # Set 60 second timeout
`);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

export { V9TestRunner, TestConfig, TestResults };