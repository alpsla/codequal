#!/usr/bin/env ts-node

/**
 * Test V9 Enhanced Report Generation
 * 
 * This script creates a sample analysis result with all required data
 * and generates a comprehensive report using the enhanced formatter
 */

import { V9ReportFormatterEnhanced } from './src/two-branch/analyzers/v9-report-formatter-enhanced';
import { 
  AnalysisResult, 
  Issue,
  BusinessImpact,
  SkillScore,
  EducationalResource
} from './src/two-branch/analyzers/v9-types';
import * as fs from 'fs';
import * as path from 'path';

async function generateSampleReport() {
  console.log('🚀 Generating V9 Enhanced Report Sample\n');
  
  // Create sample issues with complete metadata
  const sampleIssues: Issue[] = [
    {
      id: 'sec-001',
      category: 'Security',
      severity: 'critical',
      status: 'new',
      title: 'SQL Injection Vulnerability',
      description: 'User input is directly concatenated into SQL query without parameterization',
      file: 'src/main/java/com/example/UserService.java',
      line: 142,
      tool: 'semgrep',
      agent: 'SecurityAnalyzer',
      impact: 'Allows attackers to execute arbitrary SQL commands, potentially exposing or modifying database contents',
      businessImpact: 'Could lead to data breach affecting thousands of users, potential GDPR fines up to €20M',
      codeSnippet: `String query = "SELECT * FROM users WHERE username = '" + username + "' AND password = '" + password + "'";
Statement stmt = connection.createStatement();
ResultSet rs = stmt.executeQuery(query);`,
      suggestedFix: 'Use PreparedStatement with parameterized queries to prevent SQL injection',
      suggestedCodeSnippet: `String query = "SELECT * FROM users WHERE username = ? AND password = ?";
PreparedStatement pstmt = connection.prepareStatement(query);
pstmt.setString(1, username);
pstmt.setString(2, password);
ResultSet rs = pstmt.executeQuery();`,
      inModifiedFile: true
    },
    {
      id: 'sec-002',
      category: 'Security',
      severity: 'high',
      status: 'new',
      title: 'Hardcoded API Key Detected',
      description: 'API key is hardcoded in source code, should use environment variables',
      file: 'src/main/java/com/example/config/ApiConfig.java',
      line: 23,
      tool: 'spotbugs',
      agent: 'SecurityAnalyzer',
      impact: 'Exposed credentials could be used to access third-party services',
      businessImpact: 'Potential unauthorized API usage leading to unexpected charges',
      codeSnippet: `private static final String API_KEY = "sk-proj-abcd1234efgh5678";
private static final String API_URL = "https://api.service.com/v1";`,
      suggestedFix: 'Move API key to environment variables or secure configuration service',
      suggestedCodeSnippet: `private static final String API_KEY = System.getenv("SERVICE_API_KEY");
private static final String API_URL = System.getenv("SERVICE_API_URL");

// In application.properties:
// service.api.key=\${SERVICE_API_KEY}
// service.api.url=\${SERVICE_API_URL}`,
      inModifiedFile: true
    },
    {
      id: 'perf-001',
      category: 'Performance',
      severity: 'high',
      status: 'new',
      title: 'N+1 Query Problem Detected',
      description: 'Loop contains database query that could be optimized with JOIN',
      file: 'src/main/java/com/example/OrderService.java',
      line: 87,
      tool: 'pmd',
      agent: 'PerformanceAnalyzer',
      impact: 'Causes multiple database round trips, significantly slowing down response time',
      businessImpact: 'Poor user experience, potential customer churn due to slow page loads',
      codeSnippet: `List<Order> orders = orderRepository.findAll();
for (Order order : orders) {
    Customer customer = customerRepository.findById(order.getCustomerId());
    order.setCustomer(customer);
}`,
      suggestedFix: 'Use JOIN query or batch loading to fetch all data in one query',
      suggestedCodeSnippet: `// Using JPA with fetch join
@Query("SELECT o FROM Order o JOIN FETCH o.customer")
List<Order> findAllWithCustomers();

// Or using batch loading
List<Order> orders = orderRepository.findAll();
List<Long> customerIds = orders.stream()
    .map(Order::getCustomerId)
    .distinct()
    .collect(Collectors.toList());
Map<Long, Customer> customers = customerRepository.findByIdIn(customerIds)
    .stream()
    .collect(Collectors.toMap(Customer::getId, c -> c));`,
      inModifiedFile: false
    },
    {
      id: 'qual-001',
      category: 'Quality',
      severity: 'medium',
      status: 'existing',
      title: 'Missing Null Check',
      description: 'Method dereferences object without checking for null',
      file: 'src/main/java/com/example/utils/StringUtils.java',
      line: 34,
      tool: 'spotbugs',
      agent: 'QualityAnalyzer',
      impact: 'Could cause NullPointerException at runtime',
      businessImpact: 'Application crashes leading to poor user experience',
      codeSnippet: `public String processInput(String input) {
    return input.trim().toLowerCase();
}`,
      suggestedFix: 'Add null check before using the object',
      suggestedCodeSnippet: `public String processInput(String input) {
    if (input == null) {
        return "";
    }
    return input.trim().toLowerCase();
}

// Or using Optional
public String processInput(String input) {
    return Optional.ofNullable(input)
        .map(s -> s.trim().toLowerCase())
        .orElse("");
}`,
      inModifiedFile: false
    },
    {
      id: 'dep-001',
      category: 'Dependency',
      severity: 'critical',
      status: 'new',
      title: 'Critical Vulnerability in log4j',
      description: 'CVE-2021-44228: Remote code execution vulnerability in Log4j 2.x',
      file: 'pom.xml',
      line: 156,
      tool: 'dependency-check',
      agent: 'DependencyAnalyzer',
      impact: 'Allows remote code execution through crafted log messages',
      businessImpact: 'Complete system compromise possible, emergency patch required',
      codeSnippet: `<dependency>
    <groupId>org.apache.logging.log4j</groupId>
    <artifactId>log4j-core</artifactId>
    <version>2.14.1</version>
</dependency>`,
      suggestedFix: 'Upgrade to Log4j 2.17.0 or later which fixes the vulnerability',
      suggestedCodeSnippet: `<dependency>
    <groupId>org.apache.logging.log4j</groupId>
    <artifactId>log4j-core</artifactId>
    <version>2.17.1</version>
</dependency>`,
      inModifiedFile: true
    }
  ];
  
  // Create sample business impact
  const businessImpact: BusinessImpact = {
    summary: 'Critical security vulnerabilities require immediate attention',
    immediateRisk: 'High - SQL injection and RCE vulnerabilities present immediate threat',
    futureRisk: 'Medium - Performance issues will impact scalability',
    financialImpact: {
      fixCost: '$15,000 (30 hours @ $500/hour)',
      exploitCost: '$2,500,000 (potential data breach costs)',
      roi: '16,567% (preventing breach far outweighs fix cost)'
    },
    riskMatrix: [
      { category: 'Security', blockingRisk: 10, backlogRisk: 5, score: '15.0' },
      { category: 'Performance', blockingRisk: 3, backlogRisk: 7, score: '10.0' },
      { category: 'Quality', blockingRisk: 0, backlogRisk: 3, score: '3.0' },
      { category: 'Dependency', blockingRisk: 8, backlogRisk: 2, score: '10.0' },
      { category: 'Architecture', blockingRisk: 0, backlogRisk: 0, score: '0.0' }
    ]
  };
  
  // Create sample skill score
  const skillScore: SkillScore = {
    developer: 'john.doe@example.com',
    score: 72,
    trend: [65, 68, 70, 71, 72],
    categories: {
      security: 65,
      performance: 78,
      architecture: 82,
      dependency: 70,
      quality: 75
    },
    recommendations: [
      'Focus on security best practices - review OWASP Top 10',
      'Learn about SQL injection prevention techniques',
      'Study secure coding guidelines for API key management'
    ]
  };
  
  // Create sample educational resources
  const educationalResources: EducationalResource[] = [
    {
      type: 'documentation',
      title: 'OWASP SQL Injection Prevention Cheat Sheet',
      url: 'https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html',
      description: 'Comprehensive guide on preventing SQL injection attacks'
    },
    {
      type: 'tutorial',
      title: 'Java Security Best Practices',
      url: 'https://www.baeldung.com/java-security-best-practices',
      description: 'Learn essential security practices for Java applications'
    },
    {
      type: 'video',
      title: 'Understanding and Preventing SQL Injection',
      url: 'https://www.youtube.com/watch?v=example',
      description: '15-minute video explaining SQL injection attacks and prevention'
    },
    {
      type: 'example',
      title: 'Secure Java Code Examples',
      url: 'https://github.com/OWASP/java-security-examples',
      description: 'Repository of secure coding examples in Java'
    }
  ];
  
  // Create complete analysis result
  const analysisResult: AnalysisResult = {
    decision: 'rejected',
    confidence: 0.95,
    reason: 'PR contains 2 critical security vulnerabilities (SQL injection and log4j RCE) that must be fixed before merge. These issues pose immediate risk to production systems.',
    qualityScore: 45.5,
    grade: 'F',
    newIssues: sampleIssues.filter(i => i.status === 'new'),
    existingIssues: sampleIssues.filter(i => i.status === 'existing'),
    resolvedIssues: [
      {
        id: 'res-001',
        category: 'Quality',
        severity: 'medium',
        status: 'resolved',
        title: 'Fixed resource leak in FileProcessor',
        description: 'FileInputStream was not being closed properly',
        file: 'src/main/java/com/example/FileProcessor.java',
        line: 45,
        tool: 'spotbugs',
        agent: 'QualityAnalyzer',
        impact: 'Prevented potential resource exhaustion',
        businessImpact: 'Improved application stability'
      }
    ],
    blockingIssues: sampleIssues.filter(i => i.severity === 'critical'),
    backlogIssues: sampleIssues.filter(i => i.severity !== 'critical' && i.status === 'existing'),
    modifiedFiles: [
      'src/main/java/com/example/UserService.java',
      'src/main/java/com/example/config/ApiConfig.java',
      'src/main/java/com/example/OrderService.java',
      'pom.xml',
      'src/test/java/com/example/UserServiceTest.java'
    ],
    businessImpact,
    skillScore,
    educationalResources,
    metadata: {
      repository: 'example-corp/backend-api',
      prNumber: 1234,
      branch: 'feature/user-authentication',
      language: 'Java',
      totalFiles: 287,
      modifiedFiles: 5,
      analysisTime: 15234,
      tools: ['spotbugs', 'pmd', 'checkstyle', 'dependency-check', 'semgrep'],
      timestamp: new Date().toISOString(),
      analyzedAt: new Date().toISOString(),
      analyzer: 'V9',
      repoUrl: 'https://github.com/example-corp/backend-api',
      executionTime: 15234,
      model: {
        primary_provider: 'anthropic',
        primary_model: 'claude-3-opus',
        fallback_provider: 'openai',
        fallback_model: 'gpt-4'
      }
    }
  };
  
  // Generate the report
  const formatter = new V9ReportFormatterEnhanced();
  const report = await formatter.generateComprehensiveReport(
    analysisResult,
    'Java',
    {
      format: 'markdown',
      includeCodeSnippets: true,
      includeEducationalResources: true,
      includeBusinessImpact: true,
      includeSkillScore: true,
      groupSimilarIssues: false
    }
  );
  
  // Save the report
  const outputDir = path.join(__dirname, 'src/two-branch/reports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const filename = `v9-enhanced-report-sample-${Date.now()}.md`;
  const filepath = path.join(outputDir, filename);
  
  fs.writeFileSync(filepath, report);
  
  console.log('✅ Report generated successfully!');
  console.log(`📄 Report saved to: ${filepath}`);
  console.log('\n📊 Report Statistics:');
  console.log(`- Total Issues: ${sampleIssues.length}`);
  console.log(`- Blocking Issues: ${analysisResult.blockingIssues.length}`);
  console.log(`- New Issues: ${analysisResult.newIssues.length}`);
  console.log(`- Resolved Issues: ${analysisResult.resolvedIssues.length}`);
  console.log(`- Report Length: ${report.length} characters`);
  console.log(`- Report Lines: ${report.split('\n').length}`);
  
  // Also print a preview
  console.log('\n📝 Report Preview (first 50 lines):');
  console.log('=' . repeat(60));
  const lines = report.split('\n');
  for (let i = 0; i < Math.min(50, lines.length); i++) {
    console.log(lines[i]);
  }
  if (lines.length > 50) {
    console.log('... (report continues)');
  }
}

// Run the test
generateSampleReport().catch(console.error);