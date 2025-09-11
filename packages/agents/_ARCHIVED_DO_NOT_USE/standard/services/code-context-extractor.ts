import * as fs from 'fs';
import * as path from 'path';

/**
 * Extracts context from actual code to fill template parameters
 */
export class CodeContextExtractor {
  
  /**
   * Extract context from code snippet and issue description
   */
  extractContext(
    codeSnippet: string,
    issueDescription: string,
    language: string,
    filePath?: string,
    lineNumber?: number
  ): ExtractedContext {
    const context: ExtractedContext = {
      variables: [],
      functions: [],
      imports: [],
      className: undefined,
      methodName: undefined,
      parameters: [],
      returnType: undefined,
      surroundingCode: codeSnippet,
      language
    };

    // Extract based on language
    switch (language) {
      case 'typescript':
      case 'javascript':
        this.extractJavaScriptContext(codeSnippet, issueDescription, context);
        break;
      case 'python':
        this.extractPythonContext(codeSnippet, issueDescription, context);
        break;
      case 'java':
        this.extractJavaContext(codeSnippet, issueDescription, context);
        break;
      case 'go':
        this.extractGoContext(codeSnippet, issueDescription, context);
        break;
    }

    // Try to extract from issue description if code parsing failed
    if (context.variables.length === 0) {
      this.extractFromDescription(issueDescription, context);
    }

    return context;
  }

  /**
   * Extract JavaScript/TypeScript context
   */
  private extractJavaScriptContext(
    code: string,
    description: string,
    context: ExtractedContext
  ): void {
    // Extract function parameters
    const funcMatch = code.match(/(?:function|const|let|var)\s+(\w+)\s*(?:=\s*)?(?:async\s+)?(?:function\s*)?\(([^)]*)\)/);
    if (funcMatch) {
      context.methodName = funcMatch[1];
      const params = funcMatch[2].split(',').map(p => p.trim());
      context.parameters = params.filter(p => p).map(p => {
        // Handle destructuring and default values
        const name = p.split(/[=:{]/, 1)[0].trim();
        return { name, type: 'any' }; // Would need AST for real types
      });
    }

    // Extract arrow function parameters
    const arrowMatch = code.match(/(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*=>/);
    if (arrowMatch && !funcMatch) {
      context.methodName = arrowMatch[1];
      const params = arrowMatch[2].split(',').map(p => p.trim());
      context.parameters = params.filter(p => p).map(p => {
        const name = p.split(/[=:{]/, 1)[0].trim();
        return { name, type: 'any' };
      });
    }

    // Extract variables being used
    const varPattern = /(?:const|let|var)\s+(\w+)/g;
    let match;
    while ((match = varPattern.exec(code)) !== null) {
      if (!context.variables.includes(match[1])) {
        context.variables.push(match[1]);
      }
    }

    // Extract property access that might need validation
    const propPattern = /(\w+)\.(\w+)/g;
    while ((match = propPattern.exec(code)) !== null) {
      if (!context.variables.includes(match[1])) {
        context.variables.push(match[1]);
      }
    }

    // Look for the problematic variable mentioned in the issue
    this.extractProblematicVariable(description, code, context);
  }

  /**
   * Extract Python context
   */
  private extractPythonContext(
    code: string,
    description: string,
    context: ExtractedContext
  ): void {
    // Extract function definition
    const funcMatch = code.match(/def\s+(\w+)\s*\(([^)]*)\)/);
    if (funcMatch) {
      context.methodName = funcMatch[1];
      const params = funcMatch[2].split(',').map(p => p.trim());
      context.parameters = params
        .filter(p => p && p !== 'self')
        .map(p => {
          const [name, type] = p.split(':').map(s => s.trim());
          return { name: name.split('=')[0].trim(), type: type || 'Any' };
        });
    }

    // Extract class name
    const classMatch = code.match(/class\s+(\w+)/);
    if (classMatch) {
      context.className = classMatch[1];
    }

    // Extract variables
    const varPattern = /(\w+)\s*=/g;
    let match;
    while ((match = varPattern.exec(code)) !== null) {
      if (!context.variables.includes(match[1]) && match[1] !== 'self') {
        context.variables.push(match[1]);
      }
    }

    // Look for dictionary/object access
    const dictPattern = /(\w+)\[['"](\w+)['"]\]/g;
    while ((match = dictPattern.exec(code)) !== null) {
      if (!context.variables.includes(match[1])) {
        context.variables.push(match[1]);
      }
    }

    this.extractProblematicVariable(description, code, context);
  }

  /**
   * Extract Java context
   */
  private extractJavaContext(
    code: string,
    description: string,
    context: ExtractedContext
  ): void {
    // Extract method signature
    const methodMatch = code.match(/(?:public|private|protected)?\s*(?:static)?\s*(\w+)\s+(\w+)\s*\(([^)]*)\)/);
    if (methodMatch) {
      context.returnType = methodMatch[1];
      context.methodName = methodMatch[2];
      const params = methodMatch[3].split(',').map(p => p.trim());
      context.parameters = params.filter(p => p).map(p => {
        const parts = p.split(/\s+/);
        if (parts.length >= 2) {
          return { 
            name: parts[parts.length - 1], 
            type: parts.slice(0, -1).join(' ')
          };
        }
        return { name: p, type: 'Object' };
      });
    }

    // Extract class name
    const classMatch = code.match(/class\s+(\w+)/);
    if (classMatch) {
      context.className = classMatch[1];
    }

    // Extract variables
    const varPattern = /(?:String|int|Integer|Long|Boolean|Object|List|Map)\s+(\w+)/g;
    let match;
    while ((match = varPattern.exec(code)) !== null) {
      if (!context.variables.includes(match[1])) {
        context.variables.push(match[1]);
      }
    }

    this.extractProblematicVariable(description, code, context);
  }

  /**
   * Extract Go context
   */
  private extractGoContext(
    code: string,
    description: string,
    context: ExtractedContext
  ): void {
    // Extract function signature
    const funcMatch = code.match(/func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)\s*\(([^)]*)\)\s*(?:\(([^)]*)\))?/);
    if (funcMatch) {
      context.methodName = funcMatch[1];
      const params = funcMatch[2].split(',').map(p => p.trim());
      context.parameters = params.filter(p => p).map(p => {
        const parts = p.split(/\s+/);
        if (parts.length >= 2) {
          return { 
            name: parts[0], 
            type: parts.slice(1).join(' ')
          };
        }
        return { name: p, type: 'interface{}' };
      });
      
      // Extract return types
      if (funcMatch[3]) {
        context.returnType = funcMatch[3].trim();
      }
    }

