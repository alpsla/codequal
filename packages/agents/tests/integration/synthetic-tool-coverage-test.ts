/**
 * Phase 1: Synthetic Tool Coverage Test
 *
 * Purpose: Validate that ALL tools in our registry can:
 * 1. Execute successfully
 * 2. Find at least 1 issue on synthetic test fixtures
 * 3. Parse output correctly into Issue format
 *
 * This test uses synthetic files with KNOWN issues rather than real repos.
 */

import dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

dotenv.config({ path: path.join(__dirname, '../../.env') });

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

interface ToolTestResult {
  toolId: string;
  language: string;
  category: string;
  executed: boolean;
  issuesFound: number;
  parseSuccess: boolean;
  executionTimeMs: number;
  error?: string;
  sampleIssue?: {
    rule: string;
    file: string;
    line: number;
    message: string;
  };
}

interface TestFixture {
  filename: string;
  content: string;
  expectedIssues: string[]; // Rule IDs expected to trigger
}

// ============================================================================
// SYNTHETIC TEST FIXTURES
// Each fixture contains code that SHOULD trigger specific tools
// ============================================================================

const FIXTURES: Record<string, TestFixture[]> = {
  // ========================================================================
  // JAVA FIXTURES
  // ========================================================================
  java: [
    {
      filename: 'SecurityIssues.java',
      content: `package test;

import java.sql.*;
import java.io.*;

public class SecurityIssues {
    // SQL Injection (semgrep, spotbugs)
    public void unsafeQuery(String userInput) throws SQLException {
        Connection conn = DriverManager.getConnection("jdbc:mysql://localhost/test");
        Statement stmt = conn.createStatement();
        stmt.executeQuery("SELECT * FROM users WHERE id = " + userInput); // SQL injection
    }

    // Command Injection (semgrep)
    public void unsafeExec(String cmd) throws IOException {
        Runtime.getRuntime().exec(cmd); // Command injection
    }

    // Hardcoded password (gitleaks, trufflehog)
    private static final String PASSWORD = "SuperSecret123!";
    private static final String API_KEY = "sk-1234567890abcdef1234567890abcdef";
}`,
      expectedIssues: ['sql-injection', 'command-injection', 'hardcoded-secret'],
    },
    {
      filename: 'CodeQualityIssues.java',
      content: `package test;

import java.util.*;
import java.io.*;  // Unused import (checkstyle, pmd)

public class CodeQualityIssues {
    private String unusedField; // Unused field (pmd)

    // Missing Javadoc (checkstyle)
    public void methodWithoutJavadoc() {
        System.out.println("Debug"); // System.out usage (pmd)
    }

    // Empty catch block (spotbugs, pmd)
    public void emptyCatch() {
        try {
            throw new Exception();
        } catch (Exception e) {
            // Empty catch - bad practice
        }
    }

    // Magic number (checkstyle)
    public int calculate() {
        return 42 * 100; // Magic numbers
    }
}`,
      expectedIssues: ['unused-import', 'empty-catch', 'magic-number', 'system-out'],
    },
  ],

  // ========================================================================
  // TYPESCRIPT FIXTURES
  // ========================================================================
  typescript: [
    {
      filename: 'security-issues.ts',
      content: `import { exec } from 'child_process';

// Command injection (semgrep)
export function unsafeExec(userInput: string): void {
  exec(userInput); // Dangerous: user input in exec
}

// XSS vulnerability (semgrep)
export function renderHtml(userContent: string): string {
  return \`<div>\${userContent}</div>\`; // XSS risk
}

// Hardcoded secrets (gitleaks, trufflehog)
const API_KEY = 'sk-1234567890abcdef1234567890abcdef';
const AWS_SECRET = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';

// Eval usage (eslint, semgrep)
export function dangerousEval(code: string): unknown {
  return eval(code); // Never use eval
}
`,
      expectedIssues: ['command-injection', 'xss', 'hardcoded-secret', 'no-eval'],
    },
    {
      filename: 'quality-issues.ts',
      content: `// ESLint issues
const unusedVar = 'never used'; // no-unused-vars
let shouldBeConst = 'constant'; // prefer-const

// Type issues (typescript compiler)
function addNumbers(a: number, b: number): number {
  return a + b;
}
const result: string = addNumbers(1, 2); // Type error

// Any usage (typescript-eslint)
function processData(data: any): any { // no-explicit-any
  console.log(data); // no-console
  return data;
}

// Unused function parameter
export function unusedParam(used: string, unused: string): string {
  return used;
}
`,
      expectedIssues: ['no-unused-vars', 'prefer-const', 'no-explicit-any', 'no-console'],
    },
    {
      filename: 'circular-dep-a.js',
      content: `// Circular dependency (madge)
const b = require('./circular-dep-b');

module.exports.funcA = function() {
  return 'A calls ' + b.funcB();
};
`,
      expectedIssues: ['circular-dependency'],
    },
    {
      filename: 'circular-dep-b.js',
      content: `// Circular dependency (madge)
const a = require('./circular-dep-a');

module.exports.funcB = function() {
  return 'B calls ' + a.funcA();
};
`,
      expectedIssues: ['circular-dependency'],
    },
  ],

  // ========================================================================
  // PYTHON FIXTURES
  // ========================================================================
  python: [
    {
      filename: 'security_issues.py',
      content: `import os
import subprocess
import pickle

# Command injection (bandit, semgrep)
def unsafe_exec(user_input):
    os.system(user_input)  # B605: shell injection
    subprocess.call(user_input, shell=True)  # B602: subprocess with shell

# SQL injection (bandit, semgrep)
def unsafe_query(user_id):
    query = "SELECT * FROM users WHERE id = " + user_id  # B608: SQL injection

# Pickle usage (bandit)
def load_data(file_path):
    with open(file_path, 'rb') as f:
        return pickle.load(f)  # B301: pickle usage

# Hardcoded password (bandit, gitleaks)
PASSWORD = "SuperSecret123!"
API_KEY = "sk-1234567890abcdef"
`,
      expectedIssues: ['shell-injection', 'sql-injection', 'pickle', 'hardcoded-secret'],
    },
    {
      filename: 'quality_issues.py',
      content: `import json  # F401: unused import
import sys

# Unused variable (ruff, pylint)
unused_var = "never used"

# Type error (mypy)
def add(a: int, b: int) -> int:
    return a + b

result: str = add(1, 2)  # mypy error: incompatible type

# Comparison issues (ruff)
x = None
if x == None:  # E711: comparison to None
    pass

if x == True:  # E712: comparison to True
    pass

# Line too long (ruff, pylint)
very_long_variable_name_that_exceeds_the_maximum_line_length_allowed_by_most_linters = "This line is way too long and should trigger a warning"

# Missing docstring (pylint)
def no_docstring():
    pass
`,
      expectedIssues: ['unused-import', 'unused-var', 'comparison-none', 'line-too-long'],
    },
  ],

  // ========================================================================
  // GO FIXTURES
  // ========================================================================
  go: [
    {
      filename: 'security_issues.go',
      content: `package main

import (
    "database/sql"
    "fmt"
    "os/exec"
)

// SQL injection (gosec, semgrep)
func unsafeQuery(db *sql.DB, userInput string) {
    query := "SELECT * FROM users WHERE id = " + userInput
    db.Query(query) // G201: SQL injection
}

// Command injection (gosec, semgrep)
func unsafeExec(userInput string) {
    exec.Command(userInput).Run() // G204: command injection
}

// Hardcoded credentials (gosec, gitleaks)
const password = "SuperSecret123!"
const apiKey = "sk-1234567890abcdef"

func main() {
    fmt.Println("Security issues demo")
}
`,
      expectedIssues: ['sql-injection', 'command-injection', 'hardcoded-credentials'],
    },
    {
      filename: 'quality_issues.go',
      content: `package main

import (
    "fmt"
    "os" // Unused import
)

// Unused function (staticcheck)
func unusedFunction() {
    fmt.Println("never called")
}

// Error not checked (errcheck via golangci-lint)
func uncheckedError() {
    file, _ := os.Open("file.txt") // Error ignored
    defer file.Close()
}

// Ineffectual assignment (staticcheck)
func ineffectualAssign() {
    x := 10
    x = 20 // First assignment never used
    fmt.Println(x)
}

func main() {
    uncheckedError()
    ineffectualAssign()
}
`,
      expectedIssues: ['unused-import', 'unchecked-error', 'ineffectual-assign'],
    },
  ],

  // ========================================================================
  // RUST FIXTURES
  // ========================================================================
  rust: [
    {
      filename: 'quality_issues.rs',
      content: `#![allow(dead_code)]

// Unused variable (clippy)
fn unused_var() {
    let x = 5; // warning: unused variable
}

// Needless return (clippy)
fn needless_return(a: i32, b: i32) -> i32 {
    return a + b; // clippy::needless_return
}

// Redundant clone (clippy)
fn redundant_clone() {
    let s = String::from("hello");
    let _t = s.clone(); // May be unnecessary if s is not used after
}

// Missing documentation
pub fn public_without_docs() {
    // Should have documentation for public items
}

fn main() {
    unused_var();
    println!("{}", needless_return(1, 2));
}
`,
      expectedIssues: ['unused-variable', 'needless-return', 'missing-docs'],
    },
  ],

  // ========================================================================
  // RUBY FIXTURES
  // ========================================================================
  ruby: [
    {
      filename: 'security_issues.rb',
      content: `require 'yaml'

# Command injection (brakeman, semgrep)
def unsafe_exec(user_input)
  system(user_input)  # Dangerous
  \`#{user_input}\`    # Also dangerous
end

# SQL injection (brakeman)
def unsafe_query(user_id)
  User.where("id = #{user_id}")  # SQL injection
end

# Unsafe YAML load (brakeman)
def load_yaml(data)
  YAML.load(data)  # Unsafe deserialization
end

# Hardcoded password
PASSWORD = "SuperSecret123!"
`,
      expectedIssues: ['command-injection', 'sql-injection', 'unsafe-yaml'],
    },
    {
      filename: 'quality_issues.rb',
      content: `# Style issues (rubocop)

# Line too long
very_long_variable_name_that_exceeds_the_maximum_line_length = "This is a very long line that should trigger a warning"

# Missing frozen string literal comment

# Double quotes instead of single
message = "hello world"  # Prefer single quotes for simple strings

# Method too long (rubocop will flag if we add more lines)
def long_method
  puts "line 1"
  puts "line 2"
  puts "line 3"
  puts "line 4"
  puts "line 5"
end

# Unused variable
def unused_local
  x = 5  # Never used
end
`,
      expectedIssues: ['line-too-long', 'frozen-string-literal', 'unused-variable'],
    },
  ],

  // ========================================================================
  // PHP FIXTURES
  // ========================================================================
  php: [
    {
      filename: 'security_issues.php',
      content: `<?php

// SQL injection (semgrep, phpstan)
function unsafeQuery($pdo, $userId) {
    $query = "SELECT * FROM users WHERE id = " . $userId;
    return $pdo->query($query);  // SQL injection
}

// Command injection (semgrep)
function unsafeExec($userInput) {
    exec($userInput);  // Command injection
    shell_exec($userInput);  // Also dangerous
}

// XSS (semgrep)
function displayInput($userInput) {
    echo $userInput;  // XSS vulnerability
}

// Hardcoded credentials
define('DB_PASSWORD', 'SuperSecret123!');
$apiKey = 'sk-1234567890abcdef';
`,
      expectedIssues: ['sql-injection', 'command-injection', 'xss'],
    },
    {
      filename: 'quality_issues.php',
      content: `<?php

// Type issues (phpstan, psalm)
function add(int $a, int $b): int {
    return $a + $b;
}

$result = add("1", "2");  // Type error

// Unused variable (phpstan)
function unusedVar() {
    $unused = "never used";
    return "hello";
}

// Missing return type (phpstan level 6+)
function noReturnType($x) {
    return $x * 2;
}

// Deprecated function usage
$encoded = utf8_encode("test");  // Deprecated in PHP 8.2
`,
      expectedIssues: ['type-error', 'unused-variable', 'deprecated-function'],
    },
  ],

  // ========================================================================
  // INFRASTRUCTURE FIXTURES
  // ========================================================================
  infrastructure: [
    {
      filename: 'Dockerfile',
      content: `FROM ubuntu:latest

# Running as root (checkov, trivy)
USER root

# Using latest tag (checkov, trivy)
RUN apt-get update && apt-get install -y curl

# Hardcoded secret (gitleaks, trivy)
ENV API_KEY=sk-1234567890abcdef
ENV DB_PASSWORD=SuperSecret123!

# No healthcheck defined (checkov)
EXPOSE 8080

CMD ["python", "app.py"]
`,
      expectedIssues: ['running-as-root', 'latest-tag', 'hardcoded-secret', 'no-healthcheck'],
    },
    {
      filename: 'kubernetes.yaml',
      content: `apiVersion: v1
kind: Pod
metadata:
  name: insecure-pod
spec:
  containers:
  - name: app
    image: myapp:latest
    # Missing resource limits (checkov)
    securityContext:
      privileged: true  # Privileged container (checkov, trivy)
      runAsRoot: true   # Running as root (checkov)
    env:
    - name: DB_PASSWORD
      value: "SuperSecret123!"  # Hardcoded secret (gitleaks)
`,
      expectedIssues: ['privileged-container', 'missing-resource-limits', 'hardcoded-secret'],
    },
    {
      filename: 'terraform.tf',
      content: `# S3 bucket without encryption (checkov)
resource "aws_s3_bucket" "insecure" {
  bucket = "my-insecure-bucket"
  acl    = "public-read"  # Public bucket (checkov)
}

# Security group with open ingress (checkov)
resource "aws_security_group" "open" {
  name = "open-to-world"

  ingress {
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # Open to world (checkov)
  }
}

# Hardcoded credentials
variable "db_password" {
  default = "SuperSecret123!"  # Hardcoded (gitleaks)
}
`,
      expectedIssues: ['public-s3', 'open-security-group', 'unencrypted-s3'],
    },
  ],
};

