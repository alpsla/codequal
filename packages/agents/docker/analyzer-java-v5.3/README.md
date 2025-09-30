# Java Analyzer v5.3 Docker Image

**Docker Image**: `registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.3-arm`

---

## 📦 What's Included

### Core Tools (Always Available)
- **PMD 6.55.0** - Code quality, best practices, bug detection
- **Checkstyle 10.12.0** - Code style enforcement (Google Java Style)
- **Semgrep 1.45.0** - Security vulnerability scanning

### Optional Tools (Enable as Needed)
- **SpotBugs 4.8.6** - Bytecode analysis (requires compilation)
- **Dependency-Check 11.1.0** - CVE scanning (requires NVD API key)

---

## 🔄 What's New in v5.3

### Major Updates
1. ✅ **Dependency-Check upgraded**: 8.4.0 → 11.1.0
   - Now supports NVD API v2.0 (v1.1 is deprecated)
   - Requires NVD API key (free from nvd.nist.gov)
   - Fixed 403 Forbidden errors

2. ✅ **Persistent CVE database caching**:
   - Mount `/data/dependency-check` as volume
   - First run: downloads 3GB database
   - Subsequent runs: only updates (1-2 minutes)

3. ✅ **Better tool organization**:
   - Core tools always enabled
   - Optional tools clearly documented
   - Usage guide built into image

### Minor Improvements
- Updated base image to OpenJDK 17
- Added health check for all tools
- Improved verification script
- Added interactive usage guide

---

## 🚀 Quick Start

### 1. Minimal Analysis (Core Tools Only)

```bash
docker run --rm \
  -v $(pwd):/workspace \
  registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.3-arm \
  bash -c 'pmd check -d /workspace -f json -R category/java/bestpractices.xml'
```

### 2. With Dependency-Check (Requires NVD API Key)

**First, get your API key**:
- Visit: https://nvd.nist.gov/developers/request-an-api-key
- Copy your API key: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

**Run scan**:
```bash
# First time (downloads 3GB database - takes 10-15 minutes)
docker run --rm \
  -v $(pwd):/workspace \
  -v /data/dependency-check:/data/dependency-check \
  -e NVD_API_KEY=your-api-key-here \
  registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.3-arm \
  bash -c 'dependency-check --scan /workspace --format JSON \
    --out /workspace/results --nvdApiKey $NVD_API_KEY'

# Subsequent runs (much faster)
# Database is cached in /data/dependency-check
```

### 3. Full Orchestration (All Tools)

```bash
# Run all 3 core tools in parallel
docker run --rm \
  -v $(pwd):/workspace \
  registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.3-arm \
  bash -c '
    pmd check -d /workspace -f json -R category/java/bestpractices.xml > pmd-results.json &
    checkstyle -c /google_checks.xml -f json /workspace/**/*.java > checkstyle-results.json &
    semgrep --config auto --json /workspace > semgrep-results.json &
    wait
  '
```

---

## 🛠️ Building the Image

### Prerequisites

1. **Docker with buildx**:
   ```bash
   docker buildx version
   ```

2. **DigitalOcean Registry access**:
   ```bash
   doctl registry login
   ```

### Build Commands

#### For ARM64 (Oracle Cloud A1.Flex)

```bash
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents/docker/analyzer-java-v5.3

docker buildx build --platform linux/arm64 \
  -t analyzer:lang-java-v5.3-arm \
  --load \
  .

# Tag for registry
docker tag analyzer:lang-java-v5.3-arm \
  registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.3-arm

# Push to registry
docker push registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.3-arm
```

#### For AMD64 (x86-64)

```bash
docker buildx build --platform linux/amd64 \
  -t analyzer:lang-java-v5.3-amd \
  --load \
  .

docker tag analyzer:lang-java-v5.3-amd \
  registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.3-amd

docker push registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.3-amd
```

#### Multi-Platform Build (Recommended)

```bash
# Create builder instance (first time only)
docker buildx create --name multiplatform --use

# Build for both platforms and push
docker buildx build --platform linux/arm64,linux/amd64 \
  -t registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.3 \
  --push \
  .
```

