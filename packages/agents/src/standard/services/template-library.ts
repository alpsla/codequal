/**
 * Template Library for Fix Suggestion System
 * 
 * This file contains P0 (Priority 0) fix templates for the most critical security
 * and quality issues. Templates are based on OWASP Top 10, SonarQube rules, and ESLint rules.
 * 
 * @module TemplateLibrary
 * @version 1.0.0
 * @author CodeQual Team
 * @date 2025-08-27
 */

import { Issue } from '../types/analysis-types';
import { ExtractedContext } from './code-context-extractor';

export interface FixTemplate {
  code: string;
  explanation: string;
  confidence: 'high' | 'medium' | 'low';
  estimatedMinutes: number;
}

export interface TemplateMatch {
  pattern: string;
  confidence: number;
  template: FixTemplate | null;
}

export type LanguageTemplate = (context: ExtractedContext, issue: Issue) => FixTemplate;

export interface TemplateCategory {
  id: string;
  name: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  patterns: RegExp[];
  languages: Record<string, LanguageTemplate>;
  estimatedMinutes: number;
  description: string;
  examples?: string[];
}

/**
 * Template Library class that manages all fix templates
 */
export class TemplateLibrary {
  private templates: Map<string, TemplateCategory> = new Map();
  private patternCache: Map<string, string> = new Map();

  constructor() {
    this.initializeP0Templates();
    // Initialize security template library for security issues
    this.securityTemplateLibrary = null;
  }

