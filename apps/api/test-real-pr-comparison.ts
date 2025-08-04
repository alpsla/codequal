#!/usr/bin/env ts-node

/**
 * Test Real DeepWiki PR Comparison Analysis
 * 
 * This script tests the full PR comparison flow using real DeepWiki API
 */

import * as dotenv from 'dotenv';
import { join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

// Import DeepWiki API manager
import { deepWikiApiManager } from './src/services/deepwiki-api-manager';

// Import Standard framework components  
import { 
  registerDeepWikiApi, 
  IDeepWikiApi,
  ComparisonOrchestrator,
  StandardAgentFactory,
  createDeepWikiService
} from '../../packages/agents/dist/standard/index';

async function testRealPRComparison() {
  console.log('🚀 Testing Real DeepWiki PR Comparison Analysis');
  console.log('============================================\n');

  // Set environment to use real API
  process.env.USE_DEEPWIKI_MOCK = 'false';

  try {
    // Register the real DeepWiki API
    console.log('📝 Registering real DeepWiki API...');
    
    const adapter: IDeepWikiApi = {
      async analyzeRepository(repositoryUrl: string, options?: any) {
        const result = await deepWikiApiManager.analyzeRepository(repositoryUrl, options);
        
        // Convert to expected format
        return {
          issues: result.issues.map((issue: any) => ({
            id: issue.id || `issue-${Math.random().toString(36).substr(2, 9)}`,
            severity: (issue.severity || 'medium').toLowerCase() as 'critical' | 'high' | 'medium' | 'low' | 'info',
            category: issue.category,
            title: issue.title || issue.message,
            description: issue.description || issue.message || issue.title,
            location: {
              file: issue.file || issue.location?.file || 'unknown',
              line: issue.line || issue.location?.line || 0,
              column: issue.location?.column
            },
            recommendation: issue.suggestion || issue.recommendation || issue.remediation,
            rule: issue.rule || issue.cwe
          })),
          scores: {
            overall: result.scores?.overall || 0,
            security: result.scores?.security || 0,
            performance: result.scores?.performance || 0,
            maintainability: result.scores?.maintainability || result.scores?.codeQuality || 0,
            testing: result.scores?.testing
          },
          metadata: {
            timestamp: result.metadata?.analyzed_at ? new Date(result.metadata.analyzed_at).toISOString() : new Date().toISOString(),
            tool_version: '1.0.0',
            duration_ms: result.metadata?.duration_ms || 0,
            files_analyzed: result.metadata?.files_analyzed || result.statistics?.files_analyzed || 0,
            total_lines: undefined,
            model_used: result.metadata?.model_used,
            branch: result.metadata?.branch || options?.branch
          }
        };
      }
    };
    
    registerDeepWikiApi(adapter);
    console.log('✅ Real DeepWiki API registered!\n');

    // Create orchestrator using static factory method
    const orchestrator = await StandardAgentFactory.createTestOrchestrator();
    
    // Create DeepWiki service
    const deepWikiService = createDeepWikiService(undefined, false);
    
    // Test repository and PR
    const repository = 'https://github.com/vercel/swr';
    const prNumber = '2950';
    const authorLogin = 'test-user';
    const filesChanged = 5;
    const linesAdded = 100;
    const linesRemoved = 50;
    
    console.log('📊 Analyzing Pull Request:');
    console.log(`   Repository: ${repository}`);
    console.log(`   PR: #${prNumber}`);
    console.log(`   Author: @${authorLogin}`);
    console.log(`   Changes: ${filesChanged} files (+${linesAdded}/-${linesRemoved})\n`);
    
    const startTime = Date.now();
    console.log('🔄 Running full PR comparison analysis with real DeepWiki...');
    
    // Step 1: Analyze main branch
    console.log('   ⏳ Analyzing main branch...');
    const mainBranchAnalysis = await deepWikiService.analyzeRepositoryForComparison(
      repository,
      'main'
    );
    
    // Step 2: Analyze feature branch (PR branch)
    console.log('   ⏳ Analyzing PR branch...');
    const featureBranchAnalysis = await deepWikiService.analyzeRepositoryForComparison(
      repository,
      undefined, // Let DeepWiki determine the PR branch
      prNumber
    );
    
    // Step 3: Create analysis request
    const analysisRequest = {
      mainBranchAnalysis,
      featureBranchAnalysis,
      prMetadata: {
        id: prNumber,
        repository_url: repository,
        author: authorLogin,
        linesAdded,
        linesRemoved
      },
      userId: 'test-user',
      teamId: 'test-team',
      generateReport: true,
      includeEducation: true
    };
    
    // Step 4: Execute comparison
    console.log('   ⏳ Comparing changes...\n');
    const report = await orchestrator.executeComparison(analysisRequest);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log(`\n✅ Analysis completed in ${duration}s\n`);
    
    // Display results summary
    console.log('📋 PR Analysis Results:');
    console.log(`   Success: ${report.success}`);
    if (report.comparison) {
      console.log(`   New Issues: ${report.comparison.newIssues?.length || 0}`);
      console.log(`   Resolved Issues: ${report.comparison.resolvedIssues?.length || 0}`);
      console.log(`   Modified Issues: ${report.comparison.modifiedIssues?.length || 0}\n`);
    }
    
    if (report.skillTracking) {
      console.log('🎯 Skill Tracking:');
      console.log(`   User ID: ${report.skillTracking.userId}`);
      console.log(`   Skill Updates Applied: ${report.skillTracking.updates?.length || 0}\n`);
    }
    
    if (report.education) {
      console.log('📚 Educational Content Available\n');
    }
    
    // Show top new issues
    if (report.comparison?.newIssues && report.comparison.newIssues.length > 0) {
      console.log('🚨 New Issues Introduced:');
      report.comparison.newIssues.slice(0, 3).forEach((issue: any, index: number) => {
        console.log(`   ${index + 1}. [${issue.severity?.toUpperCase() || 'N/A'}] ${issue.message || issue.title}`);
      });
      if (report.comparison.newIssues.length > 3) {
        console.log(`   ... and ${report.comparison.newIssues.length - 3} more\n`);
      }
    }
    
    // Save reports
    const outputDir = join(__dirname, 'test-output', new Date().toISOString().split('T')[0]);
    mkdirSync(outputDir, { recursive: true });
    
    // Save JSON report
    const jsonPath = join(outputDir, 'real-pr-comparison.json');
    writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Full JSON report saved to: ${jsonPath}`);
    
    // Save markdown report
    if (report.report) {
      const mdPath = join(outputDir, 'real-pr-comparison.md');
      writeFileSync(mdPath, report.report);
      console.log(`📝 Markdown report saved to: ${mdPath}`);
    }
    
    // Save PR comment
    if (report.prComment) {
      const commentPath = join(outputDir, 'real-pr-comment.md');
      writeFileSync(commentPath, report.prComment);
      console.log(`💬 PR comment saved to: ${commentPath}`);
    }
    
    return report;
    
  } catch (error) {
    console.error('\n❌ Analysis failed:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
    }
    
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testRealPRComparison()
    .then(() => {
      console.log('\n🎉 Real PR comparison test complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Test failed:', error);
      process.exit(1);
    });
}

export { testRealPRComparison };
