# 🚀 Three-Environment Strategy: Dev → Staging → Production

## 📊 Environment Overview

### **Cost-Optimized Progression**
```
Development (Local) → Staging (Minimal Cloud) → Production (Scaled Cloud)
$0/month            → $40/month              → $200-300/month
```

## 🏗️ Environment Architecture

### **1. DEVELOPMENT Environment (Local)**
```
Location: Developer Machines / GitHub Actions
Cost: $0 (local) or $50/month (CI/CD)
Resources:
├── RAM: 16-32GB (your machine)
├── Tools: All 85 tools
├── Containers: 9 language-specific
└── Database: Local PostgreSQL

Purpose:
✅ Full tool testing
✅ Feature development
✅ Complete analysis
✅ No cloud costs
```

### **2. STAGING Environment (Minimal Cloud)**
```
Location: Single Kubernetes Node
Cost: $40/month
Resources:
├── RAM: 4GB (1 node)
├── Tools: 15 core tools only
├── Pods: 1-2 lightweight
└── Database: Shared dev PostgreSQL

Purpose:
✅ Integration testing
✅ Deployment validation
✅ Performance testing
✅ Cost-effective testing
```

### **3. PRODUCTION Environment (Scaled Cloud)**
```
Current (Your 2 nodes):          Future (With 2-3 more nodes):
├── RAM: 8GB                     ├── RAM: 16-20GB
├── Tools: 25-30                 ├── Tools: 60-85
├── Pods: 2-3                    ├── Pods: 5-8
└── Cost: $120/month             └── Cost: $240-300/month
```

## 💰 Cost Analysis & Scaling Path

### **Phase 1: Current Setup (Save Money Now)**
```
Staging: 1 small node (4GB)     = $40/month
Production: 2 nodes (8GB)        = $120/month
Total:                           = $160/month

Tools Coverage:
- Staging: 15 tools (18%)
- Production: 30 tools (35%)
```

### **Phase 2: Add 1 Node (Better Coverage)**
```
Staging: 1 small node (4GB)     = $40/month
Production: 3 nodes (12GB)       = $180/month
Total:                           = $220/month

Tools Coverage:
- Staging: 15 tools (18%)
- Production: 45 tools (53%)
```

### **Phase 3: Add 2-3 Nodes (Full Coverage)**
```
Staging: 1 small node (4GB)     = $40/month
Production: 4-5 nodes (16-20GB) = $240-300/month
Total:                           = $280-340/month

Tools Coverage:
- Staging: 15 tools (18%)
- Production: 60-85 tools (70-100%)
```

## 🎯 Environment-Specific Configurations

### **Development Configuration**
```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  # All 9 language containers
  python-analyzer:
    image: codequal/python:dev-full
    mem_limit: 3g
    environment:
      - ENV=development
      - TOOLS_COUNT=17
      - DEBUG=true
  
  javascript-analyzer:
    image: codequal/javascript:dev-full
    mem_limit: 2g
    environment:
      - ENV=development
      - TOOLS_COUNT=10
  
  # ... all other language containers
  
  postgres:
    image: postgres:14
    environment:
      - POSTGRES_DB=codequal_dev
    volumes:
      - ./dev-data:/var/lib/postgresql/data
```

### **Staging Configuration**
```yaml
# k8s/staging/deployment.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: codequal-staging
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: analysis-minimal
  namespace: codequal-staging
spec:
  replicas: 1
  template:
    spec:
      containers:
      - name: analyzer
        image: codequal/staging:minimal-v1
        resources:
          requests:
            memory: "1.5Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        env:
        - name: ENV
          value: "staging"
        - name: TOOLS_COUNT
          value: "15"
        - name: TOOLS_LIST
          value: "semgrep,eslint,bandit,gosec,gitleaks"
```

### **Production Configuration**
```yaml
# k8s/production/deployment.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: codequal-production
---
# Current Setup (8GB)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: analysis-core
  namespace: codequal-production
spec:
  replicas: 2
  template:
    spec:
      containers:
      - name: analyzer
        image: codequal/production:core-v2
        resources:
          requests:
            memory: "3Gi"
          limits:
            memory: "3.5Gi"
        env:
        - name: ENV
          value: "production"
        - name: TOOLS_COUNT
          value: "30"
---
# Future Setup (16-20GB)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: analysis-extended
  namespace: codequal-production
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: analyzer
        image: codequal/production:extended-v2
        resources:
          requests:
            memory: "3Gi"
          limits:
            memory: "4Gi"
```

## 🔧 Simplified Testing Image (Start Here!)

### **Minimal 10-Tool Image for Testing**
```dockerfile
# Dockerfile.minimal-testing
FROM python:3.11-slim

# Only 10 essential tools for testing
RUN pip install --no-cache-dir \
    bandit \
    flake8 \
    black

RUN apt-get update && apt-get install -y \
    nodejs npm git \
    && npm install -g eslint prettier \
    && rm -rf /var/lib/apt/lists/*

# Install 3 universal tools
RUN pip install semgrep && \
    npm install -g snyk

# Total: ~500MB image, ~1GB RAM usage
# Tools: bandit, flake8, black, eslint, prettier, semgrep, snyk, git

COPY analyze-minimal.sh /usr/local/bin/
ENTRYPOINT ["/usr/local/bin/analyze-minimal.sh"]
```

## 📈 Progressive Rollout Strategy

### **Week 1-2: Minimal Testing**
```bash
# Build minimal image
docker build -f Dockerfile.minimal-testing -t codequal/testing:v1 .

# Test locally
docker run -v $(pwd):/code codequal/testing:v1

# Deploy to staging
kubectl apply -f k8s/staging/minimal-deployment.yaml

# Cost: $40/month (1 staging node)
```

