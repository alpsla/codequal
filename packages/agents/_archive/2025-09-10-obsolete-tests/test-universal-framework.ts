#!/usr/bin/env npx ts-node

/**
 * Universal Test Framework for All Languages
 * Demonstrates the fixed architecture working for all supported languages
 * 
 * Key Features:
 * 1. Real tool output parsing (not mock data)
 * 2. Smart file selection (not random 100 files)
 * 3. Proper scoring algorithm
 * 4. Complete report sections for all languages
 */

import { SmartFileSelector } from './src/two-branch/utils/smart-file-selector';
import {
  RustToolParser,
  PythonToolParser,
  TypeScriptToolParser,
  GoToolParser,
  JavaToolParser
} from './src/two-branch/parsers';
import {
  AnalysisDepth,
  AnalysisDepthManager,
  ParallelExecutor,
  createStandardAnalysis
} from './src/two-branch/core/analysis-depth-manager';

interface LanguageAnalysisResult {
  language: string;
  filesAnalyzed: number;
  issuesFound: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  toolsRun: string[];
  score: number;
  executionTime: number;
}

class UniversalAnalysisFramework {
  private fileSelector: SmartFileSelector;
  private rustParser: RustToolParser;
  private pythonParser: PythonToolParser;
  private tsParser: TypeScriptToolParser;
  private goParser: GoToolParser;
  private javaParser: JavaToolParser;

  constructor() {
    this.fileSelector = new SmartFileSelector();
    this.rustParser = new RustToolParser();
    this.pythonParser = new PythonToolParser();
    this.tsParser = new TypeScriptToolParser();
    this.goParser = new GoToolParser();
    this.javaParser = new JavaToolParser();
  }

  /**
   * Analyze repository for a specific language with configurable depth
   */
  async analyzeLanguage(
    repoPath: string,
    language: string,
    prNumber?: number,
    depth: AnalysisDepth = AnalysisDepth.STANDARD
  ): Promise<LanguageAnalysisResult> {
    const startTime = Date.now();
    const config = AnalysisDepthManager.getConfig(depth);
    
    console.log(`\n🔍 Analyzing ${language} code...`);
    console.log(`📊 Analysis Depth: ${AnalysisDepthManager.getDescription(depth)}`);
    
    // Estimate time
    const timeEstimate = AnalysisDepthManager.estimateTime(
      config.maxFiles || 500,
      [language],
      depth
    );
    console.log(`⏱️ Estimated time: ${timeEstimate.likely}s (${Math.ceil(timeEstimate.likely / 60)} minutes)`);

    // Step 1: Smart file selection with depth-based limit
    const selectedFiles = await this.fileSelector.selectFiles({
      repository: repoPath,
      prNumber,
      language,
      maxFiles: config.maxFiles || 500
    });

    console.log(`📁 Selected ${selectedFiles.totalFiles} files for analysis:`);
    console.log(`  - PR Changed: ${selectedFiles.prChanged.length}`);
    console.log(`  - Critical: ${selectedFiles.critical.length}`);
    console.log(`  - Entry Points: ${selectedFiles.entryPoints.length}`);
    console.log(`  - Config: ${selectedFiles.config.length}`);
    console.log(`  - Tests: ${config.priorities.skipTests ? 0 : selectedFiles.tests.length}`);

    // Step 2: Run language-specific tools and parse real output
    const analysisResults = await this.runLanguageTools(
      repoPath,
      language,
      selectedFiles.allFiles,
      config
    );

    // Step 3: Calculate proper score (not broken 100/100)
    const score = this.calculateScore(analysisResults.issues);

    const executionTime = (Date.now() - startTime) / 1000;

    return {
      language,
      filesAnalyzed: selectedFiles.totalFiles,
      issuesFound: analysisResults.issues,
      toolsRun: analysisResults.toolsRun,
      score,
      executionTime
    };
  }

