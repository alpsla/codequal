/**
 * Test Real DeepWiki Dual Branch Analysis
 * Uses the actual DeepWiki API Manager to generate reports for both branches
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { DeepWikiApiManager } from '../../../../apps/api/src/services/deepwiki-api-manager';
import { VectorStorageService } from '@codequal/database';
import { createLogger } from '@codequal/core/utils';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const logger = createLogger('test-deepwiki-real');

interface TestResult {
  success: boolean;
  mainBranchTime?: number;
  featureBranchTime?: number;
  error?: string;
  reports?: {
    main?: any;
    feature?: any;
  };
  vectorDbStored?: boolean;
}

async function testRealDeepWikiDualBranch(prUrl: string): Promise<TestResult> {
  logger.info('🧪 Testing Real DeepWiki Dual Branch Analysis');
  logger.info(`📍 PR URL: ${prUrl}\n`);
  
  // Parse PR URL
  const urlMatch = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!urlMatch) {
    return { success: false, error: 'Invalid GitHub PR URL format' };
  }
  
  const [, owner, repo, prNumber] = urlMatch;
  const repoUrl = `https://github.com/${owner}/${repo}`;
  
  // Initialize services
  const deepWikiManager = new DeepWikiApiManager();
  const vectorStorage = new VectorStorageService();
  
  try {
    // Step 1: Generate DeepWiki report for main branch
    logger.info('\n🔍 Step 1: Generating DeepWiki report for main branch...');
    const mainStartTime = Date.now();
    
    const mainReport = await deepWikiManager.analyzeRepository(repoUrl, {
      branch: 'main'
    });
    
    const mainBranchTime = Date.now() - mainStartTime;
    logger.info(`✅ Main branch analysis completed in ${(mainBranchTime / 1000).toFixed(1)}s`);
    logger.info(`  - Issues found: ${mainReport.issues.length}`);
    logger.info(`  - Security score: ${mainReport.scores.security}`);
    logger.info(`  - Model used: ${mainReport.metadata.model_used || 'unknown'}`);
    
    // Step 2: Generate DeepWiki report for feature branch
    logger.info('\n🔍 Step 2: Generating DeepWiki report for feature branch...');
    const featureStartTime = Date.now();
    
    const featureReport = await deepWikiManager.analyzeRepository(repoUrl, {
      branch: `pull/${prNumber}/head`
    });
    
    const featureBranchTime = Date.now() - featureStartTime;
    logger.info(`✅ Feature branch analysis completed in ${(featureBranchTime / 1000).toFixed(1)}s`);
    logger.info(`  - Issues found: ${featureReport.issues.length}`);
    logger.info(`  - Security score: ${featureReport.scores.security}`);
    logger.info(`  - Model used: ${featureReport.metadata.model_used || 'unknown'}`);
    
    // Step 3: Store both reports in Vector DB
    logger.info('\n💾 Step 3: Storing reports in Vector DB...');
    let vectorDbStored = false;
    
    try {
      // Store main branch report
      await vectorStorage.storeDocument({
        id: `deepwiki-${repoUrl}-main-${Date.now()}`,
        content: JSON.stringify(mainReport),
        metadata: {
          type: 'deepwiki-report',
          repository: repoUrl,
          branch: 'main',
          timestamp: new Date().toISOString()
        }
      });
      
      // Store feature branch report
      await vectorStorage.storeDocument({
        id: `deepwiki-${repoUrl}-pr${prNumber}-${Date.now()}`,
        content: JSON.stringify(featureReport),
        metadata: {
          type: 'deepwiki-report',
          repository: repoUrl,
          branch: `pr-${prNumber}`,
          timestamp: new Date().toISOString()
        }
      });
      
      vectorDbStored = true;
      logger.info('✅ Both reports stored in Vector DB successfully');
    } catch (error: any) {
      logger.warn('⚠️  Failed to store in Vector DB:', error.message);
    }
    
    // Step 4: Compare results
    logger.info('\n📊 Step 4: Comparing results...');
    compareReports(mainReport, featureReport);
    
    // Step 5: Test DeepWiki chat with context
    await testDeepWikiChatWithContext(mainReport, featureReport, prNumber);
    
    // Cleanup repositories
    logger.info('\n🧹 Cleaning up...');
    await deepWikiManager.cleanupRepository(repoUrl);
    
    return {
      success: true,
      mainBranchTime,
      featureBranchTime,
      reports: {
        main: mainReport,
        feature: featureReport
      },
      vectorDbStored
    };
    
  } catch (error: any) {
    logger.error('❌ Test failed:', error);
    
    return {
      success: false,
      error: error.message
    };
  }
}

function compareReports(mainReport: any, featureReport: any): void {
  const mainIssues = mainReport.issues || [];
  const featureIssues = featureReport.issues || [];
  
  logger.info('\n  Main Branch:');
  logger.info(`    Total Issues: ${mainIssues.length}`);
  logger.info(`    Critical: ${mainIssues.filter((i: any) => i.severity === 'critical').length}`);
  logger.info(`    High: ${mainIssues.filter((i: any) => i.severity === 'high').length}`);
  logger.info(`    Security Score: ${mainReport.scores?.security || 'N/A'}`);
  logger.info(`    Overall Score: ${mainReport.scores?.overall || 'N/A'}`);
  
  logger.info('\n  Feature Branch:');
  logger.info(`    Total Issues: ${featureIssues.length}`);
  logger.info(`    Critical: ${featureIssues.filter((i: any) => i.severity === 'critical').length}`);
  logger.info(`    High: ${featureIssues.filter((i: any) => i.severity === 'high').length}`);
  logger.info(`    Security Score: ${featureReport.scores?.security || 'N/A'}`);
  logger.info(`    Overall Score: ${featureReport.scores?.overall || 'N/A'}`);
  
  logger.info('\n  Changes:');
  const newIssues = featureIssues.length - mainIssues.length;
  const securityDelta = (featureReport.scores?.security || 0) - (mainReport.scores?.security || 0);
  
  logger.info(`    New Issues: ${newIssues > 0 ? '⚠️' : '✅'} ${newIssues > 0 ? '+' : ''}${newIssues}`);
  logger.info(`    Security Score Change: ${securityDelta < 0 ? '❌' : '✅'} ${securityDelta > 0 ? '+' : ''}${securityDelta.toFixed(1)}`);
  
  // Find new security issues
  const newSecurityIssues = featureIssues.filter((fi: any) => 
    fi.type === 'security' && 
    !mainIssues.some((mi: any) => mi.file === fi.file && mi.line === fi.line)
  );
  
  if (newSecurityIssues.length > 0) {
    logger.info(`\n  🚨 New Security Issues Introduced:`);
    newSecurityIssues.slice(0, 3).forEach((issue: any) => {
      logger.info(`    - ${issue.message} (${issue.file}:${issue.line})`);
    });
  }
}

async function testDeepWikiChatWithContext(mainReport: any, featureReport: any, prNumber: string): Promise<void> {
  logger.info('\n\n🤖 Testing DeepWiki Chat with Dual-Branch Context...\n');
  
  // This is where we would implement the chat functionality
  // For now, we'll simulate what it should do
  
  const analysisContext = {
    mainBranch: {
      issues: mainReport.issues.length,
      scores: mainReport.scores,
      criticalIssues: mainReport.issues.filter((i: any) => i.severity === 'critical').length
    },
    featureBranch: {
      issues: featureReport.issues.length,
      scores: featureReport.scores,
      criticalIssues: featureReport.issues.filter((i: any) => i.severity === 'critical').length
    },
    delta: {
      newIssues: featureReport.issues.length - mainReport.issues.length,
      securityScoreChange: (featureReport.scores?.security || 0) - (mainReport.scores?.security || 0),
      newCriticalIssues: featureReport.issues.filter((i: any) => i.severity === 'critical').length - 
                         mainReport.issues.filter((i: any) => i.severity === 'critical').length
    }
  };
  
  logger.info('📝 Analysis Context Prepared:');
  logger.info(`  - Main branch issues: ${analysisContext.mainBranch.issues}`);
  logger.info(`  - Feature branch issues: ${analysisContext.featureBranch.issues}`);
  logger.info(`  - New issues introduced: ${analysisContext.delta.newIssues}`);
  logger.info(`  - Security impact: ${analysisContext.delta.securityScoreChange > 0 ? 'Improved' : 'Degraded'}`);
  
  logger.info('\n💡 Chat API would answer questions like:');
  logger.info('  - "What are the security implications of this PR?"');
  logger.info('  - "Should we merge this PR based on the analysis?"');
  logger.info('  - "What are the most critical issues to fix?"');
  logger.info('  - "How does this PR impact our technical debt?"');
}

// Main execution
async function main() {
  // Test with a real PR
  const prUrl = process.argv[2] || 'https://github.com/sindresorhus/is/pull/170';
  
  const result = await testRealDeepWikiDualBranch(prUrl);
  
  if (result.success) {
    logger.info('\n✅ Real DeepWiki dual branch analysis completed successfully!');
    logger.info(`\n⏱️  Performance:`);
    logger.info(`  Main branch: ${(result.mainBranchTime! / 1000).toFixed(1)}s`);
    logger.info(`  Feature branch: ${(result.featureBranchTime! / 1000).toFixed(1)}s`);
    logger.info(`  Total: ${((result.mainBranchTime! + result.featureBranchTime!) / 1000).toFixed(1)}s`);
    logger.info(`  Vector DB stored: ${result.vectorDbStored ? '✅' : '❌'}`);
    
    logger.info('\n📋 Key Achievements:');
    logger.info('  ✅ Successfully generated DeepWiki reports for both branches');
    logger.info('  ✅ Used cloud DeepWiki deployment with dynamic model selection');
    logger.info('  ✅ Compared main vs feature branch analysis results');
    if (result.vectorDbStored) {
      logger.info('  ✅ Stored both reports in Vector DB for future reference');
    }
    
    logger.info('\n🎯 Next Steps:');
    logger.info('  1. Implement DeepWiki chat API integration');
    logger.info('  2. Build context injection for diff-aware responses');
    logger.info('  3. Create agent-based diff analyzer as fallback');
    logger.info('  4. Remove hardcoded models throughout codebase');
  } else {
    logger.error('\n❌ Test failed:', result.error);
  }
  
  process.exit(result.success ? 0 : 1);
}

// Run the test
main().catch(error => {
  logger.error('Unexpected error:', error);
  process.exit(1);
});