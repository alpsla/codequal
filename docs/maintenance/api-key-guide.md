# Creating New API Keys Guide

## GitHub API Key

To create a new GitHub token:

1. Go to [https://github.com/settings/tokens](https://github.com/settings/tokens)
2. Click "Generate new token" and select "Generate new token (classic)"
3. Give it a name like "CodeQual Calibration"
4. Select the "repo" scope for repository access
5. Click "Generate token"
6. Copy the new token and update your `.env` file:
   ```
   GITHUB_TOKEN=your_new_token_here
   ```

## Anthropic API Key

To create a new Anthropic API key:

1. Go to [https://console.anthropic.com/keys](https://console.anthropic.com/keys)
2. Click "Create new key"
3. Name it "CodeQual Calibration"
4. Copy the key and update your `.env` file:
   ```
   ANTHROPIC_API_KEY=your_new_key_here
   ```

## Direct API Testing

If you prefer to bypass the script and test API directly, you can use these curl commands:

### Test GitHub API
```bash
curl -H "Authorization: token YOUR_GITHUB_TOKEN" https://api.github.com/repos/pallets/flask
```

### Test Anthropic API
```bash
curl -X POST https://api.anthropic.com/v1/messages \
  -H "content-type: application/json" \
  -H "x-api-key: YOUR_ANTHROPIC_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-3-haiku-20240307",
    "max_tokens": 10,
    "messages": [
      {"role": "user", "content": "Say hello"}
    ]
  }'
```

Replace `YOUR_GITHUB_TOKEN` and `YOUR_ANTHROPIC_KEY` with your actual API keys.

## Alternatives to API Authentication

If you can't get API authentication working, consider:

1. **Using Public Repositories Only**: The direct calibration script can work with public repositories without GitHub authentication.

2. **Using Different Model Providers**: If one provider's authentication isn't working, try running with another:
   ```bash
   node packages/core/scripts/run-direct-calibration.js --single-repo="pallets/flask" --single-model="openai/gpt-4o"
   ```

3. **Creating Mock Results**: For testing other parts of the system, you could create mock calibration results.

4. **Using OpenRouter**: OpenRouter provides access to multiple models through a single API key, which might be easier to set up.

---

Remember to restart your terminal session after updating environment variables to ensure they're properly loaded.
