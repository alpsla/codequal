#!/usr/bin/env ts-node
/**
 * Test: Check if branch name "5.0.x" could be parsed as PR number 0
 */

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║  Branch Name Parsing Test                                     ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

const branchName = '5.0.x';

console.log(`Testing branch name: "${branchName}"\n`);

// Test 1: parseInt
const test1 = parseInt(branchName);
console.log(`1. parseInt("${branchName}"):`, test1, `(type: ${typeof test1})`);

// Test 2: parseInt with radix
const test2 = parseInt(branchName, 10);
console.log(`2. parseInt("${branchName}", 10):`, test2, `(type: ${typeof test2})`);

// Test 3: Number()
const test3 = Number(branchName);
console.log(`3. Number("${branchName}"):`, test3, `(type: ${typeof test3})`);

// Test 4: Regex extraction of digits
const digits = branchName.match(/\d+/g);
console.log(`4. Regex \\d+ extraction:`, digits);

// Test 5: Split and parse
const parts = branchName.split('.');
console.log(`5. Split by '.':`, parts);
console.log(`   First part: ${parts[0]} → parseInt: ${parseInt(parts[0])}`);
console.log(`   Second part: ${parts[1]} → parseInt: ${parseInt(parts[1])}`);

// Test 6: Could "5.0" be parsed?
const floatTest = parseFloat(branchName);
console.log(`6. parseFloat("${branchName}"):`, floatTest, `(type: ${typeof floatTest})`);

console.log('\n' + '═'.repeat(70));
console.log('ANALYSIS:');
console.log('═'.repeat(70));

if (test1 === 5) {
  console.log('✅ parseInt extracts first digit: 5 (NOT 0)');
}

if (test2 === 5) {
  console.log('✅ parseInt with radix extracts first digit: 5 (NOT 0)');
}

if (isNaN(test3)) {
  console.log('✅ Number() returns NaN (NOT 0)');
}

if (parts[1] === '0') {
  console.log('⚠️  WARNING: Second part after split is "0"');
  console.log('   If code uses parts[1], it could result in PR #0!');
  console.log('   Code pattern to search for:');
  console.log('   - branchName.split(".")[1]');
  console.log('   - parseInt(branch.split(".")[1])');
}

console.log('\n' + '═'.repeat(70));
console.log('CONCLUSION:');
console.log('═'.repeat(70));
console.log('');
console.log('Branch "5.0.x" cannot naturally be parsed as 0 by standard methods.');
console.log('However, if code splits by "." and takes index [1], it gets "0".');
console.log('');
console.log('Need to search for:');
console.log('  1. branch.split(".")[1]');
console.log('  2. parseInt(branch.split(".")...)');
console.log('  3. Any code extracting numbers from branch names');
console.log('');
