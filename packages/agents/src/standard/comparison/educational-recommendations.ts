/**
 * Issue-specific educational recommendations mapping
 */

export function getIssueSpecificRecommendations(issue: any): string[] {
  const message = issue.message?.toLowerCase() || '';
  const title = issue.title?.toLowerCase() || '';
  const combined = `${message} ${title}`;
  
  // SQL Injection
  if (combined.includes('sql injection')) {
    return [
      'SQL Injection Prevention with Parameterized Queries',
      'OWASP Top 10: Injection Attack Defense',
      'Secure Database Query Patterns in TypeScript'
    ];
  }
  
  // Rate Limiting
  if (combined.includes('rate limit')) {
    return [
      'API Rate Limiting Implementation Course',
      'Redis-Based Rate Limiting Patterns',
      'DDoS Prevention Through Rate Limiting'
    ];
  }
  
  // N+1 Queries
  if (combined.includes('n+1') || (combined.includes('query') && combined.includes('loop'))) {
    return [
      'Solving N+1 Queries with DataLoader Pattern',
      'Database Query Optimization for ORMs',
      'Eager Loading vs Lazy Loading Strategies'
    ];
  }
  
  // XSS
  if (combined.includes('xss') || combined.includes('cross-site scripting')) {
    return [
      'XSS Prevention: Content Security Policy',
      'DOM Sanitization Best Practices',
      'React/Vue/Angular Security Patterns'
    ];
  }
  
  // CSRF
  if (combined.includes('csrf') || combined.includes('cross-site request')) {
    return [
      'CSRF Token Implementation Workshop',
      'SameSite Cookie Configuration',
      'Double Submit Cookie Pattern'
    ];
  }
  
  // Memory Leaks
  if (combined.includes('memory leak')) {
    return [
      'JavaScript Memory Management Masterclass',
      'Finding and Fixing Memory Leaks with Chrome DevTools',
      'WeakMap and WeakSet for Memory-Efficient Code'
    ];
  }
  
  // Authentication
  if (combined.includes('authentication') || combined.includes('auth') && !combined.includes('authorization')) {
    return [
      'OAuth 2.0 and OpenID Connect Implementation',
      'JWT Best Practices and Security',
      'Multi-Factor Authentication Integration'
    ];
  }
  
  // Authorization
  if (combined.includes('authorization') || combined.includes('permission') || combined.includes('access control')) {
    return [
      'Role-Based Access Control (RBAC) Design',
      'Attribute-Based Access Control (ABAC) Patterns',
      'Zero Trust Security Architecture'
    ];
  }
  
  // Hardcoded Secrets
  if (combined.includes('hardcoded') || combined.includes('api key') || combined.includes('secret')) {
    return [
      'Secrets Management with HashiCorp Vault',
      'Environment Variables and .env Best Practices',
      'AWS Secrets Manager Integration'
    ];
  }
  
  // Performance
  if (combined.includes('performance') || combined.includes('slow') || combined.includes('optimization')) {
    return [
      'Web Performance Optimization Fundamentals',
      'Database Index Optimization Strategies',
      'Caching Strategies: Redis, Memcached, CDN'
    ];
  }
  
  // Dependencies
  if (combined.includes('dependency') || combined.includes('vulnerable') || combined.includes('outdated')) {
    return [
      'Dependency Security Scanning with Snyk',
      'npm audit and Security Best Practices',
      'Supply Chain Security for JavaScript'
    ];
  }
  
  // Code Quality
  if (combined.includes('console.log') || combined.includes('debug')) {
    return [
      'Production-Ready Logging with Winston/Pino',
      'Structured Logging Best Practices',
      'Log Aggregation with ELK Stack'
    ];
  }
  
  // Type Safety
  if (combined.includes('type') || combined.includes('typescript') || combined.includes('any')) {
    return [
      'Advanced TypeScript: Type Safety Patterns',
      'TypeScript Strict Mode Configuration',
      'Type Guards and Type Predicates'
    ];
  }
  
  // Testing
  if (combined.includes('test') || combined.includes('coverage')) {
    return [
      'Test-Driven Development (TDD) Workshop',
      'Jest/Mocha Testing Best Practices',
      'Integration Testing Strategies'
    ];
  }
  
  // Default fallback
  return [];
}