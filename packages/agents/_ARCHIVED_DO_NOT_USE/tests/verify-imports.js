// Simple script to verify imports work correctly
console.log('Verifying imports...');

try {
  // Test core imports
  console.log('Importing from @codequal/core...');
  const core = require('@codequal/core');
  console.log('✅ Core module imported successfully');
  console.log('Core exports:', Object.keys(core));
  
  // Test utils imports
  console.log('\nImporting from @codequal/core/utils...');
  const utils = require('@codequal/core/utils');
  console.log('✅ Utils module imported successfully');
  console.log('Utils exports:', Object.keys(utils));
  
  // Test types imports
  console.log('\nImporting from @codequal/core/types/agent...');
  const types = require('@codequal/core/types/agent');
  console.log('✅ Types module imported successfully');
  console.log('Types exports:', Object.keys(types));
  
  // Test agent imports
  console.log('\nImporting agents...');
  const { ClaudeAgent } = require('../dist/claude/claude-agent');
  const { ChatGPTAgent } = require('../dist/chatgpt/chatgpt-agent');
  console.log('✅ Agent classes imported successfully');
  
  console.log('\n✅ All imports verified successfully!');
} catch (error) {
  console.error('❌ Import verification failed:', error);
  console.error(error.stack);
  process.exit(1);
}
