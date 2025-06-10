# DeepWiki Kubernetes Investigation: Manual Steps

This document provides direct manual steps to investigate DeepWiki in your Kubernetes cluster without relying on automated scripts.

## Step 1: Make the direct test script executable

```bash
# Make the script executable
chmod +x /Users/alpinro/Code\ Prjects/codequal/scripts/direct_deepwiki_test.sh

# Run the script (recommended approach)
/Users/alpinro/Code\ Prjects/codequal/scripts/direct_deepwiki_test.sh
```

The `direct_deepwiki_test.sh` script is a straightforward tool that:
- Asks you for namespace, pod name, and container name
- Tests the connection to that pod
- Collects basic information from the container
- Tries to determine how to interact with DeepWiki

## Step 2: Manual Investigation (if the script doesn't work)

If the direct test script doesn't work, follow these manual steps:

### 2.1. Find your DeepWiki pod

```bash
# List all namespaces
kubectl get namespaces

# List pods in all namespaces (or specific namespace if known)
kubectl get pods --all-namespaces

# Look for pods with 'wiki' or 'deep' in the name
kubectl get pods --all-namespaces | grep -i wiki
kubectl get pods --all-namespaces | grep -i deep
```

### 2.2. Inspect the pod

Once you've identified the likely DeepWiki pod:

```bash
# Replace with your pod's namespace and name
NAMESPACE="your-namespace"
POD_NAME="your-pod-name"

# Describe the pod to get details
kubectl describe pod $POD_NAME -n $NAMESPACE

# List containers in the pod
kubectl get pod $POD_NAME -n $NAMESPACE -o jsonpath='{.spec.containers[*].name}'
```

### 2.3. Explore the container

Once you have identified the container name:

```bash
# Replace with your container name
CONTAINER_NAME="your-container-name"

# Test basic command execution
kubectl exec $POD_NAME -n $NAMESPACE -c $CONTAINER_NAME -- ls -la /

# Check for DeepWiki executables
kubectl exec $POD_NAME -n $NAMESPACE -c $CONTAINER_NAME -- find / -name "*deepwiki*" -type f 2>/dev/null

# Look for any executables in common locations
kubectl exec $POD_NAME -n $NAMESPACE -c $CONTAINER_NAME -- find /bin /usr/bin /usr/local/bin /app -type f -executable 2>/dev/null | grep -v "Permission denied"

# Check for configuration files
kubectl exec $POD_NAME -n $NAMESPACE -c $CONTAINER_NAME -- find / -name "*.conf" -o -name "*.json" -o -name "*.yaml" -o -name "*.yml" 2>/dev/null | grep -v "Permission denied"
```

### 2.4. Test DeepWiki functionality

Try these common command patterns to see if any work:

```bash
# Replace with a test repository URL
REPO_URL="https://github.com/example/repo"

# Try potential commands
kubectl exec $POD_NAME -n $NAMESPACE -c $CONTAINER_NAME -- deepwiki analyze "$REPO_URL"
kubectl exec $POD_NAME -n $NAMESPACE -c $CONTAINER_NAME -- deepwiki-cli analyze "$REPO_URL"
kubectl exec $POD_NAME -n $NAMESPACE -c $CONTAINER_NAME -- node /app/index.js analyze "$REPO_URL"
kubectl exec $POD_NAME -n $NAMESPACE -c $CONTAINER_NAME -- python /app/main.py analyze "$REPO_URL"
kubectl exec $POD_NAME -n $NAMESPACE -c $CONTAINER_NAME -- ./deepwiki analyze "$REPO_URL"
```

## Step 3: Implementing DeepWikiKubernetesService

Once you've determined how to interact with DeepWiki, update the TypeScript service:

```typescript
// In deepwiki-kubernetes.service.ts

// Update the buildAnalysisCommand method
private buildAnalysisCommand(options: DeepWikiAnalysisOptions): string {
  // Replace with the actual command pattern you discovered
  let command = 'deepwiki analyze'; // Or whatever command you found
  
  // Add repository URL
  command += ` '${options.repositoryUrl}'`;
  
  // Add other parameters based on what you discovered
  // ...
  
  return command;
}

// Update the executeCommandInPod method
private async executeCommandInPod(command: string, timeoutSeconds: number): Promise<string> {
  // Use kubectl exec to run the command in the pod
  const kubectl = spawn('kubectl', [
    'exec',
    this.podName,
    '-n',
    this.namespace,
    '-c',
    this.containerName,
    '--',
    'sh',
    '-c',
    command
  ]);
  
  // Handle output and errors
  // ...
}
```

## Step 4: Document Your Findings

Create a document with your findings:

1. Pod and container details
2. Available commands
3. Command parameters
4. Output format
5. Error handling approach
6. Authentication mechanism

This documentation will be valuable for implementing the DeepWikiKubernetesService properly.