  /**
   * Initialize Priority 0 (P0) templates - Most critical security and quality issues
   */
  private initializeP0Templates(): void {
    // 1. SQL Injection Prevention
    this.registerTemplate({
      id: 'sql-injection',
      name: 'SQL Injection Prevention',
      priority: 'P0',
      patterns: [
        /sql\s*injection/i,
        /injection\s*vulnerability/i,
        /unsanitized\s*sql/i,
        /string\s*concatenation.*sql/i,
        /dynamic\s*sql/i
      ],
      estimatedMinutes: 15,
      description: 'Prevents SQL injection attacks by using parameterized queries',
      examples: ['SELECT * FROM users WHERE id = ' + 'userId'],
      languages: {
        typescript: (context, issue) => {
          const vars = context.variables.length > 0 ? context.variables : ['userId', 'userInput'];
          const tableName = this.extractTableName(context.surroundingCode) || 'users';
          
          return {
            code: `// Use parameterized queries to prevent SQL injection
const query = 'SELECT * FROM ${tableName} WHERE id = ? AND status = ?';
const params = [${vars[0]}, ${vars[1] || "'active'"}];
const result = await db.query(query, params);

// For complex queries, use query builders
const result = await db
  .select('*')
  .from('${tableName}')
  .where('id', ${vars[0]})
  .where('status', ${vars[1] || "'active'"});`,
            explanation: `Replace string concatenation with parameterized queries to prevent SQL injection. Variables ${vars.join(', ')} are now safely passed as parameters.`,
            confidence: context.variables.length > 0 ? 'high' : 'medium',
            estimatedMinutes: 15
          };
        },
        
        javascript: (context, issue) => {
          const vars = context.variables.length > 0 ? context.variables : ['userId', 'userInput'];
          return {
            code: `// Use parameterized queries (mysql2 example)
const query = 'SELECT * FROM users WHERE id = ? AND status = ?';
const [rows] = await connection.execute(query, [${vars[0]}, ${vars[1] || "'active'"}]);

// For MongoDB
const result = await collection.find({
  userId: sanitize(${vars[0]}),
  status: ${vars[1] || "'active'"}
});`,
            explanation: 'Parameterized queries prevent SQL injection by separating data from code',
            confidence: 'high',
            estimatedMinutes: 15
          };
        },
        
        python: (context, issue) => {
          const vars = context.variables.length > 0 ? context.variables : ['user_id', 'user_input'];
          return {
            code: `# Use parameterized queries
query = "SELECT * FROM users WHERE id = %s AND status = %s"
params = (${vars[0]}, ${vars[1] || "'active'"})
cursor.execute(query, params)
result = cursor.fetchall()

# For SQLAlchemy
result = session.query(User).filter(
    User.id == ${vars[0]},
    User.status == ${vars[1] || "'active'"}
).all()`,
            explanation: 'Parameterized queries prevent SQL injection attacks',
            confidence: 'high',
            estimatedMinutes: 15
          };
        },
        
        java: (context, issue) => {
          const vars = context.variables.length > 0 ? context.variables : ['userId', 'userStatus'];
          return {
            code: `// Use PreparedStatement to prevent SQL injection
String query = "SELECT * FROM users WHERE id = ? AND status = ?";
try (PreparedStatement pstmt = connection.prepareStatement(query)) {
    pstmt.setInt(1, ${vars[0]});
    pstmt.setString(2, ${vars[1] || '"active"'});
    
    try (ResultSet rs = pstmt.executeQuery()) {
        while (rs.next()) {
            // Process results
        }
    }
}

// For JPA/Hibernate
TypedQuery<User> query = entityManager.createQuery(
    "SELECT u FROM User u WHERE u.id = :id AND u.status = :status", 
    User.class
);
query.setParameter("id", ${vars[0]});
query.setParameter("status", ${vars[1] || '"active"'});
List<User> results = query.getResultList();`,
            explanation: 'PreparedStatement prevents SQL injection by separating SQL logic from data',
            confidence: 'high',
            estimatedMinutes: 15
          };
        },
        
        go: (context, issue) => {
          const vars = context.variables.length > 0 ? context.variables : ['userID', 'userStatus'];
          return {
            code: `// Use parameterized queries
query := "SELECT * FROM users WHERE id = $1 AND status = $2"
rows, err := db.Query(query, ${vars[0]}, ${vars[1] || '"active"'})
if err != nil {
    return nil, fmt.Errorf("query failed: %w", err)
}
defer rows.Close()

// For sqlx
var users []User
err := db.Select(&users, "SELECT * FROM users WHERE id = $1 AND status = $2", 
    ${vars[0]}, ${vars[1] || '"active"'})
if err != nil {
    return nil, fmt.Errorf("query failed: %w", err)
}`,
            explanation: 'Parameterized queries with numbered placeholders prevent SQL injection',
            confidence: 'high',
            estimatedMinutes: 15
          };
        }
      }
    });

    // 2. XSS (Cross-Site Scripting) Prevention
    this.registerTemplate({
      id: 'xss-prevention',
      name: 'XSS Prevention',
      priority: 'P0',
      patterns: [
        /xss/i,
        /cross[\s-]?site[\s-]?scripting/i,
        /unescaped\s*html/i,
        /innerHTML/i,
        /dangerouslySetInnerHTML/i
      ],
      estimatedMinutes: 10,
      description: 'Prevents XSS attacks by properly escaping user input',
      languages: {
        typescript: (context, issue) => {
          const userInput = context.primaryVariable || 'userInput';
          return {
            code: `// Escape HTML entities to prevent XSS
import DOMPurify from 'dompurify';

// Method 1: Use DOMPurify for sanitization
const sanitizedHTML = DOMPurify.sanitize(${userInput});
element.innerHTML = sanitizedHTML;

// Method 2: Use textContent for plain text
element.textContent = ${userInput}; // Safe, no HTML parsing

// Method 3: Manual escaping for simple cases
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
const safeHTML = escapeHtml(${userInput});`,
            explanation: `Sanitize user input "${userInput}" to prevent XSS attacks`,
            confidence: 'high',
            estimatedMinutes: 10
          };
        },
        
        javascript: (context, issue) => {
          const userInput = context.primaryVariable || 'userInput';
          return {
            code: `// Prevent XSS by escaping user input
// Method 1: Use textContent (safest for plain text)
element.textContent = ${userInput};

// Method 2: Use a sanitization library
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(${userInput});
element.innerHTML = clean;

// Method 3: Manual escaping function
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}
element.innerHTML = escapeHtml(${userInput});`,
            explanation: 'Escape or sanitize user input to prevent XSS attacks',
            confidence: 'high',
            estimatedMinutes: 10
          };
        },
        
        python: (context, issue) => {
          const userInput = context.primaryVariable || 'user_input';
          return {
            code: `# Prevent XSS in web templates
import html
from markupsafe import Markup, escape

# Method 1: Use html.escape() for basic escaping
safe_content = html.escape(${userInput})

# Method 2: Use MarkupSafe for Jinja2/Flask
safe_content = escape(${userInput})

# Method 3: For Django templates (auto-escapes by default)
# In template: {{ ${userInput} }}  # Auto-escaped
# To mark as safe only when certain: 
# {{ ${userInput}|safe }}  # Use with caution!

# Method 4: Use bleach for allowing some HTML
import bleach
allowed_tags = ['b', 'i', 'u', 'em', 'strong']
safe_content = bleach.clean(${userInput}, tags=allowed_tags)`,
            explanation: 'Properly escape HTML entities to prevent XSS attacks',
            confidence: 'high',
            estimatedMinutes: 10
          };
        },
        
        java: (context, issue) => {
          const userInput = context.primaryVariable || 'userInput';
          return {
            code: `// Prevent XSS attacks
import org.apache.commons.text.StringEscapeUtils;
import org.owasp.encoder.Encode;

// Method 1: OWASP Java Encoder (recommended)
String safeHTML = Encode.forHtml(${userInput});
String safeJS = Encode.forJavaScript(${userInput});
String safeURL = Encode.forUriComponent(${userInput});

// Method 2: Apache Commons Text
String escaped = StringEscapeUtils.escapeHtml4(${userInput});

// Method 3: For JSP pages
// <%@ taglib uri="http://java.sun.com/jsp/jstl/functions" prefix="fn" %>
// <c:out value="\${userInput}" escapeXml="true" />

// Method 4: Spring Security
import org.springframework.web.util.HtmlUtils;
String safe = HtmlUtils.htmlEscape(${userInput});`,
            explanation: 'Use OWASP encoder or proper escaping to prevent XSS',
            confidence: 'high',
            estimatedMinutes: 10
          };
        },
        
        go: (context, issue) => {
          const userInput = context.primaryVariable || 'userInput';
          return {
            code: `// Prevent XSS by escaping HTML
import (
    "html"
    "html/template"
)

// Method 1: Use html.EscapeString
safeHTML := html.EscapeString(${userInput})

// Method 2: Use html/template (auto-escapes)
tmpl := template.Must(template.New("safe").Parse(\`
    <div>{{.UserInput}}</div>
\`))
tmpl.Execute(w, map[string]string{
    "UserInput": ${userInput}, // Automatically escaped
})

// Method 3: For JSON responses
import "encoding/json"
jsonData, _ := json.Marshal(map[string]string{
    "message": ${userInput}, // Automatically escaped in JSON
})`,
            explanation: 'Use html.EscapeString or html/template for XSS prevention',
            confidence: 'high',
            estimatedMinutes: 10
          };
        }
      }
    });

    // 3. Input Validation (including payment validation)
    this.registerTemplate({
      id: 'input-validation',
      name: 'Input Validation',
      priority: 'P0',
      patterns: [
        /missing\s*validation/i,
        /input\s*validation/i,
        /unvalidated\s*input/i,
        /validate\s*user\s*input/i,
        /parameter\s*validation/i,
        /payment.*validation/i,
        /amount.*validation/i
      ],
      estimatedMinutes: 5,
      description: 'Add proper input validation to prevent invalid data',
      languages: {
        typescript: (context, issue) => {
          const variable = context.primaryVariable || context.parameters[0]?.name || 'input';
          const paramType = context.parameters.find(p => p.name === variable)?.type;
          
          // Special handling for payment/amount validation
          if (variable === 'amount' || issue.message?.toLowerCase().includes('payment')) {
            return {
              code: this.generatePaymentValidation(context, issue),
              explanation: 'Add payment amount validation with proper checks',
              confidence: 'high',
              estimatedMinutes: 10
            };
          }
          
          return {
            code: this.generateTypeScriptValidation(variable, paramType),
            explanation: `Add comprehensive validation for ${variable} to ensure data integrity`,
            confidence: paramType ? 'high' : 'medium',
            estimatedMinutes: 5
          };
        },
        
        javascript: (context, issue) => {
          const variable = context.primaryVariable || 'input';
          return {
            code: `// Input validation
if (!${variable}) {
  throw new Error('${variable} is required');
}

// Type validation
if (typeof ${variable} !== 'string') {
  throw new Error('${variable} must be a string');
}

// Length validation
if (${variable}.length < 1 || ${variable}.length > 255) {
  throw new Error('${variable} must be between 1 and 255 characters');
}

// Pattern validation (example: email)
const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
if (!emailRegex.test(${variable})) {
  throw new Error('Invalid email format');
}

// Using validation library (joi example)
const schema = Joi.string().email().required();
const { error } = schema.validate(${variable});
if (error) {
  throw new Error(error.details[0].message);
}`,
            explanation: `Comprehensive validation for ${variable}`,
            confidence: 'high',
            estimatedMinutes: 5
          };
        },
        
        python: (context, issue) => {
          const variable = context.primaryVariable || 'input_data';
          return {
            code: `# Input validation
if not ${variable}:
    raise ValueError(f"${variable} is required")

# Type validation
if not isinstance(${variable}, str):
    raise TypeError(f"${variable} must be a string, got {type(${variable}).__name__}")

# Length validation
if len(${variable}) < 1 or len(${variable}) > 255:
    raise ValueError(f"${variable} must be between 1 and 255 characters")

# Pattern validation
import re
email_pattern = r'^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'
if not re.match(email_pattern, ${variable}):
    raise ValueError(f"Invalid email format: {${variable}}")

# Using pydantic for validation
from pydantic import BaseModel, EmailStr, validator

class InputModel(BaseModel):
    email: EmailStr
    name: str
    
    @validator('name')
    def name_must_not_be_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Name must not be empty')
        return v`,
            explanation: `Add validation to ensure ${variable} meets requirements`,
            confidence: 'high',
            estimatedMinutes: 5
          };
        },
        
        java: (context, issue) => {
          const variable = context.primaryVariable || 'input';
          return {
            code: `// Input validation
if (${variable} == null) {
    throw new IllegalArgumentException("${variable} cannot be null");
}

if (${variable}.isEmpty()) {
    throw new IllegalArgumentException("${variable} cannot be empty");
}

// Length validation
if (${variable}.length() < 1 || ${variable}.length() > 255) {
    throw new IllegalArgumentException("${variable} must be between 1 and 255 characters");
}

// Pattern validation
Pattern emailPattern = Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\\\.[A-Za-z]{2,}$");
if (!emailPattern.matcher(${variable}).matches()) {
    throw new IllegalArgumentException("Invalid email format");
}

// Using Bean Validation
import javax.validation.constraints.*;

public class UserInput {
    @NotNull(message = "${variable} cannot be null")
    @NotBlank(message = "${variable} cannot be blank")
    @Size(min = 1, max = 255, message = "${variable} must be between 1 and 255 characters")
    @Email(message = "Invalid email format")
    private String ${variable};
}`,
            explanation: `Comprehensive validation for ${variable} using Java standards`,
            confidence: 'high',
            estimatedMinutes: 5
          };
        },
        
        go: (context, issue) => {
          const variable = context.primaryVariable || 'input';
          return {
            code: `// Input validation
if ${variable} == "" {
    return fmt.Errorf("${variable} cannot be empty")
}

// Length validation
if len(${variable}) < 1 || len(${variable}) > 255 {
    return fmt.Errorf("${variable} must be between 1 and 255 characters")
}

// Pattern validation (email example)
import "regexp"

emailRegex := regexp.MustCompile(\`^[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}$\`)
if !emailRegex.MatchString(${variable}) {
    return fmt.Errorf("invalid email format: %s", ${variable})
}

// Using validation library
import "github.com/go-playground/validator/v10"

type UserInput struct {
    Email string \`validate:"required,email"\`
    Name  string \`validate:"required,min=1,max=255"\`
}

validate := validator.New()
if err := validate.Struct(userInput); err != nil {
    return fmt.Errorf("validation failed: %w", err)
}`,
            explanation: `Add validation to ensure ${variable} is valid`,
            confidence: 'high',
            estimatedMinutes: 5
          };
        }
      }
    });

    // 4. Null/Undefined Check
    this.registerTemplate({
      id: 'null-check',
      name: 'Null/Undefined Check',
      priority: 'P0',
      patterns: [
        /null\s*pointer/i,
        /null\s*reference/i,
        /undefined\s*check/i,
        /missing\s*null\s*check/i,
        /nullpointerexception/i,
        /cannot\s*read\s*property.*undefined/i
      ],
      estimatedMinutes: 5,
      description: 'Add null/undefined checks to prevent runtime errors',
      languages: {
        typescript: (context, issue) => {
          const variable = context.primaryVariable || 'value';
          const isAsync = context.surroundingCode.includes('await') || context.surroundingCode.includes('async');
          
          return {
            code: `// Null/undefined check with proper TypeScript handling
if (${variable} === null || ${variable} === undefined) {
  // Option 1: Throw error
  throw new Error(\`${variable} is required but was \${${variable}}\`);
  
  // Option 2: Return early
  return ${isAsync ? 'null' : 'undefined'};
  
  // Option 3: Use default value
  ${variable} = defaultValue;
}

// Safe property access using optional chaining
const result = ${variable}?.property?.nested;

// Nullish coalescing for default values
const safeValue = ${variable} ?? defaultValue;

// Type guard for complex checks
function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}

if (!isDefined(${variable})) {
  throw new Error('${variable} is not defined');
}`,
            explanation: `Add null/undefined checks for ${variable} to prevent runtime errors`,
            confidence: 'high',
            estimatedMinutes: 5
          };
        },
        
        javascript: (context, issue) => {
          const variable = context.primaryVariable || 'value';
          return {
            code: `// Null/undefined check
if (${variable} == null) { // Checks both null and undefined
  throw new Error(\`${variable} is required but was \${${variable}}\`);
}

// Optional chaining for safe property access
const result = ${variable}?.property?.nested;

// Nullish coalescing operator
const safeValue = ${variable} ?? defaultValue;

// Defensive programming with default parameters
function processData(${variable} = defaultValue) {
  if (!${variable}) {
    console.warn('${variable} is falsy, using default');
    ${variable} = defaultValue;
  }
  // Process ${variable} safely
}

// Array/Object null check
if (!Array.isArray(${variable})) {
  ${variable} = [];
}

if (typeof ${variable} !== 'object' || ${variable} === null) {
  ${variable} = {};
}`,
            explanation: `Comprehensive null/undefined handling for ${variable}`,
            confidence: 'high',
            estimatedMinutes: 5
          };
        },
        
        python: (context, issue) => {
          const variable = context.primaryVariable || 'value';
          return {
            code: `# None check in Python
if ${variable} is None:
    raise ValueError(f"${variable} cannot be None")

# Check for empty values
if not ${variable}:
    # Handles None, empty string, empty list, 0, False
    raise ValueError(f"${variable} is required but was {${variable}!r}")

# Safe attribute access
result = getattr(${variable}, 'property', default_value)

# Using optional type hints
from typing import Optional

def process_data(${variable}: Optional[str] = None) -> str:
    if ${variable} is None:
        ${variable} = default_value
    return ${variable}

# Dictionary safe access
value = my_dict.get('key', default_value)

# Try-except for attribute access
try:
    result = ${variable}.property
except AttributeError:
    result = default_value`,
            explanation: `Add None checks for ${variable} to prevent AttributeError`,
            confidence: 'high',
            estimatedMinutes: 5
          };
        },
        
        java: (context, issue) => {
          const variable = context.primaryVariable || 'value';
          return {
            code: `// Null check to prevent NullPointerException
if (${variable} == null) {
    throw new IllegalArgumentException("${variable} cannot be null");
}

// Using Objects.requireNonNull
import java.util.Objects;
Objects.requireNonNull(${variable}, "${variable} must not be null");

// Optional for better null handling
import java.util.Optional;

Optional<String> optional${variable} = Optional.ofNullable(${variable});
String result = optional${variable}.orElse(defaultValue);

// Chain operations safely
String result = optional${variable}
    .map(String::toUpperCase)
    .filter(s -> !s.isEmpty())
    .orElseThrow(() -> new IllegalStateException("Invalid ${variable}"));

// Defensive copying for collections
List<String> safeList = ${variable} != null ? new ArrayList<>(${variable}) : new ArrayList<>();

// Using annotations
import javax.annotation.Nullable;
import javax.annotation.Nonnull;

public void processData(@Nonnull String ${variable}) {
    // ${variable} is guaranteed non-null here
}`,
            explanation: `Prevent NullPointerException with proper null checks for ${variable}`,
            confidence: 'high',
            estimatedMinutes: 5
          };
        },
        
        go: (context, issue) => {
          const variable = context.primaryVariable || 'value';
          return {
            code: `// Nil check in Go
if ${variable} == nil {
    return nil, fmt.Errorf("${variable} cannot be nil")
}

// Check for empty string
if ${variable} == "" {
    return nil, fmt.Errorf("${variable} cannot be empty")
}

// Safe pointer dereference
if ${variable} != nil {
    // Safe to use *${variable}
    result := *${variable}
} else {
    // Handle nil case
    result := defaultValue
}

// Check interface for nil
if ${variable} == nil || reflect.ValueOf(${variable}).IsNil() {
    return nil, fmt.Errorf("${variable} is nil")
}

// Safe map access
value, ok := myMap[key]
if !ok {
    // Key doesn't exist
    value = defaultValue
}

// Safe slice access
if len(slice) > index {
    value := slice[index]
} else {
    // Handle out of bounds
    value := defaultValue
}`,
            explanation: `Add nil checks for ${variable} to prevent runtime panics`,
            confidence: 'high',
            estimatedMinutes: 5
          };
        }
      }
    });

    // 5. Authentication Check
    this.registerTemplate({
      id: 'auth-check',
      name: 'Authentication Check',
      priority: 'P0',
      patterns: [
        /missing\s*authentication/i,
        /unauthorized\s*access/i,
        /auth.*check/i,
        /verify.*user/i,
        /check.*permission/i
      ],
      estimatedMinutes: 10,
      description: 'Add authentication checks to protect endpoints',
      languages: {
        typescript: (context, issue) => ({
          code: `// Authentication middleware
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthRequest extends Request {
  user?: any;
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded;
    
    // Additional permission check
    if (req.user.role !== 'admin' && req.method === 'DELETE') {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Apply to routes
app.use('/api/protected', authMiddleware);`,
          explanation: 'Add authentication middleware to verify user identity',
          confidence: 'high',
          estimatedMinutes: 10
        }),
        
        python: (context, issue) => ({
          code: `# Authentication decorator
from functools import wraps
from flask import request, jsonify
import jwt

def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({'error': 'Authentication required'}), 401
        
        try:
            # Remove 'Bearer ' prefix
            token = token.split(' ')[1] if ' ' in token else token
            
            # Verify token
            payload = jwt.decode(
                token,
                app.config['SECRET_KEY'],
                algorithms=['HS256']
            )
            
            # Add user to request context
            request.current_user = payload
            
            # Check permissions
            if request.method == 'DELETE' and payload.get('role') != 'admin':
                return jsonify({'error': 'Insufficient permissions'}), 403
            
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
            
        return f(*args, **kwargs)
    
    return decorated_function

# Apply to routes
@app.route('/api/protected')
@require_auth
def protected_endpoint():
    return jsonify({'data': 'sensitive data'})`,
          explanation: 'Add authentication decorator to protect endpoints',
          confidence: 'high',
          estimatedMinutes: 10
        }),
        
        java: (context, issue) => ({
          code: `// Spring Security Authentication
import org.springframework.security.config.annotation.web.configuration.*;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig extends WebSecurityConfigurerAdapter {
    
    @Autowired
    private JwtAuthenticationFilter jwtFilter;
    
    @Override
    protected void configure(HttpSecurity http) throws Exception {
        http.csrf().disable()
            .authorizeRequests()
            .antMatchers("/api/public/**").permitAll()
            .antMatchers("/api/admin/**").hasRole("ADMIN")
            .anyRequest().authenticated()
            .and()
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
    }
}

// JWT Filter
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    
    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        
        String token = extractToken(request);
        
        if (token != null && validateToken(token)) {
            Authentication auth = createAuthentication(token);
            SecurityContextHolder.getContext().setAuthentication(auth);
        }
        
        filterChain.doFilter(request, response);
    }
    
    private String extractToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}`,
          explanation: 'Implement Spring Security for authentication',
          confidence: 'high',
          estimatedMinutes: 10
        }),
        
        go: (context, issue) => ({
          code: `// Authentication middleware
import (
    "net/http"
    "strings"
    "github.com/golang-jwt/jwt"
)

func authMiddleware(next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        // Extract token from header
        authHeader := r.Header.Get("Authorization")
        if authHeader == "" {
            http.Error(w, "Authentication required", http.StatusUnauthorized)
            return
        }
        
        // Parse Bearer token
        parts := strings.Split(authHeader, " ")
        if len(parts) != 2 || parts[0] != "Bearer" {
            http.Error(w, "Invalid token format", http.StatusUnauthorized)
            return
        }
        
        // Verify token
        token, err := jwt.Parse(parts[1], func(token *jwt.Token) (interface{}, error) {
            return []byte(os.Getenv("JWT_SECRET")), nil
        })
        
        if err != nil || !token.Valid {
            http.Error(w, "Invalid or expired token", http.StatusUnauthorized)
            return
        }
        
        // Extract claims
        if claims, ok := token.Claims.(jwt.MapClaims); ok {
            // Check permissions
            if r.Method == "DELETE" && claims["role"] != "admin" {
                http.Error(w, "Insufficient permissions", http.StatusForbidden)
                return
            }
            
            // Add user to context
            ctx := context.WithValue(r.Context(), "user", claims)
            next.ServeHTTP(w, r.WithContext(ctx))
        } else {
            http.Error(w, "Invalid token claims", http.StatusUnauthorized)
        }
    }
}

// Apply to routes
http.HandleFunc("/api/protected", authMiddleware(protectedHandler))`,
          explanation: 'Add authentication middleware to verify JWT tokens',
          confidence: 'high',
          estimatedMinutes: 10
        })
      }
    });

    // 6. Error Handling
    this.registerTemplate({
      id: 'error-handling',
      name: 'Error Handling',
      priority: 'P0',
      patterns: [
        /missing\s*error\s*handling/i,
        /unhandled\s*exception/i,
        /try[\s-]?catch/i,
        /error\s*not\s*handled/i,
        /exception\s*handling/i
      ],
      estimatedMinutes: 10,
      description: 'Add proper error handling to prevent crashes',
      languages: {
        typescript: (context, issue) => {
          const method = context.methodName || 'operation';
          const isAsync = context.surroundingCode.includes('await');
          
          return {
            code: `// Comprehensive error handling
${isAsync ? 'async ' : ''}function ${method}Safe(...args: any[]) {
  try {
    ${isAsync ? 'const result = await ' : 'const result = '}${method}(...args);
    return { success: true, data: result };
  } catch (error) {
    // Log the error
    console.error(\`${method} failed:\`, error);
    
    // Handle specific error types
    if (error instanceof ValidationError) {
      return { 
        success: false, 
        error: 'Validation failed', 
        details: error.message 
      };
    }
    
    if (error instanceof NetworkError) {
      return { 
        success: false, 
        error: 'Network error', 
        retry: true 
      };
    }
    
    // Generic error handling
    return { 
      success: false, 
      error: 'Operation failed', 
      message: error.message 
    };
  } finally {
    // Cleanup code (if needed)
    cleanup();
  }
}

// Global error handler
process.on('unhandledRejection', (error: Error) => {
  console.error('Unhandled rejection:', error);
  // Send to error tracking service
});`,
            explanation: `Add comprehensive error handling for ${method}`,
            confidence: 'high',
            estimatedMinutes: 10
          };
        },
        
        javascript: (context, issue) => {
          const method = context.methodName || 'operation';
          return {
            code: `// Error handling with try-catch
async function ${method}Safe(...args) {
  try {
    const result = await ${method}(...args);
    return { success: true, data: result };
  } catch (error) {
    console.error('${method} failed:', error);
    
    // Differentiate error types
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Service unavailable. Please try again later.');
    }
    
    if (error.name === 'ValidationError') {
      throw new Error(\`Invalid input: \${error.message}\`);
    }
    
    // Re-throw with context
    throw new Error(\`${method} failed: \${error.message}\`);
  }
}

// Promise error handling
${method}()
  .then(result => {
    // Handle success
  })
  .catch(error => {
    console.error('Error:', error);
    // Handle error
  })
  .finally(() => {
    // Cleanup
  });

// Event emitter error handling
emitter.on('error', (error) => {
  console.error('Event error:', error);
});`,
            explanation: 'Add error handling to prevent unhandled exceptions',
            confidence: 'high',
            estimatedMinutes: 10
          };
        },
        
        python: (context, issue) => {
          const method = context.methodName || 'operation';
          return {
            code: `# Comprehensive error handling
import logging
import traceback

logger = logging.getLogger(__name__)

def ${method}_safe(*args, **kwargs):
    """Safely execute ${method} with error handling."""
    try:
        result = ${method}(*args, **kwargs)
        return {"success": True, "data": result}
    
    except ValueError as e:
        logger.warning(f"Validation error in ${method}: {e}")
        return {"success": False, "error": "Invalid input", "details": str(e)}
    
    except ConnectionError as e:
        logger.error(f"Connection error in ${method}: {e}")
        return {"success": False, "error": "Connection failed", "retry": True}
    
    except Exception as e:
        logger.error(f"Unexpected error in ${method}: {e}\\n{traceback.format_exc()}")
        return {"success": False, "error": "Operation failed", "message": str(e)}
    
    finally:
        # Cleanup resources
        cleanup()

# Context manager for error handling
from contextlib import contextmanager

@contextmanager
def error_handler():
    try:
        yield
    except Exception as e:
        logger.error(f"Error in context: {e}")
        raise

# Decorator for error handling
def handle_errors(func):
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            logger.error(f"Error in {func.__name__}: {e}")
            raise
    return wrapper`,
            explanation: `Add error handling for ${method} with proper logging`,
            confidence: 'high',
            estimatedMinutes: 10
          };
        },
        
        java: (context, issue) => {
          const method = context.methodName || 'operation';
          return {
            code: `// Comprehensive error handling
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

private static final Logger logger = LoggerFactory.getLogger(ClassName.class);

public Result ${method}Safe(/* parameters */) {
    try {
        // Main operation
        Object result = ${method}();
        return Result.success(result);
        
    } catch (IllegalArgumentException e) {
        logger.warn("Validation error in ${method}: {}", e.getMessage());
        return Result.failure("Invalid input: " + e.getMessage());
        
    } catch (SQLException e) {
        logger.error("Database error in ${method}", e);
        return Result.failure("Database operation failed");
        
    } catch (IOException e) {
        logger.error("IO error in ${method}", e);
        return Result.failure("IO operation failed");
        
    } catch (Exception e) {
        logger.error("Unexpected error in ${method}", e);
        return Result.failure("Operation failed: " + e.getMessage());
        
    } finally {
        // Cleanup resources
        cleanup();
    }
}

// Try-with-resources for automatic cleanup
try (Connection conn = dataSource.getConnection();
     PreparedStatement stmt = conn.prepareStatement(sql)) {
    
    // Use resources
    stmt.executeUpdate();
    
} catch (SQLException e) {
    logger.error("Database error", e);
    throw new DataAccessException("Failed to execute query", e);
}

// Result wrapper class
public class Result<T> {
    private final boolean success;
    private final T data;
    private final String error;
    
    public static <T> Result<T> success(T data) {
        return new Result<>(true, data, null);
    }
    
    public static <T> Result<T> failure(String error) {
        return new Result<>(false, null, error);
    }
}`,
            explanation: `Add try-catch blocks with proper exception handling for ${method}`,
            confidence: 'high',
            estimatedMinutes: 10
          };
        },
        
        go: (context, issue) => {
          const method = context.methodName || 'operation';
          return {
            code: `// Error handling in Go
import (
    "fmt"
    "log"
    "errors"
)

func ${method}Safe(/* parameters */) (result interface{}, err error) {
    // Defer error recovery
    defer func() {
        if r := recover(); r != nil {
            log.Printf("Panic in ${method}: %v", r)
            err = fmt.Errorf("panic recovered: %v", r)
        }
    }()
    
    // Main operation with error checking
    result, err = ${method}()
    if err != nil {
        // Wrap error with context
        return nil, fmt.Errorf("${method} failed: %w", err)
    }
    
    // Validate result
    if result == nil {
        return nil, errors.New("${method} returned nil result")
    }
    
    return result, nil
}

// Error types for better handling
type ValidationError struct {
    Field string
    Message string
}

func (e ValidationError) Error() string {
    return fmt.Sprintf("validation error on %s: %s", e.Field, e.Message)
}

// Check and handle errors properly
if err != nil {
    var validationErr ValidationError
    if errors.As(err, &validationErr) {
        // Handle validation error
        log.Printf("Validation failed: %v", validationErr)
        return nil, fmt.Errorf("invalid input: %w", err)
    }
    
    if errors.Is(err, io.EOF) {
        // Handle EOF
        return nil, fmt.Errorf("unexpected end of input: %w", err)
    }
    
    // Generic error handling
    log.Printf("Error in ${method}: %v", err)
    return nil, fmt.Errorf("operation failed: %w", err)
}`,
            explanation: `Add proper error handling and recovery for ${method}`,
            confidence: 'high',
            estimatedMinutes: 10
          };
        }
      }
    });
  }

