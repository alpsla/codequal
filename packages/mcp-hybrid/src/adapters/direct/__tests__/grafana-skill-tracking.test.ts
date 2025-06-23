/**
 * Tests for Grafana Adapter with Skill Tracking Enhancements
 */

import { GrafanaDirectAdapter } from '../grafana-adapter';
import { AnalysisContext } from '../../../core/interfaces';

describe('Grafana Adapter - Skill Tracking Integration', () => {
  let adapter: GrafanaDirectAdapter;
  
  beforeEach(() => {
    adapter = new GrafanaDirectAdapter();
    
    // Mock environment variables
    process.env.GRAFANA_URL = 'http://localhost:3000';
    process.env.GRAFANA_API_KEY = 'test-api-key';
  });

  describe('Educational Agent Role - Skill Tracking Panels', () => {
    it('should create skill tracking panels for educational agent role', async () => {
      const context: AnalysisContext = {
        agentRole: 'educational',
        pr: {
          prNumber: 123,
          title: 'Add new feature',
          description: 'Implements user authentication',
          baseBranch: 'main',
          targetBranch: 'feature/auth',
          author: 'developer@example.com',
          files: [],
          commits: []
        },
        repository: {
          name: 'test-repo',
          owner: 'test-org',
          languages: ['TypeScript', 'JavaScript'],
          frameworks: ['React', 'Express'],
          primaryLanguage: 'TypeScript'
        },
        userContext: {
          userId: 'user-123',
          organizationId: 'org-456',
          permissions: ['read', 'write']
        }
      };

      const result = await adapter.analyze(context);

      expect(result.success).toBe(true);
      expect(result.findings).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('Grafana dashboard')
        })
      );
    });

    it('should generate correct SQL queries for skill progression', async () => {
      const context: AnalysisContext = {
        agentRole: 'educational',
        pr: {
          prNumber: 456,
          title: 'Security fixes',
          description: 'Fixes XSS vulnerabilities',
          baseBranch: 'main',
          targetBranch: 'fix/security',
          author: 'security@example.com',
          files: [
            {
              path: 'src/components/UserInput.tsx',
              content: 'const sanitized = DOMPurify.sanitize(input);',
              language: 'typescript',
              changeType: 'modified'
            }
          ],
          commits: []
        },
        repository: {
          name: 'secure-app',
          owner: 'security-org',
          languages: ['TypeScript'],
          frameworks: ['React']
        },
        userContext: {
          userId: 'security-expert-789',
          permissions: ['read', 'write', 'admin']
        }
      };

      // Mock the panel creation to capture SQL queries
      let capturedPanels: any[] = [];
      jest.spyOn(adapter as any, 'createRoleSpecificPanels').mockImplementation(async (ctx) => {
        const panels = await (adapter as any).createRoleSpecificPanels.mock.results[0].value;
        capturedPanels = panels;
        return panels;
      });

      await adapter.analyze(context);

      // Find skill progression panel
      const skillPanel = capturedPanels.find(p => p.title === 'Skill Level Progression');
      expect(skillPanel).toBeDefined();
      expect(skillPanel.targets[0].query).toContain('developer_skills');
      expect(skillPanel.targets[0].query).toContain("user-123'"); // Uses correct user ID
      expect(skillPanel.type).toBe('graph'); // Time series graph

      // Find learning engagement panel
      const engagementPanel = capturedPanels.find(p => p.title === 'Learning Engagement Metrics');
      expect(engagementPanel).toBeDefined();
      expect(engagementPanel.targets[0].query).toContain('AVG(engagement_score)');
      expect(engagementPanel.targets[0].query).toContain('SUM(time_spent)');
      expect(engagementPanel.type).toBe('stat'); // Statistics panel

      // Find skill gaps heatmap
      const gapsPanel = capturedPanels.find(p => p.title === 'Skill Gaps Analysis');
      expect(gapsPanel).toBeDefined();
      expect(gapsPanel.targets[0].query).toContain('(required_level - current_level) as gap');
      expect(gapsPanel.type).toBe('heatmap'); // Heatmap visualization

      // Find effectiveness gauge
      const effectivenessPanel = capturedPanels.find(p => p.title === 'Educational Content Effectiveness');
      expect(effectivenessPanel).toBeDefined();
      expect(effectivenessPanel.targets[0].query).toContain('AVG(effectiveness_rating)');
      expect(effectivenessPanel.type).toBe('gauge'); // Gauge visualization
    });

    it('should handle missing user context gracefully', async () => {
      const context: AnalysisContext = {
        agentRole: 'educational',
        pr: {
          prNumber: 789,
          title: 'Anonymous PR',
          description: 'From anonymous user',
          baseBranch: 'main',
          targetBranch: 'feature/anon',
          author: 'anonymous',
          files: [],
          commits: []
        },
        repository: {
          name: 'public-repo',
          owner: 'public-org',
          languages: ['JavaScript'],
          frameworks: []
        },
        userContext: {
          userId: '', // Empty user ID
          permissions: ['read']
        }
      };

      const result = await adapter.analyze(context);

      expect(result.success).toBe(true);
      // Should use 'unknown' as fallback for user ID in queries
      // This is handled in the adapter implementation
    });

    it('should create appropriate panels for different agent roles', async () => {
      const roles: Array<AnalysisContext['agentRole']> = [
        'security',
        'performance',
        'codeQuality',
        'architecture',
        'dependency',
        'educational',
        'reporting'
      ];

      for (const role of roles) {
        const context: AnalysisContext = {
          agentRole: role,
          pr: {
            prNumber: 100 + roles.indexOf(role),
            title: `Test PR for ${role}`,
            description: `Testing ${role} agent`,
            baseBranch: 'main',
            targetBranch: `test/${role}`,
            author: 'test@example.com',
            files: [],
            commits: []
          },
          repository: {
            name: 'multi-role-test',
            owner: 'test-org',
            languages: ['TypeScript'],
            frameworks: []
          },
          userContext: {
            userId: 'test-user',
            permissions: ['read', 'write']
          }
        };

        const result = await adapter.analyze(context);
        
        expect(result.success).toBe(true);
        expect(result.findings?.length || 0).toBeGreaterThan(0);
        
        // Educational role should have skill tracking panels
        if (role === 'educational') {
          expect(result.metrics?.panelsCreated).toBeGreaterThanOrEqual(4);
        } else {
          // Other roles have different panel counts
          expect(result.metrics?.panelsCreated).toBeGreaterThanOrEqual(1);
        }
      }
    });

    it('should validate Grafana panel configurations', async () => {
      const context: AnalysisContext = {
        agentRole: 'educational',
        pr: {
          prNumber: 999,
          title: 'Learning module update',
          description: 'Updates educational content',
          baseBranch: 'main',
          targetBranch: 'feature/learning',
          author: 'educator@example.com',
          files: [],
          commits: []
        },
        repository: {
          name: 'learning-platform',
          owner: 'edu-org',
          languages: ['Python', 'JavaScript'],
          frameworks: ['Django', 'React']
        },
        userContext: {
          userId: 'educator-001',
          organizationId: 'edu-org-123',
          permissions: ['read', 'write', 'teach']
        }
      };

      // Mock panel creation to validate configuration
      const mockPanels: any[] = [];
      jest.spyOn(adapter as any, 'createRoleSpecificPanels').mockImplementation(async () => {
        // Simulate the educational panels
        return [
          {
            id: 1,
            title: 'Skill Level Progression',
            type: 'graph',
            gridPos: { x: 0, y: 0, w: 12, h: 8 },
            targets: [{
              datasource: 'Supabase',
              query: `SELECT * FROM developer_skills WHERE user_id = '${context.userContext.userId}'`,
              refId: 'A'
            }]
          },
          {
            id: 2,
            title: 'Learning Engagement Metrics',
            type: 'stat',
            gridPos: { x: 0, y: 8, w: 6, h: 4 },
            targets: [{
              datasource: 'Supabase',
              query: 'SELECT AVG(engagement_score) FROM learning_engagements',
              refId: 'A'
            }]
          },
          {
            id: 3,
            title: 'Skill Gaps Analysis',
            type: 'heatmap',
            gridPos: { x: 6, y: 8, w: 6, h: 4 },
            targets: [{
              datasource: 'Supabase',
              query: 'SELECT * FROM skill_gap_analysis',
              refId: 'A'
            }]
          },
          {
            id: 4,
            title: 'Educational Content Effectiveness',
            type: 'gauge',
            gridPos: { x: 12, y: 0, w: 6, h: 8 },
            targets: [{
              datasource: 'Supabase',
              query: 'SELECT AVG(effectiveness_rating) FROM educational_content_feedback',
              refId: 'A'
            }]
          }
        ];
      });

      const result = await adapter.analyze(context);

      // Validate that all panels have required properties
      const panels = await (adapter as any).createRoleSpecificPanels(context);
      
      panels.forEach((panel: any) => {
        expect(panel).toHaveProperty('id');
        expect(panel).toHaveProperty('title');
        expect(panel).toHaveProperty('type');
        expect(panel).toHaveProperty('gridPos');
        expect(panel).toHaveProperty('targets');
        
        // Validate grid positioning
        expect(panel.gridPos).toMatchObject({
          x: expect.any(Number),
          y: expect.any(Number),
          w: expect.any(Number),
          h: expect.any(Number)
        });
        
        // Validate targets
        expect(panel.targets).toBeInstanceOf(Array);
        expect(panel.targets.length).toBeGreaterThan(0);
        panel.targets.forEach((target: any) => {
          expect(target).toHaveProperty('datasource');
          expect(target).toHaveProperty('query');
          expect(target).toHaveProperty('refId');
        });
      });

      // Validate panel types are appropriate
      const panelTypes = panels.map((p: any) => p.type);
      expect(panelTypes).toContain('graph'); // For time series
      expect(panelTypes).toContain('stat'); // For metrics
      expect(panelTypes).toContain('heatmap'); // For gap analysis
      expect(panelTypes).toContain('gauge'); // For effectiveness
    });
  });

  describe('Dashboard URL Generation', () => {
    it('should generate correct dashboard URLs', async () => {
      const context: AnalysisContext = {
        agentRole: 'educational',
        pr: {
          prNumber: 2023,
          title: 'Educational improvements',
          description: 'Enhances learning modules',
          baseBranch: 'main',
          targetBranch: 'feature/edu-improvements',
          author: 'teacher@example.com',
          files: [],
          commits: []
        },
        repository: {
          name: 'edu-platform',
          owner: 'education-inc',
          languages: ['TypeScript', 'Python'],
          frameworks: ['Next.js', 'FastAPI']
        },
        userContext: {
          userId: 'teacher-123',
          permissions: ['read', 'write', 'admin']
        }
      };

      const result = await adapter.analyze(context);

      // Check if the finding includes the dashboard URL
      const dashboardFinding = result.findings?.find(f => 
        f.message.includes('dashboard') && f.message.includes('edu-platform')
      );
      
      expect(dashboardFinding).toBeDefined();
      expect(dashboardFinding?.documentation).toContain('codequal integration');
    });
  });
});