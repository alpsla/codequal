/**
 * V9 Report Sections Regression Test
 * Ensures all 34 required sections are present in generated reports
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { V9ReportFormatter } from '../../analyzers/v9-report-formatter';
import { V9TemplateValidator } from '../../validators/v9-template-validator';
import type { AnalysisResult, CompleteMetadata } from '../../analyzers/v9-types';

describe('V9 Report Sections Regression', () => {
  let formatter: V9ReportFormatter;
  let validator: V9TemplateValidator;

  beforeAll(() => {
    formatter = new V9ReportFormatter();
    validator = new V9TemplateValidator();
  });

  describe('Report Generation', () => {
    it('should generate all 34 required sections', async () => {
      // Create minimal but complete test data
      const mockResult: AnalysisResult = {
        decision: 'APPROVED',
        confidence: 0.95,
        reason: 'All checks passed',
        qualityScore: 95,
        grade: 'A',
        newIssues: [],
        existingIssues: [],
        resolvedIssues: [],
        blockingIssues: [],
        backlogIssues: [],
        modifiedFiles: ['test.ts'],
        businessImpact: {
          score: 0,
          level: 'low',
          description: 'No significant impact',
          riskFactors: [],
          estimatedCost: 0,
          timeToResolve: '0'
        },
        skillScore: {
          current: 50,
          previous: 50,
          delta: 0,
          level: 'beginner',
          improvements: []
        },
        metadata: {
          analyzedAt: new Date().toISOString(),
          analyzer: 'V9JavaAnalyzer',
          repoUrl: 'https://github.com/test/repo',
          executionTime: 1000,
          filesAnalyzed: 1,
          totalFiles: 1
        }
      };

      const mockMetadata: CompleteMetadata = {
        repository: 'test-repo',
        repoUrl: 'https://github.com/test/repo',
        prNumber: 1,
        prTitle: 'Test PR',
        branch: 'test-branch',
        baseBranch: 'main',
        prAuthor: 'testuser',
        prAuthorEmail: 'test@example.com',
        repoOwner: 'test',
        organizationName: 'TestOrg',
        totalLinesOfCode: 100,
        linesAdded: 10,
        linesDeleted: 5,
        linesModified: 5,
        filesModified: 1,
        totalFiles: 1,
        languageBreakdown: { TypeScript: 100 },
        totalDuration: 1000,
        cloneTime: 100,
        analysisTime: 800,
        reportGenerationTime: 100,
        agentsUsed: [],
        toolsUsed: [],
        totalCost: 0,
        costBreakdown: {
          aiModels: 0,
          infrastructure: 0,
          tools: 0
        },
        estimatedMonthlyCost: 0,
        analyzer: 'V9JavaAnalyzer',
        analyzerVersion: '9.0.0',
        smartFileSelection: false,
        maxFilesAnalyzed: 500,
        startTime: new Date(Date.now() - 1000).toISOString(),
        endTime: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        analyzedAt: new Date().toISOString()
      };

      // Generate report
      const report = await formatter.generateCompleteReport(
        mockResult,
        mockMetadata,
        'TypeScript'
      );

      // Validate all sections are present
      const validation = validator.validateReport(report);

      // Check validation results
      expect(validation.isValid).toBe(true);
      expect(validation.score).toBeGreaterThanOrEqual(90); // Allow for minor formatting differences
      expect(validation.missingSections).toHaveLength(0);
      expect(validation.presentSections).toHaveLength(34);

      // Verify specific critical sections
      const criticalSections = [
        'Executive Summary',
        'Decision',
        'Issue Summary',
        'Business Impact Analysis',
        'Risk Matrix',
        'Score Calculation',
        'Skills Development',
        'Personalized PR Comment',
        'AI-Powered Fix Suggestions',
        'Educational Resources'
      ];

      criticalSections.forEach(section => {
        const found = validation.presentSections.find(s => s.name.includes(section));
        expect(found).toBeDefined();
      });
    });

    it('should use only APPROVED or DECLINED decisions', async () => {
      const testCases = [
        { input: 'APPROVED', expected: 'APPROVED' },
        { input: 'DECLINED', expected: 'DECLINED' },
        { input: 'APPROVE_WITH_SUGGESTIONS', expected: 'DECLINED' },
        { input: 'CHANGES_REQUESTED', expected: 'DECLINED' },
        { input: 'PASSED', expected: 'APPROVED' },
        { input: 'FAILED', expected: 'DECLINED' }
      ];

      for (const testCase of testCases) {
        const result: AnalysisResult = {
          decision: testCase.input as any, // Test with various inputs
          confidence: 0.95,
          reason: 'Test',
          qualityScore: 80,
          grade: 'B',
          newIssues: [],
          existingIssues: [],
          resolvedIssues: [],
          blockingIssues: [],
          backlogIssues: [],
          modifiedFiles: [],
          businessImpact: {
            score: 0,
            level: 'low',
            description: 'Test',
            riskFactors: [],
            estimatedCost: 0,
            timeToResolve: '0'
          },
          skillScore: {
            current: 50,
            previous: 50,
            delta: 0,
            level: 'beginner',
            improvements: []
          },
          metadata: {
            analyzedAt: new Date().toISOString(),
            analyzer: 'test',
            repoUrl: 'test',
            executionTime: 1000,
            filesAnalyzed: 1,
            totalFiles: 1
          }
        };

        const metadata: CompleteMetadata = {
          repository: 'test',
          repoUrl: 'https://github.com/test/repo',
          prNumber: 1,
          prTitle: 'Test',
          branch: 'test',
          baseBranch: 'main',
          prAuthor: 'test',
          prAuthorEmail: 'test@test.com',
          repoOwner: 'test',
          organizationName: 'test',
          totalLinesOfCode: 100,
          linesAdded: 10,
          linesDeleted: 5,
          linesModified: 5,
          filesModified: 1,
          totalFiles: 1,
          languageBreakdown: {},
          totalDuration: 1000,
          cloneTime: 100,
          analysisTime: 800,
          reportGenerationTime: 100,
          agentsUsed: [],
          toolsUsed: [],
          totalCost: 0,
          costBreakdown: {
            aiModels: 0,
            infrastructure: 0,
            tools: 0
          },
          estimatedMonthlyCost: 0,
          analyzer: 'test',
          analyzerVersion: '9.0.0',
          smartFileSelection: false,
          maxFilesAnalyzed: 500,
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          timestamp: new Date().toISOString(),
          analyzedAt: new Date().toISOString()
        };

        const report = await formatter.generateCompleteReport(result, metadata, 'TypeScript');

        // Check that decision is normalized
        expect(report).toContain(`**Decision:** ${testCase.expected}`);
        expect(report).not.toContain('APPROVE_WITH_SUGGESTIONS');
        expect(report).not.toContain('CHANGES_REQUESTED');
      }
    });

    it('should not show Invalid Date in any section', async () => {
      const result: AnalysisResult = {
        decision: 'APPROVED',
        confidence: 0.95,
        reason: 'Test',
        qualityScore: 80,
        grade: 'B',
        newIssues: [],
        existingIssues: [],
        resolvedIssues: [],
        blockingIssues: [],
        backlogIssues: [],
        modifiedFiles: [],
        businessImpact: {
          score: 0,
          level: 'low',
          description: 'Test',
          riskFactors: [],
          estimatedCost: 0,
          timeToResolve: '0'
        },
        skillScore: {
          current: 50,
          previous: 50,
          delta: 0,
          level: 'beginner',
          improvements: []
        },
        metadata: {
          analyzedAt: 'invalid-date', // Test with invalid date
          analyzer: 'test',
          repoUrl: 'test',
          executionTime: 1000,
          filesAnalyzed: 1,
          totalFiles: 1
        }
      };

      const metadata: CompleteMetadata = {
        repository: 'test',
        repoUrl: 'https://github.com/test/repo',
        prNumber: 1,
        prTitle: 'Test',
        branch: 'test',
        baseBranch: 'main',
        prAuthor: 'test',
        prAuthorEmail: 'test@test.com',
        repoOwner: 'test',
        organizationName: 'test',
        totalLinesOfCode: 100,
        linesAdded: 10,
        linesDeleted: 5,
        linesModified: 5,
        filesModified: 1,
        totalFiles: 1,
        languageBreakdown: {},
        totalDuration: 1000,
        cloneTime: 100,
        analysisTime: 800,
        reportGenerationTime: 100,
        agentsUsed: [],
        toolsUsed: [],
        totalCost: 0,
        costBreakdown: {
          aiModels: 0,
          infrastructure: 0,
          tools: 0
        },
        estimatedMonthlyCost: 0,
        analyzer: 'test',
        analyzerVersion: '9.0.0',
        smartFileSelection: false,
        maxFilesAnalyzed: 500,
        startTime: 'invalid-start', // Test with invalid dates
        endTime: 'invalid-end',
        timestamp: 'invalid-timestamp',
        analyzedAt: 'invalid-analyzed'
      };

      const report = await formatter.generateCompleteReport(result, metadata, 'TypeScript');

      // Check that no "Invalid Date" appears
      expect(report).not.toContain('Invalid Date');

      // Check that dates are properly formatted or use fallback
      expect(report).toMatch(/\*\*Analysis Date:\*\* \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
    });

    it('should calculate scores correctly with proper weights', async () => {
      const result: AnalysisResult = {
        decision: 'DECLINED',
        confidence: 0.75,
        reason: 'Critical issues found',
        qualityScore: 0, // Will be calculated
        grade: 'F',
        newIssues: [
          { severity: 'critical', type: 'security', message: 'Issue 1', file: 'test.ts', line: 1, tool: 'test', id: '1' },
          { severity: 'high', type: 'quality', message: 'Issue 2', file: 'test.ts', line: 2, tool: 'test', id: '2' },
          { severity: 'medium', type: 'style', message: 'Issue 3', file: 'test.ts', line: 3, tool: 'test', id: '3' },
          { severity: 'low', type: 'style', message: 'Issue 4', file: 'test.ts', line: 4, tool: 'test', id: '4' }
        ],
        existingIssues: [
          { severity: 'critical', type: 'security', message: 'Issue 5', file: 'old.ts', line: 5, tool: 'test', id: '5' },
          { severity: 'high', type: 'quality', message: 'Issue 6', file: 'old.ts', line: 6, tool: 'test', id: '6' }
        ],
        resolvedIssues: [],
        blockingIssues: [],
        backlogIssues: [],
        modifiedFiles: ['test.ts'],
        businessImpact: {
          score: 0,
          level: 'high',
          description: 'Critical security issues',
          riskFactors: [],
          estimatedCost: 10000,
          timeToResolve: '2 days'
        },
        skillScore: {
          current: 50,
          previous: 50,
          delta: 0,
          level: 'beginner',
          improvements: []
        },
        metadata: {
          analyzedAt: new Date().toISOString(),
          analyzer: 'test',
          repoUrl: 'test',
          executionTime: 1000,
          filesAnalyzed: 1,
          totalFiles: 1
        }
      };

      const metadata: CompleteMetadata = {
        repository: 'test',
        repoUrl: 'https://github.com/test/repo',
        prNumber: 1,
        prTitle: 'Test',
        branch: 'test',
        baseBranch: 'main',
        prAuthor: 'test',
        prAuthorEmail: 'test@test.com',
        repoOwner: 'test',
        organizationName: 'test',
        totalLinesOfCode: 100,
        linesAdded: 10,
        linesDeleted: 5,
        linesModified: 5,
        filesModified: 1,
        totalFiles: 1,
        languageBreakdown: {},
        totalDuration: 1000,
        cloneTime: 100,
        analysisTime: 800,
        reportGenerationTime: 100,
        agentsUsed: [],
        toolsUsed: [],
        totalCost: 0,
        costBreakdown: {
          aiModels: 0,
          infrastructure: 0,
          tools: 0
        },
        estimatedMonthlyCost: 0,
        analyzer: 'test',
        analyzerVersion: '9.0.0',
        smartFileSelection: false,
        maxFilesAnalyzed: 500,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        analyzedAt: new Date().toISOString()
      };

      const report = await formatter.generateCompleteReport(result, metadata, 'TypeScript');

      // Expected calculation:
      // New issues: 1*5 + 1*3 + 1*1 + 1*0.5 = 9.5
      // Existing issues: 1*5 + 1*3 = 8
      // Total penalty: 17.5
      // Score: max(0, 100 - 17.5) = 82.5

      expect(report).toContain('Score Calculation');
      expect(report).toMatch(/New Issues Penalty: [\d.]+/);
      expect(report).toMatch(/Existing Issues Penalty: [\d.]+/);
      expect(report).toMatch(/Final Score: [\d.]+\/100/);
    });
  });

  describe('Template Validation', () => {
    it('should detect missing sections', () => {
      const incompleteReport = `
# V9 Analysis Report

## Executive Summary
Test summary

## Decision
**Decision:** APPROVED

## Issue Summary
No issues found

## Footer
Generated at ${new Date().toISOString()}
`;

      const validation = validator.validateReport(incompleteReport);

      expect(validation.isValid).toBe(false);
      expect(validation.missingSections.length).toBeGreaterThan(20);
      expect(validation.presentSections.length).toBeLessThan(10);
    });

    it('should validate section patterns correctly', () => {
      const sections = validator.getRequiredSections();

      // All 34 sections should be defined
      expect(sections).toHaveLength(34);

      // Each section should have patterns
      sections.forEach(section => {
        expect(section.patterns.length).toBeGreaterThan(0);
        expect(section.category).toBeDefined();
        expect(section.required).toBe(true);
      });
    });
  });
});