  /**
   * Run language-specific tools with parallel execution
   */
  private async runLanguageTools(
    repoPath: string,
    language: string,
    files: string[],
    config?: any
  ): Promise<{ issues: any; toolsRun: string[] }> {
    const toolsRun: string[] = [];
    const allIssues: any[] = [];

    // Define tools for parallel execution
    const toolExecutions = this.getToolExecutions(language, repoPath, files);
    
    if (config?.parallelization?.enabled && toolExecutions.length > 1) {
      console.log(`  🚀 Running ${toolExecutions.length} tools in parallel...`);
      
      // Execute tools in parallel
      const results = await Promise.allSettled(
        toolExecutions.map(tool => {
          console.log(`  Starting: ${tool.name}`);
          return tool.execute().then(result => {
            console.log(`  ✅ Completed: ${tool.name}`);
            return { name: tool.name, result };
          });
        })
      );
      
      // Process results
      for (const result of results) {
        if (result.status === 'fulfilled') {
          const { name, result: toolResult } = result.value;
          allIssues.push(...(toolResult.issues || []));
          toolsRun.push(name);
        } else {
          console.error(`  ❌ Tool failed:`, result.reason);
        }
      }
    } else {
      // Sequential execution (fallback or for single tool)
      switch (language.toLowerCase()) {
        case 'rust':
          console.log('  Running Clippy...');
          const clippyResult = await this.rustParser.runClippy(repoPath, files);
          allIssues.push(...clippyResult.issues);
          toolsRun.push('clippy');

          console.log('  Running cargo-audit...');
          const auditResult = await this.rustParser.runCargoAudit(repoPath);
          allIssues.push(...auditResult.issues);
          toolsRun.push('cargo-audit');

          console.log('  Running cargo-outdated...');
          const outdatedResult = await this.rustParser.runCargoOutdated(repoPath);
          allIssues.push(...outdatedResult.issues);
          toolsRun.push('cargo-outdated');
          break;

      case 'python':
        console.log('  Running Pylint...');
        const pylintResult = await this.pythonParser.runPylint(repoPath, files);
        allIssues.push(...pylintResult.issues);
        toolsRun.push('pylint');

        console.log('  Running Bandit...');
        const banditResult = await this.pythonParser.runBandit(repoPath, files);
        allIssues.push(...banditResult.issues);
        toolsRun.push('bandit');

        console.log('  Running mypy...');
        const mypyResult = await this.pythonParser.runMypy(repoPath, files);
        allIssues.push(...mypyResult.issues);
        toolsRun.push('mypy');

        console.log('  Running safety...');
        const safetyResult = await this.pythonParser.runSafety(repoPath);
        allIssues.push(...safetyResult.issues);
        toolsRun.push('safety');
        break;

      case 'typescript':
      case 'javascript':
        console.log('  Running ESLint...');
        const eslintResult = await this.tsParser.runESLint(repoPath, files);
        allIssues.push(...eslintResult.issues);
        toolsRun.push('eslint');

        console.log('  Running TypeScript Compiler...');
        const tscResult = await this.tsParser.runTypeScriptCompiler(repoPath, files);
        allIssues.push(...tscResult.issues);
        toolsRun.push('tsc');

        console.log('  Running npm audit...');
        const npmAuditResult = await this.tsParser.runNpmAudit(repoPath);
        allIssues.push(...npmAuditResult.issues);
        toolsRun.push('npm-audit');

        console.log('  Running Jest coverage...');
        const jestResult = await this.tsParser.runJestCoverage(repoPath);
        allIssues.push(...jestResult.issues);
        toolsRun.push('jest');
        break;

      case 'go':
        console.log('  Running go vet...');
        const goVetResult = await this.goParser.runGoVet(repoPath, files);
        allIssues.push(...goVetResult.issues);
        toolsRun.push('go-vet');

        console.log('  Running golangci-lint...');
        const golangciResult = await this.goParser.runGolangciLint(repoPath, files);
        allIssues.push(...golangciResult.issues);
        toolsRun.push('golangci-lint');

        console.log('  Running gosec...');
        const gosecResult = await this.goParser.runGosec(repoPath, files);
        allIssues.push(...gosecResult.issues);
        toolsRun.push('gosec');

        console.log('  Running go test...');
        const goTestResult = await this.goParser.runGoTest(repoPath);
        allIssues.push(...goTestResult.issues);
        toolsRun.push('go-test');

        console.log('  Running go mod...');
        const goModResult = await this.goParser.runGoMod(repoPath);
        allIssues.push(...goModResult.issues);
        toolsRun.push('go-mod');
        break;

      case 'java':
        console.log('  Running SpotBugs...');
        const spotbugsResult = await this.javaParser.runSpotBugs(repoPath, files);
        allIssues.push(...spotbugsResult.issues);
        toolsRun.push('spotbugs');

        console.log('  Running PMD...');
        const pmdResult = await this.javaParser.runPMD(repoPath, files);
        allIssues.push(...pmdResult.issues);
        toolsRun.push('pmd');

        console.log('  Running Checkstyle...');
        const checkstyleResult = await this.javaParser.runCheckstyle(repoPath, files);
        allIssues.push(...checkstyleResult.issues);
        toolsRun.push('checkstyle');

        console.log('  Running OWASP Dependency Check...');
        const depCheckResult = await this.javaParser.runDependencyCheck(repoPath);
        allIssues.push(...depCheckResult.issues);
        toolsRun.push('dependency-check');

        console.log('  Running JUnit...');
        const junitResult = await this.javaParser.runJUnit(repoPath);
        allIssues.push(...junitResult.issues);
        toolsRun.push('junit');
        break;

      default:
        console.warn(`⚠️ Unsupported language: ${language}`);
      }
    }

    // Summarize issues by severity
    const issueSummary = {
      total: allIssues.length,
      critical: allIssues.filter(i => i.severity === 'critical').length,
      high: allIssues.filter(i => i.severity === 'high').length,
      medium: allIssues.filter(i => i.severity === 'medium').length,
      low: allIssues.filter(i => i.severity === 'low').length
    };

    return {
      issues: issueSummary,
      toolsRun
    };
  }

