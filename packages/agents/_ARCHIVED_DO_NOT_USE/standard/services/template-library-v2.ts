/**
 * Enhanced Template Library V2 with Better Context-Aware Fixes
 * Provides complete function replacements with copy-paste ready code
 */

import { Issue } from '../types/analysis-types';

export interface ExtractedContext {
  functionName?: string;
  primaryVariable?: string;
  parameters: Array<{
    name: string;
    type?: string;
  }>;
  variables: string[];
  returnType?: string;
  isAsync?: boolean;
  surroundingCode: string;
}

export interface FixTemplate {
  code: string;
  explanation: string;
  confidence: 'high' | 'medium' | 'low';
  estimatedMinutes: number;
}

export interface TemplateMatch {
  templateId: string;
  confidence: number;
  context: ExtractedContext;
}

export class EnhancedTemplateLibrary {
  private static instance: EnhancedTemplateLibrary;
  
  static getInstance(): EnhancedTemplateLibrary {
    if (!this.instance) {
      this.instance = new EnhancedTemplateLibrary();
    }
    return this.instance;
  }

  /**
   * Extract context from code snippet
   */
  extractContext(codeSnippet: string, issue: Issue): ExtractedContext {
    const context: ExtractedContext = {
      parameters: [],
      variables: [],
      surroundingCode: codeSnippet
    };

    // Extract function name
    const funcMatch = codeSnippet.match(/function\s+(\w+)|const\s+(\w+)\s*=.*=>|(\w+)\s*\(/);
    if (funcMatch) {
      context.functionName = funcMatch[1] || funcMatch[2] || funcMatch[3];
    }

    // Extract parameters
    const paramMatch = codeSnippet.match(/\(([^)]*)\)/);
    if (paramMatch) {
      const params = paramMatch[1].split(',').map(p => p.trim());
      context.parameters = params.filter(p => p).map(p => {
        const parts = p.split(':').map(s => s.trim());
        return { name: parts[0], type: parts[1] };
      });
    }

    // Extract variables
    const varMatches = codeSnippet.matchAll(/(?:const|let|var)\s+(\w+)/g);
    for (const match of varMatches) {
      context.variables.push(match[1]);
    }

    // Determine primary variable from issue context
    if (context.parameters.length > 0) {
      context.primaryVariable = context.parameters[0].name;
    } else if (context.variables.length > 0) {
      context.primaryVariable = context.variables[0];
    }

    // Check if async
    context.isAsync = codeSnippet.includes('async') || codeSnippet.includes('await');

    return context;
  }

  /**
   * Generate fix for payment validation
   */
  generatePaymentValidationFix(issue: Issue, context: ExtractedContext): FixTemplate {
    const funcName = context.functionName || 'processPayment';
    const params = context.parameters.length > 0 
      ? context.parameters.map(p => p.name).join(', ')
      : 'amount, userId';
    
    const hasAmount = params.includes('amount');
    const hasUserId = params.includes('userId');
    
    return {
      code: `// Complete replacement function with payment validation
function ${funcName}(${params}) {
  // Amount validation
  ${hasAmount ? '' : '// Note: Add "amount" parameter to function signature\n  '}if (amount === undefined || amount === null) {
    throw new Error('Payment amount is required');
  }
  
  // Type validation
  if (typeof amount !== 'number' || isNaN(amount)) {
    throw new Error('Payment amount must be a valid number');
  }
  
  // Range validation (adjust limits based on your business rules)
  const MIN_AMOUNT = 0.01;
  const MAX_AMOUNT = 10000.00;
  
  if (amount < MIN_AMOUNT) {
    throw new Error(\`Payment amount must be at least $\${MIN_AMOUNT.toFixed(2)}\`);
  }
  
  if (amount > MAX_AMOUNT) {
    throw new Error(\`Payment amount cannot exceed $\${MAX_AMOUNT.toFixed(2)}\`);
  }
  
  // Decimal precision validation (important for currency)
  const decimalPlaces = (amount.toString().split('.')[1] || '').length;
  if (decimalPlaces > 2) {
    throw new Error('Payment amount cannot have more than 2 decimal places');
  }
  
  ${hasUserId ? `// User ID validation
  if (!userId) {
    throw new Error('User ID is required for payment processing');
  }
  
  if (typeof userId !== 'string' && typeof userId !== 'number') {
    throw new Error('User ID must be a string or number');
  }
  ` : ''}
  // Process the validated payment
  try {
    // Log for audit trail
    console.log(\`Processing payment of $\${amount.toFixed(2)}${hasUserId ? ` for user \${userId}` : ''}\`);
    
    // Call your payment processor
    // Replace this with your actual payment processing logic
    return stripe.charge(${hasUserId ? 'userId, ' : ''}amount);
    
  } catch (error) {
    console.error('Payment processing failed:', error);
    throw new Error('Payment processing failed. Please try again later.');
  }
}

// Alternative: Using a validation library (e.g., Joi, Zod)
import { z } from 'zod';

const PaymentSchema = z.object({
  amount: z.number()
    .min(0.01, 'Amount must be at least $0.01')
    .max(10000, 'Amount cannot exceed $10,000')
    .refine(val => (val * 100) % 1 === 0, 'Amount must have at most 2 decimal places'),
  userId: z.string().min(1, 'User ID is required')
});

function ${funcName}Validated(${params}) {
  const validated = PaymentSchema.parse({ amount${hasUserId ? ', userId' : ''} });
  return stripe.charge(validated.userId, validated.amount);
}`,
      explanation: 'Complete payment validation with range checks, type validation, and decimal precision',
      confidence: 'high',
      estimatedMinutes: 10
    };
  }

