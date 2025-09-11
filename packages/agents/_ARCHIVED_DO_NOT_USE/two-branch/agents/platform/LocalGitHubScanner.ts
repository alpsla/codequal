/**
 * Local GitHub Security Scanner
 * Runs security tools on locally cloned repositories
 * This bypasses GitHub API restrictions and provides real security data
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export class LocalGitHubScanner {
  private cacheDir: string;
  
  constructor(cacheDir = '/tmp/codequal-cache') {
    this.cacheDir = cacheDir;
    this.ensureCacheDir();
  }

  private ensureCacheDir(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Get cached repo path or clone if not exists
   */
  async prepareRepository(repoUrl: string): Promise<string> {
    // Extract owner and repo name from URL
    const match = repoUrl.match(/github\.com[/:]([\w-]+)\/([\w-]+)/);
    if (!match) throw new Error('Invalid GitHub URL');
    
    const [, owner, repo] = match;
    const repoPath = path.join(this.cacheDir, `${owner}-${repo}`);
    
    if (fs.existsSync(repoPath)) {
      console.log(`📦 Using cached repository: ${repoPath}`);
      // Update to latest
      try {
        execSync('git pull', { cwd: repoPath, stdio: 'pipe' });
        console.log('   Updated to latest version');
      } catch (e) {
        console.log('   Using existing cache (pull failed)');
      }
    } else {
      console.log(`📥 Cloning repository: ${repoUrl}`);
      execSync(`git clone --depth 1 ${repoUrl} "${repoPath}"`, { 
        cwd: this.cacheDir,
        stdio: 'pipe' 
      });
      console.log('   Clone complete');
    }
    
    return repoPath;
  }

  /**
   * Run security scanning locally on cloned repo
   */
  async scanRepository(repoUrl: string): Promise<any> {
    const repoPath = await this.prepareRepository(repoUrl);
    
    console.log('🔍 Running local security scans...');
    
    const results = {
      dependencies: await this.scanDependencies(repoPath),
      secrets: await this.scanSecrets(repoPath),
      codeQuality: await this.scanCode(repoPath),
      languages: await this.detectLanguages(repoPath)
    };
    
    return this.formatResults(results);
  }

  /**
   * Scan for dependency vulnerabilities
   */
  private async scanDependencies(repoPath: string): Promise<any[]> {
    const issues: any[] = [];
    
    // Check for package.json (Node.js)
    if (fs.existsSync(path.join(repoPath, 'package.json'))) {
      console.log('   📦 Scanning Node.js dependencies...');
      try {
        const result = execSync('npm audit --json 2>/dev/null', { 
          cwd: repoPath,
          stdio: 'pipe',
          encoding: 'utf8'
        });
        const audit = JSON.parse(result);
        
        if (audit.vulnerabilities) {
          Object.entries(audit.vulnerabilities).forEach(([pkg, data]: [string, any]) => {
            issues.push({
              type: 'dependency',
              package: pkg,
              severity: data.severity,
              title: data.title || `Vulnerability in ${pkg}`,
              fixAvailable: data.fixAvailable
            });
          });
        }
      } catch (e) {
        console.log('      npm audit not available or failed');
      }
    }
    
    // Check for requirements.txt (Python)
    if (fs.existsSync(path.join(repoPath, 'requirements.txt'))) {
      console.log('   🐍 Scanning Python dependencies...');
      
      // Check Python version - safety has issues with Python 3.13
      let skipSafety = false;
      try {
        const pythonVersion = execSync('python --version', { encoding: 'utf8' }).trim();
        skipSafety = pythonVersion.includes('3.13');
      } catch {
        // Continue if we can't check version
      }
      
      if (!skipSafety) {
        try {
          const result = execSync('safety check --json 2>/dev/null', {
            cwd: repoPath,
            stdio: 'pipe',
            encoding: 'utf8'
          });
          const safety = JSON.parse(result);
          
          safety.vulnerabilities?.forEach((vuln: any) => {
            issues.push({
              type: 'dependency',
              package: vuln.package_name,
              severity: vuln.severity || 'medium',
              title: vuln.advisory,
              cve: vuln.cve
            });
          });
        } catch (e) {
          console.log('      safety check not available or failed');
        }
      } else {
        console.log('      ⚠️ Skipping safety check (Python 3.13 compatibility issue)');
      }
    }
    
    // Check for Gemfile (Ruby)
    if (fs.existsSync(path.join(repoPath, 'Gemfile'))) {
      console.log('   💎 Scanning Ruby dependencies...');
      try {
        execSync('bundle audit check 2>/dev/null', {
          cwd: repoPath,
          stdio: 'pipe'
        });
      } catch (e: any) {
        // bundle audit returns non-zero if vulnerabilities found
        const output = e.stdout?.toString() || '';
        const vulnCount = (output.match(/CVE-/g) || []).length;
        if (vulnCount > 0) {
          issues.push({
            type: 'dependency',
            severity: 'high',
            title: `Found ${vulnCount} Ruby dependency vulnerabilities`,
            tool: 'bundler-audit'
          });
        }
      }
    }
    
    return issues;
  }

  /**
   * Scan for exposed secrets
   */
  private async scanSecrets(repoPath: string): Promise<any[]> {
    const issues: any[] = [];
    
    console.log('   🔐 Scanning for secrets...');
    
    // Use gitleaks if available
    try {
      const result = execSync('gitleaks detect --no-git --report-format json --report-path /tmp/gitleaks.json 2>/dev/null', {
        cwd: repoPath,
        stdio: 'pipe'
      });
      
      if (fs.existsSync('/tmp/gitleaks.json')) {
        const leaks = JSON.parse(fs.readFileSync('/tmp/gitleaks.json', 'utf8'));
        leaks.forEach((leak: any) => {
          issues.push({
            type: 'secret',
            severity: 'critical',
            secretType: leak.RuleID,
            file: leak.File,
            line: leak.StartLine,
            title: `Exposed ${leak.Description || 'secret'}`,
            match: leak.Match?.substring(0, 20) + '...'
          });
        });
        fs.unlinkSync('/tmp/gitleaks.json');
      }
    } catch (e) {
      // Fallback to basic pattern matching
      console.log('      Using basic secret detection');
      
      const patterns = [
        { regex: /(?:api[_-]?key|apikey)\s*[:=]\s*['"]([^'"]{20,})['"]/gi, type: 'API Key' },
        { regex: /(?:secret|password|passwd|pwd)\s*[:=]\s*['"]([^'"]{8,})['"]/gi, type: 'Password' },
        { regex: /ghp_[a-zA-Z0-9]{36}/g, type: 'GitHub Token' },
        { regex: /sk-[a-zA-Z0-9]{48}/g, type: 'OpenAI Key' },
        { regex: /AKIA[0-9A-Z]{16}/g, type: 'AWS Access Key' }
      ];
      
      const files = this.findFiles(repoPath, ['.js', '.ts', '.py', '.env', '.yml', '.yaml', '.json']);
      
      files.slice(0, 100).forEach(file => {
        try {
          const content = fs.readFileSync(file, 'utf8');
          patterns.forEach(pattern => {
            const matches = content.match(pattern.regex);
            if (matches) {
              issues.push({
                type: 'secret',
                severity: 'critical',
                secretType: pattern.type,
                file: path.relative(repoPath, file),
                title: `Potential ${pattern.type} exposed`
              });
            }
          });
        } catch (e) {
          // Skip files that can't be read
        }
      });
    }
    
    return issues;
  }

  /**
   * Scan code quality issues
   */
  private async scanCode(repoPath: string): Promise<any[]> {
    const issues: any[] = [];
    
    console.log('   🔍 Scanning code quality...');
    
    // Use semgrep if available (works for multiple languages)
    try {
      const result = execSync('semgrep --config=auto --json --quiet 2>/dev/null', {
        cwd: repoPath,
        stdio: 'pipe',
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });
      
      const semgrep = JSON.parse(result);
      semgrep.results?.forEach((finding: any) => {
        issues.push({
          type: 'code-scanning',
          severity: finding.extra.severity || 'medium',
          rule: finding.check_id,
          message: finding.extra.message,
          file: finding.path,
          line: finding.start.line,
          cwe: finding.extra.metadata?.cwe
        });
      });
    } catch (e) {
      console.log('      semgrep not available, using language-specific tools');
      
      // Fallback to ESLint for JavaScript
      if (fs.existsSync(path.join(repoPath, 'package.json'))) {
        try {
          execSync('npx eslint . --format json --output-file /tmp/eslint.json 2>/dev/null', {
            cwd: repoPath,
            stdio: 'pipe'
          });
          
          if (fs.existsSync('/tmp/eslint.json')) {
            const eslint = JSON.parse(fs.readFileSync('/tmp/eslint.json', 'utf8'));
            eslint.forEach((file: any) => {
              file.messages?.forEach((msg: any) => {
                issues.push({
                  type: 'code-scanning',
                  severity: msg.severity === 2 ? 'high' : 'medium',
                  rule: msg.ruleId,
                  message: msg.message,
                  file: path.relative(repoPath, file.filePath),
                  line: msg.line
                });
              });
            });
            fs.unlinkSync('/tmp/eslint.json');
          }
        } catch (e) {
          // ESLint not available
        }
      }
    }
    
    return issues;
  }

  /**
   * Detect languages in repository
   */
  private async detectLanguages(repoPath: string): Promise<Record<string, number>> {
    const languages: Record<string, number> = {};
    
    try {
      // Use github-linguist if available
      const result = execSync('github-linguist --json 2>/dev/null', {
        cwd: repoPath,
        stdio: 'pipe',
        encoding: 'utf8'
      });
      return JSON.parse(result);
    } catch (e) {
      // Fallback to file extension counting
      const extensions: Record<string, string> = {
        '.js': 'JavaScript',
        '.ts': 'TypeScript',
        '.py': 'Python',
        '.java': 'Java',
        '.go': 'Go',
        '.rb': 'Ruby',
        '.rs': 'Rust',
        '.php': 'PHP',
        '.cs': 'C#',
        '.cpp': 'C++'
      };
      
      const files = this.findFiles(repoPath, Object.keys(extensions));
      files.forEach(file => {
        const ext = path.extname(file);
        const lang = extensions[ext];
        if (lang) {
          const size = fs.statSync(file).size;
          languages[lang] = (languages[lang] || 0) + size;
        }
      });
    }
    
    return languages;
  }

  /**
   * Find files with specific extensions
   */
  private findFiles(dir: string, extensions: string[]): string[] {
    const files: string[] = [];
    
    const walk = (currentPath: string) => {
      try {
        const entries = fs.readdirSync(currentPath);
        
        for (const entry of entries) {
          // Skip hidden and common ignore directories
          if (entry.startsWith('.') || 
              ['node_modules', 'vendor', 'dist', 'build'].includes(entry)) {
            continue;
          }
          
          const fullPath = path.join(currentPath, entry);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            walk(fullPath);
          } else if (stat.isFile()) {
            const ext = path.extname(entry);
            if (extensions.includes(ext)) {
              files.push(fullPath);
            }
          }
        }
      } catch (e) {
        // Skip directories we can't read
      }
    };
    
    walk(dir);
    return files;
  }

  /**
   * Format results to match GitHub API format
   */
  private formatResults(results: any): any {
    const allIssues = [
      ...results.dependencies,
      ...results.secrets,
      ...results.codeQuality
    ];
    
    return {
      platform: 'github-local',
      issues: allIssues,
      tools: ['local-scanner'],
      summary: {
        totalIssues: allIssues.length,
        languages: results.languages,
        issueTypes: {
          dependency: results.dependencies.length,
          secret: results.secrets.length,
          codeScanning: results.codeQuality.length
        },
        metadata: {
          scanType: 'local',
          cached: true
        }
      }
    };
  }

  /**
   * Clean up old cached repositories
   */
  async cleanCache(maxAgeDays = 7): Promise<void> {
    console.log(`🧹 Cleaning cache older than ${maxAgeDays} days...`);
    
    const now = Date.now();
    const maxAge = maxAgeDays * 24 * 60 * 60 * 1000;
    
    const entries = fs.readdirSync(this.cacheDir);
    for (const entry of entries) {
      const fullPath = path.join(this.cacheDir, entry);
      const stat = fs.statSync(fullPath);
      
      if (now - stat.mtimeMs > maxAge) {
        console.log(`   Removing old cache: ${entry}`);
        execSync(`rm -rf "${fullPath}"`);
      }
    }
  }
}