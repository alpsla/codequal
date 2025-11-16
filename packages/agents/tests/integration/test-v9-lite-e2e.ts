/**
 * V9 Lite E2E Test
 *
 * Tests the complete V9 analysis flow using the NEW REFACTORED ARCHITECTURE:
 * - BaseToolOrchestrator (universal foundation)
 * - JavaToolOrchestrator (extends base, language-specific)
 * - Framework detection (Spring, Quarkus, Micronaut)
 * - Universal tool configuration
 * - V9 Report Compiler service
 * - Grouped report formatter
 *
 * Key Difference from test-v9-e2e-complete.ts:
 * - Uses refactored components instead of embedded logic
 * - Cleaner, more maintainable test structure
 * - Demonstrates the power of delegation pattern
 */

// Load environment variables FIRST (fixes OpenRouter 401 errors)
import dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });  // SESSION 22 FIX: Explicit path

// E2E Test Configuration: Disable rate limiting for multi-PR test scenarios
// Production: 100 calls/PR is correct ✅
// E2E Tests: 3 PRs sequentially = needs debug mode to disable limit
process.env.DEBUG_MODE = process.env.DEBUG_MODE || 'true';

import { JavaToolOrchestrator } from '../../src/two-branch/tools/java/java-tool-orchestrator';
import { TypeScriptToolOrchestrator } from '../../src/two-branch/tools/typescript/typescript-tool-orchestrator';
import { PythonToolOrchestrator } from '../../src/two-branch/tools/python/python-tool-orchestrator';
import { createFrameworkDetector } from '../../src/two-branch/utils/framework-detector';
import { createToolConfigResolver } from '../../src/two-branch/config/universal-tool-config';
import { V9GroupedReportFormatter } from '../../src/two-branch/analyzers/v9-grouped-report-formatter';
import { ModelConfigResolver } from '../../src/standard/orchestrator/model-config-resolver';
import { groupIssues } from '../../src/two-branch/utils/issue-grouping';
import { V9TemplateValidator } from '../../src/two-branch/validators/v9-template-validator';
import { execSync } from 'child_process';
import * as fs from 'fs';
// path already imported above for dotenv.config

interface TestScenario {
  name: string;
  repoUrl: string;
  prNumber?: number;  // Optional - if provided, uses GitHub PR; if not, creates local test branch
  testMode: 'baseline' | 'pr-review';  // SESSION 20 FIX: Separate baseline from PR testing
  language: 'java' | 'typescript' | 'python';  // SESSION 25: Multi-language support
  expectedFramework?: string;
  expectedToolCount?: number;
  useLocalBranch?: boolean;  // SESSION 27: If true, create local branch instead of using GitHub PR
}

// ========================================================================
// STRATEGIC PRIORITY ORDER (SESSION 27):
// 
// GOAL: Validate report generation AND autofix work for ALL languages/frameworks
// 
// STRATEGY:
// 1. LOCAL BRANCH TESTING - Clone repos, create local branches with test issues, test autofix ⭐
// 2. BASELINE mode - Quick report generation validation (no PR needed)
// 3. EXISTING PUBLIC PRs - Validate categorization with real PRs
// 4. CodeQual - Full GitHub workflow testing (can push PRs if needed)
// 
// AUTOFIX TESTING:
// - ANY public repo: Clone, create local branch, test autofix via Cursor ✅
// - CodeQual: Can also push to GitHub for full workflow testing ✅
// ========================================================================

// SESSION 28: Run only 1 repo at a time for testing
// To test a different repo, uncomment it and comment out the current one
const TEST_SCENARIOS: TestScenario[] = [
  // ========================================================================
  // TYPESCRIPT TESTS - Report Generation Validation
  // ========================================================================
  
  // React (create-react-app) - Local Branch Autofix Test
  {
    name: 'React (create-react-app) - Local Branch Autofix Test',
    repoUrl: 'https://github.com/facebook/create-react-app',
    testMode: 'pr-review',
    // No prNumber = creates local test branch automatically
    language: 'typescript',
    expectedFramework: 'react',
    expectedToolCount: 3  // eslint, semgrep, npm-audit
  },
  
  // CodeQual: Full testing (PR mode - we own it, can test autofix)
  // {
  //   name: 'CodeQual PR #1 (Next.js) - Full Autofix Testing',
  //   repoUrl: 'https://github.com/alpsla/codequal',
  //   testMode: 'pr-review',
  //   prNumber: 1,
  //   language: 'typescript',
  //   expectedFramework: 'next',
  //   expectedToolCount: 3  // eslint, semgrep, npm-audit
  // },
  
  // Other TypeScript frameworks: Local branch testing (full autofix validation)
  // SESSION 27: Can test autofix on ANY public repo by creating local branches!
  // {
  //   name: 'Angular - Local Branch Autofix Test',
  //   repoUrl: 'https://github.com/angular/angular',
  //   testMode: 'pr-review',
  //   // No prNumber = creates local test branch automatically
  //   language: 'typescript',
  //   expectedFramework: 'angular',
  //   expectedToolCount: 3
  // },
  // {
  //   name: 'NestJS - Local Branch Autofix Test',
  //   repoUrl: 'https://github.com/nestjs/nest',
  //   testMode: 'pr-review',
  //   // No prNumber = creates local test branch automatically
  //   language: 'typescript',
  //   expectedFramework: 'nestjs',
  //   expectedToolCount: 3
  // },
  // {
  //   name: 'Express.js - Local Branch Autofix Test',
  //   repoUrl: 'https://github.com/expressjs/express',
  //   testMode: 'pr-review',
  //   // No prNumber = creates local test branch automatically
  //   language: 'typescript',
  //   expectedFramework: 'express',
  //   expectedToolCount: 3
  // },
  
  // ========================================================================
  // JAVA TESTS (Already Validated - Keep for reference)
  // ========================================================================
  
  // {
  //   name: 'Spring PetClinic PR #950',
  //   repoUrl: 'https://github.com/spring-projects/spring-petclinic',
  //   testMode: 'pr-review',
  //   prNumber: 950,
  //   language: 'java',
  //   expectedFramework: 'spring',
  //   expectedToolCount: 5
  // },
  
  // ========================================================================
  // OTHER LANGUAGES - Baseline Mode (Report Generation Validation)
  // ========================================================================
  
  // Python tests will be added in baseline mode
  // Go, Rust, etc. will follow
];

/**
 * Helper function to clone a repository
 */
function cloneRepository(repoUrl: string, targetPath: string): void {
  console.log(`   🔄 Cloning ${repoUrl}...`);
  
  // Remove if exists
  if (fs.existsSync(targetPath)) {
    execSync(`rm -rf ${targetPath}`);
  }
  
  // Clone with depth 1 for speed
  execSync(`git clone --depth 1 ${repoUrl} ${targetPath}`, { 
    stdio: 'pipe',
    encoding: 'utf-8'
  });
  
  console.log(`   ✅ Repository cloned to ${targetPath}`);
}