  /**
   * Generate fix for null checks with complete function replacement
   */
  generateNullCheckFix(issue: Issue, context: ExtractedContext): FixTemplate {
    const funcName = context.functionName || 'getUserEmail';
    const mainParam = context.parameters[0]?.name || 'user';
    const params = context.parameters.length > 0 
      ? context.parameters.map(p => p.name).join(', ')
      : mainParam;
    
    // Detect what property is being accessed
    const propertyMatch = issue.codeSnippet?.match(/(\w+)\.(\w+)(?:\.(\w+))?/);
    const hasNestedAccess = propertyMatch !== null;
    const propertyPath = propertyMatch 
      ? propertyMatch[0] 
      : `${mainParam}.profile.email`;
    
    return {
      code: `// Complete replacement function with null safety
function ${funcName}(${params}) {
  // Check if ${mainParam} is null or undefined
  if (${mainParam} === null || ${mainParam} === undefined) {
    // Option 1: Return undefined for missing data (recommended)
    return undefined;
    
    // Option 2: Return a default value
    // return '';
    // return 'default@example.com';
    
    // Option 3: Throw a descriptive error
    // throw new Error('${mainParam} is required for ${funcName}');
  }
  
  ${hasNestedAccess ? `// Safe nested property access using optional chaining
  // This automatically handles null/undefined at any level
  return ${propertyPath.replace(/\./g, '?.')};
  
  // Alternative implementations:
  
  // 1. With a default value using nullish coalescing
  // return ${propertyPath.replace(/\./g, '?.')} ?? '';
  
  // 2. With type narrowing and validation
  // if ('profile' in ${mainParam} && ${mainParam}.profile) {
  //   if ('email' in ${mainParam}.profile && ${mainParam}.profile.email) {
  //     return ${mainParam}.profile.email;
  //   }
  // }
  // return undefined;
  
  // 3. With explicit error handling for missing properties
  // if (!${mainParam}.profile) {
  //   console.warn('User profile is missing');
  //   return undefined;
  // }
  // if (!${mainParam}.profile.email) {
  //   console.warn('User email is missing');
  //   return undefined;
  // }
  // return ${mainParam}.profile.email;` : `// Safe property access
  return ${mainParam}?.value;`}
}

// TypeScript version with proper typing
interface UserProfile {
  email?: string;
  name?: string;
  phone?: string;
}

interface User {
  id: string | number;
  profile?: UserProfile;
  [key: string]: any;
}

// Type-safe version with explicit return type
function ${funcName}Safe(${mainParam}: User | null | undefined): string | undefined {
  return ${mainParam}?.profile?.email;
}

// Version with default value
function ${funcName}WithDefault(${mainParam}: User | null | undefined): string {
  return ${mainParam}?.profile?.email ?? 'no-email@example.com';
}

// Version with validation and error messages
function ${funcName}Validated(${mainParam}: User | null | undefined): string {
  if (!${mainParam}) {
    throw new Error('User object is required');
  }
  if (!${mainParam}.profile) {
    throw new Error('User profile is missing');
  }
  if (!${mainParam}.profile.email) {
    throw new Error('User email is required');
  }
  return ${mainParam}.profile.email;
}`,
      explanation: `Complete replacement for ${funcName} with multiple null safety approaches. Choose the implementation that best fits your error handling strategy.`,
      confidence: 'high',
      estimatedMinutes: 5
    };
  }

