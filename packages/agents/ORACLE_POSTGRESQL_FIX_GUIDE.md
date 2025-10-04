# Oracle PostgreSQL Authentication Fix Guide

## Problem
PostgreSQL on Oracle instance is configured for **ident/peer** authentication, but Dependency-Check (running in Docker) needs **md5 password** authentication.

**Error**: `FATAL: Ident authentication failed for user "depcheck_scanner"`

## Solution Overview
Update PostgreSQL configuration to allow password authentication for the `depcheck_scanner` user.

---

## Step-by-Step Fix

### Step 1: Connect to Oracle Instance

```bash
ssh -i "/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-05-08.key" opc@129.213.49.128
```

---

### Step 2: Check Current PostgreSQL Configuration

```bash
# Check current pg_hba.conf
sudo cat /var/lib/pgsql/data/pg_hba.conf | grep -v "^#" | grep -v "^$"
```

**Expected output** (problematic):
```
local   all             all                                     peer
host    all             all             127.0.0.1/32            ident
host    all             all             ::1/128                 ident
```

---

### Step 3: Backup Current Configuration

```bash
# Create backup
sudo cp /var/lib/pgsql/data/pg_hba.conf /var/lib/pgsql/data/pg_hba.conf.backup.$(date +%Y%m%d)

# Verify backup
ls -lh /var/lib/pgsql/data/pg_hba.conf*
```

---

### Step 4: Update pg_hba.conf

```bash
# Edit pg_hba.conf with sudo
sudo vi /var/lib/pgsql/data/pg_hba.conf
```

**Find these lines:**
```
local   all             all                                     peer
host    all             all             127.0.0.1/32            ident
host    all             all             ::1/128                 ident
```

**Change to:**
```
local   all             all                                     peer
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
host    all             all             0.0.0.0/0               md5
```

**Or use this command** (automated):
```bash
# This will update the file automatically
sudo bash -c 'cat > /var/lib/pgsql/data/pg_hba.conf << EOF
# TYPE  DATABASE        USER            ADDRESS                 METHOD

# "local" is for Unix domain socket connections only
local   all             all                                     peer

# IPv4 local connections - CHANGED FROM ident TO md5
host    all             all             127.0.0.1/32            md5

# IPv6 local connections - CHANGED FROM ident TO md5
host    all             all             ::1/128                 md5

# Allow Docker containers to connect - NEW LINE
host    all             all             172.17.0.0/16           md5

# Allow all IPv4 connections (if needed for external access)
# host    all             all             0.0.0.0/0               md5
EOF'
```

---

### Step 5: Reload PostgreSQL Configuration

```bash
# Reload PostgreSQL to apply changes (no downtime)
sudo systemctl reload postgresql

# Verify service is still running
sudo systemctl status postgresql
```

**Expected output:**
```
● postgresql.service - PostgreSQL database server
     Loaded: loaded
     Active: active (running)
```

---

### Step 6: Test Database Connection

```bash
# Test connection with password authentication
PGPASSWORD=postgres123 psql -h localhost -U depcheck_scanner -d depcheck -c "SELECT COUNT(*) as cve_count FROM vulnerability;"
```

**Expected output:**
```
 cve_count
-----------
    208247
(1 row)
```

If you see the CVE count, **authentication is working!** ✅

---

### Step 7: Test from Docker Container

```bash
# Test that Docker containers can connect
docker run --rm \
  -v /tmp/jdbc-drivers:/tmp/jdbc-drivers \
  iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-java-v6.0-arm \
  -c "psql 'jdbc:postgresql://host.docker.internal:5432/depcheck?user=depcheck_scanner&password=postgres123' -c 'SELECT 1;'"
```

If this works, Docker connectivity is confirmed.

---

### Step 8: Verify OSS Index Integration

```bash
# Run the OSS Index test
cd /tmp
curl -O https://raw.githubusercontent.com/your-repo/test-ossindex-oracle.sh
chmod +x test-ossindex-oracle.sh
./test-ossindex-oracle.sh
```

---

## Troubleshooting

### Issue 1: Permission Denied

```bash
# If you get "permission denied" when editing pg_hba.conf
sudo chmod 644 /var/lib/pgsql/data/pg_hba.conf
sudo vi /var/lib/pgsql/data/pg_hba.conf
sudo chmod 600 /var/lib/pgsql/data/pg_hba.conf
```

### Issue 2: PostgreSQL Won't Reload

```bash
# Check logs
sudo journalctl -u postgresql -n 50

# If reload fails, restart (brief downtime)
sudo systemctl restart postgresql
```

### Issue 3: Docker Can't Connect to Host

```bash
# Add Docker network to pg_hba.conf
sudo bash -c 'echo "host    all             all             172.17.0.0/16           md5" >> /var/lib/pgsql/data/pg_hba.conf'
sudo systemctl reload postgresql
```

### Issue 4: Check Docker Network

```bash
# Find Docker bridge network
docker network inspect bridge | grep Subnet

# Update pg_hba.conf with correct Docker subnet if different from 172.17.0.0/16
```

---

## Verification Checklist

After completing the fix, verify:

- [ ] PostgreSQL is running: `sudo systemctl status postgresql`
- [ ] Configuration updated: `sudo cat /var/lib/pgsql/data/pg_hba.conf | grep md5`
- [ ] Local connection works: `PGPASSWORD=postgres123 psql -h localhost -U depcheck_scanner -d depcheck -c "SELECT 1;"`
- [ ] Docker connection works: Test with dependency-check container
- [ ] OSS Index test passes: Run test-ossindex-oracle.sh
- [ ] No authentication errors in logs: `sudo journalctl -u postgresql -n 100 | grep -i "authentication failed"`

---

## Quick Fix (Copy-Paste)

If you want to do it all in one go:

```bash
# Connect to Oracle
ssh -i "/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-05-08.key" opc@129.213.49.128

# Backup and update pg_hba.conf
sudo cp /var/lib/pgsql/data/pg_hba.conf /var/lib/pgsql/data/pg_hba.conf.backup
sudo sed -i 's/ident$/md5/g' /var/lib/pgsql/data/pg_hba.conf
sudo bash -c 'echo "host    all             all             172.17.0.0/16           md5" >> /var/lib/pgsql/data/pg_hba.conf'

# Reload PostgreSQL
sudo systemctl reload postgresql

# Test connection
PGPASSWORD=postgres123 psql -h localhost -U depcheck_scanner -d depcheck -c "SELECT COUNT(*) FROM vulnerability;"

# If you see a count, you're done! ✅
```

---

## What This Fix Does

1. **Changes authentication method** from `ident` (system user verification) to `md5` (password-based)
2. **Allows Docker containers** to connect to PostgreSQL (172.17.0.0/16 network)
3. **Enables Dependency-Check** to use PostgreSQL database from within Docker
4. **Enables OSS Index integration** to work properly

---

## Expected Results After Fix

✅ Dependency-Check can connect to PostgreSQL
✅ OSS Index integration works
✅ No "authentication failed" errors
✅ All Java tools (PMD, Checkstyle, Dependency-Check, etc.) work correctly
✅ CVE scanning completes successfully

---

## Need Help?

If you encounter any issues:

1. Check PostgreSQL logs: `sudo journalctl -u postgresql -f`
2. Verify pg_hba.conf syntax: `sudo -u postgres psql -c "SELECT pg_reload_conf();"`
3. Test connection manually: `PGPASSWORD=postgres123 psql -h localhost -U depcheck_scanner -d depcheck`

---

**Time to Complete**: ~5 minutes
**Downtime**: None (using reload instead of restart)
**Risk**: Low (backup created before changes)
