#!/usr/bin/env npx ts-node

import * as fs from 'fs';
import * as path from 'path';

// Import the AdaptiveDeepWikiAnalyzer
import { AdaptiveDeepWikiAnalyzer } from './src/standard/deepwiki/services/adaptive-deepwiki-analyzer';

async function testFallbackParser() {
  console.log('🧪 Testing Fallback Parser with Real DeepWiki Response');
  console.log('====================================================\n');

  // Load the actual DeepWiki response we saved
  const responseFile = path.join(__dirname, 'debug-logs/deepwiki-raw-2025-08-25T19-50-19.202Z.json');
  
  if (!fs.existsSync(responseFile)) {
    console.error('❌ Debug response file not found');
    return;
  }

  const rawResponse = fs.readFileSync(responseFile, 'utf-8');
  const responseText = JSON.parse(rawResponse);

  console.log('📝 Sample of DeepWiki response:');
  console.log(responseText.substring(0, 300));
  console.log('...\n');

  // Create analyzer instance
  const analyzer = new AdaptiveDeepWikiAnalyzer();

  // Call the protected method directly (we'll need to make it public or test through parseResponse)
  // For now, let's test through parseResponse
  console.log('🔍 Testing parseResponse method...');
  const result = await analyzer.parseResponse(responseText);

  console.log('\n📊 Parse Results:');
  console.log(`Total issues parsed: ${result.issues?.length || 0}`);
  
  if (result.issues && result.issues.length > 0) {
    console.log('\n📍 First 5 Issues:');
    result.issues.slice(0, 5).forEach((issue: any, index: number) => {
      console.log(`\n${index + 1}. ${issue.title || 'No title'}`);
      console.log(`   Severity: ${issue.severity}`);
      console.log(`   Category: ${issue.category}`);
      console.log(`   File: ${issue.file || issue.location?.file || 'MISSING'}`);
      console.log(`   Line: ${issue.line || issue.location?.line || 'MISSING'}`);
      
      const hasLocation = (issue.file && issue.file !== 'unknown') || 
                         (issue.location?.file && issue.location.file !== 'unknown');
      
      console.log(`   Status: ${hasLocation ? '✅ Location found' : '❌ No location'}`);
    });
    
    // Statistics
    const withLocation = result.issues.filter((i: any) => 
      (i.file && i.file !== 'unknown') || 
      (i.location?.file && i.location.file !== 'unknown')
    ).length;
    
    const successRate = (withLocation / result.issues.length * 100).toFixed(1);
    
    console.log('\n📈 Location Extraction Results:');
    console.log(`${withLocation}/${result.issues.length} issues have valid locations (${successRate}%)`);
    
    if (parseFloat(successRate) >= 80) {
      console.log('✅ SUCCESS! Location extraction is working!');
    } else {
      console.log('⚠️  Location extraction needs improvement');
    }
  } else {
    console.log('❌ No issues parsed!');
  }
}

testFallbackParser().catch(console.error);