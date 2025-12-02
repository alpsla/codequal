/* eslint-disable no-debugger, @typescript-eslint/no-unused-vars, no-console, @typescript-eslint/no-explicit-any */
/**
 * Test file to validate ESLint detection
 * This file contains intentional ESLint violations for testing purposes
 * DO NOT FIX THESE - they are intentional test cases
 */

// ESLint violation: no-unused-vars
const unusedVariable = 'This variable is never used';
const anotherUnused = 123;

// ESLint violation: no-console
console.log('Debug statement that should be flagged');

// ESLint violation: no-var
const oldStyleVar = 'Should use const or let';

// ESLint violation: prefer-const
const shouldBeConst = 'Never reassigned';
console.log(shouldBeConst);

// ESLint violation: eqeqeq (use === instead of ==)
function looseEquality(x: any) {
    if (x == 5) {
        return true;
    }
    return false;
}

// ESLint violation: no-debugger
function debugFunction() {
    debugger;
    return 'test';
}

// ESLint violation: prefer-template
const name = 'World';
const greeting = 'Hello ' + name + '!';

// ESLint violation: prefer-arrow-callback
setTimeout(function () {
    console.log('Should use arrow function');
}, 1000);

// Export to avoid "no exports" error
export const testFile = 'ESLint validation test';
