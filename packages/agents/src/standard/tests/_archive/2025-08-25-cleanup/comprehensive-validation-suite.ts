#!/usr/bin/env npx ts-node

/**
 * Comprehensive Validation Suite for CodeQual Pipeline
 * 
 * Tests different repository types, sizes, and languages to ensure
 * all services are working correctly together.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Test repositories with different characteristics
const TEST_REPOSITORIES = [
  {
    name: 'Small TypeScript',
    repo: 'https://github.com/sindresorhus/ky',
    pr: 500,
    language: 'typescript',
    size: 'small',
    expectedModel: 'openai/gpt-4o-mini',
    expectedIssueCount: { min: 5, max: 20 },
    expectedSeverities: ['high', 'medium', 'low']
  },
  {
    name: 'Medium Python',
    repo: 'https://github.com/psf/requests',
    pr: 6432,
    language: 'python',
    size: 'medium',
    expectedModel: 'openai/gpt-4o',
    expectedIssueCount: { min: 10, max: 30 },
    expectedSeverities: ['critical', 'high', 'medium', 'low']
  },
  {
    name: 'Large JavaScript',
    repo: 'https://github.com/facebook/react',
    pr: 28000,
    language: 'javascript',
    size: 'large',
    expectedModel: 'anthropic/claude-3-5-sonnet-20241022',
    expectedIssueCount: { min: 15, max: 50 },
    expectedSeverities: ['critical', 'high', 'medium', 'low']
  },
  {
    name: 'Small Go',
    repo: 'https://github.com/gin-gonic/gin',
    pr: 3800,
    language: 'go',
    size: 'small',
    expectedModel: 'openai/gpt-4o-mini',
    expectedIssueCount: { min: 5, max: 20 },
    expectedSeverities: ['high', 'medium', 'low']
  }
];

// Validation criteria
interface ValidationResult {
  repository: string;
  passed: boolean;
  checks: {
    deepwikiAnalysis: boolean;
    locationFinder: boolean;
    issueCategories: boolean;
    educationalContent: boolean;
    skillsCalculation: boolean;
    reportGeneration: boolean;
    modelSelection: boolean;
  };
  details: {
    issuesFound: number;
    newIssues: number;
    fixedIssues: number;
    unchangedIssues: number;
    hasLocations: boolean;
    hasEducation: boolean;
    hasSkills: boolean;
    modelUsed: string;
    reportScore: number;
  };
  errors: string[];
}

class ComprehensiveValidator {
  private resultsDir: string;
  private validationResults: ValidationResult[] = [];

  constructor() {
    const timestamp = new Date().toISOString().split('T')[0];
    this.resultsDir = path.join(__dirname, '..', 'reports', 'validation', timestamp);
    if (!fs.existsSync(this.resultsDir)) {
      fs.mkdirSync(this.resultsDir, { recursive: true });
    }
  }

  async runValidationSuite() {
    console.log('🚀 Starting Comprehensive Validation Suite');
    console.log('=' .repeat(80));
    console.log(`Results directory: ${this.resultsDir}\n`);

    // Set up environment
    process.env.DEEPWIKI_API_KEY = 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f';
    process.env.USE_DEEPWIKI_MOCK = 'false';
    process.env.ENABLE_LOCATION_FINDER = 'true';
    process.env.ENABLE_EDUCATOR = 'true';

    for (const testRepo of TEST_REPOSITORIES) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Testing: ${testRepo.name}`);
      console.log(`Repository: ${testRepo.repo}`);
      console.log(`PR: #${testRepo.pr}`);
      console.log(`Expected Model: ${testRepo.expectedModel}`);
      console.log('=' .repeat(80));

      const result = await this.validateRepository(testRepo);
      this.validationResults.push(result);

      // Show quick summary
      this.printQuickSummary(result);

      // Save individual report
      this.saveRepositoryReport(testRepo, result);

      // Add delay between tests to avoid rate limiting
      await this.delay(5000);
    }

    // Generate comprehensive report
    this.generateFinalReport();
  }

  private async validateRepository(testRepo: any): Promise<ValidationResult> {
    const result: ValidationResult = {
      repository: testRepo.repo,
      passed: false,
      checks: {
        deepwikiAnalysis: false,
        locationFinder: false,
        issueCategories: false,
        educationalContent: false,
        skillsCalculation: false,
        reportGeneration: false,
        modelSelection: false
      },
      details: {
        issuesFound: 0,
        newIssues: 0,
        fixedIssues: 0,
        unchangedIssues: 0,
        hasLocations: false,
        hasEducation: false,
        hasSkills: false,
        modelUsed: '',
        reportScore: 0
      },
      errors: []
    };

    try {
      // Run the complete analysis
      const outputDir = path.join(this.resultsDir, testRepo.name.replace(/\s+/g, '-'));
      const command = `cd ${__dirname}/.. && npx ts-node scripts/run-complete-analysis.ts --repo ${testRepo.repo} --pr ${testRepo.pr} --output ${outputDir}`;
      
      console.log('📊 Running analysis...');
      const output = execSync(command, {
        encoding: 'utf8',
        env: { ...process.env },
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });

      // Parse the output
      this.parseAnalysisOutput(output, result);

      // Read and validate the generated report
      const reportPath = path.join(outputDir, `pr-${testRepo.pr}-report.md`);
      if (fs.existsSync(reportPath)) {
        const report = fs.readFileSync(reportPath, 'utf8');
        this.validateReport(report, result, testRepo);
      } else {
        result.errors.push('Report file not generated');
      }

      // Read and validate the PR comment
      const commentPath = path.join(outputDir, `pr-${testRepo.pr}-comment.md`);
      if (fs.existsSync(commentPath)) {
        const comment = fs.readFileSync(commentPath, 'utf8');
        this.validatePRComment(comment, result);
      }

    } catch (error: any) {
      result.errors.push(`Analysis failed: ${error.message}`);
      console.error('❌ Analysis error:', error.message);
    }

    // Determine if test passed
    result.passed = this.determineTestSuccess(result);

    return result;
  }

  private parseAnalysisOutput(output: string, result: ValidationResult) {
    // Extract key information from console output
    const lines = output.split('\n');
    
    for (const line of lines) {
      // Check for DeepWiki analysis
      if (line.includes('DeepWiki API analysis completed')) {
        result.checks.deepwikiAnalysis = true;
      }

      // Check for model selection
      if (line.includes('Selected models')) {
        const modelMatch = line.match(/Primary: (\S+)/);
        if (modelMatch) {
          result.details.modelUsed = modelMatch[1];
        }
      }

      // Check for issue counts
      if (line.includes('Issues found:')) {
        const countMatch = line.match(/Issues found: (\d+)/);
        if (countMatch) {
          result.details.issuesFound = parseInt(countMatch[1]);
        }
      }

      // Check for location finder
      if (line.includes('Using AI-enhanced location finder') || 
          line.includes('Using pattern-based location finder')) {
        result.checks.locationFinder = true;
      }

      // Check for educator agent
      if (line.includes('Educational content generated')) {
        result.checks.educationalContent = true;
      }
    }
  }

  private validateReport(report: string, result: ValidationResult, testRepo: any) {
    // Check report generation
    if (report.length > 1000) {
      result.checks.reportGeneration = true;
    }

    // Validate issue categories
    const newIssuesMatch = report.match(/(\d+) new issues/i);
    const fixedIssuesMatch = report.match(/(\d+) resolved issues/i);
    const unchangedMatch = report.match(/(\d+) unchanged issues/i);

    if (newIssuesMatch) {
      result.details.newIssues = parseInt(newIssuesMatch[1]);
    }
    if (fixedIssuesMatch) {
      result.details.fixedIssues = parseInt(fixedIssuesMatch[1]);
    }
    if (unchangedMatch) {
      result.details.unchangedIssues = parseInt(unchangedMatch[1]);
    }

    if (result.details.newIssues >= 0 && result.details.fixedIssues >= 0) {
      result.checks.issueCategories = true;
    }

    // Check for locations
    const hasFileLocations = report.includes('.ts:') || report.includes('.js:') || 
                            report.includes('.py:') || report.includes('.go:') ||
                            report.includes('Location:') || report.includes('File:');
    result.details.hasLocations = hasFileLocations;
    if (hasFileLocations) {
      result.checks.locationFinder = true;
    }

    // Check for educational content
    const hasEducation = report.includes('Educational Insights') || 
                        report.includes('Learning Opportunities') ||
                        report.includes('Training Resources');
    result.details.hasEducation = hasEducation;
    if (hasEducation) {
      result.checks.educationalContent = true;
    }

    // Check for skills tracking
    const hasSkills = report.includes('Skills Analysis') || 
                     report.includes('Developer Skills') ||
                     report.includes('Skill Impact');
    result.details.hasSkills = hasSkills;
    if (hasSkills) {
      result.checks.skillsCalculation = true;
    }

    // Extract report score
    const scoreMatch = report.match(/Overall Score:\s*(\d+)\/100/);
    if (scoreMatch) {
      result.details.reportScore = parseInt(scoreMatch[1]);
    }

    // Validate model selection
    if (result.details.modelUsed.includes(testRepo.expectedModel)) {
      result.checks.modelSelection = true;
    }

    // Validate expected severities
    for (const severity of testRepo.expectedSeverities) {
      if (!report.toLowerCase().includes(severity)) {
        result.errors.push(`Missing expected severity: ${severity}`);
      }
    }
  }

  private validatePRComment(comment: string, result: ValidationResult) {
    // Validate PR comment has essential elements
    const hasDecision = comment.includes('Decision:') || comment.includes('PR Decision:');
    const hasScore = comment.includes('Score:') || comment.includes('Overall Score:');
    const hasSummary = comment.includes('Issue Summary') || comment.includes('Summary');

    if (!hasDecision) result.errors.push('PR comment missing decision');
    if (!hasScore) result.errors.push('PR comment missing score');
    if (!hasSummary) result.errors.push('PR comment missing summary');
  }

  private determineTestSuccess(result: ValidationResult): boolean {
    // Check if all critical checks passed
    const criticalChecks = [
      result.checks.deepwikiAnalysis,
      result.checks.reportGeneration,
      result.checks.issueCategories
    ];

    const allCriticalPassed = criticalChecks.every(check => check);
    
    // Check if we have reasonable issue counts
    const hasIssues = result.details.issuesFound > 0;
    
    // Check if there are no critical errors
    const noCriticalErrors = result.errors.filter(e => 
      e.includes('failed') || e.includes('error')
    ).length === 0;

    return allCriticalPassed && hasIssues && noCriticalErrors;
  }

  private printQuickSummary(result: ValidationResult) {
    console.log('\n📋 Quick Summary:');
    console.log(`  Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`  Issues Found: ${result.details.issuesFound}`);
    console.log(`  New/Fixed/Unchanged: ${result.details.newIssues}/${result.details.fixedIssues}/${result.details.unchangedIssues}`);
    console.log(`  Model Used: ${result.details.modelUsed}`);
    console.log(`  Report Score: ${result.details.reportScore}/100`);
    
    console.log('\n  Checks:');
    Object.entries(result.checks).forEach(([check, passed]) => {
      console.log(`    ${passed ? '✅' : '❌'} ${check}`);
    });

    if (result.errors.length > 0) {
      console.log('\n  ⚠️  Errors:');
      result.errors.forEach(error => console.log(`    - ${error}`));
    }
  }

  private saveRepositoryReport(testRepo: any, result: ValidationResult) {
    const reportPath = path.join(this.resultsDir, `${testRepo.name.replace(/\s+/g, '-')}-validation.json`);
    fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));
  }

  private generateFinalReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 FINAL VALIDATION REPORT');
    console.log('='.repeat(80));

    const totalTests = this.validationResults.length;
    const passedTests = this.validationResults.filter(r => r.passed).length;
    const successRate = (passedTests / totalTests * 100).toFixed(1);

    console.log(`\n✅ Success Rate: ${successRate}% (${passedTests}/${totalTests})`);

    // Service Health Check
    console.log('\n🏥 Service Health Check:');
    const services = [
      'deepwikiAnalysis',
      'locationFinder',
      'issueCategories',
      'educationalContent',
      'skillsCalculation',
      'reportGeneration',
      'modelSelection'
    ];

    services.forEach(service => {
      const working = this.validationResults.filter(r => r.checks[service as keyof typeof r.checks]).length;
      const percentage = (working / totalTests * 100).toFixed(0);
      const status = working === totalTests ? '✅' : working > 0 ? '⚠️' : '❌';
      console.log(`  ${status} ${service}: ${percentage}% (${working}/${totalTests})`);
    });

    // Repository-specific results
    console.log('\n📝 Repository Results:');
    this.validationResults.forEach(result => {
      const repoName = result.repository.split('/').slice(-2).join('/');
      console.log(`\n  ${repoName}:`);
      console.log(`    Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
      console.log(`    Issues: ${result.details.issuesFound} (New: ${result.details.newIssues}, Fixed: ${result.details.fixedIssues})`);
      console.log(`    Features: Locations: ${result.details.hasLocations ? '✅' : '❌'}, Education: ${result.details.hasEducation ? '✅' : '❌'}, Skills: ${result.details.hasSkills ? '✅' : '❌'}`);
    });

    // Generate markdown report
    this.generateMarkdownReport();

    console.log('\n✨ Validation complete!');
    console.log(`📁 Reports saved to: ${this.resultsDir}`);
  }

  private generateMarkdownReport() {
    const reportPath = path.join(this.resultsDir, 'VALIDATION_REPORT.md');
    
    let markdown = `# CodeQual Pipeline Validation Report

**Date:** ${new Date().toISOString()}
**Test Count:** ${this.validationResults.length}

## Executive Summary

- **Success Rate:** ${(this.validationResults.filter(r => r.passed).length / this.validationResults.length * 100).toFixed(1)}%
- **Repositories Tested:** ${this.validationResults.length}
- **Total Issues Found:** ${this.validationResults.reduce((sum, r) => sum + r.details.issuesFound, 0)}

## Service Health

| Service | Status | Success Rate |
|---------|--------|--------------|
`;

    const services = [
      'deepwikiAnalysis',
      'locationFinder',
      'issueCategories',
      'educationalContent',
      'skillsCalculation',
      'reportGeneration',
      'modelSelection'
    ];

    services.forEach(service => {
      const working = this.validationResults.filter(r => r.checks[service as keyof typeof r.checks]).length;
      const percentage = (working / this.validationResults.length * 100).toFixed(0);
      const status = working === this.validationResults.length ? '✅' : working > 0 ? '⚠️' : '❌';
      markdown += `| ${service} | ${status} | ${percentage}% |\n`;
    });

    markdown += `
## Repository Test Results

`;

    this.validationResults.forEach(result => {
      const repoName = result.repository.split('/').slice(-2).join('/');
      markdown += `### ${repoName}

- **Status:** ${result.passed ? '✅ PASSED' : '❌ FAILED'}
- **Model Used:** ${result.details.modelUsed}
- **Issues Found:** ${result.details.issuesFound}
- **Issue Categories:** New (${result.details.newIssues}), Fixed (${result.details.fixedIssues}), Unchanged (${result.details.unchangedIssues})
- **Report Score:** ${result.details.reportScore}/100
- **Features:**
  - Location Finder: ${result.details.hasLocations ? '✅' : '❌'}
  - Educational Content: ${result.details.hasEducation ? '✅' : '❌'}
  - Skills Tracking: ${result.details.hasSkills ? '✅' : '❌'}

`;

      if (result.errors.length > 0) {
        markdown += `**Errors:**\n`;
        result.errors.forEach(error => {
          markdown += `- ${error}\n`;
        });
        markdown += '\n';
      }
    });

    markdown += `
## Recommendations

1. ${this.validationResults.some(r => !r.checks.locationFinder) ? 'Fix location finder service for better issue tracking' : 'Location finder working well'}
2. ${this.validationResults.some(r => !r.checks.educationalContent) ? 'Improve educational content generation' : 'Educational content generation working'}
3. ${this.validationResults.some(r => !r.checks.skillsCalculation) ? 'Review skills calculation logic' : 'Skills calculation working correctly'}

## Next Steps

- Review failed tests and fix identified issues
- Re-run validation suite after fixes
- Monitor service health in production
`;

    fs.writeFileSync(reportPath, markdown);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run the validation suite
async function main() {
  const validator = new ComprehensiveValidator();
  await validator.runValidationSuite();
}

main().catch(console.error);