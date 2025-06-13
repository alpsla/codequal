/**
 * Unit tests for new MCP Direct adapters
 * Tests NPM Audit, License Checker, and Madge with PR context limitations
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { NpmAuditDirectAdapter } from '../npm-audit-direct';
import { LicenseCheckerDirectAdapter } from '../license-checker-direct';
import { MadgeDirectAdapter } from '../madge-direct';
import type { AnalysisContext, FileData, PRContext } from '../../../core/interfaces';

describe('New Direct Adapters Unit Tests', () => {
  // Helper to create a mock PR context
  function createPRContext(files: Partial<FileData>[]): PRContext {
    return {
      prNumber: 123,
      title: 'Test PR',
      description: 'Testing new adapters',
      baseBranch: 'main',
      targetBranch: 'feature/test',
      author: 'test-user',
      files: files.map(f => ({
        path: f.path || 'test.js',
        content: f.content || '',
        language: f.language || 'javascript',
        changeType: f.changeType || 'modified',
        diff: f.diff
      })),
      commits: [{
        sha: 'abc123',
        message: 'Add test files',
        author: 'test-user'
      }]
    };
  }

  // Helper to create analysis context
  function createContext(role: string, files: Partial<FileData>[]): AnalysisContext {
    return {
      agentRole: role as any,
      pr: createPRContext(files),
      repository: {
        name: 'test-repo',
        owner: 'test-owner',
        languages: ['javascript', 'typescript'],
        frameworks: ['node'],
        primaryLanguage: 'javascript'
      },
      userContext: {
        userId: 'user-123',
        permissions: ['read', 'write']
      }
    };
  }

  describe('NPM Audit Direct', () => {
    let adapter: NpmAuditDirectAdapter;

    beforeAll(() => {
      adapter = new NpmAuditDirectAdapter();
    });

    it('should have correct metadata', () => {
      const metadata = adapter.getMetadata();
      
      expect(metadata.id).toBe('npm-audit-direct');
      expect(metadata.name).toBe('NPM Audit Direct');
      expect(metadata.supportedRoles).toContain('security');
      expect(metadata.supportedLanguages).toContain('javascript');
      expect(metadata.supportedLanguages).toContain('typescript');
    });

    it('should identify when it can analyze', () => {
      const contextWithPackageJson = createContext('security', [{
        path: 'package.json',
        content: '{}',
        changeType: 'modified'
      }]);

      expect(adapter.canAnalyze(contextWithPackageJson)).toBe(true);
    });

    it('should skip analysis for non-security agents', () => {
      const context = createContext('architecture', [{
        path: 'package.json',
        content: '{}',
        changeType: 'modified'
      }]);

      expect(adapter.canAnalyze(context)).toBe(false);
    });

    it('should skip analysis when no package.json is present', () => {
      const context = createContext('security', [{
        path: 'src/index.js',
        content: 'console.log("test");',
        changeType: 'modified'
      }]);

      expect(adapter.canAnalyze(context)).toBe(false);
    });

    it('should handle empty file list gracefully', async () => {
      const context = createContext('security', []);
      
      const result = await adapter.analyze(context);
      
      expect(result.success).toBe(true);
      expect(result.findings).toEqual([]);
      expect(result.metrics?.securityScore).toBe(10); // Perfect score for no vulnerabilities
    });

    it('should provide expected result structure', async () => {
      const context = createContext('security', [{
        path: 'package.json',
        content: JSON.stringify({
          name: 'test-app',
          version: '1.0.0',
          dependencies: {
            'lodash': '4.17.11'
          }
        }),
        changeType: 'modified'
      }]);

      const result = await adapter.analyze(context);
      
      expect(result.success).toBe(true);
      expect(result.toolId).toBe('npm-audit-direct');
      expect(result.executionTime).toBeGreaterThanOrEqual(0); // Changed to >= 0 to handle fast execution
      expect(result.findings).toBeDefined();
      expect(Array.isArray(result.findings)).toBe(true);
      expect(result.metrics).toBeDefined();
    });
  });

  describe('License Checker Direct', () => {
    let adapter: LicenseCheckerDirectAdapter;

    beforeAll(() => {
      adapter = new LicenseCheckerDirectAdapter();
    });

    it('should have correct metadata', () => {
      const metadata = adapter.getMetadata();
      
      expect(metadata.id).toBe('license-checker-direct');
      expect(metadata.name).toBe('License Checker Direct');
      expect(metadata.supportedRoles).toContain('dependency');
      expect(metadata.supportedRoles).toContain('security');
    });

    it('should analyze package.json for license issues', async () => {
      const packageJsonContent = JSON.stringify({
        name: 'test-app',
        // Missing license field
        dependencies: {
          'express': '^4.18.0',
          'react': '^18.0.0'
        }
      }, null, 2);

      const context = createContext('dependency', [{
        path: 'package.json',
        content: packageJsonContent,
        changeType: 'modified'
      }]);

      const result = await adapter.analyze(context);
      
      expect(result.success).toBe(true);
      expect(result.toolId).toBe('license-checker-direct');
      
      // Should warn about missing license
      const missingLicenseFinding = result.findings?.find(f => 
        f.ruleId === 'missing-license'
      );
      expect(missingLicenseFinding).toBeDefined();
      expect(missingLicenseFinding?.severity).toBe('high');
    });

    it('should detect risky packages', async () => {
      const packageJsonContent = JSON.stringify({
        name: 'test-app',
        license: 'MIT',
        dependencies: {
          'express': '^4.18.0',
          'highcharts': '^10.0.0' // Known commercial license
        }
      }, null, 2);

      const context = createContext('dependency', [{
        path: 'package.json',
        content: packageJsonContent,
        changeType: 'modified'
      }]);

      const result = await adapter.analyze(context);
      
      // Should warn about highcharts
      const riskyFinding = result.findings?.find(f => 
        f.message.includes('highcharts')
      );
      expect(riskyFinding).toBeDefined();
    });

    it('should detect added dependencies in diff', async () => {
      const packageJsonContent = JSON.stringify({
        name: 'test-app',
        license: 'MIT',
        dependencies: {
          'express': '^4.18.0',
          'mysql': '^2.18.0' // GPL license
        }
      }, null, 2);

      const diff = `
@@ -3,6 +3,7 @@
   "license": "MIT",
   "dependencies": {
     "express": "^4.18.0"
+    "mysql": "^2.18.0"
   }
 }`;

      const context = createContext('dependency', [{
        path: 'package.json',
        content: packageJsonContent,
        changeType: 'modified',
        diff
      }]);

      const result = await adapter.analyze(context);
      
      expect(result.success).toBe(true);
      
      // Should warn about potential GPL dependency
      const gplFinding = result.findings?.find(f => 
        f.ruleId === 'potential-gpl-dependency'
      );
      expect(gplFinding).toBeDefined();
    });

    it('should provide limited analysis warning', async () => {
      const context = createContext('security', [{
        path: 'package.json',
        content: '{"name": "test"}',
        changeType: 'modified'
      }]);

      const result = await adapter.analyze(context);
      
      // Should include info about limited context
      const limitedContextFinding = result.findings?.find(f => 
        f.ruleId === 'limited-context'
      );
      expect(limitedContextFinding).toBeDefined();
      expect(limitedContextFinding?.type).toBe('info');
    });
  });

  describe('Madge Direct', () => {
    let adapter: MadgeDirectAdapter;

    beforeAll(() => {
      adapter = new MadgeDirectAdapter();
    });

    it('should have correct metadata', () => {
      const metadata = adapter.getMetadata();
      
      expect(metadata.id).toBe('madge-direct');
      expect(metadata.name).toBe('Madge Circular Dependency Detector');
      expect(metadata.supportedRoles).toContain('architecture');
      expect(metadata.tags).toContain('circular');
      expect(metadata.tags).toContain('architecture');
    });

    it('should detect potential circular dependencies in changed files', async () => {
      const fileA = `
import { functionB } from './fileB';
export function functionA() {
  return functionB();
}`;

      const fileB = `
import { functionA } from './fileA';
export function functionB() {
  return functionA();
}`;

      const context = createContext('architecture', [
        {
          path: 'src/fileA.js',
          content: fileA,
          changeType: 'modified'
        },
        {
          path: 'src/fileB.js', 
          content: fileB,
          changeType: 'modified'
        }
      ]);

      const result = await adapter.analyze(context);
      
      expect(result.success).toBe(true);
      expect(result.toolId).toBe('madge-direct');
      
      // Should detect potential circular dependency
      const circularFinding = result.findings?.find(f => 
        f.ruleId === 'potential-circular-dependency'
      );
      expect(circularFinding).toBeDefined();
      expect(circularFinding?.severity).toBe('high');
    });

    it('should analyze file structure complexity', async () => {
      const deeplyNestedFile = `
import a from '../../../utils/helpers/validators/string';
import b from '../../../utils/helpers/validators/number';
import c from '../../../utils/helpers/formatters/date';
import d from '../../../utils/helpers/formatters/currency';
import e from '../../../components/ui/buttons/primary';
import f from '../../../components/ui/buttons/secondary';
import g from '../../../components/ui/forms/input';
import h from '../../../components/ui/forms/select';
import i from '../../../components/ui/modals/confirm';
import j from '../../../components/ui/modals/alert';
import k from '../../../services/api/users';
import l from '../../../services/api/products';
import m from '../../../services/auth/login';
import n from '../../../services/auth/logout';
import o from '../../../services/cache/memory';
import p from '../../../services/cache/redis';

export function complexComponent() {
  // Many imports indicate high coupling
}`;

      const context = createContext('architecture', [{
        path: 'src/features/dashboard/components/widgets/sales/SalesWidget.js',
        content: deeplyNestedFile,
        changeType: 'added'
      }]);

      const result = await adapter.analyze(context);
      
      expect(result.success).toBe(true);
      
      // Should warn about deep nesting
      const nestingFinding = result.findings?.find(f => 
        f.ruleId === 'deep-nesting'
      );
      expect(nestingFinding).toBeDefined();
      expect(nestingFinding?.message).toContain('7 levels');
      
      // Should warn about high imports
      const importsFinding = result.findings?.find(f => 
        f.ruleId === 'high-imports'
      );
      expect(importsFinding).toBeDefined();
      expect(importsFinding?.message).toContain('16 imports');
    });

    it('should skip analysis for non-architecture agents', () => {
      const context = createContext('security', [{
        path: 'test.js',
        content: 'console.log("test");',
        changeType: 'modified'
      }]);

      const canAnalyze = adapter.canAnalyze(context);
      expect(canAnalyze).toBe(false);
    });

    it('should handle empty JavaScript files', async () => {
      const context = createContext('architecture', [
        {
          path: 'src/config.py',
          content: 'print("not javascript")',
          changeType: 'added'
        }
      ]);

      const result = await adapter.analyze(context);
      
      expect(result.success).toBe(true);
      expect(result.findings).toEqual([]);
      expect(result.metrics?.filesAnalyzed).toBe(0);
    });

    it('should provide limited analysis warning', async () => {
      const context = createContext('architecture', [{
        path: 'test.js',
        content: 'export default {};',
        changeType: 'modified'
      }]);

      const result = await adapter.analyze(context);
      
      // Should include info about limited context
      const limitedContextFinding = result.findings?.find(f => 
        f.ruleId === 'limited-context'
      );
      expect(limitedContextFinding).toBeDefined();
      expect(limitedContextFinding?.message).toContain('full repository access');
    });
  });

  describe('Cross-adapter compatibility', () => {
    it('should have non-overlapping tool IDs', () => {
      const npmAudit = new NpmAuditDirectAdapter();
      const licenseChecker = new LicenseCheckerDirectAdapter();
      const madge = new MadgeDirectAdapter();
      
      const ids = [
        npmAudit.id,
        licenseChecker.id,
        madge.id
      ];
      
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3);
    });

    it('should have proper metadata', () => {
      const adapters = [
        new NpmAuditDirectAdapter(),
        new LicenseCheckerDirectAdapter(),
        new MadgeDirectAdapter()
      ];
      
      adapters.forEach(adapter => {
        const metadata = adapter.getMetadata();
        
        expect(metadata.id).toBe(adapter.id);
        expect(metadata.name).toBe(adapter.name);
        expect(metadata.description).toBeTruthy();
        expect(metadata.supportedRoles.length).toBeGreaterThan(0);
        expect(metadata.tags.length).toBeGreaterThan(0);
        expect(metadata.securityVerified).toBe(true);
      });
    });

    it('should all implement required Tool interface methods', () => {
      const adapters = [
        new NpmAuditDirectAdapter(),
        new LicenseCheckerDirectAdapter(),
        new MadgeDirectAdapter()
      ];
      
      adapters.forEach(adapter => {
        expect(adapter.type).toBe('direct');
        expect(typeof adapter.canAnalyze).toBe('function');
        expect(typeof adapter.analyze).toBe('function');
        expect(typeof adapter.healthCheck).toBe('function');
        expect(typeof adapter.getMetadata).toBe('function');
      });
    });
  });
});
