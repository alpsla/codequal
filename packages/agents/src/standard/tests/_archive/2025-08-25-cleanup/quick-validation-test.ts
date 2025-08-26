#!/usr/bin/env npx ts-node

/**
 * Quick Validation Test
 * 
 * Tests a single repository to quickly validate the entire pipeline
 */

import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  step: string;
  success: boolean;
  details: any;
  error?: string;
}

class QuickValidator {
  private results: TestResult[] = [];
  
  async runQuickTest() {
    console.log('🚀 Quick Pipeline Validation Test');
    console.log('=' .repeat(80));
    console.log('Repository: sindresorhus/ky');
    console.log('PR: #500');
    console.log('=' .repeat(80) + '\n');

    // Set up environment
    process.env.DEEPWIKI_API_KEY = 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f';
    process.env.USE_DEEPWIKI_MOCK = 'false';
    
    // Test each component
    await this.testDeepWiki();
    await this.testCompleteAnalysis();
    await this.validateReport();
    
    // Print summary
    this.printSummary();
  }

  private async testDeepWiki() {
    console.log('1️⃣ Testing DeepWiki API...');
    
    try {
      const { DeepWikiApiManager } = require('../../../dist/services/deepwiki-api-manager');
      const manager = new DeepWikiApiManager();
      
      const result = await manager.analyzeRepository('https://github.com/sindresorhus/ky');
      
      this.results.push({
        step: 'DeepWiki Analysis',
        success: result.issues.length > 0,
        details: {
          issuesFound: result.issues.length,
          score: result.scores?.overall,
          modelUsed: result.metadata?.model_used
        }
      });
      
      console.log(`   ✅ DeepWiki returned ${result.issues.length} issues`);
      console.log(`   📊 Score: ${result.scores?.overall || 'N/A'}/100`);
      
      // Show sample issues
      if (result.issues.length > 0) {
        console.log('   Sample issues:');
        result.issues.slice(0, 3).forEach((issue: any, idx: number) => {
          console.log(`     ${idx + 1}. ${issue.message} (${issue.severity})`);
          if (issue.file) {
            console.log(`        Location: ${issue.file}${issue.line ? ':' + issue.line : ''}`);
          }
        });
      }
      
    } catch (error: any) {
      this.results.push({
        step: 'DeepWiki Analysis',
        success: false,
        details: {},
        error: error.message
      });
      console.log(`   ❌ DeepWiki test failed: ${error.message}`);
    }
    
    console.log('');
  }

  private async testCompleteAnalysis() {
    console.log('2️⃣ Testing Complete Analysis Pipeline...');
    
    try {
      // Import the analysis runner
      const { CompleteAnalysisRunner } = require('../scripts/run-complete-analysis');
      
      const runner = new CompleteAnalysisRunner({ useMock: false });
      await runner.init();
      const result = await runner.run({
        repository: 'https://github.com/sindresorhus/ky',
        prNumber: 500,
        outputDir: path.join(__dirname, 'temp-test-output'),
        mock: false,
        saveToSupabase: false
      });
      
      this.results.push({
        step: 'Complete Analysis',
        success: result.success,
        details: {
          reportGenerated: !!result.report,
          prCommentGenerated: !!result.prComment,
          skillTracking: !!result.skillTracking
        }
      });
      
      console.log(`   ✅ Analysis completed`);
      console.log(`   📄 Report generated: ${result.report ? 'Yes' : 'No'}`);
      console.log(`   💬 PR comment generated: ${result.prComment ? 'Yes' : 'No'}`);
      console.log(`   📊 Skills tracked: ${result.skillTracking ? 'Yes' : 'No'}`);
      
      // Save the report for validation
      if (result.report) {
        const reportPath = path.join(__dirname, 'temp-test-output', 'pr-500-report.md');
        fs.mkdirSync(path.dirname(reportPath), { recursive: true });
        fs.writeFileSync(reportPath, result.report);
      }
      
    } catch (error: any) {
      this.results.push({
        step: 'Complete Analysis',
        success: false,
        details: {},
        error: error.message
      });
      console.log(`   ❌ Complete analysis failed: ${error.message}`);
    }
    
    console.log('');
  }

