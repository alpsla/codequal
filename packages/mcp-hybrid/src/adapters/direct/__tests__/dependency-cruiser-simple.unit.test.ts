import { DependencyCruiserDirectAdapterFixed } from '../dependency-cruiser-fixed';
import { AnalysisContext, AgentRole } from '../../../core/interfaces';

describe('Simple Dependency Cruiser Test', () => {
  let adapter: DependencyCruiserDirectAdapterFixed;

  beforeEach(() => {
    adapter = new DependencyCruiserDirectAdapterFixed();
  });

  it('should detect a simple circular dependency', async () => {
    const context: AnalysisContext = {
      pr: {
        prNumber: 100,
        title: 'Test circular dependencies',
        description: 'Testing circular dependency detection',
        author: 'test',
        baseBranch: 'main',
        targetBranch: 'feature/test',
        files: [
          {
            path: 'src/a.js',
            content: `const b = require('./b');\nmodule.exports = { a: 'A uses B' };`,
            language: 'javascript',
            changeType: 'added' as const
          },
          {
            path: 'src/b.js',
            content: `const a = require('./a');\nmodule.exports = { b: 'B uses A' };`,
            language: 'javascript',
            changeType: 'added' as const
          }
        ],
        commits: [{
          sha: 'test123',
          message: 'Add circular dependency',
          author: 'test'
        }]
      },
      repository: {
        name: 'test-repo',
        owner: 'test-org',
        primaryLanguage: 'javascript',
        languages: ['javascript'],
        frameworks: []
      },
      userContext: {
        userId: 'test-user',
        organizationId: 'test-org',
        permissions: ['read', 'write']
      },
      agentRole: 'architecture' as AgentRole
    };
    
    console.log('Testing simple circular dependency...');
    const result = await adapter.analyze(context);
    
    console.log('Result:', {
      success: result.success,
      findings: result.findings?.length,
      error: result.error
    });
    
    if (result.findings && result.findings.length > 0) {
      console.log('Findings:');
      result.findings.forEach(f => {
        console.log(`  - ${f.severity}: ${f.message}`);
      });
    }
    
    expect(result.success).toBe(true);
    expect(result.findings).toBeDefined();
    expect(result.findings!.length).toBeGreaterThan(0);
  });
});
