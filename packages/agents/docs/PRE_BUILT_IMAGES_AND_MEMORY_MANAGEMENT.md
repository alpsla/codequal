# 🐳 Pre-Built Analysis Images Strategy & Memory Management

**Date:** 2025-09-03  
**Purpose:** Optimize resource usage with language-specific Docker images and proper memory allocation

## 📦 Pre-Built Analysis Images Architecture

### Why Language-Specific Images?

#### Current Problem with Single "Complete" Image:
- **Size:** ~8-10GB with all 85 tools
- **Memory:** Requires 4GB+ RAM to run efficiently
- **Startup:** 30-60 seconds to initialize all tools
- **Waste:** Java project loads Python/Ruby/Go tools unnecessarily

#### Solution: Language-Specific Images

```
                    ┌─────────────────────────┐
                    │   Image Selection API   │
                    └───────────┬─────────────┘
                                │
                    ┌───────────▼─────────────┐
                    │  Language Detection     │
                    │  (file extensions/config)│
                    └───────────┬─────────────┘
                                │
            ┌───────────────────┼───────────────────┐
            ▼                   ▼                   ▼
    ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
    │  Java Image   │   │ Python Image  │   │   JS Image    │
    │   ~2.5GB      │   │    ~1.8GB     │   │    ~1.5GB     │
    │   9 tools     │   │   17 tools    │   │   10 tools    │
    └───────────────┘   └───────────────┘   └───────────────┘
```

## 🎯 Recommended Pre-Built Images Strategy

### Tier 1: Core Language Images (Build These First)

#### 1. `codequal/analysis:java-enterprise` (~2.5GB)
```dockerfile
FROM openjdk:17-slim
# Only Java tools
RUN apt-get update && apt-get install -y maven gradle git wget unzip
# Install: PMD, Checkstyle, SpotBugs, OWASP DC, etc.
# Memory: 2GB required, 3GB recommended
```
**Use Cases:** Spring Boot, Android, Enterprise Java

#### 2. `codequal/analysis:javascript-node` (~1.5GB)
```dockerfile
FROM node:20-slim
# Only JavaScript/TypeScript tools
RUN npm install -g eslint prettier madge lighthouse typescript
# Memory: 1GB required, 2GB recommended
```
**Use Cases:** React, Vue, Angular, Node.js backends

#### 3. `codequal/analysis:python-ml` (~1.8GB)
```dockerfile
FROM python:3.11-slim
# Only Python tools
RUN pip install bandit safety pylint mypy black pandas numpy
# Memory: 1.5GB required, 2GB recommended
```
**Use Cases:** Django, FastAPI, ML projects, Data Science

### Tier 2: Specialized Images

#### 4. `codequal/analysis:go-microservices` (~1.2GB)
```dockerfile
FROM golang:1.21-alpine
# Go tools optimized for microservices
RUN go install gosec staticcheck golangci-lint
# Memory: 1GB required, 1.5GB recommended
```

#### 5. `codequal/analysis:rust-systems` (~2GB)
```dockerfile
FROM rust:1.75-slim
# Rust tools for systems programming
RUN cargo install cargo-audit cargo-deny clippy
# Memory: 1.5GB required, 2GB recommended
```

#### 6. `codequal/analysis:polyglot-minimal` (~3GB)
```dockerfile
# Minimal tools for mixed codebases
# Basic linters for top 5 languages
# Memory: 2GB required, 3GB recommended
```

### Tier 3: Ultra-Light Images (For CI/CD)

#### 7. `codequal/analysis:security-only` (~800MB)
```dockerfile
# Only security tools: Semgrep, Trivy, Gitleaks
# Works with any language
# Memory: 512MB required, 1GB recommended
```

#### 8. `codequal/analysis:dependencies-only` (~600MB)
```dockerfile
# Only dependency scanners
# Memory: 512MB required, 768MB recommended
```

## 💾 Memory Management Reorganization

### Current State Analysis
```yaml
Current Pod (analysis-minimal):
  Requests: 1.5GB RAM, 500m CPU
  Limits: 1.75GB RAM, 900m CPU
  Tools: 4 basic tools
  Utilization: ~60% memory used
```

### Proposed Memory Architecture

#### 1. Base Memory Requirements by Image Type

