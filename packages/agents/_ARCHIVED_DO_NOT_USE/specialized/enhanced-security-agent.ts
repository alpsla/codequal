/**
 * Enhanced Security Agent with Code Fix Recommendations
 * Provides specific code fixes for identified vulnerabilities
 */

import { BaseAgent } from '../base/base-agent';
import { AnalysisResult } from '../agent';

export interface CodeFixRecommendation {
  description: string;
  before: string;
  after: string;
  explanation: string;
  preventionTips?: string[];
}

export interface EnhancedSecurityVulnerability {
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
  evidence?: {
    codeSnippet: string;
    context?: string[];
  };
  codeFix?: CodeFixRecommendation;
  references?: string[];
}

export class EnhancedSecurityAgent extends BaseAgent {
  agentName = 'Enhanced Security Specialist';
  
  // Implement required abstract methods
  async analyze(context: any): Promise<AnalysisResult> {
    // Implementation would go here
    return {
      insights: [],
      suggestions: [],
      educational: [],
      metadata: {
        agentName: this.agentName,
        confidence: 85
      }
    };
  }
  
  formatResult(rawResult: unknown): AnalysisResult {
    // Convert raw result to AnalysisResult format
    return {
      insights: [],
      suggestions: [],
      educational: [],
      metadata: {
        agentName: this.agentName,
        confidence: 85
      }
    };
  }
  
  /**
   * Generate specific code fix recommendations based on vulnerability type
   */
  generateCodeFix(vulnerability: any): CodeFixRecommendation | undefined {
    const fixGenerators: Record<string, () => CodeFixRecommendation> = {
      'sql-injection': () => this.generateSQLInjectionFix(vulnerability),
      'xss': () => this.generateXSSFix(vulnerability),
      'weak-jwt': () => this.generateWeakJWTFix(vulnerability),
      'hardcoded-secret': () => this.generateHardcodedSecretFix(vulnerability),
      'command-injection': () => this.generateCommandInjectionFix(vulnerability),
      'path-traversal': () => this.generatePathTraversalFix(vulnerability),
      'weak-crypto': () => this.generateWeakCryptoFix(vulnerability),
      'insecure-random': () => this.generateInsecureRandomFix(vulnerability),
      'xxe': () => this.generateXXEFix(vulnerability),
      'csrf': () => this.generateCSRFFix(vulnerability)
    };

    const generator = fixGenerators[vulnerability.category?.toLowerCase()];
    return generator ? generator() : this.generateGenericFix(vulnerability);
  }

  private generateSQLInjectionFix(vuln: any): CodeFixRecommendation {
    const codeSnippet = vuln.evidence?.codeSnippet || '';
    
    // JavaScript/TypeScript SQL Injection Fix
    if (codeSnippet.includes('SELECT * FROM users WHERE id =')) {
      return {
        description: 'Use parameterized queries to prevent SQL injection',
        before: `const query = "SELECT * FROM users WHERE id = " + req.params.id;
const result = await db.query(query);`,
        after: `const query = "SELECT * FROM users WHERE id = ?";
const result = await db.query(query, [req.params.id]);

// Or using named parameters (PostgreSQL/MySQL2)
const query = "SELECT * FROM users WHERE id = $1";
const result = await db.query(query, [req.params.id]);

// For more complex queries, use a query builder
const result = await db
  .select('*')
  .from('users')
  .where('id', '=', req.params.id);`,
        explanation: 'Parameterized queries separate SQL logic from data, preventing malicious input from being interpreted as SQL commands.',
        preventionTips: [
          'Always use parameterized queries or prepared statements',
          'Validate and sanitize all user input',
          'Use an ORM like Prisma, TypeORM, or Sequelize',
          'Apply principle of least privilege to database users',
          'Enable SQL query logging for security monitoring'
        ]
      };
    }

    // Python SQL Injection Fix
    if (codeSnippet.includes('cursor.execute')) {
      return {
        description: 'Use parameterized queries in Python',
        before: `query = f"SELECT * FROM users WHERE id = {user_id}"
cursor.execute(query)`,
        after: `# Using parameterized query
query = "SELECT * FROM users WHERE id = %s"
cursor.execute(query, (user_id,))

# Or with named parameters
query = "SELECT * FROM users WHERE id = %(user_id)s"
cursor.execute(query, {'user_id': user_id})

# Using SQLAlchemy ORM (recommended)
from sqlalchemy.orm import Session
user = session.query(User).filter(User.id == user_id).first()`,
        explanation: 'Parameterized queries ensure user input is properly escaped and never executed as SQL code.',
        preventionTips: [
          'Use SQLAlchemy or Django ORM for database operations',
          'Enable SQL query logging',
          'Implement input validation using libraries like Pydantic',
          'Use stored procedures where appropriate'
        ]
      };
    }

    return this.generateGenericSQLFix();
  }

