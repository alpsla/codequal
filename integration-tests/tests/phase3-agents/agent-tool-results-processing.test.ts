import { VectorContextService } from '../../mocks/VectorContextService';
import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Mock tool results that agents will process
const mockToolResults = {
  eslint: {
    tool: 'eslint',
    executedAt: new Date().toISOString(),
    findings: [
      {
        file: 'src/components/Auth.tsx',
        line: 45,
        column: 10,
        rule: 'no-unused-vars',
        severity: 'warning',
        message: "Unused variable 'tempToken'"
      },
      {
        file: 'src/api/users.ts',
        line: 89,
        column: 5,
        rule: 'complexity',
        severity: 'error',
        message: 'Function has cyclomatic complexity of 15 (max: 10)'
      },
      {
        file: 'src/utils/validation.ts',
        line: 23,
        column: 15,
        rule: 'no-any',
        severity: 'warning',
        message: 'Unexpected any type'
      }
    ],
    summary: {
      errors: 1,
      warnings: 2,
      filesAnalyzed: 25
    }
  },
  semgrep: {
    tool: 'semgrep',
    executedAt: new Date().toISOString(),
    findings: [
      {
        file: 'src/auth/jwt.ts',
        line: 67,
        rule: 'jwt-weak-secret',
        severity: 'high',
        message: 'JWT secret appears to be hardcoded',
        cwe: 'CWE-798',
        owasp: 'A02:2021'
      },
      {
        file: 'src/db/queries.ts',
        line: 134,
        rule: 'sql-injection',
        severity: 'critical',
        message: 'Potential SQL injection vulnerability',
        cwe: 'CWE-89',
        owasp: 'A03:2021'
      }
    ],
    summary: {
      critical: 1,
      high: 1,
      medium: 0,
      low: 0
    }
  },
  lighthouse: {
    tool: 'lighthouse',
    executedAt: new Date().toISOString(),
    metrics: {
      performance: 72,
      accessibility: 88,
      bestPractices: 85,
      seo: 92,
      pwa: 65
    },
    opportunities: [
      {
        id: 'render-blocking-resources',
        title: 'Eliminate render-blocking resources',
        savings: '1.2s',
        impact: 'high'
      },
      {
        id: 'unminified-javascript',
        title: 'Minify JavaScript',
        savings: '45 KB',
        impact: 'medium'
      }
    ],
    diagnostics: [
      {
        id: 'largest-contentful-paint',
        value: '3.2s',
        rating: 'needs-improvement'
      }
    ]
  },
  dependencyCruiser: {
    tool: 'dependency-cruiser',
    executedAt: new Date().toISOString(),
    findings: [
      {
        from: 'src/components/Dashboard.tsx',
        to: 'src/api/internal.ts',
        rule: 'no-circular',
        severity: 'error',
        message: 'Circular dependency detected'
      },
      {
        from: 'src/services/auth.ts',
        to: 'src/db/models.ts',
        rule: 'no-orphans',
        severity: 'warning',
        message: 'Module has no incoming dependencies'
      }
    ],
    metrics: {
      totalModules: 156,
      totalDependencies: 423,
      circularDependencies: 1,
      orphanModules: 3
    }
  }
};

