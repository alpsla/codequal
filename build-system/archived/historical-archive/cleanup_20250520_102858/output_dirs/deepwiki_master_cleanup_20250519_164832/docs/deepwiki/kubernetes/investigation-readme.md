# DeepWiki Kubernetes CLI Investigation

This directory contains scripts and documentation for investigating the DeepWiki CLI capabilities in our Kubernetes cluster. This is the highest priority task for integrating DeepWiki with CodeQual.

## Overview

DeepWiki is running in our DigitalOcean Kubernetes cluster. Instead of installing it locally, we'll access and use it directly in the cluster. This approach:

1. Leverages our existing deployment
2. Ensures we're using the exact same environment as production
3. Eliminates duplication of effort
4. Makes it easier to transition to a production-ready integration

## Available Scripts

### 1. `explore_deepwiki_k8s.sh`

This script helps you explore the DeepWiki container in Kubernetes:

```bash
# Make it executable
chmod +x scripts/explore_deepwiki_k8s.sh

# Run it
./scripts/explore_deepwiki_k8s.sh
```

The script will:
- Find DeepWiki pods in the cluster
- Identify containers in the pod
- Check available commands
- Explore the filesystem
- Check environment variables
- Look for DeepWiki executables
- Check running processes
- Look for documentation and config files

All results will be saved to the `deepwiki_k8s_investigation` directory.

### 2. `test_deepwiki_cli.sh`

This script helps you test DeepWiki CLI commands once you've discovered them:

```bash
# Make it executable
chmod +x scripts/test_deepwiki_cli.sh

# Run it with parameters
./scripts/test_deepwiki_cli.sh -n <namespace> -p <pod-name> -c <container-name> -r <repo-url>

# For help
./scripts/test_deepwiki_cli.sh --help
```

The script will:
- Run a DeepWiki analysis on the specified repository
- Time the execution
- Capture and analyze the output format
- Save all results to a timestamped directory

### 3. `create_deepwiki_docs.sh`

This script creates documentation templates for your findings:

```bash
# Make it executable
chmod +x scripts/create_deepwiki_docs.sh

# Run it
./scripts/create_deepwiki_docs.sh
```

The script creates templates in the `deepwiki_documentation` directory that you can fill in as you investigate.

## Skeleton Implementation

We've also created a skeleton TypeScript implementation of the `DeepWikiKubernetesService` class in:

```
packages/core/src/services/deepwiki-kubernetes.service.ts
```

You'll need to update this implementation based on your findings from the investigation.

## Investigation Steps

Follow these steps for your investigation:

1. **Access the DeepWiki container**:
   - Run `explore_deepwiki_k8s.sh` to get basic information
   - Use `kubectl exec -it <pod-name> -n <namespace> -c <container-name> -- /bin/bash` to get an interactive shell

2. **Discover CLI commands**:
   - Look for executables with `find / -name "*deepwiki*" -type f`
   - Try running `deepwiki --help` or similar commands
   - Look for documentation files

3. **Test different analysis modes**:
   - Test comprehensive analysis
   - Test concise analysis
   - Document the differences

4. **Explore authentication**:
   - Identify where API keys are configured
   - Understand how authentication is handled

5. **Capture output formats**:
   - Run analyses on small repositories
   - Document the structure of the output
   - Identify optimal chunking boundaries for vectorization

6. **Create documentation**:
   - Document all findings in the templates
   - Include examples and command references

7. **Update the service implementation**:
   - Modify the `DeepWikiKubernetesService` class based on findings
   - Implement the appropriate command building and execution
   - Implement proper output parsing

## Common Kubernetes Commands

Here are some useful Kubernetes commands for your investigation:

```bash
# List all pods in all namespaces
kubectl get pods -A

# List pods in a specific namespace
kubectl get pods -n <namespace>

# Get details about a pod
kubectl describe pod <pod-name> -n <namespace>

# Get logs from a container
kubectl logs <pod-name> -n <namespace> -c <container-name>

# Execute a command in a container
kubectl exec <pod-name> -n <namespace> -c <container-name> -- <command>

# Get an interactive shell in a container
kubectl exec -it <pod-name> -n <namespace> -c <container-name> -- /bin/bash

# Copy files from a container
kubectl cp <namespace>/<pod-name>:<path> <local-path> -c <container-name>
```

## Next Steps After Investigation

Once you've completed the investigation:

1. Update the `DeepWikiKubernetesService` implementation
2. Implement proper error handling and retry logic
3. Create tests for the service
4. Document the integration approach
5. Proceed with integrating this service with the vector database setup

## Success Criteria

Your investigation will be successful when you can:

1. Access the DeepWiki CLI in Kubernetes
2. Run analyses on repositories using different modes
3. Understand the output format and structure
4. Document the authentication and configuration options
5. Create a working implementation of the `DeepWikiKubernetesService` class
