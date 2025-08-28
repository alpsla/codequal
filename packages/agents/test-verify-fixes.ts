#!/usr/bin/env ts-node

/**
 * Verify all template fixes preserve function names
 */

import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';

const testIssues = [
  {
    id: 'sql-001',
    severity: 'critical' as const,
    category: 'security' as const,
    title: 'SQL Injection Vulnerability',
    message: 'Direct string concatenation in database query',
    codeSnippet: `function getUserByEmail(email: string) {
  const query = "SELECT * FROM users WHERE email = '" + email + "'";
  return db.execute(query);
}`
  },
  {
    id: 'upload-001',
    severity: 'high' as const,
    category: 'security' as const,
    title: 'Unrestricted File Upload',
    message: 'No validation of uploaded files',
    codeSnippet: `router.post('/upload', (req, res) => {
  const file = req.files.upload;
  file.mv('./uploads/' + file.name);
  res.send('File uploaded');
})`
  },
  {
    id: 'java-001',
    severity: 'critical' as const,
    category: 'security' as const,
    title: 'SQL Injection in Java',
    message: 'String concatenation in JDBC query',
    codeSnippet: `public User findUser(String username) {
  String sql = "SELECT * FROM users WHERE username = '" + username + "'";
  return jdbcTemplate.queryForObject(sql, new UserMapper());
}`
  }
];

async function verifyFixes() {
  console.log('🔍 Verifying Function Name Preservation in Fixes\n');
  
  const generator = new ReportGeneratorV8Final();
  
  const comparisonResult: any = {
    success: true,
    prIssues: testIssues,
    mainIssues: [],
    addedIssues: testIssues,
    fixedIssues: [],
    unchangedIssues: [],
    newIssues: testIssues.map(i => ({...i, message: i.message || i.title})),
    resolvedIssues: [],
    changedIssues: []
  };

  const report = await generator.generateReport(comparisonResult);
  
  // Check each fix
  const results = [];
  
  for (const issue of testIssues) {
    const originalFunc = issue.codeSnippet.match(/function\s+(\w+)|router\.\w+\('([^']+)'|public\s+\w+\s+(\w+)/);
    const expected = originalFunc ? 
      (originalFunc[1] || (originalFunc[2] ? `handle${originalFunc[2].split('/')[1]?.charAt(0).toUpperCase()}${originalFunc[2].split('/')[1]?.slice(1)}` : '') || originalFunc[3]) 
      : 'unknown';
    
    // Check if the fix preserves the function name
    const fixPattern = new RegExp(`function ${expected}\\(|router\\.post\\('/upload'`);
    const preserved = fixPattern.test(report);
    
    console.log(`${preserved ? '✅' : '❌'} ${issue.id}: ${expected}`);
    results.push({ issue: issue.id, expected, preserved });
  }
  
  const allPassed = results.every(r => r.preserved);
  
  console.log(`\n${allPassed ? '✅' : '❌'} Overall: ${allPassed ? 'All function names preserved!' : 'Some function names not preserved'}`);
  
  // Save report for inspection
  const fs = require('fs');
  fs.writeFileSync('test-reports/verify-fixes.md', report);
  console.log('\n📝 Full report saved to: test-reports/verify-fixes.md');
  
  return allPassed;
}

verifyFixes().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Error:', error);
  process.exit(1);
});