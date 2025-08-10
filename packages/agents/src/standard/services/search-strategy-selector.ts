/**
 * Search Strategy Selector
 * Automatically determines the best search strategy based on the issue and context
 */

import { Issue } from '../types/analysis-types';

export type SearchStrategy = 'code-search' | 'semantic-analysis' | 'pattern-match';

export interface SearchContext {
  issue: Issue;
  hasCodeSnippet: boolean;
  hasSymbolName: boolean;
  hasLineNumber: boolean;
  searchGoal: 'find-location' | 'verify-fix' | 'find-duplicates' | 'analyze-impact';
}

export interface StrategyDecision {
  primary: SearchStrategy;
  fallback: SearchStrategy;
  confidence: number;
  reasoning: string;
  searchPatterns: string[];
}

/**
 * Intelligent selector for choosing the right search strategy
 */
export class SearchStrategySelector {
  
  /**
   * Main decision method - analyzes the issue and context to pick strategy
   */
  selectStrategy(context: SearchContext): StrategyDecision {
    // Extract all relevant signals from the issue
    const signals = this.extractSignals(context);
    
    // Score each strategy based on signals
    const scores = {
      'code-search': this.scoreCodeSearch(signals),
      'semantic-analysis': this.scoreSemanticAnalysis(signals),
      'pattern-match': this.scorePatternMatch(signals)
    };
    
    // Sort strategies by score
    const sorted = Object.entries(scores)
      .sort(([, a], [, b]) => b.score - a.score) as [SearchStrategy, any][];
    
    const primary = sorted[0][0];
    const fallback = sorted[1][0];
    
    return {
      primary,
      fallback,
      confidence: sorted[0][1].score,
      reasoning: sorted[0][1].reasoning,
      searchPatterns: this.generateSearchPatterns(context, primary)
    };
  }
  
  /**
   * Extract signals from the issue that help determine search strategy
   */
  private extractSignals(context: SearchContext) {
    const issue = context.issue;
    const description = (issue.description || '').toLowerCase();
    const category = (issue.category || '').toLowerCase();
    const title = (issue.title || '').toLowerCase();
    const code = issue.codeSnippet || (issue as any).evidence?.snippet || '';
    
    return {
      // Issue type signals
      hasSymbolName: this.detectSymbolName(description, title, code),
      hasCodePattern: this.detectCodePattern(code),
      hasLiteralString: this.detectLiteralString(description, code),
      hasStructuralPattern: this.detectStructuralPattern(description, category),
      
      // Issue category signals
      isSqlInjection: category.includes('sql') || description.includes('sql injection'),
      isXss: category.includes('xss') || description.includes('cross-site'),
      isHardcodedSecret: category.includes('secret') || description.includes('hardcoded'),
      isMissingValidation: description.includes('validation') || description.includes('missing check'),
      isPerformance: category.includes('performance') || description.includes('n+1'),
      
      // Code signals
      hasExactCode: !!code && code.length > 20,
      hasPartialCode: !!code && code.length <= 20,
      hasNoCode: !code,
      
      // Context signals
      needsExactLocation: context.searchGoal === 'find-location',
      needsAllReferences: context.searchGoal === 'analyze-impact',
      needsPattern: context.searchGoal === 'find-duplicates',
      
      // Extracted patterns
      functionNames: this.extractFunctionNames(description, code),
      variableNames: this.extractVariableNames(description, code),
      sqlPatterns: this.extractSqlPatterns(description, code),
      literals: this.extractLiterals(description, code)
    };
  }
  
  /**
   * Score code-search strategy
   */
  private scoreCodeSearch(signals: any): { score: number; reasoning: string } {
    let score = 50; // Base score
    const reasons = [];
    
    // Positive signals for code-search
    if (signals.hasLiteralString) {
      score += 30;
      reasons.push('has literal strings to search');
    }
    if (signals.hasExactCode) {
      score += 25;
      reasons.push('has exact code snippet');
    }
    if (signals.isSqlInjection && signals.sqlPatterns.length > 0) {
      score += 20;
      reasons.push('SQL patterns for text search');
    }
    if (signals.isHardcodedSecret) {
      score += 25;
      reasons.push('searching for hardcoded values');
    }
    if (signals.literals.length > 0) {
      score += 15;
      reasons.push('has literal values');
    }
    
    // Negative signals
    if (signals.hasSymbolName && !signals.hasExactCode) {
      score -= 20;
      reasons.push('symbol search better than text');
    }
    if (signals.needsAllReferences) {
      score -= 15;
      reasons.push('needs semantic references');
    }
    
    return {
      score: Math.min(100, Math.max(0, score)),
      reasoning: reasons.join('; ')
    };
  }
  
