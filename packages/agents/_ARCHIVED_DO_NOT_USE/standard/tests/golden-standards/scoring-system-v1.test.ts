/**
 * GOLDEN STANDARD TEST - SCORING SYSTEM V1
 * 
 * CRITICAL: DO NOT MODIFY THIS FILE
 * This test ensures the scoring system remains consistent
 * Last validated: 2025-08-12
 * 
 * Scoring Constants (LOCKED):
 * - Critical: 5 points
 * - High: 3 points  
 * - Medium: 1 point
 * - Low: 0.5 points
 * - New User Base: 50/100
 * - Code Quality Base: 75/100
 */

import { ReportGeneratorV7EnhancedComplete } from '../../comparison/report-generator-v7-enhanced-complete';
import { ComparisonResult } from '../../types/analysis-types';

describe('Golden Standard: Scoring System V1', () => {
  let generator: ReportGeneratorV7EnhancedComplete;

  beforeEach(() => {
    generator = new ReportGeneratorV7EnhancedComplete();
  });

  describe('Immutable Scoring Rules', () => {
    test('MUST use 5/3/1/0.5 scoring system', async () => {
      const testData: ComparisonResult = {
        success: true,
        decision: 'NEEDS_REVIEW',
        newIssues: [
          { id: '1', severity: 'critical', category: 'security', message: 'Test critical' },
          { id: '2', severity: 'high', category: 'security', message: 'Test high' },
          { id: '3', severity: 'medium', category: 'performance', message: 'Test medium' },
          { id: '4', severity: 'low', category: 'code-quality', message: 'Test low' }
        ],
        unchangedIssues: [],
        resolvedIssues: [],
        prMetadata: { author: 'testuser', repository_url: 'test', number: 1 }
      } as any;

      const report = await generator.generateReport(testData);
      
      // Validate scoring calculations appear in report
      expect(report).toContain('Critical: 5');
      expect(report).toContain('High: 3');
      expect(report).toContain('Medium: 1');
      expect(report).toContain('Low: 0.5');
      
      // Validate penalties
      expect(report).toMatch(/Critical.*-5/);
      expect(report).toMatch(/High.*-3/);
      expect(report).toMatch(/Medium.*-1/);
      expect(report).toMatch(/Low.*-0\.5/);
    });

    test('MUST start new users at 50/100', async () => {
      const testData: ComparisonResult = {
        success: true,
        decision: 'APPROVED',
        newIssues: [],
        unchangedIssues: [],
        resolvedIssues: [],
        prMetadata: { author: 'newuser123', repository_url: 'test', number: 1 }
      } as any;

      const report = await generator.generateReport(testData);
      
      // New users should show base score of 50
      expect(report).toContain('Previous Score: 50/100');
    });

    test('MUST award positive points for resolved issues', async () => {
      const testData: ComparisonResult = {
        success: true,
        decision: 'APPROVED',
        newIssues: [],
        unchangedIssues: [],
        resolvedIssues: [
          { id: '1', severity: 'critical', category: 'security', message: 'Fixed critical' },
          { id: '2', severity: 'high', category: 'security', message: 'Fixed high' }
        ],
        prMetadata: { author: 'developer123', repository_url: 'test', number: 1 }
      } as any;

      const report = await generator.generateReport(testData);
      
      // Validate positive scoring
      expect(report).toContain('Issues Resolved (Positive)');
      expect(report).toContain('+5'); // Critical resolved
      expect(report).toContain('+3'); // High resolved
    });

    test('MUST prevent breaking change triplication', async () => {
      const breakingChange = {
        id: 'BREAK-001',
        severity: 'critical',
        category: 'api-change',
        message: 'Breaking Change: API endpoint removed',
        location: { file: 'api.ts', line: 10 }
      };

      const testData: ComparisonResult = {
        success: true,
        decision: 'NEEDS_REVIEW',
        newIssues: [breakingChange, breakingChange, breakingChange], // Duplicate
        unchangedIssues: [],
        resolvedIssues: [],
        prMetadata: { author: 'developer', repository_url: 'test', number: 1 }
      } as any;

      const report = await generator.generateReport(testData);
      
      // Should only appear once in breaking changes section
      const breakingMatches = (report.match(/Breaking Change: API endpoint removed/g) || []).length;
      expect(breakingMatches).toBeLessThanOrEqual(2); // Once in issues, once in breaking changes
    });

    test('MUST show Code Quality baseline at 75/100', async () => {
      const testData: ComparisonResult = {
        success: true,
        decision: 'APPROVED',
        newIssues: [
          { id: '1', severity: 'low', category: 'code-quality', message: 'Minor issue' }
        ],
        unchangedIssues: [],
        resolvedIssues: [],
        prMetadata: { author: 'developer', repository_url: 'test', number: 1 }
      } as any;

      const report = await generator.generateReport(testData);
      
      // Code Quality section should calculate from 75 baseline
      expect(report).toMatch(/Code Quality.*Score:.*7[0-5]/); // Should be around 70-75
    });
  });

  describe('Expected Output Hashes', () => {
    test('Report structure hash remains consistent', async () => {
      const testData: ComparisonResult = {
        success: true,
        decision: 'NEEDS_REVIEW',
        newIssues: [
          { id: '1', severity: 'critical', category: 'security', message: 'Test' }
        ],
        unchangedIssues: [],
        resolvedIssues: [],
        prMetadata: { author: 'test', repository_url: 'test', number: 1 }
      } as any;

      const report = await generator.generateReport(testData);
      
      // Validate key sections exist
      const requiredSections = [
        '## PR Decision:',
        '## Executive Summary',
        '### Key Metrics',
        '## 1. Security Analysis',
        '## 2. Performance Analysis', 
        '## 3. Code Quality Analysis',
        '## PR Issues',
        '## Repository Issues',
        '### Skill Score Calculation',
        '### Skills by Category',
        '## Score Impact Summary'
      ];

      requiredSections.forEach(section => {
        expect(report).toContain(section);
      });
    });
  });
});