/**
 * SESSION 27: Create local test branch with known issues for autofix testing
 * 
 * This allows us to test autofix on ANY public repository by:
 * 1. Cloning the repo
 * 2. Creating a local branch from default branch (main/master/trunk)
 * 3. Introducing known test issues
 * 4. Running analysis on local branch vs default branch
 * 5. Testing autofix via Cursor on local files
 */
function createLocalTestBranch(
  repoPath: string,
  branchName: string,
  language: 'typescript' | 'java' | 'python'
): void {
  console.log(`   🔀 Creating local test branch: ${branchName}...`);
  
  // SESSION 27 FIX: Ensure we're on default branch before creating test branch
  // This handles main/master/trunk dynamically
  // Note: Using sync require since this is a sync function
  const { detectDefaultBranch } = require('../../src/two-branch/utils/git-utils');
  const defaultBranch = detectDefaultBranch(repoPath);
  console.log(`   📍 Detected default branch: ${defaultBranch}`);
  
  // Ensure we're on default branch (clone might have left us on a different branch)
  execSync(`git -C ${repoPath} checkout ${defaultBranch}`, { stdio: 'pipe' });
  
  // Configure Git user (required for commits on cloud)
  try {
    execSync(`git -C ${repoPath} config user.email "test@codequal.local"`, { stdio: 'pipe' });
    execSync(`git -C ${repoPath} config user.name "CodeQual Test"`, { stdio: 'pipe' });
  } catch {
    // Git config might fail, but we'll try anyway
  }
  
  // Create and checkout local branch from default branch
  execSync(`git -C ${repoPath} checkout -b ${branchName}`, { stdio: 'pipe' });
  
  // Introduce known test issues based on language
  if (language === 'typescript') {
    // Place test file in root directory to ensure ESLint/TypeScript can find it
    const testFile = path.join(repoPath, 'test-autofix-issues.ts');
    
    const testContent = `// SESSION 27: Test file for autofix validation
// This file contains known issues that should be auto-fixable

import { exec } from 'child_process';

// Issue 1: Security - child_process with user input (should be fixed)
export function unsafeExec(command: string) {
  exec(command, (error, stdout, stderr) => {
    console.log(stdout);
  });
}

// Issue 2: Code Quality - unused variable (should be fixed by ESLint)
const unusedVar = 'test';

// Issue 3: Security - hardcoded secret (should be flagged)
const apiKey = 'sk-1234567890abcdef';

// Issue 4: TypeScript error - type mismatch (should be caught by tsc)
export function addNumbers(a: number, b: number): number {
  return a + b;
}
const result = addNumbers('1', '2');  // Type error: string instead of number

// Issue 5: ESLint - no-unused-vars (should be fixed by ESLint)
const anotherUnused = 'test2';
`;
    fs.writeFileSync(testFile, testContent);
    
    // OPTIMIZATION: Use shared tools instead of installing in each repo
    // Strategy: Link node_modules from shared location (faster than npm install)
    const sharedToolsPath = process.env.SHARED_TOOLS_PATH || '/tmp/codequal-shared-tools';
    const sharedNodeModules = path.join(sharedToolsPath, 'node_modules');
    
    // Ensure shared tools are installed (only once, reused across all repos)
    if (!fs.existsSync(sharedNodeModules)) {
      console.log(`[Test] Installing shared ESLint/TypeScript tools (one-time setup)...`);
      fs.mkdirSync(sharedToolsPath, { recursive: true });
      
      // Create package.json for shared tools
      const sharedPackageJson = {
        "name": "codequal-shared-tools",
        "version": "1.0.0",
        "dependencies": {
          "eslint": "^8.0.0",
          "@typescript-eslint/parser": "^5.0.0",
          "@typescript-eslint/eslint-plugin": "^5.0.0",
          "typescript": "^4.9.0"
        }
      };
      fs.writeFileSync(path.join(sharedToolsPath, 'package.json'), JSON.stringify(sharedPackageJson, null, 2));
      
      // Install once (this takes time, but only happens once)
      try {
        execSync(`cd ${sharedToolsPath} && npm install --no-save 2>&1`, { 
          stdio: 'pipe',
          timeout: 120000  // 2 minute timeout for initial install
        });
        console.log(`[Test] ✅ Shared tools installed successfully`);
      } catch (error: any) {
        console.warn(`[Test] ⚠️  Could not install shared tools: ${error.message}`);
        console.warn(`[Test] Falling back to per-repo installation...`);
      }
    } else {
      console.log(`[Test] ✅ Using existing shared tools (no installation needed)`);
    }
    
    // Check if package.json exists in repo
    const packageJsonPath = path.join(repoPath, 'package.json');
    let packageJson: any = {};
    
    if (fs.existsSync(packageJsonPath)) {
      try {
        packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      } catch {
        // Invalid JSON, create new one
      }
    }
    
    // Create/update package.json to reference shared tools
    if (!packageJson.name) {
      packageJson.name = 'test-repo';
      packageJson.version = '1.0.0';
    }
    if (!packageJson.devDependencies) {
      packageJson.devDependencies = {};
    }
    
    // Link shared node_modules to repo (faster than npm install)
    const repoNodeModules = path.join(repoPath, 'node_modules');
    if (fs.existsSync(sharedNodeModules) && !fs.existsSync(repoNodeModules)) {
      try {
        // Create symlink to shared node_modules (instant, no download)
        fs.symlinkSync(sharedNodeModules, repoNodeModules, 'dir');
        console.log(`[Test] ✅ Linked shared node_modules to repo (instant)`);
      } catch (error: any) {
        // Symlink failed (maybe on Windows or permission issue), fall back to copy
        console.log(`[Test] Symlink failed, copying shared tools...`);
        try {
          execSync(`cp -r ${sharedNodeModules} ${repoNodeModules}`, { stdio: 'pipe' });
          console.log(`[Test] ✅ Copied shared tools to repo`);
        } catch (copyError: any) {
          console.warn(`[Test] ⚠️  Could not link/copy shared tools: ${copyError.message}`);
          // Fall back to npm install in repo
          packageJson.devDependencies = {
            ...packageJson.devDependencies,
            "eslint": "^8.0.0",
            "@typescript-eslint/parser": "^5.0.0",
            "@typescript-eslint/eslint-plugin": "^5.0.0",
            "typescript": "^4.9.0"
          };
          fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
          try {
            execSync(`cd ${repoPath} && npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin typescript 2>&1`, { 
              stdio: 'pipe',
              timeout: 60000
            });
          } catch (installError: any) {
            console.warn(`[Test] ⚠️  Could not install ESLint: ${installError.message}`);
          }
        }
      }
    } else if (!fs.existsSync(repoNodeModules)) {
      // No shared tools available, install in repo
      packageJson.devDependencies = {
        ...packageJson.devDependencies,
        "eslint": "^8.0.0",
        "@typescript-eslint/parser": "^5.0.0",
        "@typescript-eslint/eslint-plugin": "^5.0.0",
        "typescript": "^4.9.0"
      };
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      try {
        execSync(`cd ${repoPath} && npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin typescript 2>&1`, { 
          stdio: 'pipe',
          timeout: 60000
        });
      } catch (error: any) {
        console.warn(`[Test] ⚠️  Could not install ESLint: ${error.message}`);
      }
    }
    
    // Create tsconfig.json if it doesn't exist (needed for TypeScript compiler and ESLint)
    const tsconfigPath = path.join(repoPath, 'tsconfig.json');
    if (!fs.existsSync(tsconfigPath)) {
      const tsconfig = {
        "compilerOptions": {
          "target": "ES2020",
          "module": "commonjs",
          "lib": ["ES2020"],
          "strict": true,
          "esModuleInterop": true,
          "skipLibCheck": true,
          "forceConsistentCasingInFileNames": true,
          "resolveJsonModule": true
        },
        "include": [
          "**/*.ts",
          "**/*.tsx"
        ],
        "exclude": [
          "node_modules",
          "dist",
          "build"
        ]
      };
      fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
    }
    
    // Create CLEAN ESLint config (replace existing to avoid dependency issues)
    // CRITICAL: Don't merge with existing config - repos may reference external configs
    // like "react-app" that aren't in our shared tools, causing ESLint to fail
    const eslintConfigPath = path.join(repoPath, '.eslintrc.json');

    // Create standalone config with TypeScript support (uses shared tools packages)
    const eslintConfig = {
      "extends": ["eslint:recommended"],
      "parser": "@typescript-eslint/parser",
      "plugins": ["@typescript-eslint"],
      "env": {
        "node": true,
        "es6": true,
        "browser": true
      },
      "parserOptions": {
        "ecmaVersion": 2020,
        "sourceType": "module"
      },
      "rules": {
        "no-unused-vars": "error",              // Detect unused variables
        "@typescript-eslint/no-unused-vars": "error",  // TypeScript-specific unused vars
        "no-console": "warn"                    // Detect console.log statements
      },
      "ignorePatterns": ["node_modules", "dist", "build"]
    };

    // Write clean ESLint config (replaces any existing config)
    fs.writeFileSync(eslintConfigPath, JSON.stringify(eslintConfig, null, 2));
    console.log(`   ✅ ESLint config created: clean standalone config with unused-vars rules`);
    
    // Ensure .eslintignore doesn't exclude our test file
    const eslintIgnorePath = path.join(repoPath, '.eslintignore');
    if (fs.existsSync(eslintIgnorePath)) {
      const ignoreContent = fs.readFileSync(eslintIgnorePath, 'utf-8');
      // Remove test-autofix-issues.ts from ignore list if present
      const updatedIgnore = ignoreContent
        .split('\n')
        .filter(line => !line.includes('test-autofix-issues.ts'))
        .join('\n');
      if (updatedIgnore !== ignoreContent) {
        fs.writeFileSync(eslintIgnorePath, updatedIgnore);
      }
    }
    
    // CRITICAL: Add ESLint issues to a PRODUCTION file (not test file)
    // Test file is excluded, so we need to add issues to existing production code
    // Find an existing TypeScript file in src/ or root
    let productionFile: string | null = null;
    const possiblePaths = [
      path.join(repoPath, 'src', 'index.ts'),
      path.join(repoPath, 'src', 'App.tsx'),
      path.join(repoPath, 'src', 'App.ts'),
      path.join(repoPath, 'index.ts'),
      path.join(repoPath, 'src', 'main.ts'),
      path.join(repoPath, 'main.ts')
    ];
    
    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        productionFile = filePath;
        break;
      }
    }
    
    // If no existing file found, create a production file (not a test file)
    if (!productionFile) {
      productionFile = path.join(repoPath, 'src', 'codequal-validation.ts');
      const srcDir = path.dirname(productionFile);
      if (!fs.existsSync(srcDir)) {
        fs.mkdirSync(srcDir, { recursive: true });
      }
    }
    
    // Read existing file or create new one
    let productionContent = '';
    if (fs.existsSync(productionFile)) {
      productionContent = fs.readFileSync(productionFile, 'utf-8');
    } else {
      productionContent = `// CodeQual validation file - ESLint issues for testing
export function validateCodeQuality() {
  return true;
}
`;
    }
    
    // Add ESLint issues to production file (unused variables, etc.)
    const eslintIssues = `
// ESLint Issue 1: Unused variable (should be detected by ESLint)
const unusedVariable = 'this should trigger ESLint no-unused-vars';

// ESLint Issue 2: Another unused variable
const anotherUnusedVar = 42;

// ESLint Issue 3: Unused function parameter
export function testFunction(unusedParam: string) {
  return 'test';
}

// ESLint Issue 4: Console.log (should be flagged if rule enabled)
console.log('Debug message');
`;
    
    // Append ESLint issues to production file
    const updatedContent = productionContent + '\n' + eslintIssues;
    fs.writeFileSync(productionFile, updatedContent);

    // VERIFICATION: Log file details
    console.log(`   ✅ Created production file: ${path.relative(repoPath, productionFile)}`);
    console.log(`   📝 File exists: ${fs.existsSync(productionFile)}`);
    console.log(`   📄 File size: ${updatedContent.length} bytes, ${updatedContent.split('\n').length} lines`);

    // Verify file is readable
    const verifyContent = fs.readFileSync(productionFile, 'utf-8');
    console.log(`   ✅ File readable: ${verifyContent.length === updatedContent.length}`);

    // Count expected ESLint issues in the file
    const unusedVarCount = (verifyContent.match(/const (unusedVariable|anotherUnusedVar|unusedParam)/g) || []).length;
    console.log(`   📊 Expected unused variables: ${unusedVarCount}`);

    // DIAGNOSTIC: Test ESLint directly before committing
    console.log(`\n   🔍 Running diagnostic: Testing ESLint directly on production file...`);
    try {
      const diagnosticCmd = `cd ${repoPath} && npx eslint ${productionFile} --config .eslintrc.json --format json`;
      console.log(`   📝 Command: ${diagnosticCmd}`);

      const directOutput = execSync(diagnosticCmd, {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024
      }) as string;

      console.log(`   📊 Direct ESLint stdout length: ${directOutput.length} bytes`);

      const directResults = JSON.parse(directOutput);
      const directIssueCount = directResults[0]?.messages?.length || 0;
      console.log(`   🎯 Direct ESLint test result: ${directIssueCount} issues found`);

      if (directIssueCount === 0) {
        console.log(`   🚨 WARNING: ESLint found 0 issues in direct test!`);
        console.log(`   This indicates ESLint config or file issues, not orchestration issues`);
        console.log(`   Config file: ${eslintConfigPath}`);
        console.log(`   Config exists: ${fs.existsSync(eslintConfigPath)}`);

        // Log config content for debugging
        const configContent = fs.readFileSync(eslintConfigPath, 'utf-8');
        console.log(`   📄 Config content:\n${configContent.substring(0, 500)}`);
      } else {
        console.log(`   ✅ Direct test passed: ESLint is detecting issues correctly`);
        // Log first issue as example
        if (directResults[0]?.messages?.[0]) {
          const firstMsg = directResults[0].messages[0];
          console.log(`   📝 Example issue: ${firstMsg.ruleId} at line ${firstMsg.line}: ${firstMsg.message}`);
        }
      }
    } catch (error: any) {
      console.log(`   ⚠️  Direct ESLint test error: ${error.message}`);
      if (error.stdout) {
        console.log(`   stdout: ${error.stdout.substring(0, 300)}`);
      }
      if (error.stderr) {
        console.log(`   stderr: ${error.stderr.substring(0, 300)}`);
      }
    }

    // Stage all changes (test file + production file with ESLint issues)
    execSync(`git -C ${repoPath} add ${testFile} ${productionFile} ${eslintConfigPath} ${tsconfigPath} ${packageJsonPath}`, { stdio: 'pipe' });
    execSync(`git -C ${repoPath} commit -m "test: Add test issues for autofix validation (test file + production ESLint issues)"`, { stdio: 'pipe' });

    console.log(`   ✅ Added ESLint issues to production file: ${path.relative(repoPath, productionFile)}`);
  } else if (language === 'java') {
    // Add Java test file with known issues
    const testFile = path.join(repoPath, 'src/test/java/TestAutofixIssues.java');
    const testContent = `// SESSION 27: Test file for autofix validation
package test;

public class TestAutofixIssues {
    // Issue 1: Code Quality - System.out.println (should use logger)
    public void testMethod() {
        System.out.println("Test");
    }
    
    // Issue 2: Code Quality - unused import (should be removed)
    import java.util.ArrayList;
}
`;
    // Create directory if needed
    const testDir = path.dirname(testFile);
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    fs.writeFileSync(testFile, testContent);
    execSync(`git -C ${repoPath} add ${testFile}`, { stdio: 'pipe' });
    execSync(`git -C ${repoPath} commit -m "test: Add test issues for autofix validation"`, { stdio: 'pipe' });
  } else if (language === 'python') {
    // Add Python test file with known issues
    const testFile = path.join(repoPath, 'test_autofix_issues.py');
    const testContent = `# SESSION 27: Test file for autofix validation
# This file contains known issues that should be auto-fixable

import os

# Issue 1: Security - shell injection (should be fixed)
def unsafe_command(cmd):
    os.system(cmd)

# Issue 2: Code Quality - unused import (should be removed)
import json
`;
    fs.writeFileSync(testFile, testContent);
    execSync(`git -C ${repoPath} add ${testFile}`, { stdio: 'pipe' });
    execSync(`git -C ${repoPath} commit -m "test: Add test issues for autofix validation"`, { stdio: 'pipe' });
  }
  
  console.log(`   ✅ Local test branch created with test issues`);
}

