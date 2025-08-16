#!/usr/bin/env npx ts-node

import axios from 'axios';
import { PRIORITY_BASED_STRATEGY, JSON_OPTIMIZED_STRATEGY } from './src/standard/deepwiki/config/optimized-prompts';
import { parseDeepWikiResponse } from './src/standard/deepwiki/services/deepwiki-response-parser';

const DEEPWIKI_URL = process.env.DEEPWIKI_API_URL || 'http://localhost:8001';
const DEEPWIKI_API_KEY = process.env.DEEPWIKI_API_KEY || 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f';

/**
 * Test priority-based analysis with real DeepWiki
 */
async function testPriorityBasedAnalysis() {
  console.log('🚀 Testing Priority-Based DeepWiki Analysis');
  console.log('=' .repeat(60));
  
  const testRepo = 'https://github.com/vercel/swr';
  
  // Test 1: Priority-based markdown strategy
  console.log('\n📋 Test 1: Priority-Based Markdown Strategy');
  console.log('Focus: Security > Performance > Dependencies > Architecture');
  
  try {
    const response = await axios.post(
      `${DEEPWIKI_URL}/chat/completions/stream`,
      {
        repo_url: testRepo,
        messages: [{
          role: 'user',
          content: PRIORITY_BASED_STRATEGY.userPrompt
        }],
        stream: false,
        provider: 'openrouter',
        model: 'openai/gpt-4o',
        temperature: PRIORITY_BASED_STRATEGY.temperature || 0.1,
        max_tokens: 8000
      },
      {
        headers: {
          'Authorization': `Bearer ${DEEPWIKI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000,
        responseType: 'text'
      }
    );
    
    const content = String(response.data);
    console.log(`✅ Response received (${content.length} chars)`);
    
    // Parse the response
    const parsed = parseDeepWikiResponse(content);
    
    // Analyze results
    console.log('\n📊 Analysis Results:');
    console.log(`Total issues found: ${parsed.issues.length}`);
    
    // Group by category
    const byCategory: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    
    parsed.issues.forEach(issue => {
      byCategory[issue.category] = (byCategory[issue.category] || 0) + 1;
      bySeverity[issue.severity] = (bySeverity[issue.severity] || 0) + 1;
    });
    
    console.log('\nIssues by Priority Category:');
    const priorityOrder = ['security', 'performance', 'dependency', 'architecture', 'code-quality', 'type-safety', 'testing'];
    priorityOrder.forEach(cat => {
      if (byCategory[cat]) {
        console.log(`  ${cat}: ${byCategory[cat]} issues`);
      }
    });
    
    console.log('\nIssues by Severity:');
    ['critical', 'high', 'medium', 'low'].forEach(sev => {
      if (bySeverity[sev]) {
        console.log(`  ${sev}: ${bySeverity[sev]} issues`);
      }
    });
    
    // Check for architecture diagram
    if (parsed.architecture?.diagram) {
      console.log('\n🏗️ Architecture Diagram Detected:');
      console.log(parsed.architecture.diagram.substring(0, 200) + '...');
    }
    
    // Check for dependencies
    if (parsed.dependencies) {
      console.log('\n📦 Dependency Analysis:');
      console.log(`  Vulnerable: ${parsed.dependencies.vulnerable?.length || 0}`);
      console.log(`  Outdated: ${parsed.dependencies.outdated?.length || 0}`);
      console.log(`  Deprecated: ${parsed.dependencies.deprecated?.length || 0}`);
    }
    
    // Display scores
    console.log('\n📈 Quality Scores:');
    Object.entries(parsed.scores).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}/100`);
    });
    
    // Show sample issues with locations
    console.log('\n🔍 Sample Issues with Locations:');
    const issuesWithLocations = parsed.issues.filter(i => i.location?.file !== 'unknown');
    console.log(`Issues with file locations: ${issuesWithLocations.length}/${parsed.issues.length}`);
    
    issuesWithLocations.slice(0, 3).forEach(issue => {
      console.log(`\n[${issue.severity.toUpperCase()}] ${issue.category}: ${issue.title}`);
      console.log(`  File: ${issue.location.file}, Line: ${issue.location.line}`);
      console.log(`  ${issue.description.substring(0, 100)}...`);
    });
    
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
  
  // Test 2: JSON Optimized Strategy
  console.log('\n\n📋 Test 2: JSON Optimized Strategy');
  console.log('Testing structured JSON response with priority categories');
  
  try {
    const response = await axios.post(
      `${DEEPWIKI_URL}/chat/completions/stream`,
      {
        repo_url: testRepo,
        messages: [
          ...(JSON_OPTIMIZED_STRATEGY.systemPrompt ? [{
            role: 'system' as const,
            content: JSON_OPTIMIZED_STRATEGY.systemPrompt
          }] : []),
          {
            role: 'user' as const,
            content: JSON_OPTIMIZED_STRATEGY.userPrompt
          }
        ],
        stream: false,
        provider: 'openrouter',
        model: 'openai/gpt-4o',
        temperature: JSON_OPTIMIZED_STRATEGY.temperature || 0.1,
        max_tokens: 8000,
        ...(JSON_OPTIMIZED_STRATEGY.responseFormat ? { response_format: JSON_OPTIMIZED_STRATEGY.responseFormat } : {})
      },
      {
        headers: {
          'Authorization': `Bearer ${DEEPWIKI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000,
        responseType: 'text'
      }
    );
    
    const content = String(response.data);
    console.log(`✅ Response received (${content.length} chars)`);
    
    // Try to parse as JSON
    let parsed: any;
    try {
      parsed = JSON.parse(content);
      console.log('✅ Valid JSON response!');
      
      console.log('\n📊 JSON Analysis Results:');
      console.log(`Total issues: ${parsed.issues?.length || 0}`);
      
      if (parsed.dependencies) {
        console.log('\nDependencies in JSON:');
        console.log(`  Vulnerable: ${parsed.dependencies.vulnerable?.length || 0}`);
        console.log(`  Outdated: ${parsed.dependencies.outdated?.length || 0}`);
      }
      
      if (parsed.architecture) {
        console.log('\nArchitecture info in JSON:');
        console.log(`  Patterns: ${parsed.architecture.patterns?.join(', ') || 'none'}`);
        console.log(`  Anti-patterns: ${parsed.architecture.antiPatterns?.join(', ') || 'none'}`);
      }
      
      if (parsed.education) {
        console.log('\nEducational insights:');
        console.log(`  Best practices: ${parsed.education.bestPractices?.length || 0}`);
        console.log(`  Anti-patterns: ${parsed.education.antiPatterns?.length || 0}`);
      }
      
    } catch (e) {
      console.log('⚠️ Not valid JSON, parsing as text');
      parsed = parseDeepWikiResponse(content);
    }
    
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('✅ Priority-Based Analysis Test Complete');
  console.log('\nKey Improvements Implemented:');
  console.log('1. Priority ordering: Security > Performance > Dependencies');
  console.log('2. Enhanced categories: Added architecture, dependencies, breaking changes');
  console.log('3. Architecture diagram extraction');
  console.log('4. Educational insights and best practices');
  console.log('5. Comprehensive scoring by category');
}

// Run the test
(async () => {
  try {
    await testPriorityBasedAnalysis();
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
})();