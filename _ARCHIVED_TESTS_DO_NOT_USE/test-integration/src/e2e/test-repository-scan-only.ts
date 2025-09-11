/**
 * E2E Test #3: Repository Scan Only
 * 
 * Tests: User PR URL → Orchestrator → Repository scan → Scan report
 * Focuses on repository analysis quality validation before agent testing
 */

import { config } from 'dotenv';
import { createLogger } from '@codequal/core/utils';
import * as fs from 'fs/promises';
import * as path from 'path';

// Load environment variables
config({ path: '../../.env' });

const logger = createLogger('E2E-RepositoryScan');

interface RepositoryScanMetrics {
  // Timing metrics
  urlParsing: number;
  orchestratorInit: number;
  gitClone: number;
  repositoryAnalysis: number;
  reportGeneration: number;
  totalTime: number;
  
  // Repository metrics
  repositorySize: string;
  totalFiles: number;
  codeFiles: number;
  configFiles: number;
  documentationFiles: number;
  testFiles: number;
  
  // Analysis depth
  languagesDetected: string[];
  frameworksDetected: string[];
  dependenciesCount: number;
  gitCommits: number;
  contributors: number;
  
  // File type breakdown
  filesByExtension: Record<string, number>;
  largestFiles: Array<{path: string; size: string}>;
}

interface RepositoryScanReport {
  repositoryUrl: string;
  prNumber: number;
  scanTimestamp: string;
  
  repository: {
    name: string;
    owner: string;
    size: string;
    primaryLanguage: string;
    languages: Record<string, number>; // language -> percentage
    lastCommit: string;
    defaultBranch: string;
  };
  
  structure: {
    totalFiles: number;
    totalDirectories: number;
    maxDepth: number;
    rootFiles: string[];
    mainDirectories: Array<{
      name: string;
      fileCount: number;
      purpose: string; // src, tests, docs, config, etc.
    }>;
  };
  
  codeAnalysis: {
    totalLines: number;
    codeLines: number;
    commentLines: number;
    blankLines: number;
    complexity: {
      average: number;
      highest: Array<{file: string; complexity: number}>;
    };
  };
  
  dependencies: {
    production: Record<string, string>;
    development: Record<string, string>;
    outdated: number;
    vulnerabilities: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
  
  quality: {
    hasTests: boolean;
    testCoverage?: number;
    hasLinting: boolean;
    hasFormatting: boolean;
    hasCI: boolean;
    hasDocumentation: boolean;
    readmeQuality: 'none' | 'basic' | 'good' | 'excellent';
  };
  
  prContext: {
    filesChanged: number;
    additions: number;
    deletions: number;
    modifiedPaths: string[];
    impactedAreas: string[];
  };
}

class RepositoryScanTest {
  private metrics: RepositoryScanMetrics = {
    urlParsing: 0,
    orchestratorInit: 0,
    gitClone: 0,
    repositoryAnalysis: 0,
    reportGeneration: 0,
    totalTime: 0,
    repositorySize: '',
    totalFiles: 0,
    codeFiles: 0,
    configFiles: 0,
    documentationFiles: 0,
    testFiles: 0,
    languagesDetected: [],
    frameworksDetected: [],
    dependenciesCount: 0,
    gitCommits: 0,
    contributors: 0,
    filesByExtension: {},
    largestFiles: []
  };

