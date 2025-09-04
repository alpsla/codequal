# 📚 CodeQual Master Deployment Guide

**Version:** 2.0 - Quality-First Architecture  
**Last Updated:** September 2025  
**Strategy:** 100% tool coverage with sequential execution

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Infrastructure Requirements](#infrastructure-requirements)
3. [Docker Images](#docker-images)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [Database Setup](#database-setup)
6. [Environment Configuration](#environment-configuration)
7. [Deployment Process](#deployment-process)
8. [Monitoring & Maintenance](#monitoring-maintenance)
9. [Scaling Strategy](#scaling-strategy)
10. [Troubleshooting](#troubleshooting)

---

## 🏗️ Architecture Overview

### Business Model
```
Quality-First Approach:
├── 100% tool coverage (85 tools)
├── Comprehensive analysis over speed
├── 5-10 minute execution acceptable
└── Premium pricing for complete coverage
```

### System Architecture
```
┌─────────────────────────────────────────────────┐
│                   Users                          │
└─────────────────────┬───────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────┐
│            CloudFlare CDN / Load Balancer        │
└─────────────────────┬───────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────┐
│         Kubernetes Cluster (8GB RAM)             │
│                                                  │
│  ┌─────────────────────────────────────────┐    │
│  │  Application Layer (2GB)                │    │
│  │  ├── API Service (0.5GB)                │    │
│  │  ├── Web Frontend (0.5GB)               │    │
│  │  ├── Background Workers (0.5GB)         │    │
│  │  └── Redis Cache (0.5GB)                │    │
│  └─────────────────────────────────────────┘    │
│                                                  │
│  ┌─────────────────────────────────────────┐    │
│  │  Analysis Pod (3.5GB)                   │    │
│  │  └── 85 Tools (Sequential Execution)    │    │
│  └─────────────────────────────────────────┘    │
│                                                  │
│  ┌─────────────────────────────────────────┐    │
│  │  System & Buffer (2.5GB)                │    │
│  └─────────────────────────────────────────┘    │
└──────────────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────┐
│        PostgreSQL (Supabase) - External          │
│        ├── 2GB RAM                               │
│        └── 30GB Storage                          │
└──────────────────────────────────────────────────┘
```

---

## 💻 Infrastructure Requirements

### Current (Alpha/Beta)
```yaml
Kubernetes Cluster:
  nodes: 2
  totalRAM: 8GB
  totalCPU: 4 cores
  provider: DigitalOcean
  cost: $120/month

Database:
  type: PostgreSQL 14
  provider: Supabase
  ram: 2GB
  storage: 30GB
  cost: $50/month

Total Monthly Cost: $170
```

### Future Production (When Scaling)
```yaml
Kubernetes Cluster:
  nodes: 4-5
  totalRAM: 16-20GB
  totalCPU: 8-10 cores
  provider: DigitalOcean
  cost: $240-300/month

Database:
  type: PostgreSQL 14
  provider: Supabase
  ram: 4GB
  storage: 100GB
  cost: $100/month

Total Monthly Cost: $340-400
```

---

## 🐳 Docker Images

### All-in-One Quality Image (85 Tools)

```dockerfile
# Location: /docker/Dockerfile.all-85-tools
FROM ubuntu:22.04

# Contains ALL 85 tools:
# - Python: 17 tools
# - JavaScript/TypeScript: 10 tools
# - Java: 9 tools
# - Go: 12 tools
# - Rust: 16 tools
# - Ruby: 9 tools
# - PHP: 7 tools
# - C++: 5 tools

# Image size: ~5GB
# Runtime memory: 3-4GB
# Execution: Sequential batches
```

### Build Commands

```bash
# Build the comprehensive image
cd /Users/alpinro/Code\ Prjects/codequal
docker build -f docker/Dockerfile.all-85-tools -t codequal/analyzer:all-tools-v1 .

# Push to registry
docker tag codequal/analyzer:all-tools-v1 registry.digitalocean.com/codequal/analyzer:all-tools-v1
docker push registry.digitalocean.com/codequal/analyzer:all-tools-v1

# Verify image
docker run --rm codequal/analyzer:all-tools-v1 /usr/local/bin/verify-all-tools
```

---

## ☸️ Kubernetes Deployment

### Namespace Setup

```yaml
# kubernetes/namespaces.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: codequal
  labels:
    app: codequal
    environment: production
```

### Core Deployments

#### 1. Analysis Pod (Quality-First)

```yaml
# kubernetes/analysis-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: codequal-analyzer
  namespace: codequal
spec:
  replicas: 1
  selector:
    matchLabels:
      app: analyzer
  template:
    metadata:
      labels:
        app: analyzer
    spec:
      containers:
      - name: analyzer
        image: registry.digitalocean.com/codequal/analyzer:all-tools-v1
        resources:
          requests:
            memory: "3Gi"
            cpu: "1"
          limits:
            memory: "3.5Gi"
            cpu: "2"
        env:
        - name: EXECUTION_MODE
          value: "quality-first"
        - name: TOTAL_TOOLS
          value: "85"
        - name: MAX_ANALYSIS_TIME
          value: "600" # 10 minutes
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: codequal-secrets
              key: database-url
        volumeMounts:
        - name: workspace
          mountPath: /workspace
        - name: results
          mountPath: /results
      volumes:
      - name: workspace
        emptyDir:
          sizeLimit: 2Gi
      - name: results
        persistentVolumeClaim:
          claimName: results-pvc
```

#### 2. API Service

```yaml
# kubernetes/api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: codequal-api
  namespace: codequal
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
      - name: api
        image: registry.digitalocean.com/codequal/api:latest
        resources:
          requests:
            memory: "400Mi"
            cpu: "200m"
          limits:
            memory: "500Mi"
            cpu: "500m"
        env:
        - name: NODE_ENV
          value: "production"
        - name: ANALYZER_MODE
          value: "quality-first"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: codequal-secrets
              key: database-url
        - name: REDIS_URL
          value: "redis://redis-service:6379"
        ports:
        - containerPort: 3000
```

#### 3. Redis Cache

```yaml
# kubernetes/redis-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: codequal
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        resources:
          requests:
            memory: "400Mi"
            cpu: "100m"
          limits:
            memory: "500Mi"
            cpu: "200m"
        ports:
        - containerPort: 6379
        volumeMounts:
        - name: redis-data
          mountPath: /data
      volumes:
      - name: redis-data
        persistentVolumeClaim:
          claimName: redis-pvc
```

### Services

```yaml
# kubernetes/services.yaml
---
apiVersion: v1
kind: Service
metadata:
  name: analyzer-service
  namespace: codequal
spec:
  selector:
    app: analyzer
  ports:
  - port: 8080
    targetPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: api-service
  namespace: codequal
spec:
  selector:
    app: api
  ports:
  - port: 3000
    targetPort: 3000
  type: LoadBalancer
---
apiVersion: v1
kind: Service
metadata:
  name: redis-service
  namespace: codequal
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
```

### Persistent Volumes

```yaml
# kubernetes/persistent-volumes.yaml
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: results-pvc
  namespace: codequal
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: do-block-storage
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: redis-pvc
  namespace: codequal
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
  storageClassName: do-block-storage
```

---

## 🗄️ Database Setup

### Supabase PostgreSQL Configuration

```sql
-- Create database schema
CREATE SCHEMA IF NOT EXISTS analysis;
CREATE SCHEMA IF NOT EXISTS users;
CREATE SCHEMA IF NOT EXISTS cache;

-- Main analysis results table
CREATE TABLE analysis.results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_url TEXT NOT NULL,
    pr_number INTEGER,
    commit_hash VARCHAR(40),
    analysis_start TIMESTAMP NOT NULL,
    analysis_end TIMESTAMP,
    duration_minutes DECIMAL(5,2),
    tools_executed INTEGER,
    tools_total INTEGER DEFAULT 85,
    coverage_percent DECIMAL(5,2),
    issues_critical INTEGER DEFAULT 0,
    issues_high INTEGER DEFAULT 0,
    issues_medium INTEGER DEFAULT 0,
    issues_low INTEGER DEFAULT 0,
    full_report JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_results_repo ON analysis.results(repository_url);
CREATE INDEX idx_results_pr ON analysis.results(pr_number);
CREATE INDEX idx_results_date ON analysis.results(created_at DESC);

-- Tool execution tracking
CREATE TABLE analysis.tool_executions (
    id BIGSERIAL PRIMARY KEY,
    analysis_id UUID REFERENCES analysis.results(id),
    tool_name VARCHAR(100) NOT NULL,
    tool_version VARCHAR(50),
    execution_time_seconds DECIMAL(10,2),
    memory_used_mb INTEGER,
    status VARCHAR(20),
    error_message TEXT,
    result_summary JSONB,
    executed_at TIMESTAMP DEFAULT NOW()
);

-- User management
CREATE TABLE users.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    organization VARCHAR(255),
    plan VARCHAR(50) DEFAULT 'trial',
    api_key VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Cache for results
CREATE TABLE cache.analysis_cache (
    cache_key VARCHAR(255) PRIMARY KEY,
    repository_url TEXT,
    file_hash VARCHAR(64),
    tool_results JSONB,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Connection Configuration

```bash
# .env.production
DATABASE_URL=postgresql://postgres:[password]@db.supabase.co:5432/postgres
SUPABASE_URL=https://[project-id].supabase.co
SUPABASE_SERVICE_KEY=[service-key]
```

---

## 🔧 Environment Configuration

### Secrets Management

```yaml
# kubernetes/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: codequal-secrets
  namespace: codequal
type: Opaque
stringData:
  database-url: "postgresql://user:pass@host:5432/codequal"
  supabase-url: "https://project.supabase.co"
  supabase-key: "your-service-key"
  github-token: "ghp_xxxxxxxxxxxxx"
  openrouter-api-key: "sk-xxxxxxxxxxxxx"
```

### ConfigMaps

```yaml
# kubernetes/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: codequal-config
  namespace: codequal
data:
  environment: "production"
  execution_mode: "quality-first"
  total_tools: "85"
  max_analysis_time: "600"
  batch_size: "10"
  enable_caching: "true"
  log_level: "info"
```

---

## 🚀 Deployment Process

### Initial Deployment

```bash
#!/bin/bash
# deploy.sh

# 1. Create namespace
kubectl apply -f kubernetes/namespaces.yaml

# 2. Create secrets (edit first!)
kubectl apply -f kubernetes/secrets.yaml

# 3. Create config maps
kubectl apply -f kubernetes/configmap.yaml

# 4. Create persistent volumes
kubectl apply -f kubernetes/persistent-volumes.yaml

# 5. Deploy Redis
kubectl apply -f kubernetes/redis-deployment.yaml

# 6. Deploy API
kubectl apply -f kubernetes/api-deployment.yaml

# 7. Deploy Analyzer
kubectl apply -f kubernetes/analysis-deployment.yaml

# 8. Create services
kubectl apply -f kubernetes/services.yaml

# 9. Verify deployment
kubectl get all -n codequal
```

### Update Deployment

```bash
#!/bin/bash
# update.sh

# Build and push new image
docker build -f docker/Dockerfile.all-85-tools -t codequal/analyzer:all-tools-v2 .
docker push registry.digitalocean.com/codequal/analyzer:all-tools-v2

# Update deployment
kubectl set image deployment/codequal-analyzer \
  analyzer=registry.digitalocean.com/codequal/analyzer:all-tools-v2 \
  -n codequal

# Check rollout status
kubectl rollout status deployment/codequal-analyzer -n codequal
```

### Rollback Process

```bash
# View history
kubectl rollout history deployment/codequal-analyzer -n codequal

# Rollback to previous version
kubectl rollout undo deployment/codequal-analyzer -n codequal

# Rollback to specific version
kubectl rollout undo deployment/codequal-analyzer --to-revision=2 -n codequal
```

---

## 📊 Monitoring & Maintenance

### Health Checks

```bash
# Check pod status
kubectl get pods -n codequal

# Check resource usage
kubectl top pods -n codequal

# View logs
kubectl logs -f deployment/codequal-analyzer -n codequal

# Check events
kubectl get events -n codequal --sort-by='.lastTimestamp'
```

### Monitoring Stack

```yaml
# kubernetes/monitoring.yaml
# Prometheus metrics
apiVersion: v1
kind: Service
metadata:
  name: metrics
  namespace: codequal
  labels:
    app: codequal
spec:
  ports:
  - name: metrics
    port: 9090
    targetPort: 9090
  selector:
    app: analyzer
```

### Backup Strategy

```bash
# Database backup (Supabase handles automatically)
# Manual backup if needed:
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Persistent volume backup
kubectl exec -n codequal [pod-name] -- tar czf /tmp/backup.tar.gz /results
kubectl cp codequal/[pod-name]:/tmp/backup.tar.gz ./backup_$(date +%Y%m%d).tar.gz
```

---

## 📈 Scaling Strategy

### Phase 1: Current (8GB, 85 tools sequential)
```yaml
Status: Active
Capacity: 100-150 analyses/day
Execution: 5-10 minutes per analysis
Cost: $170/month
```

### Phase 2: Add 1 Node (12GB)
```yaml
When: 200+ analyses/day
Changes:
  - Add 1 node (4GB)
  - Enable partial parallelization
  - Reduce execution to 3-5 minutes
Cost: $220/month
```

### Phase 3: Full Scale (16-20GB)
```yaml
When: 500+ analyses/day
Changes:
  - Add 2-3 nodes
  - Full parallel execution
  - Sub-1 minute analysis
  - Multiple analyzer pods
Cost: $340-400/month
```

### Scaling Commands

```bash
# Add node to cluster (DigitalOcean)
doctl kubernetes cluster node-pool create [cluster-id] \
  --name analyzer-pool \
  --size s-2vcpu-4gb \
  --count 1

# Scale analyzer deployment
kubectl scale deployment codequal-analyzer --replicas=2 -n codequal

# Enable HPA (Horizontal Pod Autoscaler)
kubectl autoscale deployment codequal-analyzer \
  --min=1 --max=3 --cpu-percent=70 -n codequal
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Out of Memory (OOM) Errors
```bash
# Check memory usage
kubectl top pods -n codequal

# Increase memory limits
kubectl edit deployment codequal-analyzer -n codequal
# Change limits.memory to 4Gi

# Or reduce batch size
kubectl set env deployment/codequal-analyzer BATCH_SIZE=5 -n codequal
```

#### 2. Analysis Timeout
```bash
# Increase timeout
kubectl set env deployment/codequal-analyzer MAX_ANALYSIS_TIME=900 -n codequal

# Check stuck analyses
kubectl exec -it deployment/codequal-analyzer -n codequal -- ps aux
```

#### 3. Database Connection Issues
```bash
# Test connection
kubectl run -it --rm debug --image=postgres:14 --restart=Never -n codequal -- \
  psql $DATABASE_URL -c "SELECT 1"

# Check secrets
kubectl get secret codequal-secrets -n codequal -o yaml
```

#### 4. Pod Crash Loop
```bash
# Check logs
kubectl logs deployment/codequal-analyzer -n codequal --previous

# Describe pod for events
kubectl describe pod [pod-name] -n codequal

# Force restart
kubectl rollout restart deployment/codequal-analyzer -n codequal
```

### Debug Mode

```bash
# Run interactive shell in analyzer pod
kubectl exec -it deployment/codequal-analyzer -n codequal -- /bin/bash

# Test tool availability
/usr/local/bin/verify-all-tools

# Run analysis manually
/usr/local/bin/analyze-quality-first /workspace /results
```

---

## 📝 CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker Image
        run: |
          docker build -f docker/Dockerfile.all-85-tools \
            -t codequal/analyzer:${{ github.sha }} .
      
      - name: Push to Registry
        env:
          REGISTRY_TOKEN: ${{ secrets.REGISTRY_TOKEN }}
        run: |
          echo $REGISTRY_TOKEN | docker login registry.digitalocean.com -u token --password-stdin
          docker tag codequal/analyzer:${{ github.sha }} \
            registry.digitalocean.com/codequal/analyzer:${{ github.sha }}
          docker push registry.digitalocean.com/codequal/analyzer:${{ github.sha }}
      
      - name: Deploy to Kubernetes
        env:
          KUBE_CONFIG: ${{ secrets.KUBE_CONFIG }}
        run: |
          echo "$KUBE_CONFIG" | base64 -d > kubeconfig
          export KUBECONFIG=kubeconfig
          kubectl set image deployment/codequal-analyzer \
            analyzer=registry.digitalocean.com/codequal/analyzer:${{ github.sha }} \
            -n codequal
          kubectl rollout status deployment/codequal-analyzer -n codequal
```

---

## ✅ Production Checklist

### Pre-Deployment
- [ ] All 85 tools verified in Docker image
- [ ] Database schema created and migrated
- [ ] Secrets configured in Kubernetes
- [ ] Persistent volumes provisioned
- [ ] DNS configured for API endpoint
- [ ] SSL certificates configured

### Deployment
- [ ] Namespace created
- [ ] Secrets applied
- [ ] ConfigMaps applied
- [ ] Redis deployed and running
- [ ] API deployed and accessible
- [ ] Analyzer deployed and healthy
- [ ] Services exposed correctly

### Post-Deployment
- [ ] Health checks passing
- [ ] Monitoring configured
- [ ] Logs accessible
- [ ] Test analysis successful
- [ ] Backup strategy verified
- [ ] Documentation updated

### Performance Validation
- [ ] Single analysis completes in <10 minutes
- [ ] All 85 tools execute successfully
- [ ] Memory usage stays under 3.5GB
- [ ] No OOM kills observed
- [ ] Results properly stored in database

---

## 📞 Support & Contacts

### Infrastructure
- **Provider:** DigitalOcean
- **Cluster:** codequal-k8s-cluster
- **Region:** nyc1
- **Support:** support@digitalocean.com

### Database
- **Provider:** Supabase
- **Project:** codequal-prod
- **Support:** support@supabase.io

### Monitoring
- **Alerts:** alerts@codequal.com
- **On-call:** [Your phone number]

---

## 📚 Related Documentation

- [Quality-First Strategy](../QUALITY_FIRST_85_TOOLS_STRATEGY.md)
- [8GB Alpha Testing Guide](../8GB_ALPHA_TESTING_REALITY.md)
- [Docker Setup](../../docker/README.md)
- [API Documentation](../../api/README.md)

---

**Remember:** Our focus is QUALITY over SPEED. All 85 tools must run for every analysis. Speed optimization comes later with infrastructure investment.