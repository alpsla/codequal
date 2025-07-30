import { ComparisonAgent } from './comparison-agent';

describe('ComparisonAgent', () => {
  let agent: ComparisonAgent;
  
  beforeEach(() => {
    agent = new ComparisonAgent();
  });

  describe('Issue Comparison', () => {
    it('should identify fixed issues', async () => {
      const mainReport = {
        overall_score: 70,
        issues: [
          {
            id: 'SEC-001',
            title: 'SQL Injection',
            severity: 'critical' as const,
            category: 'security' as const,
            file_path: 'src/db.ts',
            line_number: 45,
            description: 'SQL injection vulnerability',
            code_snippet: 'query(`SELECT * FROM users WHERE id = ${id}`)',
            recommendation: 'Use parameterized queries'
          }
        ],
        metadata: {
          repository: 'test/repo',
          branch: 'main',
          commit: 'abc123',
          analysis_date: '2024-01-01',
          model_used: 'gpt-4o-mini'
        }
      };

      const featureReport = {
        overall_score: 75,
        issues: [], // Issue was fixed
        metadata: {
          repository: 'test/repo',
          branch: 'feature/fix-sql',
          commit: 'def456',
          analysis_date: '2024-01-01',
          model_used: 'gpt-4o-mini'
        }
      };

      const result = await agent.compare({
        mainBranchReport: mainReport,
        featureBranchReport: featureReport,
        prMetadata: {
          pr_number: 123,
          pr_title: 'Fix SQL injection',
          files_changed: ['src/db.ts'],
          lines_added: 10,
          lines_removed: 5
        }
      });

      expect(result.fixed_issues).toHaveLength(1);
      expect(result.fixed_issues[0].id).toBe('SEC-001');
      expect(result.new_issues).toHaveLength(0);
      expect(result.pr_decision.should_block).toBe(false);
    });

    it('should identify new critical issues and block PR', async () => {
      const mainReport = {
        overall_score: 75,
        issues: [],
        metadata: {
          repository: 'test/repo',
          branch: 'main',
          commit: 'abc123',
          analysis_date: '2024-01-01',
          model_used: 'gpt-4o-mini'
        }
      };

      const featureReport = {
        overall_score: 65,
        issues: [
          {
            id: 'SEC-002',
            title: 'Hardcoded API Key',
            severity: 'critical' as const,
            category: 'security' as const,
            file_path: 'src/config.ts',
            line_number: 12,
            description: 'API key exposed in source code',
            code_snippet: 'const API_KEY = "sk-1234567890"',
            recommendation: 'Use environment variables'
          }
        ],
        metadata: {
          repository: 'test/repo',
          branch: 'feature/new-api',
          commit: 'def456',
          analysis_date: '2024-01-01',
          model_used: 'gpt-4o-mini'
        }
      };

      const result = await agent.compare({
        mainBranchReport: mainReport,
        featureBranchReport: featureReport,
        prMetadata: {
          pr_number: 124,
          pr_title: 'Add new API integration',
          files_changed: ['src/config.ts', 'src/api.ts'],
          lines_added: 150,
          lines_removed: 0
        }
      });

      expect(result.new_issues).toHaveLength(1);
      expect(result.new_issues[0].id).toBe('SEC-002');
      expect(result.pr_decision.should_block).toBe(true);
      expect(result.pr_decision.blocking_issues).toHaveLength(1);
    });

    it('should detect moved issues', async () => {
      const mainReport = {
        overall_score: 70,
        issues: [
          {
            id: 'PERF-001',
            title: 'N+1 Query',
            severity: 'high' as const,
            category: 'performance' as const,
            file_path: 'src/services/user.ts',
            line_number: 100,
            description: 'N+1 query problem',
            code_snippet: 'for (const user of users) { await getProfile(user.id) }',
            recommendation: 'Batch queries'
          }
        ],
        metadata: {
          repository: 'test/repo',
          branch: 'main',
          commit: 'abc123',
          analysis_date: '2024-01-01',
          model_used: 'gpt-4o-mini'
        }
      };

      const featureReport = {
        overall_score: 70,
        issues: [
          {
            id: 'PERF-001',
            title: 'N+1 Query',
            severity: 'high' as const,
            category: 'performance' as const,
            file_path: 'src/services/user.ts',
            line_number: 120, // Moved 20 lines down
            description: 'N+1 query problem',
            code_snippet: 'for (const user of users) { await getProfile(user.id) }',
            recommendation: 'Batch queries'
          }
        ],
        metadata: {
          repository: 'test/repo',
          branch: 'feature/refactor',
          commit: 'def456',
          analysis_date: '2024-01-01',
          model_used: 'gpt-4o-mini'
        }
      };

      const result = await agent.compare({
        mainBranchReport: mainReport,
        featureBranchReport: featureReport,
        prMetadata: {
          pr_number: 125,
          pr_title: 'Refactor user service',
          files_changed: ['src/services/user.ts'],
          lines_added: 50,
          lines_removed: 30
        }
      });

      expect(result.moved_issues).toHaveLength(1);
      expect(result.moved_issues[0].old_location.line).toBe(100);
      expect(result.moved_issues[0].new_location.line).toBe(120);
      expect(result.insights.some(insight => insight.includes('moved due to code refactoring'))).toBe(true);
    });

    it('should calculate impact correctly', async () => {
      const mainReport = {
        overall_score: 70,
        issues: [
          {
            id: 'SEC-001',
            title: 'SQL Injection',
            severity: 'critical' as const,
            category: 'security' as const,
            file_path: 'src/db.ts',
            line_number: 45,
            description: 'SQL injection vulnerability',
            recommendation: 'Use parameterized queries'
          },
          {
            id: 'PERF-001',
            title: 'Slow Query',
            severity: 'medium' as const,
            category: 'performance' as const,
            file_path: 'src/api.ts',
            line_number: 200,
            description: 'Query takes too long',
            recommendation: 'Add index'
          }
        ],
        metadata: {
          repository: 'test/repo',
          branch: 'main',
          commit: 'abc123',
          analysis_date: '2024-01-01',
          model_used: 'gpt-4o-mini'
        }
      };

      const featureReport = {
        overall_score: 78,
        issues: [
          {
            id: 'PERF-001',
            title: 'Slow Query',
            severity: 'medium' as const,
            category: 'performance' as const,
            file_path: 'src/api.ts',
            line_number: 200,
            description: 'Query takes too long',
            recommendation: 'Add index'
          },
          {
            id: 'QUAL-001',
            title: 'Complex Function',
            severity: 'low' as const,
            category: 'quality' as const,
            file_path: 'src/utils.ts',
            line_number: 50,
            description: 'Function too complex',
            recommendation: 'Refactor'
          }
        ],
        metadata: {
          repository: 'test/repo',
          branch: 'feature/security-fix',
          commit: 'def456',
          analysis_date: '2024-01-01',
          model_used: 'gpt-4o-mini'
        }
      };

      const result = await agent.compare({
        mainBranchReport: mainReport,
        featureBranchReport: featureReport,
        prMetadata: {
          pr_number: 126,
          pr_title: 'Fix security issues',
          files_changed: ['src/db.ts', 'src/utils.ts'],
          lines_added: 100,
          lines_removed: 50
        }
      });

      // Security improved: fixed critical issue (10 points)
      expect(result.impact_analysis.security_impact).toBe(10);
      
      // Quality degraded: added low issue (-1 point)
      expect(result.impact_analysis.quality_impact).toBe(-1);
      
      // Overall score improved
      expect(result.impact_analysis.overall_impact).toBe(8);
    });

    it('should generate comprehensive final report', async () => {
      const mainReport = {
        overall_score: 70,
        issues: [
          {
            id: 'SEC-001',
            title: 'SQL Injection',
            severity: 'critical' as const,
            category: 'security' as const,
            file_path: 'src/db.ts',
            line_number: 45,
            description: 'SQL injection vulnerability',
            code_snippet: 'query(`SELECT * FROM users WHERE id = ${id}`)',
            recommendation: 'Use parameterized queries'
          },
          {
            id: 'PERF-001',
            title: 'N+1 Query',
            severity: 'high' as const,
            category: 'performance' as const,
            file_path: 'src/api.ts',
            line_number: 100,
            description: 'Multiple queries in loop',
            code_snippet: 'for (const item of items) { await fetch(item.id) }',
            recommendation: 'Batch queries'
          }
        ],
        metadata: {
          repository: 'test/repo',
          branch: 'main',
          commit: 'abc123',
          analysis_date: '2024-01-01',
          model_used: 'gpt-4o-mini'
        }
      };

      const featureReport = {
        overall_score: 75,
        issues: [
          {
            id: 'PERF-001',
            title: 'N+1 Query',
            severity: 'high' as const,
            category: 'performance' as const,
            file_path: 'src/api.ts',
            line_number: 100,
            description: 'Multiple queries in loop',
            code_snippet: 'for (const item of items) { await fetch(item.id) }',
            recommendation: 'Batch queries'
          },
          {
            id: 'QUAL-001',
            title: 'Complex Function',
            severity: 'medium' as const,
            category: 'quality' as const,
            file_path: 'src/utils.ts',
            line_number: 50,
            description: 'Cyclomatic complexity too high',
            code_snippet: 'function processData() { /* 50 lines */ }',
            recommendation: 'Split into smaller functions'
          }
        ],
        metadata: {
          repository: 'test/repo',
          branch: 'feature/fix-security',
          commit: 'def456',
          analysis_date: '2024-01-01',
          model_used: 'gpt-4o-mini'
        }
      };

      const result = await agent.compare({
        mainBranchReport: mainReport,
        featureBranchReport: featureReport,
        prMetadata: {
          pr_number: 127,
          pr_title: 'Security improvements',
          files_changed: ['src/db.ts', 'src/utils.ts'],
          lines_added: 100,
          lines_removed: 50
        }
      });

      // Verify final report structure
      expect(result.final_report).toBeDefined();
      
      // Repository analysis
      expect(result.final_report.repository_analysis.total_issues).toBe(2);
      expect(result.final_report.repository_analysis.overall_score).toBe(75);
      expect(result.final_report.repository_analysis.all_issues).toHaveLength(2);
      expect(result.final_report.repository_analysis.issues_by_severity).toEqual({
        critical: 0,
        high: 1,
        medium: 1,
        low: 0
      });
      expect(result.final_report.repository_analysis.issues_by_category).toEqual({
        performance: 1,
        quality: 1
      });

      // PR impact
      expect(result.final_report.pr_impact.issues_fixed).toBe(1); // Fixed SEC-001
      expect(result.final_report.pr_impact.issues_introduced).toBe(1); // Added QUAL-001
      expect(result.final_report.pr_impact.score_change).toBe(5);
      expect(result.final_report.pr_impact.percentage_improvement).toBe(7.14); // 5/70 * 100

      // Prioritized issues
      expect(result.final_report.prioritized_issues).toHaveLength(2);
      // The new issue (QUAL-001) should be prioritized higher
      const newIssue = result.final_report.prioritized_issues.find(p => p.status === 'new');
      expect(newIssue).toBeDefined();
      expect(newIssue?.issue.id).toBe('QUAL-001');
      
      // Recommendations - may not have any if no significant issues
      if (result.final_report.recommendations.length > 0) {
        const securityRec = result.final_report.recommendations.find(r => r.category === 'security');
        expect(securityRec).toBeUndefined(); // No security issues remain
      }
    });
  });
});