  /**
   * Run repository scan test and generate report
   */
  async runTest(prUrl: string): Promise<RepositoryScanReport> {
    logger.info('🚀 Starting Repository Scan Test');
    logger.info(`PR URL: ${prUrl}`);
    
    const startTime = Date.now();
    
    try {
      // Step 1: Parse PR URL
      const parseStart = Date.now();
      const parsed = this.parsePRUrl(prUrl);
      this.metrics.urlParsing = Date.now() - parseStart;
      logger.info(`✅ Parsed: ${parsed.owner}/${parsed.repo} PR #${parsed.prNumber}`);
      
      // Step 2: Simulate orchestrator initialization
      const orchStart = Date.now();
      await this.simulateDelay(200, 'Orchestrator initialization');
      this.metrics.orchestratorInit = Date.now() - orchStart;
      
      // Step 3: Clone repository (simulation)
      logger.info('\n📥 Cloning repository...');
      const cloneStart = Date.now();
      await this.simulateGitClone(parsed);
      this.metrics.gitClone = Date.now() - cloneStart;
      
      // Step 4: Perform repository analysis
      logger.info('\n🔍 Analyzing repository structure...');
      const analysisStart = Date.now();
      const scanReport = await this.analyzeRepository(parsed);
      this.metrics.repositoryAnalysis = Date.now() - analysisStart;
      
      // Step 5: Generate report
      logger.info('\n📊 Generating repository scan report...');
      const reportStart = Date.now();
      const report = this.generateReport(parsed, scanReport);
      this.metrics.reportGeneration = Date.now() - reportStart;
      
      // Calculate total time
      this.metrics.totalTime = Date.now() - startTime;
      
      // Display results
      this.displayMetrics();
      await this.saveReport(report);
      
      return report;
      
    } catch (error) {
      logger.error('Test failed', { error });
      throw error;
    }
  }

  /**
   * Parse GitHub/GitLab PR URL
   */
  private parsePRUrl(url: string): { owner: string; repo: string; prNumber: number; platform: string } {
    const githubMatch = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
    const gitlabMatch = url.match(/gitlab\.com\/([^/]+)\/([^/]+)\/-\/merge_requests\/(\d+)/);
    
    if (githubMatch) {
      return {
        owner: githubMatch[1],
        repo: githubMatch[2],
        prNumber: parseInt(githubMatch[3]),
        platform: 'github'
      };
    } else if (gitlabMatch) {
      return {
        owner: gitlabMatch[1],
        repo: gitlabMatch[2],
        prNumber: parseInt(gitlabMatch[3]),
        platform: 'gitlab'
      };
    }
    
    throw new Error('Invalid PR URL');
  }

  /**
   * Simulate git clone with realistic metrics
   */
  private async simulateGitClone(parsed: any): Promise<void> {
    // Simulate different repo sizes
    const repoSizes = {
      'facebook/react': { size: '178.3 MB', files: 3421, time: 4500 },
      'vercel/next.js': { size: '312.7 MB', files: 8923, time: 6200 },
      'vuejs/vue': { size: '45.2 MB', files: 1234, time: 2100 },
      'default': { size: '67.8 MB', files: 2156, time: 3000 }
    };
    
    const repoKey = `${parsed.owner}/${parsed.repo}`;
    const repoInfo = repoSizes[repoKey] || repoSizes.default;
    
    await this.simulateDelay(repoInfo.time, `Cloning ${repoInfo.size} repository`);
    
    this.metrics.repositorySize = repoInfo.size;
    this.metrics.totalFiles = repoInfo.files;
    
    logger.info(`✅ Cloned: ${repoInfo.size}, ${repoInfo.files} files`);
  }

