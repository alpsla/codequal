import { Router, Request, Response } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth-middleware';
import { getSupabase } from '@codequal/database/supabase/client';
import { normalizeRepositoryUrl } from '../utils/repository-utils';
import { HtmlReportGeneratorV5 } from '../services/html-report-generator-v5';
import { ResultOrchestrator } from '../services/result-orchestrator';
import { createLogger } from '@codequal/core/utils';
import Stripe from 'stripe';

const router = Router();
const logger = createLogger('RealPRAnalysis');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

// Mock PR analysis endpoint that returns a complete HTML report
router.post('/mock-pr-analysis', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { repositoryUrl, prNumber } = req.body;

    if (!repositoryUrl || !prNumber) {
      return res.status(400).json({ error: 'Repository URL and PR number are required' });
    }
    
    // Normalize the repository URL for consistent comparison
    const normalizedUrl = normalizeRepositoryUrl(repositoryUrl);

    // Check payment method and billing (same as simple-scan)
    const { data: paymentMethods } = await getSupabase()
      .from('payment_methods')
      .select('stripe_payment_method_id')
      .eq('user_id', user.id)
      .limit(1);
    
    const hasPaymentMethod = paymentMethods && paymentMethods.length > 0;

    const { data: billing } = await getSupabase()
      .from('user_billing')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const trialScansUsed = (billing?.trial_scans_used as number) || 0;
    const trialScansLimit = (billing?.trial_scans_limit as number) || 10;
    const canUseTrial = trialScansUsed < trialScansLimit;

    if (!hasPaymentMethod && !canUseTrial) {
      return res.status(403).json({
        error: 'Trial limit reached',
        code: 'TRIAL_LIMIT_REACHED',
        details: {
          scans_used: trialScansUsed,
          scans_limit: trialScansLimit,
          message: 'Please add a payment method to continue scanning.'
        }
      });
    }

    // Check if this is the user's trial repository
    const { data: trialRepo } = await getSupabase()
      .from('user_trial_repository')
      .select('repository_url')
      .eq('user_id', user.id)
      .single();

    // If user is on trial and has selected a different repository
    if (!hasPaymentMethod && trialRepo?.repository_url && trialRepo.repository_url !== normalizedUrl) {
      return res.status(403).json({
        error: 'Trial limited to one repository',
        code: 'TRIAL_REPOSITORY_LIMIT',
        details: {
          selected_repository: trialRepo.repository_url,
          requested_repository: normalizedUrl,
          message: `Your trial is limited to ${trialRepo.repository_url}. Add a payment method to scan other repositories.`
        }
      });
    }

    // If this is the first scan and user is on trial, set it as their trial repository
    if (!hasPaymentMethod && !trialRepo) {
      const { error: updateError } = await getSupabase()
        .from('user_trial_repository')
        .upsert({
          user_id: user.id,
          repository_url: normalizedUrl,
          selected_at: new Date().toISOString()
        });

      if (updateError) {
        console.error('Failed to set trial repository:', updateError);
        // Continue anyway - don't block the scan
      } else {
        console.log(`Set trial repository for user ${user.id}: ${normalizedUrl}`);
      }
    }

    // Generate analysis ID
    const analysisId = `abc-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 3)}`;
    
    // Handle billing
    if (hasPaymentMethod && billing?.stripe_customer_id) {
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: 50, // $0.50
          currency: 'usd',
          customer: billing.stripe_customer_id as string,
          payment_method: paymentMethods[0].stripe_payment_method_id as string,
          confirm: true,
          off_session: true,
          description: `PR analysis: ${repositoryUrl} #${prNumber}`,
          metadata: {
            user_id: user.id,
            repository_url: repositoryUrl,
            pr_number: prNumber.toString(),
            analysis_id: analysisId
          }
        });
        
        console.log(`Charged $0.50 for PR analysis: ${paymentIntent.id}`);
      } catch (error) {
        console.error('Payment failed:', error);
      }
    } else {
      await getSupabase()
        .from('user_billing')
        .update({ 
          trial_scans_used: trialScansUsed + 1
        })
        .eq('user_id', user.id);
    }

    // Generate full report data
    const fullReport = {
      id: analysisId,
      repository_url: repositoryUrl,
      pr_number: prNumber,
      analysis_date: new Date().toISOString(),
      overall_score: 42,
      decision: {
        status: 'BLOCKED',
        reason: 'Critical security vulnerabilities detected that must be resolved before merging',
        confidence: 95
      },
      pr_issues: {
        critical: [
          {
            severity: 'critical',
            title: 'SQL Injection Vulnerability',
            description: 'User input is directly concatenated into SQL query without sanitization.',
            file: 'src/api/users.ts',
            line: 42,
            recommendation: 'Use parameterized queries or prepared statements to prevent SQL injection.',
            codeSnippet: `const query = "SELECT * FROM users WHERE id = " + req.params.id;
db.query(query, (err, results) => {
  // This is vulnerable to SQL injection
});`
          },
          {
            severity: 'critical',
            title: 'Command Injection Risk',
            description: 'User input passed directly to shell command execution.',
            file: 'src/utils/backup.ts',
            line: 78,
            recommendation: 'Sanitize inputs and use spawn with argument arrays instead of exec.',
            codeSnippet: `exec('tar -czf backup.tar.gz ' + userProvidedPath, (err, stdout) => {
  // Vulnerable to command injection
});`
          }
        ],
        high: [
          {
            severity: 'high',
            title: 'Exposed API keys in configuration',
            description: 'API keys found in configuration file should be moved to environment variables.',
            file: 'config/settings.js',
            line: 15,
            recommendation: 'Move sensitive credentials to environment variables and add config file to .gitignore.',
            codeSnippet: `export const config = {
  apiKey: 'sk-1234567890abcdef',  // NEVER commit secrets!
  dbPassword: 'admin123'           // This is a security risk
};`
          },
          {
            severity: 'high',
            title: 'Missing Authentication Middleware',
            description: 'API endpoint lacks authentication checks.',
            file: 'src/api/admin.ts',
            line: 23,
            recommendation: 'Add authentication middleware to protect sensitive endpoints.',
            codeSnippet: `router.post('/admin/users', async (req, res) => {
  // No authentication check!
  const users = await db.getAllUsers();
  res.json(users);
});`
          }
        ],
        medium: [
          {
            severity: 'medium',
            title: 'Complex function',
            description: 'Function has cyclomatic complexity of 12, consider refactoring.',
            file: 'src/api/users.ts',
            line: 89,
            recommendation: 'Break down into smaller, more focused functions.',
            codeSnippet: `function processUserData(user, options, config, permissions) {
  if (user.type === 'admin') {
    if (options.fullAccess) {
      // Complex nested logic...
    }
  }
  // More complex conditions...
}`
          },
          {
            severity: 'medium',
            title: 'Inefficient Database Query',
            description: 'N+1 query pattern detected in user listing.',
            file: 'src/services/userService.ts',
            line: 145,
            recommendation: 'Use joins or data loader pattern to optimize queries.',
            codeSnippet: `const users = await User.findAll();
for (const user of users) {
  // This causes N+1 queries!
  user.posts = await Post.findByUserId(user.id);
}`
          }
        ],
        low: [
          {
            severity: 'low',
            title: 'Missing Error Handling',
            description: 'Async operation without proper error handling.',
            file: 'src/utils/cache.ts',
            line: 34,
            recommendation: 'Add try-catch blocks or .catch() handlers.',
            codeSnippet: `// Missing error handling
cache.set(key, value);
await saveToDatabase(key, value);`
          },
          {
            severity: 'low',
            title: 'Console.log in Production Code',
            description: 'Debug logging should be removed or use proper logger.',
            file: 'src/middleware/logger.ts',
            line: 67,
            recommendation: 'Use a proper logging library like winston or pino.',
            codeSnippet: `console.log('User data:', userData);
console.log('Request completed');`
          }
        ]
      },
      repository_issues: {
        high: [
          {
            severity: 'high',
            title: 'No Security Policy',
            description: 'Repository lacks SECURITY.md file for vulnerability reporting.',
            recommendation: 'Add a security policy to guide responsible disclosure.',
            codeSnippet: `# SECURITY.md example:
## Reporting Security Vulnerabilities
Please email security@example.com with:
- Description of the vulnerability
- Steps to reproduce
- Potential impact`
          },
          {
            severity: 'high',
            title: 'Outdated Dependencies',
            description: '14 dependencies are severely outdated with known vulnerabilities.',
            recommendation: 'Run npm audit fix and update critical dependencies.',
            codeSnippet: `"dependencies": {
  "express": "^4.17.1",  // Latest: 4.18.2
  "lodash": "^4.17.15",  // Vulnerability CVE-2021-23337
  "axios": "^0.21.1"     // Multiple vulnerabilities
}`
          }
        ],
        medium: [
          {
            severity: 'medium',
            title: 'Missing CI/CD Pipeline',
            description: 'No automated testing or deployment pipeline configured.',
            recommendation: 'Set up GitHub Actions or similar CI/CD solution.',
            codeSnippet: `# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm test`
          },
          {
            severity: 'medium',
            title: 'Incomplete Test Coverage',
            description: 'Test coverage is only 34%, well below recommended 80%.',
            recommendation: 'Add unit and integration tests for critical paths.',
            codeSnippet: `Coverage Summary:
- Statements: 34.2% (856/2502)
- Branches: 28.9% (178/616)
- Functions: 41.5% (234/564)
- Lines: 33.8% (812/2403)`
          }
        ]
      },
      recommendations: [
        {
          priority: 'critical',
          title: 'Fix SQL Injection Vulnerabilities',
          description: 'Replace all string concatenated queries with parameterized queries.',
          effort: '2-4 hours',
          impact: 'Prevents database compromise and data theft'
        },
        {
          priority: 'high',
          title: 'Implement Security Headers',
          description: 'Add helmet.js middleware to set security headers.',
          effort: '30 minutes',
          impact: 'Protects against common web vulnerabilities'
        },
        {
          priority: 'high',
          title: 'Set Up Environment Variables',
          description: 'Move all secrets to .env file and use dotenv.',
          effort: '1 hour',
          impact: 'Prevents credential exposure in version control'
        },
        {
          priority: 'medium',
          title: 'Add Input Validation',
          description: 'Implement joi or express-validator for all endpoints.',
          effort: '4-6 hours',
          impact: 'Prevents malformed data and injection attacks'
        }
      ],
      deepwiki: {
        summary: 'This PR introduces new user management features but contains critical security vulnerabilities that must be addressed before merging. The code shows patterns that could lead to data breaches and system compromise.',
        changes: [
          { file: 'src/api/users.ts', additions: 125, deletions: 45, type: 'modified' },
          { file: 'config/settings.js', additions: 20, deletions: 5, type: 'modified' },
          { file: 'src/utils/validation.ts', additions: 200, deletions: 0, type: 'added' },
          { file: 'src/utils/backup.ts', additions: 89, deletions: 12, type: 'modified' },
          { file: 'src/api/admin.ts', additions: 156, deletions: 0, type: 'added' }
        ]
      },
      agents: {
        security: {
          score: 10,
          findings: [
            {
              severity: 'critical',
              title: 'SQL Injection Vulnerability',
              description: 'User input is directly concatenated into SQL query without sanitization.',
              file: 'src/api/users.ts',
              line: 42,
              recommendation: 'Use parameterized queries or prepared statements to prevent SQL injection.'
            },
            {
              severity: 'high',
              title: 'Exposed API keys in configuration',
              description: 'API keys found in configuration file should be moved to environment variables.',
              file: 'config/settings.js',
              line: 15,
              recommendation: 'Move sensitive credentials to environment variables and add config file to .gitignore.'
            }
          ]
        },
        codeQuality: {
          score: 75,
          findings: [
            {
              severity: 'medium',
              title: 'Complex function',
              description: 'Function has cyclomatic complexity of 12, consider refactoring.',
              file: 'src/api/users.ts',
              line: 89
            }
          ]
        },
        performance: {
          score: 65,
          findings: [
            {
              severity: 'medium',
              title: 'Inefficient Database Queries',
              description: 'Multiple N+1 query patterns detected.',
              file: 'src/services/userService.ts',
              line: 145
            }
          ]
        },
        architecture: {
          score: 72,
          findings: [
            {
              severity: 'medium',
              title: 'Tight Coupling',
              description: 'Business logic mixed with API routes.',
              file: 'src/api/users.ts',
              recommendation: 'Separate concerns using service layer pattern.'
            }
          ]
        },
        dependencies: {
          score: 45,
          findings: [
            {
              severity: 'high',
              title: 'Vulnerable Dependencies',
              description: '14 dependencies with known security vulnerabilities.',
              recommendation: 'Run npm audit fix to update vulnerable packages.'
            }
          ]
        }
      },
      tools: {
        eslint: {
          findings: 47,
          criticalIssues: 0
        },
        semgrep: {
          findings: 12,
          criticalIssues: 2
        },
        snyk: {
          findings: 14,
          criticalIssues: 3
        }
      },
      educational: {
        title: 'Security Best Practices',
        modules: [
          {
            title: 'SQL Injection Prevention',
            content: 'SQL injection is one of the most common web vulnerabilities. Learn how to prevent it using parameterized queries, stored procedures, and input validation.',
            resources: [
              { title: 'OWASP SQL Injection Prevention', url: 'https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html' },
              { title: 'Node.js Security Best Practices', url: 'https://nodejs.org/en/docs/guides/security/' }
            ],
            codeExample: `// Bad - Vulnerable to SQL injection
const query = "SELECT * FROM users WHERE id = " + userId;

// Good - Using parameterized query
const query = "SELECT * FROM users WHERE id = ?";
db.query(query, [userId], callback);`
          },
          {
            title: 'Environment Variables',
            content: 'Never commit secrets to version control. Use environment variables to manage configuration.',
            resources: [
              { title: 'The Twelve-Factor App - Config', url: 'https://12factor.net/config' },
              { title: 'dotenv Documentation', url: 'https://www.npmjs.com/package/dotenv' }
            ],
            codeExample: `// Bad - Hardcoded secrets
const apiKey = 'sk-1234567890';

// Good - Using environment variables
const apiKey = process.env.API_KEY;`
          }
        ],
        tips: [
          'Always validate and sanitize user input before using in database queries',
          'Store sensitive configuration in environment variables, not in code',
          'Consider using an ORM or query builder to prevent SQL injection',
          'Implement rate limiting to prevent brute force attacks',
          'Use HTTPS for all production deployments',
          'Keep dependencies up to date with regular audits'
        ]
      }
    };

    // Generate HTML report
    const htmlGenerator = new HtmlReportGeneratorV5();
    const htmlReport = htmlGenerator.generateEnhancedHtmlReport(fullReport);

    // Store the report in the database
    const { error: insertError } = await getSupabase()
      .from('analysis_reports')
      .insert({
        id: analysisId,
        user_id: user.id,
        repository_url: repositoryUrl,
        pr_number: prNumber,
        report_data: fullReport,
        metadata: {
          is_mock: true,
          generated_at: new Date().toISOString()
        }
      });

    if (insertError) {
      console.error('Failed to store report:', insertError);
      // Fall back to temporary storage
      const { storeReportTemporarily } = require('./analysis-reports');
      storeReportTemporarily(analysisId, {
        ...fullReport,
        repositoryUrl,
        prNumber,
        timestamp: new Date().toISOString()
      });
    }

    // Return JSON response with the HTML report embedded
    res.json({
      analysisId,
      status: 'complete',
      htmlReport: htmlReport,
      repository: {
        url: repositoryUrl,
        name: repositoryUrl.split('/').slice(-2).join('/'),
        primaryLanguage: 'TypeScript'
      },
      pr: {
        number: prNumber,
        title: 'Feature Implementation',
        filesChanged: 12,
        additions: 345,
        deletions: 123,
        branch: 'feature/awesome-feature'
      }
    });

  } catch (error) {
    console.error('Mock PR analysis error:', error);
    res.status(500).json({ 
      error: 'Analysis failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Simple test endpoint that returns mock data quickly
router.post('/test-analysis', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { repositoryUrl, prNumber } = req.body;

    logger.info('Test analysis endpoint called', { repositoryUrl, prNumber });

    // Generate a test report with some data
    const analysisId = `test-${Date.now().toString(36)}`;
    
    const testReport = {
      id: analysisId,
      repository_url: repositoryUrl,
      pr_number: prNumber,
      analysis_date: new Date().toISOString(),
      overall_score: 35,  // Low score due to critical security issues
      decision: {
        status: 'BLOCKED',
        reason: 'Critical security vulnerabilities detected that must be resolved before merging',
        confidence: 95
      },
      pr_issues: {
        critical: [
          {
            title: 'SQL Injection Vulnerability',
            description: 'Direct user input concatenation in SQL query',
            file: 'src/database.js',
            line: 45,
            type: 'security',
            severity: 'critical',
            recommendation: 'Use parameterized queries or prepared statements'
          }
        ],
        high: [
          {
            title: 'Missing Authentication',
            description: 'API endpoint lacks authentication middleware',
            file: 'src/api/admin.js',
            line: 23,
            type: 'security',
            severity: 'high',
            recommendation: 'Add authentication middleware before processing requests'
          }
        ],
        medium: [
          {
            title: 'Missing Error Handling',
            description: 'Async operation without try-catch',
            file: 'src/api.js',
            line: 123,
            type: 'code_quality',
            severity: 'medium',
            recommendation: 'Add proper error handling'
          }
        ],
        low: []
      },
      repository_issues: {
        high: [],
        medium: []
      },
      prDetails: {
        title: 'Test PR Analysis',
        changed_files: 5,
        additions: 150,
        deletions: 45
      }
    };

    // Generate HTML
    const htmlGenerator = new HtmlReportGeneratorV5();
    const htmlReport = htmlGenerator.generateEnhancedHtmlReport(testReport);

    // Store report
    const { storeReportTemporarily } = require('./analysis-reports');
    storeReportTemporarily(analysisId, testReport);

    res.json({
      analysisId,
      status: 'complete',
      htmlReport,
      repository: {
        url: repositoryUrl,
        name: repositoryUrl.split('/').slice(-2).join('/')
      },
      pr: {
        number: prNumber,
        title: 'Test PR',
        filesChanged: 5,
        additions: 150,
        deletions: 45
      },
      summary: {
        score: 78,
        decision: testReport.decision,
        issues: {
          critical: 0,
          high: 1,
          medium: 1,
          low: 0
        }
      }
    });

  } catch (error) {
    logger.error('Test analysis error:', { error });
    res.status(500).json({ error: 'Test analysis failed' });
  }
});

// Real PR analysis endpoint
router.post('/real-pr-analysis', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { repositoryUrl, prNumber } = req.body;

    if (!repositoryUrl || !prNumber) {
      return res.status(400).json({ error: 'Repository URL and PR number are required' });
    }

    logger.info('Starting real PR analysis', { repositoryUrl, prNumber, userId: user.id });

    // Check billing and trial limits (same as mock analysis)
    const { data: billing } = await getSupabase()
      .from('user_billing')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const subscriptionTier = billing?.subscription_tier || 'free';
    const trialScansUsed = (billing?.trial_scans_used as number) || 0;
    const trialScansLimit = (billing?.trial_scans_limit as number) || 10;
    const canUseTrial = trialScansUsed < trialScansLimit;

    // Check payment method
    const { data: paymentMethods } = await getSupabase()
      .from('payment_methods')
      .select('stripe_payment_method_id')
      .eq('user_id', user.id)
      .limit(1);
    
    const hasPaymentMethod = paymentMethods && paymentMethods.length > 0;

    if (subscriptionTier === 'free' && !canUseTrial && !hasPaymentMethod) {
      return res.status(403).json({
        error: 'Trial limit reached',
        details: {
          scans_used: trialScansUsed,
          scans_limit: trialScansLimit
        }
      });
    }

    // Generate analysis ID
    const analysisId = `real-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 3)}`;

    // Initialize ResultOrchestrator
    const orchestrator = new ResultOrchestrator(user);

    // Start real analysis
    logger.info('Calling ResultOrchestrator.analyzePR', { 
      repositoryUrl, 
      prNumber, 
      analysisMode: 'comprehensive' 
    });

    const result = await orchestrator.analyzePR({
      repositoryUrl,
      prNumber,
      analysisMode: 'comprehensive',
      authenticatedUser: user,
      githubToken: process.env.GITHUB_TOKEN // Use system token for now
    });

    logger.info('Analysis complete', { 
      analysisId,
      totalFindings: result.analysis.totalFindings,
      agentsUsed: result.analysis.agentsUsed,
      processingTime: result.analysis.processingTime
    });

    // Transform result to match report generator format
    const reportData = {
      id: analysisId,
      repository_url: repositoryUrl,
      pr_number: prNumber,
      analysis_date: new Date().toISOString(),
      overall_score: 75, // Default score
      decision: {
        status: 'APPROVED',
        reason: 'Analysis complete',
        confidence: 80
      },
      pr_issues: {
        critical: result.findings?.security?.filter((f: any) => f.severity === 'critical') || [],
        high: result.findings?.security?.filter((f: any) => f.severity === 'high') || [],
        medium: result.findings?.codeQuality?.filter((f: any) => f.severity === 'medium') || [],
        low: result.findings?.codeQuality?.filter((f: any) => f.severity === 'low') || []
      },
      repository_issues: {
        high: [], // We'll need to map these from result
        medium: []
      },
      agents: result.analysis?.agentsUsed || [],
      prDetails: {
        title: result.pr?.title || 'Unknown',
        changed_files: result.pr?.changedFiles || 0,
        additions: 0,
        deletions: 0,
        head: { ref: 'unknown' }
      },
      educational: { modules: [] }
    };

    // Generate HTML report using V5 generator
    const htmlGenerator = new HtmlReportGeneratorV5();
    const htmlReport = htmlGenerator.generateEnhancedHtmlReport(reportData);

    // Store the report
    const { storeReportTemporarily } = require('./analysis-reports');
    storeReportTemporarily(analysisId, reportData);

    // Handle billing (charge if needed)
    const shouldCharge = (subscriptionTier === 'free' && !canUseTrial) || 
                        (subscriptionTier === 'individual' && hasPaymentMethod);
    
    if (shouldCharge && hasPaymentMethod && billing?.stripe_customer_id) {
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: 50, // $0.50 in cents
          currency: 'usd',
          customer: billing.stripe_customer_id as string,
          payment_method: paymentMethods[0].stripe_payment_method_id as string,
          confirm: true,
          off_session: true,
          description: `Real PR analysis: ${repositoryUrl}#${prNumber}`,
          metadata: {
            user_id: user.id,
            repository_url: repositoryUrl,
            pr_number: prNumber.toString(),
            analysis_id: analysisId,
            analysis_type: 'real'
          }
        });
        
        logger.info(`Charged $0.50 for real PR analysis: ${paymentIntent.id}`);
      } catch (error) {
        logger.error('Payment failed:', { error });
      }
    }

    // Update trial usage if applicable
    if (subscriptionTier === 'free' && canUseTrial) {
      await getSupabase()
        .from('user_billing')
        .update({ 
          trial_scans_used: trialScansUsed + 1
        })
        .eq('user_id', user.id);
    }

    // Return the analysis result
    res.json({
      analysisId,
      status: 'complete',
      htmlReport,
      repository: {
        url: repositoryUrl,
        name: repositoryUrl.split('/').slice(-2).join('/')
      },
      pr: {
        number: prNumber,
        title: result.pr?.title || 'Unknown',
        filesChanged: result.pr?.changedFiles || 0,
        additions: 0,
        deletions: 0,
        branch: 'unknown'
      },
      summary: {
        score: reportData.overall_score,
        decision: reportData.decision,
        issues: {
          critical: reportData.pr_issues.critical.length,
          high: reportData.pr_issues.high.length,
          medium: reportData.pr_issues.medium.length,
          low: reportData.pr_issues.low.length
        }
      }
    });

  } catch (error) {
    logger.error('Real PR analysis failed:', { error });
    res.status(500).json({ 
      error: 'Analysis failed', 
      details: error instanceof Error ? error.message : 'Unknown error',
      suggestion: 'Check if the PR exists and GitHub token has access'
    });
  }
});

