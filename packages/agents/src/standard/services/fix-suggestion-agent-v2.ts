import { createClient } from '@supabase/supabase-js';
import { Issue } from '../types/analysis-types';
// Note: TrulyDynamicSelector and makeOpenRouterRequest are not available
// TODO: Implement proper LLM integration
import { CodeContextExtractor, TemplateInterpolator, ExtractedContext } from './code-context-extractor';

interface FixSuggestion {
  issueId: string;
  originalCode: string;
  fixedCode: string;
  explanation: string;
  confidence: 'high' | 'medium' | 'low';
  estimatedMinutes: number;
  language: string;
  framework?: string;
  templateUsed?: string; // Track which template was used
}

interface IssueContext {
  issue: Issue;
  language: string;
  framework?: string;
  fileContent?: string;
  surroundingCode?: string;
}

interface FixPromptConfig {
  id: string;
  role: 'fix-suggestion';
  prompt_template: string;
  language_templates: Record<string, any>;
  model_requirements: {
    min_context: number;
    preferred_models: string[];
    capabilities: string[];
  };
  created_at: string;
  updated_at: string;
}

/**
 * Fix Suggestion Agent - Generates actionable code fixes for identified issues
 * Leverages Comparator agent's language understanding capabilities
 */
export class FixSuggestionAgentV2 {
  private supabase: any;
  // private modelSelector: TrulyDynamicSelector; // TODO: Implement proper model selector
  private promptConfig: FixPromptConfig | null = null;
  private languageTemplates: Map<string, Map<string, Function>> = new Map();
  private contextExtractor: CodeContextExtractor;
  private templateInterpolator: TemplateInterpolator;
  private cachedModel: string | undefined; // Cache model to avoid repeated selection

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    // this.modelSelector = new TrulyDynamicSelector(); // TODO: Implement proper model selector
    this.contextExtractor = new CodeContextExtractor();
    this.templateInterpolator = new TemplateInterpolator();
    this.initializeTemplates();
  }

  /**
   * Initialize language-specific fix templates
   */
  /**
   * Initialize templates - now delegated to template-library.ts
   * @deprecated Use template-library.ts instead
   */
  private initializeTemplates() {
    // Templates are now managed in template-library.ts
    // This method is kept for backward compatibility but does nothing
    console.log('Templates are now managed by template-library.ts');
  }

  /**
   * Register a fix template for multiple languages
   */
  private registerTemplate(pattern: string, languages: Record<string, Function>) {
    if (!this.languageTemplates.has(pattern)) {
      this.languageTemplates.set(pattern, new Map());
    }
    const patternMap = this.languageTemplates.get(pattern)!;
    
    for (const [lang, func] of Object.entries(languages)) {
      patternMap.set(lang, func);
    }
  }

  /**
   * Load prompt configuration from Supabase
   */
  private async loadPromptConfig(): Promise<void> {
    const { data, error } = await this.supabase
      .from('agent_prompts')
      .select('*')
      .eq('role', 'fix-suggestion')
      .single();

    if (error) {
      console.log('No fix-suggestion prompt found, creating default...');
      await this.createDefaultPromptConfig();
      return;
    }

    this.promptConfig = data;
  }

  /**
   * Create default prompt configuration in Supabase
   */
  private async createDefaultPromptConfig(): Promise<void> {
    const defaultConfig: Partial<FixPromptConfig> = {
      role: 'fix-suggestion',
      prompt_template: `You are an expert software engineer specializing in fixing code issues.

Given an issue in {language} code{framework}, generate a precise fix that:
1. Solves the identified problem
2. Follows {language} best practices
3. Maintains consistency with existing code style
4. Is production-ready and secure

Issue Details:
{issue_description}

Issue Category: {issue_category}
Severity: {issue_severity}
File: {file_path}
Line: {line_number}

Current Code:
\`\`\`{language}
{current_code}
\`\`\`

Generate a fix that:
- Addresses the root cause, not symptoms
- Includes necessary imports if needed
- Handles edge cases
- Is properly typed (for typed languages)
- Includes brief inline comments if complex

Return ONLY the fixed code snippet, no explanation.`,
      
      language_templates: {
        typescript: {
          imports: 'import { Required, Modules } from "package";',
          error_class: 'Error',
          log_function: 'console.error'
        },
        python: {
          imports: 'from typing import Required\nimport necessary_modules',
          error_class: 'Exception',
          log_function: 'logger.error'
        },
        java: {
          imports: 'import required.packages.*;',
          error_class: 'Exception',
          log_function: 'logger.error'
        },
        go: {
          imports: 'import (\n    "fmt"\n    "log"\n)',
          error_class: 'error',
          log_function: 'log.Printf'
        }
      },
      
      model_requirements: {
        min_context: 8000,
        preferred_models: [
          'anthropic/claude-3-opus',
          'openai/gpt-4-turbo-preview',
          'anthropic/claude-3-sonnet'
        ],
        capabilities: ['code_generation', 'language_understanding', 'security_awareness']
      }
    };

    const { error } = await this.supabase
      .from('agent_prompts')
      .insert(defaultConfig);

    if (error) {
      console.error('Failed to create default prompt config:', error);
    } else {
      this.promptConfig = defaultConfig as FixPromptConfig;
    }
  }

  /**
   * Generate fixes for a list of issues
   */
  async generateFixes(
    issues: Issue[],
    repoPath?: string,
    prContext?: { 
      description?: string;
      changedFiles?: string[];
      modelConfig?: { model: string; provider?: string }; // Accept model config from caller
    }
  ): Promise<FixSuggestion[]> {
    if (!this.promptConfig) {
      await this.loadPromptConfig();
    }

    const fixes: FixSuggestion[] = [];
    
    // Cache the model selection to avoid repeated calls
    this.cachedModel = prContext?.modelConfig?.model;
    
    // Limit the number of issues to process to avoid timeout
    const maxIssues = 5; // Process only top 5 issues
    const issuesToProcess = issues.slice(0, maxIssues);
    
    console.log(`Processing ${issuesToProcess.length} of ${issues.length} issues for fix suggestions`);
    
    // Group issues by file and language for efficient processing
    const groupedIssues = this.groupIssuesByFileAndLanguage(issuesToProcess);
    
    for (const [key, group] of groupedIssues.entries()) {
      const [filePath, language] = key.split('|');
      
      // Try template-based fixes first
      for (const issue of group) {
        const templateFix = await this.tryTemplateFix(issue, language);
        if (templateFix) {
          fixes.push(templateFix);
        } else {
          // Fall back to AI-generated fix
          const aiFix = await this.generateAIFix(issue, language, repoPath);
          if (aiFix) {
            fixes.push(aiFix);
          }
        }
      }
    }
    
    return fixes;
  }

  /**
   * Try to generate fix using templates with smart context extraction
   */
  private async tryTemplateFix(issue: Issue, language: string): Promise<FixSuggestion | null> {
    // Import the security template library for better function name preservation
    const { SecurityTemplateLibrary } = await import('./security-template-library');
    const securityLibrary = new SecurityTemplateLibrary();
    
    // Try security templates first (they have better function extraction)
    const securityMatch = securityLibrary.getTemplateMatch(issue, language);
    
    if (securityMatch && securityMatch.template && securityMatch.confidence > 0.3) {
      // Use security template which preserves function names
      return {
        issueId: issue.id || `issue-${Date.now()}`,
        originalCode: issue.codeSnippet || '',
        fixedCode: securityMatch.template.code,
        explanation: securityMatch.template.explanation,
        confidence: securityMatch.template.confidence as 'high' | 'medium' | 'low',
        estimatedMinutes: securityMatch.template.estimatedMinutes,
        language,
        framework: this.detectFramework(issue.location?.file || ''),
        templateUsed: securityMatch.pattern // Track which template was used
      };
    }
    
    // Fall back to original template library for non-security issues
    const { templateLibrary } = await import('./template-library');
    
    // Match issue to template (now async for security templates)
    const match = await templateLibrary.matchTemplate(issue, language);
    
    if (!match || !match.template || match.confidence < 0.3) {
      return null; // Fall back to AI if no good match
    }
    
    try {
      // Extract context from the actual code
      const extractedContext = this.contextExtractor.extractContext(
        issue.codeSnippet || '',
        issue.message || issue.title || '',
        language,
        issue.location?.file,
        issue.location?.line
      );
      
      // Check if we successfully extracted enough context
      if (!extractedContext.primaryVariable && 
          extractedContext.variables.length === 0 && 
          extractedContext.parameters.length === 0) {
        console.log(`Context extraction failed for issue ${issue.id}, falling back to AI`);
        return null;
      }
      
      // Apply template with extracted context
      const fixTemplate = await templateLibrary.applyTemplate(
        match.pattern,
        language,
        extractedContext,
        issue
      );
      
      if (!fixTemplate) {
        console.log(`Template application failed for pattern ${match.pattern}`);
        return null;
      }
      
      return {
        issueId: issue.id || `issue-${Date.now()}`,
        originalCode: issue.codeSnippet || '',
        fixedCode: fixTemplate.code,
        explanation: fixTemplate.explanation,
        confidence: fixTemplate.confidence,
        estimatedMinutes: fixTemplate.estimatedMinutes,
        language,
        framework: this.detectFramework(issue.location?.file || ''),
        templateUsed: match.pattern // Track which template was used
      };
    } catch (error) {
      console.error('Template fix generation failed:', error);
      return null;
    }
  }
  
  /**
   * Generate validation fix with actual context
   */
  private generateValidationFix(context: ExtractedContext, language: string): string {
    const variable = context.primaryVariable || context.parameters[0]?.name || 'input';
    
    switch (language) {
      case 'typescript':
      case 'javascript':
        // Check if we know the type from parameters
        const param = context.parameters.find(p => p.name === variable);
        if (param?.type && param.type !== 'any') {
          if (param.type.includes('number')) {
            return `if (typeof ${variable} !== 'number' || isNaN(${variable})) {
  throw new Error('${variable} must be a valid number');
}`;
          }
          if (param.type.includes('[]')) {
            return `if (!Array.isArray(${variable})) {
  throw new Error('${variable} must be an array');
}`;
          }
        }
        // Default string validation
        return `if (!${variable} || typeof ${variable} !== 'string') {
  throw new Error('Invalid ${variable}: expected non-empty string');
}`;
        
      case 'python':
        return `if not ${variable} or not isinstance(${variable}, str):
    raise ValueError(f"Invalid ${variable}: expected non-empty string")`;
        
      case 'java':
        return `if (${variable} == null || ${variable}.isEmpty()) {
    throw new IllegalArgumentException("Invalid ${variable}: must be non-empty");
}`;
        
      case 'go':
        return `if ${variable} == "" {
    return fmt.Errorf("invalid ${variable}: expected non-empty string")
}`;
        
      default:
        return `// Add validation for ${variable}`;
    }
  }
  
  /**
   * Generate error handling fix with actual context
   */
  private generateErrorHandlingFix(context: ExtractedContext, language: string): string {
    const method = context.methodName || 'operation';
    const code = context.surroundingCode.trim();
    
    switch (language) {
      case 'typescript':
      case 'javascript':
        return `try {
  ${code}
} catch (error) {
  console.error('${method} failed:', error);
  throw new Error(\`${method} failed: \${error.message}\`);
}`;
        
      case 'python':
        return `try:
    ${code.replace(/\n/g, '\n    ')}
except Exception as e:
    logger.error(f"${method} failed: {e}")
    raise RuntimeError(f"${method} failed: {str(e)}")`;
        
      case 'java':
        return `try {
    ${code}
} catch (Exception e) {
    logger.error("${method} failed", e);
    throw new RuntimeException("${method} failed: " + e.getMessage(), e);
}`;
        
      case 'go':
        // Go doesn't use try-catch, add error checking
        if (code.includes(':=')) {
          const lines = code.split('\n');
          const modifiedLines = lines.map(line => {
            if (line.includes(':=')) {
              return line + '\nif err != nil {\n    return nil, fmt.Errorf("' + method + ' failed: %w", err)\n}';
            }
            return line;
          });
          return modifiedLines.join('\n');
        }
        return `${code}
if err != nil {
    return nil, fmt.Errorf("${method} failed: %w", err)
}`;
        
      default:
        return `// Add error handling for ${method}`;
    }
  }
  
  /**
   * Generate SQL injection fix with actual context
   */
  private generateSqlInjectionFix(context: ExtractedContext, language: string): string {
    // Extract SQL query and variables from code
    const code = context.surroundingCode;
    const variables = context.variables;
    
    switch (language) {
      case 'typescript':
      case 'javascript':
        // Find the query string
        const queryMatch = code.match(/["'`]([^"'`]*(?:SELECT|INSERT|UPDATE|DELETE)[^"'`]*)["'`]/i);
        if (queryMatch) {
          const query = queryMatch[1];
          // Replace variable interpolations with placeholders
          let paramQuery = query;
          const params: string[] = [];
          variables.forEach(v => {
            if (query.includes(v) || query.includes('${' + v + '}')) {
              paramQuery = paramQuery.replace(new RegExp('\\$\\{' + v + '\\}|' + v, 'g'), '?');
              params.push(v);
            }
          });
          
          return `// Use parameterized query to prevent SQL injection
const query = '${paramQuery}';
const params = [${params.join(', ')}];
const result = await db.query(query, params);`;
        }
        break;
        
      case 'python':
        return `# Use parameterized query to prevent SQL injection
query = "SELECT * FROM table WHERE id = %s AND status = %s"
params = (${variables.slice(0, 2).join(', ') || 'param1, param2'})
cursor.execute(query, params)`;
        
      case 'java':
        return `// Use PreparedStatement to prevent SQL injection
String query = "SELECT * FROM table WHERE id = ? AND status = ?";
PreparedStatement pstmt = connection.prepareStatement(query);
pstmt.setString(1, ${variables[0] || 'param1'});
pstmt.setString(2, ${variables[1] || 'param2'});
ResultSet rs = pstmt.executeQuery();`;
        
      case 'go':
        return `// Use parameterized query to prevent SQL injection
query := "SELECT * FROM table WHERE id = $1 AND status = $2"
rows, err := db.Query(query, ${variables.slice(0, 2).join(', ') || 'param1, param2'})
if err != nil {
    return nil, err
}
defer rows.Close()`;
    }
    
    return '// Use parameterized queries instead of string concatenation';
  }
  
  /**
   * Generate null check fix with actual context  
   */
  private generateNullCheckFix(context: ExtractedContext, language: string): string {
    const variable = context.primaryVariable || context.variables[0] || 'value';
    
    switch (language) {
      case 'typescript':
      case 'javascript':
        return `if (${variable} === null || ${variable} === undefined) {
  // Handle null/undefined case
  console.warn('${variable} is null or undefined');
  return defaultValue; // or throw error
}
// Safe to use ${variable} here`;
        
      case 'python':
        return `if ${variable} is None:
    # Handle None case
    logger.warning(f"${variable} is None")
    return default_value  # or raise exception`;
        
      case 'java':
        return `if (${variable} == null) {
    // Handle null case
    logger.warn("${variable} is null");
    return defaultValue; // or throw exception
}
// Safe to use ${variable} here`;
        
      case 'go':
        return `if ${variable} == nil {
    // Handle nil case
    log.Printf("${variable} is nil")
    return defaultValue, nil // or return error
}
// Safe to use ${variable} here`;
    }
    
    return `// Add null check for ${variable}`;
  }
  
  /**
   * Generate config extraction fix
   */
  private generateConfigFix(context: ExtractedContext, language: string): string {
    // Find hardcoded values in the code
    const code = context.surroundingCode;
    const numbers = code.match(/\d+/g) || [];
    const strings = code.match(/["']([^"']+)["']/g) || [];
    
    switch (language) {
      case 'typescript':
      case 'javascript':
        return `// Extract to configuration
const CONFIG = {
  ${numbers.length > 0 ? `TIMEOUT: ${numbers[0]},` : ''}
  ${numbers.length > 1 ? `MAX_RETRIES: ${numbers[1]},` : ''}
  ${strings.length > 0 ? `API_URL: ${strings[0]},` : ''}
  DEFAULT_VALUE: process.env.DEFAULT_VALUE || 'default'
};

// Use config values instead of hardcoded ones
const timeout = CONFIG.TIMEOUT;`;
        
      case 'python':
        return `# Extract to configuration
CONFIG = {
    ${numbers.length > 0 ? `'TIMEOUT': ${numbers[0]},` : ''}
    ${numbers.length > 1 ? `'MAX_RETRIES': ${numbers[1]},` : ''}
    ${strings.length > 0 ? `'API_URL': ${strings[0]},` : ''}
    'DEFAULT_VALUE': os.getenv('DEFAULT_VALUE', 'default')
}

# Use config values
timeout = CONFIG['TIMEOUT']`;
        
      case 'java':
        return `// Extract to configuration class
public class Config {
    ${numbers.length > 0 ? `public static final int TIMEOUT = ${numbers[0]};` : ''}
    ${numbers.length > 1 ? `public static final int MAX_RETRIES = ${numbers[1]};` : ''}
    ${strings.length > 0 ? `public static final String API_URL = ${strings[0]};` : ''}
}

// Use config values
int timeout = Config.TIMEOUT;`;
        
      case 'go':
        return `// Extract to configuration
type Config struct {
    ${numbers.length > 0 ? `Timeout int` : ''}
    ${numbers.length > 1 ? `MaxRetries int` : ''}
    ${strings.length > 0 ? `APIURL string` : ''}
}

var config = Config{
    ${numbers.length > 0 ? `Timeout: ${numbers[0]},` : ''}
    ${numbers.length > 1 ? `MaxRetries: ${numbers[1]},` : ''}
    ${strings.length > 0 ? `APIURL: ${strings[0]},` : ''}
}`;
    }
    
    return '// Extract hardcoded values to configuration';
  }

  /**
   * Generate fix using AI when templates don't match
   */
  private async generateAIFix(
    issue: Issue,
    language: string,
    repoPath?: string
  ): Promise<FixSuggestion | null> {
    try {
      // Build a simple prompt without needing config
      const prompt = `Fix the following ${issue.severity} ${issue.category} issue in ${language}:

Issue: ${issue.title || issue.message}
Description: ${issue.description || ''}
File: ${issue.location?.file || 'unknown'}
Line: ${issue.location?.line || 'unknown'}

Current problematic code:
\`\`\`${language}
${issue.codeSnippet || '// Code not available'}
\`\`\`

Provide a complete, working fix that addresses this issue. The fix should:
1. Be a drop-in replacement (maintain the same function signature)
2. Include comments explaining the fix
3. Follow security best practices

Return only the fixed code without explanation.`;
      
      // Try to get a real AI fix or use intelligent fallback
      const fixedCode = await this.getRealOrIntelligentFix(issue, language, prompt);
      
      // If we couldn't generate a fix, return null
      if (!fixedCode) {
        console.log(`  ℹ️ No fix suggestion available for issue: ${issue.id}`);
        return null;
      }
      
      return {
        issueId: issue.id || `issue-${Date.now()}`,
        originalCode: issue.codeSnippet || '',
        fixedCode,
        explanation: `Fix generated for: ${issue.title || issue.message}`,
        confidence: 'medium',
        estimatedMinutes: this.estimateFixTime('complex'),
        language,
        framework: this.detectFramework(issue.location?.file || ''),
        templateUsed: 'ai-fallback' // Mark as AI-generated using existing field
      };
    } catch (error) {
      console.error('AI fix generation failed:', error);
      return null;
    }
  }
  
  /**
   * Get a real AI fix or provide an intelligent pattern-based fix
   */
  private async getRealOrIntelligentFix(
    issue: Issue, 
    language: string,
    prompt: string
  ): Promise<string | null> {
    // PRIMARY: Try intelligent pattern-based fixes first
    const patternFix = this.generateIntelligentPatternFix(issue, language);
    
    // If we got a meaningful pattern fix (not just the original snippet), use it
    if (patternFix && patternFix !== (issue.codeSnippet || '')) {
      console.log('  ✅ Using template-based fix');
      return patternFix;
    }
    
    // FALLBACK: Try AI generation if templates didn't produce a fix
    if (process.env.OPENROUTER_API_KEY && process.env.USE_DEEPWIKI_MOCK !== 'true') {
      try {
        let modelId = this.cachedModel; // Use cached model if available
        
        // Only select model if not cached
        if (!modelId) {
          const { DynamicModelSelectorV8 } = await import('../comparison/dynamic-model-selector-v8');
          const modelSelector = new DynamicModelSelectorV8();
          modelId = await modelSelector.selectOptimalModel({ 
            language,
            taskType: 'fix-generation'
          });
          this.cachedModel = modelId; // Cache for reuse
        }
        
        // Call OpenRouter API for real fix with timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        try {
          console.log(`  🤖 Template didn't match, trying AI with model: ${modelId}`);
          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: modelId || 'anthropic/claude-3-sonnet',
              messages: [
                { role: 'system', content: 'You are a code fix generator. Provide ONLY the fixed code without any explanation or markdown formatting.' },
                { role: 'user', content: prompt }
              ],
              temperature: 0.1,
              max_tokens: 300
            }),
            signal: controller.signal
          });
          
          clearTimeout(timeout);
          
          if (response.ok) {
            const data = await response.json();
            const fixContent = data.choices?.[0]?.message?.content || '';
            if (fixContent && fixContent.trim()) {
              console.log('  ✅ AI generated fix successfully');
              return fixContent.trim();
            }
          }
        } catch (error: any) {
          clearTimeout(timeout);
          if (error.name === 'AbortError') {
            console.log('  ⚠️ AI fix generation timed out after 5s');
          } else {
            console.log('  ⚠️ AI fix generation failed:', error.message);
          }
        }
      } catch (error) {
        console.log('  ⚠️ Model selection failed:', error);
      }
    }
    
    // If we can't generate a meaningful fix, return null
    console.log('  ⚠️ Unable to generate fix for this issue');
    return null;
  }
  
  /**
   * Generate intelligent pattern-based fixes for common issues
   */
  private generateIntelligentPatternFix(issue: Issue, language: string): string {
    const snippet = issue.codeSnippet || '';
    const title = (issue.title || '').toLowerCase();
    const category = issue.category?.toLowerCase();
    
    // Security fixes
    if (category === 'security' || title.includes('injection') || title.includes('xss')) {
      if (title.includes('sql')) {
        return this.generateSQLInjectionFix(snippet, language);
      }
      if (title.includes('xss') || title.includes('sanitiz')) {
        return this.generateXSSFix(snippet, language);
      }
      if (title.includes('validation') || title.includes('input')) {
        return this.generateInputValidationFix(snippet, language);
      }
    }
    
    // Error handling fixes
    if (title.includes('error') || title.includes('exception') || title.includes('catch')) {
      return this.generateErrorHandlingFixFromSnippet(snippet, language);
    }
    
    // Performance fixes
    if (category === 'performance' || title.includes('performance') || title.includes('inefficient')) {
      if (title.includes('fetch') || title.includes('cache')) {
        return this.generateCachingFix(snippet, language);
      }
      if (title.includes('loop') || title.includes('array')) {
        return this.generateOptimizedLoopFix(snippet, language);
      }
    }
    
    // Race condition fixes
    if (title.includes('race') || title.includes('concurrent')) {
      return this.generateRaceConditionFix(snippet, language);
    }
    
    // Data validation fixes
    if (title.includes('validation') || title.includes('response')) {
      return this.generateDataValidationFix(snippet, language);
    }
    
    // If no pattern matches, return empty string to indicate no fix
    return '';
  }
  
  private generateSQLInjectionFix(snippet: string, language: string): string {
    if (language === 'javascript' || language === 'typescript') {
      return `// Fixed: Using parameterized queries to prevent SQL injection
const query = 'SELECT * FROM users WHERE id = ? AND status = ?';
const results = await db.execute(query, [userId, status]);
return results;`;
    }
    return snippet; // Return original for unsupported languages
  }
  
  private generateXSSFix(snippet: string, language: string): string {
    if (language === 'javascript' || language === 'typescript') {
      return `// Fixed: Sanitize user input to prevent XSS
import DOMPurify from 'dompurify';

const sanitizedInput = DOMPurify.sanitize(userInput);
element.innerHTML = sanitizedInput; // Safe to use now`;
    }
    return snippet;
  }
  
  private generateInputValidationFix(snippet: string, language: string): string {
    if (language === 'javascript' || language === 'typescript') {
      // Try to extract variable name from snippet
      const varMatch = snippet.match(/(?:const|let|var)\s+(\w+)\s*=/);
      const varName = varMatch ? varMatch[1] : 'input';
      
      return `// Fixed: Add comprehensive input validation
if (!${varName}) {
  throw new Error('${varName} is required');
}

if (typeof ${varName} !== 'string') {
  throw new Error('${varName} must be a string');
}

// Sanitize and validate
const sanitized${varName} = ${varName}.trim();
if (sanitized${varName}.length < 1 || sanitized${varName}.length > 255) {
  throw new Error('${varName} must be between 1 and 255 characters');
}

// Use the sanitized value
const result = processData(sanitized${varName});`;
    }
    return snippet;
  }
  
  private generateErrorHandlingFixFromSnippet(snippet: string, language: string): string {
    if (language === 'javascript' || language === 'typescript') {
      // Extract the operation from the snippet
      const operation = snippet.trim().replace(/;$/, '');
      
      return `// Fixed: Add proper error handling
try {
  ${operation}
} catch (error) {
  console.error('Operation failed:', error.message);
  
  // Handle specific error types
  if (error.code === 'ECONNREFUSED') {
    throw new Error('Service unavailable. Please try again later.');
  }
  
  if (error.name === 'ValidationError') {
    throw new Error(\`Invalid input: \${error.message}\`);
  }
  
  // Re-throw with context
  throw new Error(\`Operation failed: \${error.message}\`);
}`;
    }
    return snippet;
  }
  
  private generateCachingFix(snippet: string, language: string): string {
    if (language === 'javascript' || language === 'typescript') {
      return `// Fixed: Implement caching to prevent repeated fetches
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchDataWithCache(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const data = await fetchData(key);
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}`;
    }
    return snippet;
  }
  
  private generateOptimizedLoopFix(snippet: string, language: string): string {
    if (language === 'javascript' || language === 'typescript') {
      return `// Fixed: Optimized array operations
// Use single pass instead of multiple iterations
const result = items.reduce((acc, item) => {
  if (item.isValid) {
    acc.push(transformItem(item));
  }
  return acc;
}, []);

// Or use for...of for better performance with large arrays
const results = [];
for (const item of items) {
  if (item.isValid) {
    results.push(transformItem(item));
  }
}`;
    }
    return snippet;
  }
  
  private generateRaceConditionFix(snippet: string, language: string): string {
    if (language === 'javascript' || language === 'typescript') {
      return `// Fixed: Use locking mechanism to prevent race conditions
const locks = new Map();

async function safeOperation(key, value) {
  // Acquire lock
  while (locks.get(key)) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  locks.set(key, true);
  
  try {
    // Critical section
    storage[key] = value;
    await saveToDatabase(key, value);
  } finally {
    // Release lock
    locks.delete(key);
  }
}`;
    }
    return snippet;
  }
  
  private generateDataValidationFix(snippet: string, language: string): string {
    if (language === 'javascript' || language === 'typescript') {
      return `// Fixed: Validate API response data before processing
if (!response || typeof response !== 'object') {
  throw new Error('Invalid response format');
}

if (!response.data || !Array.isArray(response.data)) {
  throw new Error('Response data must be an array');
}

// Validate each item
const validatedData = response.data.filter(item => {
  return item && typeof item === 'object' && item.id && item.name;
});

if (validatedData.length === 0) {
  console.warn('No valid data items in response');
}

// Safe to process validated data
processData(validatedData);`;
    }
    return snippet;
  }
  
  private generateDefaultSafetyFix(snippet: string, language: string): string {
    if (language === 'javascript' || language === 'typescript') {
      const operation = snippet.trim().replace(/;$/, '');
      
      return `// Fixed: Add safety checks and error handling
// Validate inputs
if (!data || typeof data !== 'object') {
  throw new Error('Invalid data provided');
}

try {
  // Safely execute operation
  ${operation}
  
  // Log success for monitoring
  console.log('Operation completed successfully');
} catch (error) {
  console.error('Operation failed:', error);
  throw new Error(\`Failed to complete operation: \${error.message}\`);
}`;
    }
    return snippet;
  }

  private async mockAIFix(issue: Issue, language: string): Promise<string> {
    // For testing, provide simple fixes based on issue type
    if (issue.category === 'performance' && issue.title?.includes('Array Operation')) {
      return `function processData(items: any[]) {
  // Optimized: Combined operations in single pass
  return items
    .filter(item => item.active)
    .map(item => item.value)
    .sort((a, b) => a - b);
}`;
    }
    
    if (issue.category === 'code-quality' && issue.title?.includes('Magic Number')) {
      return `// Define constants for better maintainability
const RETRY_MULTIPLIER = 1000;
const BACKOFF_FACTOR = 2.5;

function calculateTimeout(retries: number) {
  return retries * RETRY_MULTIPLIER * BACKOFF_FACTOR;
}`;
    }
    
    // Default mock response
    return `// AI-generated fix for ${issue.title}
// This is a mock response for testing
${issue.codeSnippet || '// Original code here'}`;
  }

  /**
   * Build AI prompt from template and issue context
   */
  private buildAIPrompt(issue: Issue, language: string): string {
    if (!this.promptConfig) {
      throw new Error('Prompt config not loaded');
    }
    
    const template = this.promptConfig.prompt_template;
    const framework = this.detectFramework(issue.location?.file || '');
    
    return template
      .replace('{language}', language)
      .replace('{framework}', framework ? ` using ${framework}` : '')
      .replace('{issue_description}', issue.message || issue.title || '')
      .replace('{issue_category}', issue.category || 'code-quality')
      .replace('{issue_severity}', issue.severity || 'medium')
      .replace('{file_path}', issue.location?.file || 'unknown')
      .replace('{line_number}', String(issue.location?.line || 0))
      .replace('{current_code}', issue.codeSnippet || '// Code not available');
  }

  /**
   * Parse AI response to extract code
   */
  private parseAIResponse(response: string): string {
    // Extract code from markdown code blocks if present
    const codeBlockMatch = response.match(/```[\w]*\n([\s\S]*?)\n```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }
    
    // Otherwise return trimmed response
    return response.trim();
  }

  /**
   * Detect issue pattern for template matching
   */
  /**
   * Detect issue pattern for template matching
   * @deprecated Now handled by template-library.ts matchTemplate method
   */
  private detectIssuePattern(issue: Issue): string {
    const text = ((issue.title || '') + ' ' + (issue.message || '')).toLowerCase();
    
    // Legacy pattern detection - kept for backward compatibility
    if (text.includes('sql') && text.includes('injection')) return 'sql-injection';
    if (text.includes('xss') || text.includes('cross-site')) return 'xss-prevention';
    if (text.includes('validation') || text.includes('validate')) return 'input-validation';
    if (text.includes('null') || text.includes('undefined')) return 'null-check';
    if (text.includes('auth') || text.includes('unauthorized')) return 'auth-check';
    if (text.includes('error') && text.includes('handling')) return 'error-handling';
    
    return 'unknown';
  }

  /**
   * Group issues by file and language for batch processing
   */
  private groupIssuesByFileAndLanguage(issues: Issue[]): Map<string, Issue[]> {
    const grouped = new Map<string, Issue[]>();
    
    for (const issue of issues) {
      const file = issue.location?.file || 'unknown';
      const language = this.detectLanguage(file);
      const key = `${file}|${language}`;
      
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(issue);
    }
    
    return grouped;
  }

  /**
   * Detect programming language from file path
   */
  private detectLanguage(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    
    switch (ext) {
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'py':
        return 'python';
      case 'java':
        return 'java';
      case 'go':
        return 'go';
      case 'rb':
        return 'ruby';
      case 'php':
        return 'php';
      case 'cs':
        return 'csharp';
      case 'swift':
        return 'swift';
      case 'kt':
        return 'kotlin';
      case 'rs':
        return 'rust';
      case 'cpp':
      case 'cc':
      case 'cxx':
        return 'cpp';
      case 'c':
        return 'c';
      default:
        return 'javascript'; // default fallback
    }
  }

  /**
   * Detect framework from file path and patterns
   */
  private detectFramework(filePath: string): string | undefined {
    const lowerPath = filePath.toLowerCase();
    
    // React/Next.js
    if (lowerPath.endsWith('.tsx') || lowerPath.endsWith('.jsx')) return 'react';
    if (lowerPath.includes('next') || lowerPath.includes('pages/')) return 'nextjs';
    
    // Node.js frameworks
    if (lowerPath.includes('express')) return 'express';
    if (lowerPath.includes('fastify')) return 'fastify';
    if (lowerPath.includes('koa')) return 'koa';
    
    // Python frameworks
    if (lowerPath.includes('django')) return 'django';
    if (lowerPath.includes('flask')) return 'flask';
    if (lowerPath.includes('fastapi')) return 'fastapi';
    
    // Java frameworks
    if (lowerPath.includes('spring')) return 'spring';
    
    // Other frameworks
    if (lowerPath.includes('angular')) return 'angular';
    if (lowerPath.includes('vue')) return 'vue';
    if (lowerPath.includes('svelte')) return 'svelte';
    
    return undefined;
  }

  /**
   * Extract variable name from issue description
   */
  private extractVariableName(issue: Issue): string {
    const text = issue.message || issue.title || '';
    
    // Look for patterns like "variable 'xyz'", "parameter xyz", "input xyz"
    const patterns = [
      /(?:variable|parameter|input|field|property)\s+['"`]?(\w+)['"`]?/i,
      /['"`](\w+)['"`]\s+(?:is|was|should|must|needs)/i,
      /\b(\w+)\s+(?:is not validated|lacks validation|missing validation)/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    // Fallback to generic name
    return 'input';
  }

  /**
   * Estimate time to fix based on issue type
   */
  private estimateFixTime(pattern: string): number {
    const estimates: Record<string, number> = {
      'missing-validation': 5,
      'null-check': 5,
      'missing-error-handling': 10,
      'sql-injection': 15,
      'hardcoded-values': 15,
      'complex': 30,
      'unknown': 20
    };
    
    return estimates[pattern] || 20;
  }

  /**
   * Mock LLM request for development purposes
   */
  private async mockLLMRequest(params: any): Promise<string> {
    // TODO: Replace with actual LLM integration
    return `// Mock fix suggestion for the reported issue
// Please implement proper error handling and validation
// This is a placeholder response for development purposes`;
  }
}