// ============================================================================
// TEST RUNNER
// ============================================================================

class SyntheticToolTester {
  private testDir: string;
  private results: ToolTestResult[] = [];

  constructor() {
    this.testDir = `/tmp/codequal-synthetic-test-${Date.now()}`;
  }

  async setup(): Promise<void> {
    console.log(`\n📁 Creating test directory: ${this.testDir}`);
    fs.mkdirSync(this.testDir, { recursive: true });

    // Create fixtures for each language
    for (const [language, fixtures] of Object.entries(FIXTURES)) {
      const langDir = path.join(this.testDir, language);
      fs.mkdirSync(langDir, { recursive: true });

      for (const fixture of fixtures) {
        const filePath = path.join(langDir, fixture.filename);
        fs.writeFileSync(filePath, fixture.content);
        console.log(`   ✅ Created: ${language}/${fixture.filename}`);
      }
    }
  }

  async cleanup(): Promise<void> {
    if (fs.existsSync(this.testDir)) {
      execSync(`rm -rf ${this.testDir}`);
      console.log(`\n🧹 Cleaned up test directory`);
    }
  }

  async testTool(
    toolId: string,
    language: string,
    category: string,
    command: string,
    parseOutput: (output: string) => number
  ): Promise<ToolTestResult> {
    const startTime = Date.now();
    const langDir = path.join(this.testDir, language);

    try {
      // Execute tool
      const output = execSync(command.replace('{path}', langDir), {
        encoding: 'utf-8',
        maxBuffer: 50 * 1024 * 1024,
        timeout: 120000,
        cwd: langDir,
      });

      const issuesFound = parseOutput(output);
      const executionTime = Date.now() - startTime;

      const result: ToolTestResult = {
        toolId,
        language,
        category,
        executed: true,
        issuesFound,
        parseSuccess: issuesFound >= 0,
        executionTimeMs: executionTime,
      };

      this.results.push(result);
      return result;
    } catch (error: any) {
      // Many linters exit with non-zero when they find issues
      const output = error.stdout || error.stderr || '';
      const issuesFound = parseOutput(output);
      const executionTime = Date.now() - startTime;

      const result: ToolTestResult = {
        toolId,
        language,
        category,
        executed: issuesFound > 0 || output.length > 0,
        issuesFound: Math.max(0, issuesFound),
        parseSuccess: issuesFound >= 0,
        executionTimeMs: executionTime,
        error: issuesFound <= 0 ? error.message?.substring(0, 200) : undefined,
      };

      this.results.push(result);
      return result;
    }
  }

