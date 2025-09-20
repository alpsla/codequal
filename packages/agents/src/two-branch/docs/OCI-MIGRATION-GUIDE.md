# Oracle Cloud Infrastructure (OCI) Migration Guide for CodeQual V9

## 🎯 Objective
Migrate from DigitalOcean to Oracle Cloud to gain native RWX support for parallel tool execution.

## 📋 Pre-Migration Checklist

- [ ] Oracle Cloud account created with free tier
- [ ] OCI CLI installed locally
- [ ] kubectl configured for OCI access
- [ ] Docker images ready for migration
- [ ] Current DO configuration documented

## 🚀 Phase 1: OCI Account Setup (Day 1)

### 1.1 Create Oracle Cloud Account
```bash
# Navigate to: https://cloud.oracle.com/free
# Sign up for free tier ($300 credits + Always Free resources)
# Select home region (cannot be changed later)
# Recommended: US regions for better availability
```

### 1.2 Set up OCI CLI
```bash
# Install OCI CLI
brew install oci-cli  # macOS
# or
curl -L https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh | bash

# Configure CLI
oci setup config
# Follow prompts to set up API keys
```

### 1.3 Create Compartment for CodeQual
```bash
# Create compartment for organization
oci iam compartment create \
  --name "codequal-prod" \
  --description "CodeQual V9 Infrastructure" \
  --compartment-id <root-compartment-id>
```

## 🎨 Phase 2: OKE Cluster Setup (Day 1-2)

### 2.1 Create OKE Cluster (Quick Create)
```bash
# Use OCI Console for Quick Create (easier)
# Navigate to: Developer Services > Kubernetes Clusters (OKE)
# Click "Create Cluster" > "Quick Create"

# Configuration:
# - Name: codequal-v9-cluster
# - Kubernetes Version: Latest stable (1.28+)
# - Shape: VM.Standard.A1.Flex (ARM - Free Tier)
# - Node Count: 2 nodes
# - Node Memory: 12GB each
# - Node OCPUs: 2 each
```

### 2.2 Configure kubectl
```bash
# Download kubeconfig
oci ce cluster create-kubeconfig \
  --cluster-id <cluster-ocid> \
  --file $HOME/.kube/config-oci \
  --region <region>

# Set context
export KUBECONFIG=$HOME/.kube/config-oci
kubectl config use-context <cluster-context>

# Verify connection
kubectl get nodes
```

## 💾 Phase 3: File Storage Service Setup (Day 2)

### 3.1 Create File Storage Service
```bash
# Via OCI Console:
# Storage > File Storage > File Systems
# Create File System:
# - Name: codequal-v9-storage
# - Availability Domain: AD-1 (same as nodes)

# Create Mount Target:
# - Name: codequal-v9-mount
# - Subnet: Node subnet
# - Maximum Free: 100GB (trial credits)
```

### 3.2 Create StorageClass for RWX
```yaml
# oci-fss-storageclass.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: oci-fss-rwx
provisioner: oracle.com/oci-fss
parameters:
  availabilityDomain: <your-ad>
  mountTargetOcid: <mount-target-ocid>
  exportPath: /codequal-v9
reclaimPolicy: Retain
volumeBindingMode: Immediate
```

### 3.3 Test RWX Access
```yaml
# test-rwx-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-rwx-claim
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: oci-fss-rwx
  resources:
    requests:
      storage: 10Gi

---
# Deploy 2 test pods to verify RWX
apiVersion: v1
kind: Pod
metadata:
  name: test-writer
spec:
  containers:
  - name: writer
    image: busybox
    command: ['sh', '-c', 'echo "RWX works!" > /data/test.txt; sleep 3600']
    volumeMounts:
    - name: shared-data
      mountPath: /data
  volumes:
  - name: shared-data
    persistentVolumeClaim:
      claimName: test-rwx-claim

---
apiVersion: v1
kind: Pod
metadata:
  name: test-reader
spec:
  containers:
  - name: reader
    image: busybox
    command: ['sh', '-c', 'sleep 10; cat /data/test.txt; sleep 3600']
    volumeMounts:
    - name: shared-data
      mountPath: /data
  volumes:
  - name: shared-data
    persistentVolumeClaim:
      claimName: test-rwx-claim
```

## 🐳 Phase 4: Container Registry Migration (Day 2-3)