| Image Type | Min RAM | Recommended | Max RAM | CPU | Storage |
|------------|---------|-------------|---------|-----|---------|
| **Complete (All tools)** | 3GB | 4GB | 6GB | 2 CPU | 10GB |
| **Java Enterprise** | 2GB | 3GB | 4GB | 1.5 CPU | 5GB |
| **JavaScript/Node** | 1GB | 2GB | 3GB | 1 CPU | 3GB |
| **Python/ML** | 1.5GB | 2GB | 3GB | 1 CPU | 4GB |
| **Go Microservices** | 1GB | 1.5GB | 2GB | 1 CPU | 2GB |
| **Rust Systems** | 1.5GB | 2GB | 3GB | 1.5 CPU | 3GB |
| **Security Only** | 512MB | 1GB | 1.5GB | 0.5 CPU | 1GB |

#### 2. Dynamic Memory Allocation Strategy

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: analysis-quota
  namespace: codequal-dev
spec:
  hard:
    requests.cpu: "8"      # Total CPU cores
    requests.memory: 16Gi   # Total memory
    limits.cpu: "12"
    limits.memory: 24Gi
    persistentvolumeclaims: "5"
```

#### 3. Pod Templates with Vertical Pod Autoscaling

```yaml
# For Java analysis pods
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: java-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: analysis-java
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: analyzer
      minAllowed:
        cpu: 1000m
        memory: 2Gi
      maxAllowed:
        cpu: 2000m
        memory: 4Gi
```

## 🧹 Cleanup Strategy for Existing Tools

### Step 1: Inventory Current State
```bash
#!/bin/bash
# Check what's currently installed on local machine
echo "=== Local Tools Inventory ==="
du -sh ~/.cargo/bin/         # Rust tools
du -sh ~/go/bin/             # Go tools  
du -sh ~/tools/              # Java tools
du -sh ~/.composer/vendor/   # PHP tools
pip list --format=freeze | wc -l  # Python packages

# Check cloud pod
kubectl exec -n codequal-dev analysis-minimal -- df -h
kubectl exec -n codequal-dev analysis-minimal -- du -sh /usr/local/bin
```

### Step 2: Cleanup Local Installation (After Cloud Deployment)
```bash
#!/bin/bash
# cleanup-local-tools.sh
echo "⚠️  This will remove locally installed analysis tools"
read -p "Continue? (y/n) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Backup tool list first
    pip freeze > ~/tools-backup/python-tools.txt
    cargo install --list > ~/tools-backup/rust-tools.txt
    
    # Clean Python tools
    pip uninstall -y bandit safety pylint mypy vulture prospector
    
    # Clean Go tools (selective)
    rm -f ~/go/bin/{gosec,staticcheck,errcheck}
    
    # Clean Java tools directory
    mv ~/tools ~/tools-backup-$(date +%Y%m%d)
    
    # Clean npm global (selective)
    npm uninstall -g eslint prettier jshint madge
    
    echo "✅ Cleanup complete. Backup saved in ~/tools-backup/"
fi
```

### Step 3: Release Memory from Current Pod
```bash
# Delete old minimal pod
kubectl delete pod analysis-minimal -n codequal-dev

# Deploy new optimized pod
kubectl apply -f k8s/analysis-pod-complete.yaml
```

## 📊 Optimized Resource Allocation Plan

### Memory Budget (16GB Total Available)
```
┌─────────────────────────────────────────┐
│          Kubernetes Cluster              │
│            16GB Total RAM                │
├─────────────────────────────────────────┤
│                                          │
│  ┌────────────────────────────────┐     │
│  │  Analysis Pods (10GB)          │     │
│  │  ┌──────────┐ ┌──────────┐    │     │
│  │  │ Java 3GB │ │ JS 2GB   │    │     │
│  │  └──────────┘ └──────────┘    │     │
│  │  ┌──────────┐ ┌──────────┐    │     │
│  │  │Python 2GB│ │ Go 1.5GB │    │     │
│  │  └──────────┘ └──────────┘    │     │
│  │  ┌──────────┐                  │     │
│  │  │Rust 1.5GB│                  │     │
│  │  └──────────┘                  │     │
│  └────────────────────────────────┘     │
│                                          │
│  ┌────────────────────────────────┐     │
│  │  Cache & Storage (4GB)         │     │
│  │  - Redis: 1GB                  │     │
│  │  - File cache: 2GB             │     │
│  │  - Index cache: 1GB            │     │
│  └────────────────────────────────┘     │
│                                          │
│  ┌────────────────────────────────┐     │
│  │  System Reserve (2GB)          │     │
│  │  - OS overhead                 │     │
│  │  - Buffer for spikes           │     │
│  └────────────────────────────────┘     │
└─────────────────────────────────────────┘
```

## 🚀 Implementation Plan

### Phase 1: Build Language-Specific Images (Week 1)
```bash
# Build script for all images
#!/bin/bash
for lang in java javascript python go rust; do
    docker build -f docker/Dockerfile.$lang -t codequal/analysis:$lang .
    docker push codequal/analysis:$lang
