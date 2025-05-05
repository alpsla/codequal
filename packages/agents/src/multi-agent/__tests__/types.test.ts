import { 
  AgentPosition, 
  AnalysisStrategy, 
  AgentConfig, 
  MultiAgentConfig, 
  RepositoryData, 
  RepositoryFile,
  MultiAgentResult,
  AgentResultDetails
} from '../types';
import { AgentProvider, AgentRole } from '@codequal/core/config/agent-registry';

describe('Multi-Agent Types', () => {
  describe('Enums', () => {
    it('should define AgentPosition enum values correctly', () => {
      expect(AgentPosition.PRIMARY).toBe('primary');
      expect(AgentPosition.SECONDARY).toBe('secondary');
      expect(AgentPosition.FALLBACK).toBe('fallback');
      expect(AgentPosition.SPECIALIST).toBe('specialist');
    });

    it('should define AnalysisStrategy enum values correctly', () => {
      expect(AnalysisStrategy.PARALLEL).toBe('parallel');
      expect(AnalysisStrategy.SEQUENTIAL).toBe('sequential');
      expect(AnalysisStrategy.SPECIALIZED).toBe('specialized');
    });
  });

  describe('Interfaces', () => {
    it('should allow correct AgentConfig creation', () => {
      const config: AgentConfig = {
        provider: AgentProvider.CLAUDE,
        modelVersion: 'claude-3-sonnet-20240229',
        role: AgentRole.CODE_QUALITY,
        position: AgentPosition.PRIMARY,
        priority: 10,
        filePatterns: ['*.ts', '*.js'],
        maxTokens: 4000,
        temperature: 0.7,
        customPrompt: 'Custom instructions',
        parameters: {}
      };

      expect(config.provider).toBe(AgentProvider.CLAUDE);
      expect(config.role).toBe(AgentRole.CODE_QUALITY);
      expect(config.position).toBe(AgentPosition.PRIMARY);
      expect(config.priority).toBe(10);
      expect(config.filePatterns).toContain('*.ts');
      expect(config.maxTokens).toBe(4000);
      expect(config.temperature).toBe(0.7);
      expect(config.customPrompt).toBe('Custom instructions');
    });

    it('should allow correct MultiAgentConfig creation', () => {
      const config: MultiAgentConfig = {
        name: 'Test Config',
        description: 'Test configuration',
        strategy: AnalysisStrategy.PARALLEL,
        agents: [
          {
            provider: AgentProvider.CLAUDE,
            role: AgentRole.CODE_QUALITY,
            position: AgentPosition.PRIMARY,
            priority: 0,
            parameters: {}
          },
          {
            provider: AgentProvider.OPENAI,
            role: AgentRole.CODE_QUALITY,
            position: AgentPosition.SECONDARY,
            priority: 0,
            parameters: {}
          }
        ],
        fallbackEnabled: true,
        fallbackTimeout: 30000,
        fallbackRetries: 2,
        fallbackAgents: [
          {
            provider: AgentProvider.DEEPSEEK_CODER,
            role: AgentRole.CODE_QUALITY,
            position: AgentPosition.FALLBACK,
            priority: 10,
            parameters: {}
          }
        ],
        fallbackStrategy: 'ordered',
        combineResults: true,
        maxConcurrentAgents: 3
      };

      expect(config.name).toBe('Test Config');
      expect(config.strategy).toBe(AnalysisStrategy.PARALLEL);
      expect(config.agents.length).toBe(2);
      expect(config.fallbackEnabled).toBe(true);
      expect(config.fallbackTimeout).toBe(30000);
      expect(config.fallbackRetries).toBe(2);
      expect(config.fallbackAgents?.length).toBe(1);
      expect(config.fallbackStrategy).toBe('ordered');
      expect(config.combineResults).toBe(true);
      expect(config.maxConcurrentAgents).toBe(3);
    });

    it('should allow correct RepositoryData creation', () => {
      const file: RepositoryFile = {
        path: 'test.ts',
        content: 'const a = 1;',
        diff: '@@ -0,0 +1 @@\n+const a = 1;',
        previousContent: ''
      };

      const repoData: RepositoryData = {
        owner: 'test-owner',
        repo: 'test-repo',
        prNumber: 123,
        branch: 'feature/test',
        files: [file]
      };

      expect(repoData.owner).toBe('test-owner');
      expect(repoData.repo).toBe('test-repo');
      expect(repoData.prNumber).toBe(123);
      expect(repoData.branch).toBe('feature/test');
      expect(repoData.files.length).toBe(1);
      expect(repoData.files[0].path).toBe('test.ts');
      expect(repoData.files[0].content).toBe('const a = 1;');
      expect(repoData.files[0].diff).toBe('@@ -0,0 +1 @@\n+const a = 1;');
    });


    it('should allow correct MultiAgentResult creation', () => {
      const agentResult: AgentResultDetails = {
        result: {
          insights: [{ type: 'test-issue', severity: 'high', message: 'Test issue' }],
          suggestions: [{ file: 'test-file.ts', line: 42, suggestion: 'Test suggestion' }],
          educational: [],
          metadata: { duration: 500 }
        },
        error: undefined,
        duration: 500,
        agentConfig: {
          provider: AgentProvider.CLAUDE,
          role: AgentRole.CODE_QUALITY,
          position: AgentPosition.PRIMARY,
          priority: 0,
          parameters: {}
        },
        tokenUsage: {
          input: 100,
          output: 200,
          total: 300
        },
        cost: 0.05,
        usedFallback: false
      };

      const result: MultiAgentResult = {
        analysisId: 'test-analysis',
        strategy: AnalysisStrategy.PARALLEL,
        config: {
          name: 'Test Config',
          strategy: AnalysisStrategy.PARALLEL,
          agents: [],
          fallbackEnabled: true
        },
        results: {
          'PRIMARY-CLAUDE-CODE_QUALITY': agentResult
        },
        combinedResult: {
          insights: [{ type: 'combined-issue', severity: 'high', message: 'Combined issue' }],
          suggestions: [{ file: 'test-file.ts', line: 42, suggestion: 'Test suggestion' }],
          educational: [],
          metadata: { duration: 1000 }
        },
        successful: true,
        duration: 1000,
        totalCost: 0.05,
        usedFallback: false,
        fallbackStats: {
          totalFallbackAttempts: 0,
          successfulFallbacks: 0,
          failedFallbacks: 0
        }
      };

      expect(result.analysisId).toBe('test-analysis');
      expect(result.strategy).toBe(AnalysisStrategy.PARALLEL);
      expect(result.results['PRIMARY-CLAUDE-CODE_QUALITY']).toBeDefined();
      expect(result.results['PRIMARY-CLAUDE-CODE_QUALITY'].result?.insights.length).toBe(1);
      expect(result.combinedResult?.insights.length).toBe(1);
      expect(result.successful).toBe(true);
      expect(result.duration).toBe(1000);
      expect(result.totalCost).toBe(0.05);
      expect(result.usedFallback).toBe(false);
      expect(result.fallbackStats?.totalFallbackAttempts).toBe(0);
    });

    it('should allow AgentResultDetails with error', () => {
      const resultDetails: AgentResultDetails = {
        error: new Error('Invalid API key'),
        duration: 500,
        agentConfig: {
          provider: AgentProvider.CLAUDE,
          role: AgentRole.CODE_QUALITY,
          position: AgentPosition.PRIMARY,
          parameters: {}
        }
      };

      expect(resultDetails.error).toBeDefined();
      expect(resultDetails.error?.message).toBe('Invalid API key');
      expect(resultDetails.duration).toBe(500);
    });
  });
});