### 4.1 Set up OCI Container Registry
```bash
# Create repository in OCI Registry
oci artifacts container repository create \
  --display-name codequal-v9 \
  --compartment-id <compartment-id>

# Get registry URL
# Format: <region>.ocir.io/<namespace>/codequal-v9
```

### 4.2 Migrate Docker Images
```bash
# Login to OCI Registry
docker login <region>.ocir.io
# Username: <namespace>/<username>
# Password: Auth token from OCI Console

# Tag and push images
docker tag registry.digitalocean.com/codequal/analyzer:lang-java-v5.1 \
  <region>.ocir.io/<namespace>/codequal-v9/analyzer:lang-java-v5.1

docker push <region>.ocir.io/<namespace>/codequal-v9/analyzer:lang-java-v5.1

# Repeat for all language analyzers
```

## 🧪 Phase 5: V9 Framework Testing (Day 3-4)

### 5.1 Update Kubernetes Configurations
```typescript
// kubernetes-repository-manager.ts
const OCI_CONFIG = {
  storageClass: 'oci-fss-rwx',
  registry: '<region>.ocir.io/<namespace>/codequal-v9',
  namespace: 'codequal-dev'
};
```

### 5.2 Run Parallel Test
```bash
# Deploy V9 test with Apache Kafka
cd packages/agents/src/two-branch/tests
USE_OCI=true node test-v9-kubernetes-real.js

# Monitor performance
kubectl top pods -n codequal-dev
```

### 5.3 Performance Validation Metrics
```
Baseline (DO with EmptyDir workaround):
- Repository clone: ~45s
- Tool execution: ~180s
- Copy overhead: ~60s
- Total: ~285s

Target (OCI with FSS):
- Repository clone: ~45s
- Tool execution: ~180s
- Copy overhead: 0s
- Total: ~225s (60s faster!)
```

## ✅ Phase 6: Validation Checklist (Day 4-5)

### Critical Tests
- [ ] Multiple pods can read/write same PVC simultaneously
- [ ] All 5 analysis tools run in parallel without conflicts
- [ ] Apache Kafka PR #17620 completes successfully
- [ ] Performance is better than DO baseline
- [ ] No unexpected errors in pod logs

### Cost Verification
- [ ] Check OCI Console billing dashboard
- [ ] Verify free tier resources are being used
- [ ] Confirm FSS is only paid component (~$30/mo)
- [ ] Document any unexpected charges

## 🔄 Phase 7: Full Migration (Day 5-7)

### 7.1 Production Deployment
```bash
# Create production namespace
kubectl create namespace codequal-prod

# Deploy all V9 components
kubectl apply -f k8s/oci/production/

# Update environment variables
kubectl create secret generic codequal-secrets \
  --from-literal=SUPABASE_URL=$SUPABASE_URL \
  --from-literal=SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY \
  --from-literal=OPENROUTER_API_KEY=$OPENROUTER_API_KEY \
  -n codequal-prod
```

### 7.2 DNS and API Updates
```bash
# Update API endpoints to point to OCI
# Update CLAUDE.md with new infrastructure details
# Document new deployment process
```

## 🚨 Rollback Plan

If OCI doesn't work out:
```bash
# Keep DO running during test
# If issues arise, simply continue using DO
# No service interruption

# Quick pivot to Google Cloud:
./scripts/deploy-to-gke.sh
```

## 📊 Success Criteria

✅ **GO Decision:**
- RWX works without workarounds
- Performance gain of 60+ seconds
- Cost at or below $30/mo
- Setup completed in <1 week

❌ **NO-GO Decision (Switch to Google):**
- RWX has limitations
- Performance not improved
- Hidden costs discovered
- Setup taking >1 week

## 📞 Support Resources

### Oracle Cloud Support
- Free tier: Community forums
- Paid: 24/7 support (if needed)
- Documentation: https://docs.oracle.com/en-us/iaas/Content/ContEng/home.htm

### Fallback Contacts
- DigitalOcean (keep active during transition)
- Google Cloud (backup plan ready)

## 🎯 Day-by-Day Execution Plan

**Day 1:** Account, OKE cluster, initial setup
**Day 2:** FSS configuration, RWX testing
**Day 3:** Container registry, image migration
**Day 4:** V9 framework test with 2 tools
**Day 5:** Full 5-tool parallel test
**Day 6:** Performance validation, cost check
**Day 7:** GO/NO-GO decision

---

*Note: This guide will be executed after vacation return for uninterrupted focus and immediate issue resolution.*