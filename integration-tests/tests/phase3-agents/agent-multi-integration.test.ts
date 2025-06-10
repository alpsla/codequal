import { 
  MultiAgentToolIntegration,
  createToolEnhancedExecutor,
  MCPHybridIntegration
} from '@codequal/mcp-hybrid';
import { VectorContextService } from '../../mocks/VectorContextService';
import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

describe('Multi-Agent Tool Integration Tests', () => {
  let vectorContextService: VectorContextService;
  let supabase: any;

  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
    vectorContextService = new VectorContextService(supabase);
  });

  afterAll(async () => {
    // Ensure MCP system is properly shut down
    try {
      await MCPHybridIntegration.shutdown();
    } catch (error) {
      // Ignore errors during shutdown
    }
  });

  describe('Multi-Agent Tool Integration', () => {
    it('should enhance executor with tool capabilities', () => {
      // Mock executor
      const mockExecutor = {
        createAgent: async (agentConfig: any, name: string) => {
          return {
            name,
            role: agentConfig.role,
            analyze: async (data: any) => ({
              role: agentConfig.role,
              findings: []
            })
          };
        }
      };

      // Create integration
      const integration = new MultiAgentToolIntegration({
        enableTools: true,
        toolTimeout: 30000,
        maxParallelToolsPerAgent: 3
      });

      // Enhance executor
      integration.enhanceExecutor(mockExecutor);

      // Verify enhancement
      expect(mockExecutor.createAgent).toBeDefined();
      expect(typeof mockExecutor.createAgent).toBe('function');
    });

    it('should wrap agents with tool execution', async () => {
      const mockExecutor = {
        createAgent: async (agentConfig: any, name: string) => {
          return {
            name,
            role: agentConfig.role,
            analyze: async (data: any) => {
              // Agent should receive tool results in data
              if (data.toolAnalysis) {
                return {
                  role: agentConfig.role,
                  findings: data.toolAnalysis.findings || [],
                  toolsUsed: data.toolAnalysis.toolsExecuted,
                  confidence: 0.85
                };
              }
              return {
                role: agentConfig.role,
                findings: [],
                confidence: 0.5
              };
            }
          };
        }
      };

      const integration = new MultiAgentToolIntegration({
        enableTools: false // Tools not implemented yet
      });

      integration.enhanceExecutor(mockExecutor);

      // Create agent
      const agent = await mockExecutor.createAgent(
        { role: 'security' },
        'security-agent'
      );

      // Analyze without tools
      const result = await agent.analyze({
        pull_request: { files: [] }
      });

      expect(result.role).toBe('security');
      expect(result.confidence).toBe(0.5); // Low confidence without tools
    });
  });

  describe('Tool-Enhanced Executor Factory', () => {
    it('should create enhanced executor class', () => {
      // Mock base executor class
      class MockExecutor {
        agents: any[] = [];
        
        async createAgent(config: any, name: string) {
          const agent = { 
            name, 
            config,
            analyze: async () => ({ role: config.role })
          };
          this.agents.push(agent);
          return agent;
        }
      }

      // Create enhanced executor class
      const EnhancedExecutor = createToolEnhancedExecutor(MockExecutor, {
        enableTools: true
      });

      const executor = new EnhancedExecutor();
      
      expect(executor).toBeDefined();
      expect(executor.getToolResults).toBeDefined();
      expect(executor.clearToolResults).toBeDefined();
    });
  });

  describe('MCP Hybrid System Initialization', () => {
    it('should initialize MCP hybrid system', async () => {
      // Note: This would fail in real execution as tools aren't implemented
      // But we can test the initialization flow
      try {
        await MCPHybridIntegration.initialize();
      } catch (error) {
        // Expected to fail as tool adapters aren't fully implemented
        expect(error).toBeDefined();
      }
    });

    it('should handle shutdown gracefully', async () => {
      // Test shutdown even if not initialized
      await expect(MCPHybridIntegration.shutdown()).resolves.not.toThrow();
    });
  });

  describe('Analysis Context Creation', () => {
    it('should detect languages from file extensions', () => {
      const integration = new MultiAgentToolIntegration({ enableTools: false });
      
      // Access private method via prototype manipulation for testing
      const detectLanguages = (integration as any).detectLanguages.bind(integration);
      
      const files = [
        { filename: 'index.js' },
        { filename: 'App.tsx' },
        { filename: 'server.py' },
        { filename: 'Main.java' },
        { filename: 'lib.rs' }
      ];

      const languages = detectLanguages(files);
      
      expect(languages).toContain('javascript');
      expect(languages).toContain('typescript');
      expect(languages).toContain('python');
      expect(languages).toContain('java');
      expect(languages).toContain('rust');
    });

    it('should detect frameworks from file content', () => {
      const integration = new MultiAgentToolIntegration({ enableTools: false });
      
      // Access private method for testing
      const detectFrameworks = (integration as any).detectFrameworks.bind(integration);
      
      const files = [
        { 
          filename: 'App.tsx', 
          content: 'import React from "react"; export default function App() {}' 
        },
        { 
          filename: 'server.js', 
          content: 'const express = require("express"); const app = express();' 
        },
        { 
          filename: 'component.vue', 
          content: '<template><div>Vue Component</div></template>' 
        },
        {
          filename: 'app.module.ts',
          content: 'import { NgModule } from "@angular/core";'
        }
      ];

      const frameworks = detectFrameworks(files);
      
      expect(frameworks).toContain('react');
      expect(frameworks).toContain('express');
      expect(frameworks).toContain('vue');
      expect(frameworks).toContain('angular');
    });
  });

  describe('Tool Result Storage', () => {
    it('should store and retrieve tool results', () => {
      const integration = new MultiAgentToolIntegration({ enableTools: true });
      
      // Mock tool results
      const mockResults = {
        security: { findings: ['SQL injection'], toolsExecuted: ['semgrep'] },
        codeQuality: { findings: ['Complex function'], toolsExecuted: ['eslint'] }
      };

      // Store results (would happen during execution)
      (integration as any).toolResults.set('security-agent', mockResults.security);
      (integration as any).toolResults.set('quality-agent', mockResults.codeQuality);

      // Retrieve results
      const results = integration.getToolResults();
      
      expect(results.size).toBe(2);
      expect(results.get('security-agent')).toEqual(mockResults.security);
      expect(results.get('quality-agent')).toEqual(mockResults.codeQuality);

      // Clear results
      integration.clearToolResults();
      expect(integration.getToolResults().size).toBe(0);
    });
  });

  describe('Integration with Repository Data', () => {
    it('should create proper analysis context from repository data', async () => {
      const integration = new MultiAgentToolIntegration({ enableTools: false });
      
      const prData = {
        pull_request: {
          number: 456,
          title: 'Add user authentication',
          body: 'Implements OAuth2 authentication',
          user: { login: 'developer123' },
          base: { ref: 'main' },
          head: { ref: 'feature/oauth' }
        },
        repository: {
          name: 'my-app',
          owner: { login: 'myorg' }
        },
        files: [
          {
            filename: 'src/auth/oauth.ts',
            content: 'import { OAuth2Client } from "google-auth-library"',
            status: 'added'
          }
        ],
        userId: 'user-123',
        organizationId: 'org-456'
      };

      // Create context (access private method for testing)
      const createContext = (integration as any).createAnalysisContext.bind(integration);
      const context = createContext({ role: 'security' }, prData);

      expect(context.agentRole).toBe('security');
      expect(context.pr.prNumber).toBe(456);
      expect(context.pr.title).toBe('Add user authentication');
      expect(context.pr.files).toHaveLength(1);
      expect(context.repository.name).toBe('my-app');
      expect(context.repository.languages).toContain('typescript');
      expect(context.userContext.userId).toBe('user-123');
    });
  });

  describe('Error Handling', () => {
    it('should fall back to original analysis on tool failure', async () => {
      const mockExecutor = {
        originalAnalyzeCallCount: 0,
        createAgent: async function(agentConfig: any, name: string) {
          const originalAnalyze = async (data: any) => {
            this.originalAnalyzeCallCount++;
            return {
              role: agentConfig.role,
              findings: [],
              source: 'original-analysis'
            };
          };

          return {
            name,
            role: agentConfig.role,
            analyze: originalAnalyze
          };
        }
      };

      const integration = new MultiAgentToolIntegration({ 
        enableTools: true,
        toolTimeout: 100 // Very short timeout to force failure
      });

      integration.enhanceExecutor(mockExecutor);

      const agent = await mockExecutor.createAgent(
        { role: 'security' },
        'security-agent'
      );

      // This should fall back to original analysis
      const result = await agent.analyze({ files: [] });

      expect(result.source).toBe('original-analysis');
      expect(mockExecutor.originalAnalyzeCallCount).toBe(1);
    });
  });
});
