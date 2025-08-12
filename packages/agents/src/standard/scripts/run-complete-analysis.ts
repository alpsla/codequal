#!/usr/bin/env ts-node

/**
 * Complete Analysis Runner - Single Entry Point
 * 
 * This script runs a complete PR analysis from start to finish:
 * 1. Sets up the environment
 * 2. Runs DeepWiki analysis (with mock or real)
 * 3. Generates the report
 * 4. Saves to Supabase (if configured)
 * 
 * Usage:
 *   npm run analyze -- --repo https://github.com/vercel/swr --pr 2950
 *   npm run analyze -- --repo https://github.com/vercel/swr --pr 2950 --mock
 *   npm run analyze -- --repo https://github.com/vercel/swr --pr 2950 --save
 */

import { ComparisonOrchestrator } from '../orchestrator/comparison-orchestrator';
import { StandardAgentFactory, MockResearcherAgent } from '../infrastructure/factory';
import { createDeepWikiService, IDeepWikiService } from '../services/deepwiki-service';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { registerDeepWikiApi } from '../services/deepwiki-api-wrapper';

interface AnalysisOptions {
  repository: string;
  prNumber: string;
  useMock?: boolean;
  saveToSupabase?: boolean;
  outputDir?: string;
}

class CompleteAnalysisRunner {
  private orchestrator: ComparisonOrchestrator;
  private deepWikiService: IDeepWikiService;
  private outputDir: string;

  constructor(options: AnalysisOptions) {
    // Set environment variables
    if (options.useMock || process.env.USE_DEEPWIKI_MOCK === 'true') {
      process.env.USE_DEEPWIKI_MOCK = 'true';
      console.log('⚠️ DeepWiki Mock Mode is ENABLED');
    } else {
      // Register real DeepWiki API when not using mock
      process.env.USE_DEEPWIKI_MOCK = 'false';
      this.registerRealDeepWiki();
    }

    // Create output directory
    this.outputDir = options.outputDir || join(__dirname, '../reports', new Date().toISOString().split('T')[0]);
    mkdirSync(this.outputDir, { recursive: true });

    // Initialize services
    const logger = StandardAgentFactory.createLogger();
    this.deepWikiService = createDeepWikiService(logger, options.useMock);

    // Initialize orchestrator using static methods
    this.orchestrator = new ComparisonOrchestrator(
      StandardAgentFactory.createConfigProvider(),
      StandardAgentFactory.createSkillProvider(),
      StandardAgentFactory.createDataStore(),
      new MockResearcherAgent(),
      undefined, // No educator agent for now
      logger
    );
  }

  private registerRealDeepWiki() {
    try {
      // Try to import the real DeepWiki API from apps/api
      const apiPath = join(__dirname, '../../../../../apps/api/dist/services/deepwiki-api-manager.js');
      const { deepWikiApiManager } = require(apiPath);
      
      // Create an adapter that converts the API response to the expected format
      const adapter = {
        async analyzeRepository(repositoryUrl: string, options?: any) {
          const result = await deepWikiApiManager.analyzeRepository(repositoryUrl, options);
          
          // Log first issue to see structure
          if (result && result.issues && result.issues.length > 0) {
            console.log('🔍 DeepWiki Issue Example:');
            const firstIssue = result.issues[0];
            console.log('  - Has suggestion:', !!firstIssue.suggestion);
            console.log('  - Has remediation:', !!firstIssue.remediation);
            console.log('  - Has recommendation:', !!firstIssue.recommendation);
            if (firstIssue.suggestion) {
              console.log('  - Suggestion:', firstIssue.suggestion.substring(0, 100) + '...');
            }
          }
          
          // Convert the flat issue structure to nested structure expected by DeepWiki service
          if (result && result.issues) {
            result.issues = result.issues.map((issue: any) => ({
              id: issue.id || `issue-${Math.random().toString(36).substr(2, 9)}`,
              severity: issue.severity,
              category: issue.category,
              title: issue.message || issue.title,
              description: issue.description || issue.message,
              location: {
                file: issue.file || 'unknown',
                line: issue.line || 0,
                column: issue.column
              },
              recommendation: issue.suggestion || issue.remediation,
              suggestion: issue.suggestion,
              remediation: issue.remediation,
              rule: issue.rule
            }));
          }
          
          // Ensure the response has the expected structure
          return {
            issues: result.issues || [],
            scores: result.scores || {
              overall: 0,
              security: 0,
              performance: 0,
              maintainability: 0,
              testing: 0
            },
            metadata: result.metadata || {
              timestamp: new Date().toISOString(),
              tool_version: '1.0.0',
              duration_ms: 0,
              files_analyzed: 0
            }
          };
        }
      };
      
      registerDeepWikiApi(adapter);
      console.log('✅ Real DeepWiki API registered');
    } catch (error) {
      console.warn('⚠️ Could not load real DeepWiki API, will use mock:', error instanceof Error ? error.message : String(error));
    }
  }

