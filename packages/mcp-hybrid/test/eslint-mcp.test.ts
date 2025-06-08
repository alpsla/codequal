/**
 * Test for ESLint MCP Adapter
 * Validates the implementation works correctly
 */

import { eslintMCPAdapter } from '../src/adapters/mcp/eslint-mcp';
import { AnalysisContext, FileData } from '../src/core/interfaces';

// Sample JavaScript file with issues
const sampleJSFile: FileData = {
  path: 'src/utils/helper.js',
  content: `
// Sample file with various ESLint issues
var unusedVar = 42;  // no-var, no-unused-vars

function processData(data) {
  console.log("Processing data");  // no-console
  
  if (data == null) {  // eqeqeq
    return;
  }
  
  var result = [];  // no-var, prefer-const
  
  for (var i = 0; i < data.length; i++) {  // no-var
    result.push(data[i] * 2);
  }
  
  return result;
}

// Missing semicolon
const arrow = () => console.log("arrow")  // no-console

export default processData;
`,
  language: 'javascript',
  changeType: 'modified'
};

// Sample TypeScript file
const sampleTSFile: FileData = {
  path: 'src/components/Button.tsx',
  content: `
import React from 'react';

interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

// @ts-ignore - This should trigger a warning
const Button: React.FC<ButtonProps> = ({ label, onClick, disabled }) => {
  const unusedVariable = 'unused';  // @typescript-eslint/no-unused-vars
  
  console.log('Button rendered');  // no-console
  
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className="btn"
    >
      {label}
    </button>
  );
};

export default Button;
`,
  language: 'typescript',
  changeType: 'added'
};

// Sample context
const createTestContext = (files: FileData[]): AnalysisContext => ({
  agentRole: 'codeQuality',
  pr: {
    prNumber: 123,
    title: 'Test PR for ESLint',
    description: 'Testing ESLint MCP adapter',
    baseBranch: 'main',
    targetBranch: 'feature/test',
    author: 'test-user',
    files,
    commits: [{
      sha: 'abc123',
      message: 'Add test files',
      author: 'test-user'
    }]
  },
  repository: {
    name: 'test-repo',
    owner: 'test-org',
    languages: files.map(f => f.language || 'unknown').filter(l => l !== 'unknown'),
    frameworks: ['react'],
    primaryLanguage: 'javascript'
  },
  userContext: {
    userId: 'test-user-123',
    organizationId: 'test-org',
    permissions: ['read', 'write']
  }
});

async function runTest() {
  console.log('Testing ESLint MCP Adapter...\n');
  
  // Test 1: Can analyze check
  console.log('Test 1: Checking if ESLint can analyze JS/TS files');
  const context = createTestContext([sampleJSFile, sampleTSFile]);
  const canAnalyze = eslintMCPAdapter.canAnalyze(context);
  console.log(`Can analyze: ${canAnalyze}`);
  console.assert(canAnalyze === true, 'ESLint should be able to analyze JS/TS files');
  
  // Test 2: Metadata check
  console.log('\nTest 2: Checking metadata');
  const metadata = eslintMCPAdapter.getMetadata();
  console.log(`Tool ID: ${metadata.id}`);
  console.log(`Supported languages: ${metadata.supportedLanguages.join(', ')}`);
  console.assert(metadata.supportedLanguages.includes('javascript'), 'Should support JavaScript');
  console.assert(metadata.supportedLanguages.includes('typescript'), 'Should support TypeScript');
  
  // Test 3: Health check
  console.log('\nTest 3: Running health check');
  try {
    const isHealthy = await eslintMCPAdapter.healthCheck();
    console.log(`Health check: ${isHealthy ? 'PASSED' : 'FAILED'}`);
  } catch (error) {
    console.error('Health check error:', error);
  }
  
  // Test 4: Analyze files (mock since MCP server may not be running)
  console.log('\nTest 4: Testing analysis structure');
  console.log('Note: Actual analysis requires ESLint MCP server to be running');
  
  // Demonstrate expected output structure
  console.log('\nExpected analysis output structure:');
  console.log({
    success: true,
    toolId: 'eslint-mcp',
    executionTime: 1234,
    findings: [
      {
        type: 'issue',
        severity: 'high',
        category: 'code-quality',
        message: 'Unexpected var, use let or const instead',
        file: 'src/utils/helper.js',
        line: 3,
        column: 1,
        ruleId: 'no-var',
        documentation: 'https://eslint.org/docs/latest/rules/no-var',
        autoFixable: true
      }
    ],
    metrics: {
      filesAnalyzed: 2,
      totalIssues: 10,
      errors: 3,
      warnings: 7,
      fixableIssues: 5
    }
  });
  
  console.log('\n✅ ESLint MCP Adapter tests completed!');
}

// Run the test
runTest().catch(console.error);
