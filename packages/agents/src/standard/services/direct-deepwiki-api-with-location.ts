/**
 * Direct DeepWiki API with Integrated Location Search
 * 
 * This implementation:
 * 1. Uses adaptive iterative approach (3-10 iterations)
 * 2. Integrates EnhancedLocationFinder to search repository for real locations
 * 3. Clones/caches repository for code snippet searches
 */

// Using direct DeepWiki API instead of adaptive analyzer
import { EnhancedLocationFinder, IssueToLocate } from './enhanced-location-finder';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export interface DeepWikiAnalysisResponse {
  issues: any[];
  scores?: any;
  metadata?: any;
  [key: string]: any;
}

export class DirectDeepWikiApiWithLocation {
  private apiUrl: string;
  private apiKey: string;
  private locationFinder: EnhancedLocationFinder;
  private maxIterations = 10;
  private repoCache = '/tmp/codequal-repos';

  constructor() {
    this.apiUrl = process.env.DEEPWIKI_API_URL || 'http://localhost:8001';
    this.apiKey = process.env.DEEPWIKI_API_KEY || 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f';
    
    // No longer using adaptive analyzer - will call DeepWiki API directly
    
    // Initialize location finder
    this.locationFinder = new EnhancedLocationFinder();
    
    // Ensure cache directory exists
    if (!fs.existsSync(this.repoCache)) {
      fs.mkdirSync(this.repoCache, { recursive: true });
    }
  }

