/**
 * Smart File Selector for PR Analysis
 * Intelligently selects which files to analyze based on:
 * 1. Files changed in the PR
 * 2. Security-critical paths
 * 3. Performance-critical paths
 * 4. Entry points and API handlers
 * 5. Dependencies and configuration files
 */

import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const exec = promisify(execCallback);

export interface FileSelectionConfig {
  repository: string;
  prNumber: number;
  baseBranch: string;
  prBranch: string;
  language: string;
  maxFiles?: number;
  repoPath: string;
}

export interface SelectedFiles {
  prChangedFiles: string[];      // Files actually changed in PR
  criticalFiles: string[];        // Security/performance critical
  entryPoints: string[];          // Main entry points
  configFiles: string[];          // Configuration files
  testFiles: string[];            // Test files for validation
  totalSelected: number;
  selectionReason: string;
}

export class SmartFileSelector {
  private readonly CRITICAL_PATTERNS: Record<string, string[]> = {
    rust: [
      'src/main.rs',
      'src/lib.rs',
      'Cargo.toml',
      'Cargo.lock',
      '**/auth*.rs',
      '**/crypto*.rs',
      '**/security*.rs',
      '**/unsafe*.rs',
      '**/ffi*.rs',
      '**/network*.rs',
      '**/api*.rs',
      '**/handler*.rs'
    ],
    java: [
      '**/Application.java',
      '**/Main.java',
      'pom.xml',
      'build.gradle',
      '**/Security*.java',
      '**/Auth*.java',
      '**/Controller*.java',
      '**/Service*.java',
      '**/Repository*.java',
      '**/Config*.java'
    ],
    javascript: [
      'index.js',
      'app.js',
      'server.js',
      'package.json',
      'package-lock.json',
      '**/auth*.js',
      '**/api*.js',
      '**/route*.js',
      '**/middleware*.js',
      '**/config*.js'
    ],
    typescript: [
      'index.ts',
      'app.ts',
      'server.ts',
      'package.json',
      'tsconfig.json',
      '**/auth*.ts',
      '**/api*.ts',
      '**/route*.ts',
      '**/middleware*.ts',
      '**/config*.ts'
    ],
    python: [
      '__main__.py',
      'main.py',
      'app.py',
      'requirements.txt',
      'setup.py',
      'pyproject.toml',
      '**/auth*.py',
      '**/security*.py',
      '**/api*.py',
      '**/views*.py',
      '**/models*.py'
    ],
    go: [
      'main.go',
      'go.mod',
      'go.sum',
      '**/auth*.go',
      '**/handler*.go',
      '**/router*.go',
      '**/middleware*.go',
      '**/config*.go'
    ]
  };

  private readonly MAX_FILES_DEFAULT = 500;  // Reasonable limit

  async selectFiles(config: FileSelectionConfig): Promise<SelectedFiles> {
    const maxFiles = config.maxFiles || this.MAX_FILES_DEFAULT;
    const result: SelectedFiles = {
      prChangedFiles: [],
      criticalFiles: [],
      entryPoints: [],
      configFiles: [],
      testFiles: [],
      totalSelected: 0,
      selectionReason: ''
    };

    try {
      // 1. PRIORITY: Get actual PR changed files
      console.log('   📝 Analyzing PR changes...');
      result.prChangedFiles = await this.getPRChangedFiles(config);
      
      // 2. Get critical security/performance files
      console.log('   🔒 Identifying critical paths...');
      result.criticalFiles = await this.getCriticalFiles(config);
      
      // 3. Get entry points
      console.log('   🚪 Finding entry points...');
      result.entryPoints = await this.getEntryPoints(config);
      
      // 4. Get configuration files
      console.log('   ⚙️  Checking configuration files...');
      result.configFiles = await this.getConfigFiles(config);
      
      // 5. Get related test files
      console.log('   🧪 Including test coverage...');
      result.testFiles = await this.getTestFiles(config);

      // Deduplicate and limit
      const allFiles = this.deduplicateFiles([
        ...result.prChangedFiles,
        ...result.criticalFiles,
        ...result.entryPoints,
        ...result.configFiles,
        ...result.testFiles
      ]);

      // Apply intelligent limiting
      const selectedFiles = this.applyIntelligentLimit(allFiles, maxFiles, result);
      
      result.totalSelected = selectedFiles.length;
      result.selectionReason = this.generateSelectionReason(result);

      console.log(`   ✅ Selected ${result.totalSelected} files for analysis`);
      console.log(`   📊 Breakdown: ${result.prChangedFiles.length} PR changes, ${result.criticalFiles.length} critical, ${result.entryPoints.length} entry points`);

      return result;

    } catch (error) {
      console.error('Error in file selection:', error);
      // Fallback to PR changes only
      return this.fallbackSelection(config);
    }
  }

