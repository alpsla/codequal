# 🔍 CodeQual Cluster Resource Analysis Report

**Date:** 2025-09-02  
**Cluster:** codequal-prod  
**Namespace:** codequal-dev

## 📊 Current Cluster Resources

### Node Specifications (2 nodes total)
| Node | CPU Capacity | Memory Capacity | CPU Allocatable | Memory Allocatable |
|------|--------------|-----------------|-----------------|-------------------|
| Node 1 (lm1pj) | 2 cores | 3.8 GB | 1.9 cores | 3.1 GB |
| Node 2 (lm1pr) | 2 cores | 3.8 GB | 1.9 cores | 3.1 GB |
| **Total** | **4 cores** | **7.6 GB** | **3.8 cores** | **6.2 GB** |

### Current Resource Usage
| Node | CPU Requested | Memory Requested | CPU Available | Memory Available |
|------|---------------|------------------|---------------|------------------|
| Node 1 | 852m (44%) | 1262 Mi (40%) | 1048m (56%) | 1848 Mi (60%) |
| Node 2 | 952m (50%) | 1352 Mi (43%) | 948m (50%) | 1758 Mi (57%) |
| **Total Used** | **1804m** | **2614 Mi** | **1996m** | **3606 Mi** |

## 🚨 Pods Requiring Resources

### Analysis Pod (Deployment)
**Status:** Pending - Cannot be scheduled  
**Resource Requirements:**
- CPU: 4 cores (requested) / 8 cores (limit)
- Memory: 8 GB (requested) / 16 GB (limit)
- Storage: 50 GB PVC + 50 GB emptyDir

**Why it can't run:** Requesting 4 CPU cores but cluster only has 1.9 cores allocatable per node

### Analysis Pod Simple
**Status:** Pending - Cannot be scheduled  
**Resource Requirements:**
- CPU: 1 core (requested) / 2 cores (limit)
- Memory: 2 GB (requested) / 4 GB (limit)
- Storage: 10 GB emptyDir

**Why it can't run:** No single node has both 1 CPU core AND 2 GB memory available

## ❌ Resource Gaps

### What We Have vs What We Need

| Resource | Available Now | Minimum Needed | Gap | Status |
|----------|---------------|----------------|-----|--------|
| **CPU (per node)** | ~1 core | 1 core | 0 | ⚠️ Barely fits |
| **Memory (per node)** | ~1.7 GB | 2 GB | 0.3 GB | ❌ Insufficient |
| **CPU (for full pod)** | 2 cores total | 4 cores | 2 cores | ❌ Insufficient |
| **Memory (for full pod)** | 3.6 GB total | 8 GB | 4.4 GB | ❌ Insufficient |

## 📋 Detailed Breakdown

### Why Pods Can't Schedule

1. **Memory Constraint (Primary Issue)**
   - Simple pod needs: 2 GB
   - Largest available on single node: 1.7 GB
   - **Gap: 300 MB short**

2. **CPU Constraint (Secondary)**
   - Simple pod needs: 1 core
   - Available per node: ~1 core (barely fits)
   - Full pod needs: 4 cores (impossible with current cluster)

3. **Pod Anti-Affinity**
   - Kubernetes won't split a pod across nodes
   - Must fit entirely on one node

## 🔧 Solutions (In Order of Feasibility)

### Option 1: Reduce Pod Requirements (Immediate)
```yaml
# Minimal viable configuration
resources:
  requests:
    cpu: "500m"      # Reduced from 1 core
    memory: "1.5Gi"  # Reduced from 2 GB
  limits:
    cpu: "1"
    memory: "2Gi"
```

### Option 2: Free Up Resources (Quick)
```bash
# Identify and remove unused pods
kubectl get pods --all-namespaces | grep -E "Evicted|Error|Completed"
kubectl delete pod <pod-name> -n <namespace>

# Scale down non-critical deployments
kubectl scale deployment <deployment> --replicas=0 -n <namespace>
```

