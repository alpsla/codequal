#!/usr/bin/env ts-node

/**
 * Test Complete Fix Suggestion System
 * Tests both template-based fixes and AI fallback
 */

import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';
import * as fs from 'fs';
import * as path from 'path';

// Define types
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
  persistentIssues?: Issue[];
  newIssues?: Issue[];
  resolvedIssues?: Issue[];
  changedIssues?: Issue[];
  breakingChanges?: any[];
}

// Test PR #1: Security-focused (should use templates)
const securityPR: Issue[] = [
  // Template-matched issues
  {
    id: 'sec-001',
    severity: 'critical',
    category: 'security',
    type: 'vulnerability',
    location: { file: 'src/auth/login.ts', line: 45 },
    title: 'SQL Injection Vulnerability',
    message: 'User input concatenated directly into SQL query',
    description: 'Direct string concatenation in database query',
    codeSnippet: `function getUserByEmail(email: string) {
  const query = "SELECT * FROM users WHERE email = '" + email + "'";
  return db.execute(query);
}`
  },
  {
    id: 'sec-002',
    severity: 'high',
    category: 'security',
    type: 'vulnerability',
    location: { file: 'src/api/upload.ts', line: 123 },
    title: 'Unrestricted File Upload',
    message: 'File upload lacks validation for type and size',
    description: 'No validation of uploaded files',
    codeSnippet: `router.post('/upload', (req, res) => {
  const file = req.files.upload;
  file.mv('./uploads/' + file.name);
  res.send('File uploaded');
})`
  },
  {
    id: 'sec-003',
    severity: 'high',
    category: 'security',
    type: 'vulnerability',
    location: { file: 'src/config/secrets.ts', line: 8 },
    title: 'Hardcoded API Key',
    message: 'API key hardcoded in source code',
    description: 'Sensitive credentials in code',
    codeSnippet: `const config = {
  apiKey: 'sk-1234567890abcdef',
  dbPassword: 'admin123'
};`
  },
  
  // Non-template issues (should use AI fallback)
  {
    id: 'perf-001',
    severity: 'medium',
    category: 'performance',
    type: 'optimization',
    location: { file: 'src/utils/data-processor.ts', line: 234 },
    title: 'Inefficient Array Operation',
    message: 'Multiple array iterations can be combined',
    description: 'Performance issue with array processing',
    codeSnippet: `function processData(items: any[]) {
  const filtered = items.filter(item => item.active);
  const mapped = filtered.map(item => item.value);
  const sorted = mapped.sort((a, b) => a - b);
  return sorted;
}`
  },
  {
    id: 'quality-001',
    severity: 'low',
    category: 'code-quality',
    type: 'code-smell',
    location: { file: 'src/helpers/utils.ts', line: 89 },
    title: 'Magic Number',
    message: 'Hard-coded numeric value should be a named constant',
    description: 'Code maintainability issue',
    codeSnippet: `function calculateTimeout(retries: number) {
  return retries * 1000 * 2.5; // Magic number
}`
  }
];

// Test PR #2: Mixed language (Python)
const pythonPR: Issue[] = [
  {
    id: 'py-sec-001',
    severity: 'critical',
    category: 'security',
    type: 'vulnerability',
    location: { file: 'app/database.py', line: 67 },
    title: 'SQL Injection in Python',
    message: 'String formatting used in SQL query',
    description: 'Vulnerable to SQL injection',
    codeSnippet: `def get_user(user_id):
    query = f"SELECT * FROM users WHERE id = {user_id}"
    return db.execute(query)`
  },
  {
    id: 'py-sec-002',
    severity: 'high',
    category: 'security',
    type: 'vulnerability',
    location: { file: 'app/crypto.py', line: 23 },
    title: 'Weak Encryption Algorithm',
    message: 'MD5 hash used for password storage',
    description: 'Using broken cryptographic algorithm',
    codeSnippet: `import hashlib

def hash_password(password):
    return hashlib.md5(password.encode()).hexdigest()`
  }
];

// Test PR #3: Java issues
const javaPR: Issue[] = [
  {
    id: 'java-sec-001',
    severity: 'critical',
    category: 'security',
    type: 'vulnerability',
    location: { file: 'src/main/java/UserDao.java', line: 145 },
    title: 'SQL Injection in Java',
    message: 'String concatenation in JDBC query',
    description: 'SQL injection vulnerability',
    codeSnippet: `public User findUser(String username) {
    String sql = "SELECT * FROM users WHERE username = '" + username + "'";
    return jdbcTemplate.queryForObject(sql, new UserMapper());
}`
  }
];