  private generateXSSFix(vuln: any): CodeFixRecommendation {
    const codeSnippet = vuln.evidence?.codeSnippet || '';
    
    // React XSS Fix
    if (codeSnippet.includes('dangerouslySetInnerHTML')) {
      return {
        description: 'Sanitize user input before rendering HTML',
        before: `<div dangerouslySetInnerHTML={{ __html: userComment }} />`,
        after: `// Option 1: Use text content instead of HTML
<div>{userComment}</div>

// Option 2: Sanitize HTML using DOMPurify
import DOMPurify from 'dompurify';
const sanitizedHTML = DOMPurify.sanitize(userComment, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
  ALLOWED_ATTR: ['href']
});
<div dangerouslySetInnerHTML={{ __html: sanitizedHTML }} />

// Option 3: Use a markdown renderer with built-in sanitization
import ReactMarkdown from 'react-markdown';
<ReactMarkdown>{userComment}</ReactMarkdown>`,
        explanation: 'Unsanitized user input in dangerouslySetInnerHTML can execute malicious scripts.',
        preventionTips: [
          'Avoid dangerouslySetInnerHTML whenever possible',
          'Always sanitize HTML content with DOMPurify or similar',
          'Use Content Security Policy (CSP) headers',
          'Validate input on both client and server side',
          'Encode output based on context (HTML, URL, JS, CSS)'
        ]
      };
    }

    // Vue.js XSS Fix
    if (codeSnippet.includes('v-html')) {
      return {
        description: 'Avoid v-html or sanitize content in Vue.js',
        before: `<div v-html="userContent"></div>`,
        after: `<!-- Option 1: Use text interpolation -->
<div>{{ userContent }}</div>

<!-- Option 2: Sanitize with DOMPurify -->
<div v-html="sanitizedContent"></div>

<script>
import DOMPurify from 'dompurify';

export default {
  computed: {
    sanitizedContent() {
      return DOMPurify.sanitize(this.userContent);
    }
  }
}
</script>`,
        explanation: 'v-html directive can execute untrusted HTML and scripts.',
        preventionTips: [
          'Use text interpolation {{ }} instead of v-html',
          'Sanitize all HTML content before rendering',
          'Implement strict CSP policies',
          'Validate and escape user input'
        ]
      };
    }

    return this.generateGenericXSSFix();
  }

  private generateWeakJWTFix(vuln: any): CodeFixRecommendation {
    return {
      description: 'Use strong, environment-based JWT secrets',
      before: `const jwt = require('jsonwebtoken');
const token = jwt.sign(payload, 'my-secret-key');`,
      after: `const jwt = require('jsonwebtoken');

// Load from environment variable
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters');
}

const token = jwt.sign(payload, JWT_SECRET, {
  expiresIn: '1h',
  algorithm: 'HS256',
  issuer: 'your-app-name',
  audience: 'your-app-users'
});

// For production, consider using RS256 with key pairs
const fs = require('fs');
const privateKey = fs.readFileSync('private.key');
const token = jwt.sign(payload, privateKey, {
  algorithm: 'RS256',
  expiresIn: '1h'
});`,
      explanation: 'Weak or hardcoded JWT secrets can be easily compromised, allowing attackers to forge tokens.',
      preventionTips: [
        'Generate cryptographically strong secrets (min 256 bits)',
        'Store secrets in environment variables or secret management services',
        'Rotate secrets regularly',
        'Use RS256 algorithm with key pairs for better security',
        'Implement token refresh mechanism',
        'Add token blacklisting for logout functionality'
      ]
    };
  }

