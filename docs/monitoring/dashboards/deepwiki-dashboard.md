# DeepWiki Monitoring Dashboard

## Overview

The DeepWiki monitoring dashboard provides real-time visibility into DeepWiki storage and active analyses.

## Location

- **File**: `/testing/deepwiki-dashboard.html`
- **URL**: `file:///Users/alpinro/Code%20Prjects/codequal/testing/deepwiki-dashboard.html`

## Features

### Real-time Metrics
- **Storage Usage**: Displays used/total GB with percentage
- **Active Analyses**: Shows count of currently running analyses
- **Available Space**: Remaining storage for new analyses
- **System Status**: Health indicator (Healthy/Warning/Critical)

### Visual Indicators
- **Progress Bar**: 
  - Green: < 70% usage
  - Yellow: 70-85% usage
  - Red: > 85% usage
- **Status Badge**: Color-coded system health

### Active Analyses List
- Analysis ID
- Repository URL
- Type (quick/comprehensive/deep)
- Duration
- Status (active/long-running)

## Configuration

### API Endpoints
```javascript
const API_BASE = 'http://localhost:3001';
const endpoints = {
  metrics: '/api/deepwiki/temp/metrics',
  activeAnalyses: '/api/deepwiki/temp/active-analyses'
};
```

### Authentication
- Uses JWT token stored in localStorage
- Prompts for token on first use
- Token persists across sessions

### Auto-refresh
- Refreshes every 10 seconds
- Manual refresh button available

## Usage

1. **Open Dashboard**:
   ```bash
   open file:///Users/alpinro/Code%20Prjects/codequal/testing/deepwiki-dashboard.html
   ```

2. **Enter JWT Token**:
   - Use existing token from localStorage
   - Or generate new token: `node scripts/generate-test-token.js`

3. **Monitor Metrics**:
   - Watch storage usage trends
   - Track active analyses
   - Monitor system health

## Troubleshooting

### Dashboard Not Loading
1. Check API server is running: `lsof -i :3001`
2. Verify JWT token is valid
3. Check browser console for errors

### Metrics Not Updating
1. Check network tab for API errors
2. Verify endpoints are accessible
3. Test manually: `curl http://localhost:3001/api/deepwiki/temp/metrics`

### Authentication Issues
1. Clear localStorage and re-enter token
2. Generate new test token
3. Check token expiration

## Customization

### Change Refresh Interval
```javascript
// In dashboard HTML, modify:
setInterval(refreshData, 10000); // Change 10000 to desired milliseconds
```

### Modify Thresholds
```javascript
// Warning threshold
if (data.percentUsed > 70) {
  progressBar.classList.add('warning');
}
// Critical threshold  
if (data.percentUsed > 85) {
  progressBar.classList.add('critical');
}
```