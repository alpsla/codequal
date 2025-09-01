#!/usr/bin/env ts-node

/**
 * Test Enhanced Security Agent with Code Fix Recommendations
 * Demonstrates how the enhanced agent provides specific code fixes
 */

import { EnhancedSecurityAgent } from './src/specialized/enhanced-security-agent';
import * as fs from 'fs';

// Mock vulnerabilities from MCP tools (Semgrep, npm-audit, etc.)
const mockVulnerabilities = [
  {
    id: 'vuln-001',
    type: 'security',
    severity: 'critical',
    category: 'sql-injection',
    title: 'SQL Injection',
    description: 'User input directly concatenated into SQL query',
    cwe: 'CWE-89',
    owasp: 'A03:2021',
    location: {
      file: 'src/api/users.controller.ts',
      line: 45,
      column: 12
    },
    evidence: {
      codeSnippet: 'const query = "SELECT * FROM users WHERE id = " + req.params.id;'
    }
  },
  {
    id: 'vuln-002',
    type: 'security',
    severity: 'high',
    category: 'xss',
    title: 'Cross-Site Scripting (XSS)',
    description: 'dangerouslySetInnerHTML used with user-controlled content',
    cwe: 'CWE-79',
    owasp: 'A03:2021',
    location: {
      file: 'src/components/Comment.tsx',
      line: 23,
      column: 8
    },
    evidence: {
      codeSnippet: '<div dangerouslySetInnerHTML={{ __html: userComment }} />'
    }
  },
  {
    id: 'vuln-003',
    type: 'security',
    severity: 'high',
    category: 'weak-jwt',
    title: 'Weak JWT Secret',
    description: 'Using a hardcoded or weak secret for JWT signing',
    cwe: 'CWE-798',
    owasp: 'A02:2021',
    location: {
      file: 'src/auth/jwt.service.ts',
      line: 15,
      column: 10
    },
    evidence: {
      codeSnippet: "const token = jwt.sign(payload, 'my-secret-key');"
    }
  },
  {
    id: 'vuln-004',
    type: 'security',
    severity: 'medium',
    category: 'weak-crypto',
    title: 'Weak Cryptographic Algorithm',
    description: 'MD5 hash used for password storage',
    cwe: 'CWE-327',
    owasp: 'A02:2021',
    location: {
      file: 'src/auth/password.service.ts',
      line: 8,
      column: 15
    },
    evidence: {
      codeSnippet: "const hash = crypto.createHash('md5').update(password).digest('hex');"
    }
  },
  {
    id: 'vuln-005',
    type: 'security',
    severity: 'high',
    category: 'command-injection',
    title: 'Command Injection',
    description: 'User input passed to shell command',
    cwe: 'CWE-78',
    owasp: 'A03:2021',
    location: {
      file: 'src/utils/file-reader.ts',
      line: 12,
      column: 5
    },
    evidence: {
      codeSnippet: 'exec(`cat ${filename}`, (error, stdout) => {'
    }
  },
  {
    id: 'vuln-006',
    type: 'security',
    severity: 'medium',
    category: 'insecure-random',
    title: 'Insecure Random Number Generation',
    description: 'Math.random() used for token generation',
    cwe: 'CWE-338',
    owasp: 'A02:2021',
    location: {
      file: 'src/auth/token.service.ts',
      line: 5,
      column: 20
    },
    evidence: {
      codeSnippet: 'const token = Math.random().toString(36).substring(2);'
    }
  }
];