  private generateHardcodedSecretFix(vuln: any): CodeFixRecommendation {
    return {
      description: 'Move secrets to environment variables',
      before: `const API_KEY = 'sk-1234567890abcdef';
const DATABASE_PASSWORD = 'admin123';`,
      after: `// Use environment variables
const API_KEY = process.env.API_KEY;
const DATABASE_PASSWORD = process.env.DATABASE_PASSWORD;

// Validate required environment variables on startup
const requiredEnvVars = ['API_KEY', 'DATABASE_PASSWORD'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(\`Missing required environment variable: \${envVar}\`);
  }
}

// For production, use a secret management service
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
const client = new SecretManagerServiceClient();
const [version] = await client.accessSecretVersion({
  name: 'projects/PROJECT_ID/secrets/api-key/versions/latest',
});
const API_KEY = version.payload.data.toString();`,
      explanation: 'Hardcoded secrets in code can be exposed in version control and are difficult to rotate.',
      preventionTips: [
        'Never commit secrets to version control',
        'Use .env files for local development (add to .gitignore)',
        'Use secret management services (AWS Secrets Manager, HashiCorp Vault)',
        'Implement secret rotation policies',
        'Scan code for secrets before committing (use tools like git-secrets)'
      ]
    };
  }

  private generateCommandInjectionFix(vuln: any): CodeFixRecommendation {
    return {
      description: 'Avoid shell execution or properly escape commands',
      before: `const { exec } = require('child_process');
const filename = req.query.file;
exec(\`cat \${filename}\`, (error, stdout) => {
  res.send(stdout);
});`,
      after: `const { spawn } = require('child_process');
const path = require('path');

// Option 1: Avoid shell execution, use spawn with arguments array
const filename = req.query.file;

// Validate filename
if (!filename || filename.includes('..') || !filename.match(/^[a-zA-Z0-9._-]+$/)) {
  return res.status(400).send('Invalid filename');
}

const safePath = path.join('/safe/directory', filename);
const cat = spawn('cat', [safePath], { shell: false });

cat.stdout.on('data', (data) => {
  res.write(data);
});

// Option 2: Use built-in fs module instead of shell commands
const fs = require('fs').promises;
try {
  const content = await fs.readFile(safePath, 'utf8');
  res.send(content);
} catch (error) {
  res.status(404).send('File not found');
}`,
      explanation: 'Command injection allows attackers to execute arbitrary system commands.',
      preventionTips: [
        'Avoid using exec() or system() with user input',
        'Use language built-in functions instead of shell commands',
        'If shell execution is necessary, use parameterized commands',
        'Implement strict input validation and whitelisting',
        'Run applications with minimal privileges'
      ]
    };
  }

  private generatePathTraversalFix(vuln: any): CodeFixRecommendation {
    return {
      description: 'Validate and sanitize file paths',
      before: `const filePath = req.query.path;
const content = fs.readFileSync(filePath);`,
      after: `const path = require('path');
const fs = require('fs').promises;

const requestedPath = req.query.path;
const baseDirectory = '/var/www/uploads';

// Resolve and normalize the path
const resolvedPath = path.resolve(baseDirectory, requestedPath);

// Ensure the resolved path is within the base directory
if (!resolvedPath.startsWith(baseDirectory)) {
  return res.status(403).send('Access denied');
}

// Additional validation
const isValidPath = (filepath) => {
  // Check for null bytes
  if (filepath.indexOf('\\0') !== -1) return false;
  // Check for directory traversal patterns
  if (filepath.includes('../') || filepath.includes('..\\\\')) return false;
  return true;
};

if (!isValidPath(requestedPath)) {
  return res.status(400).send('Invalid path');
}

try {
  const content = await fs.readFile(resolvedPath, 'utf8');
  res.send(content);
} catch (error) {
  res.status(404).send('File not found');
}`,
      explanation: 'Path traversal vulnerabilities allow attackers to access files outside intended directories.',
      preventionTips: [
        'Always validate and sanitize file paths',
        'Use path.resolve() and check against base directory',
        'Implement whitelisting for allowed file extensions',
        'Run application with minimal file system permissions',
        'Use chroot jails or containers to limit file system access'
      ]
    };
  }

