#!/usr/bin/env npx ts-node

import * as fs from 'fs';
import * as path from 'path';
import { parseDeepWikiResponse } from './src/standard/tests/regression/parse-deepwiki-response';

async function testParser() {
  console.log('🧪 Testing DeepWiki Parser Fix');
  console.log('==============================\n');

  // Load the actual DeepWiki response we saved
  const responseFile = path.join(__dirname, 'debug-logs/deepwiki-raw-2025-08-25T19-50-19.202Z.json');
  
  if (!fs.existsSync(responseFile)) {
    console.error('❌ Debug response file not found. Run debug-deepwiki-discrepancy.ts first.');
    return;
  }

  const rawResponse = fs.readFileSync(responseFile, 'utf-8');
  const responseText = JSON.parse(rawResponse);

  console.log('📝 Sample of DeepWiki response:');
  console.log(responseText.substring(0, 500));
  console.log('\n');

  // Test the parser
  console.log('🔍 Testing parser...');
  const result = await parseDeepWikiResponse(responseText);

  console.log('\n📊 Parser Results:');
  console.log(`Total issues parsed: ${result.issues.length}`);
  console.log('\nIssue breakdown by severity:');
  const bySeverity = {
    critical: result.issues.filter((i: any) => i.severity === 'critical').length,
    high: result.issues.filter((i: any) => i.severity === 'high').length,
    medium: result.issues.filter((i: any) => i.severity === 'medium').length,
    low: result.issues.filter((i: any) => i.severity === 'low').length
  };
  console.log(bySeverity);

  console.log('\n📍 Location extraction check:');
  result.issues.forEach((issue: any, index: number) => {
    console.log(`\nIssue ${index + 1}:`);
    console.log(`  Title: ${issue.title}`);
    console.log(`  Severity: ${issue.severity}`);
    console.log(`  File: ${issue.location?.file || issue.file || 'MISSING'}`);
    console.log(`  Line: ${issue.location?.line || issue.line || 'MISSING'}`);
    
    if (issue.location?.file === 'unknown' || !issue.location?.file) {
      console.log(`  ⚠️  Location not extracted!`);
    } else {
      console.log(`  ✅ Location extracted successfully`);
    }
  });

  // Check success rate
  const withLocation = result.issues.filter((i: any) => 
    i.location?.file && i.location.file !== 'unknown'
  ).length;
  
  const successRate = (withLocation / result.issues.length * 100).toFixed(1);
  
  console.log('\n📈 Location Extraction Success Rate:');
  console.log(`${withLocation}/${result.issues.length} issues have valid locations (${successRate}%)`);
  
  if (successRate === '100.0') {
    console.log('✅ PERFECT! All locations extracted successfully!');
  } else if (parseFloat(successRate) > 75) {
    console.log('🟡 Good, but some locations still missing');
  } else {
    console.log('❌ Poor location extraction - parser needs more work');
  }

  // Save parsed results for inspection
  const outputFile = path.join(__dirname, 'debug-logs/parsed-issues.json');
  fs.writeFileSync(outputFile, JSON.stringify(result.issues, null, 2));
  console.log(`\n📁 Parsed issues saved to: ${outputFile}`);
}

testParser().catch(console.error);