import { Issue } from '../types/analysis-types';

interface IssueFix {
  issueId: string;
  originalCode?: string;
  fixedCode: string;
  explanation: string;
  confidence: 'high' | 'medium' | 'low';
  estimatedTime: string; // e.g., "5 minutes", "30 minutes"
}

interface CodeContext {
  filePath: string;
  fileContent?: string;
  language: 'typescript' | 'javascript' | 'python' | 'java' | 'go';
  framework?: string;
}

export class FixSuggestionAgent {
  private readonly templates = {
    'missing-validation': this.generateValidationFix,
    'unhandled-promise': this.generatePromiseFix,
    'missing-error-handling': this.generateErrorHandlingFix,
    'sql-injection': this.generateSqlInjectionFix,
    'missing-null-check': this.generateNullCheckFix,
    'hardcoded-values': this.generateConfigFix,
  };

  /**
   * Generate fix suggestions for a list of issues
   */
  async generateFixes(issues: Issue[], repoPath?: string): Promise<IssueFix[]> {
    const fixes: IssueFix[] = [];
    
    // Group issues by type for efficient processing
    const groupedIssues = this.groupIssuesByType(issues);
    
    for (const [type, groupIssues] of Object.entries(groupedIssues)) {
      if (type in this.templates) {
        // Use template for common issue types
        const templateFixes = await this.generateTemplateFixes(type, groupIssues, repoPath);
        fixes.push(...templateFixes);
      } else {
        // Use AI for complex/unknown issue types
        const aiFixes = await this.generateAIFixes(groupIssues, repoPath);
        fixes.push(...aiFixes);
      }
    }
    
    return fixes;
  }

  /**
   * Group issues by their type/pattern for batch processing
   */
  private groupIssuesByType(issues: Issue[]): Record<string, Issue[]> {
    const grouped: Record<string, Issue[]> = {};
    
    for (const issue of issues) {
      const type = this.detectIssueType(issue);
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(issue);
    }
    
    return grouped;
  }

  /**
   * Detect issue type from title and description
   */
  private detectIssueType(issue: Issue): string {
    const title = (issue.title || issue.message || '').toLowerCase();
    
    if (title.includes('validation') || title.includes('validate')) {
      return 'missing-validation';
    }
    if (title.includes('unhandled') && title.includes('promise')) {
      return 'unhandled-promise';
    }
    if (title.includes('error handling') || title.includes('try-catch')) {
      return 'missing-error-handling';
    }
    if (title.includes('sql injection') || title.includes('injection')) {
      return 'sql-injection';
    }
    if (title.includes('null') || title.includes('undefined')) {
      return 'missing-null-check';
    }
    if (title.includes('hardcoded') || title.includes('magic number')) {
      return 'hardcoded-values';
    }
    
    return 'unknown';
  }

  /**
   * Generate fixes using templates
   */
  private async generateTemplateFixes(
    type: string, 
    issues: Issue[], 
    repoPath?: string
  ): Promise<IssueFix[]> {
    const fixes: IssueFix[] = [];
    
    for (const issue of issues) {
      const fix = await this.templates[type].call(this, issue, repoPath);
      if (fix) {
        fixes.push(fix);
      }
    }
    
    return fixes;
  }

  /**
   * Generate validation fix
   */
  private async generateValidationFix(issue: Issue, repoPath?: string): Promise<IssueFix | null> {
    const location = issue.location;
    if (!location?.file) return null;
    
    // Extract variable name from issue description
    const varMatch = issue.message?.match(/(?:for |parameter |variable |input )(\w+)/i);
    const varName = varMatch?.[1] || 'input';
    
    const fixedCode = `if (!${varName} || typeof ${varName} !== 'string') {
  throw new Error('Invalid ${varName}: expected non-empty string');
}

// Original code continues here...`;

    return {
      issueId: issue.id || 'unknown',
      fixedCode,
      explanation: `Add validation to ensure ${varName} is a non-empty string before use`,
      confidence: 'high',
      estimatedTime: '5 minutes'
    };
  }

  /**
   * Generate promise handling fix
   */
  private async generatePromiseFix(issue: Issue, repoPath?: string): Promise<IssueFix | null> {
    const location = issue.location;
    if (!location?.file) return null;
    
    const fixedCode = `try {
  // Your async operation here
  const result = await asyncOperation();
  // Process result
  return result;
} catch (error) {
  console.error('Operation failed:', error);
  // Handle error appropriately for your use case
  throw new Error(\`Failed to complete operation: \${error.message}\`);
}`;

    return {
      issueId: issue.id || 'unknown',
      fixedCode,
      explanation: 'Wrap async operations in try-catch to handle potential rejections',
      confidence: 'high',
      estimatedTime: '10 minutes'
    };
  }

