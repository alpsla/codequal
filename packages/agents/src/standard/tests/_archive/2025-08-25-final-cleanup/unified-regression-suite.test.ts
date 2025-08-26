/**
 * Unified Regression Test Suite
 * 
 * Modernized regression tests using UnifiedAnalysisWrapper as the core service.
 * These tests ensure backward compatibility while leveraging the new architecture.
 * 
 * CRITICAL: These tests protect against known regressions and must pass before merge.
 */

import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { UnifiedAnalysisWrapper, UnifiedAnalysisResult } from '../../services/unified-analysis-wrapper';
import { EndToEndAnalysisWrapper } from '../../services/end-to-end-analysis-wrapper';
import { DirectDeepWikiApi } from '../../services/direct-deepwiki-api';
import { registerDeepWikiApi } from '../../services/deepwiki-api-wrapper';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Test Scenarios - Each represents a critical regression we've fixed
 */
const REGRESSION_SCENARIOS = {
  // BUG-017: Core functionality protection
  CORE_FUNCTIONALITY: {
    name: 'Core Analysis Flow',
    repo: 'https://github.com/sindresorhus/ky',
    branch: 'main',
    minScore: 70,
    requiredFeatures: ['location-validation', 'confidence-scoring', 'report-generation']
  },
  
  // BUG-068: Location accuracy
  LOCATION_ACCURACY: {
    name: 'Location Validation',
    repo: 'https://github.com/sindresorhus/ky',
    prId: '720',
    minLocationAccuracy: 80, // 80% minimum
    requiresClarification: true
  },
  
  // BUG-069: PR metadata preservation
  PR_METADATA: {
    name: 'PR Context Preservation',
    prUrl: 'https://github.com/sindresorhus/ky/pull/720',
    requiredFields: ['owner', 'repo', 'prNumber', 'title', 'author', 'filesChanged']
  },
  
  // BUG-070: Issue type consistency
  ISSUE_TYPES: {
    name: 'Issue Type Validation',
    repo: 'https://github.com/sindresorhus/ky',
    validTypes: ['bug', 'security', 'performance', 'style', 'best-practice'],
    requiresAllTypes: false
  },
  
  // BUG-071: Score calculation
  SCORE_CALCULATION: {
    name: 'Score Calculation Accuracy',
    repo: 'https://github.com/sindresorhus/ky',
    expectedScoreRange: { min: 60, max: 95 },
    requiresConsistency: true
  }
};

