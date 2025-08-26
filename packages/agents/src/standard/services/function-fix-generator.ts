import * as fs from 'fs';
import * as path from 'path';
import { Issue } from '../types/analysis-types';
import { CodeContextExtractor, ExtractedContext } from './code-context-extractor';
import { FixSuggestionAgentV2 } from './fix-suggestion-agent-v2';

interface FixedFunction {
  issueId: string;
  originalFunction: string;
  fixedFunction: string;
  functionName: string;
  filePath: string;
  startLine: number;
  endLine: number;
  explanation: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Generates complete fixed functions by extracting original function
 * from cached repository and inserting fixes at correct locations
 */
export class FunctionFixGenerator {
  private contextExtractor: CodeContextExtractor;
  private fixAgent: FixSuggestionAgentV2;
  
  constructor() {
    this.contextExtractor = new CodeContextExtractor();
    this.fixAgent = new FixSuggestionAgentV2();
  }
  
  /**
   * Generate fixed functions for all issues
   */
  async generateFixedFunctions(
    issues: Issue[],
    repoPath: string
  ): Promise<FixedFunction[]> {
    const fixedFunctions: FixedFunction[] = [];
    
    // Group issues by file and function
    const groupedIssues = this.groupIssuesByFunction(issues);
    
    for (const [key, functionIssues] of groupedIssues.entries()) {
      const [filePath, functionName] = key.split('::');
      
      try {
        // Extract the original function from the cached repo
        const originalFunction = await this.extractFunction(
          path.join(repoPath, filePath),
          functionIssues[0].location?.line || 0
        );
        
        if (!originalFunction) {
          console.log(`Could not extract function from ${filePath}`);
          continue;
        }
        
        // Generate the fixed function with all issues addressed
        const fixedFunction = await this.insertFixesIntoFunction(
          originalFunction,
          functionIssues,
          this.detectLanguage(filePath)
        );
        
        fixedFunctions.push({
          issueId: functionIssues.map(i => i.id || '').join(','),
          originalFunction: originalFunction.code,
          fixedFunction: fixedFunction.code,
          functionName: originalFunction.name,
          filePath,
          startLine: originalFunction.startLine,
          endLine: originalFunction.endLine,
          explanation: fixedFunction.explanation,
          confidence: fixedFunction.confidence
        });
      } catch (error) {
        console.error(`Failed to generate fix for ${filePath}::${functionName}:`, error);
      }
    }
    
    return fixedFunctions;
  }
  
  /**
   * Extract complete function from file
   */
  private async extractFunction(
    filePath: string,
    issueLine: number
  ): Promise<{ code: string; name: string; startLine: number; endLine: number } | null> {
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }
      
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const language = this.detectLanguage(filePath);
      
      // Find function boundaries based on language
      const boundaries = this.findFunctionBoundaries(lines, issueLine, language);
      if (!boundaries) return null;
      
      const functionCode = lines.slice(
        boundaries.start,
        boundaries.end + 1
      ).join('\n');
      
