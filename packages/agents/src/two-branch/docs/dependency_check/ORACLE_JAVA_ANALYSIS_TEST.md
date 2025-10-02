# Oracle Cloud Java Analysis Test

**Date**: October 2, 2025
**Purpose**: Test full Java analysis with all tools including Dependency-Check PostgreSQL backend

---

## Overview

This test validates the complete Java tool orchestration:
- **PMD**: Code quality (priority 1-2 filtering)
- **Checkstyle**: Code style (changed files only)
- **Semgrep**: Security scanning
- **Dependency-Check**: CVE detection with PostgreSQL backend (208K+ CVEs)

**Repository**: Apache Kafka (3,472 Java files)
**PR**: #17620

---

## Prerequisites

### Oracle Cloud Instance
```bash
IP: 129.213.49.128
User: opc
SSH Key: /Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-05-08.key
Architecture: ARM64 (native, no emulation)
```

### PostgreSQL Database
```bash
Host: 127.0.0.1:5432
Database: depcheck
CVE Count: 208,531 (as of Oct 2, 2025)
User: depcheck_scanner (read-only)
Password: depcheck_scan_2025
```

### Docker Image
```bash
Image: iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-java-v6.0-arm
Version: v6.0
Tools: PMD 7.7.0, Checkstyle 10.20.2, Semgrep 1.95.0, Dependency-Check 12.1.5
JDBC Driver: /tmp/jdbc-drivers/postgresql-42.7.1.jar
```

---

## Deployment Steps

### 1. Copy Test File to Oracle

```bash
# Set environment variables
export SSH_KEY="/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-05-08.key"
export ORACLE_IP="129.213.49.128"

# Create test directory on Oracle
ssh -i $SSH_KEY opc@$ORACLE_IP 'mkdir -p /home/opc/codequal/tests'

# Copy test file
scp -i $SSH_KEY \
  src/two-branch/tests/integration/test-java-full-analysis.ts \
  opc@$ORACLE_IP:/home/opc/codequal/tests/

# Copy dependencies (if needed)
scp -i $SSH_KEY \
  src/two-branch/tools/java/java-tool-orchestrator.ts \
  opc@$ORACLE_IP:/home/opc/codequal/tests/
```

### 2. Install Node.js and TypeScript (if not already installed)

```bash
ssh -i $SSH_KEY opc@$ORACLE_IP <<'EOF'
  # Install Node.js 20
  curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
  sudo yum install -y nodejs

  # Install TypeScript and ts-node globally
  sudo npm install -g typescript ts-node

  # Verify installation
  node --version
  npm --version
  tsc --version
EOF
```

### 3. Clone CodeQual Repository on Oracle

```bash
ssh -i $SSH_KEY opc@$ORACLE_IP <<'EOF'
  # Clone repository
  cd /home/opc
  git clone https://github.com/your-org/codequal.git

  # Or if already exists, pull latest
  cd /home/opc/codequal/packages/agents
  git pull origin main

  # Install dependencies
  npm install

  # Build TypeScript
  npm run build
EOF
```

---

## Running the Test

### Option 1: Direct Execution on Oracle

```bash
# SSH to Oracle
ssh -i $SSH_KEY opc@$ORACLE_IP

# Navigate to agents package
cd /home/opc/codequal/packages/agents

# Run the integration test
npx ts-node src/two-branch/tests/integration/test-java-full-analysis.ts
```

### Option 2: Remote Execution from Local Machine

```bash
# Execute test remotely and stream output
ssh -i $SSH_KEY opc@$ORACLE_IP \
  'cd /home/opc/codequal/packages/agents && npx ts-node src/two-branch/tests/integration/test-java-full-analysis.ts'
```

### Option 3: Background Execution with Logging

```bash
# Start test in background with logging
ssh -i $SSH_KEY opc@$ORACLE_IP <<'EOF'
  cd /home/opc/codequal/packages/agents
  nohup npx ts-node src/two-branch/tests/integration/test-java-full-analysis.ts \
    > /tmp/java-analysis-test.log 2>&1 &

  echo "Test started in background, PID: $!"
  echo "Monitor logs: tail -f /tmp/java-analysis-test.log"
EOF

# Monitor logs from local machine
ssh -i $SSH_KEY opc@$ORACLE_IP 'tail -f /tmp/java-analysis-test.log'
```

---

## Expected Results

### Main Branch Analysis (trunk)
```
Duration: ~60-90 seconds
Tools executed: 3 (PMD, Checkstyle, Semgrep)
Expected issues:
  - PMD: ~2,000-2,500 (priority 1-2 only)
  - Checkstyle: ~5,000+ (all files)
  - Semgrep: ~15-25 security issues
Total: ~7,000-7,500 issues
```

**Note**: Dependency-Check skipped on main branch (correct behavior)

### PR Branch Analysis (pull/17620/head)
```
Duration: ~60-90 seconds
Tools executed: 4 (PMD, Checkstyle, Semgrep, Dependency-Check)
Changed files: ~10-30 Java files
Expected issues:
  - PMD: ~50-150 (in changed files)
  - Checkstyle: ~100-300 (changed files only)
  - Semgrep: ~2-5 security issues
  - Dependency-Check: 0-3 CVEs (depends on dependencies)
Total: ~150-450 issues
```

**Note**: Dependency-Check runs ONLY on PR branch

### Dependency-Check Specific Results
```
PostgreSQL Backend: ✅ WORKING
Connection: jdbc:postgresql://127.0.0.1:5432/depcheck
CVE Database: 208,531 CVEs
Scan Duration: ~5-10 seconds (cached database)
Expected CVEs: 0-3 (Apache Kafka is well-maintained)
```

