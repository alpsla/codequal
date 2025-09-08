#!/usr/bin/env npx ts-node

/**
 * Real Java Repository Analysis for OpenRouter API Cost Testing
 * 
 * This script runs actual analysis on large Java repositories to determine
 * real OpenRouter API costs. Makes actual API calls, no mocking.
 * 
 * USAGE:
 * cd /Users/alpinro/Code\ Prjects/codequal/packages/agents
 * npx ts-node run-real-java-analysis.ts
 */

// PERMANENT FIX: Use centralized environment loader
import { getEnvConfig } from './src/standard/utils/env-loader';
const envConfig = getEnvConfig();

import { SmartIterativeDeepWikiApi as DirectDeepWikiApiWithLocation } from './src/standard/services/smart-iterative-deepwiki-api';
import { PRAnalysisCategorizer } from './src/standard/services/pr-analysis-categorizer';
import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';
import * as fs from 'fs';
import * as path from 'path';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// Large Java repositories with open PRs
const testTargets = [
  {
    name: "Spring Boot",
    url: "https://github.com/spring-projects/spring-boot/pull/47072",
    repoUrl: "https://github.com/spring-projects/spring-boot",
    prNumber: 47072,
    description: "Large Spring Boot PR: Use isNoop() instead of Observation.NOOP"
  },
  {
    name: "Elasticsearch", 
    url: "https://github.com/elastic/elasticsearch/pull/134260",
    repoUrl: "https://github.com/elastic/elasticsearch",
    prNumber: 134260,
    description: "Large Elasticsearch PR: Implicitly use last_over_time for time-series aggregations"
  },
  {
    name: "Apache Kafka",
    url: "https://github.com/apache/kafka/pull/20497", 
    repoUrl: "https://github.com/apache/kafka",
    prNumber: 20497,
    description: "Apache Kafka PR: Bump requests from 2.31.3 to 2.32.4 in CI"
  }
];

interface AnalysisCostMetrics {
  repository: string;
  prNumber: number;
  analysisStartTime: number;
  analysisEndTime: number;
  totalDurationMs: number;
  mainBranchAnalysis: {
    startTime: number;
    endTime: number;
    durationMs: number;
    filesAnalyzed: number;
    issuesFound: number;
    tokensUsed?: number;
    apiCalls?: number;
    cost?: number;
  };
  prBranchAnalysis: {
    startTime: number;
    endTime: number;
    durationMs: number;
    filesAnalyzed: number;
    issuesFound: number;
    tokensUsed?: number;
    apiCalls?: number;
    cost?: number;
  };
  reportGeneration: {
    startTime: number;
    endTime: number;
    durationMs: number;
    tokensUsed?: number;
    apiCalls?: number;
    cost?: number;
  };
  totalApiCalls: number;
  totalTokensUsed: number;
  estimatedTotalCost: number;
  modelsUsed: string[];
}

class JavaAnalysisCostTester {
  private deepWikiApi: DirectDeepWikiApiWithLocation;
  private categorizer: PRAnalysisCategorizer;
  private reportGenerator: ReportGeneratorV8Final;
  private costMetrics: AnalysisCostMetrics[] = [];

  constructor() {
    console.log(`${colors.cyan}🔧 Initializing Real Java Analysis Cost Tester...${colors.reset}`);
    
    this.deepWikiApi = new DirectDeepWikiApiWithLocation({
      baseUrl: envConfig.DEEPWIKI_API_URL || 'http://localhost:8001',
      timeout: 300000, // 5 minute timeout for large repos
    });
    
    this.categorizer = new PRAnalysisCategorizer();
    this.reportGenerator = new ReportGeneratorV8Final();
    
    console.log(`${colors.green}✅ Initialized with DeepWiki API: ${envConfig.DEEPWIKI_API_URL || 'http://localhost:8001'}${colors.reset}`);
  }

