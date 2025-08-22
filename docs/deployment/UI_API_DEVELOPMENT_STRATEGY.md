# UI/API Development Strategy: Local vs Cloud

## Overview
This document analyzes the most cost-efficient approach for developing the CodeQual UI/API service, comparing local development versus direct cloud development.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   CodeQual Full Stack                     │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐     ┌──────────────┐                 │
│  │   Next.js    │────▶│   API        │                 │
│  │   UI/UX      │     │   Service    │                 │
│  │  (Port 3000) │     │  (Port 3001) │                 │
│  └──────────────┘     └──────┬───────┘                 │
│                               │                          │
│                               ▼                          │
│                    ┌──────────────────┐                 │
│                    │  Iterative       │                 │
│                    │  Analyzer        │                 │
│                    │  (Port 3002)     │                 │
│                    └──────────────────┘                 │
│                               │                          │
│                               ▼                          │
│                    ┌──────────────────┐                 │
│                    │   DeepWiki       │                 │
│                    │   (Port 8001)    │                 │
│                    └──────────────────┘                 │
└─────────────────────────────────────────────────────────┘
```

## Option 1: Local Development First

### Setup
```bash
# Local development structure
/codequal
  /apps
    /web          # Next.js UI (npm run dev - port 3000)
    /api          # Express API (npm run dev - port 3001)
  /packages
    /agents       # Analyzer service (port 3002)
```

### Development Flow
```typescript
// apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001

// apps/api/.env.local
ANALYZER_URL=http://localhost:3002
DEEPWIKI_URL=http://localhost:8001  # via kubectl port-forward
REDIS_URL=redis://localhost:6379
```

### Costs
- **Development**: $0 (your machine)
- **Testing**: $0 (local)
- **DeepWiki access**: $0 (port-forward)
- **Total Monthly**: $0

### Pros ✅
- Zero cloud costs during development
- Fast iteration (no deploy cycle)
- Full debugger access
- No internet dependency
- Complete control

### Cons ❌
- Need to mock some cloud services
- Different from production
- Can't share with team easily
- "Works on my machine" risk

## Option 2: Direct Cloud Development

### Setup
```yaml
# Development pod in Kubernetes
apiVersion: apps/v1
kind: Deployment
metadata:
  name: codequal-dev-stack
spec:
  template:
    spec:
      containers:
      - name: ui
        image: node:18
        command: ["npm", "run", "dev"]
        ports: [3000]
      - name: api
        image: node:18
        command: ["npm", "run", "dev"]
        ports: [3001]
      - name: analyzer
        image: node:18
        ports: [3002]
```

### Development Flow
```bash
# Sync local code to pod
kubectl cp ./apps codequal-dev-stack:/app/apps
# or use Skaffold/Tilt for auto-sync
```

### Costs
- **Dev Pod**: ~$20/month (1 vCPU, 2GB RAM)
- **Load Balancer**: $10/month
- **Storage**: $1/month
- **Total Monthly**: ~$31/month

### Pros ✅
- Production-like environment
- Team can access
- Real services available
- No local setup needed

### Cons ❌
- Costs money immediately
- Slower iteration
- Complex debugging
- Network latency

## Option 3: Hybrid Approach (RECOMMENDED) 💡

### Phase 1: Local UI/API Development (Weeks 1-4)
```bash
# Develop locally with remote services
LOCAL:
  - Next.js UI (hot reload)
  - API Service (hot reload)
  
REMOTE (via port-forward):
  - Analyzer (already working)
  - DeepWiki (existing)
  - Redis (port-forward)
  - Supabase (cloud)
```

**Cost**: $0/month

### Phase 2: Cloud Dev Environment (Weeks 5-8)
```bash
# Deploy dev stack to cloud for team testing
kubectl apply -f dev-environment.yaml