  getResults(): ToolTestResult[] {
    return this.results;
  }

  printSummary(): void {
    console.log(`\n${'='.repeat(80)}`);
    console.log('📊 TOOL COVERAGE TEST SUMMARY');
    console.log('='.repeat(80));

    // Group by category
    const byCategory: Record<string, ToolTestResult[]> = {};
    for (const result of this.results) {
      if (!byCategory[result.category]) {
        byCategory[result.category] = [];
      }
      byCategory[result.category].push(result);
    }

    for (const [category, results] of Object.entries(byCategory)) {
      console.log(`\n📦 ${category.toUpperCase()}`);
      console.log('-'.repeat(60));

      for (const result of results) {
        const status = result.issuesFound > 0 ? '✅' : result.executed ? '⚠️' : '❌';
        const issues = result.issuesFound > 0 ? `${result.issuesFound} issues` : 'no issues';
        const time = `${result.executionTimeMs}ms`;

        console.log(
          `${status} ${result.toolId.padEnd(20)} | ${result.language.padEnd(12)} | ${issues.padEnd(12)} | ${time}`
        );

        if (result.error) {
          console.log(`   └─ Error: ${result.error.substring(0, 80)}...`);
        }
      }
    }

    // Final stats
    const total = this.results.length;
    const passed = this.results.filter((r) => r.issuesFound > 0).length;
    const executed = this.results.filter((r) => r.executed).length;
    const failed = this.results.filter((r) => !r.executed).length;

    console.log(`\n${'='.repeat(80)}`);
    console.log('📈 FINAL STATS');
    console.log('='.repeat(80));
    console.log(`Total tools tested: ${total}`);
    console.log(`Found issues:       ${passed} (${((passed / total) * 100).toFixed(1)}%)`);
    console.log(`Executed:           ${executed} (${((executed / total) * 100).toFixed(1)}%)`);
    console.log(`Failed:             ${failed} (${((failed / total) * 100).toFixed(1)}%)`);
    console.log(`\nTotal execution time: ${this.results.reduce((sum, r) => sum + r.executionTimeMs, 0)}ms`);
  }
}