    // Extract variables
    const varPattern = /(\w+)\s*:=/g;
    let match;
    while ((match = varPattern.exec(code)) !== null) {
      if (!context.variables.includes(match[1])) {
        context.variables.push(match[1]);
      }
    }

    // Look for struct field access
    const fieldPattern = /(\w+)\.(\w+)/g;
    while ((match = fieldPattern.exec(code)) !== null) {
      if (!context.variables.includes(match[1])) {
        context.variables.push(match[1]);
      }
    }

    this.extractProblematicVariable(description, code, context);
  }

  /**
   * Extract the specific problematic variable from issue description
   */
  private extractProblematicVariable(
    description: string,
    code: string,
    context: ExtractedContext
  ): void {
    // Common patterns in issue descriptions
    const patterns = [
      /(?:parameter|variable|field|property|input)\s+['"`]?(\w+)['"`]?/i,
      /['"`](\w+)['"`]\s+(?:is not|lacks|missing|needs|should)/i,
      /\b(\w+)\s+(?:is not validated|lacks validation|could be null|may be undefined)/i,
      /(?:validate|check|verify)\s+(\w+)/i,
      /\b(\w+)\s+(?:parameter|variable|field)/i
    ];

    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match && match[1]) {
        // Verify this variable exists in the code
        if (code.includes(match[1])) {
          context.primaryVariable = match[1];
          if (!context.variables.includes(match[1])) {
            context.variables.unshift(match[1]); // Add at beginning
          }
          return;
        }
      }
    }

    // If no specific variable found, use the first parameter if available
    if (context.parameters.length > 0) {
      context.primaryVariable = context.parameters[0].name;
    } else if (context.variables.length > 0) {
      context.primaryVariable = context.variables[0];
    }
  }

  /**
   * Extract from description when code parsing fails
   */
  private extractFromDescription(
    description: string,
    context: ExtractedContext
  ): void {
    // Extract any word that looks like a variable name
    const varPattern = /\b([a-z][a-zA-Z0-9_]*)\b/g;
    const commonWords = new Set([
      'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'should', 'could', 'may', 'might', 'must', 'can', 'cannot',
      'not', 'no', 'null', 'undefined', 'empty', 'missing', 'lacks',
      'validation', 'error', 'handling', 'check', 'verify'
    ]);

    let match;
    while ((match = varPattern.exec(description)) !== null) {
      const word = match[1];
      if (!commonWords.has(word) && word.length > 2) {
        // Check if it looks like a variable name (camelCase or snake_case)
        if (/^[a-z][a-zA-Z0-9]*(?:[A-Z][a-zA-Z0-9]*)*$/.test(word) ||
            /^[a-z]+(?:_[a-z]+)*$/.test(word)) {
          if (!context.variables.includes(word)) {
            context.variables.push(word);
          }
        }
      }
    }
  }

  /**
   * Read actual file content if available
   */
  async readFileContext(
    filePath: string,
    lineNumber: number,
    contextLines = 10
  ): Promise<string | null> {
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      
      const startLine = Math.max(0, lineNumber - contextLines - 1);
      const endLine = Math.min(lines.length, lineNumber + contextLines);
      
      return lines.slice(startLine, endLine).join('\n');
    } catch (error) {
      console.error('Failed to read file context:', error);
      return null;
    }
  }
}

