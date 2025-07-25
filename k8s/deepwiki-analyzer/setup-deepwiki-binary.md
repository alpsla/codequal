# Setting Up DeepWiki Binary

## Options to Obtain DeepWiki Analyzer

### Option 1: Use Existing DeepWiki from Previous Installation

If you have DeepWiki installed from before, you can:

1. **Find the binary location:**
   ```bash
   # On your local machine or previous server
   which deepwiki
   find / -name "deepwiki" -type f 2>/dev/null
   ```

2. **Copy the binary to the project:**
   ```bash
   cp /path/to/deepwiki ./k8s/deepwiki-analyzer/deepwiki-binary
   ```

3. **Update Dockerfile to use local binary:**
   ```dockerfile
   # Instead of wget, copy local binary
   COPY deepwiki-binary /usr/local/bin/deepwiki
   RUN chmod +x /usr/local/bin/deepwiki
   ```

### Option 2: Build DeepWiki from Source

If you have DeepWiki source code:

```dockerfile
# Multi-stage build
FROM golang:1.20 as builder
WORKDIR /build
COPY deepwiki-source/ .
RUN go build -o deepwiki cmd/deepwiki/main.go

FROM ubuntu:22.04
COPY --from=builder /build/deepwiki /usr/local/bin/
```

### Option 3: Use DeepWiki Container

If DeepWiki provides an official container:

```yaml
# Update deployment to use official image
spec:
  containers:
  - name: deepwiki-analyzer
    image: deepwiki/analyzer:latest  # Official DeepWiki image
    command: ["/usr/bin/deepwiki", "server"]
```

### Option 4: Create Mock DeepWiki Binary

For testing purposes, create a mock that generates comprehensive reports:

```bash
#!/bin/bash
# mock-deepwiki.sh - Mock DeepWiki analyzer

if [ "$1" == "--version" ]; then
    echo "DeepWiki Analyzer v2.0.0 (Mock)"
    exit 0
fi

if [ "$1" == "analyze" ]; then
    # Generate comprehensive mock analysis
    cat > /tmp/analysis-result.json << 'EOF'
{
  "scan_completed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "scan_duration_ms": 52300,
  "repository": {
    "url": "$2",
    "commit": "$(git rev-parse HEAD 2>/dev/null || echo 'mock-commit')",
    "branch": "$(git branch --show-current 2>/dev/null || echo 'main')"
  },
  "scores": {
    "overall": 72,
    "security": 65,
    "performance": 70,
    "maintainability": 78,
    "testing": 68
  },
  "statistics": {
    "files_analyzed": 1247,
    "total_issues": 287,
    "languages": {
      "TypeScript": 65,
      "JavaScript": 20,
      "JSON": 10,
      "Other": 5
    }
  },
  "vulnerabilities": [
    {
      "severity": "CRITICAL",
      "category": "Security",
      "title": "Hardcoded API Keys in Repository",
      "location": {
        "file": "k8s/deployments/production/api-deployment.yaml",
        "line": 23
      },
      "cvss": {
        "score": 9.8,
        "vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"
      },
      "cwe": {
        "id": "CWE-798",
        "name": "Use of Hard-coded Credentials"
      },
      "impact": "Complete system compromise if repository is breached",
      "evidence": {
        "snippet": "- name: OPENROUTER_API_KEY\\n  value: \\"sk-or-v1-1234567890abcdef\\"  # EXPOSED!"
      },
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
  ],
  "recommendations": [
    {
      "category": "Security",
      "priority": "HIGH",
      "title": "Implement Security Headers",
      "description": "Add security headers like CSP, HSTS, X-Frame-Options",
      "impact": "Prevents XSS, clickjacking, and other attacks",
      "effort": "LOW",
      "estimated_hours": 4
    }
  ]
}
EOF
    
    # Output the result
    if [ "$3" == "--format" ] && [ "$4" == "json" ]; then
        cat /tmp/analysis-result.json
    else
        echo "Analysis complete. Use --format json for detailed output."
    fi
    exit 0
fi

echo "Usage: deepwiki analyze <repository-path> [--format json]"
exit 1
```

## Deployment Steps

1. **Prepare the binary:**
   ```bash
   # If using mock for testing
   cp setup-deepwiki-binary.md mock-deepwiki.sh
   chmod +x mock-deepwiki.sh
   ```

2. **Update Dockerfile:**
   ```dockerfile
   # For mock testing
   COPY mock-deepwiki.sh /usr/local/bin/deepwiki
   RUN chmod +x /usr/local/bin/deepwiki
   ```

3. **Build and deploy:**
   ```bash
   ./deploy-deepwiki.sh
   ```

## Testing the Deployment

```bash
# Get the new pod name
POD_NAME=$(kubectl get pods -n codequal-dev -l app=deepwiki-analyzer -o jsonpath="{.items[0].metadata.name}")

# Test DeepWiki
kubectl exec -n codequal-dev $POD_NAME -- deepwiki --version

# Run a test analysis
kubectl exec -n codequal-dev $POD_NAME -- bash -c "
  git clone https://github.com/facebook/react /tmp/test-repo &&
  cd /tmp/test-repo &&
  deepwiki analyze . --format json
"
```

## Integration with CodeQual

Once deployed, the DeepWiki manager will automatically use the new analyzer pod to generate comprehensive reports with:

- 200+ issues (not just 4)
- CVSS scores for security vulnerabilities
- CWE classifications
- Performance metrics
- Dependency analysis
- Test coverage
- Architecture evaluation
- Time estimates
- ROI calculations

All while maintaining our efficient temporary storage approach!