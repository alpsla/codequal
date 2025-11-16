# Oracle Cloud Testing Scripts

Automated scripts for running V9 tests on Oracle A1.Flex instance and managing reports.

---

## Available Scripts

### 1. `oracle-test-and-download.sh`

**Purpose**: Run V9 test on Oracle and automatically download the generated report.

**Usage**:
```bash
./oracle-test-and-download.sh
```

**What it does**:
1. Connects to Oracle cloud (129.213.49.128)
2. Runs `test-v9-lite-e2e.ts` on Oracle
3. Downloads the generated report to local `test-outputs/` directory
4. Shows a quick summary of the report

**Output**:
- Report downloaded to: `/Users/alpinro/Code Prjects/codequal/packages/agents/tests/integration/test-outputs/`
- Terminal shows test progress and report summary

**Duration**: 2-5 minutes (depends on repository size)

---

### 2. `oracle-sync-reports.sh`

**Purpose**: Sync all reports from Oracle to local machine (incremental).

**Usage**:
```bash
./oracle-sync-reports.sh
```

**What it does**:
1. Lists available reports on Oracle cloud
2. Uses `rsync` to download only new/changed reports
3. Shows before/after counts and what was downloaded

**Output**:
- Downloads to: `/Users/alpinro/Code Prjects/codequal/packages/agents/tests/integration/test-outputs/`
- Shows: Remote count, local count, newly downloaded count

**Duration**: 5-30 seconds (depends on number of new reports)

---

## Quick Start

### First Time Setup

**1. Verify SSH key exists:**
```bash
ls -l "/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key"
```

**2. Test Oracle connection:**
```bash
ssh -i "/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key" opc@129.213.49.128 'echo Connected'
```

If you get "Connected", you're ready to use the scripts!

---

### Running Tests

**Run test and get report:**
```bash
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents/scripts/testing/oracle
./oracle-test-and-download.sh
```

**Just sync existing reports:**
```bash
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents/scripts/testing/oracle
./oracle-sync-reports.sh
```

---

## Common Workflows

### Daily Testing Workflow

```bash
# Morning: Sync any reports from overnight tests
./oracle-sync-reports.sh

# Run new test
./oracle-test-and-download.sh

# Review the report
open "/Users/alpinro/Code Prjects/codequal/packages/agents/tests/integration/test-outputs/"
```

### Quick Report Check

```bash
# Just download latest reports without running tests
./oracle-sync-reports.sh

# View most recent report
ls -lt "/Users/alpinro/Code Prjects/codequal/packages/agents/tests/integration/test-outputs/" | head -3
```

---

## Troubleshooting

### "Permission denied (publickey)"

**Fix SSH key permissions:**
```bash
chmod 600 "/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key"
```

### "Cannot connect to Oracle cloud"

**Check network connectivity:**
```bash
ping -c 3 129.213.49.128
```

**Test SSH with verbose output:**
```bash
ssh -v -i "/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key" opc@129.213.49.128
```

### "No reports found"

**Check Oracle manually:**
```bash
ssh -i "/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key" opc@129.213.49.128 \
  'ls -lth ~/codequal/packages/agents/tests/integration/test-outputs/'
```

---

## Manual Commands

If you prefer to run commands manually instead of using the scripts:

### Run test manually:
```bash
ssh -i "/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key" opc@129.213.49.128 \
  'cd ~/codequal/packages/agents && npx ts-node tests/integration/test-v9-lite-e2e.ts'
```

### Download specific report:
```bash
scp -i "/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key" \
  'opc@129.213.49.128:/home/opc/codequal/packages/agents/tests/integration/test-outputs/v9-lite-react-*.md' \
  "/Users/alpinro/Code Prjects/codequal/packages/agents/tests/integration/test-outputs/"
```

### List reports on Oracle:
```bash
ssh -i "/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key" opc@129.213.49.128 \
  'ls -lth ~/codequal/packages/agents/tests/integration/test-outputs/*.md | head -10'
```

---

## Documentation

For complete documentation on Oracle testing, see:
- **Full Guide**: `../../../src/two-branch/docs/testing/ORACLE_CLOUD_TESTING_GUIDE.md`

---

**Last Updated**: November 14, 2025
**Oracle Instance**: 129.213.49.128 (A1.Flex ARM64)
**Scripts Version**: 1.0
