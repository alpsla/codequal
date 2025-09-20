#!/usr/bin/env npx ts-node

/**
 * V9 Template Validator Test Script
 *
 * Demonstrates the V9 template validator by testing it against
 * existing V9 reports and showing validation results.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { V9TemplateValidator, validateV9Report, isValidV9Report } from './v9-template-validator';

/**
 * Test the validator against a sample report
 */
async function testValidator() {
  console.log('🔍 V9 Template Validator Test\n');

  const validator = new V9TemplateValidator();

  // Test with the complete V9 report
  const reportPath = join(__dirname, '../reports/v9-complete-apache-kafka-pr-17620-2025-09-18.md');

  if (!existsSync(reportPath)) {
    console.error(`❌ Test report not found at: ${reportPath}`);
    return;
  }

  const reportContent = readFileSync(reportPath, 'utf-8');

  console.log(`📄 Testing report: ${reportPath}`);
  console.log(`📏 Report size: ${reportContent.length} characters\n`);

  // Perform validation
  console.log('⏳ Running validation...\n');
  const result = validateV9Report(reportContent);

  // Display results
  console.log('📊 VALIDATION RESULTS');
  console.log('====================');
  console.log(`Status: ${result.isValid ? '✅ VALID' : '❌ INVALID'}`);
  console.log(`Score: ${result.score}% (${result.foundSections}/${result.totalSections} sections)`);
  console.log(`Missing sections: ${result.missingSections.length}`);
  console.log(`Present sections: ${result.presentSections.length}\n`);

  if (result.missingSections.length > 0) {
    console.log('❌ MISSING REQUIRED SECTIONS:');
    console.log('==============================');
    result.missingSections.forEach((section, index) => {
      console.log(`${index + 1}. ${section.name} (ID: ${section.id})`);
      console.log(`   Description: ${section.description}`);
      console.log(`   Expected patterns: ${section.patterns.slice(0, 2).join(', ')}${section.patterns.length > 2 ? '...' : ''}\n`);
    });
  }

  console.log('✅ PRESENT SECTIONS:');
  console.log('====================');
  result.presentSections.slice(0, 10).forEach((section, index) => {
    console.log(`${index + 1}. ${section.name} (ID: ${section.id})`);
  });

  if (result.presentSections.length > 10) {
    console.log(`... and ${result.presentSections.length - 10} more sections\n`);
  } else {
    console.log('');
  }

  // Test minimum requirements
  const meetsMinimum90 = isValidV9Report(reportContent, 90);
  const meetsMinimum80 = isValidV9Report(reportContent, 80);
  const meetsMinimum70 = isValidV9Report(reportContent, 70);

  console.log('🎯 MINIMUM REQUIREMENTS CHECK:');
  console.log('==============================');
  console.log(`90% threshold: ${meetsMinimum90 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`80% threshold: ${meetsMinimum80 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`70% threshold: ${meetsMinimum70 ? '✅ PASS' : '❌ FAIL'}\n`);

  // Generate detailed validation report
  console.log('📝 DETAILED VALIDATION REPORT:');
  console.log('==============================');
  const detailedReport = validator.generateValidationReport(result);
  console.log(detailedReport);

  // Test specific sections validation
  console.log('\n🔍 TESTING SPECIFIC SECTIONS (Core Sections 1-10):');
  console.log('==================================================');
  const coreResult = validator.validateSpecificSections(reportContent, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  console.log(`Core sections score: ${coreResult.score}% (${coreResult.foundSections}/${coreResult.totalSections})`);

  return result;
}

/**
 * Test with a minimal report to show failures
 */
function testMinimalReport() {
  console.log('\n🧪 TESTING MINIMAL REPORT (Expected to fail):');
  console.log('============================================');

  const minimalReport = `
# Test Report

## Executive Summary
This is a test.

## Decision: APPROVED

That's it.
`;

  const result = validateV9Report(minimalReport);
  console.log(`Minimal report score: ${result.score}% (${result.foundSections}/${result.totalSections} sections)`);
  console.log(`Missing sections: ${result.missingSections.length}`);

  return result;
}

/**
 * Show all required sections for reference
 */
function showRequiredSections() {
  console.log('\n📋 ALL 34 REQUIRED V9 SECTIONS:');
  console.log('=================================');

  const validator = new V9TemplateValidator();
  const sectionNames = validator.getRequiredSectionNames();

  sectionNames.forEach((name, index) => {
    console.log(`${(index + 1).toString().padStart(2, '0')}. ${name}`);
  });

  console.log(`\nTotal: ${sectionNames.length} required sections\n`);
}

/**
 * Main test function
 */
async function main() {
  try {
    // Show required sections first
    showRequiredSections();

    // Test with complete report
    const result = await testValidator();

    // Test with minimal report
    testMinimalReport();

    // Final summary
    console.log('\n🎉 VALIDATION TESTING COMPLETE');
    console.log('==============================');
    console.log('The V9 Template Validator is ready for use!\n');

    // Usage examples
    console.log('💡 USAGE EXAMPLES:');
    console.log('==================');
    console.log('// Validate a report');
    console.log('const result = validateV9Report(reportContent);');
    console.log('console.log(`Score: ${result.score}%`);');
    console.log('');
    console.log('// Quick check');
    console.log('const isValid = isValidV9Report(reportContent, 90);');
    console.log('console.log(`Meets 90% threshold: ${isValid}`);');
    console.log('');
    console.log('// Generate detailed report');
    console.log('const validator = new V9TemplateValidator();');
    console.log('const detailedReport = validator.generateValidationReport(result);');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  main();
}

export { testValidator, testMinimalReport, showRequiredSections };