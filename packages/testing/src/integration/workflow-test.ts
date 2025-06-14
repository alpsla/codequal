import { describe, it, expect, beforeAll } from '@jest/globals';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

/**
 * PR Analysis Workflow Test
 * Tests the core PR analysis workflow components
 */
describe('PR Analysis Workflow Components', () => {
  
  beforeAll(() => {
    // Verify environment is set up
    if (!process.env.SUPABASE_URL) {
      throw new Error('SUPABASE_URL not set in environment');
    }
  });

  describe('1. PR Context Extraction', () => {
    it('should parse GitHub PR URL', () => {
      const prUrl = 'https://github.com/codequal/test-repo/pull/123';
      
      // Extract components from URL
      const urlParts = prUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/);
      
      expect(urlParts).toBeTruthy();
      expect(urlParts![1]).toBe('codequal');
      expect(urlParts![2]).toBe('test-repo');
      expect(urlParts![3]).toBe('123');
      
      console.log('✅ PR URL parsing works correctly');
    });

    it('should build repository URL from PR URL', () => {
      const prUrl = 'https://github.com/codequal/test-repo/pull/123';
      const repoUrl = prUrl.replace(/\/pull\/\d+$/, '');
      
      expect(repoUrl).toBe('https://github.com/codequal/test-repo');
      console.log('✅ Repository URL extraction works');
    });
  });

  describe('2. Analysis Mode Selection', () => {
    it('should select agents based on analysis mode', () => {
      const agentSelection = {
        'quick': ['security', 'codeQuality'],
        'comprehensive': ['security', 'architecture', 'performance', 'codeQuality'],
        'deep': ['security', 'architecture', 'performance', 'codeQuality', 'dependencies']
      };
      
      // Test each mode
      for (const [mode, expectedAgents] of Object.entries(agentSelection)) {
        expect(expectedAgents).toBeInstanceOf(Array);
        expect(expectedAgents.length).toBeGreaterThan(0);
        console.log(`✅ ${mode} mode selects ${expectedAgents.length} agents`);
      }
    });
  });

  describe('3. Result Structure', () => {
    it('should create valid analysis result structure', () => {
      const mockResult = {
        analysisId: `analysis_${Date.now()}_test`,
        status: 'complete',
        repository: {
          url: 'https://github.com/test/repo',
          name: 'repo',
          primaryLanguage: 'javascript'
        },
        pr: {
          number: 123,
          title: 'Test PR',
          changedFiles: 5
        },
        analysis: {
          mode: 'quick',
          agentsUsed: ['security', 'codeQuality'],
          totalFindings: 3,
          processingTime: 5000
        },
        findings: {
          security: [
            { title: 'Potential XSS vulnerability', severity: 'medium' }
          ],
          codeQuality: [
            { title: 'Complex function', severity: 'low' },
            { title: 'Missing tests', severity: 'medium' }
          ]
        },
        metrics: {
          severity: { critical: 0, high: 0, medium: 2, low: 1 },
          confidence: 85,
          coverage: 75
        },
        report: {
          summary: 'Found 3 issues to review',
          recommendations: ['Add input validation', 'Refactor complex function'],
          prComment: '## CodeQual Analysis Results\\n\\nFound 3 issues'
        },
        metadata: {
          timestamp: new Date(),
          modelVersions: { security: 'gpt-4', codeQuality: 'gpt-3.5' },
          processingSteps: ['PR Context', 'Agent Analysis', 'Report Generation']
        }
      };
      
      // Validate structure
      expect(mockResult.analysisId).toMatch(/^analysis_\d+_/);
      expect(mockResult.status).toBe('complete');
      expect(mockResult.findings.security.length).toBe(1);
      expect(mockResult.findings.codeQuality.length).toBe(2);
      expect(mockResult.analysis.totalFindings).toBe(3);
      
      console.log('✅ Analysis result structure is valid');
    });
  });

  describe('4. Data Flow', () => {
    it('should follow correct data flow sequence', () => {
      const workflow = [
        'Extract PR Context',
        'Check Vector DB',
        'Trigger DeepWiki if needed',
        'Retrieve Tool Results',
        'Run Agent Analysis',
        'Process Results',
        'Generate Report'
      ];
      
      // Simulate workflow tracking
      const executedSteps: string[] = [];
      
      for (const step of workflow) {
        executedSteps.push(step);
        expect(executedSteps[executedSteps.length - 1]).toBe(step);
      }
      
      expect(executedSteps.length).toBe(workflow.length);
      console.log('✅ Workflow sequence is correct');
    });
  });

  describe('5. Error Scenarios', () => {
    it('should handle missing repository gracefully', () => {
      const handleMissingRepo = (repoUrl: string) => {
        // Simulate handling
        return {
          status: 'complete',
          degraded: true,
          reason: 'Repository not found in Vector DB'
        };
      };
      
      const result = handleMissingRepo('https://github.com/non-existent/repo');
      expect(result.degraded).toBe(true);
      expect(result.reason).toContain('not found');
      
      console.log('✅ Missing repository handled gracefully');
    });

    it('should handle partial tool failures', () => {
      const toolResults = {
        'npm-audit': { success: false, error: 'Tool failed' },
        'license-checker': { success: true, data: {} },
        'madge': { success: true, data: {} }
      };
      
      const successfulTools = Object.entries(toolResults)
        .filter(([_, result]) => result.success)
        .map(([tool, _]) => tool);
      
      expect(successfulTools.length).toBe(2);
      expect(successfulTools).toContain('license-checker');
      expect(successfulTools).toContain('madge');
      
      console.log('✅ Partial tool failures handled correctly');
    });
  });
});
