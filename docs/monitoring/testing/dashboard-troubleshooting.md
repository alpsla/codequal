# DeepWiki Dashboard Troubleshooting Guide

## Common Issues and Solutions

### 1. "Failed to execute 'fetch' on 'Window': Invalid value" Error

**Cause**: Empty or invalid JWT token

**Solutions**:
1. Click the "Update Token" button
2. Paste a valid JWT token (get one using `node scripts/setup-test-user-for-monitoring.js`)
3. Clear browser localStorage and refresh: 
   ```javascript
   localStorage.clear(); location.reload();
   ```

### 2. "401 Unauthorized" Error

**Cause**: Invalid or expired JWT token

**Solutions**:
1. Generate a new token:
   ```bash
   node scripts/setup-test-user-for-monitoring.js
   ```
2. Update the token using the "Update Token" button
3. The token from the script is valid for 1 hour

### 3. Dashboard Shows "No JWT token found"

**Cause**: No token in localStorage

**Solution**: 
1. Click "Update Token" button
2. Paste the JWT token
3. Dashboard will auto-refresh

### 4. Server Connection Issues

**Symptoms**: Network errors, timeouts

**Checks**:
1. Verify server is running:
   ```bash
   lsof -i :3001
   ```
2. Test server health:
   ```bash
   curl http://localhost:3001/health
   ```
3. Check if API server is accessible:
   ```bash
   curl http://localhost:3001/api/monitoring/health
   ```

### 5. Metrics Not Updating

**Cause**: Token issues or server problems

**Debug Steps**:
1. Open browser DevTools (F12)
2. Check Network tab for failed requests
3. Look at Console for JavaScript errors
4. Test the API endpoint directly with your token:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3001/api/deepwiki/temp/metrics
   ```

## Updated Dashboard Features

The dashboard now includes:
- **Update Token** button - Change JWT token without refreshing
- **Better error handling** - Clear messages when token is missing
- **Token validation** - Prevents invalid fetch requests
- **Auto-refresh control** - Only refreshes when token is valid

## Quick Fixes

### Reset Everything
```javascript
// Run in browser console
localStorage.clear();
location.reload();
```

### Test Token Validity
```javascript
// Run in browser console
const token = localStorage.getItem('jwt_token');
console.log('Token exists:', !!token);
console.log('Token length:', token ? token.length : 0);
```

### Manual API Test
```javascript
// Run in browser console
fetch('http://localhost:3001/api/deepwiki/temp/metrics', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
  }
}).then(r => r.json()).then(console.log).catch(console.error);
```

## Working Token Example

Here's what a valid JWT token looks like:
```
eyJhbGciOiJIUzI1NiIsImtpZCI6InVMS2F5R1RkcUVOTWJ1RUQiLCJ0eXAiOiJKV1QifQ...
```
(Usually 200+ characters long)

## Still Having Issues?

1. Check server logs:
   ```bash
   cd apps/api && npm run dev
   ```
2. Verify environment variables are set
3. Ensure Supabase connection is working
4. Try using an API key instead of JWT token