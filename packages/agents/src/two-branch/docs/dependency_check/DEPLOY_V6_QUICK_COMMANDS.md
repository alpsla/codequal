# Deploy Dependency-Check v6.0 - Quick Commands

**Date:** 2025-10-01
**Status:** Ready for deployment
**Estimated Time:** 1-2 hours (including CVE load)

---

## Prerequisites

- [x] Docker image `analyzer:lang-java-v6.0-arm` built locally
- [ ] Oracle Container Registry credentials
- [ ] Oracle Cloud SSH access
- [ ] NVD API key

---

## Step 1: Push to Oracle Container Registry (5 minutes)

### Login to Oracle Registry

```bash
# Get credentials from Oracle Cloud Console
# Format: tenancy-namespace/username
docker login iad.ocir.io
```

### Tag and Push Image

```bash
# Tag
docker tag analyzer:lang-java-v6.0-arm \
  iad.ocir.io/codequal/analyzer:lang-java-v6.0-arm

# Push (will take ~5 minutes)
docker push iad.ocir.io/codequal/analyzer:lang-java-v6.0-arm
```

**Expected Output:**
```
The push refers to repository [iad.ocir.io/codequal/analyzer]
...
lang-java-v6.0-arm: digest: sha256:... size: ...
```

---

## Step 2: Deploy to Oracle Cloud (2 minutes)

### SSH to Oracle Cloud

```bash
export SSH_KEY="/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-05-08.key"
export ORACLE_IP="129.213.49.128"

ssh -i "$SSH_KEY" opc@$ORACLE_IP
```

### Pull New Image

```bash
# On Oracle Cloud VM
docker pull iad.ocir.io/codequal/analyzer:lang-java-v6.0-arm
```

**Verify:**
```bash
docker images | grep v6.0
# Should show: iad.ocir.io/codequal/analyzer lang-java-v6.0-arm ...
```

---

## Step 3: Update CVE Load Script (1 minute)

### Update Script to Use v6.0

```bash
# On Oracle Cloud VM
cd /tmp

# Backup old script
cp continue-cve-load.sh continue-cve-load.sh.v5.3.bak

# Update image version
sed -i 's/analyzer:lang-java-v5.3-arm/iad.ocir.io\/codequal\/analyzer:lang-java-v6.0-arm/g' continue-cve-load.sh
```

**Verify Update:**
```bash
grep "v6.0" continue-cve-load.sh
# Should show: iad.ocir.io/codequal/analyzer:lang-java-v6.0-arm
```

---

## Step 4: Run CVE Database Load (15-20 minutes)

### Start Load

```bash
# On Oracle Cloud VM
/tmp/continue-cve-load.sh
```

### Monitor Progress

```bash
# In a separate terminal
ssh -i "$SSH_KEY" opc@$ORACLE_IP "tail -f /tmp/cve-load-postgres-continue.log"
```

**Expected Output:**
```
Processing vulnerabilities...
[INFO] Processing 2018 CVEs... ✅
[INFO] Processing 2019 CVEs... ✅
[INFO] Processing 2020 CVEs... ✅
[INFO] Processing 2021 CVEs... ✅ (includes Log4Shell)
[INFO] Processing 2022 CVEs... ✅
[INFO] Processing 2023 CVEs... ✅
[INFO] Processing 2024 CVEs... ✅ (CVSS v4 support!)
[INFO] Processing 2025 CVEs... ✅ (CVSS v4 support!)

✅ Database update complete!
Total CVEs: ~312,353
```

**If CVSS v4 errors occur:**
```
❌ ROLLBACK: Revert to v5.3 image and report issue
```

---

## Step 5: Verify Database (2 minutes)

### Check CVE Count

```bash
ssh -i "$SSH_KEY" opc@$ORACLE_IP << 'EOF'
PGPASSWORD='depcheck_update_2025' psql -h 127.0.0.1 -U depcheck_updater -d depcheck -c "
  SELECT
    COUNT(*) as total_cves,
    MIN(cve) as oldest,
    MAX(cve) as newest
  FROM vulnerability;
"
EOF
```

**Expected:**
```
 total_cves | oldest        | newest
------------+---------------+---------------
     312353 | CVE-1999-0001 | CVE-2025-XXXX
```

### Check Log4Shell Presence

```bash
ssh -i "$SSH_KEY" opc@$ORACLE_IP << 'EOF'
PGPASSWORD='depcheck_update_2025' psql -h 127.0.0.1 -U depcheck_updater -d depcheck -c "
  SELECT cve, cvssV3BaseScore, description
  FROM vulnerability
  WHERE cve = 'CVE-2021-44228';
"
EOF
```

**Expected:**
```
       cve        | cvssV3BaseScore |        description
------------------+-----------------+---------------------------
 CVE-2021-44228   | 10.0            | Apache Log4j2 RCE...
```

---

## Step 6: Validate Log4Shell Detection (5 minutes)

### Copy Validation Script

