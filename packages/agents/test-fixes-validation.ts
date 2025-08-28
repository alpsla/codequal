#!/usr/bin/env npx ts-node
/**
 * Test to validate both fixes:
 * 1. Real code snippets from DeepWiki (not placeholders)
 * 2. Option A/B recommendations display properly
 */

import { DirectDeepWikiApiWithLocation } from './src/standard/services/direct-deepwiki-api-with-location';
import { PRAnalysisCategorizer } from './src/standard/services/pr-analysis-categorizer';
import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';
import { SecurityTemplateLibrary } from './src/standard/services/security-template-library';
import * as fs from 'fs';
import * as path from 'path';

async function testFixesValidation() {
  console.log('=== Testing Code Snippet & Option A/B Fixes ===\n');
  
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
    
    // Step 1: Test with a small iteration to verify code snippets
    console.log('Step 1: Testing code snippet extraction...');
    const testResult = await deepwikiClient.analyzeRepository(repositoryUrl, {
      branch: 'main',
      useCache: false,
      maxIterations: 1
    });
    
    const issues = testResult.issues || [];
    console.log(`Found ${issues.length} issues\n`);
    
    // Check for real code snippets
    let hasRealSnippets = false;
    let hasPlaceholders = false;
    
    issues.forEach((issue: any, idx: number) => {
      if (idx < 3) { // Check first 3 issues
        console.log(`Issue ${idx + 1}: "${issue.title}"`);
        console.log(`  Location: ${issue.location?.file || 'unknown'}:${issue.location?.line || '?'}`);
        
        if (issue.codeSnippet) {
          console.log(`  Code Snippet: "${issue.codeSnippet.substring(0, 60)}..."`);
          
          // Check if it's a real snippet or placeholder
          const placeholderPatterns = [
            '// Code related to',
            '// Code that handles',
            '// Logic here',
            '// Network request logic',
            '// Authentication code',
            '// retry logic here'
          ];
          
          const isPlaceholder = placeholderPatterns.some(p => 
            issue.codeSnippet.toLowerCase().includes(p.toLowerCase())
          );
          
          if (isPlaceholder) {
            console.log(`  ❌ PLACEHOLDER DETECTED!`);
            hasPlaceholders = true;
          } else {
            console.log(`  ✅ Real code snippet`);
            hasRealSnippets = true;
          }
        } else {
          console.log(`  ⚠️ No code snippet`);
        }
        console.log('');
      }
    });
    
    // Step 2: Test Option A/B template application
    console.log('\nStep 2: Testing Option A/B recommendations...');
    
    // Create a test issue that should match SQL injection template
    const testIssue = {
      id: 'test-sql-1',
      title: 'SQL Injection vulnerability in user query',
      category: 'security',
      severity: 'critical',
      location: { 
        file: 'src/database/queries.ts', 
        line: 42,
        column: 10
      },
      codeSnippet: `const query = "SELECT * FROM users WHERE email = '" + userEmail + "'";`,
      description: 'User input directly concatenated into SQL query'
    };
    
    // Apply security template
    const fixSuggestion = await templateLibrary.generateFixForIssue(testIssue);
    
    if (fixSuggestion && fixSuggestion.fixedCode) {
      console.log('✅ Security template applied');
      
      // Check if Option A/B structure exists
      const hasOptionA = fixSuggestion.fixedCode.includes('// OPTION A:');
      const hasOptionB = fixSuggestion.fixedCode.includes('// OPTION B:');
      
      if (hasOptionA && hasOptionB) {
        console.log('✅ Option A/B structure detected in fix');
      } else {
        console.log('❌ Option A/B structure missing!');
        console.log('Fix preview:', fixSuggestion.fixedCode.substring(0, 100));
      }
    } else {
      console.log('⚠️ No fix suggestion generated');
    }
    
    // Step 3: Generate full report to test display
    console.log('\nStep 3: Generating report with fixes...');
    
    // Do a quick PR analysis
    const mainIssues = issues.slice(0, 3); // Use first 3 for testing
    const prIssues = issues.slice(1, 4); // Simulate some overlap
    
    const categorized = categorizer.categorizeIssues(mainIssues, prIssues);
    
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
        modelUsed: 'real-deepwiki-enhanced'
      }
    };
    
    const report = await reportGenerator.generateReport(comparisonResult);
    
    // Save report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(__dirname, 'test-reports', `fixes-validation-${timestamp}.md`);
    fs.writeFileSync(outputPath, report);
    
    console.log(`\n✅ Report saved to: ${outputPath}`);
    
    // Final validation
    console.log('\n=== VALIDATION RESULTS ===');
    console.log(`1. Code Snippets: ${hasRealSnippets && !hasPlaceholders ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   - Has real snippets: ${hasRealSnippets}`);
    console.log(`   - Has placeholders: ${hasPlaceholders}`);
    
    const reportHasOptionA = report.includes('Option A:') || report.includes('Drop-in Replacement');
    const reportHasOptionB = report.includes('Option B:') || report.includes('Refactored Approach');
    console.log(`2. Option A/B Display: ${reportHasOptionA && reportHasOptionB ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   - Option A in report: ${reportHasOptionA}`);
    console.log(`   - Option B in report: ${reportHasOptionB}`);
    
    if (!hasRealSnippets || hasPlaceholders) {
      console.log('\n⚠️ Code snippets still showing placeholders!');
      console.log('The DeepWiki prompt changes may need more emphasis or');
      console.log('DeepWiki itself may need to be restarted to pick up changes.');
    }
    
    if (!reportHasOptionA || !reportHasOptionB) {
      console.log('\n⚠️ Option A/B not displaying properly in report!');
      console.log('Check if security templates are being applied correctly.');
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
testFixesValidation().catch(console.error);