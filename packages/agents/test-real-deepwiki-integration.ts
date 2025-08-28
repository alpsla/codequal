#!/usr/bin/env ts-node
import { ComparisonAgent } from './src/standard/comparison/comparison-agent';
import { DeepWikiApiWrapper } from './src/standard/services/deepwiki-api-wrapper';
import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';
import { promises as fs } from 'fs';

async function testRealDeepWikiIntegration() {
  console.log('🚀 Testing Real DeepWiki Integration (USE_DEEPWIKI_MOCK=false)\n');
  
  // Check environment
  const isUsingMock = process.env.USE_DEEPWIKI_MOCK === 'true';
  console.log(`📌 DeepWiki Mode: ${isUsingMock ? 'MOCK' : 'REAL'}`);
  console.log(`📌 DeepWiki URL: ${process.env.DEEPWIKI_API_URL || 'http://localhost:8001'}\n`);
  
  if (isUsingMock) {
    console.log('⚠️  Warning: USE_DEEPWIKI_MOCK=true - Set to false for real integration test');
    return;
  }
  
  try {
    // Test 1: Direct DeepWiki API call
    console.log('📝 Test 1: Direct DeepWiki API Call');
    console.log('─'.repeat(50));
    
    const deepwikiWrapper = new DeepWikiApiWrapper();
    
    // Use a small repository for faster testing
    const testRepo = 'https://github.com/sindresorhus/is-odd';
    console.log(`   Repository: ${testRepo}`);
    console.log('   Calling DeepWiki API...\n');
    
    const startTime = Date.now();
    const deepwikiResult = await deepwikiWrapper.analyzeRepository(testRepo);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log(`   ✅ DeepWiki responded in ${duration}s`);
    console.log(`   📊 Issues found: ${deepwikiResult.issues?.length || 0}`);
    
    if (deepwikiResult.issues && deepwikiResult.issues.length > 0) {
      console.log('\n   Sample issues:');
      deepwikiResult.issues.slice(0, 3).forEach((issue: any, idx: number) => {
        console.log(`   ${idx + 1}. ${issue.title || issue.message || 'Unknown issue'}`);
        console.log(`      Location: ${issue.location?.file || 'Unknown'} : ${issue.location?.line || '?'}`);
        console.log(`      Severity: ${issue.severity || 'unknown'}`);
      });
    }
    
    // Test 2: Location extraction
    console.log('\n📝 Test 2: Location Extraction');
    console.log('─'.repeat(50));
    
    let locationsFound = 0;
    let unknownLocations = 0;
    
    if (deepwikiResult.issues) {
      deepwikiResult.issues.forEach((issue: any) => {
        if (issue.location?.file && issue.location?.file !== 'unknown') {
          locationsFound++;
        } else {
          unknownLocations++;
        }
      });
    }
    
    console.log(`   ✅ Valid locations: ${locationsFound}`);
    console.log(`   ❌ Unknown locations: ${unknownLocations}`);
    console.log(`   📊 Location accuracy: ${locationsFound > 0 ? Math.round((locationsFound / (locationsFound + unknownLocations)) * 100) : 0}%`);
    
    // Test 3: Full pipeline with ComparisonAgent
    console.log('\n📝 Test 3: Full Pipeline Test');
    console.log('─'.repeat(50));
    
    const agent = new ComparisonAgent(deepwikiWrapper);
    const generator = new ReportGeneratorV8Final();
    
    console.log('   Running full analysis pipeline...');
    const comparisonResult = await agent.analyzePullRequest(
      testRepo,
      1, // Use PR #1 or any valid PR
      'main'
    );
    
    console.log(`   ✅ Analysis complete`);
    console.log(`   📊 Main branch issues: ${comparisonResult.mainIssues?.length || 0}`);
    console.log(`   📊 PR branch issues: ${comparisonResult.prIssues?.length || 0}`);
    console.log(`   🆕 New issues: ${comparisonResult.addedIssues?.length || 0}`);
    console.log(`   ✅ Fixed issues: ${comparisonResult.fixedIssues?.length || 0}`);
    
    // Test 4: Report generation with templates
    console.log('\n📝 Test 4: Template Matching');
    console.log('─'.repeat(50));
    
    const report = await generator.generateReport(comparisonResult);
    
    // Check template matching
    const templateMatches = (report.match(/Template Applied:/g) || []).length;
    const fixSuggestions = (report.match(/🔧 \*\*Fix Suggestion:\*\*/g) || []).length;
    const optionA = (report.match(/OPTION A:/g) || []).length;
    const optionB = (report.match(/OPTION B:/g) || []).length;
    
    console.log(`   📋 Templates applied: ${templateMatches}`);
    console.log(`   🔧 Fix suggestions: ${fixSuggestions}`);
    console.log(`   Ⓐ Option A fixes: ${optionA}`);
    console.log(`   Ⓑ Option B fixes: ${optionB}`);
    
    // Save report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = `test-reports/real-deepwiki-test-${timestamp}.md`;
    await fs.writeFile(reportPath, report);
    
    console.log(`\n   📄 Report saved to: ${reportPath}`);
    
    // Test 5: Security template matching
    console.log('\n📝 Test 5: Security Templates');
    console.log('─'.repeat(50));
    
    const securityKeywords = ['SQL', 'XSS', 'injection', 'security', 'vulnerability'];
    let securityIssues = 0;
    let securityTemplatesMatched = 0;
    
    if (comparisonResult.prIssues) {
      comparisonResult.prIssues.forEach((issue: any) => {
        const isSecurityIssue = securityKeywords.some(keyword => 
          (issue.title?.toLowerCase() || '').includes(keyword.toLowerCase()) ||
          (issue.message?.toLowerCase() || '').includes(keyword.toLowerCase())
        );
        
        if (isSecurityIssue) {
          securityIssues++;
          const issueInReport = report.includes(issue.title || issue.message || '');
          if (issueInReport) {
            const issueSection = report.substring(
              report.indexOf(issue.title || issue.message || ''),
              report.indexOf(issue.title || issue.message || '') + 1000
            );
            if (issueSection.includes('Template Applied:')) {
              securityTemplatesMatched++;
            }
          }
        }
      });
    }
    
    console.log(`   🔒 Security issues found: ${securityIssues}`);
    console.log(`   ✅ Security templates matched: ${securityTemplatesMatched}`);
    console.log(`   📊 Template coverage: ${securityIssues > 0 ? Math.round((securityTemplatesMatched / securityIssues) * 100) : 0}%`);
    
    // Summary
    console.log('\n' + '═'.repeat(50));
    console.log('📊 INTEGRATION TEST SUMMARY');
    console.log('═'.repeat(50));
    
    const allTestsPassed = 
      deepwikiResult.issues && 
      locationsFound > 0 &&
      comparisonResult.success &&
      fixSuggestions > 0;
    
    console.log(`\n🏆 Overall Status: ${allTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
    
    console.log('\nDetailed Results:');
    console.log(`   ✅ DeepWiki API: ${deepwikiResult.issues ? 'Working' : 'Failed'}`);
    console.log(`   ✅ Location Extraction: ${locationsFound > 0 ? 'Working' : 'Failed'}`);
    console.log(`   ✅ Comparison Agent: ${comparisonResult.success ? 'Working' : 'Failed'}`);
    console.log(`   ✅ Template System: ${templateMatches > 0 ? 'Working' : 'No templates matched'}`);
    console.log(`   ✅ Fix Generation: ${fixSuggestions > 0 ? 'Working' : 'No fixes generated'}`);
    
    if (!allTestsPassed) {
      console.log('\n⚠️  Some tests failed. Check DeepWiki configuration and API responses.');
    }
    
    return {
      success: allTestsPassed,
      stats: {
        issues: deepwikiResult.issues?.length || 0,
        locationsFound,
        unknownLocations,
        templateMatches,
        fixSuggestions
      }
    };
    
  } catch (error: any) {
    console.error('\n❌ Test failed with error:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n⚠️  DeepWiki is not accessible. Please ensure:');
      console.log('   1. DeepWiki pod is running: kubectl get pods -n codequal-dev');
      console.log('   2. Port forward is active: kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001');
    }
    
    throw error;
  }
}

// Run the test
testRealDeepWikiIntegration().catch(console.error);