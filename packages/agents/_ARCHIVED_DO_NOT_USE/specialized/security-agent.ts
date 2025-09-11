/**
 * Security Agent
 * Specialized agent for security issue analysis
 */

import { BaseAgent } from '../base/base-agent';
import { AnalysisResult } from '../agent';
import { AgentCapability } from '../types/agent-types';

export interface SecurityContext {
  repositoryPath: string;
  branchName: string;
  files: string[];
  language?: string;  // Language detected by orchestrator
  languageTools?: string[];  // Language-specific security tools from orchestrator
  vulnerabilityDatabase?: any;
  cweMapping?: Map<string, string>;
  owaspTop10?: string[];
  toolResults?: any;
}

export interface SecurityVulnerability {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  cwe?: string;
  owasp?: string;
  location?: {
    file: string;
    line?: number;
    column?: number;
  };
  evidence?: any;
  remediation?: string;
}

export class SecurityAgent extends BaseAgent {
  agentName = 'Security Specialist';
  capabilities: string[] = [];
  private currentLanguage?: string;
  private languageSpecificTools?: string[];
  private repoSize: 'small' | 'medium' | 'large' = 'medium';

  constructor(config?: any) {
    super(config);
  }

  configureForLanguage(language: string, tools: string[]): void {
    this.currentLanguage = language;
    this.languageSpecificTools = tools;
    
    // Update capabilities based on language
    this.updateCapabilitiesForLanguage(language, tools);
  }

  setRepositorySize(size: 'small' | 'medium' | 'large'): void {
    this.repoSize = size;
  }

  private generateRolePrompt(language: string, repoSize: 'small' | 'medium' | 'large'): string {
    const basePrompt = `You are an expert security analyst specializing in ${language} code security assessment.

CONTEXT:
- Language: ${language}
- Repository Size: ${repoSize}
- Available Tools: ${this.languageSpecificTools?.join(', ') || 'semgrep'}`;

    const expertiseAreas = `
EXPERTISE AREAS:
- Vulnerability Detection (OWASP Top 10, CWE)
- Authentication & Authorization Issues
- Injection Vulnerabilities (SQL, Command, XSS)
- Cryptographic Weaknesses
- Dependency Vulnerabilities
- Security Best Practices for ${language}`;

    const sizeApproach = this.getSizeSpecificApproach(repoSize);
    const languageSpecifics = this.getLanguageSpecificFocus(language);
    
    const outputRequirements = `
OUTPUT REQUIREMENTS:
- Categorize by severity (Critical/High/Medium/Low)
- Provide CWE/CVE references where applicable
- Include remediation steps with code examples
- Prioritize based on exploitability and impact`;

    return `${basePrompt}\n${expertiseAreas}\n\nANALYSIS APPROACH:\n${sizeApproach}\n\n${languageSpecifics}\n${outputRequirements}`;
  }

  private getSizeSpecificApproach(size: 'small' | 'medium' | 'large'): string {
    const approaches = {
      small: `- Perform exhaustive security analysis
- Check every endpoint and data flow
- Detailed review of authentication logic
- Complete dependency vulnerability scan`,
      medium: `- Focus on critical paths and entry points
- Sample-based analysis for common patterns
- Priority on public-facing components
- Targeted dependency checks`,
      large: `- Risk-based sampling approach
- Focus on recent changes and high-risk areas
- Automated tool results interpretation
- Architecture-level security assessment`
    };
    return approaches[size];
  }

  private getLanguageSpecificFocus(language: string): string {
    const languageFocus: Record<string, string> = {
      javascript: `LANGUAGE-SPECIFIC FOCUS:
- XSS vulnerabilities in React/Vue/Angular
- Prototype pollution
- npm package vulnerabilities
- JWT implementation issues
- CORS misconfigurations`,
      typescript: `LANGUAGE-SPECIFIC FOCUS:
- Type safety violations that lead to vulnerabilities
- XSS in React/Vue/Angular with TypeScript
- npm package vulnerabilities
- JWT and authentication patterns
- Type assertions bypassing security`,
      python: `LANGUAGE-SPECIFIC FOCUS:
- Django/Flask security middlewares
- Pickle deserialization
- YAML parsing vulnerabilities
- SQL injection in ORMs
- Command injection in subprocess`,
      java: `LANGUAGE-SPECIFIC FOCUS:
- Spring Security configurations
- Deserialization vulnerabilities
- XXE in XML parsers
- JNDI injection
- Struts vulnerabilities`,
      go: `LANGUAGE-SPECIFIC FOCUS:
- SQL injection in database/sql
- Path traversal vulnerabilities
- Race conditions in goroutines
- Insecure random number generation
- TLS/SSL configuration issues`,
      ruby: `LANGUAGE-SPECIFIC FOCUS:
- Rails security configurations
- Mass assignment vulnerabilities
- Command injection risks
- YAML deserialization
- SQL injection in ActiveRecord`,
      php: `LANGUAGE-SPECIFIC FOCUS:
- SQL injection vulnerabilities
- Remote code execution
- File inclusion vulnerabilities
- Session management issues
- XSS in templating engines`,
      csharp: `LANGUAGE-SPECIFIC FOCUS:
- .NET security configurations
- SQL injection in Entity Framework
- XXE in XML processing
- Deserialization vulnerabilities
- LDAP injection`,
      rust: `LANGUAGE-SPECIFIC FOCUS:
- Unsafe code blocks
- Memory safety violations
- Race conditions
- Integer overflow/underflow
- Cryptographic implementation issues`,
      cpp: `LANGUAGE-SPECIFIC FOCUS:
- Buffer overflow vulnerabilities
- Use-after-free bugs
- Integer overflow/underflow
- Format string vulnerabilities
- Memory leaks and corruption`,
      c: `LANGUAGE-SPECIFIC FOCUS:
- Buffer overflow vulnerabilities
- String handling issues
- Integer overflow/underflow
- Race conditions
- Memory management bugs`,
      swift: `LANGUAGE-SPECIFIC FOCUS:
- Keychain security issues
- URL scheme vulnerabilities
- Certificate pinning bypass
- Insecure data storage
- Memory management in Objective-C interop`,
      kotlin: `LANGUAGE-SPECIFIC FOCUS:
- Android security issues
- Insecure data storage
- SQL injection in Room/SQLite
- Improper platform permissions
- Cryptographic implementation`,
      objectivec: `LANGUAGE-SPECIFIC FOCUS:
- Keychain security
- URL scheme vulnerabilities
- Certificate pinning
- Jailbreak detection bypass
- Memory management issues`,
      scala: `LANGUAGE-SPECIFIC FOCUS:
- Akka actor security
- Play framework vulnerabilities
- SQL injection in Slick
- Deserialization issues
- Implicit conversions security risks`,
      r: `LANGUAGE-SPECIFIC FOCUS:
- SQL injection in database queries
- File path traversal
- Insecure data handling
- Package security vulnerabilities
- Shiny app security`,
      dart: `LANGUAGE-SPECIFIC FOCUS:
- Flutter security issues
- Insecure data storage
- Platform channel vulnerabilities
- Certificate pinning
- Code obfuscation weaknesses`
    };
    
    return languageFocus[language.toLowerCase()] || `LANGUAGE-SPECIFIC FOCUS:\n- General security best practices for ${language}`;
  }

