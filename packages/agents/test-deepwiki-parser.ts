import axios from 'axios';

/**
 * Test DeepWiki API directly and parse locations from text response
 */
async function testDeepWikiParser() {
  console.log('🔍 Testing DeepWiki Response Parsing...\n');

  try {
    // Call DeepWiki API directly
    const response = await axios.post(
      'http://localhost:8001/chat/completions/stream',
      {
        repo_url: 'https://github.com/sindresorhus/ky',
        messages: [{
          role: 'user',
          content: `Analyze this repository for code quality issues. For each issue found:
1. Provide the exact file path (e.g., src/index.ts)
2. Provide the line number where it occurs
3. Include a brief code snippet showing the issue
Format: "File: [path], Line: [number]"`
        }],
        stream: false,
        provider: 'openrouter',
        model: 'openai/gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 3000
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );

    console.log('✅ Response received\n');
    console.log('Response type:', typeof response.data);
    console.log('First 500 chars:', 
      typeof response.data === 'string' 
        ? response.data.substring(0, 500) 
        : JSON.stringify(response.data).substring(0, 500)
    );

    // Parse the text response to extract file locations
    const parseTextResponse = (text: string) => {
      const issues: any[] = [];
      
      // Split by common delimiters
      const chunks = text.split(/\n\n|\d+\.|File:|Issue \d+/i);
      
      for (const chunk of chunks) {
        // Extract file path and line number
        const fileMatch = chunk.match(/(?:File|Path|Location):\s*([^\s,]+)/i);
        const lineMatch = chunk.match(/(?:Line|L):\s*(\d+)/i);
        
        if (fileMatch || lineMatch || chunk.includes('.ts') || chunk.includes('.js')) {
          const issue = {
            id: `issue-${issues.length + 1}`,
            file: fileMatch ? fileMatch[1] : 'unknown',
            line: lineMatch ? parseInt(lineMatch[1]) : 0,
            description: chunk.trim().substring(0, 200),
            hasLocation: !!(fileMatch && lineMatch)
          };
          
          // Skip if no useful info
          if (issue.file !== 'unknown' || issue.line > 0) {
            issues.push(issue);
          }
        }
      }
      
      return issues;
    };

    const parsedIssues = parseTextResponse(
      typeof response.data === 'string' ? response.data : JSON.stringify(response.data)
    );

    console.log(`\n📊 Parsed ${parsedIssues.length} issues:\n`);
    
    parsedIssues.forEach((issue, i) => {
      console.log(`${i + 1}. File: ${issue.file}, Line: ${issue.line}`);
      console.log(`   Has location: ${issue.hasLocation ? '✅' : '❌'}`);
      if (i < 3) {
        console.log(`   Description: ${issue.description.substring(0, 100)}...`);
      }
    });

    // Statistics
    const withLocation = parsedIssues.filter(i => i.hasLocation).length;
    console.log(`\n📈 Statistics:`);
    console.log(`  - Total issues: ${parsedIssues.length}`);
    console.log(`  - With location: ${withLocation}`);
    console.log(`  - Without location: ${parsedIssues.length - withLocation}`);
    console.log(`  - Success rate: ${parsedIssues.length > 0 ? ((withLocation / parsedIssues.length) * 100).toFixed(1) : 0}%`);

    if (withLocation === 0) {
      console.log('\n⚠️  WARNING: No locations extracted! Parser needs fixing.');
      console.log('Raw response sample for debugging:');
      console.log(typeof response.data === 'string' 
        ? response.data.substring(0, 1000) 
        : JSON.stringify(response.data).substring(0, 1000));
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('\nMake sure DeepWiki is running:');
      console.log('kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001');
    }
  }
}

testDeepWikiParser().catch(console.error);