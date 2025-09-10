/**
 * V9 Integration Test Suite
 * 
 * This test validates that ALL V9 components work together correctly
 * Run this test after ANY changes to V9 components
 * 
 * @important If this test fails, DO NOT create new files - FIX the existing ones
 */

import { V9AnalyzerFactory } from '../analyzers/v9-analyzer-factory';
import { V9ReportFormatter } from '../analyzers/v9-report-formatter-complete';
import { V9PRCommentGenerator } from '../analyzers/v9-pr-comment-generator';
import { V9ScoringCalculator } from '../analyzers/v9-scoring-calculator';
import { V9IssueComparator } from '../analyzers/v9-issue-comparator';
import { V9BusinessImpact } from '../analyzers/v9-business-impact';
import { V9EducationalResources } from '../analyzers/v9-educational-resources';
import { AnalysisResult, Issue, IssueCategory, IssueSeverity } from '../analyzers/v9-types';

describe('V9 Analyzer Integration Tests', () => {
  describe('Component Compatibility', () => {
    it('should create analyzer through factory', () => {
      const analyzer = V9AnalyzerFactory.create('java');
      expect(analyzer).toBeDefined();
      expect(analyzer.constructor.name).toBe('V9JavaAnalyzer');
    });
    
    it('should reuse analyzer instances (singleton)', () => {
      const analyzer1 = V9AnalyzerFactory.create('java');
      const analyzer2 = V9AnalyzerFactory.create('java');
      expect(analyzer1).toBe(analyzer2);
    });
    
    it('should detect language from repository URL', async () => {
      const javaLang = await V9AnalyzerFactory.detectLanguage('https://github.com/apache/kafka');
      expect(javaLang).toBe('java');
      
      const rustLang = await V9AnalyzerFactory.detectLanguage('https://github.com/rust-lang/rust');
      expect(rustLang).toBe('rust');
    });
  });
  
  describe('Data Flow Integration', () => {
    let mockIssues: Issue[];
    let analysisResult: AnalysisResult;
    
    beforeEach(() => {
      // Create consistent test data
      mockIssues = [
        createMockIssue('SEC-001', 'Security', 'critical', 'SQL Injection'),
        createMockIssue('PERF-001', 'Performance', 'high', 'N+1 Query'),
        createMockIssue('QUAL-001', 'Quality', 'medium', 'Null Check Missing'),
      ];
      
      analysisResult = createMockAnalysisResult(mockIssues);
    });
    
    it('should calculate scores correctly', () => {
      const calculator = new V9ScoringCalculator();
      const score = calculator.calculateQualityScore(
        mockIssues.filter(i => i.status === 'New'),
        mockIssues.filter(i => i.status === 'Existing'),
        []
      );
      
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
      
      const grade = calculator.getGrade(score);
      expect(['A', 'B', 'C', 'D', 'F']).toContain(grade);
    });
    
    it('should compare issues correctly', async () => {
      const comparator = new V9IssueComparator();
      const result = await comparator.compareIssues(
        [], // main branch issues
        mockIssues, // PR issues
        ['file1.java', 'file2.java'] // modified files
      );
      
      expect(result).toHaveProperty('newIssues');
      expect(result).toHaveProperty('existingIssues');
      expect(result).toHaveProperty('resolvedIssues');
      expect(result.newIssues).toHaveLength(3);
    });
    
    it('should calculate business impact', () => {
      const businessImpact = new V9BusinessImpact();
      const impact = businessImpact.calculateBusinessImpact(
        mockIssues.filter(i => i.severity === 'critical'),
        mockIssues.filter(i => i.severity !== 'critical')
      );
      
      expect(impact).toHaveProperty('summary');
      expect(impact).toHaveProperty('immediateRisk');
      expect(impact).toHaveProperty('futureRisk');
      expect(impact).toHaveProperty('financialImpact');
      expect(impact).toHaveProperty('riskMatrix');
    });
    
    it('should get educational resources', async () => {
      const educationalResources = new V9EducationalResources();
      const resources = await educationalResources.getEducationalResources(
        mockIssues[0],
        'Java'
      );
      
      expect(resources).toBeInstanceOf(Array);
      expect(resources.length).toBeGreaterThan(0);
      expect(resources[0]).toHaveProperty('type');
      expect(resources[0]).toHaveProperty('title');
      expect(resources[0]).toHaveProperty('url');
    });
    
    it('should format report correctly', async () => {
      const formatter = new V9ReportFormatter();
      const report = await formatter.generateReport(analysisResult, 'Java', {
        format: 'markdown',
        includeCodeSnippets: true,
        includeBusinessImpact: true,
        includeEducationalResources: true,
        includeSkillScore: true,
        groupSimilarIssues: false
      });
      
      expect(report).toContain('# 🔍 V9 Code Quality Analysis Report');
      expect(report).toContain('## 📊 Executive Summary');
      expect(report).toContain('### 🎯 PR Decision');
      expect(report).toContain('## 🚨 BLOCKING ISSUES');
      expect(report).toContain('## 💼 Business Impact Analysis');
    });
    
    it('should generate PR comment correctly', async () => {
      const generator = new V9PRCommentGenerator();
      const comment = await generator.generatePRComment(analysisResult, {
        includeEducationalResources: true,
        includeSkillScore: true,
        includeBusinessImpact: false,
        maxIssuesInComment: 5,
        tone: 'constructive'
      });
      
      expect(comment).toContain('PR Status:');
      expect(comment).toContain('Issue Statistics');
      expect(comment).toContain('Key Issues to Address');
      expect(comment).toBeDefined();
    });
  });
  
  describe('End-to-End Pipeline', () => {
    it('should complete full analysis pipeline without errors', async () => {
      // This test validates the entire flow
      const steps = [
        'Create analyzer via factory',
        'Generate mock analysis',
        'Calculate scores',
        'Compare issues',
        'Calculate business impact',
        'Get educational resources',
        'Format report',
        'Generate PR comment'
      ];
      
      const results: Record<string, boolean> = {};
      
      try {
        // Step 1: Create analyzer
        const analyzer = V9AnalyzerFactory.create('java');
        results[steps[0]] = true;
        
        // Step 2: Generate mock analysis
        const mockIssues = [
          createMockIssue('TEST-001', 'Security', 'critical', 'Test Issue')
        ];
        results[steps[1]] = true;
        
        // Step 3: Calculate scores
        const calculator = new V9ScoringCalculator();
        const score = calculator.calculateQualityScore(mockIssues, [], []);
        results[steps[2]] = score >= 0;
        
        // Step 4: Compare issues
        const comparator = new V9IssueComparator();
        const comparison = await comparator.compareIssues([], mockIssues, ['test.java']);
        results[steps[3]] = true;
        
        // Step 5: Business impact
        const businessImpact = new V9BusinessImpact();
        const impact = businessImpact.calculateBusinessImpact(mockIssues, []);
        results[steps[4]] = true;
        
        // Step 6: Educational resources
        const educationalResources = new V9EducationalResources();
        const resources = await educationalResources.getEducationalResources(mockIssues[0], 'Java');
        results[steps[5]] = true;
        
        // Step 7: Format report
        const analysisResult = createMockAnalysisResult(mockIssues);
        const formatter = new V9ReportFormatter();
        const report = await formatter.generateReport(analysisResult, 'Java');
        results[steps[6]] = report.length > 0;
        
        // Step 8: Generate PR comment
        const generator = new V9PRCommentGenerator();
        const comment = await generator.generatePRComment(analysisResult);
        results[steps[7]] = comment.length > 0;
        
      } catch (error) {
        console.error('Pipeline failed:', error);
      }
      
      // All steps should pass
      steps.forEach(step => {
        expect(results[step]).toBe(true);
      });
    });
  });
  
  describe('Type Safety', () => {
    it('should enforce correct types throughout pipeline', () => {
      // This test validates TypeScript compilation
      // If this compiles, our types are consistent
      
      const analyzer = V9AnalyzerFactory.create('java');
      const config = analyzer.getLanguageConfig();
      
      expect(config).toHaveProperty('name');
      expect(config).toHaveProperty('fileExtensions');
      expect(config).toHaveProperty('tools');
      expect(config.tools).toBeInstanceOf(Array);
    });
  });
});

