/**
 * Simple test for V9 PR Comment Generator with correct types
 */

import * as fs from 'fs';
import * as path from 'path';
import { V9PRCommentGenerator } from './src/two-branch/analyzers/v9-pr-comment-generator';
import { AnalysisResult, Issue, IssueCategory, IssueSeverity, IssueStatus } from './src/two-branch/analyzers/v9-types';

// Helper to create test issue with full details
function createIssue(
  id: string,
  category: IssueCategory,
  severity: IssueSeverity,
  title: string,
  file: string,
  line: number,
  tool: string = 'spotbugs',
  agent: string = 'SecurityAnalyzer'
): Issue {
  const codeSnippets: Record<string, string> = {
    'SEC-001': 'String query = "SELECT * FROM users WHERE id = " + userId;',
    'SEC-002': 'private static final String AWS_KEY = "AKIAIOSFODNN7EXAMPLE";',
    'PERF-001': `for (Order order : orders) {
    Customer customer = fetchCustomer(order.getCustomerId());
    // N+1 query problem
}`,
    'QUAL-001': 'return user.getName().toUpperCase();',
    'QUAL-002': 'import java.util.concurrent.atomic.AtomicInteger;  // Never used'
  };
  
  const fixSnippets: Record<string, string> = {
    'SEC-001': `PreparedStatement stmt = conn.prepareStatement("SELECT * FROM users WHERE id = ?");
stmt.setString(1, userId);`,
    'SEC-002': 'private static final String AWS_KEY = System.getenv("AWS_ACCESS_KEY_ID");',
    'PERF-001': `Map<Long, Customer> customers = fetchAllCustomers(orders.stream()
    .map(Order::getCustomerId)
    .collect(Collectors.toSet()));`,
    'QUAL-001': `if (user != null && user.getName() != null) {
    return user.getName().toUpperCase();
}
return "";`,
    'QUAL-002': '// Remove the unused import'
  };
  
  const descriptions: Record<string, string> = {
    'SEC-001': 'User input is directly concatenated into SQL query without proper sanitization, allowing SQL injection attacks',
    'SEC-002': 'AWS credentials are hardcoded in the source code, exposing sensitive information',
    'PERF-001': 'Database query executed inside a loop causing N+1 query problem',
    'QUAL-001': 'Object used without null validation, could cause NullPointerException',
    'QUAL-002': 'Import statement is not used anywhere in the file'
  };
  
  const impacts: Record<string, string> = {
    'SEC-001': 'Attackers can execute arbitrary SQL commands, potentially accessing or modifying all database data',
    'SEC-002': 'Exposed credentials could be used to access AWS resources and incur charges',
    'PERF-001': 'Causes significant performance degradation with large datasets',
    'QUAL-001': 'Application may crash with NullPointerException in production',
    'QUAL-002': 'Minor impact on compilation time and code cleanliness'
  };
  
  return {
    id,
    category,
    severity,
    status: 'New' as IssueStatus,
    title,
    description: descriptions[id] || `${title} - detailed description`,
    file,
    line,
    tool,
    agent,
    impact: impacts[id] || `${severity} impact on code quality`,
    businessImpact: severity === 'critical' 
      ? 'Critical security risk requiring immediate attention' 
      : severity === 'high'
      ? 'High priority issue affecting system reliability'
      : 'Medium to low priority issue affecting code quality',
    codeSnippet: codeSnippets[id] || '// relevant code here',
    suggestedFix: `Use proper ${title.toLowerCase()} techniques to prevent this issue`,
    suggestedCodeSnippet: fixSnippets[id] || '// fixed code here',
    inModifiedFile: true
  };
}

