#!/usr/bin/env ts-node
import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';
import { promises as fs } from 'fs';

// Define types locally
interface Issue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'security' | 'performance' | 'code-quality' | 'architecture' | 'dependencies' | 'testing' | 'maintainability' | 'formatting' | 'style';
  type?: 'vulnerability' | 'bug' | 'code-smell' | 'optimization' | 'design-issue';
  location?: {
    file: string;
    line: number;
  };
  message: string;
  title?: string;
  description?: string;
  codeSnippet?: string;
  suggestedFix?: string;
}

interface ComparisonResult {
  success: boolean;
  prIssues: Issue[];
  mainIssues: Issue[];
  addedIssues?: Issue[];
  fixedIssues?: Issue[];
  unchangedIssues?: Issue[];
}

async function testSQLInjectionTemplate() {
  console.log('🔍 Testing SQL Injection Template Matching...\n');

  // Create mock issues with different SQL injection patterns
  const sqlInjectionIssues: Issue[] = [
    {
      id: 'sql-1',
      title: 'SQL Injection via String Concatenation',
      type: 'vulnerability',
      severity: 'critical',
      category: 'security',
      location: {
        file: 'src/api/user-controller.js',
        line: 45
      },
      message: 'User input directly concatenated in SQL query',
      description: 'Critical security vulnerability that could lead to data breach',
      codeSnippet: `const query = "SELECT * FROM users WHERE id = '" + userId + "'";\ndb.execute(query);`,
      suggestedFix: 'Use parameterized queries'
    },
    {
      id: 'sql-2', 
      title: 'Dynamic SQL Query Construction',
      type: 'vulnerability',
      severity: 'critical',
      category: 'security',
      location: {
        file: 'src/database/queries.ts',
        line: 112
      },
      message: 'Building SQL queries with template literals using unvalidated input',
      description: 'Critical security vulnerability',
      codeSnippet: `const sql = \`SELECT * FROM products WHERE category = '\${category}'\`;\nreturn db.query(sql);`,
      suggestedFix: 'Use prepared statements'
    },
    {
      id: 'sql-3',
      title: 'MongoDB Query Injection Risk', 
      type: 'vulnerability',
      severity: 'critical',
      category: 'security',
      location: {
        file: 'src/db/mongo-queries.js',
        line: 67
      },
      message: 'User input passed directly to MongoDB query operator',
      description: 'NoSQL injection vulnerability',
      codeSnippet: `const users = await collection.find(userQuery);`,
      suggestedFix: 'Validate and sanitize query operators'
    }
  ];

  // Create comparison result

  // Set the issues as pre-existing (in both branches) to ensure they appear
  // This simulates security vulnerabilities already in main that persist in PR
  const comparisonResult: ComparisonResult = {
    success: true,
    mainIssues: sqlInjectionIssues,
    prIssues: sqlInjectionIssues,
    addedIssues: [],
    fixedIssues: [],
    unchangedIssues: sqlInjectionIssues
  };

  // Initialize generator and generate report
  const generator = new ReportGeneratorV8Final();
  const report = await generator.generateReport(comparisonResult);
  
  // Save report
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = `test-reports/sql-injection-test-${timestamp}.md`;
  await fs.writeFile(reportPath, report);

  // Analyze template matching
  console.log('📊 SQL Injection Template Analysis:\n');
  
  // Check if templates were applied
  const hasOptionA = report.includes('OPTION A:');
  const hasOptionB = report.includes('OPTION B:');
  const hasParameterizedQuery = report.includes('parameterized') || report.includes('prepared statement');
  const hasSecurityWarning = report.includes('⚠️ **Important**');
  const hasConfidenceScore = report.includes('🟡 **Confidence:**') || report.includes('🟢 **Confidence:**');
  
  console.log(`✅ Option A/B Template: ${hasOptionA && hasOptionB ? '✓' : '✗'}`);
  console.log(`✅ Parameterized Query Fix: ${hasParameterizedQuery ? '✓' : '✗'}`);
  console.log(`✅ Security Warning: ${hasSecurityWarning ? '✓' : '✗'}`);
  console.log(`✅ Confidence Score: ${hasConfidenceScore ? '✓' : '✗'}`);

  // Check specific template patterns
  console.log('\n📋 Template Details:');
  for (const issue of sqlInjectionIssues) {
    const issueSection = report.substring(
      report.indexOf(issue.title),
      report.indexOf(issue.title) + 2000
    );
    
    const hasTemplate = issueSection.includes('Template Applied:');
    const templateType = hasTemplate ? 
      issueSection.match(/Template Applied:\*\* ([a-z-]+)/)?.[1] : 
      'none';
    
    console.log(`\n   Issue: ${issue.title}`);
    console.log(`   Template: ${templateType}`);
    console.log(`   Has Fix Options: ${issueSection.includes('OPTION A') ? 'Yes' : 'No'}`);
  }

  console.log('\n✅ SQL Injection template test completed!');
  console.log(`📄 Report saved to: ${reportPath}`);

  // Extract a sample fix for display
  const fixStart = report.indexOf('// OPTION A:');
  const fixEnd = report.indexOf('// OPTION B:', fixStart) + 500;
  if (fixStart > -1 && fixEnd > fixStart) {
    console.log('\n📝 Sample Fix Generated:');
    console.log('─'.repeat(50));
    console.log(report.substring(fixStart, Math.min(fixEnd, fixStart + 800)));
    console.log('─'.repeat(50));
  }

  return report;
}

// Run the test
testSQLInjectionTemplate().catch(console.error);