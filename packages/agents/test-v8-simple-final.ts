console.log('🚀 Testing V8 Report with Enhanced Mock Data\n');

// Simple test using the existing test file
import('./test-v8-bug-fixes-validation').then(module => {
  console.log('✅ Test completed successfully');
}).catch(error => {
  console.error('❌ Test failed:', error);
});

// Also run the real data test
import('./test-v8-with-real-deepwiki-data').then(module => {
  console.log('✅ Real data test completed');
}).catch(error => {
  console.error('❌ Real data test failed:', error);
});
