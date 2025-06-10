# DeepWiki Disk Space Resolution Process

## Root Cause
DeepWiki is encountering a "database or disk is full" error when attempting to analyze repositories. This is causing the 500 Internal Server Error in the UI.

## Resolution Steps

### Step 1: Check Current Disk Usage
```bash
# Run the disk space check script
bash /Users/alpinro/Code\ Prjects/codequal/kubernetes/check-deepwiki-disk.sh
```

This will show:
- Current disk usage in the DeepWiki pod
- Size of the persistent volume
- Largest files/directories consuming space

### Step 2: Clean Existing Data (Optional First Attempt)
```bash
# Run the cleanup script
bash /Users/alpinro/Code\ Prjects/codequal/kubernetes/clean-deepwiki-data.sh
```

This will:
- Remove temporary files
- Delete old log files
- Free up some space for immediate testing

After running the cleanup, try analyzing a repository again to see if the issue is resolved.

### Step 3: Increase PVC Size (If Cleanup Insufficient)

1. Create a new PVC with larger size:
```bash
kubectl apply -f /Users/alpinro/Code\ Prjects/codequal/kubernetes/deepwiki-pvc-resize.yaml
```

2. Update the deployment to use the new PVC:
```bash
kubectl apply -f /Users/alpinro/Code\ Prjects/codequal/kubernetes/deepwiki-deployment-updated.yaml
```

This will:
- Create a new, larger persistent volume claim (30Gi)
- Update the DeepWiki deployment to use this new volume
- Add resource requests/limits for better performance

### Step 4: Update GitHub Token (Optional Security Best Practice)

1. Create a new GitHub token with appropriate permissions:
   - Go to GitHub → Settings → Developer settings → Personal access tokens → Generate new token
   - Select `repo` permissions at minimum

2. Create a new Kubernetes secret with the token:
```bash
kubectl create secret generic github-token \
  --from-literal=token=your_new_token \
  -n codequal-dev
```

The updated deployment will automatically use this new token.

### Step 5: Verify Resolution

1. Wait for the new pod to be running:
```bash
kubectl get pods -n codequal-dev -l app=deepwiki -w
```

2. Check the logs to ensure no errors:
```bash
kubectl logs -n codequal-dev -l app=deepwiki
```

3. Access the DeepWiki UI and test repository analysis.

## Future Improvements

Once the immediate issue is resolved, consider implementing:

1. **Storage Monitoring**: Set up alerts for disk usage thresholds
2. **Automatic Cleanup**: Create a CronJob to periodically clean old data
3. **Resource Optimization**: Configure DeepWiki to use space more efficiently
4. **Scalable Storage**: Implement a more scalable storage solution

## Backup Plan

If increasing the PVC size does not resolve the issue, we can:

1. Export any critical data from the current volume
2. Create a completely fresh installation with properly sized storage
3. Implement the extract-and-process strategy outlined in the integration document
