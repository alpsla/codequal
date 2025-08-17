/**
 * Test Coverage Detector
 * 
 * Detects test files and calculates test coverage metrics from repository structure.
 * Fixes BUG-026: Test Coverage Detection Failure - shows 0% coverage for repositories with comprehensive test suites
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

export interface TestCoverageMetrics {
  overall: number;
  testFiles: number;
  sourceFiles: number;
  testToSourceRatio: number;
  testFrameworks: string[];
  hasTests: boolean;
  testPatterns: {
    unit: number;
    integration: number;
    e2e: number;
  };
}

export interface TestFileInfo {
  path: string;
  type: 'unit' | 'integration' | 'e2e' | 'unknown';
  framework?: string;
  lines?: number;
}

export class TestCoverageDetector {
  private readonly testFilePatterns = [
    // Common test file patterns
    '**/*.test.{ts,tsx,js,jsx}',
    '**/*.spec.{ts,tsx,js,jsx}',
    '**/*_test.{ts,tsx,js,jsx}',
    '**/*_spec.{ts,tsx,js,jsx}',
    '**/test_*.{ts,tsx,js,jsx}',
    '**/spec_*.{ts,tsx,js,jsx}',
    
    // Test directories
    '**/test/**/*.{ts,tsx,js,jsx}',
    '**/tests/**/*.{ts,tsx,js,jsx}',
    '**/spec/**/*.{ts,tsx,js,jsx}',
    '**/specs/**/*.{ts,tsx,js,jsx}',
    '**/__tests__/**/*.{ts,tsx,js,jsx}',
    '**/__test__/**/*.{ts,tsx,js,jsx}',
    
    // E2E test patterns
    '**/e2e/**/*.{ts,tsx,js,jsx}',
    '**/cypress/**/*.{ts,tsx,js,jsx}',
    '**/playwright/**/*.{ts,tsx,js,jsx}',
    
    // Integration test patterns
    '**/integration/**/*.{ts,tsx,js,jsx}',
    '**/functional/**/*.{ts,tsx,js,jsx}',
    
    // Python test patterns
    '**/test_*.py',
    '**/*_test.py',
    '**/tests/**/*.py',
    '**/test/**/*.py',
    
    // Go test patterns
    '**/*_test.go',
    
    // Java test patterns
    '**/test/**/*.java',
    '**/src/test/**/*.java',
    '**/*Test.java',
    '**/*Tests.java',
    
    // Ruby test patterns
    '**/*_spec.rb',
    '**/spec/**/*.rb',
    '**/*_test.rb',
    '**/test/**/*.rb',
    
    // Rust test patterns
    '**/tests/**/*.rs',
    
    // C# test patterns
    '**/*Test.cs',
    '**/*Tests.cs',
    '**/Tests/**/*.cs',
    '**/*.Test.cs',
    '**/*.Tests.cs'
  ];

  private readonly sourceFilePatterns = [
    // JavaScript/TypeScript
    '**/*.{ts,tsx,js,jsx}',
    
    // Python
    '**/*.py',
    
    // Go
    '**/*.go',
    
    // Java
    '**/*.java',
    
    // Ruby
    '**/*.rb',
    
    // Rust
    '**/*.rs',
    
    // C#
    '**/*.cs',
    
    // C/C++
    '**/*.{c,cpp,cc,cxx,h,hpp}'
  ];

  private readonly excludePatterns = [
    '**/node_modules/**',
    '**/vendor/**',
    '**/dist/**',
    '**/build/**',
    '**/coverage/**',
    '**/.git/**',
    '**/target/**',
    '**/out/**',
    '**/bin/**',
    '**/obj/**',
    '**/*.min.js',
    '**/*.bundle.js',
    '**/package-lock.json',
    '**/yarn.lock',
    '**/.next/**',
    '**/.nuxt/**',
    '**/public/**',
    '**/static/**'
  ];

  /**
   * Detect test coverage metrics from repository structure
   */
  async detectTestCoverage(repoPath: string): Promise<TestCoverageMetrics> {
    try {
      // Find all test files
      const testFiles = await this.findTestFiles(repoPath);
      
      // Find all source files
      const sourceFiles = await this.findSourceFiles(repoPath);
      
      // Detect test frameworks
      const testFrameworks = await this.detectTestFrameworks(repoPath);
      
      // Categorize test files
      const testPatterns = this.categorizeTestFiles(testFiles);
      
      // Calculate metrics
      const testFileCount = testFiles.length;
      const sourceFileCount = sourceFiles.length;
      const testToSourceRatio = sourceFileCount > 0 ? testFileCount / sourceFileCount : 0;
      
      // Calculate overall coverage estimate
      // This is a heuristic based on test file presence and ratio
      let overall = 0;
      if (testFileCount > 0) {
        // Base coverage from test/source ratio
        const ratioScore = Math.min(testToSourceRatio * 100, 40);
        
        // Bonus for having different test types
        const testTypeBonus = 
          (testPatterns.unit > 0 ? 20 : 0) +
          (testPatterns.integration > 0 ? 15 : 0) +
          (testPatterns.e2e > 0 ? 15 : 0);
        
        // Bonus for using test frameworks
        const frameworkBonus = Math.min(testFrameworks.length * 5, 10);
        
        overall = Math.min(ratioScore + testTypeBonus + frameworkBonus, 95);
        
        // Adjust based on test/source ratio
        if (testToSourceRatio >= 0.8) {
          overall = Math.max(overall, 85);
        } else if (testToSourceRatio >= 0.5) {
          overall = Math.max(overall, 70);
        } else if (testToSourceRatio >= 0.3) {
          overall = Math.max(overall, 60);
        } else if (testToSourceRatio >= 0.1) {
          overall = Math.max(overall, 40);
        }
      }
      
      return {
        overall: Math.round(overall),
        testFiles: testFileCount,
        sourceFiles: sourceFileCount,
        testToSourceRatio: Math.round(testToSourceRatio * 100) / 100,
        testFrameworks,
        hasTests: testFileCount > 0,
        testPatterns
      };
    } catch (error) {
      console.error('Error detecting test coverage:', error);
      return {
        overall: 0,
        testFiles: 0,
        sourceFiles: 0,
        testToSourceRatio: 0,
        testFrameworks: [],
        hasTests: false,
        testPatterns: {
          unit: 0,
          integration: 0,
          e2e: 0
        }
      };
    }
  }

  /**
   * Find all test files in the repository
   */
  private async findTestFiles(repoPath: string): Promise<TestFileInfo[]> {
    const testFiles: TestFileInfo[] = [];
    
    for (const pattern of this.testFilePatterns) {
      try {
        const files = await new Promise<string[]>((resolve, reject) => {
          glob(pattern, {
            ignore: this.excludePatterns,
            absolute: false
          }, (err: Error | null, matches: string[]) => {
            if (err) reject(err);
            else resolve(matches);
          });
        });
        
        for (const file of files) {
          if (!testFiles.some(tf => tf.path === file)) {
            testFiles.push({
              path: file,
              type: this.determineTestType(file)
            });
          }
        }
      } catch (error) {
        // Continue with other patterns if one fails
        continue;
      }
    }
    
    return testFiles;
  }

  /**
   * Find all source files in the repository
   */
  private async findSourceFiles(repoPath: string): Promise<string[]> {
    const sourceFiles = new Set<string>();
    
    for (const pattern of this.sourceFilePatterns) {
      try {
        const files = await new Promise<string[]>((resolve, reject) => {
          glob(pattern, {
            ignore: [...this.excludePatterns, ...this.testFilePatterns],
            absolute: false
          }, (err: Error | null, matches: string[]) => {
            if (err) reject(err);
            else resolve(matches);
          });
        });
        
        for (const file of files) {
          // Exclude test files that might match source patterns
          if (!this.isTestFile(file)) {
            sourceFiles.add(file);
          }
        }
      } catch (error) {
        // Continue with other patterns if one fails
        continue;
      }
    }
    
    return Array.from(sourceFiles);
  }

  /**
   * Detect test frameworks used in the repository
   */
  private async detectTestFrameworks(repoPath: string): Promise<string[]> {
    const frameworks = new Set<string>();
    
    // Check package.json for JavaScript/TypeScript frameworks
    const packageJsonPath = path.join(repoPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        const deps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies
        };
        
        // JavaScript/TypeScript test frameworks
        if (deps.jest || deps['@jest/core']) frameworks.add('Jest');
        if (deps.mocha) frameworks.add('Mocha');
        if (deps.jasmine) frameworks.add('Jasmine');
        if (deps.vitest) frameworks.add('Vitest');
        if (deps['@testing-library/react']) frameworks.add('React Testing Library');
        if (deps.cypress) frameworks.add('Cypress');
        if (deps.playwright || deps['@playwright/test']) frameworks.add('Playwright');
        if (deps.puppeteer) frameworks.add('Puppeteer');
        if (deps.karma) frameworks.add('Karma');
        if (deps.ava) frameworks.add('AVA');
        if (deps.tape) frameworks.add('Tape');
        if (deps['@angular/core'] && deps['@angular/cli']) frameworks.add('Angular Testing');
        if (deps['@vue/test-utils']) frameworks.add('Vue Test Utils');
      } catch (error) {
        // Continue if package.json parsing fails
      }
    }
    
    // Check for Python test frameworks
    const requirementsPath = path.join(repoPath, 'requirements.txt');
    const pipfilePath = path.join(repoPath, 'Pipfile');
    const pyprojectPath = path.join(repoPath, 'pyproject.toml');
    
    if (fs.existsSync(requirementsPath)) {
      const content = fs.readFileSync(requirementsPath, 'utf-8');
      if (content.includes('pytest')) frameworks.add('pytest');
      if (content.includes('unittest')) frameworks.add('unittest');
      if (content.includes('nose')) frameworks.add('nose');
    }
    
    // Check for Go test framework (built-in)
    const goModPath = path.join(repoPath, 'go.mod');
    if (fs.existsSync(goModPath)) {
      frameworks.add('Go testing');
    }
    
    // Check for Java test frameworks
    const pomPath = path.join(repoPath, 'pom.xml');
    const gradlePath = path.join(repoPath, 'build.gradle');
    
    if (fs.existsSync(pomPath)) {
      const content = fs.readFileSync(pomPath, 'utf-8');
      if (content.includes('junit')) frameworks.add('JUnit');
      if (content.includes('testng')) frameworks.add('TestNG');
      if (content.includes('mockito')) frameworks.add('Mockito');
    }
    
    if (fs.existsSync(gradlePath)) {
      const content = fs.readFileSync(gradlePath, 'utf-8');
      if (content.includes('junit')) frameworks.add('JUnit');
      if (content.includes('testng')) frameworks.add('TestNG');
      if (content.includes('mockito')) frameworks.add('Mockito');
    }
    
    // Check for Ruby test frameworks
    const gemfilePath = path.join(repoPath, 'Gemfile');
    if (fs.existsSync(gemfilePath)) {
      const content = fs.readFileSync(gemfilePath, 'utf-8');
      if (content.includes('rspec')) frameworks.add('RSpec');
      if (content.includes('minitest')) frameworks.add('Minitest');
      if (content.includes('cucumber')) frameworks.add('Cucumber');
    }
    
    // Check for Rust test framework (built-in)
    const cargoPath = path.join(repoPath, 'Cargo.toml');
    if (fs.existsSync(cargoPath)) {
      frameworks.add('Rust testing');
    }
    
    // Check for C# test frameworks
    const csprojFiles = await new Promise<string[]>((resolve, reject) => {
      glob('**/*.csproj', {
        ignore: this.excludePatterns
      }, (err: Error | null, matches: string[]) => {
        if (err) reject(err);
        else resolve(matches);
      });
    });
    
    for (const csproj of csprojFiles) {
      try {
        const content = fs.readFileSync(path.join(repoPath, csproj), 'utf-8');
        if (content.includes('xunit')) frameworks.add('xUnit');
        if (content.includes('nunit')) frameworks.add('NUnit');
        if (content.includes('mstest')) frameworks.add('MSTest');
      } catch (error) {
        continue;
      }
    }
    
    return Array.from(frameworks);
  }

  /**
   * Determine the type of test file
   */
  private determineTestType(filePath: string): 'unit' | 'integration' | 'e2e' | 'unknown' {
    const lowerPath = filePath.toLowerCase();
    
    if (lowerPath.includes('e2e') || 
        lowerPath.includes('cypress') || 
        lowerPath.includes('playwright') ||
        lowerPath.includes('end-to-end') ||
        lowerPath.includes('functional')) {
      return 'e2e';
    }
    
    if (lowerPath.includes('integration') || 
        lowerPath.includes('integ')) {
      return 'integration';
    }
    
    if (lowerPath.includes('unit') || 
        lowerPath.includes('.spec.') || 
        lowerPath.includes('.test.') ||
        lowerPath.includes('_test.') ||
        lowerPath.includes('_spec.')) {
      return 'unit';
    }
    
    return 'unknown';
  }

  /**
   * Check if a file is a test file
   */
  private isTestFile(filePath: string): boolean {
    const lowerPath = filePath.toLowerCase();
    
    return (
      lowerPath.includes('.test.') ||
      lowerPath.includes('.spec.') ||
      lowerPath.includes('_test.') ||
      lowerPath.includes('_spec.') ||
      lowerPath.includes('/test/') ||
      lowerPath.includes('/tests/') ||
      lowerPath.includes('/spec/') ||
      lowerPath.includes('/specs/') ||
      lowerPath.includes('/__tests__/') ||
      lowerPath.includes('/__test__/') ||
      lowerPath.includes('/e2e/') ||
      lowerPath.includes('/cypress/') ||
      lowerPath.includes('/playwright/')
    );
  }

  /**
   * Categorize test files by type
   */
  private categorizeTestFiles(testFiles: TestFileInfo[]): { unit: number; integration: number; e2e: number } {
    const patterns = {
      unit: 0,
      integration: 0,
      e2e: 0
    };
    
    for (const file of testFiles) {
      if (file.type === 'unit') {
        patterns.unit++;
      } else if (file.type === 'integration') {
        patterns.integration++;
      } else if (file.type === 'e2e') {
        patterns.e2e++;
      } else {
        // Count unknown as unit tests by default
        patterns.unit++;
      }
    }
    
    return patterns;
  }
}

// Export singleton instance
export const testCoverageDetector = new TestCoverageDetector();