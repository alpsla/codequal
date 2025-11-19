/**
 * ESLint Test Fixture for V9 Dogfooding
 *
 * Contains intentional ESLint errors to validate CodeQual's detection:
 * - 8x no-useless-escape errors
 * - 4x @typescript-eslint/no-inferrable-types errors
 *
 * Total: 12 expected ESLint errors
 */

// ==========================================
// no-useless-escape errors (8)
// Unnecessary escape characters in strings/regexes
// ==========================================

// 1. Useless escape in string - dollar sign
const pattern1 = 'Price: \$100';

// 2. Useless escape in string - asterisk
const pattern2 = 'Rating: \*\*\*';

// 3. Useless escape in string - exclamation
const pattern3 = 'Alert\!';

// 4. Useless escape in string - at sign
const pattern4 = 'Email\@example.com';

// 5. Useless escape in string - hash
const pattern5 = 'Section\#1';

// 6. Useless escape in string - percent
const pattern6 = 'Discount: 50\%';

// 7. Useless escape in string - caret
const pattern7 = 'Point\^up';

// 8. Useless escape in string - ampersand
const pattern8 = 'A \& B';

// ==========================================
// @typescript-eslint/no-inferrable-types errors (4)
// Redundant type annotations
// ==========================================

// 1. Inferrable number type
const count: number = 42;

// 2. Inferrable string type
const name: string = 'test';

// 3. Inferrable boolean type
const active: boolean = true;

// 4. Inferrable number in function parameter
function processValue(value: number = 10): number {
  return value * 2;
}

// ==========================================
// Export to prevent unused variable warnings
// ==========================================
export const testFixture = {
  pattern1,
  pattern2,
  pattern3,
  pattern4,
  pattern5,
  pattern6,
  pattern7,
  pattern8,
  count,
  name,
  active,
  processValue,
};
