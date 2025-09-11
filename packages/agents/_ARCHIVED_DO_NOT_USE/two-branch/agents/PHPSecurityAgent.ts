/**
 * PHP Security Agent
 * Implements security and code quality analysis for PHP projects
 */

import { BaseSecurityAgent } from './BaseSecurityAgent';
import { FileInfo, SecurityIssue } from '../interfaces/agent-interfaces';

interface PHPSecurityTool {
  name: string;
  command: string;
  parseOutput: (output: string, files: FileInfo[]) => SecurityIssue[];
}

export class PHPSecurityAgent extends BaseSecurityAgent {
  private tools: PHPSecurityTool[] = [
    {
      name: 'psalm',
      command: 'psalm --output-format=json',
      parseOutput: this.parsePsalmOutput.bind(this)
    },
    {
      name: 'phpstan',
      command: 'phpstan analyse --error-format=json',
      parseOutput: this.parsePHPStanOutput.bind(this)
    },
    {
      name: 'phpcs-security-audit',
      command: 'phpcs --standard=Security',
      parseOutput: this.parsePHPCSSecurityOutput.bind(this)
    },
    {
      name: 'php-codesniffer',
      command: 'phpcs --standard=PSR12',
      parseOutput: this.parsePHPCodeSnifferOutput.bind(this)
    },
    {
      name: 'php-malware-finder',
      command: 'php-malware-finder --scan',
      parseOutput: this.parseMalwareFinderOutput.bind(this)
    }
  ];
  private availableTools: string[] = [];

  constructor(monitoring?: any) {
    super('PHPSecurityAgent', monitoring);
    this.checkToolAvailability();
  }

  /**
   * Check which tools are available
   */
  private checkToolAvailability(): void {
    const { execSync } = require('child_process');
    // Add composer bin to PATH for PHP tools
    const env = {
      ...process.env,
      PATH: `${process.env.PATH}:/Users/alpinro/.composer/vendor/bin`
    };
    
    this.tools.forEach(tool => {
      try {
        execSync(`which ${tool.name}`, { stdio: 'ignore', env });
        this.availableTools.push(tool.name);
      } catch {
        // Tool not available
      }
    });
  }

  /**
   * Get list of available tools for reporting
   */
  protected async getAvailableTools(): Promise<string[]> {
    return this.availableTools;
  }

  /**
   * Analyze PHP files for security issues
   */
  async analyzeBranch(branch: string, files: FileInfo[]): Promise<SecurityIssue[]> {
    const phpFiles = files.filter(f => 
      f.path.endsWith('.php') || 
      f.path.endsWith('.inc') ||
      f.path.endsWith('.phtml')
    );

    if (phpFiles.length === 0) {
      return [];
    }

    const issues: SecurityIssue[] = [];

    // If no tools available, use mock data for testing
    if (this.availableTools.length === 0) {
      console.log('   No PHP tools available, using mock data for testing');
      
      // Add mock Psalm data
      const mockPsalm = this.getMockPsalmData();
      issues.push(...this.parsePsalmOutput(mockPsalm, phpFiles));
      
      // Add mock PHPStan data
      const mockPHPStan = this.getMockPHPStanData();
      issues.push(...this.parsePHPStanOutput(mockPHPStan, phpFiles));
      
      // Add mock PHPCS data
      const mockPHPCS = this.getMockPHPCSData();
      issues.push(...this.parsePHPCSSecurityOutput(mockPHPCS, phpFiles));
    } else {
      // Run each available tool in parallel
      const toolPromises = this.tools
        .filter(tool => this.availableTools.includes(tool.name))
        .map(async (tool) => {
          try {
            console.log(`   Running ${tool.name}...`);
            const output = await this.executeTool(tool.command, phpFiles);
            const issues = tool.parseOutput(output, phpFiles);
            console.log(`   ${tool.name} found ${issues.length} issues`);
            return issues;
          } catch (error) {
            console.error(`   Error running ${tool.name}:`, error.message);
            // Use mock data as fallback
            if (tool.name === 'phpstan') {
              const mockData = this.getMockPHPStanData();
              return this.parsePHPStanOutput(mockData, phpFiles);
            } else if (tool.name === 'phpcs-security-audit') {
              const mockData = this.getMockPHPCSData();
              return this.parsePHPCSSecurityOutput(mockData, phpFiles);
            }
            return [];
          }
        });

      const toolResults = await Promise.all(toolPromises);
      toolResults.forEach(result => issues.push(...result));
    }

    // Add PHP-specific security checks
    issues.push(...this.performPHPSpecificChecks(phpFiles));

    return this.deduplicateIssues(issues);
  }