export interface ExtractedContext {
  variables: string[];
  functions: string[];
  imports: string[];
  className?: string;
  methodName?: string;
  parameters: Array<{ name: string; type: string }>;
  returnType?: string;
  primaryVariable?: string; // The main variable that needs fixing
  surroundingCode: string;
  language: string;
}

/**
 * Smart template interpolation that uses extracted context
 */
export class TemplateInterpolator {
  
  /**
   * Interpolate template with actual context
   */
  interpolate(
    template: string,
    context: ExtractedContext,
    issueType: string
  ): string {
    let result = template;

    // Replace variable placeholders
    const variable = context.primaryVariable || 
                    context.parameters[0]?.name || 
                    context.variables[0] || 
                    'input';

    result = result.replace(/{var}/g, variable);
    result = result.replace(/{variable}/g, variable);
    
    // Replace function/method name
    const methodName = context.methodName || 'operation';
    result = result.replace(/{method}/g, methodName);
    result = result.replace(/{function}/g, methodName);
    
    // Replace class name
    const className = context.className || 'Component';
    result = result.replace(/{class}/g, className);
    
    // Language-specific replacements
    switch (context.language) {
      case 'typescript':
      case 'javascript':
        result = this.interpolateJavaScript(result, context, issueType);
        break;
      case 'python':
        result = this.interpolatePython(result, context, issueType);
        break;
      case 'java':
        result = this.interpolateJava(result, context, issueType);
        break;
      case 'go':
        result = this.interpolateGo(result, context, issueType);
        break;
    }

    return result;
  }

  private interpolateJavaScript(
    template: string,
    context: ExtractedContext,
    issueType: string
  ): string {
    let result = template;

    // Add proper variable type checks based on context
    if (issueType === 'missing-validation' && context.primaryVariable) {
      const param = context.parameters.find(p => p.name === context.primaryVariable);
      
      if (param && param.type && param.type !== 'any') {
        // If we know the expected type
        if (param.type.includes('string')) {
          result = `if (!${context.primaryVariable} || typeof ${context.primaryVariable} !== 'string') {
  throw new Error('${context.primaryVariable} must be a non-empty string');
}`;
        } else if (param.type.includes('number')) {
          result = `if (typeof ${context.primaryVariable} !== 'number' || isNaN(${context.primaryVariable})) {
  throw new Error('${context.primaryVariable} must be a valid number');
}`;
        } else if (param.type.includes('[]')) {
          result = `if (!Array.isArray(${context.primaryVariable})) {
  throw new Error('${context.primaryVariable} must be an array');
}`;
        }
      }
    }

    // Add proper async handling
    if (issueType === 'unhandled-promise' && context.surroundingCode.includes('await')) {
      result = `try {
  ${context.surroundingCode.trim()}
} catch (error) {
  console.error('${context.methodName || 'Operation'} failed:', error);
  throw new Error(\`Failed in ${context.methodName || 'operation'}: \${error.message}\`);
}`;
    }

    return result;
  }

