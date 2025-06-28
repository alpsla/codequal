/**
 * Unit and Integration tests for ChartJS MCP Adapter
 * Tests chart generation capabilities for reporting
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ChartJSMCPAdapter } from '../chartjs-mcp';
import type { AnalysisContext, FileData, PRContext } from '../../../core/interfaces';

// Mock child_process for MCP server
jest.mock('child_process', () => ({
  spawn: jest.fn().mockReturnValue({
    on: jest.fn(),
    stderr: {
      on: jest.fn()
    },
    stdout: {
      on: jest.fn()
    },
    stdin: {
      write: jest.fn(),
      end: jest.fn()
    }
  })
}));

describe('ChartJS MCP Adapter', () => {
  let adapter: ChartJSMCPAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new ChartJSMCPAdapter();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Helper function to create test context
  function createTestContext(
    role: string, 
    files: Partial<FileData>[] = [],
    primaryLanguage = 'typescript'
  ): AnalysisContext {
    return {
      agentRole: role as any,
      pr: {
        prNumber: 789,
        title: 'Performance improvements',
        description: 'Optimizing database queries',
        baseBranch: 'main',
        targetBranch: 'feature/perf',
        author: 'reporter-user',
        files: files.map(f => ({
          path: f.path || 'test.ts',
          content: f.content || '',
          language: f.language || 'typescript',
          changeType: f.changeType || 'modified',
          diff: f.diff
        })),
        commits: [{
          sha: 'ghi789',
          message: 'Optimize queries',
          author: 'reporter-user'
        }]
      },
      repository: {
        name: 'analytics-app',
        owner: 'test-corp',
        languages: ['typescript', 'javascript'],
        frameworks: ['react', 'express'],
        primaryLanguage
      },
      userContext: {
        userId: 'user-789',
        permissions: ['read', 'write']
      }
    };
  }

  describe('Metadata and Configuration', () => {
    it('should have correct metadata', () => {
      const metadata = adapter.getMetadata();
      
      expect(metadata.id).toBe('chartjs-mcp');
      expect(metadata.name).toBe('ChartJS Visualization Service');
      expect(metadata.description).toContain('interactive charts');
      expect(metadata.supportedRoles).toContain('reporting');
      expect(metadata.supportedLanguages).toContain('any');
      expect(metadata.tags).toContain('visualization');
      expect(metadata.tags).toContain('charts');
      expect(metadata.tags).toContain('reporting');
      expect(metadata.securityVerified).toBe(true);
    });

    it('should have proper capabilities', () => {
      expect(adapter.capabilities).toContainEqual(
        expect.objectContaining({ name: 'line-charts', category: 'visualization' })
      );
      expect(adapter.capabilities).toContainEqual(
        expect.objectContaining({ name: 'bar-charts', category: 'visualization' })
      );
      expect(adapter.capabilities).toContainEqual(
        expect.objectContaining({ name: 'pie-charts', category: 'visualization' })
      );
      expect(adapter.capabilities).toContainEqual(
        expect.objectContaining({ name: 'interactive-charts', category: 'visualization' })
      );
    });

    it('should have correct requirements', () => {
      expect(adapter.requirements.executionMode).toBe('on-demand');
      expect(adapter.requirements.timeout).toBe(20000);
      expect(adapter.requirements.authentication?.type).toBe('none');
      expect(adapter.requirements.authentication?.required).toBe(false);
    });
  });

  describe('canAnalyze', () => {
    it('should analyze for reporting agent', () => {
      const context = createTestContext('reporting');
      expect(adapter.canAnalyze(context)).toBe(true);
    });

    it('should not analyze for non-reporting agents', () => {
      const roles = ['security', 'performance', 'architecture', 'codeQuality', 'educational'];
      
      roles.forEach(role => {
        const context = createTestContext(role);
        expect(adapter.canAnalyze(context)).toBe(false);
      });
    });
  });

  describe('Chart Generation - Unit Tests', () => {
    beforeEach(() => {
      // Mock the executeMCPCommand method
      jest.spyOn(adapter as any, 'executeMCPCommand').mockImplementation(async (command) => {
        if (command.method === 'generate_chart') {
          const { type, data, options } = command.params;
          
          // Generate mock chart based on type
          let mockChart;
          switch (type) {
            case 'line':
              mockChart = {
                type: 'line',
                data,
                options: { ...options, responsive: true },
                chartId: `chart-${Date.now()}`,
                imageUrl: `data:image/png;base64,mockLineChartData`,
                interactiveUrl: `https://charts.example.com/line/${Date.now()}`
              };
              break;
            case 'bar':
              mockChart = {
                type: 'bar',
                data,
                options: { ...options, responsive: true },
                chartId: `chart-${Date.now()}`,
                imageUrl: `data:image/png;base64,mockBarChartData`,
                interactiveUrl: `https://charts.example.com/bar/${Date.now()}`
              };
              break;
            case 'pie':
              mockChart = {
                type: 'pie',
                data,
                options: { ...options, responsive: true },
                chartId: `chart-${Date.now()}`,
                imageUrl: `data:image/png;base64,mockPieChartData`,
                interactiveUrl: `https://charts.example.com/pie/${Date.now()}`
              };
              break;
            default:
              mockChart = {
                type: 'doughnut',
                data,
                options,
                chartId: `chart-${Date.now()}`,
                imageUrl: `data:image/png;base64,mockDoughnutChartData`
              };
          }
          
          return { chart: mockChart };
        }
        return {};
      });

      // Mock initializeMCPServer
      jest.spyOn(adapter as any, 'initializeMCPServer').mockResolvedValue(undefined);
    });

    it('should generate line chart for metrics over time', async () => {
      const metrics = {
        timeline: [
          { date: '2024-01-01', codeQuality: 85, coverage: 78 },
          { date: '2024-01-08', codeQuality: 87, coverage: 80 },
          { date: '2024-01-15', codeQuality: 89, coverage: 82 }
        ]
      };

      const chart = await adapter.generateLineChart({
        title: 'Code Quality Metrics',
        labels: metrics.timeline.map(m => m.date),
        datasets: [
          {
            label: 'Code Quality',
            data: metrics.timeline.map(m => m.codeQuality),
            borderColor: 'rgb(75, 192, 192)'
          },
          {
            label: 'Coverage',
            data: metrics.timeline.map(m => m.coverage),
            borderColor: 'rgb(255, 99, 132)'
          }
        ]
      });

      expect(chart).toBeDefined();
      expect(chart.type).toBe('line');
      expect(chart.chartId).toBeDefined();
      expect(chart.imageUrl).toContain('data:image/png;base64');
      expect(chart.interactiveUrl).toContain('https://charts.example.com/line');
    });

    it('should generate bar chart for finding severity distribution', async () => {
      const severityData = {
        critical: 2,
        high: 8,
        medium: 15,
        low: 23
      };

      const chart = await adapter.generateBarChart({
        title: 'Finding Severity Distribution',
        labels: Object.keys(severityData),
        datasets: [{
          label: 'Number of Findings',
          data: Object.values(severityData),
          backgroundColor: [
            'rgba(255, 0, 0, 0.8)',    // critical - red
            'rgba(255, 165, 0, 0.8)',   // high - orange
            'rgba(255, 255, 0, 0.8)',   // medium - yellow
            'rgba(0, 255, 0, 0.8)'      // low - green
          ]
        }]
      });

      expect(chart).toBeDefined();
      expect(chart.type).toBe('bar');
      expect(chart.chartId).toBeDefined();
      expect(chart.imageUrl).toBeDefined();
    });

    it('should generate pie chart for language distribution', async () => {
      const languageData = {
        TypeScript: 45,
        JavaScript: 30,
        CSS: 15,
        HTML: 10
      };

      const chart = await adapter.generatePieChart({
        title: 'Language Distribution',
        labels: Object.keys(languageData),
        datasets: [{
          data: Object.values(languageData),
          backgroundColor: [
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 206, 86, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(153, 102, 255, 0.8)'
          ]
        }]
      });

      expect(chart).toBeDefined();
      expect(chart.type).toBe('pie');
      expect(chart.chartId).toBeDefined();
      expect(chart.imageUrl).toBeDefined();
    });

    it('should generate doughnut chart for test coverage', async () => {
      const coverageData = {
        covered: 78,
        uncovered: 22
      };

      const chart = await adapter.generateDoughnutChart({
        title: 'Test Coverage',
        labels: ['Covered', 'Uncovered'],
        datasets: [{
          data: [coverageData.covered, coverageData.uncovered],
          backgroundColor: [
            'rgba(0, 255, 0, 0.8)',
            'rgba(255, 0, 0, 0.8)'
          ]
        }]
      });

      expect(chart).toBeDefined();
      expect(chart.type).toBe('doughnut');
      expect(chart.chartId).toBeDefined();
      expect(chart.imageUrl).toBeDefined();
    });
  });

  describe('analyze - Integration with Reporting Context', () => {
    beforeEach(() => {
      jest.spyOn(adapter as any, 'initializeMCPServer').mockResolvedValue(undefined);
      jest.spyOn(adapter as any, 'executeMCPCommand').mockImplementation(async (command) => {
        if (command.method === 'generate_chart') {
          return {
            chart: {
              type: command.params.type,
              chartId: `chart-${Date.now()}`,
              imageUrl: `data:image/png;base64,mock${command.params.type}Chart`,
              interactiveUrl: `https://charts.example.com/${command.params.type}/123`
            }
          };
        }
        return {};
      });
    });

    it('should analyze and generate multiple charts for comprehensive report', async () => {
      const context = createTestContext('reporting');
      
      // Add analysis data to context
      (context as any).analysisData = {
        findings: {
          security: 5,
          performance: 12,
          codeQuality: 20,
          dependencies: 8
        },
        metrics: {
          codeQualityScore: 85,
          performanceScore: 78,
          securityScore: 92,
          coverageScore: 80
        },
        timeline: [
          { week: 'W1', findings: 15 },
          { week: 'W2', findings: 20 },
          { week: 'W3', findings: 12 },
          { week: 'W4', findings: 8 }
        ]
      };

      const result = await adapter.analyze(context);

      expect(result.success).toBe(true);
      expect(result.toolId).toBe('chartjs-mcp');
      expect(result.findings).toHaveLength(4); // Should generate 4 charts
      
      // Check for different chart types
      const chartTypes = result.findings?.map(f => 
        f.documentation?.match(/Chart type: (\w+)/)?.[1]
      ).filter(Boolean);
      
      expect(chartTypes).toContain('bar');
      expect(chartTypes).toContain('pie');
      expect(chartTypes).toContain('line');
      
      // Verify metrics
      expect(result.metrics?.chartsGenerated).toBe(4);
    });

    it('should handle missing analysis data gracefully', async () => {
      const context = createTestContext('reporting');
      
      const result = await adapter.analyze(context);

      expect(result.success).toBe(true);
      expect(result.findings).toEqual([]);
      expect(result.metrics?.chartsGenerated).toBe(0);
    });

    it('should generate educational progress charts', async () => {
      const context = createTestContext('reporting');
      
      (context as any).analysisData = {
        educational: {
          skillProgress: [
            { skill: 'TypeScript', before: 60, after: 75 },
            { skill: 'React', before: 50, after: 70 },
            { skill: 'Testing', before: 40, after: 65 }
          ],
          learningPath: {
            completed: 8,
            inProgress: 3,
            total: 15
          }
        }
      };

      const result = await adapter.analyze(context);

      expect(result.success).toBe(true);
      
      // Should generate skill progress chart
      const progressChart = result.findings?.find(f => 
        f.message.includes('Skill Progress')
      );
      expect(progressChart).toBeDefined();
      
      // Should generate learning path chart
      const pathChart = result.findings?.find(f => 
        f.message.includes('Learning Path')
      );
      expect(pathChart).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle MCP server initialization failure', async () => {
      jest.spyOn(adapter as any, 'initializeMCPServer').mockRejectedValue(
        new Error('Failed to start ChartJS MCP server')
      );

      const context = createTestContext('reporting');
      const result = await adapter.analyze(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to start ChartJS MCP server');
      expect(result.findings).toEqual([]);
    });

    it('should handle chart generation failure gracefully', async () => {
      jest.spyOn(adapter as any, 'initializeMCPServer').mockResolvedValue(undefined);
      jest.spyOn(adapter as any, 'executeMCPCommand').mockRejectedValue(
        new Error('Chart generation failed')
      );

      const chart = await adapter.generateLineChart({
        title: 'Test Chart',
        labels: ['A', 'B'],
        datasets: [{ label: 'Test', data: [1, 2] }]
      });

      expect(chart).toBeNull();
    });

    it('should validate chart data before generation', async () => {
      jest.spyOn(adapter as any, 'initializeMCPServer').mockResolvedValue(undefined);
      
      // Invalid data - no labels
      const chart = await adapter.generateBarChart({
        title: 'Invalid Chart',
        labels: [],
        datasets: [{ label: 'Test', data: [1, 2, 3] }]
      });

      expect(chart).toBeNull();
    });
  });

  describe('Chart Customization and Options', () => {
    beforeEach(() => {
      jest.spyOn(adapter as any, 'initializeMCPServer').mockResolvedValue(undefined);
      jest.spyOn(adapter as any, 'executeMCPCommand').mockImplementation(async (command) => {
        return {
          chart: {
            type: command.params.type,
            options: command.params.options,
            chartId: 'test-chart',
            imageUrl: 'data:image/png;base64,mockChart'
          }
        };
      });
    });

    it('should apply custom chart options', async () => {
      const customOptions = {
        plugins: {
          legend: {
            position: 'bottom' as const,
            labels: {
              font: { size: 14 }
            }
          },
          title: {
            display: true,
            text: 'Custom Title',
            font: { size: 16 }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100
          }
        }
      };

      const chart = await adapter.generateLineChart({
        title: 'Custom Chart',
        labels: ['Jan', 'Feb', 'Mar'],
        datasets: [{ label: 'Data', data: [10, 20, 30] }],
        options: customOptions
      });

      expect(chart).toBeDefined();
      expect(chart?.options).toMatchObject(customOptions);
    });

    it('should generate responsive charts by default', async () => {
      const chart = await adapter.generateBarChart({
        title: 'Responsive Chart',
        labels: ['A', 'B'],
        datasets: [{ label: 'Test', data: [1, 2] }]
      });

      expect(chart?.options?.responsive).toBe(true);
    });

    it('should support multiple datasets in same chart', async () => {
      const executeSpy = jest.spyOn(adapter as any, 'executeMCPCommand');
      
      await adapter.generateLineChart({
        title: 'Multi-Dataset Chart',
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        datasets: [
          {
            label: 'Product A',
            data: [100, 120, 140, 160],
            borderColor: 'blue'
          },
          {
            label: 'Product B',
            data: [80, 90, 110, 130],
            borderColor: 'red'
          },
          {
            label: 'Product C',
            data: [60, 65, 70, 85],
            borderColor: 'green'
          }
        ]
      });

      const callParams = executeSpy.mock.calls[0][0].params;
      expect(callParams.data.datasets).toHaveLength(3);
    });
  });

  describe('Performance and Export Features', () => {
    beforeEach(() => {
      jest.spyOn(adapter as any, 'initializeMCPServer').mockResolvedValue(undefined);
      jest.spyOn(adapter as any, 'executeMCPCommand').mockImplementation(async (command) => {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 50));
        
        return {
          chart: {
            type: command.params.type,
            chartId: `chart-${Date.now()}`,
            imageUrl: 'data:image/png;base64,mockChart',
            interactiveUrl: 'https://charts.example.com/test',
            exportFormats: ['png', 'svg', 'pdf']
          }
        };
      });
    });

    it('should complete chart generation within timeout', async () => {
      const startTime = Date.now();
      
      const chart = await adapter.generateBarChart({
        title: 'Performance Test',
        labels: Array.from({ length: 100 }, (_, i) => `Item ${i}`),
        datasets: [{
          label: 'Large Dataset',
          data: Array.from({ length: 100 }, () => Math.random() * 100)
        }]
      });

      const duration = Date.now() - startTime;
      
      expect(chart).toBeDefined();
      expect(duration).toBeLessThan(adapter.requirements.timeout);
    });

    it('should provide export options for generated charts', async () => {
      const chart = await adapter.generatePieChart({
        title: 'Export Test',
        labels: ['A', 'B', 'C'],
        datasets: [{ data: [30, 40, 30] }]
      });

      expect(chart?.exportFormats).toContain('png');
      expect(chart?.exportFormats).toContain('svg');
      expect(chart?.exportFormats).toContain('pdf');
    });

    it('should generate batch charts efficiently', async () => {
      const context = createTestContext('reporting');
      
      // Large analysis data
      (context as any).analysisData = {
        findings: Object.fromEntries(
          Array.from({ length: 10 }, (_, i) => [`category${i}`, Math.floor(Math.random() * 50)])
        ),
        metrics: Object.fromEntries(
          Array.from({ length: 10 }, (_, i) => [`metric${i}`, Math.floor(Math.random() * 100)])
        )
      };

      const startTime = Date.now();
      const result = await adapter.analyze(context);
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.metrics?.chartsGenerated).toBeGreaterThan(0);
      expect(duration).toBeLessThan(adapter.requirements.timeout);
    });
  });
});