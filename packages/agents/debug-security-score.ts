// Debug script to trace Security Score calculation
import * as fs from 'fs';

// Read the E2E log to extract issue counts
console.log('\n=== Security Score Calculation Debug ===\n');

console.log('📊 From Report:');
console.log('   Command Injection: 2 critical (EXISTING_MODIFIED)');
console.log('   Unsafe Reflection: 13 high (NEW)');
console.log('   Security Score shown: 62/100\n');

console.log('🧮 Expected Calculation (using only NEW issues):');
console.log('   Start: 100');
console.log('   Deduct: 13 high × 5 = -65');
console.log('   Expected: 100 - 65 = 35/100\n');

console.log('❓ Actual: 62/100 (difference: +27 points)\n');

console.log('🔍 Possible Explanations:');
console.log('   1. Filter not matching all 13 issues');
console.log('   2. Some issues not tagged as "Security" in detectedCategory');
console.log('   3. Math error in penalty calculation');
console.log('   4. Using wrong issue array (not just NEW)\n');

console.log('📝 The Fix Applied:');
console.log('   - Changed calculateCategoryScore to use i.detectedCategory || getIssueCategory(i)');
console.log('   - This ensures we use the explicit detectedCategory from E2E test');
console.log('   - getIssueCategory() was matching by tool/message, which may miss some issues\n');

console.log('🎯 Next Step: Re-run E2E to verify fix');
console.log('   Expected Security Score after fix: 35/100 (if all 13 high are NEW)\n');
