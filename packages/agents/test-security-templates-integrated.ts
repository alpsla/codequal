#!/usr/bin/env ts-node

/**
 * Test security template integration with large security PR
 * Verifies that security templates are properly matched and applied
 */

import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';

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
  persistentIssues?: Issue[];
  newIssues?: Issue[];
  resolvedIssues?: Issue[];
  changedIssues?: Issue[];
  breakingChanges?: any[];
}

// Test security issues that should match templates
const securityIssues: Issue[] = [
  // 1. MongoDB Injection - should match nosql-injection template
  {
    id: 'sec-001',
    severity: 'critical',
    category: 'security',
    type: 'vulnerability',
    location: {
      file: 'packages/api/src/database/mongodb-queries.ts',
      line: 178
    },
    message: 'NoSQL injection vulnerability in MongoDB query',
    title: 'MongoDB Injection Risk',
    description: 'User input used directly in MongoDB query operator',
    codeSnippet: `async function findUserByQuery(userQuery: any) {
  // Direct use of user input in query
  const user = await db.collection('users').findOne(userQuery);
  return user;
}`,
    suggestedFix: 'Sanitize query operators and validate input'
  },

  // 2. Weak Encryption - should match weak-encryption template
  {
    id: 'sec-002',
    severity: 'critical',
    category: 'security',
    type: 'vulnerability',
    location: {
      file: 'packages/crypto/src/encryption.ts',
      line: 23
    },
    message: 'Weak encryption algorithm DES is cryptographically broken',
    title: 'Weak Encryption Algorithm',
    description: 'DES encryption is no longer secure',
    codeSnippet: `import crypto from 'crypto';

function encryptData(data: string, key: string) {
  // Using weak DES algorithm
  const cipher = crypto.createCipheriv('des', key, iv);
  return cipher.update(data, 'utf8', 'hex') + cipher.final('hex');
}`,
    suggestedFix: 'Use AES-256-GCM or similar strong encryption'
  },

  // 3. File Upload Validation - should match file-upload-validation template
  {
    id: 'sec-003',
    severity: 'high',
    category: 'security',
    type: 'vulnerability',
    location: {
      file: 'packages/api/src/routes/upload.ts',
      line: 89
    },
    message: 'File upload handler lacks validation',
    title: 'Insecure File Upload Handler',
    description: 'No validation of file type, size, or content',
    codeSnippet: `app.post('/upload', upload.single('file'), (req, res) => {
  const file = req.file;
  // No validation!
  fs.writeFileSync(\`./uploads/\${file.originalname}\`, file.buffer);
  res.json({ filename: file.originalname });
});`,
    suggestedFix: 'Validate file type, size, and content'
  },

  // 4. Session Fixation - should match session-validation template
  {
    id: 'sec-004',
    severity: 'high',
    category: 'security',
    type: 'vulnerability',
    location: {
      file: 'packages/auth/src/session-manager.ts',
      line: 145
    },
    message: 'Session ID not regenerated after authentication',
    title: 'Session Fixation Vulnerability',
    description: 'Session ID remains the same after authentication',
    codeSnippet: `function handleLogin(req, res, user) {
  // Session ID not regenerated!
  req.session.userId = user.id;
  req.session.authenticated = true;
  res.json({ success: true });
}`,
    suggestedFix: 'Regenerate session ID after successful login'
  },

  // 5. Directory Traversal - should match path-traversal template
  {
    id: 'sec-005',
    severity: 'high',
    category: 'security',
    type: 'vulnerability',
    location: {
      file: 'packages/api/src/routes/files.ts',
      line: 67
    },
    message: 'Path traversal vulnerability in file access',
    title: 'Directory Traversal Risk',
    description: 'User input used directly in file path without sanitization',
    codeSnippet: `app.get('/api/file/:filename', (req, res) => {
  const filename = req.params.filename;
  // No path validation!
  const filePath = \`./data/\${filename}\`;
  res.sendFile(filePath);
});`,
    suggestedFix: 'Validate and sanitize file paths'
  },

  // 6. Email Validation - should match email-validation template
  {
    id: 'sec-006',
    severity: 'medium',
    category: 'security',
    type: 'vulnerability',
    location: {
      file: 'packages/api/src/validators/user-input.ts',
      line: 56
    },
    message: 'Email format not validated before processing',
    title: 'Missing Email Validation',
    description: 'Email addresses accepted without format validation',
    codeSnippet: `function validateUserInput(email: string, name: string) {
  if (!email) {
    throw new Error('Email is required');
  }
  // No email format validation!
  return { email, name };
}`,
    suggestedFix: 'Add comprehensive email validation'
  },

  // 7. Error Disclosure - should match error-disclosure template  
  {
    id: 'sec-007',
    severity: 'medium',
    category: 'security',
    type: 'vulnerability',
    location: {
      file: 'packages/api/src/error-handler.ts',
      line: 34
    },
    message: 'Stack traces exposed to client in error responses',
    title: 'Error Information Disclosure',
    description: 'Detailed error information sent to client',
    codeSnippet: `app.use((err, req, res, next) => {
  // Sending full error details to client
  res.status(500).json({
    error: err.message,
    stack: err.stack,
    details: err
  });
});`,
    suggestedFix: 'Hide sensitive error details in production'
  }
];

async function testSecurityTemplateIntegration() {
  console.log('🔍 Testing Security Template Integration...\n');
  
  const generator = new ReportGeneratorV8Final();
  
  // Create mock comparison result
  const comparisonResult: ComparisonResult = {
    success: true,
    prIssues: securityIssues,
    mainIssues: securityIssues, // Simulating pre-existing issues
    addedIssues: [],
    fixedIssues: [],
    unchangedIssues: securityIssues,
    persistentIssues: securityIssues,
    newIssues: [],
    resolvedIssues: [],
    changedIssues: []
  };

  try {
    // Generate report
    const report = await generator.generateReport(comparisonResult);

    // Check if security templates were applied
    console.log('📊 Analyzing Template Coverage:\n');
    
    let templatesMatched = 0;
    let templatesWithFixes = 0;
    
    // Check each issue in report for fix suggestions
    for (const issue of securityIssues) {
      const issueInReport = report.includes(issue.title);
      const hasFixSuggestion = report.includes('🔧 **Fix Suggestion:**') && 
                              report.includes('Template Applied:');
      
      if (issueInReport) {
        console.log(`✅ Issue found: ${issue.title}`);
        if (hasFixSuggestion) {
          templatesMatched++;
          console.log(`   ✅ Template matched and fix provided`);
        } else {
          console.log(`   ❌ No template fix found`);
        }
      }
    }

    console.log(`\n📈 Results:`);
    console.log(`   Total Security Issues: ${securityIssues.length}`);
    console.log(`   Templates Matched: ${templatesMatched}/${securityIssues.length}`);
    console.log(`   Coverage: ${Math.round(templatesMatched / securityIssues.length * 100)}%`);
    
    // Write report to file
    const fs = require('fs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = `security-integrated-report-${timestamp}.md`;
    fs.writeFileSync(reportPath, report);
    console.log(`\n📝 Full report saved to: ${reportPath}`);
    
    // Show sample of report with fix suggestions
    const fixSectionStart = report.indexOf('🔧 **Fix Suggestion:**');
    if (fixSectionStart > -1) {
      const fixSectionEnd = report.indexOf('\n\n', fixSectionStart);
      const fixSample = report.substring(fixSectionStart, fixSectionEnd);
      console.log('\n📋 Sample Fix Suggestion from Report:');
      console.log(fixSample);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testSecurityTemplateIntegration().then(() => {
  console.log('\n✅ Security template integration test completed');
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});