  private generateWeakCryptoFix(vuln: any): CodeFixRecommendation {
    return {
      description: 'Use strong cryptographic algorithms',
      before: `const crypto = require('crypto');
const hash = crypto.createHash('md5').update(password).digest('hex');
const cipher = crypto.createCipher('des', key);`,
      after: `const crypto = require('crypto');
const { scrypt, randomBytes } = require('crypto');
const { promisify } = require('util');

// For password hashing, use bcrypt or argon2
const bcrypt = require('bcrypt');
const hashedPassword = await bcrypt.hash(password, 12);

// Or use built-in scrypt
const scryptAsync = promisify(scrypt);
const salt = randomBytes(16);
const hashedPassword = await scryptAsync(password, salt, 64);

// For encryption, use AES-256-GCM
const algorithm = 'aes-256-gcm';
const key = randomBytes(32);
const iv = randomBytes(16);
const cipher = crypto.createCipheriv(algorithm, key, iv);

let encrypted = cipher.update(text, 'utf8', 'hex');
encrypted += cipher.final('hex');
const authTag = cipher.getAuthTag();

// Store iv and authTag with encrypted data for decryption`,
      explanation: 'Weak cryptographic algorithms like MD5, SHA1, DES are vulnerable to attacks.',
      preventionTips: [
        'Use bcrypt, scrypt, or argon2 for password hashing',
        'Use AES-256-GCM or ChaCha20-Poly1305 for encryption',
        'Never use MD5, SHA1, DES, or RC4',
        'Use authenticated encryption modes (GCM, CCM)',
        'Generate proper random IVs and salts',
        'Store keys securely, separate from encrypted data'
      ]
    };
  }

  private generateInsecureRandomFix(vuln: any): CodeFixRecommendation {
    return {
      description: 'Use cryptographically secure random generation',
      before: `const token = Math.random().toString(36).substring(2);
const sessionId = Date.now().toString();`,
      after: `const crypto = require('crypto');

// Generate secure random token
const token = crypto.randomBytes(32).toString('hex');

// Generate secure UUID
const { randomUUID } = require('crypto');
const sessionId = randomUUID();

// Generate secure random number
const randomInt = crypto.randomInt(0, 1000000);

// For web tokens
const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('base64url');
};

const sessionToken = generateSecureToken(32);`,
      explanation: 'Math.random() is not cryptographically secure and can be predicted.',
      preventionTips: [
        'Use crypto.randomBytes() for secure random generation',
        'Use crypto.randomUUID() for unique identifiers',
        'Never use Math.random() for security-sensitive operations',
        'Use appropriate entropy for key generation',
        'Validate random generation in security tests'
      ]
    };
  }

  private generateXXEFix(vuln: any): CodeFixRecommendation {
    return {
      description: 'Disable external entity processing in XML parsers',
      before: `const parser = new DOMParser();
const doc = parser.parseFromString(xmlString, 'text/xml');`,
      after: `// For Node.js with libxmljs
const libxmljs = require('libxmljs');
const parserOptions = {
  noent: false,      // Disable entity expansion
  noblanks: true,
  nonet: true        // Disable network access
};
const doc = libxmljs.parseXml(xmlString, parserOptions);

// For Node.js with xml2js (safer by default)
const xml2js = require('xml2js');
const parser = new xml2js.Parser({
  strict: true,
  normalize: false,
  normalizeTags: false,
  explicitArray: false
});

// For Java/Spring Boot
@Bean
public Jackson2ObjectMapperBuilder jackson2ObjectMapperBuilder() {
    return new Jackson2ObjectMapperBuilder()
        .featuresToEnable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
        .featuresToDisable(MapperFeature.DEFAULT_VIEW_INCLUSION)
        .modules(new JavaTimeModule());
}`,
      explanation: 'XXE vulnerabilities allow attackers to read local files and perform SSRF attacks.',
      preventionTips: [
        'Disable DTD and external entity processing',
        'Use JSON instead of XML when possible',
        'Validate XML against a schema',
        'Use safe XML parsing libraries',
        'Implement proper access controls for XML processing'
      ]
    };
  }

