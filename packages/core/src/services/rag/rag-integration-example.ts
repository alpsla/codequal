/**
 * Integration example demonstrating the complete Selective RAG Framework
 * 
 * This example shows how to:
 * 1. Set up the RAG services with real implementations
 * 2. Process repository changes incrementally
 * 3. Perform intelligent searches with metadata filtering
 * 4. Handle different types of queries effectively
 */

import { SelectiveRAGService } from './selective-rag-service';
import { IncrementalUpdateService } from './incremental-update-service';
import { QueryAnalyzer, QueryType, DifficultyLevel } from './query-analyzer';

// Example implementations of required services

/**
 * OpenAI Embedding Service Implementation
 */
class OpenAIEmbeddingService {
  private apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async generateEmbedding(text: string): Promise<number[]> {
    // In a real implementation, this would call OpenAI's API
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-3-large',
        input: text,
        encoding_format: 'float'
      })
    });
    
    const data = await response.json();
    return data.data[0].embedding;
  }
  
  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-3-large',
        input: texts,
        encoding_format: 'float'
      })
    });
    
    const data = await response.json() as { data: Array<{ embedding: number[] }> };
    return data.data.map((item) => item.embedding);
  }
}

/**
 * Content Analysis Service Implementation
 */
class ContentAnalysisService {
  async extractCodeMetadata(content: string, language: string) {
    const metadata = {
      functionNames: [] as string[],
      classNames: [] as string[],
      dependencies: [] as string[],
      frameworkReferences: [] as string[],
      complexityScore: 0.5
    };
    
    // Extract function names based on language
    switch (language.toLowerCase()) {
      case 'typescript':
      case 'javascript':
        metadata.functionNames = this.extractJSFunctions(content);
        metadata.classNames = this.extractJSClasses(content);
        metadata.dependencies = this.extractJSImports(content);
        metadata.frameworkReferences = this.detectJSFrameworks(content);
        break;
      case 'python':
        metadata.functionNames = this.extractPythonFunctions(content);
        metadata.classNames = this.extractPythonClasses(content);
        metadata.dependencies = this.extractPythonImports(content);
        break;
    }
    
    metadata.complexityScore = this.calculateComplexity(content);
    
    return metadata;
  }
  
  async calculateImportanceScore(
    filePath: string,
    content: string,
    metadata: Record<string, unknown>
  ): Promise<number> {
    let score = 0.5; // base score
    
    // Boost score for important file types
    if (filePath.includes('index.') || filePath.includes('main.')) {
      score += 0.3;
    }
    
    if (filePath.includes('api/') || filePath.includes('service')) {
      score += 0.2;
    }
    
    if (filePath.includes('config') || filePath.includes('env')) {
      score += 0.1;
    }
    
    // Boost score based on content characteristics
    const lineCount = content.split('\n').length;
    if (lineCount > 100) score += 0.1;
    if (lineCount > 500) score += 0.1;
    
    // Boost score for files with many functions/classes
    const functionCount = (content.match(/function\s+\w+|const\s+\w+\s*=/g) || []).length;
    if (functionCount > 5) score += 0.1;
    if (functionCount > 15) score += 0.1;
    
    return Math.min(score, 1.0);
  }
  
  determineContentType(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    
    switch (ext) {
      case 'ts':
      case 'js':
      case 'py':
      case 'java':
      case 'go':
      case 'rs':
        return 'code';
      case 'md':
      case 'rst':
      case 'txt':
        return 'documentation';
      case 'json':
      case 'yaml':
      case 'yml':
      case 'toml':
      case 'env':
        return 'config';
      case 'test.ts':
      case 'test.js':
      case 'spec.ts':
      case 'spec.js':
        return 'test';
      default:
        return 'code';
    }
  }
  
  determineContentLanguage(filePath: string, content: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    
    const extensionMap: Record<string, string> = {
      'ts': 'typescript',
      'js': 'javascript',
      'py': 'python',
      'java': 'java',
      'go': 'go',
      'rs': 'rust',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'md': 'markdown',
      'rst': 'rst',
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yaml'
    };
    
    return extensionMap[ext || ''] || 'text';
  }
  
  // Helper methods for code analysis
  private extractJSFunctions(content: string): string[] {
    const patterns = [
      /function\s+(\w+)/g,
      /const\s+(\w+)\s*=\s*\(/g,
      /let\s+(\w+)\s*=\s*\(/g,
      /(\w+)\s*:\s*\([^)]*\)\s*=>/g,
      /async\s+function\s+(\w+)/g
    ];
    
    const functions: string[] = [];
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        functions.push(match[1]);
      }
    }
    
