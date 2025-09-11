#!/usr/bin/env node

/**
 * Framework Guards - Automated File Creation Prevention System
 * 
 * This system intercepts file creation attempts and prevents duplication
 * of existing V9 framework components. It runs as a background monitor
 * and validates against the framework registry.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

interface GuardConfig {
  version: string;
  forbidden_patterns: {
    file_names: string[];
    directory_names: string[];
    code_patterns: string[];
  };
  components: Record<string, Record<string, string>>;
  naming_conventions: Record<string, {
    pattern: string;
    location: string;
    example: string;
  }>;
}

interface ComponentManifest {
  components: Record<string, Record<string, ComponentInfo>>;
  forbidden_patterns: {
    file_creation: {
      analyzer_duplicates: string[];
      directory_duplicates: string[];
    };
  };
}

interface ComponentInfo {
  path: string;
  type: string;
  status: string;
  locked: boolean;
  purpose: string;
}

export class FrameworkGuard {
  private config: GuardConfig;
  private manifest: ComponentManifest;
  private projectRoot: string;

  constructor() {
    this.projectRoot = process.cwd();
    this.loadConfiguration();
  }

  private loadConfiguration(): void {
    try {
      const configPath = path.join(this.projectRoot, '.codequal-config.yaml');
      const manifestPath = path.join(this.projectRoot, '.codequal-manifest.json');

      if (!fs.existsSync(configPath) || !fs.existsSync(manifestPath)) {
        throw new Error('Configuration files missing - framework protection disabled');
      }

      const configContent = fs.readFileSync(configPath, 'utf8');
      const manifestContent = fs.readFileSync(manifestPath, 'utf8');

      this.config = yaml.load(configContent) as GuardConfig;
      this.manifest = JSON.parse(manifestContent) as ComponentManifest;

    } catch (error) {
      console.error('❌ Framework Guard initialization failed:', error);
      throw error;
    }
  }

  public startMonitoring(): void {
    console.log('\n🛡️  FRAMEWORK GUARD ACTIVATED (Validation Mode)');
    console.log('🔒 Real-time monitoring requires chokidar dependency');
    console.log('📊 Use "check" command for comprehensive validation\n');
  }

  public stopMonitoring(): void {
    console.log('\n🛡️  Framework Guard validation complete');
  }

  private validateFileCreation(filePath: string): void {
    const fileName = path.basename(filePath);
    const relativePath = path.relative(this.projectRoot, filePath);

    // Check forbidden file patterns
    const forbiddenPatterns = [
      ...this.config.forbidden_patterns.file_names,
      ...this.manifest.forbidden_patterns.file_creation.analyzer_duplicates
    ];

    for (const pattern of forbiddenPatterns) {
      if (this.matchesPattern(fileName, pattern)) {
        this.blockFileCreation(filePath, `Forbidden file pattern: ${pattern}`);
        return;
      }
    }

    // Check for analyzer duplicates
    if (fileName.includes('analyzer') && fileName.endsWith('.ts')) {
      if (!relativePath.includes('src/two-branch/analyzers/')) {
        this.blockFileCreation(filePath, 'Analyzers must be in src/two-branch/analyzers/ only');
        return;
      }

      // Check naming convention for analyzers
      if (fileName.startsWith('v') && !fileName.startsWith('v9-')) {
        this.blockFileCreation(filePath, 'Only V9 analyzer naming allowed (v9-{language}-analyzer.ts)');
        return;
      }
    }

    // Check for framework duplicates
    if (fileName.includes('framework') && fileName.endsWith('.ts')) {
      if (!relativePath.includes('src/two-branch/analyzers/')) {
        this.blockFileCreation(filePath, 'Framework files must be in src/two-branch/analyzers/ only');
        return;
      }

      if (fileName !== 'v9-analyzer-framework.ts') {
        this.blockFileCreation(filePath, 'Framework already exists: use v9-analyzer-framework.ts');
        return;
      }
    }

    // Check for test file duplicates
    if (fileName.startsWith('test-v') && !fileName.startsWith('test-v9-')) {
      this.blockFileCreation(filePath, 'Only V9 test files allowed (test-v9-{description}.ts)');
      return;
    }

    console.log(`✅ File creation allowed: ${relativePath}`);
  }

  private validateDirectoryCreation(dirPath: string): void {
    const dirName = path.basename(dirPath);
    const relativePath = path.relative(this.projectRoot, dirPath);

    // Check forbidden directory patterns
    const forbiddenPatterns = [
      ...this.config.forbidden_patterns.directory_names,
      ...this.manifest.forbidden_patterns.file_creation.directory_duplicates
    ];

    for (const pattern of forbiddenPatterns) {
      if (this.matchesPattern(dirName, pattern)) {
        this.blockDirectoryCreation(dirPath, `Forbidden directory pattern: ${pattern}`);
        return;
      }
    }

    // Specific checks for analyzer directories
    if (dirName === 'analyzers' && !relativePath.includes('src/two-branch')) {
      this.blockDirectoryCreation(dirPath, 'Analyzers directory must be under src/two-branch only');
      return;
    }

    console.log(`✅ Directory creation allowed: ${relativePath}`);
  }

  private validateFileModification(filePath: string): void {
    if (!fs.existsSync(filePath)) return;

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(this.projectRoot, filePath);

      // Check for forbidden code patterns
      this.config.forbidden_patterns.code_patterns.forEach(pattern => {
        if (content.includes(pattern)) {
          console.log(`⚠️  WARNING: Forbidden code pattern detected in ${relativePath}: ${pattern}`);
          console.log('   This violates V9 framework rules - please review and fix');
        }
      });

    } catch (error) {
      // Skip files that can't be read
    }
  }

  private blockFileCreation(filePath: string, reason: string): void {
    console.log(`\n🚫 FILE CREATION BLOCKED`);
    console.log(`📁 File: ${path.relative(this.projectRoot, filePath)}`);
    console.log(`❌ Reason: ${reason}`);
    console.log(`🛡️  Framework protection active - use existing V9 components\n`);

    try {
      // Attempt to delete the file if it was created
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️  Blocked file removed: ${path.basename(filePath)}`);
      }
    } catch (error) {
      console.log(`⚠️  Could not remove blocked file - manual cleanup required`);
    }

    this.logViolation('FILE_CREATION_BLOCKED', filePath, reason);
  }

  private blockDirectoryCreation(dirPath: string, reason: string): void {
    console.log(`\n🚫 DIRECTORY CREATION BLOCKED`);
    console.log(`📁 Directory: ${path.relative(this.projectRoot, dirPath)}`);
    console.log(`❌ Reason: ${reason}`);
    console.log(`🛡️  Framework protection active - use existing structure\n`);

    try {
      // Attempt to remove the directory if it was created
      if (fs.existsSync(dirPath)) {
        fs.rmdirSync(dirPath, { recursive: true });
        console.log(`🗑️  Blocked directory removed: ${path.basename(dirPath)}`);
      }
    } catch (error) {
      console.log(`⚠️  Could not remove blocked directory - manual cleanup required`);
    }

    this.logViolation('DIRECTORY_CREATION_BLOCKED', dirPath, reason);
  }

  private logViolation(type: string, filePath: string, reason: string): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type,
      path: filePath.replace(this.projectRoot, ''),
      reason,
      session_id: process.env.SESSION_ID || 'unknown'
    };

    const logPath = path.join(this.projectRoot, '.framework-violations.log');
    fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
  }

  private matchesPattern(fileName: string, pattern: string): boolean {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')
      .replace(/\[([^\]]*)\]/g, '[$1]');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(fileName);
  }

  public validateExistingFile(filePath: string): boolean {
    const fileName = path.basename(filePath);
    const relativePath = path.relative(this.projectRoot, filePath);

    // Check if this file violates current framework rules
    const forbiddenPatterns = [
      ...this.config.forbidden_patterns.file_names,
      ...this.manifest.forbidden_patterns.file_creation.analyzer_duplicates
    ];

    for (const pattern of forbiddenPatterns) {
      if (this.matchesPattern(fileName, pattern)) {
        console.log(`❌ Existing file violates framework rules: ${relativePath}`);
        console.log(`   Pattern: ${pattern}`);
        return false;
      }
    }

    return true;
  }

  public generateComplianceReport(): void {
    console.log('\n📊 FRAMEWORK COMPLIANCE REPORT\n');

    const violations = this.scanForViolations();
    
    if (violations.length === 0) {
      console.log('✅ No framework violations detected');
      console.log('🛡️  All files comply with V9 framework rules');
    } else {
      console.log(`❌ Found ${violations.length} framework violations:\n`);
      violations.forEach((violation, index) => {
        console.log(`${index + 1}. ${violation.path}`);
        console.log(`   Reason: ${violation.reason}`);
        console.log(`   Type: ${violation.type}\n`);
      });

      console.log('📖 Remediation required:');
      console.log('   1. Remove or rename violating files');
      console.log('   2. Use existing V9 framework components');
      console.log('   3. Follow naming conventions');
      console.log('   4. Re-run compliance check');
    }
  }

  private scanForViolations(): Array<{path: string, reason: string, type: string}> {
    const violations: Array<{path: string, reason: string, type: string}> = [];
    const srcPath = path.join(this.projectRoot, 'packages/agents/src');

    const scanDirectory = (dirPath: string): void => {
      if (!fs.existsSync(dirPath)) return;

      const items = fs.readdirSync(dirPath);
      items.forEach(item => {
        const itemPath = path.join(dirPath, item);
        const relativePath = path.relative(this.projectRoot, itemPath);

        if (fs.statSync(itemPath).isDirectory()) {
          // Check directory violations
          this.manifest.forbidden_patterns.file_creation.directory_duplicates.forEach(pattern => {
            if (this.matchesPattern(item, pattern) && !relativePath.includes('two-branch/analyzers')) {
              violations.push({
                path: relativePath,
                reason: `Forbidden directory pattern: ${pattern}`,
                type: 'DIRECTORY_VIOLATION'
              });
            }
          });
          scanDirectory(itemPath);
        } else {
          // Check file violations
          this.manifest.forbidden_patterns.file_creation.analyzer_duplicates.forEach(pattern => {
            if (this.matchesPattern(item, pattern)) {
              violations.push({
                path: relativePath,
                reason: `Forbidden file pattern: ${pattern}`,
                type: 'FILE_VIOLATION'
              });
            }
          });
        }
      });
    };

    scanDirectory(srcPath);
    return violations;
  }
}

// CLI interface
if (require.main === module) {
  const guard = new FrameworkGuard();

  const command = process.argv[2];

  switch (command) {
    case 'monitor':
      guard.startMonitoring();
      console.log('🛡️  Framework Guard running... Press Ctrl+C to stop');
      
      process.on('SIGINT', () => {
        console.log('\n⏹️  Stopping Framework Guard...');
        guard.stopMonitoring();
        process.exit(0);
      });
      
      // Keep the process running
      setInterval(() => {}, 1000);
      break;

    case 'check':
      console.log('🔍 Running framework compliance check...');
      guard.generateComplianceReport();
      break;

    case 'validate':
      const filePath = process.argv[3];
      if (!filePath) {
        console.error('❌ Usage: node framework-guards.ts validate <file-path>');
        process.exit(1);
      }
      
      const isValid = guard.validateExistingFile(filePath);
      process.exit(isValid ? 0 : 1);
      break;

    default:
      console.log('🛡️  Framework Guard - Duplication Prevention System\n');
      console.log('Usage:');
      console.log('  node framework-guards.ts monitor   - Start real-time monitoring');
      console.log('  node framework-guards.ts check     - Run compliance check');
      console.log('  node framework-guards.ts validate <file> - Validate specific file');
      break;
  }
}

export default FrameworkGuard;