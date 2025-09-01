# Real Tools Testing Guide

## Overview

This guide documents the complete process for testing CodeQual's multi-language security agents with real security analysis tools on a DigitalOcean droplet.

## Architecture

### Tool Management Policy

We implement a **No Silent Failures** policy with three strict modes:

1. **STRICT Mode (Production)**
   - Fails immediately if any tool is missing
   - Never uses mock data
   - Default for production environments

2. **DEGRADED Mode (Staging)**  
   - Also fails if tools are missing
   - Never uses mock data
   - Provides detailed warnings for debugging

3. **MOCK Mode (Development Only)**
   - Returns mock data with clear warnings
   - Requires `NODE_ENV=development` or `NODE_ENV=test`
   - Requires `ALLOW_MOCK_TOOLS=true` explicitly set
   - Mock data clearly marked as "MOCK DATA: This is not real analysis"

### Key Components

```
packages/agents/
├── scripts/
│   ├── install-security-tools.sh      # Installs all security tools
│   ├── create-test-repos.sh          # Creates vulnerable code samples
│   ├── run-real-tool-tests.sh        # Executes tools and collects metrics
│   ├── deploy-and-test-tools.sh      # Deployment automation
│   └── execute-droplet-testing.sh    # Master orchestration script
├── src/two-branch/
│   ├── agents/
│   │   ├── ToolAvailabilityManager.ts    # Tool availability checking
│   │   ├── ImprovedJavaSecurityAgent.ts  # Example of proper failure handling
│   │   └── [Other language agents]
│   └── tests/
│       └── integration/
│           └── real-tools-integration.test.ts
└── docs/
    └── REAL_TOOLS_TESTING_GUIDE.md
```

## Prerequisites

### DigitalOcean Droplet Requirements

- **OS**: Ubuntu 20.04 or 22.04 LTS
- **RAM**: Minimum 4GB (8GB recommended)
- **Storage**: Minimum 20GB
- **Access**: SSH key authentication configured

### Local Requirements

- Node.js 16+ installed
- npm or yarn package manager
- SSH client
- `jq` for JSON parsing (optional but recommended)

## Installation Process

### Step 1: Prepare the Droplet

```bash
# Set environment variables
export DROPLET_IP="your.droplet.ip.address"
export DROPLET_USER="root"  # or your sudo user

# Make scripts executable
chmod +x scripts/*.sh
```

### Step 2: Run Master Script

The easiest way to set up everything:

```bash
cd packages/agents/scripts
./execute-droplet-testing.sh
```

This interactive script provides options for:
1. Full installation and testing
2. Individual component installation
3. Test execution
4. Results viewing
5. Health monitoring

### Step 3: Manual Installation (Alternative)

If you prefer manual control:

```bash
# 1. Install security tools
scp install-security-tools.sh $DROPLET_USER@$DROPLET_IP:/tmp/
ssh $DROPLET_USER@$DROPLET_IP "bash /tmp/install-security-tools.sh"

# 2. Create test repositories
scp create-test-repos.sh $DROPLET_USER@$DROPLET_IP:/tmp/
ssh $DROPLET_USER@$DROPLET_IP "bash /tmp/create-test-repos.sh"

# 3. Run tests
scp run-real-tool-tests.sh $DROPLET_USER@$DROPLET_IP:/tmp/
ssh $DROPLET_USER@$DROPLET_IP "bash /tmp/run-real-tool-tests.sh"
```

## Security Tools Matrix

### Language-Tool Mapping

| Language | Security Tools | Detection Capabilities |
|----------|---------------|----------------------|
| **Java** | SpotBugs, PMD, Checkstyle | SQL injection, resource leaks, hardcoded passwords, XSS, command injection |
| **PHP** | PHPCS, Psalm, PHPStan | SQL injection, XSS, command injection, file inclusion, weak hashing |
| **C++** | Cppcheck, Clang-tidy | Buffer overflow, format strings, memory leaks, use-after-free, race conditions |
| **Rust** | cargo-audit, Clippy | Unsafe code, panics, unwrap usage, dependency vulnerabilities |
| **Python** | Bandit, PyLint, Safety | SQL injection, command injection, insecure deserialization, weak crypto |
| **Go** | gosec, staticcheck, golangci-lint | SQL injection, weak random, hardcoded credentials, integer overflow |
| **Ruby** | Brakeman, RuboCop, bundler-audit | Mass assignment, XSS, SQL injection, insecure deserialization |
| **JavaScript** | ESLint, Semgrep | XSS, eval usage, prototype pollution, RegEx DoS |

## Test Repositories

Each test repository contains intentionally vulnerable code for testing:

### Java Vulnerabilities (`/opt/test-repos/java-sample`)
```java
// SQL Injection
String query = "SELECT * FROM users WHERE id = " + userId;

// Hardcoded Password
private static final String PASSWORD = "admin123";

// Path Traversal
File file = new File("/uploads/" + filename);
```

### PHP Vulnerabilities (`/opt/test-repos/php-sample`)
```php
// SQL Injection
$query = "SELECT * FROM users WHERE id = " . $id;

// XSS
echo "<h1>Welcome " . $name . "</h1>";

// Command Injection
system("ping -c 4 " . $host);
```

### C++ Vulnerabilities (`/opt/test-repos/cpp-sample`)
```cpp
// Buffer Overflow
char buffer[10];
strcpy(buffer, input);

// Use After Free
delete[] data;
data[0] = 100;
```

## Running Tests

### Integration Tests

Run the full integration test suite:

```bash
# On the droplet
cd /opt/codequal-tests/agents
NODE_ENV=production TOOL_MODE=strict npm test src/two-branch/tests/integration/real-tools-integration.test.ts
```

