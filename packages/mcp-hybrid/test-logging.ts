import { logging } from '@codequal/core';

// Test if we can use logging
const testLogger = logging.createLogger('test');
testLogger.info('Test message');

// Also test the destructuring
const { createLogger } = logging;
const testLogger2 = createLogger('test2');
testLogger2.info('Test message 2');

export {};
