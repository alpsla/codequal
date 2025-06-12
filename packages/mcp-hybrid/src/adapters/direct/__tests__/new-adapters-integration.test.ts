/**
 * Integration tests for NEW direct adapters
 * Tests NPM Outdated, Bundlephobia, and SonarJS adapters
 */

import { NpmOutdatedDirectAdapter } from '../npm-outdated-direct';
import { BundlephobiaDirectAdapter } from '../bundlephobia-direct';
import { SonarJSDirectAdapter } from '../sonarjs-direct';
import { AnalysisContext, AgentRole } from '../../../core/interfaces';

describe('NEW Direct Adapters Integration Tests', () => {
  
  const createTestContext = (role: AgentRole, files: any[]): AnalysisContext => ({
    pr: {
      prNumber: 123,
      title: 'Test PR for new adapters',
      description: 'Testing new adapter functionality',
      author: 'test-user',
      baseBranch: 'main',
      targetBranch: 'feature/test',
      files,
      commits: [{
        sha: 'abc123',
        message: 'test commit',
        author: 'test-user'
      }]
    },
    repository: {
      name: 'test-repo',
      owner: 'test-org',
      primaryLanguage: 'javascript',
      languages: ['javascript', 'typescript'],
      frameworks: ['node']
    },
    userContext: {
      userId: 'test-user',
      organizationId: 'test-org',
      permissions: ['read', 'write']
    },
    agentRole: role
  });

  describe('NPM Outdated Direct Adapter', () => {
    let adapter: NpmOutdatedDirectAdapter;

    beforeEach(() => {
      adapter = new NpmOutdatedDirectAdapter();
    });

    test('should have correct metadata', () => {
      expect(adapter.id).toBe('npm-outdated-direct');
      expect(adapter.name).toBe('NPM Outdated Direct');
      expect(adapter.version).toBe('1.0.0');
      expect(adapter.type).toBe('direct');
      expect(adapter.capabilities).toHaveLength(2);
    });

    test('should only analyze dependency agent role', () => {
      const dependencyContext = createTestContext('dependency' as AgentRole, [
        { path: 'package.json', content: '{}', language: 'json', changeType: 'modified' }
      ]);
      
      const codeQualityContext = createTestContext('codeQuality' as AgentRole, [
        { path: 'package.json', content: '{}', language: 'json', changeType: 'modified' }
      ]);

      expect(adapter.canAnalyze(dependencyContext)).toBe(true);
      expect(adapter.canAnalyze(codeQualityContext)).toBe(false);
    });

    test('should require package.json files', () => {
      const withPackageJson = createTestContext('dependency' as AgentRole, [
        { path: 'package.json', content: '{}', language: 'json', changeType: 'modified' }
      ]);
      
      const withoutPackageJson = createTestContext('dependency' as AgentRole, [
        { path: 'index.js', content: 'console.log("test")', language: 'javascript', changeType: 'added' }
      ]);

      expect(adapter.canAnalyze(withPackageJson)).toBe(true);
      expect(adapter.canAnalyze(withoutPackageJson)).toBe(false);
    });

    test('should pass health check', async () => {
      const health = await adapter.healthCheck();
      expect(health).toBe(true);
    });

    test('should handle analysis gracefully', async () => {
      const context = createTestContext('dependency' as AgentRole, [
        { 
          path: 'package.json', 
          content: JSON.stringify({
            dependencies: { lodash: '^4.0.0' }
          }), 
          language: 'json', 
          changeType: 'modified' 
        }
      ]);

      const result = await adapter.analyze(context);
      
      expect(result).toBeDefined();
      expect(result.toolId).toBe('npm-outdated-direct');
      expect(typeof result.executionTime).toBe('number');
      expect(Array.isArray(result.findings)).toBe(true);
    });
  });

  describe('Bundlephobia Direct Adapter', () => {
    let adapter: BundlephobiaDirectAdapter;

    beforeEach(() => {
      adapter = new BundlephobiaDirectAdapter();
    });

    test('should have correct metadata', () => {
      expect(adapter.id).toBe('bundlephobia-direct');
      expect(adapter.name).toBe('Bundlephobia Direct');
      expect(adapter.version).toBe('1.0.0');
      expect(adapter.type).toBe('direct');
      expect(adapter.capabilities).toHaveLength(2);
    });

    test('should analyze performance agent role', () => {
      const performanceContext = createTestContext('performance' as AgentRole, [
        { path: 'package.json', content: '{}', language: 'json', changeType: 'modified' }
      ]);
      
      expect(adapter.canAnalyze(performanceContext)).toBe(true);
    });

    test('should pass health check', async () => {
      const health = await adapter.healthCheck();
      expect(health).toBe(true);
    });

    test('should analyze bundle sizes successfully', async () => {
      const context = createTestContext('performance' as AgentRole, [
        { 
          path: 'package.json', 
          content: JSON.stringify({
            dependencies: { 
              'lodash': '^4.17.21',
              'moment': '^2.29.4'
            }
          }), 
          language: 'json', 
          changeType: 'modified' 
        }
      ]);

      const result = await adapter.analyze(context);
      
      expect(result.success).toBe(true);
      expect(result.toolId).toBe('bundlephobia-direct');
      expect(result.metrics).toBeDefined();
      
      if (result.metrics) {
        expect(result.metrics.totalDependencies).toBeGreaterThan(0);
        expect(result.metrics.totalBundleSize).toBeGreaterThan(0);
        expect(result.metrics.performanceScore).toBeGreaterThanOrEqual(0);
      }
    }, 15000); // Longer timeout for API calls
  });

  describe('SonarJS Direct Adapter', () => {
    let adapter: SonarJSDirectAdapter;

    beforeEach(() => {
      adapter = new SonarJSDirectAdapter();
    });

    test('should have correct metadata', () => {
      expect(adapter.id).toBe('sonarjs-direct');
      expect(adapter.name).toBe('SonarJS Direct');
      expect(adapter.version).toBe('1.0.0');
      expect(adapter.type).toBe('direct');
      expect(adapter.capabilities).toHaveLength(3);
    });

    test('should analyze code quality agent role', () => {
      const codeQualityContext = createTestContext('codeQuality' as AgentRole, [
        { path: 'test.js', content: 'console.log("test");', language: 'javascript', changeType: 'added' }
      ]);
      
      expect(adapter.canAnalyze(codeQualityContext)).toBe(true);
    });

    test('should require JavaScript/TypeScript files', () => {
      const withJSFile = createTestContext('codeQuality' as AgentRole, [
        { path: 'test.js', content: 'console.log("test");', language: 'javascript', changeType: 'added' }
      ]);
      
      const withoutJSFile = createTestContext('codeQuality' as AgentRole, [
        { path: 'README.md', content: '# Test', language: 'markdown', changeType: 'added' }
      ]);

      expect(adapter.canAnalyze(withJSFile)).toBe(true);
      expect(adapter.canAnalyze(withoutJSFile)).toBe(false);
    });

    test('should pass health check', async () => {
      const health = await adapter.healthCheck();
      expect(health).toBe(true);
    });

    test('should analyze JavaScript code', async () => {
      const context = createTestContext('codeQuality' as AgentRole, [
        { 
          path: 'test.js', 
          content: `
            function simpleFunction() {
              console.log('Hello World');
              return true;
            }
          `, 
          language: 'javascript', 
          changeType: 'added' 
        }
      ]);

      const result = await adapter.analyze(context);
      
      expect(result).toBeDefined();
      expect(result.toolId).toBe('sonarjs-direct');
      expect(result.metrics).toBeDefined();
      
      if (result.metrics) {
        expect(result.metrics.codeQualityScore).toBeGreaterThanOrEqual(0);
        expect(result.metrics.totalIssues).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Adapter Integration', () => {
    test('all adapters should be instantiable', () => {
      expect(() => new NpmOutdatedDirectAdapter()).not.toThrow();
      expect(() => new BundlephobiaDirectAdapter()).not.toThrow(); 
      expect(() => new SonarJSDirectAdapter()).not.toThrow();
    });

    test('all adapters should have required interface methods', () => {
      const adapters = [
        new NpmOutdatedDirectAdapter(),
        new BundlephobiaDirectAdapter(),
        new SonarJSDirectAdapter()
      ];

      adapters.forEach(adapter => {
        expect(adapter.id).toBeDefined();
        expect(adapter.name).toBeDefined();
        expect(adapter.version).toBeDefined();
        expect(adapter.type).toBe('direct');
        expect(Array.isArray(adapter.capabilities)).toBe(true);
        expect(typeof adapter.canAnalyze).toBe('function');
        expect(typeof adapter.analyze).toBe('function');
        expect(typeof adapter.healthCheck).toBe('function');
      });
    });
  });
});