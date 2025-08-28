/**
 * Comprehensive Security Template Library
 * Covers all major security vulnerabilities with copy-paste ready fixes
 */

import { Issue } from '../types/analysis-types';

export interface SecurityTemplate {
  id: string;
  category: string;
  patterns: RegExp[];
  severity: 'critical' | 'high' | 'medium' | 'low';
  generateFix: (context: any) => string;
}

export class SecurityTemplateLibrary {
  private templates: Map<string, SecurityTemplate> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  private initializeTemplates() {
    // ============================================
    // 1. INPUT VALIDATION
    // ============================================
    
    // SQL Injection
    this.templates.set('sql-injection', {
      id: 'sql-injection',
      category: 'injection',
      patterns: [/sql.*injection/i, /sql.*query/i, /database.*query/i],
      severity: 'critical',
      generateFix: (ctx) => {
        const funcName = ctx.functionName || 'executeQuery';
        const params = ctx.parameters || [];
        const variables = ctx.variables || [];
        
        return `// SQL Injection Prevention - Two Options

// OPTION A: Drop-in replacement (maintains same function signature)
function ${funcName}(${params.map(p => `${p.name}${p.type ? ': ' + p.type : ''}`).join(', ')}) {
  // Extract the actual query parameter safely
  ${params.length > 0 ? `const safeParam = typeof ${params[0].name} === 'string' ? ${params[0].name} : String(${params[0].name});` : ''}
  
  // Use parameterized query to prevent SQL injection
  const query = 'SELECT * FROM users WHERE email = ?';
  return db.execute(query, [${params.length > 0 ? 'safeParam' : ''}]);
}

// OPTION B: Refactored approach (more secure, but requires updating callers)
// This changes the function signature to accept individual parameters
// instead of raw SQL or objects that could contain operators
function ${funcName}Safe(userId: string, status: string) {
  // Validate inputs
  if (!userId || typeof userId !== 'string') {
    throw new Error('Invalid userId');
  }
  
  // Use parameterized query
  const query = 'SELECT * FROM users WHERE id = ? AND status = ?';
  return db.query(query, [userId, status]);
}

// Migration guide:
// Old: ${funcName}(userInput)
// New: ${funcName}Safe(userInput.id, userInput.status)`
      }
    });

    // NoSQL Injection
    this.templates.set('nosql-injection', {
      id: 'nosql-injection',
      category: 'injection',
      patterns: [/nosql.*injection/i, /mongodb.*injection/i, /\$where/i],
      severity: 'critical',
      generateFix: (ctx) => {
        const funcName = ctx.functionName || 'findUserByQuery';
        const params = ctx.parameters || [{ name: 'userQuery', type: 'any' }];
        
        return `// NoSQL Injection Prevention - Two Options

// OPTION A: Drop-in replacement (maintains same function signature)
async function ${funcName}(${params.map(p => `${p.name}: ${p.type || 'any'}`).join(', ')}) {
  // Sanitize the input to remove MongoDB operators
  function sanitizeQuery(input: any): any {
    if (typeof input === 'object' && input !== null) {
      const sanitized = {};
      for (const key in input) {
        // Remove any MongoDB operators (keys starting with $)
        if (!key.startsWith('$')) {
          sanitized[key] = typeof input[key] === 'object' 
            ? sanitizeQuery(input[key])  // Recursively sanitize nested objects
            : input[key];
        }
      }
      return sanitized;
    }
    return input;
  }
  
  // Apply sanitization before querying
  const safeQuery = sanitizeQuery(${params[0]?.name || 'userQuery'});
  const user = await db.collection('users').findOne(safeQuery);
  return user;
}

// OPTION B: Refactored approach (more secure, requires updating callers)
// This uses specific parameters instead of accepting arbitrary objects
async function ${funcName}Safe(userId: string, status?: string) {
  // Build safe query with no operator injection possible
  const query: any = { _id: new ObjectId(userId) };
  if (status) {
    query.status = status; // Direct assignment, no operators
  }
  
  return await db.collection('users').findOne(query);
}

// Migration guide:
// Old: ${funcName}({ email: req.body.email, $ne: null })
// New: ${funcName}Safe(req.body.userId, req.body.status)`
      }
    });

    // Command Injection
    this.templates.set('command-injection', {
      id: 'command-injection',
      category: 'injection',
      patterns: [/command.*injection/i, /os.*command/i, /exec.*shell/i, /child_process/i],
      severity: 'critical',
      generateFix: (ctx) => {
        const funcName = ctx.functionName || 'convertFile';
        const params = ctx.parameters || [{ name: 'filename' }, { name: 'format' }];
        
        return `// Command Injection Prevention - Two Options

// OPTION A: Drop-in replacement (maintains same function signature)
function ${funcName}(${params.map(p => p.name).join(', ')}) {
  const { spawn } = require('child_process');
  const path = require('path');
  
  // Whitelist validation for inputs
  const allowedFormats = ['pdf', 'png', 'jpg', 'txt'];
  if (!allowedFormats.includes(${params[1]?.name || 'format'})) {
    throw new Error('Invalid format');
  }
  
  // Validate filename - remove any shell metacharacters
  const safeFilename = ${params[0]?.name || 'filename'}.replace(/[^a-zA-Z0-9._-]/g, '');
  
  // Use spawn (never exec) with argument array
  const child = spawn('convert', [safeFilename, \`output.\${${params[1]?.name || 'format'}}\`], {
    shell: false  // Never use shell
  });
  
  return new Promise((resolve, reject) => {
    child.on('close', (code) => {
      code === 0 ? resolve('Success') : reject('Command failed');
    });
  });
}

// OPTION B: Refactored approach (more secure, requires updating callers)
// Completely avoids shell commands by using libraries
import fs from 'fs/promises';
import sharp from 'sharp'; // For image conversion

async function ${funcName}Safe(filename: string, format: string) {
  // Use libraries instead of shell commands
  const inputPath = path.join('/safe/directory', path.basename(filename));
  const outputPath = path.join('/safe/directory', \`output.\${format}\`);
  
  if (format === 'pdf') {
    // Use a PDF library instead of shell command
    const PDFDocument = require('pdfkit');
    // ... PDF conversion logic
  } else {
    // Use sharp for image conversion
    await sharp(inputPath).toFormat(format).toFile(outputPath);
  }
  
  return outputPath;
}`
      }
    });

    // XSS Prevention
    this.templates.set('xss-prevention', {
      id: 'xss-prevention',
      category: 'injection',
      patterns: [/xss/i, /cross.*site.*script/i, /innerHTML/i, /dangerouslySetInnerHTML/i],
      severity: 'high',
      generateFix: (ctx) => {
        const funcName = ctx.functionName || 'renderUserContent';
        const params = ctx.parameters || [{ name: 'userInput' }];
        
        return `// XSS Prevention - Two Options

// OPTION A: Drop-in replacement (maintains same function signature)
function ${funcName}(${params.map(p => p.name).join(', ')}) {
  // HTML escape function
  function escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  
  // Apply escaping to user input
  const safe = escapeHtml(${params[0]?.name || 'userInput'});
  
  // Now safe to render
  return \`<div>\${safe}</div>\`;
}

// OPTION B: Using DOMPurify for more complex content
import DOMPurify from 'isomorphic-dompurify';

function ${funcName}Safe(${params.map(p => p.name).join(', ')}) {
  // Sanitize HTML content while allowing safe tags
  const clean = DOMPurify.sanitize(${params[0]?.name || 'userInput'}, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href']
  });
  
  return clean;
}

// For React: Use default escaping
function SafeComponent({ ${params[0]?.name || 'userInput'} }) {
  // React automatically escapes this
  return <div>{${params[0]?.name || 'userInput'}}</div>;
  
  // Never use: dangerouslySetInnerHTML={{__html: userInput}}
}`
      }
    });

    // ============================================
    // 2. AUTHENTICATION & AUTHORIZATION
    // ============================================
    
    // Password Validation
    this.templates.set('password-validation', {
      id: 'password-validation',
      category: 'auth',
      patterns: [/password.*validation/i, /weak.*password/i, /password.*strength/i],
      severity: 'high',
      generateFix: (ctx) => {
        const funcName = ctx.functionName || 'validatePassword';
        const params = ctx.parameters || [{ name: 'password' }];
        
        return `// Password Validation - Two Options

// OPTION A: Drop-in replacement (maintains same function signature)
function ${funcName}(${params.map(p => p.name).join(', ')}) {
  const password = ${params[0]?.name || 'password'};
  
  // Add validation logic
  const errors = [];
  
  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain number');
  }
  
  if (errors.length > 0) {
    throw new Error(errors.join(', '));
  }
  
  // Original function logic continues here
  return true;
}

// OPTION B: Enhanced validation with zxcvbn
import zxcvbn from 'zxcvbn';
import bcrypt from 'bcrypt';

async function ${funcName}Enhanced(password: string, username?: string) {
  // Check password strength
  const result = zxcvbn(password, [username].filter(Boolean));
  
  if (result.score < 3) {
    throw new Error(\`Password too weak: \${result.feedback.warning || 'Use a stronger password'}\`);
  }
  
  // Hash the password
  const hash = await bcrypt.hash(password, 12);
  return { valid: true, hash };
}`
      }
    });

    // Session Management
    this.templates.set('session-validation', {
      id: 'session-validation',
      category: 'auth',
      patterns: [/session.*fixation/i, /session.*validation/i, /session.*management/i],
      severity: 'high',
      generateFix: (ctx) => {
        const funcName = ctx.functionName || 'handleLogin';
        const params = ctx.parameters || [{ name: 'req' }, { name: 'res' }, { name: 'user' }];
        
        return `// Session Security - Two Options

// OPTION A: Drop-in replacement (maintains same function signature)
function ${funcName}(${params.map(p => p.name).join(', ')}) {
  // CRITICAL: Regenerate session ID to prevent fixation
  ${params[0]?.name || 'req'}.session.regenerate((err) => {
    if (err) {
      console.error('Session regeneration failed:', err);
      return ${params[1]?.name || 'res'}.status(500).json({ error: 'Session error' });
    }
    
    // Now safe to set session data with new ID
    ${params[0]?.name || 'req'}.session.userId = ${params[2]?.name || 'user'}.id;
    ${params[0]?.name || 'req'}.session.authenticated = true;
    
    // Set session security options
    ${params[0]?.name || 'req'}.session.cookie.httpOnly = true;
    ${params[0]?.name || 'req'}.session.cookie.secure = process.env.NODE_ENV === 'production';
    ${params[0]?.name || 'req'}.session.cookie.sameSite = 'strict';
    
    ${params[1]?.name || 'res'}.json({ success: true });
  });
}

// OPTION B: Enhanced session security with fingerprinting
import crypto from 'crypto';

function ${funcName}Secure(req, res, user) {
  // Generate session fingerprint
  const fingerprint = crypto
    .createHash('sha256')
    .update(req.headers['user-agent'] + req.ip)
    .digest('hex');
  
  req.session.regenerate((err) => {
    if (err) throw err;
    
    req.session.userId = user.id;
    req.session.fingerprint = fingerprint;
    req.session.createdAt = Date.now();
    
    res.json({ success: true });
  });
}`
      }
    });

    // CSRF Protection
    this.templates.set('csrf-protection', {
      id: 'csrf-protection',
      category: 'auth',
      patterns: [/csrf/i, /cross.*site.*request/i, /missing.*token/i],
      severity: 'high',
      generateFix: (ctx) => {
        const funcName = ctx.functionName || 'handleTransfer';
        const params = ctx.parameters || [{ name: 'req' }, { name: 'res' }];
        
        return `// CSRF Protection - Two Options

// OPTION A: Drop-in replacement (maintains same function signature)
function ${funcName}(${params.map(p => p.name).join(', ')}) {
  // Add CSRF token validation
  const token = ${params[0]?.name || 'req'}.body.csrfToken || ${params[0]?.name || 'req'}.headers['x-csrf-token'];
  const sessionToken = ${params[0]?.name || 'req'}.session.csrfToken;
  
  if (!token || token !== sessionToken) {
    return ${params[1]?.name || 'res'}.status(403).json({ error: 'Invalid CSRF token' });
  }
  
  // Original function logic continues here
  const { amount, toAccount } = ${params[0]?.name || 'req'}.body;
  // ... rest of the function
}

// OPTION B: Using csurf middleware (recommended)
import csrf from 'csurf';

// Setup CSRF protection
const csrfProtection = csrf({ cookie: true });

// Apply to route
router.post('/transfer', csrfProtection, ${funcName});

// In the refactored function, CSRF is already validated
function ${funcName}(req, res) {
  // CSRF token is already validated by middleware
  const { amount, toAccount } = req.body;
  // ... process transfer
}`
      }
    });

    // ============================================
    // 3. CRYPTOGRAPHY
    // ============================================
    
    // Weak Encryption
    this.templates.set('weak-encryption', {
      id: 'weak-encryption',
      category: 'crypto',
      patterns: [/weak.*encryption/i, /des\s|md5|sha1/i, /insecure.*crypto/i],
      severity: 'critical',
      generateFix: (ctx) => {
        const funcName = ctx.functionName || 'encryptData';
        const params = ctx.parameters || [{ name: 'data' }, { name: 'key' }];
        
        return `// Strong Encryption - Two Options

// OPTION A: Drop-in replacement (maintains same function signature)
function ${funcName}(${params.map(p => p.name).join(', ')}) {
  const crypto = require('crypto');
  
  // Replace weak algorithm with strong one
  const algorithm = 'aes-256-gcm'; // Instead of DES or 3DES
  const iv = crypto.randomBytes(16);
  const salt = crypto.randomBytes(32);
  
  // Derive key properly
  const key = crypto.pbkdf2Sync(${params[1]?.name || 'key'}, salt, 100000, 32, 'sha256');
  
  // Create cipher with strong algorithm
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(${params[0]?.name || 'data'}, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Return encrypted data with IV and auth tag
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    salt: salt.toString('hex')
  };
}

// OPTION B: Using a high-level crypto library
import { encrypt, decrypt } from '@aws-crypto/client-node';

async function ${funcName}Secure(data: string, password: string) {
  const { result, messageHeader } = await encrypt(
    keyring,
    data,
    { encryptionContext: { purpose: 'data-encryption' } }
  );
  
  return result;
}`
      }
    });

    // Hardcoded Secrets
    this.templates.set('hardcoded-secrets', {
      id: 'hardcoded-secrets',
      category: 'crypto',
      patterns: [/hardcoded.*secret/i, /api.*key.*=.*["']/i, /password.*=.*["']/i],
      severity: 'critical',
      generateFix: (ctx) => {
        const funcName = ctx.functionName || 'connectToAPI';
        
        return `// Remove Hardcoded Secrets - Two Options

// OPTION A: Drop-in replacement using environment variables
function ${funcName}() {
  // Move secrets to environment variables
  const apiKey = process.env.API_KEY;
  const dbPassword = process.env.DB_PASSWORD;
  
  if (!apiKey) {
    throw new Error('API_KEY environment variable not set');
  }
  
  // Use the environment variable instead of hardcoded value
  return connectWithKey(apiKey);
}

// OPTION B: Using a secrets manager (production-ready)
import { SecretsManager } from '@aws-sdk/client-secrets-manager';

async function ${funcName}Secure() {
  const client = new SecretsManager({ region: 'us-east-1' });
  
  try {
    const response = await client.getSecretValue({ SecretId: 'api-credentials' });
    const secrets = JSON.parse(response.SecretString);
    
    return connectWithKey(secrets.apiKey);
  } catch (error) {
    throw new Error('Failed to retrieve secrets');
  }
}

// Setup instructions:
// 1. Create .env file (never commit!):
//    API_KEY=your-actual-key-here
//    DB_PASSWORD=your-password-here
// 2. Add .env to .gitignore
// 3. Use dotenv: require('dotenv').config()`
      }
    });

    // ============================================
    // 4. DATA EXPOSURE
    // ============================================
    
    // Sensitive Data in Logs
    this.templates.set('sensitive-data-logs', {
      id: 'sensitive-data-logs',
      category: 'data-exposure',
      patterns: [/password.*log/i, /sensitive.*log/i, /console\.log.*password/i],
      severity: 'high',
      generateFix: (ctx) => {
        const funcName = ctx.functionName || 'logLoginAttempt';
        const params = ctx.parameters || [{ name: 'email' }, { name: 'password' }, { name: 'success' }];
        
        return `// Safe Logging - Two Options

// OPTION A: Drop-in replacement (maintains same function signature)
function ${funcName}(${params.map(p => p.name).join(', ')}) {
  // Never log sensitive data - mask or omit it
  console.log(\`Login attempt - Email: \${${params[0]?.name || 'email'}}, Success: \${${params[2]?.name || 'success'}}\`);
  // Removed password from logs
  
  // For structured logging
  logger.info('User login', { 
    email: ${params[0]?.name || 'email'},
    // password: '[REDACTED]', // Never log actual password
    success: ${params[2]?.name || 'success'},
    timestamp: Date.now()
  });
}

// OPTION B: With automatic sanitization
function ${funcName}Safe(email: string, password: string, success: boolean) {
  // Define sensitive fields
  const sanitize = (obj: any) => {
    const safe = { ...obj };
    const sensitiveKeys = ['password', 'token', 'apiKey', 'secret'];
    
    for (const key in safe) {
      if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
        safe[key] = '[REDACTED]';
      }
    }
    return safe;
  };
  
  const logData = sanitize({ email, password, success });
  logger.info('Login attempt', logData);
}`
      }
    });

    // Error Information Disclosure
    this.templates.set('error-disclosure', {
      id: 'error-disclosure',
      category: 'data-exposure',
      patterns: [/stack.*trace/i, /error.*disclosure/i, /res\.json.*stack/i],
      severity: 'medium',
      generateFix: (ctx) => {
        const funcName = ctx.functionName || 'errorHandler';
        const params = ctx.parameters || [{ name: 'err' }, { name: 'req' }, { name: 'res' }, { name: 'next' }];
        
        return `// Secure Error Handling - Two Options

// OPTION A: Drop-in replacement (maintains same function signature)
function ${funcName}(${params.map(p => p.name).join(', ')}) {
  // Log full error internally (not sent to client)
  console.error('Internal error:', {
    message: ${params[0]?.name || 'err'}.message,
    stack: ${params[0]?.name || 'err'}.stack,
    url: ${params[1]?.name || 'req'}?.url,
    timestamp: new Date().toISOString()
  });
  
  // Send safe error response to client
  const isDev = process.env.NODE_ENV === 'development';
  
  ${params[2]?.name || 'res'}.status(500).json({
    error: isDev ? ${params[0]?.name || 'err'}.message : 'An error occurred',
    // Only include stack in development
    ...(isDev && { stack: ${params[0]?.name || 'err'}.stack })
  });
}

// OPTION B: With custom error classes
class AppError extends Error {
  constructor(message: string, public statusCode = 500, public isOperational = true) {
    super(message);
  }
}

function ${funcName}Enhanced(err, req, res, next) {
  const { message, stack } = err;
  const statusCode = err.statusCode || 500;
  
  // Log internally
  logger.error({ message, stack, url: req.url });
  
  // Client response
  res.status(statusCode).json({
    error: {
      message: err.isOperational ? message : 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack })
    }
  });
}`
      }
    });

    // ============================================
    // 5. COMMON PATTERNS
    // ============================================
    
    // Email Validation
    this.templates.set('email-validation', {
      id: 'email-validation',
      category: 'input-validation',
      patterns: [/email.*validation/i, /invalid.*email/i, /email.*format/i],
      severity: 'medium',
      generateFix: (ctx) => {
        const funcName = ctx.functionName || 'validateUserInput';
        const params = ctx.parameters || [{ name: 'email' }, { name: 'name' }];
        
        return `// Email Validation - Two Options

// OPTION A: Drop-in replacement (maintains same function signature)
function ${funcName}(${params.map(p => p.name).join(', ')}) {
  const email = ${params[0]?.name || 'email'};
  
  // Add email validation
  if (!email) {
    throw new Error('Email is required');
  }
  
  // Basic email regex (RFC 5322 simplified)
  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }
  
  // Original function logic continues
  return { email, name: ${params[1]?.name || 'name'} };
}

// OPTION B: Comprehensive validation
function ${funcName}Enhanced(email: string, name: string) {
  // Trim and lowercase
  email = email?.trim().toLowerCase();
  
  if (!email) {
    throw new Error('Email is required');
  }
  
  // Length check
  if (email.length < 3 || email.length > 254) {
    throw new Error('Email must be between 3 and 254 characters');
  }
  
  // RFC 5322 compliant regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\\/=?^_\`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }
  
  // Check for disposable emails (optional)
  const disposableDomains = ['tempmail.com', 'throwaway.email'];
  const domain = email.split('@')[1];
  
  if (disposableDomains.includes(domain)) {
    throw new Error('Disposable email addresses not allowed');
  }
  
  return { email, name };
}`
      }
    });

    // File Upload Validation
    this.templates.set('file-upload-validation', {
      id: 'file-upload-validation',
      category: 'input-validation',
      patterns: [/file.*upload/i, /upload.*validation/i, /insecure.*upload/i],
      severity: 'high',
      generateFix: (ctx) => {
        const funcName = ctx.functionName || 'handleFileUpload';
        const params = ctx.parameters || [{ name: 'req' }, { name: 'res' }];
        
        // Check if this is a router.post pattern
        const isRouterPattern = funcName.startsWith('handle');
        
        return `// File Upload Security - Two Options

// OPTION A: Drop-in replacement (adds validation to existing function)
router.post('/upload', (${params.map(p => p.name).join(', ')}) => {
  const file = ${params[0]?.name || 'req'}.files?.upload || ${params[0]?.name || 'req'}.file;
  
  // Add validation
  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  // Check file size (5MB limit)
  if (file.size > 5 * 1024 * 1024) {
    fs.unlinkSync(file.path); // Clean up
    return res.status(400).json({ error: 'File too large' });
  }
  
  // Check file extension
  const allowedExts = ['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (!allowedExts.includes(ext)) {
    fs.unlinkSync(file.path); // Clean up
    return res.status(400).json({ error: 'File type not allowed' });
  }
  
  // Check MIME type
  const allowedMimes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (!allowedMimes.includes(file.mimetype)) {
    fs.unlinkSync(file.path); // Clean up
    return res.status(400).json({ error: 'Invalid file type' });
  }
  
  // Safe filename
  const safeFilename = Date.now() + '-' + crypto.randomBytes(6).toString('hex') + ext;
  const safePath = path.join('./uploads', safeFilename);
  
  // Move file to safe location (preserving original method if available)
  if (file.mv) {
    // express-fileupload style
    file.mv(safePath, (err) => {
      if (err) return ${params[1]?.name || 'res'}.status(500).json({ error: 'Failed to save file' });
      ${params[1]?.name || 'res'}.json({ filename: safeFilename });
    });
  } else if (file.path) {
    // multer style
    fs.renameSync(file.path, safePath);
    ${params[1]?.name || 'res'}.json({ filename: safeFilename });
  }
});

// OPTION B: With file type verification (more secure)
import fileType from 'file-type';
import { v4 as uuidv4 } from 'uuid';

async function handleSecureUpload(req, res) {
  const file = req.file;
  
  // Verify actual file type (not just extension)
  const type = await fileType.fromBuffer(file.buffer);
  
  if (!type || !['image/jpeg', 'image/png', 'application/pdf'].includes(type.mime)) {
    return res.status(400).json({ error: 'Invalid file content' });
  }
  
  // Generate safe filename
  const filename = uuidv4() + '.' + type.ext;
  const uploadPath = path.join('./uploads', filename);
  
  // Save with restricted permissions
  await fs.promises.writeFile(uploadPath, file.buffer, { mode: 0o644 });
  
  res.json({ filename });
}`
      }
    });

    // Path Traversal
    this.templates.set('path-traversal', {
      id: 'path-traversal',
      category: 'input-validation',
      patterns: [/path.*traversal/i, /directory.*traversal/i, /\.\..*\//i],
      severity: 'high',
      generateFix: (ctx) => {
        const funcName = ctx.functionName || 'serveFile';
        const params = ctx.parameters || [{ name: 'filename' }];
        
        return `// Path Traversal Prevention - Two Options

// OPTION A: Drop-in replacement (maintains same function signature)
app.get('/api/file/:filename', (req, res) => {
  const filename = req.params.filename;
  
  // Prevent path traversal
  const safeName = path.basename(filename); // Removes any directory components
  
  // Remove any remaining dangerous patterns
  if (safeName.includes('..') || safeName.includes('/') || safeName.includes('\\\\')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  
  // Use safe base directory
  const basePath = path.resolve('./data');
  const filePath = path.join(basePath, safeName);
  
  // Ensure the resolved path is within base directory
  if (!filePath.startsWith(basePath)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  // Check if file exists and is a file (not directory)
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  res.sendFile(filePath);
});

// OPTION B: Using a whitelist approach (most secure)
function serveFileSecure(req, res) {
  const requestedFile = req.params.filename;
  
  // Maintain a whitelist of allowed files
  const allowedFiles = [
    'report.pdf',
    'summary.txt',
    'data.json'
  ];
  
  if (!allowedFiles.includes(requestedFile)) {
    return res.status(403).json({ error: 'File not allowed' });
  }
  
  const filePath = path.join('./public-files', requestedFile);
  res.sendFile(filePath);
}`
      }
    });
  }

  /**
   * Match an issue to the best security template
   */
  public getTemplateMatch(issue: any, language: string): any {
    const text = `${issue.title || ''} ${issue.message || ''} ${issue.description || ''}`.toLowerCase();
    
    let bestMatch: any = null;
    let highestConfidence = 0;

    // Check each security template
    for (const [templateId, template] of this.templates) {
      for (const pattern of template.patterns) {
        if (pattern.test(text)) {
          const confidence = this.calculateConfidence(text, pattern, issue);
          
          if (confidence > highestConfidence) {
            highestConfidence = confidence;
            bestMatch = {
              pattern: templateId,
              confidence,
              template: {
                code: template.generateFix({
                  functionName: this.extractFunctionName(issue.codeSnippet),
                  variables: this.extractVariables(issue.codeSnippet),
                  parameters: this.extractParameters(issue.codeSnippet),
                  language
                }),
                explanation: `Security fix for ${template.category}: ${issue.title || issue.message}
                
⚠️ **Important**: Option A is a drop-in replacement that maintains your existing function signature. 
Option B requires updating all callers but provides better security.`,
                confidence: confidence > 0.8 ? 'high' : confidence > 0.5 ? 'medium' : 'low',
                estimatedMinutes: 10
              }
            };
          }
        }
      }
    }

    return bestMatch;
  }

  private extractParameters(code?: string): any[] {
    if (!code) return [];
    
    // Extract function parameters - handle both JS and TS
    const funcMatch = code.match(/function\s+\w+\s*\(([^)]*)\)|const\s+\w+\s*=.*?\(([^)]*)\)|async\s+function\s+\w+\s*\(([^)]*)\)/);
    if (funcMatch) {
      const paramsStr = funcMatch[1] || funcMatch[2] || funcMatch[3];
      if (paramsStr) {
        return paramsStr.split(',').map(p => {
          // Remove type annotations for the name extraction
          const cleanParam = p.trim();
          const colonIndex = cleanParam.indexOf(':');
          
          if (colonIndex > -1) {
            // TypeScript parameter with type
            return {
              name: cleanParam.substring(0, colonIndex).trim(),
              type: cleanParam.substring(colonIndex + 1).trim()
            };
          } else {
            // JavaScript parameter without type
            return {
              name: cleanParam,
              type: 'any'
            };
          }
        });
      }
    }
    
    return [];
  }