---

## Validation Checklist

After running the test, verify:

### ✅ Tool Execution
- [ ] Semgrep executed on both branches
- [ ] PMD executed on both branches
- [ ] Checkstyle executed on both branches
- [ ] Dependency-Check executed ONLY on PR branch
- [ ] Dependency-Check skipped on main branch

### ✅ PostgreSQL Integration
- [ ] Dependency-Check connected to PostgreSQL
- [ ] No H2 database errors
- [ ] JDBC driver loaded successfully
- [ ] CVE count matches database (208,531)

### ✅ Performance
- [ ] Main branch analysis: < 120 seconds
- [ ] PR branch analysis: < 120 seconds
- [ ] Dependency-Check: < 15 seconds
- [ ] Total test duration: < 300 seconds (5 minutes)

### ✅ Results Quality
- [ ] PMD priority filtering working (1-2 only)
- [ ] Checkstyle analyzing changed files only in PR
- [ ] Semgrep smart selection working
- [ ] Dependency-Check JSON parsing successful
- [ ] Issue counts reasonable (not 0, not > 10,000)

---

## Troubleshooting

### Issue: Docker Image Not Found
```bash
# Pull the image on Oracle
ssh -i $SSH_KEY opc@$ORACLE_IP 'docker pull iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-java-v6.0-arm'
```

### Issue: PostgreSQL Connection Failed
```bash
# Check PostgreSQL running
ssh -i $SSH_KEY opc@$ORACLE_IP 'ps aux | grep postgres'

# Test connection
ssh -i $SSH_KEY opc@$ORACLE_IP \
  'PGPASSWORD="depcheck_scan_2025" psql -h 127.0.0.1 -U depcheck_scanner -d depcheck -c "SELECT COUNT(*) FROM vulnerability;"'
```

### Issue: JDBC Driver Not Found
```bash
# Verify JDBC driver exists
ssh -i $SSH_KEY opc@$ORACLE_IP 'ls -lh /tmp/jdbc-drivers/postgresql-42.7.1.jar'

# If missing, download it
ssh -i $SSH_KEY opc@$ORACLE_IP <<'EOF'
  mkdir -p /tmp/jdbc-drivers
  curl -L https://jdbc.postgresql.org/download/postgresql-42.7.1.jar \
    -o /tmp/jdbc-drivers/postgresql-42.7.1.jar
EOF
```

### Issue: Repository Clone Failed
```bash
# Check if repository exists
ssh -i $SSH_KEY opc@$ORACLE_IP 'ls -la /tmp/kafka-repo'

# If needed, manually clone
ssh -i $SSH_KEY opc@$ORACLE_IP \
  'git clone https://github.com/apache/kafka.git /tmp/kafka-repo'
```

---

## Performance Benchmarks

Based on previous calibration (2025-09-29):

| Operation | Optimal Config | Time | Files |
|-----------|---------------|------|-------|
| PMD Scan | 4 parallel, 300 files/batch, 3 threads | 63s | 3,472 |
| Semgrep | 4 parallel, smart selection | 48s | ~200 files |
| Checkstyle | 2 parallel, changed files only | 20s | ~30 files |
| Dependency-Check | PostgreSQL backend | 5-10s | All dependencies |
| **Total (Main)** | Sequential | ~90-130s | 3,472 |
| **Total (PR)** | Sequential | ~60-90s | ~30 changed |

---

## Next Steps After Testing

### If Test Passes ✅
1. Commit changes to JavaToolOrchestrator
2. Update V9 integration to use new orchestrator
3. Test with V9 report generation
4. Deploy to production

### If Test Fails ❌
1. Review error logs in `/tmp/java-analysis-test.log`
2. Check individual tool outputs:
   - `/tmp/kafka-repo/pmd-results-*.json`
   - `/tmp/kafka-repo/checkstyle-results-*.json`
   - `/tmp/kafka-repo/semgrep-results-*.json`
   - `/tmp/kafka-repo/dependency-check-results-*/dependency-check-report.json`
3. Verify tool installation in Docker image
4. Test individual tools manually

---

## Manual Tool Testing (if needed)

### Test PMD Standalone
```bash
ssh -i $SSH_KEY opc@$ORACLE_IP <<'EOF'
  docker run --rm \
    -v /tmp/kafka-repo:/workspace \
    iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-java-v6.0-arm \
    bash -c 'pmd check -d /workspace -f json -R category/java/errorprone.xml --minimum-priority 2'
EOF
```

### Test Dependency-Check with PostgreSQL
```bash
ssh -i $SSH_KEY opc@$ORACLE_IP <<'EOF'
  docker run --rm \
    -v /tmp/kafka-repo:/workspace \
    -v /tmp/jdbc-drivers:/jdbc:ro \
    --network host \
    -e CLASSPATH="/opt/dependency-check/lib/*:/jdbc/*" \
    iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-java-v6.0-arm \
    bash -c 'dependency-check \
      --scan /workspace \
      --format JSON \
      --out /workspace/test-results \
      --connectionString jdbc:postgresql://127.0.0.1:5432/depcheck \
      --dbUser depcheck_scanner \
      --dbPassword depcheck_scan_2025 \
      --dbDriverName org.postgresql.Driver \
      --dbDriverPath /jdbc/postgresql-42.7.1.jar'
EOF
```

---

**Last Updated**: October 2, 2025
**Status**: Ready for testing
**Platform**: Oracle Cloud A1.Flex ARM64
**Next Action**: Deploy and execute test on Oracle Cloud
