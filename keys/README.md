# SSH Keys Directory

## ⚠️ SECURITY WARNING

**NEVER commit private keys to version control!**

The `.gitignore` file is configured to exclude all `.key` files but allow `.pub` files.

## Directory Structure

```
keys/
├── oracle/
│   ├── ssh-key-2025-05-08.key     # PRIVATE - Never commit!
│   └── ssh-key-2025-05-08.key.pub # Public key - Safe to commit
└── README.md
```

## Oracle Instance Access

### Quick Connect
From project root:
```bash
./connect-oracle.sh
```

### Manual Connect
```bash
ssh -i keys/oracle/ssh-key-2025-05-08.key opc@129.213.49.128
```

### Instance Details
- **IP**: 129.213.49.128
- **User**: opc
- **OS**: Oracle Linux 9.6
- **Instance**: Oracle A1.Flex (4 OCPUs, 24GB RAM)

## Key Management

### Set Correct Permissions
```bash
chmod 600 keys/oracle/*.key
chmod 644 keys/oracle/*.pub
```

### Verify Key Fingerprint
```bash
ssh-keygen -lf keys/oracle/ssh-key-2025-05-08.key.pub
```

## Security Best Practices

1. **Never share private keys**
2. **Keep private keys with 600 permissions**
3. **Use different keys for different environments**
4. **Rotate keys periodically**
5. **Never commit private keys to git**

## Troubleshooting

### Permission Denied
```bash
# Fix permissions
chmod 600 keys/oracle/ssh-key-2025-05-08.key
```

### Host Key Verification Failed
```bash
# Add host to known_hosts
ssh-keyscan -H 129.213.49.128 >> ~/.ssh/known_hosts
```

### Check if Key is in Git
```bash
# This should return nothing (key is ignored)
git ls-files | grep "\.key$"

# This should show only public keys
git ls-files | grep "\.key\.pub$"
```