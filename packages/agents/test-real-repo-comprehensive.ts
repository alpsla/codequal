/**
 * Comprehensive DeepWiki Test with Real Repository
 * This test will help identify environment differences between VS Code and Warp terminal
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const DEEPWIKI_URL = process.env.DEEPWIKI_API_URL || 'http://localhost:8001';
const DEEPWIKI_API_KEY = process.env.DEEPWIKI_API_KEY || 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f';

// Test configuration
const TEST_REPOS = [
  {
    name: 'ky (small HTTP client)',
    url: 'https://github.com/sindresorhus/ky',
    branch: 'main'
  },
  {
    name: 'p-limit (concurrency limiter)',
    url: 'https://github.com/sindresorhus/p-limit',
    branch: 'main'
  }
];

interface TestResult {
  repository: string;
  success: boolean;
  duration: number;
  responseType: string;
  issuesFound?: number;
  error?: string;
  sampleIssue?: any;
  environment?: {
    node: string;
    npm: string;
    terminal: string;
    cwd: string;
    deepwikiUrl: string;
  };
}

async function getEnvironmentInfo() {
  const { execSync } = require('child_process');
  
  return {
    node: execSync('node --version').toString().trim(),
    npm: execSync('npm --version').toString().trim(),
    terminal: process.env.TERM_PROGRAM || process.env.TERM || 'unknown',
    cwd: process.cwd(),
    deepwikiUrl: DEEPWIKI_URL
  };
}

async function testRepository(repo: typeof TEST_REPOS[0]): Promise<TestResult> {
  const startTime = Date.now();
  const result: TestResult = {
    repository: repo.url,
    success: false,
    duration: 0,
    responseType: 'unknown'
  };

  try {
    console.log(`\n📊 Testing ${repo.name}...`);
    console.log(`   URL: ${repo.url}`);
    console.log(`   Branch: ${repo.branch}`);
    
    // First, verify the repository exists
    const githubCheck = await axios.get(
      repo.url.replace('https://github.com/', 'https://api.github.com/repos/'),
      { validateStatus: () => true }
    );
    
    if (githubCheck.status !== 200) {
      throw new Error(`Repository does not exist (GitHub API returned ${githubCheck.status})`);
    }
    
    console.log(`   ✅ Repository verified on GitHub`);
    
    // Analyze with DeepWiki
    const request = {
      repo_url: repo.url,
      messages: [{
        role: 'user',
        content: `Analyze this repository for code quality issues, security vulnerabilities, and best practice violations.
For each issue found, provide:
1. Issue type (security/quality/performance)
2. Severity (critical/high/medium/low)
3. Exact file path
4. Line number if available
5. Description of the issue
6. Suggested fix if applicable

Format the response as a structured list.`
      }],
      stream: false,
      provider: 'openrouter',
      model: 'openai/gpt-4o-mini',
      temperature: 0.1,
      max_tokens: 2000
    };
    
    console.log(`   🔍 Sending analysis request to DeepWiki...`);
    
    const response = await axios.post(
      `${DEEPWIKI_URL}/chat/completions/stream`,
      request,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPWIKI_API_KEY}`
        },
        timeout: 120000 // 2 minutes
      }
    );
    
    result.duration = (Date.now() - startTime) / 1000;
    result.success = true;
    result.responseType = typeof response.data;
    
    // Process response
    if (typeof response.data === 'string') {
      console.log(`   📝 Received text response (${response.data.length} characters)`);
      
      // Try to extract issues from the text
      const issues = extractIssuesFromText(response.data);
      result.issuesFound = issues.length;
      result.sampleIssue = issues[0] || null;
      
    } else if (response.data && typeof response.data === 'object') {
      console.log(`   📦 Received JSON response`);
      
      if (response.data.choices && response.data.choices[0]) {
        const content = response.data.choices[0].message?.content || response.data.choices[0].text;
        const issues = extractIssuesFromText(content);
        result.issuesFound = issues.length;
        result.sampleIssue = issues[0] || null;
      } else if (response.data.issues) {
        result.issuesFound = response.data.issues.length;
        result.sampleIssue = response.data.issues[0] || null;
      }
    }
    
    console.log(`   ✅ Analysis complete in ${result.duration.toFixed(1)}s`);
    console.log(`   📊 Issues found: ${result.issuesFound || 0}`);
    
  } catch (error: any) {
    result.duration = (Date.now() - startTime) / 1000;
    result.error = error.message;
    
    console.log(`   ❌ Error: ${error.message}`);
    
    if (error.response) {
      console.log(`   Response status: ${error.response.status}`);
      if (error.response.data) {
        console.log(`   Response data:`, JSON.stringify(error.response.data, null, 2).substring(0, 500));
      }
    }
  }
  
  return result;
}

function extractIssuesFromText(text: string): any[] {
  const issues = [];
  
  // Try to find issue patterns in the text
  const patterns = [
    /Issue:\s*(.+?)[\n\r]/gi,
    /\d+\.\s*(.+?)[\n\r]/gi,
    /\*\s*(.+?)[\n\r]/gi,
    /-\s*(.+?)[\n\r]/gi
  ];
  
  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].length > 10) {
        issues.push({
          description: match[1].trim(),
          raw: match[0]
        });
      }
    }
    if (issues.length > 0) break;
  }
  
  return issues;
}

async function runComprehensiveTest() {
  console.log('=' .repeat(60));
  console.log('🚀 DeepWiki Comprehensive Test Report');
  console.log('=' .repeat(60));
  
  // Get environment information
  const env = await getEnvironmentInfo();
  console.log('\n📍 Environment Information:');
  console.log(`   Node.js: ${env.node}`);
  console.log(`   npm: ${env.npm}`);
  console.log(`   Terminal: ${env.terminal}`);
  console.log(`   Working Directory: ${env.cwd}`);
  console.log(`   DeepWiki URL: ${env.deepwikiUrl}`);
  
  // Check DeepWiki health
  console.log('\n🏥 DeepWiki Health Check:');
  try {
    const health = await axios.get(`${DEEPWIKI_URL}/health`, { timeout: 5000 });
    console.log(`   Status: ${health.data.status || 'OK'}`);
    console.log(`   Timestamp: ${health.data.timestamp || 'N/A'}`);
  } catch (error: any) {
    console.log(`   ❌ Health check failed: ${error.message}`);
  }
  
  // Test repositories
  const results: TestResult[] = [];
  
  for (const repo of TEST_REPOS) {
    const result = await testRepository(repo);
    result.environment = env;
    results.push(result);
  }
  
  // Generate report
  console.log('\n' + '=' .repeat(60));
  console.log('📈 Test Results Summary');
  console.log('=' .repeat(60));
  
  for (const result of results) {
    console.log(`\n Repository: ${result.repository}`);
    console.log(`   Success: ${result.success ? '✅' : '❌'}`);
    console.log(`   Duration: ${result.duration.toFixed(1)}s`);
    console.log(`   Response Type: ${result.responseType}`);
    
    if (result.success) {
      console.log(`   Issues Found: ${result.issuesFound || 0}`);
      if (result.sampleIssue) {
        console.log(`   Sample Issue: ${JSON.stringify(result.sampleIssue).substring(0, 100)}...`);
      }
    } else {
      console.log(`   Error: ${result.error}`);
    }
  }
  
  // Save detailed report
  const reportPath = path.join(process.cwd(), `deepwiki-test-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    environment: env,
    results: results
  }, null, 2));
  
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  
  // Recommendations
  console.log('\n' + '=' .repeat(60));
  console.log('💡 Recommendations');
  console.log('=' .repeat(60));
  
  const failures = results.filter(r => !r.success);
  if (failures.length > 0) {
    console.log('\n⚠️  Some tests failed. Common causes:');
    console.log('   1. Port forwarding not active (run: kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001)');
    console.log('   2. DeepWiki pod not running (check: kubectl get pods -n codequal-dev)');
    console.log('   3. Network/firewall issues between your terminal and Kubernetes');
    console.log('   4. Git authentication issues in the DeepWiki pod');
    console.log('   5. Environment variable differences between VS Code and Warp');
    
    console.log('\n🔧 Debug Commands:');
    console.log('   kubectl logs -n codequal-dev deployment/deepwiki --tail=50');
    console.log('   kubectl exec -n codequal-dev deployment/deepwiki -- git config --list | grep url');
    console.log('   lsof -i :8001  # Check if port is in use');
  } else {
    console.log('\n✅ All tests passed successfully!');
  }
  
  console.log('\n' + '=' .repeat(60));
}

// Run the test
runComprehensiveTest().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});