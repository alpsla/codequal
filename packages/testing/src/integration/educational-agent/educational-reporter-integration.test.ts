// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { describe, it, expect, beforeEach, jest } = globalThis;
import { EducationalAgent, EducationalResult, CompiledFindings } from '@codequal/agents/multi-agent/educational-agent';
import { ReporterAgent, ReportFormat, EducationalSearchPrompt } from '@codequal/agents/multi-agent/reporter-agent';
import { createLogger } from '@codequal/core/utils';

// Mock dependencies

describe('Educational-Reporter Agent Integration Tests', () => {
  let educationalAgent: EducationalAgent;
  let reporterAgent: ReporterAgent;
  let mockVectorDB: any;
  let compiledFindings: CompiledFindings;
  let educationalResult: EducationalResult;

  beforeEach(() => {
    // Initialize mock Vector DB
    mockVectorDB = {
      searchEducationalContent: jest.fn(),
      search: jest.fn().mockImplementation(() => Promise.resolve([
        {
          title: 'Security Best Practices Guide',
          url: 'https://example.com/security-guide',
          score: 0.9
        },
        {
          title: 'Dependency Management Tutorial',
          url: 'https://example.com/dependency-tutorial',
          score: 0.85
        }
      ]))
    };

    // Initialize agents
    educationalAgent = new EducationalAgent(mockVectorDB);
    reporterAgent = new ReporterAgent(mockVectorDB);

    // Create sample compiled findings
    compiledFindings = {
      codeQuality: {
        complexityIssues: [
          { file: 'src/complex.ts', complexity: 20, threshold: 10 }
        ],
        maintainabilityIssues: [],
        codeSmells: [],
        patterns: []
      },
      security: {
        vulnerabilities: [
          { 
            type: 'dependency-vulnerability', 
            tool: 'npm-audit',
            severity: 'high',
            package: 'lodash',
            vulnerability: 'CVE-2021-23337'
          }
        ],
        securityPatterns: [],
        complianceIssues: [],
        threatLandscape: []
      },
      architecture: {
        designPatternViolations: [],
        technicalDebt: [
          { 
            type: 'circular-dependencies',
            tool: 'madge',
            count: 3,
            impact: 'high'
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
        licenseIssues: [
          {
            tool: 'license-checker',
            package: 'some-gpl-package',
            license: 'GPL-3.0',
            issue: 'Incompatible with MIT'
          }
        ],
        outdatedPackages: [],
        conflictResolution: []
      },
      criticalIssues: [],
      learningOpportunities: [],
      knowledgeGaps: []
    };

    // Pre-generate educational result
    educationalResult = {
      learningPath: {
        title: "Personalized Learning Path",
        description: "Based on the analysis findings, here's a recommended learning path.",
        estimatedTime: "3 hours",
        difficulty: "intermediate",
        steps: [
          "1. Dependency Security Management (advanced)",
          "2. Resolving Circular Dependencies (intermediate)",
          "3. License Compliance Management (intermediate)",
          "4. Code Complexity Management (intermediate)"
        ]
      },
      explanations: [{
        concept: "Dependency Security",
        simpleExplanation: "Keep dependencies updated to avoid vulnerabilities",
        technicalDetails: "Use npm audit to identify and fix vulnerable dependencies",
        whyItMatters: "Vulnerable dependencies are a common attack vector",
        examples: []
      }],
      tutorials: [{
        title: "Resolving Circular Dependencies with Madge",
        difficulty: "intermediate",
        steps: ["Install madge", "Run analysis", "Refactor code"],
        codeExamples: [],
        expectedOutcome: "Clean dependency graph"
      }],
      bestPractices: [{
        practice: "Regular Dependency Audits",
        rationale: "Catch vulnerabilities early",
        implementation: "Add npm audit to CI/CD",
        commonMistakes: ["Ignoring warnings"],
        examples: []
      }],
      additionalResources: [{
        type: "documentation",
        title: "OWASP Dependency Check",
        url: "https://owasp.org/dependency-check",
        description: "Comprehensive dependency checking guide",
        difficulty: "intermediate"
      }],
      skillGaps: [
        "Dependency security management and npm audit usage",
        "Understanding and resolving circular dependencies",
        "License compliance and legal aspects of dependencies"
      ],
      recommendedNextSteps: [
        "Start with high-priority topics: Dependency Security Management",
        "Add npm audit to your CI/CD pipeline",
        "Set up madge and dependency-cruiser for regular architecture checks"
      ],
      relatedTopics: [
        "Supply Chain Security",
        "DevSecOps Practices",
        "Software Architecture Patterns",
        "OWASP Top 10"
      ]
    };
  });

  describe('Search Prompt Generation', () => {
    it('should generate specific search prompts from educational content', () => {
      const searchPrompts = reporterAgent.generateEducationalSearchPrompts(educationalResult);
      
      expect(searchPrompts).toBeDefined();
      expect(searchPrompts.length).toBeGreaterThan(0);
      
      // Check learning path prompts
      const learningPathPrompts = searchPrompts.filter(p => p.context.includes('Learning path'));
      expect(learningPathPrompts).toHaveLength(4); // 4 learning path steps
      
      // Verify prompt structure
      const firstPrompt = learningPathPrompts[0];
      expect(firstPrompt).toMatchObject({
        topic: 'Dependency Security Management',
        searchQuery: expect.stringContaining('security vulnerabilities'),
        context: 'Learning path step 1',
        targetAudience: 'advanced',
        contentType: expect.any(String),
        maxResults: 5
      });
    });

    it('should generate search queries based on skill level', () => {
      const searchPrompts = reporterAgent.generateEducationalSearchPrompts(educationalResult);
      
      // Find prompts for different levels
      const advancedPrompt = searchPrompts.find(p => p.targetAudience === 'advanced');
      const intermediatePrompt = searchPrompts.find(p => p.targetAudience === 'intermediate');
      
      expect(advancedPrompt?.searchQuery).toContain('advanced');
      expect(intermediatePrompt?.searchQuery).toContain('guide');
    });

    it('should generate prompts for skill gaps', () => {
      const searchPrompts = reporterAgent.generateEducationalSearchPrompts(educationalResult);
      
      const skillGapPrompts = searchPrompts.filter(p => p.context === 'Identified skill gap');
      expect(skillGapPrompts).toHaveLength(3); // 3 skill gaps
      
      skillGapPrompts.forEach(prompt => {
        expect(prompt.contentType).toBe('tutorial');
        expect(prompt.targetAudience).toBe('intermediate');
        expect(prompt.maxResults).toBe(3);
      });
    });

    it('should generate prompts for related topics', () => {
      const searchPrompts = reporterAgent.generateEducationalSearchPrompts(educationalResult);
      
      const relatedTopicPrompts = searchPrompts.filter(p => p.context === 'Related learning topic');
      expect(relatedTopicPrompts.length).toBeGreaterThan(0);
      expect(relatedTopicPrompts.length).toBeLessThanOrEqual(5); // Max 5 related topics
      
      relatedTopicPrompts.forEach(prompt => {
        expect(prompt.contentType).toBe('reference');
        expect(prompt.targetAudience).toBe('beginner');
      });
    });
  });

  describe('Search Query Optimization', () => {
    it('should optimize search queries for specific topics', () => {
      const searchPrompts = reporterAgent.generateEducationalSearchPrompts(educationalResult);
      
      // Check for optimized keywords
      const securityPrompt = searchPrompts.find(p => p.topic.includes('Security'));
      expect(securityPrompt?.searchQuery).toContain('npm audit');
      expect(securityPrompt?.searchQuery).toContain('vulnerabilities');
      
      const circularDepsPrompt = searchPrompts.find(p => p.topic.includes('Circular Dependencies'));
      expect(circularDepsPrompt?.searchQuery).toContain('madge');
      expect(circularDepsPrompt?.searchQuery).toContain('circular dependency');
    });

    it('should determine correct content type based on topic', () => {
      const customEducationalResult = {
        ...educationalResult,
        learningPath: {
          ...educationalResult.learningPath,
          steps: [
            "1. How to Use npm audit (beginner)",
            "2. Best Practices for Security (intermediate)",
            "3. Introduction to DevSecOps (beginner)",
            "4. Resolving Dependencies (intermediate)"
          ]
        }
      };
      
      const searchPrompts = reporterAgent.generateEducationalSearchPrompts(customEducationalResult);
      
      const howToPrompt = searchPrompts.find(p => p.topic.includes('How to'));
      expect(howToPrompt?.contentType).toBe('tutorial');
      
      const bestPracticesPrompt = searchPrompts.find(p => p.topic.includes('Best Practices'));
      expect(bestPracticesPrompt?.contentType).toBe('best-practice');
      
      const introPrompt = searchPrompts.find(p => p.topic.includes('Introduction'));
      expect(introPrompt?.contentType).toBe('explanation');
    });
  });

  describe('Report Generation with Educational Content', () => {
    it('should generate comprehensive report with search prompts', async () => {
      const analysisResults = {
        findings: {
          security: compiledFindings.security.vulnerabilities,
          architecture: compiledFindings.architecture.technicalDebt
        },
        recommendations: ['Fix security vulnerabilities', 'Resolve circular dependencies']
      };
      
      const format: ReportFormat = {
        type: 'full-report',
        includeEducational: true,
        educationalDepth: 'comprehensive'
      };
      
      const report = await reporterAgent.generateReport(
        analysisResults,
        educationalResult,
        format
      );
      
      expect(report).toBeDefined();
      expect(report.educationalSections).toHaveLength(4); // Learning path, skill gaps, best practices, additional resources
      
      // Check that search prompts are included in comprehensive report
      const learningPathSection = report.educationalSections.find(s => s.title === 'Recommended Learning Path');
      expect(learningPathSection?.searchPrompts).toBeDefined();
      expect(learningPathSection?.searchPrompts.length).toBeGreaterThan(0);
    });

    it('should format report differently for PR comments', async () => {
      const analysisResults = { findings: {} };
      
      const prCommentFormat: ReportFormat = {
        type: 'pr-comment',
        includeEducational: true,
        educationalDepth: 'summary'
      };
      
      const report = await reporterAgent.generateReport(
        analysisResults,
        educationalResult,
        prCommentFormat
      );
      
      // PR comments should have simplified content
      expect(report.executiveSummary.length).toBeLessThan(250);
      
      report.educationalSections.forEach(section => {
        expect(section.keyResources.length).toBeLessThanOrEqual(2);
        expect(section.searchPrompts).toHaveLength(0); // No search prompts in PR comments
      });
    });

    it('should include visualizations for dashboard format', async () => {
      const analysisResults = { findings: {} };
      
      const dashboardFormat: ReportFormat = {
        type: 'dashboard',
        includeEducational: true,
        educationalDepth: 'detailed'
      };
      
      const report = await reporterAgent.generateReport(
        analysisResults,
        educationalResult,
        dashboardFormat
      );
      
      expect(report.visualizations).toBeDefined();
      expect(report.visualizations?.length).toBeGreaterThan(0);
      
      // Should have learning path timeline
      const timelineViz = report.visualizations?.find(v => v.type === 'learning-path-timeline');
      expect(timelineViz).toBeDefined();
      expect(timelineViz?.data).toEqual(educationalResult.learningPath.steps);
    });
  });

  describe('Vector DB Integration', () => {
    it('should search Vector DB for educational resources', async () => {
      const analysisResults = { findings: {} };
      
      const format: ReportFormat = {
        type: 'full-report',
        includeEducational: true,
        educationalDepth: 'detailed'
      };
      
      await reporterAgent.generateReport(analysisResults, educationalResult, format);
      
      // Verify Vector DB was searched
      expect(mockVectorDB.search).toHaveBeenCalled();
      expect(mockVectorDB.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.any(String),
          filters: expect.objectContaining({
            contentType: 'educational'
          })
        })
      );
    });

    it('should handle Vector DB search failures gracefully', async () => {
      mockVectorDB.search.mockRejectedValueOnce(new Error('Vector DB unavailable'));
      
      const analysisResults = { findings: {} };
      const format: ReportFormat = {
        type: 'full-report',
        includeEducational: true,
        educationalDepth: 'detailed'
      };
      
      const report = await reporterAgent.generateReport(
        analysisResults,
        educationalResult,
        format
      );
      
      // Should still generate report with mock resources
      expect(report).toBeDefined();
      expect(report.educationalSections.length).toBeGreaterThan(0);
      
      const section = report.educationalSections[0];
      expect(section.keyResources.length).toBeGreaterThan(0);
      expect(section.keyResources[0].url).toContain('docs.example.com');
    });
  });

  describe('Educational Content Depth', () => {
    it('should provide summary-level content', async () => {
      const analysisResults = { findings: {} };
      
      const summaryFormat: ReportFormat = {
        type: 'email',
        includeEducational: true,
        educationalDepth: 'summary'
      };
      
      const report = await reporterAgent.generateReport(
        analysisResults,
        educationalResult,
        summaryFormat
      );
      
      // Summary should not include learning path details
      const learningSection = report.educationalSections.find(s => s.title === 'Recommended Learning Path');
      expect(learningSection?.learningPath).toBeUndefined();
      expect(learningSection?.summary).toMatch(/learning path with \d+ topics/);
    });

    it('should provide detailed content with explanations', async () => {
      const analysisResults = { findings: {} };
      
      const detailedFormat: ReportFormat = {
        type: 'full-report',
        includeEducational: true,
        educationalDepth: 'detailed'
      };
      
      const report = await reporterAgent.generateReport(
        analysisResults,
        educationalResult,
        detailedFormat
      );
      
      // Detailed should include learning paths but not all search prompts
      const learningSection = report.educationalSections.find(s => s.title === 'Recommended Learning Path');
      expect(learningSection?.learningPath).toBeDefined();
      expect(learningSection?.searchPrompts).toHaveLength(0);
    });

    it('should provide comprehensive content with all details', async () => {
      const analysisResults = { findings: {} };
      
      const comprehensiveFormat: ReportFormat = {
        type: 'full-report',
        includeEducational: true,
        educationalDepth: 'comprehensive'
      };
      
      const report = await reporterAgent.generateReport(
        analysisResults,
        educationalResult,
        comprehensiveFormat
      );
      
      // Comprehensive should include everything
      expect(report.educationalSections).toHaveLength(4);
      
      const additionalResourcesSection = report.educationalSections.find(
        s => s.title === 'Additional Learning Resources'
      );
      expect(additionalResourcesSection).toBeDefined();
      
      // Should have search prompts for comprehensive depth
      const sectionsWithPrompts = report.educationalSections.filter(s => s.searchPrompts.length > 0);
      expect(sectionsWithPrompts.length).toBeGreaterThan(0);
    });
  });

  describe('Combined Recommendations', () => {
    it('should merge technical and educational recommendations', async () => {
      const analysisResults = {
        findings: {},
        recommendations: [
          'Update vulnerable dependencies',
          'Refactor circular dependencies'
        ]
      };
      
      const format: ReportFormat = {
        type: 'full-report',
        includeEducational: true,
        educationalDepth: 'detailed'
      };
      
      const report = await reporterAgent.generateReport(
        analysisResults,
        educationalResult,
        format
      );
      
      // Should include both technical and educational recommendations
      expect(report.recommendations).toContain('Update vulnerable dependencies');
      expect(report.recommendations).toContain('Complete the 4-step learning path to address identified issues');
      expect(report.recommendations).toContain('Invest in team training to close identified skill gaps');
    });
  });

  describe('Format-Specific Adaptations', () => {
    it('should format for Slack with concise content', async () => {
      const analysisResults = { findings: {} };
      
      const slackFormat: ReportFormat = {
        type: 'slack',
        includeEducational: true,
        educationalDepth: 'summary'
      };
      
      const report = await reporterAgent.generateReport(
        analysisResults,
        educationalResult,
        slackFormat
      );
      
      // Slack format should be concise
      expect(report.executiveSummary).toMatch(/^🎯/);
      expect(report.executiveSummary.length).toBeLessThan(120);
      
      report.educationalSections.forEach(section => {
        expect(section.summary.length).toBeLessThanOrEqual(150);
        expect(section.keyResources.length).toBeLessThanOrEqual(1);
      });
    });

    it('should format for email with readable content', async () => {
      const analysisResults = { findings: {} };
      
      const emailFormat: ReportFormat = {
        type: 'email',
        includeEducational: true,
        educationalDepth: 'detailed'
      };
      
      const report = await reporterAgent.generateReport(
        analysisResults,
        educationalResult,
        emailFormat
      );
      
      // Email format should include top resources in summary
      const section = report.educationalSections[0];
      expect(section.summary).toContain('Top Resources:');
      expect(section.summary).toContain('- ');
    });
  });
});
