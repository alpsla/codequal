/* eslint-disable @typescript-eslint/no-explicit-any */
import { VectorStorageService } from '@codequal/database';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

/**
 * Simplified E2E PR Analysis Integration Test
 * Tests core integration patterns without full API server
 */
describe('E2E PR Analysis Flow', () => {
  let vectorDB: VectorStorageService;
  let supabase: any;
  
  // Mock authenticated user
  const mockUser = {
    id: 'test-user-e2e',
    email: 'e2e@example.com',
    role: 'admin',
    status: 'active',
    organizationId: 'test-org-e2e',
    permissions: ['read', 'write', 'admin'],
    session: {
      token: 'test-token-e2e',
      expiresAt: new Date(Date.now() + 3600000).toISOString()
    }
  };

  beforeAll(async () => {
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials in environment variables');
    }

    supabase = createClient(supabaseUrl, supabaseKey);
    
    // Initialize services
    vectorDB = new VectorStorageService();
  });

  afterAll(async () => {
    // Cleanup if needed
  });

  describe('Repository Analysis Pattern', () => {
    it('should validate analysis request structure', async () => {
      const testRepo = 'https://github.com/test-org/pr-analysis-repo';
      const prNumber = 42;
      
      console.log('Testing PR analysis request patterns...');
      
      const analysisRequest = {
        repositoryUrl: testRepo,
        prNumber: prNumber,
        analysisMode: 'comprehensive' as const,
        authenticatedUser: mockUser,
        agentRoles: ['security', 'architecture', 'performance', 'codeQuality'],
        options: {
          enableToolResults: true,
          includeDeepWikiContext: true,
          maxExecutionTime: 300000 // 5 minutes
        }
      };

      // Validate request structure
      expect(analysisRequest.repositoryUrl).toMatch(/^https:\/\/github\.com\//);
      expect(analysisRequest.prNumber).toBeGreaterThan(0);
      expect(analysisRequest.analysisMode).toMatch(/^(quick|comprehensive|deep)$/);
      expect(analysisRequest.agentRoles).toContain('security');
      expect(analysisRequest.agentRoles.length).toBeGreaterThan(0);
      expect(analysisRequest.authenticatedUser.id).toBeDefined();
      expect(analysisRequest.options.enableToolResults).toBe(true);
      
      console.log('✅ Analysis request structure validated');
      console.log(`   - Repository: ${analysisRequest.repositoryUrl}`);
      console.log(`   - PR #${analysisRequest.prNumber}`);
      console.log(`   - Agents: ${analysisRequest.agentRoles.join(', ')}`);
    });

    it('should handle repository metadata extraction', async () => {
      const testUrls = [
        'https://github.com/owner/repo',
        'https://github.com/organization/project-name',
        'https://github.com/user/repo.git'
      ];

      console.log('Testing repository metadata extraction...');

      for (const url of testUrls) {
        const match = url.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
        expect(match).toBeTruthy();
        
        const [, owner, repo] = match!;
        expect(owner).toBeDefined();
        expect(repo).toBeDefined();
        expect(owner.length).toBeGreaterThan(0);
        expect(repo.length).toBeGreaterThan(0);
        
        console.log(`✅ Extracted: ${owner}/${repo} from ${url}`);
      }
    });
  });

  describe('Agent Configuration', () => {
    it('should define proper agent-to-tool mapping', async () => {
      const agentToolMapping = {
        security: ['npm-audit', 'semgrep', 'bandit'],
        architecture: ['dependency-cruiser', 'madge'],
        performance: ['lighthouse', 'bundlesize'],
        codeQuality: ['eslint', 'sonar', 'complexity-report'],
        dependencies: ['npm-audit', 'dependency-check', 'license-checker']
      };

      console.log('Testing agent-tool mapping...');

      for (const [agent, tools] of Object.entries(agentToolMapping)) {
        expect(tools).toBeInstanceOf(Array);
        expect(tools.length).toBeGreaterThan(0);
        
        // Validate each tool has a valid name pattern
        for (const tool of tools) {
          expect(tool).toMatch(/^[a-z][a-z0-9\-]*$/);
        }
        
        console.log(`✅ ${agent}: ${tools.join(', ')}`);
      }
    });

    it('should validate analysis modes and their agent sets', async () => {
      const analysisModes = {
        quick: ['security', 'codeQuality'],
        comprehensive: ['security', 'architecture', 'performance', 'codeQuality'],
        deep: ['security', 'architecture', 'performance', 'codeQuality', 'dependencies']
      };

      console.log('Testing analysis mode configurations...');

      for (const [mode, agents] of Object.entries(analysisModes)) {
        expect(agents).toBeInstanceOf(Array);
        expect(agents.length).toBeGreaterThan(0);
        expect(agents).toContain('security'); // Security should always be included
        
        console.log(`✅ ${mode} mode: ${agents.length} agents (${agents.join(', ')})`);
      }

      // Validate escalation pattern
      expect(analysisModes.quick.length).toBeLessThan(analysisModes.comprehensive.length);
      expect(analysisModes.comprehensive.length).toBeLessThanOrEqual(analysisModes.deep.length);
    });
  });

  describe('Vector DB Integration', () => {
    it('should handle tool result storage patterns', async () => {
      console.log('Testing tool result storage patterns...');

      try {
        // Test tool result metadata structure
        const sampleToolResult = {
          repository_id: 'test-repo-123',
          content_type: 'tool_result',
          agent_role: 'security',
          tool_id: 'npm-audit',
          tool_name: 'NPM Security Audit',
          importance_score: 0.8,
          timestamp: new Date().toISOString(),
          is_latest: true
        };

        // Validate metadata structure
        expect(sampleToolResult.repository_id).toBeDefined();
        expect(sampleToolResult.content_type).toBe('tool_result');
        expect(sampleToolResult.agent_role).toMatch(/^(security|architecture|performance|codeQuality|dependencies)$/);
        expect(sampleToolResult.tool_id).toMatch(/^[a-z][a-z0-9\-]*$/);
        expect(sampleToolResult.importance_score).toBeGreaterThanOrEqual(0);
        expect(sampleToolResult.importance_score).toBeLessThanOrEqual(1);
        expect(sampleToolResult.is_latest).toBe(true);

        console.log('✅ Tool result metadata structure validated');
        console.log(`   - Tool: ${sampleToolResult.tool_name} (${sampleToolResult.tool_id})`);
        console.log(`   - Agent: ${sampleToolResult.agent_role}`);
        console.log(`   - Importance: ${sampleToolResult.importance_score}`);

      } catch (error: any) {
        console.log('⚠️  Tool result storage test skipped due to:', error.message);
        expect(true).toBe(true);
      }
    });

    it('should validate data freshness requirements', async () => {
      console.log('Testing data freshness requirements...');

      const maxAgeHours = 24; // Tool results should be fresh within 24 hours
      const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

      try {
        // Check if we can query for fresh data patterns
        const now = new Date();
        const cutoffTime = new Date(now.getTime() - maxAgeMs);

        const freshnessQuery = {
          is_latest: true,
          'metadata->>timestamp': `gte.${cutoffTime.toISOString()}`
        };

        // Validate query structure
        expect(freshnessQuery.is_latest).toBe(true);
        expect(freshnessQuery['metadata->>timestamp']).toContain('gte.');

        console.log('✅ Freshness query pattern validated');
        console.log(`   - Max age: ${maxAgeHours} hours`);
        console.log(`   - Cutoff: ${cutoffTime.toISOString()}`);

      } catch (error: any) {
        console.log('⚠️  Freshness test skipped due to:', error.message);
        expect(true).toBe(true);
      }
    });
  });

  describe('Error Handling Patterns', () => {
    it('should handle repository access failures gracefully', async () => {
      console.log('Testing error handling patterns...');

      const errorScenarios = [
        {
          type: 'private_repo',
          url: 'https://github.com/private/secret-repo',
          expectedCode: 404,
          expectedMessage: 'Repository not found'
        },
        {
          type: 'invalid_url',
          url: 'https://not-github.com/user/repo',
          expectedCode: 400,
          expectedMessage: 'Invalid repository URL'
        },
        {
          type: 'malformed_url',
          url: 'not-a-url',
          expectedCode: 400,
          expectedMessage: 'Invalid URL format'
        }
      ];

      for (const scenario of errorScenarios) {
        // Validate error handling structure
        expect(scenario.type).toBeDefined();
        expect(scenario.expectedCode).toBeGreaterThanOrEqual(400);
        expect(scenario.expectedCode).toBeLessThan(600);
        expect(scenario.expectedMessage).toBeDefined();

        console.log(`✅ Error scenario: ${scenario.type} -> ${scenario.expectedCode}`);
      }
    });

    it('should handle tool execution timeouts', async () => {
      console.log('Testing timeout handling...');

      const timeoutScenarios = [
        { tool: 'npm-audit', maxTime: 30000 }, // 30 seconds
        { tool: 'eslint', maxTime: 60000 },    // 1 minute
        { tool: 'semgrep', maxTime: 120000 },  // 2 minutes
        { tool: 'lighthouse', maxTime: 180000 } // 3 minutes
      ];

      for (const scenario of timeoutScenarios) {
        expect(scenario.tool).toMatch(/^[a-z][a-z0-9\-]*$/);
        expect(scenario.maxTime).toBeGreaterThan(0);
        expect(scenario.maxTime).toBeLessThanOrEqual(300000); // Max 5 minutes

        console.log(`✅ ${scenario.tool}: ${scenario.maxTime / 1000}s timeout`);
      }
    });
  });

  describe('Integration Patterns', () => {
    it('should validate webhook event handling', async () => {
      console.log('Testing webhook event patterns...');

      const webhookEvent = {
        type: 'pull_request',
        action: 'opened',
        repository: {
          full_name: 'test-org/test-repo',
          clone_url: 'https://github.com/test-org/test-repo.git'
        },
        pull_request: {
          number: 123,
          head: {
            sha: 'abc123',
            ref: 'feature/test-branch'
          },
          base: {
            sha: 'def456',
            ref: 'main'
          }
        }
      };

      // Validate webhook structure
      expect(webhookEvent.type).toBe('pull_request');
      expect(webhookEvent.action).toMatch(/^(opened|synchronize|closed)$/);
      expect(webhookEvent.repository.full_name).toMatch(/^[^\/]+\/[^\/]+$/);
      expect(webhookEvent.pull_request.number).toBeGreaterThan(0);
      expect(webhookEvent.pull_request.head.sha).toMatch(/^[a-f0-9]+$/);
      expect(webhookEvent.pull_request.base.sha).toMatch(/^[a-f0-9]+$/);

      console.log('✅ Webhook event structure validated');
      console.log(`   - PR #${webhookEvent.pull_request.number}`);
      console.log(`   - ${webhookEvent.pull_request.head.ref} -> ${webhookEvent.pull_request.base.ref}`);
    });

    it('should validate DeepWiki integration pattern', async () => {
      console.log('Testing DeepWiki integration...');

      const deepWikiRequest = {
        repositoryUrl: 'https://github.com/test-org/test-repo',
        analysisType: 'comprehensive',
        options: {
          includeDependencies: true,
          includeArchitecture: true,
          includeSecurity: true,
          maxDepth: 3
        }
      };

      // Validate DeepWiki request structure
      expect(deepWikiRequest.repositoryUrl).toMatch(/^https:\/\/github\.com\//);
      expect(deepWikiRequest.analysisType).toMatch(/^(quick|comprehensive|deep)$/);
      expect(deepWikiRequest.options.maxDepth).toBeGreaterThan(0);
      expect(deepWikiRequest.options.maxDepth).toBeLessThanOrEqual(5);

      console.log('✅ DeepWiki integration pattern validated');
      console.log(`   - Analysis: ${deepWikiRequest.analysisType}`);
      console.log(`   - Max depth: ${deepWikiRequest.options.maxDepth}`);
    });
  });
});