// Create mock data
const mockResult: AnalysisResult = {
  decision: 'rejected',
  confidence: 92,
  reason: 'PR contains 2 critical security issues that must be fixed before merge.',
  qualityScore: 65.5,
  grade: 'D',
  
  newIssues: [
    createIssue('SEC-001', 'Security', 'critical', 'SQL Injection', 'src/db/UserRepo.java', 145),
    createIssue('SEC-002', 'Security', 'critical', 'Hardcoded Credentials', 'src/services/S3.java', 23),
    createIssue('PERF-001', 'Performance', 'high', 'N+1 Query Problem', 'src/services/Orders.java', 89),
    createIssue('QUAL-001', 'Quality', 'medium', 'Missing Null Check', 'src/utils/Helper.java', 45),
    createIssue('QUAL-002', 'Quality', 'low', 'Unused Import', 'src/controllers/User.java', 12)
  ],
  
  existingIssues: [
    createIssue('EX-001', 'Quality', 'medium', 'Complex Method', 'src/services/Payment.java', 234),
    createIssue('EX-002', 'Performance', 'medium', 'String Concatenation in Loop', 'src/utils/Helper.java', 78),
    createIssue('EX-003', 'Quality', 'low', 'Missing JavaDoc', 'src/api/Rest.java', 156)
  ],
  
  resolvedIssues: [
    createIssue('RES-001', 'Security', 'high', 'Log4j Vulnerability Fixed', 'pom.xml', 45),
    createIssue('RES-002', 'Quality', 'medium', 'Resource Leak Fixed', 'src/db/Connection.java', 89)
  ],
  
  blockingIssues: [],
  backlogIssues: [],
  
  modifiedFiles: [
    'src/db/UserRepo.java',
    'src/services/S3.java',
    'src/services/Orders.java',
    'src/utils/Helper.java',
    'src/controllers/User.java',
    'pom.xml',
    'src/db/Connection.java'
  ],
  
  businessImpact: {
    summary: 'Critical security vulnerabilities require immediate attention',
    immediateRisk: 'CRITICAL - SQL injection and credential exposure threats',
    futureRisk: 'High - Performance issues will impact scalability',
    financialImpact: {
      fixCost: '$2,500',
      exploitCost: '$500,000',
      roi: '19,900%'
    },
    riskMatrix: [
      {
        category: 'Security',
        blockingRisk: 5.0,
        backlogRisk: 2.0,
        score: '🔴 7.0'
      },
      {
        category: 'Performance',
        blockingRisk: 0.0,
        backlogRisk: 3.0,
        score: '🟡 3.0'
      },
      {
        category: 'Quality',
        blockingRisk: 0.0,
        backlogRisk: 1.5,
        score: '🟢 1.5'
      }
    ]
  },
  
  skillScore: {
    developer: 'john.doe@example.com',
    score: 68,
    trend: [65, 66, 67, 68, 68],
    categories: {
      security: 55,
      performance: 70,
      architecture: 75,
      dependency: 65,
      quality: 80
    },
    recommendations: [
      'Review OWASP Top 10 security guidelines',
      'Study SQL injection prevention techniques',
      'Learn AWS security best practices'
    ]
  },
  
  educationalResources: [
    {
      type: 'documentation',
      title: 'OWASP SQL Injection Prevention',
      url: 'https://owasp.org/sql-injection',
      description: 'Comprehensive guide on SQL injection prevention'
    },
    {
      type: 'tutorial',
      title: 'AWS Security Best Practices',
      url: 'https://aws.amazon.com/security',
      description: 'AWS credential management guide'
    },
    {
      type: 'video',
      title: 'Understanding N+1 Queries',
      url: 'https://youtube.com/example',
      description: 'Video tutorial on query optimization'
    }
  ],
  
  metadata: {
    repository: 'example-org/example-repo',
    prNumber: 742,
    branch: 'feature/auth',
    language: 'Java',
    totalFiles: 156,
    modifiedFiles: 7,
    analysisTime: 45230,
    tools: ['spotbugs', 'pmd', 'checkstyle'],
    timestamp: new Date().toISOString(),
    analyzedAt: new Date().toISOString(),
    analyzer: 'V9',
    repoUrl: 'https://github.com/example-org/example-repo',
    executionTime: 45230,
    model: 'claude-3-opus',
    // Extended metadata (will be cast)
    prAuthor: 'John Doe',
    prAuthorEmail: 'john.doe@example.com',
    repoOwner: 'example-org',
    totalCost: 0.238
  } as any
};

// Set blocking issues
mockResult.blockingIssues = mockResult.newIssues.filter(i => i.severity === 'critical');
mockResult.backlogIssues = mockResult.existingIssues;

async function testPRComment() {
  console.log('🚀 Testing V9 PR Comment Generator\n');
  
  const generator = new V9PRCommentGenerator();
  
  // Generate comment
  const comment = await generator.generatePRComment(mockResult, {
    includeEducationalResources: true,
    includeSkillScore: true,
    includeBusinessImpact: false,
    maxIssuesInComment: 5,
    tone: 'constructive'
  });
  
  // Save to file
  const outputDir = path.join(__dirname, 'src/two-branch/reports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const filename = `v9-pr-742-comment-${Date.now()}.md`;
  const filepath = path.join(outputDir, filename);
  
  fs.writeFileSync(filepath, comment);
  console.log(`✅ PR comment saved to: ${filepath}\n`);
  
  // Display the comment
  console.log('='.repeat(80));
  console.log('PR COMMENT PREVIEW:');
  console.log('='.repeat(80) + '\n');
  console.log(comment);
  console.log('\n' + '='.repeat(80));
  
  // Show statistics breakdown
  console.log('\n📊 Issue Statistics Breakdown:');
  console.log('--------------------------------');
  
  const existingInModified = mockResult.existingIssues.filter(issue => 
    mockResult.modifiedFiles.includes(issue.file)
  ).length;
  const existingNotInModified = mockResult.existingIssues.length - existingInModified;
  
  console.log(`✅ Resolved Issues: ${mockResult.resolvedIssues.length}`);
  console.log(`🆕 New Issues: ${mockResult.newIssues.length} (${mockResult.blockingIssues.length} blocking)`);
  console.log(`📌 Existing Issues in Modified Files: ${existingInModified} (not blocking)`);
  console.log(`📋 Existing Issues in Other Files: ${existingNotInModified} (not blocking)`);
  console.log(`📊 Total Active Issues: ${mockResult.newIssues.length + mockResult.existingIssues.length}`);
  console.log('--------------------------------');
  
  console.log('\n✅ Test completed successfully!');
}

// Run test
testPRComment().catch(console.error);