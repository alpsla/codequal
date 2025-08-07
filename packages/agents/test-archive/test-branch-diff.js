const { deepWikiApiManager } = require('../../apps/api/dist/services/deepwiki-api-manager.js');
console.log('Testing branch differentiation...');
process.env.USE_DEEPWIKI_MOCK = 'true';

async function test() {
  const mainResult = await deepWikiApiManager.analyzeRepository('https://github.com/test/repo', { branch: 'main' });
  const prResult = await deepWikiApiManager.analyzeRepository('https://github.com/test/repo', { branch: 'pr/123' });
  
  console.log('Main issues:', mainResult.issues.map(i => i.id));
  console.log('PR issues:', prResult.issues.map(i => i.id));
  
  const mainIds = new Set(mainResult.issues.map(i => i.id));
  const prIds = new Set(prResult.issues.map(i => i.id));
  
  console.log('\nDifferences:');
  console.log('Fixed (in main, not in PR):', [...mainIds].filter(id => !prIds.has(id)));
  console.log('New (in PR, not in main):', [...prIds].filter(id => !mainIds.has(id)));
  
  // Exit after 5 seconds
  setTimeout(() => process.exit(0), 5000);
}

test().catch(console.error);