// GitHub PR analysis endpoint using ResultOrchestrator
router.post('/github-pr-analysis', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { repositoryUrl, prNumber } = req.body;

    if (!repositoryUrl || !prNumber) {
      return res.status(400).json({ error: 'Repository URL and PR number are required' });
    }

    logger.info('Starting GitHub PR analysis with ResultOrchestrator', { repositoryUrl, prNumber });

    // Initialize ResultOrchestrator
    const orchestrator = new ResultOrchestrator(user);
    
    try {
      // Use the real PR analysis that leverages the full system
      const result = await orchestrator.analyzePR({
        repositoryUrl,
        prNumber,
        analysisMode: 'comprehensive',
        authenticatedUser: user,
        githubToken: process.env.GITHUB_TOKEN
      });

      logger.info('Analysis complete via ResultOrchestrator', { 
        analysisId: result.analysisId,
        totalFindings: result.analysis.totalFindings,
        agentsUsed: result.analysis.agentsUsed
      });

      // Transform the result into the expected format for HTML generator
      const reportData = {
        id: result.analysisId,
        repository_url: repositoryUrl,
        pr_number: prNumber,
        analysis_date: new Date().toISOString(),
        overall_score: result.metrics?.confidence || 75,
        decision: {
          status: result.report?.recommendations?.[0] || 'APPROVED',
          reason: result.report?.summary || 'Analysis complete',
          confidence: result.metrics?.confidence || 80
        },
        pr_issues: {
          critical: result.findings?.security?.filter((f: any) => f.severity === 'critical') || [],
          high: [...(result.findings?.security?.filter((f: any) => f.severity === 'high') || []),
                 ...(result.findings?.architecture?.filter((f: any) => f.severity === 'high') || [])],
          medium: [...(result.findings?.codeQuality?.filter((f: any) => f.severity === 'medium') || []),
                   ...(result.findings?.performance?.filter((f: any) => f.severity === 'medium') || [])],
          low: result.findings?.codeQuality?.filter((f: any) => f.severity === 'low') || []
        },
        repository_issues: {
          high: [],
          medium: []
        },
        prDetails: {
          title: result.pr?.title || 'Unknown',
          changed_files: result.pr?.changedFiles || 0,
          additions: 0,
          deletions: 0
        },
        educational: result.compiledEducationalData || { modules: [] },
        recommendations: result.recommendations || []
      };

      // Generate HTML report
      const htmlGenerator = new HtmlReportGeneratorV5();
      const htmlReport = htmlGenerator.generateEnhancedHtmlReport(reportData);

      // Store report
      const { storeReportTemporarily } = require('./analysis-reports');
      storeReportTemporarily(result.analysisId, reportData);

      res.json({
        analysisId: result.analysisId,
        status: 'complete',
        htmlReport,
        repository: result.repository,
        pr: result.pr,
        summary: {
          score: reportData.overall_score,
          decision: reportData.decision,
          issues: {
            critical: reportData.pr_issues.critical.length,
            high: reportData.pr_issues.high.length,
            medium: reportData.pr_issues.medium.length,
            low: reportData.pr_issues.low.length
          }
        }
      });

    } catch (orchestratorError: any) {
      // Check if it's because repository hasn't been analyzed yet
      if (orchestratorError.message?.includes('repository not found') || 
          orchestratorError.message?.includes('existsInVectorDB')) {
        logger.warn('Repository not analyzed by DeepWiki, returning error', { 
          repositoryUrl,
          error: orchestratorError.message 
        });
        
        return res.status(400).json({
          error: 'Repository not analyzed',
          code: 'REPOSITORY_NOT_ANALYZED',
          details: {
            message: 'This repository needs to be analyzed by DeepWiki first before PR analysis can be performed.',
            repositoryUrl,
            suggestion: 'Please run a full repository analysis first using the /api/scan endpoint'
          }
        });
      }
      
      throw orchestratorError;
    }

  } catch (error) {
    logger.error('GitHub PR analysis error:', { error });
    res.status(500).json({ 
      error: 'Analysis failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router;