  /**
   * Score semantic-analysis strategy
   */
  private scoreSemanticAnalysis(signals: any): { score: number; reasoning: string } {
    let score = 40; // Base score (lower because it's slower)
    const reasons = [];
    
    // Positive signals for semantic analysis
    if (signals.hasSymbolName) {
      score += 40;
      reasons.push('has symbol/function name');
    }
    if (signals.functionNames.length > 0) {
      score += 30;
      reasons.push('has function names to resolve');
    }
    if (signals.needsAllReferences) {
      score += 35;
      reasons.push('needs to find all references');
    }
    if (signals.needsExactLocation && signals.hasSymbolName) {
      score += 25;
      reasons.push('symbol resolution for exact location');
    }
    if (signals.variableNames.length > 0) {
      score += 15;
      reasons.push('has variables to trace');
    }
    
    // Negative signals
    if (signals.hasNoCode && !signals.hasSymbolName) {
      score -= 30;
      reasons.push('no symbols to analyze');
    }
    if (signals.isHardcodedSecret) {
      score -= 20;
      reasons.push('literal search more appropriate');
    }
    
    return {
      score: Math.min(100, Math.max(0, score)),
      reasoning: reasons.join('; ')
    };
  }
  
  /**
   * Score pattern-match strategy
   */
  private scorePatternMatch(signals: any): { score: number; reasoning: string } {
    let score = 45; // Base score
    const reasons = [];
    
    // Positive signals for pattern matching
    if (signals.hasStructuralPattern) {
      score += 35;
      reasons.push('has structural pattern');
    }
    if (signals.needsPattern) {
      score += 30;
      reasons.push('finding similar patterns');
    }
    if (signals.isMissingValidation) {
      score += 25;
      reasons.push('pattern for missing code');
    }
    if (signals.hasCodePattern) {
      score += 20;
      reasons.push('has code structure pattern');
    }
    if (signals.isPerformance) {
      score += 20;
      reasons.push('performance anti-patterns');
    }
    
    // Negative signals
    if (signals.hasLiteralString && !signals.hasStructuralPattern) {
      score -= 25;
      reasons.push('literal search sufficient');
    }
    if (signals.hasExactCode) {
      score -= 15;
      reasons.push('exact code search better');
    }
    
    return {
      score: Math.min(100, Math.max(0, score)),
      reasoning: reasons.join('; ')
    };
  }
  
