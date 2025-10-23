console.log('\n=== Corrected Security Score Calculation ===\n');

console.log('📊 Security Issues:');
console.log('   NEW: 13 high (Unsafe Reflection)');
console.log('   EXISTING_MODIFIED: 2 critical (Command Injection)\n');

console.log('🧮 Category Score Calculation (Developer Skill):');
console.log('   Should include both NEW + EXISTING_MODIFIED');
console.log('   (These are issues in files the developer touched)\n');

console.log('   Start: 100');
console.log('   Critical (EXISTING_MODIFIED): 2 × 10 = -20');
console.log('   High (NEW): 13 × 5 = -65');
console.log('   Total: 100 - 20 - 65 = 15/100\n');

console.log('✅ Expected Security Score after fix: 15/100');
console.log('   (Currently showing 62/100 - will be corrected)\n');

console.log('📋 Logic:');
console.log('   Category Scores = How well developer handles each category');
console.log('   NEW issues = Developer introduced them');
console.log('   EXISTING_MODIFIED = Developer touched files with issues');
console.log('   Both should affect the category score!\n');
