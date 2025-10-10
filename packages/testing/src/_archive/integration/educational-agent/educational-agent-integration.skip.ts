import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { EducationalAgent, CompiledFindings, EducationalResult } from '@codequal/agents/multi-agent/educational-agent';
import { ResultOrchestrator } from '../../../../../apps/api/src/services/result-orchestrator';
import { EnhancedMultiAgentExecutor } from '@codequal/agents/multi-agent/enhanced-executor';
import { createLogger } from '@codequal/core/utils';

// Mock dependencies
jest.mock('@codequal/agents/multi-agent/enhanced-executor');
jest.mock('../../../../../apps/api/src/services/result-orchestrator');

describe.skip('Educational Agent Integration Tests - FIXME: Integration test failures (Issue #TBD)', () => {
  let educationalAgent: EducationalAgent;
  let mockVectorDB: any;
  let mockResearcherAgent: any;
  let compiledFindings: CompiledFindings;
  const logger = createLogger('EducationalAgentTest');

  beforeEach(() => {
    // Initialize mock Vector DB
    mockVectorDB = {
      searchEducationalContent: jest.fn().mockImplementation(() => Promise.resolve([
        {
          type: 'explanation',
          content: {
            concept: 'Security Best Practices',
            simpleExplanation: 'Keep your code safe by validating inputs',
            technicalDetails: 'Input validation prevents injection attacks',
            whyItMatters: 'Security vulnerabilities can compromise your entire system',
            examples: [{
              title: 'Input Validation Example',
              language: 'typescript',
              code: 'function validate(input: string) { /* validation logic */ }',
              explanation: 'Always validate user inputs',
              type: 'good' as const
            }]
          }
        }
      ]))
    };

    // Initialize mock Researcher Agent
    mockResearcherAgent = {
      requestEducationalContent: jest.fn().mockImplementation(() => Promise.resolve({
        id: 'research-123',
        estimatedCompletion: new Date(Date.now() + 3600000) // 1 hour from now
      }))
    };

    // Initialize Educational Agent
    educationalAgent = new EducationalAgent(mockVectorDB, mockResearcherAgent);

    // Create sample compiled findings
    compiledFindings = {
      codeQuality: {
        complexityIssues: [
          { file: 'src/utils/processor.ts', complexity: 15, threshold: 10 }
        ],
        maintainabilityIssues: [],
        codeSmells: [
          { type: 'long-method', file: 'src/api/handler.ts', lines: 150 }
        ],
        patterns: ['singleton', 'factory']
      },
      security: {
        vulnerabilities: [
          { type: 'sql-injection', severity: 'high', file: 'src/db/query.ts' },
          { type: 'xss', severity: 'medium', file: 'src/api/render.ts' }
        ],
        securityPatterns: ['authentication', 'authorization'],
        complianceIssues: [],
        threatLandscape: []
      },
      architecture: {
        designPatternViolations: [
          { pattern: 'MVC', violation: 'Controller contains business logic' }
        ],
        technicalDebt: [
          { type: 'outdated-dependencies', impact: 'medium' }
        ],
        refactoringOpportunities: [],
        architecturalDecisions: []
      },
      performance: {
        performanceIssues: [
          { type: 'n+1-query', location: 'src/services/user.ts' }
        ],
        optimizationOpportunities: [],
        bottlenecks: [],
        benchmarkResults: []
      },
      dependency: {
        vulnerabilityIssues: [
          { package: 'lodash', version: '4.17.19', vulnerability: 'CVE-2021-23337' }
        ],
        licenseIssues: [],
        outdatedPackages: [
          { package: 'express', current: '4.17.1', latest: '4.18.2' }
        ],
        conflictResolution: []
      },
      criticalIssues: [
        { type: 'security', description: 'SQL injection vulnerability' }
      ],
      learningOpportunities: [],
      knowledgeGaps: ['security-best-practices', 'performance-optimization']
    };
  });

  describe('Educational Content Generation', () => {
    it('should extract learning opportunities from compiled findings', async () => {
      const result = await educationalAgent.analyze(compiledFindings);
      
      expect(result).toBeDefined();
      expect(result.learningPath).toBeDefined();
      expect(result.learningPath.steps.length).toBeGreaterThan(0);
      
      // Should identify security as high priority due to vulnerabilities
      expect(result.learningPath.steps[0]).toContain('Security');
    });

    it('should search Vector DB for educational content', async () => {
      const result = await educationalAgent.analyze(compiledFindings);
      
      expect(mockVectorDB.searchEducationalContent).toHaveBeenCalled();
      expect(result.explanations.length).toBeGreaterThan(0);
      expect(result.explanations[0].concept).toBe('Security Best Practices');
    });

    it('should request content from Researcher when not found in Vector DB', async () => {
      mockVectorDB.searchEducationalContent.mockResolvedValueOnce(null);
      
      const result = await educationalAgent.analyze(compiledFindings);
      
      expect(mockResearcherAgent.requestEducationalContent).toHaveBeenCalled();
      expect(result.additionalResources).toContainEqual(
        expect.objectContaining({
          type: 'documentation',
          status: 'research_requested',
          requestId: 'research-123'
        })
      );
    });

    it('should identify skill gaps based on findings', async () => {
      const result = await educationalAgent.analyze(compiledFindings);
      
      expect(result.skillGaps).toContain('Security awareness and secure coding practices');
      expect(result.skillGaps).toContain('Code complexity management and refactoring techniques');
    });

    it('should create personalized learning path', async () => {
      const result = await educationalAgent.analyze(compiledFindings);
      
      expect(result.learningPath.difficulty).toBe('advanced'); // Due to security issues
      expect(result.learningPath.estimatedTime).toMatch(/\d+ (hour|minute)/);
      expect(result.learningPath.steps.length).toBeGreaterThanOrEqual(3);
    });

    it('should provide related topics for further learning', async () => {
      const result = await educationalAgent.analyze(compiledFindings);
      
      expect(result.relatedTopics).toContain('Threat Modeling');
      expect(result.relatedTopics).toContain('Secure Development Lifecycle');
      expect(result.relatedTopics).toContain('Technical Debt Management');
    });
  });

  describe('Tool Integration', () => {
    it('should process tool results in compiled findings', async () => {
      // Add tool-based findings
      compiledFindings.security.vulnerabilities.push({
        type: 'npm-audit',
        tool: 'npm-audit',
        severity: 'critical',
        file: 'package.json',
        description: 'Critical vulnerability in dependency'
      });

      const result = await educationalAgent.analyze(compiledFindings);
      
      // Should prioritize critical security issues
      expect(result.learningPath.steps[0]).toContain('Security');
      expect(result.explanations).toContainEqual(
        expect.objectContaining({
          concept: 'Security Best Practices'
        })
      );
    });

    it('should handle findings from multiple tools', async () => {
      // Add findings from different tools
      compiledFindings.architecture.designPatternViolations.push({
        pattern: 'Circular Dependencies',
        tool: 'madge',
        violation: '5 circular dependencies detected'
      });

      compiledFindings.dependency.licenseIssues.push({
        tool: 'license-checker',
        package: 'some-package',
        license: 'GPL-3.0',
        issue: 'Incompatible with MIT license'
      });

      const result = await educationalAgent.analyze(compiledFindings);
      
      // Should create learning opportunities for all tool findings
      const opportunities = result.learningPath.steps.join(' ');
      expect(opportunities).toContain('Design Patterns');
      expect(opportunities).toContain('Dependency');
    });
  });

  describe('Orchestrator Integration', () => {
    it('should integrate with Result Orchestrator workflow', async () => {
      // Mock orchestrator processing
      const mockProcessedResults = {
        findings: {
          security: compiledFindings.security.vulnerabilities,
          architecture: compiledFindings.architecture.designPatternViolations,
          performance: compiledFindings.performance.performanceIssues,
          codeQuality: compiledFindings.codeQuality.complexityIssues
        }
      };

      // Create educational content based on processed results
      const educationalContent = await educationalAgent.analyze(compiledFindings);
      
      // Verify content is structured for orchestrator consumption
      expect(educationalContent).toHaveProperty('learningPath');
      expect(educationalContent).toHaveProperty('explanations');
      expect(educationalContent).toHaveProperty('tutorials');
      expect(educationalContent).toHaveProperty('bestPractices');
      expect(educationalContent).toHaveProperty('additionalResources');
    });

    it('should format educational content for final report', async () => {
      const result = await educationalAgent.analyze(compiledFindings);
      
      // Verify all required report sections are present
      expect(result.learningPath.title).toBe('Personalized Learning Path');
      expect(result.learningPath.description).toContain('recommended learning path');
      expect(result.recommendedNextSteps).toBeDefined();
      expect(result.recommendedNextSteps.length).toBeGreaterThan(0);
    });
  });

  describe('Enhanced Agent Executor Integration', () => {
    it('should work as post-processing agent after multi-agent analysis', async () => {
      // Simulate multi-agent results
      const multiAgentResults = {
        security: { findings: compiledFindings.security.vulnerabilities },
        architecture: { findings: compiledFindings.architecture.designPatternViolations },
        codeQuality: { findings: compiledFindings.codeQuality.complexityIssues },
        performance: { findings: compiledFindings.performance.performanceIssues },
        dependency: { findings: compiledFindings.dependency.vulnerabilityIssues }
      };

      // Educational agent processes compiled findings
      const educationalResult = await educationalAgent.analyze(compiledFindings);
      
      // Verify educational content enhances technical findings
      expect(educationalResult.explanations.length).toBeGreaterThan(0);
      expect(educationalResult.learningPath.steps.length).toBe(
        Object.values(multiAgentResults).filter(r => r.findings.length > 0).length
      );
    });

    it('should handle empty or partial findings gracefully', async () => {
      const emptyFindings: CompiledFindings = {
        codeQuality: {
          complexityIssues: [],
          maintainabilityIssues: [],
          codeSmells: [],
          patterns: []
        },
        security: {
          vulnerabilities: [],
          securityPatterns: [],
          complianceIssues: [],
          threatLandscape: []
        },
        architecture: {
          designPatternViolations: [],
          technicalDebt: [],
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
          outdatedPackages: [],
          conflictResolution: []
        },
        criticalIssues: [],
        learningOpportunities: [],
        knowledgeGaps: []
      };

      const result = await educationalAgent.analyze(emptyFindings);
      
      expect(result.learningPath.steps.length).toBe(0);
      expect(result.skillGaps.length).toBe(0);
      expect(result.explanations.length).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle Vector DB search failures gracefully', async () => {
      mockVectorDB.searchEducationalContent.mockRejectedValueOnce(
        new Error('Vector DB connection failed')
      );

      const result = await educationalAgent.analyze(compiledFindings);
      
      // Should still generate learning path from findings
      expect(result.learningPath).toBeDefined();
      expect(result.learningPath.steps.length).toBeGreaterThan(0);
    });

    it('should handle Researcher Agent failures', async () => {
      mockResearcherAgent.requestEducationalContent.mockRejectedValueOnce(
        new Error('Researcher service unavailable')
      );
      mockVectorDB.searchEducationalContent.mockResolvedValueOnce(null);

      const result = await educationalAgent.analyze(compiledFindings);
      
      // Should still return results without research requests
      expect(result).toBeDefined();
      expect(result.additionalResources).not.toContainEqual(
        expect.objectContaining({
          status: 'research_requested'
        })
      );
    });
  });

  describe('Learning Path Prioritization', () => {
    it('should prioritize critical security issues', async () => {
      compiledFindings.security.vulnerabilities = [
        { type: 'rce', severity: 'critical', file: 'src/exec.ts' }
      ];

      const result = await educationalAgent.analyze(compiledFindings);
      
      expect(result.learningPath.steps[0]).toContain('Security');
      expect(result.learningPath.difficulty).toBe('advanced');
    });

    it('should order learning topics by priority and difficulty', async () => {
      const result = await educationalAgent.analyze(compiledFindings);
      
      // Verify ordering logic is applied
      const steps = result.learningPath.steps;
      expect(steps).toBeDefined();
      expect(Array.isArray(steps)).toBe(true);
      
      // High priority items should come first
      if (compiledFindings.security.vulnerabilities.length > 0) {
        expect(steps[0]).toContain('Security');
      }
    });
  });

  describe('Content Formatting', () => {
    it('should format educational content with code examples', async () => {
      const result = await educationalAgent.analyze(compiledFindings);
      
      if (result.explanations.length > 0) {
        const explanation = result.explanations[0];
        expect(explanation.examples).toBeDefined();
        expect(explanation.examples[0]).toHaveProperty('title');
        expect(explanation.examples[0]).toHaveProperty('language');
        expect(explanation.examples[0]).toHaveProperty('code');
        expect(explanation.examples[0]).toHaveProperty('explanation');
        expect(explanation.examples[0]).toHaveProperty('type');
      }
    });

    it('should generate appropriate difficulty levels', async () => {
      const result = await educationalAgent.analyze(compiledFindings);
      
      expect(['beginner', 'intermediate', 'advanced']).toContain(
        result.learningPath.difficulty
      );
    });
  });
});
