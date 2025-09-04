# 🎯 Complete CodeQual Cloud Infrastructure Memory Allocation

## 📊 Total Available Resources

Based on your database cluster screenshot showing **30GB disk** for PostgreSQL, let's map out the entire infrastructure:

```
TOTAL CLOUD RESOURCES
├── Database Cluster: 2GB RAM / 30GB Disk (PostgreSQL)
├── Kubernetes Cluster: 32GB RAM (estimated based on typical setup)
├── Redis Cache: 2GB RAM
└── Application Pods: Variable
```

## 🏗️ Actual Memory Distribution

### **Revised Total Cluster Memory: 32GB** (not 16GB)

```
┌─────────────────────────────────────────────────────────┐
│           Kubernetes Cluster (32GB Total RAM)            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────────────────────────────┐       │
│  │  1. Application Layer (8GB)                   │       │
│  │  ├── API Service: 2GB                         │       │
│  │  ├── Web Frontend: 2GB                        │       │
│  │  ├── Background Workers: 2GB                  │       │
│  │  └── Admin Dashboard: 2GB                     │       │
│  └──────────────────────────────────────────────┘       │
│                                                          │
│  ┌──────────────────────────────────────────────┐       │
│  │  2. Analysis Pods (16GB)                      │       │
│  │  ├── Tier 1 Languages: 8GB                    │       │
│  │  │   ├── Python: 2.5GB                        │       │
│  │  │   ├── JavaScript: 2GB                      │       │
│  │  │   ├── TypeScript: 2GB                      │       │
│  │  │   └── Java: 2.5GB                          │       │
│  │  ├── Tier 2 Languages: 5GB                    │       │
│  │  │   ├── Rust: 2GB                            │       │
│  │  │   ├── Go: 1.5GB                            │       │
│  │  │   └── C#/.NET: 1.5GB                       │       │
│  │  └── Tier 3 Languages: 3GB                    │       │
│  │      ├── Ruby: 0.5GB                          │       │
│  │      ├── PHP: 0.5GB                           │       │
│  │      ├── C++: 0.5GB                           │       │
│  │      └── Multi-language: 1.5GB                │       │
│  └──────────────────────────────────────────────┘       │
│                                                          │
│  ┌──────────────────────────────────────────────┐       │
│  │  3. Infrastructure Services (6GB)             │       │
│  │  ├── Redis Cache: 2GB                         │       │
│  │  ├── Message Queue (RabbitMQ/Kafka): 1GB      │       │
│  │  ├── Monitoring (Prometheus/Grafana): 1GB     │       │
│  │  ├── Logging (ELK Stack): 1GB                 │       │
│  │  └── Service Mesh (Istio): 1GB                │       │
│  └──────────────────────────────────────────────┘       │
│                                                          │
│  ┌──────────────────────────────────────────────┐       │
│  │  4. System Reserve (2GB)                      │       │
│  │  ├── Kubernetes System: 1GB                   │       │
│  │  └── OS & Buffer: 1GB                         │       │
│  └──────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────┘
```

## 🗄️ PostgreSQL Database (Separate)
```
codequal-db (PostgreSQL 14)
├── RAM: 2GB
├── Disk: 30GB
├── Usage:
│   ├── Analysis Results: ~10GB
│   ├── User Data: ~5GB
│   ├── Metrics/Logs: ~5GB
│   ├── Indexes: ~3GB
│   └── Free Space: ~7GB
```

## 🚀 Application Deployment Strategy

### **1. Main Application Services (8GB)**

```yaml
# API Service Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: codequal-api
  namespace: codequal-prod
spec:
  replicas: 2
  template:
    spec:
      containers:
      - name: api
        image: codequal/api:latest
        resources:
          requests:
            memory: "768Mi"
          limits:
            memory: "1Gi"
---
# Web Frontend Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: codequal-web
spec:
  replicas: 2
  template:
    spec:
      containers:
      - name: web
        resources:
          requests:
            memory: "768Mi"
          limits:
            memory: "1Gi"
---
# Background Workers
apiVersion: apps/v1
kind: Deployment
metadata:
  name: codequal-workers
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: worker
        resources:
          requests:
            memory: "512Mi"
          limits:
            memory: "768Mi"
```

### **2. Analysis Pod Deployment (Scale-to-Zero)**

