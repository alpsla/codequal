# DeepWiki Analyzer Deployment Instructions

## Overview

This deployment creates a real DeepWiki analyzer pod that generates comprehensive 400+ line reports like the production version, while maintaining our efficient storage approach (no repository storage).

## Current Setup

- **Mock DeepWiki**: Currently using a Python mock that generates realistic reports
- **Real Binary**: Replace `mock-deepwiki.py` with actual DeepWiki binary when available

## Deployment Steps

### 1. Build and Push Docker Image

```bash
cd /Users/alpinro/Code\ Prjects/codequal/k8s/deepwiki-analyzer

# For DigitalOcean Registry
doctl registry login
docker build -t registry.digitalocean.com/codequal/deepwiki-analyzer:v2.0 .
docker push registry.digitalocean.com/codequal/deepwiki-analyzer:v2.0

# Update deployment to use DO registry
sed -i 's|image: codequal/deepwiki-analyzer:v2.0|image: registry.digitalocean.com/codequal/deepwiki-analyzer:v2.0|g' deepwiki-analyzer-deployment.yaml
```

### 2. Deploy to Kubernetes

```bash
# Apply the deployment
kubectl apply -f deepwiki-analyzer-deployment.yaml

# Check deployment status
kubectl rollout status deployment/deepwiki-analyzer -n codequal-dev

# Get pod name
POD_NAME=$(kubectl get pods -n codequal-dev -l app=deepwiki-analyzer -o jsonpath="{.items[0].metadata.name}")

# Verify DeepWiki is working
kubectl exec -n codequal-dev $POD_NAME -- deepwiki --version
```

### 3. Test the Analyzer

```bash
# Test analysis functionality
kubectl exec -n codequal-dev $POD_NAME -- bash -c "
  git clone https://github.com/facebook/react /tmp/test-repo &&
  cd /tmp/test-repo &&
  deepwiki analyze . --format json | head -50
"
```

### 4. Update Application Configuration

Set environment variables for the API:

```bash
# For local testing
export DEEPWIKI_POD_NAME=deepwiki-analyzer-xxxxx  # Use actual pod name

# For production, add to deployment:
kubectl set env deployment/api -n codequal-dev DEEPWIKI_POD_NAME=deepwiki-analyzer
```

### 5. Verify Integration

Run the test script to verify everything works:

```bash
cd /Users/alpinro/Code\ Prjects/codequal/apps/api
npx tsx src/test-scripts/test-deepwiki-with-monitoring.ts
```

## Expected Results

With this deployment, DeepWiki will generate:

### Comprehensive Issues (200+ total):
- **Critical**: ~12 issues with CVSS scores 9.0+
- **High**: ~34 issues with CVSS scores 7.0-8.9
- **Medium**: ~98 issues
- **Low**: ~143 issues

### Detailed Information per Issue:
```json
{
  "id": "SEC-001",
  "severity": "CRITICAL",
  "category": "Security",
  "title": "Hardcoded API Keys in Repository",
  "cwe": {
    "id": "CWE-798",
    "name": "Use of Hard-coded Credentials"
  },
  "cvss": {
    "score": 9.8,
    "vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"
  },
  "location": {
    "file": "k8s/deployments/production/api-deployment.yaml",
    "line": 23,
    "column": 45
  },
  "evidence": {
    "snippet": "- name: OPENROUTER_API_KEY\n  value: \"sk-or-v1-1234567890abcdef\""
  },
  "impact": "Complete system compromise if repository is breached",
  "remediation": {
    "immediate": "Remove all hardcoded secrets immediately",
    "steps": [
      "Remove hardcoded values from YAML files",
      "Rotate all exposed API keys",
      "Implement Kubernetes secrets",
      "Use sealed-secrets or external secret management"
    ]
  }
}
```

### Additional Analysis:
- Dependency vulnerabilities with CVE details
- Performance metrics and bottlenecks
- Test coverage analysis
- Architecture evaluation
- Time estimates for fixes
- Learning recommendations

## Switching to Real DeepWiki

When you have the real DeepWiki binary:

1. Replace `mock-deepwiki.py` with the actual binary
2. Update Dockerfile to copy real binary
3. Rebuild and redeploy
4. The rest of the integration remains the same

## Monitoring

Check the analyzer pod health:

```bash
# Pod status
kubectl get pods -n codequal-dev -l app=deepwiki-analyzer

# Resource usage
kubectl top pod -n codequal-dev -l app=deepwiki-analyzer

# Logs
kubectl logs -n codequal-dev -l app=deepwiki-analyzer --tail=50

# Disk usage in pod
kubectl exec -n codequal-dev $POD_NAME -- df -h /tmp
```

## Troubleshooting

If analysis fails:

1. Check pod logs: `kubectl logs -n codequal-dev $POD_NAME`
2. Verify git is working: `kubectl exec -n codequal-dev $POD_NAME -- git --version`
3. Check disk space: `kubectl exec -n codequal-dev $POD_NAME -- df -h`
4. Test DeepWiki directly: `kubectl exec -n codequal-dev $POD_NAME -- deepwiki analyze /tmp --format json`

## Success Criteria

✅ DeepWiki pod running and healthy
✅ Can clone repositories temporarily
✅ Generates 400+ line comprehensive reports
✅ Automatic cleanup after analysis
✅ No persistent storage used
✅ Integration with CodeQual API working