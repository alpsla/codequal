# CodeQual API Deployment Guide

## Overview

This guide covers deploying the CodeQual API to DigitalOcean Kubernetes using a bundled Docker image approach.

## Prerequisites

1. **Tools Required:**
   - Docker Desktop
   - doctl (DigitalOcean CLI)
   - kubectl
   - Node.js 18+
   - npm

2. **DigitalOcean Resources:**
   - Kubernetes cluster
   - Container registry
   - PostgreSQL database (managed)

## Deployment Steps

### 1. Prepare Environment

```bash
# Install doctl if not already installed
brew install doctl

# Authenticate with DigitalOcean
doctl auth init

# Connect to Kubernetes cluster
doctl kubernetes cluster kubeconfig save codequal-prod

# Login to container registry
doctl registry login
```

### 2. Configure Secrets

1. Copy the secrets template:
   ```bash
   cp kubernetes/production/secrets-template.yaml kubernetes/production/secrets.yaml
   ```

2. Edit `kubernetes/production/secrets.yaml` and replace all `CHANGE_ME` values with actual credentials

3. Apply secrets to Kubernetes:
   ```bash
   kubectl apply -f kubernetes/production/namespace.yaml
   kubectl apply -f kubernetes/production/secrets.yaml
   ```

### 3. Build and Deploy

Option A: Use the deployment script
```bash
chmod +x deploy-api.sh
./deploy-api.sh
```

Option B: Manual deployment
```bash
# Build the project
npm run build

# Build the bundle
cd apps/api
node build-bundle.js

# Build Docker image
docker build -t registry.digitalocean.com/codequal/api:latest -f Dockerfile.bundle .

# Push to registry
docker push registry.digitalocean.com/codequal/api:latest

# Deploy to Kubernetes
cd ../..
kubectl apply -f kubernetes/production/api-deployment.yaml

# Wait for deployment
kubectl rollout status deployment/codequal-api -n codequal-prod
```

### 4. Verify Deployment

```bash
# Check pods status
kubectl get pods -n codequal-prod

# Check logs
kubectl logs -n codequal-prod -l app=codequal-api

# Port forward to test locally
kubectl port-forward -n codequal-prod deployment/codequal-api 3001:3001

# Test health endpoint
curl http://localhost:3001/health
```

### 5. Setup Ingress (Optional)

If you want to expose the API publicly:

```bash
# Apply ingress configuration
kubectl apply -f kubernetes/production/ingress.yaml

# Get load balancer IP
kubectl get svc -n ingress-nginx ingress-nginx-controller
```

## Environment Variables

The API requires the following environment variables (configured via Kubernetes secrets):

- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key
- `OPENROUTER_API_KEY`: OpenRouter API key for AI models
- `GITHUB_PERSONAL_ACCESS_TOKEN`: GitHub access token
- `JWT_SECRET`: Secret for JWT tokens
- `SESSION_SECRET`: Secret for sessions

## Troubleshooting

### Pod Crashes on Startup

1. Check logs:
   ```bash
   kubectl logs -n codequal-prod <pod-name>
   ```

2. Common issues:
   - Missing environment variables
   - Database connection issues
   - Port conflicts

### Build Failures

1. Ensure all dependencies are installed:
   ```bash
   npm install
   ```

2. Check TypeScript compilation:
   ```bash
   npm run build
   ```

### Docker Build Issues

1. Ensure Docker daemon is running
2. Check available disk space
3. Try building with no cache:
   ```bash
   docker build --no-cache -t codequal-api:latest -f Dockerfile.bundle .
   ```

## Monitoring

1. View real-time logs:
   ```bash
   kubectl logs -n codequal-prod -l app=codequal-api -f
   ```

2. Check resource usage:
   ```bash
   kubectl top pods -n codequal-prod
   ```

3. View deployment events:
   ```bash
   kubectl describe deployment codequal-api -n codequal-prod
   ```

## Rollback

If deployment fails, rollback to previous version:

```bash
kubectl rollout undo deployment/codequal-api -n codequal-prod
```

## Security Notes

1. Never commit secrets.yaml to version control
2. Rotate API keys regularly
3. Use least-privilege access for service accounts
4. Enable network policies in production
5. Regularly update base images for security patches

## Next Steps

1. Set up monitoring with Prometheus/Grafana
2. Configure horizontal pod autoscaling
3. Set up CI/CD pipeline
4. Configure SSL/TLS certificates
5. Set up backup strategies for the database