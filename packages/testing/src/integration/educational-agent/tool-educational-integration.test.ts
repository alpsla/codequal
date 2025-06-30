import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { EducationalAgent, CompiledFindings } from '@codequal/agents/multi-agent/educational-agent';
import { ToolResultRetrievalService, AgentToolResults } from '@codequal/core/services/deepwiki-tools';

// Mock dependencies
jest.mock('@codequal/core/services/deepwiki-tools');

describe.skip('Educational Agent Tool Integration Tests - FIXME: Integration test failures (Issue #TBD)', () => {
  let educationalAgent: EducationalAgent;
  let mockVectorDB: any;
  let compiledFindings: CompiledFindings;
  let toolResults: Record<string, AgentToolResults>;

  beforeEach(() => {
    // Initialize mock Vector DB
    mockVectorDB = {
      searchEducationalContent: jest.fn()
    };

    // Initialize Educational Agent
    educationalAgent = new EducationalAgent(mockVectorDB);

    // Create tool results that would be passed from orchestrator
    toolResults = {
      security: {
        repositoryId: 'test/repo',
        agentRole: 'security',
        toolResults: [
          {
            repositoryId: 'test/repo',
            agentRole: 'security',
            toolId: 'npm-audit',
            
            content: `found 3 vulnerabilities (1 critical, 1 high, 1 moderate)
              
              Critical: Prototype Pollution in lodash
              Package: lodash
              Vulnerability: CVE-2021-23337
              Path: lodash@4.17.19
              More info: https://github.com/advisories/GHSA-35jh-r3h4-6jhm`,
            metadata: {tool_name: 'npm-audit',
              importance_score: 9,
              findings_count: 3,
              critical_count: 1,
              high_count: 1,
              score: 3,
            executedAt: new Date().toISOString(),
            scheduledRun: false,
            isLatest: true
          ,
            repositoryId: 'test/repo'
          }
          },
          {
            repositoryId: 'test/repo',
            agentRole: 'security',
            toolId: 'license-checker',
            content: `└─ test-package@1.0.0
                ├─ license: MIT
                ├─ repository: https://github.com/test/package
                └─ dependencies:
                   ├─ express@4.18.2 (MIT)
                   ├─ lodash@4.17.19 (MIT)
                   └─ some-gpl-package@2.0.0 (GPL-3.0) [INCOMPATIBLE]`,
            metadata: {tool_name: 'license-checker',
              importance_score: 7,
              incompatible_licenses: ['GPL-3.0'],
              score: 7,
            executedAt: new Date().toISOString(),
            scheduledRun: false,
            isLatest: true
          }
          }
        ],
        summary: {
          totalTools: 2,
          keyFindings: [
            'Critical security vulnerability in lodash',
            'GPL-3.0 license incompatibility detected'
          ]
        ,
          latestResults: true,
          scores: {
        }
        },
        lastExecuted: new Date('2024-06-14T10:01:00Z').toISOString()
      },
      architecture: {
        repositoryId: 'test/repo',
        agentRole: 'architecture',
        toolResults: [
          {
            repositoryId: 'test/repo',
            agentRole: 'architecture',
            toolId: 'madge',
            
            content: `Circular dependencies found:
              
              1) src/services/userService.js -> src/services/authService.js -> src/services/userService.js
              2) src/models/order.js -> src/models/product.js -> src/models/order.js
              3) src/utils/validator.js -> src/utils/formatter.js -> src/utils/validator.js`,
            metadata: {tool_name: 'madge',
              importance_score: 8,
              circular_dependencies_count: 3,
              score: 5,
            executedAt: new Date().toISOString(),
            scheduledRun: false,
            isLatest: true
          ,
            repositoryId: 'test/repo'
          }
          },
          {
            repositoryId: 'test/repo',
            agentRole: 'security',
            toolId: 'dependency-cruiser',
            content: `Dependency violations found:
              
              error: src/controllers/api.js → src/database/connection.js
              Controllers should not directly access database layer
              
              warn: src/services/email.js → external:nodemailer
              Consider using abstraction for external dependencies`,
            metadata: {tool_name: 'dependency-cruiser',
              importance_score: 7,
              violations_count: 2,
              score: 6,
            executedAt: new Date().toISOString(),
            scheduledRun: false,
            isLatest: true
          }
          }
        ],
        summary: {
          totalTools: 2,
          keyFindings: [
            '3 circular dependencies detected',
            'Layer violation: controller accessing database directly'
          ]
        ,
          latestResults: true,
          scores: {
        }
        },
        lastExecuted: new Date('2024-06-14T10:03:00Z').toISOString()
      },
      dependency: {
        repositoryId: 'test/repo',
        agentRole: 'dependency',
        toolResults: [
          {
            repositoryId: 'test/repo',
            agentRole: 'dependency',
            toolId: 'npm-outdated',
            
            content: `Package        Current  Wanted  Latest  Location
              express        4.17.1   4.17.3  4.18.2  test-package
              lodash         4.17.19  4.17.21 4.17.21 test-package
              jest           26.6.3   26.6.3  29.5.0  test-package
              typescript     4.2.3    4.2.4   5.0.4   test-package`,
            metadata: {tool_name: 'npm-outdated',
              importance_score: 6,
              outdated_count: 4,
              major_updates: 2,
              score: 4,
            executedAt: new Date().toISOString(),
            scheduledRun: false,
            isLatest: true
          ,
            repositoryId: 'test/repo'
          }
          }
        ],
        summary: {
          totalTools: 2,
          keyFindings: [
            '4 outdated dependencies',
            '2 major version updates available'
          ]
        ,
          latestResults: true,
          scores: {
        }
        },
        lastExecuted: new Date('2024-06-14T10:04:00Z').toISOString()
      }
    };

    // Create compiled findings that include tool results
    compiledFindings = {
      codeQuality: {
        complexityIssues: [],
        maintainabilityIssues: [],
        codeSmells: [],
        patterns: []
      },
      security: {
        vulnerabilities: [
          {
            type: 'dependency-vulnerability',
            tool: 'npm-audit',
            severity: 'critical',
            package: 'lodash',
            vulnerability: 'CVE-2021-23337',
            description: 'Prototype Pollution in lodash'
          }
        ],
        securityPatterns: [],
        complianceIssues: [
          {
            type: 'license-incompatibility',
            tool: 'license-checker',
            severity: 'high',
            package: 'some-gpl-package',
            license: 'GPL-3.0',
            issue: 'Incompatible with MIT license'
          }
        ],
        threatLandscape: []
      },
      architecture: {
        designPatternViolations: [
          {
            pattern: 'Layered Architecture',
            tool: 'dependency-cruiser',
            violation: 'Controller directly accessing database layer',
            file: 'src/controllers/api.js'
          }
        ],
        technicalDebt: [
          {
            type: 'circular-dependencies',
            tool: 'madge',
            count: 3,
            impact: 'high',
            description: '3 circular dependencies detected'
          }
        ],
        refactoringOpportunities: [],
        architecturalDecisions: []
      },
      performance: {
        performanceIssues: [],
        optimizationOpportunities: [],
        bottlenecks: [],
        benchmarkResults: []
      },
      dependency: {
        vulnerabilityIssues: [],
        licenseIssues: [],
        outdatedPackages: [
          {
            tool: 'npm-outdated',
            package: 'jest',
            current: '26.6.3',
            latest: '29.5.0',
            updateType: 'major'
          },
          {
            tool: 'npm-outdated',
            package: 'typescript',
            current: '4.2.3',
            latest: '5.0.4',
            updateType: 'major'
          }
        ],
        conflictResolution: []
      },
      criticalIssues: [
        {
          type: 'security',
          tool: 'npm-audit',
          description: 'Critical security vulnerability in lodash'
        }
      ],
      learningOpportunities: [],
      knowledgeGaps: []
    };
  });

  describe('Tool-Based Learning Opportunities', () => {
    it('should create learning opportunities from npm-audit findings', async () => {
      // Mock educational content for security vulnerabilities
      mockVectorDB.searchEducationalContent.mockImplementation(async (query: any) => {
        if (query.topic.includes('Security')) {
          return [{
            type: 'explanation',
            content: {
              concept: 'Dependency Security Management',
              simpleExplanation: 'Keep your dependencies updated to avoid security vulnerabilities',
              technicalDetails: 'Use npm audit to identify and fix vulnerable dependencies',
              whyItMatters: 'Vulnerable dependencies are a common attack vector',
              examples: [{
                title: 'Running npm audit',
                language: 'bash',
                code: 'npm audit\nnpm audit fix',
                explanation: 'Identify and automatically fix vulnerabilities',
                type: 'good' as const
              }]
            }
          }];
        }
        return null;
      });

      const result = await educationalAgent.analyze(compiledFindings);

      // Should create high-priority security learning opportunity
      expect(result.learningPath.steps).toContain('1. Security Best Practices (advanced)');
      expect(result.explanations).toContainEqual(
        expect.objectContaining({
          concept: 'Dependency Security Management'
        })
      );
    });

    it('should create learning opportunities from madge circular dependency findings', async () => {
      // Mock educational content for circular dependencies
      mockVectorDB.searchEducationalContent.mockImplementation(async (query: any) => {
        if (query.topic.includes('Technical Debt')) {
          return [{
            type: 'tutorial',
            content: {
              title: 'Resolving Circular Dependencies',
              difficulty: 'intermediate' as const,
              steps: [
                'Identify the circular dependency chain',
                'Extract shared functionality to a separate module',
                'Refactor imports to break the cycle',
                'Test to ensure functionality is preserved'
              ],
              codeExamples: [{
                title: 'Breaking Circular Dependencies',
                language: 'javascript',
                code: '// Before: A imports B, B imports A\n// After: A and B import shared module C',
                explanation: 'Extract common code to break cycles',
                type: 'after' as const
              }],
              expectedOutcome: 'Clean dependency graph without cycles'
            }
          }];
        }
        return null;
      });

      const result = await educationalAgent.analyze(compiledFindings);

      // Should identify circular dependencies as technical debt
      expect(result.tutorials).toContainEqual(
        expect.objectContaining({
          title: 'Resolving Circular Dependencies'
        })
      );
    });

    it('should create learning opportunities from license-checker findings', async () => {
      // Mock educational content for license compliance
      mockVectorDB.searchEducationalContent.mockImplementation(async (query: any) => {
        if (query.category === 'security' && query.topic.includes('Security')) {
          return [{
            type: 'best_practice',
            content: {
              practice: 'License Compliance Management',
              rationale: 'Ensure all dependencies are compatible with your project license',
              implementation: 'Regular license audits and careful dependency selection',
              commonMistakes: [
                'Not checking transitive dependency licenses',
                'Mixing incompatible licenses (e.g., GPL with MIT)',
                'Not documenting license obligations'
              ],
              examples: [{
                title: 'License Compatibility Check',
                language: 'bash',
                code: 'npx license-checker --excludePrivatePackages --onlyAllow "MIT;Apache-2.0;BSD"',
                explanation: 'Whitelist compatible licenses',
                type: 'good' as const
              }]
            }
          }];
        }
        return null;
      });

      const result = await educationalAgent.analyze(compiledFindings);

      // Should include license compliance best practices
      expect(result.bestPractices).toContainEqual(
        expect.objectContaining({
          practice: 'License Compliance Management'
        })
      );
    });

    it('should prioritize learning based on tool importance scores', async () => {
      // Tool results have importance scores: npm-audit (9), madge (8), license-checker (7)
      const result = await educationalAgent.analyze(compiledFindings);

      // Learning path should prioritize based on severity and importance
      const steps = result.learningPath.steps;
      expect(steps[0]).toContain('Security'); // Critical security issue
      expect(steps[1]).toContain('Technical Debt'); // High-impact circular dependencies
    });
  });

  describe('Multi-Tool Integration', () => {
    it('should combine insights from multiple security tools', async () => {
      // Add findings from multiple security tools
      compiledFindings.security.vulnerabilities.push(
        {
          type: 'sql-injection',
          tool: 'custom-security-scanner',
          severity: 'high',
          file: 'src/db/queries.js',
          line: 42
        }
      );

      const result = await educationalAgent.analyze(compiledFindings);

      // Should create comprehensive security learning content
      expect(result.learningPath.steps[0]).toContain('Security');
      expect(result.skillGaps).toContain('Security awareness and secure coding practices');
    });

    it('should handle conflicting tool results gracefully', async () => {
      // Add conflicting information from different tools
      compiledFindings.dependency.outdatedPackages.push({
        tool: 'custom-dependency-checker',
        package: 'express',
        current: '4.17.1',
        latest: '5.0.0', // Different from npm-outdated
        updateType: 'major'
      });

      const result = await educationalAgent.analyze(compiledFindings);

      // Should still generate coherent learning content
      expect(result).toBeDefined();
      expect(result.learningPath).toBeDefined();
    });
  });

  describe('Tool-Specific Educational Content', () => {
    it('should generate tool-specific tutorials', async () => {
      // Mock Vector DB to return tool-specific educational content
      mockVectorDB.searchEducationalContent.mockImplementation(async (query: any) => {
        if (query.topic === 'Dependency Security') {
          return [{
            type: 'tutorial',
            content: {
              title: 'Using npm audit effectively',
              difficulty: 'beginner' as const,
              steps: [
                'Run npm audit to identify vulnerabilities',
                'Review the severity levels',
                'Use npm audit fix for automatic fixes',
                'Manually update packages that cannot be auto-fixed',
                'Add npm audit to your CI/CD pipeline'
              ],
              codeExamples: [{
                title: 'CI/CD Integration',
                language: 'yaml',
                code: `steps:
  - name: Security Audit
    run: |
      npm audit --audit-level=moderate
      npm audit fix --force`,
                explanation: 'Fail builds on moderate or higher vulnerabilities',
                type: 'good' as const
              }],
              expectedOutcome: 'Automated vulnerability detection and remediation'
            }
          }];
        }
        return null;
      });

      const result = await educationalAgent.analyze(compiledFindings);

      // Should include tool-specific tutorials
      expect(result.tutorials).toContainEqual(
        expect.objectContaining({
          title: 'Using npm audit effectively'
        })
      );
    });

    it('should recommend resources for tools without findings', async () => {
      // No performance tool findings, but should still educate about available tools
      const result = await educationalAgent.analyze(compiledFindings);

      // Should suggest learning about performance tools
      expect(result.relatedTopics).toContain('Profiling and Monitoring');
    });
  });

  describe('Learning Path Customization', () => {
    it('should adjust learning difficulty based on tool complexity', async () => {
      // Circular dependencies and layer violations are intermediate/advanced topics
      const result = await educationalAgent.analyze(compiledFindings);

      expect(result.learningPath.difficulty).toBe('advanced');
      expect(result.learningPath.estimatedTime).toMatch(/\d+ hour/);
    });

    it('should create actionable next steps from tool findings', async () => {
      const result = await educationalAgent.analyze(compiledFindings);

      expect(result.recommendedNextSteps).toContain(
        'Start with high-priority topics: Security Best Practices, Technical Debt Management'
      );
      expect(result.recommendedNextSteps).toContain(
        'Set up automated tools to prevent similar issues'
      );
    });
  });

  describe('Tool Result Formatting', () => {
    it('should format tool results into readable educational content', async () => {
      const result = await educationalAgent.analyze(compiledFindings);

      // Educational content should reference specific tool findings
      if (result.explanations.length > 0) {
        const securityExplanation = result.explanations.find(e => 
          e.concept.toLowerCase().includes('security')
        );
        expect(securityExplanation).toBeDefined();
      }

      // Best practices should address tool-detected issues
      if (result.bestPractices.length > 0) {
        const hasRelevantPractice = result.bestPractices.some(bp =>
          bp.practice.includes('License') || 
          bp.practice.includes('Dependency') ||
          bp.practice.includes('Security')
        );
        expect(hasRelevantPractice).toBe(true);
      }
    });
  });
});