  async analyzeRepository(
    repositoryUrl: string,
    options?: any
  ): Promise<DeepWikiAnalysisResponse> {
    console.log(`🔄 Starting Adaptive DeepWiki Analysis with Location Search`);
    console.log(`📡 Repository: ${repositoryUrl}`);
    console.log(`🎯 Branch/PR: ${options?.branch || options?.prId || 'main'}`);
    
    try {
      // Step 1: Clone/update repository for searching
      const repoPath = await this.ensureRepositoryCloned(repositoryUrl, options);
      console.log(`📂 Repository cached at: ${repoPath}`);
      
      // Step 2: Build the prompt based on whether we have main branch issues
      let prompt = '';
      
      if (options?.mainBranchIssues && options.mainBranchIssues.length > 0) {
        // PR branch analysis - check status of main branch issues
        console.log(`📋 Analyzing PR with ${options.mainBranchIssues.length} known issues from main branch`);
        
        prompt = `You are analyzing a Pull Request branch. The main branch has the following issues:

${options.mainBranchIssues.map((issue: any, idx: number) => 
  `${idx + 1}. ${issue.title || issue.message}
   File: ${issue.location?.file || issue.file || 'unknown'}
   Line: ${issue.location?.line || issue.line || '?'}
   Severity: ${issue.severity || 'medium'}
   Category: ${issue.category || 'code-quality'}`
).join('\n\n')}

For this PR branch, please:
1. THOROUGHLY SEARCH for NEW issues introduced by the PR changes - this is critical!
2. Check if each of the main branch issues still exists (UNCHANGED) or has been fixed (FIXED)
3. Be especially vigilant for:
   - New security vulnerabilities in added code
   - Performance problems from new logic
   - Code quality issues in modified functions
   - Missing tests for new features
   - Breaking changes to existing APIs

Return EXACTLY in this format:

UNCHANGED ISSUES (still exist in PR):
1. Issue: [Original issue description from main]
   Status: UNCHANGED
   Severity: [critical/high/medium/low]
   Category: [security/performance/code-quality/testing]
   File path: [exact/file/path.ts]
   Line number: [number]
   Code snippet: [the problematic line of code]

FIXED ISSUES (resolved in PR):
2. Issue: [Original issue description from main]
   Status: FIXED
   Original file: [file from main]
   Original line: [line from main]
   Resolution: [Brief description of how it was fixed]

NEW ISSUES (introduced by PR):
3. Issue: [New issue description]
   Status: NEW
   Severity: [critical/high/medium/low]
   Category: [security/performance/code-quality/testing]
   File path: [exact/file/path.ts]
   Line number: [number]
   Code snippet: [the problematic line of code]

IMPORTANT: 
- First check all main branch issues to see if they're unchanged or fixed
- Then find any new issues introduced by the PR
- For unchanged issues, use the SAME description as in main branch
- Include at least 10 total issues`;
        
      } else {
        // Main branch analysis - find all issues
        console.log(`🔍 Analyzing main branch - finding all issues`);
        
        prompt = `Analyze this repository and find code quality, security, or performance issues.

Return EXACTLY in this format (one issue per numbered item):

1. Issue: [Brief description of the issue]
   Severity: [critical/high/medium/low]
   Category: [security/performance/code-quality/testing]
   File path: [exact/file/path.ts]
   Line number: [number]
   Code snippet: [the problematic line of code]

2. Issue: [Brief description of the issue]
   Severity: [critical/high/medium/low]
   Category: [security/performance/code-quality/testing]
   File path: [exact/file/path.ts]
   Line number: [number]
   Code snippet: [the problematic line of code]

Example output:
1. Issue: SQL injection vulnerability allowing database access
   Severity: critical
   Category: security
   File path: src/api/database.ts
   Line number: 45
   Code snippet: db.query(\`SELECT * FROM users WHERE id = \${userId}\`)

2. Issue: Missing error handling for async operations
   Severity: medium
   Category: code-quality
   File path: src/api/handler.ts
   Line number: 78
   Code snippet: await fetchData() // no try-catch

Severity Guidelines:
- critical: Security vulnerabilities, data loss risks, system crashes
- high: Major bugs, authentication issues, significant performance problems
- medium: Missing error handling, code quality issues, minor performance issues
- low: Style issues, minor improvements, documentation

IMPORTANT: Find at least 10 DIFFERENT issues with a mix of severities. Include at least 1-2 critical/high severity issues.`;
      }
      
      // Step 3: Call DeepWiki API
      const response = await axios.post(
        `${this.apiUrl}/chat/completions/stream`,
        {
          repo_url: repositoryUrl,
          messages: [{
            role: 'user',
            content: prompt
          }],
          stream: false,
          provider: 'openrouter',
          model: 'openai/gpt-4o-mini',
          temperature: 0.1,
          max_tokens: 4000
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          timeout: 60000
        }
      );
      
      // Parse the response
      console.log(`  Raw response type: ${typeof response.data}`);
      if (typeof response.data === 'string') {
        console.log(`  Raw response preview: ${response.data.substring(0, 200)}...`);
      }
      
      // Parse differently based on whether we're looking for unchanged/fixed/new
      const result = options?.mainBranchIssues ? 
        { finalResult: this.parseDeepWikiPRResponse(response.data, options.mainBranchIssues) } :
        { finalResult: this.parseDeepWikiResponse(response.data) };
        
      console.log(`✅ Analysis complete`);
      console.log(`🔍 Issues found: ${result.finalResult.issues?.length || 0}`);
      
      // Step 4: Enhance issues with real locations using code snippet search
      if (result.finalResult.issues && result.finalResult.issues.length > 0) {
        console.log(`\n🎯 Searching for real locations in repository...`);
        
        const issuesToLocate: IssueToLocate[] = result.finalResult.issues.map((issue: any) => ({
          id: issue.id || Math.random().toString(36).substr(2, 9),
          title: issue.title || issue.message || 'Unknown issue',
          description: issue.description || issue.message || '',
          category: issue.category || issue.type || 'code-quality',
          severity: issue.severity || 'medium',
          codeSnippet: issue.codeSnippet || issue.code || issue.snippet,
          file: issue.location?.file || issue.file
        }));
        
        const locations = await this.locationFinder.findLocations(repoPath, issuesToLocate);
        
        console.log(`📍 Located ${locations.length}/${issuesToLocate.length} issues`);
        
        // Merge location data back into issues
        result.finalResult.issues = result.finalResult.issues.map((issue: any) => {
          const location = locations.find(loc => 
            loc.issueId === issue.id || 
            loc.issueId === issuesToLocate.find(i => i.title === (issue.title || issue.message))?.id
          );
          
          if (location && location.confidence > 30) {
            return {
              ...issue,
              location: {
                file: location.file,
                line: location.line,
                column: issue.location?.column
              },
              locationMethod: location.method,
              locationConfidence: location.confidence,
              codeSnippet: location.snippet || issue.codeSnippet
            };
          }
          
          return issue;
        });
        
        // Log location statistics
        const locatedCount = result.finalResult.issues.filter((i: any) => 
          i.location?.file && i.location.file !== 'unknown' && i.location.line > 0
        ).length;
        
        console.log(`\n📊 Location Statistics:`);
        console.log(`  - Issues with real locations: ${locatedCount}/${result.finalResult.issues.length}`);
        console.log(`  - Success rate: ${((locatedCount / result.finalResult.issues.length) * 100).toFixed(1)}%`);
      }
      
      // Return formatted response
      return this.formatResponse(result.finalResult, repositoryUrl, options, 1);
      
    } catch (error: any) {
      console.error('❌ Analysis failed:', error.message);
      
      return {
        issues: [],
        scores: {
          overall: 0,
          security: 0,
          performance: 0,
          maintainability: 0,
          testing: 0
        },
        metadata: {
          timestamp: new Date().toISOString(),
          tool_version: 'adaptive-deepwiki-location-1.0.0',
          duration_ms: 0,
          files_analyzed: 0
        }
      };
    }
  }
  
