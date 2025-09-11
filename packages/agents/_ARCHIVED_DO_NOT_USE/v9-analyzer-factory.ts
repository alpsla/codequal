/**
 * V9 Analyzer Factory
 * 
 * SINGLE SOURCE OF TRUTH for creating V9 analyzers
 * This factory ensures we always use the correct implementation
 * 
 * @important ALWAYS use this factory to create analyzers
 * Never import analyzer classes directly in your code
 */

import { V9BaseAnalyzer } from './v9-base-analyzer-refactored';
import { V9JavaAnalyzer } from './v9-java-analyzer-refactored';
// Import other language analyzers as they are refactored
import { logger } from '../utils/logger';

export type SupportedLanguage = 'java' | 'javascript' | 'typescript' | 'python' | 'go' | 'rust' | 'cpp' | 'csharp';

/**
 * Factory class for creating V9 analyzers
 * Ensures consistent implementation usage across the codebase
 */
export class V9AnalyzerFactory {
  private static instances = new Map<SupportedLanguage, V9BaseAnalyzer>();
  
  /**
   * Create or get a V9 analyzer for the specified language
   * Uses singleton pattern to reuse analyzer instances
   */
  static create(language: SupportedLanguage): V9BaseAnalyzer {
    // Return cached instance if available
    if (this.instances.has(language)) {
      return this.instances.get(language)!;
    }
    
    let analyzer: V9BaseAnalyzer;
    
    switch (language) {
      case 'java':
        analyzer = new V9JavaAnalyzer('V9JavaAnalyzer');
        break;
        
      // TODO: Add other languages as they are refactored
      // case 'javascript':
      // case 'typescript':
      //   analyzer = new V9TypeScriptAnalyzer('V9TypeScriptAnalyzer');
      //   break;
        
      // case 'python':
      //   analyzer = new V9PythonAnalyzer('V9PythonAnalyzer');
      //   break;
        
      // case 'go':
      //   analyzer = new V9GoAnalyzer('V9GoAnalyzer');
      //   break;
        
      // case 'rust':
      //   analyzer = new V9RustAnalyzer('V9RustAnalyzer');
      //   break;
        
      default:
        throw new Error(`Unsupported language: ${language}. Supported languages: java (more coming soon)`);
    }
    
    // Cache the instance
    this.instances.set(language, analyzer);
    logger.info(`✅ Created V9 ${language} analyzer instance`);
    
    return analyzer;
  }
  
  /**
   * Detect language from repository URL or file extensions
   */
  static async detectLanguage(repoUrl: string): Promise<SupportedLanguage> {
    // Simple detection based on common patterns
    // In production, this should analyze the repository content
    
    if (repoUrl.includes('java') || repoUrl.includes('kafka') || repoUrl.includes('spring')) {
      return 'java';
    }
    
    if (repoUrl.includes('rust')) {
      return 'rust';
    }
    
    if (repoUrl.includes('python') || repoUrl.includes('django') || repoUrl.includes('flask')) {
      return 'python';
    }
    
    if (repoUrl.includes('node') || repoUrl.includes('react') || repoUrl.includes('angular')) {
      return 'javascript';
    }
    
    // Default to Java for now
    logger.warn(`Could not detect language for ${repoUrl}, defaulting to Java`);
    return 'java';
  }
  
  /**
   * Clear cached instances (useful for testing)
   */
  static clearCache(): void {
    this.instances.clear();
    logger.info('🧹 Cleared analyzer instance cache');
  }
  
  /**
   * Get information about available analyzers
   */
  static getAvailableAnalyzers(): Array<{
    language: SupportedLanguage;
    status: 'available' | 'coming-soon';
  }> {
    return [
      { language: 'java', status: 'available' },
      { language: 'javascript', status: 'coming-soon' },
      { language: 'typescript', status: 'coming-soon' },
      { language: 'python', status: 'coming-soon' },
      { language: 'go', status: 'coming-soon' },
      { language: 'rust', status: 'coming-soon' },
      { language: 'cpp', status: 'coming-soon' },
      { language: 'csharp', status: 'coming-soon' },
    ];
  }
}