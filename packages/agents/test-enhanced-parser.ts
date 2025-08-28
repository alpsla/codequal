#!/usr/bin/env npx ts-node
/**
 * Test the enhanced DeepWiki parser with real data
 */

import axios from 'axios';
import { EnhancedDeepWikiParser } from './src/standard/services/enhanced-deepwiki-parser';
import { loadEnvironment } from './src/standard/utils/env-loader';

async function testEnhancedParser() {
  console.log('🔬 Testing Enhanced DeepWiki Parser\n');
  console.log('=' .repeat(70) + '\n');
  
  loadEnvironment();
  
  const parser = new EnhancedDeepWikiParser();
  const deepwikiUrl = process.env.DEEPWIKI_API_URL || 'http://localhost:8001';
  const deepwikiKey = process.env.DEEPWIKI_API_KEY || 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f';
  
  try {
    console.log('📡 Requesting analysis from DeepWiki...\n');
    
    const response = await axios.post(
      `${deepwikiUrl}/chat/completions/stream`,
      {
        repo_url: 'https://github.com/sindresorhus/ky',
        messages: [{
          role: 'user',
          content: `Analyze this repository for security, performance and code quality issues. 
For each issue provide:
- File path from repository root
- Line number
- Issue type (security/performance/quality)
- Severity (critical/high/medium/low)
- Description of the issue
- Code snippet if available
- Suggested fix`
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
          'Authorization': `Bearer ${deepwikiKey}`
        },
        timeout: 60000
      }
    );
    
    console.log('✅ Received response from DeepWiki\n');
    console.log('Response type:', typeof response.data);
    console.log('Response length:', typeof response.data === 'string' ? response.data.length : 'N/A');
    console.log('\n' + '-'.repeat(70) + '\n');
    
    // Show raw response preview
    if (typeof response.data === 'string') {
      console.log('📝 Raw Response (first 500 chars):');
      console.log(response.data.substring(0, 500));
      console.log('...\n');
    }
    
    // Parse with enhanced parser
    console.log('🔍 Parsing with Enhanced Parser...\n');
    const issues = parser.parse(response.data);
    
    console.log(`📊 Parsed ${issues.length} issues:\n`);
    
    // Display parsed issues
    issues.forEach((issue, idx) => {
      console.log(`Issue ${idx + 1}:`);
      console.log('  Type:', issue.type || 'unknown');
      console.log('  Severity:', issue.severity || 'unknown');
      console.log('  File:', issue.file || 'unknown');
      console.log('  Line:', issue.line || 'unknown');
      console.log('  Title:', issue.title || issue.description?.substring(0, 100) || 'unknown');
      
      if (issue.codeSnippet) {
        console.log('  Code:', issue.codeSnippet.substring(0, 50) + '...');
      } else {
        console.log('  Code: [not provided]');
      }
      
      if (issue.suggestion) {
        console.log('  Fix:', issue.suggestion.substring(0, 50) + '...');
      }
      
      console.log('');
    });
    
    // Analysis summary
    console.log('=' .repeat(70));
    console.log('\n📈 PARSING QUALITY METRICS:\n');
    
    const withFiles = issues.filter(i => i.file).length;
    const withLines = issues.filter(i => i.line).length;
    const withCode = issues.filter(i => i.codeSnippet).length;
    const withType = issues.filter(i => i.type).length;
    const withSeverity = issues.filter(i => i.severity).length;
    const withFix = issues.filter(i => i.suggestion).length;
    
    console.log(`Files identified: ${withFiles}/${issues.length} (${Math.round(withFiles/issues.length*100)}%)`);
    console.log(`Line numbers: ${withLines}/${issues.length} (${Math.round(withLines/issues.length*100)}%)`);
    console.log(`Code snippets: ${withCode}/${issues.length} (${Math.round(withCode/issues.length*100)}%)`);
    console.log(`Types assigned: ${withType}/${issues.length} (${Math.round(withType/issues.length*100)}%)`);
    console.log(`Severities: ${withSeverity}/${issues.length} (${Math.round(withSeverity/issues.length*100)}%)`);
    console.log(`Fix suggestions: ${withFix}/${issues.length} (${Math.round(withFix/issues.length*100)}%)`);
    
    // Quality assessment
    console.log('\n🎯 ASSESSMENT:');
    if (withFiles > issues.length * 0.8 && withLines > issues.length * 0.7) {
      console.log('✅ Good data quality - Most issues have file locations');
    } else if (withFiles > issues.length * 0.5) {
      console.log('⚠️  Moderate data quality - Some file locations missing');
    } else {
      console.log('❌ Poor data quality - Most file locations missing');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n⚠️  DeepWiki is not accessible. Start port forwarding:');
      console.log('kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001');
    }
  }
}

testEnhancedParser().catch(console.error);