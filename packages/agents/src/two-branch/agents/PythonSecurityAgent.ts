/**
 * Python Security Agent
 * Implements security and code quality analysis for Python projects
 */

import { BaseSecurityAgent } from './BaseSecurityAgent';
import { FileInfo, SecurityIssue } from '../interfaces/agent-interfaces';
import { execSync } from 'child_process';
import * as path from 'path';

interface PythonSecurityTool {
  name: string;
  command: string;
  available?: boolean;
  parseOutput: (output: string, files: FileInfo[]) => SecurityIssue[];
}

export class PythonSecurityAgent extends BaseSecurityAgent {
  private tools: PythonSecurityTool[] = [
    {
      name: 'safety',
      command: 'safety check --json',
      parseOutput: this.parseSafetyOutput.bind(this)
    },
    {
      name: 'bandit',
      command: 'bandit -r . -f json',
      parseOutput: this.parseBanditOutput.bind(this)
    },
    {
      name: 'mypy',
      command: 'mypy . --json-report mypy-report',
      parseOutput: this.parseMypyOutput.bind(this)
    },
    {
      name: 'ruff',
      command: 'ruff check . --output-format json',
      parseOutput: this.parseRuffOutput.bind(this)
    },
    {
      name: 'pylint',
      command: 'pylint **/*.py --output-format=json',
      parseOutput: this.parsePylintOutput.bind(this)
    }
  ];

  constructor(monitoring?: any) {
    super('PythonSecurityAgent', monitoring);
    this.checkToolAvailability();
  }

  /**
   * Check which tools are available
   */
  private checkToolAvailability(): void {
    this.tools.forEach(tool => {
      try {
        execSync(`which ${tool.name}`, { stdio: 'ignore' });
        tool.available = true;
      } catch {
        tool.available = false;
      }
    });
  }

  /**
   * Get list of available tools for reporting
   */
  protected async getAvailableTools(): Promise<string[]> {
    return this.tools.filter(t => t.available).map(t => t.name);
  }

  /**
   * Analyze Python files for security issues
   */
  async analyzeBranch(branch: string, files: FileInfo[]): Promise<SecurityIssue[]> {
    const pythonFiles = files.filter(f => 
      f.path.endsWith('.py') || 
      f.path.endsWith('.pyw')
    );

    if (pythonFiles.length === 0) {
      return [];
    }

    const issues: SecurityIssue[] = [];

    // Run available tools
    for (const tool of this.tools) {
      if (!tool.available) {
        console.log(`   Tool ${tool.name} not available, skipping...`);
        continue;
      }

      try {
        console.log(`   Running ${tool.name}...`);
        const output = await this.executeTool(tool.command, pythonFiles);
        const toolIssues = tool.parseOutput(output, pythonFiles);
        issues.push(...toolIssues);
        console.log(`   ${tool.name} found ${toolIssues.length} issues`);
      } catch (error) {
        console.error(`   Error running ${tool.name}:`, error.message);
      }
    }

    // Add Python-specific security checks
    issues.push(...this.performPythonSpecificChecks(pythonFiles));

    return this.deduplicateIssues(issues);
  }

  /**
   * Execute tool command (override for real execution)
   */
  protected async executeTool(command: string, files: FileInfo[]): Promise<string> {
    console.log(`   PythonSecurityAgent executing: ${command}`);
    // For testing, return mock data for available tools
    if (command.includes('safety')) {
      console.log(`   Returning mock Safety data`);
      return this.getMockSafetyData();
    }
    if (command.includes('bandit')) {
      console.log(`   Returning mock Bandit data`);
      return this.getMockBanditData();
    }
    if (command.includes('mypy')) {
      console.log(`   Returning mock Mypy data`);
      return this.getMockMypyData();
    }
    console.log(`   No mock data for command: ${command}`);
    return '{}';
  }

  /**
   * Parse Safety output
   */
  private parseSafetyOutput(output: string, files: FileInfo[]): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    
    try {
      const safetyData = JSON.parse(output);
      
      safetyData.vulnerabilities?.forEach((vuln: any) => {
        issues.push({
          id: `safety-${vuln.package}-${vuln.vulnerability_id}`,
          type: 'security',
          severity: this.mapSafetySeverity(vuln.severity),
          title: `Vulnerable dependency: ${vuln.package}`,
          description: vuln.description || `${vuln.package} ${vuln.installed_version} has known vulnerabilities`,
          file: 'requirements.txt',
          tool: 'safety',
          branch: '',
          confidence: 1.0,
          cwe: vuln.cve
        });
      });
    } catch (error) {
      console.error('Error parsing Safety output:', error);
    }
    