  /**
   * Get tool executions for parallel processing
   */
  private getToolExecutions(language: string, repoPath: string, files: string[]) {
    const executions: Array<{ name: string; execute: () => Promise<any> }> = [];
    
    switch (language.toLowerCase()) {
      case 'rust':
        executions.push(
          { name: 'clippy', execute: () => this.rustParser.runClippy(repoPath, files) },
          { name: 'cargo-audit', execute: () => this.rustParser.runCargoAudit(repoPath) },
          { name: 'cargo-outdated', execute: () => this.rustParser.runCargoOutdated(repoPath) }
        );
        break;
        
      case 'python':
        executions.push(
          { name: 'pylint', execute: () => this.pythonParser.runPylint(repoPath, files) },
          { name: 'bandit', execute: () => this.pythonParser.runBandit(repoPath, files) },
          { name: 'mypy', execute: () => this.pythonParser.runMypy(repoPath, files) },
          { name: 'safety', execute: () => this.pythonParser.runSafety(repoPath) }
        );
        break;
        
      case 'typescript':
      case 'javascript':
        executions.push(
          { name: 'eslint', execute: () => this.tsParser.runESLint(repoPath, files) },
          { name: 'tsc', execute: () => this.tsParser.runTypeScriptCompiler(repoPath, files) },
          { name: 'npm-audit', execute: () => this.tsParser.runNpmAudit(repoPath) },
          { name: 'jest', execute: () => this.tsParser.runJestCoverage(repoPath) }
        );
        break;
        
      case 'go':
        executions.push(
          { name: 'go-vet', execute: () => this.goParser.runGoVet(repoPath, files) },
          { name: 'golangci-lint', execute: () => this.goParser.runGolangciLint(repoPath, files) },
          { name: 'gosec', execute: () => this.goParser.runGosec(repoPath, files) },
          { name: 'go-test', execute: () => this.goParser.runGoTest(repoPath) },
          { name: 'go-mod', execute: () => this.goParser.runGoMod(repoPath) }
        );
        break;
        
      case 'java':
        executions.push(
          { name: 'spotbugs', execute: () => this.javaParser.runSpotBugs(repoPath, files) },
          { name: 'pmd', execute: () => this.javaParser.runPMD(repoPath, files) },
          { name: 'checkstyle', execute: () => this.javaParser.runCheckstyle(repoPath, files) },
          { name: 'dependency-check', execute: () => this.javaParser.runDependencyCheck(repoPath) },
          { name: 'junit', execute: () => this.javaParser.runJUnit(repoPath) }
        );
        break;
    }
    
    return executions;
  }