### Option 3: Add Node to Cluster (Best Long-term)
```bash
# DigitalOcean example
doctl kubernetes cluster node-pool create \
  --cluster-name codequal-prod \
  --name analysis-pool \
  --size s-4vcpu-8gb \
  --count 1
```

### Option 4: Upgrade Existing Nodes (Alternative)
```bash
# Resize existing nodes to larger instances
# s-2vcpu-4gb → s-4vcpu-8gb
doctl kubernetes cluster node-pool update <pool-id> \
  --size s-4vcpu-8gb
```

## 📊 Resource Optimization Strategies

### Current Inefficiencies
1. **Over-provisioned limits** - Some pods have high limits but low actual usage
2. **No resource quotas** - Namespaces can consume unlimited resources
3. **No horizontal pod autoscaling** - Fixed replica counts

### Recommended Configuration for Analysis Pod

#### Minimum Viable (Will Run Now)
```yaml
resources:
  requests:
    cpu: "500m"
    memory: "1.5Gi"
  limits:
    cpu: "1000m"
    memory: "2Gi"
```

#### Optimal for Performance
```yaml
resources:
  requests:
    cpu: "2"
    memory: "4Gi"
  limits:
    cpu: "4"
    memory: "8Gi"
```

## 💰 Cost Analysis

| Solution | Monthly Cost | Pros | Cons |
|----------|-------------|------|------|
| Reduce Requirements | $0 | Immediate | Slower analysis, possible OOM |
| Free Resources | $0 | Quick | May impact other services |
| Add s-2vcpu-4gb node | +$24 | Solves memory issue | Still CPU limited |
| Add s-4vcpu-8gb node | +$48 | Full solution | Additional cost |
| Upgrade both nodes | +$48 | Best performance | Requires migration downtime |

## 🎯 Recommendations

### Immediate Action (Today)
1. **Deploy minimal pod configuration**
   ```bash
   # Edit the pod to use 500m CPU, 1.5Gi memory
   kubectl edit pod analysis-pod-simple -n codequal-dev
   ```

2. **Clean up unused resources**
   ```bash
   kubectl get pods --all-namespaces | grep -v Running
   ```

### Short-term (This Week)
- Add one s-4vcpu-8gb node for analysis workloads
- Cost: +$48/month
- Benefit: Full Rust analysis capability

### Long-term (This Month)
- Implement resource quotas per namespace
- Set up cluster autoscaling
- Consider spot/preemptible nodes for cost savings

## 📈 Expected Outcomes

### With Current Resources (After Optimization)
- ✅ Can run minimal analysis pod (500m CPU, 1.5GB RAM)
- ⚠️ Slower performance on large repos
- ⚠️ Risk of OOM on rust-lang/rust

### With Additional Node (s-4vcpu-8gb)
- ✅ Full analysis pod deployment
- ✅ Handle rust-lang/rust (33,747 files)
- ✅ Run multiple analysis pods concurrently
- ✅ No timeouts on large repositories

## 🚀 Quick Deploy Commands

### Deploy with Minimal Resources (Works Now)
```bash
# Create minimal pod
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: analysis-pod-minimal
  namespace: codequal-dev
spec:
  containers:
  - name: analyzer
    image: ubuntu:22.04
    command: ["sleep", "infinity"]
    resources:
      requests:
        cpu: "500m"
        memory: "1.5Gi"
      limits:
        cpu: "1"
        memory: "2Gi"
EOF

# Verify it's running
kubectl get pod analysis-pod-minimal -n codequal-dev
```

## Summary

**Current Blockers:**
- ❌ Need 2 GB memory, have 1.7 GB available per node
- ❌ Need 1 CPU core, have ~1 core (tight fit)

**Quickest Solution:**
- Reduce pod requirements to 500m CPU, 1.5 GB memory

**Best Solution:**
- Add one s-4vcpu-8gb node (+$48/month)

---

*Analysis completed: 2025-09-02*