// Helper functions for creating consistent test data
function createMockIssue(
  id: string,
  category: IssueCategory,
  severity: IssueSeverity,
  title: string
): Issue {
  return {
    id,
    category,
    severity,
    status: 'New',
    title,
    description: `${title} description`,
    file: 'test.java',
    line: 100,
    tool: 'test-tool',
    agent: 'TestAgent',
    impact: 'Test impact',
    businessImpact: 'Test business impact',
    codeSnippet: '// test code',
    suggestedFix: 'Test fix',
    suggestedCodeSnippet: '// fixed code',
    inModifiedFile: true
  };
}

function createMockAnalysisResult(issues: Issue[]): AnalysisResult {
  const calculator = new V9ScoringCalculator();
  const qualityScore = calculator.calculateQualityScore(issues, [], []);
  
  return {
    decision: qualityScore >= 70 ? 'approved' : 'rejected',
    confidence: 95,
    reason: 'Test analysis',
    qualityScore,
    grade: calculator.getGrade(qualityScore),
    newIssues: issues,
    existingIssues: [],
    resolvedIssues: [],
    blockingIssues: issues.filter(i => i.severity === 'critical'),
    backlogIssues: [],
    modifiedFiles: ['test.java'],
    businessImpact: {
      summary: 'Test impact',
      immediateRisk: 'Test risk',
      futureRisk: 'Test future risk',
      financialImpact: {
        fixCost: '$100',
        exploitCost: '$10000',
        roi: '9900%'
      },
      riskMatrix: []
    },
    skillScore: {
      developer: 'test@example.com',
      score: 75,
      trend: [70, 72, 75],
      categories: {
        security: 80,
        performance: 75,
        architecture: 70,
        dependency: 75,
        quality: 80
      },
      recommendations: []
    },
    educationalResources: [],
    metadata: {
      repository: 'test/repo',
      prNumber: 1,
      branch: 'main',
      language: 'Java',
      totalFiles: 10,
      modifiedFiles: 1,
      analysisTime: 1000,
      tools: ['test-tool'],
      timestamp: new Date().toISOString(),
      analyzedAt: new Date().toISOString(),
      analyzer: 'V9',
      repoUrl: 'https://github.com/test/repo',
      executionTime: 1000
    }
  };
}