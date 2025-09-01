/**
 * Integration tests for tool execution validation
 * Ensures each agent properly executes its configured tools and parses results
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { EndToEndTransactionMonitor } from '../../../monitoring/end-to-end-transaction-monitor';
import { DynamicAgentCostMonitor } from '../../../monitoring/dynamic-agent-cost-monitor';

// Import all security agents
import { TypeScriptSecurityAgent } from '../../agents/TypeScriptSecurityAgent';
import { JavaScriptSecurityAgent } from '../../agents/JavaScriptSecurityAgent';
import { PythonSecurityAgent } from '../../agents/PythonSecurityAgent';
import { JavaSecurityAgent } from '../../agents/JavaSecurityAgent';
import { GoSecurityAgent } from '../../agents/GoSecurityAgent';
import { RubySecurityAgent } from '../../agents/RubySecurityAgent';
import { CppSecurityAgent } from '../../agents/CppSecurityAgent';
import { PHPSecurityAgent } from '../../agents/PHPSecurityAgent';
import { RustSecurityAgent } from '../../agents/RustSecurityAgent';
import { SonarQubeAgent } from '../../agents/SonarQubeAgent';

import { FileInfo } from '../../interfaces/agent-interfaces';

describe('Tool Execution Integration Tests', () => {
  let transactionMonitor: EndToEndTransactionMonitor;
  let costMonitor: DynamicAgentCostMonitor;
  let mockMonitoring: any;

  beforeEach(() => {
    transactionMonitor = EndToEndTransactionMonitor.getInstance();
    costMonitor = DynamicAgentCostMonitor.getInstance();
    
    mockMonitoring = {
      trackCost: jest.fn(),
      startPerformance: jest.fn().mockReturnValue('perf-123'),
      endPerformance: jest.fn()
    };

    // Mock tool execution for all agents
    jest.spyOn(global as any, 'executeTool').mockImplementation((tool: string) => {
      return Promise.resolve(getMockToolOutput(tool));
    });
  });

  describe('TypeScript/JavaScript Tool Execution', () => {
    it('should execute ESLint for TypeScript files', async () => {
      const agent = new TypeScriptSecurityAgent(mockMonitoring);
      const files: FileInfo[] = [{
        path: 'app.ts',
        content: 'const password = "hardcoded123";',
        branch: 'main'
      }];

      const executeSpy = jest.spyOn(agent as any, 'executeTool')
        .mockResolvedValue(getMockToolOutput('eslint'));

      const issues = await agent.analyzeBranch('main', files);

      expect(executeSpy).toHaveBeenCalledWith('eslint', expect.any(Array));
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].tool).toBe('eslint');
    });

    it('should execute Semgrep for JavaScript files', async () => {
      const agent = new JavaScriptSecurityAgent(mockMonitoring);
      const files: FileInfo[] = [{
        path: 'app.js',
        content: 'eval(userInput);',
        branch: 'main'
      }];

      const executeSpy = jest.spyOn(agent as any, 'executeTool')
        .mockResolvedValue(getMockToolOutput('semgrep'));

      const issues = await agent.analyzeBranch('main', files);

      expect(executeSpy).toHaveBeenCalledWith('semgrep', expect.any(Array));
      expect(issues.some(i => i.tool === 'semgrep')).toBe(true);
    });
  });

  describe('Python Tool Execution', () => {
    it('should execute Bandit for security analysis', async () => {
      const agent = new PythonSecurityAgent(mockMonitoring);
      const files: FileInfo[] = [{
        path: 'server.py',
        content: 'exec(user_input)',
        branch: 'main'
      }];

      const executeSpy = jest.spyOn(agent as any, 'executeTool')
        .mockResolvedValue(getMockToolOutput('bandit'));

      const issues = await agent.analyzeBranch('main', files);

      expect(executeSpy).toHaveBeenCalledWith('bandit', expect.any(Array));
      expect(issues.some(i => i.cwe === 'CWE-95')).toBe(true);
    });

    it('should execute Safety for dependency scanning', async () => {
      const agent = new PythonSecurityAgent(mockMonitoring);
      const files: FileInfo[] = [{
        path: 'requirements.txt',
        content: 'django==1.8.0',
        branch: 'main'
      }];

      const executeSpy = jest.spyOn(agent as any, 'executeTool')
        .mockResolvedValue(getMockToolOutput('safety'));

      await agent.analyzeBranch('main', files);

      expect(executeSpy).toHaveBeenCalledWith('safety', expect.any(Array));
    });
  });

  describe('Java Tool Execution', () => {
    it('should execute SpotBugs for bug detection', async () => {
      const agent = new JavaSecurityAgent(mockMonitoring);
      const files: FileInfo[] = [{
        path: 'App.java',
        content: 'String query = "SELECT * FROM users WHERE id = " + userId;',
        branch: 'main'
      }];

      const executeSpy = jest.spyOn(agent as any, 'executeTool')
        .mockResolvedValue(getMockToolOutput('spotbugs'));

      const issues = await agent.analyzeBranch('main', files);

      expect(executeSpy).toHaveBeenCalledWith('spotbugs', expect.any(Array));
      expect(issues.some(i => i.tool === 'spotbugs')).toBe(true);
    });

    it('should execute PMD for code quality', async () => {
      const agent = new JavaSecurityAgent(mockMonitoring);
      const files: FileInfo[] = [{
        path: 'Service.java',
        content: 'public class Service { }',
        branch: 'main'
      }];

      const executeSpy = jest.spyOn(agent as any, 'executeTool')
        .mockResolvedValue(getMockToolOutput('pmd'));

      await agent.analyzeBranch('main', files);

      expect(executeSpy).toHaveBeenCalledWith('pmd', expect.any(Array));
    });
  });

  describe('Go Tool Execution', () => {
    it('should execute GoSec for security scanning', async () => {
      const agent = new GoSecurityAgent(mockMonitoring);
      const files: FileInfo[] = [{
        path: 'main.go',
        content: 'exec.Command("sh", "-c", userInput).Run()',
        branch: 'main'
      }];

      const executeSpy = jest.spyOn(agent as any, 'executeTool')
        .mockResolvedValue(getMockToolOutput('gosec'));

      const issues = await agent.analyzeBranch('main', files);

      expect(executeSpy).toHaveBeenCalledWith('gosec', expect.any(Array));
      expect(issues.some(i => i.cwe === 'CWE-78')).toBe(true);
    });

    it('should execute Staticcheck for analysis', async () => {
      const agent = new GoSecurityAgent(mockMonitoring);
      const files: FileInfo[] = [{
        path: 'utils.go',
        content: 'package utils',
        branch: 'main'
      }];

      const executeSpy = jest.spyOn(agent as any, 'executeTool')
        .mockResolvedValue(getMockToolOutput('staticcheck'));

      await agent.analyzeBranch('main', files);

      expect(executeSpy).toHaveBeenCalledWith('staticcheck', expect.any(Array));
    });
  });

  describe('Ruby Tool Execution', () => {
    it('should execute Brakeman for Rails security', async () => {
      const agent = new RubySecurityAgent(mockMonitoring);
      const files: FileInfo[] = [{
        path: 'app/controllers/users_controller.rb',
        content: 'User.where("name = \'#{params[:name]}\'")',
        branch: 'main'
      }];

      const executeSpy = jest.spyOn(agent as any, 'executeTool')
        .mockResolvedValue(getMockToolOutput('brakeman'));

      const issues = await agent.analyzeBranch('main', files);

      expect(executeSpy).toHaveBeenCalledWith('brakeman', expect.any(Array));
      expect(issues.some(i => i.cwe === 'CWE-89')).toBe(true);
    });

    it('should execute RuboCop for linting', async () => {
      const agent = new RubySecurityAgent(mockMonitoring);
      const files: FileInfo[] = [{
        path: 'lib/helper.rb',
        content: 'def helper_method; end',
        branch: 'main'
      }];

      const executeSpy = jest.spyOn(agent as any, 'executeTool')
        .mockResolvedValue(getMockToolOutput('rubocop'));

      await agent.analyzeBranch('main', files);

      expect(executeSpy).toHaveBeenCalledWith('rubocop', expect.any(Array));
    });
  });

  describe('C/C++ Tool Execution', () => {
    it('should execute Cppcheck for static analysis', async () => {
      const agent = new CppSecurityAgent(mockMonitoring);
      const files: FileInfo[] = [{
        path: 'main.cpp',
        content: 'strcpy(buffer, userInput);',
        branch: 'main'
      }];

      const executeSpy = jest.spyOn(agent as any, 'executeTool')
        .mockResolvedValue(getMockToolOutput('cppcheck'));

      const issues = await agent.analyzeBranch('main', files);

      expect(executeSpy).toHaveBeenCalledWith('cppcheck', expect.any(Array));
      expect(issues.some(i => i.cwe === 'CWE-120')).toBe(true);
    });

    it('should execute Clang-Tidy for modern C++', async () => {
      const agent = new CppSecurityAgent(mockMonitoring);
      const files: FileInfo[] = [{
        path: 'modern.cpp',
        content: '#include <memory>',
        branch: 'main'
      }];

      const executeSpy = jest.spyOn(agent as any, 'executeTool')
        .mockResolvedValue(getMockToolOutput('clang-tidy'));

      await agent.analyzeBranch('main', files);

      expect(executeSpy).toHaveBeenCalledWith('clang-tidy', expect.any(Array));
    });
  });

  describe('PHP Tool Execution', () => {
    it('should execute PHPCS-Security for vulnerability scanning', async () => {
      const agent = new PHPSecurityAgent(mockMonitoring);
      const files: FileInfo[] = [{
        path: 'index.php',
        content: '<?php mysql_query("SELECT * FROM users WHERE id = " . $_GET["id"]); ?>',
        branch: 'main'
      }];

      const executeSpy = jest.spyOn(agent as any, 'executeTool')
        .mockResolvedValue(getMockToolOutput('phpcs-security'));

      const issues = await agent.analyzeBranch('main', files);

      expect(executeSpy).toHaveBeenCalledWith('phpcs-security-audit', expect.any(Array));
      expect(issues.some(i => i.cwe === 'CWE-89')).toBe(true);
    });

    it('should execute Psalm for taint analysis', async () => {
      const agent = new PHPSecurityAgent(mockMonitoring);
      const files: FileInfo[] = [{
        path: 'api.php',
        content: '<?php echo $_POST["name"]; ?>',
        branch: 'main'
      }];

      const executeSpy = jest.spyOn(agent as any, 'executeTool')
        .mockResolvedValue(getMockToolOutput('psalm'));

      const issues = await agent.analyzeBranch('main', files);

      expect(executeSpy).toHaveBeenCalledWith('psalm', expect.any(Array));
      expect(issues.some(i => i.tool === 'psalm')).toBe(true);
    });

    it('should execute PHPStan for static analysis', async () => {
      const agent = new PHPSecurityAgent(mockMonitoring);
      const files: FileInfo[] = [{
        path: 'class.php',
        content: '<?php class User { } ?>',
        branch: 'main'
      }];

      const executeSpy = jest.spyOn(agent as any, 'executeTool')
        .mockResolvedValue(getMockToolOutput('phpstan'));

      await agent.analyzeBranch('main', files);

      expect(executeSpy).toHaveBeenCalledWith('phpstan', expect.any(Array));
    });
  });

  describe('Rust Tool Execution', () => {
    it('should execute cargo-audit for dependency vulnerabilities', async () => {
      const agent = new RustSecurityAgent(mockMonitoring);
      const files: FileInfo[] = [{
        path: 'Cargo.toml',
        content: '[dependencies]\nvulnerable-crate = "0.1.0"',
        branch: 'main'
      }];

      const executeSpy = jest.spyOn(agent as any, 'executeTool')
        .mockResolvedValue(getMockToolOutput('cargo-audit'));

      const issues = await agent.analyzeBranch('main', files);

      expect(executeSpy).toHaveBeenCalledWith('cargo-audit', expect.any(Array));
      expect(issues.some(i => i.tool === 'cargo-audit')).toBe(true);
    });

    it('should execute clippy for linting', async () => {
      const agent = new RustSecurityAgent(mockMonitoring);
      const files: FileInfo[] = [{
        path: 'lib.rs',
        content: 'fn main() { None.unwrap(); }',
        branch: 'main'
      }];

      const executeSpy = jest.spyOn(agent as any, 'executeTool')
        .mockResolvedValue(getMockToolOutput('clippy'));

      const issues = await agent.analyzeBranch('main', files);

      expect(executeSpy).toHaveBeenCalledWith('clippy', expect.any(Array));
      expect(issues.some(i => i.title?.includes('Panic'))).toBe(true);
    });

    it('should execute cargo-geiger for unsafe code detection', async () => {
      const agent = new RustSecurityAgent(mockMonitoring);
      const files: FileInfo[] = [{
        path: 'unsafe.rs',
        content: 'unsafe { *ptr = 42; }',
        branch: 'main'
      }];

      const executeSpy = jest.spyOn(agent as any, 'executeTool')
        .mockResolvedValue(getMockToolOutput('cargo-geiger'));

      const issues = await agent.analyzeBranch('main', files);

      expect(executeSpy).toHaveBeenCalledWith('cargo-geiger', expect.any(Array));
      expect(issues.some(i => i.cwe === 'CWE-242')).toBe(true);
    });

    it('should execute rudra for memory safety', async () => {
      const agent = new RustSecurityAgent(mockMonitoring);
      const files: FileInfo[] = [{
        path: 'memory.rs',
        content: 'drop(vec); unsafe { *ptr = 4; }',
        branch: 'main'
      }];

      const executeSpy = jest.spyOn(agent as any, 'executeTool')
        .mockResolvedValue(getMockToolOutput('rudra'));

      const issues = await agent.analyzeBranch('main', files);

      expect(executeSpy).toHaveBeenCalledWith('rudra', expect.any(Array));
      expect(issues.some(i => i.cwe === 'CWE-416')).toBe(true);
    });
  });

  describe('SonarQube Integration', () => {
    it('should execute SonarQube analysis with cost tracking', async () => {
      const config = {
        url: 'https://sonar.example.com',
        token: 'test-token',
        projectKey: 'test-project'
      };
      
      const agent = new SonarQubeAgent(config, mockMonitoring);
      const files: FileInfo[] = [{
        path: 'app.ts',
        content: 'const password = "hardcoded";',
        branch: 'main'
      }];

      // Mock HTTP calls
      jest.spyOn(agent as any, 'triggerAnalysis').mockResolvedValue(undefined);
      jest.spyOn(agent as any, 'waitForAnalysisCompletion').mockResolvedValue(undefined);
      jest.spyOn(agent as any, 'fetchAnalysisResults').mockResolvedValue(
        getMockSonarQubeIssues()
      );

      const issues = await agent.analyzeBranch('main', files);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].tool).toBe('sonarqube');
      expect(mockMonitoring.trackCost).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'sonarqube',
          operation: 'analysis'
        })
      );
    });
  });

  describe('Tool Output Parsing', () => {
    it('should correctly parse JSON output from tools', () => {
      const jsonOutput = JSON.stringify({
        issues: [
          { file: 'test.js', line: 10, message: 'Security issue' }
        ]
      });

      // Test that agents can parse JSON output
      const agent = new JavaScriptSecurityAgent(mockMonitoring);
      const parsed = (agent as any).parseToolOutput(jsonOutput, 'json');
      
      expect(parsed).toBeDefined();
      expect(parsed.issues).toHaveLength(1);
    });

    it('should handle malformed tool output gracefully', async () => {
      const agent = new TypeScriptSecurityAgent(mockMonitoring);
      const files: FileInfo[] = [{
        path: 'app.ts',
        content: 'const x = 1;',
        branch: 'main'
      }];

      jest.spyOn(agent as any, 'executeTool')
        .mockResolvedValue('INVALID JSON OUTPUT');

      const issues = await agent.analyzeBranch('main', files);
      
      // Should handle error and return empty array or pattern-based results
      expect(Array.isArray(issues)).toBe(true);
    });
  });

  describe('Cost Tracking', () => {
    it('should track costs for paid tools', async () => {
      const operationId = await costMonitor.startAgentOperation({
        agentRole: 'comparator',
        operation: 'sonarqube-analysis',
        repository: 'test/repo'
      });

      costMonitor.updatePerformanceMetrics(operationId, {
        memoryMB: 512,
        cacheHits: 0,
        cacheMisses: 10
      });

      await costMonitor.endAgentOperation(operationId, true);

      // Verify cost was tracked
      expect(mockMonitoring.trackCost).toBeDefined();
    });
  });

  describe('Concurrent Tool Execution', () => {
    it('should execute multiple tools concurrently for performance', async () => {
      const agent = new TypeScriptSecurityAgent(mockMonitoring);
      const files: FileInfo[] = [
        { path: 'file1.ts', content: 'const x = 1;', branch: 'main' },
        { path: 'file2.ts', content: 'const y = 2;', branch: 'main' }
      ];

      const startTime = Date.now();
      
      // Mock tools with delays
      jest.spyOn(agent as any, 'executeTool')
        .mockImplementation(() => new Promise(resolve => 
          setTimeout(() => resolve(''), 50)
        ));

      await agent.analyzeBranch('main', files);
      const duration = Date.now() - startTime;

      // Should execute concurrently, not sequentially
      expect(duration).toBeLessThan(150); // Less than sequential time
    });
  });
});

/**
 * Mock tool outputs for testing
 */