  /**
   * Generate fix for any issue based on pattern matching
   */
  generateFix(issue: Issue): FixTemplate | null {
    const context = this.extractContext(issue.codeSnippet || '', issue);
    
    // Check for payment validation
    if (issue.message?.toLowerCase().includes('payment') || 
        issue.message?.toLowerCase().includes('amount') ||
        issue.title?.toLowerCase().includes('payment')) {
      return this.generatePaymentValidationFix(issue, context);
    }
    
    // Check for null checks
    if (issue.message?.toLowerCase().includes('null') ||
        issue.message?.toLowerCase().includes('undefined') ||
        issue.title?.toLowerCase().includes('null')) {
      return this.generateNullCheckFix(issue, context);
    }
    
    // Check for SQL injection
    if (issue.message?.toLowerCase().includes('sql') ||
        issue.title?.toLowerCase().includes('sql') ||
        issue.codeSnippet?.includes('SELECT')) {
      return this.generateSQLInjectionFix(issue, context);
    }
    
    // Check for XSS
    if (issue.message?.toLowerCase().includes('xss') ||
        issue.message?.toLowerCase().includes('script') ||
        issue.codeSnippet?.includes('innerHTML')) {
      return this.generateXSSFix(issue, context);
    }
    
    // Check for auth
    if (issue.message?.toLowerCase().includes('auth') ||
        issue.message?.toLowerCase().includes('permission') ||
        issue.title?.toLowerCase().includes('auth')) {
      return this.generateAuthFix(issue, context);
    }
    
    // Check for error handling
    if (issue.message?.toLowerCase().includes('error') ||
        issue.message?.toLowerCase().includes('catch') ||
        issue.message?.toLowerCase().includes('unhandled')) {
      return this.generateErrorHandlingFix(issue, context);
    }
    
    return null;
  }

  /**
   * Generate SQL injection fix
   */
  private generateSQLInjectionFix(issue: Issue, context: ExtractedContext): FixTemplate {
    const funcName = context.functionName || 'executeQuery';
    const params = context.parameters.map(p => p.name).join(', ') || 'userId, status';
    
    return {
      code: `// SQL Injection Prevention - Complete Function Replacement
function ${funcName}(${params}) {
  // NEVER concatenate user input into SQL strings!
  
  // Option 1: Parameterized queries (recommended)
  const query = 'SELECT * FROM users WHERE id = ? AND status = ?';
  const values = [userId, status];
  
  try {
    const result = await db.query(query, values);
    return result;
  } catch (error) {
    console.error('Database query failed:', error);
    throw new Error('Failed to fetch user data');
  }
}

// Option 2: Using query builder (e.g., Knex.js)
async function ${funcName}Safe(${params}) {
  return await db('users')
    .select('*')
    .where('id', userId)
    .where('status', status);
}

// Option 3: Using an ORM (e.g., Prisma)
async function ${funcName}ORM(${params}) {
  return await prisma.user.findMany({
    where: {
      id: userId,
      status: status
    }
  });
}

// Option 4: Stored procedures
async function ${funcName}SP(${params}) {
  return await db.callProcedure('GetUserByIdAndStatus', [userId, status]);
}`,
      explanation: 'Parameterized queries prevent SQL injection by separating SQL logic from data',
      confidence: 'high',
      estimatedMinutes: 15
    };
  }

