import { NpmAuditDirectAdapter } from '../npm-audit-direct';
import { LicenseCheckerDirectAdapter } from '../license-checker-direct';  
import { MadgeDirectAdapter } from '../madge-direct';
import { AnalysisContext, AgentRole } from '../../../core/interfaces';

describe('Simple New Adapters Test', () => {
  
  describe('NPM Audit Adapter', () => {
    let adapter: NpmAuditDirectAdapter;

    beforeEach(() => {
      adapter = new NpmAuditDirectAdapter();
    });

    it('should instantiate correctly', () => {
      expect(adapter.id).toBe('npm-audit-direct');
      expect(adapter.name).toBe('NPM Audit Direct');
      expect(adapter.type).toBe('direct');
    });

    it('should detect when it can analyze', () => {
      const context: AnalysisContext = {
        agentRole: 'security' as AgentRole,
        pr: {
          prNumber: 1,
          title: 'Test',
          description: 'Test',
          author: 'test',
          baseBranch: 'main',
          targetBranch: 'feature',
          files: [{
            path: 'package.json',
            content: '{}',
            changeType: 'modified'
          }],
          commits: []
        },
        repository: {
          name: 'test',
          owner: 'test',
          languages: ['javascript'],
          frameworks: []
        },
        userContext: {
          userId: 'test',
          permissions: []
        }
      };

      expect(adapter.canAnalyze(context)).toBe(true);
      
      // Should not analyze for non-security role
      context.agentRole = 'architecture' as AgentRole;
      expect(adapter.canAnalyze(context)).toBe(false);
    });
  });

  describe('License Checker Adapter', () => {
    let adapter: LicenseCheckerDirectAdapter;

    beforeEach(() => {
      adapter = new LicenseCheckerDirectAdapter();
    });

    it('should instantiate correctly', () => {
      expect(adapter.id).toBe('license-checker-direct');
      expect(adapter.name).toBe('License Checker Direct');
      expect(adapter.type).toBe('direct');
    });

    it('should analyze package.json content', async () => {
      const context: AnalysisContext = {
        agentRole: 'dependency' as AgentRole,
        pr: {
          prNumber: 1,
          title: 'Test',
          description: 'Test',
          author: 'test',
          baseBranch: 'main',
          targetBranch: 'feature',
          files: [{
            path: 'package.json',
            content: JSON.stringify({
              name: 'test-app',
              dependencies: {
                'express': '^4.0.0'
              }
            }),
            changeType: 'modified'
          }],
          commits: []
        },
        repository: {
          name: 'test',
          owner: 'test',
          languages: ['javascript'],
          frameworks: []
        },
        userContext: {
          userId: 'test',
          permissions: []
        }
      };

      const result = await adapter.analyze(context);
      
      expect(result.success).toBe(true);
      expect(result.toolId).toBe('license-checker-direct');
      expect(result.findings).toBeDefined();
      
      // Should find missing license
      const missingLicense = result.findings?.find(f => f.ruleId === 'missing-license');
      expect(missingLicense).toBeDefined();
    });
  });

  describe('Madge Adapter', () => {
    let adapter: MadgeDirectAdapter;

    beforeEach(() => {
      adapter = new MadgeDirectAdapter();
    });

    it('should instantiate correctly', () => {
      expect(adapter.id).toBe('madge-direct');
      expect(adapter.name).toBe('Madge Circular Dependency Detector');
      expect(adapter.type).toBe('direct');
    });

    it('should detect circular imports in PR files', async () => {
      const context: AnalysisContext = {
        agentRole: 'architecture' as AgentRole,
        pr: {
          prNumber: 1,
          title: 'Test',
          description: 'Test',
          author: 'test',
          baseBranch: 'main',
          targetBranch: 'feature',
          files: [
            {
              path: 'src/a.js',
              content: `import { b } from './b';\nexport const a = () => b();`,
              changeType: 'added'
            },
            {
              path: 'src/b.js',
              content: `import { a } from './a';\nexport const b = () => a();`,
              changeType: 'added'
            }
          ],
          commits: []
        },
        repository: {
          name: 'test',
          owner: 'test',
          languages: ['javascript'],
          frameworks: []
        },
        userContext: {
          userId: 'test',
          permissions: []
        }
      };

      const result = await adapter.analyze(context);
      
      expect(result.success).toBe(true);
      expect(result.toolId).toBe('madge-direct');
      expect(result.findings).toBeDefined();
      
      // Should detect circular dependency
      const circular = result.findings?.find(f => f.ruleId === 'potential-circular-dependency');
      expect(circular).toBeDefined();
    });
  });
});
