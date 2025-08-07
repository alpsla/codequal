// Direct test of the enhanced mock to verify branch differentiation
const { generateEnhancedMockAnalysis } = require('../../apps/api/dist/services/deepwiki-mock-enhanced.js');

console.log('Testing enhanced mock branch differentiation...\n');

// Test main branch
const mainAnalysis = generateEnhancedMockAnalysis('https://github.com/test/repo', { branch: 'main' });
console.log('Main branch analysis:');
console.log('- Total vulnerabilities:', mainAnalysis.vulnerabilities.length);
console.log('- Issue IDs:', mainAnalysis.vulnerabilities.map(v => v.id).join(', '));

// Test PR branch
const prAnalysis = generateEnhancedMockAnalysis('https://github.com/test/repo', { branch: 'pr/123' });
console.log('\nPR branch analysis:');
console.log('- Total vulnerabilities:', prAnalysis.vulnerabilities.length);
console.log('- Issue IDs:', prAnalysis.vulnerabilities.map(v => v.id).join(', '));

// Compare issues
const mainIds = new Set(mainAnalysis.vulnerabilities.map(v => v.id));
const prIds = new Set(prAnalysis.vulnerabilities.map(v => v.id));

console.log('\n=== COMPARISON ===');
console.log('Fixed issues (in main but not PR):', [...mainIds].filter(id => !prIds.has(id)));
console.log('New issues (in PR but not main):', [...prIds].filter(id => !mainIds.has(id)));
console.log('Unchanged issues:', [...mainIds].filter(id => prIds.has(id)));

// Verify expectations
const expectedFixed = ['SEC-001'];
const expectedNew = ['PR-NEW-001', 'PR-NEW-002'];

const actualFixed = [...mainIds].filter(id => !prIds.has(id));
const actualNew = [...prIds].filter(id => !mainIds.has(id));

console.log('\n=== VERIFICATION ===');
console.log('Expected fixed issues:', expectedFixed);
console.log('Actual fixed issues:', actualFixed);
console.log('✓ Fixed issues match:', JSON.stringify(expectedFixed) === JSON.stringify(actualFixed));

console.log('\nExpected new issues:', expectedNew);
console.log('Actual new issues:', actualNew);
console.log('✓ New issues match:', JSON.stringify(expectedNew) === JSON.stringify(actualNew));

if (actualFixed.includes('SEC-001') && actualNew.includes('PR-NEW-001') && actualNew.includes('PR-NEW-002')) {
  console.log('\n✅ SUCCESS: Mock correctly differentiates between branches!');
} else {
  console.log('\n❌ FAILURE: Mock not working as expected');
}