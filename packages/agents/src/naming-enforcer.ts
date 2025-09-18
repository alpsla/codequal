#!/usr/bin/env node

/**
 * Naming Convention Enforcement System
 * 
 * This system enforces strict naming conventions for the V9 Framework
 * and prevents creation of files that don't follow established patterns.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

interface NamingRule {
  pattern: string;
  location: string;
  example: string;
  description?: string;
  required_prefix?: string;
  required_suffix?: string;
  forbidden_patterns?: string[];
}

interface NamingConfig {
  version: string;
  naming_conventions: Record<string, NamingRule>;
  enforcement_rules: {
    strict_mode: boolean;
    auto_correction: boolean;
    violation_action: 'warn' | 'block' | 'correct';
  };
}

export class NamingEnforcer {
  private config: NamingConfig;
  private projectRoot: string;

  constructor() {
    this.projectRoot = process.cwd();
    this.loadConfiguration();
  }

  private loadConfiguration(): void {
    try {
      const configPath = path.join(this.projectRoot, '.codequal-config.yaml');
      if (!fs.existsSync(configPath)) {
        throw new Error('Configuration file missing');
      }

      const configContent = fs.readFileSync(configPath, 'utf8');
      const fullConfig = yaml.load(configContent) as any;
      
      this.config = {
        version: fullConfig.version,
        naming_conventions: fullConfig.naming_conventions,
        enforcement_rules: {
          strict_mode: true,
          auto_correction: false,
          violation_action: 'block'
        }
      };

    } catch (error) {
      console.error('❌ Naming Enforcer initialization failed:', error);
      throw error;
    }
  }

  public validateFileName(filePath: string): {
    valid: boolean;
    violations: string[];
    suggestions: string[];
  } {
    const fileName = path.basename(filePath);
    const relativePath = path.relative(this.projectRoot, filePath);
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Determine file category
    const category = this.categorizeFile(fileName, relativePath);
    
    if (category === 'unknown') {
      return { valid: true, violations: [], suggestions: [] };
    }

    const rule = this.config.naming_conventions[category];
    if (!rule) {
      return { valid: true, violations: [], suggestions: [] };
    }

    // Validate against pattern
    const isValidPattern = this.matchesPattern(fileName, rule.pattern);
    if (!isValidPattern) {
      violations.push(`File name doesn't match required pattern: ${rule.pattern}`);
      suggestions.push(`Example: ${rule.example}`);
    }

    // Validate location
    const expectedLocationPattern = rule.location.replace(/\/$/, ''); // Remove trailing slash
    if (!relativePath.includes(expectedLocationPattern)) {
      violations.push(`File is not in the correct location: ${rule.location}`);
      suggestions.push(`Move to: ${rule.location}`);
    }

    // Check required prefix/suffix
    if (rule.required_prefix && !fileName.startsWith(rule.required_prefix)) {
      violations.push(`File name must start with: ${rule.required_prefix}`);
      suggestions.push(`Rename to: ${rule.required_prefix}${fileName}`);
    }

    if (rule.required_suffix && !fileName.endsWith(rule.required_suffix)) {
      violations.push(`File name must end with: ${rule.required_suffix}`);
      suggestions.push(`Rename to: ${fileName}${rule.required_suffix}`);
    }

    // Check forbidden patterns
    if (rule.forbidden_patterns) {
      rule.forbidden_patterns.forEach(forbiddenPattern => {
        if (this.matchesPattern(fileName, forbiddenPattern)) {
          violations.push(`File name matches forbidden pattern: ${forbiddenPattern}`);
          suggestions.push('Use a different naming approach');
        }
      });
    }

    return {
      valid: violations.length === 0,
      violations,
      suggestions
    };
  }

  private categorizeFile(fileName: string, relativePath: string): string {
    // Analyzer files
    if (fileName.includes('analyzer') && fileName.endsWith('.ts')) {
      if (fileName.includes('framework')) return 'framework_files';
      if (fileName.includes('factory')) return 'framework_files';
      return 'analyzers';
    }

    // Framework files
    if (fileName.includes('framework') && fileName.endsWith('.ts')) {
      return 'framework_files';
    }

    // Test files
    if (fileName.startsWith('test-') && fileName.endsWith('.ts')) {
      return 'test_files';
    }

    // Utility files
    if (relativePath.includes('utils/') && fileName.endsWith('.ts')) {
      return 'utility_files';
    }

    // Type definition files
    if (fileName.includes('types') && fileName.endsWith('.ts')) {
      return 'type_files';
    }

    return 'unknown';
  }

  private matchesPattern(fileName: string, pattern: string): boolean {
    // Convert naming pattern to regex
    const regexPattern = pattern
      .replace(/\{[^}]+\}/g, '[a-z-]+') // Replace {language} with [a-z-]+
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(fileName);
  }

  public generateCorrectName(fileName: string, category: string, language?: string): string {
    const rule = this.config.naming_conventions[category];
    if (!rule) return fileName;

    let correctedName = rule.example;

    // Replace placeholders with actual values
    if (language) {
      correctedName = correctedName.replace('{language}', language);
    }

    // Extract meaningful parts from original filename
    const baseName = fileName.replace(/\.[^/.]+$/, ''); // Remove extension
    const words = baseName.split(/[-_]/).filter(word => 
      !['analyzer', 'framework', 'test', 'v9', 'v8', 'v7'].includes(word.toLowerCase())
    );

    if (words.length > 0) {
      correctedName = correctedName.replace('{description}', words.join('-').toLowerCase());
    }

    return correctedName;
  }

  public scanProjectForViolations(): {
    totalFiles: number;
    violations: Array<{
      filePath: string;
      violations: string[];
      suggestions: string[];
    }>;
  } {
    const violations: Array<{
      filePath: string;
      violations: string[];
      suggestions: string[];
    }> = [];

    let totalFiles = 0;

    const scanDirectory = (dirPath: string): void => {
      if (!fs.existsSync(dirPath)) return;

      const items = fs.readdirSync(dirPath);
      items.forEach(item => {
        const itemPath = path.join(dirPath, item);

        if (fs.statSync(itemPath).isDirectory()) {
          // Skip certain directories
          if (!['node_modules', '.git', 'dist', 'build'].includes(item)) {
            scanDirectory(itemPath);
          }
        } else if (item.endsWith('.ts')) {
          totalFiles++;
          const result = this.validateFileName(itemPath);
          
          if (!result.valid) {
            violations.push({
              filePath: path.relative(this.projectRoot, itemPath),
              violations: result.violations,
              suggestions: result.suggestions
            });
          }
        }
      });
    };

    const srcPath = path.join(this.projectRoot, 'packages/agents/src');
    scanDirectory(srcPath);

    // Also scan test files in root
    const testFiles = fs.readdirSync(this.projectRoot)
      .filter(file => file.startsWith('test-') && file.endsWith('.ts'));

    testFiles.forEach(file => {
      totalFiles++;
      const filePath = path.join(this.projectRoot, file);
      const result = this.validateFileName(filePath);
      
      if (!result.valid) {
        violations.push({
          filePath: file,
          violations: result.violations,
          suggestions: result.suggestions
        });
      }
    });

    return { totalFiles, violations };
  }

  public generateComplianceReport(): void {
    console.log('\n📋 NAMING CONVENTION COMPLIANCE REPORT\n');

    const { totalFiles, violations } = this.scanProjectForViolations();

    console.log(`📊 Scanned Files: ${totalFiles}`);
    console.log(`✅ Compliant Files: ${totalFiles - violations.length}`);
    console.log(`❌ Violations: ${violations.length}`);

    if (violations.length === 0) {
      console.log('\n🎉 All files follow naming conventions!');
      console.log('🛡️  V9 Framework naming rules are enforced');
      return;
    }

    console.log('\n❌ VIOLATIONS FOUND:\n');

    violations.forEach((violation, index) => {
      console.log(`${index + 1}. ${violation.filePath}`);
      violation.violations.forEach(v => {
        console.log(`   ❌ ${v}`);
      });
      
      if (violation.suggestions.length > 0) {
        console.log('   💡 Suggestions:');
        violation.suggestions.forEach(s => {
          console.log(`      • ${s}`);
        });
      }
      console.log('');
    });

    console.log('📖 To fix violations:');
    console.log('   1. Rename files to follow V9 naming conventions');
    console.log('   2. Move files to correct locations');
    console.log('   3. Use naming patterns from .codequal-config.yaml');
    console.log('   4. Run compliance check again');
  }

  public suggestCorrectNames(filePath: string): string[] {
    const fileName = path.basename(filePath);
    const relativePath = path.relative(this.projectRoot, filePath);
    const category = this.categorizeFile(fileName, relativePath);
    
    const suggestions: string[] = [];

    if (category === 'analyzers') {
      // Suggest language-specific analyzer names
      const languages = ['java', 'python', 'javascript', 'typescript', 'csharp', 'cpp', 'go', 'rust'];
      languages.forEach(lang => {
        suggestions.push(`v9-${lang}-analyzer.ts`);
      });
    } else if (category === 'framework_files') {
      suggestions.push('v9-analyzer-framework.ts');
      suggestions.push('v9-analyzer-factory.ts');
      suggestions.push('v9-report-formatter.ts');
    } else if (category === 'test_files') {
      const baseName = fileName.replace(/^test-/, '').replace(/\.ts$/, '');
      suggestions.push(`test-v9-${baseName}.ts`);
      suggestions.push(`test-v9-integration.ts`);
    }

    return suggestions;
  }

  public validateDirectoryStructure(): {
    valid: boolean;
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check if V9 framework directory structure exists
    const expectedDirs = [
      'packages/agents/src/two-branch/analyzers',
      'packages/agents/src/two-branch/utils',
      'packages/agents/src/two-branch/types'
    ];

    expectedDirs.forEach(dir => {
      const fullPath = path.join(this.projectRoot, dir);
      if (!fs.existsSync(fullPath)) {
        violations.push(`Missing required directory: ${dir}`);
        suggestions.push(`Create directory: mkdir -p ${dir}`);
      }
    });

    // Check for forbidden directories
    const forbiddenDirs = [
      'packages/agents/src/standard/analyzers',
      'packages/agents/src/specialized/analyzers',
      'packages/agents/src/analyzers',
      'packages/agents/src/new-analyzers',
      'packages/agents/src/improved-analyzers'
    ];

    forbiddenDirs.forEach(dir => {
      const fullPath = path.join(this.projectRoot, dir);
      if (fs.existsSync(fullPath)) {
        violations.push(`Forbidden directory exists: ${dir}`);
        suggestions.push(`Remove directory: rm -rf ${dir}`);
      }
    });

    return {
      valid: violations.length === 0,
      violations,
      suggestions
    };
  }

  public enforceNamingOnFile(filePath: string): {
    action: 'approved' | 'blocked' | 'renamed';
    newPath?: string;
    message: string;
  } {
    const result = this.validateFileName(filePath);
    
    if (result.valid) {
      return {
        action: 'approved',
        message: 'File name follows V9 naming conventions'
      };
    }

    if (this.config.enforcement_rules.violation_action === 'block') {
      return {
        action: 'blocked',
        message: `File blocked due to naming violations: ${result.violations.join(', ')}`
      };
    }

    // Auto-correction logic would go here
    return {
      action: 'blocked',
      message: 'Naming violations detected - file creation blocked'
    };
  }
}

// CLI interface
if (require.main === module) {
  const enforcer = new NamingEnforcer();

  const command = process.argv[2];

  switch (command) {
    case 'check':
      console.log('🔍 Running naming convention compliance check...');
      enforcer.generateComplianceReport();
      break;

    case 'validate': {
      const filePath = process.argv[3];
      if (!filePath) {
        console.error('❌ Usage: node naming-enforcer.ts validate <file-path>');
        process.exit(1);
      }

      const result = enforcer.validateFileName(filePath);
      if (result.valid) {
        console.log(`✅ ${filePath} follows naming conventions`);
        process.exit(0);
      } else {
        console.log(`❌ ${filePath} has naming violations:`);
        result.violations.forEach(v => console.log(`   • ${v}`));
        console.log('💡 Suggestions:');
        result.suggestions.forEach(s => console.log(`   • ${s}`));
        process.exit(1);
      }
      break;
    }

    case 'suggest': {
      const targetPath = process.argv[3];
      if (!targetPath) {
        console.error('❌ Usage: node naming-enforcer.ts suggest <file-path>');
        process.exit(1);
      }

      const suggestions = enforcer.suggestCorrectNames(targetPath);
      console.log(`💡 Naming suggestions for ${targetPath}:`);
      suggestions.forEach((suggestion, index) => {
        console.log(`   ${index + 1}. ${suggestion}`);
      });
      break;
    }

    case 'structure': {
      console.log('🏗️  Checking directory structure...');
      const structureResult = enforcer.validateDirectoryStructure();
      if (structureResult.valid) {
        console.log('✅ Directory structure is compliant');
      } else {
        console.log('❌ Directory structure violations:');
        structureResult.violations.forEach(v => console.log(`   • ${v}`));
        console.log('💡 Suggestions:');
        structureResult.suggestions.forEach(s => console.log(`   • ${s}`));
      }
      break;
    }

    default:
      console.log('📏 Naming Convention Enforcer - V9 Framework\n');
      console.log('Usage:');
      console.log('  node naming-enforcer.ts check           - Run compliance check');
      console.log('  node naming-enforcer.ts validate <file> - Validate specific file');
      console.log('  node naming-enforcer.ts suggest <file>  - Get naming suggestions');
      console.log('  node naming-enforcer.ts structure       - Check directory structure');
      break;
  }
}

export default NamingEnforcer;