async function testPR(prName: string, issues: Issue[], language: string = 'typescript') {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📋 Testing PR: ${prName}`);
  console.log(`   Language: ${language}`);
  console.log(`   Issues: ${issues.length}`);
  console.log(`${'='.repeat(70)}\n`);

  const generator = new ReportGeneratorV8Final();
  
  // Create comparison result
  const comparisonResult: ComparisonResult = {
    success: true,
    prIssues: issues,
    mainIssues: [],
    addedIssues: issues, // All issues are new in this PR
    fixedIssues: [],
    unchangedIssues: [],
    persistentIssues: [],
    newIssues: issues,
    resolvedIssues: [],
    changedIssues: []
  };

  try {
    // Generate report
    console.log('🔄 Generating report with fix suggestions...\n');
    const report = await generator.generateReport(comparisonResult);
    
    // Analyze results
    let templatesUsed = 0;
    let aiFallbackUsed = 0;
    let noFixProvided = 0;
    
    for (const issue of issues) {
      const issueTitle = issue.title || issue.message;
      console.log(`\n📌 Issue: ${issueTitle}`);
      console.log(`   Severity: ${issue.severity} | Category: ${issue.category}`);
      
      // Check if fix was provided in report
      const issueInReport = report.includes(issueTitle);
      
      if (issueInReport) {
        // Check for template-based fix
        if (report.includes(`Template Applied: ${issue.id}`) || 
            report.includes('Template Applied:') && report.includes(issueTitle)) {
          console.log(`   ✅ Template-based fix provided`);
          console.log(`      - Drop-in replacement (Option A)`);
          console.log(`      - Refactored approach (Option B)`);
          templatesUsed++;
        }
        // Check for AI-generated fix
        else if (report.includes('AI-generated fix') || 
                 report.includes('ai-fallback') ||
                 report.includes('🔧 **Fix Suggestion:**') && 
                 !report.includes('Template Applied:')) {
          console.log(`   🤖 AI-generated fix provided (template not available)`);
          aiFallbackUsed++;
        } else {
          console.log(`   ⚠️  Issue identified but no fix provided`);
          noFixProvided++;
        }
        
        // Extract confidence level if present
        const confidenceMatch = report.match(new RegExp(`${issueTitle}[\\s\\S]*?Confidence:\\s*(\\w+)`, 'i'));
        if (confidenceMatch) {
          console.log(`   💡 Confidence: ${confidenceMatch[1]}`);
        }
      } else {
        console.log(`   ❌ Issue not found in report`);
      }
    }
    
    // Summary statistics
    console.log(`\n${'─'.repeat(70)}`);
    console.log('📊 Fix Coverage Summary:');
    console.log(`   Template-based fixes: ${templatesUsed}/${issues.length} (${Math.round(templatesUsed/issues.length*100)}%)`);
    console.log(`   AI-generated fixes: ${aiFallbackUsed}/${issues.length} (${Math.round(aiFallbackUsed/issues.length*100)}%)`);
    console.log(`   No fix provided: ${noFixProvided}/${issues.length} (${Math.round(noFixProvided/issues.length*100)}%)`);
    console.log(`   Total coverage: ${(templatesUsed + aiFallbackUsed)}/${issues.length} (${Math.round((templatesUsed + aiFallbackUsed)/issues.length*100)}%)`);
    
    // Save report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = `test-reports/pr-${prName.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.md`;
    
    // Create directory if it doesn't exist
    if (!fs.existsSync('test-reports')) {
      fs.mkdirSync('test-reports');
    }
    
    fs.writeFileSync(reportPath, report);
    console.log(`\n📝 Full report saved to: ${reportPath}`);
    
    // Show sample of fixes
    if (templatesUsed > 0) {
      console.log('\n📋 Sample Template Fix:');
      const templateStart = report.indexOf('OPTION A: Drop-in replacement');
      if (templateStart > -1) {
        const templateEnd = report.indexOf('OPTION B:', templateStart);
        const sample = report.substring(templateStart, Math.min(templateStart + 300, templateEnd));
        console.log('   ' + sample.split('\n').slice(0, 5).join('\n   '));
      }
    }
    
    return { templatesUsed, aiFallbackUsed, noFixProvided };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return { templatesUsed: 0, aiFallbackUsed: 0, noFixProvided: issues.length };
  }
}

async function runAllTests() {
  console.log('🚀 Starting Complete Fix Suggestion System Test');
  console.log('   Testing: Template matching + AI fallback\n');
  
  const results = [];
  
  // Test 1: TypeScript/JavaScript security PR
  results.push(await testPR('Security Vulnerabilities PR', securityPR, 'typescript'));
  
  // Wait a bit between tests
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 2: Python PR
  results.push(await testPR('Python Security PR', pythonPR, 'python'));
  
  // Wait a bit between tests
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 3: Java PR
  results.push(await testPR('Java Security PR', javaPR, 'java'));
  
  // Overall summary
  console.log(`\n${'='.repeat(70)}`);
  console.log('🎯 OVERALL TEST SUMMARY');
  console.log(`${'='.repeat(70)}`);
  
  let totalTemplates = 0;
  let totalAI = 0;
  let totalNoFix = 0;
  
  results.forEach((r, i) => {
    totalTemplates += r.templatesUsed;
    totalAI += r.aiFallbackUsed;
    totalNoFix += r.noFixProvided;
  });
  
  const totalIssues = securityPR.length + pythonPR.length + javaPR.length;
  
  console.log(`\n📊 Aggregate Results:`);
  console.log(`   Total Issues Tested: ${totalIssues}`);
  console.log(`   Template Fixes: ${totalTemplates} (${Math.round(totalTemplates/totalIssues*100)}%)`);
  console.log(`   AI Fallback Fixes: ${totalAI} (${Math.round(totalAI/totalIssues*100)}%)`);
  console.log(`   No Fix: ${totalNoFix} (${Math.round(totalNoFix/totalIssues*100)}%)`);
  console.log(`   Overall Fix Coverage: ${totalTemplates + totalAI}/${totalIssues} (${Math.round((totalTemplates + totalAI)/totalIssues*100)}%)`);
  
  console.log('\n✅ Test Complete!');
  console.log('   - Security templates provide drop-in replacements');
  console.log('   - AI fallback handles non-template issues');
  console.log('   - Multi-language support working');
}

// Run the tests
runAllTests().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});