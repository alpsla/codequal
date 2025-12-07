# Oracle Cloud Testing Guide

Complete guide for connecting to Oracle A1.Flex instance, running V9 tests, and downloading reports.

---

## 📋 Table of Contents

1. [Environment Setup](#environment-setup)
2. [Connecting to Oracle Cloud](#connecting-to-oracle-cloud)
3. [Running V9 Tests](#running-v9-tests)
4. [Downloading Reports](#downloading-reports)
5. [Troubleshooting](#troubleshooting)

---

## 🔧 Environment Setup

### Required Files

**SSH Key Location:**
```bash
/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key
```

**Oracle Instance:**
- IP: `129.213.49.128`
- User: `opc`
- Instance Type: Oracle A1.Flex (ARM64)

### Environment Variables

```bash
export SSH_KEY="/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key"
export ORACLE_IP="129.213.49.128"
export ORACLE_USER="opc"
```

Add to your `~/.bashrc` or `~/.zshrc`:
```bash
# Oracle Cloud Configuration
export SSH_KEY="/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key"
export ORACLE_IP="129.213.49.128"
export ORACLE_USER="opc"

# Convenience alias
alias oracle-ssh='ssh -i "$SSH_KEY" $ORACLE_USER@$ORACLE_IP'
```

Then reload:
```bash
source ~/.bashrc  # or source ~/.zshrc
```

---

## 🔗 Connecting to Oracle Cloud

### Basic SSH Connection

```bash
ssh -i "/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key" opc@129.213.49.128
```

Or with environment variables:
```bash
ssh -i "$SSH_KEY" $ORACLE_USER@$ORACLE_IP
```

Or with the alias:
```bash
oracle-ssh
```

### Quick Status Check

Check if Oracle is accessible:
```bash
ssh -i "$SSH_KEY" $ORACLE_USER@$ORACLE_IP 'echo "✅ Oracle cloud connected successfully"'
```

### Check CodeQual Setup

Verify the CodeQual workspace:
```bash
ssh -i "$SSH_KEY" $ORACLE_USER@$ORACLE_IP 'ls -lah ~/codequal/packages/agents'
```

---

## 🧪 Running V9 Tests

### Test File Location

**On Oracle Cloud:**
```
/home/opc/codequal/packages/agents/tests/integration/test-v9-lite-e2e.ts
```

### Run Test Directly

**Basic execution:**
```bash
ssh -i "$SSH_KEY" $ORACLE_USER@$ORACLE_IP \
  'cd ~/codequal/packages/agents && npx ts-node tests/integration/test-v9-lite-e2e.ts'
```

**With timeout protection (recommended):**
```bash
ssh -i "$SSH_KEY" $ORACLE_USER@$ORACLE_IP \
  'cd ~/codequal/packages/agents && timeout 600 npx ts-node tests/integration/test-v9-lite-e2e.ts'
```

### Run Test in Background

**Start test in background:**
```bash
ssh -i "$SSH_KEY" $ORACLE_USER@$ORACLE_IP \
  'cd ~/codequal/packages/agents && nohup npx ts-node tests/integration/test-v9-lite-e2e.ts > /tmp/v9-test.log 2>&1 & echo $!'
```

This will output the process ID. Save it for monitoring.

**Monitor progress:**
```bash
ssh -i "$SSH_KEY" $ORACLE_USER@$ORACLE_IP 'tail -f /tmp/v9-test.log'
```

Press `Ctrl+C` to stop monitoring (test continues running).

**Check if test is still running:**
```bash
ssh -i "$SSH_KEY" $ORACLE_USER@$ORACLE_IP 'ps aux | grep test-v9-lite-e2e'
```

### Run Specific Test Scenarios

**TypeScript test:**
```bash
ssh -i "$SSH_KEY" $ORACLE_USER@$ORACLE_IP \
  'cd ~/codequal/packages/agents && npx ts-node tests/integration/test-v9-typescript-lite-e2e.ts'
```

**Python test:**
```bash
ssh -i "$SSH_KEY" $ORACLE_USER@$ORACLE_IP \
  'cd ~/codequal/packages/agents && npx ts-node tests/integration/python/test-v9-python-lite-e2e.ts'
```

### Check Test Results

**View recent test summary:**
```bash
ssh -i "$SSH_KEY" $ORACLE_USER@$ORACLE_IP \
  'tail -100 /tmp/v9-test.log | grep -E "PASSED|FAILED|Total Issues|Duration"'
```

**Check for errors:**
```bash
ssh -i "$SSH_KEY" $ORACLE_USER@$ORACLE_IP \
  'grep -E "Error|error|ERROR|FAILED" /tmp/v9-test.log | tail -20'
```

---

## 📥 Downloading Reports

### Report Locations

**Remote (Oracle Cloud):**
```
/home/opc/codequal/packages/agents/tests/integration/test-outputs/
```

**Local (Your Machine):**
```
/Users/alpinro/Code Prjects/codequal/packages/agents/tests/integration/test-outputs/
```

### List Available Reports

**List all reports on Oracle:**
```bash
ssh -i "$SSH_KEY" $ORACLE_USER@$ORACLE_IP \
  'ls -lth ~/codequal/packages/agents/tests/integration/test-outputs/*.md | head -20'
```

**List React reports only:**
```bash
ssh -i "$SSH_KEY" $ORACLE_USER@$ORACLE_IP \
  'ls -lth ~/codequal/packages/agents/tests/integration/test-outputs/v9-lite-react*.md | head -10'
```

**List TypeScript reports only:**
```bash
ssh -i "$SSH_KEY" $ORACLE_USER@$ORACLE_IP \
  'ls -lth ~/codequal/packages/agents/tests/integration/test-outputs/v9-lite-typescript*.md | head -10'
```

### Download Single Report

**Most recent report:**
```bash
# First, find the most recent report
LATEST_REPORT=$(ssh -i "$SSH_KEY" $ORACLE_USER@$ORACLE_IP \
  'ls -t ~/codequal/packages/agents/tests/integration/test-outputs/*.md | head -1')

# Then download it
scp -i "$SSH_KEY" \
  "$ORACLE_USER@$ORACLE_IP:$LATEST_REPORT" \
  "/Users/alpinro/Code Prjects/codequal/packages/agents/tests/integration/test-outputs/"
```

**Specific report by name:**
```bash
scp -i "$SSH_KEY" \
  'opc@129.213.49.128:/home/opc/codequal/packages/agents/tests/integration/test-outputs/v9-lite-react-(create-react-app)---local-branch-autofix-test-1763138920745.md' \
  "/Users/alpinro/Code Prjects/codequal/packages/agents/tests/integration/test-outputs/"
```

### Download All Reports

**Download entire test-outputs directory:**
```bash
scp -r -i "$SSH_KEY" \
  $ORACLE_USER@$ORACLE_IP:/home/opc/codequal/packages/agents/tests/integration/test-outputs/ \
  "/Users/alpinro/Code Prjects/codequal/packages/agents/tests/integration/"
```

**Download only recent reports (last 10):**
```bash
ssh -i "$SSH_KEY" $ORACLE_USER@$ORACLE_IP \
  'ls -t ~/codequal/packages/agents/tests/integration/test-outputs/*.md | head -10' | \
while read -r file; do
  scp -i "$SSH_KEY" \
    "$ORACLE_USER@$ORACLE_IP:$file" \
    "/Users/alpinro/Code Prjects/codequal/packages/agents/tests/integration/test-outputs/"
done
```

### Sync Reports (Incremental)

**Use rsync for efficient syncing:**
```bash
rsync -avz --progress \
  -e "ssh -i \"$SSH_KEY\"" \
  $ORACLE_USER@$ORACLE_IP:/home/opc/codequal/packages/agents/tests/integration/test-outputs/ \
  "/Users/alpinro/Code Prjects/codequal/packages/agents/tests/integration/test-outputs/"
```

This only downloads new/changed files.

---

## 🔄 Complete Workflow Scripts

### Quick Test & Download

**Run test and download report automatically:**
```bash
#!/bin/bash
# Save as: scripts/oracle-test-and-download.sh

export SSH_KEY="/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key"
export ORACLE_IP="129.213.49.128"
export ORACLE_USER="opc"

echo "🚀 Starting V9 test on Oracle cloud..."
ssh -i "$SSH_KEY" $ORACLE_USER@$ORACLE_IP \
  'cd ~/codequal/packages/agents && npx ts-node tests/integration/test-v9-lite-e2e.ts'

echo ""
echo "📥 Downloading latest report..."
LATEST_REPORT=$(ssh -i "$SSH_KEY" $ORACLE_USER@$ORACLE_IP \
  'ls -t ~/codequal/packages/agents/tests/integration/test-outputs/*.md | head -1')

scp -i "$SSH_KEY" \
  "$ORACLE_USER@$ORACLE_IP:$LATEST_REPORT" \
  "/Users/alpinro/Code Prjects/codequal/packages/agents/tests/integration/test-outputs/"

echo "✅ Report downloaded to: test-outputs/$(basename $LATEST_REPORT)"
```

Make it executable:
```bash
chmod +x scripts/oracle-test-and-download.sh
```

### Background Test with Auto-Download

```bash
#!/bin/bash
# Save as: scripts/oracle-background-test.sh

export SSH_KEY="/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key"
export ORACLE_IP="129.213.49.128"
export ORACLE_USER="opc"

echo "🚀 Starting V9 test in background on Oracle cloud..."
ssh -i "$SSH_KEY" $ORACLE_USER@$ORACLE_IP \
  'cd ~/codequal/packages/agents && nohup npx ts-node tests/integration/test-v9-lite-e2e.ts > /tmp/v9-test.log 2>&1 & echo $!'

echo ""
echo "⏳ Waiting for test to complete (checking every 30s)..."

while ssh -i "$SSH_KEY" $ORACLE_USER@$ORACLE_IP 'pgrep -f test-v9-lite-e2e' > /dev/null; do
  echo "  Test still running... ($(date +%H:%M:%S))"
  sleep 30
done

echo ""
echo "✅ Test completed!"
echo ""
echo "📥 Downloading latest report..."

LATEST_REPORT=$(ssh -i "$SSH_KEY" $ORACLE_USER@$ORACLE_IP \
  'ls -t ~/codequal/packages/agents/tests/integration/test-outputs/*.md | head -1')

scp -i "$SSH_KEY" \
  "$ORACLE_USER@$ORACLE_IP:$LATEST_REPORT" \
  "/Users/alpinro/Code Prjects/codequal/packages/agents/tests/integration/test-outputs/"

echo "✅ Report downloaded: $(basename $LATEST_REPORT)"
```

---

## 🛠️ Troubleshooting

### SSH Connection Issues

**Permission denied (publickey):**
```bash
# Check key permissions
chmod 600 "$SSH_KEY"

# Verify key location
ls -l "$SSH_KEY"
```

**Connection timeout:**
```bash
# Test connectivity
ping -c 3 129.213.49.128

# Check SSH with verbose output
ssh -v -i "$SSH_KEY" $ORACLE_USER@$ORACLE_IP
```

### Test Execution Issues

**ESLint timeout (120s):**
- Check ESLint configuration: `cat /tmp/test-repo-*/eslintrc.json`
- Verify shared tools: `ssh ... 'which eslint'`
- Check patterns in test output: Look for `[ESLint Debug] Files to scan:`

**Out of memory errors:**
```bash
# Check Oracle memory usage
ssh -i "$SSH_KEY" $ORACLE_USER@$ORACLE_IP 'free -h'

# Check disk space
ssh -i "$SSH_KEY" $ORACLE_USER@$ORACLE_IP 'df -h'
```

**Node/npm errors:**
```bash
# Check Node version
ssh -i "$SSH_KEY" $ORACLE_USER@$ORACLE_IP 'node --version'

# Reinstall dependencies
ssh -i "$SSH_KEY" $ORACLE_USER@$ORACLE_IP \
  'cd ~/codequal/packages/agents && npm install'
```

### Report Download Issues

**Report not found:**
```bash
# List all available reports
ssh -i "$SSH_KEY" $ORACLE_USER@$ORACLE_IP \
  'find ~/codequal/packages/agents/tests -name "*.md" -type f'

# Check test-outputs directory
ssh -i "$SSH_KEY" $ORACLE_USER@$ORACLE_IP \
  'ls -lah ~/codequal/packages/agents/tests/integration/test-outputs/'
```

**SCP permission denied:**
```bash
# Check file permissions on Oracle
ssh -i "$SSH_KEY" $ORACLE_USER@$ORACLE_IP \
  'chmod 644 ~/codequal/packages/agents/tests/integration/test-outputs/*.md'

# Check local directory permissions
chmod 755 "/Users/alpinro/Code Prjects/codequal/packages/agents/tests/integration/test-outputs"
```

### Clean Up Old Test Data

**Remove old test repositories:**
```bash
ssh -i "$SSH_KEY" $ORACLE_USER@$ORACLE_IP \
  'rm -rf /tmp/test-repo-* /tmp/kafka-repo /tmp/*-test.log'
```

**Archive old reports (keep last 20):**
```bash
ssh -i "$SSH_KEY" $ORACLE_USER@$ORACLE_IP '
  cd ~/codequal/packages/agents/tests/integration/test-outputs/
  mkdir -p archive
  ls -t *.md | tail -n +21 | xargs -I {} mv {} archive/
'
```

---

## 📊 Monitoring & Logs

### View Real-Time Logs

**Test execution log:**
```bash
ssh -i "$SSH_KEY" $ORACLE_USER@$ORACLE_IP 'tail -f /tmp/v9-test.log'
```

**ESLint debug output:**
```bash
ssh -i "$SSH_KEY" $ORACLE_USER@$ORACLE_IP \
  'grep -E "ESLint Debug|ESLint completed" /tmp/v9-test.log'
```

**Tool performance:**
```bash
ssh -i "$SSH_KEY" $ORACLE_USER@$ORACLE_IP \
  'grep -E "completed: [0-9]+ issues in" /tmp/v9-test.log'
```

### System Resource Monitoring

**CPU and Memory:**
```bash
ssh -i "$SSH_KEY" $ORACLE_USER@$ORACLE_IP 'top -bn1 | head -20'
```

**Disk usage:**
```bash
ssh -i "$SSH_KEY" $ORACLE_USER@$ORACLE_IP 'df -h /tmp /home'
```

**Active processes:**
```bash
ssh -i "$SSH_KEY" $ORACLE_USER@$ORACLE_IP 'ps aux | grep -E "node|npm|ts-node"'
```

---

## 🎯 Quick Reference

### Essential Commands

| Task | Command |
|------|---------|
| **Connect to Oracle** | `ssh -i "$SSH_KEY" opc@129.213.49.128` |
| **Run V9 test** | `ssh ... 'cd ~/codequal/packages/agents && npx ts-node tests/integration/test-v9-lite-e2e.ts'` |
| **List reports** | `ssh ... 'ls -lth ~/codequal/packages/agents/tests/integration/test-outputs/*.md \| head -10'` |
| **Download latest report** | `scp -i "$SSH_KEY" opc@129.213.49.128:$(ssh ... 'ls -t ~/codequal/.../test-outputs/*.md \| head -1') test-outputs/` |
| **Sync all reports** | `rsync -avz -e "ssh -i \"$SSH_KEY\"" opc@129.213.49.128:~/codequal/.../test-outputs/ test-outputs/` |
| **Check test status** | `ssh ... 'pgrep -f test-v9-lite-e2e'` |
| **View test log** | `ssh ... 'tail -100 /tmp/v9-test.log'` |

---

## 📝 Notes

- **Test duration**: V9 tests typically run 2-5 minutes depending on repository size
- **Report location**: Reports are NEVER in `/tmp/test-repo-*` (those are cleaned up)
- **Report naming**: Format is `v9-lite-{language}-{repo}-{timestamp}.md`
- **SSH key**: Must have 600 permissions (`chmod 600`)
- **Background tests**: Use `nohup` and redirect to `/tmp/v9-test.log` for monitoring

---

**Last Updated**: November 14, 2025
**Oracle Instance**: 129.213.49.128 (A1.Flex ARM64)
**CodeQual Version**: V9 Production Architecture