  private async getPRChangedFiles(config: FileSelectionConfig): Promise<string[]> {
    try {
      // Get files changed between base and PR branch
      const { stdout } = await exec(
        `cd ${config.repoPath} && git diff --name-only ${config.baseBranch}...${config.prBranch} | grep -E "\\.(${this.getFileExtensions(config.language)})$" | head -200`
      );
      
      const files = stdout.trim().split('\n').filter(f => f.length > 0);
      
      if (files.length === 0) {
        // If no diff (simulated PR), get recently modified files
        const { stdout: recentFiles } = await exec(
          `cd ${config.repoPath} && find . -name "*.${this.getMainExtension(config.language)}" -type f -exec stat -f "%m %N" {} \\; | sort -rn | head -50 | cut -d' ' -f2- | sed 's|^./||'`
        );
        return recentFiles.trim().split('\n').filter(f => f.length > 0);
      }
      
      return files;
    } catch (error) {
      console.error('Error getting PR files:', error);
      return [];
    }
  }

  private async getCriticalFiles(config: FileSelectionConfig): Promise<string[]> {
    const patterns = this.CRITICAL_PATTERNS[config.language] || [];
    const criticalFiles: string[] = [];

    for (const pattern of patterns) {
      try {
        const { stdout } = await exec(
          `cd ${config.repoPath} && find . -path "${pattern}" -type f | head -20 | sed 's|^./||'`
        );
        const files = stdout.trim().split('\n').filter(f => f.length > 0);
        criticalFiles.push(...files);
      } catch (error) {
        // Pattern didn't match, continue
      }
    }

    return criticalFiles;
  }

  private async getEntryPoints(config: FileSelectionConfig): Promise<string[]> {
    const entryPatterns: Record<string, string[]> = {
      rust: ['src/main.rs', 'src/lib.rs', 'src/bin/*.rs'],
      java: ['**/Application.java', '**/Main.java', '**/SpringBootApplication.java'],
      javascript: ['index.js', 'app.js', 'server.js', 'src/index.js'],
      typescript: ['index.ts', 'app.ts', 'server.ts', 'src/index.ts'],
      python: ['__main__.py', 'main.py', 'app.py', 'wsgi.py', 'manage.py'],
      go: ['main.go', 'cmd/*/main.go']
    };

    const patterns = entryPatterns[config.language] || [];
    const entryFiles: string[] = [];

    for (const pattern of patterns) {
      try {
        const { stdout } = await exec(
          `cd ${config.repoPath} && find . -path "${pattern}" -type f | head -10 | sed 's|^./||'`
        );
        const files = stdout.trim().split('\n').filter(f => f.length > 0);
        entryFiles.push(...files);
      } catch (error) {
        // Pattern didn't match, continue
      }
    }

    return entryFiles;
  }

  private async getConfigFiles(config: FileSelectionConfig): Promise<string[]> {
    const configPatterns: Record<string, string[]> = {
      rust: ['Cargo.toml', 'Cargo.lock', '.cargo/config.toml'],
      java: ['pom.xml', 'build.gradle', 'build.gradle.kts', 'application.properties', 'application.yml'],
      javascript: ['package.json', 'package-lock.json', '.eslintrc*', 'webpack.config.js'],
      typescript: ['package.json', 'tsconfig.json', 'tslint.json', '.eslintrc*'],
      python: ['requirements.txt', 'setup.py', 'pyproject.toml', 'Pipfile', 'tox.ini'],
      go: ['go.mod', 'go.sum', 'Makefile']
    };

    const patterns = configPatterns[config.language] || [];
    const configFiles: string[] = [];

    for (const pattern of patterns) {
      try {
        const { stdout } = await exec(
          `cd ${config.repoPath} && find . -name "${pattern}" -type f | head -5 | sed 's|^./||'`
        );
        const files = stdout.trim().split('\n').filter(f => f.length > 0);
        configFiles.push(...files);
      } catch (error) {
        // Pattern didn't match, continue
      }
    }

    return configFiles;
  }

  private async getTestFiles(config: FileSelectionConfig): Promise<string[]> {
    const testPatterns: Record<string, string> = {
      rust: '*test*.rs',
      java: '*Test.java',
      javascript: '*.test.js',
      typescript: '*.test.ts',
      python: 'test_*.py',
      go: '*_test.go'
    };

    const pattern = testPatterns[config.language];
    if (!pattern) return [];

    try {
      // Get test files related to changed files
      const { stdout } = await exec(
        `cd ${config.repoPath} && find . -name "${pattern}" -type f | head -20 | sed 's|^./||'`
      );
      return stdout.trim().split('\n').filter(f => f.length > 0);
    } catch (error) {
      return [];
    }
  }

