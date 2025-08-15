#!/usr/bin/env npx ts-node
/**
 * Direct DeepWiki API call to examine raw response
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

async function debugDeepWikiDirect() {
  console.log('🔍 Direct DeepWiki API Debug\n');
  console.log('================================\n');
  
  const apiUrl = process.env.DEEPWIKI_API_URL || 'http://localhost:8001';
  const apiKey = process.env.DEEPWIKI_API_KEY || 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f';
  
  console.log(`📡 API URL: ${apiUrl}`);
  console.log(`🔑 API Key: ${apiKey.substring(0, 10)}...`);
  
  // Test repository
  const repoUrl = 'https://github.com/sindresorhus/ky';
  const branch = 'main';
  
  console.log(`📦 Repository: ${repoUrl}`);
  console.log(`🌿 Branch: ${branch}\n`);
  
  try {
    console.log('🚀 Making direct HTTP request to DeepWiki...\n');
    
    // Direct API call
    const response = await axios.post(
      `${apiUrl}/chat/completions/stream`,
      {
        repo_url: repoUrl,
        messages: [{
          role: "user",
          content: "Analyze this repository for code quality issues, security vulnerabilities, and best practices"
        }],
        stream: false,
        provider: "openrouter",
        model: "openai/gpt-4o",
        temperature: 0.1,
        max_tokens: 4000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        timeout: 60000
      }
    );
    
    console.log('✅ Response received\n');
    
    // Save raw response
    const outputDir = path.join(__dirname, 'test-outputs', 'debug');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = path.join(outputDir, `deepwiki-direct-${timestamp}.json`);
    
    fs.writeFileSync(outputFile, JSON.stringify(response.data, null, 2));
    console.log(`💾 Raw response saved to: ${outputFile}\n`);
    
    // Analyze response structure
    console.log('📊 Response Structure Analysis:\n');
    console.log('================================\n');
    
    const data = response.data;
    
    // Check top-level structure
    console.log('Top-level keys:', Object.keys(data).join(', '));
    console.log();
    
    // Check for issues array
    if (data.issues) {
      console.log(`Issues found: ${data.issues.length}\n`);
      
      // Analyze first 3 issues
      console.log('First 3 Issues Analysis:\n');
      console.log('------------------------\n');
      
      data.issues.slice(0, 3).forEach((issue: any, idx: number) => {
        console.log(`Issue ${idx + 1}:`);
        console.log('  Keys:', Object.keys(issue).join(', '));
        
        // Check each field
        console.log('  Field values:');
        Object.entries(issue).forEach(([key, value]: [string, any]) => {
          if (typeof value === 'string' && value.length > 100) {
            console.log(`    ${key}: "${value.substring(0, 100)}..."`);
          } else if (typeof value === 'object' && value !== null) {
            console.log(`    ${key}: ${JSON.stringify(value)}`);
          } else {
            console.log(`    ${key}: ${value}`);
          }
        });
        
        console.log();
      });
      
      // Look for file paths in all issues
      console.log('File Path Analysis:\n');
      console.log('------------------\n');
      
      let pathsFound = 0;
      const pathFields: Set<string> = new Set();
      
      data.issues.forEach((issue: any) => {
        Object.entries(issue).forEach(([key, value]) => {
          if (typeof value === 'string') {
            // Check if value contains file paths
            const filePattern = /([a-zA-Z0-9_\-\/]+\.(ts|js|tsx|jsx|json|md|yaml|yml))/g;
            const matches = value.match(filePattern);
            if (matches) {
              pathsFound++;
              pathFields.add(key);
            }
          } else if (typeof value === 'object' && value !== null) {
            // Check nested objects
            Object.entries(value).forEach(([nestedKey, nestedValue]) => {
              if (typeof nestedValue === 'string' && nestedValue.includes('.')) {
                pathFields.add(`${key}.${nestedKey}`);
              }
            });
          }
        });
      });
      
      console.log(`  Issues with file paths: ${pathsFound}/${data.issues.length}`);
      console.log(`  Fields containing paths: ${Array.from(pathFields).join(', ')}`);
      console.log();
    }
    
    // Check for analysis results in different format
    if (data.analysis_results) {
      console.log('Analysis Results structure:');
      console.log(JSON.stringify(data.analysis_results, null, 2).substring(0, 500));
      console.log();
    }
    
    // Check for choices (OpenAI format)
    if (data.choices && data.choices[0]) {
      console.log('OpenAI-style response detected\n');
      const content = data.choices[0].message?.content || data.choices[0].text;
      if (content) {
        console.log('Content preview:');
        console.log(content.substring(0, 500));
        console.log();
        
        // Try to parse if it's JSON
        try {
          const parsed = JSON.parse(content);
          console.log('Parsed content structure:');
          console.log('  Keys:', Object.keys(parsed).join(', '));
          
          if (parsed.issues) {
            console.log(`  Issues in parsed content: ${parsed.issues.length}`);
            if (parsed.issues[0]) {
              console.log('  First issue structure:', Object.keys(parsed.issues[0]).join(', '));
            }
          }
        } catch (e) {
          console.log('Content is not JSON, likely plain text analysis');
        }
      }
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the debug script
debugDeepWikiDirect().catch(console.error);