# DeepWiki Deployment Guide

## Prerequisites

1. **GitHub Repository Secrets**: Ensure these secrets are set in your GitHub repository:
   - `OPENAI_API_KEY` - For OpenAI embeddings (text-embedding-3-large)
   - `OPENROUTER_API_KEY` - For all LLM requests through OpenRouter
   - `GITHUB_TOKEN` - For repository access in DeepWiki
   - `GOOGLE_API_KEY` - Required by DeepWiki
   - `VOYAGE_API_KEY` - For code embeddings
   - `KUBE_CONFIG` - Base64 encoded kubeconfig for Kubernetes access

2. **Local Environment Variables**: For local deployment, export these variables:
   ```bash
   export OPENAI_API_KEY="your-openai-key"
   export OPENROUTER_API_KEY="your-openrouter-key"
   export GITHUB_TOKEN="your-github-token"
   export GOOGLE_API_KEY="your-google-api-key"
   export VOYAGE_API_KEY="your-voyage-api-key"
   ```

## Deployment Methods

### 1. GitHub Actions (Recommended for Production)

The workflow is configured to deploy DeepWiki using GitHub secrets:

```bash
# Manually trigger deployment from GitHub UI
# Go to Actions → Deploy DeepWiki → Run workflow
# Select environment: dev or prod
```

### 2. Local Deployment Script

Use the provided script for local deployments:

```bash
# Deploy to dev environment
./scripts/deploy-deepwiki-local.sh dev

# Deploy to prod environment
./scripts/deploy-deepwiki-local.sh prod
```

### 3. Manual Deployment

If you need to deploy manually:

1. Create namespace:
   ```bash
   kubectl create namespace codequal-dev
   ```

2. Create secrets:
   ```bash
   kubectl create secret generic deepwiki-secrets \
     --namespace=codequal-dev \
     --from-literal=openai-api-key="$OPENAI_API_KEY" \
     --from-literal=openrouter-api-key="$OPENROUTER_API_KEY" \
     --from-literal=github-token="$GITHUB_TOKEN" \
     --from-literal=google-api-key="$GOOGLE_API_KEY" \
     --from-literal=voyage-api-key="$VOYAGE_API_KEY"
   ```

3. Apply deployment:
   ```bash
   kubectl apply -f kubernetes/deepwiki-deployment-dev.yaml
   ```

## Accessing DeepWiki

After deployment, access DeepWiki using port forwarding:

```bash
kubectl port-forward -n codequal-dev svc/deepwiki-api 8001:8001
```

Then access at: http://localhost:8001

## Verifying Deployment

Check deployment status:

```bash
# Check pods
kubectl get pods -n codequal-dev -l app=deepwiki

# Check logs
kubectl logs -n codequal-dev -l app=deepwiki

# Check secrets
kubectl get secrets -n codequal-dev
```

## Updating Secrets

To update secrets without redeploying:

```bash
# Delete existing secret
kubectl delete secret deepwiki-secrets -n codequal-dev

# Recreate with new values
kubectl create secret generic deepwiki-secrets \
  --namespace=codequal-dev \
  --from-literal=openai-api-key="$NEW_OPENAI_API_KEY" \
  # ... other keys

# Restart deployment to pick up new secrets
kubectl rollout restart deployment/deepwiki -n codequal-dev
```

## Security Best Practices

1. **Never commit secrets**: All API keys should be stored as GitHub secrets or environment variables
2. **Use namespaces**: Keep dev and prod environments separated
3. **Rotate keys regularly**: Update secrets periodically
4. **Limit access**: Use RBAC to control who can access secrets
5. **Monitor usage**: Track API key usage for anomalies

## Troubleshooting

### Pod not starting
```bash
kubectl describe pod -n codequal-dev -l app=deepwiki
```

### Secret not found
```bash
kubectl get secrets -n codequal-dev
kubectl describe secret deepwiki-secrets -n codequal-dev
```

### Environment variables not set
```bash
kubectl exec -n codequal-dev -it $(kubectl get pod -n codequal-dev -l app=deepwiki -o name) -- env | grep API_KEY
```