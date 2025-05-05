// Test for top-level package imports
console.log('Testing top-level imports...');

try {
  // Test core top-level import
  console.log('Importing from @codequal/core...');
  const core = require('@codequal/core');
  console.log('✅ Core top-level import succeeded');
  console.log('Core exports:', Object.keys(core));
  
  // Verify that AgentProvider and AnalysisResult are exported
  if (core.AgentProvider && core.AgentRole && core.AnalysisResult) {
    console.log('✅ Core types are properly exported');
  } else {
    console.error('❌ Core types are not properly exported');
    console.error('Missing types:', {
      AgentProvider: !!core.AgentProvider,
      AgentRole: !!core.AgentRole,
      AnalysisResult: !!core.AnalysisResult
    });
    process.exit(1);
  }
  
  // Test utils import from core
  if (core.createLogger) {
    console.log('✅ Core utilities are properly exported');
  } else {
    console.error('❌ Core utilities are not properly exported');
    process.exit(1);
  }
  
  console.log('\n✅ All top-level imports verified successfully!');
} catch (error) {
  console.error('❌ Top-level import test failed:', error);
  console.error(error.stack);
  process.exit(1);
}