  private updateCapabilitiesForLanguage(language: string, tools: string[]): void {
    // Update agent capabilities based on available tools
    const capabilities = [];
    
    if (tools.includes('semgrep')) {
      capabilities.push('SAST analysis', 'Pattern-based vulnerability detection');
    }
    if (tools.includes('bandit') && language === 'python') {
      capabilities.push('Python-specific security issues');
    }
    if (tools.includes('gosec') && language === 'go') {
      capabilities.push('Go-specific security patterns');
    }
    if (tools.includes('brakeman') && language === 'ruby') {
      capabilities.push('Rails security analysis');
    }
    
    // Store capabilities for use in analysis
    this.capabilities = capabilities;
  }

  async analyze(context: any): Promise<AnalysisResult> {
    try {
      // Generate appropriate prompt if language is known
      if (this.currentLanguage) {
        const rolePrompt = this.generateRolePrompt(this.currentLanguage, this.repoSize);
        // This prompt would be used when calling AI models for analysis
        context.rolePrompt = rolePrompt;
      }

      // Mock security analysis
      const mockResults = context.toolResults || [];
      const vulnerabilities = this.extractVulnerabilities(mockResults);

      if (vulnerabilities.length === 0) {
        return {
          insights: [],
          suggestions: [],
          metadata: {
            securityScan: 'completed',
            vulnerabilities: 0,
            agent: this.agentName,
            language: this.currentLanguage,
            tools: this.languageSpecificTools
          }
        };
      }

      // Convert vulnerabilities to insights and suggestions
      const insights = vulnerabilities.map(vuln => ({
        type: 'security' as const,
        severity: this.mapSeverity(vuln.severity) as 'high' | 'medium' | 'low',
        message: vuln.description || vuln.title || 'Security vulnerability detected',
        location: vuln.location
      }));

      const suggestions = vulnerabilities
        .filter(vuln => vuln.remediation)
        .map(vuln => ({
          file: vuln.location?.file || 'unknown',
          line: vuln.location?.line || 0,
          suggestion: vuln.remediation || 'Apply security fix'
        }));

      return {
        insights,
        suggestions,
        metadata: {
          securityScan: 'completed',
          vulnerabilities: vulnerabilities.length,
          severityDistribution: this.countBySeverity(vulnerabilities),
          agent: this.agentName,
          language: this.currentLanguage,
          tools: this.languageSpecificTools
        }
      };
    } catch (error) {
      return this.handleError(error);
    }
  }
  
  private extractVulnerabilities(results: any[]): any[] {
    // Extract vulnerabilities from tool results
    const vulnerabilities = [];
    
    for (const result of results) {
      if (result.vulnerabilities) {
        vulnerabilities.push(...result.vulnerabilities);
      } else if (result.issues) {
        vulnerabilities.push(...result.issues.filter((i: any) => i.type === 'security'));
      }
    }
    
    return vulnerabilities;
  }
  
  private mapSeverity(severity: string): string {
    const mapping: Record<string, string> = {
      'critical': 'high',
      'high': 'high',
      'medium': 'medium',
      'low': 'low',
      'info': 'low'
    };
    return mapping[severity.toLowerCase()] || 'medium';
  }
  
  private countBySeverity(vulnerabilities: any[]): Record<string, number> {
    const counts: Record<string, number> = {
      high: 0,
      medium: 0,
      low: 0
    };
    
    for (const vuln of vulnerabilities) {
      const severity = this.mapSeverity(vuln.severity || 'medium');
      counts[severity]++;
    }
    
    return counts;
  }
  
  formatResult(rawResult: unknown): AnalysisResult {
    // Convert raw result to AnalysisResult format
    if (typeof rawResult === 'object' && rawResult !== null && 'insights' in rawResult) {
      return rawResult as AnalysisResult;
    }
    return {
      insights: [],
      suggestions: [],
      metadata: { agent: this.agentName }
    };
  }
}