```bash
scp -i "$SSH_KEY" \
  "/Users/alpinro/Code Prjects/codequal/packages/agents/src/two-branch/scripts/validate-log4shell-detection.sh" \
  opc@$ORACLE_IP:/tmp/
```

### Run Validation

```bash
ssh -i "$SSH_KEY" opc@$ORACLE_IP << 'EOF'
source ~/.env
export NVD_API_KEY
/tmp/validate-log4shell-detection.sh
EOF
```

**Expected Output:**
```
=== Log4Shell Validation Test ===

Creating test project with vulnerable log4j-core:2.14.1...
Running Dependency-Check with v6.0 image...
Analyzing pom.xml...

✅ VALIDATION PASSED

Results:
- Log4Shell (CVE-2021-44228) detected: ✅
- Severity: CRITICAL (CVSS 10.0)
- Exit code: 1 (expected)
- Duration: ~30 seconds

🎉 Dependency-Check 12.1.5 successfully detects Log4Shell!
```

---

## Step 7: Production Integration (5 minutes)

### Update V9ToolOrchestrator (Already Done)

```bash
# On local machine
grep "dockerImage.*v6.0" "/Users/alpinro/Code Prjects/codequal/packages/agents/src/two-branch/tools/java/java-tool-orchestrator.ts"

# Expected:
# dockerImage: string = 'iad.ocir.io/codequal/analyzer:lang-java-v6.0-arm'
```

### Test with Real Repository

```bash
# On local machine
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents

# Run test with Apache Kafka
npx ts-node src/two-branch/tests/test-v9-with-dependency-check.ts
```

**Expected:**
- ✅ Repository cloned
- ✅ Files analyzed
- ✅ Dependency-Check runs successfully
- ✅ No vulnerabilities found (Kafka is up-to-date)
- ✅ Report generated

---

## Rollback Commands (If Needed)

### Revert to v5.3

```bash
# On Oracle Cloud VM
docker pull iad.ocir.io/codequal/analyzer:lang-java-v5.3-arm

# Update scripts
sed -i 's/v6.0/v5.3/g' /tmp/*.sh

# Accept partial database (67,349 CVEs)
```

---

## Success Checklist

### Build & Deploy ✅
- [x] Docker image builds successfully (local)
- [ ] Image pushed to Oracle Container Registry
- [ ] Image pulled on Oracle Cloud VM

### CVE Database Load
- [ ] Load script updated to v6.0
- [ ] CVE load completes without CVSS v4 errors
- [ ] ~245,000 new CVEs loaded (2018-2025)
- [ ] Total CVEs: ~312,353

### Validation
- [ ] Log4Shell CVE in database
- [ ] Detection test passes
- [ ] CVSS 10.0 severity confirmed
- [ ] V9 integration working

---

## Troubleshooting

### "Cannot connect to registry"

```bash
# Check credentials
docker login iad.ocir.io

# Format: tenancy-namespace/username
# Password: Auth Token (not regular password)
```

### "CVSS v4 errors still occurring"

```bash
# Check Dependency-Check version
docker run --rm iad.ocir.io/codequal/analyzer:lang-java-v6.0-arm \
  bash -c "dependency-check --version"

# Expected: Dependency-Check Core version 12.1.5

# If showing 11.1.0, rebuild image
```

### "Database load hangs"

```bash
# Check PostgreSQL status
ssh opc@$ORACLE_IP "sudo systemctl status postgresql"

# Check logs
ssh opc@$ORACLE_IP "tail -100 /tmp/cve-load-postgres-continue.log"

# Restart if needed
ssh opc@$ORACLE_IP "sudo systemctl restart postgresql"
```

---

## Quick Copy-Paste Sequence

```bash
# Complete deployment in one go
export SSH_KEY="/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-05-08.key"
export ORACLE_IP="129.213.49.128"

# 1. Tag and push
docker tag analyzer:lang-java-v6.0-arm iad.ocir.io/codequal/analyzer:lang-java-v6.0-arm
docker push iad.ocir.io/codequal/analyzer:lang-java-v6.0-arm

# 2. Deploy and load
ssh -i "$SSH_KEY" opc@$ORACLE_IP << 'EOF'
docker pull iad.ocir.io/codequal/analyzer:lang-java-v6.0-arm
cd /tmp
cp continue-cve-load.sh continue-cve-load.sh.v5.3.bak
sed -i 's/analyzer:lang-java-v5.3-arm/iad.ocir.io\/codequal\/analyzer:lang-java-v6.0-arm/g' continue-cve-load.sh
/tmp/continue-cve-load.sh
EOF

# 3. Validate (after load completes)
scp -i "$SSH_KEY" \
  "src/two-branch/scripts/validate-log4shell-detection.sh" \
  opc@$ORACLE_IP:/tmp/
ssh -i "$SSH_KEY" opc@$ORACLE_IP "source ~/.env && export NVD_API_KEY && /tmp/validate-log4shell-detection.sh"
```

---

**Next Session Start Here:** Run the quick copy-paste sequence above, then check results!

**Estimated Total Time:** 30-40 minutes (mostly waiting for CVE load)
