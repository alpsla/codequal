#!/usr/bin/env node

import axios from 'axios';
import { PRContentAnalyzer, PRFile } from '../services/intelligence/pr-content-analyzer';
import { createLogger } from '@codequal/core/utils';

const API_URL = 'http://localhost:3001';
const logger = createLogger('ModeSelectionTest');

// Test scenarios for different PR types
const TEST_SCENARIOS = [
  {
    name: 'Small UI Change',
    description: 'Simple CSS and component changes - should trigger QUICK mode',
    expectedMode: 'quick',
    expectedAgents: ['security', 'codeQuality'],
    files: [
      { filename: 'src/components/Button.tsx', additions: 5, deletions: 3, changes: 8 },
      { filename: 'src/styles/button.css', additions: 10, deletions: 5, changes: 15 }
    ]
  },
  {
    name: 'Documentation Only',
    description: 'Pure documentation changes - should trigger QUICK mode with minimal agents',
    expectedMode: 'quick',
    expectedAgents: ['codeQuality'], // Docs-only should skip most agents
    files: [
      { filename: 'README.md', additions: 50, deletions: 20, changes: 70 },
      { filename: 'docs/API.md', additions: 100, deletions: 50, changes: 150 }
    ]
  },
  {
    name: 'Medium Feature',
    description: 'New feature with backend and frontend - should trigger COMPREHENSIVE mode',
    expectedMode: 'comprehensive',
    expectedAgents: ['security', 'architecture', 'performance', 'codeQuality', 'dependency'],
    files: [
      { filename: 'src/api/controllers/UserController.ts', additions: 150, deletions: 20, changes: 170 },
      { filename: 'src/services/UserService.ts', additions: 200, deletions: 10, changes: 210 },
      { filename: 'src/components/UserProfile.tsx', additions: 100, deletions: 30, changes: 130 },
      { filename: 'src/models/User.ts', additions: 50, deletions: 5, changes: 55 }
    ]
  },
  {
    name: 'Database Migration',
    description: 'Database schema changes - should trigger HIGH RISK and use all agents',
    expectedMode: 'deep', // High risk should override to use all agents
    expectedAgents: ['security', 'architecture', 'performance', 'codeQuality', 'dependency', 'educational', 'reporting'],
    files: [
      { filename: 'src/database/migrations/20240114_add_user_roles.sql', additions: 50, deletions: 0, changes: 50 },
      { filename: 'src/models/User.ts', additions: 30, deletions: 10, changes: 40 },
      { filename: 'src/services/AuthService.ts', additions: 80, deletions: 20, changes: 100 }
    ]
  },
  {
    name: 'Large Refactor',
    description: 'Major refactoring across multiple services - should trigger DEEP mode',
    expectedMode: 'deep',
    expectedAgents: ['security', 'architecture', 'performance', 'codeQuality', 'dependency', 'educational', 'reporting'],
    files: Array.from({ length: 25 }, (_, i) => ({
      filename: `src/services/Service${i}.ts`,
      additions: 100 + i * 10,
      deletions: 80 + i * 5,
      changes: 180 + i * 15
    }))
  },
  {
    name: 'Dependency Update',
    description: 'Package.json updates only - should use minimal agents',
    expectedMode: 'quick',
    expectedAgents: ['security', 'dependency'], // Dependency updates need security scan
    files: [
      { filename: 'package.json', additions: 5, deletions: 5, changes: 10 },
      { filename: 'package-lock.json', additions: 500, deletions: 480, changes: 980 }
    ]
  },
  {
    name: 'Test Files Only',
    description: 'Pure test file changes - should skip most agents',
    expectedMode: 'quick',
    expectedAgents: ['codeQuality'], // Only code quality for tests
    files: [
      { filename: 'src/services/__tests__/UserService.test.ts', additions: 100, deletions: 20, changes: 120 },
      { filename: 'src/components/__tests__/Button.test.tsx', additions: 50, deletions: 10, changes: 60 }
    ]
  },
  {
    name: 'Config Changes',
    description: 'Configuration file changes - should trigger security review',
    expectedMode: 'comprehensive',
    expectedAgents: ['security', 'dependency', 'architecture'], // Config needs security
    files: [
      { filename: '.env.production', additions: 2, deletions: 1, changes: 3 },
      { filename: 'config/database.yml', additions: 10, deletions: 5, changes: 15 },
      { filename: 'docker-compose.yml', additions: 20, deletions: 10, changes: 30 }
    ]
  },
  {
    name: 'AI/ML Model Changes',
    description: 'Changes to AI models and prompts - should trigger comprehensive analysis',
    expectedMode: 'comprehensive',
    expectedAgents: ['architecture', 'performance', 'security', 'codeQuality', 'dependency'],
    files: [
      { filename: 'src/agents/claude-agent.ts', additions: 150, deletions: 50, changes: 200 },
      { filename: 'src/prompts/analysis-prompt.ts', additions: 80, deletions: 30, changes: 110 },
      { filename: 'src/models/embedding-service.ts', additions: 100, deletions: 40, changes: 140 }
    ]
  }
];

