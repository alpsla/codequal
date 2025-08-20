#!/usr/bin/env ts-node

/**
 * Test Location Validation
 * 
 * Validates that issue locations are accurate and actually contain
 * the type of code issues reported.
 */

import { LocationValidator } from './src/standard/services/location-validator';
import { DeepWikiApiWrapper } from './src/standard/services/deepwiki-api-wrapper';

async function testLocationValidation() {
  console.log('🔍 Testing Location Validation System\n');
  console.log('=' .repeat(80));
  
  const repoUrl = 'https://github.com/sindresorhus/ky';
  
  // Test with mock data first
  console.log('\n📊 Testing with Mock DeepWiki Data\n');
  
  process.env.USE_DEEPWIKI_MOCK = 'true';
  const wrapper = new DeepWikiApiWrapper();
  
  try {
    // Analyze main branch
    const mainAnalysis = await wrapper.analyzeRepository(repoUrl, {
      branch: 'main'
    });
    
    console.log(`Found ${mainAnalysis.issues.length} issues in main branch\n`);
    
    // Create validator
    const validator = new LocationValidator(repoUrl);
    
    // Prepare issues for validation
    const issuesToValidate = mainAnalysis.issues.map(issue => ({
      id: issue.id,
      title: issue.title,
      category: issue.category,
      severity: issue.severity,
      location: issue.location,
      description: issue.description,
      codeSnippet: (issue as any).codeSnippet || (issue as any).evidence?.snippet
    }));
    
    // Validate locations
    console.log('Validating issue locations...\n');
    const results = await validator.validateLocations(issuesToValidate);
    
    // Get statistics
    const stats = validator.getValidationStats(results);
    
    // Display results
    console.log('📈 Validation Statistics:');
    console.log(`   Total Issues: ${stats.total}`);
    console.log(`   Valid Locations: ${stats.valid} (${Math.round(stats.valid / stats.total * 100)}%)`);
    console.log(`   File Not Found: ${stats.fileNotFound}`);
    console.log(`   Line Not Found: ${stats.lineNotFound}`);
    console.log(`   Content Mismatch: ${stats.contentMismatch}`);
    console.log(`   Average Confidence: ${Math.round(stats.averageConfidence)}%`);
    console.log();
    
    // Show detailed results for each issue
    console.log('📋 Detailed Results:\n');
    
    for (const issue of issuesToValidate) {
      const result = results.get(issue.id)!;
      const status = result.isValid ? '✅' : '❌';
      
      console.log(`${status} ${issue.title}`);
      console.log(`   Location: ${issue.location.file}:${issue.location.line}`);
      console.log(`   Validation: ${result.isValid ? 'VALID' : 'INVALID'}`);
      
      if (!result.isValid) {
        console.log(`   Reason: ${result.reason}`);
      } else {
        console.log(`   Confidence: ${Math.round(result.confidence)}%`);
      }
      
      if (result.actualContent && result.isValid) {
        console.log(`   Actual code at location:`);
        const lines = result.actualContent.split('\n');
        lines.forEach((line, i) => {
          const lineNum = issue.location.line - 2 + i;
          const marker = lineNum === issue.location.line ? '>>>' : '   ';
          console.log(`     ${marker} ${lineNum}: ${line}`);
        });
      }
      console.log();
    }
    
    // Generate full report
    const report = validator.generateValidationReport(issuesToValidate, results);
    
    // Save report
    const fs = require('fs');
    const reportPath = './location-validation-report.md';
    fs.writeFileSync(reportPath, report);
    console.log(`\n📄 Full report saved to: ${reportPath}`);
    
    // Summary
    console.log('\n' + '=' .repeat(80));
    console.log('\n💡 Summary:\n');
    
    if (stats.valid / stats.total >= 0.8) {
      console.log('✅ Location accuracy is GOOD (80%+ valid)');
      console.log('   Most reported locations point to actual code issues');
    } else if (stats.valid / stats.total >= 0.5) {
      console.log('⚠️  Location accuracy is MODERATE (50-80% valid)');
      console.log('   Many locations need clarification');
    } else {
      console.log('❌ Location accuracy is POOR (<50% valid)');
      console.log('   Most locations are fake or incorrect');
      console.log('   LocationClarifier service should be used');
    }
    
    console.log('\n🔍 Key Findings:');
    if (stats.fileNotFound > 0) {
      console.log(`   - ${stats.fileNotFound} files don't exist in the repository`);
    }
    if (stats.lineNotFound > 0) {
      console.log(`   - ${stats.lineNotFound} line numbers are out of range`);
    }
    if (stats.contentMismatch > 0) {
      console.log(`   - ${stats.contentMismatch} locations have content that doesn't match the issue`);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testLocationValidation().catch(console.error);