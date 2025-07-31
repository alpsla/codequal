/**
 * Enhanced DeepWiki Mock Service
 * Generates realistic vulnerability data for testing
 */

import { v4 as uuidv4 } from 'uuid';
import { DeepWikiAnalysisResult, DeepWikiIssue } from '../types/deepwiki';

export class EnhancedDeepWikiMock {
  /**
   * Generate realistic vulnerability data for OWASP repositories
   */
  static generateVulnerableRepoAnalysis(repoUrl: string): DeepWikiAnalysisResult {
    const isOWASP = repoUrl.includes('OWASP') || repoUrl.includes('juice-shop');
    const analysisId = uuidv4();
    
    // Generate realistic vulnerabilities for vulnerable repos
    const vulnerabilities: DeepWikiIssue[] = [];
    
    if (isOWASP) {
      // SQL Injection vulnerabilities
      vulnerabilities.push({
        type: 'sql-injection',
        severity: 'critical',
        category: 'security',
        message: 'SQL Injection in User Authentication - The login endpoint is vulnerable to SQL injection attacks. User input is directly concatenated into SQL queries without proper sanitization.',
        file: 'app/routes/session.js',
        line: 45,
        cwe: {
          id: '89',
          name: 'SQL Injection'
        },
        cvss: {
          score: 9.8,
          vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H'
        },
        impact: 'Attackers can bypass authentication, extract sensitive data, or execute arbitrary SQL commands.',
        suggestion: 'Use parameterized queries or prepared statements. Never concatenate user input directly into SQL queries.',
        evidence: {
          snippet: `db.query("SELECT * FROM users WHERE username = '" + req.body.username + "' AND password = '" + req.body.password + "'");`
        },
        remediation: {
          immediate: 'Replace string concatenation with parameterized queries',
          steps: [
            'Use prepared statements for all SQL queries',
            'Implement input validation',
            'Use an ORM like Sequelize or TypeORM'
          ]
        }
      });
      
      vulnerabilities.push({
        type: 'sql-injection',
        severity: 'critical',
        category: 'security',
        message: 'SQL Injection in Product Search - The search functionality is vulnerable to SQL injection through unsanitized user input in the search parameter.',
        file: 'app/data/products-dao.js',
        line: 78,
        cwe: {
          id: '89',
          name: 'SQL Injection'
        },
        cvss: {
          score: 9.3,
          vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:L'
        },
        impact: 'Attackers can extract all database contents including user credentials and payment information.',
        suggestion: 'Implement proper input validation and use ORM with parameterized queries.',
        evidence: {
          snippet: `db.query("SELECT * FROM products WHERE name LIKE '%" + searchTerm + "%'");`
        }
      });
      
      // XSS vulnerabilities
      vulnerabilities.push({
        type: 'xss',
        severity: 'high',
        category: 'security',
        message: 'Stored XSS in User Profile - User profile fields are not properly sanitized, allowing stored XSS attacks through malicious JavaScript in profile data.',
        file: 'app/views/profile.ejs',
        line: 23,
        cwe: {
          id: '79',
          name: 'Cross-site Scripting'
        },
        cvss: {
          score: 7.5,
          vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:H/A:N'
        },
        impact: 'Attackers can steal session cookies, perform actions on behalf of users, or redirect to malicious sites.',
        suggestion: 'Sanitize all user input before rendering. Use Content Security Policy headers.',
        evidence: {
          snippet: `<div><%- user.bio %></div>`
        }
      });
      
      // IDOR vulnerability
      vulnerabilities.push({
        type: 'idor',
        severity: 'high',
        category: 'security',
        message: 'IDOR in Order Management - Users can access other users\' orders by manipulating the order ID parameter without proper authorization checks.',
        file: 'app/routes/orders.js',
        line: 112,
        cwe: {
          id: '639',
          name: 'Authorization Bypass Through User-Controlled Key'
        },
        cvss: {
          score: 6.5,
          vector: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N'
        },
        impact: 'Unauthorized access to sensitive order information including addresses and payment details.',
        suggestion: 'Implement proper authorization checks. Verify user ownership before granting access.'
      });
      
      // Weak crypto
      vulnerabilities.push({
        type: 'weak-crypto',
        severity: 'high',
        category: 'security',
        message: 'Weak Password Hashing - Passwords are hashed using MD5 without salt, making them vulnerable to rainbow table attacks.',
        file: 'app/data/user-dao.js',
        line: 34,
        cwe: {
          id: '326',
          name: 'Inadequate Encryption Strength'
        },
        cvss: {
          score: 7.0,
          vector: 'CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:N'
        },
        impact: 'Compromised database would allow attackers to easily crack user passwords.',
        suggestion: 'Use bcrypt, scrypt, or Argon2 for password hashing with appropriate salt.'
      });
      
      // Vulnerable dependency
      vulnerabilities.push({
        type: 'vulnerable-dependency',
        severity: 'medium',
        category: 'security',
        message: 'Vulnerable Dependency: express-fileupload - Using express-fileupload version 1.1.7 which has known security vulnerabilities (CVE-2020-7699).',
        file: 'package.json',
        line: 15,
        cwe: {
          id: '434',
          name: 'Unrestricted Upload of File with Dangerous Type'
        },
        cvss: {
          score: 5.3,
          vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:L/A:N'
        },
        impact: 'Prototype pollution vulnerability that could lead to RCE in certain configurations.',
        suggestion: 'Update express-fileupload to version 1.1.10 or later.'
      });
    }
    
    // Add some performance issues
    const performanceIssues: DeepWikiIssue[] = [
      {
        type: 'n-plus-one',
        severity: 'medium',
        category: 'performance',
        message: 'N+1 Query Problem in User Dashboard - The dashboard loads user data with multiple database queries in a loop, causing performance degradation.',
        file: 'app/routes/dashboard.js',
        line: 67,
        impact: 'Page load times increase linearly with number of user items.',
        suggestion: 'Use eager loading or optimize queries to load related data in a single query.'
      }
    ];
    
    // Add code quality issues
    const qualityIssues: DeepWikiIssue[] = [
      {
        type: 'code-smell',
        severity: 'low',
        category: 'maintainability',
        message: 'Large Method: processPayment - Method exceeds 200 lines with cyclomatic complexity of 15, making it difficult to maintain and test.',
        file: 'app/services/payment.js',
        line: 145,
        impact: 'Increased maintenance cost and higher likelihood of bugs.',
        suggestion: 'Break down into smaller, focused methods. Extract complex logic into separate service classes.'
      }
    ];
    
    const allIssues = [...vulnerabilities, ...performanceIssues, ...qualityIssues];
    
    return {
      repository_url: repoUrl,
      analysis_id: analysisId,
      issues: allIssues,
      recommendations: [
        {
          type: 'security',
          priority: 'high',
          category: 'security',
          title: 'Fix SQL Injection Vulnerabilities',
          description: 'Multiple SQL injection vulnerabilities pose immediate risk to data security.',
          impact: 'Prevents unauthorized data access and potential data breaches.',
          effort: 'medium',
          estimated_hours: 8
        },
        {
          type: 'security',
          priority: 'high',
          category: 'security',
          title: 'Implement Proper Input Validation',
          description: 'Add comprehensive input validation and sanitization across all user inputs.',
          impact: 'Reduces attack surface for XSS and injection attacks.',
          effort: 'high',
          estimated_hours: 16
        },
        {
          type: 'security',
          priority: 'medium',
          category: 'security',
          title: 'Upgrade Password Hashing',
          description: 'Replace MD5 with bcrypt or Argon2 for secure password storage.',
          impact: 'Protects user credentials even if database is compromised.',
          effort: 'low',
          estimated_hours: 4
        },
        {
          type: 'maintainability',
          priority: 'medium',
          category: 'dependencies',
          title: 'Update Vulnerable Dependencies',
          description: 'Several dependencies have known security vulnerabilities.',
          impact: 'Eliminates known security vulnerabilities from third-party code.',
          effort: 'low',
          estimated_hours: 2
        }
      ],
      scores: {
        overall: isOWASP ? 35 : 75,
        security: isOWASP ? 25 : 80,
        performance: 70,
        maintainability: 65
      },
      metadata: {
        analyzed_at: new Date(),
        duration_ms: 4200,
        files_analyzed: 234,
        model_used: 'openai/gpt-4o'
      }
    };
  }