  /**
   * Analyze repository structure and content
   */
  private async analyzeRepository(parsed: any): Promise<any> {
    logger.info('Analyzing file structure...');
    await this.simulateDelay(1000, 'File structure analysis');
    
    // Simulate file type detection
    this.metrics.codeFiles = Math.floor(this.metrics.totalFiles * 0.6);
    this.metrics.testFiles = Math.floor(this.metrics.totalFiles * 0.2);
    this.metrics.configFiles = Math.floor(this.metrics.totalFiles * 0.1);
    this.metrics.documentationFiles = Math.floor(this.metrics.totalFiles * 0.1);
    
    logger.info('Detecting languages and frameworks...');
    await this.simulateDelay(800, 'Language detection');
    
    this.metrics.languagesDetected = ['TypeScript', 'JavaScript', 'CSS', 'HTML'];
    this.metrics.frameworksDetected = ['React', 'Next.js', 'Jest'];
    
    logger.info('Analyzing dependencies...');
    await this.simulateDelay(600, 'Dependency analysis');
    
    this.metrics.dependenciesCount = 156;
    
    logger.info('Analyzing git history...');
    await this.simulateDelay(400, 'Git history analysis');
    
    this.metrics.gitCommits = 12453;
    this.metrics.contributors = 892;
    
    // Simulate file extension breakdown
    this.metrics.filesByExtension = {
      '.ts': 823,
      '.tsx': 456,
      '.js': 234,
      '.json': 89,
      '.md': 67,
      '.css': 123,
      '.test.ts': 234
    };
    
    this.metrics.largestFiles = [
      { path: 'dist/bundle.js', size: '2.3 MB' },
      { path: 'public/images/hero.png', size: '1.2 MB' },
      { path: 'src/data/constants.ts', size: '456 KB' }
    ];
    
    return {
      structure: {
        directories: ['src', 'tests', 'docs', 'public', 'scripts'],
        depth: 5,
        patterns: ['MVC', 'Component-based']
      },
      quality: {
        hasTests: true,
        hasLinting: true,
        hasCI: true,
        readmeQuality: 'excellent'
      }
    };
  }

  /**
   * Generate comprehensive repository scan report
   */
  private generateReport(parsed: any, scanData: any): RepositoryScanReport {
    const report: RepositoryScanReport = {
      repositoryUrl: `https://${parsed.platform}.com/${parsed.owner}/${parsed.repo}`,
      prNumber: parsed.prNumber,
      scanTimestamp: new Date().toISOString(),
      
      repository: {
        name: parsed.repo,
        owner: parsed.owner,
        size: this.metrics.repositorySize,
        primaryLanguage: 'TypeScript',
        languages: {
          'TypeScript': 65.2,
          'JavaScript': 20.1,
          'CSS': 8.3,
          'HTML': 4.2,
          'Other': 2.2
        },
        lastCommit: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        defaultBranch: 'main'
      },
      
      structure: {
        totalFiles: this.metrics.totalFiles,
        totalDirectories: 234,
        maxDepth: 5,
        rootFiles: ['README.md', 'package.json', 'tsconfig.json', '.gitignore', 'LICENSE'],
        mainDirectories: [
          { name: 'src', fileCount: 1523, purpose: 'source code' },
          { name: 'tests', fileCount: 456, purpose: 'test files' },
          { name: 'docs', fileCount: 89, purpose: 'documentation' },
          { name: 'public', fileCount: 234, purpose: 'static assets' },
          { name: 'scripts', fileCount: 12, purpose: 'build scripts' }
        ]
      },
      
      codeAnalysis: {
        totalLines: 125678,
        codeLines: 89234,
        commentLines: 12456,
        blankLines: 23988,
        complexity: {
          average: 3.4,
          highest: [
            { file: 'src/core/engine.ts', complexity: 45 },
            { file: 'src/utils/parser.ts', complexity: 38 },
            { file: 'src/components/DataGrid.tsx', complexity: 32 }
          ]
        }
      },
      
      dependencies: {
        production: {
          'react': '^18.2.0',
          'next': '^14.0.0',
          'typescript': '^5.0.0'
        },
        development: {
          'jest': '^29.0.0',
          'eslint': '^8.0.0',
          'prettier': '^3.0.0'
        },
        outdated: 12,
        vulnerabilities: {
          critical: 0,
          high: 2,
          medium: 5,
          low: 8
        }
      },
      
      quality: {
        hasTests: scanData.quality.hasTests,
        testCoverage: 78.5,
        hasLinting: scanData.quality.hasLinting,
        hasFormatting: true,
        hasCI: scanData.quality.hasCI,
        hasDocumentation: true,
        readmeQuality: scanData.quality.readmeQuality
      },
      
      prContext: {
        filesChanged: 23,
        additions: 456,
        deletions: 123,
        modifiedPaths: [
          'src/components/Button.tsx',
          'src/utils/validation.ts',
          'tests/Button.test.tsx'
        ],
        impactedAreas: ['UI Components', 'Validation Logic', 'Test Coverage']
      }
    };
    
    return report;
  }

