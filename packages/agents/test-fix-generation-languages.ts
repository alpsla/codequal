#!/usr/bin/env npx ts-node

/**
 * Test fix generation across multiple languages
 * Demonstrates how templates adapt to different languages
 */

import { FixSuggestionAgentV2 } from './src/standard/services/fix-suggestion-agent-v2';
import { Issue } from './src/standard/types/issue';

async function testMultiLanguageFixes() {
  console.log('🔧 Testing Fix Generation Across Languages\n');
  console.log('=' .repeat(60));
  
  const agent = new FixSuggestionAgentV2();
  
  // Test issues in different languages
  const testIssues: Issue[] = [
    // TypeScript validation issue
    {
      id: 'ts-1',
      title: 'Missing validation for user input',
      message: 'The parameter userId lacks validation and could be undefined',
      severity: 'high',
      category: 'security',
      location: {
        file: 'src/api/users.ts',
        line: 25,
        column: 10
      },
      codeSnippet: 'function getUser(userId) { return db.query(`SELECT * FROM users WHERE id = ${userId}`); }'
    },
    
    // Python error handling issue
    {
      id: 'py-1',
      title: 'Missing error handling for file operations',
      message: 'File operations lack error handling',
      severity: 'medium',
      category: 'code-quality',
      location: {
        file: 'scripts/process_data.py',
        line: 45,
        column: 4
      },
      codeSnippet: 'data = json.load(open(file_path))'
    },
    
    // Java SQL injection issue
    {
      id: 'java-1',
      title: 'SQL injection vulnerability',
      message: 'Direct string concatenation in SQL query creates injection risk',
      severity: 'critical',
      category: 'security',
      location: {
        file: 'src/main/java/com/app/UserDao.java',
        line: 78,
        column: 20
      },
      codeSnippet: 'String query = "SELECT * FROM users WHERE email = \'" + email + "\'"'
    },
    
    // Go null check issue
    {
      id: 'go-1',
      title: 'Missing nil check for pointer',
      message: 'Pointer user could be nil and cause panic',
      severity: 'high',
      category: 'code-quality',
      location: {
        file: 'internal/handlers/user.go',
        line: 92,
        column: 8
      },
      codeSnippet: 'name := user.Name'
    },
    
    // JavaScript promise handling
    {
      id: 'js-1',
      title: 'Unhandled promise rejection',
      message: 'Async operation lacks error handling',
      severity: 'medium',
      category: 'code-quality',
      location: {
        file: 'src/utils/api.js',
        line: 15,
        column: 2
      },
      codeSnippet: 'const data = await fetch(url).then(r => r.json())'
    }
  ];
  
  // Generate fixes for each issue
  const fixes = await agent.generateFixes(testIssues);
  
  // Display results
  for (const fix of fixes) {
    const issue = testIssues.find(i => i.id === fix.issueId);
    if (!issue) continue;
    
    console.log(`\n${'-'.repeat(60)}`);
    console.log(`📁 File: ${issue.location?.file}`);
    console.log(`🔍 Issue: ${issue.title}`);
    console.log(`⚠️  Severity: ${issue.severity}`);
    console.log(`🗣️  Language: ${fix.language}`);
    if (fix.framework) {
      console.log(`🎯 Framework: ${fix.framework}`);
    }
    console.log(`⏱️  Estimated Fix Time: ${fix.estimatedMinutes} minutes`);
    console.log(`💡 Confidence: ${fix.confidence}`);
    
    console.log(`\n❌ Original Code:`);
    console.log('```' + fix.language);
    console.log(issue.codeSnippet);
    console.log('```');
    
    console.log(`\n✅ Fixed Code:`);
    console.log('```' + fix.language);
    console.log(fix.fixedCode);
    console.log('```');
    
    console.log(`\n📝 Explanation: ${fix.explanation}`);
  }
  
  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Summary:');
  console.log(`- Total issues: ${testIssues.length}`);
  console.log(`- Fixes generated: ${fixes.length}`);
  console.log(`- Success rate: ${(fixes.length / testIssues.length * 100).toFixed(0)}%`);
  
  const languages = new Set(fixes.map(f => f.language));
  console.log(`- Languages covered: ${Array.from(languages).join(', ')}`);
  
  const avgTime = fixes.reduce((sum, f) => sum + f.estimatedMinutes, 0) / fixes.length;
  console.log(`- Average fix time: ${avgTime.toFixed(0)} minutes`);
  
  const highConfidence = fixes.filter(f => f.confidence === 'high').length;
  console.log(`- High confidence fixes: ${highConfidence}/${fixes.length}`);
}

// Run the test
testMultiLanguageFixes().catch(console.error);