# But continue local development with:
skaffold dev  # Auto-sync local changes to cloud
```

**Cost**: ~$31/month

### Phase 3: Production Deployment (Week 9+)
```bash
# Full production deployment
- Separate pods for each service
- Auto-scaling
- Load balancers
- CDN for UI
```

**Cost**: ~$100-200/month (with traffic)

## Recommended Tech Stack

### Frontend (Next.js 14)
```typescript
// apps/web/app/page.tsx
export default function Dashboard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <PRAnalysisCard />
      <QualityMetrics />
      <TeamLeaderboard />
    </div>
  );
}

// Development: npm run dev (instant hot reload)
// Production: Vercel or Kubernetes
```

### API Service (Express/Fastify)
```typescript
// apps/api/src/server.ts
import { FastifyInstance } from 'fastify';

export async function createServer() {
  const app = fastify();
  
  // Routes
  app.post('/api/analysis/start', startAnalysis);
  app.get('/api/analysis/:id', getAnalysis);
  app.get('/api/metrics/team/:id', getTeamMetrics);
  
  // WebSocket for real-time updates
  app.register(require('@fastify/websocket'));
  
  return app;
}
```

### Development Environment Setup

```yaml
# docker-compose.dev.yml (for local development)
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
  
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: codequal_dev
      POSTGRES_PASSWORD: dev
    ports:
      - "5432:5432"
  
  # UI and API run via npm run dev
```

## Cost-Efficient Development Workflow

### 1. Start Local (Month 1) - $0
```bash
# Initial development
git clone codequal
cd codequal
npm install
npm run dev:all  # Starts UI, API, uses port-forward for services

# What you build:
- Authentication flow
- Dashboard UI
- API endpoints
- WebSocket connections
- Basic features
```

### 2. Cloud Dev Pod (Month 2) - $31
```bash
# Deploy development environment
./deploy-dev-environment.sh

# Features to add:
- Real-time analysis
- Team collaboration
- Production-like testing
- Performance monitoring
```

### 3. Staged Rollout (Month 3) - $50-100
```bash
# Progressive deployment
- Deploy API to cloud
- Keep UI local (or Vercel free tier)
- Use cloud services
- Add monitoring
```

## Money-Saving Tips 💰

### 1. Use Free Tiers
```yaml
Frontend:
  - Vercel: Free for personal projects
  - Netlify: 100GB bandwidth free
  
Database:
  - Supabase: Free tier (500MB)
  - PlanetScale: Free tier (5GB)
  
Monitoring:
  - Grafana Cloud: Free tier
  - Sentry: Free tier (5K errors)
```

### 2. Development Tools
```bash
# Local development with cloud services
- Ngrok: Expose local API ($0-8/month)
- LocalTunnel: Free alternative
- Tailscale: Private network (free)
```

### 3. Spot Instances for Dev
```yaml
# Use spot instances for dev pods (70% cheaper)
apiVersion: v1
kind: Node
spec:
  providerID: do://spot-instance
  labels:
    node-type: spot
    workload: development
```

## Implementation Plan

### Week 1-2: Local Setup
```bash
# Create Next.js app
npx create-next-app@latest apps/web --typescript --tailwind --app

# Create API service  
mkdir apps/api
cd apps/api
npm init -y
npm install fastify @fastify/cors @fastify/websocket
```

### Week 3-4: Connect Services
```typescript
// apps/web/lib/api.ts
export async function startAnalysis(repoUrl: string, prNumber: number) {
  const response = await fetch(`${API_URL}/analysis/start`, {
    method: 'POST',
    body: JSON.stringify({ repoUrl, prNumber })
  });
  return response.json();
}

// apps/api/src/routes/analysis.ts
export async function startAnalysis(req: FastifyRequest) {
  // Call analyzer service
  const result = await analyzerClient.analyze({
    repoUrl: req.body.repoUrl,
    prNumber: req.body.prNumber
  });
  
  // Store in database
  await db.analysis.create({ data: result });
  
  // Send WebSocket update
  ws.send({ event: 'analysis.started', data: result });
  
  return { id: result.id, status: 'processing' };
}
```

### Week 5-6: Add UI Components
```typescript
// apps/web/components/AnalysisResults.tsx
export function AnalysisResults({ analysisId }: Props) {
  const { data, isLoading } = useAnalysis(analysisId);
  
  if (isLoading) return <AnalysisSkeleton />;
  
  return (
    <div className="grid gap-4">
      <MetricsCards metrics={data.metrics} />
      <IssuesTable issues={data.issues} />
      <CodeSnippets snippets={data.snippets} />
    </div>
  );
}
```

### Week 7-8: Deploy to Cloud
```bash
# Build images
docker build -t codequal/web:latest apps/web
docker build -t codequal/api:latest apps/api

