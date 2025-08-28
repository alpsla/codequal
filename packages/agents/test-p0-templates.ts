#!/usr/bin/env ts-node

/**
 * Test P0 Templates with Multiple Scenarios
 * Validates that our fix suggestions provide complete, copy-paste ready solutions
 */

import { enhancedTemplateLibrary } from './dist/standard/services/template-library-v2';
import { Issue } from './dist/standard/types/analysis-types';
import * as fs from 'fs';
import * as path from 'path';

// Test scenarios covering all P0 templates
const testScenarios: Issue[] = [
  // 1. Payment Validation
  {
    id: 'test-payment-1',
    title: 'Missing Payment Validation',
    message: 'Payment amount not validated before processing',
    description: 'Amount parameter accepts any value without validation',
    severity: 'high',
    category: 'security',
    type: 'vulnerability',
    location: { file: 'payment.ts', line: 45 },
    codeSnippet: `function processPayment(amount, userId) {
  // No validation
  return stripe.charge(userId, amount);
}`
  },
  
  // 2. Null Check - Simple
  {
    id: 'test-null-1',
    title: 'Missing Null Check',
    message: 'User object accessed without null check',
    description: 'Potential null pointer exception when accessing user properties',
    severity: 'medium',
    category: 'code-quality',
    type: 'bug',
    location: { file: 'user-utils.ts', line: 67 },
    codeSnippet: `function getUserEmail(user) {
  return user.profile.email; // user might be null
}`
  },
  
  // 3. Null Check - Complex nested
  {
    id: 'test-null-2',
    title: 'Potential Null Reference',
    message: 'Deeply nested property access without null checks',
    description: 'Accessing nested properties that might be undefined',
    severity: 'medium',
    category: 'code-quality',
    type: 'bug',
    location: { file: 'data-processor.ts', line: 123 },
    codeSnippet: `function getAddressCity(customer) {
  return customer.data.address.city.name;
}`
  },
  
  // 4. SQL Injection
  {
    id: 'test-sql-1',
    title: 'SQL Injection Vulnerability',
    message: 'Direct string concatenation in SQL query',
    description: 'User input directly concatenated into SQL query',
    severity: 'critical',
    category: 'security',
    type: 'vulnerability',
    location: { file: 'database.ts', line: 89 },
    codeSnippet: `async function getUser(userId, status) {
  const query = "SELECT * FROM users WHERE id = " + userId + " AND status = '" + status + "'";
  return await db.execute(query);
}`
  },
  
  // 5. XSS Vulnerability
  {
    id: 'test-xss-1',
    title: 'Cross-Site Scripting (XSS) Risk',
    message: 'User input rendered without escaping',
    description: 'innerHTML used with user-provided content',
    severity: 'high',
    category: 'security',
    type: 'vulnerability',
    location: { file: 'renderer.ts', line: 34 },
    codeSnippet: `function renderUserBio(userBio) {
  document.getElementById('bio').innerHTML = userBio;
}`
  },
  
  // 6. Missing Authentication
  {
    id: 'test-auth-1',
    title: 'Missing Authentication Check',
    message: 'Admin endpoint lacks authentication middleware',
    description: 'Sensitive endpoint accessible without auth',
    severity: 'critical',
    category: 'security',
    type: 'vulnerability',
    location: { file: 'admin-api.ts', line: 12 },
    codeSnippet: `app.delete('/api/admin/users/:id', async (req, res) => {
  // No auth check!
  await deleteUser(req.params.id);
  res.json({ success: true });
});`
  },
  
  // 7. Unhandled Promise/Error
  {
    id: 'test-error-1',
    title: 'Unhandled Promise Rejection',
    message: 'Async operation without error handling',
    description: 'fetch() call lacks try-catch',
    severity: 'medium',
    category: 'code-quality',
    type: 'bug',
    location: { file: 'api-client.ts', line: 56 },
    codeSnippet: `async function fetchUserData(userId) {
  const response = await fetch(\`/api/users/\${userId}\`);
  const data = await response.json();
  return data;
}`
  },
  
  // 8. Input Validation - Generic
  {
    id: 'test-validation-1',
    title: 'Missing Input Validation',
    message: 'User input not validated before processing',
    description: 'Function parameters lack validation',
    severity: 'high',
    category: 'security',
    type: 'vulnerability',
    location: { file: 'processor.ts', line: 78 },
    codeSnippet: `function processUserInput(email, age) {
  // No validation
  saveToDatabase(email, age);
}`
  }
];

