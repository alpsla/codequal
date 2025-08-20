import axios from 'axios';

async function testDeepWikiPR() {
  console.log('🔍 Testing DeepWiki with PR branch\n');
  
  try {
    const response = await axios.post(
      'http://localhost:8001/chat/completions/stream',
      {
        repo_url: 'https://github.com/sindresorhus/ky',
        branch: 'pull/700/head',
        messages: [{
          role: 'user',
          content: 'Analyze the code for issues. Return JSON with issues array.'
        }],
        stream: false,
        provider: 'openrouter',
        model: 'openai/gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 2000
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000
      }
    );
    
    console.log('Response received!');
    const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    
    console.log('\n=== Analysis Results:');
    console.log('Response keys:', Object.keys(data));
    
    if (data.issues) {
      console.log('Total issues found:', data.issues.length);
      
      // Analyze location quality
      const locationStats = {
        total: data.issues.length,
        withFile: 0,
        withLine: 0,
        withBoth: 0,
        unknown: 0
      };
      
      data.issues.forEach((issue: any) => {
        if (issue.file && issue.file !== 'unknown') locationStats.withFile++;
        if (issue.line && issue.line > 1) locationStats.withLine++;
        if (issue.file && issue.file !== 'unknown' && issue.line && issue.line > 1) locationStats.withBoth++;
        if (!issue.file || issue.file === 'unknown' || !issue.line || issue.line <= 1) locationStats.unknown++;
      });
      
      console.log('\n=== Location Quality:');
      console.log('Total issues:', locationStats.total);
      console.log('With file:', locationStats.withFile, '(' + Math.round(locationStats.withFile/locationStats.total*100) + '%)');
      console.log('With line:', locationStats.withLine, '(' + Math.round(locationStats.withLine/locationStats.total*100) + '%)');
      console.log('With both:', locationStats.withBoth, '(' + Math.round(locationStats.withBoth/locationStats.total*100) + '%)');
      console.log('Unknown/default:', locationStats.unknown, '(' + Math.round(locationStats.unknown/locationStats.total*100) + '%)');
      
      console.log('\n=== Sample Issues:');
      data.issues.slice(0, 3).forEach((issue: any, i: number) => {
        console.log('\nIssue ' + (i + 1) + ':');
        console.log('  Title:', issue.title);
        console.log('  File:', issue.file || 'unknown');
        console.log('  Line:', issue.line || 'unknown');
        console.log('  Severity:', issue.severity);
        console.log('  Category:', issue.category);
      });
    }
  } catch (error: any) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testDeepWikiPR();