  async analyzeSingleRepository(target: typeof testTargets[0]): Promise<AnalysisCostMetrics> {
    console.log(`\n${colors.bright}${colors.blue}🎯 Starting Analysis: ${target.name}${colors.reset}`);
    console.log(`${colors.cyan}PR URL: ${target.url}${colors.reset}`);
    console.log(`${colors.yellow}Description: ${target.description}${colors.reset}\n`);

    const metrics: AnalysisCostMetrics = {
      repository: target.name,
      prNumber: target.prNumber,
      analysisStartTime: Date.now(),
      analysisEndTime: 0,
      totalDurationMs: 0,
      mainBranchAnalysis: { startTime: 0, endTime: 0, durationMs: 0, filesAnalyzed: 0, issuesFound: 0 },
      prBranchAnalysis: { startTime: 0, endTime: 0, durationMs: 0, filesAnalyzed: 0, issuesFound: 0 },
      reportGeneration: { startTime: 0, endTime: 0, durationMs: 0 },
      totalApiCalls: 0,
      totalTokensUsed: 0,
      estimatedTotalCost: 0,
      modelsUsed: []
    };

    try {
      // Step 1: Analyze main branch
      console.log(`${colors.yellow}📊 Phase 1: Analyzing main branch...${colors.reset}`);
      metrics.mainBranchAnalysis.startTime = Date.now();
      
      const mainBranchResults = await this.deepWikiApi.analyzeGitHubPR(target.repoUrl, target.prNumber, {
        branch: 'main',
        includeFileContents: true,
        maxFiles: 50, // Limit for cost control
        timeout: 240000 // 4 minutes
      });
      
      metrics.mainBranchAnalysis.endTime = Date.now();
      metrics.mainBranchAnalysis.durationMs = metrics.mainBranchAnalysis.endTime - metrics.mainBranchAnalysis.startTime;
      metrics.mainBranchAnalysis.filesAnalyzed = mainBranchResults.filesAnalyzed || 0;
      metrics.mainBranchAnalysis.issuesFound = mainBranchResults.issues?.length || 0;
      
      console.log(`${colors.green}✅ Main branch analysis completed: ${metrics.mainBranchAnalysis.issuesFound} issues, ${metrics.mainBranchAnalysis.filesAnalyzed} files${colors.reset}`);
      console.log(`${colors.blue}⏱️  Duration: ${(metrics.mainBranchAnalysis.durationMs / 1000).toFixed(1)}s${colors.reset}`);

      // Step 2: Analyze PR branch  
      console.log(`\n${colors.yellow}📊 Phase 2: Analyzing PR branch...${colors.reset}`);
      metrics.prBranchAnalysis.startTime = Date.now();
      
      const prBranchResults = await this.deepWikiApi.analyzeGitHubPR(target.repoUrl, target.prNumber, {
        branch: `refs/pull/${target.prNumber}/head`,
        includeFileContents: true,
        maxFiles: 50, // Limit for cost control
        timeout: 240000 // 4 minutes
      });
      
      metrics.prBranchAnalysis.endTime = Date.now();
      metrics.prBranchAnalysis.durationMs = metrics.prBranchAnalysis.endTime - metrics.prBranchAnalysis.startTime;
      metrics.prBranchAnalysis.filesAnalyzed = prBranchResults.filesAnalyzed || 0;
      metrics.prBranchAnalysis.issuesFound = prBranchResults.issues?.length || 0;
      
      console.log(`${colors.green}✅ PR branch analysis completed: ${metrics.prBranchAnalysis.issuesFound} issues, ${metrics.prBranchAnalysis.filesAnalyzed} files${colors.reset}`);
      console.log(`${colors.blue}⏱️  Duration: ${(metrics.prBranchAnalysis.durationMs / 1000).toFixed(1)}s${colors.reset}`);

      // Step 3: Generate V8 Report
      console.log(`\n${colors.yellow}📊 Phase 3: Generating V8 Report...${colors.reset}`);
      metrics.reportGeneration.startTime = Date.now();
      
      const analysisData = {
        repositoryUrl: target.repoUrl,
        prNumber: target.prNumber,
        prTitle: target.description,
        prAuthor: 'analysis-test',
        prDescription: target.description,
        branch: `refs/pull/${target.prNumber}/head`,
        mainBranchFindings: mainBranchResults.issues || [],
        prBranchFindings: prBranchResults.issues || [],
        models: {
          deepwiki: 'openai/gpt-4o-mini',
          orchestrator: 'openai/gpt-4o-mini', 
          comparison: 'openai/gpt-4o',
          educator: 'openai/gpt-3.5-turbo',
          reporter: 'openai/gpt-4o'
        }
      };
      
      const report = await this.reportGenerator.generateReport(analysisData);
      
      metrics.reportGeneration.endTime = Date.now();
      metrics.reportGeneration.durationMs = metrics.reportGeneration.endTime - metrics.reportGeneration.startTime;
      
      console.log(`${colors.green}✅ V8 Report generated successfully${colors.reset}`);
      console.log(`${colors.blue}⏱️  Duration: ${(metrics.reportGeneration.durationMs / 1000).toFixed(1)}s${colors.reset}`);

      // Step 4: Extract cost metrics
      this.extractCostMetrics(metrics, mainBranchResults, prBranchResults, report);
      
      // Step 5: Save report
      const reportFileName = `real-java-analysis-${target.name.toLowerCase().replace(/\s+/g, '-')}-${target.prNumber}-${new Date().toISOString().split('T')[0]}.html`;
      const reportPath = path.join(__dirname, reportFileName);
      
      if (typeof report === 'string') {
        fs.writeFileSync(reportPath, report);
      } else if (report && typeof report === 'object' && 'html' in report) {
        fs.writeFileSync(reportPath, report.html);
      }
      
      console.log(`${colors.cyan}📄 Report saved: ${reportPath}${colors.reset}`);

      metrics.analysisEndTime = Date.now();
      metrics.totalDurationMs = metrics.analysisEndTime - metrics.analysisStartTime;

      return metrics;

    } catch (error) {
      console.error(`${colors.red}❌ Error analyzing ${target.name}:${colors.reset}`, error);
      
      metrics.analysisEndTime = Date.now();
      metrics.totalDurationMs = metrics.analysisEndTime - metrics.analysisStartTime;
      
      throw error;
    }
  }