  private calculateConfidence(text: string, pattern: RegExp, issue: any): number {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence based on severity
    if (issue.severity === 'critical') confidence += 0.2;
    else if (issue.severity === 'high') confidence += 0.15;
    else if (issue.severity === 'medium') confidence += 0.1;
    
    // Increase confidence if pattern matches multiple times
    const matches = text.match(pattern);
    if (matches && matches.length > 1) confidence += 0.1;
    
    // Increase confidence if we have code snippet
    if (issue.codeSnippet) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  private extractFunctionName(code?: string): string {
    if (!code) return 'processData';
    
    // Try to extract function name from code - handle various patterns
    // Match: function getUserByEmail(...), async function findUser(...), const processData = (...) =>
    // Also handle router.post('/upload', (req, res) => pattern
    const patterns = [
      /function\s+(\w+)\s*\(/,           // function name(
      /async\s+function\s+(\w+)\s*\(/,   // async function name(
      /const\s+(\w+)\s*=\s*(?:async\s*)?\(/,  // const name = (  or const name = async (
      /const\s+(\w+)\s*=\s*(?:async\s*)?\w*\s*=>/,  // const name = () => or const name = async () =>
      /def\s+(\w+)\s*\(/,                // Python: def name(
      /func\s+(\w+)\s*\(/,               // Go: func name(
      /public\s+\w+\s+(\w+)\s*\(/,       // Java: public Type name(
      /router\.\w+\('([^']+)'/           // Express route: router.post('/upload'
    ];
    
    for (const pattern of patterns) {
      const match = code.match(pattern);
      if (match) {
        // For router patterns, return a descriptive name based on the route
        if (pattern.source.includes('router')) {
          const route = match[1];
          // Convert /upload to handleUpload, /auth/login to handleAuthLogin
          const routeName = route.split('/').filter(Boolean).map((part, idx) => 
            idx === 0 ? 'handle' + part.charAt(0).toUpperCase() + part.slice(1) : 
            part.charAt(0).toUpperCase() + part.slice(1)
          ).join('');
          return routeName || 'handleRequest';
        }
        return match[1];
      }
    }
    
    // Fallback: try to find any word before parentheses
    const fallbackMatch = code.match(/(\w+)\s*\(/);
    if (fallbackMatch) {
      return fallbackMatch[1];
    }
    
    return 'processData';
  }

  private extractVariables(code?: string): string[] {
    if (!code) return [];
    
    // Extract variable names from code
    const varMatches = code.match(/(?:let|const|var)\s+(\w+)|(\w+)\s*=|(\w+)\s*:=/g);
    const variables: string[] = [];
    
    if (varMatches) {
      varMatches.forEach(match => {
        const varMatch = match.match(/(?:let|const|var)\s+(\w+)|(\w+)\s*=|(\w+)\s*:=/);
        if (varMatch) {
          const varName = varMatch[1] || varMatch[2] || varMatch[3];
          if (varName && !variables.includes(varName)) {
            variables.push(varName);
          }
        }
      });
    }
    
    return variables;
  }

  /**
   * Find and apply the best matching template
   */
  findTemplate(issue: Issue): SecurityTemplate | null {
    const searchText = `${issue.title} ${issue.message} ${issue.description}`.toLowerCase();
    
    for (const template of this.templates.values()) {
      for (const pattern of template.patterns) {
        if (pattern.test(searchText)) {
          return template;
        }
      }
    }
    
    return null;
  }

  /**
   * Generate fix for an issue
   */
  generateFix(issue: Issue): { code: string; confidence: string; time: number } | null {
    const template = this.findTemplate(issue);
    
    if (!template) {
      return null;
    }
    
    const context = this.extractContext(issue);
    const code = template.generateFix(context);
    
    return {
      code,
      confidence: 'high',
      time: template.severity === 'critical' ? 15 : 10
    };
  }

  /**
   * Extract context from issue
   */
  private extractContext(issue: Issue): any {
    const context: any = {
      functionName: null,
      parameters: [],
      variables: []
    };
    
    if (issue.codeSnippet) {
      // Extract function name
      const funcMatch = issue.codeSnippet.match(/function\s+(\w+)/);
      if (funcMatch) {
        context.functionName = funcMatch[1];
      }
      
      // Extract parameters
      const paramMatch = issue.codeSnippet.match(/\(([^)]*)\)/);
      if (paramMatch) {
        context.parameters = paramMatch[1].split(',').map(p => p.trim());
      }
    }
    
    return context;
  }
}

export const securityTemplateLibrary = new SecurityTemplateLibrary();