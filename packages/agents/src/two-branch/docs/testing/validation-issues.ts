/**
 * Comprehensive Validation Issues File
 *
 * This file contains intentional violations for ALL TypeScript/JavaScript tools.
 * Use for V9 auto-fix testing by adding to any React/TypeScript project.
 *
 * Usage:
 * 1. Copy this file to: src/validation-issues.ts
 * 2. Create local branch: git checkout -b validation-test
 * 3. Commit: git add -A && git commit -m "Add validation issues"
 * 4. Run V9 analysis: npx ts-node tests/integration/test-v9-lite-e2e.ts
 *
 * Expected Results:
 * - ESLint: ~10 auto-fixable issues
 * - TypeScript: ~7 type issues
 * - Semgrep: ~6 security issues
 * - Total: ~23 issues with auto-fix suggestions
 */

// ==========================================
// ESLINT VIOLATIONS
// ==========================================

// 1. no-unused-vars - Unused variable
const unusedVariable = 123;
let anotherUnused = "test";

// 2. no-debugger - Debugger statement
debugger;

// 3. no-var - Use const/let instead
var oldStyleVariable = "should use const or let";

// 4. prefer-const - Variable never reassigned
let shouldBeConst = "never reassigned";
console.log(shouldBeConst);

// 5. no-console - Console statement (usually disabled in production)
console.log("Debug statement should be removed");

// 6. eqeqeq - Use === instead of ==
function looseEquality(x: any) {
  if (x == 5) {
    return true;
  }
  return false;
}

// 7. no-else-return - Unnecessary else after return
function unnecessaryElse(x: number) {
  if (x > 5) {
    return true;
  } else {
    return false;
  }
}

// 8. prefer-template - Use template literals
const name = "World";
const message = "Hello " + name + "!";

// 9. prefer-arrow-callback - Use arrow function
setTimeout(function () {
  console.log("Use arrow function");
}, 1000);

// 10. no-multiple-empty-lines - Extra blank lines


const afterEmptyLines = true;

// ==========================================
// TYPESCRIPT VIOLATIONS
// ==========================================

// 1. TS7006 - Implicit any parameter
function noTypeAnnotations(param) {
  return param;
}

// 2. @typescript-eslint/no-unused-vars - Unused parameter
function unusedParam(x: number, y: number): number {
  return x;
}

// 3. Avoid non-null assertion operator
function nonNullAssertion() {
  const maybeValue: string | null = null;
  const value = maybeValue!; // Avoid this
  return value;
}

// 4. Prefer 'as' syntax over angle bracket
function oldStyleAssertion() {
  const count = <number>getCount();
  return count;
}

function getCount(): unknown {
  return 42;
}

// 5. Missing return type annotation
function missingReturnType(x: number) {
  return x * 2;
}

// 6. Any type usage - should be avoided
function anyTypeUsage(): any {
  return 123;
}

// 7. Unsafe member access
function unsafeAccess(obj: any) {
  return obj.property.nested.value;
}

// ==========================================
// SEMGREP SECURITY VIOLATIONS
// ==========================================

// 1. SQL Injection vulnerability
function getUserData(userId: string) {
  const query = "SELECT * FROM users WHERE id = " + userId;
  // This would execute: db.query(query);
  return query;
}

// 2. Command Injection vulnerability
import { exec } from 'child_process';
function executeCommand(userInput: string) {
  exec("ls " + userInput, (error, stdout) => {
    console.log(stdout);
  });
}

// 3. Hardcoded secrets/credentials
const API_KEY = "sk-1234567890abcdef";
const DB_PASSWORD = "admin123";
const SECRET_TOKEN = "secret_abc123";

// 4. Insecure random number generation
function generateToken() {
  const token = Math.random().toString(36);
  return token;
}

// 5. Use of eval (code injection)
function processUserCode(code: string) {
  eval(code);
}

// 6. XSS vulnerability - innerHTML with user input
function renderUserContent(userInput: string) {
  // @ts-ignore
  document.body.innerHTML = userInput;
}

// 7. Insecure HTTP request
function fetchData() {
  fetch('http://api.example.com/data'); // Should use HTTPS
}

// ==========================================
// ADDITIONAL QUALITY ISSUES
// ==========================================

// Magic numbers without explanation
function calculatePrice(quantity: number) {
  return quantity * 19.99; // Magic number
}

// Deep nesting (complexity)
function deepNesting(a: boolean, b: boolean, c: boolean, d: boolean) {
  if (a) {
    if (b) {
      if (c) {
        if (d) {
          return "too deep";
        }
      }
    }
  }
  return "ok";
}

// Large function (code smell)
function tooManyResponsibilities(data: any) {
  // Data validation
  if (!data) return;
  if (!data.id) return;
  if (!data.name) return;

  // Data transformation
  const normalized = data.name.toLowerCase();
  const trimmed = normalized.trim();

  // Business logic
  if (trimmed.length < 3) return;
  if (trimmed.length > 50) return;

  // Database operation (mock)
  const saved = database.save(data);

  // Notification (mock)
  const notified = notifications.send(data);

  // Logging
  console.log("Processed:", data.id);

  return { saved, notified };
}

// Mock objects for compilation
const database = { save: (d: any) => d };
const notifications = { send: (d: any) => true };

// ==========================================
// PERFORMANCE VIOLATIONS
// ==========================================

// 1. RegExp in loop (performance)
function performanceIssue(items: string[]) {
  for (const item of items) {
    const regex = new RegExp("test", "g"); // Should be outside loop
    console.log(item.match(regex));
  }
}

// ==========================================
// EXPORT (to avoid "no exports" error)
// ==========================================

export const validationIssuesFile = "This file contains intentional violations for testing";
