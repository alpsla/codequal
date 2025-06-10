import { 
  ToolEnhancedOrchestrator,
  ORCHESTRATOR_TOOL_MAPPING
} from '@codequal/mcp-hybrid';
import { VectorContextService } from '../../mocks/VectorContextService';
import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

describe('Orchestrator Flow Integration Tests', () => {
  let vectorContextService: VectorContextService;
  let supabase: any;
  let orchestrator: ToolEnhancedOrchestrator;

  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
    vectorContextService = new VectorContextService(supabase);
    orchestrator = new ToolEnhancedOrchestrator();
  });

  describe('Tool Mapping Verification', () => {
    it('should have correct tool mappings for each agent role', () => {
      expect(ORCHESTRATOR_TOOL_MAPPING).toBeDefined();
      
      // Verify orchestrator tools
      expect(ORCHESTRATOR_TOOL_MAPPING.orchestrator).toContain('git-mcp');
      expect(ORCHESTRATOR_TOOL_MAPPING.orchestrator).toContain('web-search-mcp');
      expect(ORCHESTRATOR_TOOL_MAPPING.orchestrator).toContain('context-mcp');

      // Verify security tools
      expect(ORCHESTRATOR_TOOL_MAPPING.security).toContain('mcp-scan');
      expect(ORCHESTRATOR_TOOL_MAPPING.security).toContain('semgrep-mcp');
      expect(ORCHESTRATOR_TOOL_MAPPING.security).toContain('sonarqube');

      // Verify code quality tools
      expect(ORCHESTRATOR_TOOL_MAPPING.codeQuality).toContain('eslint-mcp');
      expect(ORCHESTRATOR_TOOL_MAPPING.codeQuality).toContain('prettier-direct');

      // Verify architecture tools
      expect(ORCHESTRATOR_TOOL_MAPPING.architecture).toContain('dependency-cruiser-direct');
      expect(ORCHESTRATOR_TOOL_MAPPING.architecture).toContain('madge-direct');

      // Verify all roles have tools
      const roles = Object.keys(ORCHESTRATOR_TOOL_MAPPING);
      expect(roles).toContain('orchestrator');
      expect(roles).toContain('security');
      expect(roles).toContain('codeQuality');
      expect(roles).toContain('architecture');
      expect(roles).toContain('performance');
      expect(roles).toContain('dependency');
      expect(roles).toContain('educational');
      expect(roles).toContain('reporting');
    });
  });

  describe('PR Analysis Flow', () => {
    it('should analyze PR complexity from URL', () => {
      // Test the helper methods
      const prUrl = 'https://github.com/codequal/test-repo/pull/123';
      
      // Access private methods for testing
      const extractPRNumber = (orchestrator as any).extractPRNumber.bind(orchestrator);
      const extractRepoName = (orchestrator as any).extractRepoName.bind(orchestrator);
      const extractOwner = (orchestrator as any).extractOwner.bind(orchestrator);
      const extractRepoUrl = (orchestrator as any).extractRepoUrl.bind(orchestrator);

      expect(extractPRNumber(prUrl)).toBe(123);
      expect(extractRepoName(prUrl)).toBe('test-repo');
      expect(extractOwner(prUrl)).toBe('codequal');
      expect(extractRepoUrl(prUrl)).toBe('https://github.com/codequal/test-repo');
    });

    it('should determine complexity score for PR', () => {
      const files = [
        { 
          path: 'src/index.ts',
          additions: 100,
          deletions: 50
        },
        {
          path: 'src/config.json',
          additions: 20,
          deletions: 5
        },
        {
          path: 'migrations/001_add_users.sql',
          additions: 50,
          deletions: 0
        }
      ];

      // Test complexity calculation
      const calculateComplexity = (orchestrator as any).calculateComplexityScore.bind(orchestrator);
      const score = calculateComplexity(files);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
      
      // Complex files should increase score
      const complexFiles = Array(60).fill({ path: 'file.ts', additions: 100 });
      const highScore = calculateComplexity(complexFiles);
      expect(highScore).toBe(0.8); // High complexity (capped at 0.8)
    });

    it('should detect languages and frameworks', () => {
      const detectLanguage = (orchestrator as any).getLanguageFromExtension.bind(orchestrator);
      
      expect(detectLanguage('js')).toBe('javascript');
      expect(detectLanguage('ts')).toBe('typescript');
      expect(detectLanguage('py')).toBe('python');
      expect(detectLanguage('java')).toBe('java');
      expect(detectLanguage('go')).toBe('go');
      expect(detectLanguage('rs')).toBe('rust');
      expect(detectLanguage('unknown')).toBeNull();

      // Test framework detection
      const detectFrameworks = (orchestrator as any).detectFrameworks.bind(orchestrator);
      const frameworks = new Set<string>();
      
      detectFrameworks(
        { content: 'import React from "react"', path: 'App.tsx' },
        frameworks
      );
      expect(frameworks.has('react')).toBe(true);

      detectFrameworks(
        { content: 'const app = express()', path: 'server.js' },
        frameworks
      );
      expect(frameworks.has('express')).toBe(true);
    });
  });

  describe('DeepWiki Request Generation', () => {
    it('should generate appropriate DeepWiki request based on complexity', () => {
      const generateRequest = (orchestrator as any).generateDeepWikiRequest.bind(orchestrator);
      
      // High complexity
      const highComplexity = {
        primaryLanguage: 'typescript',
        frameworks: ['react', 'express'],
        score: 0.8
      };
      
      const highRequest = generateRequest(highComplexity, {
        security: { priority: 'high' },
        codeQuality: { priority: 'medium' },
        architecture: { priority: 'high' },
        performance: { priority: 'medium' },
        dependencies: { priority: 'low' }
      });
      
      expect(highRequest.analysisDepth).toBe('comprehensive');
      expect(highRequest.contextRequirements.includeHistoricalData).toBe(true);
      expect(highRequest.language).toBe('typescript');
      expect(highRequest.frameworks).toContain('react');

      // Low complexity
      const lowComplexity = {
        primaryLanguage: 'javascript',
        frameworks: [],
        score: 0.3
      };
      
      const lowRequest = generateRequest(lowComplexity, {
        security: { priority: 'medium' },
        codeQuality: { priority: 'low' },
        architecture: { priority: 'low' },
        performance: { priority: 'low' },
        dependencies: { priority: 'low' }
      });
      
      expect(lowRequest.analysisDepth).toBe('standard');
      expect(lowRequest.contextRequirements.includeHistoricalData).toBe(false);
    });

    it('should show where DeepWiki generation happens in the flow', () => {
      // This test documents the actual orchestration flow
      const orchestrationFlow = {
        step1: 'Receive PR URL',
        step2: 'Analyze PR complexity',
        step3: 'Check Vector DB for existing DeepWiki report',
        step4_a: 'If found and valid: Use cached report',
        step4_b: 'If NOT found or expired: Generate new report',
        step5: 'Extract agent contexts from report',
        step6: 'Distribute contexts to agents',
        step7: 'Agents analyze with all contexts',
        step8: 'Collect and enhance reports'
      };

      // The critical missing piece is step4_b
      const generateNewReport = async (repoUrl: string) => {
        // 1. Build request based on PR analysis
        const request = {
          repositoryUrl: repoUrl,
          analysisType: 'comprehensive',
          requestedSections: ['architecture', 'security', 'codeQuality'],
          includeAgentContexts: true
        };

        // 2. Call DeepWiki API (THIS IS WHAT WE'RE MISSING)
        // const response = await deepWikiAPI.analyze(request);
        
        // 3. Store in Vector DB
        // await vectorDB.store(response);
        
        // 4. Return structured report
        return {
          status: 'generated',
          report: 'mock report for testing'
        };
      };

      expect(orchestrationFlow.step4_b).toContain('Generate new report');
    });
  });

  describe('Agent Context Extraction', () => {
    it('should extract specialized contexts for each agent', () => {
      const repoReport = {
        summary: 'Test repository analysis',
        architecture: {
          patterns: ['MVC', 'Repository Pattern'],
          dependencies: ['express', 'typeorm']
        },
        security: {
          vulnerabilities: [],
          bestPractices: ['Uses HTTPS', 'JWT tokens']
        },
        codeQuality: {
          testCoverage: 85,
          lintingScore: 92
        },
        agentContexts: {
          security: { focus: 'authentication', priority: 'high' },
          codeQuality: { focus: 'testing', priority: 'medium' },
          architecture: { focus: 'scalability', priority: 'high' }
        }
      };

      const extractContexts = (orchestrator as any).extractSpecializedContexts.bind(orchestrator);
      const contexts = extractContexts(repoReport);

      expect(contexts.size).toBeGreaterThan(0);
      
      const securityContext = contexts.get('security');
      expect(securityContext).toBeDefined();
      expect(securityContext.repoSummary).toBe('Test repository analysis');
      expect(securityContext.roleSpecificData.vulnerabilities).toEqual([]);
      expect(securityContext.focusAreas.focus).toBe('authentication');
    });
  });

  describe('Final Report Generation', () => {
    it('should create executive summary from agent results', () => {
      const createSummary = (orchestrator as any).createExecutiveSummary.bind(orchestrator);
      
      const agentResults = new Map([
        ['security', { findings: { criticalFindings: 2 } }],
        ['codeQuality', { findings: { issueCount: 10 } }]
      ]);
      
      const summary = createSummary(agentResults);
      expect(summary).toContain('Executive summary');
    });

    it('should prioritize recommendations', () => {
      const prioritize = (orchestrator as any).prioritizeRecommendations.bind(orchestrator);
      
      const results = new Map([
        ['security', { findings: { criticalFindings: 1 } }]
      ]);
      
      const recommendations = prioritize(results);
      expect(recommendations).toHaveLength(2);
      expect(recommendations[0].priority).toBe('high');
      expect(recommendations[0].recommendation).toContain('security');
    });

    it('should aggregate metrics from all agents', () => {
      const aggregate = (orchestrator as any).aggregateMetrics.bind(orchestrator);
      
      const results = new Map([
        ['security', { toolResults: { metrics: { vulnerabilities: 2 } } }],
        ['performance', { toolResults: { metrics: { loadTime: '2.5s' } } }]
      ]);
      
      const metrics = aggregate(results);
      expect(metrics.security).toEqual({ vulnerabilities: 2 });
      expect(metrics.performance).toEqual({ loadTime: '2.5s' });
    });
  });

  describe('Agent Requirements Determination', () => {
    it('should determine agent priorities based on complexity and context', () => {
      const determine = (orchestrator as any).determineAgentRequirements.bind(orchestrator);
      
      const complexity = {
        fileCount: 30,
        frameworks: ['react', 'express', 'graphql'],
        primaryLanguage: 'javascript'
      };
      
      const orgContext = {
        preferences: {
          securityLevel: 'high',
          codeStandards: 'strict'
        }
      };
      
      const requirements = determine(complexity, orgContext);
      
      expect(requirements.security.priority).toBe('critical'); // High security org
      expect(requirements.codeQuality.priority).toBe('high'); // Many files
      expect(requirements.architecture.priority).toBe('high'); // Multiple frameworks
      expect(requirements.performance.priority).toBe('high'); // JS needs perf attention
      expect(requirements.dependencies.priority).toBe('high'); // Always high
    });
  });

  describe('Learning Objectives Extraction', () => {
    it('should extract learning objectives from analysis results', () => {
      const extract = (orchestrator as any).extractLearningObjectives.bind(orchestrator);
      
      const results = new Map([
        ['security', { findings: { criticalFindings: 2 } }],
        ['codeQuality', { findings: { criticalFindings: 0 } }],
        ['architecture', { findings: { criticalFindings: 1 } }]
      ]);
      
      const objectives = extract(results);
      
      expect(objectives).toContain('Understand security best practices');
      expect(objectives).toContain('Understand architecture best practices');
      expect(objectives).not.toContain('Understand codeQuality best practices');
    });
  });

  describe('Agent Report Creation', () => {
    it('should create compiled reports based on tool results', () => {
      const createReport = (orchestrator as any).createAgentReport.bind(orchestrator);
      
      const toolResults = {
        findings: [
          { severity: 'critical', message: 'SQL injection' },
          { severity: 'high', message: 'XSS vulnerability' }
        ],
        toolsExecuted: ['semgrep', 'mcp-scan'],
        metrics: { securityScore: 6.5 }
      };
      
      const context = {
        focus: 'authentication',
        priority: 'high'
      };
      
      const report = createReport('security', toolResults, context);
      
      expect(report.summary).toContain('security analysis');
      expect(report.summary).toContain('2 tools');
      expect(report.findingsCount).toBe(2);
      expect(report.criticalIssues).toBe(1);
      expect(report.recommendations).toHaveLength(1);
      expect(report.recommendations[0]).toContain('critical security vulnerabilities');
      expect(report.confidence).toBe('high');
    });

    it('should generate role-specific recommendations', () => {
      const generate = (orchestrator as any).generateRecommendations.bind(orchestrator);
      
      // Security recommendations
      const securityResults = {
        findings: [{ severity: 'critical' }],
        metrics: {}
      };
      const securityRecs = generate('security', securityResults);
      expect(securityRecs[0]).toContain('critical security');

      // Code quality recommendations
      const qualityResults = {
        findings: [],
        metrics: { fixableIssues: 25 }
      };
      const qualityRecs = generate('codeQuality', qualityResults);
      expect(qualityRecs[0]).toContain('Auto-fix 25 issues');

      // Dependency recommendations
      const depResults = {
        findings: [{ severity: 'high' }],
        metrics: {}
      };
      const depRecs = generate('dependency', depResults);
      expect(depRecs[0]).toContain('vulnerable dependencies');
    });
  });
});