  private deduplicateFiles(files: string[]): string[] {
    return Array.from(new Set(files.filter(f => f && f.length > 0)));
  }

  private applyIntelligentLimit(
    files: string[], 
    maxFiles: number, 
    categories: SelectedFiles
  ): string[] {
    if (files.length <= maxFiles) {
      return files;
    }

    // Priority order: PR changes > Critical > Entry points > Config > Tests
    const prioritized: string[] = [];
    
    // Always include PR changed files (up to 60% of limit)
    const prLimit = Math.floor(maxFiles * 0.6);
    prioritized.push(...categories.prChangedFiles.slice(0, prLimit));
    
    // Add critical files (up to 20% of limit)
    const criticalLimit = Math.floor(maxFiles * 0.2);
    const criticalToAdd = categories.criticalFiles
      .filter(f => !prioritized.includes(f))
      .slice(0, criticalLimit);
    prioritized.push(...criticalToAdd);
    
    // Add entry points (up to 10% of limit)
    const entryLimit = Math.floor(maxFiles * 0.1);
    const entryToAdd = categories.entryPoints
      .filter(f => !prioritized.includes(f))
      .slice(0, entryLimit);
    prioritized.push(...entryToAdd);
    
    // Add config files (up to 5% of limit)
    const configToAdd = categories.configFiles
      .filter(f => !prioritized.includes(f))
      .slice(0, Math.floor(maxFiles * 0.05));
    prioritized.push(...configToAdd);
    
    // Fill remaining with test files
    const remaining = maxFiles - prioritized.length;
    if (remaining > 0) {
      const testsToAdd = categories.testFiles
        .filter(f => !prioritized.includes(f))
        .slice(0, remaining);
      prioritized.push(...testsToAdd);
    }

    return prioritized.slice(0, maxFiles);
  }

  private generateSelectionReason(result: SelectedFiles): string {
    const parts: string[] = [];
    
    if (result.prChangedFiles.length > 0) {
      parts.push(`${result.prChangedFiles.length} files changed in PR`);
    }
    if (result.criticalFiles.length > 0) {
      parts.push(`${result.criticalFiles.length} security/performance critical files`);
    }
    if (result.entryPoints.length > 0) {
      parts.push(`${result.entryPoints.length} entry points`);
    }
    if (result.configFiles.length > 0) {
      parts.push(`${result.configFiles.length} configuration files`);
    }
    if (result.testFiles.length > 0) {
      parts.push(`${result.testFiles.length} test files`);
    }

    return parts.join(', ');
  }

  private async fallbackSelection(config: FileSelectionConfig): Promise<SelectedFiles> {
    // Fallback: just get most recently modified files
    try {
      const { stdout } = await exec(
        `cd ${config.repoPath} && find . -name "*.${this.getMainExtension(config.language)}" -type f -exec stat -f "%m %N" {} \\; | sort -rn | head -100 | cut -d' ' -f2- | sed 's|^./||'`
      );
      
      const files = stdout.trim().split('\n').filter(f => f.length > 0);
      
      return {
        prChangedFiles: files,
        criticalFiles: [],
        entryPoints: [],
        configFiles: [],
        testFiles: [],
        totalSelected: files.length,
        selectionReason: 'Fallback: Most recently modified files'
      };
    } catch (error) {
      return {
        prChangedFiles: [],
        criticalFiles: [],
        entryPoints: [],
        configFiles: [],
        testFiles: [],
        totalSelected: 0,
        selectionReason: 'Error: Could not select files'
      };
    }
  }

  private getFileExtensions(language: string): string {
    const extensions: Record<string, string> = {
      rust: 'rs',
      java: 'java',
      javascript: 'js|jsx',
      typescript: 'ts|tsx',
      python: 'py',
      go: 'go',
      ruby: 'rb',
      php: 'php',
      cpp: 'cpp|cc|cxx|hpp|h',
      csharp: 'cs',
      perl: 'pl|pm'
    };
    return extensions[language] || '*';
  }

  private getMainExtension(language: string): string {
    const extensions: Record<string, string> = {
      rust: 'rs',
      java: 'java',
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      go: 'go',
      ruby: 'rb',
      php: 'php',
      cpp: 'cpp',
      csharp: 'cs',
      perl: 'pl'
    };
    return extensions[language] || '*';
  }
}

export default SmartFileSelector;