    return issues;
  }

  /**
   * Parse Bandit output
   */
  private parseBanditOutput(output: string, files: FileInfo[]): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    
    try {
      const banditData = JSON.parse(output);
      
      banditData.results?.forEach((result: any) => {
        issues.push({
          id: `bandit-${result.test_id}-${result.filename}-${result.line_number}`,
          type: 'security',
          severity: this.mapBanditSeverity(result.issue_severity),
          title: result.test_name,
          description: result.issue_text,
          file: result.filename,
          line: result.line_number,
          column: result.col_offset,
          tool: 'bandit',
          branch: '',
          confidence: this.mapBanditConfidence(result.issue_confidence),
          cwe: this.mapBanditToCWE(result.test_id)
        });
      });
    } catch (error) {
      console.error('Error parsing Bandit output:', error);
    }
    
    return issues;
  }

  /**
   * Parse Mypy output
   */
  private parseMypyOutput(output: string, files: FileInfo[]): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    
    try {
      // Mypy creates a report directory, we'd read from there
      const mypyData = JSON.parse(output);
      
      Object.entries(mypyData.files || {}).forEach(([file, fileData]: [string, any]) => {
        fileData.errors?.forEach((error: any) => {
          issues.push({
            id: `mypy-${file}-${error.line}-${error.column}`,
            type: 'code-quality',
            severity: this.mapMypySeverity(error.severity),
            title: 'Type Error',
            description: error.message,
            file: file,
            line: error.line,
            column: error.column,
            tool: 'mypy',
            branch: '',
            confidence: 0.95
          });
        });
      });
    } catch (error) {
      console.error('Error parsing Mypy output:', error);
    }
    
    return issues;
  }

  /**
   * Parse Ruff output
   */
  private parseRuffOutput(output: string, files: FileInfo[]): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    
    try {
      const ruffData = JSON.parse(output);
      
      ruffData.forEach((issue: any) => {
        issues.push({
          id: `ruff-${issue.filename}-${issue.location.row}-${issue.code}`,
          type: this.isSecurityRule(issue.code) ? 'security' : 'code-quality',
          severity: 'medium',
          title: issue.code,
          description: issue.message,
          file: issue.filename,
          line: issue.location.row,
          column: issue.location.column,
          tool: 'ruff',
          branch: '',
          confidence: 0.9
        });
      });
    } catch (error) {
      console.error('Error parsing Ruff output:', error);
    }
    
    return issues;
  }

  /**
   * Parse Pylint output
   */
  private parsePylintOutput(output: string, files: FileInfo[]): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    
    try {
      const pylintData = JSON.parse(output);
      
      pylintData.forEach((issue: any) => {
        if (this.isPylintSecurityRelevant(issue.symbol)) {
          issues.push({
            id: `pylint-${issue.path}-${issue.line}-${issue.symbol}`,
            type: this.getPylintIssueType(issue.symbol),
            severity: this.mapPylintSeverity(issue.type),
            title: issue.symbol,
            description: issue.message,
            file: issue.path,
            line: issue.line,
            column: issue.column,
            tool: 'pylint',
            branch: '',
            confidence: 0.85
          });
        }
      });
    } catch (error) {
      console.error('Error parsing Pylint output:', error);
    }
    
    return issues;
  }

  /**
   * Perform Python-specific security checks
   */
  private performPythonSpecificChecks(files: FileInfo[]): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    
    files.forEach(file => {
      const content = file.content || '';
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        // Check for hardcoded secrets
        if (this.detectHardcodedSecrets(line)) {
          issues.push({
            id: `python-secret-${file.path}-${index + 1}`,
            type: 'security',
            severity: 'critical',
            title: 'Potential Hardcoded Secret',
            description: 'Possible hardcoded API key or password detected',
            file: file.path,
            line: index + 1,
            tool: 'python-security-agent',
            branch: file.branch || '',
            confidence: 0.8,
            cwe: 'CWE-798'
          });
        }
        
        // Check for SQL injection
        if (this.detectSQLInjection(line)) {
          issues.push({
            id: `python-sqli-${file.path}-${index + 1}`,
            type: 'security',
            severity: 'high',
            title: 'Potential SQL Injection',
            description: 'Unsafe SQL query construction detected',
            file: file.path,
            line: index + 1,
            tool: 'python-security-agent',
            branch: file.branch || '',
            confidence: 0.85,
            cwe: 'CWE-89'
          });
        }
        
        // Check for command injection
        if (this.detectCommandInjection(line)) {
          issues.push({
            id: `python-cmdi-${file.path}-${index + 1}`,
            type: 'security',
            severity: 'critical',
            title: 'Potential Command Injection',
            description: 'Unsafe use of system commands',
            file: file.path,
            line: index + 1,
            tool: 'python-security-agent',
            branch: file.branch || '',
            confidence: 0.9,
            cwe: 'CWE-78'
          });
        }
        
        // Check for insecure deserialization
        if (this.detectInsecureDeserialization(line)) {
          issues.push({
            id: `python-deser-${file.path}-${index + 1}`,
            type: 'security',
            severity: 'high',
            title: 'Insecure Deserialization',
            description: 'Unsafe use of pickle or eval',
            file: file.path,
            line: index + 1,
            tool: 'python-security-agent',
            branch: file.branch || '',
            confidence: 0.95,
            cwe: 'CWE-502'
          });
        }
      });
    });
    
    return issues;
  }

  // Detection methods
  private detectHardcodedSecrets(line: string): boolean {
    const patterns = [
      /api[_-]?key\s*=\s*["'][^"']+["']/i,
      /secret\s*=\s*["'][^"']+["']/i,
      /password\s*=\s*["'][^"']+["']/i,
      /token\s*=\s*["'][^"']+["']/i,
      /aws[_-]?access[_-]?key/i
    ];
    
    return patterns.some(pattern => pattern.test(line));
  }

  private detectSQLInjection(line: string): boolean {
    const patterns = [
      /execute\s*\(\s*["'].*%s/,
      /execute\s*\(\s*f["']/,
      /cursor\.execute\s*\(.*\+/,
      /["']SELECT.*["']\s*\+/i,
      /f["']SELECT.*\{/i
    ];
    
    return patterns.some(pattern => pattern.test(line));
  }

  private detectCommandInjection(line: string): boolean {
    const patterns = [
      /os\.system\s*\(/,
      /subprocess\.call\s*\(.*shell\s*=\s*True/,
      /subprocess\.Popen\s*\(.*shell\s*=\s*True/,
      /eval\s*\(/,
      /exec\s*\(/
    ];
    
    return patterns.some(pattern => pattern.test(line));
  }

  private detectInsecureDeserialization(line: string): boolean {
    const patterns = [
      /pickle\.loads?\s*\(/,
      /yaml\.load\s*\(/,
      /eval\s*\(/,
      /exec\s*\(/,
      /marshal\.loads?\s*\(/
    ];
    
    return patterns.some(pattern => pattern.test(line));
  }

  // Helper methods
  private mapSafetySeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'critical';
      case 'high': return 'high';
      case 'medium': return 'medium';
      default: return 'low';
    }
  }

  private mapBanditSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' {
    switch (severity?.toUpperCase()) {
      case 'HIGH': return 'high';
      case 'MEDIUM': return 'medium';
      case 'LOW': return 'low';
      default: return 'low';
    }
  }

  private mapBanditConfidence(confidence: string): number {
    switch (confidence?.toUpperCase()) {
      case 'HIGH': return 0.95;
      case 'MEDIUM': return 0.75;
      case 'LOW': return 0.5;
      default: return 0.5;
    }
  }

  private mapBanditToCWE(testId: string): string | undefined {
    const cweMap: Record<string, string> = {
      'B201': 'CWE-78',  // Flask debug
      'B301': 'CWE-502', // Pickle
      'B302': 'CWE-502', // Marshal
      'B303': 'CWE-676', // MD5
      'B304': 'CWE-327', // DES
      'B305': 'CWE-327', // Cipher
      'B306': 'CWE-502', // mktemp
      'B307': 'CWE-78',  // eval
      'B308': 'CWE-22',  // mark_safe
      'B309': 'CWE-79',  // HTTPSConnection
      'B310': 'CWE-319', // urllib
      'B311': 'CWE-330', // Random
      'B312': 'CWE-377', // telnetlib
      'B313': 'CWE-89',  // xml
      'B314': 'CWE-611', // xml
      'B315': 'CWE-611', // xml
      'B316': 'CWE-611', // xml
      'B317': 'CWE-611', // xml
      'B318': 'CWE-611', // xml
      'B319': 'CWE-611', // xml
      'B320': 'CWE-611', // xml
      'B321': 'CWE-319', // ftplib
      'B322': 'CWE-78',  // input
      'B323': 'CWE-319', // ssl
      'B324': 'CWE-327', // hashlib
      'B325': 'CWE-377', // tempnam
      'B401': 'CWE-94',  // import_telnetlib
      'B402': 'CWE-94',  // import_ftplib
      'B403': 'CWE-502', // import_pickle
      'B404': 'CWE-78',  // import_subprocess
      'B405': 'CWE-611', // import_xml
      'B406': 'CWE-611', // import_xml
      'B407': 'CWE-611', // import_xml
      'B408': 'CWE-611', // import_xml
      'B409': 'CWE-611', // import_xml
      'B410': 'CWE-611', // import_xml
      'B411': 'CWE-611', // import_xmlrpc
      'B412': 'CWE-319', // import_httpoxy
      'B413': 'CWE-327', // import_pycrypto
      'B414': 'CWE-327', // import_pycryptodome
      'B501': 'CWE-295', // request_with_no_cert_validation
      'B502': 'CWE-327', // ssl_with_bad_version
      'B503': 'CWE-327', // ssl_with_bad_defaults
      'B504': 'CWE-295', // ssl_with_no_version
      'B505': 'CWE-327', // weak_cryptographic_key
      'B506': 'CWE-502', // yaml_load
      'B507': 'CWE-295', // ssh_no_host_key_verification
      'B601': 'CWE-78',  // paramiko_calls
      'B602': 'CWE-78',  // subprocess_popen_with_shell_equals_true
      'B603': 'CWE-78',  // subprocess_without_shell_equals_true
      'B604': 'CWE-78',  // any_other_function_with_shell_equals_true
      'B605': 'CWE-78',  // start_process_with_a_shell
      'B606': 'CWE-78',  // start_process_with_no_shell
      'B607': 'CWE-78',  // start_process_with_partial_path
      'B608': 'CWE-89',  // hardcoded_sql_expressions
      'B609': 'CWE-78',  // linux_commands_wildcard_injection
      'B610': 'CWE-89',  // django_extra_used
      'B611': 'CWE-89',  // django_rawsql_used
      'B701': 'CWE-697', // jinja2_autoescape_false
      'B702': 'CWE-94',  // use_of_mako_templates
      'B703': 'CWE-89'   // django_mark_safe
    };
    return cweMap[testId];
  }

  private mapMypySeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' {
    return severity === 'error' ? 'high' : 'medium';
  }

  private isSecurityRule(code: string): boolean {
    const securityCodes = ['S', 'B', 'DUO'];
    return securityCodes.some(prefix => code.startsWith(prefix));
  }

  private isPylintSecurityRelevant(symbol: string): boolean {
    const relevantSymbols = [
      'eval-used', 'exec-used', 'bad-open-mode',
      'unspecified-encoding', 'subprocess-run-check',
      'consider-using-with', 'unnecessary-pass'
    ];
    return relevantSymbols.includes(symbol);
  }

  private getPylintIssueType(symbol: string): 'security' | 'code-quality' {
    const securitySymbols = ['eval-used', 'exec-used', 'subprocess-run-check'];
    return securitySymbols.includes(symbol) ? 'security' : 'code-quality';
  }

  private mapPylintSeverity(type: string): 'critical' | 'high' | 'medium' | 'low' {
    switch (type) {
      case 'error': return 'high';
      case 'warning': return 'medium';
      case 'convention': return 'low';
      default: return 'low';
    }
  }

  // Mock data methods for testing
  private getMockSafetyData(): string {
    return JSON.stringify({
      vulnerabilities: [
        {
          package: 'django',
          installed_version: '2.2.0',
          vulnerability_id: 'CVE-2021-12345',
          severity: 'high',
          description: 'SQL injection vulnerability in Django ORM'
        }
      ]
    });
  }

  private getMockBanditData(): string {
    return JSON.stringify({
      results: [
        {
          test_id: 'B608',
          test_name: 'hardcoded_sql_expressions',
          issue_severity: 'HIGH',
          issue_confidence: 'HIGH',
          issue_text: 'Possible SQL injection vector through string-based query construction',
          filename: 'app/database.py',
          line_number: 45,
          col_offset: 10
        },
        {
          test_id: 'B307',
          test_name: 'eval',
          issue_severity: 'HIGH',
          issue_confidence: 'HIGH',
          issue_text: 'Use of eval() detected',
          filename: 'app/utils.py',
          line_number: 23,
          col_offset: 5
        }
      ]
    });
  }

  private getMockMypyData(): string {
    return JSON.stringify({
      files: {
        'app/main.py': {
          errors: [
            {
              line: 10,
              column: 5,
              severity: 'error',
              message: 'Incompatible return value type (got "str", expected "int")'
            }
          ]
        }
      }
    });
  }
}