### Build Time Estimates

- **ARM64**: ~15 minutes
- **AMD64**: ~12 minutes
- **Multi-platform**: ~20 minutes

### Build Size

- **Compressed**: ~800MB
- **Uncompressed**: ~2.2GB
- **With CVE database**: ~5.2GB

---

## 🧪 Testing the Image

### 1. Verify Tools Installation

```bash
docker run --rm \
  registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.3-arm \
  bash -c '/usr/local/bin/verify-tools.sh'
```

**Expected Output**:
```
=== CodeQual Java Analyzer v5.3 ===

Core Tools:
PMD 6.55.0
  ✓ PMD installed
Checkstyle 10.12.0
  ✓ Checkstyle installed
1.45.0
  ✓ Semgrep installed

Optional Tools:
SpotBugs 4.8.6
  ✓ SpotBugs installed (optional)
Dependency-Check 11.1.0
  ✓ Dependency-Check installed (optional)

Configuration:
  ⚠ NVD_API_KEY not set (required for Dependency-Check)

All tools verified successfully!
```

### 2. Test PMD

```bash
docker run --rm \
  -v $(pwd):/workspace \
  registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.3-arm \
  bash -c 'pmd check -d /workspace/src -f json -R category/java/bestpractices.xml'
```

### 3. Test Dependency-Check

```bash
# Clone a test repository with known vulnerabilities
git clone https://github.com/WebGoat/WebGoat /tmp/webgoat-test

# Run Dependency-Check
docker run --rm \
  -v /tmp/webgoat-test:/workspace \
  -v /tmp/dependency-check-data:/data/dependency-check \
  -e NVD_API_KEY=your-api-key \
  registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.3-arm \
  bash -c 'dependency-check --scan /workspace --format JSON \
    --out /workspace/results --nvdApiKey $NVD_API_KEY'

# Expected: Find multiple CVEs in old dependencies
```

### 4. Test on Apache Kafka

```bash
# On Oracle Cloud server
cd /tmp/kafka-repo

docker run --rm \
  -v /tmp/kafka-repo:/workspace \
  -v /tmp/dependency-check-data:/data/dependency-check \
  -e NVD_API_KEY=your-api-key \
  registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.3-arm \
  bash -c 'dependency-check --scan /workspace --format JSON \
    --out /workspace/results --nvdApiKey $NVD_API_KEY --failOnCVSS 7'

# Expected time: 30-60 seconds (after initial database download)
```

---

## 📊 Performance Benchmarks

### Core Tools (Kafka - 3,472 Java files)

| Tool | Time | Issues Found |
|------|------|--------------|
| PMD Priority 1 | 4s | 138 critical |
| PMD Priority 2 | 4s | 2,245 high |
| Checkstyle | 110s | 264,420 warnings |
| Semgrep (smart selection) | 38s | 0 (clean) |
| **3-tool orchestration** | **139s** | **141 blocking** |

### Optional Tools

| Tool | Time | Notes |
|------|------|-------|
| SpotBugs | 57s | Requires compilation (93s) |
| Dependency-Check (first run) | 15 min | Downloads 3GB CVE database |
| Dependency-Check (cached) | 60s | Only checks for CVEs |

---

## 🔧 Configuration

### Environment Variables

```bash
# Required for Dependency-Check
NVD_API_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Optional: Configure cache location
DEPENDENCY_CHECK_DATA=/data/dependency-check

# Optional: Java memory settings
JAVA_OPTS="-Xmx2g -XX:MaxMetaspaceSize=512m"
```

### Volume Mounts

```bash
# Workspace (required)
-v $(pwd):/workspace

# CVE database cache (highly recommended for Dependency-Check)
-v /data/dependency-check:/data/dependency-check

# Custom rulesets (optional)
-v ./custom-rules:/rules
```

---

## 🚨 Troubleshooting

### Issue 1: "NVD API authentication failed"

**Problem**: Dependency-Check returns 403 Forbidden

**Solutions**:
1. Verify API key is correct (no spaces/typos)
2. Check that you're using v11.1.0+ (not v8.4.0)
3. Ensure API key is activated (check NVD email)
4. Try using `--nvdApiKey` flag explicitly