  /**
   * Generate error handling fix
   */
  private async generateErrorHandlingFix(issue: Issue, repoPath?: string): Promise<IssueFix | null> {
    const fixedCode = `try {
  // Potentially failing operation
  const result = performOperation();
  return result;
} catch (error) {
  // Log error for debugging
  logger.error('Operation failed', { error, context: relevantContext });
  
  // Return appropriate error response
  return {
    success: false,
    error: 'Operation failed. Please try again later.'
  };
}`;

    return {
      issueId: issue.id || 'unknown',
      fixedCode,
      explanation: 'Add proper error handling with logging and user-friendly error messages',
      confidence: 'medium',
      estimatedTime: '15 minutes'
    };
  }

  /**
   * Generate SQL injection fix
   */
  private async generateSqlInjectionFix(issue: Issue, repoPath?: string): Promise<IssueFix | null> {
    const fixedCode = `// Use parameterized queries to prevent SQL injection
const query = 'SELECT * FROM users WHERE id = ? AND status = ?';
const params = [userId, userStatus];

// Execute with parameters (exact syntax depends on your DB library)
const result = await db.query(query, params);

// For complex queries, use a query builder
const result2 = await db
  .select('*')
  .from('users')
  .where('id', userId)
  .where('status', userStatus);`;

    return {
      issueId: issue.id || 'unknown',
      fixedCode,
      explanation: 'Replace string concatenation with parameterized queries to prevent SQL injection',
      confidence: 'high',
      estimatedTime: '20 minutes'
    };
  }

  /**
   * Generate null check fix
   */
  private async generateNullCheckFix(issue: Issue, repoPath?: string): Promise<IssueFix | null> {
    const fixedCode = `// Add null/undefined checks before use
if (value === null || value === undefined) {
  // Handle null case appropriately
  return defaultValue; // or throw error
}

// Safe to use value here
const result = value.someMethod();

// For optional chaining (if supported)
const result2 = value?.someMethod() ?? defaultValue;`;

    return {
      issueId: issue.id || 'unknown',
      fixedCode,
      explanation: 'Add null/undefined checks to prevent runtime errors',
      confidence: 'high',
      estimatedTime: '5 minutes'
    };
  }

  /**
   * Generate configuration fix for hardcoded values
   */
  private async generateConfigFix(issue: Issue, repoPath?: string): Promise<IssueFix | null> {
    const fixedCode = `// Move hardcoded values to configuration
// In config.ts or .env file:
export const CONFIG = {
  API_TIMEOUT: process.env.API_TIMEOUT || 5000,
  MAX_RETRIES: process.env.MAX_RETRIES || 3,
  DEFAULT_PAGE_SIZE: 20,
};

// In your code:
import { CONFIG } from './config';

const timeout = CONFIG.API_TIMEOUT;
const retries = CONFIG.MAX_RETRIES;`;

    return {
      issueId: issue.id || 'unknown',
      fixedCode,
      explanation: 'Extract hardcoded values to configuration for easier maintenance',
      confidence: 'medium',
      estimatedTime: '15 minutes'
    };
  }

  /**
   * Generate fixes using AI for complex issues
   */
  private async generateAIFixes(issues: Issue[], repoPath?: string): Promise<IssueFix[]> {
    // TODO: Implement AI-based fix generation
    // This would call OpenRouter or another AI service
    // For now, return a placeholder
    
    return issues.map(issue => ({
      issueId: issue.id || 'unknown',
      fixedCode: '// AI-generated fix would go here\n// This feature is coming soon',
      explanation: 'Complex issue requiring custom fix (AI generation pending)',
      confidence: 'low' as const,
      estimatedTime: '30 minutes'
    }));
  }

  /**
   * Read actual code context if needed
   */
  private async getCodeContext(
    filePath: string, 
    lineNumber: number, 
    repoPath?: string
  ): Promise<CodeContext | null> {
    // TODO: Implement actual file reading
    // This would read the file and extract surrounding context
    
    const language = this.detectLanguage(filePath);
    
    return {
      filePath,
      language,
      framework: this.detectFramework(filePath)
    };
  }

  /**
   * Detect programming language from file extension
   */
  private detectLanguage(filePath: string): CodeContext['language'] {
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) return 'typescript';
    if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) return 'javascript';
    if (filePath.endsWith('.py')) return 'python';
    if (filePath.endsWith('.java')) return 'java';
    if (filePath.endsWith('.go')) return 'go';
    return 'typescript'; // default
  }

  /**
   * Detect framework from file path patterns
   */
  private detectFramework(filePath: string): string | undefined {
    if (filePath.includes('react') || filePath.endsWith('.tsx')) return 'react';
    if (filePath.includes('angular')) return 'angular';
    if (filePath.includes('vue')) return 'vue';
    if (filePath.includes('express')) return 'express';
    if (filePath.includes('next')) return 'nextjs';
    return undefined;
  }
}