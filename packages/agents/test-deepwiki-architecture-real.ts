/**
 * Test DeepWiki with real API focusing on architecture visualization
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { DeepWikiApiWrapper } from './src/standard/deepwiki/services/deepwiki-api-wrapper';
import { parseDeepWikiResponse } from './src/standard/deepwiki/services/deepwiki-response-parser';
import { ARCHITECTURE_FOCUS_STRATEGY } from './src/standard/deepwiki/config/optimized-prompts';

dotenv.config({ path: '../../.env' });

async function testRealDeepWikiArchitecture() {
  console.log('🏗️  Testing DeepWiki Architecture Analysis with Real API\n');
  console.log('=' .repeat(60));
  
  const apiWrapper = new DeepWikiApiWrapper();
  
  // Test with a small repository that has clear architecture
  const testRepo = 'https://github.com/sindresorhus/ky';
  const testPR = 700;
  
  console.log(`\n📊 Analyzing: ${testRepo} PR #${testPR}`);
  console.log('Using: ARCHITECTURE_FOCUS_STRATEGY');
  console.log('-'.repeat(40));
  
  try {
    const startTime = Date.now();
    
    // Call DeepWiki with architecture-focused prompt
    const rawResponse = await apiWrapper.analyzeRepository(testRepo, {
      messages: [{
        role: 'system',
        content: ARCHITECTURE_FOCUS_STRATEGY.systemPrompt || ''
      }, {
        role: 'user',
        content: ARCHITECTURE_FOCUS_STRATEGY.userPrompt
      }],
      temperature: ARCHITECTURE_FOCUS_STRATEGY.temperature || 0.2,
      max_tokens: ARCHITECTURE_FOCUS_STRATEGY.maxTokens || 4000
    });
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log(`\n✅ Analysis completed in ${elapsed}s`);
    
    // Parse the response
    const result = parseDeepWikiResponse(rawResponse);
    
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
    if (result.architecture?.components?.length > 0) {
      console.log('\n🔧 Detected Components:');
      console.log('-'.repeat(40));
      result.architecture.components.forEach((comp: any) => {
        console.log(`  • ${comp.name} (${comp.type})`);
        if (comp.technology) console.log(`    Technology: ${comp.technology}`);
        if (comp.responsibilities?.length > 0) {
          console.log(`    Responsibilities: ${comp.responsibilities.join(', ')}`);
        }
        if (comp.issues?.length > 0) {
          console.log(`    ⚠️  Issues: ${comp.issues.length}`);
        }
      });
    }
    
    // Display patterns
    if (result.architecture?.patterns?.length > 0) {
      console.log('\n✅ Architectural Patterns:');
      console.log('-'.repeat(40));
      result.architecture.patterns.forEach((pattern: any) => {
        console.log(`  • ${pattern.name} (${pattern.type})`);
        console.log(`    ${pattern.description}`);
      });
    }
    
    // Display anti-patterns
    if (result.architecture?.antiPatterns?.length > 0) {
      console.log('\n⚠️  Anti-patterns Detected:');
      console.log('-'.repeat(40));
      result.architecture.antiPatterns.forEach((ap: any) => {
        console.log(`  • ${ap.name} [${ap.severity}]`);
        console.log(`    ${ap.description}`);
        console.log(`    Solution: ${ap.solution}`);
      });
    }
    
    // Display recommendations
    if (result.architecture?.recommendations?.length > 0) {
      console.log('\n💡 Architecture Recommendations:');
      console.log('-'.repeat(40));
      result.architecture.recommendations.slice(0, 5).forEach((rec: any) => {
        console.log(`  [${rec.priority}] ${rec.category}`);
        console.log(`    Current: ${rec.current}`);
        console.log(`    Recommended: ${rec.recommended}`);
        console.log(`    Effort: ${rec.effort}`);
        console.log('');
      });
    }
    
    // Display metrics
    if (result.architecture?.metrics) {
      console.log('\n📈 Architecture Metrics:');
      console.log('-'.repeat(40));
      const metrics = result.architecture.metrics;
      console.log(`  Complexity:  ${metrics.complexity}/100 (lower is better)`);
      console.log(`  Coupling:    ${metrics.coupling}/100 (lower is better)`);
      console.log(`  Cohesion:    ${metrics.cohesion}/100 (higher is better)`);
      console.log(`  Modularity:  ${metrics.modularity}/100 (higher is better)`);
      console.log(`  Testability: ${metrics.testability}/100 (higher is better)`);
    }
    
    // Display issues summary
    console.log('\n📋 Issues Summary:');
    console.log('-'.repeat(40));
    console.log(`  Total Issues: ${result.issues.length}`);
    const bySeverity = {
      critical: result.issues.filter((i: any) => i.severity === 'critical').length,
      high: result.issues.filter((i: any) => i.severity === 'high').length,
      medium: result.issues.filter((i: any) => i.severity === 'medium').length,
      low: result.issues.filter((i: any) => i.severity === 'low').length
    };
    console.log(`  Critical: ${bySeverity.critical}`);
    console.log(`  High: ${bySeverity.high}`);
    console.log(`  Medium: ${bySeverity.medium}`);
    console.log(`  Low: ${bySeverity.low}`);
    
    // Display score breakdown
    console.log('\n📊 Quality Scores:');
    console.log('-'.repeat(40));
    console.log(`  Overall: ${result.scores.overall}/100`);
    console.log(`  Architecture: ${result.scores.architecture}/100`);
    console.log(`  Security: ${result.scores.security}/100`);
    console.log(`  Performance: ${result.scores.performance}/100`);
    console.log(`  Code Quality: ${result.scores.codeQuality}/100`);
    
    // Save full report
    const reportPath = `./test-outputs/architecture-analysis-${Date.now()}.json`;
    fs.mkdirSync('./test-outputs', { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));
    console.log(`\n💾 Full report saved to: ${reportPath}`);
    
    // Save raw response for debugging
    const rawPath = `./test-outputs/architecture-raw-${Date.now()}.txt`;
    fs.writeFileSync(rawPath, rawResponse);
    console.log(`📝 Raw response saved to: ${rawPath}`);
    
  } catch (error: any) {
    console.error('\n❌ Analysis failed:', error.message);
    if (error.response?.data) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testRealDeepWikiArchitecture().catch(console.error);