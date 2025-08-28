#!/usr/bin/env ts-node

/**
 * Test function name extraction
 */

import { SecurityTemplateLibrary } from './src/standard/services/security-template-library';

const testCode = `function getUserByEmail(email: string) {
  const query = "SELECT * FROM users WHERE email = '" + email + "'";
  return db.execute(query);
}`;

const routerCode = `router.post('/upload', (req, res) => {
  const file = req.files.upload;
  file.mv('./uploads/' + file.name);
  res.send('File uploaded');
})`;

const lib = new SecurityTemplateLibrary();

// Access private method for testing
const extractFunctionName = (lib as any).extractFunctionName.bind(lib);
const extractParameters = (lib as any).extractParameters.bind(lib);

console.log('Testing function extraction:\n');

console.log('Test 1: Regular function');
console.log('Code:', testCode);
const funcName1 = extractFunctionName(testCode);
const params1 = extractParameters(testCode);
console.log('Extracted name:', funcName1);
console.log('Extracted params:', params1);

console.log('\nTest 2: Router pattern');
console.log('Code:', routerCode);
const funcName2 = extractFunctionName(routerCode);
const params2 = extractParameters(routerCode);
console.log('Extracted name:', funcName2);
console.log('Extracted params:', params2);

// Test the full template match
console.log('\n\nTesting full template match:');
const issue = {
  id: 'sec-001',
  severity: 'critical',
  category: 'security',
  title: 'SQL Injection Vulnerability',
  message: 'User input concatenated directly into SQL query',
  description: 'Direct string concatenation in database query',
  codeSnippet: testCode
};

const match = lib.getTemplateMatch(issue, 'typescript');
if (match && match.template) {
  console.log('\n✅ Template matched');
  console.log('Confidence:', match.confidence);
  
  // Show just the first part of the fix
  const fixLines = match.template.code.split('\n');
  console.log('\nGenerated fix (first 10 lines):');
  fixLines.slice(0, 10).forEach((line, i) => {
    console.log(`  ${i + 1}: ${line}`);
  });
}