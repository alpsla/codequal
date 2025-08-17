#!/usr/bin/env npx ts-node
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function testAIParser() {
  const { UnifiedAIParser } = require('./src/standard/deepwiki/services/unified-ai-parser');
  
  // Sample DeepWiki response (similar to what we get)
  const deepWikiResponse = `
1. **Missing Error Handling**: Multiple async functions lack proper try-catch blocks
   File: src/utils.ts, Line: 45
   Severity: medium
   Functions like fetchData() can fail silently

2. **SQL Injection Vulnerability**: Direct string concatenation in database query
   File: src/api/users.ts, Line: 123
   Severity: critical
   User input is directly concatenated into SQL query

3. **Outdated Dependencies**: Several packages are severely outdated
   - express: 4.16.0 (latest: 4.18.2)
   - lodash: 4.17.4 (latest: 4.17.21) - has known vulnerabilities
   Severity: high

4. **High Cyclomatic Complexity**: processOrder function has complexity of 25
   File: src/services/order.ts, Line: 234
   Severity: medium
   Function is difficult to test and maintain

5. **Missing TypeScript Types**: API handlers lack proper type definitions
   File: src/api/handlers.ts
   Severity: low
   Using 'any' types throughout the file
`;

  console.log('Testing UnifiedAIParser with sample DeepWiki response...\n');
  console.log('Input text (first 500 chars):', deepWikiResponse.substring(0, 500));
  
  const parser = new UnifiedAIParser();
  
  try {
    const result = await parser.parseDeepWikiResponse(deepWikiResponse, {
      useAI: true,
      language: 'TypeScript',
      framework: 'Express',
      repositorySize: 'medium',
      complexity: 'moderate'
    });
    
    console.log('\n=== PARSING RESULTS ===');
    console.log('Total issues found:', result.allIssues.length);
    console.log('\nIssues by category:');
    
    const categories = ['security', 'performance', 'dependencies', 'codeQuality', 'architecture', 'breakingChanges'];
    categories.forEach(cat => {
      const catIssues = result.allIssues.filter((i: any) => {
        // Map issue categories to parser categories
        if (cat === 'security' && i.category === 'security') return true;
        if (cat === 'dependencies' && i.category === 'dependencies') return true;
        if (cat === 'codeQuality' && (i.category === 'code-quality' || i.type === 'code-quality')) return true;
        if (cat === 'architecture' && i.category === 'architecture') return true;
        return false;
      });
      console.log(`  ${cat}: ${catIssues.length} issues`);
    });
    
    console.log('\nFirst 3 issues:');
    result.allIssues.slice(0, 3).forEach((issue: any, i: number) => {
      console.log(`\n${i + 1}. ${issue.title || issue.type}`);
      console.log(`   Category: ${issue.category}`);
      console.log(`   Severity: ${issue.severity}`);
      console.log(`   Location: ${issue.location?.file || issue.file || 'unknown'}:${issue.location?.line || issue.line || 0}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testAIParser().catch(console.error);