async function testEnhancedSecurityAgent() {
  console.log('🔒 Enhanced Security Agent Report with Code Fix Recommendations\n');
  console.log('=' .repeat(80));
  
  // Initialize enhanced agent
  const agent = new EnhancedSecurityAgent();
  
  // Analyze with code fixes
  const enhancedVulnerabilities = await agent.analyzeWithCodeFixes(mockVulnerabilities);
  
  // Generate detailed console report
  console.log('\n📊 Analysis Summary');
  console.log(`Total Vulnerabilities: ${enhancedVulnerabilities.length}`);
  console.log(`Critical: ${enhancedVulnerabilities.filter(v => v.severity === 'critical').length}`);
  console.log(`High: ${enhancedVulnerabilities.filter(v => v.severity === 'high').length}`);
  console.log(`Medium: ${enhancedVulnerabilities.filter(v => v.severity === 'medium').length}`);
  
  // Generate HTML report with code fixes
  const htmlReport = generateHTMLReport(enhancedVulnerabilities);
  const filename = `enhanced-security-report-${new Date().toISOString().replace(/[:.]/g, '-')}.html`;
  fs.writeFileSync(filename, htmlReport);
  
  console.log('\n📋 Detailed Vulnerability Analysis with Code Fixes\n');
  console.log('=' .repeat(80));
  
  // Display each vulnerability with code fix
  for (const vuln of enhancedVulnerabilities) {
    console.log(`\n🔴 ${vuln.severity.toUpperCase()}: ${vuln.title}`);
    console.log(`📍 Location: ${vuln.location?.file}:${vuln.location?.line}`);
    console.log(`🏷️  ${vuln.cwe} | ${vuln.owasp}`);
    console.log(`📝 Description: ${vuln.description}`);
    
    if (vuln.evidence?.codeSnippet) {
      console.log(`\n💻 Vulnerable Code:`);
      console.log(`   ${vuln.evidence.codeSnippet}`);
    }
    
    if (vuln.codeFix) {
      console.log(`\n✅ Code Fix Recommendation:`);
      console.log(`   ${vuln.codeFix.description}`);
      console.log(`\n   ❌ Before:`);
      vuln.codeFix.before.split('\n').forEach(line => {
        console.log(`      ${line}`);
      });
      console.log(`\n   ✅ After:`);
      vuln.codeFix.after.split('\n').forEach(line => {
        console.log(`      ${line}`);
      });
      console.log(`\n   💡 Explanation: ${vuln.codeFix.explanation}`);
      
      if (vuln.codeFix.preventionTips && vuln.codeFix.preventionTips.length > 0) {
        console.log(`\n   🛡️ Prevention Tips:`);
        vuln.codeFix.preventionTips.forEach(tip => {
          console.log(`      • ${tip}`);
        });
      }
    }
    console.log('\n' + '-'.repeat(80));
  }
  
  console.log(`\n✅ Enhanced HTML report saved to: ${filename}`);
  console.log('\n🎯 Key Improvements in Enhanced Report:');
  console.log('   ✅ Specific code fix examples for each vulnerability type');
  console.log('   ✅ Before/After code comparisons');
  console.log('   ✅ Detailed explanations of why the fix works');
  console.log('   ✅ Prevention tips to avoid similar issues');
  console.log('   ✅ Framework-specific recommendations');
}

