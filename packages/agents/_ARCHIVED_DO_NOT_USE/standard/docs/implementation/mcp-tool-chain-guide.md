# MCP Tool Chain Usage Guide

## Tool Chains Overview

### 1. Code Search Chain (`code-search`)
**Purpose:** Fast text/pattern searching in files  
**When to use:** Looking for literal text, regex patterns, or code snippets

**Tool Priority:**
1. **Serena MCP** - Advanced pattern matching with context
2. **mcp-ripgrep** - Blazing fast text search
3. **Native ripgrep** - Direct ripgrep binary
4. **grep fallback** - Always available Unix grep

**Use Cases:**
```typescript
// Finding literal SQL queries
await fallbackService.execute('code-search', {
  pattern: 'SELECT * FROM users',
  file: 'src/api/users.ts'
});

// Finding function calls
await fallbackService.execute('code-search', {
  pattern: 'executeQuery\\(',  // Regex pattern
  path: 'src/'
});

// Finding hardcoded secrets
await fallbackService.execute('code-search', {
  pattern: 'api_key.*=.*["\']sk-',
  path: 'src/'
});
```

**Best for:**
- Literal string searches
- Regex pattern matching
- Finding TODO comments
- Searching for hardcoded values
- Quick file scanning

---

### 2. Semantic Analysis Chain (`semantic-analysis`)
**Purpose:** Understanding code structure and relationships  
**When to use:** Finding symbols, analyzing code semantics, understanding dependencies

**Tool Priority:**
1. **mcp-language-server** - Full semantic understanding via LSP
2. **ast-grep** - AST-based structural search
3. **Serena MCP** - Symbol-aware search

**Use Cases:**
```typescript
// Finding function/method definitions
await fallbackService.execute('semantic-analysis', {
  pattern: 'getUserById',  // Function name
  operation: 'find-definition'
});

// Finding all references to a symbol
await fallbackService.execute('semantic-analysis', {
  pattern: 'UserModel',  // Class name
  operation: 'find-references'
});

// Understanding type information
await fallbackService.execute('semantic-analysis', {
  pattern: 'processPayment',
  operation: 'get-type-info'
});
```

**Best for:**
- Finding function/class definitions
- Locating all usages of a symbol
- Understanding inheritance relationships
- Type checking
- Go-to-definition functionality
- Rename refactoring

---

### 3. Pattern Match Chain (`pattern-match`)
**Purpose:** Structural code pattern matching  
**When to use:** Finding code structures, not just text

**Tool Priority:**
1. **ast-grep** - Best for structural patterns
2. **Serena MCP** - Good for mixed search
3. **mcp-ripgrep** - Fallback to text patterns

**Use Cases:**
```typescript
// Finding all async functions
await fallbackService.execute('pattern-match', {
  pattern: 'async function $FUNC($$$) { $$$ }',
  path: 'src/'
});

// Finding specific code structures
await fallbackService.execute('pattern-match', {
  pattern: 'if ($COND) { return $VAL; }',
  path: 'src/'
});

// Finding try-catch blocks without error handling
await fallbackService.execute('pattern-match', {
  pattern: 'try { $$$ } catch($ERR) { }',
  path: 'src/'
});
```

**Best for:**
- Finding code anti-patterns
- Detecting structural issues
- Code refactoring patterns
- Security vulnerability patterns
- Complex code structures

---

## Decision Tree for Tool Chain Selection

```
Is the search for...
│
├─> Literal text or regex?
│   └─> Use `code-search`
│       - "Find all console.log statements"
│       - "Search for API keys"
│       - "Find TODO comments"
│
├─> Symbol or semantic meaning?
│   └─> Use `semantic-analysis`
│       - "Find the definition of getUserData"
│       - "Find all calls to processPayment"
│       - "What type does this function return?"
│
└─> Code structure or pattern?
    └─> Use `pattern-match`
        - "Find all empty catch blocks"
        - "Find nested ternary operators"
        - "Find functions with >5 parameters"
```

---

## Real-World Examples

### Example 1: Finding SQL Injection Vulnerabilities

```typescript
// Step 1: Use code-search for literal SQL patterns
const literalSQL = await fallbackService.execute('code-search', {
  pattern: '(SELECT|INSERT|UPDATE|DELETE).*\\$\\{',
  path: 'src/'
});

// Step 2: Use pattern-match for structural issues
const unsafeQueries = await fallbackService.execute('pattern-match', {
  pattern: 'query(`$SQL` + $VAR)',
  path: 'src/'
});

// Step 3: Use semantic-analysis to trace data flow
const queryFunctions = await fallbackService.execute('semantic-analysis', {
  pattern: 'executeQuery',
  operation: 'find-references'
});
```

### Example 2: Finding Hardcoded Secrets

```typescript
// Step 1: Quick text search
const secrets = await fallbackService.execute('code-search', {
  pattern: '(api_key|secret|password|token)\\s*=\\s*["\'][^"\']+["\']',
  path: 'src/'
});

// Step 2: Structural pattern for config files
const configSecrets = await fallbackService.execute('pattern-match', {
  pattern: '{ $KEY: "$SECRET" }',
  path: 'config/'
});
```

### Example 3: Finding Function Definition

```typescript
// When you need exact location of a function
const location = await fallbackService.execute('semantic-analysis', {
  pattern: 'validateUserInput',
  operation: 'find-definition',
  file: 'src/validators.ts'
});

// Fallback chain will try:
// 1. mcp-language-server (understands imports, overloads)
// 2. ast-grep (finds function declaration)
// 3. Serena MCP (symbol search)
// If all fail, might fall back to code-search for "function validateUserInput"
```

---

## Performance Considerations

| Tool Chain | Speed | Accuracy | Use When |
|------------|-------|----------|----------|
| `code-search` | ⚡⚡⚡ Fastest | Text-exact | Need quick results, literal matches |
| `semantic-analysis` | ⚡ Slowest | Highest | Need semantic understanding |
| `pattern-match` | ⚡⚡ Medium | Structure-aware | Need structural patterns |

---

## Tool Health Monitoring

The fallback service monitors tool health:

```typescript
// Check current health status
const health = fallbackService.getHealthStatus();
// Map { 'serena-mcp' => true, 'mcp-ripgrep' => false, ... }

// Force health check
await fallbackService.forceHealthCheck('serena-mcp');

// Get recommended tool for operation
const bestTool = await fallbackService.getRecommendedTool('code-search');
// Returns: 'mcp-ripgrep' (if Serena is down)
```

---

## Configuration

Set environment variables to enable/disable tools:

```bash
# Enable specific MCP tools
USE_SERENA_MCP=true
USE_LSP_MCP=true
ENABLE_MCP_LOCATION=true

# Prefer specific tools
PREFERRED_SEARCH_TOOL=mcp-ripgrep
PREFERRED_SEMANTIC_TOOL=serena-mcp
```

---

## Summary

- **Code Search**: Fast, literal text/regex searching
- **Semantic Analysis**: Understanding code meaning and relationships  
- **Pattern Match**: Finding structural code patterns

The fallback service automatically handles tool failures and selects the best available tool for each operation, ensuring resilience and optimal performance.