  /**
   * Register a template category
   */
  private registerTemplate(category: TemplateCategory): void {
    this.templates.set(category.id, category);
    // Cache patterns for quick lookup
    category.patterns.forEach(pattern => {
      this.patternCache.set(pattern.source, category.id);
    });
  }

  /**
   * Match an issue to a template
   */
  public async matchTemplate(issue: Issue, language: string): Promise<TemplateMatch | null> {
    // For security issues, use the security template library
    if (issue.category === 'security' || issue.type === 'vulnerability') {
      try {
        const securityLib = await this.getSecurityTemplateLibrary();
        const securityMatch = securityLib.getTemplateMatch(issue, language);
        if (securityMatch) {
          return securityMatch;
        }
      } catch (error) {
        console.log('Security template matching failed, falling back to regular templates:', error);
      }
    }

    // Regular template matching
    const text = `${issue.title || ''} ${issue.message || ''} ${issue.description || ''}`.toLowerCase();
    
    let bestMatch: TemplateMatch | null = null;
    let highestConfidence = 0;

    for (const [id, category] of this.templates) {
      for (const pattern of category.patterns) {
        if (pattern.test(text)) {
          const confidence = this.calculateConfidence(text, pattern, issue);
          
          if (confidence > highestConfidence) {
            highestConfidence = confidence;
            bestMatch = {
              pattern: id,
              confidence,
              template: category.languages[language] ? {
                code: '',
                explanation: '',
                confidence: confidence > 0.8 ? 'high' : confidence > 0.5 ? 'medium' : 'low',
                estimatedMinutes: category.estimatedMinutes
              } : null
            };
          }
        }
      }
    }

    return bestMatch;
  }

