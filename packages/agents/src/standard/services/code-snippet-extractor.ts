/**
 * Code Snippet Extractor
 * 
 * Extracts actual code snippets from repository files after DeepWiki analysis
 * This solves the problem where DeepWiki returns generic/fake code snippets
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export interface CodeLocation {
  file: string;
  line: number;
  description?: string;
}

export interface ExtractedSnippet {
  file: string;
  line: number;
  snippet: string;
  context: string[]; // Lines before and after
}

export class CodeSnippetExtractor {
  
  /**
   * Check if code looks like generic placeholder code (language-agnostic)
   */
  private isGenericPlaceholderCode(code: string): boolean {
    const placeholderPatterns = [
      // Generic URLs and domains
      'example.com', 'http://example', 'https://example', 'test.com', 'localhost:8080',
      'foo.bar', 'mysite.com', 'yoursite.com', 'demo.com',
      
      // Generic variable/function names across languages
      'yourVariable', 'myVariable', 'someFunction', 'doSomething', 'handleClick',
      'foo()', 'bar()', 'baz()', 'test()', 'MyClass', 'YourClass',
      
      // Placeholder comments (multiple languages)
      '// TODO', '# TODO', '/* TODO', '// code here', '# code here',
      '// your code', '# your code', '// implement', '# implement',
      '// placeholder', '# placeholder', '... rest of', '// ...',
      
      // Generic test data
      'test123', 'password123', 'user@example', 'john.doe', 'Jane Doe',
      'Lorem ipsum', 'Hello World', 'Hello, World!',
      
      // Common placeholder values
      'INSERT_VALUE_HERE', 'CHANGE_ME', 'YOUR_API_KEY', 'YOUR_TOKEN',
      '<your-', '[your-', '{your-', 'PLACEHOLDER', 'FIXME',
      
      // Generic code patterns
      'def example', 'function example', 'class Example', 'public class Example',
      'const example =', 'let example =', 'var example =', 'example :=',
    ];
    
    // Check if code contains any placeholder patterns
    const lowerCode = code.toLowerCase();
    return placeholderPatterns.some(pattern => lowerCode.includes(pattern.toLowerCase()));
  }
  
  /**
   * Check if file path looks valid for any programming language
   */
  private isValidFilePath(filePath: string): boolean {
    // Common source code extensions across all languages
    const validExtensions = [
      // Web
      '.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs',
      '.html', '.css', '.scss', '.sass', '.less',
      '.vue', '.svelte', '.astro',
      
      // Backend/Systems
      '.py', '.rb', '.go', '.rs', '.c', '.cpp', '.h', '.hpp',
      '.java', '.kt', '.scala', '.clj',
      '.cs', '.fs', '.vb',
      '.php', '.pl', '.lua',
      '.swift', '.m', '.mm',
      '.r', '.R', '.jl',
      
      // Config/Data
      '.json', '.yaml', '.yml', '.toml', '.xml',
      '.sql', '.graphql', '.proto',
      
      // Shell/Scripts
      '.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat',
      
      // Others
      '.md', '.dockerfile', '.makefile',
    ];
    
    // Check if file has a valid extension
    const hasValidExtension = validExtensions.some(ext => 
      filePath.toLowerCase().endsWith(ext)
    );
    
    // Also accept common filenames without extensions
    const validFilenames = [
      'Dockerfile', 'Makefile', 'Rakefile', 'Gemfile', 'Pipfile',
      'package.json', 'tsconfig.json', 'webpack.config', 'jest.config',
      '.gitignore', '.env', '.eslintrc', '.prettierrc'
    ];
    
    const isValidFilename = validFilenames.some(name => 
      filePath.endsWith(name) || filePath.includes(`/${name}`)
    );
    
    return hasValidExtension || isValidFilename;
  }
  
  /**
   * Extract real code snippets from the repository
   */
  extractSnippet(repoPath: string, location: CodeLocation): ExtractedSnippet | null {
    const filePath = path.join(repoPath, location.file);
    
    // Handle various file path formats
    const possiblePaths = [
      filePath,
      path.join(repoPath, 'src', location.file),
      path.join(repoPath, 'source', location.file),
      path.join(repoPath, 'lib', location.file),
      // Try with .ts extension if no extension provided
      location.file.includes('.') ? filePath : `${filePath}.ts`,
      location.file.includes('.') ? filePath : `${filePath}.js`,
    ];
    
    let actualPath: string | null = null;
    for (const tryPath of possiblePaths) {
      if (fs.existsSync(tryPath)) {
        actualPath = tryPath;
        break;
      }
    }
    
    if (!actualPath) {
      // Try to find the file using grep
      try {
        const baseName = path.basename(location.file);
        const findResult = execSync(
          `find "${repoPath}" -name "${baseName}" -type f | head -1`,
          { encoding: 'utf-8' }
        ).trim();
        
        if (findResult && fs.existsSync(findResult)) {
          actualPath = findResult;
        }
      } catch {}
    }
    
    if (!actualPath) {
      return null;
    }
    
    try {
      const fileContent = fs.readFileSync(actualPath, 'utf-8');
      const lines = fileContent.split('\n');
      
      // Adjust line number (DeepWiki often gives approximate line numbers)
      let targetLine = location.line - 1; // Convert to 0-indexed
      
      if (targetLine < 0 || targetLine >= lines.length) {
        targetLine = Math.min(Math.max(0, targetLine), lines.length - 1);
      }
      
      // Extract the main line and context
      const snippet = lines[targetLine] || '';
      
      // Get 2 lines before and after for context
      const contextStart = Math.max(0, targetLine - 2);
      const contextEnd = Math.min(lines.length - 1, targetLine + 2);
      const context = lines.slice(contextStart, contextEnd + 1);
      
      return {
        file: path.relative(repoPath, actualPath),
        line: targetLine + 1,
        snippet: snippet.trim(),
        context
      };
      
    } catch (error) {
      console.error(`Failed to read file ${actualPath}:`, error);
      return null;
    }
  }
  
  /**
   * Search for code that matches the issue description
   */
  findRelevantCode(repoPath: string, issueDescription: string, hint?: string): ExtractedSnippet[] {
    const results: ExtractedSnippet[] = [];
    
    // Skip searching if we don't have good keywords - too slow
    if (!hint && !issueDescription.includes('fetch') && !issueDescription.includes('promise')) {
      return results;
    }
    
    // Extract key terms from the description
    const keywords = this.extractKeywords(issueDescription);
    
    // Build search patterns - limit to top 2 for performance
    const patterns = this.buildSearchPatterns(keywords, hint).slice(0, 2);
    
    for (const pattern of patterns) {
      try {
        // Try ripgrep first (faster), fall back to grep
        let searchCmd: string;
        let searchResult: string;
        
        try {
          // Check if rg is available
          execSync('which rg', { encoding: 'utf-8' });
          // Search all common code file types
          searchCmd = `rg -n --max-count 3 "${pattern}" "${repoPath}" --type-add 'code:*.{js,ts,jsx,tsx,py,rb,go,rs,java,kt,cs,php,cpp,c,h,swift,m,r,R,jl,lua,pl,scala,clj}' -t code 2>/dev/null | head -3`;
          searchResult = execSync(searchCmd, { encoding: 'utf-8', timeout: 2000 });
        } catch {
          // Fall back to grep with language-agnostic search
          // Look in common source directories
          const commonDirs = ['src', 'source', 'lib', 'app', 'pkg', 'cmd', 'internal', 'test', 'tests', 'spec'];
          searchResult = '';
          
          for (const dir of commonDirs) {
            const dirPath = path.join(repoPath, dir);
            if (fs.existsSync(dirPath) && searchResult.length < 200) {
              try {
                // Include multiple file extensions
                const includes = [
                  '--include="*.js"', '--include="*.ts"', '--include="*.py"',
                  '--include="*.rb"', '--include="*.go"', '--include="*.java"',
                  '--include="*.cs"', '--include="*.php"', '--include="*.cpp"',
                  '--include="*.c"', '--include="*.rs"', '--include="*.swift"'
                ].join(' ');
                
                const grepCmd = `grep -r -n "${pattern}" "${dirPath}" ${includes} 2>/dev/null | head -2`;
                searchResult += execSync(grepCmd, { encoding: 'utf-8', timeout: 1000 });
              } catch {}
            }
          }
        }
        
        const matches = searchResult.split('\n').filter(line => line.trim());
        for (const match of matches.slice(0, 2)) { // Limit to 2 matches per pattern
          const [filePath, lineNum, ...codeParts] = match.split(':');
          const code = codeParts.join(':').trim();
          
          if (filePath && lineNum && code) {
            results.push({
              file: path.relative(repoPath, filePath),
              line: parseInt(lineNum),
              snippet: code,
              context: [code] // For now, just the matched line
            });
          }
        }
      } catch {
        // Search failed, try next pattern silently
      }
    }
    
    return results;
  }
  
  /**
   * Extract keywords from issue description
   */
  private extractKeywords(description: string): string[] {
    const keywords: string[] = [];
    
    // Look for function/method names (camelCase or snake_case)
    const functionNames = description.match(/\b[a-z][a-zA-Z0-9_]*(?:\(|$)/g) || [];
    keywords.push(...functionNames.map(f => f.replace(/\($/, '')));
    
    // Look for class names (PascalCase)
    const classNames = description.match(/\b[A-Z][a-zA-Z0-9]+\b/g) || [];
    keywords.push(...classNames);
    
    // Look for specific technical terms
    const technicalTerms = [
      'fetch', 'promise', 'async', 'await', 'callback', 'timeout',
      'error', 'throw', 'catch', 'reject', 'resolve',
      'request', 'response', 'api', 'http',
      'validate', 'sanitize', 'escape', 'encode',
      'cache', 'memory', 'leak', 'buffer'
    ];
    
    for (const term of technicalTerms) {
      if (description.toLowerCase().includes(term)) {
        keywords.push(term);
      }
    }
    
    return [...new Set(keywords)]; // Remove duplicates
  }
  
  /**
   * Build search patterns based on keywords and hints
   */
  private buildSearchPatterns(keywords: string[], hint?: string): string[] {
    const patterns: string[] = [];
    
    // Add hint-based patterns
    if (hint) {
      if (hint.includes('promise') || hint.includes('reject')) {
        patterns.push('Promise\\.reject', 'throw new Error', '\\.catch\\(');
      }
      if (hint.includes('validation') || hint.includes('sanitize')) {
        patterns.push('if\\s*\\(!', 'validate', 'sanitize', 'escape');
      }
      if (hint.includes('memory') || hint.includes('leak')) {
        patterns.push('new\\s+\\w+\\(', 'cache', 'store', 'push\\(');
      }
      if (hint.includes('deprecated')) {
        patterns.push('@deprecated', 'setTimeout.*0', 'callback');
      }
    }
    
    // Add keyword-based patterns
    for (const keyword of keywords.slice(0, 5)) { // Limit to top 5 keywords
      patterns.push(keyword);
    }
    
    return patterns;
  }
  
  /**
   * Enhance issues with real code snippets
   */
  enhanceIssuesWithRealCode(repoPath: string, issues: any[]): any[] {
    console.log(`\n📝 Extracting real code snippets for ${issues.length} issues...`);
    
    // First pass: clean up fake code snippets
    issues.forEach(issue => {
      if (issue.codeSnippet) {
        const snippet = issue.codeSnippet;
        // Remove obviously fake snippets
        if (snippet.includes('// code') || 
            snippet.includes('// Code') ||
            snippet.includes('Code location:') ||
            snippet.includes('code handling') ||
            snippet.includes('Code handling') ||
            snippet.includes('code with') ||
            snippet.includes('Code with') ||
            snippet.includes('code causing') ||
            snippet.includes('Code causing') ||
            this.isGenericPlaceholderCode(snippet)) {
          delete issue.codeSnippet;
        }
      }
    });
    
    // Process in batches for better performance
    const batchSize = 5;
    let processedCount = 0;
    
    const enhanced = issues.map((issue, index) => {
      // Log progress every batch
      if (index % batchSize === 0 && index > 0) {
        console.log(`  Progress: ${index}/${issues.length} issues processed...`);
      }
      
      // Check if we have a REAL code snippet (not generic/fake from DeepWiki)
      const hasRealSnippet = issue.codeSnippet && 
          !issue.codeSnippet.includes('[') && 
          !issue.codeSnippet.includes('not provided') &&
          !issue.codeSnippet.includes('REQUIRED') &&
          !issue.codeSnippet.includes('// Code location:') &&  // Skip our own placeholders
          !issue.codeSnippet.includes('// code') &&             // Skip generic comments
          !issue.codeSnippet.includes('// Code') &&             // Skip generic comments
          !this.isGenericPlaceholderCode(issue.codeSnippet) && // Use helper method
          issue.codeSnippet.length > 10;                        // Has actual content
      
      if (hasRealSnippet) {
        // Check if the file location looks real (language-agnostic)
        const hasRealLocation = issue.location?.file && 
                               issue.location.file !== 'unknown' &&
                               !issue.location.file.includes('example') &&
                               this.isValidFilePath(issue.location.file);
        
        if (hasRealLocation) {
          processedCount++;
          return issue;
        }
      }
      
      // Try to extract real code - but limit time spent
      let extracted: ExtractedSnippet | null = null;
      
      // If we have file and line info, use it (fast)
      if (issue.location?.file && issue.location?.line) {
        extracted = this.extractSnippet(repoPath, {
          file: issue.location.file,
          line: issue.location.line,
          description: issue.title || issue.description
        });
      }
      
      // Skip searching for code if we don't have high-value keywords (slow)
      // Only search for critical issues or specific patterns
      if (!extracted && (issue.severity === 'critical' || issue.severity === 'high')) {
        const found = this.findRelevantCode(
          repoPath, 
          issue.title || issue.description,
          issue.category
        );
        
        if (found.length > 0) {
          extracted = found[0];
          // Update location with what we found
          issue.location = {
            file: extracted.file,
            line: extracted.line
          };
        }
      }
      
      // Update the issue with real code
      if (extracted) {
        issue.codeSnippet = extracted.snippet;
        issue.codeContext = extracted.context;
        processedCount++;
      } else {
        // Don't set a fake code snippet - let the report generator handle missing code
        // This prevents showing fake code as if it were real
        delete issue.codeSnippet;
        // Add a flag to indicate we tried but couldn't find real code
        issue.codeExtractionFailed = true;
      }
      
      return issue;
    });
    
    console.log(`\n📊 Enhanced ${processedCount}/${issues.length} issues with real code snippets`);
    
    return enhanced;
  }
}