# Deploy to Kubernetes
kubectl apply -f k8s/dev-environment.yaml

# Setup ingress
kubectl apply -f k8s/ingress.yaml
```

## Architecture Decision

### Recommended: Start Local, Deploy Incrementally

**Why?**
1. **Cost**: $0 for first month vs $31/month immediate
2. **Speed**: Local hot reload is instant
3. **Learning**: Understand requirements before cloud complexity
4. **Flexibility**: Easy to change architecture

**Monthly Cost Progression:**
- Month 1: $0 (local dev)
- Month 2: $31 (dev pod)
- Month 3: $50 (staging)
- Month 4: $100-200 (production)

## Quick Start Commands

```bash
# 1. Setup monorepo structure
mkdir -p apps/{web,api}
mkdir -p packages/shared

# 2. Initialize Next.js UI
npx create-next-app@latest apps/web \
  --typescript --tailwind --app \
  --eslint --src-dir

# 3. Initialize API
cd apps/api
npm init -y
npm install fastify tsx nodemon
npm install -D @types/node typescript

# 4. Setup development scripts
cat > package.json << 'EOF'
{
  "scripts": {
    "dev": "turbo run dev",
    "dev:web": "cd apps/web && npm run dev",
    "dev:api": "cd apps/api && npm run dev",
    "dev:all": "concurrently \"npm run dev:web\" \"npm run dev:api\""
  }
}
EOF

# 5. Start development
npm run dev:all
```

## Environment Organization Strategy

### Overview of Environments

```
┌─────────────────────────────────────────────────────────────────┐
│                     Environment Pipeline                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  LOCAL              DEV                STAGING          PROD     │
│   ↓                 ↓                    ↓               ↓       │
│  [Your Mac]  →  [K8s Namespace]  →  [K8s Namespace] → [K8s Namespace]
│                  codequal-dev        codequal-stage    codequal-prod
│                                                                   │
│  Feature      Integration          Pre-Production    Production  │
│  Development  Testing              Validation        Live Users  │
└─────────────────────────────────────────────────────────────────┘
```

## 1. Local Environment (Development)

### Purpose
- Feature development
- Quick iteration
- Debugging

### Setup
```bash
# Directory Structure
/codequal
├── .env.local                 # Local environment variables
├── docker-compose.yml         # Local services (Redis, Postgres)
├── apps/
│   ├── web/                  # Next.js UI
│   │   ├── .env.local        # UI environment
│   │   └── package.json
│   └── api/                  # API Service
│       ├── .env.local        # API environment
│       └── package.json
└── packages/
    └── agents/               # Analyzer service
        └── .env.local        # Analyzer environment
```

### Configuration Files

```bash
# .env.local (root)
ENVIRONMENT=local
NODE_ENV=development

# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_ENVIRONMENT=local
NEXT_PUBLIC_FEATURES_FLAGS=debug,dev-tools

# apps/api/.env.local  
PORT=3001
ANALYZER_URL=http://localhost:3002
DEEPWIKI_URL=http://localhost:8001  # via port-forward
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://dev:dev@localhost:5432/codequal_local
LOG_LEVEL=debug

# docker-compose.yml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: codequal_local
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
    ports: ["5432:5432"]
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
```

### Start Local Development
```bash
# Terminal 1: Start local services
docker-compose up -d

# Terminal 2: Port-forward to K8s services (if needed)
kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001

# Terminal 3: Start UI
cd apps/web && npm run dev

# Terminal 4: Start API
cd apps/api && npm run dev

