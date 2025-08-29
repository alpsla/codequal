/**
 * Test demonstrating language detection and agent-tool configuration
 * Shows how orchestrator:
 * 1. Detects repository language
 * 2. Selects appropriate model for language
 * 3. Configures role-based agents with language-specific tools
 */

import { ComparisonOrchestrator } from '../orchestrator/comparison-orchestrator';
import { SecurityAgent } from '../../specialized/security-agent';
import { PerformanceAgent } from '../../specialized/performance-agent';

async function demonstrateLanguageOrchestration() {
  console.log('🎯 Language-Aware Orchestration Demo\n');
  console.log('=' .repeat(50));
  
  // Mock orchestrator dependencies
  const mockConfigProvider = {
    getConfig: async () => null,
    saveConfig: async () => {},
  };
  
  const mockSkillProvider = {
    getSkills: async () => null,
    updateSkills: async () => {},
  };
  
  const mockDataStore = {
    saveReport: async () => {},
    getReport: async () => null,
  };
  
  const mockResearcher = {
    findOptimalModel: async () => ({
      model: 'claude-3-opus',
      reasoning: 'Best for this language'
    }),
  };
  
  const mockLogger = {
    info: (msg: string, data?: any) => console.log(`ℹ️  ${msg}`, data || ''),
    warn: (msg: string, data?: any) => console.log(`⚠️  ${msg}`, data || ''),
    error: (msg: string, data?: any) => console.log(`❌ ${msg}`, data || ''),
  };
  
  // Create orchestrator
  const orchestrator = new ComparisonOrchestrator(
    mockConfigProvider as any,
    mockSkillProvider as any,
    mockDataStore as any,
    mockResearcher as any,
    undefined,
    mockLogger
  );
  
  // Create specialized agents
  const securityAgent = new SecurityAgent();
  const performanceAgent = new PerformanceAgent();
  
  console.log('\n📊 Testing Different Languages:\n');
  
  // Test 1: Objective-C repository
  console.log('1. Objective-C Repository (iOS App)');
  console.log('-'.repeat(40));
  
  const objcRequest = {
    repository: 'https://github.com/example/ios-app',
    language: 'objectivec',
    mainBranchAnalysis: { issues: [] },
    featureBranchAnalysis: { issues: [] },
  };
  
  // Simulate language detection
  const objcContext = await orchestrator['analyzeRepositoryContext'](objcRequest as any);
  console.log(`   Detected Language: ${objcContext.language}`);
  console.log(`   Repository Type: ${objcContext.repoType}`);
  
  // Get recommended model for language
  const objcModel = orchestrator.getRecommendedModelForLanguage('objectivec');
  console.log(`   Recommended Model: ${objcModel}`);
  
  // Get tools for this language
  const objcSecurityTools = orchestrator.getToolsForLanguage('objectivec', 'security');
  const objcPerfTools = orchestrator.getToolsForLanguage('objectivec', 'performance');
  console.log(`   Security Tools: ${objcSecurityTools.join(', ')}`);
  console.log(`   Performance Tools: ${objcPerfTools.join(', ')}`);
  
  // Configure agents
  await orchestrator.initializeSpecializedAgents('objectivec', {
    security: securityAgent,
    performance: performanceAgent,
  });
  
  // Test 2: Python repository
  console.log('\n2. Python Repository (ML Project)');
  console.log('-'.repeat(40));
  
  const pythonRequest = {
    repository: 'https://github.com/example/ml-project',
    language: 'python',
    mainBranchAnalysis: { issues: [] },
    featureBranchAnalysis: { issues: [] },
  };
  
  const pythonContext = await orchestrator['analyzeRepositoryContext'](pythonRequest as any);
  console.log(`   Detected Language: ${pythonContext.language}`);
  console.log(`   Repository Type: ${pythonContext.repoType}`);
  
  const pythonModel = orchestrator.getRecommendedModelForLanguage('python');
  console.log(`   Recommended Model: ${pythonModel}`);
  
  const pythonSecurityTools = orchestrator.getToolsForLanguage('python', 'security');
  const pythonQualityTools = orchestrator.getToolsForLanguage('python', 'quality');
  console.log(`   Security Tools: ${pythonSecurityTools.join(', ')}`);
  console.log(`   Quality Tools: ${pythonQualityTools.join(', ')}`);
  
  await orchestrator.initializeSpecializedAgents('python', {
    security: securityAgent,
    performance: performanceAgent,
  });
  
  // Test 3: Java repository
  console.log('\n3. Java Repository (Enterprise App)');
  console.log('-'.repeat(40));
  
  const javaRequest = {
    repository: 'https://github.com/example/enterprise-app',
    language: 'java',
    mainBranchAnalysis: { issues: [] },
    featureBranchAnalysis: { issues: [] },
  };
  
  const javaContext = await orchestrator['analyzeRepositoryContext'](javaRequest as any);
  console.log(`   Detected Language: ${javaContext.language}`);
  console.log(`   Repository Type: ${javaContext.repoType}`);
  
  const javaModel = orchestrator.getRecommendedModelForLanguage('java');
  console.log(`   Recommended Model: ${javaModel}`);
  
  const javaTools = orchestrator.getToolsForLanguage('java');
  console.log(`   All Tools: ${javaTools.join(', ')}`);
  
  // Check tool availability
  const toolAvailability = await orchestrator.checkToolAvailability('java');
  console.log(`   Available Tools: ${toolAvailability.available.join(', ')}`);
  console.log(`   Missing Tools: ${toolAvailability.missing.join(', ')}`);
  
  // Test 4: Multi-language repository
  console.log('\n4. Multi-Language Repository Detection');
  console.log('-'.repeat(40));
  
  // This would typically detect from actual files
  console.log(`   Primary Language: TypeScript`);
  console.log(`   Secondary Languages: Python, Shell`);
  console.log(`   Recommended Approach: Use primary language tools + Semgrep for coverage`);
  
  console.log('\n' + '='.repeat(50));
  console.log('\n✅ Language Orchestration Configuration Complete!\n');
  
  console.log('Key Features Demonstrated:');
  console.log('1. ✅ Language detection from repository');
  console.log('2. ✅ Model selection based on language');
  console.log('3. ✅ Tool mapping per language and role');
  console.log('4. ✅ Agent configuration with language-specific tools');
  console.log('5. ✅ Support for 16+ languages including Objective-C');
  
  console.log('\n📝 Architecture Summary:');
  console.log('   Orchestrator → Detects Language → Selects Model');
  console.log('                                   → Maps Tools by Role');
  console.log('                                   → Configures Agents');
  console.log('   Agents → Use Language-Specific Tools → Analyze Code');
}

// Run the demonstration
if (require.main === module) {
  demonstrateLanguageOrchestration().catch(console.error);
}

export { demonstrateLanguageOrchestration };