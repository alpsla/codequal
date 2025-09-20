# Google Cloud (GKE) Fallback Migration Guide

## 🚀 Quick Setup if Oracle Doesn't Work Out

This guide provides a rapid migration path to Google Cloud if Oracle Cloud validation fails.

## ⏱️ Time to Deploy: 2-3 Hours

## 📋 Prerequisites
```bash
# Install Google Cloud CLI
brew install google-cloud-sdk  # macOS

# Authenticate
gcloud auth login
gcloud config set project codequal-v9

# Enable required APIs
gcloud services enable container.googleapis.com
gcloud services enable file.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

## 🎯 Step 1: Create GKE Autopilot Cluster (30 min)
```bash
# Create Autopilot cluster (fully managed, cost-optimized)
gcloud container clusters create-auto codequal-v9 \
  --region=us-central1 \
  --release-channel=stable \
  --network=default

# Get credentials
gcloud container clusters get-credentials codequal-v9 \
  --region=us-central1

# Verify
kubectl get nodes
```

## 💾 Step 2: Set up Filestore for RWX (20 min)
```bash
# Create Filestore instance
gcloud filestore instances create codequal-fs \
  --tier=BASIC_HDD \
  --file-share=name=codequal_share,capacity=100GB \
  --network=name=default \
  --zone=us-central1-a

# Get Filestore IP
FILESTORE_IP=$(gcloud filestore instances describe codequal-fs \
  --zone=us-central1-a \
  --format="value(networks[0].ipAddresses[0])")

echo "Filestore IP: $FILESTORE_IP"
```

## 📦 Step 3: Create RWX StorageClass (10 min)
```yaml
# gke-filestore-sc.yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: codequal-filestore-pv
spec:
  capacity:
    storage: 100Gi
  accessModes:
    - ReadWriteMany
  nfs:
    path: /codequal_share
    server: <FILESTORE_IP>  # Replace with actual IP
  persistentVolumeReclaimPolicy: Retain
  storageClassName: filestore-rwx

---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: filestore-rwx
provisioner: kubernetes.io/no-provisioner
volumeBindingMode: Immediate

---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: codequal-rwx-claim
  namespace: codequal-dev
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: filestore-rwx
  resources:
    requests:
      storage: 100Gi
```

Apply:
```bash
kubectl create namespace codequal-dev
kubectl apply -f gke-filestore-sc.yaml
```

## 🐳 Step 4: Artifact Registry Setup (15 min)
```bash
# Create Artifact Registry repository
gcloud artifacts repositories create codequal-v9 \
  --repository-format=docker \
  --location=us-central1

# Configure Docker
gcloud auth configure-docker us-central1-docker.pkg.dev

# Tag and push images
docker tag registry.digitalocean.com/codequal/analyzer:lang-java-v5.1 \
  us-central1-docker.pkg.dev/codequal-v9/codequal-v9/analyzer:lang-java-v5.1

docker push us-central1-docker.pkg.dev/codequal-v9/codequal-v9/analyzer:lang-java-v5.1
```

## 🔧 Step 5: Update V9 Configuration (10 min)
```typescript
// kubernetes-repository-manager.ts
const GKE_CONFIG = {
  storageClass: 'filestore-rwx',
  registry: 'us-central1-docker.pkg.dev/codequal-v9/codequal-v9',
  namespace: 'codequal-dev',
  pvcName: 'codequal-rwx-claim'
};
```

## ✅ Step 6: Quick Validation Test (30 min)
```bash
# Run parallel pod test
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: test-parallel-1
  namespace: codequal-dev
spec:
  containers:
  - name: test
    image: busybox
    command: ['sh', '-c', 'echo "Pod 1 writing" > /data/test1.txt; sleep 300']
    volumeMounts:
    - name: shared
      mountPath: /data
  volumes:
  - name: shared
    persistentVolumeClaim:
      claimName: codequal-rwx-claim
---
apiVersion: v1
kind: Pod
metadata:
  name: test-parallel-2
  namespace: codequal-dev
spec:
  containers:
  - name: test
    image: busybox
    command: ['sh', '-c', 'sleep 5; cat /data/test1.txt; echo "Pod 2 writing" > /data/test2.txt; sleep 300']
    volumeMounts:
    - name: shared
      mountPath: /data
  volumes:
  - name: shared
    persistentVolumeClaim:
      claimName: codequal-rwx-claim
EOF

# Check both pods can access same storage
kubectl exec -n codequal-dev test-parallel-2 -- ls -la /data/
```

## 🚀 Step 7: Deploy V9 Framework (20 min)
```bash
# Deploy secrets
kubectl create secret generic codequal-secrets \
  --from-literal=SUPABASE_URL=$SUPABASE_URL \
  --from-literal=SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY \
  --from-literal=OPENROUTER_API_KEY=$OPENROUTER_API_KEY \
  -n codequal-dev

# Run V9 test
cd packages/agents/src/two-branch/tests
USE_GKE=true node test-v9-kubernetes-real.js
```

## 💰 Cost Breakdown
```
GKE Autopilot: ~$75/mo (pay per pod)
Filestore Basic: $0.35/GB/mo = $35/mo for 100GB
Artifact Registry: ~$10/mo
Network Egress: ~$10/mo
Total: ~$130/mo
```

## 🎯 Performance Expectations
```
Repository clone: ~40s (faster networking)
Tool execution: ~170s (better compute)
Copy overhead: 0s (native RWX)
Total: ~210s (75s faster than DO with workaround!)
```

## ⚡ Rapid Deployment Script
```bash
#!/bin/bash
# gke-quick-deploy.sh

# Set project
gcloud config set project codequal-v9

# Create cluster
gcloud container clusters create-auto codequal-v9 --region=us-central1

# Create Filestore
gcloud filestore instances create codequal-fs \
  --tier=BASIC_HDD \
  --file-share=name=codequal_share,capacity=100GB \
  --network=name=default \
  --zone=us-central1-a

# Get credentials
gcloud container clusters get-credentials codequal-v9 --region=us-central1

# Create namespace
kubectl create namespace codequal-dev

# Deploy storage
kubectl apply -f gke-filestore-sc.yaml

echo "✅ GKE cluster ready for V9 deployment!"
```

## 🔍 Monitoring
```bash
# Check cluster
kubectl get nodes
kubectl top nodes

# Check storage
kubectl get pv,pvc -n codequal-dev

# Check costs
gcloud billing accounts list
gcloud billing budgets list
```

## 📞 Support
- GKE Documentation: https://cloud.google.com/kubernetes-engine/docs
- Filestore Guide: https://cloud.google.com/filestore/docs
- Support: Available with any paid account

---

*This fallback plan ensures you can migrate to a proven solution quickly if Oracle doesn't meet requirements.*