/**
 * Test DeepWiki Architecture Analysis with Raw API Call
 */

import * as fs from 'fs';
import axios from 'axios';
import { parseDeepWikiResponse } from './src/standard/deepwiki/services/deepwiki-response-parser';
import { ARCHITECTURE_FOCUS_STRATEGY } from './src/standard/deepwiki/config/optimized-prompts';

async function testRawDeepWikiArchitecture() {
  console.log('🏗️  Testing DeepWiki Architecture Analysis with Raw API\n');
  console.log('=' .repeat(60));
  
  const apiUrl = 'http://localhost:8001';
  const testRepo = 'https://github.com/sindresorhus/ky';
  
  console.log(`\n📊 Analyzing: ${testRepo}`);
  console.log('Using: ARCHITECTURE_FOCUS_STRATEGY');
  console.log('-'.repeat(40));
  
  try {
    const startTime = Date.now();
    
    // Make raw API call to DeepWiki
    const response = await axios.post(
      `${apiUrl}/chat/completions/stream`,
      {
        repo_url: testRepo,
        messages: [
          {
            role: 'system',
            content: ARCHITECTURE_FOCUS_STRATEGY.systemPrompt || 'You are an expert software architect.'
          },
          {
            role: 'user',
            content: ARCHITECTURE_FOCUS_STRATEGY.userPrompt
          }
        ],
        stream: false,
        provider: 'openrouter',
        model: 'openai/gpt-4o-mini', // Use faster model for testing
        temperature: ARCHITECTURE_FOCUS_STRATEGY.temperature || 0.2,
        max_tokens: ARCHITECTURE_FOCUS_STRATEGY.maxTokens || 4000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f'
        },
        timeout: 90000 // 90 second timeout
      }
    );
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ API call completed in ${elapsed}s`);
    
    // Extract the response content
    let content = '';
    if (typeof response.data === 'string') {
      content = response.data;
    } else if (response.data?.choices?.[0]?.message?.content) {
      content = response.data.choices[0].message.content;
    } else if (response.data?.content) {
      content = response.data.content;
    } else {
      console.log('Raw response structure:', Object.keys(response.data));
      content = JSON.stringify(response.data);
    }
    
    console.log('\n📝 Raw Response (first 500 chars):');
    console.log('-'.repeat(40));
    console.log(content.substring(0, 500) + '...');
    
    // Parse the response
    const result = parseDeepWikiResponse(content);
    
    console.log('\n📊 Architecture Analysis Results:');
    console.log('=' .repeat(50));
    
    // Display architecture diagram if present
    if (result.architecture?.diagram) {
      console.log('\n🏗️  Architecture Diagram:');
      console.log('-'.repeat(40));
      console.log(result.architecture.diagram);
    } else {
      console.log('\n⚠️  No architecture diagram generated');
    }
    
    // Display detected components
    if (result.architecture?.components && result.architecture.components.length > 0) {
      console.log('\n🔧 Detected Components:');
      console.log('-'.repeat(40));
      result.architecture.components.forEach((comp: any) => {
        console.log(`  • ${comp.name} (${comp.type})`);
        if (comp.technology) console.log(`    Technology: ${comp.technology}`);
      });
    } else {
      console.log('\n  No components detected');
    }
    
    // Display patterns
    if (result.architecture?.patterns && result.architecture.patterns.length > 0) {
      console.log('\n✅ Architectural Patterns:');
      console.log('-'.repeat(40));
      result.architecture.patterns.forEach((pattern: any) => {
        console.log(`  • ${pattern.name}`);
        if (pattern.description) console.log(`    ${pattern.description}`);
      });
    }
    
    // Display anti-patterns
    if (result.architecture?.antiPatterns && result.architecture.antiPatterns.length > 0) {
      console.log('\n⚠️  Anti-patterns Detected:');
      console.log('-'.repeat(40));
      result.architecture.antiPatterns.forEach((ap: any) => {
        console.log(`  • ${ap.name} [${ap.severity}]`);
        if (ap.solution) console.log(`    Fix: ${ap.solution}`);
      });
    }
    
    // Display recommendations
    if (result.architecture?.recommendations && result.architecture.recommendations.length > 0) {
      console.log('\n💡 Top Architecture Recommendations:');
      console.log('-'.repeat(40));
      result.architecture.recommendations.slice(0, 3).forEach((rec: any) => {
        console.log(`  [${rec.priority || 'MEDIUM'}] ${rec.category || 'General'}`);
        console.log(`    ${rec.recommended || rec.current}`);
      });
    }
    
    // Display metrics
    if (result.architecture?.metrics) {
      console.log('\n📈 Architecture Metrics:');
      console.log('-'.repeat(40));
      const m = result.architecture.metrics;
      console.log(`  Complexity:  ${m.complexity}/100`);
      console.log(`  Coupling:    ${m.coupling}/100`);
      console.log(`  Cohesion:    ${m.cohesion}/100`);
      console.log(`  Modularity:  ${m.modularity}/100`);
      console.log(`  Testability: ${m.testability}/100`);
    }
    
    // Display issues summary
    console.log('\n📋 Issues Found:');
    console.log('-'.repeat(40));
    console.log(`  Total: ${result.issues.length}`);
    
    if (result.issues.length > 0) {
      console.log('\n  Top Issues:');
      result.issues.slice(0, 5).forEach((issue: any) => {
        console.log(`  - [${issue.severity}] ${issue.title || issue.description.substring(0, 50)}`);
        if (issue.location?.file !== 'unknown') {
          console.log(`    File: ${issue.location.file}:${issue.location.line}`);
        }
      });
    }
    
    // Display scores
    console.log('\n📊 Quality Scores:');
    console.log('-'.repeat(40));
    console.log(`  Overall:      ${result.scores.overall}/100`);
    console.log(`  Architecture: ${result.scores.architecture}/100`);
    console.log(`  Security:     ${result.scores.security}/100`);
    console.log(`  Performance:  ${result.scores.performance}/100`);
    
    // Save outputs
    const timestamp = Date.now();
    fs.mkdirSync('./test-outputs', { recursive: true });
    
    const reportPath = `./test-outputs/arch-analysis-${timestamp}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));
    console.log(`\n💾 Full report: ${reportPath}`);
    
    const rawPath = `./test-outputs/arch-raw-${timestamp}.txt`;
    fs.writeFileSync(rawPath, content);
    console.log(`📝 Raw response: ${rawPath}`);
    
  } catch (error: any) {
    console.error('\n❌ Analysis failed:', error.message);
    if (error.response?.data) {
      console.error('Error response:', JSON.stringify(error.response.data, null, 2));
    }
    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  DeepWiki API is not reachable. Please ensure:');
      console.error('  1. kubectl port-forward is running');
      console.error('  2. DeepWiki pod is healthy');
    }
  }
}

// Run the test
testRawDeepWikiArchitecture().catch(console.error);