### Individual Tool Tests

Test specific language tools:

```bash
# Java tools
spotbugs -textui /opt/test-repos/java-sample
pmd check -d /opt/test-repos/java-sample -R rulesets/java/quickstart.xml

# PHP tools
phpcs --standard=PSR2 /opt/test-repos/php-sample
psalm --no-cache /opt/test-repos/php-sample

# C++ tools
cppcheck --enable=all /opt/test-repos/cpp-sample
clang-tidy /opt/test-repos/cpp-sample/vulnerable.cpp
```

## Performance Metrics

### Expected Performance Ranges

| Tool | Expected Time | Issues Found |
|------|--------------|--------------|
| SpotBugs | 500-2000ms | 5-15 issues |
| PMD | 300-1000ms | 10-20 issues |
| PHPCS | 100-500ms | 15-30 issues |
| Psalm | 500-1500ms | 10-25 issues |
| Cppcheck | 200-800ms | 5-15 issues |
| Bandit | 100-400ms | 10-20 issues |
| gosec | 200-600ms | 8-15 issues |
| Brakeman | 300-1000ms | 10-20 issues |

### Collecting Metrics

Results are automatically saved to:
- Droplet: `/tmp/tool-test-results/test-report-[timestamp].json`
- Local: `./results/test-report-[timestamp].json`

View results:
```bash
# Pretty print JSON report
cat results/test-report-*.json | jq

# Summary only
cat results/test-report-*.json | jq '.summary'

# Performance metrics
cat results/test-report-*.json | jq '.test_results | to_entries[] | .value | to_entries[] | select(.value.execution_time_ms != null) | "\(.key): \(.value.execution_time_ms)ms"'
```

## Environment Configuration

### Production Settings
```bash
export NODE_ENV=production
export TOOL_MODE=strict
# No mock data allowed
```

### Development Settings
```bash
export NODE_ENV=development
export TOOL_MODE=mock
export ALLOW_MOCK_TOOLS=true  # Required for mock mode
```

### Testing Settings
```bash
export NODE_ENV=test
export TOOL_MODE=strict  # Use real tools for CI/CD
```

## Troubleshooting

### Common Issues

1. **Tool Not Found**
   ```
   Error: CRITICAL: Tool spotbugs is required but not installed
   ```
   Solution: Run `install-security-tools.sh` to install missing tools

2. **Permission Denied**
   ```
   bash: /tmp/install-security-tools.sh: Permission denied
   ```
   Solution: `chmod +x install-security-tools.sh` before copying

3. **Connection Refused**
   ```
   ssh: connect to host xxx.xxx.xxx.xxx port 22: Connection refused
   ```
   Solution: Verify droplet IP and ensure SSH is running

4. **Mock Data in Production**
   ```
   Error: MOCK mode is only allowed in development/test environments
   ```
   Solution: Set `NODE_ENV=production` and remove `ALLOW_MOCK_TOOLS`

### Health Check

Run health check to verify tool status:

```bash
ssh $DROPLET_USER@$DROPLET_IP << 'EOF'
for tool in java spotbugs pmd checkstyle php phpcs psalm phpstan cppcheck clang-tidy cargo cargo-audit bandit pylint go gosec ruby brakeman eslint semgrep; do
  if command -v $tool &> /dev/null; then
    echo "✅ $tool installed"
  else
    echo "❌ $tool missing"
  fi
done
EOF
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Security Tools Testing

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  test-security-tools:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: |
        cd packages/agents
        npm install
    
    - name: Build
      run: |
        cd packages/agents
        npm run build
    
    - name: Run tests (STRICT mode)
      env:
        NODE_ENV: production
        TOOL_MODE: strict
      run: |
        cd packages/agents
        npm test src/two-branch/tests/integration/real-tools-integration.test.ts
```

## Best Practices

### 1. Always Use STRICT Mode in Production
```typescript
// Good
process.env.NODE_ENV = 'production';
process.env.TOOL_MODE = 'strict';

// Bad - Never in production
process.env.ALLOW_MOCK_TOOLS = 'true';
```

### 2. Handle Tool Failures Explicitly
```typescript
// Good - Explicit failure
if (!toolInstalled) {
  throw new Error(`Tool ${toolName} is required but not installed`);
}

// Bad - Silent fallback
if (!toolInstalled) {
  return mockData();  // Silent failure!
}
```

### 3. Monitor Tool Health
```typescript
const health = await toolAvailabilityManager.getHealthStatus();
if (health.status === 'unhealthy') {
  // Alert monitoring system
  logger.error('Critical: Security tools unavailable', health.missingTools);
}
```

### 4. Regular Tool Updates
```bash
# Schedule regular updates
0 2 * * 0 /usr/local/bin/update-security-tools.sh
```

## Summary

The real tools testing system ensures:

1. **No Silent Failures**: Tools either work or fail explicitly
2. **Production Safety**: Mock data never used in production
3. **Clear Communication**: Every response indicates data quality
4. **Performance Monitoring**: Metrics collected for all tools
5. **Comprehensive Coverage**: All major languages and vulnerabilities tested

Remember: **It's better to fail loudly than succeed falsely.**

## Next Steps

After completing the setup:

1. Review performance metrics in `./results/`
2. Compare detected issues with expected vulnerabilities
3. Fine-tune detection patterns based on results
4. Set up monitoring alerts for tool health
5. Schedule regular tool updates
6. Integrate with CI/CD pipeline

## Support

For issues or questions:
- Check logs: `/var/log/codequal-tools-install.log`
- Review test results: `/tmp/tool-test-results/`
- Verify tool status: `./execute-droplet-testing.sh` → Option 7