describe('Agent Tool Results Processing Tests', () => {
  let vectorContextService: VectorContextService;
  let supabase: any;

  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
    vectorContextService = new VectorContextService(supabase);
  });

  describe('Code Quality Agent Processing ESLint Results', () => {
    it('should enrich ESLint findings with context and recommendations', async () => {
      // Mock Code Quality Agent
      class CodeQualityAgent {
        constructor(private config: any) {}

        async analyze(context: any) {
          const { toolFindings, vectorContext, deepwikiContext } = context;
          
          // Process each ESLint finding
          const enrichedFindings = toolFindings.findings.map((finding: any) => {
            return {
              original: finding,
              enriched: this.enrichFinding(finding, vectorContext)
            };
          });

          return {
            role: 'codeQuality',
            toolUsed: 'eslint',
            findings: enrichedFindings,
            summary: this.generateSummary(enrichedFindings),
            recommendations: this.generateRecommendations(enrichedFindings),
            educationalContent: this.generateEducationalContent(enrichedFindings),
            confidenceScore: 0.85
          };
        }

        private enrichFinding(finding: any, vectorContext: any) {
          const enrichments: any = {
            impact: 'medium',
            context: '',
            recommendation: '',
            pattern: ''
          };

          switch (finding.rule) {
            case 'no-unused-vars':
              enrichments.impact = 'low';
              enrichments.context = 'Unused variable in authentication component';
              enrichments.recommendation = 'Remove the variable or implement the planned feature';
              enrichments.pattern = 'Common in 15% of TypeScript repositories';
              break;
            case 'complexity':
              enrichments.impact = 'high';
              enrichments.context = 'High cyclomatic complexity affects maintainability';
              enrichments.recommendation = 'Refactor into smaller functions, consider extracting business logic';
              enrichments.pattern = 'Functions with complexity >10 have 3x more bugs';
              break;
            case 'no-any':
              enrichments.impact = 'medium';
              enrichments.context = 'Type safety compromised in validation utilities';
              enrichments.recommendation = 'Define proper types or use unknown with type guards';
              enrichments.pattern = 'TypeScript repos with any usage have 25% more runtime errors';
              break;
          }

          return enrichments;
        }

        private generateSummary(findings: any[]) {
          return {
            totalIssues: findings.length,
            highImpact: findings.filter(f => f.enriched.impact === 'high').length,
            mediumImpact: findings.filter(f => f.enriched.impact === 'medium').length,
            lowImpact: findings.filter(f => f.enriched.impact === 'low').length,
            overallAssessment: 'Code quality is good with some areas for improvement'
          };
        }

        private generateRecommendations(findings: any[]) {
          return [
            {
              priority: 'high',
              action: 'Refactor complex functions',
              effort: 'medium',
              impact: 'Improves maintainability and reduces bug risk'
            },
            {
              priority: 'medium',
              action: 'Add proper TypeScript types',
              effort: 'low',
              impact: 'Prevents runtime errors and improves IDE support'
            },
            {
              priority: 'low',
              action: 'Clean up unused variables',
              effort: 'low',
              impact: 'Reduces code clutter'
            }
          ];
        }

        private generateEducationalContent(findings: any[]) {
          return {
            topics: [
              {
                title: 'Managing Cyclomatic Complexity',
                content: 'Cyclomatic complexity measures the number of linearly independent paths...',
                relevantFindings: ['complexity']
              },
              {
                title: 'TypeScript Best Practices',
                content: 'Using any type defeats the purpose of TypeScript...',
                relevantFindings: ['no-any']
              }
            ]
          };
        }
      }

      // Create agent and analyze
      const agent = new CodeQualityAgent({
        model: 'gpt-4-turbo',
        temperature: 0.3
      });

      const result = await agent.analyze({
        toolFindings: mockToolResults.eslint,
        vectorContext: { historicalPatterns: [] },
        deepwikiContext: {
          summary: 'Repository implements React patterns with TypeScript',
          codeQualityGuidelines: ['Use strict TypeScript', 'Maintain 80% coverage'],
          techDebt: ['Legacy authentication module needs refactoring'],
          dependencies: ['eslint', 'prettier', 'jest']
        }
      });

      expect(result.role).toBe('codeQuality');
      expect(result.findings).toHaveLength(3);
      expect(result.findings[0].enriched.impact).toBe('low');
      expect(result.findings[1].enriched.impact).toBe('high');
      expect(result.summary.highImpact).toBe(1);
      expect(result.recommendations).toHaveLength(3);
      expect(result.educationalContent.topics).toHaveLength(2);
    });
  });

  describe('Security Agent Processing Semgrep Results', () => {
    it('should enrich security findings with severity and remediation', async () => {
      class SecurityAgent {
        async analyze(context: any) {
          const { toolFindings, deepwikiContext } = context;
          
          const enrichedFindings = toolFindings.findings.map((finding: any) => {
            return {
              original: finding,
              enriched: {
                riskScore: this.calculateRiskScore(finding),
                exploitability: this.assessExploitability(finding),
                remediation: this.getRemediation(finding),
                complianceImpact: this.getComplianceImpact(finding),
                similarVulnerabilities: this.findSimilarVulnerabilities(finding)
              }
            };
          });

          return {
            role: 'security',
            toolUsed: 'semgrep',
            findings: enrichedFindings,
            criticalFindings: enrichedFindings.filter((f: any) => f.original.severity === 'critical'),
            securityScore: this.calculateSecurityScore(enrichedFindings),
            remediationPlan: this.createRemediationPlan(enrichedFindings),
            confidenceScore: 0.92
          };
        }

        private calculateRiskScore(finding: any) {
          const severityScores = { critical: 10, high: 8, medium: 5, low: 2 };
          const baseScore = severityScores[finding.severity as keyof typeof severityScores] || 0;
          
          // Additional factors
          const exploitabilityFactor = finding.cwe === 'CWE-89' ? 1.5 : 1.0;
          
          return Math.min(baseScore * exploitabilityFactor, 10);
        }

        private assessExploitability(finding: any) {
          if (finding.rule === 'sql-injection') {
            return {
              likelihood: 'high',
              difficulty: 'low',
              impact: 'critical',
              publicExploits: true
            };
          }
          return {
            likelihood: 'medium',
            difficulty: 'medium',
            impact: 'high',
            publicExploits: false
          };
        }

        private getRemediation(finding: any) {
          const remediations: Record<string, any> = {
            'jwt-weak-secret': {
              immediate: 'Move JWT secret to environment variables',
              longTerm: 'Implement proper key rotation',
              codeExample: 'const secret = process.env.JWT_SECRET;',
              effort: 'low'
            },
            'sql-injection': {
              immediate: 'Use parameterized queries',
              longTerm: 'Implement ORM or query builder',
              codeExample: 'const result = await db.query("SELECT * FROM users WHERE id = $1", [userId]);',
              effort: 'medium'
            }
          };
          return remediations[finding.rule] || { immediate: 'Review and fix', effort: 'unknown' };
        }

        private getComplianceImpact(finding: any) {
          return {
            owasp: finding.owasp || 'N/A',
            cwe: finding.cwe || 'N/A',
            regulations: ['GDPR', 'SOC2', 'ISO27001'],
            severity: finding.severity === 'critical' ? 'high' : 'medium'
          };
        }

        private findSimilarVulnerabilities(finding: any) {
          // Mock: In reality, would search Vector DB
          return [
            'Similar issue found in auth module 2 weeks ago',
            'Pattern detected in 3 other repositories'
          ];
        }

        private calculateSecurityScore(findings: any[]) {
          const criticalCount = findings.filter(f => f.original.severity === 'critical').length;
          const highCount = findings.filter(f => f.original.severity === 'high').length;
          
          let score = 10;
          score -= criticalCount * 3;
          score -= highCount * 1.5;
          
          return Math.max(score, 0);
        }

        private createRemediationPlan(findings: any[]) {
          return {
            immediate: findings
              .filter(f => f.original.severity === 'critical')
              .map(f => ({
                finding: f.original.rule,
                action: f.enriched.remediation.immediate,
                priority: 'critical'
              })),
            shortTerm: findings
              .filter(f => f.original.severity === 'high')
              .map(f => ({
                finding: f.original.rule,
                action: f.enriched.remediation.longTerm,
                priority: 'high'
              })),
            estimatedEffort: '2-3 days',
            requiredExpertise: ['security', 'backend']
          };
        }
      }

      const agent = new SecurityAgent();
      const result = await agent.analyze({
        toolFindings: mockToolResults.semgrep,
        deepwikiContext: {
          summary: 'E-commerce platform with payment processing',
          securityGuidelines: ['PCI compliance required', 'OWASP Top 10'],
          knownVulnerabilities: [],
          authenticationMethod: 'JWT with refresh tokens'
        }
      });

      expect(result.role).toBe('security');
      expect(result.findings).toHaveLength(2);
      expect(result.criticalFindings).toHaveLength(1);
      expect(result.securityScore).toBeLessThan(10);
      expect(result.remediationPlan.immediate).toHaveLength(1);
      expect(result.findings[0].enriched.riskScore).toBeGreaterThanOrEqual(8);
    });
  });

  describe('Performance Agent Processing Lighthouse Results', () => {
    it('should interpret performance metrics and provide optimizations', async () => {
      class PerformanceAgent {
        async analyze(context: any) {
          const { toolFindings, deepwikiContext } = context;
          const metrics = toolFindings.metrics;
          const opportunities = toolFindings.opportunities;

          return {
            role: 'performance',
            toolUsed: 'lighthouse',
            scoreAnalysis: this.analyzeScores(metrics),
            optimizationPlan: this.createOptimizationPlan(opportunities),
            impactAssessment: this.assessImpact(metrics, opportunities) as any,
            benchmarkComparison: this.compareToBenchmarks(metrics),
            educationalInsights: this.generateInsights(metrics, opportunities),
            confidenceScore: 0.88
          };
        }

        private analyzeScores(metrics: any) {
          return {
            performance: {
              score: metrics.performance,
              rating: metrics.performance >= 90 ? 'excellent' : metrics.performance >= 70 ? 'good' : 'needs improvement',
              insights: 'Performance score indicates room for optimization, particularly in initial load time'
            },
            accessibility: {
              score: metrics.accessibility,
              rating: 'good',
              insights: 'Accessibility is well-implemented with minor improvements possible'
            },
            overallHealth: this.calculateOverallHealth(metrics)
          };
        }

        private createOptimizationPlan(opportunities: any[]) {
          return opportunities.map(opp => ({
            ...opp,
            implementation: this.getImplementationDetails(opp.id),
            estimatedImpact: this.estimateImpact(opp),
            priority: opp.impact === 'high' ? 1 : opp.impact === 'medium' ? 2 : 3
          })).sort((a, b) => a.priority - b.priority);
        }

        private getImplementationDetails(oppId: string) {
          const implementations: Record<string, any> = {
            'render-blocking-resources': {
              steps: [
                'Inline critical CSS',
                'Defer non-critical scripts',
                'Use resource hints (preload, prefetch)'
              ],
              codeExample: '<link rel="preload" href="critical.css" as="style">',
              complexity: 'medium'
            },
            'unminified-javascript': {
              steps: [
                'Configure build tool for production minification',
                'Enable source maps for debugging'
              ],
              codeExample: 'webpack --mode production',
              complexity: 'low'
            }
          };
          return implementations[oppId] || { steps: ['Implement optimization'], complexity: 'unknown' };
        }

        private estimateImpact(opportunity: any) {
          const savingsValue = parseFloat(opportunity.savings) || 0;
          return {
            performanceGain: `~${Math.round(savingsValue * 100 / 3.2)}% faster load time`,
            userExperience: opportunity.impact === 'high' ? 'Significant improvement' : 'Moderate improvement',
            businessImpact: 'Potential reduction in bounce rate'
          };
        }

        private calculateOverallHealth(metrics: any) {
          const avg = Object.values(metrics).reduce((a: number, b: any) => a + b, 0) / Object.keys(metrics).length;
          return {
            score: Math.round(avg),
            status: avg >= 80 ? 'healthy' : avg >= 60 ? 'moderate' : 'needs attention'
          };
        }

        private compareToBenchmarks(metrics: any) {
          return {
            industry: {
              performance: { yours: metrics.performance, average: 68, percentile: 65 },
              accessibility: { yours: metrics.accessibility, average: 82, percentile: 75 }
            },
            recommendations: metrics.performance < 68 ? 
              ['Focus on performance optimizations to meet industry standards'] : 
              ['Performance is above industry average']
          };
        }

        private assessImpact(metrics: any, opportunities: any[]) {
          return {
            overallImpact: 'moderate',
            userExperienceGain: 'improved load times and responsiveness',
            businessValue: 'reduced bounce rate, increased engagement',
            implementationEffort: 'low to medium based on opportunity complexity'
          };
        }

        private generateInsights(metrics: any, opportunities: any[]) {
          return {
            keyTakeaways: [
              'Render-blocking resources are the primary performance bottleneck',
              'Accessibility score is strong, indicating good UX practices',
              'PWA score suggests missing offline capabilities'
            ],
            learningResources: [
              {
                topic: 'Web Performance Optimization',
                url: 'https://web.dev/performance',
                relevance: 'high'
              }
            ]
          };
        }
      }

      const agent = new PerformanceAgent();
      const result = await agent.analyze({
        toolFindings: mockToolResults.lighthouse,
        deepwikiContext: {
          summary: 'High-traffic web application',
          performanceTargets: { loadTime: '2s', bundleSize: '1MB' },
          currentIssues: ['Large bundle size', 'No code splitting'],
          optimizationHistory: ['Added lazy loading', 'Implemented CDN']
        }
      });

      expect(result.role).toBe('performance');
      expect(result.scoreAnalysis.performance.rating).toBe('good');
      expect(result.optimizationPlan).toHaveLength(2);
      expect(result.optimizationPlan[0].priority).toBe(1);
      expect(result.benchmarkComparison.industry.performance.percentile).toBe(65);
    });
  });

  describe('Architecture Agent Processing Dependency Cruiser Results', () => {
    it('should analyze dependency patterns and architectural issues', async () => {
      class ArchitectureAgent {
        async analyze(context: any) {
          const { toolFindings, deepwikiContext } = context;

          return {
            role: 'architecture',
            toolUsed: 'dependency-cruiser',
            architecturalIssues: this.identifyIssues(toolFindings.findings),
            dependencyHealth: this.assessDependencyHealth(toolFindings.metrics),
            refactoringPlan: this.createRefactoringPlan(toolFindings.findings),
            architecturalPatterns: this.identifyPatterns(toolFindings),
            recommendations: this.generateRecommendations(toolFindings),
            confidenceScore: 0.87
          };
        }

        private identifyIssues(findings: any[]) {
          return findings.map(finding => ({
            ...finding,
            type: this.categorizeIssue(finding),
            impact: this.assessArchitecturalImpact(finding),
            solution: this.proposeSolution(finding)
          }));
        }

        private categorizeIssue(finding: any) {
          if (finding.rule === 'no-circular') return 'circular-dependency';
          if (finding.rule === 'no-orphans') return 'orphan-module';
          return 'dependency-violation';
        }

        private assessArchitecturalImpact(finding: any) {
          if (finding.rule === 'no-circular') {
            return {
              severity: 'high',
              testability: 'severely impacted',
              maintainability: 'difficult refactoring',
              buildTime: 'increased compilation time'
            };
          }
          return {
            severity: 'medium',
            testability: 'moderately impacted',
            maintainability: 'potential debt',
            buildTime: 'minimal impact'
          };
        }

        private proposeSolution(finding: any) {
          if (finding.rule === 'no-circular') {
            return {
              approach: 'Extract shared interface or use dependency injection',
              effort: 'medium',
              example: 'Create IAuthService interface to break circular dependency'
            };
          }
          return {
            approach: 'Review module usage and remove if truly orphaned',
            effort: 'low',
            example: 'Check if module is dynamically imported'
          };
        }

        private assessDependencyHealth(metrics: any) {
          const healthScore = 100 - 
            (metrics.circularDependencies * 20) - 
            (metrics.orphanModules * 5);

          return {
            score: Math.max(healthScore, 0),
            status: healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'moderate' : 'poor',
            metrics: {
              modularity: metrics.totalDependencies / metrics.totalModules,
              circularRatio: metrics.circularDependencies / metrics.totalModules,
              orphanRatio: metrics.orphanModules / metrics.totalModules
            }
          };
        }

        private createRefactoringPlan(findings: any[]) {
          const circularDeps = findings.filter(f => f.rule === 'no-circular');
          
          return {
            immediate: circularDeps.map(dep => ({
              action: 'Break circular dependency',
              modules: [dep.from, dep.to],
              approach: 'Extract shared types or use events',
              priority: 'high'
            })),
            architectural: [
              {
                pattern: 'Implement clean architecture boundaries',
                effort: 'high',
                impact: 'Prevents future circular dependencies'
              }
            ]
          };
        }

        private identifyPatterns(toolFindings: any) {
          return {
            positive: [
              'Clear separation between components and services',
              'Consistent module organization'
            ],
            concerns: [
              'Tight coupling between UI and API layers',
              'Missing abstraction layer for database access'
            ]
          };
        }

        private generateRecommendations(toolFindings: any) {
          return [
            {
              category: 'immediate',
              action: 'Resolve circular dependency in authentication flow',
              rationale: 'Prevents testing difficulties and deployment issues'
            },
            {
              category: 'short-term',
              action: 'Implement dependency injection container',
              rationale: 'Improves testability and reduces coupling'
            },
            {
              category: 'long-term',
              action: 'Adopt hexagonal architecture pattern',
              rationale: 'Clear boundaries prevent architectural violations'
            }
          ];
        }
      }

      const agent = new ArchitectureAgent();
      const result = await agent.analyze({
        toolFindings: mockToolResults.dependencyCruiser,
        deepwikiContext: {
          summary: 'Microservices architecture with event-driven communication',
          architecturePatterns: ['Clean Architecture', 'CQRS', 'Event Sourcing'],
          designDecisions: ['Separate read/write models', 'Domain-driven design'],
          technicalDebt: ['Monolithic auth service needs splitting']
        }
      });

      expect(result.role).toBe('architecture');
      expect(result.architecturalIssues).toHaveLength(2);
      expect(result.architecturalIssues[0].type).toBe('circular-dependency');
      expect(result.dependencyHealth.score).toBeLessThan(100);
      expect(result.refactoringPlan.immediate).toHaveLength(1);
    });
  });

  describe('Cross-Tool Intelligence', () => {
    it('should correlate findings across multiple tools', async () => {
      // Example: Security findings correlating with architecture issues
      const correlateFindings = (securityFindings: any, architectureFindings: any) => {
        const correlations = [];
        
        // SQL injection in poorly architected data layer
        const sqlInjection = securityFindings.findings.find((f: any) => f.rule === 'sql-injection');
        const dbFile = sqlInjection?.file;
        
        if (dbFile) {
          const archIssue = architectureFindings.findings.find((f: any) => 
            f.from.includes('db') || f.to.includes('db')
          );
          
          if (archIssue) {
            correlations.push({
              security: sqlInjection,
              architecture: archIssue,
              insight: 'SQL injection vulnerability may be related to poor data layer architecture',
              recommendation: 'Implement repository pattern with parameterized queries'
            });
          }
        }
        
        return correlations;
      };

      const correlations = correlateFindings(
        mockToolResults.semgrep,
        mockToolResults.dependencyCruiser
      );
      
      expect(correlations.length).toBeGreaterThan(0);
      expect(correlations[0].insight).toContain('SQL injection');
    });
  });
});