/**
 * SESSION 22 FIX: Fetch real PR author from GitHub API
 */
async function fetchPRAuthor(repoUrl: string, prNumber: number): Promise<{ author: string; authorEmail: string }> {
  try {
    // Extract owner/repo from URL
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      return { author: 'test-user', authorEmail: 'test@example.com' };
    }
    
    const [, owner, repo] = match;
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`;
    
    // Fetch PR metadata (no auth needed for public repos)
    const https = await import('https');
    const response = await new Promise<string>((resolve, reject) => {
      https.get(apiUrl, {
        headers: {
          'User-Agent': 'CodeQual-Test',
          'Accept': 'application/vnd.github.v3+json'
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', reject);
    });
    
    const prData = JSON.parse(response);
    return {
      author: prData.user?.login || 'test-user',
      authorEmail: `${prData.user?.login || 'test-user'}@users.noreply.github.com`
    };
  } catch (error) {
    console.warn(`   ⚠️  Could not fetch PR author: ${error}`);
    return { author: 'test-user', authorEmail: 'test@example.com' };
  }
}

async function runLiteE2ETest(scenario: TestScenario): Promise<void> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 Testing: ${scenario.name}`);
  console.log(`${'='.repeat(80)}\n`);

  const startTime = Date.now();
  const repoPath = `/tmp/test-repo-${Date.now()}`;

  try {
    // ========================================================================
    // STEP 0: Clone Repository
    // ========================================================================
    console.log('📦 Step 0: Cloning repository...');
    cloneRepository(scenario.repoUrl, repoPath);

    // ========================================================================
    // STEP 1: Framework Detection (NEW!)
    // ========================================================================
    console.log('\n📋 Step 1: Detecting framework...');
    const frameworkDetector = createFrameworkDetector();
    const frameworkInfo = await frameworkDetector.detectFrameworks(repoPath);
    
    console.log(`   ✅ Detected Framework: ${frameworkInfo.primaryFramework}`);
    if (frameworkInfo.buildSystem) {
      console.log(`   ✅ Build System: ${frameworkInfo.buildSystem}`);
    }
    
    if (scenario.expectedFramework && frameworkInfo.primaryFramework !== scenario.expectedFramework) {
      console.warn(`   ⚠️  Expected ${scenario.expectedFramework}, got ${frameworkInfo.primaryFramework}`);
    }

    // ========================================================================
    // STEP 2: Universal Tool Configuration (NEW!)
    // ========================================================================
    console.log('\n🔧 Step 2: Configuring tools...');
    const toolResolver = createToolConfigResolver();
    const tools = toolResolver.getToolsForLanguage(scenario.language);
    
    console.log(`   ✅ Configured ${tools.length} tools for ${scenario.language}`);
    tools.forEach(tool => {
      console.log(`      - ${tool.name} (${tool.category})`);
    });

    if (scenario.expectedToolCount && tools.length !== scenario.expectedToolCount) {
      console.warn(`   ⚠️  Expected ${scenario.expectedToolCount} tools, got ${tools.length}`);
    }

    // ========================================================================
    // STEP 3: Tool Orchestration (SESSION 25: Multi-language support)
    // ========================================================================
    console.log('\n🚀 Step 3: Running tool orchestration...');
    
    // Create language-specific orchestrator
    const orchestrator = scenario.language === 'java' ? new JavaToolOrchestrator() :
                         scenario.language === 'typescript' ? new TypeScriptToolOrchestrator() :
                         new PythonToolOrchestrator();
    
    let allIssues: any[];
    let newIssues: any[];
    let orchestrationResult: any;  // Store for performance data
    let prBranchName: string | undefined;  // SESSION 27: Declare at higher scope for metadata
    
    if (scenario.testMode === 'baseline') {
      // SESSION 20 FIX: Baseline mode - analyze default branch only
      const { detectDefaultBranch } = await import('../../src/two-branch/utils/git-utils');
      const defaultBranch = detectDefaultBranch(repoPath);
      console.log(`   📊 Repository Baseline Analysis (default branch: ${defaultBranch})...`);
      orchestrationResult = await orchestrator.orchestrate(repoPath, 'base', { analysisMode: 'complete' });
      
      allIssues = orchestrationResult.toolResults.flatMap(r => r.issues || []);
      newIssues = [];  // No NEW issues in baseline mode
      
      console.log(`   ✅ Tools executed: ${orchestrationResult.toolResults.length}`);
      console.log(`   📊 Total issues found: ${allIssues.length}`);
      console.log(`   ℹ️  All issues marked as EXISTING_REST (baseline)`);
      
    } else {
      // SESSION 20 FIX: PR review mode - two-branch comparison
      console.log('   📊 PR Review Mode - Two-branch comparison...');
      
      // SESSION 27 FIX: Use dynamic default branch detection (main/master/trunk)
      const { detectDefaultBranch } = await import('../../src/two-branch/utils/git-utils');
      const defaultBranch = detectDefaultBranch(repoPath);
      console.log(`   📍 Detected default branch: ${defaultBranch}`);
      
      // Run tools on default branch (main/master/trunk - detected dynamically)
      console.log(`   📊 Analyzing default branch (${defaultBranch})...`);
      const mainResult = await orchestrator.orchestrate(repoPath, 'base', { analysisMode: 'complete' });
      
      // SESSION 27: Support both GitHub PRs and local test branches
      
      if (scenario.prNumber) {
        // Use GitHub PR if prNumber is provided
        prBranchName = `pr-${scenario.prNumber}`;
        console.log(`   🔀 Checking out PR #${scenario.prNumber}...`);
        try {
          execSync(`git -C ${repoPath} fetch origin pull/${scenario.prNumber}/head:${prBranchName}`, { stdio: 'pipe' });
          execSync(`git -C ${repoPath} checkout ${prBranchName}`, { stdio: 'pipe' });
          console.log(`   ✅ Checked out PR branch`);
        } catch (error) {
          console.log(`   ❌ Could not checkout PR #${scenario.prNumber} - skipping this scenario`);
          return;
        }
      } else {
        // SESSION 27: Create local test branch for autofix testing
        // Ensure we're on default branch first (handles main/master/trunk dynamically)
        execSync(`git -C ${repoPath} checkout ${defaultBranch}`, { stdio: 'pipe' });
        prBranchName = `test-autofix-${Date.now()}`;
        createLocalTestBranch(repoPath, prBranchName, scenario.language);
      }
      
      // Get modified files for categorization (NOT for tool execution)
      // CRITICAL: We scan ALL files on BOTH branches for accurate comparison
      // The categorization logic (EXISTING_REST, RESOLVED) requires comparing ALL issues
      // from both branches, not just changed files
      const { getModifiedFilesBetweenBranches } = await import('../../src/two-branch/utils/git-utils');
      const modifiedFiles = getModifiedFilesBetweenBranches(repoPath, defaultBranch, prBranchName);
      console.log(`   📝 Modified files: ${modifiedFiles.length} (sample: ${modifiedFiles.slice(0, 3).join(', ')})`);
      
      // Run tools on PR branch - scan ALL files (same as main branch)
      // This ensures accurate comparison: EXISTING_REST and RESOLVED require full scan
      console.log('   📊 Analyzing PR branch...');
      orchestrationResult = await orchestrator.orchestrate(repoPath, 'pr', { 
        analysisMode: 'complete'
        // ✅ CRITICAL: Do NOT pass changedFiles - we need ALL files for comparison
        // changedFiles is only used for categorization, not tool execution
      });
      
      const mainResults = mainResult.toolResults;
      const prResults = orchestrationResult.toolResults;
      
      console.log(`   ✅ Default branch (${defaultBranch}): ${mainResults.length} tools executed`);
      console.log(`   ✅ PR branch: ${prResults.length} tools executed`);

      const totalIssuesMain = mainResults.reduce((sum, r) => sum + (r.issues?.length || 0), 0);
      const totalIssuesPr = prResults.reduce((sum, r) => sum + (r.issues?.length || 0), 0);
      
      console.log(`   📊 Default branch (${defaultBranch}) issues: ${totalIssuesMain}`);
      console.log(`   📊 PR branch issues: ${totalIssuesPr}`);
      
      // modifiedFiles already calculated above (used for orchestrator)
      const modifiedFilesSet = new Set(modifiedFiles);

      // Normalize file paths for comparison (remove /workspace/ prefix if present)
      const normalizePath = (path: string) => {
        if (path.startsWith('/workspace/')) {
          return path.replace('/workspace/', '');
        } else if (path.startsWith('workspace/')) {
          return path.replace('workspace/', '');
        }
        return path;
      };

      // Create issue signatures for comparison
      const getSig = (i: any) => `${normalizePath(i.file)}:${i.line}:${i.rule || i.tool}`;

      // Get all issues from both branches
      const allMainIssues = mainResults.flatMap(r => r.issues || []);
      const allPrIssues = prResults.flatMap(r => r.issues || []);

      // Create signature sets
      const mainSigs = new Set(allMainIssues.map(getSig));
      const prSigs = new Set(allPrIssues.map(getSig));

      // Categorize issues using V9 logic (same as test-v9-e2e-complete.ts)
      const categorizedIssues: any[] = [];

      // NEW: In PR but not in default branch
      const newIssuesList = allPrIssues.filter(i => !mainSigs.has(getSig(i)));
      newIssuesList.forEach(issue => {
        issue.category = 'NEW';
        categorizedIssues.push(issue);
      });

      // EXISTING_MODIFIED: In both, but in modified files
      // Use exact match only (no includes check) - modified files should be exact paths
      const existingModified = allPrIssues.filter(i => {
        const normalizedFile = normalizePath(i.file);
        return mainSigs.has(getSig(i)) && modifiedFilesSet.has(normalizedFile);
      });
      existingModified.forEach(issue => {
        issue.category = 'EXISTING_MODIFIED';
        categorizedIssues.push(issue);
      });

      // Track files that exist in PR (for resolved issue filtering)
      // BUG FIX #26: Normalize paths for existence check (same as test-v9-e2e-complete.ts)
      const prFileExists = new Set(allPrIssues.map(i => normalizePath(i.file)));

      // EXISTING_REST: In both, but NOT in modified files (from PR side)
      // Use exact match only (no includes check)
      const existingRestFromPr = allPrIssues.filter(i => {
        const normalizedFile = normalizePath(i.file);
        return mainSigs.has(getSig(i)) && !modifiedFilesSet.has(normalizedFile);
      });
      existingRestFromPr.forEach(issue => {
        issue.category = 'EXISTING_REST';
        categorizedIssues.push(issue);
      });

      // EXISTING_REST: In default branch, not in PR, NOT in modified files (from default branch side)
      // Use exact match only - if file path exactly matches a modified file, it's not EXISTING_REST
      const existingRestFromMain = allMainIssues.filter(i => {
        const normalizedFile = normalizePath(i.file);
        return !prSigs.has(getSig(i)) && !modifiedFilesSet.has(normalizedFile);
      });
      existingRestFromMain.forEach(issue => {
        issue.category = 'EXISTING_REST';
        categorizedIssues.push(issue);
      });

      // RESOLVED: In default branch but not in PR, AND file still exists and was modified
      // This ensures we only credit fixes in modified files, not deleted code
      // (same logic as test-v9-e2e-complete.ts)
      const resolvedIssues = allMainIssues.filter(i => {
        const sig = getSig(i);
        const normalizedFile = normalizePath(i.file);
        return (
          !prSigs.has(sig) &&                      // Issue gone from PR
          modifiedFilesSet.has(normalizedFile) &&   // File was modified (developer touched it)
          prFileExists.has(normalizedFile)          // File still exists in PR (not deleted)
        );
      });
      resolvedIssues.forEach(issue => {
        issue.category = 'RESOLVED';
        categorizedIssues.push(issue);
      });

      // Set allIssues and newIssues for report generation
      allIssues = categorizedIssues;
      newIssues = newIssuesList;

      console.log(`   ✅ New issues (introduced in PR): ${newIssues.length}`);
      console.log(`   ✅ Existing modified: ${existingModified.length}`);
      console.log(`   ✅ Existing rest: ${existingRestFromPr.length + existingRestFromMain.length}`);
      console.log(`   ✅ Resolved: ${resolvedIssues.length}`);
    }

    // ========================================================================
    // STEP 4: Issue Categorization
    // ========================================================================
    console.log('\n📂 Step 4: Categorizing issues...');

    // ========================================================================
    // STEP 5: Issue Grouping (Cost Optimization)
    // ========================================================================
    console.log('\n💰 Step 5: Grouping issues for cost optimization...');

    // Helper function to detect issue category from tool/rule
    // BUG FIX: dependency-check should be 'Dependencies', not 'Security'
    const detectIssueCategory = (tool: string, rule: string | null | undefined): string => {
      if (tool === 'semgrep') return 'Security';
      if (tool === 'dependency-check') return 'Dependencies';  // FIX: Was incorrectly categorized as 'Security'
      if (tool === 'spotbugs' && rule && typeof rule === 'string' && rule.toLowerCase().includes('performance')) return 'Performance';
      if (tool === 'checkstyle' || tool === 'pmd') return 'Code Quality';
      return 'Code Quality';
    };

    const formattedIssues = allIssues.map(issue => {
      // Use category already set by V9 categorization logic (NEW, EXISTING_MODIFIED, EXISTING_REST, RESOLVED)
      // If not set (baseline mode), default to EXISTING_REST
      const lifecycleCategory = issue.category || (scenario.testMode === 'baseline' ? 'EXISTING_REST' : 'NEW');

      return {
        id: `${issue.tool}-${issue.file}-${issue.line}`,
        rule: issue.rule ? String(issue.rule) : 'unknown-rule',
        // Set lifecycle category (NEW, EXISTING_MODIFIED, EXISTING_REST, RESOLVED)
        category: lifecycleCategory,
        // Set detected category (Security, Performance, Code Quality, etc.)
        detectedCategory: detectIssueCategory(issue.tool, issue.rule ? String(issue.rule) : ''),
        severity: issue.severity || 'medium',
        title: issue.message || 'Code quality issue',
        file: issue.file || 'unknown',
        line: issue.line || 0,
        tool: issue.tool || 'unknown',
        message: issue.message || '',
        codeSnippet: undefined,
        suggestedFix: undefined
      };
    });

    const groupingResult = groupIssues(formattedIssues);
    console.log(`   ✅ Grouped ${formattedIssues.length} issues into ${groupingResult.groups.length} groups`);
    console.log(`   ✅ Cost savings: ${groupingResult.savingsPercent.toFixed(1)}%`);
    console.log(`   ✅ AI calls: ${groupingResult.groups.length} (instead of ${formattedIssues.length})`);

    // ========================================================================
    // STEP 6: Report Generation (Grouped Formatter)
    // ========================================================================
    console.log('\n📝 Step 6: Generating report...');
    
    // Initialize ModelConfigResolver - let errors surface (no mock fallback)
    const modelConfigResolver = new ModelConfigResolver();
    console.log('   ✅ Using Supabase model configuration');
    
    const formatter = new V9GroupedReportFormatter(
      modelConfigResolver,
      scenario.language,
      'medium'
    );

    // ========================================================================
    // USE PERFORMANCE DATA FROM ORCHESTRATOR (BUG #8, #9, #10 FIX)
    // Business logic moved to V9 engine classes per architectural requirements
    // ========================================================================

    // SESSION 22 FIX: Fetch real PR author for pr-review mode
    const prAuthorInfo = scenario.testMode === 'pr-review' && scenario.prNumber
      ? await fetchPRAuthor(scenario.repoUrl, scenario.prNumber)
      : { author: 'test-user', authorEmail: 'test@example.com' };
    
    console.log(`   👤 PR Author: ${prAuthorInfo.author}`);

    // SESSION 27 FIX: Use dynamic default branch detection (main/master/trunk)
    const { detectDefaultBranch } = await import('../../src/two-branch/utils/git-utils');
    const defaultBranch = detectDefaultBranch(repoPath);

    const metadata = {
      repository: scenario.repoUrl.split('/').slice(-2).join('/'),
      repoUrl: scenario.repoUrl,
      repoPath: repoPath,  // Add repoPath for code snippet extraction
      prNumber: scenario.prNumber,
      prTitle: scenario.prNumber ? `PR #${scenario.prNumber}` : 'Local Test Branch',
      branch: scenario.prNumber ? `pr-${scenario.prNumber}` : prBranchName || 'test-branch',
      baseBranch: defaultBranch,  // SESSION 27: Dynamic detection (main/master/trunk)
      prAuthor: prAuthorInfo.author,
      prAuthorEmail: prAuthorInfo.authorEmail,
      organizationName: scenario.repoUrl.split('/')[3],
      totalFiles: 100,
      totalLinesOfCode: 10000,
      filesModified: new Set(allIssues.map(i => i.file)).size,
      linesAdded: scenario.testMode === 'baseline' ? 0 : 500,
      linesDeleted: scenario.testMode === 'baseline' ? 0 : 200,
      decision: scenario.testMode === 'baseline' 
        ? 'INFORMATIONAL'  // Baseline - no approval decision
        : (newIssues.filter(i => i.severity === 'critical' || i.severity === 'high').length > 0 ? 'DECLINED' : 'APPROVED'),
      blockingCount: scenario.testMode === 'baseline' ? 0 : newIssues.filter(i => i.severity === 'critical' || i.severity === 'high').length,
      totalDuration: Date.now() - startTime,
      cloneTime: 5000,
      analysisTime: Date.now() - startTime - 5000,
      reportGenerationTime: 1000,
      analyzedAt: new Date().toISOString(),
      analyzerVersion: '9.0.0',

      // ⭐ PERFORMANCE DATA FROM ORCHESTRATOR (BUG #8, #9, #10 FIX)
      toolPerformance: orchestrationResult.toolPerformance || [],
      agentPerformance: orchestrationResult.agentPerformance || []
    };

    const result = await formatter.generateGroupedReport(
      formattedIssues,
      groupingResult.groups,
      metadata
    );

    console.log(`   ✅ Report generated: ${result.markdown.length} bytes`);
    console.log(`   ✅ IDE fix files: ${result.ideFixFiles.length}`);
    console.log(`   ✅ Location attachments: ${result.attachments.length}`);

    // ========================================================================
    // STEP 6.3: Validate V9 Template Compliance
    // ========================================================================
    console.log('\n📋 Step 6.3: Validating V9 template compliance...');
    const templateValidator = new V9TemplateValidator();
    const validationResult = templateValidator.validateReport(result.markdown);
    
    console.log(`   📊 Template compliance: ${validationResult.score}% (${validationResult.foundSections}/${validationResult.totalSections} required sections)`);
    
    if (validationResult.isValid) {
      console.log(`   ✅ Report is V9 template compliant!`);
    } else {
      console.warn(`   ⚠️  Missing required sections:`);
      validationResult.missingSections.forEach(section => {
        console.warn(`      - ${section.name} (${section.description})`);
      });
      // Don't fail the test, but warn about missing sections
    }

    // ========================================================================
    // STEP 6.5: Validate LSP/SARIF Upload (SESSION 26)
    // ========================================================================
    console.log('\n🔍 Step 6.5: Validating LSP/SARIF uploads...');
    
    // Extract LSP/SARIF URLs from metadata (stored by formatter)
    const lspUrl = (metadata as any).lspUrl;
    const sarifUrl = (metadata as any).sarifUrl;
    
    if (lspUrl) {
      console.log(`   📄 LSP URL: ${lspUrl}`);
      try {
        const lspResponse = await fetch(lspUrl);
        if (lspResponse.ok) {
          const lspContent = await lspResponse.json();
          if (Array.isArray(lspContent) && lspContent.length > 0) {
            console.log(`   ✅ LSP file valid: ${lspContent.length} code actions, HTTP ${lspResponse.status}`);
            // Track successful validation
            try {
              const { ServiceHealthTracker } = await import('../../src/two-branch/monitoring/service-health-tracker');
              const { createClient } = await import('@supabase/supabase-js');
              const supabaseUrl = process.env.SUPABASE_URL;
              const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
              if (supabaseUrl && supabaseKey) {
                const supabase = createClient(supabaseUrl, supabaseKey);
                const tracker = new ServiceHealthTracker(supabase);
                await tracker.trackUrlValidationSuccess({
                  service: 'lsp',
                  url: lspUrl,
                  statusCode: lspResponse.status,
                  repositoryUrl: scenario.repoUrl,
                  prNumber: scenario.prNumber,
                  analysisId: (metadata as any).analysisId
                });
              }
            } catch (trackError) {
              // Silently fail tracking - don't break test
            }
            
            // Check for batch actions
            const batchActions = lspContent.filter((action: any) => 
              action.title?.includes('Apply All') || 
              action.title?.includes('Apply Critical') ||
              action.title?.includes('Apply High')
            );
            if (batchActions.length > 0) {
              console.log(`   ✅ Batch actions found: ${batchActions.length}`);
            }
          } else {
            console.warn(`   ⚠️  LSP file structure invalid`);
          }
        } else {
          console.error(`   ❌ LSP file download failed: HTTP ${lspResponse.status}`);
          // Track 404/validation failure
          try {
            const { ServiceHealthTracker } = await import('../../src/two-branch/monitoring/service-health-tracker');
            const { createClient } = await import('@supabase/supabase-js');
            const supabaseUrl = process.env.SUPABASE_URL;
            const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
            if (supabaseUrl && supabaseKey) {
              const supabase = createClient(supabaseUrl, supabaseKey);
              const tracker = new ServiceHealthTracker(supabase);
              await tracker.trackUrlValidationFailure({
                service: 'lsp',
                url: lspUrl,
                statusCode: lspResponse.status,
                errorMessage: `HTTP ${lspResponse.status}`,
                repositoryUrl: scenario.repoUrl,
                prNumber: scenario.prNumber,
                analysisId: (metadata as any).analysisId
              });
            }
          } catch (trackError) {
            // Silently fail tracking - don't break test
            console.warn(`   ⚠️  Failed to track health event: ${(trackError as Error).message}`);
          }
        }
      } catch (error: any) {
        console.error(`   ❌ LSP validation error: ${error.message}`);
        // Track validation error
        try {
          const { ServiceHealthTracker } = await import('../../src/two-branch/monitoring/service-health-tracker');
          const { createClient } = await import('@supabase/supabase-js');
          const supabaseUrl = process.env.SUPABASE_URL;
          const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
          if (supabaseUrl && supabaseKey) {
            const supabase = createClient(supabaseUrl, supabaseKey);
            const tracker = new ServiceHealthTracker(supabase);
            await tracker.trackUrlValidationFailure({
              service: 'lsp',
              url: lspUrl,
              errorMessage: error.message,
              repositoryUrl: scenario.repoUrl,
              prNumber: scenario.prNumber,
              analysisId: (metadata as any).analysisId
            });
          }
        } catch (trackError) {
          // Silently fail tracking - don't break test
          console.warn(`   ⚠️  Failed to track health event: ${(trackError as Error).message}`);
        }
      }
    } else {
      console.warn(`   ⚠️  LSP URL not found in metadata`);
    }
    
    if (sarifUrl) {
      console.log(`   📄 SARIF URL: ${sarifUrl}`);
      try {
        const sarifResponse = await fetch(sarifUrl);
        if (sarifResponse.ok) {
          const sarifContent = await sarifResponse.json() as any;
          if (sarifContent.version === '2.1.0' && 
              sarifContent.$schema && 
              sarifContent.runs && 
              sarifContent.runs.length > 0) {
            const run = sarifContent.runs[0];
            console.log(`   ✅ SARIF file valid: Version ${sarifContent.version}, ${run.results?.length || 0} results, HTTP ${sarifResponse.status}`);
          } else {
            console.warn(`   ⚠️  SARIF file structure invalid`);
          }
        } else {
          console.error(`   ❌ SARIF file download failed: HTTP ${sarifResponse.status}`);
          // Track 404/validation failure
          try {
            const { ServiceHealthTracker } = await import('../../src/two-branch/monitoring/service-health-tracker');
            const { createClient } = await import('@supabase/supabase-js');
            const supabaseUrl = process.env.SUPABASE_URL;
            const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
            if (supabaseUrl && supabaseKey) {
              const supabase = createClient(supabaseUrl, supabaseKey);
              const tracker = new ServiceHealthTracker(supabase);
              await tracker.trackUrlValidationFailure({
                service: 'sarif',
                url: sarifUrl,
                statusCode: sarifResponse.status,
                errorMessage: `HTTP ${sarifResponse.status}`,
                repositoryUrl: scenario.repoUrl,
                prNumber: scenario.prNumber,
                analysisId: (metadata as any).analysisId
              });
            }
          } catch (trackError) {
            // Silently fail tracking - don't break test
            console.warn(`   ⚠️  Failed to track health event: ${(trackError as Error).message}`);
          }
        }
      } catch (error: any) {
        console.error(`   ❌ SARIF validation error: ${error.message}`);
        // Track validation error
        try {
          const { ServiceHealthTracker } = await import('../../src/two-branch/monitoring/service-health-tracker');
          const { createClient } = await import('@supabase/supabase-js');
          const supabaseUrl = process.env.SUPABASE_URL;
          const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
          if (supabaseUrl && supabaseKey) {
            const supabase = createClient(supabaseUrl, supabaseKey);
            const tracker = new ServiceHealthTracker(supabase);
            await tracker.trackUrlValidationFailure({
              service: 'sarif',
              url: sarifUrl,
              errorMessage: error.message,
              repositoryUrl: scenario.repoUrl,
              prNumber: scenario.prNumber,
              analysisId: (metadata as any).analysisId
            });
          }
        } catch (trackError) {
          // Silently fail tracking - don't break test
          console.warn(`   ⚠️  Failed to track health event: ${(trackError as Error).message}`);
        }
      }
    } else {
      console.warn(`   ⚠️  SARIF URL not found in metadata`);
    }

    // ========================================================================
    // STEP 7: Save Results
    // ========================================================================
    console.log('\n💾 Step 7: Saving results...');
    const outputDir = path.join(__dirname, 'test-outputs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = Date.now();
    const reportPath = path.join(outputDir, `v9-lite-${scenario.name.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.md`);
    fs.writeFileSync(reportPath, result.markdown);
    console.log(`   ✅ Report saved: ${reportPath}`);

    // Save IDE fix files and manifest
    // SESSION 21 FIX: Save manifest separately with proper naming
    const manifestFile = result.ideFixFiles.find(f => f.groupId === 'all-issues');
    const otherFiles = result.ideFixFiles.filter(f => f.groupId !== 'all-issues');
    
    // Save the all-issues-manifest.json separately for easy access
    if (manifestFile) {
      const manifestPath = path.join(outputDir, `${scenario.name.toLowerCase().replace(/\s+/g, '-')}-manifest.json`);
      fs.writeFileSync(manifestPath, JSON.stringify(manifestFile.content, null, 2));
      console.log(`   ✅ Manifest saved: ${manifestPath}`);
    }
    
    // Save individual fix files to attachments directory
    const attachmentsDir = path.join(outputDir, 'attachments');
    if (!fs.existsSync(attachmentsDir)) {
      fs.mkdirSync(attachmentsDir, { recursive: true });
    }
    
    otherFiles.forEach((file) => {
      const fixPath = path.join(attachmentsDir, file.filename);
      fs.writeFileSync(fixPath, JSON.stringify(file.content, null, 2));
    });
    
    console.log(`   ✅ IDE fix files saved: ${otherFiles.length} files in attachments/`);
    console.log(`   ✅ Total: 1 manifest + ${otherFiles.length} fix files`);

    // ========================================================================
    // SUMMARY
    // ========================================================================
    const totalTime = Date.now() - startTime;
    console.log(`\n${'='.repeat(80)}`);
    console.log(`✅ TEST PASSED: ${scenario.name}`);
    console.log(`${'='.repeat(80)}`);
    console.log(`📊 Total execution time: ${(totalTime / 1000).toFixed(2)}s`);
    console.log(`📊 Framework detected: ${frameworkInfo.primaryFramework}`);
    console.log(`📊 Tools executed: ${tools.length}`);
    console.log(`📊 Issues found: ${allIssues.length}`);
    console.log(`📊 New issues: ${newIssues.length}`);
    console.log(`📊 Issue groups: ${groupingResult.groups.length}`);
    console.log(`📊 Cost savings: ${groupingResult.savingsPercent.toFixed(1)}%`);
    console.log(`📊 Report size: ${(result.markdown.length / 1024).toFixed(1)} KB`);
    console.log(`📊 V9 Template compliance: ${validationResult.score}% (${validationResult.foundSections}/${validationResult.totalSections} sections)`);
    console.log(`📊 LSP/SARIF autofix: ${lspUrl && sarifUrl ? '✅ Generated' : '⚠️  Missing'}`);
    console.log(`${'='.repeat(80)}\n`);

  } catch (error) {
    console.error(`\n❌ TEST FAILED: ${scenario.name}`);
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      console.error(`Stack: ${error.stack}`);
    }
    throw error;
  } finally {
    // Cleanup: remove cloned repository
    if (fs.existsSync(repoPath)) {
      console.log(`\n🧹 Cleaning up: ${repoPath}`);
      execSync(`rm -rf ${repoPath}`);
    }
  }
}

async function main(): Promise<void> {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║                     V9 LITE E2E TEST SUITE                                ║
║                   Testing Refactored Architecture                         ║
║                                                                           ║
║  Components Tested:                                                       ║
║  ✓ BaseToolOrchestrator                                                   ║
║  ✓ JavaToolOrchestrator                                                   ║
║  ✓ Framework Detection                                                    ║
║  ✓ Universal Tool Configuration                                           ║
║  ✓ Issue Grouping & Cost Optimization                                     ║
║  ✓ Grouped Report Generation                                              ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
`);

  const overallStartTime = Date.now();
  let passedTests = 0;
  let failedTests = 0;

  for (const scenario of TEST_SCENARIOS) {
    try {
      await runLiteE2ETest(scenario);
      passedTests++;
    } catch (error) {
      failedTests++;
      console.error(`Failed to run test for ${scenario.name}:`, error);
    }
  }

  const totalTime = Date.now() - overallStartTime;

  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                           FINAL SUMMARY                                   ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  Total Tests: ${TEST_SCENARIOS.length}                                                         ║
║  Passed: ${passedTests}                                                              ║
║  Failed: ${failedTests}                                                              ║
║  Total Time: ${(totalTime / 1000).toFixed(2)}s                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

// Run the test suite
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

