#!/bin/bash

# Code Migration Helper for Authentication System Update
# This script helps identify and update legacy authentication code

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 CodeQual Code Migration Helper${NC}"
echo ""

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Run this script from the project root directory${NC}"
    exit 1
fi

# Create migration report directory
mkdir -p migration-reports

# Scan for legacy authentication patterns
echo -e "${BLUE}🔍 Scanning for legacy authentication patterns...${NC}"

# Find files with legacy authentication usage
echo -e "${YELLOW}📋 Scanning TypeScript/JavaScript files...${NC}"

# Pattern 1: Legacy MultiAgentExecutor with userId string
echo "=== Legacy MultiAgentExecutor Usage ===" > migration-reports/legacy-patterns.txt
grep -r "new.*MultiAgentExecutor" --include="*.ts" --include="*.js" . | grep -v "__tests__" | grep -v "node_modules" >> migration-reports/legacy-patterns.txt 2>/dev/null || true

# Pattern 2: userId string parameters
echo -e "\n=== userId String Parameters ===" >> migration-reports/legacy-patterns.txt
grep -r "userId.*string" --include="*.ts" --include="*.js" . | grep -v "__tests__" | grep -v "node_modules" >> migration-reports/legacy-patterns.txt 2>/dev/null || true

# Pattern 3: Mock user contexts
echo -e "\n=== Mock User Contexts ===" >> migration-reports/legacy-patterns.txt
grep -r "'user-" --include="*.ts" --include="*.js" . | grep -v "__tests__" | grep -v "node_modules" >> migration-reports/legacy-patterns.txt 2>/dev/null || true

# Pattern 4: Direct authentication bypasses
echo -e "\n=== Direct Authentication Bypasses ===" >> migration-reports/legacy-patterns.txt
grep -r "skipAuth\|bypassAuth\|mockUser" --include="*.ts" --include="*.js" . | grep -v "__tests__" | grep -v "node_modules" >> migration-reports/legacy-patterns.txt 2>/dev/null || true

# Count issues found
LEGACY_COUNT=$(wc -l < migration-reports/legacy-patterns.txt)

if [ "$LEGACY_COUNT" -gt 10 ]; then
    echo -e "${YELLOW}⚠️  Found $LEGACY_COUNT potential legacy patterns${NC}"
else
    echo -e "${GREEN}✅ Found $LEGACY_COUNT legacy patterns (manageable)${NC}"
fi

# Generate migration recommendations
echo -e "${BLUE}📝 Generating migration recommendations...${NC}"

cat > migration-reports/migration-guide.md << 'EOF'
# CodeQual Authentication Migration Guide

## Overview
This guide helps you migrate from the legacy authentication system to the new Supabase-based authentication.

## Migration Steps

### 1. Update Imports
```typescript
// BEFORE
import { MultiAgentExecutor } from '@codequal/agents';

// AFTER
import { 
  EnhancedMultiAgentExecutor,
  createSupabaseAuthenticationService 
} from '@codequal/agents';
```

### 2. Replace Constructor Calls
```typescript
// BEFORE - Legacy pattern
const executor = new MultiAgentExecutor(
  config,
  repositoryData,
  vectorService,
  { userId: 'user-123' }  // ❌ String userId
);

// AFTER - New pattern
const authService = createSupabaseAuthenticationService(authConfig);
const authenticatedUser = await authService.validateSession(token, requestContext);

const executor = new EnhancedMultiAgentExecutor(
  config,
  repositoryData,
  vectorService,
  authenticatedUser,  // ✅ Full AuthenticatedUser object
  options
);
```

### 3. Update Authentication Flow
```typescript
// BEFORE - Mock authentication
const mockUser = { userId: 'user-123' };

// AFTER - Real authentication
const authService = createSupabaseAuthenticationService({
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  // ... other config
});

const authenticatedUser = await authService.validateSession(
  token,
  { ipAddress: req.ip, userAgent: req.headers['user-agent'] }
);
```

### 4. Add Permission Validation
```typescript
// NEW - Repository access validation
const repositoryAccess = await authService.validateRepositoryAccess(
  authenticatedUser,
  repositoryId,
  'read'  // or 'write', 'admin'
);

if (!repositoryAccess.granted) {
  throw new Error(`Access denied: ${repositoryAccess.reason}`);
}
```

### 5. Update Express.js Middleware
```typescript
// BEFORE - Custom auth middleware
app.use((req, res, next) => {
  req.user = { userId: 'hardcoded-user' };  // ❌ Hardcoded
  next();
});

// AFTER - Supabase auth middleware
import { createExpressAuthMiddleware } from '@codequal/agents';

const authMiddleware = createExpressAuthMiddleware(authService, {
  requiredRoles: ['user'],
  enableAuditLogging: true,
  rateLimiting: { enabled: true, requestsPerHour: 1000 }
});

app.use('/api', authMiddleware);  // ✅ Real authentication

// Access authenticated user
app.post('/api/analyze', (req, res) => {
  const user = req.user;  // AuthenticatedUser object
  const repositoryAccess = req.repositoryAccess;
  // ... use authenticated context
});
```

### 6. Update Error Handling
```typescript
// NEW - Handle authentication errors
try {
  const result = await executor.execute();
} catch (error) {
  if (error.message.includes('INVALID_TOKEN')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (error.message.includes('ACCESS_DENIED')) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  if (error.message.includes('RATE_LIMIT_EXCEEDED')) {
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }
  throw error;
}
```

## Common Patterns to Update

### Pattern 1: Legacy Constructor
```typescript
// Find and replace:
new MultiAgentExecutor(config, repo, service, { userId: string })
// With:
new EnhancedMultiAgentExecutor(config, repo, service, authenticatedUser, options)
```

