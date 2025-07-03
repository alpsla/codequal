# DigitalOcean Deployment Checklist
*Date: June 30, 2025*

## 🚀 Current Status: 70% Ready

### ✅ What We Have:
- Docker configurations
- Basic Kubernetes manifests
- Database migrations ready
- CI/CD pipeline structure
- Deployment scripts

### ❌ Critical Gaps:
1. No DigitalOcean cluster/resources
2. No production secrets
3. No SSL/domain setup
4. No monitoring deployed
5. No production database

## 📋 Day 1-2: Infrastructure Setup

### Step 1: Create DigitalOcean Resources
```bash
# 1. Install doctl CLI
brew install doctl
doctl auth init

# 2. Create Kubernetes cluster (start small)
doctl kubernetes cluster create codequal-prod \
  --region nyc1 \
  --size s-2vcpu-4gb \
  --count 2 \
  --tag production

# 3. Create Container Registry
doctl registry create codequal

# 4. Create Managed Database
doctl databases create codequal-db \
  --engine pg \
  --region nyc1 \
  --size db-s-1vcpu-2gb \
  --version 14

# 5. Create Spaces for storage
doctl spaces create codequal-storage --region nyc3
```

### Step 2: Connect to Resources
```bash
# Connect to K8s cluster
doctl kubernetes cluster kubeconfig save codequal-prod

# Login to container registry
doctl registry login

# Get database connection string
doctl databases connection codequal-db
```

## 📋 Day 3-4: Prepare Deployment Files

### Step 3: Create Production Namespace
```yaml
# kubernetes/production/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: codequal-prod
```

### Step 4: Create Secrets Template
```yaml
# kubernetes/production/secrets-template.yaml
apiVersion: v1
kind: Secret
metadata:
  name: codequal-secrets
  namespace: codequal-prod
type: Opaque
stringData:
  DATABASE_URL: "postgresql://..."
  SUPABASE_URL: "https://..."
  SUPABASE_SERVICE_KEY: "..."
  OPENAI_API_KEY: "..."
  GITHUB_APP_ID: "..."
  GITHUB_PRIVATE_KEY: |
    -----BEGIN RSA PRIVATE KEY-----
    ...
    -----END RSA PRIVATE KEY-----
```

### Step 5: Update Deployment Manifests
```yaml
# kubernetes/production/api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: codequal-api
  namespace: codequal-prod
spec:
  replicas: 2
  selector:
    matchLabels:
      app: codequal-api
  template:
    metadata:
      labels:
        app: codequal-api
    spec:
      containers:
      - name: api
        image: registry.digitalocean.com/codequal/api:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3000"
        envFrom:
        - secretRef:
            name: codequal-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: codequal-api
  namespace: codequal-prod
spec:
  selector:
    app: codequal-api
  ports:
  - port: 80
    targetPort: 3000
  type: ClusterIP
```

## 📋 Day 5: Deploy Core Services

### Step 6: Build and Push Images
```bash
# Build images
docker build -t registry.digitalocean.com/codequal/api:latest ./apps/api

# Push to registry
docker push registry.digitalocean.com/codequal/api:latest
```

### Step 7: Deploy to Kubernetes
```bash
# Create namespace
kubectl apply -f kubernetes/production/namespace.yaml

# Create secrets (after filling in values)
kubectl apply -f kubernetes/production/secrets.yaml

# Deploy API
kubectl apply -f kubernetes/production/api-deployment.yaml

# Check deployment
kubectl get pods -n codequal-prod
kubectl logs -n codequal-prod -l app=codequal-api
```

## 📋 Day 6-7: SSL & Domain Setup

### Step 8: Install Ingress Controller
```bash
# Install nginx ingress
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/do/deploy.yaml

# Wait for load balancer
kubectl get svc -n ingress-nginx
```

### Step 9: Install Cert Manager
```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.12.0/cert-manager.yaml

# Create Let's Encrypt issuer
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

### Step 10: Create Ingress
```yaml
# kubernetes/production/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: codequal-ingress
  namespace: codequal-prod
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
spec:
  tls:
  - hosts:
    - api.codequal.com
    secretName: codequal-tls
  rules:
  - host: api.codequal.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: codequal-api
            port:
              number: 80
```

## 🔍 Quick Start Commands

```bash
# 1. Setup (run once)
doctl auth init
doctl kubernetes cluster create codequal-prod --size s-2vcpu-4gb --count 2
doctl registry create codequal
doctl databases create codequal-db --engine pg --size db-s-1vcpu-2gb

# 2. Connect
doctl kubernetes cluster kubeconfig save codequal-prod
doctl registry login

# 3. Deploy
docker build -t registry.digitalocean.com/codequal/api:latest ./apps/api
docker push registry.digitalocean.com/codequal/api:latest
kubectl apply -f kubernetes/production/

# 4. Check status
kubectl get pods -n codequal-prod
kubectl get ingress -n codequal-prod
kubectl logs -n codequal-prod -l app=codequal-api
```

## 🚨 Before You Start

1. **Create DigitalOcean Account** with billing
2. **Get API Token** from DigitalOcean
3. **Register Domain** and point to DigitalOcean
4. **Prepare Secrets** (all API keys ready)
5. **Test Locally** with docker-compose

## 💰 Estimated Costs

- Kubernetes (2 small nodes): $40/month
- Database (small): $15/month  
- Container Registry: $5/month
- Load Balancer: $12/month
- **Total: ~$72/month** (minimal setup)

Ready to start deployment?