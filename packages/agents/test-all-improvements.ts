#!/usr/bin/env npx ts-node
/**
 * Comprehensive test for all improvements:
 * 1. Breaking changes prioritization
 * 2. Real code snippets (not placeholders)
 * 3. Option A/B recommendations
 * 4. Finding ALL critical issues (not limited to 10)
 */

import { DirectDeepWikiApiWithLocation } from './src/standard/services/direct-deepwiki-api-with-location';
import { PRAnalysisCategorizer } from './src/standard/services/pr-analysis-categorizer';
import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';
import { SecurityTemplateLibrary } from './src/standard/services/security-template-library';
import * as fs from 'fs';
import * as path from 'path';

async function testAllImprovements() {
  console.log('=== Testing All Improvements ===\n');
  console.log('1. Breaking changes prioritization');
  console.log('2. Real code snippets extraction');
  console.log('3. Option A/B recommendations');
  console.log('4. Finding ALL critical issues\n');
  
  // Force real DeepWiki
  delete process.env.USE_DEEPWIKI_MOCK;
  process.env.USE_DEEPWIKI_MOCK = 'false';
  
  const repositoryUrl = 'https://github.com/sindresorhus/ky';
  const prNumber = 700;
  
  try {
    // Initialize services
    const deepwikiClient = new DirectDeepWikiApiWithLocation();
    const categorizer = new PRAnalysisCategorizer();
    const reportGenerator = new ReportGeneratorV8Final();
    const templateLibrary = new SecurityTemplateLibrary();
    
    console.log('✅ Services initialized\n');
    
    // Step 1: Analyze MAIN branch
    console.log('Step 1: Analyzing MAIN branch...');
    const mainResult = await deepwikiClient.analyzeRepository(repositoryUrl, {
      branch: 'main',
      useCache: false,
      maxIterations: 2 // More iterations to find more issues
    });
    
    const mainIssues = mainResult.issues || [];
    console.log(`✅ Main branch: ${mainIssues.length} issues found\n`);
    
    // Validation 1: Check for breaking changes category
    const breakingChanges = mainIssues.filter((i: any) => 
      i.category === 'breaking-change' || 
      i.title?.toLowerCase().includes('breaking')
    );
    console.log(`🔍 Breaking changes found: ${breakingChanges.length}`);
    
    // Validation 2: Check for real code snippets
    let realSnippets = 0;
    let placeholders = 0;
    const placeholderPatterns = [
      '// Code',
      '// Logic',
      '// retry',
      '// auth',
      'code here',
      'logic here'
    ];
    
    mainIssues.forEach((issue: any) => {
      if (issue.codeSnippet) {
        const isPlaceholder = placeholderPatterns.some(p => 
          issue.codeSnippet.toLowerCase().includes(p.toLowerCase())
        );
        if (isPlaceholder) {
          placeholders++;
        } else {
          realSnippets++;
        }
      }
    });
    
    console.log(`📝 Code snippets: ${realSnippets} real, ${placeholders} placeholders`);
    
    // Validation 3: Check issue count (should be more than 10 if many critical issues)
    const criticalCount = mainIssues.filter((i: any) => i.severity === 'critical').length;
    const highCount = mainIssues.filter((i: any) => i.severity === 'high').length;
    console.log(`⚠️ Severity distribution: ${criticalCount} critical, ${highCount} high`);
    
    // Step 2: Analyze PR branch
    console.log('\nStep 2: Analyzing PR branch...');
    const prResult = await deepwikiClient.analyzeRepository(repositoryUrl, {
      branch: `pull/${prNumber}/head`,
      useCache: false,
      maxIterations: 2,
      mainBranchIssues: mainIssues
    });
    
    const prIssues = prResult.issues || [];
    console.log(`✅ PR branch: ${prIssues.length} issues found\n`);
    
    // Step 3: Categorize
    console.log('Step 3: Categorizing issues...');
    const categorized = categorizer.categorizeIssues(mainIssues, prIssues);
    
    console.log(`📊 Results:`);
    console.log(`  NEW: ${categorized.summary.totalNew}`);
    console.log(`  FIXED: ${categorized.summary.totalFixed}`);
    console.log(`  UNCHANGED: ${categorized.summary.totalUnchanged}\n`);
    
    // Step 4: Test security templates with Option A/B
    console.log('Step 4: Testing Option A/B security templates...');
    
    // Find a security issue to apply template to
    const securityIssue = [...categorized.newIssues, ...categorized.unchangedIssues]
      .find((item: any) => {
        const issue = item.issue || item;
        return issue.category === 'security' || 
               issue.title?.toLowerCase().includes('injection') ||
               issue.title?.toLowerCase().includes('xss');
      });
    
    if (securityIssue) {
      const issue = securityIssue.issue || securityIssue;
      console.log(`🔐 Applying template to: "${issue.title}"`);
      
      const fix = templateLibrary.generateFix(issue);
      if (fix?.code) {
        const hasOptionA = fix.code.includes('// OPTION A:');
        const hasOptionB = fix.code.includes('// OPTION B:');
        console.log(`  Option A present: ${hasOptionA ? '✅' : '❌'}`);
        console.log(`  Option B present: ${hasOptionB ? '✅' : '❌'}`);
      }
    } else {
      console.log('⚠️ No security issues found to test templates');
    }
    
    // Step 5: Generate report
    console.log('\nStep 5: Generating comprehensive report...');
    const comparisonResult = {
      success: true,
      mainBranch: { name: 'main', issues: mainIssues },
      prBranch: { name: `PR #${prNumber}`, issues: prIssues },
      newIssues: categorized.newIssues?.map((item: any) => item.issue || item) || [],
      resolvedIssues: categorized.fixedIssues?.map((item: any) => item.issue || item) || [],
      unchangedIssues: categorized.unchangedIssues?.map((item: any) => item.issue || item) || [],
      repositoryUrl,
      prNumber: prNumber.toString(),
      metadata: {
        analysisDate: new Date().toISOString(),
        modelUsed: 'enhanced-deepwiki-v2',
        improvements: [
          'Breaking changes prioritization',
          'Real code snippets',
          'Option A/B fixes',
          'Unlimited critical issues'
        ]
      }
    };
    
    const report = await reportGenerator.generateReport(comparisonResult);
    
    // Save report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(__dirname, 'test-reports', `all-improvements-${timestamp}.md`);
    fs.writeFileSync(outputPath, report);
    
    console.log(`\n✅ Report saved to: ${outputPath}`);
    
    // Final validation summary
    console.log('\n' + '='.repeat(50));
    console.log('VALIDATION SUMMARY');
    console.log('='.repeat(50));
    
    const passBreaking = breakingChanges.length > 0 || mainIssues.some((i: any) => 
      i.category === 'breaking-change'
    );
    console.log(`1. Breaking Changes Priority: ${passBreaking ? '✅ DETECTED' : '⚠️ NOT FOUND (may not exist)'}`);
    
    const passSnippets = realSnippets > 0 && placeholders === 0;
    console.log(`2. Real Code Snippets: ${passSnippets ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   - Real: ${realSnippets}, Placeholders: ${placeholders}`);
    
    const passOptionAB = report.includes('Option A:') && report.includes('Option B:');
    console.log(`3. Option A/B Display: ${passOptionAB ? '✅ PASS' : '❌ FAIL'}`);
    
    const passUnlimited = mainIssues.length > 10 || criticalCount > 5;
    console.log(`4. Unlimited Critical Issues: ${passUnlimited ? '✅ PASS' : '⚠️ CHECK'}`);
    console.log(`   - Total issues: ${mainIssues.length}`);
    console.log(`   - Critical: ${criticalCount}, High: ${highCount}`);
    
    // Overall status
    const allPass = passSnippets && passOptionAB;
    console.log('\n' + '='.repeat(50));
    console.log(`OVERALL: ${allPass ? '✅ ALL CRITICAL TESTS PASS' : '❌ SOME TESTS FAILED'}`);
    console.log('='.repeat(50));
    
    if (!passSnippets) {
      console.log('\n⚠️ ACTION REQUIRED: Code snippets still showing placeholders.');
      console.log('   DeepWiki may need to be restarted to pick up prompt changes.');
    }
    
    if (!passOptionAB) {
      console.log('\n⚠️ ACTION REQUIRED: Option A/B not displaying in report.');
      console.log('   Check if security issues are being matched by templates.');
    }
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    
    if (error.message?.includes('ECONNREFUSED')) {
      console.log('\n⚠️ DeepWiki is not running. Start it with:');
      console.log('kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001');
    }
  }
}

// Run the test
testAllImprovements().catch(console.error);