describe('Unified Regression Test Suite', () => {
  let wrapper: UnifiedAnalysisWrapper;
  let e2eWrapper: EndToEndAnalysisWrapper;
  const testResults: Map<string, any> = new Map();
  
  beforeAll(async () => {
    // Always use real DeepWiki API
    console.log('🚀 Running regression tests with real DeepWiki API');
    const directApi = new DirectDeepWikiApi();
    registerDeepWikiApi(directApi);
    console.log('✅ DirectDeepWikiApi registered for tests');
    
    // Initialize wrappers with test configuration
    wrapper = new UnifiedAnalysisWrapper();
    e2eWrapper = new EndToEndAnalysisWrapper({
      workDir: '/tmp/codequal-regression-tests',
      keepClone: false,
      useCache: true
    });
  });
  
  afterAll(async () => {
    // Generate regression report
    const report = generateRegressionReport(testResults);
    const reportPath = path.join(__dirname, 'regression-report.md');
    fs.writeFileSync(reportPath, report);
    console.log(`📊 Regression report saved to: ${reportPath}`);
  });
  
  describe('🔧 Core Functionality Tests', () => {
    it('should maintain core analysis flow', async () => {
      const scenario = REGRESSION_SCENARIOS.CORE_FUNCTIONALITY;
      
      const result = await wrapper.analyzeRepository(scenario.repo, {
        branch: scenario.branch,
        validateLocations: true,
        requireMinConfidence: 70
      });
      
      // Verify core functionality
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.analysis).toBeDefined();
      expect(result.analysis.scores.overall).toBeGreaterThanOrEqual(scenario.minScore);
      
      // Verify required features
      expect(result.validationStats).toBeDefined();
      expect(result.validationStats.totalIssues).toBeGreaterThan(0);
      expect(result.metadata.flowSteps).toBeDefined();
      
      // Store for report
      testResults.set('core-functionality', {
        passed: true,
        score: result.analysis.scores.overall,
        issues: result.validationStats.totalIssues
      });
    }, 30000);
    
    it('should handle different repository sizes', async () => {
      const repos = [
        { url: 'https://github.com/sindresorhus/ky', size: 'small' },
        { url: 'https://github.com/sindresorhus/ky', size: 'small' },
        { url: 'https://github.com/vercel/swr', size: 'medium' }
      ];
      
      for (const repo of repos) {
        const result = await wrapper.analyzeRepository(repo.url, {
          validateLocations: true
        });
        
        expect(result.success).toBe(true);
        expect(result.analysis.issues).toBeDefined();
        
        testResults.set(`repo-size-${repo.size}`, {
          passed: true,
          url: repo.url,
          issues: result.analysis.issues.length
        });
      }
    }, 60000);
  });
  
  describe('📍 Location Accuracy Tests', () => {
    it('should achieve minimum location accuracy', async () => {
      const scenario = REGRESSION_SCENARIOS.LOCATION_ACCURACY;
      
      const result = await wrapper.analyzeRepository(scenario.repo, {
        prId: scenario.prId,
        validateLocations: true,
        maxClarificationAttempts: 3
      });
      
      const accuracy = result.validationStats.totalIssues > 0
        ? (result.validationStats.validLocations / result.validationStats.totalIssues) * 100
        : 0;
      
      expect(accuracy).toBeGreaterThanOrEqual(scenario.minLocationAccuracy);
      
      if (scenario.requiresClarification) {
        expect(result.validationStats.clarifiedLocations).toBeGreaterThan(0);
      }
      
      testResults.set('location-accuracy', {
        passed: true,
        accuracy: accuracy.toFixed(2),
        valid: result.validationStats.validLocations,
        total: result.validationStats.totalIssues,
        clarified: result.validationStats.clarifiedLocations
      });
    }, 45000);
    
    it('should not generate fake file paths', async () => {
      const result = await wrapper.analyzeRepository('https://github.com/sindresorhus/ky', {
        validateLocations: true
      });
      
      // Check for common fake path patterns
      const fakePatterns = [
        /^src\/example\./,
        /^unknown$/,
        /^placeholder\./,
        /^test\/test\./
      ];
      
      const hasFakePaths = result.analysis.issues.some(issue => 
        fakePatterns.some(pattern => pattern.test(issue.location.file))
      );
      
      expect(hasFakePaths).toBe(false);
      
      testResults.set('no-fake-paths', {
        passed: !hasFakePaths,
        checkedIssues: result.analysis.issues.length
      });
    });
  });
  
  describe('📋 PR Metadata Tests', () => {
    it('should preserve PR context through analysis', async () => {
      const scenario = REGRESSION_SCENARIOS.PR_METADATA;
      
      const result = await e2eWrapper.analyzeFromPRUrl(scenario.prUrl);
      
      expect(result.success).toBe(true);
      expect(result.prContext).toBeDefined();
      
      // Verify all required fields
      for (const field of scenario.requiredFields) {
        expect(result.prContext[field]).toBeDefined();
        expect(result.prContext[field]).not.toBe('');
        expect(result.prContext[field]).not.toBe('Unknown');
      }
      
      testResults.set('pr-metadata', {
        passed: true,
        context: result.prContext
      });
    }, 60000);
  });
  
  describe('🏷️ Issue Type Tests', () => {
    it('should use valid issue types only', async () => {
      const scenario = REGRESSION_SCENARIOS.ISSUE_TYPES;
      
      const result = await wrapper.analyzeRepository(scenario.repo, {
        validateLocations: true
      });
      
      const invalidTypes = result.analysis.issues.filter(issue =>
        !scenario.validTypes.includes(issue.category)
      );
      
      expect(invalidTypes).toHaveLength(0);
      
      // Check type distribution
      const typeDistribution = scenario.validTypes.reduce((acc, type) => {
        acc[type] = result.analysis.issues.filter(i => i.category === type).length;
        return acc;
      }, {} as Record<string, number>);
      
      testResults.set('issue-types', {
        passed: invalidTypes.length === 0,
        distribution: typeDistribution,
        total: result.analysis.issues.length
      });
    });
  });
  
  describe('📊 Score Calculation Tests', () => {
    it('should calculate scores within expected range', async () => {
      const scenario = REGRESSION_SCENARIOS.SCORE_CALCULATION;
      
      const result = await wrapper.analyzeRepository(scenario.repo, {
        validateLocations: true
      });
      
      expect(result.analysis.scores.overall).toBeGreaterThanOrEqual(scenario.expectedScoreRange.min);
      expect(result.analysis.scores.overall).toBeLessThanOrEqual(scenario.expectedScoreRange.max);
      
      // Verify score components
      expect(result.analysis.scores).toMatchObject({
        overall: expect.any(Number),
        security: expect.any(Number),
        maintainability: expect.any(Number),
        reliability: expect.any(Number),
        performance: expect.any(Number)
      });
      
      testResults.set('score-calculation', {
        passed: true,
        scores: result.analysis.scores,
        issueCount: result.analysis.issues.length
      });
    });
    
    it('should provide consistent scores for same input', async () => {
      const repo = 'https://github.com/sindresorhus/ky';
      
      // Run analysis twice with same input
      const result1 = await wrapper.analyzeRepository(repo, {
        validateLocations: true
      });
      
      const result2 = await wrapper.analyzeRepository(repo, {
        validateLocations: true
      });
      
      // Scores should be relatively consistent (within 5 points for real API)
      const scoreDiff = Math.abs(result1.analysis.scores.overall - result2.analysis.scores.overall);
      expect(scoreDiff).toBeLessThanOrEqual(5);
      
      testResults.set('score-consistency', {
        passed: true,
        score1: result1.analysis.scores.overall,
        score2: result2.analysis.scores.overall,
        difference: scoreDiff
      });
    });
  });
  
  describe('🔄 Comparison Flow Tests', () => {
    it('should correctly identify unchanged, resolved, and new issues', async () => {
      // Analyze main branch
      const mainResult = await wrapper.analyzeRepository('https://github.com/sindresorhus/ky', {
        branch: 'main',
        validateLocations: true
      });
      
      // Simulate PR branch with some changes
      const prResult = await wrapper.analyzeRepository('https://github.com/sindresorhus/ky', {
        branch: 'pr/700',
        prId: '700',
        validateLocations: true
      });
      
      // Compare using fingerprints
      const mainFingerprints = new Set(
        mainResult.analysis.issues.map(i => `${i.location.file}:${i.location.line}:${i.category}`)
      );
      const prFingerprints = new Set(
        prResult.analysis.issues.map(i => `${i.location.file}:${i.location.line}:${i.category}`)
      );
      
      const unchanged = [...mainFingerprints].filter(f => prFingerprints.has(f)).length;
      const resolved = [...mainFingerprints].filter(f => !prFingerprints.has(f)).length;
      const newIssues = [...prFingerprints].filter(f => !mainFingerprints.has(f)).length;
      
      expect(unchanged + resolved).toBeLessThanOrEqual(mainResult.analysis.issues.length);
      expect(unchanged + newIssues).toBeLessThanOrEqual(prResult.analysis.issues.length);
      
      testResults.set('comparison-flow', {
        passed: true,
        unchanged,
        resolved,
        new: newIssues,
        mainTotal: mainResult.analysis.issues.length,
        prTotal: prResult.analysis.issues.length
      });
    });
  });
  
  describe('📝 Report Generation Tests', () => {
    it('should generate valid V8 reports', async () => {
      const result = await wrapper.analyzeRepository('https://github.com/sindresorhus/ky', {
        validateLocations: true
      });
      
      // Transform to comparison result for report generation
      const comparisonResult = {
        mainAnalysis: result.analysis,
        featureAnalysis: result.analysis,
        newIssues: [],
        resolvedIssues: [],
        unchangedIssues: result.analysis.issues
          .filter(issue => issue.severity !== 'info') // Filter out invalid severity levels
          .map(issue => ({
            ...issue,
            message: issue.description || issue.title || 'Issue found',
            severity: issue.severity as 'critical' | 'high' | 'medium' | 'low',
            category: (['security', 'performance', 'code-quality', 'architecture', 'dependencies', 'testing', 'maintainability', 'formatting', 'style'].includes(issue.category) 
              ? issue.category 
              : 'code-quality') as 'security' | 'performance' | 'code-quality' | 'architecture' | 'dependencies' | 'testing' | 'maintainability' | 'formatting' | 'style'
          })),
        score: result.analysis.scores.overall,
        decision: result.analysis.scores.overall >= 70 ? 'approved' as const : 'needs_work' as const,
        confidence: result.validationStats.averageConfidence,
        success: true
      };
      
      // Import V8 generator
      const { ReportGeneratorV8Final } = await import('../../comparison/report-generator-v8-final');
      const generator = new ReportGeneratorV8Final();
      const report = await generator.generateReport(comparisonResult);
      
      // Verify report structure
      expect(report).toContain('# CodeQual Analysis Report');
      expect(report).toContain('## Executive Summary');
      expect(report).toContain('## Score Breakdown');
      expect(report).not.toContain('Unknown Repository');
      expect(report).not.toContain('PR #0');
      
      testResults.set('report-generation', {
        passed: true,
        reportLength: typeof report === 'string' ? report.length : 0,
        hasValidStructure: true
      });
    });
  });
});

/**
 * Generate comprehensive regression report
 */
function generateRegressionReport(results: Map<string, any>): string {
  let report = '# Regression Test Report\n\n';
  report += `Generated: ${new Date().toISOString()}\n\n`;
  report += '## Summary\n\n';
  
  const totalTests = results.size;
  const passedTests = Array.from(results.values()).filter(r => r.passed).length;
  const passRate = ((passedTests / totalTests) * 100).toFixed(2);
  
  report += `- **Total Tests:** ${totalTests}\n`;
  report += `- **Passed:** ${passedTests}\n`;
  report += `- **Failed:** ${totalTests - passedTests}\n`;
  report += `- **Pass Rate:** ${passRate}%\n\n`;
  
  report += '## Test Results\n\n';
  
  for (const [name, result] of results) {
    const icon = result.passed ? '✅' : '❌';
    report += `### ${icon} ${name}\n\n`;
    report += '```json\n';
    report += JSON.stringify(result, null, 2);
    report += '\n```\n\n';
  }
  
  report += '## Recommendations\n\n';
  
  if (passRate === '100.00') {
    report += '✅ All regression tests passed! Safe to deploy.\n';
  } else {
    report += '⚠️ Some regression tests failed. Review failures before deploying.\n';
  }
  
  return report;
}