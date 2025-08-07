import { config } from 'dotenv';
import * as path from 'path';

config({ path: path.resolve(__dirname, '../../.env') });
process.env.USE_DEEPWIKI_MOCK = 'false';

async function testIssueCount() {
  const { analyzeWithStandardFramework } = require('../../apps/api/dist/services/standard-orchestrator-service.js');
  
  const repositoryUrl = 'https://github.com/vercel/swr';
  const prNumber = 2950;
  
  console.log('Analyzing to check issue counts...\n');
  
  // Capture console logs
  const originalLog = console.log;
  const logs: string[] = [];
  console.log = (...args) => {
    const msg = args.join(' ');
    logs.push(msg);
    if (msg.includes('issues') || msg.includes('DeepWiki analysis completed')) {
      originalLog(...args);
    }
  };
  
  try {
    await analyzeWithStandardFramework(repositoryUrl, prNumber, 'main');
  } catch (error) {
    console.error('Error during analysis:', error);
  }
  
  // Restore console.log
  console.log = originalLog;
  
  // Find issue counts in logs
  const issueLines = logs.filter(l => l.includes('Issues') || l.includes('issues'));
  issueLines.forEach(line => console.log(line));
}

testIssueCount().catch(console.error);