# Terminal 5: Start Analyzer (if developing it)
cd packages/agents && npm run dev
```

## 2. Development Environment (Kubernetes)

### Purpose
- Integration testing
- Team collaboration
- Feature validation

### Namespace Setup
```yaml
# k8s/namespaces/dev-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: codequal-dev
  labels:
    environment: development
    team: engineering
```

### Configuration
```yaml
# k8s/environments/dev/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: codequal-dev
data:
  ENVIRONMENT: "development"
  NODE_ENV: "development"
  API_URL: "http://api-service:3001"
  ANALYZER_URL: "http://analyzer-service:3002"
  DEEPWIKI_URL: "http://deepwiki:8001"
  REDIS_URL: "redis://redis-dev:6379"
  LOG_LEVEL: "debug"
  ENABLE_DEBUG: "true"
  FEATURE_FLAGS: "experimental,debug-mode"

---
# k8s/environments/dev/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: codequal-dev
type: Opaque
stringData:
  DATABASE_URL: "postgresql://dev:devpass@postgres-dev:5432/codequal_dev"
  OPENROUTER_API_KEY: "sk-or-v1-dev-key"
  SUPABASE_URL: "https://dev.supabase.co"
  SUPABASE_KEY: "dev-service-role-key"
```

### Deployment
```yaml
# k8s/environments/dev/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: codequal-stack
  namespace: codequal-dev
spec:
  replicas: 1
  selector:
    matchLabels:
      app: codequal
      environment: dev
  template:
    metadata:
      labels:
        app: codequal
        environment: dev
    spec:
      containers:
      # UI Container
      - name: web
        image: codequal/web:dev
        imagePullPolicy: Always  # Always pull in dev
        ports: [3000]
        env:
        - name: NODE_ENV
          value: "development"
        envFrom:
        - configMapRef:
            name: app-config
            
      # API Container
      - name: api
        image: codequal/api:dev
        imagePullPolicy: Always
        ports: [3001]
        envFrom:
        - configMapRef:
            name: app-config
        - secretRef:
            name: app-secrets
            
      # Analyzer Container
      - name: analyzer
        image: codequal/analyzer:dev
        imagePullPolicy: Always
        ports: [3002]
        envFrom:
        - configMapRef:
            name: app-config
        - secretRef:
            name: app-secrets
        volumeMounts:
        - name: cache
          mountPath: /cache
          
      volumes:
      - name: cache
        emptyDir:
          sizeLimit: 5Gi
```

### Access Development Environment
```bash
# Port-forward for development access
kubectl port-forward -n codequal-dev deployment/codequal-stack 3000:3000 3001:3001 3002:3002

# Or use Ingress
kubectl apply -f k8s/environments/dev/ingress.yaml

# Access at: https://dev.codequal.yourdomain.com
```

## 3. Staging Environment (Pre-Production)

### Purpose
- Production validation
- Performance testing
- User acceptance testing

### Configuration Differences
```yaml
# k8s/environments/staging/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: codequal-stage
data:
  ENVIRONMENT: "staging"
  NODE_ENV: "production"  # Use production builds
  API_URL: "https://api-stage.codequal.com"
  LOG_LEVEL: "info"
  ENABLE_DEBUG: "false"
  FEATURE_FLAGS: "beta-features"
  CACHE_TTL: "3600"
  MAX_ITERATIONS: "7"  # Less than dev for faster testing

---
# k8s/environments/staging/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: codequal-stack
  namespace: codequal-stage
spec:
  replicas: 2  # Multiple replicas for testing
  template:
    spec:
      containers:
      - name: web
        image: codequal/web:staging
        imagePullPolicy: IfNotPresent  # Cache images
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

## 4. Production Environment

### Purpose
- Live user traffic
- High availability
- Performance optimized