  /**
   * Get a template by ID and language
   */
  public getTemplate(templateId: string, language: string): LanguageTemplate | null {
    const category = this.templates.get(templateId);
    if (!category) return null;
    
    return category.languages[language] || null;
  }

  /**
   * Apply a template with context
   */
  public async applyTemplate(
    templateId: string,
    language: string,
    context: ExtractedContext,
    issue: Issue
  ): Promise<FixTemplate | null> {
    // Check if it's a security template
    if (issue.category === 'security' || issue.type === 'vulnerability') {
      try {
        const securityLib = await this.getSecurityTemplateLibrary();
        const template = securityLib.templates.get(templateId);
        if (template) {
          const code = template.generateFix(context);
          return {
            code,
            explanation: `Security fix for ${template.category}: ${issue.title || issue.message}`,
            confidence: 'high',
            estimatedMinutes: 10
          };
        }
      } catch (error) {
        console.error(`Security template ${templateId} failed:`, error);
      }
    }
    
    // Regular template
    const template = this.getTemplate(templateId, language);
    if (!template) return null;
    
    try {
      return template(context, issue);
    } catch (error) {
      console.error(`Failed to apply template ${templateId}:`, error);
      return null;
    }
  }

  /**
   * Get all P0 templates
   */
  public getP0Templates(): TemplateCategory[] {
    return Array.from(this.templates.values()).filter(t => t.priority === 'P0');
  }

