/**
 * Integration tests for agent selection based on file types and PR content
 * Validates the complete matrix of language-agent-tool combinations
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { 
  COVERAGE_MATRIX, 
  AgentSelector, 
  MatrixValidator,
  generateTestScenarios 
} from './agent-tool-matrix-validator';
import { EndToEndTransactionMonitor } from '../../../monitoring/end-to-end-transaction-monitor';
import { UnifiedMonitoringService } from '../../../monitoring/unified-monitoring-service';

describe('Agent Selection Integration Tests', () => {
  let selector: AgentSelector;
  let validator: MatrixValidator;
  let transactionMonitor: EndToEndTransactionMonitor;

  beforeEach(() => {
    selector = new AgentSelector();
    validator = new MatrixValidator();
    transactionMonitor = EndToEndTransactionMonitor.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Single Language Agent Selection', () => {
    COVERAGE_MATRIX.forEach(entry => {
      it(`should select ${entry.expectedAgent} for ${entry.language} files`, () => {
        const files = entry.testFiles.map(tf => ({
          path: tf.path,
          content: tf.content,
          branch: 'main'
        }));

        const selectedAgents = selector.selectAgents(files);
        
        expect(selectedAgents).toContain(entry.expectedAgent);
        expect(selectedAgents).toHaveLength(1);
      });

      it(`should select correct tools for ${entry.language}`, () => {
        const expectedTools = selector.getExpectedTools([entry.expectedAgent]);
        
        // Verify security tools
        entry.expectedSecurityTools.forEach(tool => {
          expect(expectedTools).toContain(tool);
        });

        // Verify quality tools
        entry.expectedQualityTools.forEach(tool => {
          expect(expectedTools).toContain(tool);
        });
      });
    });
  });

  describe('Multi-Language Agent Selection', () => {
    it('should select multiple agents for polyglot repositories', () => {
      const files = [
        { path: 'frontend/app.ts', content: 'const x = 1;', branch: 'main' },
        { path: 'backend/server.py', content: 'print("hello")', branch: 'main' },
        { path: 'scripts/build.go', content: 'package main', branch: 'main' }
      ];

      const selectedAgents = selector.selectAgents(files);
      
      expect(selectedAgents).toContain('TypeScriptSecurityAgent');
      expect(selectedAgents).toContain('PythonSecurityAgent');
      expect(selectedAgents).toContain('GoSecurityAgent');
      expect(selectedAgents).toHaveLength(3);
    });

    it('should combine tools from multiple agents', () => {
      const agents = ['TypeScriptSecurityAgent', 'PythonSecurityAgent'];
      const tools = selector.getExpectedTools(agents);
      
      // Should include tools from both agents
      expect(tools).toContain('semgrep');
      expect(tools).toContain('eslint');
      expect(tools).toContain('bandit');
      expect(tools).toContain('pylint');
    });
  });

  describe('File Extension Recognition', () => {
    const testCases = [
      { extension: '.ts', expectedAgent: 'TypeScriptSecurityAgent' },
      { extension: '.tsx', expectedAgent: 'TypeScriptSecurityAgent' },
      { extension: '.js', expectedAgent: 'JavaScriptSecurityAgent' },
      { extension: '.jsx', expectedAgent: 'JavaScriptSecurityAgent' },
      { extension: '.py', expectedAgent: 'PythonSecurityAgent' },
      { extension: '.java', expectedAgent: 'JavaSecurityAgent' },
      { extension: '.go', expectedAgent: 'GoSecurityAgent' },
      { extension: '.rb', expectedAgent: 'RubySecurityAgent' },
      { extension: '.cpp', expectedAgent: 'CppSecurityAgent' },
      { extension: '.c', expectedAgent: 'CppSecurityAgent' },
      { extension: '.php', expectedAgent: 'PHPSecurityAgent' },
      { extension: '.inc', expectedAgent: 'PHPSecurityAgent' },
      { extension: '.rs', expectedAgent: 'RustSecurityAgent' }
    ];

    testCases.forEach(({ extension, expectedAgent }) => {
      it(`should recognize ${extension} files and select ${expectedAgent}`, () => {
        const files = [{
          path: `test${extension}`,
          content: 'test content',
          branch: 'main'
        }];

        const selectedAgents = selector.selectAgents(files);
        expect(selectedAgents).toContain(expectedAgent);
      });
    });
  });

  describe('Complex Repository Structures', () => {
    it('should handle nested directory structures', () => {
      const files = [
        { path: 'src/main/java/com/example/App.java', content: '', branch: 'main' },
        { path: 'src/test/java/com/example/AppTest.java', content: '', branch: 'main' },
        { path: 'src/main/resources/config.properties', content: '', branch: 'main' }
      ];

      const selectedAgents = selector.selectAgents(files);
      expect(selectedAgents).toContain('JavaSecurityAgent');
    });

    it('should handle monorepo with multiple languages', () => {
      const files = [
        { path: 'packages/frontend/src/App.tsx', content: '', branch: 'main' },
        { path: 'packages/backend/src/server.py', content: '', branch: 'main' },
        { path: 'packages/shared/utils.js', content: '', branch: 'main' },
        { path: 'packages/cli/main.go', content: '', branch: 'main' }
      ];

      const selectedAgents = selector.selectAgents(files);
      expect(selectedAgents).toHaveLength(4);
      expect(selectedAgents).toContain('TypeScriptSecurityAgent');
      expect(selectedAgents).toContain('PythonSecurityAgent');
      expect(selectedAgents).toContain('JavaScriptSecurityAgent');
      expect(selectedAgents).toContain('GoSecurityAgent');
    });
  });

  describe('Tool Priority and Deduplication', () => {
    it('should not duplicate tools when multiple files of same type', () => {
      const files = [
        { path: 'file1.py', content: '', branch: 'main' },
        { path: 'file2.py', content: '', branch: 'main' },
        { path: 'file3.py', content: '', branch: 'main' }
      ];

      const selectedAgents = selector.selectAgents(files);
      const tools = selector.getExpectedTools(selectedAgents);
      
      // Should have unique tools, not duplicated
      const uniqueTools = [...new Set(tools)];
      expect(tools).toEqual(uniqueTools);
    });

    it('should handle overlapping tool sets correctly', () => {
      // Both TypeScript and JavaScript might use ESLint
      const agents = ['TypeScriptSecurityAgent', 'JavaScriptSecurityAgent'];
      const tools = selector.getExpectedTools(agents);
      
      // ESLint should appear only once
      const eslintCount = tools.filter(t => t === 'eslint').length;
      expect(eslintCount).toBe(1);
    });
  });

  describe('Scenario Validation', () => {
    it('should validate single language scenarios', async () => {
      const scenario = {
        name: 'Python Security Test',
        description: 'Test Python agent',
        repository: 'test/repo',
        prNumber: 1,
        files: [{
          path: 'test.py',
          content: 'exec(user_input)',
          branch: 'main'
        }],
        expectedAgents: ['PythonSecurityAgent'],
        expectedTools: ['bandit', 'safety', 'pylint', 'mypy'],
        expectedMinIssues: 1
      };

      const result = await validator.validateScenario(scenario);
      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing agents', async () => {
      const scenario = {
        name: 'Missing Agent Test',
        description: 'Test missing agent detection',
        repository: 'test/repo',
        prNumber: 2,
        files: [{
          path: 'test.py',
          content: 'print("hello")',
          branch: 'main'
        }],
        expectedAgents: ['PythonSecurityAgent', 'JavaSecurityAgent'], // Java not present
        expectedTools: ['bandit'],
        expectedMinIssues: 0
      };

      const result = await validator.validateScenario(scenario);
      expect(result.passed).toBe(false);
      expect(result.errors).toContain('Missing expected agents: JavaSecurityAgent');
    });

    it('should validate multi-language scenarios', async () => {
      const scenario = {
        name: 'Multi-Language Test',
        description: 'Test multi-language support',
        repository: 'test/repo',
        prNumber: 3,
        files: [
          { path: 'app.ts', content: 'const x = 1;', branch: 'main' },
          { path: 'server.go', content: 'package main', branch: 'main' }
        ],
        expectedAgents: ['TypeScriptSecurityAgent', 'GoSecurityAgent'],
        expectedTools: ['semgrep', 'eslint', 'gosec', 'staticcheck', 'golangci-lint'],
        expectedMinIssues: 0
      };

      const result = await validator.validateScenario(scenario);
      expect(result.passed).toBe(true);
    });
  });

  describe('Integration with Transaction Monitoring', () => {
    it('should track agent selection in transaction', () => {
      const transaction = transactionMonitor.startTransaction(
        'test-pr-analysis',
        'pr-analysis',
        {
          repository: 'test/repo',
          prNumber: 123
        }
      );

      const files = [
        { path: 'test.ts', content: '', branch: 'main' },
        { path: 'test.py', content: '', branch: 'main' }
      ];

      const selectedAgents = selector.selectAgents(files);
      
      // Track agent selection
      selectedAgents.forEach(agent => {
        transactionMonitor.startSpan(transaction.id, `agent-${agent}`, 'agent-invocation');
      });

      const txData = transactionMonitor.getTransaction(transaction.id);
      expect(txData?.metrics.agentInvocations).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty file list', () => {
      const selectedAgents = selector.selectAgents([]);
      expect(selectedAgents).toHaveLength(0);
    });

    it('should handle files with no extension', () => {
      const files = [
        { path: 'Dockerfile', content: '', branch: 'main' },
        { path: 'Makefile', content: '', branch: 'main' }
      ];

      const selectedAgents = selector.selectAgents(files);
      expect(selectedAgents).toHaveLength(0);
    });

    it('should handle unknown file extensions', () => {
      const files = [
        { path: 'test.xyz', content: '', branch: 'main' },
        { path: 'config.toml', content: '', branch: 'main' }
      ];

      const selectedAgents = selector.selectAgents(files);
      expect(selectedAgents).toHaveLength(0);
    });

    it('should handle mixed known and unknown extensions', () => {
      const files = [
        { path: 'test.py', content: '', branch: 'main' },
        { path: 'config.unknown', content: '', branch: 'main' },
        { path: 'app.ts', content: '', branch: 'main' }
      ];

      const selectedAgents = selector.selectAgents(files);
      expect(selectedAgents).toHaveLength(2);
      expect(selectedAgents).toContain('PythonSecurityAgent');
      expect(selectedAgents).toContain('TypeScriptSecurityAgent');
    });
  });

  describe('Performance Tests', () => {
    it('should handle large file lists efficiently', () => {
      const files = [];
      // Generate 1000 files
      for (let i = 0; i < 1000; i++) {
        const extensions = ['.ts', '.py', '.go', '.java', '.rb'];
        const ext = extensions[i % extensions.length];
        files.push({
          path: `file${i}${ext}`,
          content: '',
          branch: 'main'
        });
      }

      const startTime = Date.now();
      const selectedAgents = selector.selectAgents(files);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete in < 100ms
      expect(selectedAgents.length).toBeGreaterThan(0);
    });
  });
});

describe('Complete Matrix Coverage Test', () => {
  it('should have test coverage for all supported languages', () => {
    const supportedLanguages = [
      'TypeScript', 'JavaScript', 'Python', 'Java',
      'Go', 'Ruby', 'C++', 'PHP', 'Rust'
    ];

    supportedLanguages.forEach(lang => {
      const entry = COVERAGE_MATRIX.find(e => e.language === lang);
      expect(entry).toBeDefined();
      expect(entry?.expectedAgent).toBeDefined();
      expect(entry?.expectedSecurityTools.length).toBeGreaterThan(0);
    });
  });

  it('should run all generated test scenarios', async () => {
    const scenarios = generateTestScenarios();
    
    // Should have at least one scenario per language plus multi-language scenarios
    expect(scenarios.length).toBeGreaterThanOrEqual(COVERAGE_MATRIX.length + 3);
    
    // Validate each scenario structure
    scenarios.forEach(scenario => {
      expect(scenario.name).toBeDefined();
      expect(scenario.files.length).toBeGreaterThan(0);
      expect(scenario.expectedAgents.length).toBeGreaterThan(0);
      expect(scenario.expectedTools.length).toBeGreaterThan(0);
    });
  });
});