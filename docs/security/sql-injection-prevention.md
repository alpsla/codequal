# SQL Injection Prevention Guide

## Overview

SQL injection is a critical security vulnerability (CWE-89) that can lead to unauthorized data access, data manipulation, or complete database compromise.

## Current Status

After a thorough security audit, we found:
- **No actual SQL injection vulnerabilities** in production code
- Some test files contain intentional SQL injection examples for testing purposes
- The codebase primarily uses safe query builders (Supabase, Prisma) that prevent SQL injection

## Safe Practices Used

### 1. Supabase Query Builder
Most database queries use Supabase's safe query builder:
```typescript
// SAFE: Query builder with automatic parameterization
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId); // userId is safely parameterized
```

### 2. Parameterized Queries
When raw queries are needed, always use parameterized queries:
```typescript
// SAFE: Using parameterized queries
const { data } = await supabase.rpc('custom_function', {
  param1: userInput,  // Parameters are safely escaped
  param2: otherInput
});
```

## Dangerous Patterns to Avoid

### 1. String Concatenation
```typescript
// DANGEROUS: Never do this!
const query = `SELECT * FROM users WHERE id = '${userId}'`;
```

### 2. Template Literals with User Input
```typescript
// DANGEROUS: SQL injection vulnerability
const query = `UPDATE users SET name = '${userName}' WHERE id = ${userId}`;
```

### 3. Dynamic Table/Column Names
```typescript
// DANGEROUS: Can lead to SQL injection
const query = `SELECT * FROM ${tableName} WHERE ${columnName} = ?`;
```

## Best Practices

### 1. Always Use Query Builders
Prefer ORM/query builders over raw SQL:
```typescript
// Supabase
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('email', email);

// Prisma
const user = await prisma.user.findUnique({
  where: { email: email }
});
```

### 2. Validate and Sanitize Input
```typescript
// Validate input types
if (typeof userId !== 'string' || !userId.match(/^[0-9a-f-]{36}$/)) {
  throw new Error('Invalid user ID format');
}

// Use allow-lists for dynamic values
const allowedTables = ['users', 'posts', 'comments'];
if (!allowedTables.includes(tableName)) {
  throw new Error('Invalid table name');
}
```

### 3. Use Stored Procedures
For complex queries, use stored procedures with parameters:
```sql
CREATE OR REPLACE FUNCTION get_user_posts(user_id UUID)
RETURNS TABLE(...) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM posts WHERE author_id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4. Principle of Least Privilege
- Use different database users for different operations
- Grant minimal required permissions
- Use read-only connections where possible

## Testing for SQL Injection

### 1. Automated Testing
Use tools to scan for SQL injection:
```bash
# Example using sqlmap (for testing only!)
sqlmap -u "http://localhost:3001/api/users?id=1" --batch
```

### 2. Manual Testing
Test with common SQL injection patterns:
- `' OR '1'='1`
- `'; DROP TABLE users; --`
- `1' UNION SELECT * FROM users--`

### 3. Code Review Checklist
- [ ] No string concatenation in queries
- [ ] All user input is parameterized
- [ ] Dynamic table/column names are validated
- [ ] Stored procedures use parameters
- [ ] Database permissions are minimal

## Response Plan

If SQL injection is discovered:

1. **Immediate Actions**
   - Disable affected endpoints
   - Review access logs for exploitation
   - Patch the vulnerability

2. **Investigation**
   - Check for data breaches
   - Review all similar code patterns
   - Audit database access logs

3. **Remediation**
   - Fix all instances of the vulnerability
   - Update dependencies if needed
   - Implement additional monitoring

4. **Prevention**
   - Add SQL injection tests to CI/CD
   - Conduct security training
   - Regular security audits

## Tools and Resources

- [OWASP SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [CWE-89: SQL Injection](https://cwe.mitre.org/data/definitions/89.html)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/security)

## Conclusion

While no active SQL injection vulnerabilities were found in the production codebase, maintaining these security practices is crucial for preventing future vulnerabilities.