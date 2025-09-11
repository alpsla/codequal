/**
 * Test V9 PR Comment Generator with mocked data
 */

import * as fs from 'fs';
import * as path from 'path';
import { V9PRCommentGenerator } from './src/two-branch/analyzers/v9-pr-comment-generator';
import { AnalysisResult } from './src/two-branch/analyzers/v9-types';

// Extend metadata for test
interface ExtendedMetadata {
  repository: string;
  prNumber: number;
  branch: string;
  language: string;
  totalFiles: number;
  modifiedFiles: number;
  analysisTime: number;
  tools: string[];
  timestamp: string;
  analyzedAt: string;
  analyzer: string;
  repoUrl: string;
  executionTime: number;
  model?: string;
  prAuthor?: string;
  prAuthorEmail?: string;
  repoOwner?: string;
  organization?: string;
  totalLinesOfCode?: number;
  linesAdded?: number;
  linesDeleted?: number;
  linesModified?: number;
  agentsUsed?: any[];
  toolsUsed?: any[];
  totalCost?: number;
}

// Create mock analysis result with extended metadata
const mockAnalysisResult = {
  decision: 'rejected',
  confidence: 92,
  reason: 'PR contains 2 critical security vulnerabilities that must be fixed before merge.',
  qualityScore: 65.5,
  grade: 'D',
  
  // Issues breakdown
  newIssues: [
    {
      id: 'sql-injection-001',
      type: 'security',
      category: 'Security' as any,
      severity: 'critical',
      title: 'SQL Injection Vulnerability',
      description: 'User input directly concatenated into SQL query without sanitization',
      file: 'src/database/UserRepository.java',
      line: 145,
      column: 20,
      tool: 'semgrep',
      recommendation: 'Use PreparedStatement with parameterized queries',
      codeSnippet: 'String query = "SELECT * FROM users WHERE id = " + userId;',
      fixSnippet: 'PreparedStatement stmt = conn.prepareStatement("SELECT * FROM users WHERE id = ?");\nstmt.setString(1, userId);',
      impact: 'High - Could lead to complete database compromise',
      effort: 'low',
      tags: ['security', 'owasp-top10', 'critical']
    },
    {
      id: 'hardcoded-creds-002',
      type: 'security',
      category: 'Security' as any,
      severity: 'critical',
      title: 'Hardcoded AWS Credentials',
      description: 'AWS access keys are hardcoded in the source code',
      file: 'src/services/S3Service.java',
      line: 23,
      column: 15,
      tool: 'spotbugs',
      recommendation: 'Use environment variables or AWS IAM roles',
      codeSnippet: 'private static final String AWS_KEY = "AKIAIOSFODNN7EXAMPLE";',
      fixSnippet: 'private static final String AWS_KEY = System.getenv("AWS_ACCESS_KEY_ID");',
      impact: 'Critical - Exposed credentials could lead to unauthorized AWS access',
      effort: 'low',
      tags: ['security', 'credentials', 'critical']
    },
    {
      id: 'n-plus-one-003',
      type: 'performance',
      category: 'Performance' as any,
      severity: 'high',
      title: 'N+1 Query Problem',
      description: 'Loop fetches data individually causing excessive database calls',
      file: 'src/services/OrderService.java',
      line: 89,
      column: 12,
      tool: 'pmd',
      recommendation: 'Batch fetch all data in a single query',
      impact: 'High - Significant performance degradation with large datasets',
      effort: 'medium',
      tags: ['performance', 'database']
    },
    {
      id: 'null-check-004',
      type: 'quality',
      category: 'Quality' as any,
      severity: 'medium',
      title: 'Missing Null Check',
      description: 'Object used without null validation',
      file: 'src/utils/StringHelper.java',
      line: 45,
      column: 8,
      tool: 'spotbugs',
      recommendation: 'Add null check before using the object',
      impact: 'Medium - Could cause NullPointerException',
      effort: 'low',
      tags: ['quality', 'defensive-programming']
    },
    {
      id: 'unused-import-005',
      type: 'quality',
      category: 'Quality' as any,
      severity: 'low',
      title: 'Unused Import',
      description: 'Import statement is not used',
      file: 'src/controllers/UserController.java',
      line: 12,
      column: 1,
      tool: 'checkstyle',
      recommendation: 'Remove unused import',
      impact: 'Low - Code cleanliness issue',
      effort: 'low',
      tags: ['quality', 'cleanup']
    }
  ],
  
  existingIssues: [
    {
      id: 'existing-001',
      type: 'quality',
      category: 'Quality' as any,
      severity: 'medium',
      title: 'Complex Method',
      description: 'Method has cyclomatic complexity of 15',
      file: 'src/services/PaymentService.java',
      line: 234,
      column: 5,
      tool: 'pmd',
      recommendation: 'Refactor into smaller methods',
      impact: 'Medium - Affects maintainability',
      effort: 'high',
      tags: ['quality', 'complexity']
    },
    {
      id: 'existing-002',
      type: 'performance',
      category: 'Performance' as any,
      severity: 'medium',
      title: 'Inefficient String Concatenation',
      description: 'Using + in a loop for string concatenation',
      file: 'src/utils/StringHelper.java',
      line: 78,
      column: 10,
      tool: 'pmd',
      recommendation: 'Use StringBuilder instead',
      impact: 'Medium - Performance issue in loops',
      effort: 'low',
      tags: ['performance']
    },
    {
      id: 'existing-003',
      type: 'quality',
      category: 'Quality' as any,
      severity: 'low',
      title: 'Missing JavaDoc',
      description: 'Public method lacks documentation',
      file: 'src/api/RestController.java',
      line: 156,
      column: 1,
      tool: 'checkstyle',
      recommendation: 'Add JavaDoc comment',
      impact: 'Low - Documentation issue',
      effort: 'low',
      tags: ['documentation']
    }
  ],
  
  resolvedIssues: [
    {
      id: 'resolved-001',
      type: 'security',
      category: 'Security' as any,
      severity: 'high',
      title: 'Log4j Vulnerability',
      description: 'Updated Log4j to patched version 2.17.1',
      file: 'pom.xml',
      line: 45,
      column: 1,
      tool: 'dependency-check',
      impact: 'High - Fixed critical RCE vulnerability',
      effort: 'low',
      tags: ['security', 'dependency']
    },
    {
      id: 'resolved-002',
      type: 'quality',
      category: 'Quality' as any,
      severity: 'medium',
      title: 'Resource Leak',
      description: 'Fixed unclosed database connection',
      file: 'src/database/ConnectionManager.java',
      line: 89,
      column: 5,
      tool: 'spotbugs',
      impact: 'Medium - Prevented connection pool exhaustion',
      effort: 'low',
      tags: ['quality', 'resource-management']
    }
  ],
  
  blockingIssues: [],  // Will be set based on critical issues
  backlogIssues: [],   // Will be set based on existing issues
  
  modifiedFiles: [
    'src/database/UserRepository.java',
    'src/services/S3Service.java',
    'src/services/OrderService.java',
    'src/utils/StringHelper.java',
    'src/controllers/UserController.java',
    'pom.xml',
    'src/database/ConnectionManager.java'
  ],
  
  businessImpact: {
    riskLevel: 'critical',
    financialImpact: {
      fixCost: '2500',
      potentialLoss: '500000',
      roi: '19900%'
    },
    timeToFix: '8 hours',
    recommendation: 'Fix critical security vulnerabilities immediately before deployment'
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
      'Review OWASP Top 10 security vulnerabilities',
      'Learn about SQL injection prevention techniques',
      'Study AWS security best practices for credential management',
      'Practice query optimization techniques'
    ]
  },
  
  educationalResources: [
    {
      type: 'documentation',
      title: 'OWASP SQL Injection Prevention Cheat Sheet',
      url: 'https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html',
      description: 'Comprehensive guide on preventing SQL injection attacks'
    },
    {
      type: 'tutorial',
      title: 'AWS Security Best Practices',
      url: 'https://aws.amazon.com/security/best-practices/',
      description: 'Learn how to secure AWS credentials and resources'
    },
    {
      type: 'video',
      title: 'Understanding and Solving N+1 Query Problems',
      url: 'https://www.youtube.com/watch?v=example',
      description: '15-minute video explaining N+1 queries and solutions'
    },
    {
      type: 'documentation',
      title: 'Java Secure Coding Guidelines',
      url: 'https://www.oracle.com/java/technologies/javase/seccodeguide.html',
      description: 'Official Java security coding standards'
    }
  ],
  
  metadata: {
    repository: 'example-org/example-repo',
    prNumber: 742,
    branch: 'feature/user-authentication',
    language: 'Java',
    totalFiles: 156,
    modifiedFiles: 7,
    analysisTime: 45230,
    tools: ['spotbugs', 'pmd', 'checkstyle', 'dependency-check', 'semgrep'],
    timestamp: new Date().toISOString(),
    analyzedAt: new Date().toISOString(),
    analyzer: 'V9',
    repoUrl: 'https://github.com/example-org/example-repo',
    executionTime: 45230,
    model: 'anthropic/claude-3-opus-20240229',
    
    // Additional metadata for PR comment
    prAuthor: 'John Doe',
    prAuthorEmail: 'john.doe@example.com',
    repoOwner: 'example-org',
    organization: 'Example Corporation',
    totalLinesOfCode: 25430,
    linesAdded: 342,
    linesDeleted: 89,
    linesModified: 156,
    
    // Performance metrics
    agentsUsed: [
      {
        name: 'SecurityAnalyzer',
        executionTime: 12340,
        tokensUsed: 4500,
        modelUsed: 'claude-3-opus',
        cost: 0.135
      },
      {
        name: 'PerformanceAnalyzer',
        executionTime: 8760,
        tokensUsed: 3200,
        modelUsed: 'claude-3-sonnet',
        cost: 0.048
      },
      {
        name: 'QualityAnalyzer',
        executionTime: 6890,
        tokensUsed: 2100,
        modelUsed: 'claude-3-haiku',
        cost: 0.021
      }
    ],
    
    toolsUsed: [
      {
        name: 'spotbugs',
        executionTime: 3450,
        filesScanned: 156,
        issuesFound: 8,
        exitCode: 0
      },
      {
        name: 'pmd',
        executionTime: 2890,
        filesScanned: 156,
        issuesFound: 5,
        exitCode: 0
      },
      {
        name: 'semgrep',
        executionTime: 4560,
        filesScanned: 156,
        issuesFound: 2,
        exitCode: 0
      }
    ],
    
    totalCost: 0.238
  } as ExtendedMetadata
} as AnalysisResult;