  /**
   * Calculate confidence score for a match
   */
  private calculateConfidence(text: string, pattern: RegExp, issue: Issue): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence if pattern matches multiple times
    const matches = text.match(new RegExp(pattern.source, 'gi'));
    if (matches && matches.length > 1) {
      confidence += 0.1 * Math.min(matches.length - 1, 3);
    }

    // Increase confidence based on severity
    if (issue.severity === 'critical' || issue.severity === 'high') {
      confidence += 0.1;
    }

    // Increase confidence if we have code snippet
    if (issue.codeSnippet) {
      confidence += 0.15;
    }

    // Increase confidence if category matches
    if (issue.category === 'security' && pattern.source.includes('injection|xss|auth')) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Helper to extract table name from SQL code
   */
  private extractTableName(code: string): string | null {
    const match = code.match(/(?:from|into|update)\s+(\w+)/i);
    return match ? match[1] : null;
  }

  /**
   * Generate payment validation with complete function replacement
   */
  private generatePaymentValidation(context: any, issue: Issue): string {
    const funcName = context.functionName || 'processPayment';
    const params = context.parameters.map(p => p.name).join(', ') || 'amount, userId';
    const hasUserId = params.includes('userId');
    
    return `// Complete replacement function with validation
function ${funcName}(${params}) {
  // Amount validation
  if (amount === undefined || amount === null) {
    throw new Error('Payment amount is required');
  }
  
  // Type validation
  if (typeof amount !== 'number' || isNaN(amount)) {
    throw new Error('Payment amount must be a valid number');
  }
  
  // Range validation (adjust limits as needed)
  const MIN_AMOUNT = 0.01;
  const MAX_AMOUNT = 10000.00;
  
  if (amount < MIN_AMOUNT) {
    throw new Error(\`Payment amount must be at least $\${MIN_AMOUNT}\`);
  }
  
  if (amount > MAX_AMOUNT) {
    throw new Error(\`Payment amount cannot exceed $\${MAX_AMOUNT}\`);
  }
  
  // Decimal precision validation (for currency)
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
  // Process validated payment
  try {
    // Log the payment attempt
    console.log(\`Processing payment of \$\${amount.toFixed(2)}\${hasUserId ? ' for user \${userId}' : ''}\`);
    
    // Call your payment processor (e.g., Stripe)
    return stripe.charge(${hasUserId ? 'userId, ' : ''}amount);
  } catch (error) {
    console.error('Payment processing failed:', error);
    throw new Error('Payment processing failed. Please try again.');
  }
}`;
  }

