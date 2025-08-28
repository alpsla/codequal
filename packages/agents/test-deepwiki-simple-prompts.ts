/**
 * Test DeepWiki with simple, focused prompts
 * Theory: Complex prompts might confuse the AI, causing generic responses
 */

import axios from 'axios';
import * as fs from 'fs';

const DEEPWIKI_URL = 'http://localhost:8001';
const REPO_URL = 'https://github.com/sindresorhus/ky';

interface TestCase {
  name: string;
  prompt: string;
  expectRealData: boolean;
}

const TEST_CASES: TestCase[] = [
  // Super simple prompts
  {
    name: "Ultra Simple",
    prompt: "Find bugs",
    expectRealData: true
  },
  {
    name: "One Word",
    prompt: "Issues",
    expectRealData: true
  },
  {
    name: "Basic Security",
    prompt: "Find security issues",
    expectRealData: true
  },
  {
    name: "Specific File Request",
    prompt: "Check source/core/Ky.ts",
    expectRealData: true
  },
  {
    name: "Direct Question",
    prompt: "What problems exist in this code?",
    expectRealData: true
  },
  {
    name: "Single Focus",
    prompt: "List TypeScript errors only",
    expectRealData: true
  },
  {
    name: "PR Specific Simple",
    prompt: "What changed in PR 700?",
    expectRealData: true
  },
  {
    name: "Line Specific",
    prompt: "Analyze line 90 of Ky.ts",
    expectRealData: true
  },
  // Gradually more complex
  {
    name: "Two Requirements",
    prompt: "Find bugs and security issues",
    expectRealData: true
  },
  {
    name: "With Location",
    prompt: "Find issues with file names",
    expectRealData: true
  },
  {
    name: "Medium Complexity",
    prompt: "Find all code quality issues in the repository. List each with file and line number.",
    expectRealData: true
  },
  // The original complex prompt that fails
  {
    name: "Complex Original",
    prompt: `Analyze this repository for ALL code quality issues, security vulnerabilities, and best practice violations.
For each issue found, provide in this EXACT format:
Issue #[number]:
- Type: [security/performance/quality/style/best-practice]
- Severity: [critical/high/medium/low]
- File: [exact file path]
- Line: [line number or range]
- Description: [clear description of the issue]
- Code: [relevant code snippet if available]
- Fix: [suggested fix or improvement]`,
    expectRealData: false
  }
];