      return {
        code: functionCode,
        name: boundaries.name,
        startLine: boundaries.start + 1, // Convert to 1-based
        endLine: boundaries.end + 1
      };
    } catch (error) {
      console.error('Failed to extract function:', error);
      return null;
    }
  }
  
  /**
   * Find function boundaries containing the issue line
   */
  private findFunctionBoundaries(
    lines: string[],
    issueLine: number,
    language: string
  ): { start: number; end: number; name: string } | null {
    // Convert to 0-based index
    const targetLine = issueLine - 1;
    
    switch (language) {
      case 'typescript':
      case 'javascript':
        return this.findJSFunctionBoundaries(lines, targetLine);
      case 'python':
        return this.findPythonFunctionBoundaries(lines, targetLine);
      case 'java':
        return this.findJavaMethodBoundaries(lines, targetLine);
      case 'go':
        return this.findGoFunctionBoundaries(lines, targetLine);
      default:
        return this.findGenericFunctionBoundaries(lines, targetLine);
    }
  }
  
  /**
   * Find JavaScript/TypeScript function boundaries
   */
  private findJSFunctionBoundaries(
    lines: string[],
    targetLine: number
  ): { start: number; end: number; name: string } | null {
    let functionStart = -1;
    let functionName = '';
    let braceCount = 0;
    let inFunction = false;
    
    // Search backwards for function start
    for (let i = targetLine; i >= 0; i--) {
      const line = lines[i];
      
      // Check for function declaration patterns
      const funcMatch = line.match(
        /(?:export\s+)?(?:async\s+)?(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)\s*=>|\([^)]*\):|function))/
      );
      
      if (funcMatch) {
        functionStart = i;
        functionName = funcMatch[1] || funcMatch[2] || 'anonymous';
        inFunction = true;
        break;
      }
      
      // Check for class method
      const methodMatch = line.match(/^\s*(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*\w+\s*)?{/);
      if (methodMatch) {
        functionStart = i;
        functionName = methodMatch[1];
        inFunction = true;
        break;
      }
    }
    
    if (!inFunction || functionStart === -1) {
      return null;
    }
    
    // Find function end by counting braces
    braceCount = 0;
    let started = false;
    
    for (let i = functionStart; i < lines.length; i++) {
      const line = lines[i];
      
      for (const char of line) {
        if (char === '{') {
          braceCount++;
          started = true;
        } else if (char === '}') {
          braceCount--;
          if (started && braceCount === 0) {
            return {
              start: functionStart,
              end: i,
              name: functionName
            };
          }
        }
      }
    }
    
    return null;
  }
  
  /**
   * Find Python function boundaries
   */
  private findPythonFunctionBoundaries(
    lines: string[],
    targetLine: number
  ): { start: number; end: number; name: string } | null {
    let functionStart = -1;
    let functionName = '';
    let indentLevel = -1;
    
    // Search backwards for function definition
    for (let i = targetLine; i >= 0; i--) {
      const line = lines[i];
      const defMatch = line.match(/^\s*def\s+(\w+)\s*\(/);
      
      if (defMatch) {
        functionStart = i;
        functionName = defMatch[1];
        indentLevel = line.search(/\S/); // Find indentation level
        break;
      }
    }
    
    if (functionStart === -1) {
      return null;
    }
    
    // Find function end by indentation
    let functionEnd = functionStart;
    let inDocstring = false;
    let docstringQuotes = '';
    
    for (let i = functionStart + 1; i < lines.length; i++) {
      const line = lines[i];
      const lineIndent = line.search(/\S/);
      
      // Skip empty lines
      if (line.trim() === '') {
        continue;
      }
      
      // Handle docstrings
      if (line.includes('"""') || line.includes("'''")) {
        if (!inDocstring) {
          docstringQuotes = line.includes('"""') ? '"""' : "'''";
          inDocstring = true;
          if (line.split(docstringQuotes).length > 2) {
            inDocstring = false; // Single-line docstring
          }
        } else if (line.includes(docstringQuotes)) {
          inDocstring = false;
        }
        continue;
      }
      
      if (inDocstring) continue;
      
      // Check if we're still in the function
      if (lineIndent >= 0 && lineIndent <= indentLevel) {
        // We've left the function
        functionEnd = i - 1;
        break;
      }
      
      functionEnd = i;
    }
    
    return {
      start: functionStart,
      end: functionEnd,
      name: functionName
    };
  }
  
  /**
   * Find Java method boundaries
   */
  private findJavaMethodBoundaries(
    lines: string[],
    targetLine: number
  ): { start: number; end: number; name: string } | null {
    let methodStart = -1;
    let methodName = '';
    let braceCount = 0;
    
    // Search backwards for method signature
    for (let i = targetLine; i >= 0; i--) {
      const line = lines[i];
      const methodMatch = line.match(
        /(?:public|private|protected)?\s*(?:static)?\s*(?:final)?\s*\w+\s+(\w+)\s*\([^)]*\)/
      );
      
      if (methodMatch) {
        methodStart = i;
        methodName = methodMatch[1];
        break;
      }
    }
    
    if (methodStart === -1) {
      return null;
    }
    
    // Find method end by counting braces
    braceCount = 0;
    let started = false;
    
    for (let i = methodStart; i < lines.length; i++) {
      const line = lines[i];
      
      for (const char of line) {
        if (char === '{') {
          braceCount++;
          started = true;
        } else if (char === '}') {
          braceCount--;
          if (started && braceCount === 0) {
            return {
              start: methodStart,
              end: i,
              name: methodName
            };
          }
        }
      }
    }
    
    return null;
  }
  
  /**
   * Find Go function boundaries
   */
  private findGoFunctionBoundaries(
    lines: string[],
    targetLine: number
  ): { start: number; end: number; name: string } | null {
    let functionStart = -1;
    let functionName = '';
    
    // Search backwards for function declaration
    for (let i = targetLine; i >= 0; i--) {
      const line = lines[i];
      const funcMatch = line.match(/func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)\s*\(/);
      
      if (funcMatch) {
        functionStart = i;
        functionName = funcMatch[1];
        break;
      }
    }
    
    if (functionStart === -1) {
      return null;
    }
    
    // Find function end by counting braces
    let braceCount = 0;
    let started = false;
    
    for (let i = functionStart; i < lines.length; i++) {
      const line = lines[i];
      
      for (const char of line) {
        if (char === '{') {
          braceCount++;
          started = true;
        } else if (char === '}') {
          braceCount--;
          if (started && braceCount === 0) {
            return {
              start: functionStart,
              end: i,
              name: functionName
            };
          }
        }
      }
    }
    
    return null;
  }
  
  /**
   * Generic function boundary detection
   */
  private findGenericFunctionBoundaries(
    lines: string[],
    targetLine: number
  ): { start: number; end: number; name: string } | null {
    // Simple brace counting from current line
    let start = targetLine;
    let braceCount = 0;
    
    // Search backwards for opening brace
    for (let i = targetLine; i >= 0; i--) {
      if (lines[i].includes('{')) {
        start = i;
        break;
      }
    }
    
    // Count braces to find end
    for (let i = start; i < lines.length; i++) {
      const line = lines[i];
      for (const char of line) {
        if (char === '{') braceCount++;
        if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            return {
              start,
              end: i,
              name: 'function'
            };
          }
        }
      }
    }
    
    return null;
  }
  
  /**
   * Insert fixes into the function at appropriate locations
   */
  private async insertFixesIntoFunction(
    originalFunction: { code: string; name: string; startLine: number; endLine: number },
    issues: Issue[],
    language: string
  ): Promise<{ code: string; explanation: string; confidence: 'high' | 'medium' | 'low' }> {
    let fixedCode = originalFunction.code;
    const lines = fixedCode.split('\n');
    const explanations: string[] = [];
    let confidence: 'high' | 'medium' | 'low' = 'high';
    
    // Generate fixes for each issue
    const fixes = await this.fixAgent.generateFixes(issues);
    
    // Apply fixes based on issue type and location
    for (const issue of issues) {
      const fix = fixes.find(f => f.issueId === issue.id);
      if (!fix) continue;
      
      const issueType = this.detectIssueType(issue);
      const relativeLine = (issue.location?.line || 1) - originalFunction.startLine;
      
      switch (issueType) {
        case 'missing-validation':
          // Insert validation at the beginning of the function
          fixedCode = this.insertValidationAtStart(lines, fix.fixedCode, language).join('\n');
          explanations.push(`Added validation for parameters at function start`);
          break;
          
        case 'missing-error-handling':
          // Wrap problematic code in try-catch
          fixedCode = this.wrapInErrorHandling(lines, relativeLine, fix.fixedCode, language).join('\n');
          explanations.push(`Added error handling around line ${issue.location?.line}`);
          break;
          
        case 'sql-injection':
          // Replace the problematic line with parameterized query
          if (relativeLine >= 0 && relativeLine < lines.length) {
            lines[relativeLine] = fix.fixedCode;
            fixedCode = lines.join('\n');
            explanations.push(`Fixed SQL injection vulnerability at line ${issue.location?.line}`);
          }
          break;
          
        case 'null-check':
          // Insert null check before the problematic line
          fixedCode = this.insertNullCheckBefore(lines, relativeLine, fix.fixedCode, language).join('\n');
          explanations.push(`Added null check before line ${issue.location?.line}`);
          break;
          
        default:
          // For other issues, try to replace the problematic line
          if (relativeLine >= 0 && relativeLine < lines.length) {
            lines[relativeLine] = fix.fixedCode;
            fixedCode = lines.join('\n');
            explanations.push(`Fixed issue at line ${issue.location?.line}`);
          }
      }
      
      if (fix.confidence === 'low' || fix.confidence === 'medium') {
        confidence = fix.confidence;
      }
    }
    
    return {
      code: fixedCode,
      explanation: explanations.join('; '),
      confidence
    };
  }
  
  /**
   * Insert validation at the start of function body
   */
  private insertValidationAtStart(
    lines: string[],
    validationCode: string,
    language: string
  ): string[] {
    const result = [...lines];
    let insertIndex = 0;
    
    // Find where to insert (after function signature, docstring, etc.)
    switch (language) {
      case 'python':
        // Skip def line and docstring if present
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('def ')) {
            insertIndex = i + 1;
          } else if (lines[i].includes('"""') || lines[i].includes("'''")) {
            // Skip docstring
            const quote = lines[i].includes('"""') ? '"""' : "'''";
            insertIndex = i + 1;
            if (lines[i].split(quote).length < 3) {
              // Multi-line docstring
              while (insertIndex < lines.length && !lines[insertIndex].includes(quote)) {
                insertIndex++;
              }
              insertIndex++;
            }
            break;
          } else if (lines[i].trim() && !lines[i].trim().startsWith('#')) {
            break;
          }
        }
        break;
        
      case 'typescript':
      case 'javascript':
      case 'java':
      case 'go':
        // Find opening brace
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('{')) {
            insertIndex = i + 1;
            break;
          }
        }
        break;
    }
    
    // Insert validation code with proper indentation
    const indent = this.detectIndentation(lines[insertIndex] || lines[0]);
    const validationLines = validationCode.split('\n').map(line => 
      line ? indent + line : line
    );
    
    result.splice(insertIndex, 0, '', ...validationLines, '');
    return result;
  }
  
  /**
   * Wrap code in error handling
   */
  private wrapInErrorHandling(
    lines: string[],
    problemLine: number,
    errorHandlingCode: string,
    language: string
  ): string[] {
    const result = [...lines];
    
    if (problemLine < 0 || problemLine >= lines.length) {
      return result;
    }
    
    // Find the statement boundaries
    const startLine = problemLine;
    let endLine = problemLine;
    
    // Expand to include full statement (simple heuristic)
    while (endLine < lines.length - 1 && !lines[endLine].includes(';') && !lines[endLine].includes('}')) {
      endLine++;
    }
    
    // Replace with error handling
    const indent = this.detectIndentation(lines[startLine]);
    const wrappedLines = errorHandlingCode.split('\n').map(line =>
      line ? indent + line : line
    );
    
    result.splice(startLine, endLine - startLine + 1, ...wrappedLines);
    return result;
  }
  
  /**
   * Insert null check before problematic line
   */
  private insertNullCheckBefore(
    lines: string[],
    problemLine: number,
    nullCheckCode: string,
    language: string
  ): string[] {
    const result = [...lines];
    
    if (problemLine < 0 || problemLine >= lines.length) {
      return result;
    }
    
    const indent = this.detectIndentation(lines[problemLine]);
    const checkLines = nullCheckCode.split('\n').map(line =>
      line ? indent + line : line
    );
    
    result.splice(problemLine, 0, ...checkLines, '');
    return result;
  }
  
  /**
   * Detect indentation style
   */
  private detectIndentation(line: string): string {
    const match = line.match(/^(\s*)/);
    return match ? match[1] : '';
  }
  
  /**
   * Group issues by file and function
   */
  private groupIssuesByFunction(issues: Issue[]): Map<string, Issue[]> {
    const grouped = new Map<string, Issue[]>();
    
    for (const issue of issues) {
      if (!issue.location?.file) continue;
      
      // Simple grouping by file for now
      // TODO: Improve to actually detect which function contains the issue
      const key = `${issue.location.file}::function`;
      
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(issue);
    }
    
    return grouped;
  }
  
  /**
   * Detect issue type from description
   */
  private detectIssueType(issue: Issue): string {
    const text = ((issue.title || '') + ' ' + (issue.message || '')).toLowerCase();
    
    if (text.includes('validation') || text.includes('validate')) {
      return 'missing-validation';
    }
    if (text.includes('error handling') || text.includes('try-catch')) {
      return 'missing-error-handling';
    }
    if (text.includes('sql injection') || text.includes('injection')) {
      return 'sql-injection';
    }
    if (text.includes('null') || text.includes('undefined')) {
      return 'null-check';
    }
    if (text.includes('hardcoded')) {
      return 'hardcoded-values';
    }
    
    return 'unknown';
  }
  
  /**
   * Detect language from file extension
   */
  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    
    switch (ext) {
      case '.ts':
      case '.tsx':
        return 'typescript';
      case '.js':
      case '.jsx':
        return 'javascript';
      case '.py':
        return 'python';
      case '.java':
        return 'java';
      case '.go':
        return 'go';
      default:
        return 'javascript';
    }
  }
}

/**
 * Format fixed function for display in report
 */
export function formatFixedFunctionForReport(
  fixedFunction: FixedFunction,
  language: string
): string {
  return `### 🔧 Fixed Function: \`${fixedFunction.functionName}\`

📁 **File:** \`${fixedFunction.filePath}\`
📍 **Lines:** ${fixedFunction.startLine}-${fixedFunction.endLine}
💡 **Confidence:** ${fixedFunction.confidence}
📝 **Changes:** ${fixedFunction.explanation}

**Original Code:**
\`\`\`${language}
${fixedFunction.originalFunction}
\`\`\`

**Fixed Code (Copy this to replace the function):**
\`\`\`${language}
${fixedFunction.fixedFunction}
\`\`\`

**How to apply:**
1. Open \`${fixedFunction.filePath}\`
2. Navigate to line ${fixedFunction.startLine}
3. Select lines ${fixedFunction.startLine}-${fixedFunction.endLine}
4. Replace with the fixed code above
`;
}