  private generateCSRFFix(vuln: any): CodeFixRecommendation {
    return {
      description: 'Implement CSRF protection with tokens',
      before: `app.post('/transfer', (req, res) => {
  const { amount, recipient } = req.body;
  // Process transfer
});`,
      after: `const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true });

// Apply CSRF protection to state-changing routes
app.post('/transfer', csrfProtection, (req, res) => {
  const { amount, recipient } = req.body;
  // CSRF token is automatically validated
  // Process transfer
});

// Provide CSRF token to frontend
app.get('/transfer-form', csrfProtection, (req, res) => {
  res.render('transfer', { csrfToken: req.csrfToken() });
});

// Frontend implementation
<form method="POST" action="/transfer">
  <input type="hidden" name="_csrf" value="{{csrfToken}}">
  <input name="amount" type="number">
  <input name="recipient" type="text">
  <button type="submit">Transfer</button>
</form>

// For SPA/React applications
const response = await fetch('/api/csrf-token');
const { token } = await response.json();

await fetch('/api/transfer', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': token
  },
  body: JSON.stringify({ amount, recipient })
});`,
      explanation: 'CSRF attacks trick users into performing unwanted actions on authenticated sessions.',
      preventionTips: [
        'Implement anti-CSRF tokens for all state-changing operations',
        'Use SameSite cookie attribute',
        'Verify Origin and Referer headers',
        'Use custom request headers for AJAX calls',
        'Implement user interaction for sensitive operations (re-authentication)'
      ]
    };
  }

  private generateGenericSQLFix(): CodeFixRecommendation {
    return {
      description: 'Use parameterized queries for all database operations',
      before: `const query = "SELECT * FROM table WHERE column = " + userInput;`,
      after: `// Use parameterized queries
const query = "SELECT * FROM table WHERE column = ?";
const result = await db.query(query, [userInput]);`,
      explanation: 'Always use parameterized queries to prevent SQL injection.',
      preventionTips: [
        'Use prepared statements or parameterized queries',
        'Validate all user input',
        'Use stored procedures where appropriate',
        'Apply principle of least privilege to database users'
      ]
    };
  }

  private generateGenericXSSFix(): CodeFixRecommendation {
    return {
      description: 'Sanitize and encode all user input before output',
      before: '<div>${userInput}</div>',
      after: `// HTML encode the output
import { escape } from 'html-escaper';
<div>\${escape(userInput)}</div>

// Or use a sanitization library
import DOMPurify from 'dompurify';
<div>\${DOMPurify.sanitize(userInput)}</div>`,
      explanation: 'Always sanitize user input to prevent XSS attacks.',
      preventionTips: [
        'Encode output based on context (HTML, URL, JavaScript)',
        'Use Content Security Policy headers',
        'Validate input on both client and server',
        'Use template engines with auto-escaping'
      ]
    };
  }

  private generateGenericFix(vuln: any): CodeFixRecommendation {
    return {
      description: `Fix for ${vuln.title}`,
      before: 'Unable to generate specific code example',
      after: 'Please consult security best practices for your specific framework and language',
      explanation: `This ${vuln.severity} severity issue requires attention.`,
      preventionTips: [
        'Review OWASP guidelines for this vulnerability type',
        'Implement secure coding practices',
        'Use security linters and static analysis tools',
        'Conduct regular security audits'
      ]
    };
  }

  /**
   * Enhance vulnerability with code fix recommendations
   */
  async analyzeWithCodeFixes(vulnerabilities: any[]): Promise<EnhancedSecurityVulnerability[]> {
    return vulnerabilities.map(vuln => {
      const enhanced: EnhancedSecurityVulnerability = {
        ...vuln,
        codeFix: this.generateCodeFix(vuln)
      };
      return enhanced;
    });
  }
}