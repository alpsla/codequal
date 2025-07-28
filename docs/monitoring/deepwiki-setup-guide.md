# DeepWiki Pod Monitoring Setup Guide

## Prerequisites

1. Access to the DeepWiki pod (Kubernetes cluster or remote server)
2. Ability to modify DeepWiki pod to add metrics endpoint
3. Network connectivity between your local API server and DeepWiki pod

## Step 1: Implement Metrics Endpoint on DeepWiki Pod

Add this endpoint to your DeepWiki pod application:

### For Python/Flask DeepWiki:

```python
# deepwiki_metrics.py
import os
import psutil
from flask import Flask, jsonify, request
from functools import wraps

app = Flask(__name__)

# Simple API key authentication
API_KEY = os.environ.get('METRICS_API_KEY', 'your-secure-key-here')

def require_api_key(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.headers.get('Authorization')
        if not auth or not auth.startswith('Bearer '):
            return jsonify({'error': 'Unauthorized'}), 401
        
        token = auth.split(' ')[1]
        if token != API_KEY:
            return jsonify({'error': 'Invalid API key'}), 401
        
        return f(*args, **kwargs)
    return decorated

@app.route('/api/metrics/disk')
@require_api_key
def get_disk_metrics():
    # Get disk usage for the mount point
    disk_usage = psutil.disk_usage('/')
    
    # Calculate metrics
    total_gb = disk_usage.total / (1024**3)
    used_gb = disk_usage.used / (1024**3)
    available_gb = disk_usage.free / (1024**3)
    percent_used = disk_usage.percent
    
    # Count active analyses (example: count directories in temp folder)
    temp_path = '/tmp/deepwiki-analyses'
    active_analyses = 0
    if os.path.exists(temp_path):
        active_analyses = len([d for d in os.listdir(temp_path) 
                              if os.path.isdir(os.path.join(temp_path, d))])
    
    return jsonify({
        'totalGB': round(total_gb, 2),
        'usedGB': round(used_gb, 2),
        'availableGB': round(available_gb, 2),
        'percentUsed': round(percent_used, 1),
        'tempDirectoryGB': 0,  # Add actual calculation if needed
        'activeAnalyses': active_analyses,
        'avgAnalysisSizeMB': 0  # Add actual calculation if needed
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

### For Node.js/Express DeepWiki:

```javascript
// deepwiki-metrics.js
const express = require('express');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const API_KEY = process.env.METRICS_API_KEY || 'your-secure-key-here';

// Middleware for API key authentication
const requireApiKey = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const token = auth.split(' ')[1];
  if (token !== API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  next();
};

app.get('/api/metrics/disk', requireApiKey, (req, res) => {
  try {
    // Get disk usage using df command
    const dfOutput = execSync('df -BG / | tail -1').toString();
    const parts = dfOutput.trim().split(/\s+/);
    
    const totalGB = parseInt(parts[1].replace('G', ''));
    const usedGB = parseInt(parts[2].replace('G', ''));
    const availableGB = parseInt(parts[3].replace('G', ''));
    const percentUsed = parseInt(parts[4].replace('%', ''));
    
    // Count active analyses
    const tempPath = '/tmp/deepwiki-analyses';
    let activeAnalyses = 0;
    if (fs.existsSync(tempPath)) {
      activeAnalyses = fs.readdirSync(tempPath)
        .filter(file => fs.statSync(path.join(tempPath, file)).isDirectory())
        .length;
    }
    
    res.json({
      totalGB,
      usedGB,
      availableGB,
      percentUsed,
      tempDirectoryGB: 0,
      activeAnalyses,
      avgAnalysisSizeMB: 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

app.listen(8080, '0.0.0.0', () => {
  console.log('Metrics API running on port 8080');
});
```

## Step 2: Configure Access to DeepWiki Pod

### Option A: Direct Internet Access

If your DeepWiki pod has a public IP or domain:

```bash
# Set environment variables
export DEEPWIKI_REMOTE_API_URL=https://your-deepwiki-pod.com:8080
export DEEPWIKI_REMOTE_API_KEY=your-secure-key-here
```

### Option B: Kubernetes Port Forwarding

If DeepWiki is in a Kubernetes cluster:

```bash
# Port forward to access the pod locally
kubectl port-forward -n codequal-dev deployment/deepwiki 8080:8080

# Then use localhost
export DEEPWIKI_REMOTE_API_URL=http://localhost:8080
export DEEPWIKI_REMOTE_API_KEY=your-secure-key-here
```

### Option C: SSH Tunnel

If DeepWiki is on a remote server:

```bash
# Create SSH tunnel
ssh -L 8080:localhost:8080 user@deepwiki-server.com

# Then use localhost
export DEEPWIKI_REMOTE_API_URL=http://localhost:8080
export DEEPWIKI_REMOTE_API_KEY=your-secure-key-here
```

## Step 3: Configure Local API Server

Add to your `.env` file:

```bash
# apps/api/.env
DEEPWIKI_REMOTE_API_URL=http://localhost:8080  # Or your actual URL
DEEPWIKI_REMOTE_API_KEY=your-secure-key-here
```

## Step 4: Restart API Server

```bash
cd apps/api
npm run dev
```

## Step 5: Test the Connection

```bash
# Test metrics endpoint directly
curl -H "Authorization: Bearer your-secure-key-here" \
  http://localhost:8080/api/metrics/disk

# Test through your API server
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3001/api/deepwiki/temp/metrics
```

## Step 6: Run DeepWiki Analysis

To test with real data:

1. Start a DeepWiki analysis on your target repository
2. Watch the dashboard update in real-time
3. Monitor disk usage as the analysis progresses

## Troubleshooting

### Connection Refused
- Check if DeepWiki metrics endpoint is running
- Verify port forwarding/tunnel is active
- Check firewall rules

### 401 Unauthorized
- Verify API key matches on both sides
- Check Authorization header format

### CORS Issues
- Add CORS headers to DeepWiki metrics endpoint
- Use proxy through your API server

### No Data Updates
- Check if DeepWiki is actually creating temp files
- Verify the temp directory path is correct
- Ensure metrics endpoint is reading the right directory

## Example Testing Script

```bash
#!/bin/bash
# test-deepwiki-monitoring.sh

# 1. Start port forwarding (if using K8s)
kubectl port-forward -n codequal-dev deployment/deepwiki 8080:8080 &
PF_PID=$!

# 2. Wait for port forward to establish
sleep 5

# 3. Test metrics endpoint
echo "Testing DeepWiki metrics endpoint..."
curl -s -H "Authorization: Bearer your-secure-key-here" \
  http://localhost:8080/api/metrics/disk | jq

# 4. Test through API server
echo "Testing through API server..."
curl -s -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3001/api/deepwiki/temp/metrics | jq

# 5. Clean up
kill $PF_PID
```