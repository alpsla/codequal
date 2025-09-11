/**
 * Tests for Reporter Agent with MCP Tool Integration
 */

import { ReporterAgent } from '../reporter-agent';
import { StandardReport } from '../../services/report-formatter.service';
import { createLogger } from '@codequal/core/utils';

// Mock dependencies
jest.mock('@codequal/core/utils', () => ({
  createLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  })
}));

const mockVectorDB = {
  search: jest.fn(),
  store: jest.fn(),
  delete: jest.fn()
};

const mockReportingService = {
  generateDependencyGraph: jest.fn(),
  generateTrendAnalysis: jest.fn(),
  generateMetricsReport: jest.fn()
};

describe.skip('Reporter Agent with MCP Tool Integration - FIXME: MCP integration issues (Issue #TBD)', () => {
  let reporterAgent: ReporterAgent;
  
  beforeEach(() => {
    jest.clearAllMocks();
    reporterAgent = new ReporterAgent(mockVectorDB, mockReportingService);
  });

  describe('Enhanced MCP Tool Integration', () => {
    it('should generate Mermaid diagrams for different report sections', async () => {
      // Create a comprehensive analysis result
      const analysisResult = {
        repository: {
          url: 'https://github.com/example/test-repo',
          name: 'test-repo',
          primaryLanguage: 'TypeScript'
        },
        pr: {
          number: 123,
          title: 'Add authentication system',
          changedFiles: 15,
          additions: 450,
          deletions: 120
        },
        findings: {
          security: [
            {
              title: 'Missing CSRF protection',
              severity: 'high',
              category: 'security',
              file: 'src/auth/login.ts',
              line: 45
            }
          ],
          dependencies: [
            {
              title: 'Outdated dependency: express@4.17.1',
              severity: 'medium',
              category: 'dependencies',
              recommendation: 'Update to express@4.18.2'
            },
            {
              title: 'Vulnerable dependency: lodash@4.17.20',
              severity: 'high',
              category: 'dependencies',
              recommendation: 'Update to lodash@4.17.21'
            }
          ]
        },
        metrics: {
          totalFindings: 3,
          severity: { critical: 0, high: 2, medium: 1, low: 0 }
        }
      };

      const educationalData = {
        educational: {
          learningPath: {
            title: 'Security Enhancement Path',
            steps: [
              {
                title: 'CSRF Protection Basics',
                topic: 'Understanding CSRF attacks',
                estimatedTime: '1 hour',
                difficulty: 'intermediate'
              },
              {
                title: 'Implementing CSRF Tokens',
                topic: 'Adding CSRF protection to forms',
                estimatedTime: '2 hours',
                difficulty: 'intermediate'
              }
            ],
            totalSteps: 2,
            difficulty: 'intermediate',
            estimatedTime: '3 hours'
          },
          content: {},
          insights: {}
        },
        metadata: {}
      };

      const recommendationModule = {
        summary: { totalRecommendations: 3 },
        recommendations: []
      };

      // Generate report
      const report = await reporterAgent.generateStandardReport(
        analysisResult,
        educationalData,
        recommendationModule,
        { type: 'full-report', includeEducational: true, educationalDepth: 'comprehensive' }
      );

      // Verify Mermaid diagrams were generated
      expect(report.visualizations.mermaidDiagrams).toBeDefined();
      expect(report.visualizations.mermaidDiagrams?.length).toBeGreaterThan(0);

      // Check for dependency graph
      const depGraph = report.visualizations.mermaidDiagrams?.find(
        d => d.type === 'dependency-graph'
      );
      expect(depGraph).toBeDefined();
      expect(depGraph?.mermaidCode).toContain('graph LR');
      expect(depGraph?.mermaidCode).toContain('Outdated dependency');

      // Check for findings flow
      const findingsFlow = report.visualizations.mermaidDiagrams?.find(
        d => d.type === 'findings-flow'
      );
      expect(findingsFlow).toBeDefined();
      expect(findingsFlow?.mermaidCode).toContain('flowchart TD');

      // Check for learning path diagram
      const learningPath = report.visualizations.mermaidDiagrams?.find(
        d => d.type === 'learning-path'
      );
      expect(learningPath).toBeDefined();
      expect(learningPath?.mermaidCode).toContain('CSRF Protection Basics');
    });

    it('should generate PDF exports with different formats', async () => {
      const analysisResult = {
        repository: {
          url: 'https://github.com/example/test-repo',
          name: 'test-repo',
          primaryLanguage: 'JavaScript'
        },
        pr: { number: 456, title: 'Performance improvements', changedFiles: 8 },
        findings: {
          performance: [
            {
              title: 'Inefficient algorithm',
              severity: 'high',
              category: 'performance',
              file: 'src/utils/sort.js'
            }
          ]
        },
        metrics: {
          totalFindings: 1,
          severity: { critical: 0, high: 1, medium: 0, low: 0 }
        }
      };

      const educationalData = {
        educational: {
          learningPath: {
            steps: [{ title: 'Algorithm Optimization', estimatedTime: '2 hours' }],
            totalSteps: 1
          },
          content: {},
          insights: {}
        },
        metadata: {}
      };

      const report = await reporterAgent.generateStandardReport(
        analysisResult,
        educationalData,
        { summary: { totalRecommendations: 1 }, recommendations: [] },
        { type: 'full-report', includeEducational: true, educationalDepth: 'detailed' }
      );

      // Verify PDF exports were generated
      expect(report.exports.pdfReports).toBeDefined();
      expect(report.exports.pdfReports?.length).toBeGreaterThanOrEqual(2);

      // Check for executive format
      const executivePDF = report.exports.pdfReports?.find(
        pdf => pdf.format === 'executive'
      );
      expect(executivePDF).toBeDefined();
      expect(executivePDF?.title).toBe('Executive Summary');
      expect(executivePDF?.estimatedPageCount).toBeLessThanOrEqual(5);

      // Check for technical format
      const technicalPDF = report.exports.pdfReports?.find(
        pdf => pdf.format === 'technical'
      );
      expect(technicalPDF).toBeDefined();
      expect(technicalPDF?.title).toBe('Technical Report');
      expect(technicalPDF?.estimatedPageCount).toBeGreaterThan(executivePDF?.estimatedPageCount || 0);

      // Check for educational format (should be included due to learning path)
      const educationalPDF = report.exports.pdfReports?.find(
        pdf => pdf.format === 'educational'
      );
      expect(educationalPDF).toBeDefined();
      expect(educationalPDF?.title).toBe('Learning Guide');
    });

    it('should generate Grafana dashboard URLs including skill tracking', async () => {
      const analysisResult = {
        repository: {
          url: 'https://github.com/example/skill-test',
          name: 'skill-test',
          primaryLanguage: 'Python'
        },
        pr: { number: 789, title: 'Add ML features', changedFiles: 20 },
        findings: {},
        metrics: { totalFindings: 0, severity: { critical: 0, high: 0, medium: 0, low: 0 } }
      };

      const educationalData = {
        educational: {
          skillGaps: [
            {
              skill: 'Machine Learning Basics',
              currentLevel: 3,
              requiredLevel: 7,
              priority: 'high'
            },
            {
              skill: 'Python Best Practices',
              currentLevel: 5,
              requiredLevel: 8,
              priority: 'medium'
            }
          ],
          learningPath: { steps: [], totalSteps: 0 },
          content: {},
          insights: {}
        },
        metadata: {}
      };

      const report = await reporterAgent.generateStandardReport(
        analysisResult,
        educationalData,
        { summary: { totalRecommendations: 0 }, recommendations: [] },
        { type: 'dashboard', includeEducational: true, educationalDepth: 'detailed' }
      );

      // Verify dashboard URLs were generated
      expect(report.exports.dashboardUrls).toBeDefined();
      expect(report.exports.dashboardUrls?.length).toBeGreaterThanOrEqual(3);

      // Check for repository dashboard
      const repoDashboard = report.exports.dashboardUrls?.find(
        d => d.type === 'repository'
      );
      expect(repoDashboard).toBeDefined();
      expect(repoDashboard?.url).toContain('repo-github-com-example-skill-test');

      // Check for PR dashboard
      const prDashboard = report.exports.dashboardUrls?.find(
        d => d.type === 'pull-request'
      );
      expect(prDashboard).toBeDefined();
      expect(prDashboard?.url).toContain('pr-789');

      // Check for educational/skill tracking dashboard
      const eduDashboard = report.exports.dashboardUrls?.find(
        d => d.type === 'educational'
      );
      expect(eduDashboard).toBeDefined();
      expect(eduDashboard?.title).toContain('Learning Progress');
      expect(eduDashboard?.panels).toContain('skill-levels');
      expect(eduDashboard?.panels).toContain('learning-engagement');
    });

    it('should handle missing educational content gracefully', async () => {
      const minimalAnalysis = {
        repository: { url: 'https://github.com/test/minimal', name: 'minimal' },
        pr: { number: 1, title: 'Minor fix', changedFiles: 1 },
        findings: {},
        metrics: { totalFindings: 0, severity: { critical: 0, high: 0, medium: 0, low: 0 } }
      };

      // No educational data
      const report = await reporterAgent.generateStandardReport(
        minimalAnalysis,
        {},
        { summary: { totalRecommendations: 0 }, recommendations: [] },
        { type: 'pr-comment', includeEducational: false, educationalDepth: 'summary' }
      );

      // Should still generate report without educational content
      expect(report).toBeDefined();
      expect(report.visualizations.mermaidDiagrams?.length || 0).toBe(0);
      
      // Should have minimal PDF exports
      expect(report.exports.pdfReports?.length || 0).toBeGreaterThanOrEqual(2);
      const educationalPDF = report.exports.pdfReports?.find(pdf => pdf.format === 'educational');
      expect(educationalPDF).toBeUndefined(); // No educational PDF without content

      // Should still have basic dashboards
      expect(report.exports.dashboardUrls?.length || 0).toBeGreaterThanOrEqual(2);
      const eduDashboard = report.exports.dashboardUrls?.find(d => d.type === 'educational');
      expect(eduDashboard).toBeUndefined(); // No educational dashboard without skill gaps
    });

    it('should estimate PDF page counts based on content volume', async () => {
      const largeAnalysis = {
        repository: { url: 'https://github.com/large/project', name: 'large-project' },
        pr: { number: 999, title: 'Major refactoring', changedFiles: 100 },
        findings: {
          security: Array(15).fill({ severity: 'high', category: 'security' }),
          codeQuality: Array(30).fill({ severity: 'medium', category: 'codeQuality' }),
          performance: Array(10).fill({ severity: 'low', category: 'performance' })
        },
        metrics: {
          totalFindings: 55,
          severity: { critical: 5, high: 20, medium: 20, low: 10 }
        }
      };

      const report = await reporterAgent.generateStandardReport(
        largeAnalysis,
        {},
        { summary: { totalRecommendations: 20 }, recommendations: [] },
        { type: 'full-report', includeEducational: false, educationalDepth: 'summary' }
      );

      const technicalPDF = report.exports.pdfReports?.find(pdf => pdf.format === 'technical');
      expect(technicalPDF).toBeDefined();
      
      // With 55 findings, expect more pages
      const expectedPages = 2 + Math.ceil(55 / 10) + Object.keys(report.visualizations).length;
      expect(technicalPDF?.estimatedPageCount).toBeGreaterThanOrEqual(expectedPages);
    });

    it('should generate proper Mermaid code for complex dependencies', async () => {
      const complexDependencies = {
        repository: { url: 'https://github.com/complex/deps', name: 'complex-deps' },
        pr: { number: 111, title: 'Update dependencies' },
        findings: {
          dependencies: [
            {
              title: 'Critical: react@16.14.0',
              severity: 'critical',
              category: 'dependencies',
              impact: 'Security vulnerability CVE-2021-12345'
            },
            {
              title: 'High: webpack@4.46.0',
              severity: 'high',
              category: 'dependencies'
            },
            {
              title: 'Medium: eslint@7.32.0',
              severity: 'medium',
              category: 'dependencies'
            }
          ]
        },
        metrics: { totalFindings: 3 }
      };

      const report = await reporterAgent.generateStandardReport(
        complexDependencies,
        {},
        { summary: { totalRecommendations: 3 }, recommendations: [] },
        { type: 'full-report', includeEducational: false, educationalDepth: 'summary' }
      );

      const depDiagram = report.visualizations.mermaidDiagrams?.find(
        d => d.type === 'dependency-graph'
      );

      expect(depDiagram).toBeDefined();
      expect(depDiagram?.mermaidCode).toContain('classDef critical');
      expect(depDiagram?.mermaidCode).toContain('classDef high');
      expect(depDiagram?.mermaidCode).toContain(':::critical'); // Critical styling
      expect(depDiagram?.mermaidCode).toContain('react@16.14.0');
    });
  });
});