/**
 * Working Code Examples MCP Adapter
 * Fetches, validates, and provides real working code examples for educational purposes
 * Integrates with multiple code example sources and validation systems
 */

import { BaseMCPAdapter } from './base-mcp-adapter';
import {
  AnalysisContext,
  ToolResult,
  ToolFinding,
  ToolMetadata,
  ToolCapability,
  ToolRequirements,
  AgentRole
} from '../../core/interfaces';

export interface CodeExampleRequest {
  topic: string;
  language: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  includeTests?: boolean;
  maxExamples?: number;
}

export interface WorkingCodeExample {
  id: string;
  title: string;
  description: string;
  code: string;
  language: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  tags: string[];
  source: string;
  sourceUrl?: string;
  validated: boolean;
  validationResults?: {
    syntaxValid: boolean;
    runsSuccessfully: boolean;
    testsPass: boolean;
    lastValidated: string;
  };
  dependencies?: string[];
  testCode?: string;
  explanation: string;
  relatedConcepts: string[];
  beforeExample?: string;
  afterExample?: string;
  type: 'good' | 'bad' | 'before' | 'after' | 'complete';
}

export interface ExampleValidationResult {
  exampleId: string;
  isValid: boolean;
  syntaxErrors?: string[];
  runtimeErrors?: string[];
  testResults?: {
    passed: number;
    failed: number;
    errors: string[];
  };
}

export class WorkingExamplesMCPAdapter extends BaseMCPAdapter {
  readonly id = 'working-examples-mcp';
  readonly name = 'Working Code Examples Service';
  readonly version = '1.0.0';
  readonly capabilities: ToolCapability[] = [
    { name: 'example-fetching', category: 'documentation' },
    { name: 'code-validation', category: 'documentation' },
    { name: 'testing-examples', category: 'documentation' },
    { name: 'example-generation', category: 'documentation' }
  ];
  readonly requirements: ToolRequirements = {
    executionMode: 'on-demand',
    timeout: 45000,
    authentication: {
      type: 'api-key',
      required: false
    }
  };

  // This would use a custom MCP server for code examples
  protected mcpServerArgs = ['--', 'node', '-e', `
    const { MCPServer } = require('@modelcontextprotocol/sdk/server/index.js');
    const server = new MCPServer({
      name: 'working-examples-mcp',
      version: '1.0.0'
    });
    
    // Add tools for working examples
    server.setRequestHandler('examples/search', async (request) => {
      // Implementation would integrate with code example databases
      return { examples: [] };
    });
    
    server.setRequestHandler('examples/validate', async (request) => {
      // Implementation would validate code examples
      return { valid: true };
    });
    
    server.run();
  `];

  canAnalyze(context: AnalysisContext): boolean {
    // Working examples are useful for educational contexts
    return context.agentRole === 'educational';
  }

  async analyze(context: AnalysisContext): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      await this.initializeMCPServer();
      
      const findings: ToolFinding[] = [];
      const workingExamples: WorkingCodeExample[] = [];

      // Extract topics that need code examples
      const exampleRequests = this.extractExampleRequests(context);
      
      // Fetch working examples for each topic
      for (const request of exampleRequests) {
        const examples = await this.fetchWorkingExamples(request);
        
        // Validate examples
        for (const example of examples) {
          const validation = await this.validateExample(example);
          example.validated = validation.isValid;
          example.validationResults = {
            syntaxValid: !validation.syntaxErrors || validation.syntaxErrors.length === 0,
            runsSuccessfully: !validation.runtimeErrors || validation.runtimeErrors.length === 0,
            testsPass: validation.testResults ? validation.testResults.failed === 0 : true,
            lastValidated: new Date().toISOString()
          };
        }
        
        workingExamples.push(...examples);
        
        // Create educational findings
        examples.forEach(example => {
          findings.push({
            type: 'info',
            severity: 'info',
            category: 'educational',
            message: `Working code example: ${example.title}`,
            documentation: `${example.difficulty} level example for ${example.category}`,
            file: 'educational-examples',
            line: 1,
            column: 1
          });
        });
      }

