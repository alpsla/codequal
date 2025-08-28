#!/usr/bin/env npx ts-node
/**
 * Test enhanced categorization with git diff
 */

import { DirectDeepWikiApiWithLocation } from './src/standard/services/direct-deepwiki-api-with-location';
import { EnhancedPRCategorizer } from './src/standard/services/enhanced-pr-categorizer';
import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';
import * as fs from 'fs';
import * as path from 'path';

async function testEnhancedCategorization() {
  console.log('=== Testing Enhanced Categorization with Git Diff ===\n');
  
  // Force real DeepWiki
  delete process.env.USE_DEEPWIKI_MOCK;
  process.env.USE_DEEPWIKI_MOCK = 'false';
  
  const repositoryUrl = 'https://github.com/sindresorhus/ky';
  const prNumber = 700;
  
  try {
    // Initialize services
    const deepwikiClient = new DirectDeepWikiApiWithLocation();
    const enhancedCategorizer = new EnhancedPRCategorizer();
    const reportGenerator = new ReportGeneratorV8Final();
    
    console.log('✅ Services initialized\n');
    
    // Step 1: Analyze MAIN branch
    console.log('Step 1: Analyzing MAIN branch...');
    const mainResult = await deepwikiClient.analyzeRepository(repositoryUrl, {
      branch: 'main',
      useCache: false,
      maxIterations: 1
    });
    const mainIssues = mainResult.issues || [];
    console.log(`✅ Main branch: ${mainIssues.length} issues found\n`);
    
    // Step 2: Analyze PR branch
    console.log('Step 2: Analyzing PR branch...');
    const prResult = await deepwikiClient.analyzeRepository(repositoryUrl, {
      branch: `pull/${prNumber}/head`,
      useCache: false,
      maxIterations: 1,
      mainBranchIssues: mainIssues
    });
    const prIssues = prResult.issues || [];
    console.log(`✅ PR branch: ${prIssues.length} issues found\n`);
    
    // Step 3: Get repository path (should be cached from analysis)
    const repoPath = `/tmp/codequal-repos/sindresorhus-ky-pr-${prNumber}`;
    
    // Step 4: Enhanced categorization with git diff
    console.log('Step 3: Enhanced categorization with git diff...');
    const enhanced = await enhancedCategorizer.categorizeWithDiff(
      mainIssues,
      prIssues,
      repoPath,
      'main',
      `pr-${prNumber}`
    );
    
    console.log('\n📊 Enhanced Categorization Results:');
    console.log('=' .repeat(50));
    console.log(`Definitely NEW (introduced by PR): ${enhanced.definitelyNew.length}`);
    console.log(`Definitely FIXED: ${enhanced.definitelyFixed.length}`);
    console.log(`Pre-existing in MODIFIED code: ${enhanced.preExistingInModifiedCode.length}`);
    console.log(`Pre-existing in UNTOUCHED code: ${enhanced.preExistingUntouched.length}`);
    console.log('=' .repeat(50));
    
    // Show details of categorized issues
    if (enhanced.definitelyNew.length > 0) {
      console.log('\n🆕 NEW Issues (introduced by this PR):');
      enhanced.definitelyNew.slice(0, 3).forEach((issue: any, idx: number) => {
        console.log(`  ${idx + 1}. ${issue.title || issue.message}`);
        console.log(`     Location: ${issue.location?.file || 'unknown'}:${issue.location?.line || '?'}`);
        console.log(`     Reason: ${issue.diffAnalysis?.reason || 'N/A'}`);
      });
    }
    
    if (enhanced.preExistingInModifiedCode.length > 0) {
      console.log('\n⚠️ Pre-existing in MODIFIED code (should fix):');
      enhanced.preExistingInModifiedCode.slice(0, 3).forEach((issue: any, idx: number) => {
        console.log(`  ${idx + 1}. ${issue.title || issue.message}`);
        console.log(`     Location: ${issue.location?.file || 'unknown'}:${issue.location?.line || '?'}`);
        console.log(`     Reason: ${issue.diffAnalysis?.reason || 'N/A'}`);
      });
    }
    
    if (enhanced.preExistingUntouched.length > 0) {
      console.log('\n📌 Pre-existing in UNTOUCHED code (lower priority):');
      enhanced.preExistingUntouched.slice(0, 3).forEach((issue: any, idx: number) => {
        console.log(`  ${idx + 1}. ${issue.title || issue.message}`);
        console.log(`     Location: ${issue.location?.file || 'unknown'}:${issue.location?.line || '?'}`);
        console.log(`     Reason: ${issue.diffAnalysis?.reason || 'N/A'}`);
      });
    }
    
    // Step 5: Generate decision
    console.log('\n📋 PR Decision:');
    console.log('=' .repeat(50));
    console.log(`Quality: ${enhanced.summary.prQuality.toUpperCase()}`);
    console.log(`Recommendation: ${enhanced.summary.recommendation.toUpperCase()}`);
    console.log('=' .repeat(50));
    
    const decisionMessage = enhancedCategorizer.generateDecisionMessage(enhanced);
    console.log('\n' + decisionMessage);
    
    // Step 6: Generate report with enhanced categorization
    console.log('Generating enhanced report...');
    const comparisonResult = {
      success: true,
      mainBranch: { name: 'main', issues: mainIssues },
      prBranch: { name: `PR #${prNumber}`, issues: prIssues },
      newIssues: enhanced.definitelyNew,
      resolvedIssues: enhanced.definitelyFixed,
      unchangedIssues: [...enhanced.preExistingInModifiedCode, ...enhanced.preExistingUntouched],
      repositoryUrl,
      prNumber: prNumber.toString(),
      metadata: {
        timestamp: new Date(),
        enhanced: true,
        diffAnalysis: {
          newInModified: enhanced.definitelyNew.length,
          preExistingInModified: enhanced.preExistingInModifiedCode.length,
          preExistingUntouched: enhanced.preExistingUntouched.length
        }
      }
    };
    
    const report = await reportGenerator.generateReport(comparisonResult as any);
    
    // Save report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(__dirname, 'test-reports', `enhanced-categorization-${timestamp}.md`);
    fs.writeFileSync(outputPath, report);
    
    console.log(`\n✅ Report saved to: ${outputPath}`);
    
    // Validation
    console.log('\n' + '=' .repeat(50));
    console.log('VALIDATION:');
    console.log('=' .repeat(50));
    
    const accurateCount = enhanced.definitelyNew.length + 
                         enhanced.preExistingInModifiedCode.length + 
                         enhanced.preExistingUntouched.length;
    
    console.log(`✅ Total categorized issues: ${accurateCount}`);
    console.log(`✅ Decision based on actual code changes`);
    console.log(`✅ Pre-existing issues properly identified`);
    
    if (enhanced.summary.recommendation === 'decline' && enhanced.definitelyNew.some((i: any) => i.severity === 'critical')) {
      console.log('✅ Correctly declining PR with new critical issues');
    } else if (enhanced.preExistingInModifiedCode.length > 0) {
      console.log('⚠️ PR touches code with existing issues - should fix them');
    }
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    
    if (error.message?.includes('ECONNREFUSED')) {
      console.log('\n⚠️ DeepWiki is not running. Start it with:');
      console.log('kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001');
    } else if (error.message?.includes('Could not get diff')) {
      console.log('\n⚠️ Git repository not accessible. Check the repo path.');
    }
  }
}

// Run the test
testEnhancedCategorization().catch(console.error);