### **Week 3-4: Staging Validation**
```bash
# Test in staging with real PRs
# Monitor memory usage
# Optimize tool selection

# Deploy core tools to production
kubectl apply -f k8s/production/core-deployment.yaml

# Cost: $160/month (staging + current prod)
```

### **Month 2: Production Expansion**
```bash
# Add 1 more node
kubectl scale nodes --replicas=3

# Deploy extended tools
kubectl apply -f k8s/production/extended-deployment.yaml

# Cost: $220/month
```

### **Month 3: Full Scaling**
```bash
# Add 2 more nodes (total 4-5)
kubectl scale nodes --replicas=5

# Deploy all language-specific pods
kubectl apply -f k8s/production/full-deployment.yaml

# Cost: $280-340/month
```

## 🔄 Environment Isolation

### **Namespace Separation**
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: codequal-dev
  labels:
    env: development
---
apiVersion: v1
kind: Namespace
metadata:
  name: codequal-staging
  labels:
    env: staging
---
apiVersion: v1
kind: Namespace
metadata:
  name: codequal-production
  labels:
    env: production
```

### **Resource Quotas**
```yaml
# Staging: Limited resources
apiVersion: v1
kind: ResourceQuota
metadata:
  name: staging-quota
  namespace: codequal-staging
spec:
  hard:
    requests.memory: 3Gi
    requests.cpu: "2"
    pods: "5"
---
# Production: More resources
apiVersion: v1
kind: ResourceQuota
metadata:
  name: production-quota
  namespace: codequal-production
spec:
  hard:
    requests.memory: 12Gi  # Will increase to 20Gi
    requests.cpu: "8"
    pods: "20"
```

## 🚀 Deployment Pipeline

### **GitOps Flow**
```
Developer Push → GitHub Actions → Build Images → Deploy

Dev Branch:     → Build dev images    → Local testing only
Staging Branch: → Build staging image → Deploy to staging
Main Branch:    → Build prod images   → Deploy to production
```

### **Promotion Path**
```typescript
class EnvironmentPromotion {
  async promoteToStaging(commit: string) {
    // 1. Build minimal image
    await this.buildImage('staging', commit, 15); // 15 tools
    
    // 2. Deploy to staging
    await this.deploy('codequal-staging', 'minimal');
    
    // 3. Run smoke tests
    await this.runTests('staging', 'smoke');
  }
  
  async promoteToProduction(commit: string) {
    // 1. Verify staging tests passed
    const stagingOk = await this.verifyStaging();
    if (!stagingOk) throw new Error('Staging tests failed');
    
    // 2. Build production images
    await this.buildImage('production', commit, 30); // 30 tools
    
    // 3. Blue-green deployment
    await this.blueGreenDeploy('codequal-production');
    
    // 4. Run production tests
    await this.runTests('production', 'full');
  }
}
```

## 📊 Environment Comparison

| Aspect | Development | Staging | Production (Now) | Production (Future) |
|--------|------------|---------|------------------|-------------------|
| **Location** | Local | 1 Cloud Node | 2 Cloud Nodes | 4-5 Cloud Nodes |
| **RAM** | 16-32GB | 4GB | 8GB | 16-20GB |
| **Tools** | 85 (100%) | 15 (18%) | 30 (35%) | 60-85 (70-100%) |
| **Cost/month** | $0 | $40 | $120 | $240-300 |
| **Purpose** | Development | Testing | Limited Prod | Full Production |
| **Availability** | When needed | 99% | 99.5% | 99.9% |
| **Data** | Test data | Copy of prod | Real data | Real data |

## 🎯 Immediate Action Plan

### **Step 1: Build Minimal Testing Image (Today)**
```bash
# Create minimal 10-tool image
cat > Dockerfile.minimal <<EOF
FROM python:3.11-slim
RUN pip install bandit flake8 semgrep
RUN apt-get update && apt-get install -y nodejs npm && \
    npm install -g eslint prettier
WORKDIR /code
CMD ["semgrep", "--config=auto", "."]
EOF

docker build -f Dockerfile.minimal -t codequal/minimal:v1 .
```

### **Step 2: Deploy to Staging (This Week)**
```bash
# Create staging namespace
kubectl create namespace codequal-staging

# Deploy minimal pod
kubectl run analysis-minimal \
  --image=codequal/minimal:v1 \
  --namespace=codequal-staging \
  --limits="memory=2Gi,cpu=1" \
  --requests="memory=1Gi,cpu=500m"
```

### **Step 3: Test and Monitor (Next Week)**
```bash
# Test with real PR
kubectl exec -n codequal-staging analysis-minimal -- \
  semgrep --config=auto /test-repo

# Monitor resources
kubectl top pod -n codequal-staging
```

### **Step 4: Plan Production Scaling (Month 2)**
```bash
# Add nodes when ready
# Deploy more comprehensive images
# Scale based on actual usage data
```

## 💡 Key Benefits of This Approach

1. **Cost Control**: Start at $40/month, scale as needed
2. **Risk Mitigation**: Test in staging before production
3. **Progressive Enhancement**: Add tools as you validate need
4. **Environment Isolation**: No staging bugs in production
5. **Clear Promotion Path**: Dev → Staging → Prod
6. **Rollback Capability**: Each environment independent

## 🔮 When You Add 2-3 More Nodes

### **With 16GB Total RAM (4 nodes)**
- Run 60 tools (70% coverage)
- 4-6 concurrent analysis pods
- Handle 100+ PRs/day

### **With 20GB Total RAM (5 nodes)**
- Run 75-85 tools (88-100% coverage)
- 6-8 concurrent analysis pods
- Handle 200+ PRs/day

This would fully solve your tool coverage needs!