### Configuration
```yaml
# k8s/environments/prod/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: codequal-prod
data:
  ENVIRONMENT: "production"
  NODE_ENV: "production"
  API_URL: "https://api.codequal.com"
  LOG_LEVEL: "error"
  ENABLE_DEBUG: "false"
  FEATURE_FLAGS: ""
  CACHE_TTL: "7200"
  MAX_ITERATIONS: "10"
  MIN_ITERATIONS: "3"

---
# k8s/environments/prod/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: codequal-web
  namespace: codequal-prod
spec:
  replicas: 3  # High availability
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0  # Zero downtime
  template:
    spec:
      containers:
      - name: web
        image: codequal/web:v1.0.0  # Tagged versions only
        imagePullPolicy: IfNotPresent
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          periodSeconds: 10
      
      # Anti-affinity for distribution
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchLabels:
                app: codequal-web
            topologyKey: kubernetes.io/hostname

---
# Separate deployments for each service in production
apiVersion: apps/v1
kind: Deployment
metadata:
  name: codequal-api
  namespace: codequal-prod
spec:
  replicas: 3
  # ... similar configuration

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: codequal-analyzer
  namespace: codequal-prod
spec:
  replicas: 5  # More analyzers for parallel processing
  # ... similar configuration
```

## Environment Management Tools

### 1. Kustomize for Environment Management
```yaml
# k8s/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - deployment.yaml
  - service.yaml
  - configmap.yaml

# k8s/overlays/dev/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: codequal-dev
namePrefix: dev-

bases:
  - ../../base

patchesStrategicMerge:
  - deployment-patch.yaml

configMapGenerator:
  - name: app-config
    literals:
      - ENVIRONMENT=development
      - LOG_LEVEL=debug

# k8s/overlays/prod/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: codequal-prod
namePrefix: prod-

bases:
  - ../../base

patchesStrategicMerge:
  - deployment-patch.yaml

configMapGenerator:
  - name: app-config
    literals:
      - ENVIRONMENT=production
      - LOG_LEVEL=error

replicas:
  - name: codequal-web
    count: 3
  - name: codequal-api
    count: 3
```

### 2. Helm Charts Alternative
```yaml
# helm/codequal/values.yaml (default/dev)
environment: development
replicaCount: 1
image:
  tag: dev
  pullPolicy: Always
resources:
  limits:
    cpu: 500m
    memory: 512Mi
ingress:
  enabled: true
  host: dev.codequal.com

# helm/codequal/values-staging.yaml
environment: staging
replicaCount: 2
image:
  tag: staging
  pullPolicy: IfNotPresent
resources:
  limits:
    cpu: 1000m
    memory: 1Gi
ingress:
  enabled: true
  host: staging.codequal.com

# helm/codequal/values-prod.yaml
environment: production
replicaCount: 3
image:
  tag: v1.0.0
  pullPolicy: IfNotPresent
resources:
  limits:
    cpu: 2000m
    memory: 2Gi
ingress:
  enabled: true
  host: codequal.com
autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
```

### Deploy with Helm
```bash
# Deploy to dev
helm install codequal ./helm/codequal -n codequal-dev

# Deploy to staging
helm install codequal ./helm/codequal -n codequal-stage -f helm/codequal/values-staging.yaml

# Deploy to production
helm install codequal ./helm/codequal -n codequal-prod -f helm/codequal/values-prod.yaml
```

## CI/CD Pipeline

### GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm test

  deploy-dev:
    needs: test
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build and Push
        run: |
          docker build -t codequal/web:dev apps/web
          docker build -t codequal/api:dev apps/api
          docker push codequal/web:dev
          docker push codequal/api:dev
      
      - name: Deploy to Dev
        run: |
          kubectl apply -k k8s/overlays/dev
          kubectl rollout status deployment/codequal-stack -n codequal-dev

  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Build and Push
        run: |
          docker build -t codequal/web:staging apps/web
          docker push codequal/web:staging
      
      - name: Deploy to Staging
        run: |
          kubectl apply -k k8s/overlays/staging
          kubectl rollout status deployment/codequal-stack -n codequal-stage

  deploy-prod:
    needs: deploy-staging
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production  # Requires manual approval
    steps:
      - name: Tag Release
        run: |
          VERSION=$(git describe --tags --abbrev=0)
          docker tag codequal/web:staging codequal/web:$VERSION
          docker push codequal/web:$VERSION
      
      - name: Deploy to Production
        run: |
          helm upgrade codequal ./helm/codequal \
            -n codequal-prod \
            -f helm/codequal/values-prod.yaml \
            --set image.tag=$VERSION