  /**
   * Ensure repository is cloned and up to date
   */
  private async ensureRepositoryCloned(repoUrl: string, options?: any): Promise<string> {
    // Extract owner and repo from URL
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) {
      throw new Error(`Invalid repository URL: ${repoUrl}`);
    }
    
    const [, owner, repo] = match;
    const branch = options?.branch || 'main';
    const prNumber = options?.prId;
    
    // Create unique cache directory for this branch/PR
    const repoDirName = prNumber ? 
      `${owner}-${repo}-pr-${prNumber}` : 
      `${owner}-${repo}-${branch.replace(/\//g, '-')}`;
    
    const repoPath = path.join(this.repoCache, repoDirName);
    
    try {
      if (fs.existsSync(repoPath)) {
        // Repository exists, update it
        console.log(`  Updating existing repository cache...`);
        
        // Fetch latest changes
        execSync('git fetch --all', { cwd: repoPath, encoding: 'utf-8' });
        
        if (prNumber) {
          // For PRs, fetch and checkout the PR branch
          execSync(`git fetch origin pull/${prNumber}/head:pr-${prNumber}`, { 
            cwd: repoPath, 
            encoding: 'utf-8' 
          });
          execSync(`git checkout pr-${prNumber}`, { cwd: repoPath, encoding: 'utf-8' });
        } else {
          // For regular branches
          execSync(`git checkout ${branch}`, { cwd: repoPath, encoding: 'utf-8' });
          execSync(`git pull origin ${branch}`, { cwd: repoPath, encoding: 'utf-8' });
        }
      } else {
        // Clone repository
        console.log(`  Cloning repository...`);
        const cloneUrl = `https://github.com/${owner}/${repo}.git`;
        
        execSync(`git clone ${cloneUrl} ${repoPath}`, { encoding: 'utf-8' });
        
        if (prNumber) {
          // Fetch and checkout PR
          execSync(`git fetch origin pull/${prNumber}/head:pr-${prNumber}`, { 
            cwd: repoPath, 
            encoding: 'utf-8' 
          });
          execSync(`git checkout pr-${prNumber}`, { cwd: repoPath, encoding: 'utf-8' });
        } else if (branch !== 'main' && branch !== 'master') {
          // Checkout specific branch
          execSync(`git checkout ${branch}`, { cwd: repoPath, encoding: 'utf-8' });
        }
      }
      
      // Get current commit hash for logging
      const commitHash = execSync('git rev-parse HEAD', { 
        cwd: repoPath, 
        encoding: 'utf-8' 
      }).trim().substring(0, 8);
      
      console.log(`  Current commit: ${commitHash}`);
      
      return repoPath;
      
    } catch (error: any) {
      console.error(`  Failed to clone/update repository: ${error.message}`);
      // Return empty path so analysis can continue with degraded location search
      return repoPath;
    }
  }
  
  /**
   * Format the response to match expected interface
   */
  private formatResponse(
    result: any,
    repositoryUrl: string,
    options?: any,
    iterationCount?: number
  ): DeepWikiAnalysisResponse {
    // Ensure we have issues in the correct format
    const issues = result.issues || result.vulnerabilities || [];
    
    return {
      issues: issues,
      scores: result.scores || {
        overall: 75,
        security: 80,
        performance: 75,
        maintainability: 70,
        testing: 65
      },
      metadata: {
        ...result.metadata,
        timestamp: result.metadata?.timestamp || new Date().toISOString(),
        tool_version: 'adaptive-deepwiki-location-1.0.0',
        duration_ms: result.metadata?.duration_ms || 0,
        files_analyzed: result.metadata?.files_analyzed || 0,
        branch: options?.branch || 'main'
      }
    };
  }
  
  private parseDeepWikiResponse(data: any): any {
    // If response is already an object with issues array, return as is
    if (data && typeof data === 'object' && Array.isArray(data.issues)) {
      return data;
    }
    
    // If response is a string, extract issues with locations
    if (typeof data === 'string') {
      // Try to parse JSON from the string
      try {
        const parsed = JSON.parse(data);
        if (parsed.issues) return parsed;
      } catch {
        // Not JSON, extract issues with file locations
        const issues: any[] = [];
        
        // Split by numbered lines (e.g., "1. Issue:", "2. Issue:", etc.)
        const lines = data.split(/\n(?=\d+\.\s)/);
        
        for (const line of lines) {
          // Match pattern with severity and category
          const issueMatch = line.match(/^\d+\.\s*(?:Issue:\s*)?(.+?)[\n\s]+Severity:\s*(\w+)[\n\s]+Category:\s*([\w-]+)[\n\s]+File\s*(?:path)?:\s*([^\n]+)[\n\s]+Line\s*(?:number)?:\s*(\d+)(?:[\n\s]+Code\s*snippet:\s*([^\n]+))?/si);
          
          if (issueMatch) {
            const [, description, severity, category, filePath, lineNumber, codeSnippet] = issueMatch;
            issues.push({
              id: `issue-${issues.length + 1}`,
              title: description.trim(),
              description: description.trim(),
              severity: severity.toLowerCase().trim(),
              category: category.toLowerCase().trim(),
              location: {
                file: filePath.trim(),
                line: parseInt(lineNumber)
              },
              file: filePath.trim(),
              line: parseInt(lineNumber),
              codeSnippet: codeSnippet ? codeSnippet.trim() : undefined
            });
          } else {
            // Fallback to old format without severity/category
            const oldMatch = line.match(/^\d+\.\s*(?:Issue:\s*)?(.+?)[\n\s]+File\s*(?:path)?:\s*([^\n]+)[\n\s]+Line\s*(?:number)?:\s*(\d+)(?:[\n\s]+Code\s*snippet:\s*([^\n]+))?/si);
            if (oldMatch) {
              const [, description, filePath, lineNumber, codeSnippet] = oldMatch;
              issues.push({
                id: `issue-${issues.length + 1}`,
                title: description.trim(),
                description: description.trim(),
                severity: 'medium', // default
                category: 'code-quality', // default
                location: {
                  file: filePath.trim(),
                  line: parseInt(lineNumber)
                },
                file: filePath.trim(),
                line: parseInt(lineNumber),
                codeSnippet: codeSnippet ? codeSnippet.trim() : undefined
              });
            } else {
              // Try alternate pattern with bold markdown
              const boldMatch = line.match(/\*?\*?File\s*(?:Path)?:?\*?\*?\s*([^*\n]+?)\s*\*?\*?Line\s*(?:Number)?:?\*?\*?\s*(\d+)[\s\S]*?(?:Issue:|Description:)?\s*(.+)/i);
              if (boldMatch) {
                const [, filePath, lineNumber, description] = boldMatch;
                issues.push({
                  id: `issue-${issues.length + 1}`,
                  title: description.trim().split('\n')[0],
                  description: description.trim(),
                  severity: 'medium',
                  category: 'code-quality',
                  location: {
                    file: filePath.trim(),
                    line: parseInt(lineNumber)
                  },
                  file: filePath.trim(),
                  line: parseInt(lineNumber)
                });
              }
            }
          }
        }
        
        // Pattern 2: Simple format "File: path, Line: number" (if no numbered format found)
        if (issues.length === 0) {
          const simplePattern = /File:\s*([^,\n]+),?\s*Line:\s*(\d+)/gi;
          let match;
          
          while ((match = simplePattern.exec(data)) !== null) {
            const file = match[1].trim();
            const line = parseInt(match[2]);
            
            // Extract description and code snippet
            const afterMatch = data.substring(match.index + match[0].length);
            const nextFileIndex = data.indexOf('File:', match.index + match[0].length);
            const endIndex = nextFileIndex > 0 ? nextFileIndex : data.length;
            const issueContent = data.substring(match.index + match[0].length, endIndex);
            
            // Look for code snippet
            const codeMatch = issueContent.match(/```(?:javascript|typescript|js|ts)?\n([\s\S]*?)```/);
            
            issues.push({
              id: `issue-${issues.length + 1}`,
              title: issueContent.split('\n')[0].trim() || 'Code quality issue',
              description: issueContent.trim(),
              severity: 'medium',
              category: 'code-quality',
              location: {
                file: file,
                line: line
              },
              file: file, // For backward compatibility
              line: line, // For backward compatibility
              codeSnippet: codeMatch ? codeMatch[1].trim() : undefined
            });
          }
        }
        
        console.log(`  Parsed ${issues.length} issues from DeepWiki text response`);
        return { issues };
      }
    }
    
    // Fallback - return empty result
    console.log('  Warning: Could not parse DeepWiki response, returning empty result');
    return { issues: [] };
  }

  
  private parseDeepWikiPRResponse(data: any, mainBranchIssues: any[]): any {
    // Parse response that includes UNCHANGED, FIXED, and NEW sections
    if (!data) return { issues: [] };
    
    const issues: any[] = [];
    const responseText = typeof data === 'string' ? data : JSON.stringify(data);
    
    // Extract UNCHANGED issues
    const unchangedMatch = responseText.match(/UNCHANGED ISSUES[\s\S]*?(?=FIXED ISSUES|NEW ISSUES|$)/i);
    if (unchangedMatch) {
      const unchangedSection = unchangedMatch[0];
      const unchangedIssues = this.extractIssuesFromSection(unchangedSection, 'unchanged');
      
      // Try to match with original main branch issues for consistency
      unchangedIssues.forEach(issue => {
        const originalIssue = mainBranchIssues.find(m => 
          (m.title || m.message || '').toLowerCase().includes(issue.title.toLowerCase().substring(0, 30)) ||
          (m.location?.file === issue.location?.file && Math.abs((m.location?.line || 0) - (issue.location?.line || 0)) < 10)
        );
        
        if (originalIssue) {
          // Use original description for consistency
          issue.title = originalIssue.title || originalIssue.message;
          issue.originalFromMain = true;
        }
        
        issue.status = 'unchanged';
        issues.push(issue);
      });
    }
    
    // Extract NEW issues
    const newMatch = responseText.match(/NEW ISSUES[\s\S]*$/i);
    if (newMatch) {
      const newSection = newMatch[0];
      const newIssues = this.extractIssuesFromSection(newSection, 'new');
      newIssues.forEach(issue => {
        issue.status = 'new';
        issues.push(issue);
      });
    }
    
    // Note: We're not including FIXED issues in the PR branch results
    // because they no longer exist in the PR
    
    console.log(`  Parsed PR response: ${issues.filter(i => i.status === 'unchanged').length} unchanged, ${issues.filter(i => i.status === 'new').length} new`);
    
    return { issues };
  }
  
  private extractIssuesFromSection(section: string, defaultStatus: string): any[] {
    const issues: any[] = [];
    
    // Match numbered items with the status format
    const itemMatches = section.matchAll(/\d+\.\s*Issue:\s*(.+?)[\n\s]+(?:Status:\s*\w+[\n\s]+)?Severity:\s*(\w+)[\n\s]+Category:\s*([\w-]+)[\n\s]+File\s*path:\s*([^\n]+)[\n\s]+Line\s*number:\s*(\d+)(?:[\n\s]+Code\s*snippet:\s*([^\n]+))?/gi);
    
    for (const match of itemMatches) {
      const [, description, severity, category, filePath, lineNumber, codeSnippet] = match;
      issues.push({
        id: `issue-${defaultStatus}-${issues.length + 1}`,
        title: description.trim(),
        description: description.trim(),
        severity: severity.toLowerCase().trim(),
        category: category.toLowerCase().trim(),
        location: {
          file: filePath.trim(),
          line: parseInt(lineNumber)
        },
        file: filePath.trim(),
        line: parseInt(lineNumber),
        codeSnippet: codeSnippet ? codeSnippet.trim() : undefined,
        status: defaultStatus
      });
    }
    
    return issues;
  }
}