  private interpolatePython(
    template: string,
    context: ExtractedContext,
    issueType: string
  ): string {
    let result = template;

    if (issueType === 'missing-validation' && context.primaryVariable) {
      const param = context.parameters.find(p => p.name === context.primaryVariable);
      
      if (param && param.type) {
        if (param.type === 'str') {
          result = `if not ${context.primaryVariable} or not isinstance(${context.primaryVariable}, str):
    raise ValueError(f"${context.primaryVariable} must be a non-empty string")`;
        } else if (param.type === 'int' || param.type === 'float') {
          result = `if not isinstance(${context.primaryVariable}, (int, float)):
    raise TypeError(f"${context.primaryVariable} must be a number")`;
        } else if (param.type.includes('List')) {
          result = `if not isinstance(${context.primaryVariable}, list):
    raise TypeError(f"${context.primaryVariable} must be a list")`;
        }
      }
    }

    return result;
  }

  private interpolateJava(
    template: string,
    context: ExtractedContext,
    issueType: string
  ): string {
    let result = template;

    if (issueType === 'missing-validation' && context.primaryVariable) {
      const param = context.parameters.find(p => p.name === context.primaryVariable);
      
      if (param && param.type) {
        if (param.type === 'String') {
          result = `if (${context.primaryVariable} == null || ${context.primaryVariable}.isEmpty()) {
    throw new IllegalArgumentException("${context.primaryVariable} must be a non-empty string");
}`;
        } else if (param.type === 'Integer' || param.type === 'Long') {
          result = `if (${context.primaryVariable} == null) {
    throw new IllegalArgumentException("${context.primaryVariable} must not be null");
}`;
        } else if (param.type.includes('List')) {
          result = `if (${context.primaryVariable} == null || ${context.primaryVariable}.isEmpty()) {
    throw new IllegalArgumentException("${context.primaryVariable} must be a non-empty list");
}`;
        }
      }
    }

    // Add proper SQL injection prevention
    if (issueType === 'sql-injection' && context.surroundingCode.includes('query')) {
      // Extract the SQL query and parameters
      const queryMatch = context.surroundingCode.match(/"([^"]+)"/);
      if (queryMatch) {
        const query = queryMatch[1];
        const params = context.variables.filter(v => query.includes(v));
        
        result = `String query = "${query.replace(new RegExp(params.join('|'), 'g'), '?')}";
PreparedStatement pstmt = connection.prepareStatement(query);
${params.map((p, i) => `pstmt.setString(${i + 1}, ${p});`).join('\n')}
ResultSet rs = pstmt.executeQuery();`;
      }
    }

    return result;
  }

  private interpolateGo(
    template: string,
    context: ExtractedContext,
    issueType: string
  ): string {
    let result = template;

    if (issueType === 'missing-validation' && context.primaryVariable) {
      const param = context.parameters.find(p => p.name === context.primaryVariable);
      
      if (param && param.type) {
        if (param.type === 'string') {
          result = `if ${context.primaryVariable} == "" {
    return fmt.Errorf("${context.primaryVariable} must be a non-empty string")
}`;
        } else if (param.type.includes('*')) {
          // Pointer type
          result = `if ${context.primaryVariable} == nil {
    return fmt.Errorf("${context.primaryVariable} must not be nil")
}`;
        }
      }
    }

    // Add proper error handling
    if (issueType === 'missing-error-handling') {
      result = `${context.surroundingCode.trim()}
if err != nil {
    return nil, fmt.Errorf("${context.methodName || 'operation'} failed: %w", err)
}`;
    }

    return result;
  }
}