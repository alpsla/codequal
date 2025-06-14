# DeepWiki Tools Kubernetes Deployment Checklist

## Pre-Deployment

- [ ] Verify all tests are passing
- [ ] Review tool-executor.js functionality
- [ ] Confirm Docker is installed and running
- [ ] Verify kubectl access to the cluster
- [ ] Check current DeepWiki deployment status

## Build Process

- [ ] Build Docker image locally
  ```bash
  chmod +x build-local.sh
  ./build-local.sh
  ```

- [ ] Test image locally
  ```bash
  docker run --rm -it deepwiki-with-tools:latest /tools/healthcheck.sh
  ```

- [ ] Verify tools are installed in image
  ```bash
  docker run --rm -it deepwiki-with-tools:latest npm list -g
  ```

## Deployment Steps

1. **Build and Deploy**
   ```bash
   chmod +x deploy-to-k8s.sh
   ./deploy-to-k8s.sh
   ```

2. **Verify Deployment**
   ```bash
   kubectl get pods -n codequal-dev -l app=deepwiki
   kubectl logs -n codequal-dev -l app=deepwiki --tail=50
   ```

3. **Test Tool Execution**
   ```bash
   POD=$(kubectl get pods -n codequal-dev -l app=deepwiki -o jsonpath='{.items[0].metadata.name}')
   kubectl exec -n codequal-dev $POD -- /tools/healthcheck.sh
   ```

## Post-Deployment Verification

- [ ] DeepWiki pod is running
- [ ] Tools are accessible within the pod
- [ ] Test repository analysis with tools
- [ ] Monitor resource usage
- [ ] Check logs for errors

## Integration Testing

1. **Manual Tool Test**
   ```bash
   kubectl exec -n codequal-dev $POD -- bash -c '
     mkdir -p /tmp/test-repo
     cd /tmp/test-repo
     echo "{\"name\": \"test\", \"version\": \"1.0.0\"}" > package.json
     npm install
     node /tools/tool-executor.js /tmp/test-repo "license-checker"
   '
   ```

2. **DeepWiki Integration Test**
   - Trigger a repository analysis via DeepWiki API
   - Verify tool results are included
   - Check Vector DB for tool results

## Rollback Plan

If issues occur:

1. **Revert to original DeepWiki image**
   ```bash
   kubectl set image deployment/deepwiki deepwiki=ghcr.io/asyncfuncai/deepwiki-open:latest -n codequal-dev
   ```

2. **Monitor rollback**
   ```bash
   kubectl rollout status deployment/deepwiki -n codequal-dev
   ```

## Monitoring

- Check pod logs: `kubectl logs -f -n codequal-dev -l app=deepwiki`
- Monitor resource usage: `kubectl top pod -n codequal-dev -l app=deepwiki`
- Watch for errors in tool execution

## Success Criteria

- [ ] DeepWiki pod starts successfully with new image
- [ ] Health check passes
- [ ] Tools execute without errors
- [ ] No increase in resource usage beyond limits
- [ ] Repository analysis includes tool results

## Notes

- The tools are: npm-audit, license-checker, madge, dependency-cruiser, npm-outdated
- npm-audit and npm-outdated are built into npm
- Other tools are installed globally in the Docker image
- Tools only run on JavaScript/TypeScript repositories with package.json
