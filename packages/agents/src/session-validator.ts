/**
 * Enhanced Session Validator - Comprehensive Framework Duplication Prevention
 * MANDATORY: Run this at the start of EVERY session to prevent duplication
 * 
 * This validator enforces the single source of truth for the V9 Framework
 * and prevents accidental recreation of existing components.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as yaml from 'js-yaml';

interface CodeQualConfig {
  version: string;
  last_updated: string;
  session_id: string;
  implementation: {
    name: string;
    version: string;
    status: string;
    path: string;
    entry_point: string;
    documentation: string;
    test_file: string;
    locked: boolean;
    creation_date: string;
  };
  flow: Record<string, string>;
  components: Record<string, Record<string, string>>;
  deprecated: Array<{ path: string; reason: string; deprecated_date: string }>;
  forbidden_patterns: {
    file_names: string[];
    directory_names: string[];
    code_patterns: string[];
  };
  naming_conventions: Record<string, {
    pattern: string;
    location: string;
    example: string;
  }>;
  validation: {
    pre_session_checks: string[];
    file_creation_guards: string[];
    git_hook_checks: string[];
  };
}

interface ComponentManifest {
  manifest_version: string;
  generated_at: string;
  framework: {
    name: string;
    version: string;
    status: string;
    locked: boolean;
    checksum: string;
  };
  components: Record<string, Record<string, ComponentInfo>>;
  deprecated_components: Record<string, DeprecatedComponent>;
  forbidden_patterns: {
    file_creation: {
      analyzer_duplicates: string[];
      directory_duplicates: string[];
    };
    code_patterns: {
      hardcoded_models: string[];
      file_selection_violations: string[];
    };
  };
}

interface ComponentInfo {
  path: string;
  type: string;
  status: string;
  locked: boolean;
  dependencies?: string[];
  checksum: string;
  last_modified: string;
  purpose: string;
  extends?: string;
  language?: string;
}

interface DeprecatedComponent {
  status: string;
  replacement: string;
  deprecation_date: string;
  removal_date?: string;
  warning: string;
}

export function validateImplementation(): boolean {
  console.log('\n🔍 COMPREHENSIVE FRAMEWORK VALIDATION\n');
  console.log('🛡️  Preventing Framework Duplication - V9 Protection Active\n');
  
  try {
    // Load configuration and manifest
    const configPath = path.join(process.cwd(), '.codequal-config.yaml');
    const manifestPath = path.join(process.cwd(), '.codequal-manifest.json');
    
    if (!fs.existsSync(configPath)) {
      console.error('❌ CRITICAL: .codequal-config.yaml not found!');
      console.error('   Framework registry missing - duplication prevention disabled');
      return false;
    }
    
    if (!fs.existsSync(manifestPath)) {
      console.error('❌ CRITICAL: .codequal-manifest.json not found!');
      console.error('   Component manifest missing - duplication detection disabled');
      return false;
    }
    
    const configContent = fs.readFileSync(configPath, 'utf8');
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    
    const config = yaml.load(configContent) as CodeQualConfig;
    const manifest = JSON.parse(manifestContent) as ComponentManifest;
    
    // Display framework status
    displayFrameworkStatus(config, manifest);
    
    // Run comprehensive validation checks
    const validationResults = runValidationChecks(config, manifest);
    
    if (!validationResults.success) {
      console.log('\n❌ VALIDATION FAILED - FRAMEWORK DUPLICATION RISKS DETECTED');
      console.log('\n🚨 Critical Issues:');
      validationResults.errors.forEach(error => {
        console.log(`   ❌ ${error}`);
      });
      
      if (validationResults.warnings.length > 0) {
        console.log('\n⚠️  Warnings:');
        validationResults.warnings.forEach(warning => {
          console.log(`   ⚠️  ${warning}`);
        });
      }
      
      console.log('\n📖 Remediation Steps:');
      console.log('   1. Remove duplicate files listed above');
      console.log('   2. Use existing V9 framework components only');
      console.log('   3. Check V9_FRAMEWORK_ESTABLISHED.md for guidance');
      console.log('   4. Run validation again before proceeding');
      
      return false;
    }
    
    if (validationResults.warnings.length > 0) {
      console.log('\n⚠️  Warnings (non-blocking):');
      validationResults.warnings.forEach(warning => {
        console.log(`   ⚠️  ${warning}`);
      });
    }
    
    console.log('\n✅ VALIDATION SUCCESSFUL - Framework Protection Active');
    console.log('🔒 V9 Two-Branch Analyzer is the ONLY active implementation');
    console.log('🛡️  Duplication prevention measures in place\n');
    
    return true;
    
  } catch (error) {
    console.error('❌ CRITICAL VALIDATION ERROR:', error);
    console.error('   Framework protection compromised - manual review required');
    return false;
  }
}

interface ValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
}

function displayFrameworkStatus(config: CodeQualConfig, manifest: ComponentManifest): void {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║                    FRAMEWORK PROTECTION STATUS                    ║');
  console.log('╠════════════════════════════════════════════════════════════════════╣');
  console.log(`║ Framework: ${config.implementation.name.padEnd(54)} ║`);
  console.log(`║ Version:   ${config.implementation.version.padEnd(54)} ║`);
  console.log(`║ Status:    ${config.implementation.status.padEnd(54)} ║`);
  console.log(`║ Locked:    ${config.implementation.locked ? 'YES (Protected)' : 'NO (Vulnerable)'.padEnd(54)} ║`);
  console.log('╠════════════════════════════════════════════════════════════════════╣');
  console.log('║                        ACTIVE COMPONENTS                           ║');
  console.log('╠════════════════════════════════════════════════════════════════════╣');
  
  let componentCount = 0;
  Object.values(manifest.components).forEach(category => {
    componentCount += Object.keys(category).length;
  });
  
  console.log(`║ Total Components: ${componentCount.toString().padEnd(52)} ║`);
  console.log(`║ Core Analyzers:   ${Object.keys(manifest.components.core_analyzers || {}).length.toString().padEnd(52)} ║`);
  console.log(`║ Language Analyzers: ${Object.keys(manifest.components.language_analyzers || {}).length.toString().padEnd(50)} ║`);
  console.log('╠════════════════════════════════════════════════════════════════════╣');
  console.log('║                     🛡️  PROTECTION ACTIVE 🛡️                       ║');
  console.log('║                                                                    ║');
  console.log('║  ❌ DO NOT CREATE NEW ANALYZERS                                   ║');
  console.log('║  ❌ DO NOT DUPLICATE EXISTING COMPONENTS                          ║');
  console.log('║  ✅ USE EXISTING V9 FRAMEWORK ONLY                                ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');
}

function runValidationChecks(config: CodeQualConfig, manifest: ComponentManifest): ValidationResult {
  const result: ValidationResult = {
    success: true,
    errors: [],
    warnings: []
  };

  // 1. Check for duplicate analyzers
  const duplicateAnalyzers = checkForDuplicateAnalyzers(config, manifest);
  if (duplicateAnalyzers.length > 0) {
    result.success = false;
    duplicateAnalyzers.forEach(dup => {
      result.errors.push(`Duplicate analyzer found: ${dup}`);
    });
  }

  // 2. Check for forbidden file patterns
  const forbiddenFiles = checkForbiddenFilePatterns(config, manifest);
  if (forbiddenFiles.length > 0) {
    result.success = false;
    forbiddenFiles.forEach(file => {
      result.errors.push(`Forbidden file pattern detected: ${file}`);
    });
  }

  // 3. Check for deprecated code usage
  const deprecatedUsage = checkDeprecatedUsage(config);
  deprecatedUsage.forEach(usage => {
    result.warnings.push(`Deprecated code in use: ${usage}`);
  });

  // 4. Validate component integrity
  const integrityIssues = validateComponentIntegrity(manifest);
  integrityIssues.forEach(issue => {
    result.warnings.push(`Component integrity: ${issue}`);
  });

  // 5. Check naming conventions
  const namingViolations = checkNamingConventions(config, manifest);
  namingViolations.forEach(violation => {
    result.warnings.push(`Naming convention violation: ${violation}`);
  });

  // 6. Validate framework lock status
  if (!config.implementation.locked) {
    result.errors.push('Framework is not locked - duplication prevention disabled');
    result.success = false;
  }

  return result;
}

function checkForDuplicateAnalyzers(config: CodeQualConfig, manifest: ComponentManifest): string[] {
  const duplicates: string[] = [];
  const projectRoot = process.cwd();
  
  // Check for analyzer implementations outside of two-branch
  const forbiddenPaths = [
    'packages/agents/src/standard/analyzers',
    'packages/agents/src/specialized/analyzers',
    'packages/agents/src/analyzers',
    'packages/agents/src/new-analyzers',
    'packages/agents/src/improved-analyzers'
  ];
  
  forbiddenPaths.forEach(forbiddenPath => {
    const fullPath = path.join(projectRoot, forbiddenPath);
    if (fs.existsSync(fullPath)) {
      duplicates.push(forbiddenPath);
    }
  });

  // Check for forbidden file patterns in project
  const forbiddenPatterns = manifest.forbidden_patterns.file_creation.analyzer_duplicates;
  
  function scanDirectory(dirPath: string, relativePath = ''): void {
    if (!fs.existsSync(dirPath)) return;
    
    const items = fs.readdirSync(dirPath);
    items.forEach(item => {
      const itemPath = path.join(dirPath, item);
      const relativeItemPath = path.join(relativePath, item);
      
      if (fs.statSync(itemPath).isDirectory()) {
        // Check for forbidden directory patterns
        manifest.forbidden_patterns.file_creation.directory_duplicates.forEach(pattern => {
          if (matchesPattern(item, pattern) && !relativeItemPath.includes('two-branch/analyzers')) {
            duplicates.push(`Forbidden directory: ${relativeItemPath}`);
          }
        });
        scanDirectory(itemPath, relativeItemPath);
      } else {
        // Check for forbidden file patterns
        forbiddenPatterns.forEach(pattern => {
          if (matchesPattern(item, pattern)) {
            duplicates.push(`Forbidden file: ${relativeItemPath}`);
          }
        });
      }
    });
  }
  
  scanDirectory(path.join(projectRoot, 'packages/agents/src'));
  
  return duplicates;
}

function checkForbiddenFilePatterns(config: CodeQualConfig, manifest: ComponentManifest): string[] {
  const violations: string[] = [];
  const projectRoot = process.cwd();
  
  // Scan for forbidden code patterns in TypeScript files
  function scanFileContent(filePath: string): void {
    if (!filePath.endsWith('.ts') || filePath.includes('node_modules')) return;
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check for hardcoded models
      manifest.forbidden_patterns.code_patterns.hardcoded_models.forEach(pattern => {
        if (content.includes(pattern)) {
          violations.push(`Hardcoded model pattern in ${filePath}: ${pattern}`);
        }
      });
      
      // Check for file selection violations  
      manifest.forbidden_patterns.code_patterns.file_selection_violations.forEach(pattern => {
        if (content.includes(pattern)) {
          violations.push(`File selection violation in ${filePath}: ${pattern}`);
        }
      });
      
    } catch (error) {
      // Skip files that can't be read
    }
  }
  
  function scanDirectoryForContent(dirPath: string): void {
    if (!fs.existsSync(dirPath)) return;
    
    const items = fs.readdirSync(dirPath);
    items.forEach(item => {
      const itemPath = path.join(dirPath, item);
      
      if (fs.statSync(itemPath).isDirectory()) {
        scanDirectoryForContent(itemPath);
      } else {
        scanFileContent(itemPath);
      }
    });
  }
  
  scanDirectoryForContent(path.join(projectRoot, 'packages/agents/src'));
  
  return violations;
}

function checkDeprecatedUsage(config: CodeQualConfig): string[] {
  const usage: string[] = [];
  const projectRoot = process.cwd();
  
  config.deprecated.forEach(dep => {
    const fullPath = path.join(projectRoot, dep.path);
    if (fs.existsSync(fullPath)) {
      usage.push(`${dep.path} - ${dep.reason} (deprecated: ${dep.deprecated_date})`);
    }
  });
  
  return usage;
}

function validateComponentIntegrity(manifest: ComponentManifest): string[] {
  const issues: string[] = [];
  const projectRoot = process.cwd();
  
  // Check if core components exist
  Object.entries(manifest.components).forEach(([category, components]) => {
    Object.entries(components).forEach(([name, info]) => {
      const fullPath = path.join(projectRoot, info.path);
      if (!fs.existsSync(fullPath)) {
        issues.push(`Missing component: ${name} at ${info.path}`);
      }
    });
  });
  
  return issues;
}

function checkNamingConventions(config: CodeQualConfig, manifest: ComponentManifest): string[] {
  const violations: string[] = [];
  const projectRoot = process.cwd();
  
  // Check analyzer naming conventions
  const analyzerLocation = path.join(projectRoot, 'packages/agents/src/two-branch/analyzers');
  if (fs.existsSync(analyzerLocation)) {
    const files = fs.readdirSync(analyzerLocation);
    files.forEach(file => {
      if (file.endsWith('.ts') && file.startsWith('v9-') && file.includes('analyzer')) {
        const expectedPattern = /^v9-[a-z]+-analyzer\.ts$/;
        if (!expectedPattern.test(file) && !file.includes('framework') && !file.includes('factory')) {
          violations.push(`Analyzer naming violation: ${file} (should match v9-{language}-analyzer.ts)`);
        }
      }
    });
  }
  
  return violations;
}

function matchesPattern(fileName: string, pattern: string): boolean {
  // Convert glob pattern to regex
  const regexPattern = pattern
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.')
    .replace(/\[([^\]]*)\]/g, '[$1]');
  
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(fileName);
}

// Auto-run validation if this file is executed directly
if (require.main === module) {
  const isValid = validateImplementation();
  process.exit(isValid ? 0 : 1);
}