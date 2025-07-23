import RepositoryAnalysisReportGenerator, { RepositoryAnalysisData } from './repository-analysis-report-generator';

// Example usage of the report generator
async function generateExampleReport() {
  const generator = new RepositoryAnalysisReportGenerator();
  
  // Sample data - in production, this would come from your analysis tools
  const analysisData: RepositoryAnalysisData = {
    repositoryUrl: 'https://github.com/codequal-dev/codequal',
    prNumber: 28958,
    prTitle: 'Implement Dynamic Model Selection',
    analysisDate: new Date(),
    analysisDuration: 52300, // milliseconds
    overallScore: 72,
    categoryScores: {
      security: 65,
      performance: 70,
      codeQuality: 78,
      architecture: 82,
      testing: 68,
      dependencies: 60
    },
    totalIssues: 287,
    issuesByPriority: {
      critical: 12,
      high: 34,
      medium: 98,
      low: 143
    },
    findings: {
      security: [
        {
          id: 'SEC-001',
          severity: 'CRITICAL',
          title: 'Hardcoded API Keys in Repository',
          description: 'API keys and credentials exposed in Kubernetes manifests',
          impact: 'Complete system compromise if repository is breached',
          cvssScore: 9.8,
          cwe: 'CWE-798',
          locations: [
            {
              file: 'k8s/deployments/production/api-deployment.yaml',
              lines: [23, 45, 67],
              snippet: '- name: API_KEY\n  value: "sk-1234567890abcdef"'
            }
          ],
          recommendation: 'Remove all hardcoded secrets immediately and use Kubernetes secrets'
        },
        {
          id: 'SEC-002',
          severity: 'CRITICAL',
          title: 'SQL Injection Vulnerabilities',
          description: 'Unparameterized queries allow database manipulation',
          impact: 'Database compromise, data exfiltration',
          cvssScore: 9.1,
          cwe: 'CWE-89',
          locations: [
            {
              file: 'packages/database/src/services/analysis-service.ts',
              lines: [234],
              snippet: 'const query = `SELECT * FROM analyses WHERE user_id = ${userId}`'
            }
          ],
          recommendation: 'Use parameterized queries exclusively'
        },
        {
          id: 'SEC-003',
          severity: 'HIGH',
          title: 'Missing CORS Configuration',
          description: 'API endpoints lack proper CORS configuration',
          impact: 'Potential for CSRF attacks',
          cvssScore: 7.1,
          cwe: 'CWE-346',
          locations: [
            {
              file: 'apps/api/src/middleware/cors.ts',
              lines: [8, 9, 10]
            }
          ],
          recommendation: 'Implement strict CORS policy with allowed origins whitelist'
        },
        {
          id: 'SEC-004',
          severity: 'HIGH',
          title: 'Weak JWT Secret',
          description: 'JWT secret is too short and predictable',
          impact: 'Token forgery possible',
          cvssScore: 7.5,
          locations: [
            {
              file: 'packages/core/src/config/auth.config.ts',
              lines: [12]
            }
          ],
          recommendation: 'Use cryptographically strong secret (min 256 bits)'
        },
        {
          id: 'SEC-005',
          severity: 'MEDIUM',
          title: 'Missing Rate Limiting',
          description: 'APIs vulnerable to brute force and DoS',
          impact: 'Service disruption, credential stuffing',
          cvssScore: 5.3,
          locations: [
            {
              file: 'apps/api/src/index.ts'
            }
          ],
          recommendation: 'Implement rate limiting middleware'
        },
        {
          id: 'SEC-006',
          severity: 'MEDIUM',
          title: 'Insufficient Input Validation',
          description: 'User inputs not properly validated',
          impact: 'Potential for injection attacks',
          cvssScore: 5.0,
          locations: [
            {
              file: 'apps/api/src/routes/analysis.ts',
              lines: [45, 67, 89]
            }
          ],
          recommendation: 'Add comprehensive input validation'
        },
        {
          id: 'SEC-007',
          severity: 'LOW',
          title: 'Missing Security Headers',
          description: 'Security headers not configured',
          impact: 'Minor security hardening missing',
          cvssScore: 3.1,
          locations: [
            {
              file: 'apps/api/src/middleware/security.ts'
            }
          ],
          recommendation: 'Add X-Frame-Options, X-Content-Type-Options headers'
        },
        {
          id: 'SEC-008',
          severity: 'LOW',
          title: 'Verbose Error Messages',
          description: 'Stack traces exposed in production',
          impact: 'Information disclosure',
          cvssScore: 2.5,
          locations: [
            {
              file: 'apps/api/src/middleware/error-handler.ts'
            }
          ],
          recommendation: 'Sanitize error messages in production'
        }
      ],
      performance: [
        {
          id: 'PERF-001',
          severity: 'CRITICAL',
          title: 'N+1 Query Problem',
          description: 'Loading analysis reports executes 147 separate database queries',
          impact: '3-5 second page load times',
          measurements: {
            current: '3200ms',
            target: '200ms',
            improvement: '90% reduction possible'
          },
          locations: [
            {
              file: 'packages/database/src/services/report-service.ts',
              lines: [145, 189],
              snippet: 'for (const finding of report.findings) {\n  finding.details = await FindingDetails.findById(finding.detailId);\n}'
            }
          ],
          recommendation: 'Use eager loading with .populate() or implement DataLoader'
        },
        {
          id: 'PERF-002',
          severity: 'HIGH',
          title: 'Large Bundle Size',
          description: 'Frontend bundle exceeds 2MB',
          impact: 'Slow initial page loads, poor mobile experience',
          measurements: {
            current: '2.3MB',
            target: '500KB',
            improvement: '78% reduction needed'
          },
          locations: [
            {
              file: 'apps/web/webpack.config.js'
            }
          ],
          recommendation: 'Implement code splitting and tree shaking'
        },
        {
          id: 'PERF-003',
          severity: 'HIGH',
          title: 'Memory Leak in WebSocket',
          description: 'Event listeners not cleaned up',
          impact: 'Browser crashes after extended use',
          measurements: {
            current: '50MB/hour leak',
            target: '0MB',
            improvement: 'Fix memory leak'
          },
          locations: [
            {
              file: 'apps/web/src/hooks/useWebSocket.ts',
              lines: [34, 45]
            }
          ],
          recommendation: 'Add cleanup in useEffect return'
        },
        {
          id: 'PERF-004',
          severity: 'MEDIUM',
          title: 'Missing Database Indexes',
          description: 'Common queries doing full table scans',
          impact: 'Slow queries as data grows',
          locations: [
            {
              file: 'migrations/001_initial.sql'
            }
          ],
          recommendation: 'Add indexes for repository_url and user_id columns'
        },
        {
          id: 'PERF-005',
          severity: 'MEDIUM',
          title: 'Inefficient Image Loading',
          description: 'Large images loaded without optimization',
          impact: 'Slow page loads',
          locations: [
            {
              file: 'apps/web/src/components/ImageGallery.tsx'
            }
          ],
          recommendation: 'Implement lazy loading and responsive images'
        },
        {
          id: 'PERF-006',
          severity: 'LOW',
          title: 'Unused CSS',
          description: '45% of CSS is unused',
          impact: 'Larger bundle than necessary',
          locations: [
            {
              file: 'apps/web/src/styles/main.css'
            }
          ],
          recommendation: 'Use PurgeCSS to remove unused styles'
        }
      ],
      codeQuality: [
        {
          id: 'QUAL-001',
          severity: 'HIGH',
          title: 'High Complexity Functions',
          description: '23 functions exceed complexity threshold of 10',
          impact: 'Hard to maintain and test',
          complexity: 24,
          locations: [
            {
              file: 'apps/api/src/services/result-orchestrator.ts',
              lines: [234, 456]
            }
          ],
          recommendation: 'Refactor into smaller, focused functions'
        }
      ],
      architecture: [
        {
          id: 'ARCH-001',
          severity: 'HIGH',
          title: 'Circular Dependencies',
          description: 'Packages have circular import dependencies',
          impact: 'Build failures, testing difficulties',
          pattern: 'Circular dependency chain',
          locations: [
            {
              file: 'packages/core/src/services/model-service.ts',
              lines: [12]
            }
          ],
          recommendation: 'Extract shared types to @codequal/types package'
        }
      ],
      testing: [
        {
          id: 'TEST-001',
          severity: 'CRITICAL',
          title: 'Missing Payment Flow Tests',
          description: 'Critical payment paths have no integration tests',
          impact: 'High risk of payment failures',
          coverage: 12,
          gaps: ['Stripe webhooks', 'Subscription lifecycle'],
          locations: [
            {
              file: 'apps/api/src/services/stripe-integration.ts'
            }
          ],
          recommendation: 'Add comprehensive payment integration tests'
        }
      ],
      dependencies: [
        {
          id: 'DEP-001',
          severity: 'CRITICAL',
          title: 'Vulnerable Dependencies',
          description: 'jsonwebtoken has a critical vulnerability that allows JWT bypass',
          package: 'jsonwebtoken',
          currentVersion: '8.5.1',
          recommendedVersion: '9.0.0',
          vulnerability: {
            cve: 'CVE-2022-23541',
            description: 'Weak verification allows JWT bypass'
          },
          impact: 'Authentication bypass possible',
          locations: [],
          recommendation: 'Update to jsonwebtoken@^9.0.0'
        }
      ]
    },
    metrics: {
      maintainabilityIndex: 72,
      technicalDebtRatio: 15.3,
      codeSmells: 234,
      duplicatedLines: 15.3,
      testCoverage: 68.4
    }
  };

  // Generate the report
  const markdown = generator.generateMarkdownReport(analysisData);
  console.log(markdown);
  
  // Save to file
  await generator.saveReport(analysisData, './reports');
}

// Run the example
generateExampleReport().catch(console.error);