# DeepWiki Tool Integration Deployment Guide

## Overview

This guide explains how to integrate the analysis tools into the DeepWiki Kubernetes deployment.

## Prerequisites

- DeepWiki base image
- Kubernetes cluster access
- Docker registry access

## Deployment Steps

### 1. Build Enhanced DeepWiki Image

```bash
# Navigate to the docker directory
cd packages/core/src/services/deepwiki-tools/docker

# Build the enhanced image
docker build -t deepwiki-with-tools:latest .

# Tag for your registry
docker tag deepwiki-with-tools:latest your-registry/deepwiki-with-tools:latest

# Push to registry
docker push your-registry/deepwiki-with-tools:latest
```

### 2. Update DeepWiki Deployment

Update your Kubernetes deployment to use the new image:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: deepwiki
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: deepwiki
  template:
    metadata:
      labels:
        app: deepwiki
    spec:
      containers:
      - name: deepwiki
        image: your-registry/deepwiki-with-tools:latest
        env:
        - name: TOOLS_ENABLED
          value: "true"
        - name: TOOLS_TIMEOUT
          value: "60000"
        - name: TOOLS_PARALLEL
          value: "true"
        volumeMounts:
        - name: workspace
          mountPath: /workspace
        resources:
          requests:
            memory: "2Gi"
            cpu: "1"
          limits:
            memory: "4Gi"
            cpu: "2"
      volumes:
      - name: workspace
        emptyDir: {}
```

### 3. Integration with DeepWiki Analysis

Modify DeepWiki's main analysis script to call the tool executor:

```python
# In DeepWiki's analysis script
import subprocess
import json
import os

def run_analysis_tools(repo_path, enabled_tools=None):
    """Run analysis tools on the repository"""
    
    if not os.environ.get('TOOLS_ENABLED', 'false').lower() == 'true':
        return None
    
    if enabled_tools is None:
        enabled_tools = ['npm-audit', 'license-checker', 'madge', 'dependency-cruiser', 'npm-outdated']
    
    tools_str = ','.join(enabled_tools)
    
    try:
        # Run the tool executor
        result = subprocess.run(
            ['node', '/tools/tool-executor.js', repo_path, tools_str],
            capture_output=True,
            text=True,
            timeout=int(os.environ.get('TOOLS_TIMEOUT', 60000)) / 1000
        )
        
        if result.returncode == 0:
            return json.loads(result.stdout)
        else:
            print(f"Tool execution failed: {result.stderr}")
            return None
            
    except subprocess.TimeoutExpired:
        print("Tool execution timed out")
        return None
    except Exception as e:
        print(f"Error running tools: {e}")
        return None

# Add to main analysis flow
def analyze_repository(repo_url):
    # ... existing DeepWiki analysis ...
    
    # Run tools after cloning
    repo_path = f"/workspace/{extract_repo_name(repo_url)}"
    tool_results = run_analysis_tools(repo_path)
    
    # Include tool results in final output
    if tool_results:
        analysis_output['toolResults'] = tool_results['results']
    
    return analysis_output
```

### 4. API Integration

Add an endpoint or parameter to trigger tool analysis:

```python
# In DeepWiki API
@app.post("/analyze")
async def analyze_repository(request: AnalysisRequest):
    # Extract parameters
    repo_url = request.repository_url
    run_tools = request.get('runTools', True)
    enabled_tools = request.get('enabledTools', None)
    
    # Set environment variable
    os.environ['TOOLS_ENABLED'] = 'true' if run_tools else 'false'
    
    # Run analysis
    result = analyze_repository(repo_url)
    
    return result
```

### 5. Testing the Deployment

Test the tool integration:

```bash
# 1. Port-forward to DeepWiki pod
kubectl port-forward pod/deepwiki-xxxxx 8080:8080

# 2. Test analysis with tools
curl -X POST http://localhost:8080/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "repository_url": "https://github.com/example/test-repo",
    "runTools": true,
    "enabledTools": ["npm-audit", "license-checker"]
  }'

# 3. Check logs
kubectl logs pod/deepwiki-xxxxx
```

### 6. Monitoring

Add monitoring for tool execution:

```yaml
# Add these metrics to your monitoring system
- deepwiki_tool_execution_total
- deepwiki_tool_execution_success
- deepwiki_tool_execution_duration_seconds
- deepwiki_tool_execution_errors_total
```

## Configuration Options

### Environment Variables

- `TOOLS_ENABLED`: Enable/disable tool execution (default: true)
- `TOOLS_TIMEOUT`: Timeout per tool in milliseconds (default: 60000)
- `TOOLS_PARALLEL`: Run tools in parallel (default: true)

### Tool Selection

Tools can be selectively enabled per analysis:

```json
{
  "enabledTools": [
    "npm-audit",      // Security vulnerabilities
    "license-checker", // License compliance
    "madge",          // Circular dependencies
    "dependency-cruiser", // Dependency rules
    "npm-outdated"    // Version updates
  ]
}
```

## Troubleshooting

### Common Issues

1. **Tools not found**
   - Ensure npm packages are installed globally in Docker image
   - Check PATH includes npm global bin directory

2. **Timeout errors**
   - Increase TOOLS_TIMEOUT environment variable
   - Consider running fewer tools in parallel

3. **Memory issues**
   - Increase pod memory limits
   - Run tools sequentially instead of parallel

### Debug Mode

Enable debug logging:

```bash
export DEBUG=deepwiki:tools
export NODE_ENV=development
```

## Security Considerations

1. **Tool Execution Isolation**
   - Tools run in the same container as DeepWiki
   - Consider using separate containers for better isolation

2. **Resource Limits**
   - Set CPU and memory limits for the pod
   - Implement timeouts for each tool

3. **Output Sanitization**
   - Tool output is JSON-encoded
   - Validate output size limits

## Performance Optimization

1. **Caching**
   - Cache npm dependencies in Docker image
   - Consider caching tool results for identical commits

2. **Parallel Execution**
   - Tools run in parallel by default
   - Adjust based on pod resources

3. **Selective Analysis**
   - Only run applicable tools
   - Skip tools for non-JavaScript repositories

## Rollback Plan

If issues occur:

1. Update deployment to use previous image:
   ```bash
   kubectl set image deployment/deepwiki deepwiki=your-registry/deepwiki:previous
   ```

2. Disable tools via environment variable:
   ```bash
   kubectl set env deployment/deepwiki TOOLS_ENABLED=false
   ```

## Success Metrics

Monitor these metrics after deployment:

- Tool execution success rate > 95%
- Average tool execution time < 30s
- No increase in pod crash rate
- Memory usage within limits

## Contact

For issues or questions:
- DeepWiki Team: deepwiki-team@company.com
- CodeQual Team: codequal-team@company.com
