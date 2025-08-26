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
  private initializeTemplates() {
    // Validation templates for each language
    this.registerTemplate('missing-validation', {
      typescript: (ctx: IssueContext) => {
        const varName = this.extractVariableName(ctx.issue);
        return {
          code: `if (!${varName} || typeof ${varName} !== 'string') {
  throw new Error(\`Invalid ${varName}: expected non-empty string\`);
}`,
          explanation: `Add validation to ensure ${varName} is a valid string`
        };
      },
      
      python: (ctx: IssueContext) => {
        const varName = this.extractVariableName(ctx.issue);
        return {
          code: `if not ${varName} or not isinstance(${varName}, str):
    raise ValueError(f"Invalid ${varName}: expected non-empty string")`,
          explanation: `Add validation to ensure ${varName} is a valid string`
        };
      },
      
      java: (ctx: IssueContext) => {
        const varName = this.extractVariableName(ctx.issue);
        return {
          code: `if (${varName} == null || ${varName}.isEmpty()) {
    throw new IllegalArgumentException("Invalid ${varName}: expected non-empty string");
}`,
          explanation: `Add null and empty check for ${varName}`
        };
      },
      
      go: (ctx: IssueContext) => {
        const varName = this.extractVariableName(ctx.issue);
        return {
          code: `if ${varName} == "" {
    return fmt.Errorf("invalid ${varName}: expected non-empty string")
}`,
          explanation: `Add validation to ensure ${varName} is not empty`
        };
      },
      
      javascript: (ctx: IssueContext) => {
        const varName = this.extractVariableName(ctx.issue);
        return {
          code: `if (!${varName} || typeof ${varName} !== 'string') {
  throw new Error(\`Invalid ${varName}: expected non-empty string\`);
}`,
          explanation: `Add validation to ensure ${varName} is a valid string`
        };
      }
    });

    // Error handling templates
    this.registerTemplate('missing-error-handling', {
      typescript: (ctx: IssueContext) => ({
        code: `try {
  // ${ctx.issue.codeSnippet || 'Your code here'}
  const result = await operation();
  return result;
} catch (error) {
  console.error('Operation failed:', error);
  throw new Error(\`Operation failed: \${error.message}\`);
}`,
        explanation: 'Wrap async operations in try-catch block'
      }),
      
      python: (ctx: IssueContext) => ({
        code: `try:
    # ${ctx.issue.codeSnippet || 'Your code here'}
    result = operation()
    return result
except Exception as e:
    logger.error(f"Operation failed: {e}")
    raise OperationError(f"Operation failed: {str(e)}")`,
        explanation: 'Add exception handling for error recovery'
      }),
      
      java: (ctx: IssueContext) => ({
        code: `try {
    // ${ctx.issue.codeSnippet || 'Your code here'}
    Result result = operation();
    return result;
} catch (Exception e) {
    logger.error("Operation failed", e);
    throw new OperationException("Operation failed: " + e.getMessage(), e);
}`,
        explanation: 'Add try-catch block for exception handling'
      }),
      
      go: (ctx: IssueContext) => ({
        code: `result, err := operation()
if err != nil {
    log.Printf("Operation failed: %v", err)
    return nil, fmt.Errorf("operation failed: %w", err)
}
return result, nil`,
        explanation: 'Add proper error handling with error wrapping'
      }),
      
      javascript: (ctx: IssueContext) => ({
        code: `try {
  // ${ctx.issue.codeSnippet || 'Your code here'}
  const result = await operation();
  return result;
} catch (error) {
  console.error('Operation failed:', error);
  throw new Error(\`Operation failed: \${error.message}\`);
}`,
        explanation: 'Add try-catch for error handling'
      })
    });

    // SQL injection prevention templates
    this.registerTemplate('sql-injection', {
      typescript: (ctx: IssueContext) => ({
        code: `// Use parameterized queries
const query = 'SELECT * FROM users WHERE id = ? AND status = ?';
const params = [userId, userStatus];
const result = await db.query(query, params);`,
        explanation: 'Replace string concatenation with parameterized queries'
      }),
      
      python: (ctx: IssueContext) => ({
        code: `# Use parameterized queries
query = "SELECT * FROM users WHERE id = %s AND status = %s"
params = (user_id, user_status)
cursor.execute(query, params)
result = cursor.fetchall()`,
        explanation: 'Use parameterized queries to prevent SQL injection'
      }),
      
      java: (ctx: IssueContext) => ({
        code: `// Use PreparedStatement
String query = "SELECT * FROM users WHERE id = ? AND status = ?";
PreparedStatement pstmt = connection.prepareStatement(query);
pstmt.setInt(1, userId);
pstmt.setString(2, userStatus);
ResultSet rs = pstmt.executeQuery();`,
        explanation: 'Use PreparedStatement to prevent SQL injection'
      }),
      
      go: (ctx: IssueContext) => ({
        code: `// Use parameterized queries
query := "SELECT * FROM users WHERE id = $1 AND status = $2"
rows, err := db.Query(query, userId, userStatus)
if err != nil {
    return nil, err
}
defer rows.Close()`,
        explanation: 'Use parameterized queries with placeholders'
      }),
      
      javascript: (ctx: IssueContext) => ({
        code: `// Use parameterized queries (example with mysql2)
const query = 'SELECT * FROM users WHERE id = ? AND status = ?';
const [rows] = await connection.execute(query, [userId, userStatus]);`,
        explanation: 'Use parameterized queries instead of string concatenation'
      })
    });
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
    }
  ): Promise<FixSuggestion[]> {
    if (!this.promptConfig) {
      await this.loadPromptConfig();
    }

    const fixes: FixSuggestion[] = [];
    
    // Group issues by file and language for efficient processing
    const groupedIssues = this.groupIssuesByFileAndLanguage(issues);
    
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
    const pattern = this.detectIssuePattern(issue);
    
    // Skip template if it's a complex pattern
    if (pattern === 'unknown' || !issue.codeSnippet) {
      return null;
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
      
      // Generate fix based on pattern and context
      let fixedCode: string;
      let explanation: string;
      
      switch (pattern) {
        case 'missing-validation':
          fixedCode = this.generateValidationFix(extractedContext, language);
          explanation = `Added validation for ${extractedContext.primaryVariable || 'input'} to prevent invalid data`;
          break;
          
        case 'missing-error-handling':
          fixedCode = this.generateErrorHandlingFix(extractedContext, language);
          explanation = `Added proper error handling for ${extractedContext.methodName || 'operation'}`;
          break;
          
        case 'sql-injection':
          fixedCode = this.generateSqlInjectionFix(extractedContext, language);
          explanation = 'Replaced string concatenation with parameterized queries to prevent SQL injection';
          break;
          
        case 'null-check':
          fixedCode = this.generateNullCheckFix(extractedContext, language);
          explanation = `Added null/undefined check for ${extractedContext.primaryVariable || 'variable'}`;
          break;
          
        case 'hardcoded-values':
          fixedCode = this.generateConfigFix(extractedContext, language);
          explanation = 'Extracted hardcoded values to configuration';
          break;
          
        default:
          return null;
      }
      
      return {
        issueId: issue.id || `issue-${Date.now()}`,
        originalCode: issue.codeSnippet || '',
        fixedCode,
        explanation,
        confidence: extractedContext.primaryVariable ? 'high' : 'medium',
        estimatedMinutes: this.estimateFixTime(pattern),
        language,
        framework: this.detectFramework(issue.location?.file || '')
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
      // Select appropriate model for code generation
      // TODO: Implement proper model selection
      const modelConfig = { primary: { id: 'mock-model' } };
      
      // Build prompt from template
      const prompt = this.buildAIPrompt(issue, language);
      
      // Make AI request
      // TODO: Implement proper LLM request
      const response = await this.mockLLMRequest({
        model: modelConfig.primary?.id || 'mock-model',
        messages: [{
          role: 'user',
          content: prompt
        }],
        temperature: 0.3,
        max_tokens: 1000
      });
      
      const fixedCode = this.parseAIResponse(response);
      
      return {
        issueId: issue.id || `issue-${Date.now()}`,
        originalCode: issue.codeSnippet || '',
        fixedCode,
        explanation: `AI-generated fix for: ${issue.title || issue.message}`,
        confidence: 'medium',
        estimatedMinutes: this.estimateFixTime('complex'),
        language,
        framework: this.detectFramework(issue.location?.file || '')
      };
    } catch (error) {
      console.error('AI fix generation failed:', error);
      return null;
    }
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
  private detectIssuePattern(issue: Issue): string {
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
    if (text.includes('hardcoded') || text.includes('magic')) {
      return 'hardcoded-values';
    }
    
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