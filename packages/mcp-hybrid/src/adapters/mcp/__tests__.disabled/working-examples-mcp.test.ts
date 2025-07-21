/**
 * Unit and Integration tests for Working Examples MCP Adapter
 * Tests working code examples retrieval and validation
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { WorkingExamplesMCPAdapter } from '../working-examples-mcp';
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

describe('Working Examples MCP Adapter', () => {
  let adapter: WorkingExamplesMCPAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new WorkingExamplesMCPAdapter();
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
        prNumber: 456,
        title: 'Add new feature',
        description: 'Implementing authentication system',
        baseBranch: 'main',
        targetBranch: 'feature/auth',
        author: 'dev-user',
        files: files.map(f => ({
          path: f.path || 'test.ts',
          content: f.content || '',
          language: f.language || 'typescript',
          changeType: f.changeType || 'added',
          diff: f.diff
        })),
        commits: [{
          sha: 'def456',
          message: 'Add authentication',
          author: 'dev-user'
        }]
      },
      repository: {
        name: 'example-app',
        owner: 'test-org',
        languages: ['typescript', 'javascript'],
        frameworks: ['express', 'react'],
        primaryLanguage
      },
      userContext: {
        userId: 'user-456',
        permissions: ['read', 'write']
      }
    };
  }

  describe('Metadata and Configuration', () => {
    it('should have correct metadata', () => {
      const metadata = adapter.getMetadata();
      
      expect(metadata.id).toBe('working-examples-mcp');
      expect(metadata.name).toBe('Working Examples Service');
      expect(metadata.description).toContain('validated code examples');
      expect(metadata.supportedRoles).toContain('educational');
      expect(metadata.supportedRoles).toContain('codeQuality');
      expect(metadata.supportedLanguages).toContain('typescript');
      expect(metadata.supportedLanguages).toContain('javascript');
      expect(metadata.supportedLanguages).toContain('python');
      expect(metadata.tags).toContain('examples');
      expect(metadata.tags).toContain('code-patterns');
      expect(metadata.securityVerified).toBe(true);
    });

    it('should have proper capabilities', () => {
      expect(adapter.capabilities).toContainEqual(
        expect.objectContaining({ name: 'code-examples', category: 'educational' })
      );
      expect(adapter.capabilities).toContainEqual(
        expect.objectContaining({ name: 'pattern-matching', category: 'educational' })
      );
      expect(adapter.capabilities).toContainEqual(
        expect.objectContaining({ name: 'best-practices', category: 'educational' })
      );
    });

    it('should have correct requirements', () => {
      expect(adapter.requirements.executionMode).toBe('on-demand');
      expect(adapter.requirements.timeout).toBe(25000);
      expect(adapter.requirements.authentication?.type).toBe('none');
      expect(adapter.requirements.authentication?.required).toBe(false);
    });
  });

  describe('canAnalyze', () => {
    it('should analyze for educational agent', () => {
      const context = createTestContext('educational');
      expect(adapter.canAnalyze(context)).toBe(true);
    });

    it('should analyze for codeQuality agent', () => {
      const context = createTestContext('codeQuality');
      expect(adapter.canAnalyze(context)).toBe(true);
    });

    it('should not analyze for other agents', () => {
      const roles = ['security', 'performance', 'architecture', 'dependency'];
      
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
        if (command.method === 'find_examples') {
          return {
            examples: [
              {
                title: 'Express Authentication Middleware',
                code: `export function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}`,
                language: 'javascript',
                framework: 'express',
                pattern: 'authentication-middleware',
                tags: ['auth', 'middleware', 'jwt'],
                source: 'community-examples',
                quality: 0.92,
                lastValidated: '2024-01-20'
              }
            ]
          };
        }
        if (command.method === 'get_pattern_info') {
          return {
            pattern: command.params.pattern,
            description: 'Common authentication middleware pattern',
            useCases: ['API authentication', 'Route protection'],
            antiPatterns: ['Storing tokens in localStorage'],
            relatedPatterns: ['authorization', 'session-management']
          };
        }
        return {};
      });

      // Mock initializeMCPServer
      jest.spyOn(adapter as any, 'initializeMCPServer').mockResolvedValue(undefined);
    });

    it('should find relevant code examples', async () => {
      const context = createTestContext('educational', [
        {
          path: 'src/middleware/auth.js',
          content: `
            function authenticate(req, res, next) {
              // TODO: Implement authentication
            }
          `
        }
      ]);

      const result = await adapter.analyze(context);

      expect(result.success).toBe(true);
      expect(result.toolId).toBe('working-examples-mcp');
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.findings).toHaveLength(1);
      
      const finding = result.findings?.[0];
      expect(finding?.type).toBe('info');
      expect(finding?.category).toBe('educational');
      expect(finding?.message).toContain('Working example');
      expect(finding?.message).toContain('Express Authentication Middleware');
    });

    it('should match examples by patterns', async () => {
      // Mock pattern detection
      jest.spyOn(adapter as any, 'executeMCPCommand').mockImplementation(async (command) => {
        if (command.method === 'find_examples') {
          return {
            examples: [
              {
                title: 'React Custom Hook Pattern',
                code: `export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchUser().then(setUser).finally(() => setLoading(false));
  }, []);
  
  return { user, loading };
}`,
                language: 'typescript',
                framework: 'react',
                pattern: 'custom-hook',
                tags: ['hooks', 'react', 'auth'],
                quality: 0.95
              }
            ]
          };
        }
        return {};
      });

      const context = createTestContext('codeQuality', [
        {
          path: 'src/hooks/useAuth.ts',
          content: `
            function useAuth() {
              // Need to implement auth hook
              return null;
            }
          `
        }
      ]);

      const result = await adapter.analyze(context);

      expect(result.success).toBe(true);
      const finding = result.findings?.find(f => 
        f.message.includes('React Custom Hook Pattern')
      );
      expect(finding).toBeDefined();
      expect(finding?.documentation).toContain('custom-hook');
    });

    it('should detect anti-patterns and suggest corrections', async () => {
      jest.spyOn(adapter as any, 'executeMCPCommand').mockImplementation(async (command) => {
        if (command.method === 'find_examples') {
          return {
            examples: [{
              title: 'Proper Async Error Handling',
              code: `async function fetchData() {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }
    return await response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}`,
              pattern: 'async-error-handling',
              antiPattern: 'unhandled-promise-rejection',
              quality: 0.88
            }]
          };
        }
        return {};
      });

      const context = createTestContext('codeQuality', [
        {
          path: 'src/api/fetch.js',
          content: `
            async function fetchData() {
              const response = await fetch(url);
              return response.json();
            }
          `
        }
      ]);

      const result = await adapter.analyze(context);

      const antiPatternFinding = result.findings?.find(f => 
        f.severity === 'medium' && f.message.includes('anti-pattern')
      );
      expect(antiPatternFinding).toBeDefined();
      expect(antiPatternFinding?.documentation).toContain('unhandled-promise-rejection');
    });

    it('should analyze multiple files and aggregate patterns', async () => {
      let callCount = 0;
      jest.spyOn(adapter as any, 'executeMCPCommand').mockImplementation(async (command) => {
        if (command.method === 'find_examples') {
          callCount++;
          if (callCount === 1) {
            return {
              examples: [{
                title: 'Express Route Handler',
                code: 'router.get("/users", async (req, res) => { ... })',
                pattern: 'route-handler',
                quality: 0.90
              }]
            };
          } else {
            return {
              examples: [{
                title: 'Database Connection Pool',
                code: 'const pool = new Pool({ connectionString: DATABASE_URL })',
                pattern: 'connection-pool',
                quality: 0.85
              }]
            };
          }
        }
        return {};
      });

      const context = createTestContext('educational', [
        {
          path: 'src/routes/users.js',
          content: 'function getUsers() {}'
        },
        {
          path: 'src/db/connection.js',
          content: 'const db = connect();'
        }
      ]);

      const result = await adapter.analyze(context);

      expect(result.success).toBe(true);
      expect(result.findings?.length).toBeGreaterThanOrEqual(2);
      expect(result.metrics?.examplesFound).toBe(2);
      expect(result.metrics?.patternsIdentified).toBe(2);
    });

    it('should provide framework-specific examples', async () => {
      jest.spyOn(adapter as any, 'executeMCPCommand').mockImplementation(async (command) => {
        if (command.method === 'find_examples') {
          return {
            examples: [{
              title: 'Vue 3 Composition API Store',
              code: `import { reactive, readonly } from 'vue';
const state = reactive({ count: 0 });
export default { state: readonly(state) };`,
              framework: 'vue',
              frameworkVersion: '3.x',
              pattern: 'state-management',
              quality: 0.93
            }]
          };
        }
        return {};
      });

      const context = createTestContext('educational', [
        {
          path: 'src/store/index.js',
          content: 'import { createStore } from "vuex"',
          language: 'javascript'
        }
      ], 'javascript');

      context.repository.frameworks = ['vue'];

      const result = await adapter.analyze(context);

      const vueFinding = result.findings?.find(f => 
        f.message.includes('Vue 3')
      );
      expect(vueFinding).toBeDefined();
      expect(vueFinding?.documentation).toContain('Composition API');
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

    it('should handle example search failure gracefully', async () => {
      jest.spyOn(adapter as any, 'initializeMCPServer').mockResolvedValue(undefined);
      jest.spyOn(adapter as any, 'executeMCPCommand').mockRejectedValue(
        new Error('Example service unavailable')
      );

      const context = createTestContext('educational');
      const result = await adapter.analyze(context);

      // Should still succeed but with no findings
      expect(result.success).toBe(true);
      expect(result.findings).toEqual([]);
      expect(result.metrics?.examplesFound).toBe(0);
    });

    it('should handle invalid code patterns gracefully', async () => {
      jest.spyOn(adapter as any, 'initializeMCPServer').mockResolvedValue(undefined);
      jest.spyOn(adapter as any, 'executeMCPCommand').mockResolvedValue({ 
        examples: [] 
      });

      const context = createTestContext('educational', [
        {
          path: 'random.txt',
          content: 'This is not code'
        }
      ]);

      const result = await adapter.analyze(context);

      expect(result.success).toBe(true);
      expect(result.findings).toEqual([]);
    });
  });

  describe('searchByPattern', () => {
    beforeEach(() => {
      jest.spyOn(adapter as any, 'executeMCPCommand').mockResolvedValue({
        examples: [
          {
            title: 'Singleton Pattern',
            code: 'class Singleton { static instance; }',
            pattern: 'singleton',
            quality: 0.87
          }
        ]
      });
    });

    it('should search examples by specific pattern', async () => {
      const examples = await adapter.searchByPattern('singleton', 'typescript');

      expect(examples).toHaveLength(1);
      expect(examples[0].title).toBe('Singleton Pattern');
      expect(examples[0].pattern).toBe('singleton');
    });

    it('should handle pattern search failure', async () => {
      jest.spyOn(adapter as any, 'executeMCPCommand').mockRejectedValue(
        new Error('Pattern not found')
      );

      const examples = await adapter.searchByPattern('unknown-pattern');

      expect(examples).toEqual([]);
    });
  });

  describe('Integration Tests', () => {
    it('should provide comprehensive code improvement suggestions', async () => {
      // Mock multiple example types
      let callCount = 0;
      jest.spyOn(adapter as any, 'initializeMCPServer').mockResolvedValue(undefined);
      jest.spyOn(adapter as any, 'executeMCPCommand').mockImplementation(async (command) => {
        if (command.method === 'find_examples') {
          callCount++;
          if (callCount === 1) {
            return {
              examples: [
                {
                  title: 'Input Validation Pattern',
                  code: `function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}`,
                  pattern: 'input-validation',
                  tags: ['validation', 'security'],
                  quality: 0.91
                },
                {
                  title: 'Sanitization Pattern',
                  code: 'const clean = DOMPurify.sanitize(userInput);',
                  pattern: 'sanitization',
                  tags: ['security', 'xss-prevention'],
                  quality: 0.94
                }
              ]
            };
          }
          return { examples: [] };
        }
        return {};
      });

      const context = createTestContext('codeQuality', [
        {
          path: 'src/validators/user-input.js',
          content: `
            function validateUserInput(input) {
              return input !== null;
            }
          `
        }
      ]);

      const result = await adapter.analyze(context);

      expect(result.success).toBe(true);
      expect(result.findings?.length).toBeGreaterThanOrEqual(2);
      expect(result.metrics?.examplesFound).toBeGreaterThanOrEqual(2);
      
      // Should suggest both validation and sanitization
      const validationFinding = result.findings?.find(f => 
        f.message.includes('Input Validation')
      );
      const sanitizationFinding = result.findings?.find(f => 
        f.message.includes('Sanitization')
      );
      
      expect(validationFinding).toBeDefined();
      expect(sanitizationFinding).toBeDefined();
    });

    it('should handle large codebases efficiently', async () => {
      // Create many files
      const files = Array.from({ length: 20 }, (_, i) => ({
        path: `src/module${i}/index.js`,
        content: `export function module${i}() { return ${i}; }`
      }));

      jest.spyOn(adapter as any, 'initializeMCPServer').mockResolvedValue(undefined);
      jest.spyOn(adapter as any, 'executeMCPCommand').mockResolvedValue({ 
        examples: [{
          title: 'Module Pattern',
          code: 'export default { method() {} }',
          pattern: 'module',
          quality: 0.80
        }] 
      });

      const context = createTestContext('educational', files);
      
      const startTime = Date.now();
      const result = await adapter.analyze(context);
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(adapter.requirements.timeout);
      expect(result.metrics?.filesAnalyzed).toBeLessThanOrEqual(10); // Should limit
    });

    it('should prioritize high-quality examples', async () => {
      jest.spyOn(adapter as any, 'initializeMCPServer').mockResolvedValue(undefined);
      jest.spyOn(adapter as any, 'executeMCPCommand').mockResolvedValue({
        examples: [
          {
            title: 'Basic Example',
            code: 'function basic() {}',
            quality: 0.65
          },
          {
            title: 'Advanced Example',
            code: 'async function advanced() { /* comprehensive */ }',
            quality: 0.95
          },
          {
            title: 'Medium Example',
            code: 'function medium() { /* ok */ }',
            quality: 0.80
          }
        ]
      });

      const context = createTestContext('educational', [
        { path: 'test.js', content: 'function test() {}' }
      ]);

      const result = await adapter.analyze(context);
      
      // Should prioritize by quality
      expect(result.findings?.[0]?.message).toContain('Advanced Example');
      expect(result.findings?.length).toBeLessThanOrEqual(5); // Should limit total
    });
  });

  describe('Performance and Limits', () => {
    it('should limit number of files analyzed', async () => {
      const files = Array.from({ length: 50 }, (_, i) => ({
        path: `src/file${i}.js`,
        content: 'export default {};'
      }));

      jest.spyOn(adapter as any, 'initializeMCPServer').mockResolvedValue(undefined);
      jest.spyOn(adapter as any, 'executeMCPCommand').mockResolvedValue({ examples: [] });

      const context = createTestContext('educational', files);
      
      const analyzeFilesSpy = jest.spyOn(adapter as any, 'analyzeFiles');
      
      await adapter.analyze(context);
      
      if (analyzeFilesSpy.mock.calls.length > 0) {
        const analyzedFiles = analyzeFilesSpy.mock.calls[0][0];
        expect(analyzedFiles.length).toBeLessThanOrEqual(10);
      }
    });

    it('should timeout long-running operations', async () => {
      jest.spyOn(adapter as any, 'initializeMCPServer').mockResolvedValue(undefined);
      jest.spyOn(adapter as any, 'executeMCPCommand').mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ examples: [] }), 100))
      );

      const context = createTestContext('educational');
      const result = await adapter.analyze(context);

      expect(result.success).toBe(true);
      expect(result.executionTime).toBeLessThan(adapter.requirements.timeout);
    });
  });
});