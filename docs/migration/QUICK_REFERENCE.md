# ARM Migration Quick Reference

## 🚀 Quick Commands

### Connect to Oracle Instance
```bash
ssh -i keys/oracle/ssh-key-2025-05-08.key opc@129.213.49.128
```

### Build All Remaining Analyzers (9 languages)
```bash
cd scripts/migration
./build-all-11-languages.sh
```

### Check Build Status
```bash
# From local machine
ssh -i keys/oracle/ssh-key-2025-05-08.key opc@129.213.49.128 "docker images | grep analyzer | grep arm"
```

## 📦 Registry Information

- **Registry**: `registry.digitalocean.com/codequal-registry`
- **Image Pattern**: `analyzer:lang-{LANGUAGE}-{VERSION}-arm`

## 🔧 Language Versions

| Language | Version | Image Tag | Status |
|----------|---------|-----------|--------|
| Java | v5.1 | `lang-java-v5.1-arm` | ✅ Complete |
| Python | v4.3 | `lang-python-v4.3-arm` | ✅ Complete |
| JavaScript | v4.2 | `lang-javascript-v4.2-arm` | ⏳ Pending |
| TypeScript | v4.2 | `lang-typescript-v4.2-arm` | ⏳ Pending |
| Go | v3.8 | `lang-go-v3.8-arm` | ⏳ Pending |
| Ruby | v3.5 | `lang-ruby-v3.5-arm` | ⏳ Pending |
| PHP | v3.4 | `lang-php-v3.4-arm` | ⏳ Pending |
| C# | v3.2 | `lang-csharp-v3.2-arm` | ⏳ Pending |
| Rust | v2.9 | `lang-rust-v2.9-arm` | ⏳ Pending |
| Swift | v2.7 | `lang-swift-v2.7-arm` | ⏳ Pending |
| Kotlin | v2.5 | `lang-kotlin-v2.5-arm` | ⏳ Pending |

## 📂 Project Structure

```
codequal/
├── docs/
│   └── migration/
│       ├── ARM_MIGRATION_SUMMARY.md     # Complete migration documentation
│       └── QUICK_REFERENCE.md           # This file
├── scripts/
│   └── migration/
│       ├── build-all-11-languages.sh    # Main build script for 9 remaining
│       ├── build-arm-analyzers.sh       # Original template script
│       ├── build-on-oracle.sh           # Remote execution wrapper
│       ├── push-and-build-all.sh        # Alternative build script
│       └── push-java-build-python.sh    # Test script (completed)
└── keys/
    └── oracle/
        └── ssh-key-2025-05-08.key       # SSH key for Oracle instance
```

## 🔍 Troubleshooting Commands

### Check Oracle Instance Status
```bash
ssh -i keys/oracle/ssh-key-2025-05-08.key opc@129.213.49.128 "
  echo 'System Info:' && uname -a &&
  echo '' &&
  echo 'Docker Version:' && docker --version &&
  echo '' &&
  echo 'Disk Space:' && df -h /mnt/workspace &&
  echo '' &&
  echo 'Memory:' && free -h
"
```

### Test Individual Analyzer
```bash
# Example: Test Java analyzer
ssh -i keys/oracle/ssh-key-2025-05-08.key opc@129.213.49.128 \
  "docker run --rm registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.1-arm --version"
```

### Pull Image Locally (for testing)
```bash
docker pull registry.digitalocean.com/codequal-registry/analyzer:lang-python-v4.3-arm
```

### Clean Up Old Images on Oracle
```bash
ssh -i keys/oracle/ssh-key-2025-05-08.key opc@129.213.49.128 "docker system prune -af"
```

## ⚡ One-Liner Status Check

```bash
# Quick status of all analyzers
ssh -i keys/oracle/ssh-key-2025-05-08.key opc@129.213.49.128 \
  "echo -e 'ARM Analyzers Built:\n' && docker images | grep -c 'analyzer.*arm' && echo ' out of 11 languages'"
```

## 📝 Next Steps After Build

1. **Update V9 Configuration**
   - Modify `V9ToolOrchestrator` to use ARM tags
   - Update container registry references
   
2. **Test Pipeline**
   ```bash
   # Run V9 test with ARM analyzers
   cd packages/agents
   npm run test:v9:arm
   ```

3. **Monitor Performance**
   - Compare ARM vs x86 execution times
   - Check resource utilization
   - Validate analysis results

## 🆘 Common Issues

### Authentication Failed
```bash
# Re-authenticate to registry
doctl auth init
doctl registry login
```

### Build Timeout
- Check network connectivity
- Increase SSH timeout in script
- Build languages individually

### Out of Space
```bash
# Clean up on Oracle instance
ssh -i keys/oracle/ssh-key-2025-05-08.key opc@129.213.49.128 \
  "docker system prune -af && rm -rf /mnt/workspace/Dockerfile.* /mnt/workspace/analyze.sh"
```

---
*Last Updated: September 28, 2025*