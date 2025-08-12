#!/usr/bin/env npx ts-node

/**
 * Multi-Language Validation Test Suite
 * Tests the scoring system against various languages and repo sizes
 */

import { ReportGeneratorV7EnhancedComplete } from './src/standard/comparison/report-generator-v7-enhanced-complete';
import { ComparisonResult } from './src/standard/types/analysis-types';
import * as fs from 'fs';
import * as path from 'path';

interface TestRepository {
  name: string;
  language: string;
  size: 'small' | 'medium' | 'large';
  url: string;
  expectedCharacteristics: {
    hasSecurityIssues?: boolean;
    hasPerformanceIssues?: boolean;
    hasCodeQualityIssues?: boolean;
    complexity: 'low' | 'medium' | 'high';
  };
}

const TEST_REPOSITORIES: TestRepository[] = [
  // Go repositories
  {
    name: 'gin-gonic/gin',
    language: 'Go',
    size: 'medium',
    url: 'https://github.com/gin-gonic/gin',
    expectedCharacteristics: {
      hasCodeQualityIssues: true,
      complexity: 'medium'
    }
  },
  {
    name: 'hashicorp/terraform',
    language: 'Go',
    size: 'large',
    url: 'https://github.com/hashicorp/terraform',
    expectedCharacteristics: {
      hasSecurityIssues: true,
      complexity: 'high'
    }
  },
  
  // Rare/Less common languages
  {
    name: 'elixir-lang/elixir',
    language: 'Elixir',
    size: 'medium',
    url: 'https://github.com/elixir-lang/elixir',
    expectedCharacteristics: {
      hasCodeQualityIssues: true,
      complexity: 'medium'
    }
  },
  {
    name: 'crystal-lang/crystal',
    language: 'Crystal',
    size: 'medium',
    url: 'https://github.com/crystal-lang/crystal',
    expectedCharacteristics: {
      complexity: 'high'
    }
  },
  {
    name: 'nim-lang/Nim',
    language: 'Nim',
    size: 'medium',
    url: 'https://github.com/nim-lang/Nim',
    expectedCharacteristics: {
      complexity: 'high'
    }
  },
  
  // Small repositories (good for quick tests)
  {
    name: 'sindresorhus/is-odd',
    language: 'JavaScript',
    size: 'small',
    url: 'https://github.com/sindresorhus/is-odd',
    expectedCharacteristics: {
      complexity: 'low'
    }
  },
  {
    name: 'sindresorhus/is-even',
    language: 'JavaScript',
    size: 'small',
    url: 'https://github.com/sindresorhus/is-even',
    expectedCharacteristics: {
      complexity: 'low'
    }
  },
  
  // Large repositories
  {
    name: 'kubernetes/kubernetes',
    language: 'Go',
    size: 'large',
    url: 'https://github.com/kubernetes/kubernetes',
    expectedCharacteristics: {
      hasSecurityIssues: true,
      hasPerformanceIssues: true,
      complexity: 'high'
    }
  },
  {
    name: 'rust-lang/rust',
    language: 'Rust',
    size: 'large',
    url: 'https://github.com/rust-lang/rust',
    expectedCharacteristics: {
      complexity: 'high'
    }
  }
];

/**
 * Creates mock comparison data for a repository
 */
function createMockComparisonData(repo: TestRepository): ComparisonResult {
  const issues = [];
  
  // Add realistic issues based on repo characteristics
  if (repo.expectedCharacteristics.hasSecurityIssues) {
    issues.push({
      id: `SEC-${repo.name}-001`,
      severity: 'high',
      category: 'security',
      message: `Potential security vulnerability in ${repo.language} code`,
      location: { file: `src/main.${repo.language.toLowerCase()}`, line: 100 }
    });
  }
  
  if (repo.expectedCharacteristics.hasPerformanceIssues) {
    issues.push({
      id: `PERF-${repo.name}-001`,
      severity: 'medium',
      category: 'performance',
      message: `Performance bottleneck detected in ${repo.language} implementation`,
      location: { file: `src/core.${repo.language.toLowerCase()}`, line: 250 }
    });
  }
  
  if (repo.expectedCharacteristics.hasCodeQualityIssues) {
    issues.push({
      id: `QUAL-${repo.name}-001`,
      severity: 'low',
      category: 'code-quality',
      message: `Code complexity exceeds threshold in ${repo.language} module`,
      location: { file: `src/utils.${repo.language.toLowerCase()}`, line: 50 }
    });
  }
  
  // Add complexity-based issues
  if (repo.expectedCharacteristics.complexity === 'high') {
    issues.push({
      id: `ARCH-${repo.name}-001`,
      severity: 'medium',
      category: 'architecture',
      message: 'High coupling detected between modules',
      location: { file: 'src/architecture/design.md', line: 1 }
    });
  }
  
  return {
    success: true,
    decision: issues.filter(i => ['critical', 'high'].includes(i.severity)).length > 0 ? 'NEEDS_REVIEW' : 'APPROVED',
    newIssues: issues,
    unchangedIssues: [
      // Add some repository issues
      {
        id: 'REPO-001',
        severity: 'medium',
        category: 'code-quality',
        message: 'Legacy code needs refactoring',
        location: { file: 'legacy/old.js', line: 100 }
      }
    ],
    resolvedIssues: repo.size === 'large' ? [
      {
        id: 'FIXED-001',
        severity: 'high',
        category: 'security',
        message: 'Fixed XSS vulnerability',
        location: { file: 'src/security.js', line: 50 }
      }
    ] : [],
    prMetadata: {
      author: `${repo.language.toLowerCase()}_developer`,
      repository_url: repo.url,
      number: 12345,
      filesChanged: repo.size === 'small' ? 5 : repo.size === 'medium' ? 25 : 100,
      linesAdded: repo.size === 'small' ? 50 : repo.size === 'medium' ? 500 : 5000,
      linesRemoved: repo.size === 'small' ? 20 : repo.size === 'medium' ? 200 : 2000
    },
    overallScore: 72,
    confidence: 92,
    scanDuration: repo.size === 'small' ? 5 : repo.size === 'medium' ? 15 : 45
  } as any;
}