### Issue 2: "Database download timeout"

**Problem**: CVE database download takes >20 minutes

**Solutions**:
1. Check internet speed (need ~200Mbps for reasonable time)
2. Verify no firewall blocking nvd.nist.gov
3. Try during off-peak hours (NVD servers less busy)
4. Use persistent volume to cache database

### Issue 3: "SpotBugs: No classfiles specified"

**Problem**: SpotBugs requires compiled .class files

**Solutions**:
1. Compile project first: `mvn compile` or `gradle build`
2. Use SpotBugs only after compilation
3. Consider using PMD instead (works on source code)

### Issue 4: Permission denied in /workspace

**Problem**: Docker container can't write to mounted volume

**Solutions**:
```bash
# Fix permissions on host
chmod -R 777 /workspace

# Or run with user flag
docker run --user $(id -u):$(id -g) ...
```

---

## 📚 Tool Documentation

### PMD
- **Docs**: https://pmd.github.io/
- **Rules**: https://pmd.github.io/latest/pmd_rules_java.html
- **Custom Rules**: Place in `/opt/pmd/rulesets/`

### Checkstyle
- **Docs**: https://checkstyle.org/
- **Google Style**: `/google_checks.xml` (pre-installed)
- **Custom Config**: Mount with `-v ./checkstyle.xml:/custom_checks.xml`

### Semgrep
- **Docs**: https://semgrep.dev/docs/
- **Rules**: https://semgrep.dev/explore
- **Custom Rules**: Place in `/workspace/.semgrep/`

### SpotBugs
- **Docs**: https://spotbugs.github.io/
- **Bug Patterns**: https://spotbugs.readthedocs.io/en/stable/bugDescriptions.html
- **Usage**: Requires compiled bytecode

### Dependency-Check
- **Docs**: https://jeremylong.github.io/DependencyCheck/
- **NVD API**: https://nvd.nist.gov/developers
- **Suppressions**: https://jeremylong.github.io/DependencyCheck/general/suppression.html

---

## 🔒 Security Considerations

### API Key Security

```bash
# ❌ Never commit API keys
echo "NVD_API_KEY=xxx" >> .env
git add .env  # DON'T DO THIS

# ✅ Use environment variables
export NVD_API_KEY=xxx

# ✅ Or use secrets management
docker run -e NVD_API_KEY=$(cat /secrets/nvd-api-key) ...
```

### Container Isolation

```bash
# Run as non-root user
docker run --user 1000:1000 ...

# Limit resources
docker run --memory=2g --cpus=2 ...

# Read-only root filesystem
docker run --read-only ...
```

---

## 📦 Migration from v5.2

### Breaking Changes

1. **Trivy removed**: Use Dependency-Check 11.1.0 instead
2. **Infer removed**: Use SpotBugs or PMD instead
3. **API key required**: Dependency-Check needs NVD_API_KEY

### Migration Steps

```bash
# 1. Get NVD API key (if using Dependency-Check)
# Visit: https://nvd.nist.gov/developers/request-an-api-key

# 2. Update image tag
OLD: registry.digitalocean.com/.../analyzer:lang-java-v5.2-arm
NEW: registry.digitalocean.com/.../analyzer:lang-java-v5.3-arm

# 3. Add environment variable
-e NVD_API_KEY=your-key

# 4. Add volume mount for cache
-v /data/dependency-check:/data/dependency-check
```

---

## 🎯 Next Steps

1. ✅ Build and push image to registry
2. ✅ Test on Apache Kafka repository
3. ⏳ Update V9 orchestration to use v5.3
4. ⏳ Add Dependency-Check to optional tools config
5. ⏳ Create user setup guide (DONE)
6. ⏳ Test full integration with V9 pipeline

---

## 📞 Support

- **Documentation**: https://docs.codequal.com
- **Issues**: https://github.com/codequal/codequal/issues
- **Email**: support@codequal.com
- **Discord**: https://discord.gg/codequal

---

**Image Version**: 5.3
**Last Updated**: September 30, 2025
**Maintainer**: CodeQual Team