done
```

### Phase 2: Deploy with Smart Selection (Week 2)
```typescript
class ImageSelector {
  async selectImage(repoPath: string): Promise<string> {
    const languages = await this.detectLanguages(repoPath);
    const primary = languages[0];
    
    const imageMap = {
      'java': 'codequal/analysis:java-enterprise',
      'javascript': 'codequal/analysis:javascript-node',
      'typescript': 'codequal/analysis:javascript-node',
      'python': 'codequal/analysis:python-ml',
      'go': 'codequal/analysis:go-microservices',
      'rust': 'codequal/analysis:rust-systems',
      'mixed': 'codequal/analysis:polyglot-minimal'
    };
    
    return imageMap[primary] || 'codequal/analysis:complete';
  }
  
  async spawnPod(image: string, repoUrl: string): Promise<string> {
    const manifest = this.generatePodManifest(image);
    await kubectl.apply(manifest);
    return podName;
  }
}
```

### Phase 3: Monitor and Optimize (Week 3)
```yaml
# Prometheus metrics for monitoring
apiVersion: v1
kind: ServiceMonitor
metadata:
  name: analysis-metrics
spec:
  selector:
    matchLabels:
      app: codequal-analysis
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics
```

## 💰 Cost-Benefit Analysis

### Current Approach (Single Complete Image)
- **Memory Cost:** 4GB × 24/7 = ~$50/month
- **Storage:** 10GB image × downloads = ~$20/month
- **Efficiency:** 30% (loads unused tools)

### Optimized Approach (Language-Specific)
- **Memory Cost:** 2GB average × on-demand = ~$25/month
- **Storage:** 2GB average × 6 images = ~$15/month
- **Efficiency:** 85% (only needed tools)
- **Savings:** ~40% cost reduction

## 📋 Recommended Actions

### Immediate (Today):
1. **Build Java and JavaScript images first** (80% of use cases)
2. **Set up cleanup script** for local tools
3. **Deploy new pod** with proper memory limits

### Short Term (This Week):
1. **Build remaining language images**
2. **Implement image selection logic**
3. **Set up monitoring**

### Medium Term (Next Month):
1. **Optimize images** based on usage patterns
2. **Implement caching** between pod restarts
3. **Add auto-scaling** based on load

## 🎯 Memory Management Best Practices

### 1. Resource Limits per Pod Type
```yaml
resources:
  requests:
    memory: "2Gi"      # Guaranteed minimum
    cpu: "1000m"       # 1 CPU core
  limits:
    memory: "4Gi"      # Maximum allowed
    cpu: "2000m"       # 2 CPU cores
```

### 2. Garbage Collection Tuning
```dockerfile
# For Java pods
ENV JAVA_OPTS="-Xms1g -Xmx3g -XX:+UseG1GC -XX:MaxGCPauseMillis=200"

# For Node.js pods
ENV NODE_OPTIONS="--max-old-space-size=2048"

# For Python pods
ENV PYTHONOPTIMIZE=1
```

### 3. Cleanup Policies
```yaml
# Automatic cleanup of completed pods
spec:
  ttlSecondsAfterFinished: 3600  # Clean up after 1 hour
  activeDeadlineSeconds: 1800     # Kill after 30 minutes
```

## ✅ Summary

### Pre-Built Images Benefits:
- **50% faster startup** (smaller images)
- **40% less memory usage** (only needed tools)
- **Better scaling** (can run more pods)
- **Language-optimized** (specific tool versions)

### Memory Management Improvements:
- **Clear allocation**: 10GB for pods, 4GB cache, 2GB reserve
- **Dynamic scaling**: VPA adjusts based on actual usage
- **Efficient cleanup**: Remove unused local tools
- **Smart scheduling**: Right-sized pods for each language

### Next Steps:
1. Start with Java and JavaScript images
2. Deploy with 3GB/2GB memory respectively
3. Monitor actual usage for 1 week
4. Optimize based on metrics

---

*This strategy reduces resource usage by 40% while improving performance by 50%.*