  /**
   * Generate search patterns based on strategy
   */
  private generateSearchPatterns(context: SearchContext, strategy: SearchStrategy): string[] {
    const patterns: string[] = [];
    const issue = context.issue;
    const description = issue.description || (issue as any).message || '';
    const title = issue.title || (issue as any).message || '';
    const code = issue.codeSnippet || '';
    const remediation = (issue as any).remediation || (issue as any).suggestion || '';
    
    console.log('Generating patterns for:', { 
      strategy, 
      hasDescription: !!description,
      description: description.substring(0, 50),
      title: title.substring(0, 50)
    });
    switch (strategy) {
      case 'code-search':
        // Generate literal and regex patterns
        patterns.push(...this.extractLiterals(description, code));
        patterns.push(...this.extractSqlPatterns(description, code));
        
        // Add patterns based on issue type
        {
        const lowerDesc = description.toLowerCase();
        const lowerTitle = title.toLowerCase();
        
        if (lowerDesc.includes('sql') || lowerTitle.includes('sql')) {
          patterns.push('(SELECT|INSERT|UPDATE|DELETE).*\\${');
        }
        if (lowerDesc.includes('hardcoded') || lowerTitle.includes('hardcoded')) {
          patterns.push('(api_key|secret|password)\\s*=\\s*["\']');
        }
        if (lowerDesc.includes('validation') || lowerTitle.includes('validation') || 
            lowerDesc.includes('input') || lowerTitle.includes('input')) {
          patterns.push('req\\.body');
          patterns.push('req\\.query');
          patterns.push('req\\.params');
        }
        if (lowerDesc.includes('rate limit') || lowerTitle.includes('rate limit')) {
          patterns.push('rateLimit');
          patterns.push('express-rate-limit');
        }
        if (lowerDesc.includes('settimeout') || lowerDesc.includes('delay')) {
          patterns.push('setTimeout');
          patterns.push('sleep');
          patterns.push('delay');
        }
        if (lowerDesc.includes('api') || lowerDesc.includes('endpoint')) {
          patterns.push('app\\.get');
          patterns.push('app\\.post');
          patterns.push('router\\.get');
          patterns.push('router\\.post');
          patterns.push('module\\.exports');
          patterns.push('export default');
        }
        // Add more generic patterns for common issues
        if (lowerDesc.includes('inefficient') || lowerDesc.includes('performance')) {
          patterns.push('forEach');
          patterns.push('map');
          patterns.push('filter');
          patterns.push('fetch');
          patterns.push('await');
        }
        if (lowerDesc.includes('error') || lowerDesc.includes('handling')) {
          patterns.push('try');
          patterns.push('catch');
          patterns.push('\\.catch');
          patterns.push('throw');
        }
        if (lowerDesc.includes('disclosure') || lowerDesc.includes('information')) {
          patterns.push('console\\.log');
          patterns.push('console\\.error');
          patterns.push('res\\.send');
          patterns.push('res\\.json');
        }
        if (lowerDesc.includes('blocking') || lowerDesc.includes('operations')) {
          patterns.push('sync');
          patterns.push('readFileSync');
          patterns.push('writeFileSync');
        }
        }
        break;
        
      case 'semantic-analysis':
        // Generate symbol patterns
        patterns.push(...this.extractFunctionNames(description, code));
        patterns.push(...this.extractVariableNames(description, code));
        patterns.push(...this.extractClassNames(description, code));
        
        // Extract from remediation text
        if (remediation) {
          patterns.push(...this.extractFunctionNames(remediation, ''));
        }
        break;
        
      case 'pattern-match': {
        // Generate AST patterns
        const lowerDescPat = description.toLowerCase();
        if (lowerDescPat.includes('empty catch')) {
          patterns.push('try { $$$ } catch($ERR) { }');
        }
        if (lowerDescPat.includes('missing validation') || lowerDescPat.includes('no validation')) {
          patterns.push('function $FUNC($PARAMS) { $BODY }');
        }
        if (lowerDescPat.includes('error handling')) {
          patterns.push('catch');
          patterns.push('.catch(');
        }
        if (lowerDescPat.includes('memory leak')) {
          patterns.push('setInterval');
          patterns.push('addEventListener');
        }
        if (code) {
          // Convert code to pattern with wildcards
          patterns.push(this.codeToPattern(code));
        }
        break;
      }
    }
    
    // If no patterns found, try generic extraction from title/description
    if (patterns.length === 0) {
      // Extract any code-like words from description
      const codeWords = (description + ' ' + title).match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
      const relevantWords = codeWords.filter(w => 
        w.length > 3 && 
        !['the', 'for', 'and', 'are', 'with', 'from', 'this', 'that', 'have', 'been'].includes(w.toLowerCase())
      );
      patterns.push(...relevantWords.slice(0, 3)); // Take top 3 relevant words
    }
    
    // Remove duplicates and empty patterns
    return [...new Set(patterns.filter(p => p && p.trim()))]
      .slice(0, 5); // Limit to 5 patterns for performance
  }
  