/**
 * Validates report against expected scoring rules
 */
function validateReport(report: string, repo: TestRepository): { 
  passed: boolean; 
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check for correct scoring system (5/3/1/0.5)
  if (!report.includes('Critical: 5') && !report.includes('Critical Issues Fixed | +5')) {
    if (report.includes('Critical: 20') || report.includes('-20')) {
      errors.push('❌ Using old scoring system (20/10/5/2) instead of new (5/3/1/0.5)');
    }
  }
  
  // Check for breaking change triplication
  const breakingMatches = (report.match(/Breaking Change:/g) || []).length;
  if (breakingMatches > 3) {
    errors.push(`❌ Breaking changes appearing ${breakingMatches} times (triplication issue)`);
  }
  
  // Check for positive scoring
  if (repo.size === 'large' && !report.includes('Issues Resolved (Positive)')) {
    warnings.push('⚠️ Missing positive scoring for resolved issues');
  }
  
  // Check for realistic scores (no 100/100)
  if (report.includes('Score: 100/100') && report.includes('Code Quality')) {
    errors.push('❌ Unrealistic 100/100 score in Code Quality');
  }
  
  // Check for proper base scores
  if (report.includes('Previous Score: 100/100')) {
    errors.push('❌ Using 100/100 as base score instead of 50/100 for new users');
  }
  
  // Language-specific validations
  if (repo.language === 'Go' && !report.includes('go')) {
    warnings.push(`⚠️ Report doesn't mention ${repo.language} language context`);
  }
  
  return {
    passed: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Main test runner
 */
async function runMultiLanguageValidation() {
  console.log('🚀 Starting Multi-Language Validation Test Suite\n');
  console.log('=' .repeat(80));
  
  const generator = new ReportGeneratorV7EnhancedComplete();
  const results = {
    total: TEST_REPOSITORIES.length,
    passed: 0,
    failed: 0,
    warnings: 0
  };
  
  const summaryData: any[] = [];
  
  for (const repo of TEST_REPOSITORIES) {
    console.log(`\n📦 Testing: ${repo.name}`);
    console.log(`   Language: ${repo.language}`);
    console.log(`   Size: ${repo.size}`);
    console.log(`   URL: ${repo.url}`);
    
    try {
      // Generate mock data and report
      const comparisonData = createMockComparisonData(repo);
      const report = await generator.generateReport(comparisonData);
      
      // Validate report
      const validation = validateReport(report, repo);
      
      if (validation.passed) {
        console.log('   ✅ PASSED');
        results.passed++;
      } else {
        console.log('   ❌ FAILED');
        results.failed++;
        validation.errors.forEach(error => console.log(`      ${error}`));
      }
      
      if (validation.warnings.length > 0) {
        results.warnings += validation.warnings.length;
        validation.warnings.forEach(warning => console.log(`      ${warning}`));
      }
      
      // Save report for manual inspection
      const reportsDir = path.join(__dirname, 'validation-reports', 'multi-language');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
      const filename = `${repo.language.toLowerCase()}-${repo.size}-${timestamp}.md`;
      fs.writeFileSync(path.join(reportsDir, filename), report);
      
      summaryData.push({
        repository: repo.name,
        language: repo.language,
        size: repo.size,
        passed: validation.passed,
        errors: validation.errors.length,
        warnings: validation.warnings.length
      });
      
    } catch (error) {
      console.log(`   ❌ ERROR: ${error instanceof Error ? error.message : String(error)}`);
      results.failed++;
    }
  }
  
  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 VALIDATION SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Tests: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⚠️ Warnings: ${results.warnings}`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  
  // Language breakdown
  console.log('\n📈 Language Coverage:');
  const languages = [...new Set(TEST_REPOSITORIES.map(r => r.language))];
  languages.forEach(lang => {
    const langRepos = TEST_REPOSITORIES.filter(r => r.language === lang);
    const langPassed = summaryData.filter(s => 
      langRepos.some(r => r.name === s.repository) && s.passed
    ).length;
    console.log(`   ${lang}: ${langPassed}/${langRepos.length} passed`);
  });
  
  // Size breakdown
  console.log('\n📏 Repository Size Coverage:');
  ['small', 'medium', 'large'].forEach(size => {
    const sizeRepos = TEST_REPOSITORIES.filter(r => r.size === size);
    const sizePassed = summaryData.filter(s => 
      sizeRepos.some(r => r.name === s.repository) && s.passed
    ).length;
    console.log(`   ${size}: ${sizePassed}/${sizeRepos.length} passed`);
  });
  
  // Save summary
  const summaryPath = path.join(__dirname, 'validation-reports', 'multi-language', 'summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    results,
    details: summaryData
  }, null, 2));
  
  console.log(`\n📁 Reports saved to: validation-reports/multi-language/`);
  console.log(`📋 Summary saved to: ${summaryPath}`);
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run validation
runMultiLanguageValidation().catch(console.error);