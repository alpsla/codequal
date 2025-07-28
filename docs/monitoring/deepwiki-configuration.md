# DeepWiki Storage Configuration

## Overview

The DeepWiki monitoring dashboard displays real-time storage metrics from the remote DeepWiki pod running in the cloud. The system connects to the pod's API to fetch actual disk usage data.

## Remote Monitoring Architecture

Since DeepWiki runs on a separate cloud pod:
- The monitoring dashboard connects to the remote pod via HTTP API
- Metrics are fetched from the actual DeepWiki pod, not local disk
- Real-time storage usage is reported from the cloud infrastructure
- No manual configuration needed when the remote pod storage is resized

## Configuration

### Remote API Connection

Configure the connection to your remote DeepWiki pod:

```bash
# Remote DeepWiki pod API endpoint
export DEEPWIKI_REMOTE_API_URL=https://deepwiki-pod.example.com

# Authentication key for remote API
export DEEPWIKI_REMOTE_API_KEY=your-secure-api-key
```

### Fallback Storage Size (Optional)

When the remote API is unavailable, the system uses fallback values:

```bash
# Fallback storage size (only used if remote API fails)
export DEEPWIKI_POD_STORAGE_GB=30
```

## How It Works

1. **Primary Method**: HTTP request to remote DeepWiki pod API
2. **Caching**: Metrics cached for 5 seconds to reduce API calls
3. **Fallback**: Uses stub data if remote API is unavailable

The system:
- Fetches real disk metrics from the remote pod
- Shows actual storage usage of the cloud infrastructure
- Handles connection failures gracefully
- Provides stub data during development

## Deployment Configuration

### Local Development

Add to your `.env` file (optional):
```
# Custom temp path (optional)
DEEPWIKI_TEMP_PATH=/tmp/deepwiki-temp

# Fallback storage size (optional, only used if auto-detection fails)
DEEPWIKI_POD_STORAGE_GB=30
```

### Kubernetes Deployment

Update your deployment manifest:

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
        - name: DEEPWIKI_TEMP_PATH
          value: "/mnt/pvc/deepwiki-temp"  # Path to PVC mount
        - name: DEEPWIKI_POD_STORAGE_GB
          value: "30"  # Optional fallback (auto-detection preferred)
```

### Docker Compose

Add to your `docker-compose.yml`:

```yaml
services:
  api:
    environment:
      - DEEPWIKI_POD_STORAGE_GB=30
```

## Updating Storage Size

When you resize your persistent volume:

1. Update the PVC size in Kubernetes
2. Restart the API pod (or wait for the next metrics request)

The monitoring dashboard will automatically detect and display the new storage size without any configuration changes!

## Future Improvements

In a production implementation, the service should:
- Read actual disk usage from the filesystem (`df` command or Node.js `fs` module)
- Monitor actual file sizes in the DeepWiki temporary directory
- Track real-time storage consumption per analysis
- Implement automatic cleanup when storage reaches threshold
- Send alerts when storage is critically low

## Current Implementation

The current implementation:
- ✅ Automatically detects actual disk space using `df` command
- ✅ Falls back to Node.js `fs.statfs()` API if needed
- ✅ Monitors real disk usage in real-time
- ✅ Caches metrics for 5 seconds to reduce I/O
- ✅ No manual configuration needed when resizing PVCs
- ⚠️ Active analyses tracking is still a stub
- ⚠️ Automatic cleanup not yet implemented

## Benefits

1. **No Manual Updates**: When you resize the PVC from 30GB to 50GB or 100GB, the dashboard automatically shows the correct size
2. **Real-Time Accuracy**: Shows actual disk usage, not simulated values
3. **Production Ready**: Uses standard Unix tools (`df`) that work in containers
4. **Fallback Support**: Still supports `DEEPWIKI_POD_STORAGE_GB` if automatic detection fails