    return [...new Set(functions)];
  }
  
  private extractJSClasses(content: string): string[] {
    const pattern = /class\s+(\w+)/g;
    const classes: string[] = [];
    let match;
    
    while ((match = pattern.exec(content)) !== null) {
      classes.push(match[1]);
    }
    
    return classes;
  }
  
  private extractJSImports(content: string): string[] {
    const patterns = [
      /import.*from\s+['"]([^'"]+)['"]/g,
      /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g
    ];
    
    const imports: string[] = [];
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        imports.push(match[1]);
      }
    }
    
    return [...new Set(imports)];
  }
  
  private detectJSFrameworks(content: string): string[] {
    const frameworks: string[] = [];
    
    const frameworkPatterns: Record<string, RegExp[]> = {
      'react': [/import.*react/i, /useState|useEffect|Component/],
      'express': [/import.*express/i, /app\.get|app\.post|router\./],
      'vue': [/import.*vue/i, /<template>|<script>/],
      'angular': [/import.*@angular/i, /@Component|@Injectable/],
      'nestjs': [/import.*@nestjs/i, /@Controller|@Service/]
    };
    
    for (const [framework, patterns] of Object.entries(frameworkPatterns)) {
      if (patterns.some(pattern => pattern.test(content))) {
        frameworks.push(framework);
      }
    }
    
    return frameworks;
  }
  
  private extractPythonFunctions(content: string): string[] {
    const pattern = /def\s+(\w+)\s*\(/g;
    const functions: string[] = [];
    let match;
    
    while ((match = pattern.exec(content)) !== null) {
      functions.push(match[1]);
    }
    
    return functions;
  }
  
  private extractPythonClasses(content: string): string[] {
    const pattern = /class\s+(\w+)\s*[:()]/g;
    const classes: string[] = [];
    let match;
    
    while ((match = pattern.exec(content)) !== null) {
      classes.push(match[1]);
    }
    
    return classes;
  }
  
  private extractPythonImports(content: string): string[] {
    const patterns = [
      /import\s+(\w+)/g,
      /from\s+(\w+)\s+import/g
    ];
    
    const imports: string[] = [];
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        imports.push(match[1]);
      }
    }
    
    return [...new Set(imports)];
  }
  
  private calculateComplexity(content: string): number {
    // Simple complexity calculation based on various factors
    let score = 0;
    
    // Cyclomatic complexity indicators
    const complexityKeywords = [
      'if', 'else', 'while', 'for', 'switch', 'case',
      'try', 'catch', 'throw', '&&', '||', '?'
    ];
    
    for (const keyword of complexityKeywords) {
      const matches = content.match(new RegExp(`\\b${keyword}\\b`, 'g'));
      score += (matches?.length || 0) * 0.1;
    }
    
    // Normalize to 0-1 range
    return Math.min(score / 10, 1);
  }
}

/**
 * Complete RAG Integration Example
 */
export class RAGIntegrationExample {
  private ragService: SelectiveRAGService;
  private updateService: IncrementalUpdateService;
  private embeddingService: OpenAIEmbeddingService;
  private analysisService: ContentAnalysisService;
  
  constructor(openaiApiKey: string) {
    this.embeddingService = new OpenAIEmbeddingService(openaiApiKey);
    this.analysisService = new ContentAnalysisService();
    
    this.ragService = new SelectiveRAGService(this.embeddingService);
    this.updateService = new IncrementalUpdateService(
      this.embeddingService,
      this.analysisService
    );
  }
  
  /**
   * Example: Process a repository update
   */
  async exampleRepositoryUpdate() {
    const repositoryChanges = {
      repositoryId: 1,
      repositoryUrl: 'https://github.com/example/my-app',
      commitHash: 'abc123',
      changes: [
        {
          filePath: 'src/auth/auth-service.ts',
          changeType: 'modified' as const,
          content: `
            import { sign, verify } from 'jsonwebtoken';
            import { User } from '../models/user';
            
            export class AuthService {
              async authenticateUser(token: string): Promise<User | null> {
                try {
                  const payload = verify(token, process.env.JWT_SECRET!);
                  return await User.findById(payload.userId);
                } catch (error) {
                  return null;
                }
              }
              
              async generateToken(user: User): Promise<string> {
                return sign({ userId: user.id }, process.env.JWT_SECRET!, {
                  expiresIn: '24h'
                });
              }
            }
          `,
          currentHash: 'def456',
          lastModified: new Date()
        },
        {
          filePath: 'src/utils/old-helper.ts',
          changeType: 'deleted' as const
        }
      ],
      detectionMethod: 'git' as const,
      detectedAt: new Date()
    };
    
    // Process the changes
    const result = await this.updateService.processRepositoryChanges(repositoryChanges, {
      batchSize: 5,
      extractCodeMetadata: true,
      calculateImportance: true,
      generateEmbeddings: true
    });
    
    // console.log('Update result:', result);
    return result;
  }
  
