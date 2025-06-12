/**
 * Unit tests for Dependency Cruiser Direct Adapter
 */

import { DependencyCruiserDirectAdapter } from '../base-adapter';
import { AnalysisContext } from '../../../core/interfaces';
import { EventEmitter } from 'events';
import { spawn } from 'child_process';

// Mock child_process
jest.mock('child_process', () => ({
  spawn: jest.fn(),
  exec: jest.fn()
}));

const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

describe('DependencyCruiserDirectAdapter', () => {
  let adapter: DependencyCruiserDirectAdapter;
  
  beforeEach(() => {
    adapter = new DependencyCruiserDirectAdapter();
    jest.clearAllMocks();
  });
  
  // Helper to create mock process
  const createMockProcess = (code = 0, stdout = '', stderr = '') => {
    const process = new EventEmitter() as any;
    process.stdout = new EventEmitter();
    process.stderr = new EventEmitter();
    
    setTimeout(() => {
      if (stdout) process.stdout.emit('data', Buffer.from(stdout));
      if (stderr) process.stderr.emit('data', Buffer.from(stderr));
      process.emit('close', code);
    }, 10);
    
    return process;
  };
  
  // Helper to create mock context
  const createMockContext = (overrides: Partial<AnalysisContext> = {}): AnalysisContext => {
    const base: AnalysisContext = {
      pr: {
        prNumber: 123,
        title: 'Test PR',
        description: 'Test description',
        author: 'testuser',
        baseBranch: 'main',
        targetBranch: 'feature/test',
        files: [
          {
            path: 'src/components/Button.tsx',
            content: 'import React from "react";\n// Button component',
            language: 'typescript',
            diff: '@@ -1,5 +1,10 @@\n+import React from "react";\n',
            changeType: 'modified' as const
          },
          {
            path: 'src/utils/helpers.js',
            content: 'export function helper() {}',
            language: 'javascript',
            diff: '@@ -0,0 +1,20 @@\n+export function helper() {}\n',
            changeType: 'added' as const
          }
        ],
        commits: [
          {
            sha: 'abc123',
            message: 'Add button component',
            author: 'developer'
          }
        ]
      },
      repository: {
        name: 'test-repo',
        owner: 'test-org',
        languages: ['javascript', 'typescript'],
        frameworks: ['react']
      },
      userContext: {
        userId: 'test-user',
        permissions: ['read', 'write']
      },
      agentRole: 'architecture'
    };
    
    // Deep merge overrides
    return {
      ...base,
      ...overrides,
      pr: overrides.pr || base.pr,
      repository: overrides.repository || base.repository,
      userContext: overrides.userContext || base.userContext
    };
  };
  
  describe('Basic Properties', () => {
    test('should have correct id', () => {
      expect(adapter.id).toBe('dependency-cruiser-direct');
    });
    
    test('should have correct name', () => {
      expect(adapter.name).toBe('Dependency Cruiser');
    });
    
    test('should have correct version', () => {
      expect(adapter.version).toBe('15.0.0');
    });
    
    test('should have correct type', () => {
      expect(adapter.type).toBe('direct');
    });
    
    test('should have correct capabilities', () => {
      expect(adapter.capabilities).toHaveLength(1);
      expect(adapter.capabilities[0]).toEqual({
        name: 'dependency-analysis',
        category: 'architecture',
        languages: ['javascript', 'typescript'],
        fileTypes: ['.js', '.ts', '.jsx', '.tsx']
      });
    });
    
    test('should have correct requirements', () => {
      expect(adapter.requirements).toEqual({
        minFiles: 1,
        executionMode: 'on-demand',
        timeout: 30000,
        authentication: { type: 'none', required: false }
      });
    });
  });
  
  describe('canAnalyze', () => {
    test('should return true for JavaScript/TypeScript repositories', () => {
      const context = createMockContext();
      expect(adapter.canAnalyze(context)).toBe(true);
    });
    
    test('should return false for non-supported languages', () => {
      const context = createMockContext({
        repository: {
          name: 'test-repo',
          owner: 'test-org',
          languages: ['ruby', 'rust'],
          frameworks: []
        }
      });
      expect(adapter.canAnalyze(context)).toBe(false);
    });
    
    test('should handle mixed language repositories', () => {
      const context = createMockContext({
        repository: {
          name: 'test-repo',
          owner: 'test-org',
          languages: ['python', 'javascript', 'go'],
          frameworks: []
        }
      });
      expect(adapter.canAnalyze(context)).toBe(true);
    });
  });
  
  describe('analyze', () => {
    test('should analyze JavaScript/TypeScript files successfully', async () => {
      const mockOutput = JSON.stringify({
        violations: [
          {
            from: 'src/components/Button.tsx',
            to: 'src/components/Icon.tsx',
            rule: 'no-circular',
            severity: 'error',
            message: 'Circular dependency detected',
            comment: 'Button imports Icon, Icon imports Button'
          },
          {
            from: 'src/utils/helpers.js',
            to: 'node_modules/lodash',
            rule: 'not-to-unresolvable',
            severity: 'warn',
            message: 'Could not resolve module',
            comment: 'Module lodash not found'
          }
        ]
      });
      
      mockSpawn.mockReturnValue(createMockProcess(0, mockOutput));
      
      const context = createMockContext();
      const result = await adapter.analyze(context);
      
      expect(result.success).toBe(true);
      expect(result.toolId).toBe('dependency-cruiser-direct');
      expect(result.findings).toHaveLength(2);
      
      // Check first finding (circular dependency)
      expect(result.findings![0]).toEqual({
        type: 'issue',
        severity: 'high',
        category: 'architecture',
        message: 'Circular dependency detected',
        file: 'src/components/Button.tsx',
        ruleId: 'no-circular',
        documentation: 'Button imports Icon, Icon imports Button'
      });
      
      // Check second finding (unresolvable module)
      expect(result.findings![1]).toEqual({
        type: 'issue',
        severity: 'medium',
        category: 'architecture',
        message: 'Could not resolve module',
        file: 'src/utils/helpers.js',
        ruleId: 'not-to-unresolvable',
        documentation: 'Module lodash not found'
      });
      
      expect(result.metrics).toEqual({
        filesAnalyzed: 2,
        violations: 2,
        circularDependencies: 1
      });
    });
    
    test('should handle empty violations', async () => {
      mockSpawn.mockReturnValue(createMockProcess(0, JSON.stringify({ violations: [] })));
      
      const context = createMockContext();
      const result = await adapter.analyze(context);
      
      expect(result.success).toBe(true);
      expect(result.findings).toHaveLength(0);
      expect(result.metrics).toEqual({
        filesAnalyzed: 2,
        violations: 0,
        circularDependencies: 0
      });
    });
    
    test('should skip deleted files', async () => {
      mockSpawn.mockReturnValue(createMockProcess(0, JSON.stringify({ violations: [] })));
      
      const context = createMockContext({
        pr: {
          prNumber: 123,
          title: 'Test PR',
          description: 'Test description',
          author: 'testuser',
          baseBranch: 'main',
          targetBranch: 'feature/test',
          files: [
            {
              path: 'src/old.js',
              content: '',
              language: 'javascript',
              changeType: 'deleted' as const
            },
            {
              path: 'src/new.js',
              content: 'console.log("new file");',
              language: 'javascript',
              changeType: 'added' as const
            }
          ],
          commits: [
            {
              sha: 'abc123',
              message: 'Test commit',
              author: 'developer'
            }
          ]
        }
      });
      
      const result = await adapter.analyze(context);
      
      expect(result.success).toBe(true);
      expect(result.metrics?.filesAnalyzed).toBe(1); // Only new.js
      
      // Check spawn was called with only the non-deleted file
      expect(mockSpawn).toHaveBeenCalledWith('npx', [
        'depcruise',
        '--output-type', 'json',
        'src/new.js'
      ], expect.any(Object));
    });
    
    test('should return empty results for PRs with no JS/TS files', async () => {
      const context = createMockContext({
        pr: {
          prNumber: 123,
          title: 'Test PR',
          description: 'Test description',
          author: 'testuser',
          baseBranch: 'main',
          targetBranch: 'feature/test',
          files: [
            {
              path: 'README.md',
              content: '# Readme',
              changeType: 'modified' as const
            }
          ],
          commits: [
            {
              sha: 'abc123',
              message: 'Test commit',
              author: 'developer'
            }
          ]
        }
      });
      
      const result = await adapter.analyze(context);
      
      expect(result.success).toBe(true);
      expect(result.findings).toHaveLength(0);
      expect(result.metrics).toEqual({ filesAnalyzed: 0 });
      expect(mockSpawn).not.toHaveBeenCalled();
    }, 35000); // Increase timeout to 35s
    
    test('should handle command failure', async () => {
      // Mock a process that throws an error
      mockSpawn.mockImplementation(() => {
        throw new Error('Command failed');
      });
      
      const context = createMockContext();
      const result = await adapter.analyze(context);
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual({
        code: 'DEPCRUISE_FAILED',
        message: 'Command failed',
        recoverable: true
      });
    });
    
    test('should map severity levels correctly', async () => {
      const mockOutput = JSON.stringify({
        violations: [
          { from: 'a.js', to: 'b.js', rule: 'rule1', severity: 'error', message: 'Error level' },
          { from: 'c.js', to: 'd.js', rule: 'rule2', severity: 'warn', message: 'Warning level' },
          { from: 'e.js', to: 'f.js', rule: 'rule3', severity: 'info', message: 'Info level' },
          { from: 'g.js', to: 'h.js', rule: 'rule4', severity: 'unknown', message: 'Unknown level' }
        ]
      });
      
      mockSpawn.mockReturnValue(createMockProcess(0, mockOutput));
      
      const context = createMockContext();
      const result = await adapter.analyze(context);
      
      expect(result.findings![0].severity).toBe('high');   // error -> high
      expect(result.findings![1].severity).toBe('medium'); // warn -> medium
      expect(result.findings![2].severity).toBe('low');    // info -> low
      expect(result.findings![3].severity).toBe('info');   // unknown -> info
    });
    
    test('should handle invalid JSON output', async () => {
      mockSpawn.mockReturnValue(createMockProcess(0, 'Invalid JSON'));
      
      const context = createMockContext();
      const result = await adapter.analyze(context);
      
      expect(result.success).toBe(true);
      expect(result.findings).toHaveLength(0);
      expect(result.metrics?.violations).toBe(0);
    });
    
    test('should handle execution timeout', async () => {
      mockSpawn.mockReturnValue(createMockProcess(0, JSON.stringify({ violations: [] })));
      
      const context = createMockContext();
      const result = await adapter.analyze(context);
      
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.executionTime).toBeLessThan(30000); // Should complete before timeout
    });
  });
  
  describe('healthCheck', () => {
    test('should return true when dependency-cruiser is available', async () => {
      mockSpawn.mockReturnValue(createMockProcess(0, '15.0.0'));
      
      const result = await adapter.healthCheck();
      
      expect(result).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith('npx', ['depcruise', '--version'], expect.any(Object));
    });
    
    test('should return false when dependency-cruiser is not available', async () => {
      mockSpawn.mockReturnValue(createMockProcess(1, '', 'Command not found'));
      
      const result = await adapter.healthCheck();
      
      expect(result).toBe(false);
    });
  });
  
  describe('getMetadata', () => {
    test('should return correct metadata', () => {
      const metadata = adapter.getMetadata();
      
      expect(metadata).toEqual({
        id: 'dependency-cruiser-direct',
        name: 'Dependency Cruiser',
        description: 'Dependency analysis and validation',
        author: 'CodeQual',
        supportedRoles: ['architecture'],
        supportedLanguages: ['javascript', 'typescript'],
        tags: ['dependencies', 'architecture', 'validation'],
        securityVerified: true,
        lastVerified: new Date('2025-06-07')
      });
    });
  });
});