  /**
   * Generate TypeScript validation based on type
   */
  private generateTypeScriptValidation(variable: string, type?: string): string {
    if (!type) {
      // Default validation
      return `// Input validation for ${variable}
if (!${variable}) {
  throw new Error('${variable} is required');
}

if (typeof ${variable} !== 'string') {
  throw new Error('${variable} must be a string');
}

if (${variable}.length < 1 || ${variable}.length > 255) {
  throw new Error('${variable} must be between 1 and 255 characters');
}`;
    }

    // Type-specific validation
    if (type.includes('number')) {
      return `// Number validation
if (typeof ${variable} !== 'number' || isNaN(${variable})) {
  throw new Error('${variable} must be a valid number');
}

if (${variable} < 0) {
  throw new Error('${variable} must be non-negative');
}`;
    }

    if (type.includes('[]') || type.includes('Array')) {
      return `// Array validation
if (!Array.isArray(${variable})) {
  throw new Error('${variable} must be an array');
}

if (${variable}.length === 0) {
  throw new Error('${variable} cannot be empty');
}

// Validate each element
${variable}.forEach((item, index) => {
  if (!item) {
    throw new Error(\`Invalid item at index \${index}\`);
  }
});`;
    }

    if (type.includes('boolean')) {
      return `// Boolean validation
if (typeof ${variable} !== 'boolean') {
  throw new Error('${variable} must be a boolean');
}`;
    }

    // Default string validation
    return `// String validation for ${variable}: ${type}
if (!${variable} || typeof ${variable} !== 'string') {
  throw new Error('${variable} must be a non-empty string');
}

if (${variable}.length > 255) {
  throw new Error('${variable} exceeds maximum length');
}`;
  }

  /**
   * Get template statistics
   */
  public getStatistics(): {
    totalTemplates: number;
    byPriority: Record<string, number>;
    byLanguage: Record<string, number>;
  } {
    const stats = {
      totalTemplates: this.templates.size,
      byPriority: {} as Record<string, number>,
      byLanguage: {} as Record<string, number>
    };

    for (const category of this.templates.values()) {
      // Count by priority
      stats.byPriority[category.priority] = (stats.byPriority[category.priority] || 0) + 1;

      // Count by language
      for (const lang of Object.keys(category.languages)) {
        stats.byLanguage[lang] = (stats.byLanguage[lang] || 0) + 1;
      }
    }

    return stats;
  }

  private securityTemplateLibrary: any;

  /**
   * Lazy load security template library when needed
   */
  private async getSecurityTemplateLibrary() {
    if (!this.securityTemplateLibrary) {
      const { SecurityTemplateLibrary } = await import('./security-template-library');
      this.securityTemplateLibrary = new SecurityTemplateLibrary();
    }
    return this.securityTemplateLibrary;
  }
}

// Export singleton instance
export const templateLibrary = new TemplateLibrary();