# May 13, 2025 - API Authentication Troubleshooting Guide

## API Authentication Issues

We're experiencing issues with API authentication in our direct calibration script. To help diagnose and resolve these problems, we've created a dedicated debugging script.

## Using the Debug Script

This script tests API connectivity and authentication for both GitHub and model providers:

```bash
node packages/core/scripts/debug-api-keys.js
```

The script will:
1. Check if all API keys are present
2. Test GitHub API authentication
3. Test Anthropic API authentication
4. Provide detailed error messages for troubleshooting

## Common Issues and Solutions

### GitHub Authentication

If GitHub API authentication fails:

1. **Check Token Format**:
   - Make sure your token starts with `ghp_`, `gho_`, or `github_pat_`
   - Ensure there's no whitespace in the token
   - Verify the token isn't expired

2. **Update .env File**:
   ```
   # Correct format
   GITHUB_TOKEN=ghp_yourtokenhere
   ```

3. **Create a New Token**:
   - Go to GitHub → Settings → Developer settings → Personal access tokens
   - Generate a new token with `repo` scope
   - Update the .env file with the new token

### Anthropic API Issues

If Anthropic API authentication fails:

1. **Check API Key Format**:
   - Ensure the key starts with `sk-ant-api`
   - Remove any whitespace from the key
   - Verify the key is active in the Anthropic dashboard

2. **Update .env File**:
   ```
   # Correct format
   ANTHROPIC_API_KEY=sk-ant-api03-yourkeyhere
   ```

3. **Get a New API Key**:
   - Go to [Anthropic Console](https://console.anthropic.com/)
   - Create a new API key
   - Update the .env file with the new key

## Next Steps

Once you've fixed the authentication issues:

1. **Run Direct Calibration with Single Model**:
   ```bash
   node packages/core/scripts/run-direct-calibration.js --single-repo="pallets/flask" --single-model="anthropic/claude-3-7-sonnet"
   ```

2. **Monitor for Success**:
   Look for successful API connections and model responses.

3. **Proceed with Full Calibration**:
   Once the single-model test works, you can run the full calibration.

---

Last Updated: May 13, 2025