  private extractCostMetrics(metrics: AnalysisCostMetrics, mainResults: any, prResults: any, report: any) {
    // Extract cost information from API responses if available
    const extractFromResult = (result: any) => {
      return {
        tokensUsed: result.metadata?.tokensUsed || 0,
        apiCalls: result.metadata?.apiCalls || 1,
        cost: result.metadata?.estimatedCost || 0
      };
    };

    const mainMetrics = extractFromResult(mainResults);
    const prMetrics = extractFromResult(prResults);
    const reportMetrics = extractFromResult(report);

    metrics.mainBranchAnalysis = { ...metrics.mainBranchAnalysis, ...mainMetrics };
    metrics.prBranchAnalysis = { ...metrics.prBranchAnalysis, ...prMetrics };
    metrics.reportGeneration = { ...metrics.reportGeneration, ...reportMetrics };

    metrics.totalApiCalls = mainMetrics.apiCalls + prMetrics.apiCalls + reportMetrics.apiCalls;
    metrics.totalTokensUsed = mainMetrics.tokensUsed + prMetrics.tokensUsed + reportMetrics.tokensUsed;
    metrics.estimatedTotalCost = mainMetrics.cost + prMetrics.cost + reportMetrics.cost;

    // Common models used based on our config
    metrics.modelsUsed = [
      'openai/gpt-4o-mini',
      'openai/gpt-4o', 
      'openai/gpt-3.5-turbo'
    ];
  }

  async runCostAnalysis(): Promise<void> {
    console.log(`${colors.bright}${colors.magenta}🚀 Starting Real Java Repository Analysis for OpenRouter API Cost Testing${colors.reset}\n`);
    
    // Test one repository at a time to avoid overwhelming the API
    for (const target of testTargets.slice(0, 1)) { // Start with just Spring Boot
      try {
        const metrics = await this.analyzeSingleRepository(target);
        this.costMetrics.push(metrics);
        
        this.printMetricsSummary(metrics);
        
        // Wait between repositories to be respectful
        if (testTargets.indexOf(target) < testTargets.length - 1) {
          console.log(`${colors.yellow}⏳ Waiting 30 seconds before next analysis...${colors.reset}`);
          await new Promise(resolve => setTimeout(resolve, 30000));
        }
        
      } catch (error) {
        console.error(`${colors.red}❌ Failed to analyze ${target.name}: ${error}${colors.reset}`);
      }
    }

    // Generate final cost report
    this.generateCostReport();
  }