  private async validateReport() {
    console.log('3️⃣ Validating Generated Report...');
    
    const reportPath = path.join(__dirname, 'temp-test-output', 'pr-500-report.md');
    
    if (!fs.existsSync(reportPath)) {
      this.results.push({
        step: 'Report Validation',
        success: false,
        details: {},
        error: 'Report file not found'
      });
      console.log('   ❌ Report file not found');
      return;
    }
    
    const report = fs.readFileSync(reportPath, 'utf8');
    
    // Validation checks
    const checks = {
      hasTitle: report.includes('Pull Request Analysis Report'),
      hasAuthor: report.includes('sindresorhus') || report.includes('Sindresorhus'),
      hasPRNumber: report.includes('#500'),
      hasScore: /Score:\s*\d+\/100/.test(report),
      hasIssueCategories: report.includes('new issues') || report.includes('New Issues'),
      hasLocations: /\.(ts|js|py|go):\d+/.test(report) || report.includes('Location:'),
      hasEducation: report.includes('Educational') || report.includes('Learning'),
      hasSkills: report.includes('Skills') || report.includes('Developer'),
      hasActionItems: report.includes('Action Items') || report.includes('Recommendations'),
      hasSeverities: ['critical', 'high', 'medium', 'low'].some(s => report.toLowerCase().includes(s))
    };
    
    const allChecksPassed = Object.values(checks).every(v => v);
    
    this.results.push({
      step: 'Report Validation',
      success: allChecksPassed,
      details: checks
    });
    
    console.log('   Report Content Checks:');
    Object.entries(checks).forEach(([check, passed]) => {
      console.log(`     ${passed ? '✅' : '❌'} ${check}`);
    });
    
    // Extract key metrics
    const issueMatch = report.match(/(\d+)\s+new issues/i);
    const scoreMatch = report.match(/Score:\s*(\d+)\/100/i);
    
    if (issueMatch) {
      console.log(`\n   📊 New Issues Found: ${issueMatch[1]}`);
    }
    if (scoreMatch) {
      console.log(`   📊 Overall Score: ${scoreMatch[1]}/100`);
    }
    
    // Show a sample of the report
    console.log('\n   📄 Report Preview:');
    const lines = report.split('\n').slice(0, 20);
    lines.forEach(line => {
      if (line.trim()) {
        console.log(`      ${line.substring(0, 70)}${line.length > 70 ? '...' : ''}`);
      }
    });
    
    console.log('');
  }

  private printSummary() {
    console.log('=' .repeat(80));
    console.log('📊 VALIDATION SUMMARY');
    console.log('=' .repeat(80));
    
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.success).length;
    const successRate = (passedTests / totalTests * 100).toFixed(0);
    
    console.log(`\nOverall Success Rate: ${successRate}% (${passedTests}/${totalTests})\n`);
    
    this.results.forEach(result => {
      console.log(`${result.success ? '✅' : '❌'} ${result.step}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      if (result.success && result.details) {
        Object.entries(result.details).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            console.log(`   ${key}: ${value}`);
          }
        });
      }
    });
    
    // Overall verdict
    console.log('\n' + '=' .repeat(80));
    if (successRate === '100') {
      console.log('✅ All validation tests PASSED! The pipeline is working correctly.');
    } else if (parseInt(successRate) >= 75) {
      console.log('⚠️  Most tests passed but some issues need attention.');
    } else {
      console.log('❌ Pipeline validation FAILED. Please review the errors above.');
    }
    console.log('=' .repeat(80));
    
    // Clean up temp files
    const tempDir = path.join(__dirname, 'temp-test-output');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

// Run the quick validation
async function main() {
  const validator = new QuickValidator();
  await validator.runQuickTest();
}

main().catch(console.error);