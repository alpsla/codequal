/**
 * Test script to investigate DeepWiki chat API capabilities
 * 
 * This script tests:
 * 1. Basic chat functionality
 * 2. Multi-context chat (comparing two reports)
 * 3. Specific question types (security, architecture, changes)
 * 4. Response quality and structure
 * 5. Performance and limitations
 */

import { DeepWikiClient } from '@codequal/core/deepwiki/DeepWikiClient';
import * as fs from 'fs/promises';
import * as path from 'path';

const DEEPWIKI_URL = process.env.DEEPWIKI_URL || 'http://localhost:8001/api';
const DEEPWIKI_API_KEY = process.env.DEEPWIKI_API_KEY || '';

interface TestResult {
  testName: string;
  success: boolean;
  responseTime: number;
  response?: any;
  error?: string;
}

interface ChatTestSuite {
  repoUrl: string;
  tests: TestResult[];
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    averageResponseTime: number;
  };
}

async function testBasicChat(client: DeepWikiClient, repoUrl: string): Promise<TestResult> {
  const startTime = Date.now();
  const testName = 'Basic Chat - Repository Overview';
  
  try {
    console.log(`\n🧪 Testing: ${testName}`);
    
    const response = await client.getChatCompletion(repoUrl, {
      messages: [
        {
          role: 'system',
          content: 'You are an expert code analyst. Provide concise, actionable insights.'
        },
        {
          role: 'user',
          content: 'What is the overall architecture of this repository? List the main components.'
        }
      ],
      modelConfig: {
        provider: 'openai',
        model: 'gpt-4o'
      }
    });
    
    const responseTime = Date.now() - startTime;
    console.log(`✅ Success in ${responseTime}ms`);
    
    return {
      testName,
      success: true,
      responseTime,
      response
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.log(`❌ Failed: ${error.message}`);
    
    return {
      testName,
      success: false,
      responseTime,
      error: error.message
    };
  }
}

async function testSecurityQuestions(client: DeepWikiClient, repoUrl: string): Promise<TestResult> {
  const startTime = Date.now();
  const testName = 'Security Analysis Questions';
  
  try {
    console.log(`\n🧪 Testing: ${testName}`);
    
    const response = await client.getChatCompletion(repoUrl, {
      messages: [
        {
          role: 'system',
          content: 'You are a security expert analyzing code for vulnerabilities.'
        },
        {
          role: 'user',
          content: 'What are the top 3 security concerns in this repository? Include specific files if relevant.'
        }
      ],
      modelConfig: {
        provider: 'openai',
        model: 'gpt-4o'
      }
    });
    
    const responseTime = Date.now() - startTime;
    console.log(`✅ Success in ${responseTime}ms`);
    
    return {
      testName,
      success: true,
      responseTime,
      response
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.log(`❌ Failed: ${error.message}`);
    
    return {
      testName,
      success: false,
      responseTime,
      error: error.message
    };
  }
}

async function testCodeQualityQuestions(client: DeepWikiClient, repoUrl: string): Promise<TestResult> {
  const startTime = Date.now();
  const testName = 'Code Quality Analysis';
  
  try {
    console.log(`\n🧪 Testing: ${testName}`);
    
    const response = await client.getChatCompletion(repoUrl, {
      messages: [
        {
          role: 'system',
          content: 'You are a code quality expert focusing on maintainability and best practices.'
        },
        {
          role: 'user',
          content: 'What are the main code quality issues? Focus on patterns, not individual style issues.'
        }
      ],
      modelConfig: {
        provider: 'openai',
        model: 'gpt-4o'
      }
    });
    
    const responseTime = Date.now() - startTime;
    console.log(`✅ Success in ${responseTime}ms`);
    
    return {
      testName,
      success: true,
      responseTime,
      response
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.log(`❌ Failed: ${error.message}`);
    
    return {
      testName,
      success: false,
      responseTime,
      error: error.message
    };
  }
}

async function testMultiQuestionConversation(client: DeepWikiClient, repoUrl: string): Promise<TestResult> {
  const startTime = Date.now();
  const testName = 'Multi-Question Conversation';
  
  try {
    console.log(`\n🧪 Testing: ${testName}`);
    
    // First question
    const response1 = await client.getChatCompletion(repoUrl, {
      messages: [
        {
          role: 'system',
          content: 'You are an expert code analyst.'
        },
        {
          role: 'user',
          content: 'What is the main authentication mechanism used in this repository?'
        }
      ],
      modelConfig: {
        provider: 'openai',
        model: 'gpt-4o'
      }
    });
    
    // Follow-up question (simulating conversation context)
    const response2 = await client.getChatCompletion(repoUrl, {
      messages: [
        {
          role: 'system',
          content: 'You are an expert code analyst.'
        },
        {
          role: 'user',
          content: 'What is the main authentication mechanism used in this repository?'
        },
        {
          role: 'assistant',
          content: JSON.stringify(response1) // Include previous response
        },
        {
          role: 'user',
          content: 'Are there any security vulnerabilities in that authentication implementation?'
        }
      ],
      modelConfig: {
        provider: 'openai',
        model: 'gpt-4o'
      }
    });
    
    const responseTime = Date.now() - startTime;
    console.log(`✅ Success in ${responseTime}ms`);
    
    return {
      testName,
      success: true,
      responseTime,
      response: { first: response1, followUp: response2 }
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.log(`❌ Failed: ${error.message}`);
    
    return {
      testName,
      success: false,
      responseTime,
      error: error.message
    };
  }
}

async function testComparativeAnalysis(client: DeepWikiClient, repoUrl: string): Promise<TestResult> {
  const startTime = Date.now();
  const testName = 'Comparative Analysis (Simulated)';
  
  try {
    console.log(`\n🧪 Testing: ${testName}`);
    
    // This simulates comparing two versions
    const response = await client.getChatCompletion(repoUrl, {
      messages: [
        {
          role: 'system',
          content: 'You are analyzing changes between two versions of a repository.'
        },
        {
          role: 'user',
          content: `Imagine you have analyzed this repository at two different points:
          1. Main branch from 3 months ago
          2. Current feature branch
          
          What types of changes would you look for to identify:
          - New security risks
          - Breaking changes
          - Performance impacts
          - Architectural shifts`
        }
      ],
      modelConfig: {
        provider: 'openai',
        model: 'gpt-4o'
      }
    });
    
    const responseTime = Date.now() - startTime;
    console.log(`✅ Success in ${responseTime}ms`);
    
    return {
      testName,
      success: true,
      responseTime,
      response
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.log(`❌ Failed: ${error.message}`);
    
    return {
      testName,
      success: false,
      responseTime,
      error: error.message
    };
  }
}

async function saveTestResults(suite: ChatTestSuite): Promise<void> {
  const outputDir = path.join(process.cwd(), 'deepwiki-chat-test-results');
  await fs.mkdir(outputDir, { recursive: true });
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `chat-api-test-${timestamp}.json`;
  
  await fs.writeFile(
    path.join(outputDir, filename),
    JSON.stringify(suite, null, 2)
  );
  
  // Also save a summary
  const summaryPath = path.join(outputDir, 'CHAT-API-TEST-SUMMARY.md');
  const summary = `# DeepWiki Chat API Test Summary

**Date**: ${new Date().toISOString()}
**Repository**: ${suite.repoUrl}

## Results Overview

- **Total Tests**: ${suite.summary.totalTests}
- **Passed**: ${suite.summary.passed}
- **Failed**: ${suite.summary.failed}
- **Average Response Time**: ${suite.summary.averageResponseTime}ms

## Test Details

${suite.tests.map(test => `
### ${test.testName}
- **Status**: ${test.success ? '✅ Passed' : '❌ Failed'}
- **Response Time**: ${test.responseTime}ms
${test.error ? `- **Error**: ${test.error}` : ''}
`).join('\n')}

## Key Findings

1. **Chat API Availability**: ${suite.summary.passed > 0 ? 'Working' : 'Not Working'}
2. **Performance**: ${suite.summary.averageResponseTime < 5000 ? 'Good' : 'Needs Optimization'}
3. **Reliability**: ${(suite.summary.passed / suite.summary.totalTests * 100).toFixed(0)}% success rate

## Recommendations

${suite.summary.passed === suite.summary.totalTests ? 
  '- Chat API is fully functional and ready for integration' :
  suite.summary.passed > 0 ?
  '- Chat API is partially working, investigate failures' :
  '- Chat API is not working, check configuration and endpoints'
}
`;
  
  await fs.writeFile(summaryPath, summary);
  console.log(`\n📄 Results saved to: ${outputDir}`);
}

async function runChatAPITests(repoUrl = 'https://github.com/expressjs/express'): Promise<void> {
  console.log('🚀 DeepWiki Chat API Investigation');
  console.log('==================================\n');
  console.log(`Repository: ${repoUrl}`);
  console.log(`DeepWiki URL: ${DEEPWIKI_URL}`);
  console.log(`API Key: ${DEEPWIKI_API_KEY ? 'Configured' : 'Not configured'}\n`);
  
  // Initialize client
  const client = new DeepWikiClient({
    apiUrl: DEEPWIKI_URL,
    apiKey: DEEPWIKI_API_KEY
  });
  
  const suite: ChatTestSuite = {
    repoUrl,
    tests: [],
    summary: {
      totalTests: 0,
      passed: 0,
      failed: 0,
      averageResponseTime: 0
    }
  };
  
  // Run tests
  const tests = [
    () => testBasicChat(client, repoUrl),
    () => testSecurityQuestions(client, repoUrl),
    () => testCodeQualityQuestions(client, repoUrl),
    () => testMultiQuestionConversation(client, repoUrl),
    () => testComparativeAnalysis(client, repoUrl)
  ];
  
  for (const test of tests) {
    const result = await test();
    suite.tests.push(result);
  }
  
  // Calculate summary
  suite.summary.totalTests = suite.tests.length;
  suite.summary.passed = suite.tests.filter(t => t.success).length;
  suite.summary.failed = suite.tests.filter(t => !t.success).length;
  suite.summary.averageResponseTime = Math.round(
    suite.tests.reduce((sum, t) => sum + t.responseTime, 0) / suite.tests.length
  );
  
  // Display results
  console.log('\n📊 Test Summary');
  console.log('================');
  console.log(`Total Tests: ${suite.summary.totalTests}`);
  console.log(`Passed: ${suite.summary.passed}`);
  console.log(`Failed: ${suite.summary.failed}`);
  console.log(`Average Response Time: ${suite.summary.averageResponseTime}ms`);
  
  // Save results
  await saveTestResults(suite);
  
  // Display recommendations
  console.log('\n💡 Recommendations');
  console.log('==================');
  
  if (suite.summary.passed === suite.summary.totalTests) {
    console.log('✅ DeepWiki Chat API is fully functional!');
    console.log('   - Proceed with dual-branch analysis implementation');
    console.log('   - Consider caching strategies for performance');
  } else if (suite.summary.passed > 0) {
    console.log('⚠️  DeepWiki Chat API is partially working');
    console.log('   - Investigate failed tests');
    console.log('   - May need to adjust API endpoints or authentication');
  } else {
    console.log('❌ DeepWiki Chat API is not accessible');
    console.log('   - Check DeepWiki service is running');
    console.log('   - Verify API endpoints and authentication');
    console.log('   - Consider fallback to agent-based analysis');
  }
}

// Main execution
const repoUrl = process.argv[2] || 'https://github.com/expressjs/express';

runChatAPITests(repoUrl)
  .then(() => {
    console.log('\n✅ Chat API investigation complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Investigation failed:', error);
    process.exit(1);
  });