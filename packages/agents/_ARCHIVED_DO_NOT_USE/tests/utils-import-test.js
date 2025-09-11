// Simple test to just verify utils import
console.log('Testing utils import from @codequal/core...');

try {
  // Directly test the problematic import
  const { createLogger } = require('@codequal/core/utils');
  
  // Create a test logger
  const logger = createLogger('TestLogger');
  
  // Use the logger to verify it works
  logger.info('Logger created successfully');
  
  console.log('✅ Utils import test passed!');
} catch (error) {
  console.error('❌ Utils import test failed:', error);
  console.error(error.stack);
  process.exit(1);
}
