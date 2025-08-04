#!/usr/bin/env ts-node

/**
 * Test Comprehensive Report Generation with Mocked Issues
 * 
 * This script generates a comprehensive PR report using mocked DeepWiki API data
 * to demonstrate the full template format with detailed issue sections
 */

import * as dotenv from 'dotenv';
import { join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

// Import the new ReportGeneratorV3 with all missing sections
import { ReportGeneratorV3 } from '../../packages/agents/src/standard/comparison/report-generator-v3';
import { ComparisonResult } from '../../packages/agents/src/standard/types/analysis-types';

async function generateComprehensiveReportWithIssues() {
  console.log('🚀 Generating Comprehensive PR Analysis Report with Full Issue Details');
  console.log('================================================================\n');

  try {
    // Create a comprehensive comparison result with realistic data
    const comparisonResult = {
      success: true,
      report: '', // Will be generated
      prComment: '', // Will be generated
      comparison: {
        resolvedIssues: [
          {
            issue: {
              id: 'main-crit-sec-001',
              severity: 'critical',
              category: 'security',
              type: 'vulnerability',
              location: { file: 'src/config/database.ts', line: 12 },
              message: 'Hardcoded Database Credentials',
              title: 'Hardcoded Database Credentials in Configuration',
              description: 'Database credentials are hardcoded in the source code. This exposes sensitive information and could lead to unauthorized database access.',
              impact: 'Complete database compromise possible. Attackers can access all user data.',
              codeSnippet: `// 🚨 CRITICAL: Hardcoded credentials in source code!
export const dbConfig = {
  host: 'prod-db.example.com',
  port: 5432,
  username: 'admin',
  password: 'SuperSecret123!', // NEVER DO THIS!
  database: 'payment_processor'
};`,
              suggestedFix: `// SECURE: Use environment variables
export const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.NODE_ENV === 'production'
};`,
              severityScore: 9.0,
              references: ['CWE-798', 'OWASP-A07:2021']
            },
            severity: 'critical',
            confidence: 0.95
          } as any,
          {
            issue: {
              id: 'main-high-sec-001',
              severity: 'high',
              category: 'security',
              type: 'vulnerability',
              location: { file: 'src/routes/auth.ts', line: 45 },
              message: 'No Rate Limiting on Authentication Endpoints',
              title: 'Missing Rate Limiting Allows Brute Force Attacks',
              description: 'Authentication endpoints lack rate limiting, allowing unlimited login attempts.',
              impact: 'Brute force attacks possible. Account takeover risk.',
              codeSnippet: `// ⚠️ HIGH: No rate limiting on login!
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findByEmail(email);
  
  if (user && await bcrypt.compare(password, user.password)) {
    const token = generateToken(user);
    res.json({ token });
  }
  // Attackers can try unlimited passwords!
});`,
              suggestedFix: `// SECURE: Add rate limiting
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  skipSuccessfulRequests: true
});

router.post('/login', loginLimiter, async (req, res) => {
  // ... login logic with account lockout
});`,
              severityScore: 7.5,
              references: ['CWE-307', 'OWASP-A07:2021']
            },
            severity: 'high',
            confidence: 0.90
          } as any
        ],
        newIssues: [
          {
            id: 'pr-crit-sec-001',
            severity: 'critical',
            category: 'security',
            type: 'vulnerability',
            location: { file: 'services/user-service/src/routes/internal.ts', line: 45 },
            message: 'Exposed Internal APIs Without Authentication',
            title: 'Unauthenticated Internal API Endpoints Expose Sensitive Data',
            description: 'New internal API endpoints have been added without any authentication mechanism. Anyone can access full user data including PII and payment methods.',
            impact: 'Complete user data exposure. GDPR violation. Payment data theft.',
            codeSnippet: `// 🚨 CRITICAL: Internal APIs exposed without any authentication!
router.get('/internal/users/:id/full', async (req, res) => {
  // No auth check - anyone can access full user data!
  const user = await userRepository.getFullUserData(req.params.id);
  res.json(user); // Includes PII, payment methods, everything!
});

router.post('/internal/users/:id/admin', async (req, res) => {
  // No auth check - anyone can grant admin privileges!
  await userRepository.updateRole(req.params.id, 'admin');
  res.json({ success: true });
});`,
            suggestedFix: `// SECURE: Implement service-to-service authentication
import { serviceAuth } from '../middleware/service-auth';

// Only allow authenticated services
router.use('/internal/*', serviceAuth.verify);

router.get('/internal/users/:id/full', 
  serviceAuth.requireScope('user:read:full'),
  async (req, res) => {
    const user = await userRepository.getFullUserData(req.params.id);
    auditLog.record({
      service: req.service.name,
      action: 'read_full_user',
      userId: req.params.id
    });
    res.json(user);
  }
);`,
            severityScore: 9.5,
            skillImpact: 'Security -5, Architecture -2',
            references: ['CWE-284', 'OWASP-A01:2021']
          },
          {
            id: 'pr-crit-perf-001',
            severity: 'critical',
            category: 'performance',
            type: 'bug',
            location: { file: 'services/user-service/src/services/team.service.ts', line: 89 },
            message: 'Catastrophic N+1 Query Amplification',
            title: 'N+1 Query Pattern Can Generate 10,000+ Database Queries',
            description: 'Nested loops performing database queries can generate thousands of queries for a single request, causing severe performance degradation.',
            impact: 'API timeout. Database overload. Service crash under normal load.',
            codeSnippet: `// 🚨 CRITICAL: N+1 query hell - can generate 10,000+ queries!
async getTeamHierarchy(companyId: string) {
  const teams = await Team.find({ companyId });
  
  const hierarchy = [];
  for (const team of teams) {
    const members = await User.find({ teamId: team.id });
    
    for (const member of members) {
      // N+1: Fetch each user's details separately
      const details = await UserDetails.findOne({ userId: member.id });
      const permissions = await Permission.find({ userId: member.id });
      const roles = await Role.find({ userId: member.id });
      
      // Another N+1: Fetch manager for each user
      const manager = await User.findById(member.managerId);
      const managerDetails = await UserDetails.findOne({ userId: manager.id });
    }
  }
  return hierarchy;
}`,
            suggestedFix: `// OPTIMIZED: Single aggregation query
async getTeamHierarchy(companyId: string) {
  return await Team.aggregate([
    { $match: { companyId } },
    {
      $lookup: {
        from: 'users',
        let: { teamId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$teamId', '$$teamId'] } } },
          { $lookup: { from: 'userdetails', localField: '_id', foreignField: 'userId', as: 'details' } },
          { $lookup: { from: 'permissions', localField: '_id', foreignField: 'userId', as: 'permissions' } }
        ],
        as: 'members'
      }
    }
  ]);
}`,
            severityScore: 9.0,
            skillImpact: 'Performance -5, Architecture -2',
            references: ['N+1 Query Problem']
          },
          {
            id: 'pr-high-sec-001',
            severity: 'high',
            category: 'security',
            type: 'vulnerability',
            location: { file: 'services/payment-service/src/middleware/logging.ts', line: 23 },
            message: 'API Keys Logged in Plain Text',
            title: 'Sensitive Credentials Exposed in Application Logs',
            description: 'API keys and card numbers are being logged without sanitization, exposing sensitive data in logs.',
            impact: 'PCI compliance violation. API key theft. Payment fraud risk.',
            codeSnippet: `// ⚠️ HIGH: Sensitive data logged
logger.info('Payment request', {
  ...req.body,
  apiKey: req.headers['x-api-key'], // Never log this!
  cardNumber: req.body.cardNumber   // PCI violation!
});`,
            suggestedFix: `// SECURE: Sanitize sensitive data before logging
import { sanitizeForLogging } from '../utils/security';

logger.info('Payment request', {
  ...sanitizeForLogging(req.body, ['cardNumber', 'cvv']),
  apiKey: req.headers['x-api-key'] ? '***' : undefined,
  userId: req.user.id
});`,
            severityScore: 7.0,
            skillImpact: 'Security -3, Code Quality -1',
            references: ['CWE-532', 'PCI-DSS-3.4']
          },
          {
            id: 'pr-med-qual-001',
            severity: 'medium',
            category: 'code-quality',
            type: 'code-smell',
            location: { file: 'services/notification-service/src/email.ts', line: 156 },
            message: 'Missing Error Handling in Email Service',
            title: 'Unhandled Promise Rejection in Email Sending',
            description: 'Email sending failures are not properly handled, which could cause the service to crash.',
            impact: 'Service instability. Silent notification failures.',
            codeSnippet: `// 🟡 MEDIUM: No error handling
async sendEmail(to: string, subject: string, body: string) {
  const result = await emailProvider.send({
    to,
    subject,
    body
  });
  // What if email provider is down?
  return result;
}`,
            suggestedFix: `// IMPROVED: Proper error handling with retry
async sendEmail(to: string, subject: string, body: string) {
  try {
    const result = await retry(
      () => emailProvider.send({ to, subject, body }),
      { retries: 3, minTimeout: 1000 }
    );
    return result;
  } catch (error) {
    logger.error('Email send failed', { error, to, subject });
    // Add to retry queue
    await emailQueue.add({ to, subject, body });
    throw new EmailServiceError('Email queued for retry', error);
  }
}`,
            severityScore: 5.0,
            skillImpact: 'Code Quality -1',
            references: ['Error Handling Best Practices']
          },
          {
            id: 'pr-low-test-001',
            severity: 'low',
            category: 'testing',
            type: 'code-smell',
            location: { file: 'services/user-service/src/test/user.test.ts', line: 45 },
            message: 'Test Uses Production Database',
            title: 'Integration Test Connects to Production Database',
            description: 'Test file is configured to use production database URL instead of test database.',
            impact: 'Risk of modifying production data during tests.',
            codeSnippet: `// 🟢 LOW: Using production DB in tests
describe('User Service', () => {
  beforeAll(async () => {
    // This connects to production!
    await mongoose.connect(process.env.DATABASE_URL);
  });
});`,
            suggestedFix: `// SAFE: Use test database
describe('User Service', () => {
  beforeAll(async () => {
    const testDbUrl = process.env.TEST_DATABASE_URL || 'mongodb://localhost/test';
    await mongoose.connect(testDbUrl);
  });
  
  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
});`,
            severityScore: 3.0,
            skillImpact: 'Testing -0.5',
            references: ['Testing Best Practices']
          }
        ],
        modifiedIssues: [],
        unchangedIssues: [
          {
            id: 'repo-high-perf-001',
            severity: 'high',
            category: 'performance',
            type: 'bug',
            location: { file: 'src/services/cache.service.ts', line: 78 },
            message: 'Memory Leak in Cache Service',
            title: 'Cache Service Never Clears Old Entries',
            description: 'The cache implementation never removes old entries, causing memory to grow indefinitely.',
            impact: 'Server crashes after 48 hours of operation.',
            age: '3 months',
            codeSnippet: `// ⚠️ HIGH: Memory leak - cache never clears!
class CacheService {
  private cache = new Map();
  
  set(key: string, value: any) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
    // Never removes old entries!
  }
}`,
            suggestedFix: `// FIXED: Implement TTL and size limits
class CacheService {
  private cache = new Map();
  private maxSize = 10000;
  private ttl = 3600000; // 1 hour
  
  set(key: string, value: any) {
    this.cleanup(); // Remove expired entries
    
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }
}`,
            severityScore: 7.0,
            references: ['Memory Management Best Practices']
          },
          {
            id: 'repo-med-sec-001',
            severity: 'medium',
            category: 'security',
            type: 'vulnerability',
            location: { file: 'src/validators/password.ts', line: 12 },
            message: 'Weak Password Policy',
            title: 'Password Requirements Too Weak',
            description: 'Password validation only checks for 6 character minimum, allowing weak passwords.',
            impact: 'User accounts vulnerable to brute force attacks.',
            age: '10 months',
            codeSnippet: `// 🟡 MEDIUM: Weak password requirements
function validatePassword(password: string) {
  return password.length >= 6; // Too short!
}`,
            suggestedFix: `// SECURE: Strong password policy
function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (password.length < 12) errors.push('Min 12 characters');
  if (!/[A-Z]/.test(password)) errors.push('Needs uppercase');
  if (!/[a-z]/.test(password)) errors.push('Needs lowercase');
  if (!/[0-9]/.test(password)) errors.push('Needs number');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('Needs special char');
  return { valid: errors.length === 0, errors };
}`,
            severityScore: 5.0,
            references: ['NIST SP 800-63B']
          }
        ],
        summary: {
          totalResolved: 2,
          totalNew: 5,
          totalModified: 0,
          totalUnchanged: 2,
          overallAssessment: {
            securityPostureChange: 'degraded',
            codeQualityTrend: 'declining',
            technicalDebtImpact: 0.15,
            prRecommendation: 'block',
            confidence: 0.94
          }
        },
        insights: [
          '🚨 2 new critical issues block this PR',
          '⚠️ Security posture has degraded significantly',
          '✅ Fixed 2 critical issues from main branch',
          '📊 Net negative impact on code quality'
        ],
        recommendations: [
          'Fix unauthenticated internal APIs immediately',
          'Resolve N+1 query pattern before deployment',
          'Sanitize logs to prevent credential exposure',
          'Add comprehensive error handling',
          'Update test configuration to use test database'
        ]
      },
      skillTracking: {
        previousScore: 75,
        newScore: 68,
        adjustments: [
          {
            category: 'security',
            points: 10,
            reason: 'Fixed 2 critical security issues',
            count: 2,
            pointsPerItem: 5
          },
          {
            category: 'security',
            points: -10,
            reason: 'Introduced 2 new critical security issues',
            count: 2,
            pointsPerItem: -5
          },
          {
            category: 'security',
            points: -3,
            reason: 'Introduced 1 new high security issue',
            count: 1,
            pointsPerItem: -3
          },
          {
            category: 'performance',
            points: -5,
            reason: 'Introduced critical performance issue',
            count: 1,
            pointsPerItem: -5
          },
          {
            category: 'code-quality',
            points: -1,
            reason: 'Code quality issues',
            count: 1,
            pointsPerItem: -1
          },
          {
            category: 'testing',
            points: -0.5,
            reason: 'Testing configuration issue',
            count: 1,
            pointsPerItem: -0.5
          }
        ],
        categoryChanges: {
          security: {
            previous: 82,
            current: 79,
            change: -3,
            details: 'Fixed: +10, New critical: -10, New high: -3'
          },
          performance: {
            previous: 78,
            current: 73,
            change: -5,
            details: 'New critical N+1 issue: -5'
          },
          'code-quality': {
            previous: 85,
            current: 84,
            change: -1,
            details: 'Error handling issue: -1'
          },
          architecture: {
            previous: 85,
            current: 85,
            change: 0,
            details: 'No architectural changes'
          },
          testing: {
            previous: 76,
            current: 75.5,
            change: -0.5,
            details: 'Test configuration issue: -0.5'
          }
        },
        recommendations: [
          'Great work on fixing critical security issues! Keep it up!',
          'Focus on security best practices to avoid new vulnerabilities',
          'Review performance patterns to prevent N+1 queries'
        ]
      },
      metadata: {
        orchestratorVersion: '4.0',
        modelUsed: {
          modelId: 'gpt-4-turbo',
          provider: 'openai',
          temperature: 0.3,
          maxTokens: 4000
        },
        configId: 'test-comprehensive-123',
        repositoryContext: {
          repoType: 'microservices',
          language: 'typescript',
          sizeCategory: 'large',
          complexity: 'high' as const,
          issueCount: 9,
          criticalIssueCount: 4,
          filesAnalyzed: 89,
          hasSecurityIssues: true,
          hasPerformanceIssues: true,
          fileTypes: {
            security: 3,
            performance: 2,
            tests: 1,
            documentation: 0,
            core: 83
          }
        },
        prMetadata: {
          number: 3842,
          title: 'Major refactor: Microservices migration Phase 1',
          author: 'schen',
          authorName: 'Sarah Chen',
          repository_url: 'https://github.com/techcorp/payment-processor',
          linesAdded: 1923,
          linesRemoved: 924,
          filesChanged: 89
        },
        timestamp: new Date(),
        estimatedCost: 0.003215,
        format: 'markdown' as const
      } as any
    };

    // Create report generator V3 with comprehensive template support
    const reportGenerator = new ReportGeneratorV3();
    
    // Generate comprehensive report
    console.log('📝 Generating comprehensive markdown report...');
    const comprehensiveReport = await reportGenerator.generateMarkdownReport(comparisonResult as ComparisonResult);
    
    // Generate PR comment
    console.log('💬 Generating PR comment...');
    const prComment = reportGenerator.generatePRComment(comparisonResult as ComparisonResult);
    
    // Save reports
    const outputDir = join(__dirname, 'test-output', new Date().toISOString().split('T')[0]);
    mkdirSync(outputDir, { recursive: true });
    
    // Save comprehensive report
    const mdPath = join(outputDir, 'comprehensive-pr-analysis-full.md');
    writeFileSync(mdPath, comprehensiveReport);
    console.log(`\n✅ Comprehensive report saved to: ${mdPath}`);
    
    // Save PR comment
    const commentPath = join(outputDir, 'comprehensive-pr-comment.md');
    writeFileSync(commentPath, prComment);
    console.log(`✅ PR comment saved to: ${commentPath}`);
    
    // Display summary
    console.log('\n📊 Report Summary:');
    console.log(`   Decision: DECLINED (2 critical issues)`);
    console.log(`   New Issues: 5 (2 critical, 1 high, 1 medium, 1 low)`);
    console.log(`   Resolved Issues: 2 (1 critical, 1 high)`);
    console.log(`   Pre-existing Issues: 2 (1 high, 1 medium)`);
    console.log(`   Developer Score: 75 → 68 (-7 points)`);
    console.log(`   Overall Repository Score: 68/100 (D+)`);
    
    return { comprehensiveReport, prComment };
    
  } catch (error) {
    console.error('\n❌ Report generation failed:', error);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  generateComprehensiveReportWithIssues()
    .then(() => {
      console.log('\n🎉 Comprehensive report generation complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Test failed:', error);
      process.exit(1);
    });
}

export { generateComprehensiveReportWithIssues };