  /**
   * Calculate proper score (fixed algorithm)
   */
  private calculateScore(issues: any): number {
    // Balanced scoring algorithm (similar to user skill scoring)
    const weights = {
      critical: 5,    // 20 critical issues = 0 score
      high: 3,        // More gradual penalty
      medium: 1,      // Reasonable for common issues
      low: 0.5        // Minor impact on score
    };

    const totalPenalty = 
      (issues.critical * weights.critical) +
      (issues.high * weights.high) +
      (issues.medium * weights.medium) +
      (issues.low * weights.low);

    // Score calculation: 100 - penalties, minimum 0
    const score = Math.max(0, 100 - totalPenalty);
    
    return Math.round(score);
  }

  /**
   * Generate comprehensive report
   */
  generateReport(results: LanguageAnalysisResult[]): string {
    let report = `# 🔍 Universal Framework Analysis Report\n\n`;
    report += `Generated: ${new Date().toISOString()}\n\n`;
    
    report += `## 📊 Executive Summary\n\n`;
    
    const totalIssues = results.reduce((sum, r) => sum + r.issuesFound.total, 0);
    const avgScore = Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length);
    const totalTime = results.reduce((sum, r) => sum + r.executionTime, 0);
    
    report += `- **Languages Analyzed**: ${results.length}\n`;
    report += `- **Total Issues Found**: ${totalIssues}\n`;
    report += `- **Average Score**: ${avgScore}/100\n`;
    report += `- **Total Execution Time**: ${totalTime.toFixed(2)}s\n\n`;
    
    report += `## 🌐 Language-Specific Results\n\n`;
    
    for (const result of results) {
      report += `### ${result.language}\n\n`;
      report += `- **Score**: ${result.score}/100\n`;
      report += `- **Files Analyzed**: ${result.filesAnalyzed}\n`;
      report += `- **Tools Run**: ${result.toolsRun.join(', ')}\n`;
      report += `- **Execution Time**: ${result.executionTime.toFixed(2)}s\n\n`;
      
      report += `#### Issues Breakdown\n\n`;
      report += `| Severity | Count |\n`;
      report += `|----------|-------|\n`;
      report += `| Critical | ${result.issuesFound.critical} |\n`;
      report += `| High | ${result.issuesFound.high} |\n`;
      report += `| Medium | ${result.issuesFound.medium} |\n`;
      report += `| Low | ${result.issuesFound.low} |\n`;
      report += `| **Total** | **${result.issuesFound.total}** |\n\n`;
      
      // Score explanation
      if (result.score < 50) {
        report += `⚠️ **Critical Issues**: This ${result.language} code needs immediate attention.\n\n`;
      } else if (result.score < 70) {
        report += `⚡ **Moderate Issues**: Several improvements needed in the ${result.language} code.\n\n`;
      } else if (result.score < 90) {
        report += `✅ **Good Quality**: The ${result.language} code is in decent shape with minor issues.\n\n`;
      } else {
        report += `🌟 **Excellent Quality**: The ${result.language} code meets high standards.\n\n`;
      }
    }
    
    report += `## 🔧 Key Improvements Over Previous Version\n\n`;
    report += `1. **Real Tool Output**: Now parsing actual tool output instead of mock data\n`;
    report += `2. **Smart File Selection**: Prioritizing PR changes and critical files instead of random selection\n`;
    report += `3. **Fixed Scoring**: Proper penalty-based scoring instead of always showing 100/100\n`;
    report += `4. **Complete Analysis**: All language-specific tools are now integrated\n\n`;
    
    report += `## 📝 Next Steps\n\n`;
    report += `- Review critical and high severity issues\n`;
    report += `- Run fixes for auto-fixable issues\n`;
    report += `- Update dependencies with known vulnerabilities\n`;
    report += `- Improve test coverage where needed\n\n`;
    
    report += `---\n`;
    report += `*Generated by Universal Analysis Framework v2.0*\n`;
    
    return report;
  }
}

/**
 * Demo: Run analysis on a sample repository
 */