  private async getPRAuthor(repoUrl: string, prNumber: string): Promise<string> {
    try {
      // Extract owner and repo from URL
      const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (!match) return 'Unknown';
      
      const [, owner, repo] = match;
      
      // Try to use gh CLI to get PR info
      const { execSync } = require('child_process');
      try {
        const result = execSync(`gh pr view ${prNumber} --repo ${owner}/${repo} --json author --jq '.author.login' 2>/dev/null`, 
          { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
        );
        return result.trim() || 'Unknown';
      } catch {
        // gh CLI not available or PR not found
        return `${owner}`;
      }
    } catch {
      return 'Unknown';
    }
  }

  async run(options: AnalysisOptions) {
    console.log('🚀 Starting Complete PR Analysis');
    console.log('================================\n');
    console.log(`Repository: ${options.repository}`);
    console.log(`PR Number: ${options.prNumber}`);
    console.log(`Mode: ${options.useMock || process.env.USE_DEEPWIKI_MOCK === 'true' ? 'Mock' : 'Real DeepWiki'}`);
    console.log(`Save to Supabase: ${options.saveToSupabase ? 'Yes' : 'No'}`);
    console.log(`Output Directory: ${this.outputDir}\n`);

    try {
      // Run the analysis
      console.log('📊 Running analysis...');
      const startTime = Date.now();
      
      // Step 1: Analyze main branch
      console.log('🔍 Analyzing main branch...');
      const mainBranchAnalysis = await this.deepWikiService.analyzeRepositoryForComparison(
        options.repository,
        'main'
      );
      
      // Step 2: Analyze feature branch (PR branch)
      console.log(`🔍 Analyzing PR #${options.prNumber} branch...`);
      const featureBranchAnalysis = await this.deepWikiService.analyzeRepositoryForComparison(
        options.repository,
        undefined, // Let DeepWiki determine the PR branch
        options.prNumber
      );
      
      // Calculate DeepWiki scan duration
      const deepWikiScanDuration = (Date.now() - startTime) / 1000;
      
      // Step 3: Create analysis request
      const analysisRequest = {
        mainBranchAnalysis,
        featureBranchAnalysis,
        prMetadata: {
          id: options.prNumber,
          repository_url: options.repository,
          author: await this.getPRAuthor(options.repository, options.prNumber),
          linesAdded: 100, // TODO: Get from GitHub API
          linesRemoved: 50 // TODO: Get from GitHub API
        },
        userId: '00000000-0000-0000-0000-000000000000',  // Default UUID
        teamId: '00000000-0000-0000-0000-000000000000',  // Default UUID
        generateReport: true,
        includeEducation: true,
        deepWikiScanDuration // Pass the actual DeepWiki scan time
      };

      // Step 4: Execute comparison
      console.log('🔄 Comparing branches and generating report...');
      
      const result = await this.orchestrator.executeComparison(analysisRequest as any);

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`✅ Analysis completed in ${duration}s\n`);

      // Save the report
      const reportPath = join(this.outputDir, `pr-${options.prNumber}-report.md`);
      writeFileSync(reportPath, result.report || 'No report generated');
      console.log(`📄 Report saved to: ${reportPath}`);

      // Save the comment
      const commentPath = join(this.outputDir, `pr-${options.prNumber}-comment.md`);
      writeFileSync(commentPath, result.prComment || 'No comment generated');
      console.log(`💬 Comment saved to: ${commentPath}`);

      // Display summary
      console.log('\n📋 Analysis Summary:');
      console.log('===================');
      console.log(`Success: ${result.success}`);
      if (result.comparison) {
        console.log(`New Issues: ${result.comparison.newIssues?.length || 0}`);
        console.log(`Resolved Issues: ${result.comparison.resolvedIssues?.length || 0}`);
        console.log(`Modified Issues: ${result.comparison.modifiedIssues?.length || 0}`);
      }

      // Display skill tracking info
      if (result.skillTracking) {
        console.log('\n🎯 Skill Tracking Available');
      }

      // Display educational content
      if (result.education) {
        console.log('\n📚 Educational Content Available');
      }

      return result;

    } catch (error) {
      console.error('\n❌ Analysis failed:', error);
      throw error;
    }
  }
}

// Parse command line arguments
function parseArgs(): AnalysisOptions {
  const args = process.argv.slice(2);
  const options: AnalysisOptions = {
    repository: '',
    prNumber: ''
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--repo':
      case '-r':
        options.repository = args[++i];
        break;
      case '--pr':
      case '-p':
        options.prNumber = args[++i];
        break;
      case '--mock':
      case '-m':
        options.useMock = true;
        break;
      case '--save':
      case '-s':
        options.saveToSupabase = true;
        break;
      case '--output':
      case '-o':
        options.outputDir = args[++i];
        break;
    }
  }

  if (!options.repository || !options.prNumber) {
    console.error('Usage: npm run analyze -- --repo <repository-url> --pr <pr-number> [--mock] [--save]');
    console.error('Example: npm run analyze -- --repo https://github.com/vercel/swr --pr 2950 --mock');
    process.exit(1);
  }

  return options;
}

// Main execution
if (require.main === module) {
  const options = parseArgs();
  const runner = new CompleteAnalysisRunner(options);
  
  runner.run(options)
    .then(() => {
      console.log('\n✅ Analysis complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Analysis failed:', error);
      process.exit(1);
    });
}

export { CompleteAnalysisRunner };