# Kubernetes Secrets Management

## Overview

This document explains how to securely manage and deploy secrets to your Kubernetes cluster.

## Important Security Notes

⚠️ **The `generate-k8s-secrets.sh` script generates a local file only** - it does NOT automatically upload to Kubernetes
⚠️ **Never commit the generated `secrets.yaml` file to Git**
⚠️ **Always verify `.gitignore` is working before committing**

## Secret Update Workflow

### 1. Local Secret Generation

When you need to update secrets:

```bash
# 1. Update your local .env file with new values
nano .env

# 2. Generate the Kubernetes secrets file locally
./scripts/generate-k8s-secrets.sh

# This creates: kubernetes/production/secrets.yaml (gitignored)
```

### 2. Deploy to Kubernetes

**Option A: Direct kubectl apply (Simple but less secure)**
```bash
# Apply the secrets to your cluster
kubectl apply -f kubernetes/production/secrets.yaml

# Verify the secret was created
kubectl get secrets -n codequal-prod

# IMPORTANT: Delete the local file after applying
rm kubernetes/production/secrets.yaml
```

**Option B: Using kubectl create (More secure)**
```bash
# Create secrets directly without a file
kubectl create secret generic codequal-secrets \
  --namespace=codequal-prod \
  --from-env-file=.env \
  --dry-run=client -o yaml | kubectl apply -f -
```

**Option C: Using Sealed Secrets (Most secure for GitOps)**
```bash
# Install sealed-secrets controller first
# Then seal your secrets
kubeseal --format=yaml < kubernetes/production/secrets.yaml > kubernetes/production/sealed-secrets.yaml

# The sealed file can be safely committed to Git
git add kubernetes/production/sealed-secrets.yaml
```

### 3. Verify Deployment

```bash
# Check if secrets are deployed
kubectl get secrets -n codequal-prod

# View secret keys (not values)
kubectl describe secret codequal-secrets -n codequal-prod

# Test a pod can access the secrets
kubectl run test-pod --image=busybox --rm -it --restart=Never \
  --env-from=secretRef/codequal-secrets -- env | grep -E "(API_KEY|URL)"
```

## GitHub Actions Integration

For CI/CD, secrets should come from GitHub Secrets:

### 1. Store in GitHub Secrets
- Go to Settings → Secrets → Actions
- Add each secret value
- Use naming convention: `K8S_SECRET_NAME`

### 2. Deploy via GitHub Actions
```yaml
# .github/workflows/deploy.yml
- name: Deploy Secrets to Kubernetes
  env:
    KUBE_CONFIG: ${{ secrets.KUBE_CONFIG }}
  run: |
    echo "$KUBE_CONFIG" | base64 -d > kubeconfig
    export KUBECONFIG=kubeconfig
    
    # Create secret from GitHub Secrets
    kubectl create secret generic codequal-secrets \
      --namespace=codequal-prod \
      --from-literal=OPENAI_API_KEY="${{ secrets.OPENAI_API_KEY }}" \
      --from-literal=SUPABASE_SERVICE_KEY="${{ secrets.SUPABASE_SERVICE_KEY }}" \
      --from-literal=DATABASE_URL="${{ secrets.DATABASE_URL }}" \
      --dry-run=client -o yaml | kubectl apply -f -
```

## Best Practices

### 1. Secret Rotation
- Rotate secrets quarterly or after any potential exposure
- Use different secrets for different environments
- Document rotation dates

### 2. Access Control
- Use Kubernetes RBAC to limit secret access
- Create service accounts with minimal permissions
- Audit secret access regularly

### 3. Secret Storage Options

| Method | Security | Ease of Use | GitOps Compatible |
|--------|----------|-------------|-------------------|
| kubectl apply -f | ⚠️ Low | ✅ Easy | ❌ No |
| kubectl create | ✅ Medium | ✅ Easy | ❌ No |
| Sealed Secrets | ✅ High | 🔧 Medium | ✅ Yes |
| External Secrets | ✅ High | 🔧 Medium | ✅ Yes |
| HashiCorp Vault | ✅ Highest | 🔧 Complex | ✅ Yes |

## Emergency Procedures

### If Secrets Are Exposed:

1. **Immediately rotate all affected keys**
2. **Delete the exposed secret from Kubernetes**
   ```bash
   kubectl delete secret codequal-secrets -n codequal-prod
   ```
3. **Deploy new secrets**
4. **Restart all pods using the secrets**
   ```bash
   kubectl rollout restart deployment -n codequal-prod
   ```
5. **Audit logs for unauthorized access**

## Integration with Existing Systems

### Current Setup:
- **Local Development**: Uses `.env` file
- **GitHub Actions**: Uses GitHub Secrets
- **Kubernetes**: Uses Kubernetes Secrets

### Future Improvements:
1. Consider implementing Sealed Secrets for GitOps
2. Evaluate HashiCorp Vault for centralized secret management
3. Implement secret rotation automation

## Commands Reference

```bash
# Generate local secrets file
./scripts/generate-k8s-secrets.sh

# Apply to cluster (then delete local file!)
kubectl apply -f kubernetes/production/secrets.yaml && rm kubernetes/production/secrets.yaml

# View current secrets
kubectl get secrets -n codequal-prod

# Delete and recreate
kubectl delete secret codequal-secrets -n codequal-prod
kubectl create secret generic codequal-secrets --from-env-file=.env -n codequal-prod

# Verify pods can access
kubectl exec -it <pod-name> -n codequal-prod -- env | grep -E "(API|KEY|SECRET)"
```

## Related Documentation
- [Secrets Management Overview](/docs/security/secrets-management.md)
- [GitHub Secrets Setup](/.github/workflows/README.md)
- [Kubernetes Security Best Practices](https://kubernetes.io/docs/concepts/security/)