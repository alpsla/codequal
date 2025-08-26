#!/usr/bin/env npx ts-node

import * as fs from 'fs';
import * as path from 'path';

// Simple inline fallback parse test
function fallbackParse(response: string): any {
  const result: any = {
    issues: [],
    testCoverage: {},
    dependencies: { outdated: [] },
    teamMetrics: {},
    documentation: {}
  };

  const foundIssues = new Map<string, any>();
  
  // Pattern 5: New DeepWiki format with "**Exact file path:**" and "**Line number:**"
  const pattern5 = /\*\*Issue type:\*\*\s*(\w+)[\s\S]*?\*\*Severity:\*\*\s*(\w+)[\s\S]*?\*\*Exact file path:\*\*\s*([^\n]+)[\s\S]*?\*\*Line number:\*\*\s*(\d+)[\s\S]*?\*\*Description:\*\*\s*([^\n]+)/gi;
  
  for (const match of response.matchAll(pattern5)) {
    const issueType = match[1].trim();
    const severity = match[2].toLowerCase().trim();
    const file = match[3].trim();
    const line = parseInt(match[4]);
    const description = match[5].trim();
    const key = `${file}:${line}`;
    
    if (!foundIssues.has(key)) {
      foundIssues.set(key, {
        title: issueType,
        description,
        severity,
        category: issueType.toLowerCase() === 'security' ? 'security' : 
                  issueType.toLowerCase() === 'performance' ? 'performance' :
                  issueType.toLowerCase() === 'quality' ? 'code-quality' : 'code-quality',
        file,
        line,
        location: {
          file,
          line,
          column: 0
        }
      });
    }
  }
  
  // Convert map to array
  result.issues = Array.from(foundIssues.values());
  return result;
}

async function testFallback() {
  console.log('🧪 Testing Fallback Parse with Real DeepWiki Response');
  console.log('===================================================\n');

  // Load the actual DeepWiki response
  const responseFile = path.join(__dirname, 'debug-logs/deepwiki-raw-2025-08-25T19-50-19.202Z.json');
  
  if (!fs.existsSync(responseFile)) {
    console.error('❌ Debug response file not found');
    return;
  }

  const rawResponse = fs.readFileSync(responseFile, 'utf-8');
  const responseText = JSON.parse(rawResponse);

  console.log('📝 Testing with DeepWiki response...\n');

  // Test the fallback parse
  const result = fallbackParse(responseText);

  console.log('📊 Parse Results:');
  console.log(`Total issues parsed: ${result.issues.length}`);
  
  if (result.issues.length > 0) {
    console.log('\n📍 Issues Found:');
    result.issues.forEach((issue: any, index: number) => {
      console.log(`\n${index + 1}. ${issue.title}`);
      console.log(`   File: ${issue.file}`);
      console.log(`   Line: ${issue.line}`);
      console.log(`   Severity: ${issue.severity}`);
      console.log(`   Category: ${issue.category}`);
    });
    
    console.log('\n✅ SUCCESS! Fallback parser can extract locations from DeepWiki response!');
  } else {
    console.log('❌ No issues parsed - pattern may need adjustment');
    
    // Debug: Check if the pattern matches
    console.log('\n🔍 Debugging pattern match:');
    const testMatch = responseText.match(/\*\*Issue type:\*\*/i);
    console.log('Contains "**Issue type:**"?', testMatch ? 'Yes' : 'No');
    
    const testMatch2 = responseText.match(/\*\*Exact file path:\*\*/i);
    console.log('Contains "**Exact file path:**"?', testMatch2 ? 'Yes' : 'No');
  }
}

testFallback().catch(console.error);