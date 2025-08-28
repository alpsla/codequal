#!/usr/bin/env npx ts-node
/**
 * Test structured DeepWiki parser
 */

import axios from 'axios';
import { StructuredDeepWikiParser } from './src/standard/services/structured-deepwiki-parser';
import { CodeSnippetExtractor } from './src/standard/services/code-snippet-extractor';
import { loadEnvironment } from './src/standard/utils/env-loader';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

async function testStructuredParser() {
  console.log('🚀 Testing Structured DeepWiki Parser\n');
  console.log('=' .repeat(70) + '\n');
  
  loadEnvironment();
  
  const parser = new StructuredDeepWikiParser();
  const extractor = new CodeSnippetExtractor();
  const deepwikiUrl = process.env.DEEPWIKI_API_URL || 'http://localhost:8001';
  const deepwikiKey = process.env.DEEPWIKI_API_KEY || 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f';
  
  // Test repository
  const repoUrl = 'https://github.com/sindresorhus/ky';
  const repoPath = '/tmp/test-ky-repo';
  
  try {
    // Clone repository if needed
    if (!fs.existsSync(repoPath)) {
      console.log('📦 Cloning repository for code extraction...\n');
      execSync(`git clone ${repoUrl} ${repoPath}`, { stdio: 'ignore' });
    }
    
    // Request analysis with structured prompt
    console.log('📡 Requesting structured analysis from DeepWiki...\n');
    
    const response = await axios.post(
      `${deepwikiUrl}/chat/completions/stream`,
      {
        repo_url: repoUrl,
        messages: [{
          role: 'user',
          content: parser.getStructuredPrompt()
        }],
        stream: false,
        provider: 'openrouter',
        model: 'openai/gpt-4o-mini',
        temperature: 0.0, // Zero temperature for consistent format
        max_tokens: 3000
      },
      {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${deepwikiKey}`
        },
        timeout: 60000
      }
    );
    
    console.log('✅ Received response\n');
    
    // Parse structured response
    const issues = parser.parseStructured(response.data);
    console.log(`📊 Parsed ${issues.length} structured issues\n`);
    
    // Convert to standard format
    const standardIssues = parser.toStandardFormat(issues);
    
    // Enhance with real code snippets
    console.log('🔍 Extracting real code snippets from repository...\n');
    const enhancedIssues = extractor.enhanceIssuesWithRealCode(repoPath, standardIssues);
    
    // Display results
    console.log('=' .repeat(70));
    console.log('\n📋 ANALYSIS RESULTS:\n');
    
    enhancedIssues.forEach((issue, idx) => {
      console.log(`Issue ${idx + 1}: ${issue.title}`);
      console.log(`  📁 File: ${issue.location?.file || 'unknown'}`);
      console.log(`  📍 Line: ${issue.location?.line || 'unknown'}`);
      console.log(`  🏷️  Type: ${issue.type}`);
      console.log(`  ⚠️  Severity: ${issue.severity}`);
      
      if (issue.codeSnippet && issue.codeSnippet !== `// Code location: ${issue.location?.file}:${issue.location?.line}`) {
        console.log(`  💻 Code: ${issue.codeSnippet.substring(0, 60)}...`);
      } else {
        console.log(`  💻 Code: [not found in repository]`);
      }
      
      if (issue.suggestion) {
        console.log(`  ✅ Fix: ${issue.suggestion.substring(0, 60)}...`);
      }
      
      console.log('');
    });
    
    // Quality metrics
    console.log('=' .repeat(70));
    console.log('\n📈 QUALITY METRICS:\n');
    
    const withRealCode = enhancedIssues.filter(i => 
      i.codeSnippet && !i.codeSnippet.startsWith('// Code location:')
    ).length;
    
    const withValidFiles = enhancedIssues.filter(i => {
      const filePath = path.join(repoPath, i.location?.file || '');
      return fs.existsSync(filePath);
    }).length;
    
    console.log(`Structured parsing: ${issues.length}/${enhancedIssues.length} issues parsed`);
    console.log(`Valid file paths: ${withValidFiles}/${enhancedIssues.length} files exist`);
    console.log(`Real code extracted: ${withRealCode}/${enhancedIssues.length} snippets found`);
    console.log(`Fix suggestions: ${enhancedIssues.filter(i => i.suggestion).length}/${enhancedIssues.length} provided`);
    
    // Overall assessment
    console.log('\n🎯 ASSESSMENT:');
    if (withValidFiles > enhancedIssues.length * 0.5) {
      console.log('✅ Good data quality - Structured prompting works!');
    } else {
      console.log('⚠️  Moderate quality - Some files may not exist');
    }
    
    // Save sample report
    const reportContent = JSON.stringify(enhancedIssues, null, 2);
    fs.writeFileSync('structured-analysis-report.json', reportContent);
    console.log('\n📄 Full report saved to structured-analysis-report.json');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

testStructuredParser().catch(console.error);