async function testPRContentAnalyzer() {
  console.log('🧪 Testing PR Content Analyzer Mode Selection\n');
  
  const analyzer = new PRContentAnalyzer();
  const results: any[] = [];
  
  for (const scenario of TEST_SCENARIOS) {
    console.log(`\n📋 Testing: ${scenario.name}`);
    console.log(`   Description: ${scenario.description}`);
    console.log(`   Files: ${scenario.files.length} files, ${scenario.files.reduce((sum, f) => sum + f.changes, 0)} total changes`);
    
    try {
      // Analyze PR content
      const analysis = await analyzer.analyzePR(scenario.files);
      
      console.log(`\n   Analysis Results:`);
      console.log(`   - Complexity: ${analysis.complexity}`);
      console.log(`   - Risk Level: ${analysis.riskLevel}`);
      console.log(`   - Change Types: ${analysis.changeTypes.join(', ')}`);
      console.log(`   - Agents to Skip: ${analysis.agentsToSkip.length > 0 ? analysis.agentsToSkip.join(', ') : 'none'}`);
      console.log(`   - Agents to Keep: ${analysis.agentsToKeep.join(', ')}`);
      
      // Determine actual mode based on risk and complexity
      let actualMode: string;
      if (analysis.riskLevel === 'high') {
        actualMode = 'deep'; // High risk overrides to deep mode
      } else if (analysis.complexity === 'complex' && analysis.changeTypes.includes('mixed')) {
        actualMode = 'deep';
      } else if (analysis.complexity === 'moderate' || analysis.changeTypes.includes('feature')) {
        actualMode = 'comprehensive';
      } else {
        actualMode = 'quick';
      }
      
      // Determine which agents would actually run
      const allAgents = ['security', 'architecture', 'performance', 'codeQuality', 'dependency', 'educational', 'reporting'];
      const agentsToRun = allAgents.filter(agent => !analysis.agentsToSkip.includes(agent));
      
      // Check if mode matches expectation
      const modeMatch = actualMode === scenario.expectedMode;
      console.log(`\n   Mode Selection: ${actualMode} ${modeMatch ? '✅' : '❌'} (expected: ${scenario.expectedMode})`);
      
      // Check if agents match expectation (considering skip logic)
      const agentMatch = JSON.stringify(agentsToRun.sort()) === JSON.stringify(scenario.expectedAgents.sort());
      console.log(`   Agents to Run: ${agentsToRun.join(', ')} ${agentMatch ? '✅' : '❌'}`);
      
      if (!modeMatch || !agentMatch) {
        console.log(`\n   ⚠️  Mismatch detected!`);
        if (!modeMatch) {
          console.log(`   - Expected mode: ${scenario.expectedMode}, got: ${actualMode}`);
        }
        if (!agentMatch) {
          console.log(`   - Expected agents: ${scenario.expectedAgents.join(', ')}`);
          console.log(`   - Actual agents: ${agentsToRun.join(', ')}`);
        }
      }
      
      results.push({
        scenario: scenario.name,
        passed: modeMatch && agentMatch,
        actualMode,
        expectedMode: scenario.expectedMode,
        agentsToRun,
        expectedAgents: scenario.expectedAgents,
        analysis
      });
      
    } catch (error) {
      console.error(`\n   ❌ Error analyzing scenario: ${error}`);
      results.push({
        scenario: scenario.name,
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  // Summary
  console.log('\n\n📊 Test Summary:');
  console.log('================\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`Total scenarios: ${results.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  
  if (failed > 0) {
    console.log('\n❌ Failed scenarios:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`\n- ${r.scenario}`);
      if (r.error) {
        console.log(`  Error: ${r.error}`);
      } else {
        console.log(`  Expected mode: ${r.expectedMode}, got: ${r.actualMode}`);
        console.log(`  Expected agents: ${r.expectedAgents.join(', ')}`);
        console.log(`  Actual agents: ${r.agentsToRun.join(', ')}`);
      }
    });
  }
  
  return results;
}

async function testModeSelectionInAPI() {
  console.log('\n\n🌐 Testing Automatic Mode Selection via API\n');
  
  const testCases = [
    {
      name: 'Complex PR (should select deep mode)',
      repositoryUrl: 'https://github.com/facebook/react',
      prNumber: 27804
    },
    {
      name: 'Simple docs PR (should select quick mode)',  
      repositoryUrl: 'https://github.com/facebook/react',
      prNumber: 28000 // A smaller PR
    }
  ];
  
  for (const testCase of testCases) {
    try {
      console.log(`\nTesting: ${testCase.name}`);
      console.log(`Repository: ${testCase.repositoryUrl}`);
      console.log(`PR: #${testCase.prNumber}`);
      
      const response = await axios.post(
        `${API_URL}/v1/analyze-pr`,
        {
          repositoryUrl: testCase.repositoryUrl,
          prNumber: testCase.prNumber,
          analysisMode: 'auto' // Let the system decide automatically
        },
        {
          headers: {
            'X-API-Key': 'test_key',
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ API Response received');
      console.log('Analysis ID:', response.data.analysisId);
      
    } catch (error: any) {
      console.error('❌ API test failed:', error.response?.data || error.message);
    }
  }
  
  console.log('\n\n📋 Check server.log for:');
  console.log('- "Automatic mode selection" - shows the auto-selected mode');
  console.log('- "PR content analysis complete" - shows detected change types and risk');
  console.log('- "selectedAgents:" - shows final agent selection based on auto mode');
  console.log('- Reasoning for mode selection (complexity, risk level, change types)');
}

// Run tests
async function runAllTests() {
  // First test the analyzer directly
  await testPRContentAnalyzer();
  
  // Then test via API
  await testModeSelectionInAPI();
  
  console.log('\n\n✨ Mode selection testing complete!');
  console.log('The system analyzes PR content to intelligently select analysis mode and agents.');
}

runAllTests().catch(console.error);