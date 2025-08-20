import axios from 'axios';

async function testDeepWikiRaw() {
  console.log('🔍 Testing Raw DeepWiki Response\n');
  
  try {
    const response = await axios.post(
      'http://localhost:8001/chat/completions/stream',
      {
        repo_url: 'https://github.com/sindresorhus/is-odd',
        messages: [{
          role: 'user',
          content: 'Analyze this repository for code quality issues. Return JSON with issues array containing objects with: title, severity, category, file, line, impact, codeSnippet, fix, recommendation fields.'
        }],
        stream: false,
        provider: 'openrouter',
        model: 'openai/gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 2000
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );
    
    console.log('=== Response Type:', typeof response.data);
    
    if (typeof response.data === 'string') {
      console.log('=== Raw String Response:');
      console.log(response.data.substring(0, 500));
      
      try {
        const parsed = JSON.parse(response.data);
        console.log('\n=== Parsed JSON Structure:');
        console.log('Keys:', Object.keys(parsed));
        if (parsed.issues && Array.isArray(parsed.issues)) {
          console.log('Issues count:', parsed.issues.length);
          console.log('\n=== First Issue:');
          console.log(JSON.stringify(parsed.issues[0], null, 2));
        }
      } catch (e) {
        console.log('Failed to parse as JSON:', e.message);
      }
    } else {
      console.log('=== Direct Object Response:');
      console.log('Keys:', Object.keys(response.data));
      if (response.data.issues) {
        console.log('Issues count:', response.data.issues.length);
        console.log('\n=== First Issue:');
        console.log(JSON.stringify(response.data.issues[0], null, 2));
        
        // Check location data quality
        console.log('\n=== Location Data Analysis:');
        const unknownLocations = response.data.issues.filter(i => 
          !i.file || i.file === 'unknown' || 
          !i.line || i.line === 0 || i.line === 1
        );
        console.log(`Issues with unknown/default locations: ${unknownLocations.length}/${response.data.issues.length}`);
        
        if (unknownLocations.length > 0) {
          console.log('\nExample issue with poor location:');
          console.log(JSON.stringify(unknownLocations[0], null, 2));
        }
      }
    }
  } catch (error: any) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testDeepWikiRaw();