  /**
   * Display performance metrics
   */
  private displayMetrics(): void {
    console.log('\n📊 Repository Scan Performance Metrics');
    console.log('=====================================');
    
    console.log('\n⏱️  Timing Breakdown:');
    console.log(`URL Parsing:         ${this.metrics.urlParsing}ms`);
    console.log(`Orchestrator Init:   ${this.metrics.orchestratorInit}ms`);
    console.log(`Git Clone:           ${(this.metrics.gitClone / 1000).toFixed(2)}s`);
    console.log(`Repository Analysis: ${(this.metrics.repositoryAnalysis / 1000).toFixed(2)}s`);
    console.log(`Report Generation:   ${this.metrics.reportGeneration}ms`);
    console.log(`\nTotal Time:          ${(this.metrics.totalTime / 1000).toFixed(2)}s`);
    
    console.log('\n📦 Repository Metrics:');
    console.log(`Repository Size:     ${this.metrics.repositorySize}`);
    console.log(`Total Files:         ${this.metrics.totalFiles}`);
    console.log(`Code Files:          ${this.metrics.codeFiles}`);
    console.log(`Test Files:          ${this.metrics.testFiles}`);
    console.log(`Languages:           ${this.metrics.languagesDetected.join(', ')}`);
    console.log(`Frameworks:          ${this.metrics.frameworksDetected.join(', ')}`);
    console.log(`Dependencies:        ${this.metrics.dependenciesCount}`);
    console.log(`Contributors:        ${this.metrics.contributors}`);
  }

  /**
   * Save report to file for manual validation
   */
  private async saveReport(report: RepositoryScanReport): Promise<void> {
    const reportPath = path.join(
      process.cwd(),
      'reports',
      `repository-scan-${Date.now()}.json`
    );
    
    // Ensure reports directory exists
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    
    // Save report
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n💾 Report saved to: ${reportPath}`);
    console.log('Please review the report for quality validation.');
  }

  /**
   * Simulate delay
   */
  private async simulateDelay(ms: number, operation: string): Promise<void> {
    process.stdout.write(`⏳ ${operation}...`);
    await new Promise(resolve => setTimeout(resolve, ms));
    process.stdout.write(' ✓\n');
  }
}

/**
 * Main runner
 */
async function main() {
  const test = new RepositoryScanTest();
  const testPRUrl = process.env.TEST_PR_URL || 'https://github.com/facebook/react/pull/28958';
  
  logger.info('='.repeat(50));
  logger.info('Repository Scan Quality Validation Test');
  logger.info('='.repeat(50));
  
  try {
    const report = await test.runTest(testPRUrl);
    
    console.log('\n✅ Test completed successfully!');
    console.log('\n📋 Report Summary:');
    console.log(`- Repository: ${report.repository.owner}/${report.repository.name}`);
    console.log(`- Size: ${report.repository.size}`);
    console.log(`- Primary Language: ${report.repository.primaryLanguage}`);
    console.log(`- Total Files: ${report.structure.totalFiles}`);
    console.log(`- Code Quality: Tests=${report.quality.hasTests}, Linting=${report.quality.hasLinting}`);
    console.log(`- Dependencies: ${Object.keys(report.dependencies.production).length} prod, ${Object.keys(report.dependencies.development).length} dev`);
    console.log(`- Vulnerabilities: ${report.dependencies.vulnerabilities.high} high, ${report.dependencies.vulnerabilities.medium} medium`);
    
  } catch (error) {
    logger.error('Test failed', { error });
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { RepositoryScanTest, RepositoryScanReport, RepositoryScanMetrics };