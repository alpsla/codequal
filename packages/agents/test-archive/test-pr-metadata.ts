import { config } from 'dotenv';
import * as path from 'path';

// Load environment
config({ path: path.resolve(__dirname, '../../.env') });

// Force real DeepWiki
process.env.USE_DEEPWIKI_MOCK = 'false';

async function testPRMetadata() {
  console.log('Testing PR metadata flow...\n');
  
  const { analyzeWithStandardFramework } = require('../../apps/api/dist/services/standard-orchestrator-service.js');
  
  const repositoryUrl = 'https://github.com/sindresorhus/is-odd';
  const prNumber = 10;
  
  console.log('Analyzing:', repositoryUrl, 'PR#', prNumber);
  
  try {
    const result = await analyzeWithStandardFramework(repositoryUrl, prNumber, 'main');
    
    console.log('\nResult summary:');
    console.log('- Has report:', !!result.report);
    console.log('- Report length:', result.report?.length || 0);
    
    // Check for repository in report
    if (result.report) {
      const repoMatch = result.report.match(/Repository:.*? (.+)/);
      const prMatch = result.report.match(/PR:.*? #(\d+|N\/A) - (.+)/);
      const authorMatch = result.report.match(/Author:.*? (.+) \(@(.+)\)/);
      
      console.log('\nExtracted from report:');
      console.log('- Repository:', repoMatch ? repoMatch[1] : 'NOT FOUND');
      console.log('- PR:', prMatch ? prMatch[0] : 'NOT FOUND');
      console.log('- Author:', authorMatch ? authorMatch[0] : 'NOT FOUND');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testPRMetadata();