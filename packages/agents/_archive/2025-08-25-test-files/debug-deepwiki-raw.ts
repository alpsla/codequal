#!/usr/bin/env npx ts-node
/**
 * Debug script to examine raw DeepWiki response
 */

import { DeepWikiApiWrapper, registerDeepWikiApi } from './src/standard/services/deepwiki-api-wrapper';
import { DeepWikiClient } from '@codequal/core/deepwiki';
import * as fs from 'fs';
import * as path from 'path';

async function debugDeepWiki() {
  console.log('🔍 Debugging DeepWiki Raw Response\n');
  console.log('================================\n');
  
  // Register DeepWiki API
  const apiUrl = process.env.DEEPWIKI_API_URL || 'http://localhost:8001';
  const apiKey = process.env.DEEPWIKI_API_KEY || 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f';
  
  const client = new DeepWikiClient({
    apiUrl,
    apiKey,
    timeout: 600000,
    retryAttempts: 3
  });
  
  // Create adapter for the DeepWiki client
  const adapter = {
    analyzeRepository: async (repoUrl: string, options?: any) => {
      console.log('📡 Making raw DeepWiki API call...');
      const response = await client.analyzePR(repoUrl, options?.branch || 'main');
      console.log('📥 Raw response received');
      return response;
    }
  };
  
  registerDeepWikiApi(adapter);
  console.log(`✅ DeepWiki API registered: ${apiUrl}\n`);
  
  // Initialize DeepWiki API wrapper
  const deepwiki = new DeepWikiApiWrapper();
  
  // Test repository
  const repoUrl = 'https://github.com/sindresorhus/ky';
  const branch = 'main';
  
  console.log(`📦 Repository: ${repoUrl}`);
  console.log(`🌿 Branch: ${branch}\n`);
  
  try {
    console.log('🚀 Calling DeepWiki API...\n');
    
    // Call DeepWiki with debug logging
    const startTime = Date.now();
    const result = await deepwiki.analyzeRepository(repoUrl, {
      branch,
      skipCache: true // Force fresh analysis
    });
    const duration = Date.now() - startTime;
    
    console.log(`✅ Response received in ${(duration/1000).toFixed(1)}s\n`);
    
    // Save raw response to file
    const outputDir = path.join(__dirname, 'test-outputs', 'debug');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = path.join(outputDir, `deepwiki-raw-${timestamp}.json`);
    
    fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
    console.log(`💾 Raw response saved to: ${outputFile}\n`);
    
    // Analyze the response structure
    console.log('📊 Response Analysis:\n');
    console.log('====================\n');
    
    if (result && result.issues) {
      console.log(`Total Issues: ${result.issues.length}\n`);
      
      // Examine first 3 issues in detail
      console.log('Sample Issues (first 3):\n');
      console.log('------------------------\n');
      
      result.issues.slice(0, 3).forEach((issue: any, index: number) => {
        console.log(`Issue ${index + 1}:`);
        console.log('--------');
        
        // Check all fields
        console.log(`  ID: ${issue.id || 'missing'}`);
        console.log(`  Title: ${issue.title || 'missing'}`);
        console.log(`  Description: ${(issue.description || 'missing').substring(0, 100)}...`);
        console.log(`  Severity: ${issue.severity || 'missing'}`);
        console.log(`  Category: ${issue.category || 'missing'}`);
        
        // Check location fields
        console.log('\n  Location fields:');
        console.log(`    issue.location: ${JSON.stringify(issue.location)}`);
        console.log(`    issue.file: ${issue.file || 'missing'}`);
        console.log(`    issue.path: ${issue.path || 'missing'}`);
        console.log(`    issue.filename: ${issue.filename || 'missing'}`);
        console.log(`    issue.line: ${issue.line || 'missing'}`);
        console.log(`    issue.column: ${issue.column || 'missing'}`);
        console.log(`    issue.start_line: ${issue.start_line || 'missing'}`);
        console.log(`    issue.end_line: ${issue.end_line || 'missing'}`);
        
        // Check for file path in other fields
        console.log('\n  Searching for file paths in text fields:');
        
        const searchForPath = (text: string) => {
          if (!text) return null;
          // Look for file extensions
          const filePattern = /([a-zA-Z0-9_\-\/]+\.(ts|js|tsx|jsx|json|md|yaml|yml))/g;
          const matches = text.match(filePattern);
          return matches ? matches[0] : null;
        };
        
        const titlePath = searchForPath(issue.title);
        const descPath = searchForPath(issue.description);
        const msgPath = searchForPath(issue.message);
        
        console.log(`    In title: ${titlePath || 'none found'}`);
        console.log(`    In description: ${descPath || 'none found'}`);
        console.log(`    In message: ${msgPath || 'none found'}`);
        
        // Check evidence field
        if (issue.evidence) {
          console.log('\n  Evidence field:');
          console.log(`    ${JSON.stringify(issue.evidence).substring(0, 200)}...`);
        }
        
        // Check all other fields
        console.log('\n  All fields in issue:');
        console.log(`    ${Object.keys(issue).join(', ')}`);
        
        console.log('\n');
      });
      
      // Statistical analysis
      console.log('Location Statistics:\n');
      console.log('-------------------\n');
      
      let hasLocation = 0;
      let hasFile = 0;
      let hasPath = 0;
      let hasLineInfo = 0;
      let locationTypes: Record<string, number> = {};
      
      result.issues.forEach((issue: any) => {
        if (issue.location) {
          hasLocation++;
          const locType = typeof issue.location;
          locationTypes[locType] = (locationTypes[locType] || 0) + 1;
        }
        if (issue.file) hasFile++;
        if (issue.path) hasPath++;
        if (issue.line || issue.start_line) hasLineInfo++;
      });
      
      console.log(`  Issues with 'location' field: ${hasLocation}/${result.issues.length}`);
      console.log(`  Issues with 'file' field: ${hasFile}/${result.issues.length}`);
      console.log(`  Issues with 'path' field: ${hasPath}/${result.issues.length}`);
      console.log(`  Issues with line info: ${hasLineInfo}/${result.issues.length}`);
      console.log(`  Location types: ${JSON.stringify(locationTypes)}`);
      
      // Check if location is nested differently
      if (hasLocation > 0) {
        const sampleLocation = result.issues.find((i: any) => i.location)?.location;
        console.log(`\n  Sample location structure: ${JSON.stringify(sampleLocation, null, 2)}`);
      }
    }
    
    // Check metadata for any file information
    if (result.metadata) {
      console.log('\nMetadata:\n');
      console.log('---------\n');
      console.log(JSON.stringify(result.metadata, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
  }
}

// Run the debug script
debugDeepWiki().catch(console.error);