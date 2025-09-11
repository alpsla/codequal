const { MockDeepWikiApiWrapper } = require('./packages/agents/dist/standard/services/deepwiki-api-wrapper');

async function test() {
  const mock = new MockDeepWikiApiWrapper();
  const result = await mock.analyzeRepository('https://github.com/test/repo', { prId: '123' });
  
  if (result.issues && result.issues.length > 0) {
    const issue = result.issues[0];
    console.log('Mock issue structure:');
    console.log('  Title:', issue.title);
    console.log('  Has recommendation:', \!\!issue.recommendation);
    console.log('  Has suggestion:', \!\!issue.suggestion);
    console.log('  Has remediation:', \!\!issue.remediation);
    
    if (issue.suggestion) {
      console.log('  Suggestion:', issue.suggestion.substring(0, 100));
    }
    if (issue.remediation) {
      console.log('  Remediation:', issue.remediation.substring(0, 100));
    }
  }
}

test();
