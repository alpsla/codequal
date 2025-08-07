import { config } from 'dotenv';
import * as path from 'path';

config({ path: path.resolve(__dirname, '../../.env') });
process.env.USE_DEEPWIKI_MOCK = 'false';

async function testDeepWikiIssues() {
  const { deepWikiApiManager } = require('../../apps/api/dist/services/deepwiki-api-manager');
  
  const repositoryUrl = 'https://github.com/vercel/swr';
  
  console.log('Testing DeepWiki issue detection...\n');
  
  const mainAnalysis = await deepWikiApiManager.analyzeRepository(repositoryUrl, {
    branch: 'main'
  });
  
  console.log('Main branch analysis structure:');
  console.log('- Has issues array:', Array.isArray(mainAnalysis.issues));
  console.log('- Issues count:', mainAnalysis.issues?.length || 0);
  console.log('- Has vulnerabilities array:', Array.isArray(mainAnalysis.vulnerabilities));
  console.log('- Vulnerabilities count:', mainAnalysis.vulnerabilities?.length || 0);
  
  if (mainAnalysis.issues && mainAnalysis.issues.length > 0) {
    console.log('\nFirst issue:', JSON.stringify(mainAnalysis.issues[0], null, 2));
  } else if (mainAnalysis.vulnerabilities && mainAnalysis.vulnerabilities.length > 0) {
    console.log('\nFirst vulnerability:', JSON.stringify(mainAnalysis.vulnerabilities[0], null, 2));
  }
  
  console.log('\nFull keys in response:', Object.keys(mainAnalysis));
}

testDeepWikiIssues().catch(console.error);
