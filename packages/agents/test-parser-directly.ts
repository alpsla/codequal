import { parseDeepWikiResponse } from './src/standard/tests/regression/parse-deepwiki-response';

const kyResponse = `1. **Title**: Improper error handling in retry logic  
   File: test/retry.ts, Line: 25  
   Severity: high  
   Description: The retry logic does not handle the scenario where the maximum retry limit is reached`;

const swrResponse = `Title: Missing Error Handling in Fetcher Function  
File: examples/infinite/pages/index.js, Line: 26  
Severity: High  
Description: The fetcher function does not handle potential errors from the API call

---

Title: Unused State Variable  
File: examples/infinite/pages/index.js, Line: 9  
Severity: Low  
Description: The state variable is initialized but not used meaningfully`;

async function testParser() {
  console.log('Testing ky format:');
  const kyResult = await parseDeepWikiResponse(kyResponse);
  console.log('Issues found:', kyResult.issues.length);
  console.log('Issues:', JSON.stringify(kyResult.issues, null, 2));
  
  console.log('\n' + '='.repeat(80) + '\n');
  
  console.log('Testing swr format:');
  const swrResult = await parseDeepWikiResponse(swrResponse);
  console.log('Issues found:', swrResult.issues.length);
  console.log('Issues:', JSON.stringify(swrResult.issues, null, 2));
}

testParser();