async function testPrompt(testCase: TestCase, pr?: number): Promise<any> {
  const startTime = Date.now();
  
  try {
    const request: any = {
      repo_url: REPO_URL,
      messages: [{
        role: 'user',
        content: testCase.prompt
      }],
      stream: false,
      provider: 'openrouter',
      model: 'openai/gpt-4o-mini',
      temperature: 0.1,
      max_tokens: 1000
    };
    
    if (pr) {
      request.pr_number = pr;
    }
    
    const response = await axios.post(
      `${DEEPWIKI_URL}/chat/completions/stream`,
      request,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );
    
    const duration = Date.now() - startTime;
    
    let responseText = '';
    if (typeof response.data === 'string') {
      responseText = response.data;
    } else if (response.data?.choices?.[0]?.message?.content) {
      responseText = response.data.choices[0].message.content;
    }
    
    // Check if response contains real file names from the repo
    const hasRealFiles = responseText.includes('Ky.ts') || 
                        responseText.includes('source/') ||
                        responseText.includes('test/') ||
                        responseText.includes('.ts');
    
    // Check for generic/fake responses
    const hasGenericResponse = responseText.includes('cannot access external') ||
                              responseText.includes('I cannot analyze') ||
                              responseText.includes('index.js') || // Fake file
                              responseText.includes('src/ky.js'); // Fake file
    
    return {
      success: true,
      duration,
      responseLength: responseText.length,
      hasRealFiles,
      hasGenericResponse,
      sample: responseText.substring(0, 200)
    };
    
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}

async function runTests() {
  console.log('🧪 DeepWiki Simple Prompt Testing');
  console.log('=' .repeat(70));
  console.log(`Repository: ${REPO_URL}`);
  console.log(`DeepWiki: ${DEEPWIKI_URL}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('=' .repeat(70));
  
  const results = [];
  
  // Test main branch with different prompts
  console.log('\n📊 TESTING MAIN BRANCH WITH VARIOUS PROMPTS\n');
  
  for (const testCase of TEST_CASES) {
    console.log(`\n▶️  Test: "${testCase.name}"`);
    console.log(`   Prompt: "${testCase.prompt.substring(0, 50)}${testCase.prompt.length > 50 ? '...' : ''}"`);
    
    const result = await testPrompt(testCase);
    
    console.log(`   Duration: ${result.duration}ms`);
    console.log(`   Response Length: ${result.responseLength || 0} chars`);
    console.log(`   Has Real Files: ${result.hasRealFiles ? '✅' : '❌'}`);
    console.log(`   Generic Response: ${result.hasGenericResponse ? '⚠️ Yes' : '✅ No'}`);
    
    if (result.sample) {
      console.log(`   Sample: ${result.sample.replace(/\n/g, ' ')}`);
    }
    
    results.push({
      ...testCase,
      ...result
    });
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Test PR 700 with best performing prompts
  console.log('\n\n📊 TESTING PR #700 WITH SIMPLE PROMPTS\n');
  
  const prPrompts = [
    "What changed?",
    "Find issues",
    "Check line 90",
    "Review PR 700"
  ];
  
  for (const prompt of prPrompts) {
    console.log(`\n▶️  PR Test: "${prompt}"`);
    
    const result = await testPrompt({ name: `PR: ${prompt}`, prompt, expectRealData: true }, 700);
    
    console.log(`   Duration: ${result.duration}ms`);
    console.log(`   Has Real Files: ${result.hasRealFiles ? '✅' : '❌'}`);
    console.log(`   Sample: ${result.sample?.replace(/\n/g, ' ')}`);
    
    results.push({
      name: `PR: ${prompt}`,
      prompt,
      pr: 700,
      ...result
    });
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Save results
  const reportPath = `deepwiki-prompt-test-results-${Date.now()}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  
  // Analysis
  console.log('\n\n' + '=' .repeat(70));
  console.log('📈 ANALYSIS SUMMARY');
  console.log('=' .repeat(70));
  
  const successful = results.filter(r => r.success && r.hasRealFiles && !r.hasGenericResponse);
  const failed = results.filter(r => !r.success || r.hasGenericResponse);
  
  console.log(`\n✅ Successful (Real Data): ${successful.length}/${results.length}`);
  if (successful.length > 0) {
    console.log('\nBest Performing Prompts:');
    successful.slice(0, 3).forEach((r, i) => {
      console.log(`   ${i + 1}. "${r.name}" - ${r.prompt.substring(0, 30)}`);
    });
  }
  
  console.log(`\n❌ Failed/Generic: ${failed.length}/${results.length}`);
  if (failed.length > 0) {
    console.log('\nFailed Prompts:');
    failed.slice(0, 3).forEach((r, i) => {
      console.log(`   ${i + 1}. "${r.name}" - ${r.hasGenericResponse ? 'Generic Response' : r.error}`);
    });
  }
  
  // Recommendations
  console.log('\n\n💡 RECOMMENDATIONS');
  console.log('=' .repeat(70));
  
  if (successful.length === 0) {
    console.log('⚠️  No prompts returned real data!');
    console.log('\nPossible issues:');
    console.log('1. DeepWiki is not properly indexing the repository');
    console.log('2. The embedding/vector store is empty or corrupted');
    console.log('3. The AI model is not receiving repository context');
    console.log('4. There\'s a configuration issue with DeepWiki');
    console.log('\nTry:');
    console.log('- Restart DeepWiki pod: kubectl rollout restart deployment/deepwiki -n codequal-dev');
    console.log('- Check logs: kubectl logs -n codequal-dev deployment/deepwiki --tail=100');
    console.log('- Clear cache: kubectl exec -n codequal-dev deployment/deepwiki -- rm -rf /root/.adalflow/repos');
  } else {
    console.log('✅ Some prompts work! Recommendations:');
    console.log(`1. Use simple prompts (${successful[0]?.prompt.substring(0, 30)})`);
    console.log('2. Avoid complex formatting requirements');
    console.log('3. Make multiple focused requests instead of one complex request');
    console.log('4. Keep prompts under 50 characters when possible');
  }
  
  console.log(`\n📄 Full results saved to: ${reportPath}`);
  console.log('=' .repeat(70));
}

runTests().catch(console.error);