```typescript
// CloudExecutionWrapper.ts - Enhanced with app deployment
export class CloudPodOrchestrator {
  private readonly memoryAllocations = {
    // Application tier (always running)
    app: {
      api: { replicas: 2, memory: 1024 },      // 2GB total
      web: { replicas: 2, memory: 1024 },      // 2GB total
      workers: { replicas: 3, memory: 768 },   // 2.3GB total
      admin: { replicas: 1, memory: 1024 }     // 1GB total
    },
    // Analysis tier (scale-to-zero)
    analysis: {
      python: { replicas: 0, memory: 2560, maxReplicas: 2 },
      javascript: { replicas: 0, memory: 2048, maxReplicas: 2 },
      typescript: { replicas: 0, memory: 2048, maxReplicas: 2 },
      java: { replicas: 0, memory: 2560, maxReplicas: 1 },
      rust: { replicas: 0, memory: 2048, maxReplicas: 1 },
      go: { replicas: 0, memory: 1536, maxReplicas: 1 },
      ruby: { replicas: 0, memory: 512, maxReplicas: 2 },
      php: { replicas: 0, memory: 512, maxReplicas: 2 },
      cpp: { replicas: 0, memory: 512, maxReplicas: 2 }
    }
  };

  async deployApplication(): Promise<void> {
    // Deploy main application components
    await this.deployAPIService();
    await this.deployWebFrontend();
    await this.deployWorkers();
    
    // Configure autoscaling for analysis pods
    await this.configureAnalysisPodAutoscaling();
  }

  async requestAnalysisPod(language: string, prSize: number): Promise<PodHandle> {
    const config = this.memoryAllocations.analysis[language];
    
    // Calculate required resources based on PR size
    const requiredMemory = this.calculateMemory(language, prSize);
    
    // Check current allocation
    const currentUsage = await this.getCurrentMemoryUsage();
    const available = 16384 - currentUsage; // 16GB for analysis
    
    if (requiredMemory > available) {
      // Try to evict idle pods or queue
      await this.optimizeMemoryAllocation();
    }
    
    // Scale up the pod
    return await this.scalePod(language, 1);
  }
}
```

## 📦 Deployment Pipeline

### **Phase 1: Core Application (Week 1)**
```bash
# 1. Deploy database
kubectl apply -f k8s/postgres-deployment.yaml

# 2. Deploy Redis
kubectl apply -f k8s/redis-deployment.yaml

# 3. Deploy API service
docker build -t codequal/api:latest ./apps/api
kubectl apply -f k8s/api-deployment.yaml

# 4. Deploy web frontend
docker build -t codequal/web:latest ./apps/web
kubectl apply -f k8s/web-deployment.yaml

# 5. Deploy workers
kubectl apply -f k8s/workers-deployment.yaml
```

### **Phase 2: Analysis Infrastructure (Week 2)**
```bash
# Build all language images
for lang in python javascript typescript java rust go ruby php cpp; do
  docker build -f docker/Dockerfile.$lang -t codequal/analysis:$lang .
done

# Deploy with scale-to-zero
for lang in python javascript typescript java rust go ruby php cpp; do
  kubectl apply -f k8s/deployment-$lang.yaml
  kubectl autoscale deployment analysis-$lang --min=0 --max=2 --cpu-percent=70
done
```

## 🎯 Memory Usage Scenarios

### **Scenario 1: Idle State**
```
Application: 8GB (always running)
Analysis: 0GB (scaled to zero)
Infrastructure: 6GB
System: 2GB
------------------------
Total: 16GB / 32GB (50% utilization)
```

### **Scenario 2: Single Python PR**
```
Application: 8GB
Analysis: 2.5GB (1 Python pod)
Infrastructure: 6GB
System: 2GB
------------------------
Total: 18.5GB / 32GB (58% utilization)
```

### **Scenario 3: Peak Load (Multiple PRs)**
```
Application: 8GB
Analysis: 7GB (Python + JavaScript + Go)
Infrastructure: 6GB
System: 2GB
------------------------
Total: 23GB / 32GB (72% utilization)
```

### **Scenario 4: Maximum Load**
```
Application: 8GB
Analysis: 16GB (multiple pods, queued)
Infrastructure: 6GB
System: 2GB
------------------------
Total: 32GB / 32GB (100% utilization)
- Some analysis requests queued
- Automatic pod eviction active
```

## 🔄 Auto-scaling Configuration

```yaml
# HPA for Application Tier
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: codequal-api
  minReplicas: 2
  maxReplicas: 5
  metrics:
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 70
---
# VPA for Analysis Pods
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: analysis-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: analysis-python
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: python-analyzer
      minAllowed:
        memory: 1Gi
      maxAllowed:
        memory: 3Gi
```

## 💾 Storage Allocation

### **Persistent Volumes**
```yaml
# Analysis cache (shared)
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: analysis-cache-pvc
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 50Gi
---
# Application data
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-data-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
```

## 📊 Cost Optimization

### **Current State**
```
- Database: $50/month (2GB RAM, 30GB disk)
- Kubernetes: $240/month (32GB RAM cluster)
- Total: $290/month
```

### **With Optimization**
```
- Database: $50/month (unchanged)
- Kubernetes: $160/month (with scale-to-zero)
- Total: $210/month
- Savings: $80/month (28% reduction)
```

## 🚦 Next Steps

1. **Verify actual cluster size**: 
   ```bash
   kubectl get nodes -o json | jq '.items[].status.capacity.memory'
   ```

2. **Deploy application tier first** (8GB allocation)

3. **Build and deploy analysis pods** with scale-to-zero (16GB allocation)

4. **Configure monitoring** to track memory usage

5. **Implement request queuing** for peak loads