```

## Environment Promotion Strategy

```
Feature Branch → Dev → Staging → Production

1. Feature Development (Local)
   ↓ (Pull Request)
2. Integration Testing (Dev)
   ↓ (Merge to main)
3. UAT Testing (Staging)
   ↓ (Manual Approval)
4. Production Release (Prod)
```

### Promotion Scripts
```bash
# scripts/promote.sh
#!/bin/bash

case $1 in
  dev-to-staging)
    echo "Promoting dev to staging..."
    docker pull codequal/web:dev
    docker tag codequal/web:dev codequal/web:staging
    docker push codequal/web:staging
    kubectl set image deployment/codequal-web web=codequal/web:staging -n codequal-stage
    ;;
    
  staging-to-prod)
    echo "Promoting staging to production..."
    VERSION=${2:-$(date +%Y%m%d-%H%M%S)}
    docker pull codequal/web:staging
    docker tag codequal/web:staging codequal/web:v$VERSION
    docker push codequal/web:v$VERSION
    
    helm upgrade codequal ./helm/codequal \
      -n codequal-prod \
      -f helm/codequal/values-prod.yaml \
      --set image.tag=v$VERSION
    ;;
esac
```

## Monitoring Across Environments

### Environment-Specific Dashboards
```yaml
# k8s/monitoring/grafana-dashboards.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboards
data:
  dev-dashboard.json: |
    {
      "title": "CodeQual Dev Environment",
      "panels": [
        {"title": "Error Rate", "threshold": 10},
        {"title": "Response Time", "threshold": 1000},
        {"title": "Memory Usage", "threshold": 80}
      ]
    }
  
  prod-dashboard.json: |
    {
      "title": "CodeQual Production",
      "panels": [
        {"title": "Error Rate", "threshold": 1},
        {"title": "Response Time", "threshold": 200},
        {"title": "Memory Usage", "threshold": 70}
      ]
    }
```

## Quick Reference Commands

```bash
# Local Development
npm run dev:local           # Start everything locally
npm run test:local          # Run tests locally

# Development Environment
kubectl config use-context do-sfo3-codequal
kubectl -n codequal-dev get pods
kubectl -n codequal-dev logs -f deployment/codequal-stack

# Staging Environment  
kubectl -n codequal-stage get pods
kubectl -n codequal-stage describe deployment codequal-web

# Production Environment
kubectl -n codequal-prod get pods
kubectl -n codequal-prod top pods

# Promotion
./scripts/promote.sh dev-to-staging
./scripts/promote.sh staging-to-prod v1.2.0

# Rollback
kubectl rollout undo deployment/codequal-web -n codequal-prod
helm rollback codequal -n codequal-prod
```

## Environment Variables Summary

| Variable | Local | Dev | Staging | Production |
|----------|-------|-----|---------|------------|
| NODE_ENV | development | development | production | production |
| LOG_LEVEL | debug | debug | info | error |
| REPLICAS | 1 | 1 | 2 | 3-10 |
| CACHE_TTL | 60 | 300 | 3600 | 7200 |
| DEBUG | true | true | false | false |
| IMAGE_TAG | latest | dev | staging | vX.Y.Z |
| PULL_POLICY | Always | Always | IfNotPresent | IfNotPresent |

## Conclusion

**Most Cost-Efficient Approach:**
1. Develop UI/API locally (Month 1: $0)
2. Use port-forward for services
3. Deploy to dev pod for testing (Month 2: $31)
4. Gradually move to production (Month 3+: $50-200)

This saves ~$100 in the first 2 months while maintaining development velocity.

**Environment Strategy:**
- **Local**: Fast iteration, zero cost
- **Dev**: Integration testing, team collaboration
- **Staging**: Production validation
- **Production**: Live traffic, high availability

Each environment serves a specific purpose in the development lifecycle, with appropriate resource allocation and configuration for its role.

---

**Document Version**: 1.1  
**Created**: August 22, 2025  
**Updated**: August 22, 2025  
**Author**: CodeQual Team