/**
 * Unit and Integration tests for Context7 MCP Adapter
 * Tests real-time documentation search capabilities
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Context7MCPAdapter } from '../context7-mcp';
import type { AnalysisContext, FileData, PRContext } from '../../../core/interfaces';

// Mock child_process for MCP server
jest.mock('child_process', () => ({
  spawn: jest.fn().mockReturnValue({
    on: jest.fn(),
    stderr: {
      on: jest.fn()
    },
    stdout: {
      on: jest.fn()
    },
    stdin: {
      write: jest.fn(),
      end: jest.fn()
    }
  })
}));

describe('Context7 MCP Adapter', () => {
  let adapter: Context7MCPAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new Context7MCPAdapter();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Helper function to create test context
  function createTestContext(
    role: string, 
    files: Partial<FileData>[] = [],
    primaryLanguage = 'typescript'
  ): AnalysisContext {
    return {
      agentRole: role as any,
      pr: {
        prNumber: 123,
        title: 'Test PR',
        description: 'Testing context7 integration',
        baseBranch: 'main',
        targetBranch: 'feature/test',
        author: 'test-user',
        files: files.map(f => ({
          path: f.path || 'test.ts',
          content: f.content || '',
          language: f.language || 'typescript',
          changeType: f.changeType || 'modified',
          diff: f.diff
        })),
        commits: [{
          sha: 'abc123',
          message: 'Add test files',
          author: 'test-user'
        }]
      },
      repository: {
        name: 'test-repo',
        owner: 'test-owner',
        languages: ['typescript', 'javascript'],
        frameworks: ['node', 'react'],
        primaryLanguage
      },
      userContext: {
        userId: 'user-123',
        permissions: ['read', 'write']
      }
    };
  }

  describe('Metadata and Configuration', () => {
    it('should have correct metadata', () => {
      const metadata = adapter.getMetadata();
      
      expect(metadata.id).toBe('context7-mcp');
      expect(metadata.name).toBe('Context 7 Documentation Service');
      expect(metadata.description).toContain('Real-time documentation');
      expect(metadata.supportedRoles).toContain('educational');
      expect(metadata.supportedLanguages).toContain('typescript');
      expect(metadata.supportedLanguages).toContain('javascript');
      expect(metadata.tags).toContain('documentation');
      expect(metadata.tags).toContain('examples');
      expect(metadata.securityVerified).toBe(true);
    });

    it('should have proper capabilities', () => {
      expect(adapter.capabilities).toContainEqual(
        expect.objectContaining({ name: 'real-time-docs', category: 'documentation' })
      );
      expect(adapter.capabilities).toContainEqual(
        expect.objectContaining({ name: 'version-info', category: 'documentation' })
      );
      expect(adapter.capabilities).toContainEqual(
        expect.objectContaining({ name: 'working-examples', category: 'documentation' })
      );
    });

    it('should have correct requirements', () => {
      expect(adapter.requirements.executionMode).toBe('on-demand');
      expect(adapter.requirements.timeout).toBe(30000);
      expect(adapter.requirements.authentication?.type).toBe('api-key');
      expect(adapter.requirements.authentication?.required).toBe(false);
    });
  });

  describe('canAnalyze', () => {
    it('should analyze for educational agent', () => {
      const context = createTestContext('educational');
      expect(adapter.canAnalyze(context)).toBe(true);
    });

    it('should not analyze for non-educational agents', () => {
      const roles = ['security', 'performance', 'architecture', 'codeQuality', 'dependency'];
      
      roles.forEach(role => {
        const context = createTestContext(role);
        expect(adapter.canAnalyze(context)).toBe(false);
      });
    });
  });

  describe('analyze - Unit Tests', () => {
    beforeEach(() => {
      // Mock the executeMCPCommand method
      jest.spyOn(adapter as any, 'executeMCPCommand').mockImplementation(async (command) => {
        if (command.method === 'search_documentation') {
          return {
            documents: [
              {
                title: 'TypeScript Best Practices',
                content: 'Comprehensive guide to TypeScript development',
                url: 'https://docs.example.com/typescript',
                version: '4.9.0',
                lastUpdated: '2024-01-15',
                confidence: 0.95,
                examples: [
                  {
                    title: 'Type Guards Example',
                    code: 'function isString(value: unknown): value is string { return typeof value === "string"; }',
                    language: 'typescript',
                    description: 'Example of type guard implementation',
                    validated: true,
                    source: 'official-docs',
                    version: '4.9.0'
                  }
                ]
              }
            ]
          };
        }
        if (command.method === 'get_version_info') {
          return {
            package: command.params.package,
            currentVersion: '4.8.0',
            latestVersion: '4.9.0',
            releaseDate: '2024-01-10',
            changelog: 'New features and improvements',
            breakingChanges: [],
            compatibilityNotes: ['Compatible with Node 16+']
          };
        }
        return {};
      });

      // Mock initializeMCPServer
      jest.spyOn(adapter as any, 'initializeMCPServer').mockResolvedValue(undefined);
    });

    it('should perform successful analysis with documentation search', async () => {
      const context = createTestContext('educational', [
        {
          path: 'src/auth.ts',
          content: `
            export function authenticate(user: User) {
              // Authentication logic
            }
          `
        }
      ]);

      const result = await adapter.analyze(context);

      expect(result.success).toBe(true);
      expect(result.toolId).toBe('context7-mcp');
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.findings).toHaveLength(1);
      
      const finding = result.findings?.[0];
      expect(finding?.type).toBe('info');
      expect(finding?.category).toBe('educational');
      expect(finding?.message).toContain('Educational resource');
      expect(finding?.documentation).toContain('Up-to-date documentation');
    });

    it('should detect package version differences', async () => {
      const context = createTestContext('educational', [
        {
          path: 'package.json',
          content: JSON.stringify({
            name: 'test-app',
            dependencies: {
              'typescript': '^4.8.0',
              'react': '^18.0.0'
            }
          })
        }
      ]);

      const result = await adapter.analyze(context);

      expect(result.success).toBe(true);
      
      // Should have version update suggestions
      const versionFinding = result.findings?.find(f => 
        f.message.includes('newer version available')
      );
      expect(versionFinding).toBeDefined();
      expect(versionFinding?.severity).toBe('medium');
      expect(versionFinding?.documentation).toContain('Current: 4.8.0');
      expect(versionFinding?.documentation).toContain('Latest: 4.9.0');
    });

    it('should extract search topics based on agent role', async () => {
      const context = createTestContext('educational');
      
      // Spy on private method
      const extractTopicsSpy = jest.spyOn(adapter as any, 'extractSearchTopics');
      
      await adapter.analyze(context);
      
      expect(extractTopicsSpy).toHaveBeenCalledWith(context);
      const topics = extractTopicsSpy.mock.results[0].value;
      
      expect(topics).toContain('software development best practices');
      expect(topics).toContain('code quality improvement');
    });

    it('should handle empty file list gracefully', async () => {
      const context = createTestContext('educational', []);
      
      const result = await adapter.analyze(context);
      
      expect(result.success).toBe(true);
      expect(result.findings).toBeDefined();
      expect(result.metrics?.filesAnalyzed).toBe(0);
    });

    it('should extract packages from imports', async () => {
      const context = createTestContext('educational', [
        {
          path: 'src/index.ts',
          content: `
            import React from 'react';
            import { useState } from 'react';
            import axios from 'axios';
            import './local-file';
            const lodash = require('lodash');
            import { someUtil } from '@company/utils';
          `
        }
      ]);

      const extractPackagesSpy = jest.spyOn(adapter as any, 'extractPackageNames');
      
      await adapter.analyze(context);
      
      const packages = extractPackagesSpy.mock.results[0].value;
      
      expect(packages).toContain('react');
      expect(packages).toContain('axios');
      expect(packages).toContain('lodash');
      expect(packages).toContain('@company/utils');
      expect(packages).not.toContain('./local-file');
    });
  });

  describe('analyze - Error Handling', () => {
    it('should handle MCP server initialization failure', async () => {
      jest.spyOn(adapter as any, 'initializeMCPServer').mockRejectedValue(
        new Error('Failed to start MCP server')
      );

      const context = createTestContext('educational');
      const result = await adapter.analyze(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to start MCP server');
      expect(result.findings).toEqual([]);
    });

    it('should handle documentation search failure gracefully', async () => {
      jest.spyOn(adapter as any, 'initializeMCPServer').mockResolvedValue(undefined);
      jest.spyOn(adapter as any, 'executeMCPCommand').mockRejectedValue(
        new Error('Search service unavailable')
      );

      const context = createTestContext('educational');
      const result = await adapter.analyze(context);

      // Should still succeed but with no findings
      expect(result.success).toBe(true);
      expect(result.findings).toEqual([]);
      expect(result.metrics?.documentsFound).toBe(0);
    });

    it('should handle malformed package.json gracefully', async () => {
      const context = createTestContext('educational', [
        {
          path: 'package.json',
          content: '{ invalid json }'
        }
      ]);

      jest.spyOn(adapter as any, 'initializeMCPServer').mockResolvedValue(undefined);
      jest.spyOn(adapter as any, 'executeMCPCommand').mockResolvedValue({ documents: [] });

      const result = await adapter.analyze(context);

      expect(result.success).toBe(true);
      expect(result.metrics?.packagesChecked).toBe(0);
    });
  });

  describe('getWorkingExamples', () => {
    beforeEach(() => {
      jest.spyOn(adapter as any, 'executeMCPCommand').mockResolvedValue({
        examples: [
          {
            title: 'React Hook Example',
            code: 'const [count, setCount] = useState(0);',
            language: 'typescript',
            description: 'Basic useState hook example',
            validated: true,
            source: 'react-docs',
            version: '18.0.0'
          }
        ]
      });
    });

    it('should retrieve working examples for a topic', async () => {
      const examples = await adapter.getWorkingExamples('react hooks', 'typescript');

      expect(examples).toHaveLength(1);
      expect(examples[0].title).toBe('React Hook Example');
      expect(examples[0].validated).toBe(true);
      expect(examples[0].language).toBe('typescript');
    });

    it('should handle example retrieval failure', async () => {
      jest.spyOn(adapter as any, 'executeMCPCommand').mockRejectedValue(
        new Error('Service error')
      );

      const examples = await adapter.getWorkingExamples('unknown topic');

      expect(examples).toEqual([]);
    });
  });

  describe('Integration Tests', () => {
    it('should provide comprehensive educational content', async () => {
      // Mock comprehensive responses
      jest.spyOn(adapter as any, 'initializeMCPServer').mockResolvedValue(undefined);
      jest.spyOn(adapter as any, 'executeMCPCommand').mockImplementation(async (command) => {
        if (command.method === 'search_documentation') {
          return {
            documents: [
              {
                title: 'Security Best Practices',
                content: 'Comprehensive security guide',
                url: 'https://docs.example.com/security',
                version: '2024.1',
                lastUpdated: '2024-01-20',
                confidence: 0.98,
                examples: [
                  {
                    title: 'CSRF Protection',
                    code: 'app.use(csrf({ cookie: true }));',
                    language: 'javascript',
                    description: 'CSRF middleware setup',
                    validated: true,
                    source: 'express-docs',
                    version: '4.18.0'
                  }
                ]
              },
              {
                title: 'Authentication Patterns',
                content: 'Modern authentication approaches',
                url: 'https://docs.example.com/auth',
                version: '2024.1',
                lastUpdated: '2024-01-18',
                confidence: 0.92
              }
            ]
          };
        }
        return {};
      });

      const context = createTestContext('educational', [
        {
          path: 'src/security/auth.js',
          content: 'function authenticate() {}'
        }
      ]);

      const result = await adapter.analyze(context);

      expect(result.success).toBe(true);
      expect(result.findings?.length).toBeGreaterThanOrEqual(2);
      expect(result.metrics?.documentsFound).toBe(2);
      expect(result.metrics?.codeExamples).toBe(1);
    });

    it('should handle multi-language projects', async () => {
      jest.spyOn(adapter as any, 'initializeMCPServer').mockResolvedValue(undefined);
      jest.spyOn(adapter as any, 'executeMCPCommand').mockResolvedValue({ documents: [] });

      const context = createTestContext('educational', [
        {
          path: 'src/main.py',
          content: 'import tensorflow as tf',
          language: 'python'
        },
        {
          path: 'frontend/app.js',
          content: 'import React from "react"',
          language: 'javascript'
        }
      ], 'python');

      const extractTopicsSpy = jest.spyOn(adapter as any, 'extractSearchTopics');
      
      await adapter.analyze(context);
      
      const topics = extractTopicsSpy.mock.results[0].value;
      
      expect(topics).toContain('python best practices');
      expect(topics).toContain('python documentation');
    });
  });

  describe('Performance and Limits', () => {
    it('should limit package extraction to prevent overload', async () => {
      // Create a file with many imports
      const imports = Array.from({ length: 20 }, (_, i) => 
        `import pkg${i} from 'package-${i}';`
      ).join('\n');

      const context = createTestContext('educational', [
        {
          path: 'src/heavy-imports.js',
          content: imports
        }
      ]);

      jest.spyOn(adapter as any, 'initializeMCPServer').mockResolvedValue(undefined);
      jest.spyOn(adapter as any, 'executeMCPCommand').mockResolvedValue({ documents: [] });
      
      const extractPackagesSpy = jest.spyOn(adapter as any, 'extractPackageNames');
      
      await adapter.analyze(context);
      
      const packages = extractPackagesSpy.mock.results[0].value;
      
      expect(packages.length).toBeLessThanOrEqual(10); // Should limit to 10
    });

    it('should complete analysis within timeout', async () => {
      jest.spyOn(adapter as any, 'initializeMCPServer').mockResolvedValue(undefined);
      jest.spyOn(adapter as any, 'executeMCPCommand').mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ documents: [] }), 100))
      );

      const context = createTestContext('educational');
      const startTime = Date.now();
      
      const result = await adapter.analyze(context);
      
      const duration = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(adapter.requirements.timeout);
    });
  });
});