### Pattern 2: Mock User IDs
```typescript
// Find and replace:
'user-123', 'mock-user', 'test-user'
// With:
await authService.validateSession(token, requestContext)
```

### Pattern 3: Direct Repository Access
```typescript
// Add before repository operations:
const access = await authService.validateRepositoryAccess(user, repoId, permission);
if (!access.granted) throw new Error('Access denied');
```

## Testing Migration

### 1. Use Migration Checker
```typescript
import { MigrationChecker } from '@codequal/agents';

const issues = MigrationChecker.checkForLegacyUsage(codeContent);
console.log('Migration issues:', issues);
```

### 2. Gradual Migration
```typescript
import { LegacyMultiAgentExecutor } from '@codequal/agents';

// Temporary compatibility wrapper
const executor = new LegacyMultiAgentExecutor(
  config, repo, service, { userId: 'user-123' }
);
// This will work but show deprecation warnings
```

### 3. Run Tests
```bash
# Run authentication tests
./scripts/run-security-tests.sh

# Test specific components
npm test -- --testPathPattern="auth"
```

## Environment Variables
```bash
# Add to your .env file:
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
```

## Migration Checklist

- [ ] Update all MultiAgentExecutor constructor calls
- [ ] Replace userId strings with AuthenticatedUser objects
- [ ] Add authentication service initialization
- [ ] Update Express.js middleware
- [ ] Add permission validation before repository access
- [ ] Update error handling for auth errors
- [ ] Update environment variables
- [ ] Run migration tests
- [ ] Update documentation

## Rollback Plan

If you need to rollback:
1. Keep legacy code in separate branch
2. Use LegacyMultiAgentExecutor wrapper temporarily
3. Revert database changes using backup
4. Switch back to old environment variables

## Support

- Review: packages/agents/src/multi-agent/examples/supabase-integration-example.ts
- Tests: packages/agents/src/multi-agent/__tests__/
- Documentation: SUPABASE_AUTHENTICATION_COMPLETE.md
EOF

# Create automated migration script
echo -e "${BLUE}🤖 Creating automated migration script...${NC}"

cat > migration-reports/auto-migrate.js << 'EOF'
#!/usr/bin/env node

/**
 * Automated Code Migration Script
 * Helps automatically update legacy authentication patterns
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const MIGRATION_PATTERNS = [
  {
    name: 'Update MultiAgentExecutor imports',
    pattern: /import\s+{\s*MultiAgentExecutor\s*}/g,
    replacement: 'import { EnhancedMultiAgentExecutor, createSupabaseAuthenticationService }'
  },
  {
    name: 'Update constructor calls',
    pattern: /new\s+MultiAgentExecutor\s*\(/g,
    replacement: 'new EnhancedMultiAgentExecutor('
  },
  {
    name: 'Flag userId string parameters',
    pattern: /{\s*userId:\s*['"`][^'"`]+['"`]\s*}/g,
    replacement: '/* TODO: Replace with authenticatedUser object */'
  }
];

function migrateFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let updatedContent = content;
  let changesMade = false;

  MIGRATION_PATTERNS.forEach(({ name, pattern, replacement }) => {
    if (pattern.test(updatedContent)) {
      console.log(`  📝 ${name} in ${filePath}`);
      updatedContent = updatedContent.replace(pattern, replacement);
      changesMade = true;
    }
  });

  if (changesMade) {
    // Create backup
    fs.writeFileSync(`${filePath}.backup`, content);
    // Write updated file
    fs.writeFileSync(filePath, updatedContent);
    return true;
  }
  return false;
}

function main() {
  console.log('🔄 Starting automated migration...');
  
  const files = glob.sync('**/*.{ts,js}', { 
    ignore: ['node_modules/**', '**/*.backup', '**/*.test.*', '**/__tests__/**'] 
  });

  let totalFiles = 0;
  let modifiedFiles = 0;

  files.forEach(file => {
    totalFiles++;
    if (migrateFile(file)) {
      modifiedFiles++;
    }
  });

  console.log(`\n✅ Migration complete:`);
  console.log(`   Files scanned: ${totalFiles}`);
  console.log(`   Files modified: ${modifiedFiles}`);
  console.log(`   Backup files created: ${modifiedFiles}`);
  
  if (modifiedFiles > 0) {
    console.log('\n⚠️  Review the changes and test thoroughly!');
    console.log('   Backup files have .backup extension');
  }
}

if (require.main === module) {
  main();
}
EOF

# Make auto-migrate script executable
chmod +x migration-reports/auto-migrate.js

# Create file list for manual review
echo -e "${BLUE}📄 Creating file review list...${NC}"

find . -name "*.ts" -o -name "*.js" | grep -v node_modules | grep -v __tests__ | head -20 > migration-reports/files-to-review.txt

echo -e "${GREEN}🎉 Migration analysis complete!${NC}"
echo ""
echo -e "${BLUE}📋 Generated Reports:${NC}"
echo "- migration-reports/legacy-patterns.txt    - Legacy patterns found"
echo "- migration-reports/migration-guide.md     - Complete migration guide"
echo "- migration-reports/auto-migrate.js        - Automated migration script"
echo "- migration-reports/files-to-review.txt    - Files to manually review"
echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo "1. Review: cat migration-reports/legacy-patterns.txt"
echo "2. Read guide: cat migration-reports/migration-guide.md"
echo "3. Auto-migrate: node migration-reports/auto-migrate.js"
echo "4. Manual review of critical files"
echo "5. Run tests: ./scripts/run-security-tests.sh"
echo ""
echo -e "${GREEN}✅ Ready to migrate your authentication code!${NC}"