// Set blocking issues (critical severity)
mockAnalysisResult.blockingIssues = mockAnalysisResult.newIssues.filter(
  issue => issue.severity === 'critical'
);

// Set backlog issues (existing issues)
mockAnalysisResult.backlogIssues = mockAnalysisResult.existingIssues;

async function generatePRComment() {
  console.log('🚀 Generating V9 PR Comment with mocked data...\n');
  
  const generator = new V9PRCommentGenerator();
  
  // Generate comment with different tones
  const tones: Array<'friendly' | 'professional' | 'constructive'> = ['constructive', 'friendly', 'professional'];
  
  for (const tone of tones) {
    console.log(`\n📝 Generating PR comment with ${tone} tone...\n`);
    
    const comment = await generator.generatePRComment(mockAnalysisResult, {
      includeEducationalResources: true,
      includeSkillScore: true,
      includeBusinessImpact: false,  // Don't include business impact in PR comments
      maxIssuesInComment: 5,
      tone: tone
    });
    
    // Save comment to file
    const outputDir = path.join(__dirname, 'src/two-branch/reports');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const filename = `v9-pr-${mockAnalysisResult.metadata.prNumber}-comment-${tone}-${Date.now()}.md`;
    const filepath = path.join(outputDir, filename);
    
    fs.writeFileSync(filepath, comment);
    console.log(`✅ PR comment saved to: ${filepath}`);
    
    // Also display the comment
    console.log('\n' + '='.repeat(80));
    console.log('PR COMMENT PREVIEW:');
    console.log('='.repeat(80) + '\n');
    console.log(comment);
    console.log('\n' + '='.repeat(80));
  }
  
  // Generate a summary of the statistics
  console.log('\n📊 Issue Statistics Summary:');
  console.log(`- Resolved Issues: ${mockAnalysisResult.resolvedIssues.length}`);
  console.log(`- New Issues: ${mockAnalysisResult.newIssues.length} (${mockAnalysisResult.blockingIssues.length} blocking)`);
  
  const existingInModified = mockAnalysisResult.existingIssues.filter(issue => 
    mockAnalysisResult.modifiedFiles.includes(issue.file)
  ).length;
  const existingNotInModified = mockAnalysisResult.existingIssues.length - existingInModified;
  
  console.log(`- Existing Issues in Modified Files: ${existingInModified} (not blocking)`);
  console.log(`- Existing Issues in Other Files: ${existingNotInModified} (not blocking)`);
  console.log(`- Total Issues: ${mockAnalysisResult.newIssues.length + mockAnalysisResult.existingIssues.length}`);
  
  console.log('\n✅ PR comment generation test completed!');
}

// Run the test
generatePRComment().catch(console.error);