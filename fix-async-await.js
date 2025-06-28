#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get all TypeScript errors
const errors = execSync('npm run build 2>&1 || true', { 
  encoding: 'utf8',
  cwd: '/Users/alpinro/Code Prjects/codequal'
});

// Parse errors for async/await issues
const asyncErrors = errors.split('\n')
  .filter(line => line.includes('Property') && line.includes('does not exist on type \'Promise<'))
  .map(line => {
    const match = line.match(/(.+\.ts)\((\d+),(\d+)\): error TS(\d+): Property '(.+)' does not exist on type 'Promise<(.+)>'/);
    if (match) {
      return {
        file: match[1],
        line: parseInt(match[2]),
        column: parseInt(match[3]),
        property: match[5],
        promiseType: match[6]
      };
    }
    return null;
  })
  .filter(Boolean);

// Group by file
const errorsByFile = {};
asyncErrors.forEach(error => {
  // Handle different path formats in error messages
  let fullPath = error.file;
  if (!fullPath.startsWith('/')) {
    // Relative path from different package directories
    if (fullPath.startsWith('src/')) {
      // Could be from packages/core, packages/agents, etc.
      const possiblePaths = [
        path.join('/Users/alpinro/Code Prjects/codequal/packages/core', error.file),
        path.join('/Users/alpinro/Code Prjects/codequal/packages/agents', error.file),
        path.join('/Users/alpinro/Code Prjects/codequal/packages/test-integration', error.file),
        path.join('/Users/alpinro/Code Prjects/codequal/apps/api', error.file)
      ];
      fullPath = possiblePaths.find(p => fs.existsSync(p)) || fullPath;
    } else {
      fullPath = path.join('/Users/alpinro/Code Prjects/codequal', error.file);
    }
  }
  
  if (!errorsByFile[fullPath]) {
    errorsByFile[fullPath] = [];
  }
  errorsByFile[fullPath].push(error);
});

// Fix each file
Object.entries(errorsByFile).forEach(([filePath, errors]) => {
  console.log(`Fixing ${errors.length} async/await errors in ${path.basename(filePath)}`);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    // Sort errors by line number in reverse order to avoid line number shifts
    errors.sort((a, b) => b.line - a.line);
    
    errors.forEach(error => {
      const lineIndex = error.line - 1;
      const line = lines[lineIndex];
      
      // Look for common patterns that need await
      const patterns = [
        // const result = method(); if (result.property)
        /^(\s*)(const|let)\s+(\w+)\s*=\s*([^;]+(?:findOptimalModel|getCanonicalVersion|updateModelVersion|registerModel|research|getOptimalModelConfigs)[^;]*);/,
        // Direct property access: method().property
        /^(\s*)(.+?)([^;]+(?:findOptimalModel|getCanonicalVersion|updateModelVersion|registerModel|research|getOptimalModelConfigs)[^;\.]+)\.(\w+)/
      ];
      
      let fixed = false;
      for (const pattern of patterns) {
        if (pattern.test(line)) {
          // Add await if not already present
          if (!line.includes('await')) {
            lines[lineIndex] = line.replace(pattern, (match, ...groups) => {
              if (patterns.indexOf(pattern) === 0) {
                // Pattern 1: variable assignment
                return `${groups[0]}${groups[1]} ${groups[2]} = await ${groups[3]};`;
              } else {
                // Pattern 2: direct property access
                return `${groups[0]}${groups[1]}(await ${groups[2]}).${groups[3]}`;
              }
            });
            fixed = true;
            break;
          }
        }
      }
      
      if (!fixed) {
        console.log(`  - Could not auto-fix line ${error.line}: ${line.trim()}`);
      }
    });
    
    // Write back
    content = lines.join('\n');
    fs.writeFileSync(filePath, content);
    console.log(`  ✓ Fixed ${filePath}`);
    
  } catch (err) {
    console.error(`  ✗ Error fixing ${filePath}:`, err.message);
  }
});

console.log('\nAsync/await fixes applied. Run build again to check remaining errors.');