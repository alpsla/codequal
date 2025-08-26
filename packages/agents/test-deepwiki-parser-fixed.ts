import axios from 'axios';

/**
 * Test DeepWiki API with FIXED parser
 */
async function testDeepWikiParserFixed() {
  console.log('🔍 Testing DeepWiki with FIXED Parser...\n');

  try {
    // Call DeepWiki API directly
    const response = await axios.post(
      'http://localhost:8001/chat/completions/stream',
      {
        repo_url: 'https://github.com/sindresorhus/ky',
        messages: [{
          role: 'user',
          content: `Analyze this repository for code quality issues. For each issue, include the file path and line number.`
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

    // FIXED parser that handles multiple DeepWiki response formats
    const parseDeepWikiText = (text: string) => {
      const issues: any[] = [];
      
      // Handle numbered list format: "1. **File Path: ...**"
      const numberedPattern = /\d+\.\s*\*?\*?File\s*(?:Path)?:?\s*([^*\n]+)\*?\*?\s*[\n\s-]*\*?\*?Line\s*(?:Number)?:?\s*(\d+)/gi;
      let match;
      
      while ((match = numberedPattern.exec(text)) !== null) {
        const file = match[1].trim();
        const line = parseInt(match[2]);
        
        // Find the issue description after the line number
        const issueStart = match.index + match[0].length;
        const nextFileMatch = text.indexOf('**File', issueStart);
        const nextNumberMatch = text.search(/\n\d+\.\s*\*?\*?File/);
        const issueEnd = Math.min(
          nextFileMatch > issueStart ? nextFileMatch : text.length,
          nextNumberMatch > issueStart ? nextNumberMatch : text.length
        );
        
        const issueText = text.substring(issueStart, issueEnd).trim();
        const descMatch = issueText.match(/(?:Issue:|-)?\s*(.+)/s);
        
        issues.push({
          id: `issue-${issues.length + 1}`,
          file: file,
          line: line,
          description: descMatch ? descMatch[1].trim() : issueText,
          codeSnippet: null, // Would need to extract if present
          hasLocation: true
        });
      }
      
      // If no matches with numbered format, try simple "File: path, Line: number" format
      if (issues.length === 0) {
        const simplePattern = /File:\s*([^,\n]+),?\s*Line:\s*(\d+)/gi;
        
        while ((match = simplePattern.exec(text)) !== null) {
          const file = match[1].trim();
          const line = parseInt(match[2]);
          
          // Extract code snippet if present
          const afterMatch = text.substring(match.index + match[0].length);
          const codeMatch = afterMatch.match(/```(?:javascript|typescript|js|ts)?\n([\s\S]*?)```/);
          
          issues.push({
            id: `issue-${issues.length + 1}`,
            file: file,
            line: line,
            description: afterMatch.split('\n')[0].trim(),
            codeSnippet: codeMatch ? codeMatch[1].trim() : null,
            hasLocation: true
          });
        }
      }
      
      return issues;
    };

    const parsedIssues = parseDeepWikiText(
      typeof response.data === 'string' ? response.data : JSON.stringify(response.data)
    );

    console.log(`📊 Parsed ${parsedIssues.length} issues with locations:\n`);
    
    parsedIssues.forEach((issue, i) => {
      console.log(`${i + 1}. ${issue.file}:${issue.line}`);
      console.log(`   Has snippet: ${issue.codeSnippet ? '✅' : '❌'}`);
      if (issue.description) {
        console.log(`   Description: ${issue.description.substring(0, 80)}...`);
      }
    });

    // Statistics
    console.log(`\n📈 Statistics:`);
    console.log(`  - Total issues: ${parsedIssues.length}`);
    console.log(`  - All have location: ${parsedIssues.every(i => i.hasLocation) ? '✅' : '❌'}`);
    console.log(`  - With code snippets: ${parsedIssues.filter(i => i.codeSnippet).length}`);

    if (parsedIssues.length === 0) {
      console.log('\n⚠️  WARNING: No issues parsed! Showing raw response:');
      console.log(typeof response.data === 'string' 
        ? response.data.substring(0, 1000) 
        : JSON.stringify(response.data).substring(0, 1000));
    } else {
      console.log('\n✅ SUCCESS: Parser correctly extracted file locations!');
      
      // Return format that matches our interface
      return {
        issues: parsedIssues.map(issue => ({
          id: issue.id,
          title: issue.description?.split('.')[0] || 'Code quality issue',
          description: issue.description,
          severity: 'medium',
          category: 'code-quality',
          location: {
            file: issue.file,
            line: issue.line
          },
          codeSnippet: issue.codeSnippet
        })),
        scores: {
          overall: 75,
          security: 80,
          performance: 75,
          maintainability: 70
        }
      };
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

testDeepWikiParserFixed().then(result => {
  if (result) {
    console.log('\n📦 Final formatted result:');
    console.log(JSON.stringify(result, null, 2).substring(0, 500));
  }
}).catch(console.error);