# Infrastructure Documentation

This directory contains documentation for CodeQual's infrastructure setup on Oracle Cloud.

---

## 📚 **Documentation Index**

### Core Infrastructure Documents

1. **[ORACLE_INFRASTRUCTURE_CLARIFICATION.md](./ORACLE_INFRASTRUCTURE_CLARIFICATION.md)**
   - DigitalOcean account closure clarification
   - Oracle Container Registry (OCIR) setup
   - Available Docker images
   - Double clone bug fix details
   - Performance improvements

2. **[ORACLE_TYPESCRIPT_ANALYZER_STATUS.md](./ORACLE_TYPESCRIPT_ANALYZER_STATUS.md)**
   - TypeScript analyzer deployment status
   - Tool verification results
   - Usage commands
   - Integration guide

3. **[PARALLEL_TOOL_EXECUTION.md](./PARALLEL_TOOL_EXECUTION.md)** ⭐ **NEW**
   - How Java achieves 35-64% performance gains
   - BaseToolOrchestrator architecture
   - Parallel execution on multiple CPU cores
   - Implementation guide for TypeScript & other languages
   - Performance metrics and testing

---

## 🏗️ **Oracle Cloud Infrastructure**

### Instance Details
- **Provider**: Oracle Cloud Infrastructure (OCI)
- **Instance Type**: A1.Flex (ARM64)
- **IP Address**: 129.213.49.128
- **SSH Key**: `keys/oracle/ssh-key-2025-10-07.key`

### Container Registry
- **OCIR Repository**: `iad.ocir.io/idzaw9ddo1h5/codequal/analyzer`
- **Region**: US East (Ashburn)

---

## 📦 **Available Images**

### Production Ready ✅
```
iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-java-v6.0-arm       (1.08GB)
iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-typescript-v4.6-arm (424MB)
redis:alpine                                                         (69.3MB)
postgres:14-alpine                                                   (269MB)
```

### Need to Build ⏳
- Python (Dockerfile.python.v4.1)
- JavaScript (Dockerfile.javascript.fixed)
- Go (Dockerfile.go.v4.2)
- Rust (Dockerfile.rust.v5.fixed)
- Ruby (Dockerfile.ruby)
- PHP (Dockerfile.php)
- C++ (Dockerfile.cpp)
- C# (Dockerfile.csharp)

---

## 🚀 **Quick Start**

### SSH Access
```bash
export SSH_KEY="/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key"
export ORACLE_IP="129.213.49.128"

ssh -i "$SSH_KEY" opc@$ORACLE_IP
```

### Building a Language Image
```bash
# SSH to Oracle
ssh -i "$SSH_KEY" opc@$ORACLE_IP

# Navigate to Dockerfiles
cd ~/codequal/docker/languages

# Build image
docker build -t codequal/analyzer:lang-{LANGUAGE}-v{VERSION}-arm \
  -f Dockerfile.{LANGUAGE}.v{VERSION} .

# Tag for OCIR
docker tag codequal/analyzer:lang-{LANGUAGE}-v{VERSION}-arm \
  iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-{LANGUAGE}-v{VERSION}-arm

# Verify
docker images | grep {LANGUAGE}
```

### Deploying Code
```bash
# Deploy specific files
rsync -avz -e "ssh -i $SSH_KEY" \
  packages/agents/src/ \
  opc@$ORACLE_IP:~/codequal/packages/agents/src/

# Deploy entire package
rsync -avz -e "ssh -i $SSH_KEY" \
  --exclude node_modules \
  --exclude dist \
  packages/agents/ \
  opc@$ORACLE_IP:~/codequal/packages/agents/
```

---

## ⚡ **Performance Optimizations**

### Double Clone Bug Fix ✅

**Before** (Inefficient):
- Cloned repository twice (main + PR)
- 2x network bandwidth, disk space, time

**After** (Optimized):
- Single clone with `--depth=10`
- Git fetch for PR branch
- 47-96% faster operations
- Redis caching for subsequent analyses

**Details**: See [ORACLE_INFRASTRUCTURE_CLARIFICATION.md](./ORACLE_INFRASTRUCTURE_CLARIFICATION.md#-critical-bug-fixed-double-clone)

---

## 🔧 **Common Tasks**

### Check Available Images
```bash
ssh -i "$SSH_KEY" opc@$ORACLE_IP 'docker images'
```

### View Logs
```bash
ssh -i "$SSH_KEY" opc@$ORACLE_IP 'cd ~/codequal && tail -f logs/*.log'
```

### Clean Up
```bash
# Remove old containers
ssh -i "$SSH_KEY" opc@$ORACLE_IP 'docker container prune -f'

# Remove old images
ssh -i "$SSH_KEY" opc@$ORACLE_IP 'docker image prune -f'

# Clean test outputs
ssh -i "$SSH_KEY" opc@$ORACLE_IP 'cd ~/codequal/packages/agents && rm -f *.log *-results-*.txt'
```

---

## 📊 **Monitoring**

### Check Services
```bash
# Redis
ssh -i "$SSH_KEY" opc@$ORACLE_IP 'docker ps | grep redis'

# PostgreSQL
ssh -i "$SSH_KEY" opc@$ORACLE_IP 'docker ps | grep postgres'
```

### System Resources
```bash
# Disk usage
ssh -i "$SSH_KEY" opc@$ORACLE_IP 'df -h'

# Memory
ssh -i "$SSH_KEY" opc@$ORACLE_IP 'free -h'

# Docker stats
ssh -i "$SSH_KEY" opc@$ORACLE_IP 'docker stats --no-stream'
```

---

## 🐛 **Troubleshooting**

### Build Failures
```bash
# Check disk space
ssh -i "$SSH_KEY" opc@$ORACLE_IP 'df -h'

# Check Docker daemon
ssh -i "$SSH_KEY" opc@$ORACLE_IP 'sudo systemctl status docker'

# View build logs
ssh -i "$SSH_KEY" opc@$ORACLE_IP 'docker logs <container_id>'
```

### Permission Issues
```bash
# Fix ownership
ssh -i "$SSH_KEY" opc@$ORACLE_IP 'sudo chown -R opc:opc ~/codequal'

# Fix Docker permissions
ssh -i "$SSH_KEY" opc@$ORACLE_IP 'sudo usermod -aG docker opc'
```

---

## 📖 **Related Documentation**

- [Multi-Language Support](../multi-language/README.md)
- [V9 Architecture](../V9_PRODUCTION_ARCHITECTURE.md)
- [Testing Guide](../testing/README.md)

---

**Last Updated**: 2025-11-07  
**Maintained By**: CodeQual Infrastructure Team

