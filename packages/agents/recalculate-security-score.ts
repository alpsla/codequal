console.log('\n=== Corrected Security Score Calculation ===\n');

console.log('📊 Security Issues Found:');
console.log('   - Command Injection: 2 critical (EXISTING_MODIFIED)');
console.log('   - Unsafe Reflection: 13 high (NEW)\n');

console.log('🧮 Correct Calculation:');
console.log('   Category Score only uses NEW issues:');
console.log('   Start: 100');
console.log('   NEW Critical: 0 (Command Injection is EXISTING_MODIFIED, not NEW)');
console.log('   NEW High: 13 × 5 = -65');
console.log('   Expected Score: 100 - 65 = 35/100\n');

console.log('💡 BUT if we count ALL security issues (NEW + EXISTING_MODIFIED):');
console.log('   Start: 100');
console.log('   Critical: 2 × 10 = -20');
console.log('   High: 13 × 5 = -65');
console.log('   Total: 100 - 20 - 65 = 15/100\n');

console.log('📊 Current Report Shows: 62/100');
console.log('   Gap from 35: +27 points (if only NEW)');
console.log('   Gap from 15: +47 points (if ALL)\n');

console.log('🔍 This suggests:');
console.log('   1. Only ~7 high issues being counted (100 - 7×5 = 65, not 62)');
console.log('   2. Or some other filtering issue');
console.log('   3. The fix to use detectedCategory should resolve this\n');

console.log('🎯 After Fix - Expected Scores:');
console.log('   If calculateCategoryScore uses only NEW: 35/100');
console.log('   If it incorrectly uses ALL issues: 15/100');
console.log('   Current wrong value: 62/100\n');

console.log('✅ The fix we applied (use detectedCategory) should correct this.');