async function runDemo() {
  console.log('🚀 Universal Analysis Framework V5');
  console.log('=====================================\n');
  
  const framework = new UniversalAnalysisFramework();
  const results: LanguageAnalysisResult[] = [];
  
  // Parse command line arguments
  const repoPath = process.argv[2] || '.';
  const prNumber = process.argv[3] ? parseInt(process.argv[3]) : undefined;
  const depthArg = process.argv[4] || 'standard';
  
  // Map depth argument to enum
  const depthMap: Record<string, AnalysisDepth> = {
    'quick': AnalysisDepth.QUICK,
    'standard': AnalysisDepth.STANDARD,
    'thorough': AnalysisDepth.THOROUGH,
    'complete': AnalysisDepth.COMPLETE
  };
  
  const depth = depthMap[depthArg.toLowerCase()] || AnalysisDepth.STANDARD;
  
  console.log(`📂 Repository: ${repoPath}`);
  if (prNumber) {
    console.log(`🔄 PR Number: ${prNumber}`);
  }
  console.log(`📊 Analysis Depth: ${AnalysisDepthManager.getDescription(depth)}\n`);
  
  // Performance tracking
  const overallStart = Date.now();
  const languageTimings: Map<string, number> = new Map();
  
  // Detect and analyze each language
  const languages = ['rust', 'python', 'typescript', 'go', 'java'];
  
  // Option for parallel language analysis
  const parallelLanguages = process.env.PARALLEL_LANGUAGES === 'true';
  
  if (parallelLanguages) {
    console.log('🚀 Running language analysis in parallel...\n');
    
    const languagePromises = languages.map(async (language) => {
      const langStart = Date.now();
      try {
        const result = await framework.analyzeLanguage(repoPath, language, prNumber, depth);
        if (result.filesAnalyzed > 0) {
          languageTimings.set(language, (Date.now() - langStart) / 1000);
          return result;
        }
      } catch (error) {
        console.log(`⏭️ Skipping ${language}: Not found or tools unavailable`);
      }
      return null;
    });
    
    const parallelResults = await Promise.all(languagePromises);
    results.push(...parallelResults.filter(r => r !== null) as LanguageAnalysisResult[]);
  } else {
    for (const language of languages) {
      const langStart = Date.now();
      try {
        const result = await framework.analyzeLanguage(repoPath, language, prNumber, depth);
        if (result.filesAnalyzed > 0) {
          results.push(result);
          languageTimings.set(language, (Date.now() - langStart) / 1000);
        }
      } catch (error) {
        console.log(`⏭️ Skipping ${language}: Not found in repository or tools not available`);
      }
    }
  }
  
  // Generate and display report
  if (results.length > 0) {
    const report = framework.generateReport(results);
    console.log('\n' + report);
    
    // Performance summary
    const overallTime = (Date.now() - overallStart) / 1000;
    console.log('\n📊 Performance Summary:');
    console.log(`⏱️  Total Time: ${overallTime.toFixed(2)}s`);
    
    if (languageTimings.size > 0) {
      console.log('\n🔧 Language Analysis Times:');
      for (const [lang, time] of languageTimings) {
        console.log(`  ${lang}: ${time.toFixed(2)}s`);
      }
    }
    
    if (parallelLanguages) {
      const sequentialEstimate = Array.from(languageTimings.values()).reduce((a, b) => a + b, 0);
      const speedup = sequentialEstimate / overallTime;
      console.log(`\n⚡ Parallel Speedup: ${speedup.toFixed(2)}x`);
    }
    
    // Save report to file
    const fs = require('fs').promises;
    const timestamp = new Date().toISOString().replace(/:/g, '-').substring(0, 19);
    const reportPath = `universal-analysis-report-${timestamp}.md`;
    await fs.writeFile(reportPath, report);
    console.log(`\n📄 Report saved to: ${reportPath}`);
  } else {
    console.log('\n⚠️ No supported languages found in the repository');
  }
  
  console.log('\n✅ Analysis complete!');
}

// Run the demo
if (require.main === module) {
  runDemo().catch(error => {
    console.error('❌ Error running analysis:', error);
    process.exit(1);
  });
}

export { UniversalAnalysisFramework };