  /**
   * Example: Perform intelligent searches
   */
  async exampleSearches() {
    const examples = [
      {
        description: 'Code search with user context',
        query: 'how to implement JWT authentication',
        userContext: {
          skillLevel: DifficultyLevel.INTERMEDIATE,
          preferredLanguages: ['typescript']
        },
        repositoryContext: {
          repositoryId: 1,
          primaryLanguage: 'TypeScript',
          frameworkStack: ['express', 'node']
        }
      },
      {
        description: 'Example request for beginners',
        query: 'show me a simple React component example',
        userContext: {
          skillLevel: DifficultyLevel.BEGINNER,
          preferredLanguages: ['javascript', 'typescript']
        }
      },
      {
        description: 'Troubleshooting query',
        query: 'TypeError: Cannot read property of undefined in React useEffect',
        userContext: {
          skillLevel: DifficultyLevel.INTERMEDIATE
        }
      },
      {
        description: 'Architecture documentation search',
        query: 'microservices architecture patterns and best practices',
        userContext: {
          skillLevel: DifficultyLevel.ADVANCED
        }
      }
    ];
    
    const results = [];
    
    for (const example of examples) {
      console.log(`\n--- ${example.description} ---`);
      console.log(`Query: "${example.query}"`);
      
      const result = await this.ragService.search(
        example.query,
        example.userContext,
        example.repositoryContext,
        {
          maxResults: 5,
          includeEducationalContent: true,
          boost: {
            importanceWeight: 0.3,
            recencyWeight: 0.1,
            frameworkWeight: 0.2
          }
        }
      );
      
      console.log(`Query type: ${result.query.queryType}`);
      console.log(`Confidence: ${result.query.analysisConfidence.toFixed(2)}`);
      console.log(`Documents found: ${result.documentResults.length}`);
      console.log(`Educational content: ${result.educationalResults.length}`);
      console.log(`Search time: ${result.searchDurationMs}ms`);
      
      if (result.searchInsights) {
        console.log('Search insights:', result.searchInsights);
      }
      
      // Show top result
      if (result.documentResults.length > 0) {
        const topResult = result.documentResults[0];
        console.log('Top result:');
        console.log(`  File: ${topResult.filePath}`);
        console.log(`  Similarity: ${topResult.similarity.toFixed(3)}`);
        console.log(`  Relevance: ${topResult.relevanceScore.toFixed(3)}`);
        console.log(`  Content: ${topResult.contentChunk.substring(0, 100)}...`);
      }
      
      results.push(result);
    }
    
    return results;
  }
  
  /**
   * Example: Demonstrate query analysis
   */
  async exampleQueryAnalysis() {
    const queryAnalyzer = new QueryAnalyzer();
    
    const testQueries = [
      'how to implement authentication in React with TypeScript',
      'show me an example of useEffect cleanup',
      'what is the difference between let and const in JavaScript',
      'PostgreSQL connection pool configuration for Node.js',
      'error handling best practices in Express middleware'
    ];
    
    console.log('\n--- Query Analysis Examples ---');
    
    for (const query of testQueries) {
      const analysis = await queryAnalyzer.analyzeQuery(query);
      
      console.log(`\nQuery: "${query}"`);
      console.log(`Type: ${analysis.queryType}`);
      console.log(`Language: ${analysis.programmingLanguage || 'Not detected'}`);
      console.log(`Frameworks: ${analysis.frameworks.join(', ') || 'None'}`);
      console.log(`Content types: ${analysis.contentTypes.join(', ')}`);
      console.log(`Confidence: ${analysis.analysisConfidence.toFixed(2)}`);
      console.log(`Semantic query: "${analysis.semanticQuery}"`);
      
      if (analysis.suggestedRefinements) {
        console.log(`Suggestions: ${analysis.suggestedRefinements.join('; ')}`);
      }
    }
  }
  
  /**
   * Run all examples
   */
  async runAllExamples() {
    console.log('=== RAG Framework Integration Examples ===\n');
    
    try {
      // 1. Query Analysis
      await this.exampleQueryAnalysis();
      
      // 2. Repository Updates
      console.log('\n--- Repository Update Example ---');
      await this.exampleRepositoryUpdate();
      
      // 3. Intelligent Search
      console.log('\n--- Intelligent Search Examples ---');
      await this.exampleSearches();
      
      console.log('\n=== All examples completed successfully! ===');
      
    } catch (error) {
      console.error('Error running examples:', error);
    }
  }
}

// Usage example:
// const ragExample = new RAGIntegrationExample(process.env.OPENAI_API_KEY!);
// await ragExample.runAllExamples();