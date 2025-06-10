# DeepWiki Kubernetes Investigation Guided Walkthrough

This guide will walk you through the process of investigating DeepWiki CLI capabilities in your Kubernetes cluster. Follow these steps in order to complete your investigation successfully.

## Step 1: Make Scripts Executable

First, we need to make all the scripts executable:

```bash
# Navigate to the scripts directory
cd /Users/alpinro/Code\ Prjects/codequal/scripts

# Make the fix permissions script executable
chmod +x fix_permissions.sh

# Run the script to make all other scripts executable
./fix_permissions.sh
```

## Step 2: Run the Kubernetes Diagnostic Script

This script will check if kubectl is properly configured and find DeepWiki pods in your cluster:

```bash
# Run the diagnostic script
./kubernetes_diagnostic.sh
```

Take note of:
- The namespace where DeepWiki is running
- The pod name
- The container name(s)

## Step 3: Run the Enhanced DeepWiki Exploration Script

Now run the enhanced exploration script to investigate DeepWiki in detail:

```bash
# Run the exploration script
./explore_deepwiki_k8s.sh
```

The script will:
1. Find DeepWiki pods
2. Let you select a container to explore
3. Check available commands
4. Explore the filesystem
5. Look for executables
6. Check environment variables
7. Look for documentation
8. Save all findings to the `deepwiki_k8s_investigation` directory

## Step 4: Review the Investigation Results

Look through the files in the `deepwiki_k8s_investigation` directory:

```bash
# List the files
ls -la deepwiki_k8s_investigation/

# Review the investigation summary
cat deepwiki_k8s_investigation/investigation_summary.md
```

Pay special attention to:
- `executables.txt` - to find DeepWiki CLI commands
- `documentation_files.txt` - to find any README or documentation
- `config_files.txt` - to understand configuration options
- `environment_variables.txt` - to see how API keys are configured

## Step 5: Access the DeepWiki Container Directly

Based on the information from the previous steps, you can get an interactive shell in the container:

```bash
# Replace with actual values from your exploration
kubectl exec -it <pod-name> -n <namespace> -c <container-name> -- /bin/bash
```

If bash is not available, try using sh instead:

```bash
kubectl exec -it <pod-name> -n <namespace> -c <container-name> -- /bin/sh
```

Once inside the container, you can:
- Explore the filesystem directly
- Try running commands
- Read documentation files
- Check configuration

## Step 6: Test DeepWiki CLI Commands

After identifying the DeepWiki commands, use the test script to run analyses:

```bash
# Run with appropriate parameters
./test_deepwiki_cli.sh -n <namespace> -p <pod-name> -c <container-name> -r <repository-url>

# For example:
./test_deepwiki_cli.sh -n default -p deepwiki-pod -c deepwiki -r https://github.com/yourusername/test-repo -m standard
```

Test different repositories and modes to understand:
- Command syntax and parameters
- Output format
- Analysis speed and quality
- Different analysis modes

## Step 7: Document Your Findings

Use the documentation script to create templates:

```bash
# Run the documentation script
./create_deepwiki_docs.sh
```

Fill in the templates with your findings:
- Available commands
- Parameter options
- Authentication mechanisms
- Output formats
- Integration approach

## Step 8: Update the DeepWikiKubernetesService Implementation

Based on your findings, update the TypeScript service implementation:

```bash
# Open the file in your editor
code /Users/alpinro/Code\ Prjects/codequal/packages/core/src/services/deepwiki-kubernetes.service.ts
```

Update the following parts:
- `buildAnalysisCommand()` method - with the actual command syntax
- `buildChatCommand()` method - with the chat command syntax
- `executeCommandInPod()` method - with proper Kubernetes execution
- `parseAnalysisOutput()` method - based on the actual output format
- `parseChatOutput()` method - based on the chat output format

## Troubleshooting

If you encounter any issues:

1. **kubectl connection problems**:
   - Check that your Kubernetes context is set correctly
   - Verify you have proper permissions to access the cluster
   - Make sure your kubeconfig is valid and up-to-date

2. **Pod not found**:
   - Check if DeepWiki is deployed with a different name
   - Try searching for pods with "wiki" or "deep" in the name
   - List all pods to find the correct one

3. **Command execution errors**:
   - Verify the container has the necessary command-line tools
   - Try alternative commands or shells
   - Check container logs for error messages

4. **Permission issues**:
   - Make sure your user has the necessary RBAC permissions

## Next Steps After Investigation

Once you've completed the investigation:

1. Create a comprehensive document about DeepWiki CLI capabilities
2. Finalize the DeepWikiKubernetesService implementation
3. Create tests for the service
4. Integrate with the vector database setup
5. Implement the three-tier analysis framework

Good luck with your investigation!
