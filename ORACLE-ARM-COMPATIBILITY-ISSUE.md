# Oracle Instance ARM Architecture Compatibility Issue

## 🚨 Critical Issue Discovered
**Date**: September 28, 2025  
**Problem**: Architecture mismatch between Docker images and Oracle instance

### The Problem
- **Oracle A1.Flex Instance**: ARM64/aarch64 architecture
- **CodeQual Analyzer Images**: Built for linux/amd64 (x86_64) architecture
- **Error**: `exec format error` when trying to run containers

### Evidence
```bash
# Oracle instance architecture
$ uname -m
aarch64

# Docker image architecture
WARNING: The requested image's platform (linux/amd64) does not match the detected host platform (linux/arm64/v8)
exec /bin/bash: exec format error
```

## 📊 Impact Analysis

### Performance Impact of Solutions
| Solution | Performance Impact | Complexity | Cost |
|----------|-------------------|------------|------|
| 1. QEMU Emulation | 50-80% slower | Medium | Same |
| 2. Rebuild for ARM | Native speed | High | Same |
| 3. Switch to x86 instance | Native speed | Low | Higher (~$150/month) |
| 4. Cross-compile | Native speed | Very High | Same |

## 🔧 Solution Options

### Option 1: Enable QEMU Emulation (Quick Fix)
**Pros:**
- Can use existing images immediately
- No rebuild required
- Quick to implement

**Cons:**
- 50-80% performance penalty
- Negates the performance benefits of Oracle A1.Flex
- May have stability issues

**Implementation:**
```bash
# Install qemu-user-static for ARM
sudo dnf install -y qemu-user-static
# Enable binfmt_misc
docker run --rm --privileged tonistiigi/binfmt --install amd64
# Run with platform flag
docker run --platform linux/amd64 registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.1
```

### Option 2: Rebuild Images for ARM (Best Long-term)
**Pros:**
- Native ARM performance
- Optimal for Oracle A1.Flex
- Future-proof for ARM infrastructure

**Cons:**
- Requires rebuilding all 10+ analyzer images
- Time-intensive (several hours)
- Need to maintain dual architecture images

**Implementation:**
```dockerfile
# Multi-arch Dockerfile example
FROM --platform=$BUILDPLATFORM node:18 AS builder
ARG TARGETPLATFORM
ARG BUILDPLATFORM
# Build steps...

# Use buildx for multi-arch
docker buildx build --platform linux/amd64,linux/arm64 -t analyzer:lang-java-v5.1 .
```

### Option 3: Switch to x86 Oracle Instance
**Pros:**
- Images work immediately
- No modifications needed
- Simplest solution

**Cons:**
- More expensive (~$150/month for equivalent specs)
- Lose ARM cost advantages
- May need to recreate instance

**Oracle x86 Options:**
- E4 Flex: Intel/AMD processors
- Cost: ~3-4x more than A1.Flex for same resources

### Option 4: Use Different Provider
**Pros:**
- Can choose x86 or ARM as needed
- May have better pricing

**Cons:**
- Migration effort
- Lose Oracle Always Free tier benefits

## 🎯 Recommended Action Plan

### Immediate (Today)
1. **Test with QEMU emulation** to verify functionality
2. Document which tools work/fail
3. Measure performance impact

### Short-term (This Week)
1. **Evaluate cost** of x86 Oracle instance
2. **Test one image rebuild** for ARM as proof of concept
3. Make decision on approach

### Long-term (If staying with ARM)
1. Set up multi-arch build pipeline
2. Rebuild all analyzer images for ARM
3. Update CI/CD to build for both architectures

## 📝 Testing Commands

### Test with Emulation
```bash
# Install emulation support
ssh -i ./keys/oracle/ssh-key-2025-05-08.key opc@129.213.49.128
sudo dnf install -y qemu-user-static binfmt-support

# Try running with platform flag
docker run --platform linux/amd64 \
  -v /mnt/workspace/repos/test:/workspace/repo:ro \
  -v /mnt/workspace/output:/workspace/output \
  registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.1

# Monitor performance
time docker run --platform linux/amd64 ...
```

### Check Image Architecture
```bash
# Inspect image architecture
docker manifest inspect registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.1 | jq '.manifests[].platform'
```

## 💰 Cost Comparison

### Current (ARM A1.Flex)
- 4 OCPUs + 24GB RAM: ~$30/month (or free tier)

### Alternative (x86 E4.Flex)
- 4 OCPUs + 24GB RAM: ~$150/month

### Performance Trade-off
- ARM with emulation: ~$30/month but 50% slower
- x86 native: ~$150/month but full speed
- ARM native (rebuild): ~$30/month and full speed (but rebuild effort)

## 🚨 Decision Required

**Key Question**: Is the 75% performance improvement worth the architecture complexity?

### If Performance is Critical
→ Switch to x86 instance or rebuild for ARM

### If Cost is Critical  
→ Use QEMU emulation and accept performance penalty

### If Long-term Scalability is Critical
→ Invest in multi-arch build pipeline

---

**Next Steps**: Need to decide between:
1. Accept emulation overhead (quick but slow)
2. Switch to x86 instance (quick but expensive)
3. Rebuild images for ARM (slow but optimal)