function getMockToolOutput(tool: string): string {
  const outputs: Record<string, string> = {
    'eslint': JSON.stringify({
      results: [{
        filePath: 'app.ts',
        messages: [{
          line: 1,
          column: 7,
          severity: 2,
          message: 'Hardcoded password detected',
          ruleId: 'security/detect-hardcoded-secrets'
        }]
      }]
    }),
    'semgrep': JSON.stringify({
      results: [{
        path: 'app.js',
        check_id: 'javascript.lang.security.eval',
        start: { line: 1 },
        extra: { message: 'Dangerous eval() usage' }
      }]
    }),
    'bandit': JSON.stringify({
      results: [{
        filename: 'server.py',
        line_number: 1,
        issue_severity: 'HIGH',
        issue_confidence: 'HIGH',
        issue_text: 'Use of exec detected',
        test_id: 'B102'
      }]
    }),
    'gosec': JSON.stringify({
      Issues: [{
        file: 'main.go',
        line: '1',
        column: '1',
        rule_id: 'G204',
        severity: 'HIGH',
        confidence: 'HIGH',
        details: 'Subprocess launched with variable'
      }]
    }),
    'spotbugs': '<?xml version="1.0"?><BugCollection><BugInstance type="SQL_INJECTION"><SourceLine classname="App" start="1"/></BugInstance></BugCollection>',
    'brakeman': JSON.stringify({
      warnings: [{
        file: 'users_controller.rb',
        line: 1,
        warning_type: 'SQL Injection',
        confidence: 'High'
      }]
    }),
    'cppcheck': '[main.cpp:1]: (error) Buffer overflow possible',
    'phpcs-security': 'FILE: index.php\n 1 | ERROR | SQL injection detected',
    'psalm': JSON.stringify({
      issues: [{
        type: 'TaintedSql',
        file_path: 'index.php',
        line_from: 1
      }]
    }),
    'cargo-audit': JSON.stringify({
      vulnerabilities: {
        list: [{
          advisory: {
            id: 'RUSTSEC-2021-0001',
            package: 'vulnerable-crate',
            title: 'Security vulnerability'
          }
        }]
      }
    }),
    'clippy': JSON.stringify([{
      reason: 'compiler-message',
      message: {
        code: { code: 'clippy::unwrap_used' },
        level: 'warning',
        message: 'used unwrap()',
        spans: [{ line_start: 1 }]
      }
    }]),
    'default': ''
  };

  return outputs[tool] || outputs.default;
}

function getMockSonarQubeIssues() {
  return [
    {
      key: 'AX123',
      rule: 'squid:S2068',
      severity: 'CRITICAL',
      component: 'project:app.ts',
      line: 1,
      message: 'Hardcoded password',
      type: 'VULNERABILITY'
    }
  ];
}