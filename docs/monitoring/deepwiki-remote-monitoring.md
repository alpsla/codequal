# DeepWiki Remote Pod Monitoring

## Architecture Overview

DeepWiki runs on a separate cloud pod with its own storage. The monitoring dashboard connects to the remote pod's API to fetch real-time metrics.

```
┌─────────────────┐         ┌──────────────────┐
│   Local/Cloud   │   HTTP  │  DeepWiki Pod    │
│   API Server    │ ------> │  (Remote Cloud)  │
│                 │         │                  │
│ - Dashboard UI  │         │ - 30GB Storage   │
│ - Metrics API   │         │ - Temp Files     │
│                 │         │ - Metrics API    │
└─────────────────┘         └──────────────────┘
```

## Configuration

### Environment Variables

Configure your API server to connect to the remote DeepWiki pod:

```bash
# Remote DeepWiki pod API endpoint
export DEEPWIKI_REMOTE_API_URL=https://deepwiki-pod.example.com

# Authentication key for remote API
export DEEPWIKI_REMOTE_API_KEY=your-secure-api-key

# Fallback storage size (only used if remote API is unavailable)
export DEEPWIKI_POD_STORAGE_GB=30
```

### Local Development

Add to your `.env` file:
```
DEEPWIKI_REMOTE_API_URL=https://deepwiki-pod.example.com
DEEPWIKI_REMOTE_API_KEY=your-secure-api-key
```

### Production Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: codequal-api
spec:
  template:
    spec:
      containers:
      - name: api
        env:
        - name: DEEPWIKI_REMOTE_API_URL
          valueFrom:
            configMapKeyRef:
              name: deepwiki-config
              key: remote-api-url
        - name: DEEPWIKI_REMOTE_API_KEY
          valueFrom:
            secretKeyRef:
              name: deepwiki-secrets
              key: api-key
```

## Remote API Requirements

The DeepWiki pod should expose a metrics endpoint that returns:

```json
GET /api/metrics/disk
Authorization: Bearer <api-key>

Response:
{
  "totalGB": 30,
  "usedGB": 6,
  "availableGB": 24,
  "percentUsed": 20,
  "tempDirectoryGB": 1.2,
  "activeAnalyses": 2,
  "avgAnalysisSizeMB": 614,
  "cleanupSuccessCount": 10,
  "cleanupFailedCount": 0
}
```

## Implementation on DeepWiki Pod

The DeepWiki pod should implement a simple metrics API:

```python
# Example Python implementation for DeepWiki pod
import os
import shutil
from flask import Flask, jsonify
from functools import wraps

app = Flask(__name__)

def require_api_key(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.headers.get('Authorization')
        if not auth or not auth.startswith('Bearer '):
            return jsonify({'error': 'Unauthorized'}), 401
        
        token = auth.split(' ')[1]
        if token != os.environ.get('API_KEY'):
            return jsonify({'error': 'Invalid API key'}), 401
        
        return f(*args, **kwargs)
    return decorated

@app.route('/api/metrics/disk')
@require_api_key
def get_disk_metrics():
    # Get disk usage for the temp directory
    temp_path = '/mnt/deepwiki-temp'
    
    # Get total and available space
    statvfs = os.statvfs(temp_path)
    total_gb = (statvfs.f_blocks * statvfs.f_frsize) / (1024**3)
    available_gb = (statvfs.f_available * statvfs.f_frsize) / (1024**3)
    used_gb = total_gb - available_gb
    percent_used = (used_gb / total_gb) * 100
    
    # Get temp directory size
    temp_size = sum(
        os.path.getsize(os.path.join(dirpath, filename))
        for dirpath, dirnames, filenames in os.walk(temp_path)
        for filename in filenames
    )
    temp_gb = temp_size / (1024**3)
    
    # Count active analyses (directories in temp)
    active_analyses = len([
        d for d in os.listdir(temp_path) 
        if os.path.isdir(os.path.join(temp_path, d))
    ])
    
    return jsonify({
        'totalGB': round(total_gb, 2),
        'usedGB': round(used_gb, 2),
        'availableGB': round(available_gb, 2),
        'percentUsed': round(percent_used, 1),
        'tempDirectoryGB': round(temp_gb, 2),
        'activeAnalyses': active_analyses,
        'avgAnalysisSizeMB': round((temp_gb * 1024) / max(1, active_analyses), 2)
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

## Monitoring Flow

1. User opens monitoring dashboard
2. Dashboard requests metrics from local API server
3. Local API server fetches metrics from remote DeepWiki pod
4. Remote pod returns real disk usage data
5. Dashboard displays remote pod's storage status

## Benefits

1. **Accurate Monitoring**: Shows real storage usage from the actual DeepWiki pod
2. **Remote Visibility**: Monitor cloud resources from anywhere
3. **Auto-scaling Ready**: Can trigger alerts when storage is low
4. **No Manual Updates**: Automatically detects storage changes on remote pod

## Fallback Mode

When the remote API is unavailable:
- Uses `DEEPWIKI_POD_STORAGE_GB` environment variable
- Shows simulated metrics (20% usage)
- Logs warnings about using stub data

## Security Considerations

1. **API Key**: Use strong, rotated API keys
2. **HTTPS Only**: Always use HTTPS for remote connections
3. **Network Policies**: Restrict access to DeepWiki pod API
4. **Rate Limiting**: Implement rate limiting on the pod API
5. **Monitoring**: Log all API access for security auditing