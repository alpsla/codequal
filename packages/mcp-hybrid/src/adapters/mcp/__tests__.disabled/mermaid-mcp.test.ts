/**
 * Unit and Integration tests for Mermaid MCP Adapter
 * Tests diagram creation capabilities for reporting
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { MermaidMCPAdapter } from '../mermaid-mcp';
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

describe('Mermaid MCP Adapter', () => {
  let adapter: MermaidMCPAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new MermaidMCPAdapter();
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
        prNumber: 555,
        title: 'Architecture refactoring',
        description: 'Improving system architecture',
        baseBranch: 'main',
        targetBranch: 'feature/architecture',
        author: 'architect-user',
        files: files.map(f => ({
          path: f.path || 'test.ts',
          content: f.content || '',
          language: f.language || 'typescript',
          changeType: f.changeType || 'modified',
          diff: f.diff
        })),
        commits: [{
          sha: 'xyz555',
          message: 'Refactor architecture',
          author: 'architect-user'
        }]
      },
      repository: {
        name: 'enterprise-app',
        owner: 'corp-team',
        languages: ['typescript', 'javascript', 'python'],
        frameworks: ['react', 'express', 'django'],
        primaryLanguage
      },
      userContext: {
        userId: 'user-555',
        permissions: ['read', 'write']
      }
    };
  }

  describe('Metadata and Configuration', () => {
    it('should have correct metadata', () => {
      const metadata = adapter.getMetadata();
      
      expect(metadata.id).toBe('mermaid-mcp');
      expect(metadata.name).toBe('Mermaid Diagram Service');
      expect(metadata.description).toContain('architecture diagrams');
      expect(metadata.supportedRoles).toContain('reporting');
      expect(metadata.supportedRoles).toContain('architecture');
      expect(metadata.supportedLanguages).toContain('any');
      expect(metadata.tags).toContain('diagrams');
      expect(metadata.tags).toContain('visualization');
      expect(metadata.tags).toContain('architecture');
      expect(metadata.securityVerified).toBe(true);
    });

    it('should have proper capabilities', () => {
      expect(adapter.capabilities).toContainEqual(
        expect.objectContaining({ name: 'flowchart', category: 'visualization' })
      );
      expect(adapter.capabilities).toContainEqual(
        expect.objectContaining({ name: 'sequence-diagram', category: 'visualization' })
      );
      expect(adapter.capabilities).toContainEqual(
        expect.objectContaining({ name: 'class-diagram', category: 'visualization' })
      );
      expect(adapter.capabilities).toContainEqual(
        expect.objectContaining({ name: 'state-diagram', category: 'visualization' })
      );
      expect(adapter.capabilities).toContainEqual(
        expect.objectContaining({ name: 'er-diagram', category: 'visualization' })
      );
    });

    it('should have correct requirements', () => {
      expect(adapter.requirements.executionMode).toBe('on-demand');
      expect(adapter.requirements.timeout).toBe(15000);
      expect(adapter.requirements.authentication?.type).toBe('none');
      expect(adapter.requirements.authentication?.required).toBe(false);
    });
  });

  describe('canAnalyze', () => {
    it('should analyze for reporting agent', () => {
      const context = createTestContext('reporting');
      expect(adapter.canAnalyze(context)).toBe(true);
    });

    it('should analyze for architecture agent', () => {
      const context = createTestContext('architecture');
      expect(adapter.canAnalyze(context)).toBe(true);
    });

    it('should not analyze for other agents', () => {
      const roles = ['security', 'performance', 'codeQuality', 'educational', 'dependency'];
      
      roles.forEach(role => {
        const context = createTestContext(role);
        expect(adapter.canAnalyze(context)).toBe(false);
      });
    });
  });

  describe('Diagram Generation - Unit Tests', () => {
    beforeEach(() => {
      // Mock the executeMCPCommand method
      jest.spyOn(adapter as any, 'executeMCPCommand').mockImplementation(async (command) => {
        if (command.method === 'generate_diagram') {
          const { type, definition } = command.params;
          
          // Generate mock diagram based on type
          const svgContent = `<svg>Mock ${type} diagram</svg>`;
          const imageUrl = `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;
          
          return {
            diagram: {
              type,
              definition,
              diagramId: `diagram-${Date.now()}`,
              svgContent,
              imageUrl,
              interactiveUrl: `https://mermaid.live/edit#${Buffer.from(definition).toString('base64')}`
            }
          };
        }
        return {};
      });

      // Mock initializeMCPServer
      jest.spyOn(adapter as any, 'initializeMCPServer').mockResolvedValue(undefined);
    });

    it('should generate flowchart for process flow', async () => {
      const definition = `
        flowchart TD
          A[Start] --> B{Is Valid?}
          B -->|Yes| C[Process]
          B -->|No| D[Error]
          C --> E[End]
          D --> E
      `;

      const diagram = await adapter.generateFlowchart(definition, 'Process Validation Flow');

      expect(diagram).toBeDefined();
      expect(diagram.type).toBe('flowchart');
      expect(diagram.diagramId).toBeDefined();
      expect(diagram.svgContent).toContain('Mock flowchart diagram');
      expect(diagram.imageUrl).toContain('data:image/svg+xml;base64');
      expect(diagram.interactiveUrl).toContain('https://mermaid.live/edit');
    });

    it('should generate sequence diagram for API flow', async () => {
      const definition = `
        sequenceDiagram
          participant Client
          participant API
          participant DB
          
          Client->>API: POST /login
          API->>DB: Query user
          DB-->>API: User data
          API-->>Client: JWT token
      `;

      const diagram = await adapter.generateSequenceDiagram(definition, 'Authentication Flow');

      expect(diagram).toBeDefined();
      expect(diagram.type).toBe('sequence');
      expect(diagram.diagramId).toBeDefined();
      expect(diagram.svgContent).toBeDefined();
    });

    it('should generate class diagram for system architecture', async () => {
      const definition = `
        classDiagram
          class User {
            -id: string
            -email: string
            +login()
            +logout()
          }
          class AuthService {
            +authenticate()
            +validateToken()
          }
          User --> AuthService: uses
      `;

      const diagram = await adapter.generateClassDiagram(definition, 'User Authentication Classes');

      expect(diagram).toBeDefined();
      expect(diagram.type).toBe('class');
      expect(diagram.definition).toBe(definition);
    });

    it('should generate state diagram for workflow', async () => {
      const definition = `
        stateDiagram-v2
          [*] --> Draft
          Draft --> Review: Submit
          Review --> Approved: Approve
          Review --> Draft: Reject
          Approved --> Published: Publish
          Published --> [*]
      `;

      const diagram = await adapter.generateStateDiagram(definition, 'Document Workflow');

      expect(diagram).toBeDefined();
      expect(diagram.type).toBe('state');
      expect(diagram.title).toBe('Document Workflow');
    });

    it('should generate ER diagram for database schema', async () => {
      const definition = `
        erDiagram
          USER ||--o{ ORDER : places
          ORDER ||--|{ ORDER_ITEM : contains
          PRODUCT ||--o{ ORDER_ITEM : "ordered in"
          
          USER {
            int id
            string email
            string name
          }
          ORDER {
            int id
            date created_at
            string status
          }
      `;

      const diagram = await adapter.generateERDiagram(definition, 'E-commerce Database Schema');

      expect(diagram).toBeDefined();
      expect(diagram.type).toBe('er');
      expect(diagram.diagramId).toBeDefined();
    });

    it('should generate Gantt chart for project timeline', async () => {
      const definition = `
        gantt
          title Project Timeline
          dateFormat YYYY-MM-DD
          section Phase 1
          Design :a1, 2024-01-01, 30d
          Development :a2, after a1, 45d
          section Phase 2
          Testing :a3, after a2, 20d
          Deployment :a4, after a3, 10d
      `;

      const diagram = await adapter.generateGanttChart(definition, 'Project Schedule');

      expect(diagram).toBeDefined();
      expect(diagram.type).toBe('gantt');
      expect(diagram.diagramId).toBeDefined();
    });
  });

  describe('analyze - Integration with Context', () => {
    beforeEach(() => {
      jest.spyOn(adapter as any, 'initializeMCPServer').mockResolvedValue(undefined);
      jest.spyOn(adapter as any, 'executeMCPCommand').mockImplementation(async (command) => {
        if (command.method === 'generate_diagram') {
          return {
            diagram: {
              type: command.params.type,
              diagramId: `diagram-${Date.now()}`,
              svgContent: `<svg>Mock ${command.params.type}</svg>`,
              imageUrl: `data:image/svg+xml;base64,mockData`,
              interactiveUrl: 'https://mermaid.live/edit#mock'
            }
          };
        }
        return {};
      });
    });

    it('should analyze architecture and generate multiple diagrams', async () => {
      const context = createTestContext('architecture', [
        {
          path: 'src/services/auth.service.ts',
          content: `
            export class AuthService {
              async login(email: string, password: string) {}
              async logout() {}
            }
          `
        },
        {
          path: 'src/models/user.model.ts',
          content: `
            export interface User {
              id: string;
              email: string;
              role: 'admin' | 'user';
            }
          `
        }
      ]);

      // Add architecture analysis data
      (context as any).architectureData = {
        components: ['AuthService', 'UserModel', 'Database'],
        dependencies: [
          { from: 'AuthService', to: 'UserModel' },
          { from: 'AuthService', to: 'Database' }
        ],
        layers: ['Presentation', 'Business', 'Data']
      };

      const result = await adapter.analyze(context);

      expect(result.success).toBe(true);
      expect(result.toolId).toBe('mermaid-mcp');
      expect(result.findings?.length).toBeGreaterThanOrEqual(2);
      
      // Should generate architecture diagram
      const archDiagram = result.findings?.find(f => 
        f.message.includes('Architecture Overview')
      );
      expect(archDiagram).toBeDefined();
      
      // Should generate dependency graph
      const depDiagram = result.findings?.find(f => 
        f.message.includes('Dependency Graph')
      );
      expect(depDiagram).toBeDefined();
    });

    it('should generate reporting diagrams for analysis results', async () => {
      const context = createTestContext('reporting');
      
      // Add reporting data
      (context as any).reportingData = {
        findings: {
          security: { critical: 2, high: 5, medium: 10, low: 15 },
          performance: { issues: 8, optimizations: 12 },
          codeQuality: { smells: 20, duplications: 5 }
        },
        workflow: [
          { step: 'Analysis', status: 'completed' },
          { step: 'Review', status: 'in-progress' },
          { step: 'Fix', status: 'pending' },
          { step: 'Verify', status: 'pending' }
        ],
        timeline: {
          phases: [
            { name: 'Development', start: '2024-01-01', duration: '2 months' },
            { name: 'Testing', start: '2024-03-01', duration: '1 month' },
            { name: 'Deployment', start: '2024-04-01', duration: '2 weeks' }
          ]
        }
      };

      const result = await adapter.analyze(context);

      expect(result.success).toBe(true);
      
      // Should generate findings flow diagram
      const findingsFlow = result.findings?.find(f => 
        f.message.includes('Findings Distribution')
      );
      expect(findingsFlow).toBeDefined();
      
      // Should generate workflow diagram
      const workflowDiagram = result.findings?.find(f => 
        f.message.includes('Analysis Workflow')
      );
      expect(workflowDiagram).toBeDefined();
      
      // Should generate timeline
      const timelineDiagram = result.findings?.find(f => 
        f.message.includes('Project Timeline')
      );
      expect(timelineDiagram).toBeDefined();
    });

    it('should handle empty context gracefully', async () => {
      const context = createTestContext('reporting');
      
      const result = await adapter.analyze(context);

      expect(result.success).toBe(true);
      expect(result.findings).toEqual([]);
      expect(result.metrics?.diagramsGenerated).toBe(0);
    });

    it('should generate educational learning path diagram', async () => {
      const context = createTestContext('reporting');
      
      (context as any).educationalData = {
        learningPath: [
          { topic: 'Basic Security', status: 'completed', duration: '2h' },
          { topic: 'OWASP Top 10', status: 'in-progress', duration: '4h' },
          { topic: 'Secure Coding', status: 'pending', duration: '6h' },
          { topic: 'Security Testing', status: 'pending', duration: '3h' }
        ],
        skills: {
          current: ['JavaScript', 'React'],
          target: ['TypeScript', 'Security', 'Testing'],
          gaps: ['TypeScript', 'Security Best Practices']
        }
      };

      const result = await adapter.analyze(context);

      const learningDiagram = result.findings?.find(f => 
        f.message.includes('Learning Path')
      );
      expect(learningDiagram).toBeDefined();
      expect(learningDiagram?.category).toBe('educational');
    });
  });

  describe('Error Handling', () => {
    it('should handle MCP server initialization failure', async () => {
      jest.spyOn(adapter as any, 'initializeMCPServer').mockRejectedValue(
        new Error('Failed to start Mermaid MCP server')
      );

      const context = createTestContext('reporting');
      const result = await adapter.analyze(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to start Mermaid MCP server');
      expect(result.findings).toEqual([]);
    });

    it('should handle diagram generation failure gracefully', async () => {
      jest.spyOn(adapter as any, 'initializeMCPServer').mockResolvedValue(undefined);
      jest.spyOn(adapter as any, 'executeMCPCommand').mockRejectedValue(
        new Error('Invalid diagram syntax')
      );

      const diagram = await adapter.generateFlowchart('invalid syntax', 'Test');

      expect(diagram).toBeNull();
    });

    it('should validate diagram definitions', async () => {
      jest.spyOn(adapter as any, 'initializeMCPServer').mockResolvedValue(undefined);
      
      // Empty definition
      const diagram = await adapter.generateClassDiagram('', 'Empty Diagram');

      expect(diagram).toBeNull();
    });
  });

  describe('Complex Diagram Generation', () => {
    beforeEach(() => {
      jest.spyOn(adapter as any, 'initializeMCPServer').mockResolvedValue(undefined);
      jest.spyOn(adapter as any, 'executeMCPCommand').mockImplementation(async (command) => {
        return {
          diagram: {
            type: command.params.type,
            definition: command.params.definition,
            diagramId: 'complex-diagram',
            svgContent: '<svg>Complex diagram</svg>',
            imageUrl: 'data:image/svg+xml;base64,complex'
          }
        };
      });
    });

    it('should generate complex architecture diagram with multiple layers', async () => {
      const architectureData = {
        layers: {
          presentation: ['WebApp', 'MobileApp', 'API Gateway'],
          business: ['AuthService', 'UserService', 'OrderService'],
          data: ['UserDB', 'OrderDB', 'CacheDB']
        },
        connections: [
          { from: 'WebApp', to: 'API Gateway' },
          { from: 'MobileApp', to: 'API Gateway' },
          { from: 'API Gateway', to: 'AuthService' },
          { from: 'API Gateway', to: 'UserService' },
          { from: 'AuthService', to: 'UserDB' },
          { from: 'UserService', to: 'UserDB' },
          { from: 'UserService', to: 'CacheDB' }
        ]
      };

      const definition = adapter.buildArchitectureDiagram(architectureData);
      const diagram = await adapter.generateFlowchart(definition, 'System Architecture');

      expect(diagram).toBeDefined();
      expect(definition).toContain('WebApp');
      expect(definition).toContain('API Gateway');
      expect(definition).toContain('-->');
    });

    it('should generate comprehensive dependency matrix', async () => {
      const dependencies = [
        { module: 'auth', dependencies: ['database', 'crypto', 'logger'] },
        { module: 'api', dependencies: ['auth', 'validator', 'logger'] },
        { module: 'database', dependencies: ['logger'] },
        { module: 'crypto', dependencies: [] }
      ];

      const definition = adapter.buildDependencyMatrix(dependencies);
      const diagram = await adapter.generateFlowchart(definition, 'Dependency Matrix');

      expect(diagram).toBeDefined();
      expect(definition).toContain('auth');
      expect(definition).toContain('database');
    });

    it('should generate skill progression diagram', async () => {
      const skillData = {
        developer: 'John Doe',
        skills: [
          { name: 'JavaScript', level: 8, target: 9 },
          { name: 'TypeScript', level: 5, target: 8 },
          { name: 'Testing', level: 4, target: 7 },
          { name: 'Security', level: 3, target: 6 }
        ],
        timeline: '6 months'
      };

      const definition = adapter.buildSkillProgressionDiagram(skillData);
      const diagram = await adapter.generateFlowchart(definition, 'Skill Development Plan');

      expect(diagram).toBeDefined();
      expect(definition).toContain('JavaScript');
      expect(definition).toContain('level');
    });
  });

  describe('Performance and Export Features', () => {
    beforeEach(() => {
      jest.spyOn(adapter as any, 'initializeMCPServer').mockResolvedValue(undefined);
      jest.spyOn(adapter as any, 'executeMCPCommand').mockImplementation(async (command) => {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 30));
        
        return {
          diagram: {
            type: command.params.type,
            diagramId: `diagram-${Date.now()}`,
            svgContent: '<svg>Diagram</svg>',
            imageUrl: 'data:image/svg+xml;base64,mock',
            exportFormats: ['svg', 'png', 'pdf'],
            editUrl: 'https://mermaid.live/edit#mock'
          }
        };
      });
    });

    it('should complete diagram generation within timeout', async () => {
      const startTime = Date.now();
      
      const largeDefinition = `
        flowchart TD
          ${Array.from({ length: 50 }, (_, i) => 
            `Node${i}[Node ${i}] --> Node${i + 1}[Node ${i + 1}]`
          ).join('\n')}
      `;

      const diagram = await adapter.generateFlowchart(largeDefinition, 'Large Flowchart');
      const duration = Date.now() - startTime;

      expect(diagram).toBeDefined();
      expect(duration).toBeLessThan(adapter.requirements.timeout);
    });

    it('should provide export options for diagrams', async () => {
      const diagram = await adapter.generateSequenceDiagram(
        'sequenceDiagram\nA->>B: Test',
        'Export Test'
      );

      expect(diagram?.exportFormats).toContain('svg');
      expect(diagram?.exportFormats).toContain('png');
      expect(diagram?.exportFormats).toContain('pdf');
      expect(diagram?.editUrl).toContain('https://mermaid.live/edit');
    });

    it('should cache generated diagrams for performance', async () => {
      const definition = 'flowchart TD\nA-->B';
      
      // First generation
      const diagram1 = await adapter.generateFlowchart(definition, 'Cached Diagram');
      
      // Second generation (should use cache)
      const startTime = Date.now();
      const diagram2 = await adapter.generateFlowchart(definition, 'Cached Diagram');
      const duration = Date.now() - startTime;

      expect(diagram1?.diagramId).toBe(diagram2?.diagramId);
      expect(duration).toBeLessThan(10); // Should be very fast from cache
    });
  });
});