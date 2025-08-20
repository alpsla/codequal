#!/usr/bin/env ts-node

/**
 * Test Real DeepWiki Location Accuracy
 * 
 * Tests whether real DeepWiki returns accurate file locations
 * when given our enhanced prompt that explicitly requests exact locations.
 */

import axios from 'axios';
import { LocationValidator } from './src/standard/services/location-validator';

async function testRealDeepWikiLocations() {
  console.log('🔍 Testing Real DeepWiki Location Accuracy\n');
  console.log('=' .repeat(80));
  
  const DEEPWIKI_URL = 'http://localhost:8001/chat/completions/stream';
  const TEST_REPO = 'https://github.com/sindresorhus/ky';
  
  console.log('Repository:', TEST_REPO);
  console.log('DeepWiki URL:', DEEPWIKI_URL);
  console.log();
  
  // Our enhanced prompt that explicitly requests exact locations
  const enhancedPrompt = `Analyze this repository for security vulnerabilities and code quality issues.

CRITICAL REQUIREMENTS:
1. For EVERY issue found, you MUST provide the EXACT file path and line number from the actual codebase
2. DO NOT use placeholder locations like "unknown", "src/example.ts", or random file names
3. SEARCH the repository to find the actual location of each issue before reporting it
4. Only report issues where you can identify the EXACT location in the codebase

Find the TOP 5 most critical issues.

Return ONLY valid JSON in this EXACT format:
{
  "vulnerabilities": [
    {
      "id": "SEC-001",
      "severity": "critical|high|medium|low",
      "category": "security|performance|quality|dependencies",
      "title": "Clear description of the issue",
      "location": {
        "file": "exact/path/to/file.ts",
        "line": <exact line number as integer>
      },
      "snippet": "The actual code from that location"
    }
  ]
}

IMPORTANT: Each issue MUST have a real file path that exists in the repository.
Remember: Users will click on these locations in their IDE, so they MUST be accurate!`;

  console.log('📊 Testing DeepWiki with enhanced prompt...\n');
  
  try {
    const response = await axios.post(DEEPWIKI_URL, {
      repo_url: TEST_REPO,
      messages: [{
        role: 'user',
        content: enhancedPrompt
      }],
      stream: false,
      provider: 'openrouter',
      model: 'openai/gpt-4o-mini',
      temperature: 0.1,
      max_tokens: 2000
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });
    
    console.log('✅ DeepWiki responded successfully\n');
    
    // Parse response
    let parsedData: any;
    const content = typeof response.data === 'string' 
      ? response.data 
      : response.data?.choices?.[0]?.message?.content || JSON.stringify(response.data);
    
    console.log('📝 Raw response preview:');
    console.log(content.substring(0, 500) + '...\n');
    
    try {
      // Try to extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        parsedData = JSON.parse(content);
      }
    } catch (e) {
      console.error('❌ Failed to parse JSON response');
      console.log('Raw content:', content);
      return;
    }
    
    const issues = parsedData.vulnerabilities || parsedData.issues || [];
    console.log(`📋 Found ${issues.length} issues from DeepWiki\n`);
    
    if (issues.length === 0) {
      console.log('⚠️ No issues returned by DeepWiki');
      return;
    }
    
    // Create location validator
    const validator = new LocationValidator(TEST_REPO);
    
    // Prepare issues for validation
    const issuesToValidate = issues.map((issue: any, index: number) => ({
      id: issue.id || `issue-${index}`,
      title: issue.title || issue.message || 'Unknown',
      category: issue.category || 'unknown',
      severity: issue.severity || 'medium',
      location: issue.location || { file: 'unknown', line: 0 },
      description: issue.description,
      codeSnippet: issue.snippet || issue.evidence?.snippet
    }));
    
    // Validate each location
    console.log('🔍 Validating locations returned by DeepWiki:\n');
    const results = await validator.validateLocations(issuesToValidate);
    
    // Get statistics
    const stats = validator.getValidationStats(results);
    
    // Display results
    console.log('=' .repeat(80));
    console.log('\n📈 VALIDATION RESULTS:');
    console.log(`   Total Issues: ${stats.total}`);
    console.log(`   Valid Locations: ${stats.valid} (${Math.round(stats.valid / stats.total * 100)}%)`);
    console.log(`   File Not Found: ${stats.fileNotFound}`);
    console.log(`   Line Not Found: ${stats.lineNotFound}`);
    console.log(`   Content Mismatch: ${stats.contentMismatch}`);
    console.log(`   Average Confidence: ${Math.round(stats.averageConfidence)}%`);
    console.log();
    
    // Show each issue's validation result
    console.log('📋 Issue-by-Issue Results:\n');
    
    for (const issue of issuesToValidate) {
      const result = results.get(issue.id)!;
      const status = result.isValid ? '✅' : '❌';
      
      console.log(`${status} ${issue.title}`);
      console.log(`   Location: ${issue.location.file}:${issue.location.line}`);
      
      if (result.isValid) {
        console.log(`   Status: VALID (${Math.round(result.confidence)}% confidence)`);
      } else {
        console.log(`   Status: INVALID - ${result.reason}`);
      }
      console.log();
    }
    
    // Final verdict
    console.log('=' .repeat(80));
    console.log('\n🎯 FINAL VERDICT:\n');
    
    if (stats.valid / stats.total >= 0.8) {
      console.log('✅ SUCCESS: DeepWiki returns accurate locations (80%+ valid)');
      console.log('   The enhanced prompt is working effectively!');
    } else if (stats.valid / stats.total >= 0.5) {
      console.log('⚠️ PARTIAL SUCCESS: DeepWiki returns some accurate locations (50-80% valid)');
      console.log('   LocationClarifier should be used for unknown locations');
    } else {
      console.log('❌ FAILURE: DeepWiki still returns mostly fake locations (<50% valid)');
      console.log('   The LocationClarifier 3-iteration flow is essential');
    }
    
    // Test LocationClarifier if needed
    if (stats.valid / stats.total < 1.0) {
      console.log('\n📊 Testing LocationClarifier for invalid locations...\n');
      
      const { LocationClarifier } = require('./src/standard/deepwiki/services/location-clarifier');
      const clarifier = new LocationClarifier();
      
      const invalidIssues = issuesToValidate.filter(issue => {
        const result = results.get(issue.id);
        return !result?.isValid;
      });
      
      if (invalidIssues.length > 0) {
        console.log(`Attempting to clarify ${invalidIssues.length} invalid locations...`);
        
        const clarifications = await clarifier.clarifyLocations(
          TEST_REPO,
          'main',
          invalidIssues.map(issue => ({
            id: issue.id,
            title: issue.title,
            description: issue.description || issue.title,
            severity: issue.severity,
            category: issue.category
          }))
        );
        
        console.log(`\n✅ LocationClarifier found ${clarifications.length} real locations`);
        
        for (const clarification of clarifications) {
          const issue = invalidIssues.find(i => i.id === clarification.issueId);
          if (issue) {
            console.log(`   - ${issue.title}: ${clarification.file}:${clarification.line} (${clarification.confidence}% confidence)`);
          }
        }
      }
    }
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('\n⚠️ DeepWiki is not running. Please ensure:');
      console.log('   1. kubectl port-forward is running');
      console.log('   2. DeepWiki pod is healthy');
    }
  }
}

// Run the test
testRealDeepWikiLocations().catch(console.error);