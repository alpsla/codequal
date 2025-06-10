import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

describe('Missing Integration Pieces Tests', () => {
  let supabase: any;

  beforeAll(() => {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
  });

  describe('PR Analysis and Agent Selection', () => {
    it('should analyze PR to determine which agents to run', () => {
      interface PRAnalysis {
        files: Array<{ path: string; additions: number; deletions: number; status: string }>;
        title: string;
        description: string;
        labels: string[];
      }

      const analyzePR = (pr: PRAnalysis) => {
        const analysis = {
          changeType: 'unknown',
          riskLevel: 'medium',
          affectedAreas: new Set<string>(),
          requiredAgents: new Set<string>(),
          priority: 'medium'
        };

        // Determine change type from title/labels
        if (pr.title.toLowerCase().includes('fix') || pr.labels.includes('bug')) {
          analysis.changeType = 'bugfix';
          analysis.priority = 'high';
        } else if (pr.title.toLowerCase().includes('feat') || pr.labels.includes('feature')) {
          analysis.changeType = 'feature';
        } else if (pr.title.toLowerCase().includes('refactor')) {
          analysis.changeType = 'refactor';
        } else if (pr.title.toLowerCase().includes('security')) {
          analysis.changeType = 'security';
          analysis.priority = 'critical';
        }

        // Analyze files to determine affected areas and required agents
        pr.files.forEach(file => {
          // Security files
          if (file.path.includes('auth') || file.path.includes('security') || 
              file.path.includes('jwt') || file.path.includes('crypto')) {
            analysis.affectedAreas.add('security');
            analysis.requiredAgents.add('security');
            analysis.riskLevel = 'high';
          }

          // Database files
          if (file.path.includes('db') || file.path.includes('query') || 
              file.path.includes('migration')) {
            analysis.affectedAreas.add('database');
            analysis.requiredAgents.add('security'); // For SQL injection
            analysis.requiredAgents.add('architecture'); // For schema changes
          }

          // Config files
          if (file.path.includes('package.json') || file.path.includes('tsconfig') ||
              file.path.includes('.env')) {
            analysis.affectedAreas.add('configuration');
            analysis.requiredAgents.add('dependency');
            analysis.requiredAgents.add('security'); // For env changes
          }

          // Test files
          if (file.path.includes('.test.') || file.path.includes('.spec.')) {
            analysis.affectedAreas.add('testing');
            analysis.requiredAgents.add('codeQuality');
          }

          // Large changes increase risk
          if (file.additions + file.deletions > 500) {
            analysis.riskLevel = 'high';
            analysis.requiredAgents.add('architecture'); // For structural impact
          }
        });

        // Always run these agents
        analysis.requiredAgents.add('codeQuality'); // Always check quality
        if (pr.files.length > 10) {
          analysis.requiredAgents.add('architecture'); // Check structure for large PRs
        }

        return analysis;
      };

      // Test different PR scenarios
      const securityPR: PRAnalysis = {
        title: 'fix: Security vulnerability in JWT handling',
        description: 'Fixes CVE-2024-1234',
        labels: ['security', 'critical'],
        files: [
          { path: 'src/auth/jwt.ts', additions: 50, deletions: 30, status: 'modified' },
          { path: 'src/auth/jwt.test.ts', additions: 100, deletions: 0, status: 'added' }
        ]
      };

      const analysis = analyzePR(securityPR);
      
      expect(analysis.changeType).toBe('security');
      expect(analysis.priority).toBe('critical');
      expect(analysis.riskLevel).toBe('high');
      expect(Array.from(analysis.requiredAgents)).toContain('security');
      expect(Array.from(analysis.requiredAgents)).toContain('codeQuality');
    });

    it('should determine agent execution order based on dependencies', () => {
      // Some agents depend on others
      const agentDependencies = {
        reporting: ['security', 'codeQuality', 'architecture', 'performance', 'dependency'],
        educational: ['security', 'codeQuality'], // Needs issues to create learning content
        performance: [], // Can run independently
        architecture: [], // Can run independently
        codeQuality: [], // Can run independently
        security: [], // Can run independently
        dependency: [] // Can run independently
      };

      const determineExecutionOrder = (requiredAgents: string[]) => {
        const ordered: string[] = [];
        const remaining = new Set(requiredAgents);

        // Topological sort
        while (remaining.size > 0) {
          const batch: string[] = [];
          
          for (const agent of remaining) {
            const deps = agentDependencies[agent as keyof typeof agentDependencies] || [];
            const unsatisfiedDeps = deps.filter(dep => 
              requiredAgents.includes(dep) && !ordered.includes(dep)
            );
            
            if (unsatisfiedDeps.length === 0) {
              batch.push(agent);
            }
          }

          if (batch.length === 0) {
            throw new Error('Circular dependency detected');
          }

          // Add batch to ordered list
          ordered.push(...batch);
          batch.forEach(agent => remaining.delete(agent));
        }

        return ordered;
      };

      const agents = ['reporting', 'security', 'educational', 'codeQuality'];
      const order = determineExecutionOrder(agents);

      expect(order.indexOf('security')).toBeLessThan(order.indexOf('educational'));
      expect(order.indexOf('security')).toBeLessThan(order.indexOf('reporting'));
      expect(order.indexOf('codeQuality')).toBeLessThan(order.indexOf('reporting'));
    });
  });

  describe('Educational Agent Implementation', () => {
    it('should generate learning content based on findings', async () => {
      class EducationalAgent {
        async analyze(context: {
          prData: any;
          deepwikiContext: any;
          otherAgentFindings: any[];
          vectorContext: any;
        }) {
          const { otherAgentFindings, deepwikiContext } = context;

          // Analyze patterns in findings
          const knowledgeGaps = this.identifyKnowledgeGaps(otherAgentFindings);
          const learningPaths = this.createLearningPaths(knowledgeGaps, deepwikiContext);
          const resources = this.gatherResources(knowledgeGaps);

          return {
            role: 'educational',
            status: 'completed',
            confidence: 0.85,
            findings: knowledgeGaps.map((gap, index) => ({
              id: `edu-${index}`,
              severity: 'info' as const,
              category: 'knowledge-gap',
              title: gap.title,
              description: gap.description
            })),
            summary: {
              overallAssessment: 'Team would benefit from targeted training',
              issueCount: { critical: 0, high: 0, medium: 0, low: 0, info: knowledgeGaps.length },
              keyInsights: [
                `${knowledgeGaps.length} knowledge gaps identified`,
                'Security practices need improvement',
                'Modern patterns not fully adopted'
              ]
            },
            recommendations: learningPaths.map((path, index) => ({
              id: `rec-edu-${index}`,
              priority: 'medium' as const,
              category: 'training',
              action: `Complete ${path.title} training`,
              rationale: path.rationale,
              effort: 'medium' as const,
              impact: 'high' as const
            })),
            contextsUsed: {
              deepwiki: true,
              tools: [],
              vectorDb: true,
              crossRepo: true
            },
            duration: 1500,
            timestamp: new Date().toISOString(),
            roleSpecificData: {
              learningPaths,
              resources,
              estimatedLearningTime: learningPaths.reduce((sum, path) => sum + path.duration, 0)
            }
          };
        }

        private identifyKnowledgeGaps(findings: any[]) {
          const gaps = [];

          // Check for security issues
          const securityFindings = findings.filter(f => 
            f.role === 'security' && f.findings?.some((f: any) => f.severity === 'critical')
          );
          
          if (securityFindings.length > 0) {
            gaps.push({
              title: 'Security Best Practices',
              description: 'Critical security issues suggest knowledge gap in secure coding',
              category: 'security',
              evidence: securityFindings
            });
          }

          // Check for code quality issues
          const qualityFindings = findings.filter(f => 
            f.role === 'codeQuality' && f.findings?.some((f: any) => f.enriched?.impact === 'high')
          );

          if (qualityFindings.length > 0) {
            gaps.push({
              title: 'Code Quality Standards',
              description: 'High complexity and type safety issues',
              category: 'quality',
              evidence: qualityFindings
            });
          }

          return gaps;
        }

        private createLearningPaths(gaps: any[], deepwikiContext: any) {
          return gaps.map(gap => ({
            title: gap.title,
            modules: this.getModulesForGap(gap),
            duration: this.estimateDuration(gap),
            prerequisites: [],
            rationale: `Address ${gap.category} knowledge gaps found in codebase`,
            outcomes: this.defineOutcomes(gap)
          }));
        }

        private getModulesForGap(gap: any) {
          const moduleMap: Record<string, string[]> = {
            security: [
              'OWASP Top 10 Overview',
              'Input Validation and Sanitization',
              'Authentication Best Practices',
              'Secure Session Management'
            ],
            quality: [
              'Clean Code Principles',
              'TypeScript Advanced Types',
              'Testing Strategies',
              'Refactoring Techniques'
            ]
          };

          return moduleMap[gap.category] || ['General Best Practices'];
        }

        private estimateDuration(gap: any) {
          // Hours based on gap severity
          const durationMap: Record<string, number> = {
            security: 4,
            quality: 3,
            architecture: 5,
            performance: 2
          };

          return durationMap[gap.category] || 2;
        }

        private defineOutcomes(gap: any) {
          return [
            `Understand ${gap.category} best practices`,
            `Identify and fix ${gap.category} issues`,
            `Implement preventive measures`
          ];
        }

        private gatherResources(gaps: any[]) {
          return [
            {
              type: 'documentation',
              title: 'Internal Security Guidelines',
              url: 'https://docs.company.com/security',
              relevance: 'high'
            },
            {
              type: 'course',
              title: 'Secure Coding Practices',
              provider: 'Pluralsight',
              relevance: 'high'
            }
          ];
        }
      }

      const agent = new EducationalAgent();
      const result = await agent.analyze({
        prData: {},
        deepwikiContext: {},
        otherAgentFindings: [
          {
            role: 'security',
            findings: [{ severity: 'critical', description: 'SQL injection' }]
          }
        ],
        vectorContext: {}
      });

      expect(result.role).toBe('educational');
      expect(result.roleSpecificData.learningPaths).toHaveLength(1);
      expect(result.roleSpecificData.learningPaths[0].title).toContain('Security');
    });
  });

  describe('Reporting Agent Implementation', () => {
    it('should aggregate all agent reports into final output', async () => {
      class ReportingAgent {
        async analyze(context: {
          prData: any;
          deepwikiContext: any;
          agentReports: any[];
          vectorContext: any;
        }) {
          const { agentReports, deepwikiContext } = context;

          // Aggregate all findings
          const allFindings = this.aggregateFindings(agentReports);
          const executiveSummary = this.createExecutiveSummary(agentReports, deepwikiContext);
          const prioritizedActions = this.prioritizeActions(agentReports);
          const metrics = this.calculateMetrics(agentReports);

          return {
            role: 'reporting',
            status: 'completed',
            confidence: this.calculateOverallConfidence(agentReports),
            findings: [], // Reporting agent doesn't have its own findings
            summary: {
              overallAssessment: executiveSummary,
              issueCount: this.countAllIssues(agentReports),
              keyInsights: this.extractKeyInsights(agentReports)
            },
            recommendations: prioritizedActions,
            contextsUsed: {
              deepwiki: true,
              tools: [],
              vectorDb: false,
              crossRepo: false
            },
            duration: 500,
            timestamp: new Date().toISOString(),
            roleSpecificData: {
              executiveReport: {
                summary: executiveSummary,
                criticalFindings: allFindings.filter(f => f.severity === 'critical'),
                metrics,
                agentSummaries: this.summarizeAgents(agentReports),
                nextSteps: prioritizedActions.slice(0, 5)
              },
              visualizations: this.generateVisualizations(metrics),
              exportFormats: ['markdown', 'pdf', 'json']
            }
          };
        }

        private aggregateFindings(reports: any[]) {
          return reports.flatMap(r => r.findings || []);
        }

        private createExecutiveSummary(reports: any[], deepwiki: any) {
          const criticalCount = reports.reduce((sum, r) => 
            sum + (r.findings?.filter((f: any) => f.severity === 'critical').length || 0), 0
          );

          const securityReport = reports.find(r => r.role === 'security');
          const qualityReport = reports.find(r => r.role === 'codeQuality');

          let summary = `Analysis of ${deepwiki.repositoryName || 'repository'} `;
          
          if (criticalCount > 0) {
            summary += `found ${criticalCount} critical issues requiring immediate attention. `;
          } else {
            summary += `found no critical issues. `;
          }

          if (securityReport?.summary?.score < 5) {
            summary += 'Security posture needs significant improvement. ';
          }

          if (qualityReport?.summary?.overallAssessment) {
            summary += qualityReport.summary.overallAssessment;
          }

          return summary;
        }

        private prioritizeActions(reports: any[]) {
          // Collect all recommendations
          const allRecs = reports.flatMap(r => r.recommendations || []);
          
          // Sort by priority and impact
          return allRecs.sort((a, b) => {
            const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 99;
            const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 99;
            
            if (aPriority !== bPriority) return aPriority - bPriority;
            
            // If same priority, sort by impact
            const impactOrder = { high: 0, medium: 1, low: 2 };
            const aImpact = impactOrder[a.impact as keyof typeof impactOrder] || 99;
            const bImpact = impactOrder[b.impact as keyof typeof impactOrder] || 99;
            
            return aImpact - bImpact;
          });
        }

        private calculateMetrics(reports: any[]) {
          return {
            overallScore: this.calculateOverallScore(reports),
            categoryScores: {
              security: reports.find(r => r.role === 'security')?.summary?.score || 0,
              codeQuality: reports.find(r => r.role === 'codeQuality')?.summary?.score || 0,
              architecture: reports.find(r => r.role === 'architecture')?.dependencyHealth?.score || 0,
              performance: reports.find(r => r.role === 'performance')?.scoreAnalysis?.performance?.score || 0
            },
            issueDistribution: this.countAllIssues(reports),
            confidenceLevel: this.calculateOverallConfidence(reports),
            analysisCompleteness: reports.length / 7 // Out of 7 possible agents
          };
        }

        private calculateOverallScore(reports: any[]) {
          const scores = reports
            .map(r => r.summary?.score || r.roleSpecificData?.securityScore || 0)
            .filter(s => s > 0);
          
          if (scores.length === 0) return 5; // Default middle score
          
          return scores.reduce((sum, score) => sum + score, 0) / scores.length;
        }

        private calculateOverallConfidence(reports: any[]) {
          const confidences = reports.map(r => r.confidence || r.confidenceScore || 0.5);
          return confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
        }

        private countAllIssues(reports: any[]) {
          const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
          
          reports.forEach(report => {
            if (report.summary?.issueCount) {
              Object.entries(report.summary.issueCount).forEach(([severity, count]) => {
                counts[severity as keyof typeof counts] += count as number;
              });
            }
          });
          
          return counts;
        }

        private extractKeyInsights(reports: any[]) {
          const insights: string[] = [];
          
          // Add top insight from each agent
          reports.forEach(report => {
            if (report.summary?.keyInsights?.[0]) {
              insights.push(`${report.role}: ${report.summary.keyInsights[0]}`);
            }
          });
          
          return insights.slice(0, 5); // Top 5 insights
        }

        private summarizeAgents(reports: any[]) {
          return reports.map(r => ({
            role: r.role,
            status: r.status || 'completed',
            findingsCount: r.findings?.length || 0,
            confidence: r.confidence || r.confidenceScore || 0,
            keyInsight: r.summary?.keyInsights?.[0] || r.summary?.overallAssessment || 'No insights'
          }));
        }

        private generateVisualizations(metrics: any) {
          return {
            severityChart: {
              type: 'pie',
              data: metrics.issueDistribution
            },
            scoreRadar: {
              type: 'radar',
              data: metrics.categoryScores
            },
            confidenceGauge: {
              type: 'gauge',
              value: metrics.confidenceLevel
            }
          };
        }
      }

      const reporter = new ReportingAgent();
      const result = await reporter.analyze({
        prData: {},
        deepwikiContext: { repositoryName: 'test-repo' },
        agentReports: [
          {
            role: 'security',
            confidence: 0.9,
            findings: [{ severity: 'critical' }],
            summary: { 
              score: 3,
              issueCount: { critical: 1, high: 0, medium: 0, low: 0, info: 0 },
              keyInsights: ['Critical SQL injection found']
            },
            recommendations: [{ priority: 'critical', action: 'Fix SQL injection' }]
          },
          {
            role: 'codeQuality',
            confidence: 0.85,
            findings: [],
            summary: {
              overallAssessment: 'Code quality is moderate',
              issueCount: { critical: 0, high: 0, medium: 2, low: 1, info: 0 }
            }
          }
        ],
        vectorContext: {}
      });

      expect(result.role).toBe('reporting');
      expect(result.roleSpecificData.executiveReport.summary).toContain('1 critical issues');
      expect(result.roleSpecificData.executiveReport.criticalFindings).toHaveLength(1);
      expect(result.roleSpecificData.visualizations).toBeDefined();
    });
  });

  describe('Agent Failure Handling', () => {
    it('should handle partial agent failures gracefully', async () => {
      const handleAgentFailures = (agentResults: any[]) => {
        const successful = agentResults.filter(r => r.status === 'completed');
        const failed = agentResults.filter(r => r.status === 'failed');
        const partial = agentResults.filter(r => r.status === 'partial');

        // Determine if we can proceed
        const criticalAgents = ['security'];
        const criticalFailed = failed.some(r => criticalAgents.includes(r.role));

        if (criticalFailed) {
          return {
            canProceed: false,
            reason: 'Critical agent failed',
            fallback: 'manual-review'
          };
        }

        // Check if we have minimum viable analysis
        const minRequiredAgents = 3;
        if (successful.length < minRequiredAgents) {
          return {
            canProceed: false,
            reason: 'Insufficient agents completed',
            fallback: 'retry-failed'
          };
        }

        return {
          canProceed: true,
          warnings: [
            `${failed.length} agents failed`,
            `${partial.length} agents completed partially`
          ],
          adjustedConfidence: Math.max(0.3, 1.0 - (failed.length * 0.2))
        };
      };

      const results = [
        { role: 'security', status: 'completed' },
        { role: 'codeQuality', status: 'completed' },
        { role: 'performance', status: 'failed' },
        { role: 'architecture', status: 'partial' }
      ];

      const decision = handleAgentFailures(results);
      
      expect(decision.canProceed).toBe(true);
      expect(decision.warnings).toHaveLength(2);
    });
  });
});