  private printMetricsSummary(metrics: AnalysisCostMetrics) {
    console.log(`\n${colors.bright}${colors.green}📊 Analysis Summary for ${metrics.repository}${colors.reset}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`${colors.cyan}Repository:${colors.reset} ${metrics.repository} (PR #${metrics.prNumber})`);
    console.log(`${colors.cyan}Total Duration:${colors.reset} ${(metrics.totalDurationMs / 1000).toFixed(1)} seconds`);
    console.log(`${colors.cyan}Main Branch:${colors.reset} ${metrics.mainBranchAnalysis.issuesFound} issues, ${metrics.mainBranchAnalysis.filesAnalyzed} files`);
    console.log(`${colors.cyan}PR Branch:${colors.reset} ${metrics.prBranchAnalysis.issuesFound} issues, ${metrics.prBranchAnalysis.filesAnalyzed} files`);
    console.log(`${colors.cyan}Total API Calls:${colors.reset} ${metrics.totalApiCalls}`);
    console.log(`${colors.cyan}Total Tokens:${colors.reset} ${metrics.totalTokensUsed.toLocaleString()}`);
    console.log(`${colors.cyan}Estimated Cost:${colors.reset} $${metrics.estimatedTotalCost.toFixed(4)}`);
    console.log(`${colors.cyan}Models Used:${colors.reset} ${metrics.modelsUsed.join(', ')}`);
  }

  private generateCostReport() {
    const reportContent = {
      testDate: new Date().toISOString(),
      summary: {
        repositoriesTested: this.costMetrics.length,
        totalAnalyses: this.costMetrics.length * 2, // main + PR branch
        averageDurationSeconds: this.costMetrics.reduce((sum, m) => sum + m.totalDurationMs, 0) / this.costMetrics.length / 1000,
        totalTokensUsed: this.costMetrics.reduce((sum, m) => sum + m.totalTokensUsed, 0),
        totalApiCalls: this.costMetrics.reduce((sum, m) => sum + m.totalApiCalls, 0),
        totalEstimatedCost: this.costMetrics.reduce((sum, m) => sum + m.estimatedTotalCost, 0),
        averageCostPerAnalysis: this.costMetrics.reduce((sum, m) => sum + m.estimatedTotalCost, 0) / this.costMetrics.length
      },
      detailedMetrics: this.costMetrics,
      recommendations: [
        "Based on actual analysis, each large Java repository PR analysis costs approximately $X.XX",
        "Main bottleneck is the file analysis phase which takes X-Y minutes per branch",
        "Consider implementing file filtering to reduce unnecessary analysis",
        "Token usage varies significantly based on repository size and code complexity"
      ]
    };

    const costReportPath = path.join(__dirname, `openrouter-cost-analysis-${new Date().toISOString().split('T')[0]}.json`);
    fs.writeFileSync(costReportPath, JSON.stringify(reportContent, null, 2));

    console.log(`\n${colors.bright}${colors.green}📊 FINAL COST ANALYSIS REPORT${colors.reset}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`${colors.cyan}Report saved to:${colors.reset} ${costReportPath}`);
    console.log(`\n${colors.yellow}Summary:${colors.reset}`);
    console.log(`  Repositories Tested: ${reportContent.summary.repositoriesTested}`);
    console.log(`  Total API Calls: ${reportContent.summary.totalApiCalls}`);
    console.log(`  Total Tokens Used: ${reportContent.summary.totalTokensUsed.toLocaleString()}`);
    console.log(`  Total Estimated Cost: $${reportContent.summary.totalEstimatedCost.toFixed(4)}`);
    console.log(`  Average Cost per Analysis: $${reportContent.summary.averageCostPerAnalysis.toFixed(4)}`);
    console.log(`  Average Duration: ${reportContent.summary.averageDurationSeconds.toFixed(1)} seconds`);
  }
}

// Main execution
async function main() {
  const tester = new JavaAnalysisCostTester();
  
  try {
    await tester.runCostAnalysis();
    console.log(`\n${colors.bright}${colors.green}🎉 Real Java Analysis Cost Testing Completed!${colors.reset}`);
  } catch (error) {
    console.error(`\n${colors.red}❌ Cost analysis failed:${colors.reset}`, error);
    process.exit(1);
  }
}

// Run the cost analysis
main().catch(console.error);