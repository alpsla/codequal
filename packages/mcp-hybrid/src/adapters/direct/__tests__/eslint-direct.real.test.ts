/**
 * ESLint Direct Adapter Real Data Integration Tests
 */

import { ESLintDirectAdapter } from '../eslint-direct';
import { AnalysisContext, AgentRole } from '../../../core/interfaces';

describe('ESLint Direct Real Data Integration Tests', () => {
  let adapter: ESLintDirectAdapter;
  
  beforeEach(() => {
    adapter = new ESLintDirectAdapter();
  });
  
  // Real context with actual code
  const createRealContext = (): AnalysisContext => ({
    pr: {
      prNumber: 1,
      title: 'Test PR',
      description: 'Testing real execution',
      author: 'test',
      baseBranch: 'main',
      targetBranch: 'feature/test',
      files: [
        {
          path: 'test.js',
          content: `
// Test file with issues
const x = 1;
const y = 2; // unused variable
console.log(x);

function badFunction() {
  eval("dangerous code"); // security issue
}
`, 
          language: 'javascript',
          changeType: 'added'
        },
        {
          path: 'good.js',
          content: `
// Clean file
export function add(a, b) {
  return a + b;
}

export function multiply(a, b) {
  return a * b;
}
`, 
          language: 'javascript',
          changeType: 'added'
        }
      ],
      commits: [{
        sha: 'abc123',
        message: 'test',
        author: 'test'
      }]
    },
    repository: {
      name: 'test-repo',
      owner: 'test',
      primaryLanguage: 'javascript',
      languages: ['javascript'],
      frameworks: []
    },
    userContext: {
      userId: 'test-user',
      organizationId: 'test-org',
      permissions: ['read', 'write']
    },
    agentRole: 'codeQuality' as AgentRole
  });
  
  test('should analyze JavaScript files with ESLint', async () => {
    console.log('Running ESLint direct analysis...');
    
    const context = createRealContext();
    const result = await adapter.analyze(context);
    
    console.log('Result:', {
      success: result.success,
      findingsCount: result.findings?.length,
      metrics: result.metrics,
      error: result.error
    });
    
    // Log findings for debugging
    if (result.findings) {
      console.log('Findings:');
      result.findings.forEach(f => {
        console.log(`  - ${f.file}:${f.line} ${f.severity}: ${f.message} (${f.ruleId})`);
      });
    }
    
    // Verify the result
    expect(result.success).toBe(true);
    expect(result.findings).toBeDefined();
    expect(result.findings!.length).toBeGreaterThan(0);
    
    // Should find unused variable
    const unusedVar = result.findings!.find(f => 
      f.ruleId === 'no-unused-vars' && f.message.includes('y')
    );
    expect(unusedVar).toBeDefined();
    expect(unusedVar!.file).toBe('test.js');
    
    // Should find console.log
    const consoleLog = result.findings!.find(f => 
      f.ruleId === 'no-console'
    );
    expect(consoleLog).toBeDefined();
    
    // Should find eval usage
    const evalUsage = result.findings!.find(f => 
      f.ruleId === 'no-eval'
    );
    expect(evalUsage).toBeDefined();
    expect(evalUsage!.severity).toBe('critical');
    
    // Check metrics
    expect(result.metrics).toBeDefined();
    expect(result.metrics!.filesAnalyzed).toBe(2);
    expect(result.metrics!.totalIssues).toBeGreaterThan(0);
    expect(result.metrics!.errors).toBeGreaterThan(0);
  }, 30000);
  
  test('should perform health check', async () => {
    const isHealthy = await adapter.healthCheck();
    console.log('ESLint Direct health check:', isHealthy);
    expect(isHealthy).toBe(true);
  }, 10000);
  
  test('should handle syntax errors gracefully', async () => {
    const context = createRealContext();
    context.pr.files = [{
      path: 'broken.js',
      content: 'const x = {', // Syntax error
      language: 'javascript',
      changeType: 'added'
    }];
    
    const result = await adapter.analyze(context);
    
    console.log('Syntax error test result:', {
      success: result.success,
      findingsCount: result.findings?.length,
      error: result.error
    });
    
    // Should handle gracefully - either success with findings or controlled error
    if (result.success) {
      expect(result.findings).toBeDefined();
      // Should report syntax/parsing error
      const syntaxError = result.findings!.find(f => 
        f.message.toLowerCase().includes('parsing') ||
        f.message.toLowerCase().includes('unexpected') ||
        f.message.toLowerCase().includes('syntax') ||
        f.message.toLowerCase().includes('token')
      );
      expect(syntaxError).toBeDefined();
    } else {
      // If it fails, it should be a controlled failure
      expect(result.error).toBeDefined();
      expect(result.error!.recoverable).toBe(true);
    }
  }, 15000);
  
  test('should handle empty files list', async () => {
    const context = createRealContext();
    context.pr.files = [];
    
    const result = await adapter.analyze(context);
    
    expect(result.success).toBe(true);
    expect(result.findings).toEqual([]);
    expect(result.metrics!.filesAnalyzed).toBe(0);
  });
  
  test('should handle non-JavaScript files', async () => {
    const context = createRealContext();
    context.pr.files = [{
      path: 'README.md',
      content: '# Test\n\nThis is a readme file.',
      language: 'markdown',
      changeType: 'added'
    }];
    
    const result = await adapter.analyze(context);
    
    expect(result.success).toBe(true);
    expect(result.findings).toEqual([]);
    expect(result.metrics!.filesAnalyzed).toBe(0);
  });
});