  // Detection methods
  private detectSymbolName(description: string, title: string, code: string): boolean {
    const text = `${description} ${title} ${code}`.toLowerCase();
    return !!/\b(function|method|class|const|let|var|def|func)\s+\w+/.test(text) ||
           !!/\b\w+\(/.test(text); // function calls
  }
  
  private detectCodePattern(code: string): boolean {
    if (!code) return false;
    // Has control flow structures
    return code.includes('if') || code.includes('for') || 
           code.includes('while') || code.includes('try');
  }
  
  private detectLiteralString(description: string, code: string): boolean {
    const text = `${description} ${code}`;
    // Has quoted strings or specific values
    return !!/["'`].*["'`]/.test(text) || 
           !!/\b(SELECT|INSERT|UPDATE|DELETE)\b/i.test(text);
  }
  
  private detectStructuralPattern(description: string, category: string): boolean {
    const indicators = [
      'pattern', 'structure', 'anti-pattern', 'missing', 'empty',
      'nested', 'complex', 'duplicate'
    ];
    const text = `${description} ${category}`.toLowerCase();
    return indicators.some(ind => text.includes(ind));
  }
  
  // Extraction methods
  private extractFunctionNames(description: string, code: string): string[] {
    const text = `${description} ${code}`;
    const patterns = [];
    
    // Function declarations
    const funcMatches = text.match(/\b(function|def|func)\s+(\w+)/g);
    if (funcMatches) {
      patterns.push(...funcMatches.map(m => m.split(/\s+/)[1]));
    }
    
    // Method calls
    const callMatches = text.match(/\b(\w+)\s*\(/g);
    if (callMatches) {
      patterns.push(...callMatches.map(m => m.replace(/[(\s]/g, '')));
    }
    
    return patterns;
  }
  
  private extractVariableNames(description: string, code: string): string[] {
    const text = `${description} ${code}`;
    const patterns = [];
    
    const varMatches = text.match(/\b(const|let|var)\s+(\w+)/g);
    if (varMatches) {
      patterns.push(...varMatches.map(m => m.split(/\s+/)[1]));
    }
    
    return patterns;
  }
  
  private extractClassNames(description: string, code: string): string[] {
    const text = `${description} ${code}`;
    const patterns = [];
    
    const classMatches = text.match(/\b(class|interface|struct)\s+(\w+)/g);
    if (classMatches) {
      patterns.push(...classMatches.map(m => m.split(/\s+/)[1]));
    }
    
    return patterns;
  }
  
  private extractSqlPatterns(description: string, code: string): string[] {
    const text = `${description} ${code}`;
    const patterns = [];
    
    // SQL keywords
    const sqlMatches = text.match(/\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN)\b/gi);
    if (sqlMatches) {
      patterns.push(...sqlMatches);
    }
    
    // Table names after FROM
    const tableMatches = text.match(/FROM\s+(\w+)/gi);
    if (tableMatches) {
      patterns.push(...tableMatches);
    }
    
    return patterns;
  }
  
  private extractLiterals(description: string, code: string): string[] {
    const text = `${description} ${code}`;
    const patterns = [];
    
    // Quoted strings
    const stringMatches = text.match(/["'`]([^"'`]+)["'`]/g);
    if (stringMatches) {
      patterns.push(...stringMatches.map(m => m.slice(1, -1)));
    }
    
    return patterns;
  }
  
  private codeToPattern(code: string): string {
    // Convert code snippet to AST pattern with wildcards
    return code
      .replace(/["'`][^"'`]*["'`]/g, '$STRING')  // Replace strings
      .replace(/\b\d+\b/g, '$NUM')               // Replace numbers
      .replace(/\b\w+\b/g, '$VAR')               // Replace identifiers
      .trim();
  }
}

/**
 * Usage example:
 * 
 * const selector = new SearchStrategySelector();
 * const decision = selector.selectStrategy({
 *   issue: {
 *     description: "SQL injection in getUserData function",
 *     category: "SQL Injection",
 *     codeSnippet: "const query = `SELECT * FROM users WHERE id = ${userId}`;"
 *   },
 *   hasCodeSnippet: true,
 *   hasSymbolName: true,
 *   hasLineNumber: false,
 *   searchGoal: 'find-location'
 * });
 * 
 * Result:
 * {
 *   primary: 'code-search',
 *   fallback: 'semantic-analysis',
 *   confidence: 85,
 *   reasoning: 'has exact code snippet; SQL patterns for text search',
 *   searchPatterns: ['SELECT * FROM users', 'getUserData', '${userId}']
 * }
 */