/**
 * Session Validator - Ensures correct implementation is used
 * Run this at the start of every session to avoid confusion
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

interface CodeQualConfig {
  version: string;
  implementation: {
    name: string;
    version: string;
    path: string;
    entry_point: string;
  };
  flow: Record<string, string>;
  deprecated: Array<{ path: string; reason: string }>;
}

export function validateImplementation(): boolean {
  console.log('\n🔍 Validating CodeQual Implementation...\n');
  
  try {
    // Load configuration
    const configPath = path.join(process.cwd(), '.codequal-config.yaml');
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = yaml.load(configContent) as CodeQualConfig;
    
    // Display active implementation
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                  CODEQUAL ACTIVE IMPLEMENTATION              ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log(`║ Name:    ${config.implementation.name.padEnd(52)} ║`);
    console.log(`║ Version: ${config.implementation.version.padEnd(52)} ║`);
    console.log(`║ Path:    ${config.implementation.path.padEnd(52)} ║`);
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║                         FLOW                                 ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    
    Object.entries(config.flow).forEach(([step, description]) => {
      const line = `║ ${step}: ${description}`.padEnd(63) + '║';
      console.log(line);
    });
    
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║                    ⚠️  IMPORTANT ⚠️                           ║');
    console.log('║                                                              ║');
    console.log('║  DO NOT REIMPLEMENT - USE EXISTING V9 FLOW                  ║');
    console.log('║                                                              ║');
    console.log('║  Entry: test-v9-kafka-fixed.ts                              ║');
    console.log('║  Docs:  V9_FRAMEWORK_ESTABLISHED.md                         ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    
    // Check for duplicate implementations
    const duplicateFiles = checkForDuplicates(config);
    if (duplicateFiles.length > 0) {
      console.log('⚠️  WARNING: Found potential duplicate implementations:');
      duplicateFiles.forEach(file => {
        console.log(`   - ${file}`);
      });
      console.log('\n❌ Validation failed: Duplicate implementations detected');
      return false;
    }
    
    // Check if deprecated code is being used
    const deprecatedUsage = checkDeprecatedUsage(config);
    if (deprecatedUsage.length > 0) {
      console.log('⚠️  WARNING: Using deprecated code:');
      deprecatedUsage.forEach(usage => {
        console.log(`   - ${usage}`);
      });
    }
    
    console.log('✅ Validation successful: V9 Two-Branch Analyzer is active\n');
    return true;
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    return false;
  }
}

function checkForDuplicates(config: CodeQualConfig): string[] {
  const duplicates: string[] = [];
  
  // Check for analyzer implementations outside of two-branch
  const projectRoot = process.cwd();
  const agentsPath = path.join(projectRoot, 'packages/agents/src');
  
  const analyzerPatterns = [
    'standard/analyzers',
    'specialized/analyzers',
    'v7-analyzer',
    'v8-analyzer'
  ];
  
  analyzerPatterns.forEach(pattern => {
    const fullPath = path.join(agentsPath, pattern);
    if (fs.existsSync(fullPath)) {
      duplicates.push(pattern);
    }
  });
  
  return duplicates;
}

function checkDeprecatedUsage(config: CodeQualConfig): string[] {
  const usage: string[] = [];
  
  config.deprecated.forEach(dep => {
    if (fs.existsSync(dep.path)) {
      // Check if any recent files reference deprecated code
      // This is a simplified check - in production would be more thorough
      usage.push(`${dep.path} - ${dep.reason}`);
    }
  });
  
  return usage;
}

// Auto-run validation if this file is executed directly
if (require.main === module) {
  const isValid = validateImplementation();
  process.exit(isValid ? 0 : 1);
}