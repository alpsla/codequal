#!/usr/bin/env npx ts-node

import axios from 'axios';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

async function analyzeIterationPattern() {
  console.log(`${colors.bright}${colors.cyan}🔬 ITERATION PATTERN ANALYSIS${colors.reset}\n`);
  console.log('═'.repeat(80));
  
  const TEST_REPO = 'https://github.com/sindresorhus/ky';
  const NUM_TESTS = 3;
  
  console.log(`📦 Repository: ${TEST_REPO}`);
  console.log(`🔄 Running ${NUM_TESTS} separate single-call tests\n`);
  
  const allIssues: Set<string>[] = [];
  const costPerCall = 0.04; // Actual from OpenRouter
  
  // Run 3 separate calls (simulating what would be iterations)
  for (let i = 1; i <= NUM_TESTS; i++) {
    console.log(`\n${colors.bright}Call ${i}:${colors.reset}`);
    
    try {
      const response = await axios.post(
        'http://localhost:8001/chat/completions/stream',
        {
          repo_url: TEST_REPO,
          messages: [{
            role: 'user',
            content: `Find code issues. Focus on: ${
              i === 1 ? 'main functionality' : 
              i === 2 ? 'edge cases' : 
              'performance'
            }`
          }],
          stream: false,
          provider: 'openrouter',
          model: 'openai/gpt-4o-mini',
          temperature: 0.3,
          max_tokens: 2000
        },
        { timeout: 30000 }
      );
      
      const responseText = typeof response.data === 'string' ? 
        response.data : JSON.stringify(response.data);
      
      // Extract issue titles
      const titleMatches = responseText.match(/title[:\s]+([^\n]+)/gi) || [];
      const issues = new Set(titleMatches.map(t => t.replace(/title[:\s]+/i, '').trim()));
      
      allIssues.push(issues);
      console.log(`  Found ${issues.size} issues`);
      
    } catch (error: any) {
      console.log(`  ${colors.red}Error: ${error.message}${colors.reset}`);
    }
  }
  
  // Analyze overlap and uniqueness
  console.log('\n' + '═'.repeat(80));
  console.log(`\n${colors.bright}${colors.cyan}RESULTS${colors.reset}\n`);
  
  // Calculate cumulative unique issues
  const allUniqueIssues = new Set<string>();
  
  allIssues.forEach((issues, index) => {
    const before = allUniqueIssues.size;
    issues.forEach(issue => allUniqueIssues.add(issue));
    const after = allUniqueIssues.size;
    const newUnique = after - before;
    
    console.log(`Iteration ${index + 1}:`);
    console.log(`  Issues in this iteration: ${issues.size}`);
    console.log(`  New unique issues added: ${newUnique}`);
    console.log(`  Total unique issues so far: ${after}`);
  });
  
  // Cost analysis
  console.log(`\n${colors.bright}COST BREAKDOWN:${colors.reset}`);
  console.log('─'.repeat(40));
  
  console.log(`  DeepWiki: $${costPerCall}/iteration`);
  console.log(`  For 5 iterations: $${(costPerCall * 5).toFixed(2)}`);
  
  const comparatorCost = 0.02;
  const educatorCost = 0.03;
  const researcherCost = 0.05;
  const orchestratorCost = 0.01;
  
  console.log(`\n  Other Agents:`);
  console.log(`     Comparator: $${comparatorCost}`);
  console.log(`     Educator: $${educatorCost}`);
  console.log(`     Researcher: $${researcherCost}`);
  console.log(`     Orchestrator: $${orchestratorCost}`);
  
  const total = (costPerCall * 5) + comparatorCost + educatorCost + researcherCost + orchestratorCost;
  console.log(`\n  ${colors.green}Total: $${total.toFixed(2)}${colors.reset}`);
  
  console.log('\n' + '═'.repeat(80) + '\n');
}

analyzeIterationPattern().catch(error => {
  console.error(`\n${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