async function testTemplates() {
  console.log('🧪 Testing P0 Templates with Various Scenarios\n');
  console.log('═'.repeat(60));
  
  const results: any[] = [];
  let passCount = 0;
  let failCount = 0;
  
  for (const scenario of testScenarios) {
    console.log(`\n📋 Testing: ${scenario.title}`);
    console.log(`   File: ${scenario.location?.file}:${scenario.location?.line}`);
    console.log(`   Severity: ${scenario.severity} | Category: ${scenario.category}`);
    
    try {
      const fix = enhancedTemplateLibrary.generateFix(scenario);
      
      if (fix) {
        console.log(`   ✅ Fix generated successfully`);
        console.log(`   📊 Confidence: ${fix.confidence}`);
        console.log(`   ⏱️  Time estimate: ${fix.estimatedMinutes} minutes`);
        
        // Validate fix quality
        const hasCompleteFunction = fix.code.includes('function ');
        const hasValidation = fix.code.includes('if (') || fix.code.includes('throw');
        const hasComments = fix.code.includes('//');
        const isReplacementReady = hasCompleteFunction && hasValidation;
        
        console.log(`   🔍 Quality checks:`);
        console.log(`      • Complete function: ${hasCompleteFunction ? '✅' : '❌'}`);
        console.log(`      • Has validation: ${hasValidation ? '✅' : '❌'}`);
        console.log(`      • Has comments: ${hasComments ? '✅' : '❌'}`);
        console.log(`      • Copy-paste ready: ${isReplacementReady ? '✅' : '❌'}`);
        
        if (isReplacementReady) {
          passCount++;
          console.log(`   🎉 PASS - Fix is complete and ready to use`);
        } else {
          failCount++;
          console.log(`   ⚠️  PARTIAL - Fix needs improvement`);
        }
        
        results.push({
          scenario: scenario.title,
          success: true,
          quality: isReplacementReady ? 'complete' : 'partial',
          confidence: fix.confidence,
          timeEstimate: fix.estimatedMinutes,
          fix: fix.code.substring(0, 200) + '...'
        });
        
      } else {
        console.log(`   ❌ No fix generated`);
        failCount++;
        results.push({
          scenario: scenario.title,
          success: false,
          quality: 'none',
          error: 'No template matched'
        });
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      failCount++;
      results.push({
        scenario: scenario.title,
        success: false,
        quality: 'error',
        error: error.message
      });
    }
  }
  
  // Generate report
  console.log('\n' + '═'.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY\n');
  console.log(`Total Tests: ${testScenarios.length}`);
  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`Success Rate: ${((passCount / testScenarios.length) * 100).toFixed(1)}%`);
  
  console.log('\n📋 Detailed Results:');
  console.log('─'.repeat(60));
  
  for (const result of results) {
    const icon = result.success && result.quality === 'complete' ? '✅' : 
                 result.success && result.quality === 'partial' ? '⚠️' : '❌';
    console.log(`${icon} ${result.scenario}`);
    if (result.confidence) {
      console.log(`   Confidence: ${result.confidence} | Time: ${result.timeEstimate}min`);
    }
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  }
  
  // Save full test results
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputDir = path.join(__dirname, 'test-results');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const outputPath = path.join(outputDir, `p0-template-test-${timestamp}.json`);
  fs.writeFileSync(outputPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      total: testScenarios.length,
      passed: passCount,
      failed: failCount,
      successRate: ((passCount / testScenarios.length) * 100).toFixed(1) + '%'
    },
    results
  }, null, 2));
  
  console.log(`\n💾 Full results saved to: ${outputPath}`);
  
  // Generate example fixes document
  const examplesPath = path.join(outputDir, `p0-template-examples-${timestamp}.md`);
  let examplesContent = '# P0 Template Fix Examples\n\n';
  examplesContent += `Generated: ${new Date().toISOString()}\n\n`;
  
  for (const scenario of testScenarios.slice(0, 3)) { // Show first 3 examples
    const fix = enhancedTemplateLibrary.generateFix(scenario);
    if (fix) {
      examplesContent += `## ${scenario.title}\n\n`;
      examplesContent += `**Issue:** ${scenario.description}\n\n`;
      examplesContent += `**Original Code:**\n\`\`\`typescript\n${scenario.codeSnippet}\n\`\`\`\n\n`;
      examplesContent += `**Fixed Code:**\n\`\`\`typescript\n${fix.code}\n\`\`\`\n\n`;
      examplesContent += `**Confidence:** ${fix.confidence} | **Time Estimate:** ${fix.estimatedMinutes} minutes\n\n`;
      examplesContent += '---\n\n';
    }
  }
  
  fs.writeFileSync(examplesPath, examplesContent);
  console.log(`📄 Example fixes saved to: ${examplesPath}`);
  
  console.log('\n' + '═'.repeat(60));
  console.log('🎯 RECOMMENDATIONS:\n');
  
  if (passCount === testScenarios.length) {
    console.log('✨ All templates are working perfectly!');
    console.log('   The fix suggestion system is ready for production.');
  } else if (passCount >= testScenarios.length * 0.8) {
    console.log('👍 Most templates are working well.');
    console.log('   Minor improvements needed for edge cases.');
  } else {
    console.log('⚠️  Templates need improvement.');
    console.log('   Focus on providing complete function replacements.');
  }
  
  console.log('\n✅ Test complete!');
  
  return passCount === testScenarios.length;
}

// Run the tests
testTemplates()
  .then(allPassed => {
    process.exit(allPassed ? 0 : 1);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });