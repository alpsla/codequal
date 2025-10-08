# Oracle Cloud SSH Keys - Management Guide

## Current Active Key (as of October 7, 2025)

**Private Key:** `/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key`
**Public Key:** `/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key.pub`
**Type:** RSA 4096-bit
**Created:** October 7, 2025
**Status:** ✅ Active and working

### Connection Command
```bash
ssh -i "/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key" opc@129.213.49.128
```

### Oracle Instance Details
- **Instance Name:** codequal-v9-docker
- **Public IP:** 129.213.49.128
- **Username:** opc
- **Region:** us-ashburn-1 (iad)
- **Instance OCID:** `ocid1.instance.oc1.iad.anuwcljtdsmxo3qcn5ct6kyvely5uojljeozcicljvgv4rootpp6dluqax5q`

---

## SSH Key History

### Deprecated Keys (DO NOT USE)

#### 1. ssh-key-2025-05-08 (DEPRECATED - May 8, 2025)
- **Location:** `/Users/alpinro/Desktop/Private key/ssh-key-2025-05-08.key`
- **Status:** ⚠️ Still works but DEPRECATED
- **Reason:** Old key, should be removed from instance after confirming new key works
- **Action:** Will remove from Oracle instance once new key is verified in production

---

## Best Practices

### Key Naming Convention
Format: `ssh-key-YYYY-MM-DD.key`

Example:
- `ssh-key-2025-10-07.key` (private)
- `ssh-key-2025-10-07.key.pub` (public)

### Key Storage
- **Private keys:** `/Users/alpinro/Code Prjects/codequal/keys/oracle/`
- **Permissions:** 600 (read/write for owner only)
- **Never commit private keys to Git**
- **Public keys:** Can be shared and committed

### Key Rotation Schedule
- **Recommended:** Every 90 days
- **Maximum:** Every 180 days
- **Next rotation:** January 5, 2026

### Adding a New Key

#### Step 1: Generate New Key Pair
```bash
ssh-keygen -t rsa -b 4096 -f "/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-$(date +%Y-%m-%d).key" -C "codequal-oracle-$(date +%Y%m%d)"
```

#### Step 2: Set Correct Permissions
```bash
chmod 600 "/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-$(date +%Y-%m-%d).key"
chmod 644 "/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-$(date +%Y-%m-%d).key.pub"
```

#### Step 3: Add to Oracle Instance
Using existing SSH access:
```bash
# Using current active key
cat "/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-NEW-DATE.key.pub" | \
  ssh -i "/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key" opc@129.213.49.128 \
  "cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && echo 'New key added!'"
```

#### Step 4: Test New Key
```bash
ssh -i "/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-NEW-DATE.key" opc@129.213.49.128 "echo 'New key works!'"
```

#### Step 5: Update Scripts
Update all scripts that reference SSH_KEY variable:
- `oracle-run-v9-e2e-complete.sh`
- `test-oracle-ssh-connection.sh`
- Any deployment scripts

### Removing Old Keys

#### Safe Removal Process
1. **Verify new key works** in all scripts
2. **Backup old key** to archive location
3. **Remove from Oracle instance:**
```bash
ssh -i "/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key" opc@129.213.49.128 \
  "grep -v 'ssh-key-2025-05-08' ~/.ssh/authorized_keys > ~/.ssh/authorized_keys.new && \
   mv ~/.ssh/authorized_keys.new ~/.ssh/authorized_keys && \
   chmod 600 ~/.ssh/authorized_keys && \
   echo 'Old key removed!'"
```
4. **Move old key to archive:**
```bash
mkdir -p "/Users/alpinro/Code Prjects/codequal/keys/oracle/.archive"
mv "/Users/alpinro/Desktop/Private key/ssh-key-2025-05-08.key"* \
   "/Users/alpinro/Code Prjects/codequal/keys/oracle/.archive/"
```

---

## Troubleshooting

### Permission Denied
```bash
# Fix key permissions
chmod 600 "/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key"
```

### Key Not Found
```bash
# Verify key exists
ls -la "/Users/alpinro/Code Prjects/codequal/keys/oracle/"
```

### Multiple Keys on Instance
```bash
# List all keys on instance
ssh -i "/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key" opc@129.213.49.128 \
  "cat ~/.ssh/authorized_keys"
```

---

## Security Notes

1. **Never share private keys** via email, Slack, or any insecure channel
2. **Use strong passphrases** when generating keys (optional but recommended)
3. **Rotate keys regularly** (every 90 days minimum)
4. **Keep private keys encrypted** at rest
5. **Remove old keys** from instances after rotation
6. **Monitor SSH access logs** on Oracle instance

---

**Last Updated:** October 7, 2025
**Maintained By:** Alp Sla
**Next Review:** January 5, 2026