  /**
   * Generate feature branch analysis with slight variations
   */
  static generateFeatureBranchAnalysis(repoUrl: string): DeepWikiAnalysisResult {
    const mainAnalysis = this.generateVulnerableRepoAnalysis(repoUrl);
    
    // Simulate some fixes in feature branch
    const featureIssues = mainAnalysis.issues.filter((issue: DeepWikiIssue) => 
      !issue.message.includes('Weak Password Hashing') && 
      !issue.message.includes('Vulnerable Dependency')
    );
    
    // Add a new issue introduced in feature branch
    featureIssues.push({
      type: 'hardcoded-secret',
      severity: 'high',
      category: 'security',
      message: 'Hardcoded API Key - API key is hardcoded in the source code instead of using environment variables.',
      file: 'app/config/api.js',
      line: 5,
      cwe: {
        id: '798',
        name: 'Use of Hard-coded Credentials'
      },
      cvss: {
        score: 7.5,
        vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N'
      },
      impact: 'Exposed API keys can be extracted from source code and used maliciously.',
      suggestion: 'Move sensitive configuration to environment variables.',
      evidence: {
        snippet: `const API_KEY = 'sk_live_abcd1234efgh5678';`
      }
    });
    
    return {
      ...mainAnalysis,
      analysis_id: uuidv4(),
      issues: featureIssues,
      metadata: {
        ...mainAnalysis.metadata,
        branch: 'feature/security-fixes'
      }
    };
  }
}