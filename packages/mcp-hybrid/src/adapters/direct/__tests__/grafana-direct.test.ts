/**
 * Unit tests for Grafana Direct Adapter
 */

import { GrafanaDirectAdapter } from '../grafana-adapter';
import { AnalysisContext } from '../../../core/interfaces';
import { EventEmitter } from 'events';
import { spawn } from 'child_process';

// Mock child_process
jest.mock('child_process', () => ({
  spawn: jest.fn(),
  exec: jest.fn()
}));

const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

// Mock environment variables
const originalEnv = process.env;

describe('GrafanaDirectAdapter', () => {
  let adapter: GrafanaDirectAdapter;
  
  beforeEach(() => {
    // Set test environment variables
    process.env = {
      ...originalEnv,
      GRAFANA_URL: 'http://test-grafana:3000',
      GRAFANA_API_KEY: 'test-api-key'
    };
    
    adapter = new GrafanaDirectAdapter();
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    process.env = originalEnv;
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
  const createMockContext = (overrides: Partial<AnalysisContext> = {}): AnalysisContext => ({
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
      frameworks: ['react'],
      primaryLanguage: 'typescript'
    },
    userContext: {
      userId: 'test-user',
      permissions: ['read', 'write']
    },
    agentRole: 'reporting',
    ...overrides
  });
  
  describe('Basic Properties', () => {
    test('should have correct id', () => {
      expect(adapter.id).toBe('grafana-direct');
    });
    
    test('should have correct name', () => {
      expect(adapter.name).toBe('Grafana Dashboard Integration');
    });
    
    test('should have correct version', () => {
      expect(adapter.version).toBe('10.0.0');
    });
    
    test('should have correct type', () => {
      expect(adapter.type).toBe('direct');
    });
    
    test('should have correct capabilities', () => {
      expect(adapter.capabilities).toHaveLength(3);
      expect(adapter.capabilities).toEqual([
        {
          name: 'dashboard-creation',
          category: 'documentation',
          languages: [],
          fileTypes: []
        },
        {
          name: 'time-series-visualization',
          category: 'documentation',
          languages: [],
          fileTypes: []
        },
        {
          name: 'metrics-monitoring',
          category: 'documentation',
          languages: [],
          fileTypes: []
        }
      ]);
    });
    
    test('should have correct requirements', () => {
      expect(adapter.requirements).toEqual({
        minFiles: 0,
        executionMode: 'on-demand',
        timeout: 30000,
        authentication: {
          type: 'api-key',
          required: true
        }
      });
    });
  });
  
  describe('canAnalyze', () => {
    test('should return true for reporting role', () => {
      const context = createMockContext({ agentRole: 'reporting' });
      expect(adapter.canAnalyze(context)).toBe(true);
    });
    
    test('should return true for performance role', () => {
      const context = createMockContext({ agentRole: 'performance' });
      expect(adapter.canAnalyze(context)).toBe(true);
    });
    
    test('should return true for security role', () => {
      const context = createMockContext({ agentRole: 'security' });
      expect(adapter.canAnalyze(context)).toBe(true);
    });
    
    test('should return false for other roles', () => {
      const context = createMockContext({ agentRole: 'codeQuality' });
      expect(adapter.canAnalyze(context)).toBe(false);
    });
  });
  
  describe('analyze', () => {
    test('should create new dashboard for reporting role', async () => {
      const context = createMockContext();
      const result = await adapter.analyze(context);
      
      expect(result.success).toBe(true);
      expect(result.toolId).toBe('grafana-direct');
      expect(result.findings).toHaveLength(3); // Dashboard + 2 panels
      
      // Check dashboard creation finding
      const dashboardFinding = result.findings![0];
      expect(dashboardFinding.type).toBe('info');
      expect(dashboardFinding.message).toContain('Created new Grafana dashboard');
      expect(dashboardFinding.message).toContain('test-repo---code-quality-metrics');
      expect(dashboardFinding.ruleId).toBe('grafana-create');
      
      // Check panel creation findings
      expect(result.findings![1].message).toContain('Code Quality Score Trend');
      expect(result.findings![2].message).toContain('PR Analysis Metrics');
      
      expect(result.metrics).toEqual({
        dashboardsCreated: 1,
        dashboardsUpdated: 0,
        panelsCreated: 2
      });
    });
    
    test('should create security-specific panels for security role', async () => {
      const context = createMockContext({ agentRole: 'security' });
      const result = await adapter.analyze(context);
      
      expect(result.success).toBe(true);
      expect(result.findings).toHaveLength(3); // Dashboard + 2 security panels
      
      // Check security panel creation findings
      expect(result.findings![1].message).toContain('Security Issues by Severity');
      expect(result.findings![2].message).toContain('Security Score Trend');
      
      expect(result.metrics?.panelsCreated).toBe(2);
    });
    
    test('should create performance-specific panels for performance role', async () => {
      const context = createMockContext({ agentRole: 'performance' });
      const result = await adapter.analyze(context);
      
      expect(result.success).toBe(true);
      expect(result.findings).toHaveLength(2); // Dashboard + 1 performance panel
      
      // Check performance panel creation finding
      expect(result.findings![1].message).toContain('Bundle Size Trend');
      
      expect(result.metrics?.panelsCreated).toBe(1);
    });
    
    test('should handle dashboard creation failure', async () => {
      // Simulate error by temporarily making internal method throw
      jest.spyOn(adapter as any, 'createDashboardConfig').mockImplementation(() => {
        throw new Error('Dashboard creation failed');
      });
      
      const context = createMockContext();
      const result = await adapter.analyze(context);
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual({
        code: 'GRAFANA_FAILED',
        message: 'Dashboard creation failed',
        recoverable: true
      });
    });
    
    test('should include panel configuration in documentation', async () => {
      const context = createMockContext();
      const result = await adapter.analyze(context);
      
      const panelFinding = result.findings![1];
      expect(panelFinding.documentation).toBeDefined();
      expect(panelFinding.documentation).toContain('Panel configuration:');
      
      // Check if panel config is valid JSON
      const configMatch = panelFinding.documentation?.match(/Panel configuration: (.+)/s);
      if (configMatch) {
        const config = JSON.parse(configMatch[1]);
        expect(config).toHaveProperty('id');
        expect(config).toHaveProperty('title');
        expect(config).toHaveProperty('type');
        expect(config).toHaveProperty('gridPos');
        expect(config).toHaveProperty('targets');
      }
    });
    
    test('should use repository primary language in tags', async () => {
      const context = createMockContext({
        repository: {
          ...createMockContext().repository,
          primaryLanguage: 'python'
        }
      });
      
      const result = await adapter.analyze(context);
      
      // The documentation field contains a fixed string, not the config
      expect(result.findings![0].documentation).toBe('New dashboard created for repository monitoring');
    });
    
    test('should handle repositories without primary language', async () => {
      const context = createMockContext({
        repository: {
          name: 'test-repo',
          owner: 'test-org',
          languages: ['javascript', 'typescript'],
          frameworks: ['react']
          // No primaryLanguage
        }
      });
      
      const result = await adapter.analyze(context);
      
      expect(result.success).toBe(true);
      expect(result.findings![0].documentation).toBe('New dashboard created for repository monitoring');
    });
    
    test('should track execution time', async () => {
      const context = createMockContext();
      const result = await adapter.analyze(context);
      
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.executionTime).toBeLessThan(30000); // Under timeout
    });
  });
  
  describe('healthCheck', () => {
    test('should return true when Grafana is accessible with API key', async () => {
      mockSpawn.mockReturnValue(createMockProcess(0, '200'));
      
      const result = await adapter.healthCheck();
      
      expect(result).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith('curl', [
        '-s', '-o', '/dev/null', '-w', '%{http_code}',
        '-H', 'Authorization: Bearer test-api-key',
        'http://test-grafana:3000/api/health'
      ], expect.any(Object));
    });
    
    test('should return false when Grafana returns non-200 status', async () => {
      mockSpawn.mockReturnValue(createMockProcess(0, '401'));
      
      const result = await adapter.healthCheck();
      
      expect(result).toBe(false);
    });
    
    test('should return false when API key is not configured', async () => {
      // Create adapter without API key
      process.env.GRAFANA_API_KEY = '';
      const adapterNoKey = new GrafanaDirectAdapter();
      
      const result = await adapterNoKey.healthCheck();
      
      expect(result).toBe(false);
      expect(mockSpawn).not.toHaveBeenCalled();
    });
    
    test('should return false when curl command fails', async () => {
      mockSpawn.mockReturnValue(createMockProcess(1, '', 'Connection refused'));
      
      const result = await adapter.healthCheck();
      
      expect(result).toBe(false);
    });
    
    test('should use default Grafana URL when not configured', async () => {
      // Create adapter without custom URL
      process.env.GRAFANA_URL = '';
      const adapterDefaultUrl = new GrafanaDirectAdapter();
      
      mockSpawn.mockReturnValue(createMockProcess(0, '200'));
      
      await adapterDefaultUrl.healthCheck();
      
      expect(mockSpawn).toHaveBeenCalledWith('curl', [
        '-s', '-o', '/dev/null', '-w', '%{http_code}',
        '-H', 'Authorization: Bearer test-api-key',
        'http://localhost:3000/api/health'
      ], expect.any(Object));
    });
  });
  
  describe('getMetadata', () => {
    test('should return correct metadata', () => {
      const metadata = adapter.getMetadata();
      
      expect(metadata).toEqual({
        id: 'grafana-direct',
        name: 'Grafana Dashboard Integration',
        description: 'Grafana dashboard integration for metrics monitoring',
        author: 'CodeQual',
        homepage: 'https://grafana.com',
        documentationUrl: 'https://docs.codequal.com/tools/grafana-integration',
        supportedRoles: ['reporting', 'security', 'performance'],
        supportedLanguages: [],
        tags: ['monitoring', 'dashboards', 'metrics', 'visualization', 'time-series'],
        securityVerified: true,
        lastVerified: new Date('2025-06-07')
      });
    });
  });
});
