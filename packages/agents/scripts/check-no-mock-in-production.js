#!/usr/bin/env node

/**
 * Build-time check to prevent mock data in production builds
 * Run this as part of your CI/CD pipeline
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const MOCK_PATTERNS = [
  /getMock\w+\(\)/g,           // getMockData(), getMockAlerts(), etc.
  /mockData/gi,                 // Any mention of mockData
  /mock\s*:/gi,                 // mock: true, etc.
  /returnMockData/g,            // returnMockData functions
  /generateMock/g,              // generateMock functions
  /createFake/g,                // createFake functions
  /dummy\w*Data/g,              // dummyData variables
  /testData(?!\.test)/g,        // testData (except in test files)
  /\.useMockData\(/g,           // .useMockData() calls
  /MOCK_/g,                     // MOCK_ constants
];

const ALLOWED_FILES = [
  '**/*.test.ts',
  '**/*.spec.ts',
  '**/*.test.js',
  '**/*.spec.js',
  '**/test/**',
  '**/tests/**',
  '**/__tests__/**',
  '**/MockDataGuard.ts',  // Our guard file is allowed
  '**/check-no-mock-in-production.js', // This file
];

const CRITICAL_PATHS = [
  '**/agents/**/*.ts',
  '**/platform/**/*.ts',
  '**/security/**/*.ts',
  '**/scanners/**/*.ts',
];

class MockDataChecker {
  constructor() {
    this.violations = [];
    this.warnings = [];
  }

  check() {
    console.log('🔍 Checking for mock data in production code...\n');

    // Get all TypeScript/JavaScript files
    const files = glob.sync('**/*.{ts,js}', {
      ignore: [
        'node_modules/**',
        'dist/**',
        'build/**',
        '.git/**',
        ...ALLOWED_FILES
      ]
    });

    files.forEach(file => {
      this.checkFile(file);
    });

    this.report();
  }

  checkFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const isCritical = CRITICAL_PATHS.some(pattern => 
      glob.minimatch(filePath, pattern)
    );

    lines.forEach((line, index) => {
      MOCK_PATTERNS.forEach(pattern => {
        if (pattern.test(line)) {
          const violation = {
            file: filePath,
            line: index + 1,
            pattern: pattern.toString(),
            content: line.trim(),
            severity: isCritical ? 'CRITICAL' : 'WARNING'
          };

          if (isCritical) {
            this.violations.push(violation);
          } else {
            this.warnings.push(violation);
          }
        }
      });
    });
  }

  report() {
    if (this.violations.length > 0) {
      console.error('❌ CRITICAL: Mock data found in production code!\n');
      
      this.violations.forEach(v => {
        console.error(`  📁 ${v.file}:${v.line}`);
        console.error(`     Pattern: ${v.pattern}`);
        console.error(`     Line: "${v.content}"`);
        console.error('');
      });

      console.error(`\n🚨 Found ${this.violations.length} critical violations!`);
      console.error('These must be fixed before deploying to production.\n');
    }

    if (this.warnings.length > 0) {
      console.warn('⚠️  Warnings: Potential mock data references found:\n');
      
      this.warnings.slice(0, 5).forEach(w => {
        console.warn(`  📁 ${w.file}:${w.line}`);
        console.warn(`     "${w.content}"`);
      });

      if (this.warnings.length > 5) {
        console.warn(`\n  ... and ${this.warnings.length - 5} more warnings`);
      }
    }

    if (this.violations.length === 0 && this.warnings.length === 0) {
      console.log('✅ No mock data found in production code!');
      console.log('Safe to deploy to production.\n');
      process.exit(0);
    }

    if (this.violations.length > 0) {
      // Exit with error code for CI/CD pipeline
      process.exit(1);
    }
  }
}

// Run the checker
const checker = new MockDataChecker();
checker.check();