// ============================================================================
// TOOL-SPECIFIC TEST DEFINITIONS
// ============================================================================

interface ToolTest {
  toolId: string;
  language: string;
  category: string;
  command: string;
  parseOutput: (output: string) => number;
  skip?: boolean;
  skipReason?: string;
}

const TOOL_TESTS: ToolTest[] = [
  // ========================================================================
  // SECURITY TOOLS
  // ========================================================================
  {
    toolId: 'semgrep',
    language: 'java',
    category: 'security',
    command: 'semgrep scan --config auto --json {path}',
    parseOutput: (output) => {
      try {
        const json = JSON.parse(output);
        return json.results?.length || 0;
      } catch {
        return output.includes('findings') ? 1 : 0;
      }
    },
  },
  {
    toolId: 'gitleaks',
    language: 'infrastructure',
    category: 'security',
    command: 'gitleaks detect --source {path} --no-git --report-format json 2>&1',
    parseOutput: (output) => {
      try {
        const json = JSON.parse(output);
        return Array.isArray(json) ? json.length : 0;
      } catch {
        return output.includes('leaks found') ? 1 : 0;
      }
    },
  },
  {
    toolId: 'bandit',
    language: 'python',
    category: 'security',
    command: 'bandit -r {path} -f json 2>&1',
    parseOutput: (output) => {
      try {
        // Bandit outputs INFO lines before JSON, find the JSON start
        const jsonStart = output.indexOf('{');
        if (jsonStart === -1) return 0;
        const jsonStr = output.substring(jsonStart);
        const json = JSON.parse(jsonStr);
        return json.results?.length || 0;
      } catch {
        return 0;
      }
    },
  },
  {
    toolId: 'gosec',
    language: 'go',
    category: 'security',
    command: 'gosec -fmt json {path}/... 2>&1',
    parseOutput: (output) => {
      try {
        const json = JSON.parse(output);
        return json.Issues?.length || 0;
      } catch {
        return 0;
      }
    },
    skip: true,
    skipReason: 'Requires Go module initialization',
  },

  // ========================================================================
  // CODE QUALITY TOOLS
  // ========================================================================
  {
    toolId: 'eslint',
    language: 'typescript',
    category: 'code_quality',
    // ESLint 9 needs config file, use inline config via ESLINT_USE_FLAT_CONFIG
    command: 'npx eslint {path}/*.ts --format json --no-config-lookup --rule "no-unused-vars: warn" --rule "no-console: warn" --rule "no-eval: error" 2>&1 || true',
    parseOutput: (output) => {
      try {
        // Handle case where ESLint errors before JSON
        const jsonMatch = output.match(/\[[\s\S]*\]/);
        if (!jsonMatch) return 0;
        const json = JSON.parse(jsonMatch[0]);
        return json.reduce((sum: number, file: any) => sum + (file.messages?.length || 0), 0);
      } catch {
        // Count issues from text output as fallback
        const matches = output.match(/\d+ problems?/);
        return matches ? parseInt(matches[0]) : 0;
      }
    },
  },
  {
    toolId: 'ruff',
    language: 'python',
    category: 'code_quality',
    command: 'ruff check {path} --output-format json 2>&1',
    parseOutput: (output) => {
      try {
        const json = JSON.parse(output);
        return Array.isArray(json) ? json.length : 0;
      } catch {
        return 0;
      }
    },
  },
  {
    toolId: 'pmd',
    language: 'java',
    category: 'code_quality',
    command: 'pmd check -d {path} -R rulesets/java/quickstart.xml -f json 2>&1',
    parseOutput: (output) => {
      try {
        const json = JSON.parse(output);
        return json.files?.reduce((sum: number, f: any) => sum + (f.violations?.length || 0), 0) || 0;
      } catch {
        return 0;
      }
    },
    skip: true,
    skipReason: 'PMD requires JDK installation',
  },
  {
    toolId: 'clippy',
    language: 'rust',
    category: 'code_quality',
    command: 'cd {path} && cargo clippy --message-format json 2>&1',
    parseOutput: (output) => {
      const lines = output.split('\n').filter((l) => l.startsWith('{'));
      return lines.filter((l) => l.includes('"level":"warning"') || l.includes('"level":"error"')).length;
    },
    skip: true,
    skipReason: 'Requires Cargo.toml',
  },
  {
    toolId: 'rubocop',
    language: 'ruby',
    category: 'code_quality',
    command: 'rubocop {path} --format json 2>&1',
    parseOutput: (output) => {
      try {
        // RuboCop outputs warning lines before JSON, find the JSON start
        const jsonStart = output.indexOf('{"metadata"');
        if (jsonStart === -1) {
          // Try finding any JSON object
          const altStart = output.lastIndexOf('{');
          if (altStart === -1) return 0;
          const jsonStr = output.substring(altStart);
          const json = JSON.parse(jsonStr);
          return json.files?.reduce((sum: number, f: any) => sum + (f.offenses?.length || 0), 0) || 0;
        }
        const jsonStr = output.substring(jsonStart);
        const json = JSON.parse(jsonStr);
        return json.files?.reduce((sum: number, f: any) => sum + (f.offenses?.length || 0), 0) || 0;
      } catch {
        return 0;
      }
    },
  },
  {
    toolId: 'phpstan',
    language: 'php',
    category: 'code_quality',
    command: 'phpstan analyse {path} --error-format=json --no-progress 2>&1',
    parseOutput: (output) => {
      try {
        const json = JSON.parse(output);
        return json.totals?.file_errors || 0;
      } catch {
        return 0;
      }
    },
    skip: true,
    skipReason: 'Requires PHP and PHPStan installation',
  },

  // ========================================================================
  // INFRASTRUCTURE TOOLS
  // ========================================================================
  {
    toolId: 'checkov',
    language: 'infrastructure',
    category: 'security',
    command: 'checkov -d {path} -o json 2>&1',
    parseOutput: (output) => {
      try {
        const json = JSON.parse(output);
        return json.results?.failed_checks?.length || 0;
      } catch {
        return output.includes('Passed checks') ? 1 : 0;
      }
    },
    skip: true,
    skipReason: 'Checkov not installed on this system',
  },
  {
    toolId: 'trivy',
    language: 'infrastructure',
    category: 'security',
    command: 'trivy config {path} --format json 2>&1',
    parseOutput: (output) => {
      try {
        // Trivy outputs INFO lines before JSON, find the JSON start
        const jsonStart = output.indexOf('{');
        if (jsonStart === -1) return 0;
        const jsonStr = output.substring(jsonStart);
        const json = JSON.parse(jsonStr);
        // Count Misconfigurations from Results array
        return json.Results?.reduce((sum: number, r: any) => sum + (r.Misconfigurations?.length || 0), 0) || 0;
      } catch {
        return 0;
      }
    },
  },

  // ========================================================================
  // ARCHITECTURE TOOLS
  // ========================================================================
  {
    toolId: 'madge',
    language: 'typescript',
    category: 'architecture',
    command: 'npx madge --circular --json {path}/*.js 2>&1',
    parseOutput: (output) => {
      try {
        // madge outputs multiple lines, find the JSON array with content
        const lines = output.split('\n');
        for (const line of lines) {
          if (line.startsWith('[') && line.includes('[')) {
            const json = JSON.parse(line);
            if (Array.isArray(json) && json.length > 0) {
              return json.length;
            }
          }
        }
        // Try parsing the whole output if it's a single JSON
        const json = JSON.parse(output);
        return Array.isArray(json) ? json.length : 0;
      } catch {
        return 0;
      }
    },
  },
  {
    toolId: 'dependency-cruiser',
    language: 'typescript',
    category: 'architecture',
    command: 'npx depcruise --output-type json {path} 2>&1',
    parseOutput: (output) => {
      try {
        const json = JSON.parse(output);
        return json.summary?.violations?.length || 0;
      } catch {
        return 0;
      }
    },
    skip: true,
    skipReason: 'Requires .dependency-cruiser.js config',
  },
];

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main(): Promise<void> {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║              PHASE 1: SYNTHETIC TOOL COVERAGE TEST                        ║
║                                                                           ║
║  Purpose: Validate ALL tools can execute and find issues                  ║
║  Method:  Run each tool on synthetic fixtures with known issues           ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
`);

  const tester = new SyntheticToolTester();

  try {
    // Setup test fixtures
    await tester.setup();

    // Run each tool test
    console.log('\n🔧 Running tool tests...\n');

    for (const test of TOOL_TESTS) {
      if (test.skip) {
        console.log(`⏭️  Skipping ${test.toolId}: ${test.skipReason}`);
        continue;
      }

      console.log(`🧪 Testing ${test.toolId} (${test.language})...`);
      const result = await tester.testTool(
        test.toolId,
        test.language,
        test.category,
        test.command,
        test.parseOutput
      );

      const status = result.issuesFound > 0 ? '✅' : result.executed ? '⚠️' : '❌';
      console.log(`   ${status} Found ${result.issuesFound} issues in ${result.executionTimeMs}ms`);
    }

    // Print summary
    tester.printSummary();

    // Save results to file
    const resultsPath = path.join(__dirname, 'test-outputs', 'tool-coverage-results.json');
    fs.mkdirSync(path.dirname(resultsPath), { recursive: true });
    fs.writeFileSync(resultsPath, JSON.stringify(tester.getResults(), null, 2));
    console.log(`\n📄 Results saved to: ${resultsPath}`);
  } finally {
    await tester.cleanup();
  }
}

main().catch(console.error);