  /**
   * Generate XSS prevention fix
   */
  private generateXSSFix(issue: Issue, context: ExtractedContext): FixTemplate {
    const funcName = context.functionName || 'renderContent';
    const variable = context.primaryVariable || 'userInput';
    
    return {
      code: `// XSS Prevention - Complete Function Replacement
import DOMPurify from 'dompurify';

function ${funcName}(${variable}) {
  const element = document.getElementById('content');
  
  // Option 1: Use textContent for plain text (safest)
  element.textContent = ${variable};
  
  // Option 2: Sanitize HTML if you need formatting
  // const sanitized = DOMPurify.sanitize(${variable});
  // element.innerHTML = sanitized;
  
  // Option 3: Manual escaping for simple cases
  // function escapeHtml(text) {
  //   const div = document.createElement('div');
  //   div.textContent = text;
  //   return div.innerHTML;
  // }
  // element.innerHTML = escapeHtml(${variable});
}

// React/JSX version (automatically escapes)
function ${funcName}React({ ${variable} }) {
  return <div>{${variable}}</div>; // Auto-escaped by React
}

// Vue.js version (use v-text or {{ }})
// <div v-text="${variable}"></div>
// <div>{{ ${variable} }}</div>  // Auto-escaped by Vue

// Complete sanitization function
function sanitizeAndRender(${variable}, elementId) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(\`Element with id "\${elementId}" not found\`);
    return;
  }
  
  // Configure DOMPurify (adjust based on your needs)
  const clean = DOMPurify.sanitize(${variable}, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'title']
  });
  
  element.innerHTML = clean;
}`,
      explanation: 'Prevent XSS by escaping HTML or using safe DOM methods',
      confidence: 'high',
      estimatedMinutes: 10
    };
  }

  /**
   * Generate authentication fix
   */
  private generateAuthFix(issue: Issue, context: ExtractedContext): FixTemplate {
    const route = issue.codeSnippet?.match(/['"]([^'"]+)['"]/)?.[1] || '/api/admin';
    
    return {
      code: `// Authentication Middleware - Complete Implementation
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

interface AuthRequest extends Request {
  user?: any;
}

// Basic authentication middleware
export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }
    
    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded;
    
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Role-based authorization middleware
export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    
    next();
  };
};

// Apply to your routes
app.delete('${route}', 
  authMiddleware,           // First check authentication
  requireRole(['admin']),   // Then check authorization
  async (req, res) => {
    // Your protected logic here
    await deleteUser(req.params.id);
    res.json({ success: true });
  }
);

// Alternative: Using passport.js
import passport from 'passport';

app.delete('${route}',
  passport.authenticate('jwt', { session: false }),
  requireRole(['admin']),
  yourHandler
);`,
      explanation: 'Add authentication and authorization to protect sensitive endpoints',
      confidence: 'high',
      estimatedMinutes: 15
    };
  }

  /**
   * Generate error handling fix
   */
  private generateErrorHandlingFix(issue: Issue, context: ExtractedContext): FixTemplate {
    const funcName = context.functionName || 'fetchData';
    const params = context.parameters.map(p => p.name).join(', ') || 'url';
    const isAsync = context.isAsync || issue.codeSnippet?.includes('await');
    
    return {
      code: `// Error Handling - Complete Function Replacement
${isAsync ? 'async ' : ''}function ${funcName}(${params}) {
  try {
    ${isAsync ? `// Your async operation
    const response = await fetch(url);
    
    // Check response status
    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }
    
    const data = await response.json();
    return data;` : `// Your synchronous operation
    if (!url) {
      throw new Error('URL is required');
    }
    
    // Your logic here
    const result = processData(url);
    return result;`}
    
  } catch (error) {
    // Log the error for debugging
    console.error(\`${funcName} failed:\`, error);
    
    // Handle specific error types
    if (error instanceof TypeError) {
      throw new Error('Network error or invalid URL');
    }
    
    if (error instanceof SyntaxError) {
      throw new Error('Invalid JSON response');
    }
    
    if (error.status === 404) {
      throw new Error('Resource not found');
    }
    
    if (error.status === 401) {
      throw new Error('Authentication required');
    }
    
    // Re-throw with context
    throw new Error(\`Failed to execute ${funcName}: \${error.message}\`);
  }
}

// With retry logic
${isAsync ? 'async ' : ''}function ${funcName}WithRetry(${params}, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return ${isAsync ? 'await ' : ''}${funcName}(${params});
    } catch (error) {
      lastError = error;
      console.log(\`Attempt \${attempt} failed, retrying...\`);
      
      // Exponential backoff
      if (attempt < maxRetries) {
        ${isAsync ? 'await ' : ''}new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }
  
  throw lastError;
}

// Global error handler for Express
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', error);
  
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});`,
      explanation: 'Comprehensive error handling with logging, specific error types, and retry logic',
      confidence: 'high',
      estimatedMinutes: 10
    };
  }
}

// Export singleton instance
export const enhancedTemplateLibrary = EnhancedTemplateLibrary.getInstance();