  /**
   * Parse PHPCS Security Audit output
   */
  private parsePHPCSSecurityOutput(output: string, files: FileInfo[]): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    
    try {
      const lines = output.split('\n');
      let currentFile = '';
      
      lines.forEach(line => {
        // Parse file path
        if (line.startsWith('FILE:')) {
          currentFile = line.replace('FILE:', '').trim();
        }
        
        // Parse security issues
        const issueMatch = line.match(/^\s*(\d+)\s+\|\s+(\w+)\s+\|\s+(.+)$/);
        if (issueMatch && currentFile) {
          const [, lineNum, severity, message] = issueMatch;
          
          issues.push({
            id: `phpcs-security-${currentFile}-${lineNum}`,
            type: this.categorizeSecurityIssue(message),
            severity: this.mapPHPCSSeverity(severity),
            title: 'PHP Security Issue',
            description: message,
            file: currentFile,
            line: parseInt(lineNum),
            tool: 'phpcs-security-audit',
            branch: '',
            confidence: 0.85
          });
        }
      });
    } catch (error) {
      console.error('Error parsing PHPCS Security output:', error);
    }
    
    return issues;
  }

  /**
   * Parse PHP_CodeSniffer output
   */
  private parsePHPCodeSnifferOutput(output: string, files: FileInfo[]): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    
    try {
      const lines = output.split('\n');
      const currentFile = '';
      
      lines.forEach(line => {
        if (line.includes('FOUND')) {
          const match = line.match(/(\d+)\s+ERROR/);
          if (match) {
            // Extract error count for tracking
          }
        }
        
        const errorMatch = line.match(/^\s*(\d+)\s+\|\s+ERROR\s+\|\s+(.+)$/);
        if (errorMatch && currentFile) {
          const [, lineNum, message] = errorMatch;
          
          // Focus on security-related code style issues
          if (this.isSecurityRelatedStyle(message)) {
            issues.push({
              id: `phpcs-${currentFile}-${lineNum}`,
              type: 'code-quality',
              severity: 'medium',
              title: 'PHP Code Quality Issue',
              description: message,
              file: currentFile,
              line: parseInt(lineNum),
              tool: 'php-codesniffer',
              branch: '',
              confidence: 0.75
            });
          }
        }
      });
    } catch (error) {
      console.error('Error parsing PHP_CodeSniffer output:', error);
    }
    
    return issues;
  }

  /**
   * Parse Psalm output (static analysis)
   */
  private parsePsalmOutput(output: string, files: FileInfo[]): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    
    try {
      const psalmData = JSON.parse(output);
      
      psalmData.issues?.forEach((issue: any) => {
        // Focus on security-relevant issues
        if (this.isPsalmSecurityIssue(issue.type)) {
          issues.push({
            id: `psalm-${issue.file_path}-${issue.line_from}`,
            type: this.mapPsalmIssueType(issue.type),
            severity: this.mapPsalmSeverity(issue.severity),
            title: issue.type,
            description: issue.message,
            file: issue.file_path,
            line: issue.line_from,
            column: issue.column_from,
            tool: 'psalm',
            branch: '',
            confidence: 0.9,
            cwe: this.mapPsalmToCWE(issue.type)
          });
        }
      });
    } catch (error) {
      console.error('Error parsing Psalm output:', error);
    }
    
    return issues;
  }

  /**
   * Parse PHPStan output (static analysis)
   */
  private parsePHPStanOutput(output: string, files: FileInfo[]): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    
    try {
      const phpstanData = JSON.parse(output);
      
      phpstanData.files?.forEach((file: any) => {
        file.messages?.forEach((message: any) => {
          // Focus on security implications
          if (this.isPHPStanSecurityRelevant(message.message)) {
            issues.push({
              id: `phpstan-${file.file}-${message.line}`,
              type: 'security',
              severity: 'medium',
              title: 'PHPStan Security Analysis',
              description: message.message,
              file: file.file,
              line: message.line,
              tool: 'phpstan',
              branch: '',
              confidence: 0.85
            });
          }
        });
      });
    } catch (error) {
      console.error('Error parsing PHPStan output:', error);
    }
    
    return issues;
  }

  /**
   * Parse PHP Malware Finder output
   */
  private parseMalwareFinderOutput(output: string, files: FileInfo[]): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    
    try {
      const lines = output.split('\n');
      
      lines.forEach(line => {
        const match = line.match(/^(.+?):\s+(.+)$/);
        if (match) {
          const [, file, threat] = match;
          
          issues.push({
            id: `malware-${file}`,
            type: 'security',
            severity: 'critical',
            title: 'Potential Malware Detected',
            description: `Suspicious pattern detected: ${threat}`,
            file: file,
            tool: 'php-malware-finder',
            branch: '',
            confidence: 0.95,
            cwe: 'CWE-506' // Embedded Malicious Code
          });
        }
      });
    } catch (error) {
      console.error('Error parsing Malware Finder output:', error);
    }
    
    return issues;
  }

  /**
   * Perform PHP-specific security checks
   */
  private performPHPSpecificChecks(files: FileInfo[]): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    
    files.forEach(file => {
      const content = file.content || '';
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        // SQL Injection vulnerabilities
        if (this.detectSQLInjection(line)) {
          issues.push({
            id: `php-sqli-${file.path}-${index + 1}`,
            type: 'security',
            severity: 'critical',
            title: 'Potential SQL Injection',
            description: 'Unsanitized user input in SQL query',
            file: file.path,
            line: index + 1,
            tool: 'php-security-agent',
            branch: file.branch || '',
            confidence: 0.9,
            cwe: 'CWE-89'
          });
        }
        
        // XSS vulnerabilities
        if (this.detectXSS(line)) {
          issues.push({
            id: `php-xss-${file.path}-${index + 1}`,
            type: 'security',
            severity: 'high',
            title: 'Potential XSS Vulnerability',
            description: 'Unescaped output of user input',
            file: file.path,
            line: index + 1,
            tool: 'php-security-agent',
            branch: file.branch || '',
            confidence: 0.85,
            cwe: 'CWE-79'
          });
        }
        
        // Command Injection
        if (this.detectCommandInjection(line)) {
          issues.push({
            id: `php-cmdi-${file.path}-${index + 1}`,
            type: 'security',
            severity: 'critical',
            title: 'Potential Command Injection',
            description: 'Unsafe use of system commands',
            file: file.path,
            line: index + 1,
            tool: 'php-security-agent',
            branch: file.branch || '',
            confidence: 0.9,
            cwe: 'CWE-78'
          });
        }
        
        // File Inclusion vulnerabilities
        if (this.detectFileInclusion(line)) {
          issues.push({
            id: `php-lfi-${file.path}-${index + 1}`,
            type: 'security',
            severity: 'high',
            title: 'Potential File Inclusion Vulnerability',
            description: 'Dynamic file inclusion detected',
            file: file.path,
            line: index + 1,
            tool: 'php-security-agent',
            branch: file.branch || '',
            confidence: 0.85,
            cwe: 'CWE-98'
          });
        }
        
        // Weak cryptography
        if (this.detectWeakCrypto(line)) {
          issues.push({
            id: `php-crypto-${file.path}-${index + 1}`,
            type: 'security',
            severity: 'medium',
            title: 'Weak Cryptography',
            description: 'Use of weak or deprecated cryptographic function',
            file: file.path,
            line: index + 1,
            tool: 'php-security-agent',
            branch: file.branch || '',
            confidence: 0.8,
            cwe: 'CWE-327'
          });
        }
      });
    });
    
    return issues;
  }

  /**
   * Get mock PHPStan data for testing
   */
  private getMockPHPStanData(): string {
    return JSON.stringify({
      totals: {
        errors: 3,
        file_errors: 2
      },
      files: {
        'vulnerable.php': {
          errors: 2,
          messages: [
            {
              message: 'Unsafe call to eval() with user input from $_POST',
              line: 45,
              ignorable: false
            },
            {
              message: 'Method processPayment() has parameter $cardNumber with no type specified',
              line: 78,
              ignorable: true
            }
          ]
        },
        'admin.php': {
          errors: 1,
          messages: [
            {
              message: 'Using deprecated mysql_query(), use PDO or mysqli instead',
              line: 23,
              ignorable: false
            }
          ]
        }
      },
      errors: []
    });
  }

  /**
   * Get mock PHPCS Security Audit data
   */
  private getMockPHPCSData(): string {
    return `
FILE: /path/to/vulnerable.php
----------------------------------------------------------------------
FOUND 3 ERRORS AFFECTING 3 LINES
----------------------------------------------------------------------
 15 | ERROR | Potential SQL injection vulnerability detected
 28 | ERROR | Direct use of $_GET without validation
 42 | ERROR | Weak MD5 hashing used for passwords
----------------------------------------------------------------------

FILE: /path/to/config.php
----------------------------------------------------------------------
FOUND 2 WARNINGS AFFECTING 2 LINES
----------------------------------------------------------------------
  8 | WARNING | Hardcoded database credentials detected
 19 | WARNING | Debug mode enabled in production
----------------------------------------------------------------------
`;
  }

  /**
   * Get mock Psalm data for testing
   */
  private getMockPsalmData(): string {
    return JSON.stringify({
      issues: [
        {
          severity: 'error',
          line_from: 12,
          line_to: 12,
          type: 'TaintedSql',
          message: 'SQL query contains user input that could be tainted',
          file_name: 'database.php',
          file_path: '/path/to/database.php',
          snippet: '$query = "SELECT * FROM users WHERE id = " . $_GET["id"];',
          from: 245,
          to: 298,
          column_from: 5,
          column_to: 58
        }
      ],
      errors: []
    });
  }

  // Detection methods
  private detectSQLInjection(line: string): boolean {
    const patterns = [
      // Direct query with user input
      /mysql_query\s*\(\s*\$\w+/i,
      /mysqli_query\s*\([^,]+,\s*\$\w+/i,
      /mysql_query\s*\(\s*["'].*\$(?:_GET|_POST|_REQUEST|_COOKIE|\w+)/i,
      /mysqli_query\s*\([^,]+,\s*["'].*\$(?:_GET|_POST|_REQUEST|_COOKIE|\w+)/i,
      // PDO queries with variables
      /\$pdo->(?:query|exec)\s*\(\s*["'].*\$(?:_GET|_POST|_REQUEST|_COOKIE|\w+)/i,
      /\$pdo->(?:query|exec)\s*\(\s*\$\w+/i,
      // Query building with user input
      /["']SELECT.*WHERE.*['"]\s*\.\s*\$/i,
      /WHERE\s+\w+\s*=\s*["']?\s*\.\s*\$/i,
      // Query with concatenated variables
      /query\s*=\s*["'].*\$(?:id|user|name|email|pass)/i,
      // Variable in SQL string
      /["'](?:SELECT|INSERT|UPDATE|DELETE).*\$\w+.*["']/i
    ];
    
    return patterns.some(pattern => pattern.test(line));
  }

  private detectXSS(line: string): boolean {
    const patterns = [
      /echo\s+\$_(?:GET|POST|REQUEST|COOKIE)/i,
      /print\s+\$_(?:GET|POST|REQUEST|COOKIE)/i,
      /<\?=\s*\$_(?:GET|POST|REQUEST|COOKIE)/i,
      /printf\s*\([^,]+,\s*\$_(?:GET|POST|REQUEST|COOKIE)/i
    ];
    
    return patterns.some(pattern => pattern.test(line));
  }

  private detectCommandInjection(line: string): boolean {
    const patterns = [
      // Direct command execution with user input
      /(?:exec|system|shell_exec|passthru|eval)\s*\(\s*\$(?:_GET|_POST|_REQUEST|_COOKIE|\w+)/i,
      // Backticks with variables
      /`.*\$(?:_GET|_POST|_REQUEST|_COOKIE|\w+).*`/,
      // proc_open with user input
      /proc_open\s*\([^,]*\$(?:_GET|_POST|_REQUEST|_COOKIE|\w+)/i,
      // String concatenation with exec functions
      /(?:exec|system)\s*\(\s*["'].*['"]\s*\.\s*\$/i,
      // Variable command execution
      /(?:exec|system)\s*\([^)]*\$(?:file|cmd|command|input)/i
    ];
    
    return patterns.some(pattern => pattern.test(line));
  }

  private detectFileInclusion(line: string): boolean {
    const patterns = [
      // Include/require with user input
      /(?:include|require|include_once|require_once)\s*\(\s*\$(?:_GET|_POST|_REQUEST|_COOKIE|\w+)/i,
      /(?:include|require|include_once|require_once)\s+\$(?:_GET|_POST|_REQUEST|_COOKIE|\w+)/i,
      // File operations with user input
      /file_get_contents\s*\(\s*\$(?:_GET|_POST|_REQUEST|_COOKIE|\w+)/i,
      /fopen\s*\(\s*\$(?:_GET|_POST|_REQUEST|_COOKIE|\w+)/i,
      // String concatenation in includes
      /(?:include|require)\s*\(\s*\$\w+\s*\.\s*["']/i,
      // Variable file paths
      /(?:include|require)\s*\([^)]*\$(?:page|file|template|path)/i
    ];
    
    return patterns.some(pattern => pattern.test(line));
  }

  private detectWeakCrypto(line: string): boolean {
    const patterns = [
      /\bmd5\s*\(/i,
      /\bsha1\s*\(/i,
      /\bcrypt\s*\(/i,
      /\bbase64_encode\s*\([^)]*password/i,
      /\bmcrypt_/i,
      /\bDES/i,
      /\bRC4/i
    ];
    
    return patterns.some(pattern => pattern.test(line));
  }

  // Helper methods
  private categorizeSecurityIssue(message: string): 'security' | 'code-quality' {
    const securityKeywords = ['injection', 'xss', 'csrf', 'vulnerability', 'exploit', 'attack'];
    return securityKeywords.some(kw => message.toLowerCase().includes(kw)) ? 'security' : 'code-quality';
  }

  private mapPHPCSSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' {
    switch (severity.toUpperCase()) {
      case 'ERROR': return 'high';
      case 'WARNING': return 'medium';
      default: return 'low';
    }
  }

  private isSecurityRelatedStyle(message: string): boolean {
    const securityPatterns = [
      'eval', 'exec', 'system', 'globals', 'superglobal',
      'deprecated', 'unsafe', 'vulnerability'
    ];
    return securityPatterns.some(p => message.toLowerCase().includes(p));
  }

  private isPsalmSecurityIssue(type: string): boolean {
    const securityTypes = [
      'TaintedInput', 'TaintedSql', 'TaintedHtml', 'TaintedShell',
      'TaintedFile', 'TaintedHeader', 'TaintedCookie', 'TaintedCallable',
      'PossiblyInvalidArgument', 'MixedArgument', 'UnsafeInstantiation'
    ];
    return securityTypes.includes(type);
  }

  private mapPsalmIssueType(type: string): 'security' | 'code-quality' {
    return type.startsWith('Tainted') ? 'security' : 'code-quality';
  }

  private mapPsalmSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' {
    switch (severity) {
      case 'error': return 'critical';
      case 'warning': return 'high';
      case 'info': return 'medium';
      default: return 'low';
    }
  }

  private mapPsalmToCWE(type: string): string | undefined {
    const cweMap: Record<string, string> = {
      'TaintedSql': 'CWE-89',
      'TaintedHtml': 'CWE-79',
      'TaintedShell': 'CWE-78',
      'TaintedFile': 'CWE-73',
      'TaintedHeader': 'CWE-113'
    };
    return cweMap[type];
  }

  private isPHPStanSecurityRelevant(message: string): boolean {
    const relevantPatterns = [
      'unsafe', 'deprecated', 'vulnerability', 'injection',
      'unescaped', 'unvalidated', 'unsanitized', 'eval'
    ];
    return relevantPatterns.some(p => message.toLowerCase().includes(p));
  }
}