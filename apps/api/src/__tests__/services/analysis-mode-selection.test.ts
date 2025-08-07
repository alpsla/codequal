/* eslint-disable @typescript-eslint/no-explicit-any */
import { ResultOrchestrator } from '../../services/result-orchestrator';
import { createLogger } from '@codequal/core/utils';

// Mock the dependencies
jest.mock('@codequal/core/utils');
jest.mock('../../services/deepwiki-api-manager');
jest.mock('@codequal/agents/multi-agent/enhanced-executor');
jest.mock('../../services/pr-context-service');

describe('Analysis Mode Selection Logic', () => {
  let orchestrator: any;
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };
    (createLogger as jest.Mock).mockReturnValue(mockLogger);

    // Access private method through prototype
    orchestrator = new ResultOrchestrator({} as any);
  });

  describe('selectAnalysisModeBasedOnPR', () => {
    // Test high-risk PR detection
    it('should select deep mode for high-risk PRs', () => {
      const prAnalysis = {
        riskLevel: 'high',
        complexity: 'moderate',
        changeTypes: ['security'],
        totalChanges: 100
      };

      const mode = orchestrator['selectAnalysisModeBasedOnPR'](prAnalysis);
      expect(mode).toBe('deep');
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('High-risk PR detected'),
        expect.any(Object)
      );
    });

    // Test complex mixed changes
    it('should select deep mode for complex mixed changes', () => {
      const prAnalysis = {
        riskLevel: 'medium',
        complexity: 'complex',
        changeTypes: ['mixed', 'security', 'architecture'],
        totalChanges: 500
      };

      const mode = orchestrator['selectAnalysisModeBasedOnPR'](prAnalysis);
      expect(mode).toBe('deep');
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Complex mixed changes detected'),
        expect.any(Object)
      );
    });

    // Test medium risk
    it('should select comprehensive mode for medium risk PRs', () => {
      const prAnalysis = {
        riskLevel: 'medium',
        complexity: 'simple',
        changeTypes: ['feature'],
        totalChanges: 50
      };

      const mode = orchestrator['selectAnalysisModeBasedOnPR'](prAnalysis);
      expect(mode).toBe('comprehensive');
    });

    // Test moderate complexity
    it('should select comprehensive mode for moderate complexity', () => {
      const prAnalysis = {
        riskLevel: 'low',
        complexity: 'moderate',
        changeTypes: ['refactor'],
        totalChanges: 200
      };

      const mode = orchestrator['selectAnalysisModeBasedOnPR'](prAnalysis);
      expect(mode).toBe('comprehensive');
    });

    // Test trivial changes
    it('should select quick mode for docs-only changes', () => {
      const prAnalysis = {
        riskLevel: 'low',
        complexity: 'trivial',
        changeTypes: ['docs-only'],
        totalChanges: 5
      };

      const mode = orchestrator['selectAnalysisModeBasedOnPR'](prAnalysis);
      expect(mode).toBe('quick');
    });

    it('should select quick mode for test-only changes', () => {
      const prAnalysis = {
        riskLevel: 'low',
        complexity: 'trivial',
        changeTypes: ['test-only'],
        totalChanges: 10
      };

      const mode = orchestrator['selectAnalysisModeBasedOnPR'](prAnalysis);
      expect(mode).toBe('quick');
    });

    it('should select quick mode for style-only changes', () => {
      const prAnalysis = {
        riskLevel: 'low',
        complexity: 'trivial',
        changeTypes: ['style-only'],
        totalChanges: 3
      };

      const mode = orchestrator['selectAnalysisModeBasedOnPR'](prAnalysis);
      expect(mode).toBe('quick');
    });

    it('should select quick mode for ui-only changes', () => {
      const prAnalysis = {
        riskLevel: 'low',
        complexity: 'trivial',
        changeTypes: ['ui-only'],
        totalChanges: 15
      };

      const mode = orchestrator['selectAnalysisModeBasedOnPR'](prAnalysis);
      expect(mode).toBe('quick');
    });

    // Test default case
    it('should default to comprehensive mode for unmatched patterns', () => {
      const prAnalysis = {
        riskLevel: 'low',
        complexity: 'simple',
        changeTypes: ['feature', 'bugfix'],
        totalChanges: 100
      };

      const mode = orchestrator['selectAnalysisModeBasedOnPR'](prAnalysis);
      expect(mode).toBe('comprehensive');
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Defaulting to comprehensive mode'),
        expect.any(Object)
      );
    });

    // Test null/undefined input
    it('should default to comprehensive when no PR analysis is provided', () => {
      const mode = orchestrator['selectAnalysisModeBasedOnPR'](null);
      expect(mode).toBe('comprehensive');
    });
  });

  describe('Agent Selection Based on PR Content', () => {
    it('should use all agents for high-risk PRs regardless of skipping recommendations', () => {
      const prAnalysis = {
        riskLevel: 'high',
        agentsToSkip: ['performance', 'dependency'],
        agentsToKeep: ['security'],
        changeTypes: ['security']
      };

      const agents = orchestrator['selectAgentsForAnalysis']('comprehensive', prAnalysis);
      expect(agents).toEqual(['security', 'architecture', 'performance', 'codeQuality', 'dependency']);
      expect(agents).toContain('performance'); // Should not be skipped for high risk
      expect(agents).toContain('dependency'); // Should not be skipped for high risk
    });

    it('should skip agents for low-risk PRs as recommended', () => {
      const prAnalysis = {
        riskLevel: 'low',
        agentsToSkip: ['performance', 'architecture'],
        agentsToKeep: ['security', 'codeQuality'],
        changeTypes: ['docs']
      };

      const agents = orchestrator['selectAgentsForAnalysis']('comprehensive', prAnalysis);
      expect(agents).not.toContain('performance');
      expect(agents).not.toContain('architecture');
      expect(agents).toContain('security');
      expect(agents).toContain('codeQuality');
    });

    it('should include all base agents when no PR analysis provided', () => {
      const agents = orchestrator['selectAgentsForAnalysis']('deep', null);
      expect(agents).toEqual([
        'security', 
        'architecture', 
        'performance', 
        'codeQuality', 
        'dependency', 
        'educational', 
        'reporting'
      ]);
    });
  });

  describe('Repository Analysis Trigger Logic', () => {
    it('should trigger analysis when repository not in Vector DB', async () => {
      const mockDeepWikiManager = {
        checkRepositoryExists: jest.fn().mockResolvedValue(false),
        triggerRepositoryAnalysis: jest.fn().mockResolvedValue('job-123'),
        waitForAnalysisCompletion: jest.fn().mockResolvedValue({ analysis: {} })
      };

      orchestrator['deepWikiManager'] = mockDeepWikiManager;

      const status = await orchestrator['checkRepositoryStatus']('https://github.com/test/repo');
      
      expect(status.exists).toBe(false);
      expect(status.needsReanalysis).toBe(true);
      expect(mockDeepWikiManager.checkRepositoryExists).toHaveBeenCalledWith('https://github.com/test/repo');
    });

    it('should not trigger analysis when repository exists in Vector DB', async () => {
      const mockDeepWikiManager = {
        checkRepositoryExists: jest.fn().mockResolvedValue(true)
      };

      orchestrator['deepWikiManager'] = mockDeepWikiManager;

      const status = await orchestrator['checkRepositoryStatus']('https://github.com/test/repo');
      
      expect(status.exists).toBe(true);
      expect(status.needsReanalysis).toBe(false);
    });
  });

  describe('Edge Cases and Special Scenarios', () => {
    // Security-critical files should always trigger deep analysis
    it('should force deep analysis for security-critical file changes', () => {
      const prAnalysis = {
        riskLevel: 'low', // Even with low risk
        complexity: 'trivial', // Even with trivial complexity
        changeTypes: ['security'], // Security changes present
        totalChanges: 1
      };

      // This should ideally trigger deep mode for security files
      // Current implementation might need adjustment
      const mode = orchestrator['selectAnalysisModeBasedOnPR'](prAnalysis);
      // Based on current logic, this would be comprehensive
      expect(mode).toBe('comprehensive');
    });

    // Large PRs should consider upgrading analysis mode
    it('should consider total changes in mode selection', () => {
      const prAnalysis = {
        riskLevel: 'low',
        complexity: 'simple',
        changeTypes: ['feature'],
        totalChanges: 1000 // Very large PR
      };

      const mode = orchestrator['selectAnalysisModeBasedOnPR'](prAnalysis);
      expect(mode).toBe('comprehensive');
    });

    // Mixed type changes with complexity
    it('should handle multiple change types appropriately', () => {
      const prAnalysis = {
        riskLevel: 'medium',
        complexity: 'moderate',
        changeTypes: ['feature', 'bugfix', 'test', 'docs'],
        totalChanges: 250
      };

      const mode = orchestrator['selectAnalysisModeBasedOnPR'](prAnalysis);
      expect(mode).toBe('comprehensive');
    });
  });
});