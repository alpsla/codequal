/**
 * DiffAnalyzer Service Implementation
 * Provides actual git diff analysis between branches
 * Uses git commands and parsing to extract meaningful changes
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';
import {
  IDiffAnalyzer,
  GitDiff,
  DiffFile,
  DiffHunk,
  DiffStats,
  CommitInfo,
  ChangeAnalysis,
  ChangedFunction,
  ChangedClass,
  BreakingChange,
  SecurityChange,
  PerformanceChange,
  IssueMapping,
  FixVerification
} from './interfaces/diff-analyzer.interface';
import { Logger } from '../../../logger/interfaces';

const execAsync = promisify(exec);

export class DiffAnalyzerService implements IDiffAnalyzer {
  private cache: Map<string, GitDiff> = new Map();
  private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutes
  private cacheTimestamps: Map<string, number> = new Map();

  constructor(
    private logger: Logger,
    private redisService?: any // Optional Redis for distributed caching
  ) {}

  async fetchDiff(repo: string, baseBranch: string, headBranch: string): Promise<GitDiff> {
    const cacheKey = `${repo}:${baseBranch}:${headBranch}`;
    
    // Check cache first
    const cached = await this.getCachedDiff(repo, baseBranch, headBranch);
    if (cached) {
      this.logger.info('Using cached diff', { repo, baseBranch, headBranch });
      return cached;
    }

    this.logger.info('Fetching git diff', { repo, baseBranch, headBranch });
    const startTime = Date.now();

    try {
      // Get diff stats
      const { stdout: statsOutput } = await execAsync(
        `git diff ${baseBranch}...${headBranch} --stat`,
        { cwd: repo, maxBuffer: 10 * 1024 * 1024 }
      );

      // Get detailed diff
      const { stdout: diffOutput } = await execAsync(
        `git diff ${baseBranch}...${headBranch} --unified=3`,
        { cwd: repo, maxBuffer: 50 * 1024 * 1024 }
      );

      // Get file list with status
      const { stdout: filesOutput } = await execAsync(
        `git diff ${baseBranch}...${headBranch} --name-status`,
        { cwd: repo }
      );

      // Get commit list
      const { stdout: commitsOutput } = await execAsync(
        `git log ${baseBranch}..${headBranch} --pretty=format:"%H|%an|%ai|%s" --name-only`,
        { cwd: repo }
      );

      // Parse all the outputs
      const files = this.parseFileList(filesOutput, diffOutput);
      const stats = this.parseStats(statsOutput, files);
      const commits = this.parseCommits(commitsOutput);

      const diff: GitDiff = {
        baseBranch,
        headBranch,
        files,
        stats,
        commits,
        timestamp: new Date()
      };

      // Cache the result
      this.cache.set(cacheKey, diff);
      this.cacheTimestamps.set(cacheKey, Date.now());

      // Also cache in Redis if available
      if (this.redisService) {
        await this.redisService.set(
          `diff:${cacheKey}`,
          JSON.stringify(diff),
          'EX',
          300 // 5 minutes
        );
      }

      const duration = Date.now() - startTime;
      this.logger.info('Diff analysis completed', { 
        repo, 
        duration, 
        filesChanged: files.length,
        additions: stats.additions,
        deletions: stats.deletions
      });

      return diff;
    } catch (error) {
      this.logger.error('Failed to fetch diff', { error, repo, baseBranch, headBranch });
      throw new Error(`Failed to fetch diff: ${error.message}`);
    }
  }

  async analyzeChanges(diff: GitDiff): Promise<ChangeAnalysis> {
    this.logger.info('Analyzing changes in diff', { files: diff.files.length });

    const changedFunctions: ChangedFunction[] = [];
    const changedClasses: ChangedClass[] = [];
    const breakingChanges: BreakingChange[] = [];
    const securityChanges: SecurityChange[] = [];
    const performanceChanges: PerformanceChange[] = [];

    for (const file of diff.files) {
      // Analyze based on file type
      if (this.isCodeFile(file.path)) {
        const functions = await this.extractChangedFunctions(file);
        const classes = await this.extractChangedClasses(file);
        
        changedFunctions.push(...functions);
        changedClasses.push(...classes);

        // Check for breaking changes
        const breaking = this.checkForBreakingChanges(file, functions, classes);
        breakingChanges.push(...breaking);

        // Check for security implications
        const security = this.checkSecurityImplications(file);
        securityChanges.push(...security);

        // Check for performance implications
        const performance = this.checkPerformanceImplications(file);
        performanceChanges.push(...performance);
      }
    }

    return {
      changedFunctions,
      changedClasses,
      changedFiles: diff.files.map(f => f.path),
      breakingChanges,
      securityChanges,
      performanceChanges
    };
  }

  async mapIssuesToChanges(
    issues: Array<{ id: string; title: string; severity: string; location: string }>,
    changes: ChangeAnalysis,
    diff: GitDiff
  ): Promise<IssueMapping[]> {
    this.logger.info('Mapping issues to changes', { issueCount: issues.length });

    const mappings: IssueMapping[] = [];

    for (const issue of issues) {
      // Parse issue location (format: "file:line" or "file:line:column")
      const [filePath, lineStr] = issue.location.split(':');
      const lineNumber = parseInt(lineStr) || 0;

      // Find the corresponding diff file
      const diffFile = diff.files.find(f => 
        f.path === filePath || 
        f.path.endsWith(filePath) ||
        filePath.endsWith(f.path)
      );

      if (diffFile) {
        // Check if the issue line is within changed hunks
        const relevantHunk = this.findRelevantHunk(diffFile, lineNumber);
        
        if (relevantHunk) {
          // Issue is in changed code
          mappings.push({
            issue,
            changeLocation: {
              file: diffFile.path,
              lineNumbers: [lineNumber],
              hunk: relevantHunk
            },
            confidence: 0.9,
            verificationStatus: diffFile.status === 'added' ? 'introduced' : 'modified'
          });
        } else {
          // Issue is in unchanged part of changed file
          mappings.push({
            issue,
            changeLocation: {
              file: diffFile.path,
              lineNumbers: [lineNumber]
            },
            confidence: 0.5,
            verificationStatus: 'unrelated'
          });
        }
      }
    }

    return mappings;
  }

  async verifyFixes(
    mainIssues: Array<{ id: string; title: string; severity: string }>,
    prChanges: ChangeAnalysis,
    diff: GitDiff
  ): Promise<FixVerification[]> {
    this.logger.info('Verifying fixes', { mainIssueCount: mainIssues.length });

    const verifications: FixVerification[] = [];

    for (const issue of mainIssues) {
      // Check if issue still exists in PR branch
      const stillExists = await this.checkIssueExists(issue, diff);
      
      if (!stillExists) {
        // Issue appears to be fixed
        const evidence = await this.gatherFixEvidence(issue, prChanges, diff);
        
        verifications.push({
          issueId: issue.id,
          status: evidence.codeChange ? 'fixed' : 'partially_fixed',
          evidence,
          confidence: evidence.codeChange ? 0.8 : 0.5,
          notes: `Issue ${issue.title} appears to be resolved in PR`
        });
      } else {
        // Issue still exists
        verifications.push({
          issueId: issue.id,
          status: 'not_fixed',
          evidence: {},
          confidence: 0.9,
          notes: `Issue ${issue.title} still present in PR`
        });
      }
    }

    return verifications;
  }

  async getBlameInfo(file: string, lineNumbers: number[]): Promise<CommitInfo[]> {
    try {
      const blameOutput = await execAsync(
        `git blame -L ${Math.min(...lineNumbers)},${Math.max(...lineNumbers)} ${file}`,
        { maxBuffer: 5 * 1024 * 1024 }
      );

      return this.parseBlameOutput(blameOutput.stdout);
    } catch (error) {
      this.logger.error('Failed to get blame info', { error, file, lineNumbers });
      return [];
    }
  }

  async analyzeImpactRadius(changes: ChangeAnalysis): Promise<{
    directImpact: string[];
    indirectImpact: string[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  }> {
    const directImpact = new Set<string>();
    const indirectImpact = new Set<string>();

    // Direct impact: files that import changed files
    for (const file of changes.changedFiles) {
      const importers = await this.findImporters(file);
      importers.forEach(f => directImpact.add(f));
    }

    // Indirect impact: files that import the direct impact files
    for (const file of directImpact) {
      const importers = await this.findImporters(file);
      importers.forEach(f => indirectImpact.add(f));
    }

    // Calculate risk level based on impact radius and breaking changes
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    
    if (changes.breakingChanges.some(c => c.severity === 'critical')) {
      riskLevel = 'critical';
    } else if (changes.breakingChanges.length > 5 || directImpact.size > 20) {
      riskLevel = 'high';
    } else if (changes.breakingChanges.length > 0 || directImpact.size > 10) {
      riskLevel = 'medium';
    }

    return {
      directImpact: Array.from(directImpact),
      indirectImpact: Array.from(indirectImpact),
      riskLevel
    };
  }

  async detectBreakingChanges(diff: GitDiff): Promise<BreakingChange[]> {
    const breakingChanges: BreakingChange[] = [];

    for (const file of diff.files) {
      // Check for API changes
      if (file.path.includes('api') || file.path.includes('routes')) {
        const apiChanges = await this.detectAPIChanges(file);
        breakingChanges.push(...apiChanges);
      }

      // Check for interface changes
      if (file.path.endsWith('.ts') || file.path.endsWith('.d.ts')) {
        const interfaceChanges = await this.detectInterfaceChanges(file);
        breakingChanges.push(...interfaceChanges);
      }

      // Check for schema changes
      if (file.path.includes('schema') || file.path.includes('model')) {
        const schemaChanges = await this.detectSchemaChanges(file);
        breakingChanges.push(...schemaChanges);
      }

      // Check for removed exports
      if (file.status === 'deleted' || file.deletions > 0) {
        const removalChanges = await this.detectRemovals(file);
        breakingChanges.push(...removalChanges);
      }
    }

    return breakingChanges;
  }

  async getCachedDiff(repo: string, baseBranch: string, headBranch: string): Promise<GitDiff | null> {
    const cacheKey = `${repo}:${baseBranch}:${headBranch}`;
    
    // Check memory cache
    const cached = this.cache.get(cacheKey);
    const timestamp = this.cacheTimestamps.get(cacheKey);
    
    if (cached && timestamp && Date.now() - timestamp < this.cacheTimeout) {
      return cached;
    }

    // Check Redis cache if available
    if (this.redisService) {
      try {
        const redisCached = await this.redisService.get(`diff:${cacheKey}`);
        if (redisCached) {
          const parsed = JSON.parse(redisCached);
          // Update memory cache
          this.cache.set(cacheKey, parsed);
          this.cacheTimestamps.set(cacheKey, Date.now());
          return parsed;
        }
      } catch (error) {
        this.logger.warn('Failed to get cached diff from Redis', { error });
      }
    }

    return null;
  }

  async clearCache(repo: string, baseBranch?: string, headBranch?: string): Promise<void> {
    if (baseBranch && headBranch) {
      const cacheKey = `${repo}:${baseBranch}:${headBranch}`;
      this.cache.delete(cacheKey);
      this.cacheTimestamps.delete(cacheKey);
      
      if (this.redisService) {
        await this.redisService.del(`diff:${cacheKey}`);
      }
    } else {
      // Clear all cache entries for the repo
      for (const [key] of this.cache) {
        if (key.startsWith(repo)) {
          this.cache.delete(key);
          this.cacheTimestamps.delete(key);
        }
      }
    }
  }

  // Private helper methods

  private parseFileList(nameStatus: string, diffOutput: string): DiffFile[] {
    const files: DiffFile[] = [];
    const lines = nameStatus.trim().split('\n');

    for (const line of lines) {
      if (!line) continue;
      
      const [status, ...pathParts] = line.split('\t');
      const path = pathParts.join('\t');
      
      let fileStatus: DiffFile['status'] = 'modified';
      let oldPath: string | undefined;

      switch (status[0]) {
        case 'A': fileStatus = 'added'; break;
        case 'D': fileStatus = 'deleted'; break;
        case 'M': fileStatus = 'modified'; break;
        case 'R': 
          fileStatus = 'renamed';
          const paths = path.split('\t');
          oldPath = paths[0];
          break;
      }

      // Extract hunks for this file from diff output
      const hunks = this.extractHunksForFile(path, diffOutput);
      
      // Calculate additions/deletions
      let additions = 0;
      let deletions = 0;
      
      for (const hunk of hunks) {
        const lines = hunk.content.split('\n');
        additions += lines.filter(l => l.startsWith('+')).length;
        deletions += lines.filter(l => l.startsWith('-')).length;
      }

      files.push({
        path: oldPath ? pathParts[pathParts.length - 1] : path,
        status: fileStatus,
        additions,
        deletions,
        hunks,
        oldPath,
        language: this.detectLanguage(path),
        fileType: this.detectFileType(path)
      });
    }

    return files;
  }

  private extractHunksForFile(filePath: string, diffOutput: string): DiffHunk[] {
    const hunks: DiffHunk[] = [];
    const lines = diffOutput.split('\n');
    
    let inFile = false;
    let currentHunk: DiffHunk | null = null;
    let hunkContent: string[] = [];

    for (const line of lines) {
      if (line.startsWith('diff --git')) {
        inFile = line.includes(filePath);
        if (currentHunk && hunkContent.length > 0) {
          currentHunk.content = hunkContent.join('\n');
          currentHunk = null;
          hunkContent = [];
        }
      } else if (inFile && line.startsWith('@@')) {
        if (currentHunk && hunkContent.length > 0) {
          currentHunk.content = hunkContent.join('\n');
          hunkContent = [];
        }
        
        // Parse hunk header: @@ -old_start,old_lines +new_start,new_lines @@
        const match = line.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
        if (match) {
          currentHunk = {
            oldStart: parseInt(match[1]),
            oldLines: parseInt(match[2] || '1'),
            newStart: parseInt(match[3]),
            newLines: parseInt(match[4] || '1'),
            content: '',
            context: line.substring(line.indexOf('@@', 2) + 2).trim()
          };
          hunks.push(currentHunk);
        }
      } else if (inFile && currentHunk) {
        hunkContent.push(line);
      }
    }

    if (currentHunk && hunkContent.length > 0) {
      currentHunk.content = hunkContent.join('\n');
    }

    return hunks;
  }

  private parseStats(statsOutput: string, files: DiffFile[]): DiffStats {
    const lines = statsOutput.split('\n');
    const lastLine = lines[lines.length - 1] || '';
    
    // Parse summary line: "X files changed, Y insertions(+), Z deletions(-)"
    const match = lastLine.match(/(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?/);
    
    const totalFiles = files.length;
    const additions = match ? parseInt(match[2] || '0') : files.reduce((sum, f) => sum + f.additions, 0);
    const deletions = match ? parseInt(match[3] || '0') : files.reduce((sum, f) => sum + f.deletions, 0);

    return {
      totalFiles,
      additions,
      deletions,
      modifications: additions + deletions,
      renames: files.filter(f => f.status === 'renamed').length,
      filesAdded: files.filter(f => f.status === 'added').length,
      filesDeleted: files.filter(f => f.status === 'deleted').length,
      filesModified: files.filter(f => f.status === 'modified').length
    };
  }

  private parseCommits(commitsOutput: string): CommitInfo[] {
    const commits: CommitInfo[] = [];
    const lines = commitsOutput.trim().split('\n');
    
    let currentCommit: CommitInfo | null = null;
    let collectingFiles = false;

    for (const line of lines) {
      if (line.includes('|')) {
        // Commit info line
        if (currentCommit) {
          commits.push(currentCommit);
        }
        
        const [sha, author, date, ...messageParts] = line.split('|');
        currentCommit = {
          sha,
          author,
          date: new Date(date),
          message: messageParts.join('|'),
          files: []
        };
        collectingFiles = true;
      } else if (collectingFiles && line && currentCommit) {
        currentCommit.files.push(line);
      } else if (!line) {
        collectingFiles = false;
      }
    }

    if (currentCommit) {
      commits.push(currentCommit);
    }

    return commits;
  }

  private isCodeFile(filePath: string): boolean {
    const codeExtensions = [
      '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.go', '.rs', '.cpp', '.c',
      '.rb', '.php', '.swift', '.kt', '.scala', '.r', '.m', '.mm', '.h', '.hpp'
    ];
    
    return codeExtensions.some(ext => filePath.endsWith(ext));
  }

  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const languageMap: { [key: string]: string } = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.go': 'go',
      '.rs': 'rust',
      '.rb': 'ruby',
      '.php': 'php',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala',
      '.r': 'r',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp'
    };
    
    return languageMap[ext] || 'unknown';
  }

  private detectFileType(filePath: string): string {
    if (filePath.includes('test') || filePath.includes('spec')) return 'test';
    if (filePath.includes('config')) return 'config';
    if (filePath.includes('.d.ts')) return 'types';
    if (filePath.includes('interface')) return 'interface';
    if (filePath.includes('model') || filePath.includes('schema')) return 'model';
    if (filePath.includes('service')) return 'service';
    if (filePath.includes('controller') || filePath.includes('route')) return 'controller';
    if (filePath.includes('component')) return 'component';
    if (filePath.includes('util') || filePath.includes('helper')) return 'utility';
    return 'source';
  }

  private async extractChangedFunctions(file: DiffFile): Promise<ChangedFunction[]> {
    const functions: ChangedFunction[] = [];
    
    // Parse hunks to find function changes
    for (const hunk of file.hunks) {
      const functionPattern = /(?:function|const|let|var|export)\s+(\w+)\s*(?:=\s*)?(?:\([^)]*\)|async|function)/g;
      const matches = [...hunk.content.matchAll(functionPattern)];
      
      for (const match of matches) {
        const functionName = match[1];
        const line = hunk.newStart + hunk.content.substring(0, match.index).split('\n').length - 1;
        
        functions.push({
          name: functionName,
          file: file.path,
          lineNumber: line,
          changeType: file.status === 'added' ? 'added' : 'modified',
          signatureChanged: this.checkSignatureChange(hunk.content, functionName),
          oldSignature: this.extractOldSignature(hunk.content, functionName),
          newSignature: this.extractNewSignature(hunk.content, functionName)
        });
      }
    }
    
    return functions;
  }

  private async extractChangedClasses(file: DiffFile): Promise<ChangedClass[]> {
    const classes: ChangedClass[] = [];
    
    for (const hunk of file.hunks) {
      const classPattern = /class\s+(\w+)(?:\s+extends\s+\w+)?(?:\s+implements\s+[\w,\s]+)?/g;
      const matches = [...hunk.content.matchAll(classPattern)];
      
      for (const match of matches) {
        const className = match[1];
        const line = hunk.newStart + hunk.content.substring(0, match.index).split('\n').length - 1;
        
        classes.push({
          name: className,
          file: file.path,
          lineNumber: line,
          changeType: file.status === 'added' ? 'added' : 'modified',
          methodsChanged: this.extractChangedMethods(hunk.content, className),
          propertiesChanged: this.extractChangedProperties(hunk.content, className),
          interfaceChanged: this.checkInterfaceChange(hunk.content, className)
        });
      }
    }
    
    return classes;
  }

  private checkSignatureChange(hunkContent: string, functionName: string): boolean {
    const oldSignature = this.extractOldSignature(hunkContent, functionName);
    const newSignature = this.extractNewSignature(hunkContent, functionName);
    return oldSignature !== newSignature;
  }

  private extractOldSignature(hunkContent: string, functionName: string): string {
    const lines = hunkContent.split('\n').filter(l => l.startsWith('-'));
    const signatureLine = lines.find(l => l.includes(functionName));
    return signatureLine ? signatureLine.substring(1).trim() : '';
  }

  private extractNewSignature(hunkContent: string, functionName: string): string {
    const lines = hunkContent.split('\n').filter(l => l.startsWith('+'));
    const signatureLine = lines.find(l => l.includes(functionName));
    return signatureLine ? signatureLine.substring(1).trim() : '';
  }

  private extractChangedMethods(hunkContent: string, className: string): string[] {
    const methods: string[] = [];
    const methodPattern = /(?:public|private|protected)?\s*(?:static)?\s*(?:async)?\s*(\w+)\s*\(/g;
    const matches = [...hunkContent.matchAll(methodPattern)];
    
    for (const match of matches) {
      if (match[1] !== className) { // Not constructor
        methods.push(match[1]);
      }
    }
    
    return methods;
  }

  private extractChangedProperties(hunkContent: string, className: string): string[] {
    const properties: string[] = [];
    const propertyPattern = /(?:public|private|protected)\s+(?:readonly\s+)?(\w+)(?:\?)?:/g;
    const matches = [...hunkContent.matchAll(propertyPattern)];
    
    for (const match of matches) {
      properties.push(match[1]);
    }
    
    return properties;
  }

  private checkInterfaceChange(hunkContent: string, className: string): boolean {
    // Check if public API changed
    const publicMethodsChanged = hunkContent.includes('public') && 
                                (hunkContent.includes('+') || hunkContent.includes('-'));
    const exportsChanged = hunkContent.includes('export') && 
                          (hunkContent.includes('+') || hunkContent.includes('-'));
    
    return publicMethodsChanged || exportsChanged;
  }

  private checkForBreakingChanges(
    file: DiffFile, 
    functions: ChangedFunction[], 
    classes: ChangedClass[]
  ): BreakingChange[] {
    const breaking: BreakingChange[] = [];
    
    // Check for removed functions
    for (const func of functions) {
      if (func.signatureChanged) {
        breaking.push({
          type: 'signature',
          severity: 'high',
          component: func.name,
          description: `Function signature changed: ${func.name}`,
          migrationPath: `Update all calls to ${func.name} with new signature`,
          affectedFiles: [] // Would need to find callers
        });
      }
    }
    
    // Check for interface changes in classes
    for (const cls of classes) {
      if (cls.interfaceChanged) {
        breaking.push({
          type: 'api',
          severity: 'high',
          component: cls.name,
          description: `Class interface changed: ${cls.name}`,
          migrationPath: `Review all usages of ${cls.name}`,
          affectedFiles: []
        });
      }
    }
    
    // Check for removed files
    if (file.status === 'deleted') {
      breaking.push({
        type: 'removal',
        severity: 'critical',
        component: file.path,
        description: `File removed: ${file.path}`,
        migrationPath: 'Update all imports and usages',
        affectedFiles: []
      });
    }
    
    return breaking;
  }

  private checkSecurityImplications(file: DiffFile): SecurityChange[] {
    const security: SecurityChange[] = [];
    
    for (const hunk of file.hunks) {
      // Check for authentication changes
      if (hunk.content.match(/auth|token|jwt|session/i)) {
        security.push({
          type: 'authentication',
          severity: 'high',
          file: file.path,
          lineNumber: hunk.newStart,
          description: 'Authentication logic modified',
          recommendation: 'Review authentication flow for security implications'
        });
      }
      
      // Check for SQL changes
      if (hunk.content.match(/SELECT|INSERT|UPDATE|DELETE|query/i)) {
        security.push({
          type: 'validation',
          severity: 'medium',
          file: file.path,
          lineNumber: hunk.newStart,
          description: 'Database query modified',
          recommendation: 'Ensure proper input validation and parameterization'
        });
      }
      
      // Check for exposed secrets
      if (hunk.content.match(/api[_-]?key|secret|password|token/i) && 
          hunk.content.match(/["\'][\w-]{20,}["\']/)) {
        security.push({
          type: 'exposure',
          severity: 'critical',
          file: file.path,
          lineNumber: hunk.newStart,
          description: 'Potential secret exposed in code',
          recommendation: 'Move secrets to environment variables'
        });
      }
    }
    
    return security;
  }

  private checkPerformanceImplications(file: DiffFile): PerformanceChange[] {
    const performance: PerformanceChange[] = [];
    
    for (const hunk of file.hunks) {
      // Check for loop changes
      if (hunk.content.match(/for\s*\(|while\s*\(|\.forEach|\.map/)) {
        const hasNestedLoop = hunk.content.match(/for.*for|while.*while/s);
        
        if (hasNestedLoop) {
          performance.push({
            type: 'algorithm',
            impact: 'negative',
            file: file.path,
            description: 'Nested loop detected - potential O(n²) complexity',
            metrics: {
              before: 'O(n)',
              after: 'O(n²)'
            }
          });
        }
      }
      
      // Check for database query in loop
      if (hunk.content.match(/for.*(?:query|find|select|fetch)/si)) {
        performance.push({
          type: 'database',
          impact: 'negative',
          file: file.path,
          description: 'Database query in loop detected - N+1 query problem',
          metrics: {
            before: '1 query',
            after: 'N queries'
          }
        });
      }
      
      // Check for caching additions
      if (hunk.content.match(/cache|memo|useMemo|useCallback/i)) {
        performance.push({
          type: 'memory',
          impact: 'positive',
          file: file.path,
          description: 'Caching/memoization added',
          metrics: {
            before: 'No caching',
            after: 'With caching'
          }
        });
      }
    }
    
    return performance;
  }

  private findRelevantHunk(file: DiffFile, lineNumber: number): DiffHunk | undefined {
    return file.hunks.find(hunk => 
      lineNumber >= hunk.newStart && 
      lineNumber < hunk.newStart + hunk.newLines
    );
  }

  private async checkIssueExists(
    issue: { id: string; title: string; severity: string },
    diff: GitDiff
  ): Promise<boolean> {
    // This would need actual issue detection logic
    // For now, return false to indicate issue might be fixed
    return false;
  }

  private async gatherFixEvidence(
    issue: { id: string; title: string; severity: string },
    changes: ChangeAnalysis,
    diff: GitDiff
  ): Promise<{
    codeChange?: string;
    testAdded?: boolean;
    testPassing?: boolean;
    manualVerification?: boolean;
  }> {
    // Look for evidence that the issue was fixed
    const evidence: any = {};
    
    // Check if relevant code was changed
    const relevantChanges = changes.changedFunctions.filter(f => 
      f.name.toLowerCase().includes(issue.title.toLowerCase().split(' ')[0])
    );
    
    if (relevantChanges.length > 0) {
      evidence.codeChange = `Modified ${relevantChanges[0].name}`;
    }
    
    // Check if tests were added
    const testFiles = diff.files.filter(f => 
      f.path.includes('test') || f.path.includes('spec')
    );
    
    if (testFiles.length > 0) {
      evidence.testAdded = true;
    }
    
    return evidence;
  }

  private parseBlameOutput(blameOutput: string): CommitInfo[] {
    const commits: CommitInfo[] = [];
    const lines = blameOutput.split('\n');
    const commitMap = new Map<string, CommitInfo>();
    
    for (const line of lines) {
      const match = line.match(/^(\w{40})\s+\(([^)]+)\s+(\d{4}-\d{2}-\d{2})/);
      if (match) {
        const [, sha, author, date] = match;
        
        if (!commitMap.has(sha)) {
          commitMap.set(sha, {
            sha,
            author,
            date: new Date(date),
            message: '', // Would need separate git show command
            files: []
          });
        }
      }
    }
    
    return Array.from(commitMap.values());
  }

  private async findImporters(filePath: string): Promise<string[]> {
    try {
      // Search for files that import this file
      const fileName = path.basename(filePath, path.extname(filePath));
      const { stdout } = await execAsync(
        `grep -r "import.*${fileName}" --include="*.js" --include="*.ts" --include="*.jsx" --include="*.tsx" | cut -d: -f1 | sort -u`,
        { maxBuffer: 5 * 1024 * 1024 }
      );
      
      return stdout.trim().split('\n').filter(Boolean);
    } catch (error) {
      return [];
    }
  }

  private async detectAPIChanges(file: DiffFile): Promise<BreakingChange[]> {
    const changes: BreakingChange[] = [];
    
    for (const hunk of file.hunks) {
      // Check for route changes
      if (hunk.content.match(/router\.(get|post|put|delete|patch)/i)) {
        const oldRoutes = this.extractRoutes(hunk.content, '-');
        const newRoutes = this.extractRoutes(hunk.content, '+');
        
        // Find removed routes
        for (const route of oldRoutes) {
          if (!newRoutes.includes(route)) {
            changes.push({
              type: 'api',
              severity: 'critical',
              component: route,
              description: `API endpoint removed: ${route}`,
              migrationPath: 'Update all clients to remove calls to this endpoint',
              affectedFiles: []
            });
          }
        }
      }
    }
    
    return changes;
  }

  private async detectInterfaceChanges(file: DiffFile): Promise<BreakingChange[]> {
    const changes: BreakingChange[] = [];
    
    for (const hunk of file.hunks) {
      if (hunk.content.match(/interface\s+\w+/)) {
        // Check for property removals
        const removedProperties = hunk.content
          .split('\n')
          .filter(l => l.startsWith('-') && l.includes(':'))
          .map(l => l.match(/(\w+):/)?.[1])
          .filter(Boolean);
        
        for (const prop of removedProperties) {
          changes.push({
            type: 'api',
            severity: 'high',
            component: `${file.path}:${prop}`,
            description: `Interface property removed: ${prop}`,
            migrationPath: 'Update all implementations and usages',
            affectedFiles: []
          });
        }
      }
    }
    
    return changes;
  }

  private async detectSchemaChanges(file: DiffFile): Promise<BreakingChange[]> {
    const changes: BreakingChange[] = [];
    
    for (const hunk of file.hunks) {
      // Check for field removals or type changes
      const schemaChanges = hunk.content.match(/type:.*|required:.*|unique:.*/gi);
      
      if (schemaChanges) {
        changes.push({
          type: 'schema',
          severity: 'high',
          component: file.path,
          description: 'Database schema changed',
          migrationPath: 'Create migration script for existing data',
          affectedFiles: []
        });
      }
    }
    
    return changes;
  }

  private async detectRemovals(file: DiffFile): Promise<BreakingChange[]> {
    const changes: BreakingChange[] = [];
    
    if (file.status === 'deleted') {
      changes.push({
        type: 'removal',
        severity: 'critical',
        component: file.path,
        description: `File removed: ${file.path}`,
        migrationPath: 'Update all imports and dependencies',
        affectedFiles: await this.findImporters(file.path)
      });
    } else {
      // Check for export removals
      for (const hunk of file.hunks) {
        const removedExports = hunk.content
          .split('\n')
          .filter(l => l.startsWith('-') && l.includes('export'))
          .map(l => l.match(/export\s+(?:const|function|class)\s+(\w+)/)?.[1])
          .filter(Boolean);
        
        for (const exp of removedExports) {
          changes.push({
            type: 'removal',
            severity: 'high',
            component: `${file.path}:${exp}`,
            description: `Export removed: ${exp}`,
            migrationPath: `Update all imports of ${exp}`,
            affectedFiles: []
          });
        }
      }
    }
    
    return changes;
  }

  private extractRoutes(hunkContent: string, prefix: string): string[] {
    const routes: string[] = [];
    const lines = hunkContent.split('\n').filter(l => l.startsWith(prefix));
    
    for (const line of lines) {
      const match = line.match(/router\.\w+\(['"]([^'"]+)['"]/);
      if (match) {
        routes.push(match[1]);
      }
    }
    
    return routes;
  }
}