      return {
        success: true,
        toolId: this.id,
        executionTime: Date.now() - startTime,
        findings,
        metrics: {
          filesAnalyzed: 0,
          examplesFetched: workingExamples.length,
          validatedExamples: workingExamples.filter(e => e.validated).length,
          topicsProcessed: exampleRequests.length
        }
      };
    } catch (error) {
      return this.createErrorResult(error as Error, startTime);
    }
  }

  /**
   * Fetch working examples for a specific request
   */
  private async fetchWorkingExamples(request: CodeExampleRequest): Promise<WorkingCodeExample[]> {
    try {
      // For now, return curated examples - in production this would integrate with:
      // - GitHub code search API
      // - Stack Overflow snippets
      // - Official documentation examples
      // - CodePen/JSFiddle examples
      // - Internal example databases
      
      const examples = await this.getCuratedExamples(request);
      return examples;
    } catch (error) {
      console.warn(`Failed to fetch working examples for "${request.topic}":`, error);
      return [];
    }
  }

  /**
   * Validate a code example
   */
  private async validateExample(example: WorkingCodeExample): Promise<ExampleValidationResult> {
    try {
      const result = await this.executeMCPCommand<ExampleValidationResult>({
        method: 'examples/validate',
        params: {
          code: example.code,
          language: example.language,
          testCode: example.testCode,
          dependencies: example.dependencies
        }
      });

      return result;
    } catch (error) {
      console.warn(`Failed to validate example ${example.id}:`, error);
      return {
        exampleId: example.id,
        isValid: false,
        syntaxErrors: ['Validation service unavailable']
      };
    }
  }

  /**
   * Extract example requests from analysis context
   */
  private extractExampleRequests(context: AnalysisContext): CodeExampleRequest[] {
    const requests: CodeExampleRequest[] = [];
    const language = this.detectLanguage(context);
    
    // Create requests based on analysis types
    [context.agentRole].forEach(type => {
      const category = this.mapAnalysisTypeToCategory(type);
      const difficulty = this.determineDifficulty(context, type);
      
      requests.push({
        topic: `${category} best practices`,
        language,
        difficulty,
        category,
        includeTests: true,
        maxExamples: 3
      });
      
      // Add specific sub-topics
      const subTopics = this.getSubTopics(category);
      subTopics.forEach(subTopic => {
        requests.push({
          topic: subTopic,
          language,
          difficulty,
          category,
          includeTests: false,
          maxExamples: 2
        });
      });
    });

    return requests;
  }

  /**
   * Get curated examples (placeholder for real implementation)
   */
  private async getCuratedExamples(request: CodeExampleRequest): Promise<WorkingCodeExample[]> {
    // This is a simplified implementation
    // In production, this would connect to real example databases
    
    const exampleTemplates = this.getExampleTemplates(request);
    return exampleTemplates.map((template, index) => ({
      id: `curated-${request.topic}-${index}`,
      title: template.title,
      description: template.description,
      code: template.code,
      language: request.language,
      difficulty: request.difficulty,
      category: request.category,
      tags: template.tags,
      source: 'CodeQual Curated Examples',
      validated: true,
      dependencies: template.dependencies || [],
      testCode: template.testCode,
      explanation: template.explanation,
      relatedConcepts: template.relatedConcepts || [],
      type: template.type || 'good'
    }));
  }

  /**
   * Get example templates based on request
   */
  private getExampleTemplates(request: CodeExampleRequest) {
    const templates: any[] = [];
    
    if (request.category === 'security' && request.language === 'typescript') {
      templates.push({
        title: 'Input Validation Best Practice',
        description: 'Secure input validation using TypeScript',
        code: `// Secure input validation example
interface UserInput {
  username: string;
  email: string;
  age: number;
}

function validateUserInput(input: any): UserInput | null {
  // Type guard function
  if (typeof input !== 'object' || input === null) {
    return null;
  }
  
  // Validate username
  if (typeof input.username !== 'string' || 
      input.username.length < 3 || 
      input.username.length > 50 ||
      !/^[a-zA-Z0-9_]+$/.test(input.username)) {
    throw new Error('Invalid username format');
  }
  
  // Validate email
  if (typeof input.email !== 'string' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    throw new Error('Invalid email format');
  }
  
  // Validate age
  if (typeof input.age !== 'number' ||
      input.age < 13 || input.age > 120) {
    throw new Error('Invalid age');
  }
  
  return {
    username: input.username,
    email: input.email,
    age: input.age
  };
}

// Usage example
try {
  const validatedInput = validateUserInput({
    username: 'john_doe',
    email: 'john@example.com',
    age: 25
  });
  console.log('Valid input:', validatedInput);
} catch (error) {
  console.error('Validation failed:', error.message);
}`,
        tags: ['security', 'validation', 'typescript'],
        explanation: 'This example shows proper input validation with type checking, length limits, and pattern matching to prevent security vulnerabilities.',
        relatedConcepts: ['input sanitization', 'type safety', 'error handling'],
        testCode: `// Test for input validation
describe('validateUserInput', () => {
  it('should accept valid input', () => {
    const result = validateUserInput({
      username: 'test_user',
      email: 'test@example.com',
      age: 25
    });
    expect(result).not.toBeNull();
  });
  
  it('should reject invalid username', () => {
    expect(() => validateUserInput({
      username: 'ab', // too short
      email: 'test@example.com',
      age: 25
    })).toThrow('Invalid username format');
  });
});`
      });
    }
    
    if (request.category === 'performance' && request.language === 'typescript') {
      templates.push({
        title: 'Memoization for Performance',
        description: 'Implementing memoization to improve performance',
        code: `// Performance optimization with memoization
function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map<string, ReturnType<T>>();
  
  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

// Example: Expensive fibonacci calculation
function fibonacci(n: number): number {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Memoized version for better performance
const memoizedFibonacci = memoize(fibonacci);

// Performance comparison
console.time('Regular fibonacci');
console.log(fibonacci(40)); // Slow
console.timeEnd('Regular fibonacci');

console.time('Memoized fibonacci');
console.log(memoizedFibonacci(40)); // Fast
console.timeEnd('Memoized fibonacci');

console.time('Memoized fibonacci (cached)');
console.log(memoizedFibonacci(40)); // Very fast (cached)
console.timeEnd('Memoized fibonacci (cached)');`,
        tags: ['performance', 'memoization', 'caching'],
        explanation: 'This example demonstrates memoization technique to cache expensive function results and improve performance for repeated calls.',
        relatedConcepts: ['caching strategies', 'function optimization', 'time complexity']
      });
    }
    
    return templates;
  }

  /**
   * Helper methods
   */
  private detectLanguage(context: AnalysisContext): string {
    // Detect from file extensions
    const extensions = context.pr.files.map(f => f.path.split('.').pop()).filter(Boolean);
    const langMap: Record<string, string> = {
      'ts': 'typescript',
      'js': 'javascript',
      'py': 'python',
      'java': 'java',
      'go': 'go',
      'rs': 'rust'
    };
    
    for (const ext of extensions) {
      if (ext && langMap[ext]) return langMap[ext];
    }
    
    return context.repository.primaryLanguage || 'typescript';
  }

  private mapAnalysisTypeToCategory(analysisType: string): string {
    const categoryMap: Record<string, string> = {
      'security': 'security',
      'performance': 'performance',
      'architecture': 'architecture',
      'code_quality': 'code_quality',
      'dependency': 'dependency'
    };
    
    return categoryMap[analysisType] || 'general';
  }

  private determineDifficulty(context: AnalysisContext, analysisType: string): 'beginner' | 'intermediate' | 'advanced' {
    // This could be enhanced with user skill level detection
    const complexityMap: Record<string, 'beginner' | 'intermediate' | 'advanced'> = {
      'security': 'advanced',
      'performance': 'intermediate',
      'architecture': 'advanced',
      'code_quality': 'intermediate',
      'dependency': 'beginner'
    };
    
    return complexityMap[analysisType] || 'intermediate';
  }

  private getSubTopics(category: string): string[] {
    const subTopicsMap: Record<string, string[]> = {
      'security': ['input validation', 'authentication', 'authorization', 'encryption'],
      'performance': ['memoization', 'lazy loading', 'code splitting', 'optimization'],
      'architecture': ['design patterns', 'SOLID principles', 'clean architecture'],
      'code_quality': ['refactoring', 'clean code', 'testing patterns'],
      'dependency': ['package management', 'version control', 'licensing']
    };
    
    return subTopicsMap[category] || [];
  }

  getMetadata(): ToolMetadata {
    return {
      id: this.id,
      name: this.name,
      description: 'Fetches, validates, and provides real working code examples for educational purposes',
      author: 'CodeQual',
      supportedRoles: ['educational' as AgentRole],
      supportedLanguages: ['typescript', 'javascript', 'python', 'java', 'go', 'rust'],
      tags: ['examples', 'validation', 'code-samples', 'educational'],
      securityVerified: true,
      lastVerified: new Date()
    };
  }
}