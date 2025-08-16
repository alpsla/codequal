#!/usr/bin/env npx ts-node
/**
 * Test script to see DeepWiki educational insights
 */

import axios from 'axios';

async function testDeepWikiEducation() {
  const config = {
    apiUrl: 'http://localhost:8001',
    apiKey: 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f'
  };

  const repoUrl = 'https://github.com/sindresorhus/ky';
  const branch = 'main';

  console.log('🎓 Testing DeepWiki educational insights extraction...\n');

  try {
    // Create a prompt that explicitly asks for educational insights
    const prompt = `Analyze the repository ${repoUrl} (branch: ${branch}) and provide educational insights.

## Issues Analysis
Find 3 code quality issues with:
- File and line number
- Code snippet showing the problem
- How to fix it

## Educational Insights
Provide key learning points from this analysis:

### Best Practices Found
List 3 best practices demonstrated in this code:
1. **[Practice Name]**: [Description]
   Example: \`\`\`
   // Good code example from the repo
   \`\`\`

### Anti-Patterns to Avoid
List 3 anti-patterns or bad practices found:
1. **[Anti-Pattern Name]**: [Why it's bad]
   Example: \`\`\`
   // Bad code example
   \`\`\`
   Better Approach: \`\`\`
   // Fixed version
   \`\`\`

### Learning Resources
Recommend resources for improving:
- **Topic**: [Resource URL or description]
- **Documentation**: [Relevant docs]
- **Tutorial**: [Learning material]

### Key Takeaways
Summarize 3 most important lessons from this code review:
1. [Lesson 1]
2. [Lesson 2]  
3. [Lesson 3]`;

    const response = await axios.post(
      `${config.apiUrl}/chat/completions/stream`,
      {
        repo_url: repoUrl,
        messages: [{
          role: 'user',
          content: prompt
        }],
        stream: false,
        provider: 'openrouter',
        model: 'openai/gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 3000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        timeout: 60000
      }
    );

    console.log('=== RAW DEEPWIKI RESPONSE ===\n');
    const content = typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2);
    console.log(content);
    console.log('\n=== END OF RESPONSE ===\n');

    // Analyze the educational content
    console.log('\n=== EDUCATIONAL CONTENT ANALYSIS ===\n');
    
    // Check for best practices
    const bestPracticeMatches = content.match(/Best Practice[s]?.*?:/gi) || [];
    console.log(`✅ Found ${bestPracticeMatches.length} best practice mentions`);
    
    // Check for anti-patterns
    const antiPatternMatches = content.match(/Anti-Pattern[s]?.*?:/gi) || [];
    console.log(`✅ Found ${antiPatternMatches.length} anti-pattern mentions`);
    
    // Check for learning resources
    const resourceMatches = content.match(/Resource[s]?:|Documentation:|Tutorial:/gi) || [];
    console.log(`✅ Found ${resourceMatches.length} learning resource mentions`);
    
    // Check for takeaways
    const takeawayMatches = content.match(/Takeaway[s]?:|Lesson[s]?:/gi) || [];
    console.log(`✅ Found ${takeawayMatches.length} key takeaway mentions`);
    
    // Parse with our parser to see what it extracts
    const { parseDeepWikiResponse } = require('./src/standard/deepwiki/services/deepwiki-response-parser');
    const parsed = parseDeepWikiResponse(content);
    
    console.log(`\n=== PARSED EDUCATIONAL INSIGHTS ===\n`);
    
    if (parsed.educationalInsights) {
      console.log('Educational Insights Found:');
      console.log(JSON.stringify(parsed.educationalInsights, null, 2));
    } else {
      console.log('❌ No educational insights extracted by parser');
    }
    
    if (parsed.education) {
      console.log('\nEducation Section Found:');
      console.log(JSON.stringify(parsed.education, null, 2));
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testDeepWikiEducation().catch(console.error);