function generateHTMLReport(vulnerabilities: any[]): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Enhanced Security Analysis Report with Code Fixes</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      margin: 40px; 
      background: #f5f5f5; 
      line-height: 1.6;
    }
    .container { 
      max-width: 1400px; 
      margin: 0 auto; 
      background: white; 
      padding: 30px; 
      border-radius: 10px; 
      box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
    }
    h1 { 
      color: #2c3e50; 
      border-bottom: 3px solid #3498db; 
      padding-bottom: 10px; 
    }
    h2 { 
      color: #34495e; 
      margin-top: 30px; 
    }
    h3 {
      color: #2c3e50;
      margin-top: 20px;
    }
    .vulnerability { 
      margin: 20px 0; 
      padding: 20px; 
      border-radius: 8px; 
      border: 1px solid #ddd;
    }
    .critical { background: #fee; border-left: 5px solid #dc3545; }
    .high { background: #fff3cd; border-left: 5px solid #ffc107; }
    .medium { background: #fff8e1; border-left: 5px solid #ff9800; }
    .low { background: #f0f8ff; border-left: 5px solid #2196f3; }
    
    .code-block {
      background: #2c3e50;
      color: #ecf0f1;
      padding: 15px;
      border-radius: 5px;
      font-family: 'Courier New', monospace;
      margin: 10px 0;
      overflow-x: auto;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    
    .code-before {
      background: #c0392b;
      color: #fff;
      padding: 15px;
      border-radius: 5px;
      font-family: 'Courier New', monospace;
      margin: 10px 0;
      overflow-x: auto;
      white-space: pre-wrap;
    }
    
    .code-after {
      background: #27ae60;
      color: #fff;
      padding: 15px;
      border-radius: 5px;
      font-family: 'Courier New', monospace;
      margin: 10px 0;
      overflow-x: auto;
      white-space: pre-wrap;
    }
    
    .fix-section {
      background: #e8f5e9;
      border: 1px solid #4caf50;
      padding: 20px;
      border-radius: 8px;
      margin: 15px 0;
    }
    
    .prevention-tips {
      background: #e3f2fd;
      padding: 15px;
      margin: 15px 0;
      border-radius: 5px;
      border-left: 3px solid #2196f3;
    }
    
    .prevention-tips ul {
      margin: 10px 0;
      padding-left: 20px;
    }
    
    .prevention-tips li {
      margin: 5px 0;
    }
    
    .location {
      color: #666;
      font-family: monospace;
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
    }
    
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 3px;
      font-size: 12px;
      font-weight: bold;
      margin-right: 5px;
    }
    
    .cwe { background: #e1bee7; color: #6a1b9a; }
    .owasp { background: #ffccbc; color: #e64a19; }
    
    .explanation {
      background: #fff9c4;
      padding: 10px;
      border-radius: 5px;
      margin: 10px 0;
      border-left: 3px solid #f9a825;
    }
  </style>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css">
</head>
<body>
  <div class="container">
    <h1>🔒 Enhanced Security Analysis Report with Code Fix Recommendations</h1>
    
    <h2>📊 Executive Summary</h2>
    <p>This enhanced report provides specific, actionable code fixes for each identified vulnerability.</p>
    <ul>
      <li>Total Vulnerabilities: ${vulnerabilities.length}</li>
      <li>Critical: ${vulnerabilities.filter(v => v.severity === 'critical').length}</li>
      <li>High: ${vulnerabilities.filter(v => v.severity === 'high').length}</li>
      <li>Medium: ${vulnerabilities.filter(v => v.severity === 'medium').length}</li>
    </ul>
    
    <h2>🔍 Detailed Vulnerability Analysis</h2>
    
    ${vulnerabilities.map(vuln => `
      <div class="vulnerability ${vuln.severity}">
        <h3>${vuln.title}</h3>
        <p>
          <span class="badge cwe">${vuln.cwe || 'N/A'}</span>
          <span class="badge owasp">${vuln.owasp || 'N/A'}</span>
          <span class="location">📍 ${vuln.location?.file}:${vuln.location?.line}</span>
        </p>
        <p><strong>Description:</strong> ${vuln.description}</p>
        
        ${vuln.evidence?.codeSnippet ? `
          <h4>Vulnerable Code:</h4>
          <div class="code-block">${escapeHtml(vuln.evidence.codeSnippet)}</div>
        ` : ''}
        
        ${vuln.codeFix ? `
          <div class="fix-section">
            <h4>✅ Recommended Fix: ${vuln.codeFix.description}</h4>
            
            <h5>❌ Before (Vulnerable):</h5>
            <div class="code-before">${escapeHtml(vuln.codeFix.before)}</div>
            
            <h5>✅ After (Secure):</h5>
            <div class="code-after">${escapeHtml(vuln.codeFix.after)}</div>
            
            <div class="explanation">
              <strong>💡 Why this fixes the issue:</strong><br>
              ${vuln.codeFix.explanation}
            </div>
            
            ${vuln.codeFix.preventionTips && vuln.codeFix.preventionTips.length > 0 ? `
              <div class="prevention-tips">
                <strong>🛡️ Prevention Best Practices:</strong>
                <ul>
                  ${vuln.codeFix.preventionTips.map(tip => `<li>${tip}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `).join('')}
    
    <h2>🎯 Key Features of This Enhanced Report</h2>
    <ul>
      <li>✅ Specific code examples showing exactly how to fix each vulnerability</li>
      <li>✅ Before/After comparisons for clear understanding</li>
      <li>✅ Explanations of why each fix works</li>
      <li>✅ Prevention tips to avoid similar issues in the future</li>
      <li>✅ Framework and language-specific recommendations</li>
      <li>✅ Security best practices aligned with OWASP guidelines</li>
    </ul>
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Run the test
testEnhancedSecurityAgent().catch(console.error);